export type FounderLabel = "Pronounceable" | "Brandable"
export type BrandVibe = "luxury" | "futuristic" | "playful" | "trustworthy" | "minimal" | ""

export interface ScoreNameInput {
  name: string
  tld?: string
  vibe?: BrandVibe
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
    brandRiskScore: number
    vibeModifier: number
  }
  /** Raw 0-100 scores before weighting - for UI display */
  rawScores: {
    length: number
    pronounceability: number
    memorability: number
    extension: number
    characterQuality: number
    brandRisk: number
  }
}

// Generic prefixes that hurt memorability and brand strength
const GENERIC_PREFIXES = ["my", "get", "try", "go", "use", "the", "your", "our", "be", "we"]

// Generic suffixes that hurt memorability (especially with keywords)
const GENERIC_SUFFIXES = ["hub", "zone", "lab", "labs", "up", "ly", "ify", "fy", "io", "app", "base", "spot", "hq", "now"]

// Industry cliché keywords
const INDUSTRY_CLICHES = [
  "cloud", "sync", "data", "tech", "digital", "smart", "ai", "ml",
  "pixel", "wealth", "finance", "health", "crypto", "block", "chain",
  "solutions", "global", "group", "systems", "pro", "plus", "max"
]

// Known major brands for conflict detection
const KNOWN_BRANDS = [
  "google", "apple", "amazon", "microsoft", "facebook", "meta", "netflix", "spotify",
  "stripe", "slack", "notion", "figma", "linear", "vercel", "supabase", "prisma",
  "twilio", "sendgrid", "mailchimp", "hubspot", "zendesk", "asana", "trello",
  "dropbox", "zoom", "shopify", "square", "paypal", "venmo", "uber", "lyft",
  "airbnb", "tiktok", "snapchat", "twitter", "instagram", "whatsapp", "telegram",
  "discord", "reddit", "pinterest", "linkedin", "youtube", "twitch",
  "mycloud", "icloud", "onedrive", "gdrive", // cloud services
  "pornhub", "redtube", "xvideos" // adult content to avoid phonetic similarity
]

// Common dictionary words (exact match penalty)
const DICTIONARY_WORDS = new Set([
  "cloud", "tech", "data", "code", "sync", "flow", "link", "node", "core", "wave",
  "spark", "pulse", "shift", "stack", "swift", "smart", "prime", "pixel", "logic",
  "trust", "vault", "wealth", "ledger", "pure", "glow", "dream", "forge", "pixel"
])

// Awkward consonant clusters that hurt pronounceability
const AWKWARD_CLUSTERS = [
  "fgr", "drm", "pxl", "xtr", "qz", "zx", "xz", "kx", "qk", "bz", "zb",
  "pz", "zp", "ckx", "xck", "tch", "ght", "ngth", "btr", "dsk", "mpt",
  "nxt", "str", "scr", "spr", "spl", "thr", "chr", "phr", "shr", "sch"
]

