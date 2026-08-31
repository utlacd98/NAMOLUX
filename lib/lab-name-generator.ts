import OpenAI from "openai"

import {
  getTasteScore,
  hasAiSmellPattern,
  hasMalformedCompoundPattern,
  hasRandomSyllablePattern,
  hasUnsafeBrandMeaning,
  passesTasteGate,
} from "@/lib/domainGen/filters"
import { isGibberish } from "@/lib/domainGen/realness"

export const LAB_TONES = ["luxury", "futuristic", "playful", "trustworthy", "minimal"] as const
export const LAB_DIRECTIONS = ["real", "evocative", "coined", "compound", "surprise"] as const
export const LAB_TLDS = ["com", "io", "co", "ai", "app", "dev"] as const
export const DEFAULT_LAB_NAMING_MODEL = "gpt-5.6-luna"
export type LabTone = (typeof LAB_TONES)[number]
export type LabDirection = (typeof LAB_DIRECTIONS)[number]
export type LabTld = (typeof LAB_TLDS)[number]

export type LabBrief = {
  what: string
  audience: string
  tone: LabTone
  direction: LabDirection
  include: string[]
  exclude: string[]
  maxLength: number
}

export type LabCandidate = { id: string; name: string; rationale: string }
export type LabGenerationContext = { waveNumber?: number; excludedNames?: string[] }

export type LabCandidateDraft = {
  name: string
  rationale: string
  parts: string[]
}

const TERM_STOP_WORDS = new Set(["a", "an", "and", "for", "of", "or", "the", "to", "with"])
const SHORT_PREFIX_EXCLUSIONS = new Set(["ai", "app", "tax"])

// These are useful words in ordinary copy, but joining two of them is the
// repeated category+helper template that made early Scout batches feel like
// interchangeable SaaS labels (for example launch+cue and stack+pulse).
// A compound with one more specific or surprising word remains eligible.
const OVERUSED_COMPOUND_PARTS = new Set([
  "agent", "app", "beam", "bright", "build", "cloud", "code", "core", "craft", "cue", "data", "dev",
  "first", "flow", "forge", "founder", "gauge", "go", "grid", "hub", "kind", "launch", "lens", "line",
  "loom", "market", "nest", "path", "pilot", "pulse", "ready", "runtime", "signal", "stack", "start",
  "task", "trail", "triage", "tuner", "watch", "way", "wise", "works",
])

let openai: OpenAI | null = null
export function getLabNamingModel() {
  return process.env.OPENAI_NAMING_MODEL?.trim() || DEFAULT_LAB_NAMING_MODEL
}

function client() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")
    openai = new OpenAI({ apiKey })
  }
  return openai
}

export function parseLabBrief(input: unknown): LabBrief | null {
  if (!input || typeof input !== "object") return null
  const value = input as Record<string, unknown>
  const text = (key: string, min: number, max: number) => {
    const raw = typeof value[key] === "string" ? value[key].replace(/\s+/g, " ").trim() : ""
    return raw.length >= min && raw.length <= max ? raw : null
  }
  const list = (key: string, max: number) => {
    const source = Array.isArray(value[key])
      ? value[key].filter((item): item is string => typeof item === "string")
      : typeof value[key] === "string"
        ? [value[key]]
        : []
    const terms = source
      .flatMap((item) => item.split(/[,;\n]+/))
      .flatMap((item) => item.trim().split(/\s+/))
      .map((item) => item.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24))
      .filter((item) => item.length >= 2 && !TERM_STOP_WORDS.has(item))
    return Array.from(new Set(terms)).slice(0, max)
  }
  const what = text("what", 8, 500)
  const audience = text("audience", 3, 240)
  const tone = typeof value.tone === "string" && (LAB_TONES as readonly string[]).includes(value.tone) ? value.tone as LabTone : null
  const direction = typeof value.direction === "string" && (LAB_DIRECTIONS as readonly string[]).includes(value.direction) ? value.direction as LabDirection : null
  const maxLength = typeof value.maxLength === "number" && Number.isInteger(value.maxLength) && value.maxLength >= 4 && value.maxLength <= 15 ? value.maxLength : null
  if (!what || !audience || !tone || !direction || !maxLength) return null
  const exclude = list("exclude", 10)
  const excluded = new Set(exclude)
  // An exclusion is the stronger instruction when the same cue appears in
  // both fields. This prevents a contradictory prompt and accidental leakage.
  const include = list("include", 5).filter((term) => !excluded.has(term))
  return { what, audience, tone, direction, include, exclude, maxLength }
}

