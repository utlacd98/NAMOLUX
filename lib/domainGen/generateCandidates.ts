import {
  expandRelatedTerms,
  getIndustryLexicon,
  getWeightedModifiers,
  isStyleBlend,
  parseKeywordTokens,
} from "@/lib/domainGen/synonyms"
import type { AutoFindRequestInput, Candidate, NameStyleMode } from "@/lib/domainGen/types"

interface GenerateCandidateOptions {
  poolSize?: number
  relaxedMaxLength?: number
  relaxedKeywordPosition?: "prefix" | "suffix" | "anywhere"
  relaxedKeywordMode?: "exact" | "partial" | "none"
  relaxedStyle?: NameStyleMode
  relaxedTwoWordMode?: boolean
  relaxedAllowVibeSuffix?: boolean
  conceptFragments?: string[]
  meaningFirst?: boolean
  allowGenericAffix?: boolean
  seedSalt?: string
}

const FLAIR_MORPHEMES = [
  "mint",
  "nova",
  "lumen",
  "pulse",
  "atlas",
  "forge",
  "craft",
  "halo",
  "zen",
  "spark",
  "vault",
  "nexus",
  "drift",
  "prism",
  "ember",
  "aurora",
  "quill",
  "pixel",
  "snap",
  "hive",
  "flux",
  "stride",
  "anchor",
  "echo",
  "crest",
  "field",
  "orbit",
  "core",
  "frame",
  "blend",
]

const TASTEFUL_SUFFIXES = ["hq", "lab", "app", "get", "try", "join"]

