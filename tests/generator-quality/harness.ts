export interface GeneratorQualityCandidate {
  name: string
  narrative: string
  roots?: readonly string[]
}

export interface GeneratorQualityRules {
  minUniqueCandidates: number
  minLength?: number
  maxLength: number
  relevanceTerms?: readonly string[]
  minNarrativeCharacters?: number
  minNarrativeWords?: number
}

export interface GeneratorQualityMetrics {
  candidateCount: number
  uniqueCount: number
  syntaxPassRate: number
  lengthPassRate: number
  fillerPassRate: number
  phoneticPassRate: number
  narrativePassRate: number
  relevancePass: boolean
}

export interface GeneratorQualityReport {
  score: number
  mechanicalScore: number
  issues: string[]
  metrics: GeneratorQualityMetrics
}

export interface GeneratorMechanicalQualityReport {
  score: number
  issues: string[]
}

const CREATIVE_RELEVANCE_SCORE_WEIGHT = 5
const CREATIVE_RELEVANCE_ISSUE_PREFIX = "no candidate carries a deterministic niche signal"

/**
 * Returns only the objective part of a batch report. Visible keyword/root
 * matching is useful diagnostic evidence, but it cannot prove or disprove the
 * relevance of an abstract metaphor and therefore belongs in blind review.
 * Keeping this split beside the scoring rule prevents audit callers from
 * duplicating its wording or weight.
 */
export function getGeneratorMechanicalQuality(
  report: GeneratorQualityReport,
): GeneratorMechanicalQualityReport {
  return {
    score: report.mechanicalScore,
    issues: report.issues.filter((issue) => !issue.startsWith(CREATIVE_RELEVANCE_ISSUE_PREFIX)),
  }
}

const EXACT_FILLER_NAMES = new Set([
  "brand",
  "brandname",
  "business",
  "company",
  "companyname",
  "domain",
  "example",
  "free",
  "lorem",
  "name",
  "official",
  "online",
  "placeholder",
  "platform",
  "product",
  "service",
  "services",
  "solution",
  "solutions",
  "startup",
  "test",
  "testname",
  "undefined",
])

const BANNED_FRAGMENTS = [
  "chatgpt",
  "openai",
  "gpt",
  "loremipsum",
  "companyname",
  "brandname",
  "testname",
  "hppy",
  "jlly",
  "pgo",
  "lxe",
  "prme",
  "frge",
  "pwer",
  "blst",
  "strke",
  "sbscri",
  "mngle",
  "nighbor",
  "psswor",
  "snscree",
  "cybreat",
] as const

const KNOWN_BROKEN_GENERATOR_NAMES = new Set([
  "childinic",
  "clinrapy",
  "sensosors",
  "funereral",
  "asdfasdf",
  "sexulness",
  "isolalate",
  "homeate",
  "rentate",
  "tenantate",
  "frameate",
  "careow",
  "tableunch",
  "biteunch",
  "joinolt",
  "bondolt",
  "purrfectly",
  "privatemate",
  "thriftyoung",
  "purrfeline",
  "catfeline",
  "mothermama",
  "childparent",
  "parentcarer",
  "givegiving",
  "housemeal",
  "tablemeal",
  "tablecampus",
  "texturehair",
  "skipcouple",
  "skipgift",
  "skipcraft",
  "cartethical",
  "shelfethical",
  "craftcampus",
  "flintstone",
  "wiseacre",
  "archarc",
  "chillcold",
  "pressforge",
  "greenworks",
  "threatgrid",
])

// A few legitimate compound joins naturally form repeated bigrams (for
// example data + threat => "datathreat"). They are not phonetic stutters.
const ALLOWED_REPEATED_BIGRAMS = new Set(["at", "ba", "bo", "co", "ha", "ma", "na", "yo"])

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function hasProfessionalSyntax(name: string): boolean {
  return /^[a-z][a-z0-9]*$/.test(name) && /[aeiouy]/.test(name) && !/(.)\1{3,}/.test(name)
}

function hasObviousFiller(name: string): boolean {
  const clean = normalise(name)
  if (EXACT_FILLER_NAMES.has(clean)) return true
  return BANNED_FRAGMENTS.some((fragment) => clean.includes(fragment))
}

/** Independent from the production filters so both cannot regress together. */
function hasBrokenPhoneticShape(name: string): boolean {
  const clean = normalise(name)
  if (KNOWN_BROKEN_GENERATOR_NAMES.has(clean)) return true
  if (/(?:asdf|qwer|zxcv|hjkl)/.test(clean)) return true
  if (/(?:sexu|porn|fuck|shit|boner)/.test(clean)) return true
  if (/(childinic|clinrapy)/.test(clean)) return true
  if (/^(?:home|rent|tenant|frame)ate$/.test(clean)) return true
  if (/^(?:table|bite)unch$|^(?:join|bond)olt$|^careow$/.test(clean)) return true
  if (/([a-z]{3,5})\1/.test(clean)) return true

  for (let index = 0; index <= clean.length - 4; index += 1) {
    const pair = clean.slice(index, index + 2)
    if (ALLOWED_REPEATED_BIGRAMS.has(pair)) continue
    if (clean.slice(index + 2, index + 4) === pair) return true
  }

  return false
}

function isSubstantiveNarrative(value: string, minCharacters: number, minWords: number): boolean {
  const clean = value.replace(/\s+/g, " ").trim()
  if (clean.length < minCharacters) return false
  return clean.split(" ").filter(Boolean).length >= minWords
}

