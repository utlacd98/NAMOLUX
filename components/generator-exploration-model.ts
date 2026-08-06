import {
  NAME_STYLES,
  type AvailabilityState,
  type CreativityLevel,
  type FounderSignalResult,
  type GeneratedName,
  type NameStyle as GeneratedNameStyle,
} from "@/lib/domainGen/generatedName"

export type {
  AvailabilityState,
  CreativityLevel,
  FounderSignalResult,
  GeneratedName,
}

export const GENERATOR_PREFERENCE_STORAGE_KEY = "namolux_naming_preferences_v1"
export const GENERATOR_HISTORY_STORAGE_KEY = "namolux_generation_history_v2"

export const NAME_STYLE_OPTIONS = [
  { id: "auto", label: "Auto", description: "A deliberately varied mix" },
  { id: "brandable", label: "Brandable", description: "Invented, fluent brand names" },
  { id: "evocative", label: "Evocative", description: "Names that suggest a feeling" },
  { id: "compound", label: "Compound", description: "Two useful ideas combined" },
  { id: "alternate_spelling", label: "Alternate spelling", description: "Familiar sounds, ownable form" },
  { id: "real_word", label: "Real word", description: "Recognisable dictionary words" },
  { id: "short_phrase", label: "Short phrase", description: "Compact, memorable phrases" },
  { id: "non_english", label: "Non-English", description: "Reviewed French (Québec) or Welsh forms" },
] as const satisfies readonly { id: NameStyle; label: string; description: string }[]

export type NameStyle = "auto" | GeneratedNameStyle

export function getQuickStyleMinimumLength(style: NameStyle): number {
  return style === "non_english" ? 12 : 6
}

export const CREATIVITY_OPTIONS = [
  { id: "direct", label: "Direct", description: "Closer to the brief" },
  { id: "balanced", label: "Balanced", description: "Clear with a creative edge" },
  { id: "exploratory", label: "Exploratory", description: "More surprising directions" },
] as const satisfies readonly { id: CreativityLevel; label: string; description: string }[]

export type GenerationModeV2 = "quick" | "advanced"
export type GenerationPhase =
  | "idle"
  | "generating_names"
  | "names_ready"
  | "checking_domains"
  | "ready"
  | "scoring_founder_signal"

export type GeneratorResultsAdPosition = "none" | "inline_after_quick_results" | "after_results"

export interface NamingPreferenceProfile {
  version: 1
  likedStyles: GeneratedNameStyle[]
  dislikedStyles: GeneratedNameStyle[]
  preferredLength?: "short" | "medium" | "long"
  preferredSounds: string[]
  avoidedSounds: string[]
  updatedAt: number
}

export interface QuickGenerationShortfall {
  reason: string
  resultCount: number
  requestedCount: number
}

interface UnknownRecord {
  [key: string]: unknown
}

const KNOWN_STYLES = new Set<string>(NAME_STYLES)
const KNOWN_AVAILABILITY = new Set<string>([
  "checking",
  "available",
  "taken",
  "likely_available",
  "needs_verification",
  "error",
])

export function createEmptyPreferenceProfile(): NamingPreferenceProfile {
  return {
    version: 1,
    likedStyles: [],
    dislikedStyles: [],
    preferredSounds: [],
    avoidedSounds: [],
    updatedAt: 0,
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normaliseName(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().replace(/[^a-zA-Z0-9-]/g, "").slice(0, 63)
}

function normaliseStyle(value: unknown): GeneratedNameStyle {
  return typeof value === "string" && KNOWN_STYLES.has(value) ? (value as GeneratedNameStyle) : "brandable"
}

function normaliseStatus(value: unknown, available?: boolean | null): AvailabilityState["status"] {
  if (typeof value === "string" && KNOWN_AVAILABILITY.has(value)) return value as AvailabilityState["status"]
  if (available === true) return "likely_available"
  if (available === false) return "taken"
  return "checking"
}

function safeText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 800)
  }
  return "A distinctive direction shaped around the brief."
}

