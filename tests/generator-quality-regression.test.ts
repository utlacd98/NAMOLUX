import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  generateQuickCandidates,
  isVerifiedQuickLocaleCandidate,
  QUICK_GENERATE_CREATIVITY,
  QUICK_GENERATE_STYLES,
  QUICK_GENERATE_VIBES,
  type QuickCandidate,
  type QuickGenerateCreativity,
  type QuickGenerateStyle,
  type QuickGenerateVibe,
} from "@/lib/domainGen/quickGenerate"
import {
  evaluateGeneratorBatch,
  getGeneratorMechanicalQuality,
} from "@/tests/generator-quality/harness"

const CANONICAL_MAX_CHARS = 12
const BOUNDARY_MAX_CHARS = [6, 8, 10, 12, 15] as const

/**
 * Each explicit construction gets a brief with enough honest source material
 * to exercise that construction. Non-English intentionally uses a reviewed
 * locale; arbitrary translations are not valid production output.
 */
const BRIEF_BY_STYLE: Record<QuickGenerateStyle, string> = {
  auto: "Reusable takeaway packaging for independent restaurants and neighbourhood food markets",
  brandable: "Phone-based vine disease detection for family vineyards in southern France",
  evocative: "Slow luxury rail journeys through mountain landscapes in central Europe",
  compound: "Fair land leasing for farmers hosting community solar projects in Yorkshire",
  alternate_spelling: "Adaptive cycling coaching for amateur riders preparing for long-distance events",
  real_word: "A private digital archive preserving family letters, photographs, and recorded memories",
  short_phrase: "Last-minute childcare matching for hospital staff working unexpected shifts",
  non_english: "Welsh language farm marketplace for schools and local growers in Cymru",
}

interface QuickRegressionCase {
  id: string
  description: string
  vibe: QuickGenerateVibe
  style: QuickGenerateStyle
  creativity: QuickGenerateCreativity
  maxChars: number
  count: number
}

function buildCanonicalCases(): QuickRegressionCase[] {
  const cases: QuickRegressionCase[] = []

  for (const vibe of QUICK_GENERATE_VIBES) {
    for (const style of QUICK_GENERATE_STYLES) {
      for (const creativity of QUICK_GENERATE_CREATIVITY) {
        cases.push({
          id: `canonical:${vibe}:${style}:${creativity}`,
          description: BRIEF_BY_STYLE[style],
          vibe,
          style,
          creativity,
          maxChars: CANONICAL_MAX_CHARS,
          count: style === "auto" ? 16 : 8,
        })
      }
    }
  }

  return cases
}

function buildBoundaryCases(): QuickRegressionCase[] {
  const cases: QuickRegressionCase[] = []

  for (const style of QUICK_GENERATE_STYLES) {
    // The UI raises Non-English to 12 because reviewed Welsh/French forms
    // cannot honestly promise a complete batch below that limit.
    const lengths = style === "non_english"
      ? BOUNDARY_MAX_CHARS.filter((maxChars) => maxChars >= 12)
      : BOUNDARY_MAX_CHARS

    for (const creativity of QUICK_GENERATE_CREATIVITY) {
      for (const maxChars of lengths) {
        const vibe = QUICK_GENERATE_VIBES[cases.length % QUICK_GENERATE_VIBES.length]
        cases.push({
          id: `boundary:${vibe}:${style}:${creativity}:${maxChars}`,
          description: BRIEF_BY_STYLE[style],
          vibe,
          style,
          creativity,
          maxChars,
          count: 8,
        })
      }
    }
  }

  return cases
}

