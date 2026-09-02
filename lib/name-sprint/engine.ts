import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { normalizeName, phoneticKey, COLLISION_REGISTRY_VERSION } from "./collision-registry"
import {
  buildNameSprintDomainOptions,
  eligibleNameSprintLaunchTlds,
  selectNameSprintLaunchDomain,
  type NameSprintDomainEvidence,
} from "./domain-policy"
import { evaluateEligibility } from "./eligibility"
import { scoreFounderSignalV2 } from "./founder-signal-v2"
import { createStructuredResponse, getNameSprintModel, getNameSprintRepairModel } from "./openai"
import {
  FOUNDER_SIGNAL_V2_VERSION,
  NAME_SPRINT_TLDS,
  NAME_SPRINT_VERSION,
  type NameConstitution,
  type NameSprintCandidate,
  type NameSprintRunResult,
  type NameSprintStrategy,
  type RawNameCandidate,
  type RejectedNameCandidate,
  type SemanticTerritory,
} from "./types"

const VERIFIED_ROOT_GLOSSARY: Readonly<Record<string, string>> = {
  alba: "dawn (Latin)",
  lumen: "light (Latin)",
  meridian: "midday or a line of longitude (Latin root)",
  nova: "new (Latin feminine form)",
  orbis: "circle or world (Latin)",
  vera: "true (Latin feminine form)",
  via: "way or road (Latin)",
}

const REPAIR_STRATEGIES = [
  "suggestive",
  "metaphorical",
  "invented",
  "controlled_coined",
  "meaningful_compound",
  "arbitrary_real_word",
] as const satisfies readonly NameSprintStrategy[]

const GUIDED_SEARCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["observation", "strategyDecision", "candidates"],
  properties: {
    observation: { type: "string" },
    strategyDecision: { type: "string" },
    candidates: {
      type: "array",
      minItems: 6,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "strategy", "territoryId", "roots", "pronunciation"],
        properties: {
          name: { type: "string" },
          strategy: { type: "string", enum: [...REPAIR_STRATEGIES] },
          territoryId: { type: "string" },
          roots: { type: "array", items: { type: "string" }, maxItems: 2 },
          pronunciation: { type: "string" },
        },
      },
    },
  },
} as const

const CURRENT_COLLISION_CHECK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "matchedName", "reason", "sourceUrls"],
  properties: {
    status: { type: "string", enum: ["clear", "reject", "review"] },
    matchedName: { type: ["string", "null"] },
    reason: { type: "string" },
    sourceUrls: { type: "array", items: { type: "string" }, maxItems: 2 },
  },
} as const

const STRATEGY_RULES: Record<NameSprintStrategy, string> = {
  suggestive: "Suggest the outcome without describing the category. Prefer one resonant word or one linguistically natural formation over a glued compound. Each name needs a defensible, non-literal connection to the brief. Do not attach bland glue endings such as well, wise or way.",
  metaphorical: "Use one coherent, concrete metaphor from nature, craft, movement, structure, science or culture. Prefer a standalone object, action or phenomenon over joining two metaphor words. Avoid worn startup metaphors, generic navigation language and bland well, wise or way compounds.",
  invented: "Create a single coherent new word with legal sound clusters, one likely pronunciation and one likely spelling in the target language. It must sound intentionally coined rather than like two ordinary words glued together. Never mutate an ordinary root by adding ora, era, ara, ira, via or a similar fashionable suffix.",
  controlled_coined: "Create a single ownable word of six to twelve letters inspired by one or two supplied semantic roots. The roots guide meaning and sound; do not paste, abbreviate or visibly glue them together. Use familiar English grapheme patterns, two or three balanced syllables, one obvious pronunciation and one likely spelling. Reject random syllables, literal compounds, and fashionable endings such as ora, era, via, ly, io, ify, ai or verse.",
  meaningful_compound: "Combine exactly two real concepts only when their relationship is surprising, immediately defensible and natural when spoken. Reject the idea yourself if it sounds like a feature label, consultancy phrase or two keywords pushed together. Do not combine category word + generic helper, and do not use well, wise or way as filler.",
  arbitrary_real_word: "Use a less-saturated existing real word with a surprising but defensible second-order brand association. Avoid generic business nouns such as margin, signal, reserve, cushion, compass, beacon, horizon, apex, base, path and point. Do not use famous or active brands.",
  verified_root: `Use only these verified cross-language roots and their supplied meanings: ${JSON.stringify(VERIFIED_ROOT_GLOSSARY)}. Do not invent translations.`,
}

