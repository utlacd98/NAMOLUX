import morphemes from "@/lib/domainGen/morphemes.json"

export interface MorphemeEntry {
  fragment: string
  meaning: string
  category: "latin_greek" | "startup_tech" | "brand_domain" | string
  weight: number
  pronunciation_hint?: string
}

const MORPHEME_ENTRIES: MorphemeEntry[] = (morphemes as MorphemeEntry[])
  .map((entry) => ({
    ...entry,
    fragment: String(entry.fragment || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
    meaning: String(entry.meaning || "").trim(),
    category: String(entry.category || "brand_domain"),
    weight: Number(entry.weight || 0.8),
    pronunciation_hint: entry.pronunciation_hint ? String(entry.pronunciation_hint).trim() : undefined,
  }))
  .filter((entry) => entry.fragment.length >= 2 && entry.meaning.length > 0)

const MORPHEME_MAP = new Map(MORPHEME_ENTRIES.map((entry) => [entry.fragment, entry]))

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "by",
  "for",
  "from",
  "go",
  "i",
  "in",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "try",
  "we",
  "with",
  "your",
])

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  name: ["brand", "mark", "nom", "identity", "aura"],
  ai: ["agent", "logic", "neural", "smart", "prompt"],
  finance: ["vault", "cred", "trust", "mint", "prime"],
  health: ["vita", "bio", "pulse", "zen", "care"],
  fitness: ["pulse", "forge", "fit", "vital", "drive"],
  travel: ["orbit", "route", "trail", "aero", "guide"],
  food: ["craft", "blend", "fresh", "bloom", "mint"],
  beauty: ["aura", "lumen", "glow", "pure", "halo"],
  legal: ["trust", "sure", "clear", "shield", "anchor"],
  tech: ["grid", "stack", "sync", "flow", "nexus"],
  saas: ["stack", "flow", "scale", "base", "core"],
  crypto: ["vault", "chain", "mint", "node", "secure"],
}

const INDUSTRY_HINTS: Record<string, string[]> = {
  technology: ["grid", "stack", "sync", "nexus", "core", "vector"],
  "health & wellness": ["vita", "pulse", "zen", "aura", "balance", "care"],
  finance: ["vault", "cred", "mint", "prime", "secure", "trust"],
  "e-commerce": ["flow", "cart", "launch", "boost", "brand", "mark"],
  education: ["guide", "craft", "logic", "clear", "learn", "mentor"],
  creative: ["studio", "aura", "prism", "quill", "craft", "story"],
  "real estate": ["haven", "anchor", "nest", "terra", "clear", "bridge"],
  "food & beverage": ["blend", "mint", "craft", "bloom", "fresh", "spark"],
  "fashion & beauty": ["aura", "luxe", "halo", "vista", "tone", "glow"],
  "travel & tourism": ["orbit", "trail", "aero", "route", "vista", "guide"],
  "sports & fitness": ["pulse", "forge", "drive", "boost", "vital", "flow"],
  "entertainment & media": ["story", "signal", "spark", "vista", "tone", "frame"],
  "consulting & services": ["clear", "trust", "anchor", "bridge", "prime", "logic"],
  "marketing & advertising": ["brand", "mark", "spark", "boost", "signal", "story"],
  "legal & professional": ["trust", "shield", "anchor", "clear", "sure", "veri"],
  automotive: ["drive", "route", "axis", "forge", "boost", "core"],
  "home & garden": ["haven", "nest", "bloom", "terra", "craft", "clear"],
  "pet care": ["kind", "haven", "care", "nest", "aura", "bloom"],
  "gaming & esports": ["quest", "spark", "pulse", "nexus", "drift", "forge"],
  "sustainability & green tech": ["terra", "aero", "vita", "flux", "bloom", "clear"],
  "ai & machine learning": ["agent", "logic", "vector", "matrix", "prompt", "nexus"],
  "blockchain & crypto": ["vault", "mint", "node", "chain", "trust", "core"],
  "saas & software": ["stack", "sync", "flow", "scale", "core", "base"],
  manufacturing: ["forge", "craft", "struct", "drive", "core", "build"],
  "nonprofit & social impact": ["kind", "bridge", "trust", "aura", "story", "bloom"],
}

