import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import OpenAI from "openai"
import { autoFind5DotComByFounderScore, type AutoFindVibe } from "@/lib/autofind/autoFindByFounderScore"
import {
  hasAiSmellPattern,
  hasMalformedCompoundPattern,
  hasRandomSyllablePattern,
  hasRecognisableBrandRoot,
  hasUnsafeBrandMeaning,
  passesTasteGate,
} from "@/lib/domainGen/filters"
import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import { createGeneratedNameId } from "@/lib/domainGen/generatedName"
import { generateQuickCandidates, selectPrimaryQuickCandidates, type QuickGenerateVibe } from "@/lib/domainGen/quickGenerate"
import { generateGroqQuickCandidates } from "@/lib/domainGen/quickGenerateGroq"
import { isGibberish, isKeywordClone } from "@/lib/domainGen/realness"
import { rankCandidates } from "@/lib/domainGen/scoreCandidates"
import { expandRelatedTerms, parseKeywordTokens } from "@/lib/domainGen/synonyms"
import { scoreName } from "@/lib/founderSignal/scoreName"
import { ADVANCED_SCORING_TOKEN_TTL_MS, issueGenerationWorkflowToken } from "@/lib/generation-workflow-token"
import { isAdvancedGenerateEmergencyHoldEnabled, isGeneratorRedesignEnabled } from "@/lib/generator-flags"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { trackMetric } from "@/lib/metrics"
import {
  checkBurstLimit,
  checkFeatureQuotaIdempotent,
  checkRateLimit,
  getFeatureQuotaReplayState,
  getFeatureQuotaState,
  getRateLimitState,
  logGeneration,
} from "@/lib/rate-limit"
import { brandExamples, buildGenerationPrompt } from "@/lib/brandExamples"
import { isSystemReservedName } from "@/lib/reserved-names"

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set")
    }
    openaiInstance = new OpenAI({
      apiKey,
    })
  }
  return openaiInstance
}

function generationWorkflowIdentity(request: NextRequest, userId: string | null): string {
  if (userId) return `user:${userId}`
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown"
  return `anonymous:${ip}`
}

function advancedQuotaWorkflowKey(input: {
  requestId: string
  keyword: string
  vibe: string
  industry?: string
  maxLength: number
  refinementInstruction?: string
  alreadySeen: readonly string[]
}): string {
  // Bind a retry to the exact normalized request without persisting the brief.
  // Reusing a client request ID with different inputs must be a new allowance,
  // while an exact retry resolves to the same opaque marker.
  return createHash("sha256")
    .update(JSON.stringify({
      version: "advanced-candidate-first-v2",
      requestId: input.requestId,
      keyword: input.keyword,
      vibe: input.vibe,
      industry: input.industry || "",
      maxLength: input.maxLength,
      refinementInstruction: input.refinementInstruction || "",
      alreadySeen: [...input.alreadySeen].sort(),
    }))
    .digest("hex")
}

// ── AI candidate source ──────────────────────────────────────────────────────
// The LLM is the creative engine; the deterministic Founder Signal pipeline is
// the authority. Every AI name passes the same taste/slop gates as engine names.
// On any AI failure (bad key, rate limit, timeout) we silently fall back to the
// deterministic engine so generation never hard-fails.

const FALLBACK_NAMING_MODELS = ["gpt-4.1-mini", "gpt-4o-mini"]
const MAX_KEYWORD_LENGTH = 1_000
const MAX_ALREADY_SEEN = 50
const SUPPORTED_VIBES = new Set(["luxury", "futuristic", "playful", "trustworthy", "minimal"])
const ADVANCED_BURST_LIMIT = 6
const AUTO_FIND_BURST_LIMIT = 3

function normaliseRefinementInstruction(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const text = value.replace(/\s+/g, " ").trim()
  if (/Focus exclusively on invented CVCV/i.test(text)) {
    return "THIS BATCH: Use short, naturally pronounceable coined words. Do not clip words, repeat fragments, or use fake-Latin endings. Every name must retain a verifiable concept cue from the brief."
  }
  if (/Focus on compound words that clearly describe/i.test(text)) {
    return "THIS BATCH: Use two complete, familiar words whose combined meaning clearly relates to the product and audience. Do not abbreviate or damage either word."
  }
  if (/All names must be 4.{0,3}7 characters/i.test(text)) {
    return "THIS BATCH: Prefer concise names, but never clip or misspell a word to meet the length target. Return fewer names if the quality bar cannot be met."
  }
  if (/Maximum playfulness/i.test(text)) {
    return "THIS BATCH: Add a warm sensory or emotional hook while keeping every name credible for the stated audience and category."
  }
  if (/Optimise for \.com availability/i.test(text)) {
    return "THIS BATCH: Prefer less crowded full-word compounds and natural phonetics. Do not claim availability and do not sacrifice readability for rarity."
  }
  return undefined
}

function cleanAiNarrative(value: unknown, minimumCharacters: number): string | undefined {
  if (typeof value !== "string") return undefined
  const clean = value.replace(/\s+/g, " ").replace(/[<>]/g, "").trim().slice(0, 360)
  if (clean.length < minimumCharacters || clean.split(" ").filter(Boolean).length < 8) return undefined
  if (/\b(available|availability|trademark safe|guaranteed|perfect name|best name)\b/i.test(clean)) return undefined
  return clean
}

interface AiNameSuggestion {
  name: string
  reasoning?: string
  meaning?: string
}

async function fetchAiNameCandidates(opts: {
  keyword: string
  industry?: string
  vibe?: string
  maxLength: number
  batchSize: number
  outputFormat?: "names-only" | "with-metadata"
  alreadySeen?: string[]
  refinementInstruction?: string
  totalTimeoutMs?: number
  signal?: AbortSignal
}): Promise<AiNameSuggestion[]> {
  if (!process.env.OPENAI_API_KEY?.trim()) return []
  if (opts.signal?.aborted) throw new DOMException("Generation cancelled", "AbortError")

  const { system, user } = buildGenerationPrompt({
    keywords: opts.keyword,
    industry: opts.industry || "general",
    brandVibe: opts.vibe || "modern",
    maxLength: opts.maxLength,
    batchSize: opts.batchSize,
    outputFormat: opts.outputFormat || "with-metadata",
    alreadySeen: opts.alreadySeen || [],
  })
  const finalSystem = opts.refinementInstruction ? `${system}\n\n${opts.refinementInstruction}` : system

  const preferred = process.env.OPENAI_NAMING_MODEL?.trim()
  const models = Array.from(new Set([preferred, ...FALLBACK_NAMING_MODELS].filter(Boolean))) as string[]
  const deadline = Date.now() + (opts.totalTimeoutMs ?? 12_000)

  for (const model of models) {
    if (opts.signal?.aborted) throw new DOMException("Generation cancelled", "AbortError")
    const remaining = deadline - Date.now()
    if (remaining < 800) break

    const attemptStarted = Date.now()
    const attemptController = new AbortController()
    const abortFromRequest = () => attemptController.abort(opts.signal?.reason)
    opts.signal?.addEventListener("abort", abortFromRequest, { once: true })
    const attemptTimer = setTimeout(
      () => attemptController.abort(new DOMException("AI naming timed out", "TimeoutError")),
      remaining,
    )
    try {
      const completion = await getOpenAI().chat.completions.create(
        {
          model,
          messages: [
            { role: "system", content: finalSystem },
            { role: "user", content: user },
          ],
          temperature: 0.9,
          max_tokens: opts.outputFormat === "names-only" ? 300 : 1100,
        },
        { signal: attemptController.signal },
      )

      const responseText = completion.choices[0]?.message?.content || "[]"
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : []

      const seen = new Set<string>()
      const suggestions: AiNameSuggestion[] = []
      for (const item of Array.isArray(parsed) ? parsed : []) {
        const rawName = typeof item === "string" ? item : item?.name
        const clean = String(rawName || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 63)
        if (clean.length < 3 || seen.has(clean)) continue
        seen.add(clean)
        suggestions.push({
          name: clean,
          reasoning: cleanAiNarrative(item?.reasoning, 45),
          meaning: cleanAiNarrative(item?.meaning, 60),
        })
      }

      if (suggestions.length > 0) {
        console.log(`AI naming model ${model}: ${suggestions.length} names in ${Date.now() - attemptStarted}ms`)
        return suggestions
      }
    } catch (error) {
      if (opts.signal?.aborted) throw error
      console.error(
        `AI naming model ${model} failed after ${Date.now() - attemptStarted}ms:`,
        error instanceof Error ? error.message : error,
      )
    } finally {
      clearTimeout(attemptTimer)
      opts.signal?.removeEventListener("abort", abortFromRequest)
    }
  }

  return []
}

// Names of real companies used as prompt examples — the LLM sometimes echoes
// them back. An echoed example is a trademark collision, never a winner.
const KNOWN_BRAND_NAMES = new Set(
  Object.values(brandExamples).flatMap((entry) => entry.names.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, ""))),
)

/**
 * Quality gate for AI-sourced names — same standard as engine names, but
 * keyword inclusion is allowed (an AI name like "mealcraft" for a meal-prep
 * brief is intentional, not a mutation). Pure keyword clones still rejected.
 */
