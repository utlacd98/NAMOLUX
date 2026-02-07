export type FounderLabel = "Pronounceable" | "Brandable"

export interface ScoreNameInput {
  name: string
  tld?: string
  keywords?: string[]
  industryTerms?: string[]
  vibeTerms?: string[]
  bannedTokens?: string[]
}

export interface ScoreNameResult {
  score: number
  label: FounderLabel
  reasons: string[]
  breakdown: {
    lengthScore: number
    pronounceScore: number
    memorabilityScore: number
    extensionScore: number
    characterScore: number
    brandRiskPenalty: number
    relevanceScore: number
  }
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

const DICTIONARY_WORDS = new Set([
  "cloud",
  "tech",
  "data",
  "code",
  "sync",
  "flow",
  "link",
  "node",
  "core",
  "wave",
  "spark",
  "pulse",
  "shift",
  "stack",
  "swift",
  "smart",
  "prime",
  "pixel",
  "logic",
])

const INDUSTRY_KEYWORDS = [
  "app",
  "hub",
  "lab",
  "base",
  "zone",
  "spot",
  "nest",
  "dock",
  "port",
  "desk",
  "box",
  "kit",
  "pad",
  "tap",
  "bot",
  "api",
  "crm",
  "saas",
  "ai",
  "ml",
]

const KNOWN_BRANDS = [
  "stripe",
  "slack",
  "notion",
  "figma",
  "linear",
  "vercel",
  "supabase",
  "prisma",
  "twilio",
  "sendgrid",
  "mailchimp",
  "hubspot",
  "zendesk",
  "asana",
  "trello",
]

const HARD_CLUSTERS = ["xtr", "qz", "zx", "xz", "kx", "qk", "bz", "zb", "pz", "zp", "ckx", "xck"]

const TLD_STRENGTH: Record<string, number> = {
  com: 10,
  io: 8,
  ai: 7,
  app: 6,
  dev: 5,
  co: 4,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

function countSyllables(name: string): number {
  return (name.match(/[aeiouy]+/g) || []).length
}

function similarityByPrefix(a: string, b: string): number {
  const len = Math.min(a.length, b.length, 4)
  if (len < 2) return 0

  let matched = 0
  for (let i = 0; i < len; i += 1) {
    if (a[i] === b[i]) matched += 1
  }

  return matched / len
}

function getRelevanceScore(name: string, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 10

  let hits = 0
  let partials = 0

  for (const term of queryTerms) {
    if (!term) continue
    if (name.includes(term)) {
      hits += 1
      continue
    }

    const short = term.length > 4 ? term.slice(0, term.length - 1) : term
    if (short.length >= 3 && name.includes(short)) {
      partials += 1
    }
  }

  const coverage = hits / Math.max(1, Math.min(queryTerms.length, 5))
  const partialCoverage = partials / Math.max(1, Math.min(queryTerms.length, 5))
  const score = coverage * 18 + partialCoverage * 7
  return clamp(Math.round(score), 0, 25)
}

export function scoreName(input: ScoreNameInput): ScoreNameResult {
  const name = normalise(input.name)
  const tld = normalise(input.tld || "com") || "com"
  const bannedTokens = input.bannedTokens || DEFAULT_BANNED_TOKENS
  const queryTerms = [
    ...(input.keywords || []),
    ...(input.industryTerms || []),
    ...(input.vibeTerms || []),
  ]
    .map((token) => normalise(token))
    .filter((token) => token.length >= 2)

  const reasons: string[] = []
  const len = name.length

  let lengthScore = 2
  if (len >= 4 && len <= 5) lengthScore = 20
  else if (len <= 7) lengthScore = 18
  else if (len <= 9) lengthScore = 15
  else if (len <= 11) lengthScore = 10
  else if (len <= 13) lengthScore = 6

  const vowels = (name.match(/[aeiouy]/g) || []).length
  const vowelRatio = vowels / Math.max(1, len)
  const syllables = countSyllables(name)

  let pronounceScore = 10
  if (vowelRatio >= 0.28 && vowelRatio <= 0.62) pronounceScore += 6
  if (syllables >= 2 && syllables <= 3) pronounceScore += 4
  if (/[bcdfghjklmnpqrstvwxyz]{4,}/.test(name)) pronounceScore -= 8
  if (HARD_CLUSTERS.some((cluster) => name.includes(cluster))) pronounceScore -= 4
  pronounceScore = clamp(pronounceScore, 0, 20)

  let memorabilityScore = 8
  if (len <= 8) memorabilityScore += 4
  if (syllables >= 2 && syllables <= 3) memorabilityScore += 3
  if (/(.)\1\1/.test(name)) memorabilityScore -= 4
  memorabilityScore = clamp(memorabilityScore, 0, 15)

  const extensionScore = clamp(TLD_STRENGTH[tld] || 3, 0, 10)

  let characterScore = 15
  if (name.includes("-")) characterScore -= 6
  if (/\d/.test(name)) characterScore -= 6
  if (/(.)\1/.test(name)) characterScore -= 2
  if (HARD_CLUSTERS.some((cluster) => name.includes(cluster))) characterScore -= 3
  characterScore = clamp(characterScore, 0, 15)

  let brandRiskPenalty = 0
  if (bannedTokens.some((token) => token && name.includes(token))) {
    brandRiskPenalty -= 10
  }
  if (INDUSTRY_KEYWORDS.some((token) => name === token || name.startsWith(token) || name.endsWith(token))) {
    brandRiskPenalty -= 5
  }
  if (/ly$|ify$|er$|tion$/.test(name) && len > 5) {
    brandRiskPenalty -= 4
  }

  const closeBrand = KNOWN_BRANDS.find((brand) => {
    const similarity = similarityByPrefix(name, brand)
    return similarity >= 0.75 && name !== brand
  })

  if (closeBrand) {
    brandRiskPenalty -= 6
  }

  if (DICTIONARY_WORDS.has(name)) {
    brandRiskPenalty -= 6
  }

  brandRiskPenalty = clamp(brandRiskPenalty, -20, 0)

  const relevanceScore = getRelevanceScore(name, queryTerms)

  const totalScore = clamp(
    lengthScore + pronounceScore + memorabilityScore + extensionScore + characterScore + brandRiskPenalty + relevanceScore,
    0,
    100,
  )

  reasons.push(`length ${lengthScore}/20`)
  reasons.push(`pronounceability ${pronounceScore}/20`)
  reasons.push(`memorability ${memorabilityScore}/15`)
  reasons.push(`relevance ${relevanceScore}/25`)
  if (brandRiskPenalty < 0) reasons.push(`brand risk ${brandRiskPenalty}`)

  const label: FounderLabel = pronounceScore >= 14 ? "Pronounceable" : "Brandable"

  return {
    score: Math.round(totalScore),
    label,
    reasons,
    breakdown: {
      lengthScore,
      pronounceScore,
      memorabilityScore,
      extensionScore,
      characterScore,
      brandRiskPenalty,
      relevanceScore,
    },
  }
}