function candidateAvailability(
  raw: UnknownRecord,
  name: string,
  tlds: readonly string[],
): Record<string, AvailabilityState> {
  const supplied = isRecord(raw.availability) ? raw.availability : null
  const availability: Record<string, AvailabilityState> = {}

  for (const tld of tlds) {
    const entry = supplied && isRecord(supplied[tld]) ? supplied[tld] : null
    const available = entry?.available === true ? true : entry?.available === false ? false : null
    const status = normaliseStatus(entry?.status, available)
    availability[tld] = {
      status,
      available,
      confidence:
        entry?.confidence === "high" || entry?.confidence === "medium" || entry?.confidence === "low"
          ? entry.confidence
          : null,
      fullDomain: typeof entry?.fullDomain === "string" ? entry.fullDomain : `${name.toLowerCase()}.${tld}`,
      registerUrl: typeof entry?.registerUrl === "string" ? entry.registerUrl : undefined,
    }
  }

  return availability
}

/**
 * Converts both candidate-first V2 responses and the legacy flattened/domain
 * response into the same presentation model without changing generation order.
 */
export function parseGeneratedCandidates(
  payload: unknown,
  tlds: readonly string[],
  limit: number,
): GeneratedName[] {
  if (!isRecord(payload)) return []
  const rawList = Array.isArray(payload.candidates)
    ? payload.candidates
    : Array.isArray(payload.domains)
      ? payload.domains
      : Array.isArray(payload.results)
        ? payload.results
        : []

  const grouped = new Map<string, UnknownRecord[]>()
  for (const raw of rawList) {
    if (!isRecord(raw)) continue
    const name = normaliseName(raw.name)
    if (name.length < 2) continue
    const key = name.toLowerCase()
    grouped.set(key, [...(grouped.get(key) ?? []), raw])
  }

  return Array.from(grouped.values())
    .slice(0, limit)
    .map((rows, index) => {
      const primary = rows[0]
      const name = normaliseName(primary.name)
      const availability = candidateAvailability(primary, name, tlds)

      // A legacy response can include one row per TLD. Fold those rows into the
      // candidate while retaining the first-seen candidate order.
      for (const row of rows) {
        if (typeof row.tld !== "string" || !tlds.includes(row.tld)) continue
        const available = row.available === true ? true : row.available === false ? false : null
        availability[row.tld] = {
          status: normaliseStatus(row.checkStatus, available),
          available,
          confidence:
            row.availabilityConfidence === "high" ||
            row.availabilityConfidence === "medium" ||
            row.availabilityConfidence === "low"
              ? row.availabilityConfidence
              : null,
          fullDomain:
            typeof row.fullDomain === "string" ? row.fullDomain : `${name.toLowerCase()}.${row.tld}`,
          registerUrl: typeof row.registerUrl === "string" ? row.registerUrl : undefined,
        }
      }

      return {
        id:
          typeof primary.id === "string" && primary.id.trim()
            ? primary.id
            : `generated-${index + 1}-${name.toLowerCase()}`,
        name,
        rationale: safeText(
          primary.rationale,
          primary.reasoning,
          primary.personalDescription,
          primary.personality,
          primary.meaning,
        ),
        style: normaliseStyle(primary.style),
        generationRank:
          typeof primary.generationRank === "number" && Number.isFinite(primary.generationRank)
            ? primary.generationRank
            : index + 1,
        availability,
        founderSignal: isRecord(primary.founderSignal)
          ? normaliseFounderSignal(primary.founderSignal)
          : null,
      }
    })
    .sort((a, b) => a.generationRank - b.generationRank)
}

/**
 * Accepts a partial Quick batch only for an explicitly requested construction
 * style and only when the server supplies the complete shortfall contract.
 * Auto is deliberately excluded because it must always publish all 16 names.
 */
