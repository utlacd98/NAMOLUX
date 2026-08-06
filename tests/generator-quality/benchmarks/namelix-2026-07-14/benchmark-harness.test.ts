import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import {
  aggregateFinalBenchmark,
  aggregateRawRatings,
  type BenchmarkProtocol,
  type BlindExplanationPack,
  type BlindRawPack,
  buildBlindExplanationArtifacts,
  buildExplanationCaptureTemplate,
  type ExplanationBatchRating,
  type ExplanationReveal,
  type ExplanationScorecard,
  incompleteBenchmarkStatus,
  type NamelixCapture,
  type NamoLuxCapture,
  type NamoLuxObjectiveReport,
  type ProviderReveal,
  type RawBatchRating,
  type RawScorecard,
  sha256,
  stableJson,
  validateBlindRawPack,
  validateEquivalentControls,
  validateFrozenProviderAssignments,
  validateObjectiveReleaseGates,
  validateRawScorecard,
} from "../../../../scripts/lib/namelix-benchmark-harness"

const fixtureDirectory = resolve(
  process.cwd(),
  "tests/generator-quality/benchmarks/namelix-2026-07-14",
)

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(fixtureDirectory, name), "utf8")) as T
}

const protocol = readJson<BenchmarkProtocol>("benchmark-protocol.json")
const namelix = readJson<NamelixCapture>("capture-manifest.json")
const namolux = readJson<NamoLuxCapture>("namolux-capture-manifest.json")
const pack = readJson<BlindRawPack>("evaluator-pack.json")
const reveal = readJson<ProviderReveal>("provider-reveal.json")

function passingObjective(): NamoLuxObjectiveReport {
  return {
    schemaVersion: 2,
    benchmarkVersion: namolux.benchmarkVersion,
    provenance: {
      captureManifestSha256: sha256(stableJson(namolux)),
      generatorImplementationSha256: namolux.generatorImplementationSha256,
    },
    summary: {
      cases: namolux.cases.length,
      gates: {
        candidateContract: true,
        maxLength: true,
        malformedUnsafeHeuristics: true,
        explicitStyleMetadata: true,
        modelContributionCasesAtLeast90Percent: true,
        modelCandidateShareAtLeast25Percent: true,
        crossCaseExactDuplicationAtMost1Percent: true,
        p95GenerationAtMost8Seconds: true,
      },
    },
  }
}

function rawBatch(score: number, names: string[]): RawBatchRating {
  return {
    relevance: score,
    pronounceability: score,
    distinctiveness: score,
    controlFit: score,
    shortlistDepth: score,
    shortlistWorthyCount: score >= 8 ? 4 : 2,
    topTwoNames: names.slice(0, 2),
    criticalDefect: null,
  }
}

function rawScorecard(raterNumber: number): RawScorecard {
  const assignmentById = new Map(reveal.assignments.map((entry) => [entry.caseId, entry]))
  return {
    schemaVersion: 1,
    packId: pack.packId,
    raterId: `blind-rater-${raterNumber}`,
    completedAt: `2026-07-14T1${raterNumber}:00:00.000Z`,
    cases: pack.cases.map((entry, index) => {
      const assignment = assignmentById.get(entry.caseId)
      if (!assignment) throw new Error(`Missing reveal for ${entry.caseId}`)
      const namoluxScore = index < 8 ? 9 : index < 10 ? 8 : 7
      const namelixScore = 8
      const scoreForSide = (side: "A" | "B") =>
        assignment[side] === "NamoLux" ? namoluxScore : namelixScore
      const forcedPreference = index < 8
        ? (assignment.A === "NamoLux" ? "A" : "B")
        : index < 10
          ? "Tie"
          : (assignment.A === "Namelix" ? "A" : "B")
      return {
        presentationOrder: entry.presentationOrder,
        caseId: entry.caseId,
        batchA: rawBatch(scoreForSide("A"), entry.batchA),
        batchB: rawBatch(scoreForSide("B"), entry.batchB),
        forcedPreference,
        confidence: 4,
        notes: "Scored from the frozen A/B lists only.",
      }
    }),
  }
}

function explanationBatch(score: number): ExplanationBatchRating {
  return {
    briefSpecificity: Math.min(3, score),
    constructionClarity: Math.min(2, Math.max(0, score - 3)),
    positioningUsefulness: Math.min(2, Math.max(0, score - 5)),
    evidenceHonesty: Math.min(2, Math.max(0, score - 7)),
    decisionActionability: Math.min(1, Math.max(0, score - 9)),
  }
}