const VIBE_HINTS: Record<string, string[]> = {
  luxury: ["lux", "luxe", "aura", "halo", "prime", "crest", "noble"],
  futuristic: ["nova", "neo", "flux", "vector", "nexus", "quant", "orbit"],
  playful: ["spark", "snap", "hive", "drift", "bloom", "joy", "pop"],
  trustworthy: ["vera", "trust", "sure", "anchor", "shield", "clear", "bridge"],
  minimal: ["zen", "core", "base", "line", "clear", "pure", "form"],
}

const COMMON_DICTIONARY_WORDS = new Set([
  "brand",
  "name",
  "mark",
  "light",
  "nova",
  "mint",
  "spark",
  "pulse",
  "craft",
  "forge",
  "orbit",
  "flow",
  "studio",
  "trust",
  "clear",
  "prime",
  "core",
  "base",
  "grid",
  "lens",
  "halo",
  "aura",
  "vault",
  "bridge",
  "anchor",
  "drift",
  "prism",
  "trail",
  "story",
  "mode",
  "tone",
])

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function uniqueByFragment(items: MorphemeEntry[]): MorphemeEntry[] {
  const seen = new Set<string>()
  const result: MorphemeEntry[] = []

  for (const item of items) {
    if (seen.has(item.fragment)) continue
    seen.add(item.fragment)
    result.push(item)
  }

  return result
}

function tokeniseKeywords(keyword: string): string[] {
  return Array.from(
    new Set(
      keyword
        .split(/[\s,]+/)
        .map((token) => normalise(token))
        .filter((token) => token.length >= 2 && !STOPWORDS.has(token)),
    ),
  )
}

function getExpansionTokens(tokens: string[]): string[] {
  const expanded = new Set<string>(tokens)

  for (const token of tokens) {
    for (const synonym of KEYWORD_SYNONYMS[token] || []) {
      expanded.add(normalise(synonym))
    }
  }

  return Array.from(expanded)
}

function scoreMorphemeMatch(fragment: string, token: string): number {
  if (fragment === token) return 1
  if (fragment.startsWith(token) || token.startsWith(fragment)) return 0.82
  if (fragment.includes(token) || token.includes(fragment)) return 0.68
  return 0
}

export function buildConcepts(input: {
  keyword: string
  industry?: string
  vibe?: string
  conceptLimit?: number
  expanded?: boolean
}): MorphemeEntry[] {
  const tokens = tokeniseKeywords(input.keyword)
  const expandedTokens = getExpansionTokens(tokens)
  const targetLimit = Math.max(3, Math.min(input.conceptLimit || 8, 16))

  const scored: Array<{ entry: MorphemeEntry; score: number }> = []

  for (const entry of MORPHEME_ENTRIES) {
    let score = entry.weight * 0.5

    for (const token of expandedTokens) {
      const matchScore = scoreMorphemeMatch(entry.fragment, token)
      if (matchScore > 0) {
        score += matchScore
      }
    }

    if (tokens.some((token) => token === entry.fragment)) {
      score += 1.4
    }

    if ((input.industry || "").trim()) {
      const industryHints = INDUSTRY_HINTS[(input.industry || "").toLowerCase()] || []
      if (industryHints.includes(entry.fragment)) {
        score += 0.85
      }
    }

    if ((input.vibe || "").trim()) {
      const vibeHints = VIBE_HINTS[(input.vibe || "").toLowerCase()] || []
      if (vibeHints.includes(entry.fragment)) {
        score += 0.75
      }
    }

    if (score >= 0.9) {
      scored.push({ entry, score })
    }
  }

  const sorted = scored
    .sort((a, b) => b.score - a.score || a.entry.fragment.localeCompare(b.entry.fragment))
    .map((item) => item.entry)

  const selected = uniqueByFragment(sorted).slice(0, targetLimit)

  if (selected.length >= 3) {
    return selected
  }

  const fallbackHints = [
    ...(INDUSTRY_HINTS[(input.industry || "").toLowerCase()] || []),
    ...(VIBE_HINTS[(input.vibe || "").toLowerCase()] || []),
  ]

  for (const hint of fallbackHints) {
    const entry = MORPHEME_MAP.get(hint)
    if (entry) selected.push(entry)
    if (selected.length >= targetLimit) break
  }

  if (input.expanded && selected.length < targetLimit) {
    for (const entry of MORPHEME_ENTRIES) {
      selected.push(entry)
      if (selected.length >= targetLimit) break
    }
  }

  return uniqueByFragment(selected).slice(0, targetLimit)
}

