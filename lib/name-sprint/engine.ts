import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { normalizeName, phoneticKey, COLLISION_REGISTRY_VERSION } from "./collision-registry"
import {
  buildNameSprintDomainOptions,
  selectNameSprintLaunchDomain,
  selectShortlistWithModifiedDomainCap,
  type NameSprintDomainEvidence,
} from "./domain-policy"
import { evaluateEligibility } from "./eligibility"
import { scoreFounderSignalV2 } from "./founder-signal-v2"
import { createStructuredResponse, getNameSprintModel, getNameSprintRepairModel } from "./openai"
import {
  FOUNDER_SIGNAL_V2_VERSION,
  NAME_SPRINT_TLDS,
  NAME_SPRINT_VERSION,
  type EligibilityFailureCode,
  type EvidenceConfidence,
  type FounderSignalV2Dimensions,
  type JudgedCandidate,
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

const JUDGE_FATAL_CODES: readonly EligibilityFailureCode[] = [
  "PRONUNCIATION_CLUSTER",
  "SPELLING_AMBIGUITY",
  "UNSAFE_MEANING",
  "RANDOM_SYLLABLES",
  "FABRICATED_ETYMOLOGY",
  "SEMANTIC_MISMATCH",
]

const GENERATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      minItems: 8,
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "territoryId", "roots", "pronunciation"],
        properties: {
          name: { type: "string" },
          territoryId: { type: "string" },
          roots: { type: "array", items: { type: "string" }, maxItems: 2 },
          pronunciation: { type: "string" },
        },
      },
    },
  },
} as const

const REPAIR_STRATEGIES = [
  "suggestive",
  "metaphorical",
  "invented",
  "controlled_coined",
  "meaningful_compound",
  "arbitrary_real_word",
] as const satisfies readonly NameSprintStrategy[]

const LIVE_GENERATION_STRATEGIES = [
  "suggestive",
  "metaphorical",
  "invented",
  "controlled_coined",
  "meaningful_compound",
  "arbitrary_real_word",
] as const satisfies readonly NameSprintStrategy[]

const EDITORIAL_REPAIR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      minItems: 10,
      maxItems: 18,
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

const JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["judgments"],
  properties: {
    judgments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "fatalFlawCodes", "scores", "strongestReason", "mainRisk", "confidence", "preferredWithinGroup"],
        properties: {
          name: { type: "string" },
          fatalFlawCodes: { type: "array", items: { type: "string", enum: [...JUDGE_FATAL_CODES] } },
          scores: {
            type: "object",
            additionalProperties: false,
            required: ["strategicFit", "distinctiveness", "memorability", "pronunciation", "spellingCharacter"],
            properties: {
              strategicFit: { type: "integer", minimum: 0, maximum: 100 },
              distinctiveness: { type: "integer", minimum: 0, maximum: 100 },
              memorability: { type: "integer", minimum: 0, maximum: 100 },
              pronunciation: { type: "integer", minimum: 0, maximum: 100 },
              spellingCharacter: { type: "integer", minimum: 0, maximum: 100 },
            },
          },
          strongestReason: { type: "string" },
          mainRisk: { type: "string" },
          confidence: { type: "string", enum: ["high", "moderate", "low"] },
          preferredWithinGroup: { type: "integer", minimum: 0, maximum: 100 },
        },
      },
    },
  },
} as const

const CURRENT_COLLISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["checks"],
  properties: {
    checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "status", "matchedName", "reason", "sourceUrls"],
        properties: {
          name: { type: "string" },
          status: { type: "string", enum: ["clear", "reject", "review"] },
          matchedName: { type: ["string", "null"] },
          reason: { type: "string" },
          sourceUrls: { type: "array", items: { type: "string" }, maxItems: 3 },
        },
      },
    },
  },
} as const

const ADMISSION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["decisions"],
  properties: {
    decisions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "admit", "reason"],
        properties: {
          name: { type: "string" },
          admit: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    },
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

