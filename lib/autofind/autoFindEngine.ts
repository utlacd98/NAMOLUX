import { checkAvailabilityBatch } from "@/lib/domainGen/availability"

export type AutoFindVibe = "Luxury" | "Futuristic" | "Playful" | "Trustworthy" | "Minimal"

export interface AutoFindParams {
  keywords: string
  industry?: string
  vibe?: AutoFindVibe
  maxLen?: number
  timeCapMs?: number
  maxAttempts?: number
}

export interface AutoFindFoundDomain {
  name: string
  domain: string
  score: number
  label: "Pronounceable" | "Brandable"
  meaning: string
  reasons: string[]
}

export interface AutoFindStats {
  attempts: number
  generated: number
  filtered: number
  checked: number
  availableFound: number
  durationMs: number
}

export interface AutoFindResult {
  found: AutoFindFoundDomain[]
  stats: AutoFindStats
  message?: string
}

interface RootEntry {
  token: string
  meaning: string
  source: "keyword" | "industry" | "vibe" | "global"
}

interface EngineContext {
  keywords: string[]
  industryKey: string
  vibeKey: string
  expandedTerms: string[]
  primaryTerms: string[]
  roots: RootEntry[]
  maxLen: number
}

interface CandidatePair {
  name: string
  meaning: string
  roots?: string[]
}

interface ScoredCandidate extends CandidatePair {
  score: number
  relevanceSimilarity: number
  meaningDepth: number
  pronounceScore: number
  reasons: string[]
}

export interface CandidateQualityResult {
  accepted: boolean
  score: number
  relevanceSimilarity: number
  meaningDepth: number
  reasons: string[]
}

export const ENGINE_CONFIG = {
  defaultMaxLen: 9,
  minLen: 4,
  defaultTimeCapMs: 12_000,
  defaultMaxAttempts: 5,
  maxGeneratedPerAttempt: 300,
  minGeneratedPerAttempt: 120,
  topNAvailabilityChecks: 50,
  minIndustrySimilarity: 0.55,
  minMeaningDepth: 10,
  scoreFloor: 75,
}

export const DEFAULT_BANNED_TOKENS = [
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
  "world",
  "online",
  "site",
  "web",
  "cloud",
  "ai",
  "crypto",
  "token",
  "coin",
  "pay",
  "bank",
  "swap",
  "defi",
  "meta",
  "chain",
  "verse",
]

const COMMON_DICTIONARY_WORDS = new Set([
  "future",
  "green",
  "earth",
  "brand",
  "name",
  "growth",
  "studio",
  "market",
  "modern",
  "simple",
  "creative",
  "trust",
  "digital",
])

const GENERIC_FRAGMENTS = ["ly", "ify", "smart", "quick", "easy", "best", "super"]
const TYPO_TRAPS = new Set(["futurns", "teh", "brnad", "solutons", "futuers", "teck"])

const VIBE_SYNONYMS: Record<string, string[]> = {
  luxury: ["premium", "elegant", "refined", "polished", "signature", "luxe", "prestige"],
  futuristic: ["next", "forward", "novel", "modern", "signal", "vector", "orbit"],
  playful: ["joy", "vivid", "spark", "bright", "friendly", "fun", "energetic"],
  trustworthy: ["reliable", "secure", "steady", "clear", "grounded", "dependable", "credible"],
  minimal: ["clean", "simple", "quiet", "calm", "focused", "trim", "light"],
}