export function parseQuickGenerationShortfall(
  payload: unknown,
  requestedStyle: NameStyle,
  resultCount: number,
  requestedCount = 16,
): QuickGenerationShortfall | null {
  if (requestedStyle === "auto" || resultCount <= 0 || resultCount >= requestedCount || !isRecord(payload)) return null
  if (!isRecord(payload.generationMeta)) return null
  const meta = payload.generationMeta
  if (meta.isPartial !== true || meta.resultCount !== resultCount || meta.requestedCount !== requestedCount) return null
  if (typeof meta.styleShortfallReason !== "string") return null
  const reason = meta.styleShortfallReason.trim().slice(0, 360)
  return reason ? { reason, resultCount, requestedCount } : null
}

function normaliseFounderSignal(raw: UnknownRecord): FounderSignalResult {
  const breakdown: Record<string, number> = {}
  if (isRecord(raw.breakdown)) {
    for (const [key, value] of Object.entries(raw.breakdown)) {
      if (typeof value === "number" && Number.isFinite(value)) breakdown[key] = value
    }
  }
  return {
    status: raw.status === "failed" || raw.status === "scoring" ? raw.status : "ready",
    score: typeof raw.score === "number" && Number.isFinite(raw.score) ? raw.score : null,
    band: typeof raw.band === "string" ? raw.band : null,
    breakdown,
    reasons: Array.isArray(raw.reasons)
      ? raw.reasons.filter((reason): reason is string => typeof reason === "string").slice(0, 5)
      : [],
    version: typeof raw.version === "string" ? raw.version : null,
  }
}

export function mergeAvailability(
  candidates: GeneratedName[],
  payload: unknown,
): GeneratedName[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) return candidates
  const updates = new Map<string, UnknownRecord[]>()
  for (const raw of payload.results) {
    if (!isRecord(raw)) continue
    const name = normaliseName(raw.name).toLowerCase()
    if (!name) continue
    updates.set(name, [...(updates.get(name) ?? []), raw])
  }

  return candidates.map((candidate) => {
    const rows = updates.get(candidate.name.toLowerCase())
    if (!rows) return candidate
    const availability = { ...candidate.availability }
    for (const row of rows) {
      if (typeof row.tld !== "string") continue
      const available = row.available === true ? true : row.available === false ? false : null
      availability[row.tld] = {
        status: normaliseStatus(row.checkStatus, available),
        available,
        confidence:
          row.availabilityConfidence === "high" ||
          row.availabilityConfidence === "medium" ||
          row.availabilityConfidence === "low"
            ? row.availabilityConfidence
          : null,
        fullDomain:
          typeof row.fullDomain === "string"
            ? row.fullDomain
            : `${candidate.name.toLowerCase()}.${row.tld}`,
        registerUrl: typeof row.registerUrl === "string" ? row.registerUrl : undefined,
      }
    }
    return { ...candidate, availability }
  })
}

export function markAvailabilityFailed(candidates: GeneratedName[]): GeneratedName[] {
  return candidates.map((candidate) => ({
    ...candidate,
    availability: Object.fromEntries(
      Object.entries(candidate.availability).map(([tld, state]) => [
        tld,
        state.status === "checking" ? { ...state, status: "error" as const } : state,
      ]),
    ),
  }))
}

/** Restores only failed checks to a live state before a token-bound retry. */
export function markFailedAvailabilityChecking(candidates: GeneratedName[]): GeneratedName[] {
  return candidates.map((candidate) => ({
    ...candidate,
    availability: Object.fromEntries(
      Object.entries(candidate.availability).map(([tld, state]) => [
        tld,
        state.status === "error" ? { ...state, status: "checking" as const } : state,
      ]),
    ),
  }))
}