function findFragmentsInName(name: string, roots: string[], concepts: MorphemeEntry[]): MorphemeEntry[] {
  const lowered = normalise(name)
  const conceptMap = new Map(concepts.map((item) => [item.fragment, item]))

  const byRoots = roots
    .map((root) => conceptMap.get(normalise(root)))
    .filter(Boolean) as MorphemeEntry[]

  const byScan = concepts.filter((entry) => lowered.includes(entry.fragment))

  return uniqueByFragment([...byRoots, ...byScan]).slice(0, 4)
}

function createMeaningBreakdownParts(name: string, matched: MorphemeEntry[]): string[] {
  const parts: string[] = []

  for (const item of matched.slice(0, 3)) {
    parts.push(`${item.fragment} (${item.meaning})`)
  }

  if (parts.length === 0) {
    const fallback = name.slice(0, 4)
    parts.push(`${fallback} (distinctive brand cue)`)
  }

  return parts
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function scorePronounceability(name: string): number {
  const lowered = normalise(name)
  if (!lowered) return 0

  const vowels = (lowered.match(/[aeiouy]/g) || []).length
  const ratio = vowels / lowered.length

  let score = 58

  if (ratio >= 0.28 && ratio <= 0.62) score += 18
  else if (ratio >= 0.22 && ratio <= 0.7) score += 9
  else score -= 16

  if (/[bcdfghjklmnpqrstvwxyz]{4,}/.test(lowered)) score -= 18
  if (/(.)\1\1/.test(lowered)) score -= 12
  if (/[qzx]{2,}/.test(lowered)) score -= 8
  if (/(rn|vv|lll|iii)/.test(lowered)) score -= 6

  const syllables = (lowered.match(/[aeiouy]+/g) || []).length
  if (syllables >= 2 && syllables <= 3) score += 10
  else if (syllables === 1 || syllables === 4) score += 3
  else score -= 6

  return clamp(Math.round(score), 0, 100)
}

export function buildMeaningBreakdown(input: {
  name: string
  roots: string[]
  concepts: MorphemeEntry[]
}): {
  fragments: MorphemeEntry[]
  breakdown: string
  oneLiner: string
  meaningScore: number
} {
  const name = normalise(input.name)
  const matched = findFragmentsInName(name, input.roots, input.concepts)

  const recognizedCoverage = matched.reduce((sum, item) => sum + item.fragment.length, 0)
  const recognizableRatio = clamp(recognizedCoverage / Math.max(name.length, 1), 0, 1)
  const dictionaryPresence = matched.some((item) => COMMON_DICTIONARY_WORDS.has(item.fragment)) ? 1 : 0
  const pronounceability = scorePronounceability(name) / 100
  const explainingPower = matched.length >= 2 ? 1 : matched.length === 1 ? 0.55 : 0.2

  const meaningScore = Math.round(
    clamp(
      recognizableRatio * 38 +
        dictionaryPresence * 14 +
        pronounceability * 24 +
        explainingPower * 24,
      0,
      100,
    ),
  )

  const parts = createMeaningBreakdownParts(name, matched)
  const breakdown = `${parts.join(" + ")} -> ${name}`
  const leadA = matched[0]
  const leadB = matched[1]
  const oneLiner = leadA && leadB
    ? `${leadA.fragment} + ${leadB.fragment} signals ${leadA.meaning.split(";")[0]} with ${leadB.meaning.split(";")[0]}.`
    : leadA
      ? `${leadA.fragment} gives a clear ${leadA.meaning.split(";")[0]} cue.`
      : `${name} keeps a clean, pronounceable brand shape.`

  return {
    fragments: matched,
    breakdown,
    oneLiner,
    meaningScore,
  }
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0))

  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[b.length][a.length]
}

function rootSignature(roots: string[]): string {
  return roots
    .map((root) => normalise(root))
    .filter(Boolean)
    .sort()
    .slice(0, 3)
    .join("|")
}

export function dedupeByMeaningDiversity<T extends { name: string; roots: string[] }>(items: T[]): T[] {
  const result: T[] = []
  const signatures = new Set<string>()

  for (const item of items) {
    const name = normalise(item.name)
    const signature = rootSignature(item.roots)

    if (signatures.has(signature) && signature.length > 0) {
      continue
    }

    const tooClose = result.some((picked) => {
      const pickedName = normalise(picked.name)
      if (pickedName[0] !== name[0]) return false
      return levenshteinDistance(pickedName, name) <= 1
    })

    if (tooClose) {
      continue
    }

    result.push(item)
    if (signature) signatures.add(signature)
  }

  return result
}