function hasRelevantSignal(candidates: readonly GeneratorQualityCandidate[], relevanceTerms: readonly string[]): boolean {
  const terms = relevanceTerms.map(normalise).filter((term) => term.length >= 2)
  if (terms.length === 0) return true

  return candidates.some((candidate) => {
    // Narrative is deliberately excluded. Repeating the user's brief in a
    // rationale is not evidence that the generated name itself is relevant.
    const surface = [candidate.name, ...(candidate.roots || [])].map(normalise).join(" ")
    return terms.some((term) => surface.includes(term))
  })
}

function ratio(passing: number, total: number): number {
  return total === 0 ? 0 : passing / total
}

function percentage(value: number): number {
  return Number((value * 100).toFixed(1))
}

/** Mirrors the public routes' minimum brief requirement without generating. */
export function isUsableGeneratorPrompt(value: unknown): boolean {
  return typeof value === "string" && value.trim().length >= 2
}

/**
 * Scores a generated batch independently from the implementation's own score.
 * A perfect batch earns 100; every issue is also returned in human-readable
 * form. Deterministic niche-signal matching remains a diagnostic creative
 * proxy and must be separated with getGeneratorMechanicalQuality before an
 * automated release gate treats the remaining issues as objective failures.
 */
export function evaluateGeneratorBatch(
  candidates: readonly GeneratorQualityCandidate[],
  rules: GeneratorQualityRules,
): GeneratorQualityReport {
  const minNarrativeCharacters = rules.minNarrativeCharacters ?? 45
  const minNarrativeWords = rules.minNarrativeWords ?? 8
  const minLength = rules.minLength ?? 4
  const names = candidates.map((candidate) => normalise(candidate.name))
  const uniqueCount = new Set(names).size

  const syntaxPassing = candidates.filter((candidate) => hasProfessionalSyntax(candidate.name)).length
  const lengthPassing = candidates.filter((candidate) => {
    const length = normalise(candidate.name).length
    return length >= minLength && length <= rules.maxLength
  }).length
  const fillerPassing = candidates.filter((candidate) => !hasObviousFiller(candidate.name)).length
  const phoneticPassing = candidates.filter((candidate) => !hasBrokenPhoneticShape(candidate.name)).length
  const narrativePassing = candidates.filter((candidate) =>
    isSubstantiveNarrative(candidate.narrative, minNarrativeCharacters, minNarrativeWords),
  ).length
  const relevancePass = hasRelevantSignal(candidates, rules.relevanceTerms || [])

  const syntaxRate = ratio(syntaxPassing, candidates.length)
  const lengthRate = ratio(lengthPassing, candidates.length)
  const fillerRate = ratio(fillerPassing, candidates.length)
  const phoneticRate = ratio(phoneticPassing, candidates.length)
  const narrativeRate = ratio(narrativePassing, candidates.length)
  const countRate = Math.min(1, uniqueCount / rules.minUniqueCandidates)
  const uniquenessRate = ratio(uniqueCount, candidates.length)

  const mechanicalSubtotal =
    countRate * 20 +
      uniquenessRate * 10 +
      syntaxRate * 15 +
      lengthRate * 15 +
      fillerRate * 10 +
      phoneticRate * 15 +
      narrativeRate * 10
  const mechanicalScore = Math.round(
    (mechanicalSubtotal / (100 - CREATIVE_RELEVANCE_SCORE_WEIGHT)) * 100,
  )
  const score = Math.round(
    mechanicalSubtotal + (relevancePass ? CREATIVE_RELEVANCE_SCORE_WEIGHT : 0),
  )

  const issues: string[] = []
  if (uniqueCount < rules.minUniqueCandidates) {
    issues.push(`only ${uniqueCount} unique candidates; expected at least ${rules.minUniqueCandidates}`)
  }
  if (uniqueCount !== candidates.length) {
    issues.push(`${candidates.length - uniqueCount} duplicate candidate(s)`)
  }
  if (syntaxPassing !== candidates.length) {
    issues.push(`${candidates.length - syntaxPassing} candidate(s) have invalid brand/domain syntax`)
  }
  if (lengthPassing !== candidates.length) {
    issues.push(`${candidates.length - lengthPassing} candidate(s) fall outside ${minLength}-${rules.maxLength} characters`)
  }
  if (fillerPassing !== candidates.length) {
    const offenders = candidates.filter((candidate) => hasObviousFiller(candidate.name)).map((candidate) => candidate.name)
    issues.push(`obvious filler or banned fragments: ${offenders.join(", ")}`)
  }
  if (phoneticPassing !== candidates.length) {
    const offenders = candidates.filter((candidate) => hasBrokenPhoneticShape(candidate.name)).map((candidate) => candidate.name)
    issues.push(`broken phonetic, repeated-fragment, unsafe, or keyboard-pattern names: ${offenders.join(", ")}`)
  }
  if (narrativePassing !== candidates.length) {
    issues.push(`${candidates.length - narrativePassing} candidate(s) have shallow explanation/personality copy`)
  }
  if (!relevancePass) {
    issues.push(`no candidate carries a deterministic niche signal from: ${(rules.relevanceTerms || []).join(", ")}`)
  }

  return {
    score,
    mechanicalScore,
    issues,
    metrics: {
      candidateCount: candidates.length,
      uniqueCount,
      syntaxPassRate: percentage(syntaxRate),
      lengthPassRate: percentage(lengthRate),
      fillerPassRate: percentage(fillerRate),
      phoneticPassRate: percentage(phoneticRate),
      narrativePassRate: percentage(narrativeRate),
      relevancePass,
    },
  }
}