const GUIDED_SEARCH_INSTRUCTIONS = `You are the bounded creative search controller for NamoLux Name Sprint.
You do not spray generic names. You receive a Name Constitution, semantic territories, prior applicants, and structured evidence explaining why earlier applicants failed.

For round one, create a focused and diverse starting batch. For later rounds, explicitly change the naming structure in response to the evidence. If short real words have no viable domains, stop generating short real words. If invented names fail spelling or random-syllable checks, move toward familiar English morphology and clearer suggestive structures. If active-brand collisions dominate, increase distinctiveness without sacrificing pronunciation. If final admissions rejects stretched metaphors, simplify the semantic bridge.

Treat domain evidence as search guidance, never as a reason to recommend a weak name. Prefer exact .com first, then .co and .ai. Seek distinctive seven-to-twelve-letter formations. Never repeat, respell, prefix, suffix, or create a close family of a rejected applicant.

Choose the strategy mix for this round from the supplied per-strategy rules. At least two thirds of the batch must be suggestive, invented or controlled-coined formations of seven to eleven letters. Return no more than two ordinary dictionary words and no more than two compounds. Semantic-territory roots describe meaning; they are not name parts. A territory root reproduced with a cosmetic ending is invalid. Reject faux-Latin endings, root+-en, root+-in, root+-et, root+-um, root+-is, root+-ary, root+-wise, and literal readiness or coordination compounds. Accorda, Cadrel, Threaden, Readyspan, Turnary and similar constructions are failure patterns, not examples.

Silently draft at least three times the requested count, compare the drafts, and return only the strongest applicants. Every result must work cold on a sales call, contract, search result and product interface. Reject your own output if it needs its explanation, sounds like random syllables, visibly glues keywords, resembles a familiar active brand, or has unstable spelling or pronunciation.

Keep the observation and strategyDecision factual and under 30 words each. Do not make domain or legal-clearance claims.`

const CURRENT_COLLISION_INSTRUCTIONS = `You are the current-evidence collision gate for a selective business-name generator.
You receive no more than eight candidates. Use exactly one combined web query containing every exact quoted name plus company, brand, product, and software terms. Investigate every supplied name; do not infer that evidence for one candidate covers another.
Reject an exact active company, brand, or product match. Reject a confusingly similar active match in the same or an adjacent market. Famous exact brands are rejected across markets.
Use review only when evidence is genuinely ambiguous. Use clear only when no credible active exact or adjacent-market conflict is found after searching. Domain unavailability alone is not collision evidence.
This is automated screening, not legal clearance. Fill every required candidate-ID property exactly once, keep reasons factual and short, and include up to two direct evidence URLs.`

const CURRENT_COLLISION_BATCH_SIZE = 8
const MAX_FINALISTS_FOR_LIVE_SCREEN = 8
const MAX_ESTIMATED_RUN_USD = 0.025
const STANDARD_DOMAIN_POOL_SIZE = 16
const GUIDED_ROUND_COUNTS = [20, 20] as const
const GUIDED_TARGET_ADMISSIONS = 3

function optionalStageEnabled(name: string) {
  return process.env[name]?.trim().toLowerCase() === "true"
}

function launchStageEnabled(name: string) {
  return optionalStageEnabled("NAMOLUX_NAME_SPRINT_ENABLED") || optionalStageEnabled(name)
}

interface GeneratedCandidatePayload {
  name: unknown
  territoryId: unknown
  roots: unknown
  pronunciation: unknown
}

interface RepairedCandidatePayload extends GeneratedCandidatePayload {
  strategy: unknown
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""
}

function cleanPronunciation(value: unknown, fallback: string) {
  const raw = cleanText(value, 100).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  if (!raw || /[^A-Za-z\s'-]/.test(raw)) return fallback.toLowerCase()
  return raw
}

function cleanRoots(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string")
    .map((item) => normalizeName(item)).filter((item) => item.length >= 2))).slice(0, 3)
}

function titleCaseName(value: string) {
  return value.split(/\s+/).map((part) => part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : "").join(" ")
}

function verifiedOrigin(strategy: NameSprintStrategy, roots: readonly string[]) {
  if (strategy !== "verified_root") return null
  if (!roots.length || !roots.every((root) => Boolean(VERIFIED_ROOT_GLOSSARY[root]))) return null
  return roots.map((root) => VERIFIED_ROOT_GLOSSARY[root]).join("; ")
}

export function passesControlledCoinedForm(name: string, roots: readonly string[]) {
  const normalized = normalizeName(name)
  if (!/^[a-z]{6,12}$/.test(normalized)) return false
  if ((normalized.match(/[aeiouy]/g) || []).length < 2) return false
  if (/(?:ora|era|via|ify|verse|labs|ly|io|ai)$/.test(normalized)) return false
  if (/(.)\1\1|[^aeiouy]{5}|q(?!u)/.test(normalized)) return false
  const meaningfulRoots = roots.map(normalizeName).filter((root) => root.length >= 2).slice(0, 2)
  if (!meaningfulRoots.length) return false
  if (meaningfulRoots.some((root) => root.length >= 4 && normalized.includes(root))) return false
  return true
}

