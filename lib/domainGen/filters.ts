import type { AutoFindControls, FilterDecision } from "@/lib/domainGen/types"

const HARD_BANNED_CLUSTERS = ["qzx", "xq", "jjj", "zzz", "vvv", "kkk", "wq"]
const BANNED_AI_SMELL_SUFFIXES = [
  "ora",
  "ium",
  "ova",
  "yx",
  "era",
  "ion",
  "ity",
  "ara",
  "ava",
  "rix",
  "trix",
  "nix",
  "vix",
  "oxa",
  "exa",
]

// AI-generated name patterns — hard reject these before scoring
const AI_SMELL_PREFIX_RE = /^(?:nexo|zyro|axio|synq|velo|zeno|quant|vex[^t]|zent|xero|vyra|zynth)/

const TRADEMARK_LIKE_FRAGMENTS = [
  "google",
  "amazon",
  "openai",
  "chatgpt",
  "uber",
  "airbnb",
  "shopify",
  "microsoft",
  "meta",
  "tesla",
  "spotify",
  "netflix",
]

function hasExcessiveRepeatedLetters(name: string): boolean {
  return /(.)\1\1/.test(name)
}

function hasAwkwardConsonantCluster(name: string): boolean {
  return /[bcdfghjklmnpqrstvwxyz]{5,}/.test(name)
}

function hasVisualAmbiguity(name: string): boolean {
  return /(rnm|mrn|vv|lll|iii|rnm)/.test(name)
}

function hasReasonableVowelRatio(name: string, style: AutoFindControls["style"]): boolean {
  const onlyLetters = name.replace(/[^a-z]/g, "")
  if (!onlyLetters) return false

  const vowelCount = (onlyLetters.match(/[aeiouy]/g) || []).length
  const ratio = vowelCount / onlyLetters.length

  const minByLength = onlyLetters.length <= 7 ? 0.18 : onlyLetters.length <= 10 ? 0.2 : 0.24
  const minRatio = style === "brandable_blends" ? Math.max(0.16, minByLength - 0.03) : minByLength

  return ratio >= minRatio && ratio <= 0.75
}

function isPronounceable(name: string, style: AutoFindControls["style"]): boolean {
  if (!hasReasonableVowelRatio(name, style)) return false
  if (hasAwkwardConsonantCluster(name)) return false

  const syllableLikeChunks = (name.match(/[aeiouy]+/g) || []).length
  if (style === "brandable_blends") {
    return syllableLikeChunks >= 1 && syllableLikeChunks <= 5
  }

  return syllableLikeChunks >= 1 && syllableLikeChunks <= 4
}

export function sanitiseCandidate(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "")
}

function normaliseKeywordRoot(root: string): string {
  return sanitiseCandidate(root)
}

export function hasBannedSuffix(name: string): boolean {
  const cleanName = sanitiseCandidate(name)
  return BANNED_AI_SMELL_SUFFIXES.some((suffix) => cleanName.endsWith(suffix))
}

/**
 * Reject names derived from any input keyword — full match, substring, or truncated prefix.
 *
 * Given roots ["horizon", "pulse"], rejects:
 *   "horizora"  — contains "horizon" (full)
 *   "horizium"  — contains "horiz" (truncated prefix, 5 chars)
 *   "pulser"    — contains "pulse" (full)
 *   "pulsify"   — contains "puls" (truncated prefix, 4 chars)
 *
 * Short roots (≤3 chars) require exact containment to avoid false positives.
 */
export function containsKeywordRoot(name: string, roots: string[]): boolean {
  const cleanName = sanitiseCandidate(name)
  const safeRoots = roots.map(normaliseKeywordRoot).filter((root) => root.length >= 2)

  for (const root of safeRoots) {
    // Full substring match
    if (root.length >= 3 && cleanName.includes(root)) return true

    // Short roots (2-3 chars): only match if the name IS the root or starts/ends with it
    if (root.length <= 3) {
      if (cleanName === root || cleanName.startsWith(root) || cleanName.endsWith(root)) return true
      continue
    }

    // Truncated prefix match — catch "horiz" from "horizon", "puls" from "pulse"
    // Use prefixes from 4 chars up to root.length - 1
    const minPrefix = Math.min(4, root.length - 1)
    for (let len = root.length - 1; len >= minPrefix; len--) {
      const prefix = root.slice(0, len)
      if (cleanName.includes(prefix)) return true
    }
  }

  return false
}

