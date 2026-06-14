import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { autoFind5DotComByFounderScore, type AutoFindVibe } from "@/lib/autofind/autoFindByFounderScore"
import {
  containsKeywordRoot,
  isKeywordAnchored,
  hasAiSmellPattern,
  hasRandomSyllablePattern,
  hasRecognisableBrandRoot,
  hasUnsafeBrandMeaning,
  passesTasteGate,
} from "@/lib/domainGen/filters"
import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import { isGibberish, isKeywordClone } from "@/lib/domainGen/realness"
import { rankCandidates } from "@/lib/domainGen/scoreCandidates"
import { expandRelatedTerms, parseKeywordTokens } from "@/lib/domainGen/synonyms"
import { scoreName } from "@/lib/founderSignal/scoreName"
import { trackMetric } from "@/lib/metrics"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"
import { brandExamples, buildGenerationPrompt } from "@/lib/brandExamples"

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

// ── AI candidate source ──────────────────────────────────────────────────────
// The LLM is the creative engine; the deterministic Founder Signal pipeline is
// the authority. Every AI name passes the same taste/slop gates as engine names.
// On any AI failure (bad key, rate limit, timeout) we silently fall back to the
// deterministic engine so generation never hard-fails.

const FALLBACK_NAMING_MODELS = ["gpt-4.1-mini", "gpt-4o-mini"]

