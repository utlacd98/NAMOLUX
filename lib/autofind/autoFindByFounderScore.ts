import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import { scoreName } from "@/lib/founderSignal/scoreName"
import type { AutoFindRequestInput } from "@/lib/domainGen/types"

export type AutoFindVibe = "Luxury" | "Futuristic" | "Playful" | "Trustworthy" | "Minimal"

export type AutoFindParams = {
  keywords: string
  industry?: string
  vibe?: AutoFindVibe
  maxLen?: number
  timeCapMs?: number
  maxAttempts?: number
  scoreFloor?: number
  topNToCheck?: number
  poolSize?: number
  tlds?: string[]
}

export type AutoFindPick = {
  name: string
  tld: string
  domain: string
  founderScore: number
  label: "Pronounceable" | "Brandable"
  reasons?: string[]
}

export type AutoFindResult = {
  found: AutoFindPick[]
  message: string
  stats: {
    attempts: number
    generated: number
    passedQuality: number
    checkedAvailability: number
    availableFound: number
    durationMs: number
  }
}

interface DomainCandidate {
  name: string
  tld: string
  domain: string
  founderScore: number
  label: "Pronounceable" | "Brandable"
  reasons: string[]
}

const DEFAULT_BANNED_TOKENS = [
  "hub",
  "pro",
  "app",
  "tech",
  "labs",
  "solutions",
  "digital",
  "global",
  "group",
  "systems",
  "online",
  "site",
  "web",
  "cloud",
]

const ENGINE_DEFAULTS = {
  scoreFloor: 80,
  maxAttempts: 5,
  timeCapMs: 12_000,
  topNToCheck: 75,
  poolSize: 300,
  maxLen: 9,
  availabilityConcurrency: 10,
  tlds: ["com", "io", "ai", "app", "dev", "co"],
}
const MAX_TLD_VARIANTS_PER_NAME = 3

const INDUSTRY_TERMS: Record<string, string[]> = {
  technology: ["software", "signal", "build", "scale", "logic", "stack"],
  "health & wellness": ["care", "vital", "balance", "well", "renew", "mind"],
  finance: ["value", "trust", "secure", "capital", "growth", "fund"],
  "e-commerce": ["retail", "store", "shop", "market", "sell", "cart"],
  education: ["learn", "guide", "study", "teach", "mentor", "knowledge"],
  creative: ["design", "story", "craft", "style", "visual", "voice"],
  "sustainability & green tech": ["eco", "green", "earth", "renew", "clean", "terra"],
  other: ["brand", "identity", "value", "focus", "growth", "story"],
}

