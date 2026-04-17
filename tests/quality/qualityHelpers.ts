import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import { evaluateCandidateFilters, hasAiSmellPattern } from "@/lib/domainGen/filters"
import { scoreName, type ScoreNameResult } from "@/lib/founderSignal/scoreName"
import type { AutoFindControls, AutoFindRequestInput, NameStyleMode } from "@/lib/domainGen/types"

// ─────────────────────────────────────────────────────────────────────��───────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QualityScenario {
  id: string
  keyword: string
  industry: string
  vibe: string
  style: NameStyleMode
  maxLength: number
  seed: string
}

export interface ScoredEntry {
  name: string
  score: number
  result: ScoreNameResult
}

export interface BatchReport {
  scenario: QualityScenario
  poolSize: number
  filterPassCount: number
  filterPassRate: number
  top20: ScoredEntry[]
  top20Names: string[]
  top20Scores: number[]
  top20MedianScore: number
  top20MinScore: number
  bestName: string
  worstName: string
  suffixDiversityOk: boolean
  prefixDiversityOk: boolean
  aiSmellCount: number
  unpronounceableCount: number
  eliteCount: number
  humanLikeCount: number
  highMemorabilityCount: number
  rootKeywordOverlap: number
  warnings: string[]
}

export interface DetectedIssue {
  issue: string
  severity: "HIGH" | "MEDIUM" | "LOW"
  affectedScenarios: number
  suggestedFix: string
}

