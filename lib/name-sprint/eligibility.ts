import {
  hasAiSmellPattern,
  hasRandomSyllablePattern,
  hasUnsafeBrandMeaning,
} from "@/lib/domainGen/filters"
import { isGibberish } from "@/lib/domainGen/realness"
import { assessCollisionV2, normalizeName, phoneticKey } from "./collision-registry"
import { isSystemReservedName, SYSTEM_RESERVED_NAME_MESSAGE } from "@/lib/reserved-names"
import type {
  EligibilityDecision,
  EligibilityFailureCode,
  NameConstitution,
  RawNameCandidate,
} from "./types"

const GLOBAL_CLICHES = new Set([
  "ai", "app", "bot", "bright", "cloud", "core", "digital", "flow", "forge", "gen", "global",
  "group", "hub", "labs", "logic", "mind", "nest", "nexa", "nexus", "nova", "prime", "pro", "pulse",
  "quantum", "smart", "solutions", "spark", "studio", "sync", "systems", "tech", "verse", "works",
])

const CATEGORY_CLICHES: Record<string, readonly string[]> = {
  ai: ["ai", "bot", "gen", "labs", "mind", "neural", "nexus", "quantum", "smart", "synth"],
  fintech: ["capital", "coin", "fund", "ledger", "nest", "pay", "vault"],
  finance: ["capital", "coin", "fund", "ledger", "nest", "pay", "vault"],
  financial: ["capital", "coin", "fund", "ledger", "nest", "pay", "vault"],
  marketing: ["creative", "digital", "growth", "media", "solutions", "spark", "studio"],
  wellness: ["aura", "calm", "mind", "pure", "thrive", "wellness", "zen"],
  health: ["aura", "calm", "care", "mind", "pure", "thrive", "wellness", "zen"],
  developer: ["code", "dev", "forge", "labs", "stack", "sync"],
}

const AWKWARD_CLUSTERS = ["btr", "ckx", "dsk", "fgr", "kx", "pxl", "qk", "qz", "xck", "xz", "zx"]
const GENERIC_SUFFIXES = ["ai", "app", "bot", "gen", "hq", "ify", "io", "labs", "ly", "verse"]
const BLAND_GLUE_SUFFIXES = ["well", "wise", "way"]

export interface EligibilityContext {
  constitution: NameConstitution
  existingCandidates?: readonly RawNameCandidate[]
  previouslyRejected?: readonly string[]
  recentRootFrequency?: Readonly<Record<string, number>>
  judgeFatalFlaws?: readonly EligibilityFailureCode[]
}

function failure(
  status: EligibilityDecision["status"],
  code: EligibilityFailureCode,
  reason: string,
  scoreCap: number | null,
  matchedBrand: string | null = null,
): EligibilityDecision {
  return { status, failureCodes: [code], reasons: [reason], scoreCap, matchedBrand }
}

function addFailure(
  current: EligibilityDecision,
  status: EligibilityDecision["status"],
  code: EligibilityFailureCode,
  reason: string,
  scoreCap: number | null,
) {
  if (!current.failureCodes.includes(code)) current.failureCodes.push(code)
  if (!current.reasons.includes(reason)) current.reasons.push(reason)
  if (status === "reject" || (status === "review" && current.status === "pass")) current.status = status
  if (scoreCap !== null) current.scoreCap = current.scoreCap === null ? scoreCap : Math.min(current.scoreCap, scoreCap)
}

function categoryCliches(category: string): Set<string> {
  const categoryValue = category.toLowerCase()
  const selected = Object.entries(CATEGORY_CLICHES)
    .filter(([key]) => categoryValue.includes(key))
    .flatMap(([, values]) => values)
  return new Set([...GLOBAL_CLICHES, ...selected])
}

function containsSevereCluster(candidate: RawNameCandidate): boolean {
  const name = candidate.normalizedName || normalizeName(candidate.name)
  const roots = candidate.roots.map(normalizeName).filter(Boolean)
  const transparentCompound = roots.length >= 2 && roots.join("") === name
  const surfaces = transparentCompound ? roots : [name]
  return surfaces.some((surface) => AWKWARD_CLUSTERS.some((cluster) => surface.includes(cluster)) || /[^aeiouy]{5}/.test(surface))
}