function cleanName(raw: unknown, maxLength: number) {
  const name = String(raw || "").toLowerCase().replace(/[^a-z]/g, "")
  return name.length >= 4 && name.length <= maxLength ? name : ""
}

export function containsLabExcludedTerm(name: string, term: string) {
  const cleanName = cleanNameForComparison(name)
  const cleanTerm = cleanNameForComparison(term)
  if (!cleanName || !cleanTerm) return false
  if (cleanTerm.length >= 4) return cleanName.includes(cleanTerm)
  if (cleanName === cleanTerm) return true

  // Short exclusions such as `ai`, `app`, and `pro` should block an obvious
  // attached token without rejecting unrelated words such as fair or promise.
  const hasAttachedRemainder = cleanName.length - cleanTerm.length >= 3
  return (SHORT_PREFIX_EXCLUSIONS.has(cleanTerm) && cleanName.startsWith(cleanTerm) && hasAttachedRemainder)
    || (cleanName.endsWith(cleanTerm) && hasAttachedRemainder)
}

export function isGenericLabCompound(parts: readonly string[]) {
  const cleanParts = parts.map(cleanNameForComparison).filter(Boolean)
  return cleanParts.length === 2 && cleanParts.every((part) => OVERUSED_COMPOUND_PARTS.has(part))
}

function cleanNameForComparison(raw: unknown) {
  return String(raw || "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function qualityGate(name: string, brief: LabBrief, excludedNames: ReadonlySet<string>) {
  if (!name || excludedNames.has(name) || brief.exclude.some((term) => containsLabExcludedTerm(name, term))) return false
  return !isGibberish(name) && !hasUnsafeBrandMeaning(name) && !hasRandomSyllablePattern(name)
    && !hasAiSmellPattern(name) && !hasMalformedCompoundPattern(name) && passesTasteGate(name) && getTasteScore(name) >= 50
}

function extractArray(raw: string): unknown[] {
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) as unknown[] } catch { return [] }
}

export function buildLabCompletionRequest(prompt: string, maxTokens: number, model = getLabNamingModel()) {
  const lunaCompatible = model === "gpt-5.6-luna"
  return {
    model,
    ...(lunaCompatible
      ? { reasoning_effort: "none" as const, verbosity: "low" as const, max_completion_tokens: maxTokens }
      : { temperature: 0.75, max_tokens: maxTokens }),
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system", content: "You are an exacting brand-naming specialist. Return valid JSON only. Never claim domain or trademark availability." },
      { role: "user", content: prompt },
    ],
  }
}

async function ask(prompt: string, maxTokens: number, signal: AbortSignal) {
  const completion = await client().chat.completions.create(buildLabCompletionRequest(prompt, maxTokens) as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, { signal })
  return completion.choices[0]?.message?.content || "[]"
}

function candidateParts(candidate: Record<string, unknown>) {
  if (!Array.isArray(candidate.parts)) return []
  return candidate.parts
    .filter((part): part is string => typeof part === "string")
    .map(cleanNameForComparison)
    .filter((part) => part.length >= 2)
    .slice(0, 2)
}

function parseDraft(item: unknown, brief: LabBrief, excludedNames: ReadonlySet<string>): LabCandidateDraft | null {
  const candidate = item && typeof item === "object" ? item as Record<string, unknown> : {}
  const name = cleanName(candidate.name, brief.maxLength)
  if (!name || !qualityGate(name, brief, excludedNames)) return null
  const parts = candidateParts(candidate)
  const declaredStyle = typeof candidate.style === "string" ? candidate.style.toLowerCase() : ""
  const compound = brief.direction === "compound" || declaredStyle === "compound" || parts.length > 0
  if (compound && (parts.length !== 2 || parts.join("") !== name || isGenericLabCompound(parts))) return null
  const rationale = typeof candidate.rationale === "string"
    ? candidate.rationale.replace(/\s+/g, " ").trim().slice(0, 180)
    : "A distinct option shaped for this brief."
  return { name, rationale, parts }
}

function respectsPartDiversity(candidate: LabCandidateDraft, selected: readonly LabCandidateDraft[]) {
  return candidate.parts.every((part) => selected.filter((item) => item.parts.includes(part)).length < 2)
}