const INDUSTRY_SYNONYMS: Record<string, string[]> = {
  technology: ["build", "logic", "systems", "software", "signal", "stack", "scale", "launch"],
  "health & wellness": ["vital", "care", "balance", "wellbeing", "renew", "calm", "active", "mind"],
  finance: ["capital", "value", "wealth", "secure", "trust", "ledger", "growth", "fund"],
  "e-commerce": ["shop", "cart", "retail", "store", "checkout", "catalogue", "sell", "market"],
  education: ["learn", "guide", "lesson", "study", "teach", "mentor", "knowledge", "growth"],
  creative: ["design", "story", "studio", "craft", "visual", "brand", "style", "voice"],
  "real estate": ["home", "estate", "space", "property", "living", "place", "urban", "value"],
  "food & beverage": ["taste", "fresh", "flavour", "kitchen", "brew", "serve", "craft", "blend"],
  "fashion & beauty": ["style", "glow", "beauty", "skin", "look", "polish", "trend", "elegance"],
  "travel & tourism": ["journey", "route", "trip", "explore", "stay", "guide", "voyage", "discover"],
  "sports & fitness": ["active", "fit", "power", "coach", "motion", "strong", "endure", "train"],
  "entertainment & media": ["media", "show", "story", "stream", "audience", "stage", "voice", "play"],
  "consulting & services": ["advisory", "service", "support", "strategy", "guide", "clarity", "partner", "solve"],
  "marketing & advertising": ["brand", "reach", "growth", "audience", "campaign", "engage", "impact", "story"],
  "legal & professional": ["legal", "counsel", "compliance", "rights", "trust", "defend", "clarity", "secure"],
  automotive: ["drive", "mobility", "engine", "road", "fleet", "motion", "service", "precision"],
  "home & garden": ["home", "garden", "living", "comfort", "green", "craft", "care", "space"],
  "pet care": ["pet", "care", "friendly", "safe", "companion", "health", "warm", "gentle"],
  "gaming & esports": ["play", "arena", "quest", "squad", "compete", "rank", "stream", "fast"],
  "sustainability & green tech": ["green", "eco", "earth", "renew", "clean", "terra", "balance", "future"],
  "ai & machine learning": ["model", "logic", "learning", "signal", "predict", "adaptive", "vector", "insight"],
  "blockchain & crypto": ["ledger", "secure", "network", "proof", "decentral", "trust", "node", "value"],
  "saas & software": ["software", "workflow", "scale", "build", "automation", "platform", "signal", "clarity"],
  manufacturing: ["forge", "build", "fabricate", "quality", "precision", "supply", "factory", "output"],
  "nonprofit & social impact": ["impact", "community", "mission", "support", "equity", "care", "uplift", "purpose"],
  other: ["brand", "identity", "growth", "value", "clarity", "story", "launch", "focus"],
}

const ROOT_LIBRARY: Record<string, string> = {
  soil: "grounded growth",
  terra: "earth and foundation",
  verdi: "green vitality",
  verde: "green energy",
  bloom: "organic expansion",
  lumen: "clarity and light",
  nova: "new beginnings",
  vera: "truth and trust",
  craft: "careful creation",
  forge: "built strength",
  pulse: "active momentum",
  flow: "smooth movement",
  spark: "creative ignition",
  nest: "safety and home",
  rise: "upward growth",
  drift: "gentle motion",
  anchor: "stability",
  origin: "starting point",
  mark: "identity",
  nom: "naming",
  aur: "premium glow",
  vale: "trusted value",
  core: "focus",
  path: "guided direction",
  loom: "weaving ideas",
  vivid: "clear personality",
  ally: "supportive companion",
  motif: "recognisable style",
  stride: "confident progress",
  vividra: "lively expression",
  sustain: "long-term responsibility",
  eco: "environmental care",
  renew: "restoration",
}

const GLOBAL_ROOTS = [
  "soil",
  "terra",
  "verde",
  "bloom",
  "lumen",
  "nova",
  "vera",
  "craft",
  "forge",
  "pulse",
  "flow",
  "spark",
  "nest",
  "rise",
  "drift",
  "anchor",
  "origin",
  "mark",
  "nom",
  "aur",
  "vale",
  "core",
  "path",
  "loom",
  "motif",
  "stride",
  "renew",
]