export function markAvailabilityTldsFailed(
  candidates: GeneratedName[],
  failedTlds: readonly string[],
): GeneratedName[] {
  const failed = new Set(failedTlds)
  return candidates.map((candidate) => ({
    ...candidate,
    availability: Object.fromEntries(
      Object.entries(candidate.availability).map(([tld, state]) => [
        tld,
        failed.has(tld) && state.status === "checking" ? { ...state, status: "error" as const } : state,
      ]),
    ),
  }))
}

export function collectFailedAvailabilityTlds(candidates: GeneratedName[]): string[] {
  const failed = new Set<string>()
  for (const candidate of candidates) {
    for (const [tld, state] of Object.entries(candidate.availability)) {
      if (state.status === "error") failed.add(tld)
    }
  }
  return Array.from(failed)
}

export function mergeFounderSignal(candidates: GeneratedName[], payload: unknown): GeneratedName[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) return candidates
  const byId = new Map<string, FounderSignalResult>()
  const byName = new Map<string, FounderSignalResult>()
  for (const raw of payload.results) {
    if (!isRecord(raw) || !isRecord(raw.founderSignal)) continue
    const result = normaliseFounderSignal(raw.founderSignal)
    if (typeof raw.id === "string") byId.set(raw.id, result)
    const name = normaliseName(raw.name)
    if (name) byName.set(name.toLowerCase(), result)
  }
  return candidates.map((candidate) => ({
    ...candidate,
    founderSignal: byId.get(candidate.id) ?? byName.get(candidate.name.toLowerCase()) ?? candidate.founderSignal,
  }))
}

export function parseBlacklist(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
        .filter(Boolean),
    ),
  ).slice(0, 20)
}

export function planAvailabilityTldChunks(
  candidateCount: number,
  tlds: readonly string[],
  maxExpandedChecks = 75,
): string[][] {
  const tldsPerRequest = Math.max(1, Math.floor(maxExpandedChecks / Math.max(candidateCount, 1)))
  const chunks: string[][] = []
  for (let index = 0; index < tlds.length; index += tldsPerRequest) {
    chunks.push(Array.from(tlds.slice(index, index + tldsPerRequest)))
  }
  return chunks
}

function lengthPreference(name: string): "short" | "medium" | "long" {
  if (name.length <= 7) return "short"
  if (name.length <= 11) return "medium"
  return "long"
}

function soundMarker(name: string): string | null {
  const clean = name.toLowerCase().replace(/[^a-z]/g, "")
  if (clean.length < 4) return null
  return clean.slice(-3)
}

function uniqueLast<T>(values: T[], limit: number): T[] {
  return Array.from(new Set(values)).slice(-limit)
}

export function learnFromCandidate(
  profile: NamingPreferenceProfile,
  candidate: GeneratedName,
  signal: "save" | "dislike" | "more_like_this",
  now = Date.now(),
): NamingPreferenceProfile {
  const positive = signal !== "dislike"
  const marker = soundMarker(candidate.name)
  const likedStyles = positive
    ? uniqueLast([...profile.likedStyles.filter((style) => style !== candidate.style), candidate.style], 4)
    : profile.likedStyles.filter((style) => style !== candidate.style)
  const dislikedStyles = positive
    ? profile.dislikedStyles.filter((style) => style !== candidate.style)
    : uniqueLast([...profile.dislikedStyles.filter((style) => style !== candidate.style), candidate.style], 4)

  return {
    version: 1,
    likedStyles,
    dislikedStyles,
    preferredLength: positive ? lengthPreference(candidate.name) : profile.preferredLength,
    preferredSounds: marker && positive
      ? uniqueLast([...profile.preferredSounds.filter((sound) => sound !== marker), marker], 6)
      : profile.preferredSounds.filter((sound) => sound !== marker),
    avoidedSounds: marker && !positive
      ? uniqueLast([...profile.avoidedSounds.filter((sound) => sound !== marker), marker], 6)
      : profile.avoidedSounds.filter((sound) => sound !== marker),
    updatedAt: now,
  }
}