export function hasAiSmellPattern(name: string): boolean {
  const cleanName = sanitiseCandidate(name)
  return hasBannedSuffix(cleanName) || AI_SMELL_PREFIX_RE.test(cleanName)
}

export function evaluateCandidateFilters(
  rawCandidate: string,
  options: {
    maxLength: number
    controls: AutoFindControls
    blocklist: string[]
    allowlist: string[]
    keywordRoots?: string[]
  },
): FilterDecision {
  const name = sanitiseCandidate(rawCandidate)
  const reasons: string[] = []

  if (!name || name.length < 3) reasons.push("too_short")
  if (name.length > options.maxLength) reasons.push("too_long")

  if (!options.controls.allowHyphen && name.includes("-")) reasons.push("contains_hyphen")
  if (!options.controls.allowNumbers && /\d/.test(name)) reasons.push("contains_number")

  if (HARD_BANNED_CLUSTERS.some((cluster) => name.includes(cluster))) reasons.push("awkward_cluster")
  if (hasVisualAmbiguity(name)) reasons.push("visual_ambiguity")
  if (hasExcessiveRepeatedLetters(name)) reasons.push("repeated_letters")
  if (!isPronounceable(name, options.controls.style)) reasons.push("low_pronounceability")
  if (TRADEMARK_LIKE_FRAGMENTS.some((fragment) => name.includes(fragment))) reasons.push("trademark_like_fragment")
  if (containsKeywordRoot(name, options.keywordRoots || [])) reasons.push("keyword_mutation")

  // Reject AI-generated naming patterns (fake-Latin suffixes, meaningless tech prefixes)
  if (hasBannedSuffix(name)) reasons.push("ai_smell_suffix")
  if (AI_SMELL_PREFIX_RE.test(name)) reasons.push("ai_smell_prefix")

  for (const blocked of options.blocklist) {
    if (blocked && name.includes(blocked)) {
      reasons.push(`blocked_term:${blocked}`)
      break
    }
  }

  if (options.allowlist.length > 0) {
    const hasAllowlistedRoot = options.allowlist.some((allowed) => allowed && name.includes(allowed))
    if (!hasAllowlistedRoot) {
      reasons.push("missing_allowlist_root")
    }
  }

  return {
    accepted: reasons.length === 0,
    reasons,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Taste Gate — reject names that are technically valid but feel undesirable
// This is about perceived quality, not correctness.
// ─────────────────────────────────────────────────────────────────────────────

// Endings that produce names no founder would choose — they sound like
// filler syllables, not brand closers
// Endings that feel like filler syllables — no founder picks these
// Note: "oom" excluded (bloom, zoom are valid); "oot" excluded (hoot, soot valid short)
const WEAK_ENDINGS = /(?:oft|ope|ofe|uft|aje|oje|uje|ooj|aaj|oob|uub|oog|aag|olt|upe)$/

// Awkward vowel pairings that don't occur in natural English — "uo", "eo",
// "ao" in the middle of a word make it feel randomly assembled
const AWKWARD_VOWEL_PAIRS = /(?:uo|eo|ao|iu|ou[aeiy]|ei[ao]|ua[eo])(?![a-z]*(?:us|al|an|ar|le|er|on)$)/

// Consonant pairings that feel harsh or unpronounceable at syllable boundaries
const HARSH_JOINS = /(?:fp|bk|gd|td|pb|kg|dk|tg|bf|pk|gb|dt|mk|km|gf|fg|bm|mb(?!l|r|e)|kn(?!ot|ee|ow|it))/

// Real brand patterns — CVCV, CVC, CVCCV, CVCVC structures that feel natural
function hasNaturalStructure(name: string): boolean {
  // Single real word (4-6 chars) — always strong
  if (name.length <= 6 && /^[bcdfghjklmnpqrstvwxyz]?[aeiouy][bcdfghjklmnpqrstvwxyz]+[aeiouy]?[bcdfghjklmnpqrstvwxyz]?$/.test(name)) {
    return true
  }

  // Clean CVCV / CVCVC pattern (Figma, Canva, Vercel)
  if (/^([bcdfghjklmnpqrstvwxyz][aeiouy]){2,3}[bcdfghjklmnpqrstvwxyz]?$/.test(name)) {
    return true
  }

  // Two-part compound where each part has vowels (Dropbox, Mailchimp)
  const mid = Math.floor(name.length / 2)
  const left = name.slice(0, mid)
  const right = name.slice(mid)
  if (/[aeiouy]/.test(left) && /[aeiouy]/.test(right)) {
    return true
  }

  // Ends with a strong natural close
  if (/(?:er|en|le|al|on|in|an|ar|or|el|nd|nt|st|ft|ld|ve|ke|se|te|ne|ge|pe|me|ce|re|ly|ry|ge|de|be)$/.test(name)) {
    return true
  }

  return false
}

// Brand weight — simple 0-100 score for "does this feel like a real brand?"
function brandWeight(name: string): number {
  let weight = 50 // baseline

  // Length: short is premium
  if (name.length <= 5) weight += 20
  else if (name.length <= 7) weight += 10
  else if (name.length >= 10) weight -= 15

  // Syllable count: 2 is ideal, 1 or 3 is fine
  const syllables = (name.match(/[aeiouy]+/g) || []).length
  if (syllables === 2) weight += 15
  else if (syllables === 1 || syllables === 3) weight += 5
  else if (syllables >= 4) weight -= 10

  // Vowel ratio: 0.30-0.55 is the sweet spot
  const vowelCount = (name.match(/[aeiouy]/g) || []).length
  const ratio = vowelCount / name.length
  if (ratio >= 0.30 && ratio <= 0.55) weight += 10
  else if (ratio < 0.22 || ratio > 0.65) weight -= 15

  // Natural structure bonus
  if (hasNaturalStructure(name)) weight += 10

  // Weak ending penalty
  if (WEAK_ENDINGS.test(name)) weight -= 20

  // Awkward vowel pair penalty
  if (AWKWARD_VOWEL_PAIRS.test(name)) weight -= 15

  // Harsh consonant join penalty
  if (HARSH_JOINS.test(name)) weight -= 15

  // Double vowel at boundary (sounds like a stutter): "aoo", "eoo", "ooa"
  if (/[aeiouy]{3,}/.test(name)) weight -= 10

  // Starts with vowel cluster
  if (/^[aeiouy]{2,}/.test(name)) weight -= 5

  return Math.max(0, Math.min(100, weight))
}

const TASTE_GATE_MIN_WEIGHT = 40

/**
 * Taste Gate — the final quality filter.
 * Rejects names that are technically valid but no founder would choose.
 * Returns true if the name passes (is brand-worthy).
 */
export function passesTasteGate(name: string): boolean {
  const clean = sanitiseCandidate(name)
  if (!clean || clean.length < 3) return false

  // Hard reject: weak endings
  if (WEAK_ENDINGS.test(clean)) return false

  // Hard reject: awkward vowel pairings
  if (AWKWARD_VOWEL_PAIRS.test(clean)) return false

  // Hard reject: harsh consonant joins
  if (HARSH_JOINS.test(clean)) return false

  // Hard reject: triple vowels (oom, oor, oot are caught by weak endings,
  // but also catch "aoo", "eoi" etc.)
  if (/[aeiouy]{3,}/.test(clean)) return false

  // Brand weight must clear threshold
  if (brandWeight(clean) < TASTE_GATE_MIN_WEIGHT) return false

  return true
}

/** Exposed for testing / quality engine */
export function getTasteScore(name: string): number {
  return brandWeight(sanitiseCandidate(name))
}

export function topRejectedReasons(reasons: string[], limit = 6): Array<{ reason: string; count: number }> {
  const counts = new Map<string, number>()

  for (const reason of reasons) {
    counts.set(reason, (counts.get(reason) || 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([reason, count]) => ({ reason, count }))
}