function failsInventedWordShape(candidate: RawNameCandidate): boolean {
  if (candidate.strategy !== "invented" && candidate.strategy !== "verified_root") return false
  return hasRandomSyllablePattern(candidate.normalizedName) || isGibberish(candidate.normalizedName)
}

function hasSpellingAmbiguity(name: string): boolean {
  return /q(?!u)/.test(name)
    || /[aeiouy]{4}/.test(name)
    || /(.)\1\1/.test(name)
    || /(?:x|z){2}/.test(name)
}

function isNearDuplicate(candidate: RawNameCandidate, others: readonly RawNameCandidate[]): boolean {
  const key = phoneticKey(candidate.name)
  return others.some((other) => {
    if (other.id === candidate.id) return false
    if (other.normalizedName === candidate.normalizedName) return true
    return key.length >= 4 && key === phoneticKey(other.name)
  })
}

function isCompetitorSimilarity(name: string, competitors: readonly string[]): string | null {
  const key = phoneticKey(name)
  return competitors.find((competitor) => {
    const normalized = normalizeName(competitor)
    return normalized === name || (key.length >= 4 && key === phoneticKey(normalized))
  }) || null
}

function genericityFailures(candidate: RawNameCandidate, context: EligibilityContext): Array<{
  code: EligibilityFailureCode
  reason: string
  status: "review" | "reject"
  cap: number
}> {
  if (context.constitution.namingMode === "local_service") return []
  const categoryTokens = new Set(context.constitution.category.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3))
  const cliches = categoryCliches(context.constitution.category)
  const roots = candidate.roots.map(normalizeName).filter(Boolean)
  const clichéRoots = roots.filter((root) => cliches.has(root))
  const output: Array<{ code: EligibilityFailureCode; reason: string; status: "review" | "reject"; cap: number }> = []

  if (roots.length === 1 && categoryTokens.has(roots[0])) {
    output.push({ code: "GENERIC_CATEGORY", reason: "The name is the category word rather than a distinctive brand.", status: "review", cap: 59 })
  }
  if (roots.length === 2 && roots.every((root) => cliches.has(root))) {
    output.push({ code: "GENERIC_COMPOUND", reason: "Two predictable category terms are combined without a distinctive semantic bridge.", status: "reject", cap: 0 })
  } else if (
    clichéRoots.length >= 2
    || ((candidate.strategy === "invented" || candidate.strategy === "verified_root") && hasAiSmellPattern(candidate.normalizedName))
    || BLAND_GLUE_SUFFIXES.some((suffix) => candidate.normalizedName.length > suffix.length && candidate.normalizedName.endsWith(suffix))
  ) {
    output.push({ code: "GENERIC_CLICHE", reason: "The name stacks overused category or startup vocabulary.", status: "reject", cap: 0 })
  }

  const fatiguedRoot = roots.find((root) => (context.recentRootFrequency?.[root] || 0) >= 4)
  if (fatiguedRoot) {
    output.push({ code: "GENERIC_CLICHE", reason: `The root “${fatiguedRoot}” is in a temporary overuse cooldown.`, status: "reject", cap: 0 })
  }
  return output
}

/**
 * Fatal defects are resolved before Founder Signal. The score may compare only
 * candidates that have earned admission to the shortlist pool.
 */
