import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

interface CaptureCase {
  caseId: string
  vibeGroup: string
  brief: string
  canonicalStyle: string
  canonicalCreativity: string
  maxLength: number
  payload: Record<string, JsonValue>
  canonicalPayloadSha256: string
  capturedAt: string
  responseCount: number
  normalizedResponseSha256: string
  first16Names: string[]
}

interface CaptureManifest {
  rawResponseBodiesRetained: boolean
  seedReplayVerified: boolean
  cases: CaptureCase[]
}

interface EvaluatorCase {
  presentationOrder: number
  caseId: string
  brief: string
  style: string
  creativity: string
  maxLength: number
  batchA: string[] | null
  batchB: string[] | null
}

interface EvaluatorPack {
  status: string
  cases: EvaluatorCase[]
}

interface RevealAssignment {
  caseId: string
  A: "Namelix" | "NamoLux"
  B: "Namelix" | "NamoLux"
}

interface ProviderReveal {
  randomizationSeed: string
  assignments: RevealAssignment[]
}

const fixtureDirectory = resolve(
  process.cwd(),
  "tests/generator-quality/benchmarks/namelix-2026-07-14",
)

const captureRaw = readFileSync(resolve(fixtureDirectory, "capture-manifest.json"), "utf8")
const evaluatorRaw = readFileSync(resolve(fixtureDirectory, "evaluator-pack.partial.json"), "utf8")
const revealRaw = readFileSync(resolve(fixtureDirectory, "provider-reveal.json"), "utf8")

const capture = JSON.parse(captureRaw) as CaptureManifest
const evaluator = JSON.parse(evaluatorRaw) as EvaluatorPack
const reveal = JSON.parse(revealRaw) as ProviderReveal

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    )
  }
  return value
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function assertUniqueNames(names: string[], caseId: string) {
  expect(names, `${caseId}: candidate count`).toHaveLength(16)
  expect(
    new Set(names.map((name) => name.toLocaleLowerCase("en-GB"))).size,
    `${caseId}: case-insensitive uniqueness`,
  ).toBe(16)
  for (const name of names) {
    expect(name, `${caseId}: non-empty name`).toBe(name.trim())
    expect(name.length, `${caseId}: non-empty name`).toBeGreaterThan(0)
  }
}

describe("14 July 2026 blinded generator benchmark evidence", () => {
  it("freezes twelve complete, unique captured batches with reproducible payload hashes", () => {
    expect(capture.rawResponseBodiesRetained).toBe(false)
    expect(capture.seedReplayVerified).toBe(false)
    expect(capture.cases).toHaveLength(12)

    const caseIds = capture.cases.map((entry) => entry.caseId)
    expect(new Set(caseIds).size).toBe(12)

    const vibeCounts = new Map<string, number>()
    const creativityCounts = new Map<string, number>()
    for (const entry of capture.cases) {
      vibeCounts.set(entry.vibeGroup, (vibeCounts.get(entry.vibeGroup) || 0) + 1)
      creativityCounts.set(
        entry.canonicalCreativity,
        (creativityCounts.get(entry.canonicalCreativity) || 0) + 1,
      )

      expect(entry.payload.description).toBe(entry.brief)
      expect(entry.payload.max_length).toBe(entry.maxLength)
      expect(entry.responseCount).toBeGreaterThanOrEqual(16)
      expect(Number.isFinite(Date.parse(entry.capturedAt))).toBe(true)
      expect(entry.normalizedResponseSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(entry.canonicalPayloadSha256).toBe(
        sha256(JSON.stringify(canonicalize(entry.payload))),
      )
      assertUniqueNames(entry.first16Names, entry.caseId)
    }

    expect(Object.fromEntries([...vibeCounts].sort())).toEqual({
      bold: 2,
      clean: 2,
      friendly: 2,
      playful: 2,
      premium: 2,
      tech: 2,
    })
    expect(Object.fromEntries([...creativityCounts].sort())).toEqual({
      Balanced: 4,
      Direct: 4,
      Exploratory: 4,
    })
  })

  it("keeps the partial evaluator pack provider-neutral and internally consistent", () => {
    expect(evaluatorRaw).not.toMatch(/namelix|namolux/i)
    expect(evaluator.status).toBe("awaiting_second_batch")
    expect(evaluator.cases).toHaveLength(12)
    expect(evaluator.cases.map((entry) => entry.presentationOrder)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    )

    const captureById = new Map(capture.cases.map((entry) => [entry.caseId, entry]))
    for (const entry of evaluator.cases) {
      const source = captureById.get(entry.caseId)
      expect(source, `${entry.caseId}: captured source`).toBeDefined()
      expect(entry.brief).toBe(source?.brief)
      expect(entry.style).toBe(source?.canonicalStyle)
      expect(entry.creativity).toBe(source?.canonicalCreativity)
      expect(entry.maxLength).toBe(source?.maxLength)

      const populated = [entry.batchA, entry.batchB].filter(
        (batch): batch is string[] => batch !== null,
      )
      expect(populated, `${entry.caseId}: exactly one frozen side`).toHaveLength(1)
      expect(populated[0]).toEqual(source?.first16Names)
      assertUniqueNames(populated[0], entry.caseId)
    }
  })

  it("derives the sealed case order and balanced provider reveal deterministically", () => {
    const caseIds = capture.cases.map((entry) => entry.caseId)
    const expectedCaseOrder = [...caseIds].sort((left, right) =>
      sha256(`${reveal.randomizationSeed}|${left}|case-order`).localeCompare(
        sha256(`${reveal.randomizationSeed}|${right}|case-order`),
      ),
    )
    expect(evaluator.cases.map((entry) => entry.caseId)).toEqual(expectedCaseOrder)

    expect(reveal.assignments).toHaveLength(12)
    expect(new Set(reveal.assignments.map((entry) => entry.caseId))).toEqual(new Set(caseIds))

    const providerRanking = [...caseIds].sort((left, right) =>
      sha256(`${reveal.randomizationSeed}|${left}|provider-order`).localeCompare(
        sha256(`${reveal.randomizationSeed}|${right}|provider-order`),
      ),
    )
    const namoLuxInA = new Set(providerRanking.slice(0, 6))

    for (const assignment of reveal.assignments) {
      const expectedA = namoLuxInA.has(assignment.caseId) ? "NamoLux" : "Namelix"
      expect(assignment.A, `${assignment.caseId}: A assignment`).toBe(expectedA)
      expect(new Set([assignment.A, assignment.B])).toEqual(new Set(["Namelix", "NamoLux"]))

      const evaluatorCase = evaluator.cases.find((entry) => entry.caseId === assignment.caseId)
      const capturedSide = assignment.A === "Namelix" ? evaluatorCase?.batchA : evaluatorCase?.batchB
      expect(capturedSide, `${assignment.caseId}: frozen list is on the revealed side`).toEqual(
        capture.cases.find((entry) => entry.caseId === assignment.caseId)?.first16Names,
      )
    }

    expect(reveal.assignments.filter((entry) => entry.A === "NamoLux")).toHaveLength(6)
    expect(reveal.assignments.filter((entry) => entry.A === "Namelix")).toHaveLength(6)
  })
})
