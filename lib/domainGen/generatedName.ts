export const NAME_STYLES = [
  "brandable",
  "evocative",
  "compound",
  "alternate_spelling",
  "real_word",
  "short_phrase",
  "non_english",
] as const

export type NameStyle = (typeof NAME_STYLES)[number]

export const CREATIVITY_LEVELS = ["direct", "balanced", "exploratory"] as const

export type CreativityLevel = (typeof CREATIVITY_LEVELS)[number]

export type AvailabilityStatus =
  | "checking"
  | "available"
  | "taken"
  | "likely_available"
  | "needs_verification"
  | "error"

export interface AvailabilityState {
  status: AvailabilityStatus
  available: boolean | null
  confidence: "high" | "medium" | "low" | null
  fullDomain: string
  registerUrl?: string
}

export interface FounderSignalResult {
  status: "scoring" | "ready" | "failed"
  score: number | null
  band: string | null
  breakdown: Record<string, number>
  reasons: string[]
  version: string | null
}

export interface GeneratedName<Tld extends string = string> {
  id: string
  name: string
  rationale: string
  style: NameStyle
  generationRank: number
  availability: Record<Tld, AvailabilityState>
  founderSignal: FounderSignalResult | null
}

/**
 * Creates an opaque-looking, deterministic ID without exposing the brief.
 * The rank is included so a future batch can intentionally contain the same
 * spelling in two different positions without producing duplicate React keys.
 */
export function createGeneratedNameId(name: string, generationRank: number): string {
  const source = `${String(name || "").toLowerCase()}|${Math.max(0, Math.floor(generationRank))}`
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `name_${(hash >>> 0).toString(36)}`
}
