import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

interface Candidate {
  name: string
  rationale: string
  style: string
  fitRoots: string[]
  fitCues: string[]
}

interface NamoLuxCase {
  caseId: string
  brief: string
  canonicalStyle: string
  canonicalCreativity: string
  maxLength: number
  capturedAt: string
  durationMs: number
  provider: string
  model: string | null
  modelBacked: boolean
  modelCandidateCount: number
  fallbackCandidateCount: number
  transportRetryCount: number
  transportRetryReason: string | null
  normalizedResponseSha256: string
  candidates: Candidate[]
}

interface NamoLuxManifest {
  benchmarkVersion: string
  capturedProvider: "NamoLux"
  captureTarget: string
  buildUrl: string | null
  selectionRule: string
  rawResponseBodiesRetained: boolean
  generatorImplementationSha256: string
  startedAt: string
  completedAt: string | null
  cases: NamoLuxCase[]
}

interface NamelixCase {
  caseId: string
  first16Names: string[]
}

interface NamelixManifest {
  benchmarkVersion: string
  cases: NamelixCase[]
}

interface BlindCase {
  presentationOrder: number
  caseId: string
  brief: string
  style: string
  creativity: string
  maxLength: number
  batchA: string[]
  batchB: string[]
}

interface BlindPack {
  packId: string
  cases: BlindCase[]
}

interface Reveal {
  assignments: Array<{
    caseId: string
    A: "Namelix" | "NamoLux"
    B: "Namelix" | "NamoLux"
  }>
}

interface ObjectiveCase {
  caseId: string
  candidateCount: number
  uniqueCandidateCount: number
  modelBacked: boolean
  provider: string
  modelCandidateCount: number
  fallbackCandidateCount: number
  durationMs: number
  maxLengthViolations: string[]
  malformedOrUnsafeFlags: string[]
  explicitStyleMismatches: Array<{ name: string; actualStyle: string }>
  rationaleUnder70Characters: string[]
  rationaleUnder12Words: string[]
  candidatesWithoutFitRoots: string[]
  exactSameCaseProviderOverlap: string[]
}

interface ObjectiveReport {
  scope: string
  summary: {
    cases: number
    totalCandidates: number
    allCasesHave16UniqueNames: boolean
    modelBackedCases: number
    modelBackedCaseRatePercent: number
    modelCandidates: number
    fallbackCandidates: number
    fallbackCandidateRatePercent: number
    providerCounts: Record<string, number>
    p95DurationMs: number
    maxDurationMs: number
    crossCaseExactDuplicateOccurrences: number
    crossCaseExactDuplicateRatePercent: number
    totalMaxLengthViolations: number
    totalMalformedOrUnsafeFlags: number
    totalExplicitStyleMismatches: number
    totalExactSameCaseProviderOverlap: number
    gates: Record<string, boolean>
  }
  perCase: ObjectiveCase[]
}

interface RaterScorecard {
  packId: string
  raterId: null
  completedAt: null
  instructions: string
  cases: Array<{
    presentationOrder: number
    caseId: string
    batchA: Record<string, unknown>
    batchB: Record<string, unknown>
    forcedPreference: null
    confidence: null
  }>
}

const fixtureDirectory = resolve(
  process.cwd(),
  "tests/generator-quality/benchmarks/namelix-2026-07-14",
)

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(fixtureDirectory, name), "utf8")) as T
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function normalizeName(value: string): string {
  return value.toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}]/gu, "")
}

function p95(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
}

const namelix = readJson<NamelixManifest>("capture-manifest.json")
const namolux = readJson<NamoLuxManifest>("namolux-capture-manifest.json")
const blindRaw = readFileSync(resolve(fixtureDirectory, "evaluator-pack.json"), "utf8")
const blind = JSON.parse(blindRaw) as BlindPack
const reveal = readJson<Reveal>("provider-reveal.json")
const objective = readJson<ObjectiveReport>("objective-report.json")
const scorecardRaw = readFileSync(
  resolve(fixtureDirectory, "rater-scorecard.template.json"),
  "utf8",
)
const scorecard = JSON.parse(scorecardRaw) as RaterScorecard