const VIBE_TERMS: Record<string, string[]> = {
  luxury: ["premium", "elegant", "refined", "signature", "prestige"],
  futuristic: ["next", "forward", "novel", "modern", "vector"],
  playful: ["joy", "spark", "friendly", "bright", "vivid"],
  trustworthy: ["reliable", "secure", "steady", "clear", "credible"],
  minimal: ["clean", "simple", "quiet", "focused", "light"],
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

function mapVibe(vibe?: AutoFindVibe): string {
  const lowered = String(vibe || "Minimal").toLowerCase()
  if (lowered === "luxury" || lowered === "futuristic" || lowered === "playful" || lowered === "trustworthy") {
    return lowered
  }
  return "minimal"
}

function mapIndustry(industry?: string): string {
  const clean = String(industry || "other").toLowerCase()
  const match = Object.keys(INDUSTRY_TERMS).find((key) => key.toLowerCase() === clean)
  return match || "other"
}

function parseKeywords(keywords: string): string[] {
  return Array.from(
    new Set(
      keywords
        .split(/[\s,]+/)
        .map((token) => normalise(token))
        .filter((token) => token.length >= 2),
    ),
  ).slice(0, 8)
}

function sanitiseTlds(input?: string[]): string[] {
  const fromInput = Array.isArray(input) ? input : []
  const merged = fromInput.length > 0 ? fromInput : ENGINE_DEFAULTS.tlds

  const unique = Array.from(
    new Set(
      merged
        .map((tld) => normalise(tld))
        .filter((tld) => tld.length >= 2 && tld.length <= 8),
    ),
  )

  return unique.length > 0 ? unique : [...ENGINE_DEFAULTS.tlds]
}

function hasFourConsonants(name: string): boolean {
  return /[bcdfghjklmnpqrstvwxyz]{4,}/.test(name)
}

function looksLikeTypoBait(name: string): boolean {
  if (name === "futurns") return true
  if (!name.endsWith("ns")) return false

  const patched = `${name.slice(0, -2)}es`
  if (/futures|values|stores|waves|zones|names|homes|series/.test(patched)) {
    return true
  }

  return /turns$/.test(name)
}

function passesHardRules(name: string, maxLen: number, bannedTokens: string[]): boolean {
  if (!name) return false
  if (name.length < 4 || name.length > maxLen) return false
  if (/[-_\d]/.test(name)) return false
  if (bannedTokens.some((token) => token && name.includes(token))) return false
  if (hasFourConsonants(name)) return false
  if (looksLikeTypoBait(name)) return false

  const vowelCount = (name.match(/[aeiouy]/g) || []).length
  if (vowelCount < 2) return false

  return true
}

async function checkAvailabilityWithCache(
  domains: string[],
  availabilityCache: Map<string, boolean>,
): Promise<Map<string, boolean>> {
  const known = new Map<string, boolean>()
  const unknown: string[] = []

  for (const domain of domains) {
    if (availabilityCache.has(domain)) {
      known.set(domain, Boolean(availabilityCache.get(domain)))
    } else {
      unknown.push(domain)
    }
  }

  if (unknown.length > 0) {
    try {
      const results = await checkAvailabilityBatch(unknown, {
        concurrency: ENGINE_DEFAULTS.availabilityConcurrency,
        maxRetries: 1,
        backoffMs: 120,
        ttlMs: 5 * 60 * 1000,
      })

      for (const result of results) {
        const available = Boolean(result.available)
        availabilityCache.set(result.domain, available)
        known.set(result.domain, available)
      }
    } catch {
      for (const domain of unknown) {
        availabilityCache.set(domain, false)
        known.set(domain, false)
      }
    }
  }

  return known
}

function buildGenerationInput(params: {
  keywords: string
  industry?: string
  vibe: string
  maxLen: number
  seed: string
}): AutoFindRequestInput {
  return {
    keyword: params.keywords,
    industry: params.industry,
    vibe: params.vibe,
    maxLength: params.maxLen,
    targetCount: 5,
    controls: {
      seed: params.seed,
      mustIncludeKeyword: "partial",
      keywordPosition: "anywhere",
      style: "real_words",
      blocklist: [],
      allowlist: [],
      allowHyphen: false,
      allowNumbers: false,
      meaningFirst: true,
      preferTwoWordBrands: true,
      allowVibeSuffix: false,
      showAnyAvailable: false,
    },
  }
}

function buildDomainCandidates(input: {
  names: string[]
  tlds: string[]
  keywords: string[]
  industryTerms: string[]
  vibeTerms: string[]
  bannedTokens: string[]
  scoreFloor: number
}): DomainCandidate[] {
  const scored: DomainCandidate[] = []

  for (const name of input.names) {
    for (const tld of input.tlds) {
      const score = scoreName({
        name,
        tld,
        keywords: input.keywords,
        industryTerms: input.industryTerms,
        vibeTerms: input.vibeTerms,
        bannedTokens: input.bannedTokens,
      })

      if (score.score < input.scoreFloor) continue

      scored.push({
        name,
        tld,
        domain: `${name}.${tld}`,
        founderScore: score.score,
        label: score.label,
        reasons: score.reasons,
      })
    }
  }

  return scored
}

export async function autoFind5DotComByFounderScore(params: AutoFindParams): Promise<AutoFindResult> {
  const startedAt = Date.now()

  const keywords = parseKeywords(params.keywords)
  const vibe = mapVibe(params.vibe)
  const industry = mapIndustry(params.industry)
  const tlds = sanitiseTlds(params.tlds)
  const tldPriority = new Map(tlds.map((tld, index) => [tld, index]))

  const maxLen = clamp(params.maxLen || ENGINE_DEFAULTS.maxLen, 4, 16)
  const maxAttempts = clamp(params.maxAttempts || ENGINE_DEFAULTS.maxAttempts, 1, 10)
  const timeCapMs = clamp(params.timeCapMs || ENGINE_DEFAULTS.timeCapMs, 2_000, 30_000)
  const scoreFloor = clamp(params.scoreFloor || ENGINE_DEFAULTS.scoreFloor, 60, 98)
  const topNToCheck = clamp(params.topNToCheck || ENGINE_DEFAULTS.topNToCheck, 10, 250)
  const poolSize = clamp(params.poolSize || ENGINE_DEFAULTS.poolSize, 80, 900)

  const bannedTokens = DEFAULT_BANNED_TOKENS.map((token) => normalise(token))
  const availabilityCache = new Map<string, boolean>()
  const seenNames = new Set<string>()
  const pickedDomains = new Set<string>()
  const pickedNames = new Set<string>()
  const picked: AutoFindPick[] = []

  let attempts = 0
  let generated = 0
  let passedQuality = 0
  let checkedAvailability = 0

  while (attempts < maxAttempts && Date.now() - startedAt < timeCapMs && picked.length < 5) {
    attempts += 1

    const generationInput = buildGenerationInput({
      keywords: params.keywords,
      industry: params.industry,
      vibe,
      maxLen,
      seed: `founder-${attempts}-${Date.now().toString(36)}`,
    })

    const generatedPool = generateCandidatePool(generationInput, {
      poolSize,
      relaxedMaxLength: maxLen,
      seedSalt: `founder-attempt-${attempts}`,
    }).candidates

    generated += generatedPool.length

    const filteredNames = generatedPool
      .map((candidate) => normalise(candidate.name))
      .filter((name) => name.length > 0)
      .filter((name) => {
        if (seenNames.has(name)) return false
        seenNames.add(name)
        return true
      })
      .filter((name) => passesHardRules(name, maxLen, bannedTokens))

    const domainCandidates = buildDomainCandidates({
      names: filteredNames,
      tlds,
      keywords,
      industryTerms: INDUSTRY_TERMS[industry] || INDUSTRY_TERMS.other,
      vibeTerms: VIBE_TERMS[vibe] || VIBE_TERMS.minimal,
      bannedTokens,
      scoreFloor,
    })

    passedQuality += domainCandidates.length

    const sortedCandidates = domainCandidates
      .filter((candidate) => !pickedNames.has(candidate.name) && !pickedDomains.has(candidate.domain))
      .sort((a, b) => {
        if (b.founderScore !== a.founderScore) return b.founderScore - a.founderScore
        const aPriority = tldPriority.get(a.tld) ?? 99
        const bPriority = tldPriority.get(b.tld) ?? 99
        if (aPriority !== bPriority) return aPriority - bPriority
        return a.domain.localeCompare(b.domain)
      })

    const shortlist: DomainCandidate[] = []
    const variantsByName = new Map<string, number>()
    for (const candidate of sortedCandidates) {
      const existing = variantsByName.get(candidate.name) || 0
      if (existing >= MAX_TLD_VARIANTS_PER_NAME) continue

      shortlist.push(candidate)
      variantsByName.set(candidate.name, existing + 1)

      if (shortlist.length >= topNToCheck) break
    }

    const domains = shortlist.map((candidate) => candidate.domain)
    checkedAvailability += domains.filter((domain) => !availabilityCache.has(domain)).length

    const availabilityMap = await checkAvailabilityWithCache(domains, availabilityCache)

    for (const candidate of shortlist) {
      if (!availabilityMap.get(candidate.domain)) continue
      if (pickedNames.has(candidate.name)) continue

      picked.push({
        name: candidate.name,
        tld: candidate.tld,
        domain: candidate.domain,
        founderScore: candidate.founderScore,
        label: candidate.label,
        reasons: candidate.reasons,
      })

      pickedDomains.add(candidate.domain)
      pickedNames.add(candidate.name)

      if (picked.length >= 5) break
      if (Date.now() - startedAt >= timeCapMs) break
    }
  }

  const found = picked
    .sort((a, b) => {
      if (b.founderScore !== a.founderScore) return b.founderScore - a.founderScore
      const aPriority = tldPriority.get(a.tld) ?? 99
      const bPriority = tldPriority.get(b.tld) ?? 99
      if (aPriority !== bPriority) return aPriority - bPriority
      return a.domain.localeCompare(b.domain)
    })
    .slice(0, 5)

  const message =
    found.length >= 5
      ? "Found 5 premium domains with the highest Founder Signal scores."
      : `Found ${found.length} premium domains within the attempt/time cap. We refuse to show low-scoring names.`

  return {
    found,
    message,
    stats: {
      attempts,
      generated,
      passedQuality,
      checkedAvailability,
      availableFound: found.length,
      durationMs: Date.now() - startedAt,
    },
  }
}
