import { describe, expect, it } from "vitest"
import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import { generateQuickCandidates, QUICK_GENERATE_VIBES, selectPrimaryQuickCandidates } from "@/lib/domainGen/quickGenerate"
import { rankCandidates } from "@/lib/domainGen/scoreCandidates"
import type { AutoFindControls } from "@/lib/domainGen/types"
import {
  GENERATABLE_QUALITY_PROMPTS,
  GENERATOR_QUALITY_CORPUS,
  REJECTED_QUALITY_PROMPTS,
  type GeneratorQualityPrompt,
} from "@/tests/generator-quality/corpus"
import {
  evaluateGeneratorBatch,
  getGeneratorMechanicalQuality,
  isUsableGeneratorPrompt,
  type GeneratorQualityCandidate,
} from "@/tests/generator-quality/harness"

function runQuickGenerator(prompt: GeneratorQualityPrompt): GeneratorQualityCandidate[] {
  return generateQuickCandidates({
    description: prompt.description.trim().slice(0, 1_000),
    rhymeWith: prompt.rhymeWith,
    vibe: prompt.quickVibe,
    maxChars: prompt.maxLength,
    count: 12,
    seed: `quality-corpus:quick:${prompt.id}`,
  }).map((candidate) => ({
    name: candidate.name,
    roots: candidate.fitRoots,
    narrative: candidate.personality,
  }))
}

function premiumControls(prompt: GeneratorQualityPrompt): AutoFindControls {
  return {
    seed: `quality-corpus:premium:${prompt.id}`,
    mustIncludeKeyword: "none",
    keywordPosition: "anywhere",
    style: "brandable_blends",
    blocklist: [],
    allowlist: [],
    allowHyphen: false,
    allowNumbers: false,
    meaningFirst: true,
    preferTwoWordBrands: prompt.maxLength >= 8,
    allowVibeSuffix: false,
    showAnyAvailable: false,
  }
}

function runPremiumGenerator(prompt: GeneratorQualityPrompt): GeneratorQualityCandidate[] {
  const controls = premiumControls(prompt)
  const pool = generateCandidatePool(
    {
      keyword: prompt.description.trim().slice(0, 1_000),
      industry: prompt.industry,
      vibe: prompt.premiumVibe,
      maxLength: prompt.maxLength,
      targetCount: 24,
      controls,
    },
    { poolSize: 280, seedSalt: "quality-corpus" },
  )

  return rankCandidates(pool.candidates, {
    industry: prompt.industry,
    vibe: prompt.premiumVibe,
    keywordTokens: pool.keywordTokens,
    controls,
  })
    .slice(0, 12)
    .map((candidate) => ({
      name: candidate.name,
      roots: candidate.roots,
      narrative: [candidate.whyItWorks, candidate.meaningBreakdown, candidate.whyTag].filter(Boolean).join(" "),
    }))
}

function corpusFailures(
  runner: (prompt: GeneratorQualityPrompt) => GeneratorQualityCandidate[],
  minUniqueCandidates: number,
): string[] {
  const failures: string[] = []

  for (const prompt of GENERATABLE_QUALITY_PROMPTS) {
    const candidates = runner(prompt)
    const report = evaluateGeneratorBatch(candidates, {
      minUniqueCandidates,
      maxLength: prompt.maxLength,
      relevanceTerms: prompt.relevanceTerms,
      minNarrativeCharacters: 45,
      minNarrativeWords: 8,
    })

    const mechanical = getGeneratorMechanicalQuality(report)
    if (mechanical.issues.length > 0) {
      failures.push(`${prompt.id} [${mechanical.score}/100 mechanical]: ${mechanical.issues.join("; ")}`)
    }
  }

  return failures
}