// Extension strength (0-100 scale)
const TLD_STRENGTH: Record<string, number> = {
  com: 100,
  io: 78,
  ai: 75,
  co: 58,
  app: 52,
  dev: 48,
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

function hasVowels(name: string): boolean {
  return /[aeiouy]/i.test(name)
}

function countConsecutiveConsonants(name: string): number {
  const matches = name.match(/[bcdfghjklmnpqrstvwxyz]+/gi) || []
  return Math.max(0, ...matches.map(m => m.length))
}

function startsWithGenericPrefix(name: string): boolean {
  return GENERIC_PREFIXES.some(prefix => name.startsWith(prefix) && name.length > prefix.length + 2)
}

function endsWithGenericSuffix(name: string): boolean {
  return GENERIC_SUFFIXES.some(suffix => name.endsWith(suffix) && name.length > suffix.length + 2)
}

function hasPhoneticSimilarityToBrand(name: string): string | null {
  for (const brand of KNOWN_BRANDS) {
    // Check if name is too similar to a known brand
    if (name === brand) continue

    // Check prefix similarity (first 4+ chars)
    const prefixLen = Math.min(4, Math.min(name.length, brand.length))
    if (prefixLen >= 3 && name.slice(0, prefixLen) === brand.slice(0, prefixLen)) {
      return brand
    }

    // Check if name contains the brand or vice versa
    if (name.length >= 4 && brand.includes(name)) return brand
    if (brand.length >= 4 && name.includes(brand)) return brand

    // Phonetic similarity check for "hub" names (avoid pawhub->pornhub confusion)
    if (name.endsWith("hub") && brand.endsWith("hub")) {
      const nameRoot = name.slice(0, -3)
      const brandRoot = brand.slice(0, -3)
      if (nameRoot.length >= 2 && brandRoot.length >= 2) {
        // Simple phonetic: first letter + vowel pattern
        if (nameRoot[0] === brandRoot[0]) return brand
      }
    }
  }
  return null
}

// ============================================================================
// SCORING FUNCTIONS (Each returns 0-100)
// ============================================================================

/**
 * 1. Brand Length Score (weight: 0.15)
 * ≤5 chars = 100, 6 = 90, 7 = 75, 8 = 60, 9 = 45, 10 = 35, 11+ = 20
 */
function calculateLengthScore(name: string): number {
  const len = name.length
  if (len <= 5) return 100
  if (len === 6) return 90
  if (len === 7) return 75
  if (len === 8) return 60
  if (len === 9) return 45
  if (len === 10) return 35
  return 20
}

/**
 * 2. Pronounceability Score (weight: 0.15)
 * Tests: vowel presence, consonant clusters, awkward combos, syllable mapping
 */
function calculatePronounceabilityScore(name: string): number {
  let score = 100

  // No vowels = extremely hard to pronounce
  if (!hasVowels(name)) return 10

  // Check vowel ratio (ideal: 0.28-0.62)
  const vowels = (name.match(/[aeiouy]/gi) || []).length
  const ratio = vowels / name.length
  if (ratio < 0.2) score -= 25 // too few vowels
  else if (ratio < 0.28) score -= 10
  else if (ratio > 0.7) score -= 15 // too many vowels

  // 3+ consecutive consonants: -30 per occurrence
  const consecutiveConsonants = countConsecutiveConsonants(name)
  if (consecutiveConsonants >= 4) score -= 40
  else if (consecutiveConsonants >= 3) score -= 30

  // Awkward letter combos: -20 per occurrence
  for (const cluster of AWKWARD_CLUSTERS) {
    if (name.includes(cluster)) {
      score -= 20
      break // only penalize once
    }
  }

  // Check syllable structure (2-3 syllables is ideal)
  const syllables = countSyllables(name)
  if (syllables === 0) score -= 25 // no clear syllables
  else if (syllables === 1 && name.length > 5) score -= 10 // single syllable but long
  else if (syllables >= 2 && syllables <= 3) score += 5 // bonus for ideal syllables
  else if (syllables > 4) score -= 15

  return clamp(score, 0, 100)
}

/**
 * 3. Memorability Score (weight: 0.20)
 * Unique coined word = 90-100, real word combo = 80-90, generic prefix+word = 35-50, random string = 15-30
 */
function calculateMemorabilityScore(name: string): number {
  let score = 75 // start at decent baseline

  const len = name.length
  const syllables = countSyllables(name)
  const hasGenericPrefix = startsWithGenericPrefix(name)
  const hasGenericSuffix = endsWithGenericSuffix(name)

  // Length bonus/penalty
  if (len <= 6) score += 15
  else if (len <= 8) score += 8
  else if (len >= 12) score -= 20

  // Syllable structure (2-3 is most memorable)
  if (syllables >= 2 && syllables <= 3) score += 10
  else if (syllables === 1 && len <= 5) score += 5 // short single syllable is fine
  else if (syllables > 4) score -= 15

  // Generic prefix penalty (my-, get-, try-, go-, use-)
  if (hasGenericPrefix) score -= 25

  // Generic suffix penalty (-hub, -zone, -lab, etc.)
  if (hasGenericSuffix) score -= 20

  // Double penalty for BOTH generic prefix AND suffix
  if (hasGenericPrefix && hasGenericSuffix) score -= 10

  // Vowel-stripped / random string penalty
  const vowelCount = (name.match(/[aeiouy]/gi) || []).length
  if (vowelCount === 0) score -= 40
  else if (vowelCount < name.length * 0.2) score -= 25 // very few vowels

  // Triple letter penalty
  if (/(.)\1\1/.test(name)) score -= 15

  // Bonus for clear word structure (contains recognizable patterns)
  if (/^[a-z]+[aeiouy][a-z]+$/i.test(name) && syllables >= 2) score += 5

  return clamp(score, 0, 100)
}

/**
 * 4. Extension Score (weight: 0.15)
 * .com = 100, .io = 78, .ai = 75, .co = 58, .app = 52, .dev = 48, others = 30
 */
function calculateExtensionScore(tld: string): number {
  return TLD_STRENGTH[tld] || 30
}

/**
 * 5. Character Quality Score (weight: 0.10)
 * 100 = clean letters only, penalties for hyphens, numbers, letter replacements
 */
function calculateCharacterQualityScore(name: string): number {
  let score = 100

  // Hyphen: -35
  if (name.includes("-")) score -= 35

  // Numbers: -25 per number
  const numbers = name.match(/\d/g)
  if (numbers) score -= numbers.length * 25

  // Letter replacements (z for s, x for cks, k for c): -15 per occurrence
  if (/z$/.test(name) && name.length > 3) score -= 15 // "boyz" style
  if (/x/.test(name) && !/^ex|^ax/.test(name)) score -= 10 // "pixl" style
  if (/ck/.test(name)) score -= 5 // not as bad

  // All consonants / no vowels: -30
  if (!hasVowels(name)) score -= 30

  return clamp(score, 0, 100)
}

/**
 * 6. Brand Risk Score (weight: 0.25) - THE MOST IMPORTANT FACTOR
 * Start at 100, apply penalties for generic patterns, brand conflicts, clichés
 */
function calculateBrandRiskScore(name: string): number {
  let score = 100

  // Generic prefix (my-, get-, try-, go-, use-): -15
  if (startsWithGenericPrefix(name)) {
    score -= 15
  }

  // Generic suffix with keyword (-hub, -zone, -lab after industry word): -15
  if (endsWithGenericSuffix(name)) {
    score -= 15
  }

  // Direct industry cliché keyword: -10
  for (const cliche of INDUSTRY_CLICHES) {
    if (name === cliche || name.startsWith(cliche) || name.endsWith(cliche)) {
      score -= 10
      break
    }
  }

  // Phonetic similarity to major existing brand: -25
  const similarBrand = hasPhoneticSimilarityToBrand(name)
  if (similarBrand) {
    score -= 25
    // Extra penalty for adult content similarity
    if (["pornhub", "redtube", "xvideos"].includes(similarBrand)) {
      score -= 15 // total -40 for adult content similarity
    }
  }

  // "hub" suffix that could be confused with adult content: -30
  if (name.endsWith("hub") && name.length <= 7) {
    score -= 20 // short *hub names are risky
  }

  // Exact dictionary word with no modification: -10
  if (DICTIONARY_WORDS.has(name)) {
    score -= 10
  }

  // Overused suffixes: -ly, -ify (when overused)
  if (/ify$/.test(name)) score -= 8
  if (/ly$/.test(name) && name.length > 5) score -= 5

  return clamp(score, 0, 100)
}

/**
 * 7. Vibe Modifier (applied AFTER weighted sum)
 * +5 to -8 based on how well the name matches the selected brand vibe
 */
function calculateVibeModifier(name: string, vibe: BrandVibe): number {
  if (!vibe) return 0

  const len = name.length
  const hasGenericPrefix = startsWithGenericPrefix(name)
  const hasGenericSuffix = endsWithGenericSuffix(name)
  const vowelRich = (name.match(/[aeiouy]/gi) || []).length >= name.length * 0.4

  switch (vibe) {
    case "luxury":
      // Reward: short, vowel-rich, elegant. Penalize: get-, my-, -hub, -zone, -up
      let luxuryMod = 0
      if (len <= 6 && vowelRich && !hasGenericPrefix && !hasGenericSuffix) luxuryMod += 5
      if (hasGenericPrefix) luxuryMod -= 5
      if (name.endsWith("hub") || name.endsWith("zone") || name.endsWith("up")) luxuryMod -= 5
      if (/sy$|zy$|ly$/.test(name) && len <= 6) luxuryMod -= 3 // cutesy endings
      return clamp(luxuryMod, -8, 5)

    case "futuristic":
      // Reward: coined/invented, sharp consonants, tech-feeling. Penalize: old-web patterns
      let futuristicMod = 0
      if (!hasGenericPrefix && !hasGenericSuffix && len <= 8) futuristicMod += 5
      if (/x|z|q/.test(name) && vowelRich) futuristicMod += 2 // sharp but readable
      if (hasGenericPrefix) futuristicMod -= 5 // get-, my- are dated
      if (name.endsWith("zone")) futuristicMod -= 5 // dated pattern
      if (!hasVowels(name)) futuristicMod -= 5 // unreadable abbreviation
      return clamp(futuristicMod, -8, 5)

    case "playful":
      // Reward: fun sounds, double letters, friendly suffixes. Most permissive.
      let playfulMod = 0
      if (/ly$|sy$|zy$/.test(name)) playfulMod += 3
      if (/(.)\1/.test(name) && vowelRich) playfulMod += 2 // double letters can be fun
      if (name.length <= 7 && vowelRich) playfulMod += 2
      // Minimal penalties for playful
      return clamp(playfulMod, -3, 5)

    case "trustworthy":
      // Reward: solid, professional, real-word-based. Penalize: cutesy suffixes
      let trustworthyMod = 0
      if (len >= 5 && len <= 9 && !hasGenericPrefix && vowelRich) trustworthyMod += 5
      if (/sy$|zy$/.test(name)) trustworthyMod -= 5 // not professional
      if (name.startsWith("try") || name.startsWith("use")) trustworthyMod -= 3 // implies uncertainty
      return clamp(trustworthyMod, -8, 5)

    case "minimal":
      // Reward: single clean word, ≤6 chars, no prefix/suffix. Penalize: compound words
      let minimalMod = 0
      if (len <= 6 && !hasGenericPrefix && !hasGenericSuffix) minimalMod += 5
      if (hasGenericPrefix && hasGenericSuffix) minimalMod -= 5 // double compound
      if (name.startsWith("get") || name.startsWith("try") || name.startsWith("go")) minimalMod -= 3
      if (name.endsWith("up")) minimalMod -= 3 // action-oriented
      return clamp(minimalMod, -8, 5)

    default:
      return 0
  }
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

export function scoreName(input: ScoreNameInput): ScoreNameResult {
  const name = normalise(input.name)
  const tld = normalise(input.tld || "com") || "com"
  const vibe = input.vibe || ""

  const reasons: string[] = []

  // Calculate raw scores (0-100 each)
  const rawLength = calculateLengthScore(name)
  const rawPronounceability = calculatePronounceabilityScore(name)
  const rawMemorability = calculateMemorabilityScore(name)
  const rawExtension = calculateExtensionScore(tld)
  const rawCharacterQuality = calculateCharacterQualityScore(name)
  const rawBrandRisk = calculateBrandRiskScore(name)

  // Apply weights as per the new formula:
  // FounderSignal = (Length×0.15) + (Pronounce×0.15) + (Memorability×0.20) + (Extension×0.15) + (CharQuality×0.10) + (BrandRisk×0.25)
  const weightedLength = rawLength * 0.15
  const weightedPronounce = rawPronounceability * 0.15
  const weightedMemorability = rawMemorability * 0.20
  const weightedExtension = rawExtension * 0.15
  const weightedCharacter = rawCharacterQuality * 0.10
  const weightedBrandRisk = rawBrandRisk * 0.25

  const baseScore = weightedLength + weightedPronounce + weightedMemorability + weightedExtension + weightedCharacter + weightedBrandRisk

  // Apply vibe modifier
  const vibeModifier = calculateVibeModifier(name, vibe)
  const totalScore = clamp(Math.round(baseScore + vibeModifier), 0, 100)

  // Generate reasons
  if (rawLength >= 90) reasons.push("Excellent length (≤6 chars)")
  else if (rawLength >= 60) reasons.push("Good length")
  else reasons.push("Name is long")

  if (rawPronounceability >= 80) reasons.push("Easy to pronounce")
  else if (rawPronounceability < 50) reasons.push("Hard to pronounce")

  if (rawMemorability >= 80) reasons.push("Highly memorable")
  else if (rawMemorability < 50) reasons.push("Low memorability")

  if (rawBrandRisk < 60) reasons.push("Brand risk concerns")
  if (rawBrandRisk < 40) reasons.push("High brand risk")

  if (vibeModifier > 0) reasons.push(`Vibe match (+${vibeModifier})`)
  else if (vibeModifier < 0) reasons.push(`Vibe mismatch (${vibeModifier})`)

  // Determine label based on pronounceability score
  const label: FounderLabel = rawPronounceability >= 60 ? "Pronounceable" : "Brandable"

  return {
    score: totalScore,
    label,
    reasons,
    breakdown: {
      lengthScore: Math.round(weightedLength),
      pronounceScore: Math.round(weightedPronounce),
      memorabilityScore: Math.round(weightedMemorability),
      extensionScore: Math.round(weightedExtension),
      characterScore: Math.round(weightedCharacter),
      brandRiskScore: Math.round(weightedBrandRisk),
      vibeModifier,
    },
    rawScores: {
      length: rawLength,
      pronounceability: rawPronounceability,
      memorability: rawMemorability,
      extension: rawExtension,
      characterQuality: rawCharacterQuality,
      brandRisk: rawBrandRisk,
    },
  }
}