function validateBatch(testCase: QuickRegressionCase, candidates: readonly QuickCandidate[]): string[] {
  const failures: string[] = []
  const names = candidates.map((candidate) => candidate.name)
  const prefix = testCase.id

  if (candidates.length !== testCase.count) {
    failures.push(`${prefix}: returned ${candidates.length}/${testCase.count} candidates`)
  }

  const mechanical = getGeneratorMechanicalQuality(evaluateGeneratorBatch(
    candidates.map((candidate) => ({
      name: candidate.name,
      roots: candidate.fitRoots,
      narrative: candidate.personality,
    })),
    {
      minUniqueCandidates: testCase.count,
      maxLength: testCase.maxChars,
      minNarrativeCharacters: 45,
      minNarrativeWords: 8,
    },
  ))
  failures.push(...mechanical.issues.map((issue) => `${prefix}: ${issue}`))

  if (testCase.style !== "auto") {
    const mismatches = candidates
      .filter((candidate) => candidate.style !== testCase.style)
      .map((candidate) => `${candidate.name}=${candidate.style}`)
    if (mismatches.length > 0) {
      failures.push(`${prefix}: requested ${testCase.style}, received ${mismatches.join(", ")}`)
    }
  }

  if (testCase.style === "non_english") {
    const unreviewed = names.filter((name) => !isVerifiedQuickLocaleCandidate(name, testCase.description))
    if (unreviewed.length > 0) {
      failures.push(`${prefix}: unreviewed locale candidates ${unreviewed.join(", ")}`)
    }
  }

  return failures
}

function runCases(cases: readonly QuickRegressionCase[]): string[] {
  const failures: string[] = []

  for (const testCase of cases) {
    const candidates = generateQuickCandidates({
      description: testCase.description,
      vibe: testCase.vibe,
      style: testCase.style,
      creativity: testCase.creativity,
      maxChars: testCase.maxChars,
      count: testCase.count,
      seed: `quality-regression:${testCase.id}`,
    })
    failures.push(...validateBatch(testCase, candidates))
  }

  return failures
}

describe("production generator quality regression", () => {
  it(
    "covers every Quick vibe, style, and creativity combination at the canonical production length",
    { timeout: 180_000 },
    () => {
      const cases = buildCanonicalCases()

      expect(cases).toHaveLength(
        QUICK_GENERATE_VIBES.length
          * QUICK_GENERATE_STYLES.length
          * QUICK_GENERATE_CREATIVITY.length,
      )
      expect(cases).toHaveLength(144)

      const failures = runCases(cases)
      expect(failures, failures.join("\n")).toEqual([])
    },
  )

  it(
    "covers UI-valid boundary lengths across every Quick style and creativity level",
    { timeout: 180_000 },
    () => {
      const cases = buildBoundaryCases()

      expect(new Set(cases.map((testCase) => testCase.vibe))).toEqual(new Set(QUICK_GENERATE_VIBES))
      expect(new Set(cases.map((testCase) => testCase.style))).toEqual(new Set(QUICK_GENERATE_STYLES))
      expect(new Set(cases.map((testCase) => testCase.creativity))).toEqual(new Set(QUICK_GENERATE_CREATIVITY))
      expect(new Set(cases.map((testCase) => testCase.maxChars))).toEqual(new Set(BOUNDARY_MAX_CHARS))
      expect(cases).toHaveLength(111)

      const failures = runCases(cases)
      expect(failures, failures.join("\n")).toEqual([])
    },
  )

  it("keeps redesigned Advanced on the model-backed production builder", () => {
    const source = readFileSync(
      new URL("../app/api/generate-domains/route.ts", import.meta.url),
      "utf8",
    )
    const branchStart = source.indexOf("if (redesignV2 && useQualityGenerator)")
    const legacyBranchStart = source.indexOf("if (useQualityGenerator)", branchStart + 1)

    expect(branchStart, "redesigned Advanced branch is missing").toBeGreaterThanOrEqual(0)
    expect(legacyBranchStart, "legacy preview branch marker is missing").toBeGreaterThan(branchStart)

    const redesignedBranch = source.slice(branchStart, legacyBranchStart)
    expect(redesignedBranch).toContain("await generateGroqQuickCandidates({")
    expect(redesignedBranch).not.toContain("generateCandidatePool(")
    expect(redesignedBranch).not.toContain("buildPreviewQualitySeeds(")
    expect(redesignedBranch).not.toMatch(/\bpoolSize\s*:\s*700\b/)
    expect(redesignedBranch).not.toContain('strategy: "curated_emotional"')
  })
})