const VIBE_ENDINGS: Record<string, string[]> = {
  luxury: ["a", "el", "or", "eau", "is"],
  futuristic: ["on", "ix", "io", "or", "en"],
  playful: ["a", "o", "ie", "u", "oo"],
  trustworthy: ["en", "or", "al", "um", "ia"],
  minimal: ["a", "e", "o", "um", "is"],
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

function toTitleCase(value: string): string {
  if (!value) return value
  return `${value[0].toUpperCase()}${value.slice(1)}`
}

function hashSeed(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return hash >>> 0
}

function createRng(seedInput: string): () => number {
  let seed = hashSeed(seedInput) || 123456789
  return () => {
    seed += 0x6d2b79f5
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickOne<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function splitKeywords(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,]+/)
        .map((token) => normalise(token))
        .filter((token) => token.length >= 2),
    ),
  ).slice(0, 8)
}

function normaliseIndustry(industry?: string): string {
  const safe = normalise((industry || "other").replace(/\s+/g, ""))
  const matched = Object.keys(INDUSTRY_SYNONYMS).find((key) => normalise(key.replace(/\s+/g, "")) === safe)
  return matched || "other"
}

function normaliseVibe(vibe?: AutoFindVibe): string {
  const lowered = (vibe || "Minimal").toLowerCase()
  if (lowered === "luxury" || lowered === "futuristic" || lowered === "playful" || lowered === "trustworthy") {
    return lowered
  }
  return "minimal"
}

function mergeReadable(a: string, b: string): string {
  const left = normalise(a)
  const right = normalise(b)
  if (!left) return right
  if (!right) return left

  if (left[left.length - 1] === right[0]) {
    return `${left}${right.slice(1)}`
  }

  const leftEnd = left[left.length - 1]
  const rightStart = right[0]
  const bothConsonant = /[bcdfghjklmnpqrstvwxyz]/.test(leftEnd) && /[bcdfghjklmnpqrstvwxyz]/.test(rightStart)

  return bothConsonant ? `${left}a${right}` : `${left}${right}`
}

function buildMeaning(roots: RootEntry[], context: EngineContext): string {
  const [first, second] = roots
  const anchor = context.keywords[0] || context.expandedTerms[0] || context.industryKey
  const firstMeaning = first ? first.meaning : "focused identity"
  const secondMeaning = second ? second.meaning : "clear direction"
  const industryLabel = context.industryKey === "other" ? "brand" : context.industryKey

  return `${toTitleCase(first?.token || "Core")} suggests ${firstMeaning}; ${toTitleCase(second?.token || "Focus")} adds ${secondMeaning}, matching ${anchor} and ${industryLabel}.`
}

function expandSemanticTerms(keywords: string[], industryKey: string, vibeKey: string): string[] {
  const expanded = new Set<string>(keywords)

  for (const token of INDUSTRY_SYNONYMS[industryKey] || []) {
    expanded.add(normalise(token))
  }

  for (const token of VIBE_SYNONYMS[vibeKey] || []) {
    expanded.add(normalise(token))
  }

  for (const keyword of keywords) {
    if (keyword === "eco" || keyword === "green") {
      ;["soil", "terra", "verde", "bloom", "renew"].forEach((token) => expanded.add(token))
    }

    if (keyword === "name" || keyword === "brand") {
      ;["nom", "mark", "lumen", "vera"].forEach((token) => expanded.add(token))
    }
  }

  return Array.from(expanded).filter((token) => token.length >= 2)
}

function buildRootPool(keywords: string[], industryKey: string, vibeKey: string): RootEntry[] {
  const pool = new Map<string, RootEntry>()

  const addRoot = (token: string, source: RootEntry["source"]) => {
    const clean = normalise(token)
    if (!clean || clean.length < 2 || DEFAULT_BANNED_TOKENS.includes(clean)) return
    if (!pool.has(clean)) {
      pool.set(clean, {
        token: clean,
        source,
        meaning: ROOT_LIBRARY[clean] || `${clean} concept`,
      })
    }
  }

  keywords.forEach((token) => addRoot(token, "keyword"))
  ;(INDUSTRY_SYNONYMS[industryKey] || []).forEach((token) => addRoot(token, "industry"))
  ;(VIBE_SYNONYMS[vibeKey] || []).forEach((token) => addRoot(token, "vibe"))
  GLOBAL_ROOTS.forEach((token) => addRoot(token, "global"))

  return Array.from(pool.values())
}