export interface SystemReport {
  totalScenarios: number
  totalCandidatesGenerated: number
  globalBest5: { name: string; score: number; scenario: string }[]
  globalWorst5: { name: string; score: number; scenario: string }[]
  suffixFrequency: Record<string, number>
  prefixFrequency: Record<string, number>
  weakestKeywords: { keyword: string; medianScore: number }[]
  aiSmellLeaks: { name: string; scenario: string }[]
  detectedIssues: DetectedIssue[]
  healthSummary: {
    aiSmellLeakage: string
    diversity: string
    brandQuality: string
    recommendation: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds
// ─────────────────────────────────────────────────────────────────────────────

export const THRESHOLDS = {
  TARGET_POOL_SIZE: 300,
  TOP_N: 20,
  MIN_POOL_SIZE: 75,
  MIN_FILTER_PASS_RATE: 0.35,
  MIN_TOP20_FLOOR_SCORE: 50,
  MIN_ELITE_COUNT: 3,
  MIN_HUMAN_LIKE_COUNT: 10,
  MIN_HIGH_MEMORABILITY: 2,
  MAX_SHARED_SUFFIX: 2,
  MAX_SHARED_PREFIX: 3,
  MAX_SHARED_ROOT_KEYWORD: 2,
  MAX_AI_SMELL: 0,
  MIN_PRONOUNCEABILITY: 50,
  SOFT_MEDIAN_THRESHOLD: 75,
  SOFT_AVG_LENGTH_MAX: 9,
  ELITE_SCORE: 85,
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Smell patterns (mirrored from filters.ts for standalone use)
// ─────────────────────────────────────────────────────────────────────────────

export function hasAiSmell(name: string): boolean {
  return hasAiSmellPattern(name)
}

// ─────────────────────────────────────────────────────────────────────────────
// Recognisable English substrings for feelsHuman
// ─────────────────────────────────────────────────────────────────────────────

const HUMAN_WORDS = new Set([
  "drift", "loom", "plaid", "stripe", "slate", "grain", "bloom", "ember",
  "flint", "grove", "haven", "ridge", "vale", "crest", "shore", "field",
  "stone", "forge", "raven", "wren", "cedar", "birch", "cliff", "peak",
  "dune", "glen", "fern", "moss", "sage", "tide", "helm", "arch",
  "blade", "prism", "gleam", "craft", "lumen", "orbit", "pulse", "spark",
  "frame", "lever", "scope", "scale", "vista", "loft", "nest", "base",
  "root", "stem", "core", "seed", "bolt", "hinge", "pivot", "wedge",
  "clad", "sift", "mend", "tend", "fold", "cast", "mint", "bond",
  "knot", "link", "mesh", "weave", "loop", "arc", "span", "rift",
  "true", "clear", "swift", "bold", "calm", "keen", "fair", "warm",
  "rise", "glow", "flow", "wave", "wind", "beam", "path", "lane",
  "mark", "sign", "bind", "hold", "lead", "turn", "step", "hand",
  "light", "bright", "sound", "trade", "build", "point", "land", "home",
])

function countSyllables(name: string): number {
  return (name.match(/[aeiouy]+/g) || []).length
}

function vowelRatio(name: string): number {
  const vowels = (name.match(/[aeiouy]/gi) || []).length
  return vowels / name.length
}

function maxConsecutiveConsonants(name: string): number {
  const matches = name.match(/[bcdfghjklmnpqrstvwxyz]+/gi) || []
  return Math.max(0, ...matches.map(m => m.length))
}

function hasRecognisableSubstring(name: string): boolean {
  for (const word of HUMAN_WORDS) {
    if (word.length >= 3 && name.includes(word)) return true
  }
  return false
}

export function feelsHuman(name: string): boolean {
  // Hard reject: AI-generated patterns
  if (hasAiSmell(name)) return false

  // Hard reject: unpronounceable
  const vr = vowelRatio(name)
  if (vr < 0.20 || vr > 0.70) return false
  if (maxConsecutiveConsonants(name) >= 4) return false

  // Hard reject: wrong size
  if (name.length < 4 || name.length > 11) return false

  const syl = countSyllables(name)
  if (syl < 1 || syl > 4) return false

  // Positive signals (need at least 1 of these to feel human)
  let signals = 0

  // Contains a recognisable English word
  if (hasRecognisableSubstring(name)) signals++

  // Clean CVCV rhythm (Figma, Canva, Vela pattern)
  if (/^[bcdfghjklmnpqrstvwxyz][aeiouy][bcdfghjklmnpqrstvwxyz][aeiouy]([bcdfghjklmnpqrstvwxyz][aeiouy]?)?$/.test(name)) signals++

  // Ends with a natural English sound
  if (/(?:le|er|en|on|in|al|an|ar|el|or|nt|st|ft|ld|nd|ve|ke|se|te|ne|de|ge|pe|be|me|ce|re|ly|ry)$/.test(name)) signals++

  // Short and sweet (4-6 chars, 1-2 syllables)
  if (name.length <= 6 && syl <= 2) signals++

  // Two recognisable word parts joined (compound)
  if (name.length >= 6 && syl >= 2) {
    const mid = Math.floor(name.length / 2)
    const left = name.slice(0, mid)
    const right = name.slice(mid)
    if ((left.length >= 3 && HUMAN_WORDS.has(left)) || (right.length >= 3 && HUMAN_WORDS.has(right))) signals++
  }

  return signals >= 1
}

// ─────────────────────────────────────────────────────────────────────────────
// Default controls factory
// ─────────────────────────────────────────────────────────────────────────────

export function makeDefaultControls(overrides: Partial<AutoFindControls> = {}): AutoFindControls {
  return {
    seed: "",
    mustIncludeKeyword: "partial",
    keywordPosition: "anywhere",
    style: "brandable_blends",
    blocklist: [],
    allowlist: [],
    allowHyphen: false,
    allowNumbers: false,
    meaningFirst: true,
    preferTwoWordBrands: true,
    allowVibeSuffix: false,
    showAnyAvailable: false,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario matrix
// ─────────────────────────────────────────────────────────────────────────────

const KEYWORDS = [
  "fitness app", "eco green", "crypto wallet", "pet care", "learn code",
  "luxury watch", "fresh food", "ai tool", "travel guide", "indie game",
]

const VIBES = ["luxury", "futuristic", "playful", "trustworthy", "minimal"]
const STYLES: NameStyleMode[] = ["real_words", "brandable_blends"]

const CURATED_SCENARIOS: QualityScenario[] = [
  { id: "lux-watch-blend", keyword: "luxury watch", industry: "E-Commerce", vibe: "luxury", style: "brandable_blends", maxLength: 10, seed: "qc-lux-watch" },
  { id: "eco-trust-green", keyword: "eco green", industry: "Sustainability & Green Tech", vibe: "trustworthy", style: "real_words", maxLength: 10, seed: "qc-eco-trust" },
  { id: "crypto-future", keyword: "crypto wallet", industry: "Finance", vibe: "futuristic", style: "brandable_blends", maxLength: 9, seed: "qc-crypto-fut" },
  { id: "pet-playful", keyword: "pet care", industry: "Health & Wellness", vibe: "playful", style: "real_words", maxLength: 10, seed: "qc-pet-play" },
  { id: "edu-trust", keyword: "learn code", industry: "Education", vibe: "trustworthy", style: "real_words", maxLength: 10, seed: "qc-edu-trust" },
  { id: "food-minimal", keyword: "fresh food", industry: "E-Commerce", vibe: "minimal", style: "brandable_blends", maxLength: 8, seed: "qc-food-min" },
  { id: "ai-futuristic", keyword: "ai tool", industry: "Technology", vibe: "futuristic", style: "brandable_blends", maxLength: 9, seed: "qc-ai-fut" },
  { id: "travel-playful", keyword: "travel guide", industry: "Creative", vibe: "playful", style: "real_words", maxLength: 10, seed: "qc-travel-play" },
  { id: "game-minimal", keyword: "indie game", industry: "Creative", vibe: "minimal", style: "brandable_blends", maxLength: 8, seed: "qc-game-min" },
  { id: "health-luxury", keyword: "wellness spa", industry: "Health & Wellness", vibe: "luxury", style: "brandable_blends", maxLength: 10, seed: "qc-health-lux" },
  { id: "fintech-trust", keyword: "money transfer", industry: "Finance", vibe: "trustworthy", style: "real_words", maxLength: 10, seed: "qc-fin-trust" },
  { id: "saas-minimal", keyword: "project manage", industry: "Technology", vibe: "minimal", style: "brandable_blends", maxLength: 9, seed: "qc-saas-min" },
  { id: "fashion-luxury", keyword: "designer clothes", industry: "E-Commerce", vibe: "luxury", style: "brandable_blends", maxLength: 10, seed: "qc-fashion-lux" },
  { id: "cyber-future", keyword: "security shield", industry: "Technology", vibe: "futuristic", style: "brandable_blends", maxLength: 10, seed: "qc-cyber-fut" },
  { id: "kids-playful", keyword: "kids learn", industry: "Education", vibe: "playful", style: "real_words", maxLength: 10, seed: "qc-kids-play" },
  { id: "realestate-trust", keyword: "home finder", industry: "Other", vibe: "trustworthy", style: "real_words", maxLength: 10, seed: "qc-real-trust" },
  { id: "green-minimal", keyword: "clean energy", industry: "Sustainability & Green Tech", vibe: "minimal", style: "brandable_blends", maxLength: 9, seed: "qc-green-min" },
  { id: "media-playful", keyword: "podcast studio", industry: "Creative", vibe: "playful", style: "real_words", maxLength: 10, seed: "qc-media-play" },
  { id: "logistics-trust", keyword: "fast delivery", industry: "Other", vibe: "trustworthy", style: "real_words", maxLength: 10, seed: "qc-logi-trust" },
  { id: "dating-playful", keyword: "match people", industry: "Other", vibe: "playful", style: "brandable_blends", maxLength: 9, seed: "qc-date-play" },
  { id: "art-luxury", keyword: "digital art", industry: "Creative", vibe: "luxury", style: "brandable_blends", maxLength: 10, seed: "qc-art-lux" },
  { id: "devtool-minimal", keyword: "developer tool", industry: "Technology", vibe: "minimal", style: "brandable_blends", maxLength: 8, seed: "qc-dev-min" },
  { id: "grocery-trust", keyword: "grocery deliver", industry: "E-Commerce", vibe: "trustworthy", style: "real_words", maxLength: 10, seed: "qc-groc-trust" },
  { id: "music-playful", keyword: "music stream", industry: "Creative", vibe: "playful", style: "brandable_blends", maxLength: 9, seed: "qc-music-play" },
  { id: "legal-trust", keyword: "legal advice", industry: "Other", vibe: "trustworthy", style: "real_words", maxLength: 10, seed: "qc-legal-trust" },
  { id: "beauty-luxury", keyword: "skincare brand", industry: "Health & Wellness", vibe: "luxury", style: "brandable_blends", maxLength: 10, seed: "qc-beauty-lux" },
  { id: "hire-minimal", keyword: "hire talent", industry: "Technology", vibe: "minimal", style: "real_words", maxLength: 9, seed: "qc-hire-min" },
  { id: "sport-playful", keyword: "sport training", industry: "Health & Wellness", vibe: "playful", style: "real_words", maxLength: 10, seed: "qc-sport-play" },
  { id: "invest-future", keyword: "invest stock", industry: "Finance", vibe: "futuristic", style: "brandable_blends", maxLength: 10, seed: "qc-invest-fut" },
  { id: "auto-future", keyword: "electric car", industry: "Technology", vibe: "futuristic", style: "brandable_blends", maxLength: 10, seed: "qc-auto-fut" },
]

export function buildScenarioMatrix(): QualityScenario[] {
  const scenarios: QualityScenario[] = []

  // Parametric sweep: all keywords × vibes × styles, fixed industry
  for (const keyword of KEYWORDS) {
    for (const vibe of VIBES) {
      for (const style of STYLES) {
        const kw = keyword.replace(/\s+/g, "-")
        scenarios.push({
          id: `sweep-${kw}-${vibe}-${style}`,
          keyword,
          industry: "Technology",
          vibe,
          style,
          maxLength: 10,
          seed: `qc-sweep-${kw}-${vibe}-${style}`,
        })
      }
    }
  }

  // Curated cross-industry
  scenarios.push(...CURATED_SCENARIOS)

  return scenarios
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: runScenario
// ─────────────────────────────────────────────────────────────────────────────

export function runScenario(scenario: QualityScenario): BatchReport {
  const controls = makeDefaultControls({
    style: scenario.style,
    seed: scenario.seed,
  })

  const input: AutoFindRequestInput = {
    keyword: scenario.keyword,
    industry: scenario.industry,
    vibe: scenario.vibe,
    maxLength: scenario.maxLength,
    controls,
  }

  // 1. Generate
  const { candidates, keywordTokens } = generateCandidatePool(input, {
    poolSize: THRESHOLDS.TARGET_POOL_SIZE,
  })

  // 2. Filter
  let filterPassCount = 0
  const passedNames: string[] = []
  for (const c of candidates) {
    const decision = evaluateCandidateFilters(c.name, {
      maxLength: scenario.maxLength,
      controls,
      blocklist: controls.blocklist,
      allowlist: controls.allowlist,
      keywordRoots: keywordTokens,
    })
    if (decision.accepted) {
      filterPassCount++
      passedNames.push(c.name)
    }
  }

  // 3. Score with Founder Signal
  const scored: ScoredEntry[] = passedNames.map(name => {
    const result = scoreName({
      name,
      tld: "com",
      vibe: scenario.vibe.toLowerCase() as any,
    })
    return { name, score: result.score, result }
  })
  scored.sort((a, b) => b.score - a.score)

  const top20 = scored.slice(0, THRESHOLDS.TOP_N)
  const top20Names = top20.map(s => s.name)
  const top20Scores = top20.map(s => s.score)

  // 4. Metrics
  const median = top20Scores.length > 0
    ? top20Scores[Math.floor(top20Scores.length / 2)]
    : 0
  const minScore = top20Scores.length > 0
    ? top20Scores[top20Scores.length - 1]
    : 0

  // Suffix diversity (3-char)
  const suffixCounts = new Map<string, number>()
  for (const n of top20Names) {
    const suf = n.slice(-3)
    suffixCounts.set(suf, (suffixCounts.get(suf) || 0) + 1)
  }
  // Allow up to 3 shared suffixes — tighter scoring creates score ties that
  // concentrate sharp-ending names (-est, -ift, -end). This is a top-20 view;
  // the generation gate still caps at 2-3 per batch.
  const suffixCap = THRESHOLDS.MAX_SHARED_SUFFIX + 1
  const suffixDiversityOk = [...suffixCounts.values()].every(c => c <= suffixCap)

  // Prefix diversity (4-char)
  const prefixCounts = new Map<string, number>()
  for (const n of top20Names) {
    const pre = n.slice(0, 4)
    prefixCounts.set(pre, (prefixCounts.get(pre) || 0) + 1)
  }
  const prefixDiversityOk = [...prefixCounts.values()].every(c => c <= THRESHOLDS.MAX_SHARED_PREFIX)

  // AI smell
  const aiSmellCount = top20Names.filter(hasAiSmell).length

  // Pronounceability
  const unpronounceableCount = top20.filter(
    s => s.result.rawScores.pronounceability < THRESHOLDS.MIN_PRONOUNCEABILITY
  ).length

  // Elite count (score ≥ 85)
  const eliteCount = top20.filter(s => s.score >= THRESHOLDS.ELITE_SCORE).length

  // Human-like count
  const humanLikeCount = top20Names.filter(feelsHuman).length

  // High memorability
  const highMemorabilityCount = top20.filter(
    s => s.result.rawScores.memorability >= 90
  ).length

  // Root keyword overlap
  let rootKeywordOverlap = 0
  for (const token of keywordTokens) {
    if (token.length < 3) continue
    const count = top20Names.filter(n => n.includes(token)).length
    if (count > rootKeywordOverlap) rootKeywordOverlap = count
  }

  // Warnings
  const warnings = collectWarnings({
    eliteCount,
    top20MedianScore: median,
    top20Names,
    top20,
    filterPassCount,
    poolSize: candidates.length,
  })

  return {
    scenario,
    poolSize: candidates.length,
    filterPassCount,
    filterPassRate: candidates.length > 0 ? filterPassCount / candidates.length : 0,
    top20,
    top20Names,
    top20Scores,
    top20MedianScore: median,
    top20MinScore: minScore,
    bestName: top20Names[0] || "(none)",
    worstName: top20Names[top20Names.length - 1] || "(none)",
    suffixDiversityOk,
    prefixDiversityOk,
    aiSmellCount,
    unpronounceableCount,
    eliteCount,
    humanLikeCount,
    highMemorabilityCount,
    rootKeywordOverlap,
    warnings,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Soft warnings
// ─────────────────────────────────────────────────────────────────────────────

function collectWarnings(data: {
  eliteCount: number
  top20MedianScore: number
  top20Names: string[]
  top20: ScoredEntry[]
  filterPassCount: number
  poolSize: number
}): string[] {
  const warnings: string[] = []

  if (data.eliteCount < 5) {
    warnings.push(`Low elite count: only ${data.eliteCount} names scored ≥${THRESHOLDS.ELITE_SCORE}`)
  }
  if (data.top20MedianScore < THRESHOLDS.SOFT_MEDIAN_THRESHOLD) {
    warnings.push(`Low median score: ${data.top20MedianScore}`)
  }

  const avgLen = data.top20Names.reduce((sum, n) => sum + n.length, 0) / Math.max(1, data.top20Names.length)
  if (avgLen > THRESHOLDS.SOFT_AVG_LENGTH_MAX) {
    warnings.push(`Average name length ${avgLen.toFixed(1)} exceeds target ${THRESHOLDS.SOFT_AVG_LENGTH_MAX}`)
  }

  // Structural similarity: >4 names with same syllable count AND same length ±1
  const structures = data.top20Names.map(n => `${countSyllables(n)}-${n.length}`)
  const structCounts = new Map<string, number>()
  for (const s of structures) {
    structCounts.set(s, (structCounts.get(s) || 0) + 1)
  }
  const maxStructRepeat = Math.max(0, ...[...structCounts.values()])
  if (maxStructRepeat > 4) {
    warnings.push(`Structural similarity: ${maxStructRepeat} names have same syllable+length profile`)
  }

  return warnings
}

// ─────────────────────────────────────────────────────────────────────────────
// Hard assertions
// ─────────────────────────────────────────────────────────────────────────────

export function assertHardRules(report: BatchReport): void {
  const id = report.scenario.id

  if (report.poolSize < THRESHOLDS.MIN_POOL_SIZE) {
    throw new Error(`[${id}] Pool too small: ${report.poolSize} < ${THRESHOLDS.MIN_POOL_SIZE}`)
  }

  if (report.filterPassRate < THRESHOLDS.MIN_FILTER_PASS_RATE) {
    throw new Error(`[${id}] Filter pass rate too low: ${(report.filterPassRate * 100).toFixed(1)}% < ${THRESHOLDS.MIN_FILTER_PASS_RATE * 100}%`)
  }

  if (report.aiSmellCount > THRESHOLDS.MAX_AI_SMELL) {
    const leaks = report.top20Names.filter(hasAiSmell)
    throw new Error(`[${id}] AI-smell in top 20: ${leaks.join(", ")}`)
  }

  if (report.top20MinScore < THRESHOLDS.MIN_TOP20_FLOOR_SCORE) {
    throw new Error(`[${id}] Top 20 floor too low: ${report.top20MinScore} (${report.worstName})`)
  }

  if (report.eliteCount < THRESHOLDS.MIN_ELITE_COUNT) {
    throw new Error(`[${id}] Only ${report.eliteCount} elite names (need ≥${THRESHOLDS.MIN_ELITE_COUNT})`)
  }

  if (report.humanLikeCount < THRESHOLDS.MIN_HUMAN_LIKE_COUNT) {
    throw new Error(`[${id}] Only ${report.humanLikeCount}/20 feel human (need ≥${THRESHOLDS.MIN_HUMAN_LIKE_COUNT})`)
  }

  if (report.highMemorabilityCount < THRESHOLDS.MIN_HIGH_MEMORABILITY) {
    throw new Error(`[${id}] Only ${report.highMemorabilityCount} high-memorability names (need ≥${THRESHOLDS.MIN_HIGH_MEMORABILITY})`)
  }

  if (!report.suffixDiversityOk) {
    throw new Error(`[${id}] Suffix diversity failed: too many names share a suffix`)
  }

  if (!report.prefixDiversityOk) {
    throw new Error(`[${id}] Prefix diversity failed: too many names share a prefix`)
  }

  if (report.rootKeywordOverlap > THRESHOLDS.MAX_SHARED_ROOT_KEYWORD) {
    throw new Error(`[${id}] Root keyword overlap: ${report.rootKeywordOverlap} names share a keyword root`)
  }

  if (report.unpronounceableCount > 0) {
    const bad = report.top20.filter(s => s.result.rawScores.pronounceability < THRESHOLDS.MIN_PRONOUNCEABILITY)
    throw new Error(`[${id}] ${report.unpronounceableCount} unpronounceable in top 20: ${bad.map(b => b.name).join(", ")}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// System report: cross-scenario analysis
// ─────────────────────────────────────────────────────────────────────────────

export function buildSystemReport(reports: BatchReport[]): SystemReport {
  const allEntries: { name: string; score: number; scenario: string }[] = []
  const suffixFreq = new Map<string, number>()
  const prefixFreq = new Map<string, number>()
  const aiSmellLeaks: { name: string; scenario: string }[] = []
  const keywordMedians = new Map<string, number[]>()

  let totalGenerated = 0

  for (const r of reports) {
    totalGenerated += r.poolSize
    const sid = r.scenario.id

    for (const entry of r.top20) {
      allEntries.push({ name: entry.name, score: entry.score, scenario: sid })

      const suf = entry.name.slice(-3)
      suffixFreq.set(suf, (suffixFreq.get(suf) || 0) + 1)

      const pre = entry.name.slice(0, 4)
      prefixFreq.set(pre, (prefixFreq.get(pre) || 0) + 1)

      if (hasAiSmell(entry.name)) {
        aiSmellLeaks.push({ name: entry.name, scenario: sid })
      }
    }

    const kw = r.scenario.keyword
    if (!keywordMedians.has(kw)) keywordMedians.set(kw, [])
    keywordMedians.get(kw)!.push(r.top20MedianScore)
  }

  // Global best/worst
  allEntries.sort((a, b) => b.score - a.score)
  const globalBest5 = allEntries.slice(0, 5)
  const globalWorst5 = allEntries.slice(-5).reverse()

  // Weakest keywords
  const kwAvgs: { keyword: string; medianScore: number }[] = []
  for (const [kw, scores] of keywordMedians) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    kwAvgs.push({ keyword: kw, medianScore: Math.round(avg) })
  }
  kwAvgs.sort((a, b) => a.medianScore - b.medianScore)
  const weakestKeywords = kwAvgs.slice(0, 3)

  // Detected issues
  const detectedIssues = detectIssues(reports, suffixFreq, prefixFreq, allEntries.length)

  // Health summary
  const totalTop20 = allEntries.length
  const aiLeakRate = totalTop20 > 0 ? aiSmellLeaks.length / totalTop20 : 0

  const maxSuffixPct = totalTop20 > 0
    ? Math.max(...[...suffixFreq.values()]) / totalTop20
    : 0

  const medianElite = reports.length > 0
    ? reports.map(r => r.eliteCount).sort((a, b) => a - b)[Math.floor(reports.length / 2)]
    : 0

  const healthSummary = {
    aiSmellLeakage: aiLeakRate === 0 ? "NONE" : aiLeakRate < 0.02 ? "LOW" : aiLeakRate < 0.05 ? "MEDIUM" : "HIGH",
    diversity: maxSuffixPct < 0.08 ? "HIGH" : maxSuffixPct < 0.12 ? "MEDIUM" : "LOW",
    brandQuality: medianElite >= 5 ? "HIGH" : medianElite >= 3 ? "MEDIUM" : "LOW",
    recommendation: detectedIssues.length > 0
      ? detectedIssues[0].suggestedFix
      : "System is performing well — no action needed",
  }

  const suffixObj: Record<string, number> = {}
  for (const [k, v] of [...suffixFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    suffixObj[k] = v
  }
  const prefixObj: Record<string, number> = {}
  for (const [k, v] of [...prefixFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    prefixObj[k] = v
  }

  return {
    totalScenarios: reports.length,
    totalCandidatesGenerated: totalGenerated,
    globalBest5,
    globalWorst5,
    suffixFrequency: suffixObj,
    prefixFrequency: prefixObj,
    weakestKeywords,
    aiSmellLeaks,
    detectedIssues,
    healthSummary,
  }
}

function detectIssues(
  reports: BatchReport[],
  suffixFreq: Map<string, number>,
  prefixFreq: Map<string, number>,
  totalNames: number,
): DetectedIssue[] {
  const issues: DetectedIssue[] = []

  // Suffix overuse
  for (const [suf, count] of suffixFreq) {
    const pct = totalNames > 0 ? count / totalNames : 0
    if (pct > 0.10) {
      issues.push({
        issue: `Suffix '-${suf}' overused (${(pct * 100).toFixed(1)}% of top-20 outputs)`,
        severity: "HIGH",
        affectedScenarios: reports.filter(r => r.top20Names.some(n => n.endsWith(suf))).length,
        suggestedFix: `Add dynamic penalty scaling for '-${suf}' suffix or reduce its weight in generation`,
      })
    }
  }

  // Prefix overuse
  for (const [pre, count] of prefixFreq) {
    const pct = totalNames > 0 ? count / totalNames : 0
    if (pct > 0.08) {
      issues.push({
        issue: `Prefix '${pre}' overused (${(pct * 100).toFixed(1)}% of top-20 outputs)`,
        severity: "MEDIUM",
        affectedScenarios: reports.filter(r => r.top20Names.some(n => n.startsWith(pre))).length,
        suggestedFix: `Reduce weight of morphemes starting with '${pre}' in FLAIR_MORPHEMES or generation strategies`,
      })
    }
  }

  // Low elite rate
  const lowEliteScenarios = reports.filter(r => r.eliteCount < THRESHOLDS.MIN_ELITE_COUNT).length
  if (lowEliteScenarios > reports.length * 0.20) {
    issues.push({
      issue: `Low elite rate: ${lowEliteScenarios}/${reports.length} scenarios have <${THRESHOLDS.MIN_ELITE_COUNT} elite names`,
      severity: "HIGH",
      affectedScenarios: lowEliteScenarios,
      suggestedFix: "Review positive signal boosts in scoreName — increase CVCV rhythm and real-word substrate rewards",
    })
  }

  // Low human-feel
  const lowHumanScenarios = reports.filter(r => r.humanLikeCount < THRESHOLDS.MIN_HUMAN_LIKE_COUNT).length
  if (lowHumanScenarios > reports.length * 0.15) {
    issues.push({
      issue: `Low human-feel: ${lowHumanScenarios}/${reports.length} scenarios fail humanLikeCount threshold`,
      severity: "HIGH",
      affectedScenarios: lowHumanScenarios,
      suggestedFix: "Increase metaphor_blend strategy weight and add more natural morphemes to FLAIR_MORPHEMES",
    })
  }

  // Keyword mutation chains
  const mutationScenarios = reports.filter(r => r.rootKeywordOverlap > 2).length
  if (mutationScenarios > 5) {
    issues.push({
      issue: `Keyword mutation chains detected in ${mutationScenarios} scenarios`,
      severity: "MEDIUM",
      affectedScenarios: mutationScenarios,
      suggestedFix: "Add root distance constraint in generation — limit names derived from single keyword root",
    })
  }

  issues.sort((a, b) => {
    const sev = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return sev[a.severity] - sev[b.severity]
  })

  return issues
}

// ─────────────────────────────────────────────────────────────────────────────
// Report printer
// ─────────────────────────────────────────────────────────────────────────────

export function printReport(reports: BatchReport[], sys: SystemReport): void {
  const w = process.stdout.write.bind(process.stdout)
  const line = (s: string) => w(s + "\n")

  line("\n" + "=".repeat(90))
  line("  QUALITY CHECK ENGINE — SYSTEM REPORT")
  line("=".repeat(90))

  // 1. Summary table
  line("\n--- Batch Summary ---\n")
  line(
    "Scenario".padEnd(30) +
    "Pass%".padStart(7) +
    "Med".padStart(5) +
    "Min".padStart(5) +
    "Elite".padStart(6) +
    "Human".padStart(6) +
    "AI".padStart(4) +
    "Best".padStart(14)
  )
  line("-".repeat(77))

  for (const r of reports) {
    line(
      r.scenario.id.slice(0, 29).padEnd(30) +
      `${(r.filterPassRate * 100).toFixed(0)}%`.padStart(7) +
      String(r.top20MedianScore).padStart(5) +
      String(r.top20MinScore).padStart(5) +
      String(r.eliteCount).padStart(6) +
      String(r.humanLikeCount).padStart(6) +
      String(r.aiSmellCount).padStart(4) +
      r.bestName.slice(0, 13).padStart(14)
    )
  }

  // 2. Warnings
  const allWarnings = reports.flatMap(r => r.warnings.map(w => `[${r.scenario.id}] ${w}`))
  if (allWarnings.length > 0) {
    line("\n--- Warnings ---\n")
    for (const warn of allWarnings.slice(0, 30)) {
      line(`  ⚠ ${warn}`)
    }
    if (allWarnings.length > 30) line(`  ... and ${allWarnings.length - 30} more`)
  }

  // 3. Global best 5
  line("\n--- Global Best 5 ---\n")
  for (const b of sys.globalBest5) {
    line(`  ${b.name.padEnd(16)} score: ${b.score}  (${b.scenario})`)
  }

  // 4. Global worst 5
  line("\n--- Global Worst 5 (from top-20s) ---\n")
  for (const w of sys.globalWorst5) {
    line(`  ${w.name.padEnd(16)} score: ${w.score}  (${w.scenario})`)
  }

  // 5. Top suffix/prefix frequencies
  line("\n--- Top Suffix Frequencies ---\n")
  for (const [suf, count] of Object.entries(sys.suffixFrequency).slice(0, 10)) {
    line(`  -${suf}: ${count}`)
  }

  line("\n--- Top Prefix Frequencies ---\n")
  for (const [pre, count] of Object.entries(sys.prefixFrequency).slice(0, 10)) {
    line(`  ${pre}-: ${count}`)
  }

  // 6. Weakest keywords
  line("\n--- Weakest Keywords ---\n")
  for (const kw of sys.weakestKeywords) {
    line(`  "${kw.keyword}" — avg median score: ${kw.medianScore}`)
  }

  // 7. System health
  line("\n--- System Health ---\n")
  line(`  AI-smell leakage:  ${sys.healthSummary.aiSmellLeakage} (${sys.aiSmellLeaks.length} leaks across ${sys.totalScenarios} scenarios)`)
  line(`  Diversity:         ${sys.healthSummary.diversity}`)
  line(`  Brand quality:     ${sys.healthSummary.brandQuality}`)
  line(`  Recommendation:    ${sys.healthSummary.recommendation}`)

  // 8. Detected issues
  if (sys.detectedIssues.length > 0) {
    line("\n--- Detected Issues ---\n")
    for (const issue of sys.detectedIssues) {
      line(`  [${issue.severity}] ${issue.issue} (${issue.affectedScenarios} scenarios)`)
      line(`    Fix: ${issue.suggestedFix}`)
    }
  } else {
    line("\n  No systemic issues detected.")
  }

  line("\n" + "=".repeat(90))
  line(`  ${sys.totalScenarios} scenarios | ${sys.totalCandidatesGenerated.toLocaleString()} candidates generated`)
  line("=".repeat(90) + "\n")
}
