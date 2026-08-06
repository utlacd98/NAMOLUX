export const SPECIALIST_PROVIDER_MODELS = [
  { sourceId: "openai-base", providerId: "openai", modelId: "gpt-4.1-mini-2025-04-14" },
  { sourceId: "openai-sol", providerId: "openai", modelId: "gpt-5.6-sol" },
  { sourceId: "qwen-groq", providerId: "groq", modelId: "qwen/qwen3.6-27b" },
] as const

export const SPECIALIST_SLOTS_PER_MODEL = 12 as const
export const SPECIALIST_SLOTS_PER_BRIEF = 36 as const
export const SPECIALIST_APPROVED_NAMES_PER_BRIEF = 24 as const

export type SpecialistSource = (typeof SPECIALIST_PROVIDER_MODELS)[number]
export type SpecialistSourceId = SpecialistSource["sourceId"]
export type SpecialistProviderId = SpecialistSource["providerId"]
export type SpecialistModelId = SpecialistSource["modelId"]

export type SpecialistSlotStatus = "pending" | "available" | "unavailable"
export type DatasetSplit = "train" | "validation" | "test"
export type CuratorRating = "Great" | "Good" | "Average" | "Reject"
export type RankTier = "lead" | "strong" | "exploratory"
export type ReviewPassNumber = 1 | 2
export type SpecialistVibe = "playful" | "premium" | "tech" | "clean" | "bold" | "friendly"
export type SpecialistNameStyle =
  | "brandable"
  | "evocative"
  | "compound"
  | "alternate_spelling"
  | "real_word"
  | "short_phrase"
  | "non_english"

export interface SpecialistPreferences {
  likedStyles?: SpecialistNameStyle[]
  dislikedStyles?: SpecialistNameStyle[]
  preferredLength?: "short" | "medium" | "long"
  preferredSounds?: string[]
  avoidedSounds?: string[]
}

export interface SpecialistBrief {
  id: string
  description: string
  vibe: SpecialistVibe
  style: "auto"
  creativity: "direct" | "balanced" | "exploratory"
  maxLength: number
  rhymeWith?: string
  blacklist?: string[]
  preferences?: SpecialistPreferences
  locale?: string
  semanticClusterId?: string
  split: DatasetSplit
}

export interface SpecialistCandidatePayload {
  name: string
  rationale?: string
}

export interface SpecialistCaptureSlot {
  sourceSlotId: string
  sourceId: SpecialistSourceId
  providerId: SpecialistProviderId
  modelId: SpecialistModelId
  ordinal: number
  status: SpecialistSlotStatus
  candidate: SpecialistCandidatePayload | null
  gapReason: string | null
}

export interface SpecialistProviderBatch {
  sourceId: SpecialistSourceId
  providerId: SpecialistProviderId
  modelId: SpecialistModelId
  slots: SpecialistCaptureSlot[]
}

export interface PrivateSpecialistCapture {
  schemaVersion: 1
  brief: SpecialistBrief
  batches: SpecialistProviderBatch[]
}

export interface BlindCuratorSlot {
  blindSlotId: string
  status: SpecialistSlotStatus
  name: string | null
  rationale: string | null
  gapReason: string | null
}

export type BlindCuratorCandidate = BlindCuratorSlot

export interface SourceBlindCuratorPack {
  schemaVersion: 1
  packId: string
  brief: Omit<SpecialistBrief, "description"> & { redactedDescription: string }
  slots: BlindCuratorSlot[]
}

export interface PrivateCuratorProvenanceEntry {
  blindSlotId: string
  sourceSlotId: string
  sourceId: SpecialistSourceId
  providerId: SpecialistProviderId
  modelId: SpecialistModelId
  ordinal: number
}

export interface PrivateCuratorProvenance {
  schemaVersion: 1
  packId: string
  briefId: string
  entries: PrivateCuratorProvenanceEntry[]
}

export interface CriticalDefect {
  code: string
  note: string
}

export interface CuratorCandidateDecision {
  blindSlotId: string
  rating: CuratorRating
  shortlisted: boolean
  approved: boolean
  editedName?: string
  rank?: number
  rankTier?: RankTier
  conceptFamily?: string
  visibleAffixes?: string[]
  criticalDefect?: CriticalDefect | null
  notes?: string
}

export interface CuratorAddition {
  additionId: string
  name: string
  rationale: string
  rating: CuratorRating
  shortlisted: boolean
  approved: boolean
  rank?: number
  rankTier?: RankTier
  conceptFamily?: string
  visibleAffixes?: string[]
  criticalDefect?: CriticalDefect | null
  notes?: string
}

export interface CurationShortfall {
  code: "insufficient_quality"
  note: string
}

export interface CurationDraft {
  schemaVersion: 1
  passNumber: ReviewPassNumber
  packId: string
  status: "draft" | "pass_ready"
  shortfall?: CurationShortfall | null
  decisions: CuratorCandidateDecision[]
  additions: CuratorAddition[]
}

export interface ApprovedSpecialistName {
  approvedId: string
  origin: "captured" | "curator_addition"
  blindSlotId: string | null
  additionId: string | null
  name: string
  rationale: string
  rating: Exclude<CuratorRating, "Reject">
  shortlisted: boolean
  rank: number
  rankTier: RankTier
  conceptFamily: string
  visibleAffixes: string[]
}

export interface PassReadyCuration {
  schemaVersion: 1
  passNumber: ReviewPassNumber
  status: "pass_ready"
  shortfall: null
  packId: string
  brief: SourceBlindCuratorPack["brief"]
  approvedNames: ApprovedSpecialistName[]
  reviewedBlindSlotIds: string[]
  gaps: Array<Pick<BlindCuratorSlot, "blindSlotId" | "status" | "gapReason">>
}

export type CurationWarningCode =
  | "duplicate"
  | "near_duplicate"
  | "visible_affix"
  | "phonetic_family"
  | "concept_family"

export interface CurationWarning {
  code: CurationWarningCode
  severity: "warning" | "error"
  approvedIds: string[]
  message: string
  key?: string
}

export interface ValidationIssue {
  code: string
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  warnings: CurationWarning[]
}

export interface ExcludedMaterial {
  descriptions?: string[]
  names?: string[]
  descriptionHashes?: string[]
  nameHashes?: string[]
}

export interface TrainingExportManifest {
  schemaVersion: 1
  passNumber: ReviewPassNumber
  contractId: string
  split: DatasetSplit
  exampleCount: number
  briefIds: string[]
  /** SHA-256 of the exact JSONL bytes, including the final newline. */
  datasetSha256: string
  /** Backwards-readable alias of datasetSha256. */
  jsonlSha256: string
  /** One hash per ordered example's canonical system/user message array. */
  promptSha256: string[]
  exampleSha256: string[]
  sourceCurationSha256: string[]
  excludedMaterialSha256: string | null
  /** SHA-256 of the canonical manifest object before this field is attached. */
  manifestSha256: string
}