function buildContext(params: AutoFindParams): EngineContext {
  const keywords = splitKeywords(params.keywords)
  const industryKey = normaliseIndustry(params.industry)
  const vibeKey = normaliseVibe(params.vibe)
  const expandedTerms = expandSemanticTerms(keywords, industryKey, vibeKey)
  const roots = buildRootPool(keywords, industryKey, vibeKey)

  const primaryTerms = Array.from(
    new Set([
      ...keywords,
      ...(INDUSTRY_SYNONYMS[industryKey] || []).slice(0, 4).map((token) => normalise(token)),
      ...(VIBE_SYNONYMS[vibeKey] || []).slice(0, 3).map((token) => normalise(token)),
    ]),
  ).filter(Boolean)

  return {
    keywords,
    industryKey,
    vibeKey,
    expandedTerms,
    primaryTerms,
    roots,
    maxLen: clamp(params.maxLen || ENGINE_CONFIG.defaultMaxLen, ENGINE_CONFIG.minLen, 14),
  }
}

function looksLikeTypoTrap(name: string): boolean {
  if (TYPO_TRAPS.has(name)) return true
  if (/futurn/i.test(name)) return true
  if (/soluton/i.test(name)) return true
  return false
}

function hasConsonantCluster(name: string): boolean {
  return /[bcdfghjklmnpqrstvwxyz]{4,}/.test(name)
}

function hasInvalidCharacters(name: string): boolean {
  return /[-_\d]/.test(name)
}

function containsBannedToken(name: string, bannedTokens: string[]): boolean {
  return bannedTokens.some((token) => token && name.includes(token))
}

function countSyllables(name: string): number {
  return (name.match(/[aeiouy]+/g) || []).length
}

function getLengthScore(name: string): number {
  const ideal = 7
  const diff = Math.abs(name.length - ideal)
  return clamp(Math.round(20 - diff * 3.5), 0, 20)
}

function getPronounceScore(name: string): number {
  const vowels = (name.match(/[aeiouy]/g) || []).length
  const ratio = vowels / Math.max(name.length, 1)
  const syllables = countSyllables(name)

  let score = 10
  if (ratio >= 0.28 && ratio <= 0.62) score += 6
  if (syllables >= 2 && syllables <= 3) score += 4
  if (hasConsonantCluster(name)) score -= 8
  if (/(.)\1\1/.test(name)) score -= 4

  return clamp(score, 0, 20)
}

function getUniquenessScore(name: string): number {
  let score = 15
  if (COMMON_DICTIONARY_WORDS.has(name)) score -= 7
  if (/(.)\1/.test(name)) score -= 2

  for (const fragment of GENERIC_FRAGMENTS) {
    if (name.includes(fragment)) {
      score -= 2
    }
  }

  return clamp(score, 0, 15)
}

function getBrandRiskPenalty(name: string): number {
  let penalty = 0
  if (/(verse|chain|coin|swap|token|bank|meta)/.test(name)) penalty -= 10
  if (/(ly|ify)$/.test(name)) penalty -= 2
  if (/^(go|get|my)/.test(name)) penalty -= 2
  return clamp(penalty, -15, 0)
}

function extractRootHits(name: string, roots: RootEntry[]): string[] {
  const hits = new Set<string>()
  for (const root of roots) {
    if (root.token.length >= 3 && name.includes(root.token)) {
      hits.add(root.token)
    }
  }
  return Array.from(hits)
}

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}

