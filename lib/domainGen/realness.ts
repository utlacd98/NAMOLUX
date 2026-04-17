/**
 * Realness, Gibberish, and Relevance — lightweight local heuristics.
 *
 * No external APIs, no ML models. Pure string analysis.
 * Used by the generation pipeline to filter gibberish and ensure candidates
 * remain loosely connected to the user's keyword intent.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Dictionaries
// ─────────────────────────────────────────────────────────────────────────────

// Common English words used as brand substrates / morphemes.
// Kept compact — these anchor "realness" signals.
const DICTIONARY_WORDS = new Set([
  // Nature / terrain
  "drift", "bloom", "ember", "flint", "grove", "haven", "ridge", "vale",
  "crest", "shore", "field", "stone", "forge", "cedar", "birch", "cliff",
  "peak", "dune", "glen", "fern", "moss", "sage", "tide", "helm", "arch",
  "blade", "prism", "gleam", "craft", "lumen", "orbit", "pulse", "spark",
  "frame", "lever", "scope", "scale", "vista", "loft", "nest", "base",
  "root", "stem", "core", "seed", "bolt", "hinge", "pivot", "wedge",
  "knot", "link", "mesh", "weave", "loop", "arc", "span", "rift",
  "wave", "beam", "bolt", "path", "lane", "mark", "sign", "point",
  "home", "land", "light", "sound", "trade", "build", "flow", "glow",
  // Common startup morphemes
  "cloud", "data", "net", "lab", "grid", "byte", "code", "sync", "flow",
  "hub", "shop", "mail", "chat", "hire", "meet", "work", "team", "pay",
  "cart", "stack", "wave", "dock", "post", "news", "book", "live",
  "food", "farm", "ride", "track", "note", "trip", "bank", "card",
  // Brand-style substrates
  "loom", "plaid", "stripe", "slate", "grain", "true", "clear", "swift",
  "bold", "calm", "keen", "fair", "warm", "rise", "wind", "step", "hand",
  "bright", "hearth", "echo", "mend", "cast", "mint", "bond", "fold",
  "notion", "canvas", "fabric", "spark", "shift", "solid", "tempo",
  "relay", "signal", "vector", "thread", "cipher", "atlas", "anchor",
])

// Common morphemes (startup/brand building blocks) — 3-5 char fragments
// Bonus applied even if name contains one as a fragment (not just whole word).
const COMMON_MORPHEMES = [
  "core", "flow", "data", "cloud", "net", "base", "lab", "grid",
  "hub", "sync", "code", "byte", "wave", "beam", "link", "loop",
  "cast", "flux", "path", "span", "mesh", "node", "port", "stack",
  "mint", "bond", "loft", "nest", "haven", "forge", "drift", "ember",
  "frame", "ridge", "crest", "slate", "bloom", "lumen", "craft",
]

// Common, natural consonant clusters in English brand names.
// Clusters NOT in this set get penalised as phonotactically weak.
const COMMON_CLUSTERS = new Set([
  "br", "cr", "dr", "fr", "gr", "pr", "tr", "bl", "cl", "fl", "gl", "pl", "sl",
  "sc", "sk", "sm", "sn", "sp", "st", "sw", "tw", "th", "sh", "ch", "wh", "ph",
  "str", "spr", "scr", "spl", "thr", "chr", "sch", "shr", "tch", "dge", "nge",
  "nd", "nt", "nk", "ng", "ft", "lt", "pt", "kt", "ct", "rd", "rk", "rt", "rm",
  "rn", "rp", "rl", "rs", "rc", "rg", "rb", "ld", "lk", "lp", "lm", "ln", "lt",
  "ls", "lf", "mp", "mb", "nc", "ns", "nf", "st", "sp", "sk", "ght", "ght",
  "rch", "rth", "rld", "rst", "nst", "mpt", "ntr", "ndl", "ndr",
])

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function extractConsonantClusters(name: string): string[] {
  // All consecutive consonant runs
  return name.toLowerCase().match(/[bcdfghjklmnpqrstvwxyz]{2,}/g) || []
}

function countIllegalClusters(name: string): number {
  const clusters = extractConsonantClusters(name)
  let illegal = 0
  for (const c of clusters) {
    // Check if the cluster OR any 2-3 char sub-cluster is common
    let ok = false
    if (COMMON_CLUSTERS.has(c)) ok = true
    // Check 2-char windows within longer clusters
    if (!ok && c.length >= 2) {
      for (let i = 0; i <= c.length - 2; i++) {
        if (COMMON_CLUSTERS.has(c.slice(i, i + 2)) || COMMON_CLUSTERS.has(c.slice(i, i + 3))) {
          ok = true
          break
        }
      }
    }
    if (!ok) illegal++
  }
  return illegal
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }
  return dp[a.length][b.length]
}

function containsMorpheme(name: string): boolean {
  const clean = name.toLowerCase()
  for (const m of COMMON_MORPHEMES) {
    if (clean.includes(m)) return true
  }
  return false
}

function hasCleanCvcvPattern(name: string): boolean {
  const clean = name.toLowerCase()
  return /^[bcdfghjklmnpqrstvwxyz][aeiouy][bcdfghjklmnpqrstvwxyz][aeiouy]([bcdfghjklmnpqrstvwxyz][aeiouy]?)?$/.test(clean)
}

function hasAwkwardEnding(name: string): boolean {
  const clean = name.toLowerCase()
  // Awkward endings that break brand feel
  return /(?:fk|pk|zk|vk|xk|qt|bt|zf|xf|nk[bcdfghjklmnpqrstvwxyz]|oe|ue|ae)$/.test(clean)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Realness Score — 0-100
// ─────────────────────────────────────────────────────────────────────────────

export function getRealnessScore(name: string): number {
  const clean = name.toLowerCase().replace(/[^a-z]/g, "")
  if (!clean || clean.length < 3) return 0

  let score = 0

  // +40: exact dictionary word
  if (DICTIONARY_WORDS.has(clean)) {
    score += 40
  }

  // +25: contains a common morpheme (data, flow, cloud, etc.)
  if (containsMorpheme(clean)) {
    score += 25
  }

  // Phonotactic check: start at 30, subtract 10 per illegal cluster
  const illegal = countIllegalClusters(clean)
  score += Math.max(0, 30 - illegal * 10)

  // Brand pattern similarity (0-30)
  let patternScore = 0
  if (hasCleanCvcvPattern(clean)) patternScore += 20
  if (!hasAwkwardEnding(clean)) patternScore += 10
  score += patternScore

  return clamp(score, 0, 100)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Gibberish Hard Filter
// ─────────────────────────────────────────────────────────────────────────────

export function isGibberish(name: string): boolean {
  const clean = name.toLowerCase().replace(/[^a-z]/g, "")
  if (!clean || clean.length < 3) return true

  // Has a recognisable morpheme? Not gibberish
  if (containsMorpheme(clean)) return false
  if (DICTIONARY_WORDS.has(clean)) return false

  // Count illegal clusters
  const illegal = countIllegalClusters(clean)

  // Check levenshtein distance <=2 to any dictionary word (brand-adjacent)
  let nearDictionary = false
  for (const word of DICTIONARY_WORDS) {
    if (Math.abs(word.length - clean.length) > 2) continue
    if (levenshtein(clean, word) <= 2) {
      nearDictionary = true
      break
    }
  }

  // Gibberish = no morpheme AND 2+ illegal clusters AND not near any word
  if (illegal >= 2 && !nearDictionary) return true

  // Additional catch: 3+ syllables with no vowel pattern resembling English
  // and no morpheme contact → gibberish
  const syllables = (clean.match(/[aeiouy]+/g) || []).length
  if (syllables >= 3 && illegal >= 1 && !nearDictionary && clean.length >= 7) return true

  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Relevance Score — 0-100 (keyword alignment)
// ─────────────────────────────────────────────────────────────────────────────

// Semantic root groupings — names in the same group share intent
const SEMANTIC_GROUPS: Record<string, string[]> = {
  cloud: ["cloud", "sky", "mist", "air", "cirrus", "nimbus", "stratus", "nebula", "ether"],
  data: ["data", "info", "byte", "bit", "stat", "log", "record", "stream"],
  store: ["store", "shop", "cart", "market", "bazaar", "goods", "buy", "sell", "retail"],
  tech: ["tech", "code", "dev", "engine", "logic", "stack", "build", "grid"],
  health: ["health", "care", "wellness", "vital", "heal", "mend", "life", "pulse"],
  finance: ["money", "cash", "coin", "pay", "bank", "vault", "ledger", "wealth", "fund"],
  travel: ["travel", "trip", "journey", "path", "route", "wander", "roam", "flight"],
  food: ["food", "eat", "meal", "kitchen", "cook", "dish", "feast", "plate"],
  game: ["game", "play", "quest", "arena", "level", "score", "match"],
  learn: ["learn", "teach", "study", "guide", "tutor", "school", "know", "mentor"],
  eco: ["eco", "green", "earth", "terra", "leaf", "bloom", "grow", "pure", "clean"],
  ai: ["ai", "brain", "mind", "think", "neural", "cortex", "smart", "logic"],
  social: ["social", "chat", "meet", "connect", "friend", "talk", "share", "group"],
  crypto: ["crypto", "coin", "chain", "block", "ledger", "token", "vault"],
  security: ["secure", "shield", "guard", "safe", "fort", "lock", "armor", "haven"],
  fitness: ["fit", "gym", "strong", "active", "move", "train", "muscle", "flex"],
  beauty: ["beauty", "skin", "glow", "bloom", "shine", "pure", "gleam"],
  pet: ["pet", "paw", "tail", "fur", "furry", "woof", "bark", "meow", "whisker"],
  real: ["home", "house", "abode", "nest", "haven", "roof", "estate", "land"],
  art: ["art", "craft", "paint", "canvas", "design", "studio", "muse", "palette"],
}

function getSemanticNeighbours(keyword: string): string[] {
  const clean = keyword.toLowerCase().replace(/[^a-z]/g, "")
  if (!clean) return []

  // Direct group hit
  if (SEMANTIC_GROUPS[clean]) return SEMANTIC_GROUPS[clean]

  // Find any group containing this keyword
  for (const [group, words] of Object.entries(SEMANTIC_GROUPS)) {
    if (words.includes(clean)) return [group, ...words]
  }

  return []
}

export function getRelevanceScore(name: string, keywords: string[]): number {
  const clean = name.toLowerCase().replace(/[^a-z]/g, "")
  if (!clean || keywords.length === 0) {
    // Without keywords, relevance is neutral — don't reject
    return 40
  }

  // Check whether ANY keyword has a semantic group we know about.
  // If not, we can't meaningfully score relevance — return neutral 40
  // so the filter doesn't reject everything for niche/unknown keywords.
  const anyHasSemanticGroup = keywords.some(kw => {
    const c = kw.toLowerCase().replace(/[^a-z]/g, "")
    return getSemanticNeighbours(c).length > 0
  })
  if (!anyHasSemanticGroup) {
    return 40
  }

  let score = 0

  for (const rawKw of keywords) {
    const kw = rawKw.toLowerCase().replace(/[^a-z]/g, "")
    if (!kw || kw.length < 2) continue

    // +40: contains keyword substring
    if (clean.includes(kw)) {
      score = Math.max(score, 40)
      continue
    }

    // +25: shares semantic neighbours
    const neighbours = getSemanticNeighbours(kw)
    for (const n of neighbours) {
      if (n !== kw && clean.includes(n)) {
        score = Math.max(score, 25)
        break
      }
    }

    // +15: levenshtein distance <= 2 (close mutation)
    if (kw.length >= 4 && Math.abs(kw.length - clean.length) <= 2) {
      if (levenshtein(clean, kw) <= 2) {
        score = Math.max(score, 15)
      }
    }
  }

  // If we checked semantic groups but nothing matched, still return a neutral
  // floor (30) rather than 0 — most names won't literally share morphemes with
  // the keyword and that's fine. The other quality gates handle the rest.
  if (score === 0) return 30

  return score
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Keyword Clone Detection
// ─────────────────────────────────────────────────────────────────────────────

const CLONE_SUFFIXES = ["ora", "ium", "ova", "era", "ara", "ava", "yx", "ify", "ly", "fy", "io", "ion", "ity"]

export function isKeywordClone(name: string, keywords: string[]): boolean {
  const clean = name.toLowerCase().replace(/[^a-z]/g, "")
  if (!clean || keywords.length === 0) return false

  for (const rawKw of keywords) {
    const kw = rawKw.toLowerCase().replace(/[^a-z]/g, "")
    if (!kw || kw.length < 3) continue

    // Name IS the keyword (exact)
    if (clean === kw) return true

    // Name starts with keyword + common suffix
    if (clean.startsWith(kw)) {
      const remainder = clean.slice(kw.length)
      if (CLONE_SUFFIXES.includes(remainder)) return true
      if (remainder.length <= 3) return true // "cloudy", "stripeer" etc.
    }

    // Truncated keyword + clone suffix
    // e.g. "horizon" → "horiz" + "ora" = "horizora" (2-char drop)
    //      "cloud"   → "clou"  + "dium" (not applicable)
    // Try dropping 1-3 chars from keyword, checking if name is trunc + clone suffix
    if (kw.length >= 4) {
      for (let drop = 1; drop <= Math.min(3, kw.length - 3); drop++) {
        const trunc = kw.slice(0, kw.length - drop)
        if (clean.startsWith(trunc)) {
          const remainder = clean.slice(trunc.length)
          if (remainder.length >= 2 && remainder.length <= 5) {
            if (CLONE_SUFFIXES.some(s => remainder === s || remainder.endsWith(s))) return true
          }
        }
      }
    }
  }

  return false
}