export function evaluateEligibility(candidate: RawNameCandidate, context: EligibilityContext): EligibilityDecision {
  const name = candidate.normalizedName || normalizeName(candidate.name)
  if (!name) return failure("reject", "RANDOM_SYLLABLES", "The candidate has no usable name characters.", 0)

  if (isSystemReservedName(candidate.name)) {
    return failure("reject", "SYSTEM_RESERVED_NAME", SYSTEM_RESERVED_NAME_MESSAGE, 0, "NamoLux")
  }

  const collision = assessCollisionV2(candidate.name, {
    category: context.constitution.category,
    competitors: context.constitution.competitors,
    markets: context.constitution.geographicMarkets,
  })
  if (collision.type === "exact") {
    return failure("reject", "ACTIVE_BRAND_EXACT", `Exact active-brand match: ${collision.matched?.displayName}.`, 0, collision.matched?.displayName || null)
  }
  if (collision.type === "close" && collision.action === "reject") {
    return failure("reject", "ACTIVE_BRAND_CLOSE", `Close active-brand match in the same or an adjacent market: ${collision.matched?.displayName}.`, 0, collision.matched?.displayName || null)
  }

  const decision: EligibilityDecision = {
    status: collision.action === "review" ? "review" : "pass",
    failureCodes: collision.action === "review" ? ["ACTIVE_BRAND_CLOSE"] : [],
    reasons: collision.action === "review" ? [`Possible close brand match: ${collision.matched?.displayName}.`] : [],
    scoreCap: collision.scoreCap,
    matchedBrand: collision.matched?.displayName || null,
  }

  if (/[^a-z\s]/i.test(candidate.name)) addFailure(decision, "reject", "NUMBERS_OR_HYPHENS", "Numbers, hyphens, and punctuation are excluded unless explicitly requested.", 0)
  if (hasUnsafeBrandMeaning(name)) addFailure(decision, "reject", "UNSAFE_MEANING", "The name contains a strongly negative, unsafe, or accidental meaning.", 0)
  if (failsInventedWordShape(candidate)) addFailure(decision, "reject", "RANDOM_SYLLABLES", "The invented name does not meet the pronounceable word-shape standard.", 0)
  if (containsSevereCluster(candidate)) addFailure(decision, "reject", "PRONUNCIATION_CLUSTER", "The name contains a severe pronunciation cluster.", 0)
  if (hasSpellingAmbiguity(name)) addFailure(decision, "review", "SPELLING_AMBIGUITY", "The spoken name has multiple likely spellings.", 64)
  if (candidate.claimedOrigin && !candidate.originVerified) addFailure(decision, "reject", "FABRICATED_ETYMOLOGY", "The claimed linguistic origin is not verified.", 0)

  const previouslyRejected = new Set((context.previouslyRejected || []).map(normalizeName))
  if (previouslyRejected.has(name)) addFailure(decision, "reject", "PREVIOUSLY_REJECTED", "The founder rejected this candidate in an earlier wave.", 0)
  if (isNearDuplicate(candidate, context.existingCandidates || [])) addFailure(decision, "reject", "NEAR_DUPLICATE", "A stronger candidate already represents this name family.", 0)
  const competitor = isCompetitorSimilarity(name, context.constitution.competitors)
  if (competitor) addFailure(decision, "reject", "COMPETITOR_SIMILARITY", `The name is too similar to the supplied competitor ${competitor}.`, 0)

  for (const issue of genericityFailures(candidate, context)) addFailure(decision, issue.status, issue.code, issue.reason, issue.cap)
  for (const code of context.judgeFatalFlaws || []) addFailure(decision, "reject", code, `Independent judge flagged ${code.toLowerCase().replace(/_/g, " ")}.`, 0)

  const forbidden = context.constitution.avoid.map(normalizeName).filter(Boolean)
  if (forbidden.some((term) => term.length >= 3 && name.includes(term))) {
    addFailure(decision, "reject", "SEMANTIC_MISMATCH", "The candidate contains a forbidden root from the Name Constitution.", 0)
  }

  return decision
}

export function getGenericityIndex(candidate: RawNameCandidate, constitution: NameConstitution, recentRootFrequency: Readonly<Record<string, number>> = {}): number {
  const cliches = categoryCliches(constitution.category)
  const roots = candidate.roots.map(normalizeName).filter(Boolean)
  let score = 0
  score += roots.filter((root) => cliches.has(root)).length * 28
  score += roots.filter((root) => (recentRootFrequency[root] || 0) >= 2).length * 14
  if (GENERIC_SUFFIXES.some((suffix) => candidate.normalizedName.endsWith(suffix))) score += 18
  if (roots.length === 1 && constitution.category.toLowerCase().includes(roots[0])) score += 25
  return Math.min(100, score)
}