function parseGeneratedCandidates(
  value: unknown,
  strategy: NameSprintStrategy,
  territories: readonly SemanticTerritory[],
  constitution: NameConstitution,
  attempt: number,
): RawNameCandidate[] {
  const items = value && typeof value === "object" && Array.isArray((value as { candidates?: unknown[] }).candidates)
    ? (value as { candidates: GeneratedCandidatePayload[] }).candidates
    : []
  const territoryIds = new Set(territories.map((territory) => territory.id))
  return items.flatMap((item, index) => {
    const rawName = cleanText(item.name, 80)
    const normalizedName = normalizeName(rawName)
    const maxLength = constitution.preferredLength.max
    const minLength = constitution.preferredLength.min
    if (!normalizedName || normalizedName.length < minLength || normalizedName.length > maxLength) return []
    if (constitution.namingMode !== "local_service" && /\s/.test(rawName)) return []
    const territoryId = cleanText(item.territoryId, 60)
    if (!territoryIds.has(territoryId)) return []
    const roots = cleanRoots(item.roots)
    const claimedOrigin = verifiedOrigin(strategy, roots)
    if (strategy === "verified_root" && !claimedOrigin) return []
    const territory = territories.find((item) => item.id === territoryId)!
    return [{
      id: `${attempt}-${strategy}-${territoryId}-${normalizedName}-${index}`,
      name: titleCaseName(rawName),
      normalizedName,
      strategy,
      territoryId,
      roots,
      association: territory.meaning,
      pronunciation: cleanPronunciation(item.pronunciation, rawName),
      claimedOrigin,
      originVerified: true,
    }]
  })
}

function bigrams(value: string) {
  const result = new Set<string>()
  for (let index = 0; index < value.length - 1; index += 1) result.add(value.slice(index, index + 2))
  return result
}

function stringSimilarity(left: string, right: string) {
  if (left === right) return 1
  if (Math.min(left.length, right.length) < 4) return 0
  const leftPairs = bigrams(left)
  const rightPairs = bigrams(right)
  let overlap = 0
  for (const pair of leftPairs) if (rightPairs.has(pair)) overlap += 1
  return (2 * overlap) / Math.max(1, leftPairs.size + rightPairs.size)
}

function sharedPrefixLength(left: string, right: string) {
  const limit = Math.min(left.length, right.length)
  let length = 0
  while (length < limit && left[length] === right[length]) length += 1
  return length
}

export function areRelatedNameFamily(left: RawNameCandidate, right: RawNameCandidate) {
  if (left.normalizedName === right.normalizedName) return true
  const leftPhonetic = phoneticKey(left.name)
  const rightPhonetic = phoneticKey(right.name)
  if (leftPhonetic.length >= 4 && leftPhonetic === rightPhonetic) return true
  const leftRoots = new Set(left.roots.filter((root) => root.length >= 4))
  if (right.roots.some((root) => root.length >= 4 && leftRoots.has(root))) return true
  const shorter = left.normalizedName.length <= right.normalizedName.length ? left.normalizedName : right.normalizedName
  const longer = shorter === left.normalizedName ? right.normalizedName : left.normalizedName
  if (shorter.length >= 5 && longer.startsWith(shorter) && longer.length - shorter.length <= 3) return true
  const sharedPrefix = sharedPrefixLength(left.normalizedName, right.normalizedName)
  // A five-character visible stem is already a recognisable family at the
  // short lengths used by Name Sprint. This catches pairs such as
  // Gaugecraft/Gaugework even when model-supplied semantic roots differ.
  if (sharedPrefix >= 5) return true
  return stringSimilarity(left.normalizedName, right.normalizedName) >= 0.72
}

function deDuplicateCandidates(candidates: readonly RawNameCandidate[]) {
  const selected: RawNameCandidate[] = []
  for (const candidate of candidates) {
    if (selected.some((existing) => areRelatedNameFamily(existing, candidate))) continue
    selected.push(candidate)
  }
  return selected
}

function diverseSelection<T extends RawNameCandidate>(items: readonly T[], count: number) {
  const selected: T[] = []
  const territoryCounts = new Map<string, number>()
  const strategyCounts = new Map<NameSprintStrategy, number>()
  for (const candidate of items) {
    if ((territoryCounts.get(candidate.territoryId) || 0) >= Math.max(2, Math.ceil(count / 3))) continue
    if ((strategyCounts.get(candidate.strategy) || 0) >= Math.max(2, Math.ceil(count / 3))) continue
    if (selected.some((existing) => areRelatedNameFamily(existing, candidate))) continue
    selected.push(candidate)
    territoryCounts.set(candidate.territoryId, (territoryCounts.get(candidate.territoryId) || 0) + 1)
    strategyCounts.set(candidate.strategy, (strategyCounts.get(candidate.strategy) || 0) + 1)
    if (selected.length >= count) break
  }
  return selected
}

function parseEditorialRepairCandidates(
  value: unknown,
  territories: readonly SemanticTerritory[],
  constitution: NameConstitution,
  attempt = 2,
) {
  const items = value && typeof value === "object" && Array.isArray((value as { candidates?: unknown[] }).candidates)
    ? (value as { candidates: RepairedCandidatePayload[] }).candidates
    : []
  return REPAIR_STRATEGIES.flatMap((strategy) => parseGeneratedCandidates(
    { candidates: items.filter((item) => item.strategy === strategy) },
    strategy,
    territories,
    constitution,
    attempt,
  ))
}

export type GuidedSearchFeedback = {
  round: number
  codeCounts: Record<string, number>
  examples: string[]
  directive: string
}