function getIndustrySimilarity(candidate: CandidatePair, context: EngineContext): number {
  const meaningTokens = tokenise(candidate.meaning)
  const nameTokens = extractRootHits(candidate.name, context.roots)
  const tokenSet = new Set([
    ...meaningTokens,
    ...nameTokens,
    ...((candidate.roots || []).map((root) => normalise(root))),
  ])

  let primaryHits = 0
  for (const token of context.primaryTerms) {
    if (tokenSet.has(token)) primaryHits += 1
  }

  let expandedHits = 0
  for (const token of context.expandedTerms) {
    if (tokenSet.has(token)) expandedHits += 1
  }

  const primaryCoverage = primaryHits / Math.max(1, Math.min(context.primaryTerms.length, 6))
  const expandedCoverage = expandedHits / Math.max(1, Math.min(context.expandedTerms.length, 10))
  const keywordHits = context.keywords.filter((token) => tokenSet.has(token)).length
  const keywordCoverage = keywordHits / Math.max(1, Math.min(context.keywords.length, 3))
  const industryTokens = (INDUSTRY_SYNONYMS[context.industryKey] || []).map((token) => normalise(token))
  const industryHits = industryTokens.filter((token) => tokenSet.has(token)).length
  const industryCoverage = industryHits / Math.max(1, Math.min(industryTokens.length, 6))

  return clamp(
    primaryCoverage * 0.45 + expandedCoverage * 0.25 + keywordCoverage * 0.2 + industryCoverage * 0.1,
    0,
    1,
  )
}

function getMeaningDepth(candidate: CandidatePair, context: EngineContext): number {
  const words = tokenise(candidate.meaning)
  const references = context.expandedTerms.filter((token) => words.includes(token)).length
  const hasRootReference = (candidate.roots || []).some((root) => words.includes(normalise(root)))
  const hasExplanationShape = /suggests|adds|matching|fits|signals|combines/.test(candidate.meaning.toLowerCase())

  let score = 0
  if (words.length >= 8 && words.length <= 28) score += 6
  if (references >= 1) score += 6
  if (references >= 2) score += 2
  if (hasRootReference) score += 3
  if (hasExplanationShape) score += 3

  return clamp(score, 0, 20)
}

function buildReasons(input: {
  lengthScore: number
  pronounceScore: number
  uniquenessScore: number
  relevanceSimilarity: number
  meaningDepth: number
  totalScore: number
}): string[] {
  const reasons = [
    `length ${input.lengthScore}/20`,
    `pronounceability ${input.pronounceScore}/20`,
    `uniqueness ${input.uniquenessScore}/15`,
    `industry relevance ${(input.relevanceSimilarity * 100).toFixed(0)}%`,
    `meaning depth ${input.meaningDepth}/20`,
    `quality score ${Math.round(input.totalScore)}/100`,
  ]

  return reasons
}

export function evaluateCandidateQuality(
  candidate: CandidatePair,
  params: AutoFindParams,
  options?: {
    bannedTokens?: string[]
  },
): CandidateQualityResult {
  const context = buildContext(params)
  const bannedTokens = options?.bannedTokens || DEFAULT_BANNED_TOKENS
  const name = normalise(candidate.name)

  if (!name || name.length < ENGINE_CONFIG.minLen || name.length > context.maxLen) {
    return { accepted: false, score: 0, relevanceSimilarity: 0, meaningDepth: 0, reasons: ["length out of bounds"] }
  }

  if (hasInvalidCharacters(name)) {
    return { accepted: false, score: 0, relevanceSimilarity: 0, meaningDepth: 0, reasons: ["invalid characters"] }
  }

  if (containsBannedToken(name, bannedTokens)) {
    return { accepted: false, score: 0, relevanceSimilarity: 0, meaningDepth: 0, reasons: ["contains banned token"] }
  }

  if (hasConsonantCluster(name)) {
    return { accepted: false, score: 0, relevanceSimilarity: 0, meaningDepth: 0, reasons: ["consonant cluster"] }
  }

  if (looksLikeTypoTrap(name)) {
    return { accepted: false, score: 0, relevanceSimilarity: 0, meaningDepth: 0, reasons: ["typo-trap pattern"] }
  }

  const lengthScore = getLengthScore(name)
  const pronounceScore = getPronounceScore(name)
  const uniquenessScore = getUniquenessScore(name)
  const brandRiskPenalty = getBrandRiskPenalty(name)
  const relevanceSimilarity = getIndustrySimilarity(candidate, context)
  const industryRelevance = relevanceSimilarity * 25
  const meaningDepth = getMeaningDepth(candidate, context)

  const totalScore = clamp(
    lengthScore + pronounceScore + uniquenessScore + brandRiskPenalty + industryRelevance + meaningDepth,
    0,
    100,
  )

  const reasons = buildReasons({
    lengthScore,
    pronounceScore,
    uniquenessScore,
    relevanceSimilarity,
    meaningDepth,
    totalScore,
  })

  if (relevanceSimilarity < ENGINE_CONFIG.minIndustrySimilarity) {
    return {
      accepted: false,
      score: totalScore,
      relevanceSimilarity,
      meaningDepth,
      reasons: [...reasons, "rejected: low industry relevance"],
    }
  }

  if (meaningDepth < ENGINE_CONFIG.minMeaningDepth) {
    return {
      accepted: false,
      score: totalScore,
      relevanceSimilarity,
      meaningDepth,
      reasons: [...reasons, "rejected: low meaning depth"],
    }
  }

  if (totalScore < ENGINE_CONFIG.scoreFloor) {
    return {
      accepted: false,
      score: totalScore,
      relevanceSimilarity,
      meaningDepth,
      reasons: [...reasons, "rejected: below quality floor"],
    }
  }

  return {
    accepted: true,
    score: totalScore,
    relevanceSimilarity,
    meaningDepth,
    reasons,
  }
}