const GENERATION_INSTRUCTIONS = `You are one independent strategy module inside a selective naming system. You generate applicants, not winners.
Follow only the requested strategy. Produce meaning before wordplay. Names must be pronounceable, spellable, and relevant to the supplied Name Constitution.
Avoid active brands, supplied competitors, supplied exclusions, generic category labels, cliché startup vocabulary, repeated roots, numbers, hyphens, fashionable fake suffixes, and fabricated etymology.
The name must work cold on a sales call, contract, search result and product interface; it cannot depend on a written explanation to feel credible. Treat liked names only as evidence of structural taste such as brevity or restraint, never as roots to imitate.
Silently draft at least three times the requested number, criticise them, and return only the strongest distinct applicants. Most obvious noun+noun, adjective+noun and direction/visibility compounds are filler. Do not imitate failure patterns such as EarlyTell, PathAhead, NearView, ViewMark, SteadMark, BaseLink, TraceMap, TrackAhead or similarly literal glued constructions.
Do not make domain, company-name or trademark availability claims.
Return only the requested name, territory ID, up to two roots, and a short pronunciation. Keep every field terse; do not add rationales or promotional prose.`

const EDITORIAL_REPAIR_INSTRUCTIONS = `You are the senior naming editor used only when a selective first pass produced too few serious candidates.
The supplied rejection notes are evidence, not suggestions to relax the standard. Create genuinely new replacements; never respell, prefix, suffix, compound with, or otherwise vary a rejected name.
Generate 14 to 18 candidates across the supplied semantic territories. At least half must be linguistically coherent invented or suggestive formations that are not ordinary dictionary words. Use arbitrary real words sparingly because short common words are usually commercially saturated.
At least six candidates must use the controlled_coined strategy and satisfy its semantic-root and phonetic rules. Do not relabel arbitrary inventions as controlled coinages.
Apply the supplied per-strategy rules exactly. Do not default to invented words ending in a, ia, ora, era or via; repeated fashionable endings are not diversity. Use no more than three meaningful compounds and reject any compound whose connection is not immediate when spoken without an explanation.
When NO_PREFERRED_DOMAIN dominates the failure pattern, treat short dictionary words and familiar metaphors as commercially saturated. Prefer coherent, distinctive seven-to-twelve-letter suggestive or invented forms without sacrificing pronunciation, spelling or semantic credibility.
Every name must work cold on a sales call, contract, search result and product interface. Reject your own output when the meaning needs a paragraph, when two keywords are visibly glued together, when spelling or pronunciation is unstable, or when the name resembles a known active company, product or supplied competitor.
Do not make availability or legal-clearance claims. Return only the structured candidate fields and no promotional prose.`

const GUIDED_SEARCH_INSTRUCTIONS = `You are the bounded creative search controller for NamoLux Name Sprint.
You do not spray generic names. You receive a Name Constitution, semantic territories, prior applicants, and structured evidence explaining why earlier applicants failed.

For round one, create a focused and diverse starting batch. For later rounds, explicitly change the naming structure in response to the evidence. If short real words have no viable domains, stop generating short real words. If invented names fail spelling or random-syllable checks, move toward familiar English morphology and clearer suggestive structures. If active-brand collisions dominate, increase distinctiveness without sacrificing pronunciation. If final admissions rejects stretched metaphors, simplify the semantic bridge.

Treat domain evidence as search guidance, never as a reason to recommend a weak name. Prefer exact .com, .co or .ai viability through distinctive seven-to-twelve-letter formations before relying on a clean modified .com. Never repeat, respell, prefix, suffix, or create a close family of a rejected applicant.

Choose the strategy mix for this round from the supplied per-strategy rules. Silently draft at least three times the requested count, compare the drafts, and return only the strongest applicants. Every result must work cold on a sales call, contract, search result and product interface. Reject your own output if it needs its explanation, sounds like random syllables, visibly glues keywords, resembles a familiar active brand, or has unstable spelling or pronunciation.

Keep the observation and strategyDecision factual and under 30 words each. Do not make domain or legal-clearance claims.`