export function buildGuidedSearchFeedback(
  rejected: readonly RejectedNameCandidate[],
  round: number,
  context: { exactComReady?: number } = {},
): GuidedSearchFeedback {
  const codeCounts = rejected.reduce<Record<string, number>>((counts, candidate) => {
    for (const code of candidate.eligibility.failureCodes) counts[code] = (counts[code] || 0) + 1
    return counts
  }, {})
  const rankedCodes = Object.entries(codeCounts).sort((left, right) => right[1] - left[1])
  const dominant = new Set(rankedCodes.slice(0, 4).map(([code]) => code))
  const directives: string[] = []
  if (dominant.has("NO_PREFERRED_DOMAIN")) {
    directives.push("Short familiar words are commercially saturated; favour distinctive 7-12 letter suggestive or controlled-coined forms with exact-domain potential.")
  }
  if (dominant.has("RANDOM_SYLLABLES") || dominant.has("SPELLING_AMBIGUITY") || dominant.has("PRONUNCIATION_CLUSTER")) {
    directives.push("Stop arbitrary invention; use familiar English grapheme patterns, stable syllables and a single obvious radio-test spelling.")
  }
  if (dominant.has("ACTIVE_BRAND_EXACT") || dominant.has("ACTIVE_BRAND_CLOSE")) {
    directives.push("Increase structural distinctiveness and avoid every collided root, phonetic family and familiar product-name pattern.")
  }
  if (dominant.has("BELOW_QUALITY_BAR") || dominant.has("SEMANTIC_MISMATCH")) {
    directives.push("Strengthen the immediate semantic bridge; reject names whose rationale does the branding work. Ban visible territory roots with cosmetic endings and change the word-building method.")
  }
  if (round > 1 && context.exactComReady === 0) {
    directives.push("No exact .com survived the prior round. Change both roots and structure; favour distinctive 8-12 letter formations with realistic exact-.com potential without lowering name quality.")
  }
  if (!directives.length) {
    directives.push(round === 1
      ? "Start with a balanced mix of suggestive, metaphorical and controlled-coined structures; use compounds and real words sparingly."
      : "Change both roots and word structure from the previous round while preserving strategic fit and pronunciation.")
  }
  const examples = rejected.slice(-18).map((candidate) => {
    const reason = candidate.eligibility.reasons.at(-1) || candidate.eligibility.failureCodes.join(", ")
    return `${candidate.name}: ${candidate.eligibility.failureCodes.join("+") || "REJECTED"} — ${reason}`
  })
  return {
    round,
    codeCounts,
    examples,
    directive: directives.join(" "),
  }
}

async function generateGuidedRound({
  round,
  count,
  constitution,
  territories,
  excludedNames,
  feedback,
  signal,
  userIdentifier,
}: {
  round: number
  count: number
  constitution: NameConstitution
  territories: readonly SemanticTerritory[]
  excludedNames: readonly string[]
  feedback: GuidedSearchFeedback
  signal: AbortSignal
  userIdentifier: string
}) {
  const response = await createStructuredResponse<{
    observation: string
    strategyDecision: string
    candidates: RepairedCandidatePayload[]
  }>({
    schemaName: "name_sprint_guided_search",
    schema: GUIDED_SEARCH_SCHEMA as unknown as Record<string, unknown>,
    instructions: GUIDED_SEARCH_INSTRUCTIONS,
    input: `Search round: ${round} of ${GUIDED_ROUND_COUNTS.length}\nCreate exactly ${count} focused applicants.\nName Constitution: ${JSON.stringify(constitution)}\nSemantic territories: ${JSON.stringify(territories)}\nLiteral territory roots forbidden inside coined names: ${JSON.stringify(Array.from(new Set(territories.flatMap((territory) => territory.roots))).slice(0, 80))}\nPer-strategy rules: ${JSON.stringify(Object.fromEntries(REPAIR_STRATEGIES.map((strategy) => [strategy, STRATEGY_RULES[strategy]])))}\nFailure evidence: ${JSON.stringify(feedback)}\nNever repeat or closely vary: ${JSON.stringify(excludedNames.slice(-180))}`,
    maxOutputTokens: round === 1 ? 3_200 : round === 2 ? 3_000 : 1_800,
    promptCacheKey: "namolux-name-sprint-guided-search-v1",
    userIdentifier,
    signal,
    model: getNameSprintRepairModel(),
    reasoningEffort: "none",
  })
  return {
    candidates: parseEditorialRepairCandidates(response.data, territories, constitution, round),
    observation: cleanText(response.data.observation, 240),
    strategyDecision: cleanText(response.data.strategyDecision, 240),
    usage: response,
  }
}

type CurrentCollisionCheck = {
  name: string
  status: "clear" | "reject" | "review"
  matchedName: string | null
  reason: string
  sourceUrls: string[]
}