/** Select in editorial order while limiting any compound component to two uses. */
export function selectDiverseLabDrafts(
  editorialNames: readonly string[],
  pool: readonly LabCandidateDraft[],
  count: number,
) {
  const byName = new Map(pool.map((candidate) => [candidate.name, candidate]))
  const ordered = [
    ...editorialNames.map((name) => byName.get(cleanNameForComparison(name))).filter((item): item is LabCandidateDraft => Boolean(item)),
    ...pool,
  ]
  const selected: LabCandidateDraft[] = []
  const seen = new Set<string>()
  for (const candidate of ordered) {
    if (seen.has(candidate.name) || !respectsPartDiversity(candidate, selected)) continue
    seen.add(candidate.name)
    selected.push(candidate)
    if (selected.length === count) break
  }
  return selected
}

/** Two independent model passes: broad creative pool, then editorial selection. */
export async function generateLabCandidates(
  brief: LabBrief,
  signal: AbortSignal,
  context: LabGenerationContext = {},
): Promise<LabCandidate[]> {
  const excludedNames = new Set((context.excludedNames || []).map(cleanNameForComparison).filter(Boolean).slice(0, 64))
  const directionRules = brief.direction === "compound"
    ? "Every candidate must join exactly two complete English words. Include parts:[\"word1\",\"word2\"]. Reject category-word plus generic helper constructions. Use no component more than twice."
    : brief.direction === "surprise"
      ? "Use a deliberate mix of real, evocative, coined and compound directions. For compounds include the exact two complete source words in parts; otherwise use parts:[]."
      : `Keep every candidate faithful to the ${brief.direction} direction and use parts:[].`
  const priorRule = excludedNames.size
    ? `This is refinement wave ${context.waveNumber || 2}. Do not return or closely vary any prior name: ${JSON.stringify(Array.from(excludedNames))}.`
    : "This is the first exploration wave."
  const poolPrompt = `Create 36 distinct brand-name candidates as JSON objects [{"name":"...","rationale":"...","style":"real|evocative|coined|compound","parts":[]}].\nBrief: ${JSON.stringify(brief)}\n${priorRule}\n${directionRules}\nThe include list contains conceptual cues, not mandatory literal substrings. Exclusions are hard constraints. Each name must be original, pronounceable and at most ${brief.maxLength} letters. Explore at least six clearly different semantic territories. Avoid repeated roots, generic SaaS compounds, misspellings, famous brands, availability claims, and keyword-plus-fake-suffix names. Rationale: 8-20 words.`
  const poolRaw = await ask(poolPrompt, 2200, signal)
  const seen = new Set<string>()
  const pool = extractArray(poolRaw).flatMap((item) => {
    const candidate = parseDraft(item, brief, excludedNames)
    if (!candidate || seen.has(candidate.name)) return []
    seen.add(candidate.name)
    return [candidate]
  })
  if (pool.length < 12) throw new Error("quality_pool_too_short")
  const editorPrompt = `Choose exactly 12 names from this supplied candidate pool. Return JSON [{"name":"exact supplied name","rationale":"8-20 words"}]. Select the strongest brief fit across different semantic territories. Do not use any compound component more than twice. Reject repetitive category+helper templates. Do not invent, alter, score, rank, or make availability/trademark claims.\nBrief: ${JSON.stringify(brief)}\nPool: ${JSON.stringify(pool)}`
  const selectedRaw = await ask(editorPrompt, 1100, signal)
  const editorialNames: string[] = []
  const editorialRationales = new Map<string, string>()
  for (const item of extractArray(selectedRaw)) {
    const obj = item && typeof item === "object" ? item as Record<string, unknown> : {}
    const name = cleanName(obj.name, brief.maxLength)
    if (!name || editorialNames.includes(name)) continue
    editorialNames.push(name)
    const rationale = typeof obj.rationale === "string" ? obj.rationale.replace(/\s+/g, " ").trim().slice(0, 180) : ""
    if (rationale) editorialRationales.set(name, rationale)
  }
  const selected = selectDiverseLabDrafts(editorialNames, pool, 12)
  if (selected.length !== 12) throw new Error("editorial_diversity_incomplete")
  return selected.map((candidate) => ({
    id: `lab-${candidate.name}`,
    name: candidate.name,
    rationale: editorialRationales.get(candidate.name) || candidate.rationale,
  }))
}
