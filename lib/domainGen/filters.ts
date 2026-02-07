import type { AutoFindControls, FilterDecision } from "@/lib/domainGen/types"

const HARD_BANNED_CLUSTERS = ["qzx", "xq", "jjj", "zzz", "vvv", "kkk", "wq"]
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

export function evaluateCandidateFilters(
  rawCandidate: string,
  options: {
    maxLength: number
    controls: AutoFindControls
    blocklist: string[]
    allowlist: string[]
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
