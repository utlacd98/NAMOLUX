import OpenAI from "openai"

import {
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

let openai: OpenAI | null = null
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
  const list = (key: string, max: number) => Array.isArray(value[key])
    ? value[key].filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase().replace(/[^a-z-]/g, "").slice(0, 24)).filter(Boolean).slice(0, max)
    : []
  const what = text("what", 8, 500)
  const audience = text("audience", 3, 240)
  const tone = typeof value.tone === "string" && (LAB_TONES as readonly string[]).includes(value.tone) ? value.tone as LabTone : null
  const direction = typeof value.direction === "string" && (LAB_DIRECTIONS as readonly string[]).includes(value.direction) ? value.direction as LabDirection : null
  const maxLength = typeof value.maxLength === "number" && Number.isInteger(value.maxLength) && value.maxLength >= 4 && value.maxLength <= 15 ? value.maxLength : null
  if (!what || !audience || !tone || !direction || !maxLength) return null
  return { what, audience, tone, direction, include: list("include", 5), exclude: list("exclude", 10), maxLength }
}

function cleanName(raw: unknown, maxLength: number) {
  const name = String(raw || "").toLowerCase().replace(/[^a-z]/g, "")
  return name.length >= 4 && name.length <= maxLength ? name : ""
}

function qualityGate(name: string, brief: LabBrief) {
  if (!name || brief.exclude.some((term) => name.includes(term))) return false
  if (brief.include.length && !brief.include.some((term) => name.includes(term)) && brief.direction === "compound") return false
  return !isGibberish(name) && !hasUnsafeBrandMeaning(name) && !hasRandomSyllablePattern(name)
    && !hasAiSmellPattern(name) && !hasMalformedCompoundPattern(name) && passesTasteGate(name)
}

function extractArray(raw: string): unknown[] {
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) as unknown[] } catch { return [] }
}

async function ask(prompt: string, maxTokens: number, signal: AbortSignal) {
  const completion = await client().chat.completions.create({
    model: process.env.OPENAI_NAMING_MODEL?.trim() || "gpt-4.1-mini",
    temperature: 0.75,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: "You are an exacting brand-naming specialist. Return valid JSON only. Never claim domain or trademark availability." },
      { role: "user", content: prompt },
    ],
  }, { signal })
  return completion.choices[0]?.message?.content || "[]"
}

/** Two independent model passes: broad creative pool, then editorial selection. */
export async function generateLabCandidates(brief: LabBrief, signal: AbortSignal): Promise<LabCandidate[]> {
  const poolPrompt = `Create 36 distinct brand-name candidates as JSON objects [{"name":"...","rationale":"..."}].\nBrief: ${JSON.stringify(brief)}\nDirection=${brief.direction}. Each name must be an original, pronounceable ${brief.maxLength}-character-or-shorter word/compound. Avoid generic SaaS endings, misspellings, famous brands, availability claims, and keyword-plus-fake-suffix names. Rationale: 8-20 words.`
  const poolRaw = await ask(poolPrompt, 2200, signal)
  const seen = new Set<string>()
  const pool = extractArray(poolRaw).flatMap((item) => {
    const candidate = item && typeof item === "object" ? item as Record<string, unknown> : {}
    const name = cleanName(candidate.name, brief.maxLength)
    if (!name || seen.has(name) || !qualityGate(name, brief)) return []
    seen.add(name)
    const rationale = typeof candidate.rationale === "string" ? candidate.rationale.replace(/\s+/g, " ").trim().slice(0, 180) : "A distinct option shaped for this brief."
    return [{ name, rationale }]
  })
  if (pool.length < 12) throw new Error("quality_pool_too_short")
  const editorPrompt = `Choose exactly 12 names from this supplied candidate pool. Return JSON [{"name":"exact supplied name","rationale":"8-20 words"}]. Preserve diversity and brief fit; do not invent, alter, score, rank, or make availability/trademark claims.\nBrief: ${JSON.stringify(brief)}\nPool: ${JSON.stringify(pool)}`
  const selectedRaw = await ask(editorPrompt, 1100, signal)
  const byName = new Map(pool.map((item) => [item.name, item]))
  const finalists: LabCandidate[] = []
  for (const item of extractArray(selectedRaw)) {
    const obj = item && typeof item === "object" ? item as Record<string, unknown> : {}
    const name = cleanName(obj.name, brief.maxLength)
    const original = byName.get(name)
    if (!original || finalists.some((candidate) => candidate.name === name)) continue
    const rationale = typeof obj.rationale === "string" ? obj.rationale.replace(/\s+/g, " ").trim().slice(0, 180) : original.rationale
    finalists.push({ id: `lab-${name}`, name, rationale: rationale || original.rationale })
    if (finalists.length === 12) break
  }
  if (finalists.length !== 12) throw new Error("editorial_selection_incomplete")
  return finalists
}