const JUDGE_INSTRUCTIONS = `You are an independent blind naming judge. You did not generate the candidates.
Compare candidates in small implicit groups against the supplied Name Constitution. You receive no domain availability, generated rationale, or strategy labels.
Use fatal-flaw codes only for severe pronunciation, spelling, unsafe-meaning, random-syllable, fabricated-etymology or semantic-mismatch defects. Deterministic and current web-backed screens handle competitors, genericity and brand collisions, so do not guess those fatal codes from memory; express softer concerns through dimension scores and mainRisk.
Scores are comparative signals, not legal clearance. Most raw candidates are not shortlist quality: use 45-59 for names a founder should discard, 60-74 for serious but imperfect options, and 75-89 only for the small minority you would genuinely build a company around. Do not award 75+ merely because a name is relevant or pronounceable. Descriptive compounds, forced constructions, weak semantic bridges, and names that need explanation must not receive Strong dimension scores.
Use SEMANTIC_MISMATCH when the metaphor or root relationship is stretched enough that the supplied explanation is doing the branding work. Use RANDOM_SYLLABLES for a forced invented construction. At most one third of a typical candidate set should receive preferredWithinGroup above 70.
If mainRisk says pronunciation or spelling may vary, include SPELLING_AMBIGUITY. If a pronunciation cluster is severe, include PRONUNCIATION_CLUSTER. The risk text and fatal codes must agree.
Keep strongestReason and mainRisk under 18 words each. Return one judgment for every supplied name and never invent a new candidate.`

const ADMISSION_INSTRUCTIONS = `You are the final admissions editor for a selective naming platform. You did not generate or score these names.
The default decision is reject. Admit only a name you would seriously consider building the described company around after saying it aloud and imagining it on a sales call, contract, search result, and product interface.
Reject obvious active brands from your general knowledge, generic or descriptive constructions, awkward glued compounds, stretched metaphors, weak semantic bridges, forced invented words, ambiguous spelling, and names whose explanation is doing most of the work.
Relevance and pronounceability are necessary but not sufficient. Do not fill a quota. Admit no more than twelve names, and return zero when none meets the standard.
Evaluate names independently from the supplied brief. Keep each reason factual and under 16 words. Return one decision for every supplied name.`

const CURRENT_COLLISION_INSTRUCTIONS = `You are the current-evidence collision gate for a selective business-name generator.
You receive no more than eight candidates. Use exactly one combined web query containing every exact quoted name plus company, brand, product, and software terms. Investigate every supplied name; do not infer that evidence for one candidate covers another.
Reject an exact active company, brand, or product match. Reject a confusingly similar active match in the same or an adjacent market. Famous exact brands are rejected across markets.
Use review only when evidence is genuinely ambiguous. Use clear only when no credible active exact or adjacent-market conflict is found after searching. Domain unavailability alone is not collision evidence.
This is automated screening, not legal clearance. Return one check for every supplied candidate, keep reasons factual and short, and include up to three direct evidence URLs.`

const CURRENT_COLLISION_BATCH_SIZE = 8
const MAX_FINALISTS_FOR_LIVE_SCREEN = 8
const MAX_ESTIMATED_RUN_USD = 0.025
const STANDARD_CANDIDATES_PER_STRATEGY = 8
const STANDARD_JUDGE_POOL_SIZE = 16
const GUIDED_ROUND_COUNTS = [18, 12, 8] as const
const GUIDED_TARGET_ADMISSIONS = 6

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
  return meaningfulRoots.length > 0
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
    if (strategy === "controlled_coined" && !passesControlledCoinedForm(normalizedName, roots)) return []
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