describe("completed 14 July 2026 blinded benchmark", () => {
  it("freezes one complete NamoLux capture per case without retries or replacement", () => {
    expect(namolux.benchmarkVersion).toBe(namelix.benchmarkVersion)
    expect(namolux.capturedProvider).toBe("NamoLux")
    expect(namolux.captureTarget).toBe("current-local-working-tree")
    expect(namolux.buildUrl).toBeNull()
    expect(namolux.rawResponseBodiesRetained).toBe(true)
    expect(namolux.selectionRule).toMatch(/no manual filtering, reordering or replacement/i)
    expect(namolux.generatorImplementationSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(Number.isFinite(Date.parse(namolux.startedAt))).toBe(true)
    expect(Number.isFinite(Date.parse(namolux.completedAt || ""))).toBe(true)
    expect(namolux.cases).toHaveLength(12)
    expect(new Set(namolux.cases.map((entry) => entry.caseId)).size).toBe(12)

    for (const entry of namolux.cases) {
      expect(entry.transportRetryCount, `${entry.caseId}: no retries`).toBe(0)
      expect(entry.transportRetryReason, `${entry.caseId}: no retry reason`).toBeNull()
      expect(Number.isFinite(Date.parse(entry.capturedAt))).toBe(true)
      expect(entry.durationMs).toBeGreaterThanOrEqual(0)
      expect(entry.candidates, `${entry.caseId}: candidate count`).toHaveLength(16)
      expect(
        new Set(entry.candidates.map((candidate) => normalizeName(candidate.name))).size,
        `${entry.caseId}: normalized unique candidates`,
      ).toBe(16)
      for (const candidate of entry.candidates) {
        expect(candidate.name).toBe(candidate.name.trim())
        expect(candidate.name.length).toBeGreaterThan(0)
        expect(candidate.rationale.trim().length).toBeGreaterThan(0)
        expect(candidate.fitRoots.length).toBeGreaterThan(0)
      }

      const responseForHash = {
        provider: entry.provider,
        model: entry.model,
        modelCandidateCount: entry.modelCandidateCount,
        fallbackCandidateCount: entry.fallbackCandidateCount,
        candidates: entry.candidates,
      }
      expect(entry.normalizedResponseSha256).toBe(sha256(JSON.stringify(responseForHash)))
    }
  })

  it("places both frozen sources into a complete provider-neutral 6/6 A/B pack", () => {
    expect(blindRaw).not.toMatch(/namelix|namolux/i)
    expect(blind.cases).toHaveLength(12)
    expect(blind.cases.map((entry) => entry.presentationOrder)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    )

    const namelixById = new Map(namelix.cases.map((entry) => [entry.caseId, entry]))
    const namoluxById = new Map(namolux.cases.map((entry) => [entry.caseId, entry]))
    const revealById = new Map(reveal.assignments.map((entry) => [entry.caseId, entry]))
    for (const entry of blind.cases) {
      const assignment = revealById.get(entry.caseId)
      const sourceNamelix = namelixById.get(entry.caseId)
      const sourceNamoLux = namoluxById.get(entry.caseId)
      expect(assignment, `${entry.caseId}: reveal`).toBeDefined()
      expect(sourceNamelix, `${entry.caseId}: Namelix capture`).toBeDefined()
      expect(sourceNamoLux, `${entry.caseId}: NamoLux capture`).toBeDefined()
      expect(entry.batchA).toHaveLength(16)
      expect(entry.batchB).toHaveLength(16)
      expect(entry.batchA).toEqual(
        assignment?.A === "Namelix"
          ? sourceNamelix?.first16Names
          : sourceNamoLux?.candidates.map((candidate) => candidate.name),
      )
      expect(entry.batchB).toEqual(
        assignment?.B === "Namelix"
          ? sourceNamelix?.first16Names
          : sourceNamoLux?.candidates.map((candidate) => candidate.name),
      )
    }

    expect(reveal.assignments.filter((entry) => entry.A === "NamoLux")).toHaveLength(6)
    expect(reveal.assignments.filter((entry) => entry.A === "Namelix")).toHaveLength(6)
  })

  it("keeps the rater template blind and aligned to the completed pack", () => {
    expect(scorecardRaw).not.toMatch(/namelix|namolux/i)
    expect(scorecard.packId).toBe(blind.packId)
    expect(scorecard.raterId).toBeNull()
    expect(scorecard.completedAt).toBeNull()
    expect(scorecard.instructions).toMatch(/provider-neutral A\/B names/i)
    expect(scorecard.cases).toHaveLength(12)
    expect(scorecard.cases.map((entry) => [entry.presentationOrder, entry.caseId])).toEqual(
      blind.cases.map((entry) => [entry.presentationOrder, entry.caseId]),
    )
    for (const entry of scorecard.cases) {
      expect(entry.forcedPreference).toBeNull()
      expect(entry.confidence).toBeNull()
      for (const side of [entry.batchA, entry.batchB]) {
        expect(side.relevance).toBeNull()
        expect(side.pronounceability).toBeNull()
        expect(side.distinctiveness).toBeNull()
        expect(side.controlFit).toBeNull()
        expect(side.shortlistDepth).toBeNull()
        expect(side.topTwoNames).toEqual([])
      }
    }
  })

  it("reports objective counts faithfully without treating heuristics as a winner score", () => {
    expect(objective.scope).toMatch(/does not score creative quality or declare a winner/i)
    expect(objective.perCase).toHaveLength(12)
    expect(objective.summary.cases).toBe(namolux.cases.length)

    const totalCandidates = namolux.cases.reduce(
      (total, entry) => total + entry.candidates.length,
      0,
    )
    const modelBackedCases = namolux.cases.filter((entry) => entry.modelBacked).length
    const modelCandidates = namolux.cases.reduce(
      (total, entry) => total + entry.modelCandidateCount,
      0,
    )
    const fallbackCandidates = namolux.cases.reduce(
      (total, entry) => total + entry.fallbackCandidateCount,
      0,
    )
    const providerCounts = Object.fromEntries(
      [...new Set(namolux.cases.map((entry) => entry.provider))]
        .sort()
        .map((provider) => [
          provider,
          namolux.cases.filter((entry) => entry.provider === provider).length,
        ]),
    )

    expect(objective.summary.totalCandidates).toBe(totalCandidates)
    expect(objective.summary.modelBackedCases).toBe(modelBackedCases)
    expect(objective.summary.modelBackedCaseRatePercent).toBe(
      Number(((modelBackedCases / namolux.cases.length) * 100).toFixed(1)),
    )
    expect(objective.summary.modelCandidates).toBe(modelCandidates)
    expect(objective.summary.fallbackCandidates).toBe(fallbackCandidates)
    expect(objective.summary.fallbackCandidateRatePercent).toBe(
      Number(((fallbackCandidates / totalCandidates) * 100).toFixed(1)),
    )
    expect(objective.summary.providerCounts).toEqual(providerCounts)
    expect(objective.summary.p95DurationMs).toBe(
      p95(namolux.cases.map((entry) => entry.durationMs)),
    )
    expect(objective.summary.maxDurationMs).toBe(
      Math.max(...namolux.cases.map((entry) => entry.durationMs)),
    )

    for (const entry of objective.perCase) {
      const captured = namolux.cases.find((candidate) => candidate.caseId === entry.caseId)
      expect(captured, `${entry.caseId}: captured case`).toBeDefined()
      expect(entry.candidateCount).toBe(captured?.candidates.length)
      expect(entry.uniqueCandidateCount).toBe(
        new Set(captured?.candidates.map((candidate) => normalizeName(candidate.name))).size,
      )
      expect(entry.modelBacked).toBe(captured?.modelBacked)
      expect(entry.provider).toBe(captured?.provider)
      expect(entry.modelCandidateCount).toBe(captured?.modelCandidateCount)
      expect(entry.fallbackCandidateCount).toBe(captured?.fallbackCandidateCount)
      expect(entry.durationMs).toBe(captured?.durationMs)
    }

    expect(objective.summary.totalMaxLengthViolations).toBe(
      objective.perCase.reduce((total, entry) => total + entry.maxLengthViolations.length, 0),
    )
    expect(objective.summary.totalMalformedOrUnsafeFlags).toBe(
      objective.perCase.reduce((total, entry) => total + entry.malformedOrUnsafeFlags.length, 0),
    )
    expect(objective.summary.totalExplicitStyleMismatches).toBe(
      objective.perCase.reduce((total, entry) => total + entry.explicitStyleMismatches.length, 0),
    )
    expect(objective.summary.totalExactSameCaseProviderOverlap).toBe(
      objective.perCase.reduce(
        (total, entry) => total + entry.exactSameCaseProviderOverlap.length,
        0,
      ),
    )
  })
})