function toAsciiWord(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function hashToSeed(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return hash >>> 0
}

function createRng(seedValue: string): () => number {
  let state = hashToSeed(seedValue) || 123456789
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickOne<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function pickWeighted<T>(items: Array<{ value: T; weight: number }>, rng: () => number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let cursor = rng() * total

  for (const item of items) {
    cursor -= item.weight
    if (cursor <= 0) {
      return item.value
    }
  }

  return items[items.length - 1].value
}

function isConsonant(char: string): boolean {
  return /^[bcdfghjklmnpqrstvwxyz]$/i.test(char)
}

function mergeReadableParts(first: string, second: string): string {
  if (!first) return second
  if (!second) return first

  const left = first.toLowerCase()
  const right = second.toLowerCase()

  const leftTail = left[left.length - 1]
  const rightHead = right[0]
  const dedupedRight = leftTail === rightHead ? right.slice(1) : right

  if (!dedupedRight) return left

  const tail = left[left.length - 1]
  const head = dedupedRight[0]
  if (isConsonant(tail) && isConsonant(head)) {
    return `${left}a${dedupedRight}`
  }

  return `${left}${dedupedRight}`
}

function blendWords(first: string, second: string): string {
  const left = first.slice(0, Math.max(2, Math.ceil(first.length * 0.58)))
  const right = second.slice(Math.max(0, Math.floor(second.length * 0.42)))
  return mergeReadableParts(left, right)
}

function createWordplayBlend(first: string, second: string): string {
  if (!first) return second
  if (!second) return first

  const left = first.length <= 4 ? first : first.slice(0, Math.max(3, first.length - 1))
  const right = second.length <= 4 ? second : second.slice(1)
  const joint = mergeReadableParts(left, right)

  if (joint.length >= 5 && !/[aeiouy]/.test(joint.slice(-2))) {
    return `${joint}o`
  }

  return joint
}

function createRealWordTwist(base: string): string {
  const clean = toAsciiWord(base)
  if (clean.length <= 3) return clean
  if (clean.endsWith("t")) return `${clean}ry`
  if (clean.endsWith("s")) return `${clean}io`
  if (clean.endsWith("n")) return `${clean}ly`
  return `${clean}ry`
}

function lightlySwapVowel(word: string): string {
  const vowels = ["a", "e", "i", "o", "u"]
  const chars = word.split("")

  for (let i = 1; i < chars.length - 1; i += 1) {
    if (vowels.includes(chars[i])) {
      const alt = vowels.find((v) => v !== chars[i]) || chars[i]
      chars[i] = alt
      return chars.join("")
    }
  }

  return word
}

function omitOneLetter(word: string): string {
  if (word.length <= 4) return word
  const cut = Math.floor(word.length / 2) + (word.length > 7 ? -1 : 0)
  return `${word.slice(0, cut)}${word.slice(cut + 1)}`
}

function normaliseCandidateName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function hasUglyCollision(name: string): boolean {
  return /(xxx|kkk|qzx|xq|aaae|iiia|ooo|vvv)/.test(name) || /(rnm|mrn)/.test(name)
}

function compactToLength(name: string, targetLength: number): string {
  if (name.length <= targetLength) return name

  let compacted = name
    .replace(/(collective|partners|platform|network|service|studio|systems|factory)$/g, "")
    .replace(/([a-z])\1{2,}/g, "$1")

  while (compacted.length > targetLength && compacted.length > 4) {
    const reduced = compacted.replace(/([bcdfghjklmnpqrstvwxyz])[aeiou]([bcdfghjklmnpqrstvwxyz])/i, "$1$2")
    if (reduced === compacted) break
    compacted = reduced
  }

  if (compacted.length > targetLength) {
    compacted = compacted.slice(0, targetLength)
  }

  return compacted
}

function buildCandidate(name: string, strategy: string, roots: string[], keywordTokens: string[]): Candidate {
  const cleanName = normaliseCandidateName(name)
  return {
    name: cleanName,
    strategy,
    roots,
    keywordHits: keywordTokens.filter((token) => cleanName.includes(token)),
  }
}

function keywordInPosition(
  base: string,
  keyword: string,
  position: "prefix" | "suffix" | "anywhere",
  rng: () => number,
): string {
  if (!keyword) return base
  if (position === "prefix") return mergeReadableParts(keyword, base)
  if (position === "suffix") return mergeReadableParts(base, keyword)
  return rng() > 0.5 ? mergeReadableParts(keyword, base) : mergeReadableParts(base, keyword)
}

function getStyleSuffixes(style: NameStyleMode): string[] {
  if (style === "real_words") {
    return ["lane", "path", "base", "point", "guide", "flow", "nest", "house", "loop"]
  }

  return ["ly", "io", "ora", "ify", "forge", "beam", "pulse", "sy", "zen"]
}

function getVibeFlavor(vibe: string | undefined): {
  modifiers: string[]
  prefixes: string[]
  suffixes: string[]
  nouns: string[]
} {
  const key = (vibe || "").toLowerCase()

  if (key === "luxury") {
    return {
      modifiers: ["velvet", "regal", "golden", "signature", "premier", "elegant", "silk", "opal"],
      prefixes: ["elite", "prime", "aur", "luxe", "vero"],
      suffixes: ["aura", "atelier", "crown", "select", "house"],
      nouns: ["crown", "crest", "amber", "aura", "halo"],
    }
  }

  if (key === "futuristic") {
    return {
      modifiers: ["neon", "future", "quant", "next", "orbit", "nova", "vanta", "cyber"],
      prefixes: ["neo", "quant", "astro", "syn", "ax"],
      suffixes: ["nova", "pulse", "nexus", "flux", "grid"],
      nouns: ["orbit", "vector", "signal", "spark", "prism"],
    }
  }

  if (key === "playful") {
    return {
      modifiers: ["sunny", "zippy", "happy", "spark", "jolly", "bouncy", "merry", "poppy"],
      prefixes: ["hey", "pop", "joy", "fun", "zest"],
      suffixes: ["spark", "pop", "party", "smile", "jam"],
      nouns: ["bounce", "giggle", "spark", "joy", "blip"],
    }
  }

  if (key === "trustworthy") {
    return {
      modifiers: ["steady", "secure", "honest", "clear", "proven", "solid", "stable", "true"],
      prefixes: ["true", "sure", "safe", "clear", "firm"],
      suffixes: ["trust", "shield", "anchor", "guard", "bridge"],
      nouns: ["anchor", "bridge", "shield", "signal", "harbour"],
    }
  }

  return {
    modifiers: ["clean", "crisp", "calm", "pure", "quiet", "sleek", "tidy", "plain"],
    prefixes: ["mono", "base", "zen", "plain", "neat"],
    suffixes: ["core", "line", "form", "grid", "frame"],
    nouns: ["line", "form", "shape", "frame", "grid"],
  }
}

function buildStrategyWeights(preferTwoWordBrands: boolean) {
  const twoWordWeight = preferTwoWordBrands ? 2.6 : 1.2
  return [
    { value: "two_word_compound", weight: twoWordWeight },
    { value: "semantic_compound", weight: 1.6 },
    { value: "wordplay_blend", weight: 1.3 },
    { value: "emotive_modifier", weight: 1.35 },
    { value: "action_noun", weight: 1.15 },
    { value: "root_suffix", weight: 1.25 },
    { value: "prefix_root", weight: 1.1 },
    { value: "vibe_compound", weight: 1.8 },
    { value: "portmanteau", weight: preferTwoWordBrands ? 0.8 : 1.5 },
    { value: "soft_connector_blend", weight: 1.2 },
    { value: "real_word_twist", weight: 1.15 },
    { value: "vowel_swap", weight: 0.65 },
    { value: "letter_omission", weight: 0.55 },
    { value: "mood_pairing", weight: 1.1 },
  ] as const
}

export function generateCandidatePool(
  input: AutoFindRequestInput,
  options?: GenerateCandidateOptions,
): {
  candidates: Candidate[]
  keywordTokens: string[]
  relatedTerms: string[]
} {
  const keywordTokens = parseKeywordTokens(input.keyword)
  const lexicon = getIndustryLexicon(input.industry)
  const relatedTerms = expandRelatedTerms(keywordTokens, input.industry)
  const effectiveStyle = options?.relaxedStyle || input.controls.style
  const weightedModifiers = getWeightedModifiers(input.vibe, input.industry)
  const vibeFlavor = getVibeFlavor(input.vibe)
  const styleSuffixes = getStyleSuffixes(effectiveStyle)
  const preferTwoWordBrands = options?.relaxedTwoWordMode ?? input.controls.preferTwoWordBrands
  const allowVibeSuffix = options?.relaxedAllowVibeSuffix ?? input.controls.allowVibeSuffix
  const conceptFragments = (options?.conceptFragments || []).map(toAsciiWord).filter(Boolean)
  const targetLength = Math.max(5, Math.min(options?.relaxedMaxLength || input.maxLength || 10, 24))

  const effectivePosition = options?.relaxedKeywordPosition || input.controls.keywordPosition
  const effectiveKeywordMode = options?.relaxedKeywordMode || input.controls.mustIncludeKeyword
  const poolSize = Math.max(240, Math.min(1800, options?.poolSize || 700))
  const rng = createRng(
    (input.controls.seed || `${input.keyword}:${input.industry || "other"}:${input.vibe || "default"}`) +
      `:${effectiveStyle}:${targetLength}:${options?.seedSalt || "base"}`,
  )

  const tokensForBuild = [...keywordTokens, ...relatedTerms].map(toAsciiWord).filter(Boolean)
  const baseRoots = Array.from(new Set([...conceptFragments, ...tokensForBuild, ...lexicon.roots, ...FLAIR_MORPHEMES])).slice(0, 100)
  const shortRoots = baseRoots.filter((root) => root.length <= Math.max(4, targetLength - 2))
  const rootsForPrimary = shortRoots.length >= 10 ? shortRoots : baseRoots
  const modifiers = Array.from(new Set([...weightedModifiers, ...vibeFlavor.modifiers, ...vibeFlavor.modifiers]))
  const prefixes = Array.from(new Set([...lexicon.prefixes, ...vibeFlavor.prefixes]))
  const suffixes = Array.from(new Set([...lexicon.suffixes, ...vibeFlavor.suffixes, ...styleSuffixes]))
  const emotionalNouns = Array.from(
    new Set([...vibeFlavor.nouns, ...FLAIR_MORPHEMES, ...relatedTerms.slice(0, 12), ...conceptFragments]),
  )
  const strategyWeights = buildStrategyWeights(preferTwoWordBrands)

  const candidates = new Map<string, Candidate>()

  const tryAdd = (candidate: Candidate | null) => {
    if (!candidate || !candidate.name) return
    if (candidate.name.length < 3) return
    if (hasUglyCollision(candidate.name)) return

    if (!candidates.has(candidate.name)) {
      candidates.set(candidate.name, candidate)
    }
  }

  let guard = 0
  while (candidates.size < poolSize && guard < poolSize * 12) {
    guard += 1

    const keywordRoot = keywordTokens.length > 0 ? pickOne(keywordTokens, rng) : ""
    const rootA = pickOne(rootsForPrimary, rng)
    const rootB = pickOne(baseRoots, rng)
    const verb = pickOne(lexicon.verbs, rng)
    const modifier = pickOne(modifiers, rng)
    const prefix = pickOne(prefixes, rng)
    const suffix = pickOne(suffixes, rng)
    const emotionalNoun = pickOne(emotionalNouns, rng)
    const styleIsBlend = isStyleBlend(effectiveStyle)
    const strategy = pickWeighted(strategyWeights as Array<{ value: string; weight: number }>, rng)

    let built = ""
    let roots: string[] = [rootA, rootB]

    if (strategy === "two_word_compound") {
      built = mergeReadableParts(rootA, rootB)
      roots = [rootA, rootB]
    } else if (strategy === "semantic_compound") {
      built = styleIsBlend ? blendWords(rootA, rootB) : mergeReadableParts(rootA, rootB)
      roots = [rootA, rootB]
    } else if (strategy === "wordplay_blend") {
      built = createWordplayBlend(rootA, rootB)
      roots = [rootA, rootB]
    } else if (strategy === "emotive_modifier") {
      built = mergeReadableParts(modifier, rootA)
      roots = [modifier, rootA]
    } else if (strategy === "action_noun") {
      built = mergeReadableParts(verb, rootA)
      roots = [verb, rootA]
    } else if (strategy === "root_suffix") {
      built = styleIsBlend ? blendWords(rootA, suffix) : mergeReadableParts(rootA, suffix)
      roots = [rootA, suffix]
    } else if (strategy === "prefix_root") {
      built = styleIsBlend ? blendWords(prefix, rootA) : mergeReadableParts(prefix, rootA)
      roots = [prefix, rootA]
    } else if (strategy === "vibe_compound") {
      built = mergeReadableParts(emotionalNoun, rootA)
      roots = [emotionalNoun, rootA]
    } else if (strategy === "portmanteau") {
      built = blendWords(rootA, rootB)
      roots = [rootA, rootB]
    } else if (strategy === "soft_connector_blend") {
      const connector = pickOne(["a", "e", "i", "o", "u"], rng)
      built = `${rootA}${connector}${rootB.slice(Math.min(2, Math.max(1, rootB.length - 3)))}`
      roots = [rootA, rootB]
    } else if (strategy === "real_word_twist") {
      built = createRealWordTwist(rootA)
      roots = [rootA]
    } else if (strategy === "vowel_swap") {
      const source = styleIsBlend ? blendWords(rootA, rootB) : mergeReadableParts(rootA, rootB)
      built = lightlySwapVowel(source)
      roots = [rootA, rootB]
    } else if (strategy === "letter_omission") {
      const source = styleIsBlend ? blendWords(rootA, rootB) : mergeReadableParts(verb, rootA)
      built = omitOneLetter(source)
      roots = [verb, rootA, rootB]
    } else {
      built = mergeReadableParts(modifier, emotionalNoun)
      roots = [modifier, emotionalNoun]
    }

    if (!built) continue

    if (allowVibeSuffix && rng() > 0.78) {
      built = mergeReadableParts(built, pickOne(TASTEFUL_SUFFIXES, rng))
    }

    if (keywordRoot && effectiveKeywordMode === "exact") {
      built = keywordInPosition(built, keywordRoot, effectivePosition, rng)
      roots = [keywordRoot, ...roots]
    } else if (keywordRoot && effectiveKeywordMode === "partial" && rng() > 0.35) {
      const partialToken = keywordRoot.length > 4 ? keywordRoot.slice(0, keywordRoot.length - 1) : keywordRoot
      built = keywordInPosition(built, partialToken, effectivePosition, rng)
      roots = [partialToken, ...roots]
    }

    const compacted = compactToLength(normaliseCandidateName(built), targetLength)
    if (compacted.length >= 3) {
      tryAdd(buildCandidate(compacted, strategy, roots, keywordTokens))
    }

    if (options?.allowGenericAffix && candidates.size < poolSize && rng() > 0.82) {
      const genericAffix = pickOne(TASTEFUL_SUFFIXES, rng)
      const relaxed = compactToLength(normaliseCandidateName(mergeReadableParts(rootA, genericAffix)), targetLength)
      if (relaxed.length >= 3) {
        tryAdd(buildCandidate(relaxed, "generic_affix_relaxation", [rootA, genericAffix], keywordTokens))
      }
    }
  }

  return {
    candidates: Array.from(candidates.values()),
    keywordTokens,
    relatedTerms,
  }
}

export function generateDomainCandidates(
  input: AutoFindRequestInput,
  options?: GenerateCandidateOptions,
): {
  candidates: Candidate[]
  keywordTokens: string[]
  relatedTerms: string[]
} {
  return generateCandidatePool(input, options)
}