function passesAiQualityGate(name: string, keywordTokens: string[], maxLength: number): boolean {
  if (name.length < 4 || name.length > maxLength) return false
  if (KNOWN_BRAND_NAMES.has(name)) return false
  // Doubled-consonant endings ("markett", "shopp") read as typo-squats;
  // ll/ss/zz are natural English closes and stay allowed
  if (/([bcdfghjkmnpqrtvwxy])\1$/.test(name)) return false
  if (isGibberish(name)) return false
  if (isKeywordClone(name, keywordTokens)) return false
  if (hasUnsafeBrandMeaning(name)) return false
  if (hasRandomSyllablePattern(name)) return false
  if (hasAiSmellPattern(name)) return false
  if (hasMalformedCompoundPattern(name)) return false
  if (!passesTasteGate(name)) return false
  return true
}

/**
 * Advanced exploration intentionally does not use Founder Signal as an
 * admission gate. Only objective safety and severe legibility failures are
 * rejected here; evaluation happens later when the user requests it.
 */
function passesAdvancedCreativeGate(name: string, maxLength: number): boolean {
  if (name.length < 3 || name.length > maxLength) return false
  if (KNOWN_BRAND_NAMES.has(name)) return false
  if (/([bcdfghjkmnpqrtvwxy])\1$/.test(name)) return false
  if (isGibberish(name)) return false
  if (hasUnsafeBrandMeaning(name)) return false
  if (hasRandomSyllablePattern(name)) return false
  if (hasMalformedCompoundPattern(name)) return false
  return passesTasteGate(name)
}

/**
 * Final-pass diversity: prevent the returned batch from clustering on the
 * same prefix or suffix ("-flow", "-path", "paw-" three times in a row reads
 * as machine output even when each name is individually fine).
 */
function diversifyPicks<T extends { candidate: { name: string } }>(items: T[], limit: number): T[] {
  const out: T[] = []
  const deferred: T[] = []
  const suffixUse = new Map<string, number>()
  const prefixUse = new Map<string, number>()
  const rootUse = new Map<string, number>()

  for (const item of items) {
    if (out.length >= limit) break
    const name = item.candidate.name
    const suffix = name.slice(-3)
    const prefix = name.slice(0, 4)
    const root = name.slice(0, 3)
    if (
      (suffixUse.get(suffix) || 0) >= 2 ||
      (prefixUse.get(prefix) || 0) >= 2 ||
      (rootUse.get(root) || 0) >= 3
    ) {
      deferred.push(item)
      continue
    }
    out.push(item)
    suffixUse.set(suffix, (suffixUse.get(suffix) || 0) + 1)
    prefixUse.set(prefix, (prefixUse.get(prefix) || 0) + 1)
    rootUse.set(root, (rootUse.get(root) || 0) + 1)
  }

  for (const item of deferred) {
    if (out.length >= limit) break
    out.push(item)
  }

  return out
}

function isAutoFindV2Enabled(): boolean {
  const serverFlag = process.env.AUTO_FIND_V2
  const publicFlag = process.env.NEXT_PUBLIC_AUTO_FIND_V2

  if (serverFlag === "false" || publicFlag === "false") return false
  if (serverFlag === "true" || publicFlag === "true") return true

  // Default on so quality-first multi-TLD auto-find is active unless explicitly disabled.
  return true
}

function toAutoFindVibe(value: unknown): AutoFindVibe {
  const safe = String(value || "").toLowerCase()
  if (safe === "luxury") return "Luxury"
  if (safe === "futuristic") return "Futuristic"
  if (safe === "playful") return "Playful"
  if (safe === "trustworthy") return "Trustworthy"
  return "Minimal"
}

function toQuickGenerateVibe(value: unknown): QuickGenerateVibe {
  const safe = String(value || "").toLowerCase()
  if (safe === "luxury") return "premium"
  if (safe === "futuristic") return "tech"
  if (safe === "playful") return "playful"
  if (safe === "trustworthy") return "clean"
  return "clean"
}

interface PersonalizedNameCopy {
  personalDescription: string
  styleRationale: string
  slogan: string
}

function formatBrandName(name: string): string {
  const clean = String(name || "").replace(/[^a-z0-9]/gi, "")
  return clean ? `${clean[0].toUpperCase()}${clean.slice(1)}` : "This name"
}

function cleanBriefText(value: unknown, fallback: string): string {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
  if (!text) return fallback
  return text.length > 110 ? `${text.slice(0, 107).trim()}...` : text
}

function getBriefCore(value: unknown, fallback: string): string {
  const words = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => !["the", "and", "for", "with", "that", "this", "from", "your", "into", "about"].includes(word))
    .slice(0, 3)

  return words.length > 0 ? words.join(" ") : fallback
}

function getVibeCopy(vibe: unknown): { label: string; description: string; sloganTemplate: string } {
  const safe = String(vibe || "").toLowerCase()
  if (safe === "luxury") {
    return {
      label: "Luxury",
      description: "premium, polished, and restrained",
      sloganTemplate: "Elevated by design.",
    }
  }
  if (safe === "futuristic") {
    return {
      label: "Futuristic",
      description: "sharp, modern, and forward-looking",
      sloganTemplate: "Build what comes next.",
    }
  }
  if (safe === "playful") {
    return {
      label: "Playful",
      description: "friendly, upbeat, and easy to remember",
      sloganTemplate: "Make it feel effortless.",
    }
  }
  if (safe === "trustworthy") {
    return {
      label: "Trustworthy",
      description: "clear, credible, and dependable",
      sloganTemplate: "Confidence from the first click.",
    }
  }
  return {
    label: "Minimal",
    description: "clean, simple, and direct",
    sloganTemplate: "Simple name. Strong signal.",
  }
}

function buildPersonalizedNameCopy(input: {
  name: string
  keyword: string
  industry?: string
  vibe?: string
  founderScore?: number
  whyItWorks?: string | null
  meaningBreakdown?: string | null
  reasons?: string[]
}): PersonalizedNameCopy {
  const displayName = formatBrandName(input.name)
  const brief = cleanBriefText(input.keyword, "your idea")
  const industry = cleanBriefText(input.industry, "your market")
  const vibe = getVibeCopy(input.vibe)
  const briefCore = getBriefCore(input.keyword, industry.toLowerCase())
  const score = typeof input.founderScore === "number" ? input.founderScore : undefined
  const proof =
    input.whyItWorks ||
    input.meaningBreakdown ||
    input.reasons?.slice(0, 2).join(" ") ||
    `${displayName} keeps the name concise, pronounceable, and brandable.`
  const scoreText = score
    ? score >= 75
      ? `Its Founder Signal score of ${score}/100 supports it as a strong shortlist candidate.`
      : score >= 60
        ? `Its Founder Signal score of ${score}/100 places it in the viable range, with room for comparison.`
        : `Its Founder Signal score of ${score}/100 suggests this direction needs more scrutiny before selection.`
    : ""

  return {
    personalDescription: `${displayName} was shortlisted against the brief "${brief}" for ${industry}. ${proof} ${scoreText}`.replace(/\s+/g, " ").trim(),
    styleRationale: `Style fit: ${vibe.label}. The name is built to feel ${vibe.description}, which matches the selected vibe while keeping the domain short enough to scan, say, and remember.`,
    slogan: `${displayName}: ${briefCore[0]?.toUpperCase() || "Y"}${briefCore.slice(1)}, ${vibe.sloganTemplate.toLowerCase()}`,
  }
}

function isNameStyleV2Enabled(): boolean {
  const serverFlag = process.env.NAME_STYLE_MODE_V2
  const publicFlag = process.env.NEXT_PUBLIC_NAME_STYLE_MODE_V2
  if (serverFlag === "false" || publicFlag === "false") return false
  if (serverFlag === "true" || publicFlag === "true") return true
  return true
}

const PREVIEW_REJECTED_STRATEGIES = new Set([
  "root_suffix",
  "prefix_root",
  "real_word_twist",
  "vowel_swap",
  "letter_omission",
  "soft_connector_blend",
])

const PREVIEW_AWKWARD_PATTERN =
  /(?:[bcdfghjklmnpqrstvwxyz]{4,}|[jqxz]{2,}|ctiv|uict|eace|cec|erer$|ener$|ana$|alse$|^aral|^aran|^vala|oong|enen|aea|poi|zoz|poo|babe|pop|meetng|schedul|calend|bookng|timng)/i

const PREVIEW_GENERIC_SINGLE_WORDS = new Set([
  "anchor",
  "atlas",
  "cedar",
  "forge",
  "frame",
  "lumen",
  "north",
  "pilot",
  "ridge",
  "sage",
  "scope",
  "signal",
  "vault",
  "vector",
])

const LOW_INTENT_TERMS = new Set([
  "brand",
  "business",
  "company",
  "startup",
  "platform",
  "service",
  "services",
  "product",
  "products",
  "solution",
  "solutions",
  "tool",
  "tools",
  "small",
  "modern",
  "premium",
  "trusted",
  "reliable",
  "clear",
  "smart",
  "digital",
  "online",
  "based",
  "focused",
  "focusing",
])