function parseCurrentCollisionChecks(value: unknown, candidates: readonly RawNameCandidate[]) {
  const rawChecks = value && typeof value === "object" ? (value as { checks?: unknown }).checks : null
  const items: Array<Record<string, unknown>> = Array.isArray(rawChecks)
    ? rawChecks as Array<Record<string, unknown>>
    : rawChecks && typeof rawChecks === "object"
      ? Object.entries(rawChecks as Record<string, unknown>).flatMap(([name, check]) => (
          check && typeof check === "object" ? [{ name, ...check as Record<string, unknown> }] : []
        ))
      : []
  const allowedNames = new Map(candidates.map((candidate) => [candidate.normalizedName, candidate.name]))
  const checks = new Map<string, CurrentCollisionCheck>()
  for (const item of items) {
    const normalized = normalizeName(cleanText(item.name, 80))
    const exactName = allowedNames.get(normalized)
    const status = ["clear", "reject", "review"].includes(String(item.status))
      ? item.status as CurrentCollisionCheck["status"]
      : "review"
    if (!exactName || checks.has(normalized)) continue
    const sourceUrls = Array.isArray(item.sourceUrls)
      ? item.sourceUrls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url)).slice(0, 3)
      : []
    checks.set(normalized, {
      name: exactName,
      status,
      matchedName: typeof item.matchedName === "string" ? cleanText(item.matchedName, 100) || null : null,
      reason: cleanText(item.reason, 320) || "Current collision evidence was inconclusive.",
      sourceUrls,
    })
  }
  for (const candidate of candidates) {
    if (checks.has(candidate.normalizedName)) continue
    checks.set(candidate.normalizedName, {
      name: candidate.name,
      status: "review",
      matchedName: null,
      reason: "The current web-backed collision screen did not return a complete check for this candidate.",
      sourceUrls: [],
    })
  }
  return checks
}

async function screenCurrentBrandCollisions(
  candidates: readonly RawNameCandidate[],
  constitution: NameConstitution,
  signal: AbortSignal,
  userIdentifier: string,
) {
  const candidateNames = candidates.map((candidate) => candidate.name)
  const candidateIds = candidates.map((candidate) => candidate.normalizedName)
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["checks"],
    properties: {
      checks: {
        type: "object",
        additionalProperties: false,
        required: candidateIds,
        properties: Object.fromEntries(candidateIds.map((id) => [id, CURRENT_COLLISION_CHECK_SCHEMA])),
      },
    },
  } as const
  const responses: Array<Awaited<ReturnType<typeof createStructuredResponse<{ checks: Record<string, Record<string, unknown>> }>>>> = []
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await createStructuredResponse<{ checks: Record<string, Record<string, unknown>> }>({
      schemaName: "name_sprint_current_collision_screen",
      schema: schema as unknown as Record<string, unknown>,
      instructions: CURRENT_COLLISION_INSTRUCTIONS,
      input: `${attempt === 2 ? "The previous response did not invoke web search. Invoke the required combined web search before answering.\n" : ""}Fill every required candidate-ID property exactly once.\nTarget category: ${constitution.category}\nMarkets: ${JSON.stringify(constitution.geographicMarkets)}\nSupplied competitors: ${JSON.stringify(constitution.competitors)}\nCandidates by required ID: ${JSON.stringify(Object.fromEntries(candidates.map((candidate) => [candidate.normalizedName, candidate.name])))}`,
      maxOutputTokens: Math.max(1_400, 700 + candidateNames.length * 220),
      promptCacheKey: attempt === 1 ? "namolux-name-sprint-current-collision-v2" : "namolux-name-sprint-current-collision-v2-tool-retry",
      userIdentifier,
      signal,
      webSearch: true,
      maxToolCalls: 1,
    })
    responses.push(response)
    if (response.webSearchCalls >= 1 && response.webSearchCalls <= 2) {
      return {
        checks: parseCurrentCollisionChecks(response.data, candidates),
        usage: {
          ...response,
          model: Array.from(new Set(responses.map((item) => item.model))).join("+"),
          inputTokens: responses.reduce((total, item) => total + item.inputTokens, 0),
          outputTokens: responses.reduce((total, item) => total + item.outputTokens, 0),
          estimatedUsd: responses.reduce((total, item) => total + item.estimatedUsd, 0),
          webSearchCalls: responses.reduce((total, item) => total + item.webSearchCalls, 0),
        },
      }
    }
    if (response.webSearchCalls > 1) break
  }
  const lastResponse = responses[responses.length - 1]
  return {
    checks: parseCurrentCollisionChecks(lastResponse?.data, candidates),
    usage: {
      ...lastResponse,
      model: Array.from(new Set(responses.map((item) => item.model))).join("+"),
      inputTokens: responses.reduce((total, item) => total + item.inputTokens, 0),
      outputTokens: responses.reduce((total, item) => total + item.outputTokens, 0),
      estimatedUsd: responses.reduce((total, item) => total + item.estimatedUsd, 0),
      webSearchCalls: responses.reduce((total, item) => total + item.webSearchCalls, 0),
    },
  }
}

function currentCollisionRejection(candidate: RawNameCandidate, check: CurrentCollisionCheck): RejectedNameCandidate {
  const matchedName = check.matchedName || null
  const isExact = matchedName ? normalizeName(matchedName) === candidate.normalizedName : false
  const sourceNote = check.sourceUrls.length ? ` Sources: ${check.sourceUrls.join(", ")}` : ""
  return {
    ...candidate,
    eligibility: {
      status: "reject",
      failureCodes: [isExact ? "ACTIVE_BRAND_EXACT" : "ACTIVE_BRAND_CLOSE"],
      reasons: [`Current web-backed collision screen: ${check.reason}${sourceNote}`],
      scoreCap: 0,
      matchedBrand: matchedName,
    },
  }
}

