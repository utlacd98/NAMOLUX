/**
 * Brand Instinct Layer — context-agnostic scoring adjustment.
 *
 * Applied AFTER the base Founder Signal score + vibe modifier.
 * Works for any keyword / any user input.
 *
 * Goal: reduce dominance of "safe" names that appear across many generations
 * and reward genuinely distinctive brand candidates.
 *
 * Net adjustment range: roughly -8 to +5 (soft shaping, not hard filtering).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Common English dictionary words (single-word names that feel generic)
// These are real words that founders recognise immediately — safe but
// undifferentiated as brands.
// ─────────────────────────────────────────────────────────────────────────────
const COMMON_DICTIONARY_WORDS = new Set([
  "cloud", "data", "code", "stack", "swift", "smart", "pixel", "logic",
  "trust", "vault", "wealth", "pure", "glow", "dream", "shift", "flow",
  "spark", "pulse", "wave", "peak", "ridge", "haven", "forge", "slate",
  "frame", "core", "base", "root", "seed", "stem", "bond", "link",
  "mesh", "loop", "arc", "span", "tide", "helm", "arch", "blade",
  "prism", "gleam", "craft", "lumen", "orbit", "ember", "cedar", "birch",
  "cliff", "bloom", "grove", "grain", "drift", "dune", "moss", "sage",
  "field", "shore", "vale", "glen", "fern", "raven", "wren", "quill",
  "nest", "hearth", "echo", "mend", "knot", "weave", "flint", "stone",
  "scope", "lever", "loft", "cast", "mint", "hinge", "pivot", "wedge",
  "light", "bright", "sound", "trade", "build", "point", "land", "home",
  "true", "clear", "bold", "calm", "keen", "fair", "warm", "rise",
  "mark", "sign", "bind", "hold", "lead", "turn", "step", "hand",
  "path", "lane", "beam", "wind", "stride", "crest", "soren", "node",
])

// ─────────────────────────────────────────────────────────────────────────────
// Common startup-generator morphemes that appear across many generations
// (the "safe" fallback names that tools overuse)
// ─────────────────────────────────────────────────────────────────────────────
const OVERUSED_STARTUP_NAMES = new Set([
  "nova", "nexus", "flux", "zen", "vista", "vantage", "aurora", "hive",
  "pulse", "spark", "atlas", "prism", "lumen", "vanta", "kairo", "solen",
  "velora", "nyxos", "stellium", "orbita", "lumena", "aerix", "arcen",
  "verix", "mira", "lucen", "aven", "cinder", "zephyr", "aurum",
])

// ─────────────────────────────────────────────────────────────────────────────
// Common word patterns that feel undifferentiated ("could be anything" names)
// ─────────────────────────────────────────────────────────────────────────────
const GENERIC_ENDINGS = /(?:ly|fy|io|app|hub|lab|base|pro|max|plus)$/
const GENERIC_STARTERS = /^(?:my|go|try|use|get|the|our)/

// ─────────────────────────────────────────────────────────────────────────────
// Distinctiveness signals — suggests a genuinely novel, brandable construction
// ─────────────────────────────────────────────────────────────────────────────
const STRONG_CONSONANT_COMBOS = /(?:str|spr|scr|thr|chr|ghl|ghr|phr|ndr|ntr)/
const UNCOMMON_STARTERS = /^(?:zy|zh|qu|xa|kw|ky|ph|ch|gh|sh)/
const BALANCED_CVCV = /^[bcdfghjklmnpqrstvwxyz][aeiouy][bcdfghjklmnpqrstvwxyz][aeiouy][bcdfghjklmnpqrstvwxyz]?$/

export interface BrandInstinctResult {
  adjustment: number
  reasons: string[]
}

/**
 * Compute a score adjustment based on brand originality and distinctiveness.
 * This runs independently of keywords, vibes, or industries.
 */
export function computeBrandInstinct(name: string): BrandInstinctResult {
  const clean = name.toLowerCase().replace(/[^a-z]/g, "")
  const reasons: string[] = []
  let adjustment = 0

  if (!clean || clean.length < 3) {
    return { adjustment: 0, reasons: [] }
  }

  // ── Penalty 1: Common dictionary word (-3) ──
  // Real English word used across many startups
  if (COMMON_DICTIONARY_WORDS.has(clean)) {
    adjustment -= 3
    reasons.push("Common word — reduces distinctiveness")
  }

  // ── Penalty 2: Overused startup-generator morpheme (-5) ──
  // These appear across many AI-generated batches
  if (OVERUSED_STARTUP_NAMES.has(clean)) {
    adjustment -= 5
    reasons.push("Overused generator morpheme")
  }

  // ── Penalty 3: Generic startup-flavour ending (-2) ──
  // -ly, -fy, -io etc. are acceptable but not distinctive on their own
  if (GENERIC_ENDINGS.test(clean) && clean.length <= 6) {
    adjustment -= 2
    reasons.push("Generic startup ending")
  }

  // ── Penalty 4: Generic starter pattern (-4) ──
  // "my-", "try-", "get-", "go-" signal a template rather than a brand
  if (GENERIC_STARTERS.test(clean)) {
    adjustment -= 4
    reasons.push("Generic starter pattern")
  }

  // ── Penalty 5: "Could be anything" — very short real words (-2) ──
  // Single-word names under 5 chars that are dictionary terms lack identity
  if (clean.length <= 4 && COMMON_DICTIONARY_WORDS.has(clean)) {
    adjustment -= 2
    reasons.push("Too broad — lacks identity")
  }

  // ── Boost 1: Non-dictionary, unique phonetic structure (+3) ──
  const isDictionary = COMMON_DICTIONARY_WORDS.has(clean) || OVERUSED_STARTUP_NAMES.has(clean)
  const hasStrongPhonetics = STRONG_CONSONANT_COMBOS.test(clean) || UNCOMMON_STARTERS.test(clean)
  if (!isDictionary && hasStrongPhonetics) {
    adjustment += 3
    reasons.push("Distinctive phonetic structure")
  }

  // ── Boost 2: Novel CVCV pattern, not in common pools (+2) ──
  if (!isDictionary && BALANCED_CVCV.test(clean) && clean.length >= 5) {
    adjustment += 2
    reasons.push("Clean novel CVCV pattern")
  }

  // ── Boost 3: Uncommon letter combinations without being weird (+2) ──
  // Rewards names that feel fresh — contain uncommon letter pairings
  // (like 'xy', 'zr', 'vr', 'mr') but remain pronounceable
  const uncommonPairs = (clean.match(/(?:xy|zr|vr|mr|kv|qu|ky|jz)/g) || []).length
  if (uncommonPairs >= 1 && !isDictionary && clean.length <= 9) {
    adjustment += 2
    reasons.push("Fresh letter combination")
  }

  // ── Cap the adjustment ──
  // Keep this a soft shaper, not a hard filter
  adjustment = Math.max(-8, Math.min(5, adjustment))

  return { adjustment, reasons }
}