function completeExplanationCapture(raw: ReturnType<typeof aggregateRawRatings>) {
  const capture = buildExplanationCaptureTemplate(raw, namolux)
  capture.status = "complete"
  for (const entry of capture.cases) {
    for (const item of entry.providers.Namelix) {
      item.explanation = `${item.name} connects the brief's functional promise with a clear, audience-relevant naming direction.`
      item.capturedAt = "2026-07-14T23:00:00.000Z"
      item.source = "name_specific_feedback"
    }
  }
  return capture
}

function explanationScorecard(
  raterNumber: number,
  explanationPack: BlindExplanationPack,
  explanationReveal: ExplanationReveal,
): ExplanationScorecard {
  const assignmentById = new Map(explanationReveal.assignments.map((entry) => [entry.caseId, entry]))
  return {
    schemaVersion: 1,
    packId: explanationPack.packId,
    rawFreezeId: explanationPack.rawFreezeId,
    raterId: `explanation-rater-${raterNumber}`,
    completedAt: `2026-07-15T1${raterNumber}:00:00.000Z`,
    cases: explanationPack.cases.map((entry, index) => {
      const assignment = assignmentById.get(entry.caseId)
      if (!assignment) throw new Error(`Missing explanation reveal for ${entry.caseId}`)
      const namoluxScore = index < 10 ? 10 : 8
      const namelixScore = 8
      const scoreForSide = (side: "A" | "B") =>
        assignment[side] === "NamoLux" ? namoluxScore : namelixScore
      return {
        presentationOrder: entry.presentationOrder,
        caseId: entry.caseId,
        setA: explanationBatch(scoreForSide("A")),
        setB: explanationBatch(scoreForSide("B")),
        forcedPreference: index < 10
          ? (assignment.A === "NamoLux" ? "A" : "B")
          : "Tie",
        confidence: 4,
        notes: "Scored from the explanation sets only.",
      }
    }),
  }
}