async function checkCandidateDomains(candidates: readonly RawNameCandidate[], constitution: NameConstitution, signal: AbortSignal) {
  const checkedCandidates = candidates.slice(0, STANDARD_DOMAIN_POOL_SIZE)
  const domains = checkedCandidates.flatMap((candidate) => buildNameSprintDomainOptions(candidate.normalizedName).map((option) => option.domain))
  if (!domains.length || process.env.NAMOLUX_NAME_SPRINT_DOMAIN_CHECKS?.trim().toLowerCase() === "false") return new Map<string, NameSprintDomainEvidence>()
  try {
    const checked = await checkAvailabilityBatch(domains, {
      signal,
      concurrency: 20,
      dnsTimeoutMs: 1_500,
      rdapTimeoutMs: 2_500,
      maxRetries: 0,
      ttlMs: 12 * 60 * 60 * 1_000,
    })
    const results = new Map<string, { available: boolean; unknown: boolean; checkedAt: string | null }>()
    for (const result of checked) {
      results.set(result.domain.toLowerCase(), {
        available: !result.error && result.available,
        unknown: Boolean(result.error),
        checkedAt: result.error ? null : new Date().toISOString(),
      })
    }
    const eligibleTlds = eligibleNameSprintLaunchTlds(constitution)
    return new Map(checkedCandidates.map((candidate) => [
      candidate.normalizedName,
      selectNameSprintLaunchDomain(candidate.normalizedName, results, eligibleTlds),
    ]))
  } catch {
    return new Map<string, NameSprintDomainEvidence>()
  }
}

function emptyDomainStatuses(): NameSprintCandidate["domainStatuses"] {
  return NAME_SPRINT_TLDS.map((tld) => ({ tld, status: "unknown", checkedAt: null }))
}

function domainPriority(candidate: NameSprintCandidate): number {
  if (candidate.launchDomain.kind === "exact" && candidate.launchDomain.domain.endsWith(".com")) return 4
  if (candidate.launchDomain.kind === "exact") return 3
  if (candidate.launchDomain.kind === "modified") return 2
  if (candidate.domainStatuses.some((domain) => domain.status === "unknown")) return 1
  return 0
}

function compareFinalists(left: NameSprintCandidate, right: NameSprintCandidate) {
  return domainPriority(right) - domainPriority(left)
    || right.founderSignal.score - left.founderSignal.score
}

