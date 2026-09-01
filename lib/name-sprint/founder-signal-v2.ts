import { scoreName } from "@/lib/founderSignal/scoreName"
import { getFounderSignalBand } from "@/lib/founderSignal/spec"
import { COLLISION_REGISTRY_VERSION } from "./collision-registry"
import { getGenericityIndex } from "./eligibility"
import {
  FOUNDER_SIGNAL_V2_VERSION,
  type EligibilityDecision,
  type EvidenceConfidence,
  type FounderSignalV2Dimensions,
  type FounderSignalV2Result,
  type JudgedCandidate,
  type NameConstitution,
  type RawNameCandidate,
} from "./types"

export const FOUNDER_SIGNAL_V2_DIMENSIONS = [
  { key: "strategicFit", label: "Strategic fit & meaning depth", weight: 20 },
  { key: "distinctiveness", label: "Distinctiveness & search uniqueness", weight: 20 },
  { key: "memorability", label: "Memorability", weight: 15 },
  { key: "pronunciation", label: "Pronunciation", weight: 10 },
  { key: "spellingCharacter", label: "Spelling & character quality", weight: 10 },
  { key: "brandCollisionRisk", label: "Brand & collision risk", weight: 20 },
  { key: "domainExtension", label: "Domain & extension strength", weight: 5 },
] as const satisfies ReadonlyArray<{ key: keyof FounderSignalV2Dimensions; label: string; weight: number }>

export interface ScoreFounderSignalV2Input {
  candidate: RawNameCandidate
  constitution: NameConstitution
  eligibility: EligibilityDecision
  judged?: JudgedCandidate | null
  preferredTld?: string
  domainStatus?: "available" | "unavailable" | "unknown"
  availableTlds?: readonly string[]
  launchDomainKind?: "exact" | "modified"
  liveScreenCompleted?: boolean
  registryFresh?: boolean
  recentRootFrequency?: Readonly<Record<string, number>>
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function meaningfulTokens(value: string): Set<string> {
  return new Set(
    value.toLowerCase().split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !["and", "for", "from", "the", "with"].includes(token)),
  )
}

function deterministicStrategicFit(candidate: RawNameCandidate, constitution: NameConstitution): number {
  const intent = meaningfulTokens([
    constitution.category,
    constitution.problem,
    ...constitution.promise,
    ...constitution.personality,
  ].join(" "))
  const meaning = meaningfulTokens([candidate.association, ...candidate.roots].join(" "))
  const overlap = Array.from(meaning).filter((token) => intent.has(token)).length
  const explicitMeaning = candidate.association.trim().length >= 20 ? 5 : 0
  const territoryDepth = candidate.roots.length >= 1 ? 5 : 0
  return clamp(35 + Math.min(25, overlap * 7) + explicitMeaning + territoryDepth)
}

function blendJudgeScore(judged: number | undefined, deterministic: number, preference: number | undefined) {
  if (judged === undefined) return deterministic
  const preferenceAdjustment = preference === undefined ? 0 : (clamp(preference) - 50) * 0.08
  return clamp(judged * 0.6 + deterministic * 0.4 + preferenceAdjustment)
}

function usefulMainRisk(candidate: RawNameCandidate, supplied: string | undefined, eligibility: EligibilityDecision) {
  const value = supplied?.trim() || eligibility.reasons[0]?.trim() || ""
  const disclaimerOnly = /(?:not legal|legal or trade.?mark|trade.?mark clearance|confirm broader commercial|automated screening)/i.test(value)
  if (value && !disclaimerOnly) return value

  const byStrategy: Record<RawNameCandidate["strategy"], string> = {
    suggestive: "The strategic association may not be immediate without supporting brand context.",
    metaphorical: "The metaphor may need explanation before customers connect it to the product.",
    invented: "The coined spelling needs a spoken radio test with target customers.",
    controlled_coined: "The controlled coinage still needs a spoken radio test with target customers.",
    meaningful_compound: "The compound could feel descriptive if competitors use similar category language.",
    arbitrary_real_word: "The familiar word may be harder to own in search and adjacent markets.",
    verified_root: "The root may already appear across unrelated brands and needs a broader similarity search.",
  }
  return byStrategy[candidate.strategy]
}

function confidenceFor(input: ScoreFounderSignalV2Input): { level: EvidenceConfidence; reasons: string[] } {
  const reasons: string[] = []
  let confidence = 0
  if (input.constitution.description.trim().length >= 80 && input.constitution.category.trim()) {
    confidence += 1
    reasons.push("The Name Constitution contains a clear category and full business brief.")
  }
  if (input.constitution.geographicMarkets.length && input.constitution.languages.length) {
    confidence += 1
    reasons.push("Target markets and languages were supplied.")
  }
  if (input.registryFresh !== false) {
    confidence += 1
    reasons.push(`Collision registry ${COLLISION_REGISTRY_VERSION} is current for this run.`)
  }
  if (input.judged?.confidence === "high") {
    confidence += 1
    reasons.push("The independent blind judge returned high confidence.")
  }
  if (input.domainStatus && input.domainStatus !== "unknown") {
    confidence += 1
    reasons.push("The preferred domain status completed.")
  }
  if (input.liveScreenCompleted) {
    confidence += 1
    reasons.push("A current web-backed active-brand screen completed.")
  }
  if (input.liveScreenCompleted && confidence >= 4) return { level: "high", reasons }
  if (confidence >= 2) return { level: "moderate", reasons }
  return { level: "low", reasons: reasons.length ? reasons : ["The brief or evidence checks are incomplete."] }
}

