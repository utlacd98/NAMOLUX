import { buildMeaningBreakdown, scorePronounceability, type MorphemeEntry } from "@/lib/domainGen/meaning"
import { VIBE_MODIFIERS, getIndustryLexicon } from "@/lib/domainGen/synonyms"
import type { AutoFindControls, Candidate, ScoredCandidate } from "@/lib/domainGen/types"

const GENERIC_PENALTY_TERMS = ["lux", "pro", "hub", "labs", "group", "works", "co", "app", "get", "try"]
const VISUAL_PENALTY_PATTERNS = [/(.)\1\1/, /[bcdfghjklmnpqrstvwxyz]{5,}/, /(xxx|kkk|qzx|xq)/, /(rnm|mrn)/]

function countMatches(name: string, terms: string[]): number {
  let count = 0

  for (const term of terms) {
    if (term && name.includes(term)) {
      count += 1
    }
  }

  return count
}

function countSyllables(name: string): number {
  const onlyLetters = name.replace(/[^a-z]/g, "")
  if (!onlyLetters) return 0
  return (onlyLetters.match(/[aeiouy]+/g) || []).length
}

function keywordPositionScore(name: string, keywordTokens: string[], position: AutoFindControls["keywordPosition"]): number {
  if (keywordTokens.length === 0 || position === "anywhere") return 0

  const hit = keywordTokens.find((token) => name.includes(token))
  if (!hit) return -2

  if (position === "prefix") {
    return name.startsWith(hit) ? 2 : -2
  }

  if (position === "suffix") {
    return name.endsWith(hit) ? 2 : -2
  }

  return 0
}

function getVibeLetterScore(name: string, vibe: string | undefined): number {
  const key = (vibe || "").toLowerCase()

  if (key === "luxury") {
    const smooth = countMatches(name, ["l", "m", "n", "r", "v", "s"])
    return smooth * 0.35 + (/(a|o|e)$/.test(name) ? 0.8 : 0)
  }

  if (key === "futuristic") {
    const futuristicHits = countMatches(name, ["x", "z", "v", "q", "neo", "nova", "flux", "nex"])
    return futuristicHits * 0.65
  }

  if (key === "playful") {
    const playfulHits = countMatches(name, ["b", "p", "k", "z", "joy", "pop", "spark"])
    return playfulHits * 0.5
  }

  if (key === "trustworthy") {
    const trustHits = countMatches(name, ["clear", "safe", "true", "secure", "solid", "trust", "anchor"])
    const sharpPenalty = /[xzq]{2,}/.test(name) ? -1.1 : 0
    return trustHits * 0.7 + sharpPenalty
  }

  if (key === "minimal") {
    const lengthBonus = name.length <= 8 ? 1.2 : name.length <= 10 ? 0.6 : -0.6
    const clutterPenalty = /[xzq]{2,}|(ify|labs|works)$/.test(name) ? -0.9 : 0
    return lengthBonus + clutterPenalty
  }

  return 0
}

export function satisfiesKeywordConstraint(
  name: string,
  keywordTokens: string[],
  mode: AutoFindControls["mustIncludeKeyword"],
): boolean {
  if (mode === "none" || keywordTokens.length === 0) return true

  if (mode === "exact") {
    return keywordTokens.some((token) => name.includes(token))
  }

  if (mode === "partial") {
    return keywordTokens.some((token) => {
      if (token.length <= 2) return name.includes(token)
      const shortToken = token.slice(0, Math.max(2, token.length - 2))
      return name.includes(shortToken)
    })
  }

  return true
}