function generateDeterministicCandidates(context: EngineContext, attempt: number, targetCount: number): CandidatePair[] {
  const candidates = new Map<string, CandidatePair>()
  const rng = createRng(`${context.keywords.join("|")}:${context.industryKey}:${context.vibeKey}:${context.maxLen}:${attempt}`)
  const endings = VIBE_ENDINGS[context.vibeKey] || VIBE_ENDINGS.minimal
  const roots = context.roots.filter((root) => root.token.length >= 3 && root.token.length <= Math.max(5, context.maxLen - 2))

  if (roots.length === 0) {
    return []
  }

  const addCandidate = (name: string, selectedRoots: RootEntry[]) => {
    const cleanName = normalise(name)
    if (!cleanName || cleanName.length < ENGINE_CONFIG.minLen || cleanName.length > context.maxLen) return
    if (containsBannedToken(cleanName, DEFAULT_BANNED_TOKENS)) return

    if (!candidates.has(cleanName)) {
      candidates.set(cleanName, {
        name: cleanName,
        roots: selectedRoots.map((root) => root.token),
        meaning: buildMeaning(selectedRoots, context),
      })
    }
  }

  let guard = 0
  const maxGuard = targetCount * 14

  while (candidates.size < targetCount && guard < maxGuard) {
    guard += 1

    const rootA = pickOne(roots, rng)
    const rootB = pickOne(roots, rng)
    const ending = pickOne(endings, rng)

    const patternRoll = rng()
    let name = ""

    if (patternRoll < 0.4) {
      name = mergeReadable(rootA.token, rootB.token)
      addCandidate(name, [rootA, rootB])
      continue
    }

    if (patternRoll < 0.7) {
      name = mergeReadable(rootA.token, ending)
      addCandidate(name, [rootA, rootB])
      continue
    }

    const left = rootA.token.slice(0, Math.max(2, Math.ceil(rootA.token.length * 0.6)))
    const right = rootB.token.slice(Math.max(1, Math.floor(rootB.token.length * 0.35)))
    name = mergeReadable(left, right)
    addCandidate(name, [rootA, rootB])
  }

  return Array.from(candidates.values())
}

async function isComAvailable(domain: string): Promise<boolean> {
  try {
    const [result] = await checkAvailabilityBatch([domain], {
      concurrency: 1,
      maxRetries: 1,
      backoffMs: 100,
      ttlMs: 5 * 60 * 1000,
    })

    return Boolean(result?.available)
  } catch {
    return false
  }
}