export function scoreFounderSignalV2(input: ScoreFounderSignalV2Input): FounderSignalV2Result {
  if (input.eligibility.status === "reject") {
    return {
      version: FOUNDER_SIGNAL_V2_VERSION,
      registryVersion: COLLISION_REGISTRY_VERSION,
      score: 0,
      band: "Reconsider",
      eligibility: input.eligibility,
      confidence: "high",
      confidenceReasons: ["A fatal eligibility rule was triggered before scoring."],
      dimensions: {
        strategicFit: 0,
        distinctiveness: 0,
        memorability: 0,
        pronunciation: 0,
        spellingCharacter: 0,
        brandCollisionRisk: 0,
        domainExtension: 0,
      },
      strongestReason: "The candidate is not eligible for Founder Signal comparison.",
      mainRisk: input.eligibility.reasons[0] || "A fatal eligibility defect was detected.",
    }
  }

  const legacy = scoreName({
    name: input.candidate.name,
    tld: input.preferredTld || input.constitution.preferredTlds[0] || "com",
    keywords: input.constitution.include,
  })
  const judged = input.judged?.scores
  const genericity = getGenericityIndex(input.candidate, input.constitution, input.recentRootFrequency)
  const deterministic = {
    strategicFit: deterministicStrategicFit(input.candidate, input.constitution),
    distinctiveness: Math.max(20, legacy.rawScores.memorability - genericity * 0.55),
    memorability: legacy.rawScores.memorability,
    pronunciation: legacy.rawScores.pronounceability,
    spellingCharacter: legacy.rawScores.characterQuality,
  }
  const preference = input.judged?.preferredWithinGroup
  const availableTlds = new Set((input.availableTlds || []).map((tld) => tld.toLowerCase()))
  const domainExtension = availableTlds.has("com")
    ? 100
    : availableTlds.has("co")
      ? 78
      : availableTlds.has("ai")
        ? 72
        : input.launchDomainKind === "modified"
          ? 60
        : input.domainStatus === "available"
          ? 70
          : 0
  const dimensions: FounderSignalV2Dimensions = {
    strategicFit: blendJudgeScore(judged?.strategicFit, deterministic.strategicFit, preference),
    distinctiveness: blendJudgeScore(judged?.distinctiveness, deterministic.distinctiveness, preference),
    memorability: blendJudgeScore(judged?.memorability, deterministic.memorability, preference),
    pronunciation: blendJudgeScore(judged?.pronunciation, deterministic.pronunciation, preference),
    spellingCharacter: blendJudgeScore(judged?.spellingCharacter, deterministic.spellingCharacter, preference),
    brandCollisionRisk: input.liveScreenCompleted ? 95 : Math.min(82, clamp(legacy.rawScores.brandRisk)),
    domainExtension,
  }

  const weighted = FOUNDER_SIGNAL_V2_DIMENSIONS.reduce(
    (total, dimension) => total + dimensions[dimension.key] * (dimension.weight / 100),
    0,
  )
  let score = clamp(weighted)
  score = clamp(score + ((input.judged?.preferredWithinGroup ?? 50) - 50) * 0.12 - genericity * 0.18)
  if (input.eligibility.scoreCap !== null) score = Math.min(score, input.eligibility.scoreCap)
  if (genericity >= 40) score = Math.min(score, 59)
  if (dimensions.distinctiveness < 60 || dimensions.strategicFit < 60 || dimensions.memorability < 55 || dimensions.pronunciation < 55 || dimensions.spellingCharacter < 55) score = Math.min(score, 74)
  if (Object.values(dimensions).some((value) => value < 45)) score = Math.min(score, 74)
  const confidence = confidenceFor(input)
  const calculatedBand = getFounderSignalBand(score)
  const band = calculatedBand === "Elite" && (!input.liveScreenCompleted || !availableTlds.has("com"))
    ? "Strong"
    : calculatedBand

  return {
    version: FOUNDER_SIGNAL_V2_VERSION,
    registryVersion: COLLISION_REGISTRY_VERSION,
    score,
    band,
    eligibility: input.eligibility,
    confidence: confidence.level,
    confidenceReasons: confidence.reasons,
    dimensions,
    strongestReason: input.judged?.strongestReason || input.candidate.association || "The candidate has a defensible connection to the brief.",
    mainRisk: usefulMainRisk(input.candidate, input.judged?.mainRisk, input.eligibility),
  }
}