const DOMAIN_THESAURUS: Record<string, string[]> = {
  accountant: ["ledger", "books", "cash", "tax", "invoice"],
  accounting: ["ledger", "books", "cash", "tax", "invoice"],
  appointment: ["slot", "calendar", "meet", "time", "booking"],
  appointments: ["slot", "calendar", "meet", "time", "booking"],
  botanical: ["leaf", "flora", "herb", "sage", "grove", "bloom"],
  carbon: ["climate", "green", "renew", "grid", "terra"],
  coaching: ["guide", "mentor", "coach", "path"],
  contract: ["brief", "counsel", "law", "draft", "rights"],
  contracts: ["brief", "counsel", "law", "draft", "rights"],
  consulting: ["advisory", "guide", "strategy", "clarity"],
  delivery: ["route", "fleet", "ship", "dock", "load"],
  designer: ["design", "brief", "canvas", "frame", "studio"],
  designers: ["design", "brief", "canvas", "frame", "studio"],
  dog: ["paw", "pet", "walk", "tail", "companion"],
  ecommerce: ["cart", "order", "merchant", "checkout", "stock"],
  exam: ["study", "learn", "mentor", "class", "skill"],
  exams: ["study", "learn", "mentor", "class", "skill"],
  freelance: ["brief", "studio", "contract", "work", "client"],
  education: ["learn", "class", "skill", "mentor", "study"],
  energy: ["solar", "grid", "watt", "renew", "climate"],
  fitness: ["train", "fit", "active", "strength"],
  gym: ["fit", "fuel", "active", "train", "strength"],
  math: ["study", "tutor", "logic", "class", "skill"],
  maths: ["study", "tutor", "logic", "class", "skill"],
  meal: ["plate", "prep", "fresh", "kitchen", "plant"],
  meals: ["plate", "prep", "fresh", "kitchen", "plant"],
  freight: ["route", "fleet", "ship", "dock", "load"],
  garden: ["home", "plant", "grow", "nest", "yard"],
  health: ["care", "well", "vital", "mind"],
  inventory: ["stock", "order", "warehouse", "supply"],
  legal: ["law", "counsel", "brief", "rights", "trust"],
  logistics: ["route", "fleet", "ship", "dock", "stock"],
  mental: ["mind", "care", "mend", "solace", "haven"],
  nonprofit: ["mission", "impact", "care", "community", "support"],
  pet: ["paw", "vet", "care", "companion", "tail"],
  plant: ["green", "plate", "fresh", "kitchen", "grow"],
  prep: ["meal", "plate", "fresh", "kitchen", "daily"],
  renewable: ["solar", "grid", "green", "carbon", "climate"],
  skincare: ["skin", "glow", "sage", "bloom", "leaf"],
  shipping: ["ship", "route", "fleet", "dock", "load"],
  solar: ["grid", "watt", "renew", "bright"],
  tutor: ["learn", "study", "mentor", "class", "skill"],
  tutoring: ["learn", "study", "mentor", "class", "skill"],
  therapy: ["mind", "mend", "solace", "care", "haven"],
  wellness: ["well", "care", "mind", "balance", "vital"],
  walking: ["walk", "paw", "path", "stride", "care"],
}