export function applyCandidateDislikes(
  base: NamingPreferenceProfile,
  candidates: Iterable<GeneratedName>,
): NamingPreferenceProfile {
  return Array.from(candidates).reduce(
    (profile, candidate) => learnFromCandidate(profile, candidate, "dislike"),
    base,
  )
}

export function normalisePreferenceProfile(value: unknown): NamingPreferenceProfile {
  if (!isRecord(value) || value.version !== 1) return createEmptyPreferenceProfile()
  const styles = (input: unknown): GeneratedNameStyle[] =>
    Array.isArray(input)
      ? input.filter((style): style is GeneratedNameStyle => typeof style === "string" && KNOWN_STYLES.has(style)).slice(0, 4)
      : []
  const sounds = (input: unknown): string[] =>
    Array.isArray(input)
      ? input
          .filter((sound): sound is string => typeof sound === "string" && /^[a-z]{2,4}$/.test(sound))
          .slice(0, 6)
      : []

  return {
    version: 1,
    likedStyles: styles(value.likedStyles),
    dislikedStyles: styles(value.dislikedStyles),
    preferredLength:
      value.preferredLength === "short" || value.preferredLength === "medium" || value.preferredLength === "long"
        ? value.preferredLength
        : undefined,
    preferredSounds: sounds(value.preferredSounds),
    avoidedSounds: sounds(value.avoidedSounds),
    updatedAt: typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
  }
}

export function sortCandidatesByFounderSignal(candidates: GeneratedName[], enabled: boolean): GeneratedName[] {
  if (!enabled) return [...candidates].sort((a, b) => a.generationRank - b.generationRank)
  return [...candidates].sort((a, b) => {
    const aScore = a.founderSignal?.status === "ready" ? a.founderSignal.score ?? -1 : -1
    const bScore = b.founderSignal?.status === "ready" ? b.founderSignal.score ?? -1 : -1
    return bScore - aScore || a.generationRank - b.generationRank
  })
}

/**
 * Returns a domain only after the availability workflow has positively
 * verified it. A checking, likely, unknown, or failed state must never be
 * converted into an assumed `.com` shortlist entry.
 */
export function selectVerifiedAvailableDomain(candidate: GeneratedName): string | null {
  const verified = Object.values(candidate.availability).find(
    (state) => state.status === "available" && state.available === true && Boolean(state.fullDomain),
  )
  return verified?.fullDomain ?? null
}

/** Keeps the redesigned Quick ad between the complete card list and secondary actions. */
export function resolveGeneratorResultsAdPosition(input: {
  hasResultsReady: boolean
  redesignEnabled: boolean
  isQuickMode: boolean
  isProUser: boolean
}): GeneratorResultsAdPosition {
  if (!input.hasResultsReady || input.isProUser) return "none"
  if (input.redesignEnabled && input.isQuickMode) return "inline_after_quick_results"
  return "after_results"
}

/**
 * Uses the visible Founder Signal order, then promotes an explicitly selected
 * candidate for rail actions without mutating the card collection.
 */
export function orderCandidatesForDecision(
  candidates: GeneratedName[],
  sortByScore: boolean,
  selectedCandidateId: string | null,
): GeneratedName[] {
  const ordered = sortCandidatesByFounderSignal(candidates, sortByScore)
  if (!selectedCandidateId) return ordered
  const selectedIndex = ordered.findIndex((candidate) => candidate.id === selectedCandidateId)
  if (selectedIndex <= 0) return ordered
  return [ordered[selectedIndex], ...ordered.slice(0, selectedIndex), ...ordered.slice(selectedIndex + 1)]
}

export function isFounderSignalAllowanceExhaustedResponse(status: number, payload: unknown): boolean {
  return status === 429 && isRecord(payload) && payload.error === "founder_signal_monthly_limit_reached"
}