interface AiNameSuggestion {
  name: string
  reasoning?: string
  meaning?: string
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("ai_naming_timeout")), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
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
}): Promise<AiNameSuggestion[]> {
  if (!process.env.OPENAI_API_KEY?.trim()) return []

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
    const remaining = deadline - Date.now()
    if (remaining < 800) break

    const attemptStarted = Date.now()
    try {
      const completion = await withTimeout(
        getOpenAI().chat.completions.create({
          model,
          messages: [
            { role: "system", content: finalSystem },
            { role: "user", content: user },
          ],
          temperature: 0.9,
          max_tokens: opts.outputFormat === "names-only" ? 300 : 1100,
        }),
        remaining,
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
          reasoning:
            typeof item?.reasoning === "string" && item.reasoning.trim().length > 0 ? item.reasoning.trim() : undefined,
          meaning: typeof item?.meaning === "string" && item.meaning.trim().length > 0 ? item.meaning.trim() : undefined,
        })
      }

      if (suggestions.length > 0) {
        console.log(`AI naming model ${model}: ${suggestions.length} names in ${Date.now() - attemptStarted}ms`)
        return suggestions
      }
    } catch (error) {
      console.error(
        `AI naming model ${model} failed after ${Date.now() - attemptStarted}ms:`,
        error instanceof Error ? error.message : error,
      )
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
  if (!passesTasteGate(name)) return false
  return true
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
  try {
    // Check rate limit first - domain generation feature
    const rateLimitResult = await checkRateLimit(request, "domain")

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "token_limit_reached",
          message: "You've used all 3 free tokens. Upgrade to Pro for unlimited access.",
          upgradeUrl: "/pricing",
        },
        { status: 429 }
      )
    }

    const payload = await request.json()
    const { keyword, vibe, industry, maxLength, count, autoFindV2, generatorV2, refinementInstruction, alreadySeen } = payload
    const hasCustomCount = typeof count === "number" && Number.isFinite(count)
    const safeCount = hasCustomCount ? Math.max(12, Math.min(Math.floor(count), 20)) : 10
    const useQualityGenerator = generatorV2 !== false

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

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
          keyword,
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
        logGeneration(request, rateLimitResult.userId, "domain", keyword, result.found.length).catch(() => {})
      }

      const verifiedPicks = result.found.map((pick) => ({
        name: pick.name,
        tld: pick.tld,
        fullDomain: pick.domain,
        available: true,
        score: pick.founderScore,
        founderScore: pick.founderScore,
        pronounceable: pick.label === "Pronounceable",
        memorability: Number(Math.min(10, Math.max(1, pick.founderScore / 10)).toFixed(1)),
        length: pick.name.length,
        strategy: "founder_score_priority",
        scoreBreakdown: { founderSignal: pick.founderScore },
        roots: [] as string[],
        whyTag: (pick.reasons ?? []).slice(0, 2).join(" | "),
        qualityBand: pick.founderScore >= 85 ? "high" : pick.founderScore >= 75 ? "medium" : "low",
        meaningScore: Math.min(100, Math.max(10, pick.founderScore)),
        meaningBreakdown: "Founder Signal quality-first selection.",
        whyItWorks: `Founder Signal ${pick.founderScore}/100.`,
        brandableScore: Number(Math.min(10, Math.max(1, pick.founderScore / 10)).toFixed(1)),
        pronounceabilityScore: pick.label === "Pronounceable" ? 90 : 72,
      }))

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

      // Kick off the AI creative pass while the deterministic pool builds.
      // AI output is gated by the exact same taste/slop filters as engine output.
      const aiSuggestionsPromise = fetchAiNameCandidates({
        keyword: keyword.trim(),
        industry: safeIndustry,
        vibe: safeVibe,
        maxLength: safeMaxLength,
        batchSize: Math.min(16, safeCount + 4),
        // names-only keeps the completion small (~3s); meaning copy is
        // derived server-side from Founder Signal so latency stays interactive
        outputFormat: "names-only",
        alreadySeen: Array.from(seenNames),
        refinementInstruction:
          typeof refinementInstruction === "string" && refinementInstruction.trim().length > 0
            ? refinementInstruction.trim()
            : undefined,
        totalTimeoutMs: 20_000,
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

      const curatedGenerated = buildPreviewQualitySeeds(keyword.trim(), safeIndustry, safeVibe)
        .filter((name) => name.length <= safeMaxLength && isPreviewQualityCandidate(name, "curated_emotional", safeMaxLength))
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
        item: (typeof curatedGenerated)[number] | (typeof rankedGenerated)[number] | (typeof aiGenerated)[number],
      ) => ({
        ...item,
        rankScore:
          item.founder.score +
          item.candidate.score / 10 +
          previewContextFit(item.candidate.name, contextRoots) * 18 +
          previewIntentFit(item.candidate.name, intentRoots) * 24 +
          (item.candidate.strategy === "curated_emotional" ? 35 : 0) +
          (item.candidate.strategy === "ai_creative" ? 40 : 0) -
          (item.candidate.name.length <= 5 ? 28 : 0),
      })

      const dedupeRanked = <T extends { candidate: { name: string }; rankScore: number; founder: { score: number } }>(items: T[]): T[] =>
        items
          .sort((a, b) => b.rankScore - a.rankScore || b.founder.score - a.founder.score)
          .filter((item, index, all) => all.findIndex((other) => other.candidate.name === item.candidate.name) === index)

      const dedupeInOrder = <T extends { candidate: { name: string } }>(items: T[]): T[] => {
        const seen = new Set<string>()
        const result: T[] = []
        for (const item of items) {
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
          .filter(({ candidate }) => {
            if (contextRoots.length === 0 && intentRoots.length === 0) return true
            return previewContextFit(candidate.name, contextRoots) > 0 || previewIntentFit(candidate.name, intentRoots) > 0
          })
          .filter(({ founder }) => founder.score >= 70)
          .map(rankPreviewItem),
      )

      const aiRanked = dedupeRanked(
        aiGenerated
          .filter(({ candidate }) => !seenNames.has(candidate.name.toLowerCase()))
          .filter(({ founder }) => founder.score >= 60)
          .map(rankPreviewItem),
      )

      let generated = diversifyPicks(dedupeRanked([...aiRanked, ...curatedRanked, ...engineRanked]), safeCount)

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
          keyword,
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
        logGeneration(request, rateLimitResult.userId, "domain", keyword, generated.length).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        generatorV2: true,
        isPro: rateLimitResult.isPro,
        domains: generated.map(({ candidate, founder }) => ({
          name: candidate.name,
          style: candidate.strategy,
          meaningShort: candidate.meaningBreakdown || null,
          meaning: candidate.meaningBreakdown || candidate.whyItWorks || founder.reasons.slice(0, 2).join(" | ") || null,
          reasoning: candidate.whyItWorks || founder.reasons.slice(0, 2).join(" | ") || "Quality-engine candidate.",
          founderScore: founder.score,
        })),
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
      if (KNOWN_BRAND_NAMES.has(name)) return false
      if (/([bcdfghjkmnpqrtvwxy])\1$/.test(name)) return false
      if (hasAiSmellPattern(name)) return false
      if (containsKeywordRoot(name, keywordRoots)) return false
      if (isKeywordAnchored(name, keywordRoots)) return false
      if (!passesTasteGate(name)) return false
      return true
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
    const filtered = rawCandidates.filter(c => passesQualityGate(c.name))

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

    let finalSuggestions = ranked.slice(0, safeCount).map(s => ({
      name: s.name,
      reasoning: s.reasoning || (s.source === "ai" ? "AI-generated candidate, ranked by Founder Signal." : "Generated by quality engine."),
      meaning: s.meaning,
    }))

    // If the ranked pool still has too few, drop the floor to salvage results
    if (finalSuggestions.length < Math.max(5, Math.floor(safeCount / 2))) {
      const relaxed = scored.sort((a, b) => b.score - a.score).slice(0, safeCount)
      finalSuggestions = relaxed.map(s => ({
        name: s.name,
        reasoning: s.reasoning || (s.source === "ai" ? "AI-generated candidate, ranked by Founder Signal." : "Generated by quality engine."),
        meaning: s.meaning,
      }))
    }

    // Track metric (non-blocking)
    const userAgent = request.headers.get("user-agent") || undefined
    const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
    trackMetric({
      action: "name_generation",
      metadata: { keyword, vibe, industry, requestedCount: safeCount, resultCount: finalSuggestions.length },
      userAgent,
      country,
    })

    // Log generation for rate limiting (only for free users)
    if (!rateLimitResult.isPro) {
      logGeneration(request, rateLimitResult.userId, "domain", keyword, finalSuggestions.length).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      isPro: rateLimitResult.isPro,
      domains: finalSuggestions,
    })
  } catch (error: any) {
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
      { error: error.message || "Failed to generate domain names" },
      { status: 500 }
    )
  }
}