function toAutoFindFound(candidate: ScoredCandidate): AutoFindFoundDomain {
  return {
    name: candidate.name,
    domain: `${candidate.name}.com`,
    score: Math.round(candidate.score),
    label: candidate.pronounceScore >= 14 ? "Pronounceable" : "Brandable",
    meaning: candidate.meaning,
    reasons: candidate.reasons,
  }
}

export async function autoFind5AvailableComs(params: AutoFindParams): Promise<AutoFindResult> {
  const startedAt = Date.now()
  const context = buildContext(params)
  const maxAttempts = clamp(params.maxAttempts || ENGINE_CONFIG.defaultMaxAttempts, 1, 8)
  const timeCapMs = clamp(params.timeCapMs || ENGINE_CONFIG.defaultTimeCapMs, 3_000, 25_000)

  const availabilityCache = new Map<string, boolean>()
  const foundMap = new Map<string, AutoFindFoundDomain>()

  let attempts = 0
  let generated = 0
  let filtered = 0
  let checked = 0

  const finish = (message?: string): AutoFindResult => ({
    found: Array.from(foundMap.values()).slice(0, 5),
    stats: {
      attempts,
      generated,
      filtered,
      checked,
      availableFound: foundMap.size,
      durationMs: Date.now() - startedAt,
    },
    message,
  })

  try {
    while (attempts < maxAttempts && Date.now() - startedAt < timeCapMs && foundMap.size < 5) {
      attempts += 1

      const generateTarget = Math.min(
        ENGINE_CONFIG.maxGeneratedPerAttempt,
        ENGINE_CONFIG.minGeneratedPerAttempt + attempts * 35,
      )

      const rawCandidates = generateDeterministicCandidates(context, attempts, generateTarget)
      generated += rawCandidates.length

      const scoredCandidates: ScoredCandidate[] = []

      for (const candidate of rawCandidates) {
        const quality = evaluateCandidateQuality(candidate, {
          keywords: params.keywords,
          industry: params.industry,
          vibe: params.vibe,
          maxLen: context.maxLen,
        })

        if (!quality.accepted) {
          filtered += 1
          continue
        }

        scoredCandidates.push({
          ...candidate,
          score: quality.score,
          relevanceSimilarity: quality.relevanceSimilarity,
          meaningDepth: quality.meaningDepth,
          pronounceScore: getPronounceScore(candidate.name),
          reasons: quality.reasons,
        })
      }

      scoredCandidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      const shortlist = scoredCandidates.slice(0, ENGINE_CONFIG.topNAvailabilityChecks)

      const domainsToCheck = shortlist
        .map((candidate) => `${candidate.name}.com`)
        .filter((domain) => !availabilityCache.has(domain) && !foundMap.has(domain.replace(/\.com$/i, "")))

      checked += domainsToCheck.length

      if (domainsToCheck.length > 0) {
        try {
          const availabilityResults = await checkAvailabilityBatch(domainsToCheck, {
            concurrency: 8,
            maxRetries: 1,
            backoffMs: 120,
            ttlMs: 5 * 60 * 1000,
          })

          for (const availability of availabilityResults) {
            availabilityCache.set(availability.domain, Boolean(availability.available))
          }
        } catch {
          for (const domain of domainsToCheck) {
            const available = await isComAvailable(domain)
            availabilityCache.set(domain, available)
          }
        }
      }

      for (const candidate of shortlist) {
        const domain = `${candidate.name}.com`
        if (!availabilityCache.get(domain)) continue
        if (!foundMap.has(candidate.name)) {
          foundMap.set(candidate.name, toAutoFindFound(candidate))
        }
        if (foundMap.size >= 5) break
      }
    }

    if (foundMap.size < 5) {
      return finish(`Found ${foundMap.size} available .com domains within the attempt/time cap.`)
    }

    return finish()
  } catch (error: any) {
    return finish(error?.message ? `Auto-find completed with fallback: ${error.message}` : "Auto-find completed with fallback.")
  }
}