export function brandabilityScore(
  name: string,
  options: {
    industry?: string
    vibe?: string
    keywordTokens: string[]
    controls: AutoFindControls
    strategy?: string
    roots?: string[]
    concepts?: MorphemeEntry[]
  },
): {
  score: number
  scoreBreakdown: Record<string, number>
  qualityBand: "high" | "medium" | "low"
  whyTag: string
  meaningScore: number
  meaningBreakdown: string
  whyItWorks: string
  pronounceabilityScore: number
} {
  const lexicon = getIndustryLexicon(options.industry)
  const meaning = buildMeaningBreakdown({
    name,
    roots: options.roots || [],
    concepts: options.concepts || [],
  })

  const industryMatches = countMatches(name, lexicon.roots)
  const offTopicMatches = countMatches(name, lexicon.offTopicRoots)
  const keywordMatches = countMatches(name, options.keywordTokens)
  const genericMatches = countMatches(name, GENERIC_PENALTY_TERMS)
  const vibeTerms = VIBE_MODIFIERS[(options.vibe || "").toLowerCase()] || []
  const vibeMatches = countMatches(name, vibeTerms)
  const syllables = countSyllables(name)

  const targetLength = options.controls.style === "real_words" ? 10 : 9
  const lengthScore = Math.max(0, 14 - Math.abs(targetLength - name.length))
  const pronounceabilityScore = scorePronounceability(name)
  const pronounceability = (pronounceabilityScore - 60) / 12

  const memorabilityBase =
    syllables >= 2 && syllables <= 3 ? 3.2 : syllables === 1 || syllables === 4 ? 1.5 : -1.2
  const memorabilityAdjust = name.length <= 11 ? 1 : -0.8
  const memorabilityScore = memorabilityBase + memorabilityAdjust

  const relevanceScore = industryMatches * 4 + keywordMatches * 3.4 + vibeMatches * 1.9
  const visualPenalty = VISUAL_PENALTY_PATTERNS.some((pattern) => pattern.test(name)) ? -2.1 : 0
  const genericPenalty =
    options.vibe === "luxury" && name.includes("lux")
      ? Math.max(0, genericMatches - 1) * -1.1
      : genericMatches * -1.45
  const offTopicPenalty = offTopicMatches * -4.6

  const positionScore = keywordPositionScore(name, options.keywordTokens, options.controls.keywordPosition)

  let styleScore = 0
  if (options.controls.style === "real_words") {
    styleScore += /[aeiou].*[aeiou]/.test(name) ? 1 : -0.8
    styleScore += /(ing|er|ly|ion|ment)$/.test(name) ? 0.7 : 0
    styleScore += /(base|flow|point|lane|house|path)$/.test(name) ? 0.6 : 0
  } else {
    styleScore += /[aeiou][a-z]{2,}[aeiou]/.test(name) ? 1.1 : 0
    styleScore += /(ly|ify|io|ora|beam|pulse)$/.test(name) ? 0.8 : 0
  }

  const vibeLetterScore = getVibeLetterScore(name, options.vibe)

  const strategyBonus =
    options.strategy === "vibe_compound" || options.strategy === "emotive_modifier" || options.strategy === "mood_pairing"
      ? 0.9
      : options.strategy === "semantic_compound" || options.strategy === "action_noun" || options.strategy === "two_word_compound"
        ? 0.55
        : 0

  const meaningBoost = options.controls.meaningFirst ? meaning.meaningScore / 18 : 0

  const score = Number(
    (
      lengthScore +
      pronounceability +
      memorabilityScore +
      relevanceScore +
      meaningBoost +
      offTopicPenalty +
      genericPenalty +
      visualPenalty +
      positionScore +
      styleScore +
      vibeLetterScore +
      strategyBonus
    ).toFixed(2),
  )

  const qualityBand = score >= 22 ? "high" : score >= 15 ? "medium" : "low"
  const hint = options.keywordTokens.find((token) => name.includes(token)) || "brand root"
  const vibeLabel = options.vibe ? `${options.vibe[0].toUpperCase()}${options.vibe.slice(1)}` : "Balanced"
  const whyTag = `${vibeLabel} vibe | ${Math.max(1, syllables)} syllables | keyword hint: ${hint}`

  return {
    score,
    scoreBreakdown: {
      length: Number(lengthScore.toFixed(2)),
      pronounceability: Number(pronounceability.toFixed(2)),
      memorability: Number(memorabilityScore.toFixed(2)),
      relevance: Number(relevanceScore.toFixed(2)),
      penalties: Number((offTopicPenalty + genericPenalty + visualPenalty).toFixed(2)),
      keywordPosition: Number(positionScore.toFixed(2)),
      style: Number((styleScore + vibeLetterScore).toFixed(2)),
      meaning: meaning.meaningScore,
      syllables,
    },
    qualityBand,
    whyTag,
    meaningScore: meaning.meaningScore,
    meaningBreakdown: meaning.breakdown,
    whyItWorks: meaning.oneLiner,
    pronounceabilityScore,
  }
}

export function scoreCandidate(
  candidate: Candidate,
  options: {
    industry?: string
    vibe?: string
    keywordTokens: string[]
    controls: AutoFindControls
    concepts?: MorphemeEntry[]
  },
): ScoredCandidate {
  const scored = brandabilityScore(candidate.name, {
    industry: options.industry,
    vibe: options.vibe,
    keywordTokens: options.keywordTokens,
    controls: options.controls,
    strategy: candidate.strategy,
    roots: candidate.roots,
    concepts: options.concepts,
  })

  return {
    ...candidate,
    score: scored.score,
    scoreBreakdown: scored.scoreBreakdown,
    whyTag: scored.whyTag,
    qualityBand: scored.qualityBand,
    meaningScore: scored.meaningScore,
    meaningBreakdown: scored.meaningBreakdown,
    whyItWorks: scored.whyItWorks,
    pronounceabilityScore: scored.pronounceabilityScore,
    brandableScore: Number(Math.max(1, Math.min(10, scored.score / 2.6)).toFixed(1)),
  }
}

export function rankCandidates(
  candidates: Candidate[],
  options: {
    industry?: string
    vibe?: string
    keywordTokens: string[]
    controls: AutoFindControls
    concepts?: MorphemeEntry[]
  },
): ScoredCandidate[] {
  return candidates
    .filter((candidate) => satisfiesKeywordConstraint(candidate.name, options.keywordTokens, options.controls.mustIncludeKeyword))
    .map((candidate) => scoreCandidate(candidate, options))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}