export async function runNameSprint({
  constitution,
  territories,
  signal,
  userIdentifier,
  previouslyRejected = [],
  recentRootFrequency = {},
}: {
  constitution: NameConstitution
  territories: readonly SemanticTerritory[]
  signal: AbortSignal
  userIdentifier: string
  previouslyRejected?: readonly string[]
  recentRootFrequency?: Readonly<Record<string, number>>
}): Promise<NameSprintRunResult> {
  const runStarted = Date.now()
  const rawCandidates: RawNameCandidate[] = []
  let rawGeneratedCount = 0
  let admissionCandidates: NameSprintCandidate[] = []
  const rejected: RejectedNameCandidate[] = []
  const domainReadyCandidates = new Map<string, NameSprintCandidate>()
  let attempts = 0
  const timingMs = { generation: 0, screening: 0, judgeAndEvidence: 0, total: 0 }
  const usage = { model: getNameSprintModel(), inputTokens: 0, outputTokens: 0, estimatedUsd: 0, webSearchCalls: 0 }
  const usageModels = new Set([usage.model])
  const webCollisionEnabled = launchStageEnabled("NAMOLUX_NAME_SPRINT_WEB_COLLISION")
  const eligibleLaunchTlds = eligibleNameSprintLaunchTlds(constitution)

  const addUsage = (item: { model: string; inputTokens: number; outputTokens: number; estimatedUsd: number; webSearchCalls?: number }) => {
    usageModels.add(item.model)
    usage.model = Array.from(usageModels).join("+")
    usage.inputTokens += item.inputTokens
    usage.outputTokens += item.outputTokens
    usage.estimatedUsd += item.estimatedUsd
    usage.webSearchCalls += item.webSearchCalls || 0
    if (usage.webSearchCalls > 2) throw new Error("name_sprint_web_search_ceiling_exceeded")
    if (usage.estimatedUsd > MAX_ESTIMATED_RUN_USD) throw new Error("name_sprint_cost_ceiling_exceeded")
  }

  for (let round = 1; round <= GUIDED_ROUND_COUNTS.length; round += 1) {
    attempts = round
    const generationStarted = Date.now()
    const exactComReady = Array.from(domainReadyCandidates.values()).filter((candidate) => candidate.launchDomain.domain.endsWith(".com")).length
    const feedback = buildGuidedSearchFeedback(rejected, round, { exactComReady })
    const generated = await generateGuidedRound({
      round,
      count: GUIDED_ROUND_COUNTS[round - 1],
      constitution,
      territories,
      excludedNames: [...previouslyRejected, ...rawCandidates.map((candidate) => candidate.name)],
      feedback,
      signal,
      userIdentifier,
    })
    timingMs.generation += Date.now() - generationStarted
    rawGeneratedCount += generated.candidates.length
    const seenBeforeRound = new Set(rawCandidates.map((candidate) => candidate.normalizedName))
    const novelCandidates: RawNameCandidate[] = []
    for (const candidate of generated.candidates) {
      if (!seenBeforeRound.has(candidate.normalizedName)) {
        novelCandidates.push(candidate)
        continue
      }
      const eligibility = evaluateEligibility(candidate, {
        constitution,
        previouslyRejected: [...previouslyRejected, ...seenBeforeRound],
        recentRootFrequency,
      })
      rejected.push({ ...candidate, eligibility })
    }
    rawCandidates.push(...generated.candidates)
    addUsage(generated.usage)

    const screeningStarted = Date.now()
    const existingFamilies = Array.from(domainReadyCandidates.values())
    const locallyEligible: Array<{ candidate: RawNameCandidate; score: number }> = []
    const admittedSoFar: RawNameCandidate[] = [...existingFamilies]
    for (const candidate of deDuplicateCandidates(novelCandidates)) {
      if (candidate.strategy === "controlled_coined" && !passesControlledCoinedForm(candidate.normalizedName, candidate.roots)) {
        rejected.push({
          ...candidate,
          eligibility: {
            status: "reject",
            failureCodes: ["RANDOM_SYLLABLES"],
            reasons: ["The controlled coinage copied a semantic root or failed the pronounceable word-shape standard."],
            scoreCap: 0,
            matchedBrand: null,
          },
        })
        continue
      }
      const eligibility = evaluateEligibility(candidate, {
        constitution,
        existingCandidates: admittedSoFar,
        previouslyRejected,
        recentRootFrequency,
      })
      if (eligibility.status !== "pass") {
        rejected.push({ ...candidate, eligibility })
        continue
      }
      admittedSoFar.push(candidate)
      locallyEligible.push({
        candidate,
        score: scoreFounderSignalV2({ candidate, constitution, eligibility, recentRootFrequency }).score,
      })
    }
    const domainPool = diverseSelection(
      locallyEligible.sort((left, right) => right.score - left.score).map((item) => item.candidate),
      STANDARD_DOMAIN_POOL_SIZE,
    )
    timingMs.screening += Date.now() - screeningStarted
    if (!domainPool.length) continue

    const domainStarted = Date.now()
    const domainStatuses = await checkCandidateDomains(domainPool, constitution, signal)
    const completedDomainChecks = Array.from(domainStatuses.values()).reduce(
      (total, evidence) => total + evidence.domainStatuses.filter((domain) => domain.status !== "unknown").length + (evidence.launchDomain ? 1 : 0),
      0,
    )
    if (completedDomainChecks === 0) throw new Error("name_sprint_domain_screen_incomplete")

    const roundDomainReady = domainPool.flatMap((candidate): NameSprintCandidate[] => {
      const eligibility = evaluateEligibility(candidate, { constitution, previouslyRejected, recentRootFrequency })
      const evidence = domainStatuses.get(candidate.normalizedName)
      const domains = evidence?.domainStatuses || emptyDomainStatuses()
      const launchDomain = evidence?.launchDomain || null
      if (!launchDomain) {
        rejected.push({
          ...candidate,
          eligibility: {
            status: "reject",
            failureCodes: [...eligibility.failureCodes, "NO_PREFERRED_DOMAIN"],
            reasons: [...eligibility.reasons, "No verified exact launch domain suitable for this brief was available after the live scan."],
            scoreCap: 0,
            matchedBrand: eligibility.matchedBrand,
          },
        })
        return []
      }
      const primaryStatus = domains.find((domain) => domain.tld === "com")?.status || "unknown"
      const founderSignal = scoreFounderSignalV2({
        candidate,
        constitution,
        eligibility,
        preferredTld: "com",
        domainStatus: primaryStatus,
        availableTlds: domains.filter((domain) => domain.status === "available" && eligibleLaunchTlds.includes(domain.tld as (typeof NAME_SPRINT_TLDS)[number])).map((domain) => domain.tld),
        launchDomainKind: launchDomain.kind,
        recentRootFrequency,
      })
      return [{
        ...candidate,
        eligibility,
        founderSignal,
        strongestReason: founderSignal.strongestReason,
        mainRisk: founderSignal.mainRisk,
        evidenceConfidence: founderSignal.confidence,
        domainStatuses: domains,
        launchDomain,
      }]
    }).sort(compareFinalists)
    timingMs.screening += Date.now() - domainStarted

    if (!roundDomainReady.length) continue

    // Discovery is intentionally separate from Founder Signal. Candidates that
    // pass the deterministic hard gate and exact-domain check proceed to the
    // bounded current-brand screen; founders score only the names they choose.
    for (const candidate of roundDomainReady) {
      if (!domainReadyCandidates.has(candidate.normalizedName)) domainReadyCandidates.set(candidate.normalizedName, candidate)
    }

    const admittedCount = domainReadyCandidates.size
    const exactComAdmissions = Array.from(domainReadyCandidates.values()).filter((candidate) => candidate.launchDomain.domain.endsWith(".com")).length
    if (admittedCount >= GUIDED_TARGET_ADMISSIONS && exactComAdmissions > 0) break
  }

  const collisionStarted = Date.now()
  const collisionCandidates = diverseSelection(
    Array.from(domainReadyCandidates.values()).sort(compareFinalists),
    MAX_FINALISTS_FOR_LIVE_SCREEN,
  )
  const screenedCandidates: NameSprintCandidate[] = []
  if (!webCollisionEnabled) {
    if (optionalStageEnabled("NAMOLUX_NAME_SPRINT_ENABLED")) {
      throw new Error("name_sprint_live_screen_disabled")
    }
    screenedCandidates.push(...collisionCandidates.map((candidate) => ({ ...candidate, collisionScreen: { status: "not_run" as const, summary: "The static NamoLux collision registry passed; a current web-backed active-brand screen was not enabled for this run.", matchedName: null, sourceUrls: [], checkedAt: null, category: constitution.category, markets: [...constitution.geographicMarkets] } })))
  } else {
    if (collisionCandidates.length) {
      const batch = collisionCandidates.slice(0, CURRENT_COLLISION_BATCH_SIZE)
      const currentCollision = await screenCurrentBrandCollisions(batch, constitution, signal, userIdentifier)
      if (currentCollision.usage.webSearchCalls < 1 || currentCollision.usage.webSearchCalls > 2) {
        console.error("name-sprint-live-screen-tool-incomplete", {
          requestedCount: batch.length,
          webSearchCalls: currentCollision.usage.webSearchCalls,
        })
        throw new Error("name_sprint_live_screen_incomplete")
      }
      if (Array.from(currentCollision.checks.values()).some((check) => /did not return a complete check/i.test(check.reason))) {
        console.error("name-sprint-live-screen-incomplete", {
          requestedCount: batch.length,
          completedCount: Array.from(currentCollision.checks.values()).filter((check) => !/did not return a complete check/i.test(check.reason)).length,
        })
        throw new Error("name_sprint_live_screen_incomplete")
      }
      addUsage(currentCollision.usage)
      for (const candidate of batch) {
          const check = currentCollision.checks.get(candidate.normalizedName)
          if (check?.status === "clear") {
            screenedCandidates.push({
              ...candidate,
              collisionScreen: {
                status: "clear",
                summary: check.reason,
                matchedName: check.matchedName,
                sourceUrls: [...check.sourceUrls],
                checkedAt: new Date().toISOString(),
                category: constitution.category,
                markets: [...constitution.geographicMarkets],
              },
            })
            continue
          }
          rejected.push(currentCollisionRejection(candidate, check || {
            name: candidate.name,
            status: "review",
            matchedName: null,
            reason: "Current collision evidence was incomplete.",
            sourceUrls: [],
          }))
        }
    }
  }
  timingMs.judgeAndEvidence += Date.now() - collisionStarted

  if (screenedCandidates.length) {
    admissionCandidates = screenedCandidates.flatMap((candidate): NameSprintCandidate[] => {
      const eligibility = evaluateEligibility(candidate, {
        constitution,
        previouslyRejected,
        recentRootFrequency,
      })
      if (eligibility.status !== "pass") {
        rejected.push({ ...candidate, eligibility })
        return []
      }
      const primaryStatus = candidate.domainStatuses.find((domain) => domain.tld === "com")?.status || "unknown"
      const liveScreenCompleted = candidate.collisionScreen?.status === "clear"
      const founderSignal = scoreFounderSignalV2({
        candidate,
        constitution,
        eligibility,
        preferredTld: "com",
        domainStatus: primaryStatus,
        availableTlds: candidate.domainStatuses.filter((domain) => domain.status === "available" && eligibleLaunchTlds.includes(domain.tld as (typeof NAME_SPRINT_TLDS)[number])).map((domain) => domain.tld),
        launchDomainKind: candidate.launchDomain.kind,
        liveScreenCompleted,
        recentRootFrequency,
      })
      return [{
        ...candidate,
        eligibility,
        founderSignal,
        strongestReason: founderSignal.strongestReason,
        mainRisk: founderSignal.mainRisk,
        evidenceConfidence: founderSignal.confidence,
      }]
    }).sort(compareFinalists)
  }

  let eliteAwarded = false
  const finalCandidates = admissionCandidates.map((candidate) => {
    if (candidate.founderSignal.band !== "Elite") return candidate
    if (!eliteAwarded) {
      eliteAwarded = true
      return candidate
    }
    return {
      ...candidate,
      founderSignal: { ...candidate.founderSignal, score: 89, band: "Strong" as const },
    }
  })

  const finalIds = new Set(finalCandidates.map((candidate) => candidate.id))
  const uniqueRejected = Array.from(new Map(rejected.filter((candidate) => !finalIds.has(candidate.id)).map((candidate) => [candidate.id, candidate])).values())
  timingMs.total = Date.now() - runStarted
  return {
    version: NAME_SPRINT_VERSION,
    founderSignalVersion: FOUNDER_SIGNAL_V2_VERSION,
    registryVersion: COLLISION_REGISTRY_VERSION,
    generatedCount: rawGeneratedCount,
    survivorCount: finalCandidates.length,
    candidates: [...finalCandidates].sort(compareFinalists),
    rejected: uniqueRejected,
    territories: [...territories],
    attempts,
    timingMs,
    usage: { ...usage, estimatedUsd: Number(usage.estimatedUsd.toFixed(6)) },
  }
}
