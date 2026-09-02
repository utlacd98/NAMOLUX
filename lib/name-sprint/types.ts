export const NAME_SPRINT_VERSION = "2026.09.02.2" as const
export const FOUNDER_SIGNAL_V2_VERSION = "2.0" as const
export const NAME_SPRINT_TLDS = ["com", "co", "ai"] as const

export const NAMING_MODES = [
  "distinctive_startup",
  "local_service",
  "product_feature",
  "premium_luxury",
  "technical_credible",
  "consumer_friendly",
  "invented_global",
] as const

export type NamingMode = (typeof NAMING_MODES)[number]

export const NAME_SPRINT_STRATEGIES = [
  "suggestive",
  "metaphorical",
  "invented",
  "controlled_coined",
  "meaningful_compound",
  "arbitrary_real_word",
  "verified_root",
] as const

export type NameSprintStrategy = (typeof NAME_SPRINT_STRATEGIES)[number]

export type EvidenceConfidence = "high" | "moderate" | "low"
export type EligibilityStatus = "pass" | "review" | "reject"

export type EligibilityFailureCode =
  | "SYSTEM_RESERVED_NAME"
  | "ACTIVE_BRAND_EXACT"
  | "ACTIVE_BRAND_CLOSE"
  | "COMPETITOR_SIMILARITY"
  | "GENERIC_CATEGORY"
  | "GENERIC_COMPOUND"
  | "GENERIC_CLICHE"
  | "NUMBERS_OR_HYPHENS"
  | "PRONUNCIATION_CLUSTER"
  | "SPELLING_AMBIGUITY"
  | "UNSAFE_MEANING"
  | "RANDOM_SYLLABLES"
  | "FABRICATED_ETYMOLOGY"
  | "SEMANTIC_MISMATCH"
  | "NEAR_DUPLICATE"
  | "PREVIOUSLY_REJECTED"
  | "NO_PREFERRED_DOMAIN"
  | "BELOW_QUALITY_BAR"

export interface NameConstitution {
  description: string
  category: string
  audience: string[]
  problem: string
  promise: string[]
  personality: string[]
  geographicMarkets: string[]
  languages: string[]
  futureExpansion: string[]
  competitors: string[]
  likedNames: string[]
  namingMode: NamingMode
  preferredLength: { min: number; max: number }
  include: string[]
  avoid: string[]
  preferredTlds: string[]
}

export interface SemanticTerritory {
  id: string
  label: string
  meaning: string
  tone: string
  roots: string[]
  avoidRoots: string[]
  strategies: NameSprintStrategy[]
  phoneticCharacter: string
}

export interface RawNameCandidate {
  id: string
  name: string
  normalizedName: string
  strategy: NameSprintStrategy
  territoryId: string
  roots: string[]
  association: string
  pronunciation: string
  claimedOrigin: string | null
  originVerified: boolean
  syllableCount?: number
}

export interface EligibilityDecision {
  status: EligibilityStatus
  failureCodes: EligibilityFailureCode[]
  reasons: string[]
  scoreCap: number | null
  matchedBrand: string | null
}

export interface FounderSignalV2Dimensions {
  strategicFit: number
  distinctiveness: number
  memorability: number
  pronunciation: number
  spellingCharacter: number
  brandCollisionRisk: number
  domainExtension: number
}

export interface FounderSignalV2Result {
  version: typeof FOUNDER_SIGNAL_V2_VERSION
  registryVersion: string
  score: number
  band: "Elite" | "Strong" | "Viable" | "Reconsider"
  eligibility: EligibilityDecision
  confidence: EvidenceConfidence
  confidenceReasons: string[]
  dimensions: FounderSignalV2Dimensions
  strongestReason: string
  mainRisk: string
}

export interface JudgedCandidate {
  name: string
  fatalFlawCodes: EligibilityFailureCode[]
  scores: Omit<FounderSignalV2Dimensions, "domainExtension" | "brandCollisionRisk">
  strongestReason: string
  mainRisk: string
  confidence: EvidenceConfidence
  preferredWithinGroup: number
}

export interface NameSprintCandidate extends RawNameCandidate {
  eligibility: EligibilityDecision
  founderSignal: FounderSignalV2Result
  strongestReason: string
  mainRisk: string
  evidenceConfidence: EvidenceConfidence
  domainStatuses: Array<{ tld: string; status: "available" | "unavailable" | "unknown"; checkedAt: string | null }>
  launchDomain: {
    domain: string
    kind: "exact" | "modified"
    modifier: string | null
    checkedAt: string
  }
  collisionScreen?: {
    status: "clear" | "review" | "not_run"
    summary: string
    matchedName: string | null
    sourceUrls: string[]
    checkedAt: string | null
    category: string
    markets: string[]
  }
}

export interface RejectedNameCandidate extends RawNameCandidate {
  eligibility: EligibilityDecision
}

export interface NameSprintRunResult {
  version: typeof NAME_SPRINT_VERSION
  founderSignalVersion: typeof FOUNDER_SIGNAL_V2_VERSION
  registryVersion: string
  generatedCount: number
  survivorCount: number
  candidates: NameSprintCandidate[]
  rejected: RejectedNameCandidate[]
  territories: SemanticTerritory[]
  attempts: number
  timingMs: {
    generation: number
    screening: number
    judgeAndEvidence: number
    total: number
  }
  usage: {
    model: string
    inputTokens: number
    outputTokens: number
    estimatedUsd: number
    webSearchCalls: number
  }
}