describe("generator professional-quality corpus", () => {
  it("keeps literal niche-signal matching diagnostic rather than mechanical", () => {
    const report = evaluateGeneratorBatch(
      ["mosaic", "cadence", "tandem", "ember", "meridian", "solace", "orbit", "prism"].map((name) => ({
        name,
        narrative: `${name} has a clear, substantive explanation covering its sound, intended audience and positioning without inventing a hidden meaning.`,
      })),
      {
        minUniqueCandidates: 8,
        maxLength: 12,
        relevanceTerms: ["accounting", "invoice"],
        minNarrativeCharacters: 70,
        minNarrativeWords: 12,
      },
    )

    expect(report.metrics.relevancePass).toBe(false)
    expect(report.issues).toContain("no candidate carries a deterministic niche signal from: accounting, invoice")
    expect(getGeneratorMechanicalQuality(report)).toEqual({ score: 100, issues: [] })
  })

  it("maintains broad, explicit coverage", () => {
    expect(GENERATOR_QUALITY_CORPUS.length).toBeGreaterThanOrEqual(60)
    expect(new Set(GENERATOR_QUALITY_CORPUS.map((prompt) => prompt.id)).size).toBe(GENERATOR_QUALITY_CORPUS.length)
    expect(new Set(GENERATOR_QUALITY_CORPUS.map((prompt) => prompt.segment)).size).toBeGreaterThanOrEqual(9)
    expect(new Set(GENERATOR_QUALITY_CORPUS.map((prompt) => prompt.industry)).size).toBeGreaterThanOrEqual(20)
    expect(new Set(GENERATOR_QUALITY_CORPUS.map((prompt) => prompt.quickVibe))).toEqual(new Set(QUICK_GENERATE_VIBES))
    expect(new Set(GENERATOR_QUALITY_CORPUS.map((prompt) => prompt.premiumVibe))).toEqual(
      new Set(["luxury", "futuristic", "playful", "trustworthy", "minimal"]),
    )
    expect(GENERATOR_QUALITY_CORPUS.filter((prompt) => prompt.segment === "edge").length).toBeGreaterThanOrEqual(10)
    expect(GENERATOR_QUALITY_CORPUS.filter((prompt) => prompt.segment === "geographic").length).toBeGreaterThanOrEqual(6)
    expect(GENERATOR_QUALITY_CORPUS.filter((prompt) => prompt.relevanceTerms?.length).length).toBeGreaterThanOrEqual(50)
  })

  it("classifies empty and underspecified briefs before generation", () => {
    expect(REJECTED_QUALITY_PROMPTS.length).toBeGreaterThanOrEqual(3)
    for (const prompt of REJECTED_QUALITY_PROMPTS) {
      expect(isUsableGeneratorPrompt(prompt.description), prompt.id).toBe(false)
    }
    for (const prompt of GENERATABLE_QUALITY_PROMPTS) {
      expect(isUsableGeneratorPrompt(prompt.description), prompt.id).toBe(true)
    }
  })

  it("independently rejects known broken phonetic and unsafe regressions", () => {
    const broken = ["childinic", "clinrapy", "sensosors", "funereral", "asdfasdf", "sexulness", "isolalate"]

    for (const name of broken) {
      const report = evaluateGeneratorBatch(
        [
          {
            name,
            narrative: `${name} is a deliberately long fixture explanation used to verify the independent phonetic quality gate.`,
          },
        ],
        { minUniqueCandidates: 1, maxLength: 15 },
      )

      expect(report.issues.some((issue) => issue.includes("broken phonetic")), name).toBe(true)
    }
  })

  it(
    "keeps quick-generator batches professional across every generatable brief",
    { timeout: 120_000 },
    () => {
      const failures = corpusFailures(runQuickGenerator, 6)
      expect(failures, failures.join("\n")).toEqual([])
    },
  )

  it(
    "keeps premium deterministic batches professional across every generatable brief",
    { timeout: 180_000 },
    () => {
      const failures = corpusFailures(runPremiumGenerator, 8)
      expect(failures, failures.join("\n")).toEqual([])
    },
  )

  it(
    "is stable for the same quick-generator seed",
    { timeout: 30_000 },
    () => {
      for (const prompt of GENERATABLE_QUALITY_PROMPTS) {
        expect(runQuickGenerator(prompt), prompt.id).toEqual(runQuickGenerator(prompt))
      }
    },
  )

  it(
    "keeps every displayed route-level direction mechanically sound and honestly explained",
    { timeout: 30_000 },
    () => {
      for (const prompt of GENERATABLE_QUALITY_PROMPTS) {
        const generated = generateQuickCandidates({
          description: prompt.description,
          rhymeWith: prompt.rhymeWith,
          vibe: prompt.quickVibe,
          maxChars: prompt.maxLength,
          count: 12,
          seed: `quality-corpus:route:${prompt.id}`,
        })
        const selected = selectPrimaryQuickCandidates(generated, 10)
        expect(selected.length, prompt.id).toBeGreaterThanOrEqual(6)
        expect(selected.every((candidate) => candidate.personality.length >= 70), prompt.id).toBe(true)
        const mechanical = getGeneratorMechanicalQuality(evaluateGeneratorBatch(
          selected.map((candidate) => ({
            name: candidate.name,
            narrative: candidate.personality,
            roots: candidate.fitRoots,
          })),
          {
            minUniqueCandidates: 6,
            maxLength: prompt.maxLength,
            relevanceTerms: prompt.relevanceTerms,
            minNarrativeCharacters: 70,
            minNarrativeWords: 12,
          },
        ))
        expect(mechanical.issues, `${prompt.id}: ${mechanical.issues.join("; ")}`).toEqual([])
        expect(
          selected
            .filter((candidate) => (
              (candidate.fitRoots?.length || 0) === 0
              && !candidate.evidence
              && !candidate.constructionParts?.length
            ))
            .every((candidate) => /does not carry a literal brief cue|not a claimed hidden split|not as evidence of a category meaning/i.test(candidate.personality)),
          `${prompt.id}: unevidenced abstract names disclose their limitation`,
        ).toBe(true)
      }
    },
  )

  it(
    "is stable for representative premium-generator seeds",
    { timeout: 60_000 },
    () => {
      const representative = [
        "ai-scheduling-founders",
        "teen-therapy",
        "lisbon-real-estate",
        "kenya-eco-safari",
        "cozy-puzzle-studio",
        "public-procurement",
        "keyword-stuffing",
        "multilingual-french",
      ]

      for (const id of representative) {
        const prompt = GENERATABLE_QUALITY_PROMPTS.find((item) => item.id === id)
        expect(prompt, id).toBeDefined()
        expect(runPremiumGenerator(prompt!), id).toEqual(runPremiumGenerator(prompt!))
      }
    },
  )
})