function normaliseRoot(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function stemRoot(value: string): string {
  const clean = normaliseRoot(value)
  if (clean.endsWith("ies") && clean.length > 5) return `${clean.slice(0, -3)}y`
  if (clean.endsWith("ing") && clean.length > 6) return clean.slice(0, -3)
  if (clean.endsWith("es") && clean.length > 5) return clean.slice(0, -2)
  if (clean.endsWith("s") && clean.length > 4) return clean.slice(0, -1)
  return clean
}

function buildIntentRoots(value: string, industry?: string): string[] {
  const keywordTokens = parseKeywordTokens(value)
  const explicitTokens = value
    .toLowerCase()
    .split(/[\s,./|;:()[\]{}'"!?-]+/)
    .map(stemRoot)
    .filter((token) => token.length >= 3 && !LOW_INTENT_TERMS.has(token))

  const roots = new Set<string>()

  for (const token of [...keywordTokens, ...explicitTokens]) {
    const root = stemRoot(token)
    if (root.length < 3 || LOW_INTENT_TERMS.has(root)) continue
    roots.add(root)
    for (const related of DOMAIN_THESAURUS[root] || DOMAIN_THESAURUS[token] || []) {
      roots.add(stemRoot(related))
    }
  }

  for (const related of expandRelatedTerms(keywordTokens, industry)) {
    const root = stemRoot(related)
    if (root.length >= 4 && !LOW_INTENT_TERMS.has(root) && (roots.has(root) || DOMAIN_THESAURUS[root])) {
      roots.add(root)
    }
  }

  return Array.from(roots).slice(0, 42)
}

function buildPreviewQualitySeeds(value: string, industry?: string, vibe?: string): string[] {
  const context = `${value} ${industry || ""}`.toLowerCase()
  const seeds = new Set<string>()
  const isBeauty = /(beauty|skin|skincare|cosmetic|botanical|luxe|luxury|fashion|refill|sensitive)/.test(context)
  const isPet = /\b(pet|pets|dog|dogs|cat|cats|paw|paws|vet|vets|walking|sitting|groom|grooming|companion)\b/.test(context)
  const isEducation = /(education|school|student|students|teen|teenager|math|maths|tutor|tutoring|exam|exams|learn|study|class)/.test(context)
  const isFood = /(food|meal|meals|prep|kitchen|vegan|plant based|plant-based|restaurant|chef|plate|gym people|nutrition)/.test(context)
  const isLegal = /(legal|law|contract|contracts|counsel|compliance|freelance|rights|review software)/.test(context)
  const isBookkeeping = /(bookkeep|accounting|accountant|invoice|invoicing|receipt|receipts|cashflow|cash flow|ledger|tax)/.test(context)
  const isFinance = !isBookkeeping && /(finance|fintech|banking|payments|payroll|wealth|capital|invest|budget|expense)/.test(context)
  const isScheduling = /(schedul|calendar|meeting|meetings|booking|bookings|appointment|appointments|remote|team|teams|shift|availability|slot|slots)/.test(context)
  const isLogistics = !isFood && !isPet && /(logistics|supply chain|shipping|delivery|freight|warehouse|inventory|e-?commerce|merchant|fulfill|route|fleet)/.test(context)
  const isEnergy = /(renewable|clean energy|energy|solar|wind|climate|carbon|green tech|waste|recycle|environment|grid)/.test(context)
  const isWellness = !isPet && !isEducation && /(wellness|mental|therapy|health|journal|anxiety|calm|support|safe|mind|reflection|wellbeing)/.test(context)
  const isMentalHealth = !isEducation && /(mental|therapy|support network|wellbeing|anxiety|counseling|counselling)/.test(context)

  if (isWellness || isMentalHealth) {
    ;["kindhaven", "stillnest", "mendwell", "solace", "lumen", "bloom", "sage", "hearth", "still", "vela", "maeva", "kindra", "sonder", "nest", "mend", "amity"].forEach((name) =>
      seeds.add(name),
    )
  }

  if (isBeauty) {
    ;["sagemint", "opalbloom", "velasage", "puregrove", "bloomwell", "glowfield", "cedarglow", "lumenleaf", "stillbloom", "maevaskin", "refillbloom", "podgrove", "botanipod", "sagepod", "leafluxe", "mintrefill"].forEach((name) =>
      seeds.add(name),
    )
  }

  if (isBookkeeping) {
    ;["ledgernest", "cashridge", "clearledger", "vaultflow", "northledger", "frameledger", "receiptflow", "basisbooks", "jobledger", "sitebooks", "buildledger", "crewbooks", "invoiceyard", "taxframe", "receiptpath", "cashbeam"].forEach((name) => seeds.add(name))
  } else if (isFinance || (!isLegal && /(trust|security|b2b|enterprise)/.test(context))) {
    ;["vaultflow", "trustframe", "clearvault", "capitalpath", "mintledger", "fundframe", "basisflow", "payridge", "cashpilot", "securebooks"].forEach((name) => seeds.add(name))
  }

  if (isPet) {
    ;["pawpath", "petstride", "tailwise", "walkhaven", "pawpilot", "citypaw", "caretail", "pawmate", "petanchor", "dogstride", "walkmate", "pawroute", "tailpath", "petrover", "pawsitter", "walkwise", "houndpath", "pawhaven"].forEach((name) => seeds.add(name))
  }

  if (isEducation) {
    ;["mathmentor", "studywise", "exambridge", "tutorpath", "classforge", "skillnest", "learnpilot", "mentorline", "studycraft", "logicclass", "examstride", "mathpath", "teenmentor", "classpilot", "studyforge", "quizbridge", "skillpath", "logicmentor"].forEach((name) => seeds.add(name))
  }

  if (isFood) {
    ;["plantplate", "mealcraft", "freshprep", "prepwise", "kitchenfit", "platepath", "dailyplate", "greenmeal", "fitplate", "prepfuel", "gymplate", "fuelprep", "platefuel", "freshfuel", "prepstride", "macromeal", "fitkitchen", "dailyfuel"].forEach((name) => seeds.add(name))
  }

  if (isLegal) {
    ;["briefwise", "contractpath", "counselcraft", "draftwell", "clearbrief", "lawbridge", "rightframe", "clientbrief", "briefpilot", "trustdraft", "clausewise", "draftpilot", "contractly", "rightsift", "briefbridge", "clausepath", "legalframe", "reviewbrief"].forEach((name) => seeds.add(name))
  }

  if (isScheduling) {
    ;["meetflow", "syncpath", "teamtempo", "slotpilot", "timeframe", "shiftflow", "calridge", "teamstride", "meetatlas", "syncframe", "slotwise", "teamcal", "meetpilot", "shiftpath", "timebridge", "calpilot", "remoteclock", "rallytime", "slotframe", "teamrally"].forEach((name) => seeds.add(name))
  }

  if (isLogistics) {
    ;["routeforge", "fleetflow", "shipgrid", "cartpilot", "stockpath", "orderly", "dockwise", "merchantroute", "fulfillr", "loadpath"].forEach((name) => seeds.add(name))
  }

  if (isEnergy) {
    ;["gridwise", "solarpath", "carbonclear", "greenridge", "renewly", "climateforge", "wattfield", "brightgrid", "terraflow", "futuregrid", "wattwise", "gridpilot", "solargrid", "buildingwatt", "metergrid", "energyframe", "wattbridge", "powertrace"].forEach((name) => seeds.add(name))
  }

  if (!isWellness && !isMentalHealth && !isPet && !isEducation && !isFood && !isLegal && !isBookkeeping && !isScheduling && !isLogistics && !isEnergy && /(ai|software|saas|dev|tool|data|automation|analytics)/.test(context)) {
    ;["atlasflow", "clearpilot", "lumen", "scope", "hinge", "frame", "pilot", "vector", "atlas", "signal", "northstar", "cedarflow"].forEach((name) => seeds.add(name))
  }

  if (seeds.size === 0) {
    ;["lumenforge", "havennest", "bloomfield", "ridgecraft", "sagemint", "slatepath", "velacore", "emberline", "cedarflow", "northstar"].forEach((name) => seeds.add(name))
  }

  return Array.from(seeds)
}

function previewContextRoots(value: string, industry?: string): string[] {
  const context = `${value} ${industry || ""}`.toLowerCase()
  if (/\b(pet|pets|dog|dogs|cat|cats|paw|paws|vet|vets|walking|sitting|groom|grooming|companion)\b/.test(context)) {
    return ["paw", "pet", "dog", "tail", "walk", "care", "stride", "companion", "vet"]
  }
  if (/(education|school|student|students|teen|teenager|math|maths|tutor|tutoring|exam|exams|learn|study|class)/.test(context)) {
    return ["math", "study", "tutor", "learn", "mentor", "class", "skill", "exam", "logic"]
  }
  if (/(food|meal|meals|prep|kitchen|vegan|plant based|plant-based|restaurant|chef|plate|gym people|nutrition)/.test(context)) {
    return ["meal", "plate", "prep", "fresh", "kitchen", "plant", "green", "fit", "fuel", "daily"]
  }
  if (/(legal|law|contract|contracts|counsel|compliance|freelance|rights|review software)/.test(context)) {
    return ["brief", "contract", "counsel", "law", "draft", "right", "trust", "client"]
  }
  if (/(bookkeep|accounting|accountant|invoice|invoicing|receipt|receipts|cashflow|cash flow|ledger|tax)/.test(context)) {
    return ["ledger", "cash", "vault", "book", "books", "invoice", "receipt", "balance", "clear", "basis", "frame"]
  }
  if (/(schedul|calendar|meeting|meetings|booking|bookings|appointment|appointments|remote|team|teams|shift|availability|slot|slots)/.test(context)) {
    return ["sync", "team", "time", "slot", "meet", "tempo", "shift", "flow", "path", "pilot", "frame", "atlas", "rally"]
  }
  if (/(logistics|supply chain|shipping|delivery|freight|warehouse|inventory|e-?commerce|merchant|fulfill|route|fleet)/.test(context)) {
    return ["route", "fleet", "ship", "grid", "cart", "stock", "dock", "order", "load", "path", "flow"]
  }
  if (/(renewable|clean energy|energy|solar|wind|climate|carbon|green tech|waste|recycle|environment|grid)/.test(context)) {
    return ["grid", "solar", "carbon", "green", "renew", "climate", "watt", "terra", "future", "clear", "field"]
  }
  if (/(beauty|skin|skincare|cosmetic|botanical|luxe|luxury|fashion|refill|sensitive)/.test(context)) {
    return ["skin", "sage", "mint", "opal", "bloom", "glow", "grove", "lumen", "leaf", "pure", "cedar", "still"]
  }
  if (/(wellness|mental|therapy|health|journal|anxiety|calm|support|safe|care|mind|reflection|teen|teenager|nonprofit|community|social impact|wellbeing)/.test(context)) {
    return ["kind", "haven", "still", "mend", "well", "solace", "hearth", "sage", "mind", "amity", "sonder"]
  }
  return []
}

function previewContextFit(name: string, roots: string[]): number {
  if (roots.length === 0) return 0
  const clean = name.toLowerCase()
  return roots.reduce((count, root) => count + (clean.includes(root) ? 1 : 0), 0)
}

function previewIntentFit(name: string, roots: string[]): number {
  if (roots.length === 0) return 0
  const clean = name.toLowerCase()
  let score = 0

  for (const root of roots) {
    if (root.length < 3) continue
    if (clean === root) score += 3
    else if (clean.includes(root)) score += root.length >= 5 ? 3 : 2
    else if (root.length >= 5 && clean.includes(root.slice(0, -1))) score += 1
  }

  return score
}

function isPreviewQualityCandidate(name: string, strategy: string, maxLength: number): boolean {
  const clean = name.toLowerCase().replace(/[^a-z]/g, "")
  if (clean.length < 4 || clean.length > maxLength) return false
  if (PREVIEW_REJECTED_STRATEGIES.has(strategy)) return false
  if (PREVIEW_AWKWARD_PATTERN.test(clean)) return false
  if (strategy !== "curated_emotional" && PREVIEW_GENERIC_SINGLE_WORDS.has(clean)) return false
  if (hasUnsafeBrandMeaning(clean) || hasRandomSyllablePattern(clean)) return false
  if (strategy === "curated_emotional") return true
  if (!hasRecognisableBrandRoot(clean) && strategy !== "curated_emotional") return false
  if (hasAiSmellPattern(clean) || !passesTasteGate(clean)) return false
  return true
}

export async function POST(request: NextRequest) {
  const labBlockResponse = getGeneratorLabApiBlockResponse(request)
  if (labBlockResponse) return labBlockResponse

  try {
    const requestStartedAt = Date.now()
    const payload = await request.json().catch(() => null)
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "A valid JSON request is required" }, { status: 400 })
    }

    const keyword = typeof payload.keyword === "string" ? payload.keyword.trim().slice(0, MAX_KEYWORD_LENGTH) : ""
    if (keyword.length < 2) {
      return NextResponse.json({ error: "Describe the product, audience, or category in at least two characters." }, { status: 400 })
    }

    const requestedVibe = typeof payload.vibe === "string" ? payload.vibe.toLowerCase() : "minimal"
    const vibe = SUPPORTED_VIBES.has(requestedVibe) ? requestedVibe : "minimal"
    const industry = typeof payload.industry === "string" ? payload.industry.replace(/[<>]/g, "").trim().slice(0, 80) : undefined
    const maxLength = Math.max(6, Math.min(15, typeof payload.maxLength === "number" && Number.isFinite(payload.maxLength) ? Math.floor(payload.maxLength) : 10))
    const count = typeof payload.count === "number" && Number.isFinite(payload.count) ? Math.floor(payload.count) : undefined
    const autoFindV2 = payload.autoFindV2 === true
    const generatorV2 = payload.generatorV2
    const redesignV2 = isGeneratorRedesignEnabled()
    if (isAdvancedGenerateEmergencyHoldEnabled()) {
      return NextResponse.json(
        {
          error: "advanced_generation_quality_hold",
          message: "Advanced Generate is temporarily being improved to protect result quality. Please try again shortly; no allowance was used.",
          retryable: true,
          generationMeta: {
            resultCount: 0,
            isPartial: true,
            qualityState: "temporarily_paused",
          },
        },
        { status: 503 },
      )
    }
    const workflowRequestId = typeof payload.requestId === "string" ? payload.requestId.trim() : ""
    if (redesignV2 && !autoFindV2 && !/^[a-zA-Z0-9._:-]{16,200}$/.test(workflowRequestId)) {
      return NextResponse.json(
        { error: "invalid_request_id", message: "A valid Advanced workflow request id is required." },
        { status: 400 },
      )
    }
    const refinementInstruction = normaliseRefinementInstruction(payload.refinementInstruction)
    const alreadySeen: string[] = Array.isArray(payload.alreadySeen)
      ? payload.alreadySeen.slice(0, MAX_ALREADY_SEEN).map((name: unknown) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 63)).filter(Boolean)
      : []
    const workflowQuotaKey = redesignV2 && !autoFindV2
      ? advancedQuotaWorkflowKey({
          requestId: workflowRequestId,
          keyword,
          vibe,
          industry,
          maxLength,
          refinementInstruction,
          alreadySeen,
        })
      : workflowRequestId

    const burst = await checkBurstLimit(
      request,
      autoFindV2 ? "advanced-auto-find" : "advanced-generate",
      autoFindV2 ? AUTO_FIND_BURST_LIMIT : ADVANCED_BURST_LIMIT,
    )
    if (!burst.allowed) {
      return NextResponse.json(
        {
          error: "generation_rate_limited",
          message: "Please wait a moment before starting another naming batch.",
          resetAt: burst.resetAt,
        },
        { status: burst.unavailable ? 503 : 429 },
      )
    }

    const replayState = redesignV2 && !autoFindV2
      ? await getFeatureQuotaReplayState(request, "advanced-generation-monthly", workflowQuotaKey)
      : { replayed: false, unavailable: false }
    if (replayState.unavailable) {
      return NextResponse.json(
        { error: "usage_check_unavailable", message: "Usage checks are temporarily unavailable. Please try again shortly." },
        { status: 503 },
      )
    }

    // Invalid requests never consume one of the user's monthly workflows.
    const rateLimitResult = autoFindV2
      ? await getRateLimitState(request)
      : redesignV2
        ? await getFeatureQuotaState(request, "advanced-generation-monthly", 3)
        : await checkRateLimit(request, "domain")

    if (autoFindV2 && !rateLimitResult.isPro) {
      return NextResponse.json(
        { error: "pro_required", message: "Auto-find premium domains is included with NamoLux Pro." },
        { status: 403 },
      )
    }

    if (!autoFindV2 && !rateLimitResult.allowed && !replayState.replayed) {
      if (redesignV2 && "used" in rateLimitResult) {
        return NextResponse.json(
          {
            error: rateLimitResult.statusCode === 503
              ? "usage_check_unavailable"
              : "advanced_generation_monthly_limit_reached",
            message: rateLimitResult.statusCode === 503
              ? rateLimitResult.message
              : "The free plan includes 3 Advanced naming batches per month. Upgrade for unlimited fair-use access.",
            upgradeUrl: "/pricing",
            resetAt: rateLimitResult.resetAt,
            tokensUsed: rateLimitResult.used,
            tokensTotal: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
          },
          { status: rateLimitResult.statusCode },
        )
      }
      if (!("tokensUsed" in rateLimitResult)) {
        return NextResponse.json(
          { error: "usage_check_unavailable", message: "Usage checks are temporarily unavailable. Please try again shortly." },
          { status: 503 },
        )
      }
      return NextResponse.json(
        {
          error: "monthly_usage_limit_reached",
          message: rateLimitResult.message || "Free plan includes 3 uses per month. Upgrade for unlimited access.",
          resetAt: rateLimitResult.resetAt,
          tokensUsed: rateLimitResult.tokensUsed,
          tokensTotal: rateLimitResult.tokensTotal,
          remaining: rateLimitResult.remaining,
        },
        { status: rateLimitResult.statusCode || 429 }
      )
    }

    const hasCustomCount = typeof count === "number" && Number.isFinite(count)
    const safeCount = redesignV2 ? 12 : hasCustomCount ? Math.max(12, Math.min(Math.floor(count), 20)) : 10
    // Once the rollout is enabled, Advanced generation is always candidate-first.
    // A client-controlled legacy flag must never restore hidden score filtering or
    // bypass the dedicated Advanced allowance. Auto-find remains its own explicit
    // score-led Pro workflow and is handled above.
    const useQualityGenerator = redesignV2 ? true : generatorV2 !== false

    if (autoFindV2) {
      if (!isAutoFindV2Enabled()) {
        return NextResponse.json({ error: "Auto-find V2 is disabled." }, { status: 400 })
      }

      const started = Date.now()

      // AI creative pass first — names tailored to the brief get availability-
      // checked alongside (and ahead of) procedural candidates. Time-boxed so a
      // slow/failed AI call never blocks the deterministic engine.
      const aiSeedSuggestions = await fetchAiNameCandidates({
        keyword: keyword.trim(),
        industry: typeof industry === "string" ? industry : undefined,
        vibe: typeof vibe === "string" ? vibe.toLowerCase() : undefined,
        maxLength: typeof maxLength === "number" ? maxLength : 9,
        batchSize: 16,
        outputFormat: "names-only",
        totalTimeoutMs: 7_000,
        signal: request.signal,
      })

      const result = await autoFind5DotComByFounderScore({
        keywords: keyword.trim(),
        industry: typeof industry === "string" ? industry : undefined,
        vibe: toAutoFindVibe(vibe),
        maxLen: typeof maxLength === "number" ? maxLength : 9,
        seedNames: aiSeedSuggestions
          .map((suggestion) => suggestion.name)
          .filter((name) =>
            passesAiQualityGate(name, parseKeywordTokens(keyword), typeof maxLength === "number" ? maxLength : 9),
          ),
        maxAttempts: typeof payload.maxAttempts === "number" ? payload.maxAttempts : undefined,
        timeCapMs: typeof payload.timeCapMs === "number" ? payload.timeCapMs : undefined,
        scoreFloor: typeof payload.scoreFloor === "number" ? payload.scoreFloor : undefined,
        topNToCheck: typeof payload.topNToCheck === "number" ? payload.topNToCheck : undefined,
        poolSize: typeof payload.poolSize === "number" ? payload.poolSize : undefined,
        tlds: Array.isArray(payload.tlds) ? payload.tlds : undefined,
      })

      const userAgent = request.headers.get("user-agent") || undefined
      const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined

      trackMetric({
        action: "name_generation",
        metadata: {
          briefLength: keyword.length,
          vibe,
          industry,
          mode: "auto_find_v2",
          aiSeeds: aiSeedSuggestions.length,
          found: result.found.length,
          target: 5,
          attempts: result.stats.attempts,
          generatedCandidates: result.stats.generated,
          checkedAvailability: result.stats.checkedAvailability,
          filteredCandidates: Math.max(0, result.stats.generated - result.stats.passedQuality),
          elapsedMs: Date.now() - started,
        },
        userAgent,
        country,
      })

      const checked = Math.max(result.stats.checkedAvailability, 1)
      const availabilityHitRate = Number(((result.found.length / checked) * 100).toFixed(2))

      // Log generation for rate limiting (only for free users - pro users don't need logging for limits)
      if (!rateLimitResult.isPro) {
        logGeneration(request, rateLimitResult.userId, "domain", undefined, result.found.length).catch(() => {})
      }

      const verifiedPicks = result.found.map((pick) => {
        const visibleFounderScore = rateLimitResult.isPro ? pick.founderScore : undefined
        const whyItWorks = rateLimitResult.isPro
          ? `Founder Signal ${pick.founderScore}/100.`
          : "Selected as an available, quality-filtered domain direction."
        const meaningBreakdown = rateLimitResult.isPro
          ? "Founder Signal quality-first selection."
          : "Availability and baseline brand mechanics were checked for this direction."
        const copy = buildPersonalizedNameCopy({
          name: pick.name,
          keyword: keyword.trim(),
          industry: typeof industry === "string" ? industry : undefined,
          vibe: typeof vibe === "string" ? vibe : undefined,
          founderScore: visibleFounderScore,
          whyItWorks,
          meaningBreakdown,
          reasons: pick.reasons,
        })

        return {
          name: pick.name,
          tld: pick.tld,
          fullDomain: pick.domain,
          available: true,
          score: visibleFounderScore,
          founderScore: visibleFounderScore,
          pronounceable: rateLimitResult.isPro ? pick.label === "Pronounceable" : undefined,
          memorability: rateLimitResult.isPro ? Number(Math.min(10, Math.max(1, pick.founderScore / 10)).toFixed(1)) : undefined,
          length: pick.name.length,
          strategy: "founder_score_priority",
          scoreBreakdown: rateLimitResult.isPro ? { founderSignal: pick.founderScore } : undefined,
          roots: [] as string[],
          whyTag: rateLimitResult.isPro ? (pick.reasons ?? []).slice(0, 2).join(" | ") : undefined,
          qualityBand: rateLimitResult.isPro ? (pick.founderScore >= 85 ? "high" : pick.founderScore >= 75 ? "medium" : "low") : undefined,
          meaningScore: rateLimitResult.isPro ? Math.min(100, Math.max(10, pick.founderScore)) : undefined,
          meaningBreakdown,
          whyItWorks,
          brandableScore: rateLimitResult.isPro ? Number(Math.min(10, Math.max(1, pick.founderScore / 10)).toFixed(1)) : undefined,
          pronounceabilityScore: rateLimitResult.isPro ? (pick.label === "Pronounceable" ? 90 : 72) : undefined,
          ...copy,
        }
      })

      const picks = [...verifiedPicks]

      return NextResponse.json({
        success: true,
        autoFindV2: true,
        isPro: rateLimitResult.isPro,
        picks,
        summary: {
          found: result.found.length,
          target: 5,
          attempts: result.stats.attempts,
          maxAttempts: typeof payload.maxAttempts === "number" ? payload.maxAttempts : 5,
          generatedCandidates: result.stats.generated,
          passedFilters: result.stats.passedQuality,
          checkedAvailability: result.stats.checkedAvailability,
          providerErrors: 0,
          availabilityHitRate,
          qualityThreshold: typeof payload.scoreFloor === "number" ? payload.scoreFloor : 80,
          relaxationsApplied: [],
          topRejectedReasons: [],
          checkingProgress: `Checking ${result.stats.checkedAvailability}/${result.stats.generated}... Found ${result.found.length}/5`,
          suggestions: result.found.length < 5 ? ["increase_length", "two_word_mode", "allow_suffix", "switch_tld_io_ai"] : [],
          nearMisses: [],
          explanation: result.message,
        },
      })
    }

    if (redesignV2 && useQualityGenerator) {
      const safeVibe = vibe.toLowerCase()
      const safeIndustry = industry
      const safeMaxLength = maxLength
      const seenNames = new Set(alreadySeen)
      const advancedSeed =
        `advanced-${workflowRequestId}:${keyword}:${safeVibe}:${safeIndustry || ""}:${String(refinementInstruction || "")}:${seenNames.size}`
      const advancedDescription = [
        keyword,
        safeIndustry ? `Industry context: ${safeIndustry}.` : "",
        refinementInstruction || "",
      ].filter(Boolean).join(" ")
      const generation = await generateGroqQuickCandidates({
        description: advancedDescription,
        vibe: toQuickGenerateVibe(safeVibe),
        style: "auto",
        creativity: "balanced",
        maxChars: safeMaxLength,
        count: 16,
        seed: advancedSeed,
        blacklist: alreadySeen,
        requireEditorialReview: true,
      }, request.signal)

      if (request.signal.aborted) {
        return NextResponse.json({ error: "generation_cancelled" }, { status: 499 })
      }

      const selected = generation.candidates
        .filter((candidate) => !isSystemReservedName(candidate.name))
        .filter((candidate) => !seenNames.has(candidate.name))
        .filter((candidate) => passesAdvancedCreativeGate(candidate.name, safeMaxLength))
        .slice(0, 12)
      const qualityCounts = [
        generation.modelCandidateCount,
        generation.modelGroundedCandidateCount,
        generation.fallbackCandidateCount,
        generation.fallbackGroundedCandidateCount,
        generation.groundedCandidateCount,
        generation.exploratoryCandidateCount,
        generation.editorialCandidateCount,
      ]
      const hasConsistentQualityAccounting = qualityCounts.every(
        (value) => Number.isSafeInteger(value) && value >= 0,
      )
        && generation.modelCandidateCount + generation.fallbackCandidateCount === generation.candidates.length
        && generation.editorialCandidateCount === generation.modelCandidateCount
        && generation.groundedCandidateCount
          === generation.modelGroundedCandidateCount + generation.fallbackGroundedCandidateCount
        && generation.groundedCandidateCount + generation.exploratoryCandidateCount
          === generation.candidates.length
      const generationIsFullyModelBacked = generation.modelBacked
        && generation.provider !== "deterministic"
        && hasConsistentQualityAccounting
        && generation.fallbackCandidateCount === 0
        && generation.modelCandidateCount === generation.candidates.length
      const selectedModelCount = generationIsFullyModelBacked
        ? selected.length
        : 0
      const selectedGroundedCount = selected.filter((candidate) => candidate.autoQualityTier === "grounded").length
      if (
        selected.length < 12
        || selectedModelCount < 12
        || generation.provider === "deterministic"
        || !generation.editoriallyReviewed
        || generation.editorialCandidateCount < 12
      ) {
        return NextResponse.json(
          {
            error: "advanced_generation_temporarily_limited",
            message: "We couldn't build a complete professional shortlist for those settings. Please try again; no allowance was used.",
            retryable: true,
            generationMeta: {
              modelBacked: generation.modelBacked,
              model: generation.model,
              durationMs: generation.durationMs,
              providerAttempts: generation.providerAttempts,
              editoriallyReviewed: generation.editoriallyReviewed,
              editorialCandidateCount: generation.editorialCandidateCount,
              requestedCount: 12,
              resultCount: 0,
              isPartial: true,
              qualityState: "degraded",
            },
            quality: {
              modelCandidateCount: generation.modelCandidateCount,
              fallbackCandidateCount: generation.fallbackCandidateCount,
              groundedCandidateCount: generation.groundedCandidateCount,
              exploratoryCandidateCount: generation.exploratoryCandidateCount,
            },
          },
          { status: 503 },
        )
      }

      const generated = selected.map((candidate, index) => {
        const generationRank = index + 1
        const rationale = candidate.personality
        const copy = buildPersonalizedNameCopy({
          name: candidate.name,
          keyword,
          industry: safeIndustry,
          vibe: safeVibe,
          whyItWorks: rationale,
          meaningBreakdown: rationale,
        })
        return {
          id: createGeneratedNameId(candidate.name, generationRank),
          name: candidate.name,
          rationale: copy.personalDescription,
          reasoning: copy.personalDescription,
          style: candidate.style,
          generationRank,
          availability: {},
          founderSignal: null,
          meaning: rationale,
          meaningShort: rationale,
          personalDescription: copy.personalDescription,
          styleRationale: copy.styleRationale,
          slogan: copy.slogan,
        }
      })

      // Candidate construction succeeded. Consume atomically only now so model
      // or validation failures never burn a free monthly batch.
      if (request.signal.aborted) {
        return NextResponse.json({ error: "generation_cancelled" }, { status: 499 })
      }
      const consumedAllowance = await checkFeatureQuotaIdempotent(
        request,
        "advanced-generation-monthly",
        3,
        workflowQuotaKey,
      )
      if (!consumedAllowance.allowed) {
        const unavailable = consumedAllowance.statusCode === 503
        return NextResponse.json(
          {
            error: unavailable ? "usage_check_unavailable" : "advanced_generation_monthly_limit_reached",
            message: unavailable
              ? consumedAllowance.message
              : "The free plan includes 3 Advanced naming batches per month. Upgrade for unlimited fair-use access.",
            upgradeUrl: "/pricing",
            resetAt: consumedAllowance.resetAt,
            tokensUsed: consumedAllowance.used,
            tokensTotal: consumedAllowance.limit,
            remaining: consumedAllowance.remaining,
          },
          { status: consumedAllowance.statusCode },
        )
      }
      const workflowIssuedAt = Date.parse(consumedAllowance.receiptCreatedAt || "")
      if (!Number.isFinite(workflowIssuedAt)) {
        return NextResponse.json(
          { error: "usage_check_unavailable", message: "Usage checks are temporarily unavailable. Please try again shortly." },
          { status: 503 },
        )
      }

      const identity = generationWorkflowIdentity(request, consumedAllowance.userId)
      const generatedNames = generated.map((candidate) => candidate.name)
      const allowance = {
        used: consumedAllowance.used,
        limit: consumedAllowance.limit,
        remaining: consumedAllowance.remaining,
        resetAt: consumedAllowance.resetAt,
      }

      const userAgent = request.headers.get("user-agent") || undefined
      const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
      if (!consumedAllowance.replayed) {
        trackMetric({
          action: "name_generation",
          metadata: {
            mode: "advanced",
            style: "auto",
            creativity: "balanced",
            provider: generation.provider,
            model: generation.model,
            resultCount: generated.length,
            modelCandidateCount: selectedModelCount,
            fallbackCandidateCount: generated.length - selectedModelCount,
            fallbackRatio: generated.length > 0
              ? Number(((generated.length - selectedModelCount) / generated.length).toFixed(4))
              : 0,
            timeToNamesMs: Date.now() - requestStartedAt,
            contract: "candidate_first_v2",
          },
          userAgent,
          country,
        })
      }

      if (!consumedAllowance.isPro && !consumedAllowance.replayed) {
        logGeneration(request, consumedAllowance.userId, "domain", undefined, generated.length).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        generatorV2: true,
        isPro: consumedAllowance.isPro,
        generation: generation.provider,
        state: "names_ready",
        availabilityState: "checking_domains",
        generationMeta: {
          modelBacked: generation.modelBacked,
          model: generation.model,
          durationMs: generation.durationMs,
          providerAttempts: generation.providerAttempts,
          editoriallyReviewed: generation.editoriallyReviewed,
          editorialCandidateCount: generation.editorialCandidateCount,
          requestedCount: 12,
          resultCount: generated.length,
          isPartial: false,
          styleFulfilled: true,
        },
        quality: {
          modelCandidateCount: selectedModelCount,
          modelGroundedCandidateCount: selectedGroundedCount,
          fallbackCandidateCount: generated.length - selectedModelCount,
          fallbackGroundedCandidateCount: 0,
          groundedCandidateCount: selectedGroundedCount,
          exploratoryCandidateCount: Math.max(0, generated.length - selectedGroundedCount),
        },
        workflowToken: issueGenerationWorkflowToken(
          generatedNames,
          `advanced-founder-signal:${identity}`,
          workflowIssuedAt,
          ADVANCED_SCORING_TOKEN_TTL_MS,
          { binding: "ordered" },
        ),
        // Availability is a short-lived continuation. Replays intentionally get
        // a fresh window, while the 24-hour Founder Signal decision token remains
        // anchored to the immutable quota receipt above.
        availabilityToken: issueGenerationWorkflowToken(generatedNames, `availability:${identity}`, Date.now()),
        advancedGenerationAllowance: allowance,
        domains: generated,
      })
    }

    if (useQualityGenerator) {
      const safeVibe = typeof vibe === "string" ? vibe.toLowerCase() : "minimal"
      const safeIndustry = typeof industry === "string" ? industry : undefined
      const safeMaxLength = typeof maxLength === "number" ? maxLength : 10
      const contextRoots = previewContextRoots(keyword.trim(), safeIndustry)
      const intentRoots = buildIntentRoots(keyword.trim(), safeIndustry)
      const seenNames = new Set(
        Array.isArray(alreadySeen)
          ? alreadySeen.map((name) => String(name || "").toLowerCase().replace(/[^a-z]/g, "")).filter(Boolean)
          : [],
      )
      const controls = {
        seed:
          typeof payload.seed === "string"
            ? payload.seed
            : `preview-${keyword.trim()}:${safeVibe}:${safeIndustry || ""}:${String(refinementInstruction || "")}:${seenNames.size}`,
        mustIncludeKeyword: "none" as const,
        keywordPosition: "anywhere" as const,
        style: "brandable_blends" as const,
        blocklist: [],
        allowlist: [],
        allowHyphen: false,
        allowNumbers: false,
        meaningFirst: true,
        preferTwoWordBrands: safeMaxLength >= 8,
        allowVibeSuffix: false,
        showAnyAvailable: false,
      }

      const semanticFloor = generateQuickCandidates({
        description: keyword.trim(),
        vibe: toQuickGenerateVibe(safeVibe),
        maxChars: safeMaxLength,
        count: 12,
        seed: `${controls.seed}|semantic-floor`,
      })
      const primarySemanticFloor = selectPrimaryQuickCandidates(semanticFloor, safeCount)
      const primaryRoots = Array.from(new Set(primarySemanticFloor.flatMap((candidate) => candidate.fitRoots || [])))
      const hasPrimaryFit = (name: string) =>
        primaryRoots.length === 0 || primaryRoots.some((root) => root.length >= 3 && name.includes(root))

      // Kick off the AI creative pass while the deterministic pool builds.
      // AI output is gated by the exact same taste/slop filters as engine output.
      const aiSuggestionsPromise = fetchAiNameCandidates({
        keyword: keyword.trim(),
        industry: safeIndustry,
        vibe: safeVibe,
        maxLength: safeMaxLength,
        batchSize: Math.min(16, safeCount + 4),
        outputFormat: "with-metadata",
        alreadySeen: Array.from(seenNames),
        refinementInstruction:
          typeof refinementInstruction === "string" && refinementInstruction.trim().length > 0
            ? refinementInstruction.trim()
            : undefined,
        totalTimeoutMs: 10_000,
        signal: request.signal,
      })

      const pool = generateCandidatePool(
        {
          keyword: keyword.trim(),
          industry: safeIndustry,
          vibe: safeVibe,
          maxLength: safeMaxLength,
          targetCount: safeCount * 3,
          controls,
        },
        // Engine pool is supplementary now that the AI pass leads — smaller
        // pool keeps CPU time (and response latency) down
        { poolSize: 500, seedSalt: "preview-quality" },
      )
      const rankedGenerated = rankCandidates(pool.candidates, {
        industry: safeIndustry,
        vibe: safeVibe,
        keywordTokens: pool.keywordTokens,
        controls,
      })
        .map((candidate) => ({
          candidate,
          founder: scoreName({ name: candidate.name, tld: "com", vibe: safeVibe as any, keywords: pool.keywordTokens }),
        }))
        .filter(({ candidate }) => isPreviewQualityCandidate(candidate.name, candidate.strategy, safeMaxLength))

      const semanticGenerated = primarySemanticFloor.map((semantic) => ({
        candidate: {
          name: semantic.name,
          strategy: "verified_semantic",
          score: 100,
          roots: semantic.fitRoots || [],
          meaningBreakdown: semantic.personality,
          whyItWorks: semantic.personality,
        },
        founder: scoreName({ name: semantic.name, tld: "com", vibe: safeVibe as any, keywords: pool.keywordTokens }),
      }))

      const curatedGenerated = buildPreviewQualitySeeds(keyword.trim(), safeIndustry, safeVibe)
        .filter((name) => name.length <= safeMaxLength && isPreviewQualityCandidate(name, "curated_emotional", safeMaxLength))
        .filter((name) => hasPrimaryFit(name))
        .map((name) => ({
          candidate: {
            name,
            strategy: "curated_emotional",
            score: 96,
            meaningBreakdown: "emotionally grounded, easy to say, and suitable for a premium brand",
            whyItWorks: `${name} has a calm, trustworthy sound and a clear emotional anchor.`,
          },
          founder: scoreName({ name, tld: "com", vibe: safeVibe as any }),
        }))

      const aiSuggestions = await aiSuggestionsPromise
      const aiGenerated = aiSuggestions
        .filter(({ name }) => passesAiQualityGate(name, pool.keywordTokens, safeMaxLength))
        .map((suggestion) => {
          const founder = scoreName({ name: suggestion.name, tld: "com", vibe: safeVibe as any, keywords: pool.keywordTokens })
          return {
            candidate: {
              name: suggestion.name,
              strategy: "ai_creative",
              score: 95,
              meaningBreakdown: suggestion.meaning || null,
              whyItWorks:
                suggestion.reasoning ||
                founder.reasons.slice(0, 2).join(" | ") ||
                `${suggestion.name} was crafted for this brief and passed every brand-quality gate.`,
            },
            founder,
          }
        })

      const rankPreviewItem = (
        item: (typeof curatedGenerated)[number] | (typeof rankedGenerated)[number] | (typeof aiGenerated)[number] | (typeof semanticGenerated)[number],
      ) => ({
        ...item,
        rankScore:
          item.founder.score +
          item.candidate.score / 10 +
          previewContextFit(item.candidate.name, contextRoots) * 18 +
          previewIntentFit(item.candidate.name, intentRoots) * 24 +
          (item.candidate.strategy === "verified_semantic" ? 110 : 0) +
          (item.candidate.strategy === "verified_concept_compound" ? 28 : 0) +
          (item.candidate.strategy === "curated_emotional" ? 8 : 0) +
          (item.candidate.strategy === "ai_creative" ? 24 : 0) -
          (item.candidate.name.length <= 5 ? 28 : 0),
      })

      const dedupeRanked = <T extends { candidate: { name: string }; rankScore: number; founder: { score: number } }>(items: T[]): T[] =>
        items
          .filter((item) => !isSystemReservedName(item.candidate.name))
          .sort((a, b) => b.rankScore - a.rankScore || b.founder.score - a.founder.score)
          .filter((item, index, all) => all.findIndex((other) => other.candidate.name === item.candidate.name) === index)

      const dedupeInOrder = <T extends { candidate: { name: string } }>(items: T[]): T[] => {
        const seen = new Set<string>()
        const result: T[] = []
        for (const item of items) {
          if (isSystemReservedName(item.candidate.name)) continue
          if (seen.has(item.candidate.name)) continue
          seen.add(item.candidate.name)
          result.push(item)
        }
        return result
      }

      const curatedRanked = dedupeRanked(
        curatedGenerated
          .filter(({ candidate }) => !seenNames.has(candidate.name.toLowerCase()))
          .filter(({ candidate }) => candidate.name.length >= 6)
          .filter(({ founder }) => founder.score >= 52)
          .map(rankPreviewItem),
      )

      const engineRanked = dedupeRanked(
        rankedGenerated
          .filter(({ candidate }) => !seenNames.has(candidate.name.toLowerCase()))
          .filter(({ candidate }) => candidate.name.length >= 6)
          .filter(({ candidate }) => hasPrimaryFit(candidate.name))
          .filter(({ candidate }) => {
            if (candidate.strategy === "verified_concept_compound") return true
            if (contextRoots.length === 0 && intentRoots.length === 0) return true
            return previewContextFit(candidate.name, contextRoots) > 0 || previewIntentFit(candidate.name, intentRoots) > 0
          })
          .filter(({ candidate, founder }) => founder.score >= (candidate.strategy === "verified_concept_compound" ? 60 : 70))
          .map(rankPreviewItem),
      )

      const aiRanked = dedupeRanked(
        aiGenerated
          .filter(({ candidate }) => !seenNames.has(candidate.name.toLowerCase()))
          .filter(({ candidate }) => hasPrimaryFit(candidate.name))
          .filter(({ founder }) => founder.score >= 60)
          .map(rankPreviewItem),
      )

      const semanticRanked = dedupeRanked(
        semanticGenerated
          .filter(({ candidate }) => !seenNames.has(candidate.name.toLowerCase()))
          .filter(({ founder }) => founder.score >= 55)
          .map(rankPreviewItem),
      )

      let generated = diversifyPicks(dedupeRanked([...semanticRanked, ...aiRanked, ...engineRanked, ...curatedRanked]), safeCount)

      if (generated.length < safeCount && engineRanked.length > 0) {
        generated = dedupeInOrder([...generated, ...engineRanked]).slice(0, safeCount)
      }

      if (generated.length === 0) {
        generated = buildPreviewQualitySeeds(keyword.trim(), safeIndustry, safeVibe)
          .filter((name) => name.length <= safeMaxLength && name.length >= 6)
          .map((name) => ({
            candidate: {
              name,
              strategy: "curated_emotional",
              score: 90,
              meaningBreakdown: "Selected because it directly reflects the user's keywords and industry.",
              whyItWorks: `${name} is tied to the brief through the core naming concept.`,
            },
            founder: scoreName({ name, tld: "com", vibe: safeVibe as any }),
            rankScore: previewIntentFit(name, intentRoots) * 24 + previewContextFit(name, contextRoots) * 18,
          }))
          .sort((a, b) => b.rankScore - a.rankScore || b.founder.score - a.founder.score)
          .slice(0, safeCount)
      }

      if (generated.length < Math.min(6, safeCount)) {
        generated = dedupeRanked(
          [
            ...generated,
            ...rankedGenerated
              .filter(({ candidate }) => !seenNames.has(candidate.name.toLowerCase()))
              .filter(({ candidate }) => candidate.name.length >= 6)
              .filter(({ candidate }) => hasPrimaryFit(candidate.name))
              .filter(({ candidate }) => isPreviewQualityCandidate(candidate.name, candidate.strategy, safeMaxLength))
              .map(rankPreviewItem),
          ],
        ).slice(0, safeCount)
      }

      const userAgent = request.headers.get("user-agent") || undefined
      const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
      trackMetric({
        action: "name_generation",
        metadata: {
          briefLength: keyword.length,
          vibe,
          industry,
          mode: "quality_generator_v2",
          requestedCount: safeCount,
          resultCount: generated.length,
          aiCandidates: aiGenerated.length,
          aiSelected: generated.filter((item) => item.candidate.strategy === "ai_creative").length,
        },
        userAgent,
        country,
      })

      if (!rateLimitResult.isPro) {
        logGeneration(request, rateLimitResult.userId, "domain", undefined, generated.length).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        generatorV2: true,
        isPro: rateLimitResult.isPro,
        availabilityToken: issueGenerationWorkflowToken(
          generated.map(({ candidate }) => candidate.name),
          generationWorkflowIdentity(request, rateLimitResult.userId),
        ),
        domains: generated.map(({ candidate, founder }) => {
          const reasoning =
            candidate.whyItWorks || founder.reasons.slice(0, 2).join(" | ") || "Quality-engine candidate."
          const copy = buildPersonalizedNameCopy({
            name: candidate.name,
            keyword: keyword.trim(),
            industry: safeIndustry,
            vibe: safeVibe,
            founderScore: rateLimitResult.isPro ? founder.score : undefined,
            whyItWorks: reasoning,
            meaningBreakdown: candidate.meaningBreakdown,
            reasons: founder.reasons,
          })

          return {
            name: candidate.name,
            style: candidate.strategy,
            meaningShort: candidate.meaningBreakdown || null,
            meaning: candidate.meaningBreakdown || reasoning || null,
            reasoning,
            founderScore: rateLimitResult.isPro ? founder.score : undefined,
            ...copy,
          }
        }),
      })

    }

    // AI creative pass with model fallback chain — never hard-fails
    const domainSuggestions = await fetchAiNameCandidates({
      keyword,
      industry: industry || "general",
      vibe: vibe || "modern",
      maxLength: maxLength || 10,
      batchSize: safeCount,
      outputFormat: "with-metadata",
      alreadySeen: Array.isArray(alreadySeen) ? alreadySeen : [],
      refinementInstruction:
        typeof refinementInstruction === "string" && refinementInstruction.trim().length > 0
          ? refinementInstruction.trim()
          : undefined,
    })

    // ── Hybrid pipeline: AI generates, Founder Signal ranks ───────────────
    // AI is treated as one candidate source among several — NOT the authority.
    // The deterministic Founder Signal + Brand Instinct layer picks the winners
    // from a merged pool of AI output + deterministic generator output.
    const keywordRoots = keyword
      .trim()
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((t: string) => t.length >= 2)

    function passesQualityGate(name: string): boolean {
      return passesAiQualityGate(name, keywordRoots, maxLength)
    }

    // Step 1: collect raw candidates from BOTH sources
    interface RawCandidate {
      name: string
      reasoning?: string
      meaning?: string
      source: "ai" | "engine"
    }

    const rawCandidates: RawCandidate[] = []
    const seenNames = new Set<string>()

    // Source A: AI output
    for (const item of Array.isArray(domainSuggestions) ? domainSuggestions : []) {
      const rawName = typeof item === "string" ? item : item?.name
      const clean = String(rawName || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 63)
      if (clean.length < 3 || seenNames.has(clean)) continue
      seenNames.add(clean)
      rawCandidates.push({
        name: clean,
        reasoning: typeof item?.reasoning === "string" && item.reasoning.trim().length > 0 ? item.reasoning.trim() : undefined,
        meaning: typeof item?.meaning === "string" && item.meaning.trim().length > 0 ? item.meaning.trim() : undefined,
        source: "ai",
      })
    }

    // Source B: deterministic generator (always runs, not just as fallback)
    try {
      const enginePool = generateCandidatePool(
        {
          keyword: keyword.trim(),
          industry: typeof industry === "string" ? industry : undefined,
          vibe: typeof vibe === "string" ? vibe : "minimal",
          maxLength: typeof maxLength === "number" ? maxLength : 10,
          targetCount: safeCount * 3,
          controls: {
            seed: `hybrid-${Date.now().toString(36)}`,
            mustIncludeKeyword: "none",
            keywordPosition: "anywhere",
            style: "brandable_blends",
            blocklist: [],
            allowlist: [],
            allowHyphen: false,
            allowNumbers: false,
            meaningFirst: true,
            preferTwoWordBrands: true,
            allowVibeSuffix: false,
            showAnyAvailable: false,
          },
        },
        { poolSize: 400 },
      )

      for (const candidate of enginePool.candidates) {
        const clean = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, "")
        if (clean.length < 3 || seenNames.has(clean)) continue
        seenNames.add(clean)
        rawCandidates.push({ name: clean, source: "engine" })
      }
    } catch (err) {
      console.error("Engine pool generation failed:", err)
    }

    // Step 2: filter ALL candidates through identical quality gates
    const filtered = rawCandidates.filter(c => !isSystemReservedName(c.name) && passesQualityGate(c.name))

    // Step 3: score EVERY candidate with Founder Signal (Brand Instinct auto-applies)
    const scored = filtered.map(c => {
      const result = scoreName({
        name: c.name,
        tld: "com",
        vibe: typeof vibe === "string" ? (vibe.toLowerCase() as any) : undefined,
        keywords: keywordRoots,
      })
      return { ...c, score: result.score, reasons: result.reasons }
    })

    // Step 4: rank by Founder Signal, return top N
    // Minimum quality floor — 65 for basic path to ensure a reasonable bar
    const MIN_SCORE = 65
    const ranked = scored
      .filter(s => s.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)

    let finalSuggestions = ranked.slice(0, safeCount).map(s => {
      const reasoning = s.reasoning || (s.source === "ai" ? "AI-generated candidate, ranked by Founder Signal." : "Generated by quality engine.")
      const copy = buildPersonalizedNameCopy({
        name: s.name,
        keyword: keyword.trim(),
        industry: typeof industry === "string" ? industry : undefined,
        vibe: typeof vibe === "string" ? vibe : undefined,
        founderScore: rateLimitResult.isPro ? s.score : undefined,
        whyItWorks: reasoning,
        meaningBreakdown: s.meaning,
        reasons: s.reasons,
      })
      return {
        name: s.name,
        reasoning,
        meaning: s.meaning,
        founderScore: rateLimitResult.isPro ? s.score : undefined,
        ...copy,
      }
    })

    // If the ranked pool still has too few, drop the floor to salvage results
    if (finalSuggestions.length < Math.max(5, Math.floor(safeCount / 2))) {
      const relaxed = scored.filter((item) => !isSystemReservedName(item.name)).sort((a, b) => b.score - a.score).slice(0, safeCount)
      finalSuggestions = relaxed.map(s => {
        const reasoning = s.reasoning || (s.source === "ai" ? "AI-generated candidate, ranked by Founder Signal." : "Generated by quality engine.")
        const copy = buildPersonalizedNameCopy({
          name: s.name,
          keyword: keyword.trim(),
          industry: typeof industry === "string" ? industry : undefined,
          vibe: typeof vibe === "string" ? vibe : undefined,
          founderScore: rateLimitResult.isPro ? s.score : undefined,
          whyItWorks: reasoning,
          meaningBreakdown: s.meaning,
          reasons: s.reasons,
        })
        return {
          name: s.name,
          reasoning,
          meaning: s.meaning,
          founderScore: rateLimitResult.isPro ? s.score : undefined,
          ...copy,
        }
      })
    }

    // Track metric (non-blocking)
    const userAgent = request.headers.get("user-agent") || undefined
    const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
    trackMetric({
      action: "name_generation",
      metadata: { vibe, industry, requestedCount: safeCount, resultCount: finalSuggestions.length, briefLength: keyword.length },
      userAgent,
      country,
    })

    // Log generation for rate limiting (only for free users)
    if (!rateLimitResult.isPro) {
      logGeneration(request, rateLimitResult.userId, "domain", undefined, finalSuggestions.length).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      isPro: rateLimitResult.isPro,
      availabilityToken: issueGenerationWorkflowToken(
        finalSuggestions.map((suggestion) => suggestion.name),
        generationWorkflowIdentity(request, rateLimitResult.userId),
      ),
      domains: finalSuggestions,
    })
  } catch (error: any) {
    if (request.signal.aborted || error?.name === "AbortError") {
      return NextResponse.json({ error: "generation_cancelled" }, { status: 499 })
    }
    console.error("Error generating domains:", error)

    // Handle specific OpenAI errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { error: "Connection error. Please try again." },
        { status: 503 }
      )
    }

    if (error.status === 401) {
      return NextResponse.json(
        { error: "API key invalid. Please contact support." },
        { status: 500 }
      )
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limited. Please try again in a moment." },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: "Failed to generate domain names" },
      { status: 500 }
    )
  }
}