describe("blind NamoLux-versus-Namelix benchmark harness", () => {
  it("requires a capture-bound objective report with every release gate passing", () => {
    expect(validateObjectiveReleaseGates(namolux, passingObjective(), {
      required: true,
      requireCurrentSchema: true,
    })).toEqual({ pass: true, errors: [] })

    expect(validateObjectiveReleaseGates(namolux, null, {
      required: true,
      requireCurrentSchema: true,
    })).toEqual({
      pass: false,
      errors: ["fresh benchmark run is missing objective-report.json"],
    })

    const failedGate = passingObjective()
    failedGate.summary.gates.modelCandidateShareAtLeast25Percent = false
    expect(validateObjectiveReleaseGates(namolux, failedGate, {
      required: true,
      requireCurrentSchema: true,
    }).errors).toContain("objective release gate failed: modelCandidateShareAtLeast25Percent")

    const wrongCapture = passingObjective()
    wrongCapture.provenance = {
      ...wrongCapture.provenance,
      captureManifestSha256: "0".repeat(64),
    }
    expect(validateObjectiveReleaseGates(namolux, wrongCapture, {
      required: true,
      requireCurrentSchema: true,
    }).errors).toContain("objective report belongs to another NamoLux capture")
  })

  it("validates all twelve equivalent controls and keeps the pre-rating status honest", () => {
    validateBlindRawPack(pack)
    const controls = validateEquivalentControls(protocol, namelix, namolux, pack)
    expect(controls).toEqual({ pass: true, errors: [], casesChecked: 12 })
    expect(validateFrozenProviderAssignments(namelix, namolux, pack, reveal)).toEqual({
      pass: true,
      errors: [],
    })

    const status = incompleteBenchmarkStatus(protocol, controls)
    expect(status.status).toBe("ready_for_three_blind_raw_raters")
    expect(status.counts.outrightNamoLuxWins).toBeNull()
    expect(status.gates.overallReleaseGatePassed).toBeNull()
  })

  it("detects a non-equivalent native creativity setting", () => {
    const changed = structuredClone(namelix)
    changed.cases[0].payload.random = "high"
    const controls = validateEquivalentControls(protocol, changed, namolux, pack)
    expect(controls.pass).toBe(false)
    expect(controls.errors).toContain(`${changed.cases[0].caseId}: Namelix creativity is not equivalent`)
  })

  it("rejects provider leakage, explanation fields, and incomplete raw ratings", () => {
    const leaked = rawScorecard(1) as RawScorecard & { provider?: string }
    leaked.provider = "NamoLux"
    expect(() => validateRawScorecard(protocol, pack, leaked)).toThrow(/provider label leaked/i)

    const extraField = rawScorecard(1)
    ;(extraField.cases[0].batchA as RawBatchRating & { explanation?: string }).explanation = "Not allowed yet"
    expect(() => validateRawScorecard(protocol, pack, extraField)).toThrow(/unexpected or missing fields/i)

    expect(() => aggregateRawRatings(protocol, pack, reveal, [rawScorecard(1), rawScorecard(2)]))
      .toThrow(/exactly 3 completed scorecards/i)
  })

  it("freezes raw results deterministically and applies the 8/12 and 10/12 gates literally", () => {
    const ratings = [rawScorecard(1), rawScorecard(2), rawScorecard(3)]
    const first = aggregateRawRatings(protocol, pack, reveal, ratings, "2026-07-15T00:00:00.000Z")
    const reordered = aggregateRawRatings(protocol, pack, reveal, [...ratings].reverse(), "2026-07-16T00:00:00.000Z")

    expect(first.rawFreezeId).toBe(reordered.rawFreezeId)
    expect(first.summary).toMatchObject({
      cases: 12,
      outrightNamoLuxWins: 8,
      matchOrBeat: 10,
      criticalQualityLosses: 0,
      gates: {
        outrightWinsAtLeastEight: true,
        matchOrBeatAtLeastTen: true,
        noCriticalQualityLoss: true,
        rawReleaseGatePassed: true,
      },
    })
    expect(first.cases.every((entry) => entry.providers.NamoLux.finalists.length === 2)).toBe(true)
    expect(first.provenance.scorecards).toHaveLength(3)
    expect(first.provenance.scorecards.every((entry) => /^[a-f0-9]{64}$/.test(entry.sha256))).toBe(true)
  })

  it("refuses to expose explanations until raw scores and competitor feedback are frozen", () => {
    const raw = aggregateRawRatings(
      protocol,
      pack,
      reveal,
      [rawScorecard(1), rawScorecard(2), rawScorecard(3)],
    )
    const sealed = buildExplanationCaptureTemplate(raw, namolux)
    expect(sealed.status).toBe("awaiting_namelix_feedback")
    expect(sealed.warning).toMatch(/sealed/i)
    expect(sealed.cases.every((entry) => entry.providers.Namelix.every((item) => item.explanation === null))).toBe(true)
    expect(() => buildBlindExplanationArtifacts(protocol, raw, sealed)).toThrow(/not complete/i)

    const substituted = completeExplanationCapture(raw)
    substituted.cases[0].providers.Namelix[0].name = "A hand-picked replacement"
    expect(() => buildBlindExplanationArtifacts(protocol, raw, substituted)).toThrow(/finalists differ/i)
  })

  it("independently blinds explanation sets and reports the 10/12 explanation gate", () => {
    const raw = aggregateRawRatings(
      protocol,
      pack,
      reveal,
      [rawScorecard(1), rawScorecard(2), rawScorecard(3)],
      "2026-07-15T00:00:00.000Z",
    )
    const sealed = completeExplanationCapture(raw)
    const artifacts = buildBlindExplanationArtifacts(protocol, raw, sealed)
    const serializedPack = JSON.stringify(artifacts.pack)

    expect(serializedPack).not.toMatch(/namelix|namolux/i)
    expect(artifacts.reveal.assignments.filter((entry) => entry.A === "NamoLux")).toHaveLength(6)
    expect(artifacts.reveal.assignments.filter((entry) => entry.A === "Namelix")).toHaveLength(6)
    expect(artifacts.scorecardTemplate.raterId).toBeNull()
    expect(artifacts.scorecardTemplate.completedAt).toBeNull()

    const ratings = [1, 2, 3].map((rater) =>
      explanationScorecard(rater, artifacts.pack, artifacts.reveal),
    )
    const report = aggregateFinalBenchmark(
      protocol,
      raw,
      artifacts.pack,
      artifacts.reveal,
      ratings,
      "2026-07-16T00:00:00.000Z",
    )
    expect(report.counts).toEqual({
      outrightNamoLuxWins: 8,
      matchOrBeat: 10,
      criticalQualityLosses: 0,
      explanationWins: 10,
    })
    expect(report.gates).toEqual({
      outrightWinsAtLeastEight: true,
      matchOrBeatAtLeastTen: true,
      explanationWinsAtLeastTen: true,
      noCriticalQualityLoss: true,
      overallReleaseGatePassed: true,
    })
  })
})