function deterministicShuffle<T extends { name: string }>(items: readonly T[]) {
  return [...items].sort((left, right) => {
    const leftKey = `${phoneticKey(left.name)}-${left.name.length}`
    const rightKey = `${phoneticKey(right.name)}-${right.name.length}`
    return leftKey.localeCompare(rightKey)
  })
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

async function generateWithStrategy({
  strategy,
  count,
  constitution,
  territories,
  excludedNames,
  signal,
  userIdentifier,
  attempt,
  failedPatterns,
}: {
  strategy: NameSprintStrategy
  count: number
  constitution: NameConstitution
  territories: readonly SemanticTerritory[]
  excludedNames: readonly string[]
  signal: AbortSignal
  userIdentifier: string
  attempt: number
  failedPatterns: readonly string[]
}) {
  const response = await createStructuredResponse<{ candidates: GeneratedCandidatePayload[] }>({
      schemaName: `name_sprint_${strategy}`,
      schema: GENERATION_SCHEMA as unknown as Record<string, unknown>,
      instructions: `${GENERATION_INSTRUCTIONS}\n\nStrategy rule: ${STRATEGY_RULES[strategy]}`,
      input: `Create ${count} candidates.\nName Constitution: ${JSON.stringify(constitution)}\nSemantic territories: ${JSON.stringify(territories)}\nDo not repeat or closely vary: ${JSON.stringify(excludedNames.slice(-180))}\nEarlier-wave failure patterns to correct: ${JSON.stringify(failedPatterns)}`,
      maxOutputTokens: 1_400,
      promptCacheKey: `namolux-name-sprint-${strategy}-v2`,
      userIdentifier,
      signal,
      reasoningEffort: "low",
    })
  return { candidates: parseGeneratedCandidates(response.data, strategy, territories, constitution, attempt), usage: response }
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
    directives.push("Strengthen the immediate semantic bridge; reject names whose rationale does the branding work.")
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
    input: `Search round: ${round} of ${GUIDED_ROUND_COUNTS.length}\nCreate exactly ${count} focused applicants.\nName Constitution: ${JSON.stringify(constitution)}\nSemantic territories: ${JSON.stringify(territories)}\nPer-strategy rules: ${JSON.stringify(Object.fromEntries(REPAIR_STRATEGIES.map((strategy) => [strategy, STRATEGY_RULES[strategy]])))}\nFailure evidence: ${JSON.stringify(feedback)}\nNever repeat or closely vary: ${JSON.stringify(excludedNames.slice(-180))}`,
    maxOutputTokens: round === 1 ? 3_200 : round === 2 ? 2_400 : 1_800,
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

async function generateEditorialRepair({
  constitution,
  territories,
  excludedNames,
  rejectionNotes,
  signal,
  userIdentifier,
}: {
  constitution: NameConstitution
  territories: readonly SemanticTerritory[]
  excludedNames: readonly string[]
  rejectionNotes: readonly string[]
  signal: AbortSignal
  userIdentifier: string
}) {
  const request = (reasoningEffort: "none" | "low", maxOutputTokens: number) => createStructuredResponse<{ candidates: RepairedCandidatePayload[] }>({
      schemaName: "name_sprint_editorial_repair",
      schema: EDITORIAL_REPAIR_SCHEMA as unknown as Record<string, unknown>,
      instructions: EDITORIAL_REPAIR_INSTRUCTIONS,
      input: `Name Constitution: ${JSON.stringify(constitution)}\nSemantic territories: ${JSON.stringify(territories)}\nPer-strategy rules: ${JSON.stringify(Object.fromEntries(REPAIR_STRATEGIES.map((strategy) => [strategy, STRATEGY_RULES[strategy]])))}\nRejected finalist notes: ${JSON.stringify(rejectionNotes.slice(0, 18))}\nNever repeat or vary: ${JSON.stringify(excludedNames.slice(-180))}`,
      maxOutputTokens,
      promptCacheKey: "namolux-name-sprint-editorial-repair-v1",
      userIdentifier,
      signal,
      model: getNameSprintRepairModel(),
      reasoningEffort,
    })

  let response: Awaited<ReturnType<typeof request>>
  try {
    response = await request("low", 2_400)
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (!code.endsWith("_empty_response") && !code.endsWith("_invalid_json")) throw error
    response = await request("none", 3_200)
  }
  return { candidates: parseEditorialRepairCandidates(response.data, territories, constitution), usage: response }
}

function parseJudgments(value: unknown, candidates: readonly RawNameCandidate[]): Map<string, JudgedCandidate> {
  const items = value && typeof value === "object" && Array.isArray((value as { judgments?: unknown[] }).judgments)
    ? (value as { judgments: Array<Record<string, unknown>> }).judgments
    : []
  const allowedNames = new Map(candidates.map((candidate) => [candidate.normalizedName, candidate.name]))
  const judgments = new Map<string, JudgedCandidate>()
  for (const item of items) {
    const normalized = normalizeName(cleanText(item.name, 80))
    const exactName = allowedNames.get(normalized)
    if (!exactName || judgments.has(normalized)) continue
    const rawScores = item.scores && typeof item.scores === "object" ? item.scores as Record<string, unknown> : {}
    const score = (key: keyof Omit<FounderSignalV2Dimensions, "domainExtension" | "brandCollisionRisk">) => Math.max(0, Math.min(100, Math.round(Number(rawScores[key]) || 0)))
    const fatalFlawCodes = Array.isArray(item.fatalFlawCodes)
      ? item.fatalFlawCodes.filter((code): code is EligibilityFailureCode => typeof code === "string" && (JUDGE_FATAL_CODES as readonly string[]).includes(code))
      : []
    const confidence = ["high", "moderate", "low"].includes(String(item.confidence)) ? item.confidence as EvidenceConfidence : "low"
    const strongestReason = cleanText(item.strongestReason, 220)
    const mainRisk = cleanText(item.mainRisk, 220)
    const pronunciation = score("pronunciation")
    const spellingCharacter = score("spellingCharacter")
    if (
      pronunciation < 45
      && !fatalFlawCodes.includes("PRONUNCIATION_CLUSTER")
    ) fatalFlawCodes.push("PRONUNCIATION_CLUSTER")
    if (
      (
        spellingCharacter < 45
        || /(?:pronunciation|spelling|spacing) (?:may|might|could|can) vary|multiple (?:pronunciations|spellings)|verbal separation|unclear pronunciation|pronunciation ambiguity|hard to spell|radio test/i.test(mainRisk)
      )
      && !fatalFlawCodes.includes("SPELLING_AMBIGUITY")
    ) fatalFlawCodes.push("SPELLING_AMBIGUITY")
    judgments.set(normalized, {
      name: exactName,
      fatalFlawCodes,
      scores: {
        strategicFit: score("strategicFit"),
        distinctiveness: score("distinctiveness"),
        memorability: score("memorability"),
        pronunciation,
        spellingCharacter,
      },
      strongestReason,
      mainRisk,
      confidence,
      preferredWithinGroup: Math.max(0, Math.min(100, Math.round(Number(item.preferredWithinGroup) || 0))),
    })
  }
  return judgments
}

async function judgeCandidates(
  candidates: readonly RawNameCandidate[],
  constitution: NameConstitution,
  signal: AbortSignal,
  userIdentifier: string,
) {
  const blinded = deterministicShuffle(candidates).map((candidate) => ({ name: candidate.name, pronunciation: candidate.pronunciation }))
  const response = await createStructuredResponse<{ judgments: Array<Record<string, unknown>> }>({
    schemaName: "name_sprint_blind_judgments",
    schema: JUDGE_SCHEMA as unknown as Record<string, unknown>,
    instructions: JUDGE_INSTRUCTIONS,
    input: `Name Constitution: ${JSON.stringify(constitution)}\nShuffled candidate set: ${JSON.stringify(blinded)}`,
    maxOutputTokens: 1_400,
    promptCacheKey: "namolux-name-sprint-judge-v2",
    userIdentifier,
    signal,
    reasoningEffort: "low",
  })
  return { judgments: parseJudgments(response.data, candidates), usage: response }
}

function parseAdmissionDecisions(value: unknown, candidates: readonly NameSprintCandidate[]) {
  const items = value && typeof value === "object" && Array.isArray((value as { decisions?: unknown[] }).decisions)
    ? (value as { decisions: Array<Record<string, unknown>> }).decisions
    : []
  const allowedNames = new Set(candidates.map((candidate) => candidate.normalizedName))
  const decisions = new Map<string, { admit: boolean; reason: string }>()
  for (const item of items) {
    const normalized = normalizeName(cleanText(item.name, 80))
    if (!allowedNames.has(normalized) || decisions.has(normalized)) continue
    decisions.set(normalized, {
      admit: item.admit === true,
      reason: cleanText(item.reason, 220) || "The final admissions editor did not find enough evidence to shortlist this name.",
    })
  }
  return decisions
}

async function admitFinalists(
  candidates: readonly NameSprintCandidate[],
  constitution: NameConstitution,
  signal: AbortSignal,
  userIdentifier: string,
) {
  const blinded = deterministicShuffle(candidates).map((candidate) => ({
    name: candidate.name,
    pronunciation: candidate.pronunciation,
  }))
  const response = await createStructuredResponse<{ decisions: Array<Record<string, unknown>> }>({
    schemaName: "name_sprint_final_admissions",
    schema: ADMISSION_SCHEMA as unknown as Record<string, unknown>,
    instructions: ADMISSION_INSTRUCTIONS,
    input: `Name Constitution: ${JSON.stringify(constitution)}\nCandidate set: ${JSON.stringify(blinded)}`,
    maxOutputTokens: 1_800,
    promptCacheKey: "namolux-name-sprint-admissions-v1",
    userIdentifier,
    signal,
    reasoningEffort: "low",
  })
  return { decisions: parseAdmissionDecisions(response.data, candidates), usage: response }
}

type CurrentCollisionCheck = {
  name: string
  status: "clear" | "reject" | "review"
  matchedName: string | null
  reason: string
  sourceUrls: string[]
}

function parseCurrentCollisionChecks(value: unknown, candidates: readonly RawNameCandidate[]) {
  const items = value && typeof value === "object" && Array.isArray((value as { checks?: unknown[] }).checks)
    ? (value as { checks: Array<Record<string, unknown>> }).checks
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
  const response = await createStructuredResponse<{ checks: Array<Record<string, unknown>> }>({
    schemaName: "name_sprint_current_collision_screen",
    schema: CURRENT_COLLISION_SCHEMA as unknown as Record<string, unknown>,
    instructions: CURRENT_COLLISION_INSTRUCTIONS,
    input: `Target category: ${constitution.category}\nMarkets: ${JSON.stringify(constitution.geographicMarkets)}\nSupplied competitors: ${JSON.stringify(constitution.competitors)}\nCandidates: ${JSON.stringify(candidates.map((candidate) => candidate.name))}`,
    maxOutputTokens: 1_800,
    promptCacheKey: "namolux-name-sprint-current-collision-v1",
    userIdentifier,
    signal,
    webSearch: true,
    maxToolCalls: 1,
  })
  return { checks: parseCurrentCollisionChecks(response.data, candidates), usage: response }
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

async function checkCandidateDomains(candidates: readonly RawNameCandidate[], signal: AbortSignal) {
  const checkedCandidates = candidates.slice(0, STANDARD_JUDGE_POOL_SIZE)
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
    return new Map(checkedCandidates.map((candidate) => [
      candidate.normalizedName,
      selectNameSprintLaunchDomain(candidate.normalizedName, results),
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
  const finalAdmissionsEnabled = launchStageEnabled("NAMOLUX_NAME_SPRINT_AI_ADMISSIONS")
  const webCollisionEnabled = launchStageEnabled("NAMOLUX_NAME_SPRINT_WEB_COLLISION")

  const addUsage = (item: { model: string; inputTokens: number; outputTokens: number; estimatedUsd: number; webSearchCalls?: number }) => {
    usageModels.add(item.model)
    usage.model = Array.from(usageModels).join("+")
    usage.inputTokens += item.inputTokens
    usage.outputTokens += item.outputTokens
    usage.estimatedUsd += item.estimatedUsd
    usage.webSearchCalls += item.webSearchCalls || 0
    if (usage.webSearchCalls > 1) throw new Error("name_sprint_web_search_ceiling_exceeded")
    if (usage.estimatedUsd > MAX_ESTIMATED_RUN_USD) throw new Error("name_sprint_cost_ceiling_exceeded")
  }

  for (let round = 1; round <= GUIDED_ROUND_COUNTS.length; round += 1) {
    attempts = round
    const generationStarted = Date.now()
    const feedback = buildGuidedSearchFeedback(rejected, round)
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
      STANDARD_JUDGE_POOL_SIZE,
    )
    timingMs.screening += Date.now() - screeningStarted
    if (!domainPool.length) continue

    const domainStarted = Date.now()
    const domainStatuses = await checkCandidateDomains(domainPool, signal)
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
            reasons: [...eligibility.reasons, "No verified exact .com, .co or .ai or clean modified .com launch domain was available after the live scan."],
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
        availableTlds: domains.filter((domain) => domain.status === "available").map((domain) => domain.tld),
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

    const admittedThisRound: NameSprintCandidate[] = []
    if (!finalAdmissionsEnabled) {
      admittedThisRound.push(...roundDomainReady)
    } else if (roundDomainReady.length) {
      const admissionStarted = Date.now()
      const admissions = await admitFinalists(roundDomainReady, constitution, signal, userIdentifier)
      addUsage(admissions.usage)
      timingMs.judgeAndEvidence += Date.now() - admissionStarted
      for (const candidate of roundDomainReady) {
        const decision = admissions.decisions.get(candidate.normalizedName)
        if (decision?.admit) {
          admittedThisRound.push(candidate)
          continue
        }
        const reason = decision?.reason || "The admissions editor did not return a complete decision."
        rejected.push({
          ...candidate,
          eligibility: {
            status: "review",
            failureCodes: [...candidate.eligibility.failureCodes, "BELOW_QUALITY_BAR"],
            reasons: [...candidate.eligibility.reasons, reason],
            scoreCap: candidate.eligibility.scoreCap === null ? 59 : Math.min(59, candidate.eligibility.scoreCap),
            matchedBrand: candidate.eligibility.matchedBrand,
          },
        })
      }
    }
    for (const candidate of admittedThisRound) {
      if (!domainReadyCandidates.has(candidate.normalizedName)) domainReadyCandidates.set(candidate.normalizedName, candidate)
    }

    const admittedCount = domainReadyCandidates.size
    if (admittedCount >= GUIDED_TARGET_ADMISSIONS || (round >= 2 && admittedCount >= 3)) break
  }

  const judgePool = diverseSelection(
    Array.from(domainReadyCandidates.values()).sort(compareFinalists),
    STANDARD_JUDGE_POOL_SIZE,
  )
  if (judgePool.length) {
    const judgeStarted = Date.now()
    let judgments = new Map<string, JudgedCandidate>()
    try {
      const judged = await judgeCandidates(judgePool, constitution, signal, userIdentifier)
      judgments = judged.judgments
      addUsage(judged.usage)
    } catch (error) {
      console.warn("name-sprint-judge-incomplete", { reason: error instanceof Error ? error.message : "unknown" })
    }
    admissionCandidates = judgePool.flatMap((candidate): NameSprintCandidate[] => {
      const judgment = judgments.get(candidate.normalizedName) || null
      const eligibility = evaluateEligibility(candidate, {
        constitution,
        previouslyRejected,
        recentRootFrequency,
        judgeFatalFlaws: judgment?.fatalFlawCodes,
      })
      if (eligibility.status !== "pass") {
        rejected.push({ ...candidate, eligibility })
        return []
      }
      const primaryStatus = candidate.domainStatuses.find((domain) => domain.tld === "com")?.status || "unknown"
      const founderSignal = scoreFounderSignalV2({
        candidate,
        constitution,
        eligibility,
        judged: judgment,
        preferredTld: "com",
        domainStatus: primaryStatus,
        availableTlds: candidate.domainStatuses.filter((domain) => domain.status === "available").map((domain) => domain.tld),
        launchDomainKind: candidate.launchDomain.kind,
        recentRootFrequency,
      })
      if (founderSignal.band === "Reconsider") {
        rejected.push({
          ...candidate,
          eligibility: {
            status: "review",
            failureCodes: [...eligibility.failureCodes, "BELOW_QUALITY_BAR"],
            reasons: [...eligibility.reasons, `Founder Signal ${founderSignal.score} did not reach the Viable band.`],
            scoreCap: eligibility.scoreCap === null ? 59 : Math.min(59, eligibility.scoreCap),
            matchedBrand: eligibility.matchedBrand,
          },
        })
        return []
      }
      return [{
        ...candidate,
        eligibility,
        founderSignal,
        strongestReason: founderSignal.strongestReason,
        mainRisk: founderSignal.mainRisk,
        evidenceConfidence: founderSignal.confidence,
      }]
    }).sort(compareFinalists)
    timingMs.judgeAndEvidence += Date.now() - judgeStarted
  }

  const collisionStarted = Date.now()
  const collisionCandidates = selectShortlistWithModifiedDomainCap(
    diverseSelection([...admissionCandidates].sort(compareFinalists), 12),
    MAX_FINALISTS_FOR_LIVE_SCREEN,
  )
  const finalCandidates: NameSprintCandidate[] = []
  if (!webCollisionEnabled) {
    if (optionalStageEnabled("NAMOLUX_NAME_SPRINT_ENABLED")) {
      throw new Error("name_sprint_live_screen_disabled")
    }
    finalCandidates.push(...collisionCandidates.map((candidate) => ({ ...candidate, collisionScreen: { status: "not_run" as const, summary: "The static NamoLux collision registry passed; a current web-backed active-brand screen was not enabled for this run.", matchedName: null, sourceUrls: [], checkedAt: null, category: constitution.category, markets: [...constitution.geographicMarkets] } })))
  } else {
    if (collisionCandidates.length) {
      const batch = collisionCandidates.slice(0, CURRENT_COLLISION_BATCH_SIZE)
      const currentCollision = await screenCurrentBrandCollisions(batch, constitution, signal, userIdentifier)
      if (currentCollision.usage.webSearchCalls !== 1) throw new Error("name_sprint_live_screen_incomplete")
      if (Array.from(currentCollision.checks.values()).some((check) => /did not return a complete check/i.test(check.reason))) {
        throw new Error("name_sprint_live_screen_incomplete")
      }
      addUsage(currentCollision.usage)
      let eliteAwarded = false
      for (const candidate of batch) {
          const check = currentCollision.checks.get(candidate.normalizedName)
          if (check?.status === "clear") {
            const availableTlds = candidate.domainStatuses.filter((domain) => domain.status === "available").map((domain) => domain.tld)
            const hasDotCom = availableTlds.includes("com")
            const coreDimensions = candidate.founderSignal.dimensions
            const eliteEligible = !eliteAwarded
              && hasDotCom
              && candidate.founderSignal.score >= 90
              && coreDimensions.strategicFit >= 75
              && coreDimensions.distinctiveness >= 75
              && coreDimensions.memorability >= 70
              && coreDimensions.pronunciation >= 70
              && coreDimensions.spellingCharacter >= 70
            if (eliteEligible) eliteAwarded = true
            const score = candidate.founderSignal.score >= 90 && !eliteEligible ? 89 : candidate.founderSignal.score
            finalCandidates.push({
              ...candidate,
              evidenceConfidence: candidate.founderSignal.confidence === "low" ? "moderate" : "high",
              founderSignal: {
                ...candidate.founderSignal,
                score,
                band: eliteEligible ? "Elite" : score >= 75 ? "Strong" : score >= 60 ? "Viable" : "Reconsider",
                confidence: candidate.founderSignal.confidence === "low" ? "moderate" : "high",
                dimensions: { ...candidate.founderSignal.dimensions, brandCollisionRisk: 95 },
                confidenceReasons: [
                  ...candidate.founderSignal.confidenceReasons,
                  "A current web-backed active-brand screen completed for this candidate.",
                ],
              },
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
