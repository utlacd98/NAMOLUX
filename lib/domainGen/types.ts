export type KeywordInclusionMode = "exact" | "partial" | "none"
export type KeywordPositionMode = "prefix" | "suffix" | "anywhere"
export type NameStyleMode = "real_words" | "brandable_blends"

export interface AutoFindControls {
  seed?: string
  mustIncludeKeyword: KeywordInclusionMode
  keywordPosition: KeywordPositionMode
  style: NameStyleMode
  blocklist: string[]
  allowlist: string[]
  allowHyphen: boolean
  allowNumbers: boolean
  preferTwoWordBrands: boolean
  allowVibeSuffix: boolean
  showAnyAvailable: boolean
}

export interface AutoFindRequestInput {
  keyword: string
  industry?: string
  vibe?: string
  maxLength?: number
  targetCount?: number
  controls: AutoFindControls
}

export interface Candidate {
  name: string
  strategy: string
  roots: string[]
  keywordHits: string[]
}

export interface FilterDecision {
  accepted: boolean
  reasons: string[]
}

export interface ScoredCandidate extends Candidate {
  score: number
  scoreBreakdown: Record<string, number>
  whyTag?: string
  qualityBand?: "high" | "medium" | "low"
}

export interface NearMissOption {
  name: string
  availableTlds: string[]
}

export interface AvailabilityCheckResult {
  domain: string
  available: boolean
  provider: string
  latencyMs: number
  cached?: boolean
  confidence: "high" | "medium" | "low"
  error?: string
}

export interface AvailabilityProvider {
  name: string
  check(domain: string, signal?: AbortSignal): Promise<AvailabilityCheckResult | null>
}

export interface RelaxationStep {
  id: string
  label: string
  applied: boolean
}

export interface AutoFindRunSummary {
  found: number
  target: number
  attempts: number
  maxAttempts: number
  generatedCandidates: number
  passedFilters: number
  checkedAvailability: number
  providerErrors: number
  availabilityHitRate: number
  qualityThreshold: number
  relaxationsApplied: string[]
  topRejectedReasons: Array<{ reason: string; count: number }>
  checkingProgress: string
  suggestions: string[]
  nearMisses: NearMissOption[]
  explanation: string
}

export interface AutoFindRunResult {
  picks: ScoredCandidate[]
  summary: AutoFindRunSummary
}
