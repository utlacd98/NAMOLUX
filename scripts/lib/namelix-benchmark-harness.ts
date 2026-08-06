import { createHash } from "node:crypto"

export type Provider = "Namelix" | "NamoLux"
export type Side = "A" | "B"

type DimensionLimits = Record<string, number>

export interface BenchmarkProtocol {
  schemaVersion: 1
  benchmarkVersion: string
  packId: string
  requiredRaters: 3
  raw: {
    dimensions: DimensionLimits
    outrightWinMinimumMedianAdvantage: number
    matchMaximumAbsoluteMedianDifference: number
    matchOrBeatMinimumMedianDifference: number
    minimumForcedPreferencesForWin: number
    releaseMinimumOutrightWins: number
    releaseMinimumMatchOrBeat: number
    releaseMaximumCriticalQualityLosses: number
  }
  explanations: {
    packId: string
    randomizationSeed: string
    dimensions: DimensionLimits
    winMinimumMedianAdvantage: number
    minimumForcedPreferencesForWin: number
    releaseMinimumWins: number
  }
  equivalentControls: {
    namelixStyle: Record<string, string>
    namoluxStyle: Record<string, string>
    namelixCreativity: Record<string, string>
    namoluxCreativity: Record<string, string>
  }
}

export interface NamelixCaptureCase {
  caseId: string
  brief: string
  canonicalStyle: string
  canonicalCreativity: string
  maxLength: number
  payload: Record<string, unknown>
  first16Names: string[]
}

export interface NamelixCapture {
  benchmarkVersion: string
  cases: NamelixCaptureCase[]
}

export interface NamoLuxCandidate {
  name: string
  rationale: string
}

export interface NamoLuxCaptureCase {
  caseId: string
  brief: string
  canonicalStyle: string
  canonicalCreativity: string
  style: string
  creativity: string
  maxLength: number
  capturedAt: string
  candidates: NamoLuxCandidate[]
}

export interface NamoLuxCapture {
  benchmarkVersion: string
  generatorImplementationFiles: string[]
  generatorImplementationSha256: string
  cases: NamoLuxCaptureCase[]
}

export interface NamoLuxObjectiveReport {
  schemaVersion: number
  benchmarkVersion: string
  provenance?: {
    captureManifestSha256?: string
    generatorImplementationSha256?: string
  }
  summary: {
    cases: number
    gates: Record<string, unknown>
  }
}

export interface BlindRawCase {
  presentationOrder: number
  caseId: string
  brief: string
  style: string
  creativity: string
  maxLength: number
  batchA: string[]
  batchB: string[]
}

export interface BlindRawPack {
  schemaVersion: number
  packId: string
  cases: BlindRawCase[]
}

export interface RevealAssignment {
  caseId: string
  A: Provider
  B: Provider
}

export interface ProviderReveal {
  assignments: RevealAssignment[]
}

export interface RawBatchRating {
  relevance: number
  pronounceability: number
  distinctiveness: number
  controlFit: number
  shortlistDepth: number
  shortlistWorthyCount: number
  topTwoNames: string[]
  criticalDefect: string | null
}

export interface RawRatingCase {
  presentationOrder: number
  caseId: string
  batchA: RawBatchRating
  batchB: RawBatchRating
  forcedPreference: Side | "Tie"
  confidence: number
  notes: string
}

export interface RawScorecard {
  schemaVersion: number
  packId: string
  raterId: string
  completedAt: string
  cases: RawRatingCase[]
}

interface FinalistTally {
  name: string
  points: number
  nominations: number
  originalIndex: number
}

interface BatchRawAggregate {
  medianScore: number
  raterScores: Array<{ raterId: string; score: number }>
  criticalDefects: Array<{ raterId: string; detail: string }>
  finalistTallies: FinalistTally[]
  finalists: string[]
}

export interface RawAggregateCase {
  presentationOrder: number
  caseId: string
  brief: string
  style: string
  creativity: string
  maxLength: number
  providers: Record<Provider, BatchRawAggregate>
  namoluxMedianAdvantage: number
  forcedPreferences: Record<Provider | "Tie", number>
  outrightNamoLuxWin: boolean
  match: boolean
  matchOrBeat: boolean
  criticalQualityLoss: boolean
}

export interface RawAggregateReport {
  schemaVersion: 1
  status: "raw_scores_frozen"
  packId: string
  benchmarkVersion: string
  rawFreezeId: string
  generatedAt: string
  provenance: {
    evaluatorPackSha256: string
    providerRevealSha256: string
    namelixCaptureSha256?: string
    namoluxCaptureSha256?: string
    scorecards: Array<{ raterId: string; sha256: string }>
  }
  summary: {
    cases: number
    outrightNamoLuxWins: number
    matches: number
    matchOrBeat: number
    criticalQualityLosses: number
    gates: {
      outrightWinsAtLeastEight: boolean
      matchOrBeatAtLeastTen: boolean
      noCriticalQualityLoss: boolean
      rawReleaseGatePassed: boolean
    }
  }
  cases: RawAggregateCase[]
}

export interface ExplanationItem {
  name: string
  explanation: string | null
  capturedAt: string | null
  source: "frozen_generation_rationale" | "pending_name_specific_feedback" | "name_specific_feedback"
}

export interface SealedExplanationCapture {
  schemaVersion: 1
  status: "awaiting_namelix_feedback" | "complete"
  rawFreezeId: string
  warning: string
  cases: Array<{
    caseId: string
    providers: Record<Provider, ExplanationItem[]>
  }>
}

export interface BlindExplanationCase {
  presentationOrder: number
  caseId: string
  brief: string
  style: string
  creativity: string
  setA: Array<{ name: string; explanation: string }>
  setB: Array<{ name: string; explanation: string }>
}

export interface BlindExplanationPack {
  schemaVersion: 1
  packId: string
  rawFreezeId: string
  instructions: string
  cases: BlindExplanationCase[]
}

export interface ExplanationReveal {
  schemaVersion: 1
  packId: string
  rawFreezeId: string
  randomizationSeed: string
  assignments: RevealAssignment[]
}

export interface ExplanationBatchRating {
  briefSpecificity: number
  constructionClarity: number
  positioningUsefulness: number
  evidenceHonesty: number
  decisionActionability: number
}

export interface ExplanationRatingCase {
  presentationOrder: number
  caseId: string
  setA: ExplanationBatchRating
  setB: ExplanationBatchRating
  forcedPreference: Side | "Tie"
  confidence: number
  notes: string
}

export interface ExplanationScorecard {
  schemaVersion: 1
  packId: string
  rawFreezeId: string
  raterId: string
  completedAt: string
  cases: ExplanationRatingCase[]
}

export interface ExplanationAggregateCase {
  presentationOrder: number
  caseId: string
  providers: Record<Provider, {
    medianScore: number
    raterScores: Array<{ raterId: string; score: number }>
  }>
  namoluxMedianAdvantage: number
  forcedPreferences: Record<Provider | "Tie", number>
  namoluxWin: boolean
}

export interface FinalBenchmarkReport {
  schemaVersion: 1
  status: "complete"
  packId: string
  explanationPackId: string
  rawFreezeId: string
  generatedAt: string
  provenance: {
    explanationPackSha256: string
    explanationRevealSha256: string
    explanationScorecards: Array<{ raterId: string; sha256: string }>
  }
  counts: {
    outrightNamoLuxWins: number
    matchOrBeat: number
    criticalQualityLosses: number
    explanationWins: number
  }
  gates: {
    outrightWinsAtLeastEight: boolean
    matchOrBeatAtLeastTen: boolean
    explanationWinsAtLeastTen: boolean
    noCriticalQualityLoss: boolean
    overallReleaseGatePassed: boolean
  }
  rawCases: RawAggregateCase[]
  explanationCases: ExplanationAggregateCase[]
}

const PROVIDER_LABEL_PATTERN = /namelix|namolux/i

const RAW_BATCH_KEYS = [
  "relevance",
  "pronounceability",
  "distinctiveness",
  "controlFit",
  "shortlistDepth",
  "shortlistWorthyCount",
  "topTwoNames",
  "criticalDefect",
] as const

const RAW_CASE_KEYS = [
  "presentationOrder",
  "caseId",
  "batchA",
  "batchB",
  "forcedPreference",
  "confidence",
  "notes",
] as const

const RAW_SCORECARD_KEYS = [
  "schemaVersion",
  "packId",
  "raterId",
  "completedAt",
  "cases",
] as const

const EXPLANATION_SCORECARD_KEYS = [
  "schemaVersion",
  "packId",
  "rawFreezeId",
  "raterId",
  "completedAt",
  "cases",
] as const

const EXPLANATION_CASE_KEYS = [
  "presentationOrder",
  "caseId",
  "setA",
  "setB",
  "forcedPreference",
  "confidence",
  "notes",
] as const

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function normalizeName(value: string): string {
  return value.toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}]/gu, "")
}

function ratingNameKey(value: string): string {
  return value.trim().toLocaleLowerCase("en-GB")
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string) {
  const actual = Object.keys(value).sort()
  const expected = [...allowed].sort()
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${path}: unexpected or missing fields`)
}

function assertIsoDate(value: unknown, path: string): asserts value is string {
  assert(typeof value === "string" && Number.isFinite(Date.parse(value)), `${path}: invalid ISO date`)
}

function assertIntegerInRange(value: unknown, minimum: number, maximum: number, path: string) {
  assert(
    typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum,
    `${path}: expected an integer from ${minimum} to ${maximum}`,
  )
}

function assertNoProviderLabels(value: unknown, path: string) {
  const text = stableJson(value)
  assert(!PROVIDER_LABEL_PATTERN.test(text), `${path}: provider label leaked into blind material`)
}

function assertUniqueRaters(scorecards: Array<{ raterId: string }>, expected: number) {
  assert(scorecards.length === expected, `expected exactly ${expected} completed scorecards`)
  const ids = scorecards.map((entry) => entry.raterId.trim())
  assert(ids.every(Boolean), "every scorecard requires a non-empty raterId")
  assert(new Set(ids).size === ids.length, "raterId values must be unique")
}

function sideForProvider(assignment: RevealAssignment, provider: Provider): Side {
  return assignment.A === provider ? "A" : "B"
}

function providerForSide(assignment: RevealAssignment, side: Side): Provider {
  return assignment[side]
}

function scoreDimensions(value: Record<string, unknown>, limits: DimensionLimits, path: string): number {
  let total = 0
  for (const [dimension, maximum] of Object.entries(limits)) {
    assertIntegerInRange(value[dimension], 0, maximum, `${path}.${dimension}`)
    total += value[dimension] as number
  }
  return total
}

export function validateEquivalentControls(
  protocol: BenchmarkProtocol,
  namelix: NamelixCapture,
  namolux: NamoLuxCapture,
  pack: BlindRawPack,
): { pass: boolean; errors: string[]; casesChecked: number } {
  const errors: string[] = []
  const check = (condition: unknown, message: string) => {
    if (!condition) errors.push(message)
  }
  check(namelix.benchmarkVersion === protocol.benchmarkVersion, "Namelix benchmark version differs")
  check(namolux.benchmarkVersion === protocol.benchmarkVersion, "NamoLux benchmark version differs")
  check(pack.packId === protocol.packId, "blind pack ID differs")
  check(namelix.cases.length === 12, "Namelix capture must contain twelve cases")
  check(namolux.cases.length === 12, "NamoLux capture must contain twelve cases")
  check(pack.cases.length === 12, "blind pack must contain twelve cases")

  const namoluxById = new Map(namolux.cases.map((entry) => [entry.caseId, entry]))
  const packById = new Map(pack.cases.map((entry) => [entry.caseId, entry]))
  for (const source of namelix.cases) {
    const comparison = namoluxById.get(source.caseId)
    const blind = packById.get(source.caseId)
    check(Boolean(comparison), `${source.caseId}: missing NamoLux case`)
    check(Boolean(blind), `${source.caseId}: missing blind case`)
    const expectedNamelixStyle = protocol.equivalentControls.namelixStyle[source.canonicalStyle]
    const expectedNamoLuxStyle = protocol.equivalentControls.namoluxStyle[source.canonicalStyle]
    const expectedNamelixCreativity = protocol.equivalentControls.namelixCreativity[source.canonicalCreativity]
    const expectedNamoLuxCreativity = protocol.equivalentControls.namoluxCreativity[source.canonicalCreativity]
    check(Boolean(expectedNamelixStyle && expectedNamoLuxStyle), `${source.caseId}: unmapped style`)
    check(Boolean(expectedNamelixCreativity && expectedNamoLuxCreativity), `${source.caseId}: unmapped creativity`)
    check(source.payload.description === source.brief, `${source.caseId}: Namelix brief differs`)
    check(source.payload.max_length === source.maxLength, `${source.caseId}: Namelix max length differs`)
    check(source.payload.style === expectedNamelixStyle, `${source.caseId}: Namelix style is not equivalent`)
    check(source.payload.random === expectedNamelixCreativity, `${source.caseId}: Namelix creativity is not equivalent`)
    check(source.payload.require_domains === false, `${source.caseId}: domain filtering must be disabled`)
    if (comparison) {
      check(comparison.brief === source.brief, `${source.caseId}: NamoLux brief differs`)
      check(comparison.canonicalStyle === source.canonicalStyle, `${source.caseId}: canonical style differs`)
      check(comparison.canonicalCreativity === source.canonicalCreativity, `${source.caseId}: canonical creativity differs`)
      check(comparison.style === expectedNamoLuxStyle, `${source.caseId}: NamoLux style is not equivalent`)
      check(comparison.creativity === expectedNamoLuxCreativity, `${source.caseId}: NamoLux creativity is not equivalent`)
      check(comparison.maxLength === source.maxLength, `${source.caseId}: NamoLux max length differs`)
    }
    if (blind) {
      check(blind.brief === source.brief, `${source.caseId}: blind brief differs`)
      check(blind.style === source.canonicalStyle, `${source.caseId}: blind style differs`)
      check(blind.creativity === source.canonicalCreativity, `${source.caseId}: blind creativity differs`)
      check(blind.maxLength === source.maxLength, `${source.caseId}: blind max length differs`)
    }
  }
  return { pass: errors.length === 0, errors, casesChecked: namelix.cases.length }
}

export function validateCaptureImplementation(
  namolux: NamoLuxCapture,
  currentImplementationSha256: string,
): { pass: boolean; errors: string[] } {
  const errors: string[] = []
  if (!/^[a-f0-9]{64}$/.test(namolux.generatorImplementationSha256)) {
    errors.push("NamoLux capture has no valid implementation hash")
  }
  if (namolux.generatorImplementationSha256 !== currentImplementationSha256) {
    errors.push("NamoLux capture is stale: generator implementation changed after capture")
  }
  return { pass: errors.length === 0, errors }
}

const LEGACY_OBJECTIVE_GATE_KEYS = [
  "candidateContract",
  "maxLength",
  "malformedUnsafeHeuristics",
  "explicitStyleMetadata",
  "modelBackedCasesAtLeast90Percent",
  "crossCaseExactDuplicationAtMost1Percent",
  "p95GenerationAtMost8Seconds",
] as const

const CURRENT_OBJECTIVE_GATE_KEYS = [
  "candidateContract",
  "maxLength",
  "malformedUnsafeHeuristics",
  "explicitStyleMetadata",
  "modelContributionCasesAtLeast90Percent",
  "modelCandidateShareAtLeast25Percent",
  "crossCaseExactDuplicationAtMost1Percent",
  "p95GenerationAtMost8Seconds",
] as const

export function validateObjectiveReleaseGates(
  namolux: NamoLuxCapture,
  objective: NamoLuxObjectiveReport | null,
  options: { required: boolean; requireCurrentSchema?: boolean },
): { pass: boolean; errors: string[] } {
  const errors: string[] = []
  if (!objective) {
    if (options.required) errors.push("fresh benchmark run is missing objective-report.json")
    return { pass: errors.length === 0, errors }
  }
  if (options.requireCurrentSchema && objective.schemaVersion !== 2) {
    errors.push("fresh benchmark objective report must use schema version 2")
  }
  if (objective.benchmarkVersion !== namolux.benchmarkVersion) {
    errors.push("objective report benchmark version differs from the NamoLux capture")
  }
  if (objective.summary?.cases !== namolux.cases.length) {
    errors.push("objective report case count differs from the NamoLux capture")
  }
  const gateKeys = objective.schemaVersion >= 2
    ? CURRENT_OBJECTIVE_GATE_KEYS
    : LEGACY_OBJECTIVE_GATE_KEYS
  for (const key of gateKeys) {
    const value = objective.summary?.gates?.[key]
    if (typeof value !== "boolean") errors.push(`objective release gate ${key} is missing or invalid`)
    else if (!value) errors.push(`objective release gate failed: ${key}`)
  }
  if (objective.schemaVersion >= 2) {
    const expectedCaptureHash = sha256(stableJson(namolux))
    if (objective.provenance?.captureManifestSha256 !== expectedCaptureHash) {
      errors.push("objective report belongs to another NamoLux capture")
    }
    if (
      objective.provenance?.generatorImplementationSha256
      !== namolux.generatorImplementationSha256
    ) {
      errors.push("objective report generator implementation hash differs")
    }
  }
  return { pass: errors.length === 0, errors }
}

export function validateFrozenProviderAssignments(
  namelix: NamelixCapture,
  namolux: NamoLuxCapture,
  pack: BlindRawPack,
  reveal: ProviderReveal,
): { pass: boolean; errors: string[] } {
  const errors: string[] = []
  const namelixById = new Map(namelix.cases.map((entry) => [entry.caseId, entry]))
  const namoluxById = new Map(namolux.cases.map((entry) => [entry.caseId, entry]))
  const assignmentById = new Map(reveal.assignments.map((entry) => [entry.caseId, entry]))
  if (assignmentById.size !== pack.cases.length) errors.push("provider reveal case count differs")
  for (const entry of pack.cases) {
    const assignment = assignmentById.get(entry.caseId)
    const sourceNamelix = namelixById.get(entry.caseId)?.first16Names
    const sourceNamoLux = namoluxById.get(entry.caseId)?.candidates.map((candidate) => candidate.name)
    if (!assignment || !sourceNamelix || !sourceNamoLux) {
      errors.push(`${entry.caseId}: missing capture or reveal assignment`)
      continue
    }
    const expected = (provider: Provider) => provider === "NamoLux" ? sourceNamoLux : sourceNamelix
    if (stableJson(entry.batchA) !== stableJson(expected(assignment.A))) {
      errors.push(`${entry.caseId}: batch A does not match its frozen provider capture`)
    }
    if (stableJson(entry.batchB) !== stableJson(expected(assignment.B))) {
      errors.push(`${entry.caseId}: batch B does not match its frozen provider capture`)
    }
  }
  const namoluxInA = reveal.assignments.filter((entry) => entry.A === "NamoLux").length
  if (namoluxInA !== pack.cases.length / 2) errors.push("provider reveal is not balanced 6/6")
  return { pass: errors.length === 0, errors }
}

export function validateBlindRawPack(pack: BlindRawPack) {
  assert(pack.cases.length === 12, "blind raw pack must contain twelve cases")
  assertNoProviderLabels(pack, "blind raw pack")
  for (const [index, entry] of pack.cases.entries()) {
    assertExactKeys(
      entry as unknown as Record<string, unknown>,
      ["presentationOrder", "caseId", "brief", "style", "creativity", "maxLength", "batchA", "batchB"],
      `blind raw case ${entry.caseId}`,
    )
    assert(entry.presentationOrder === index + 1, `${entry.caseId}: presentation order differs`)
    for (const [side, names] of [["A", entry.batchA], ["B", entry.batchB]] as const) {
      assert(names.length === 16, `${entry.caseId}.${side}: expected sixteen names`)
      assert(new Set(names.map(ratingNameKey)).size === 16, `${entry.caseId}.${side}: duplicate name`)
    }
  }
}

export function validateRawScorecard(
  protocol: BenchmarkProtocol,
  pack: BlindRawPack,
  scorecard: RawScorecard,
) {
  assertNoProviderLabels(scorecard, `raw scorecard ${scorecard.raterId || "unknown"}`)
  assertExactKeys(scorecard as unknown as Record<string, unknown>, RAW_SCORECARD_KEYS, "raw scorecard")
  assert(scorecard.packId === pack.packId, "raw scorecard packId differs")
  assert(typeof scorecard.raterId === "string" && scorecard.raterId.trim().length > 0, "raw scorecard requires raterId")
  assertIsoDate(scorecard.completedAt, `raw scorecard ${scorecard.raterId}.completedAt`)
  assert(scorecard.cases.length === pack.cases.length, `${scorecard.raterId}: wrong case count`)
  for (const [index, rating] of scorecard.cases.entries()) {
    const source = pack.cases[index]
    assertExactKeys(rating as unknown as Record<string, unknown>, RAW_CASE_KEYS, `${scorecard.raterId}.${rating.caseId}`)
    assert(rating.presentationOrder === source.presentationOrder, `${rating.caseId}: presentation order differs`)
    assert(rating.caseId === source.caseId, `${rating.caseId}: case order differs`)
    for (const side of ["A", "B"] as const) {
      const batch = rating[`batch${side}`]
      const names = source[`batch${side}`]
      assertExactKeys(batch as unknown as Record<string, unknown>, RAW_BATCH_KEYS, `${rating.caseId}.batch${side}`)
      scoreDimensions(batch as unknown as Record<string, unknown>, protocol.raw.dimensions, `${rating.caseId}.batch${side}`)
      assertIntegerInRange(batch.shortlistWorthyCount, 0, 16, `${rating.caseId}.batch${side}.shortlistWorthyCount`)
      assert(batch.topTwoNames.length === 2, `${rating.caseId}.batch${side}: exactly two finalists required`)
      assert(new Set(batch.topTwoNames.map(ratingNameKey)).size === 2, `${rating.caseId}.batch${side}: finalists must be unique`)
      const allowedNames = new Set(names.map(ratingNameKey))
      assert(
        batch.topTwoNames.every((name) => allowedNames.has(ratingNameKey(name))),
        `${rating.caseId}.batch${side}: finalist is not in the frozen batch`,
      )
      assert(
        batch.criticalDefect === null
          || (typeof batch.criticalDefect === "string" && batch.criticalDefect.trim().length > 0),
        `${rating.caseId}.batch${side}: invalid critical defect`,
      )
    }
    assert(["A", "B", "Tie"].includes(rating.forcedPreference), `${rating.caseId}: invalid preference`)
    assertIntegerInRange(rating.confidence, 1, 5, `${rating.caseId}.confidence`)
    assert(typeof rating.notes === "string", `${rating.caseId}: notes must be text`)
  }
}

function batchTotal(batch: RawBatchRating, dimensions: DimensionLimits): number {
  return Object.keys(dimensions).reduce(
    (total, dimension) => total + (batch as unknown as Record<string, number>)[dimension],
    0,
  )
}

function aggregateRawBatch(
  side: Side,
  names: string[],
  ratings: RawScorecard[],
  caseIndex: number,
  dimensions: DimensionLimits,
): BatchRawAggregate {
  const raterScores = ratings.map((scorecard) => ({
    raterId: scorecard.raterId,
    score: batchTotal(scorecard.cases[caseIndex][`batch${side}`], dimensions),
  }))
  const criticalDefects = ratings.flatMap((scorecard) => {
    const detail = scorecard.cases[caseIndex][`batch${side}`].criticalDefect
    return detail ? [{ raterId: scorecard.raterId, detail }] : []
  })
  const tallies = new Map<string, FinalistTally>()
  const canonicalByName = new Map(names.map((name, index) => [ratingNameKey(name), { name, index }]))
  for (const scorecard of ratings) {
    scorecard.cases[caseIndex][`batch${side}`].topTwoNames.forEach((name, rank) => {
      const normalized = ratingNameKey(name)
      const source = canonicalByName.get(normalized)
      assert(source, `${scorecard.raterId}: nominated name disappeared from ${side}`)
      const current = tallies.get(normalized) || {
        name: source.name,
        points: 0,
        nominations: 0,
        originalIndex: source.index,
      }
      current.points += rank === 0 ? 2 : 1
      current.nominations += 1
      tallies.set(normalized, current)
    })
  }
  const finalistTallies = [...tallies.values()].sort(
    (left, right) => right.points - left.points
      || right.nominations - left.nominations
      || left.originalIndex - right.originalIndex,
  )
  return {
    medianScore: median(raterScores.map((entry) => entry.score)),
    raterScores,
    criticalDefects,
    finalistTallies,
    finalists: finalistTallies.slice(0, 2).map((entry) => entry.name),
  }
}

export function aggregateRawRatings(
  protocol: BenchmarkProtocol,
  pack: BlindRawPack,
  reveal: ProviderReveal,
  scorecards: RawScorecard[],
  generatedAt = new Date().toISOString(),
  captureHashes?: { namelixCaptureSha256: string; namoluxCaptureSha256: string },
): RawAggregateReport {
  validateBlindRawPack(pack)
  assertUniqueRaters(scorecards, protocol.requiredRaters)
  const orderedScorecards = [...scorecards].sort((left, right) => left.raterId.localeCompare(right.raterId))
  orderedScorecards.forEach((scorecard) => validateRawScorecard(protocol, pack, scorecard))
  const revealById = new Map(reveal.assignments.map((entry) => [entry.caseId, entry]))
  assert(revealById.size === pack.cases.length, "provider reveal case count differs")
  const cases = pack.cases.map((entry, caseIndex): RawAggregateCase => {
    const assignment = revealById.get(entry.caseId)
    assert(assignment, `${entry.caseId}: missing provider reveal`)
    assert(new Set([assignment.A, assignment.B]).size === 2, `${entry.caseId}: invalid provider reveal`)
    const aggregates = {
      A: aggregateRawBatch("A", entry.batchA, orderedScorecards, caseIndex, protocol.raw.dimensions),
      B: aggregateRawBatch("B", entry.batchB, orderedScorecards, caseIndex, protocol.raw.dimensions),
    }
    const providers = {
      Namelix: aggregates[sideForProvider(assignment, "Namelix")],
      NamoLux: aggregates[sideForProvider(assignment, "NamoLux")],
    }
    const namoluxMedianAdvantage = providers.NamoLux.medianScore - providers.Namelix.medianScore
    const forcedPreferences: Record<Provider | "Tie", number> = { Namelix: 0, NamoLux: 0, Tie: 0 }
    for (const scorecard of orderedScorecards) {
      const preference = scorecard.cases[caseIndex].forcedPreference
      if (preference === "Tie") forcedPreferences.Tie += 1
      else forcedPreferences[providerForSide(assignment, preference)] += 1
    }
    const namoluxCritical = providers.NamoLux.criticalDefects.length > 0
    const anyCritical = namoluxCritical || providers.Namelix.criticalDefects.length > 0
    return {
      presentationOrder: entry.presentationOrder,
      caseId: entry.caseId,
      brief: entry.brief,
      style: entry.style,
      creativity: entry.creativity,
      maxLength: entry.maxLength,
      providers,
      namoluxMedianAdvantage,
      forcedPreferences,
      outrightNamoLuxWin:
        namoluxMedianAdvantage >= protocol.raw.outrightWinMinimumMedianAdvantage
        && forcedPreferences.NamoLux >= protocol.raw.minimumForcedPreferencesForWin
        && !namoluxCritical,
      match:
        Math.abs(namoluxMedianAdvantage) <= protocol.raw.matchMaximumAbsoluteMedianDifference
        && !anyCritical,
      matchOrBeat: namoluxMedianAdvantage >= protocol.raw.matchOrBeatMinimumMedianDifference,
      criticalQualityLoss: namoluxCritical,
    }
  })
  const summaryWithoutGates = {
    cases: cases.length,
    outrightNamoLuxWins: cases.filter((entry) => entry.outrightNamoLuxWin).length,
    matches: cases.filter((entry) => entry.match).length,
    matchOrBeat: cases.filter((entry) => entry.matchOrBeat).length,
    criticalQualityLosses: cases.filter((entry) => entry.criticalQualityLoss).length,
  }
  const gates = {
    outrightWinsAtLeastEight:
      summaryWithoutGates.outrightNamoLuxWins >= protocol.raw.releaseMinimumOutrightWins,
    matchOrBeatAtLeastTen:
      summaryWithoutGates.matchOrBeat >= protocol.raw.releaseMinimumMatchOrBeat,
    noCriticalQualityLoss:
      summaryWithoutGates.criticalQualityLosses <= protocol.raw.releaseMaximumCriticalQualityLosses,
    rawReleaseGatePassed: false,
  }
  gates.rawReleaseGatePassed = gates.outrightWinsAtLeastEight
    && gates.matchOrBeatAtLeastTen
    && gates.noCriticalQualityLoss
  const provenance = {
    evaluatorPackSha256: sha256(stableJson(pack)),
    providerRevealSha256: sha256(stableJson(reveal)),
    ...captureHashes,
    scorecards: orderedScorecards
      .map((entry) => ({ raterId: entry.raterId, sha256: sha256(stableJson(entry)) }))
      .sort((left, right) => left.raterId.localeCompare(right.raterId)),
  }
  const rawFreezeId = sha256(stableJson({
    packId: pack.packId,
    benchmarkVersion: protocol.benchmarkVersion,
    provenance,
    cases,
  }))
  return {
    schemaVersion: 1,
    status: "raw_scores_frozen",
    packId: pack.packId,
    benchmarkVersion: protocol.benchmarkVersion,
    rawFreezeId,
    generatedAt,
    provenance,
    summary: { ...summaryWithoutGates, gates },
    cases,
  }
}

export function buildExplanationCaptureTemplate(
  raw: RawAggregateReport,
  namolux: NamoLuxCapture,
): SealedExplanationCapture {
  if (raw.provenance.namoluxCaptureSha256) {
    assert(
      raw.provenance.namoluxCaptureSha256 === sha256(stableJson(namolux)),
      "frozen raw ratings belong to another NamoLux capture",
    )
  }
  const capturedById = new Map(namolux.cases.map((entry) => [entry.caseId, entry]))
  const cases = raw.cases.map((entry) => {
    const captured = capturedById.get(entry.caseId)
    assert(captured, `${entry.caseId}: missing frozen NamoLux rationales`)
    const rationaleByName = new Map(
      captured.candidates.map((candidate) => [normalizeName(candidate.name), candidate.rationale]),
    )
    const namoluxItems = entry.providers.NamoLux.finalists.map((name): ExplanationItem => {
      const rationale = rationaleByName.get(normalizeName(name))
      assert(
        typeof rationale === "string" && rationale.trim().length > 0,
        `${entry.caseId}: missing frozen rationale for ${name}`,
      )
      return {
        name,
        explanation: rationale,
        capturedAt: captured.capturedAt,
        source: "frozen_generation_rationale",
      }
    })
    const namelixItems = entry.providers.Namelix.finalists.map((name): ExplanationItem => ({
      name,
      explanation: null,
      capturedAt: null,
      source: "pending_name_specific_feedback",
    }))
    return {
      caseId: entry.caseId,
      providers: { Namelix: namelixItems, NamoLux: namoluxItems },
    }
  })
  return {
    schemaVersion: 1,
    status: "awaiting_namelix_feedback",
    rawFreezeId: raw.rawFreezeId,
    warning: "SEALED: provider-labelled capture material. Do not give this file or the provider reveal to raw-name or explanation raters.",
    cases,
  }
}

function explanationAssignments(
  protocol: BenchmarkProtocol,
  caseIds: string[],
): RevealAssignment[] {
  const ranked = [...caseIds].sort((left, right) =>
    sha256(`${protocol.explanations.randomizationSeed}|${left}|provider-order`).localeCompare(
      sha256(`${protocol.explanations.randomizationSeed}|${right}|provider-order`),
    ),
  )
  const namoluxInA = new Set(ranked.slice(0, Math.floor(caseIds.length / 2)))
  return caseIds.map((caseId) => ({
    caseId,
    A: namoluxInA.has(caseId) ? "NamoLux" : "Namelix",
    B: namoluxInA.has(caseId) ? "Namelix" : "NamoLux",
  }))
}

export function buildBlindExplanationArtifacts(
  protocol: BenchmarkProtocol,
  raw: RawAggregateReport,
  sealed: SealedExplanationCapture,
): {
  pack: BlindExplanationPack
  reveal: ExplanationReveal
  scorecardTemplate: Omit<ExplanationScorecard, "raterId" | "completedAt"> & {
    raterId: null
    completedAt: null
  }
} {
  assert(sealed.rawFreezeId === raw.rawFreezeId, "explanation capture belongs to another raw freeze")
  assert(sealed.status === "complete", "Namelix feedback capture is not complete")
  assert(sealed.cases.length === raw.cases.length, "sealed explanation case count differs")
  const sealedById = new Map(sealed.cases.map((entry) => [entry.caseId, entry]))
  assert(sealedById.size === sealed.cases.length, "sealed explanation capture has duplicate case IDs")
  const assignments = explanationAssignments(protocol, raw.cases.map((entry) => entry.caseId))
  const assignmentById = new Map(assignments.map((entry) => [entry.caseId, entry]))
  const cases = raw.cases.map((entry): BlindExplanationCase => {
    const captured = sealedById.get(entry.caseId)
    const assignment = assignmentById.get(entry.caseId)
    assert(captured && assignment, `${entry.caseId}: missing explanation material`)
    for (const provider of ["Namelix", "NamoLux"] as const) {
      const items = captured.providers[provider]
      assert(items.length === 2, `${entry.caseId}.${provider}: expected two explanations`)
      assert(
        stableJson(items.map((item) => item.name)) === stableJson(entry.providers[provider].finalists),
        `${entry.caseId}.${provider}: sealed finalists differ from the frozen raw nominations`,
      )
      for (const item of items) {
        assert(typeof item.explanation === "string" && item.explanation.trim().length > 0, `${entry.caseId}.${provider}: missing explanation`)
        assertIsoDate(item.capturedAt, `${entry.caseId}.${provider}.${item.name}.capturedAt`)
        assert(!PROVIDER_LABEL_PATTERN.test(item.explanation), `${entry.caseId}.${provider}: provider label leaked into explanation text`)
        assert(
          item.source === (provider === "NamoLux" ? "frozen_generation_rationale" : "name_specific_feedback"),
          `${entry.caseId}.${provider}: invalid explanation provenance`,
        )
      }
    }
    const blindItems = (provider: Provider) => captured.providers[provider].map((item) => ({
      name: item.name,
      explanation: item.explanation as string,
    }))
    return {
      presentationOrder: entry.presentationOrder,
      caseId: entry.caseId,
      brief: entry.brief,
      style: entry.style,
      creativity: entry.creativity,
      setA: blindItems(assignment.A),
      setB: blindItems(assignment.B),
    }
  })
  const pack: BlindExplanationPack = {
    schemaVersion: 1,
    packId: protocol.explanations.packId,
    rawFreezeId: raw.rawFreezeId,
    instructions: "Score only the provider-neutral explanation sets. Do not open either reveal or any sealed capture file until all explanation scorecards are frozen.",
    cases,
  }
  assertNoProviderLabels(pack, "blind explanation pack")
  const reveal: ExplanationReveal = {
    schemaVersion: 1,
    packId: pack.packId,
    rawFreezeId: raw.rawFreezeId,
    randomizationSeed: protocol.explanations.randomizationSeed,
    assignments,
  }
  const emptyRating = (): Record<string, null> => Object.fromEntries(
    Object.keys(protocol.explanations.dimensions).map((dimension) => [dimension, null]),
  )
  const scorecardTemplate = {
    schemaVersion: 1 as const,
    packId: pack.packId,
    rawFreezeId: raw.rawFreezeId,
    raterId: null,
    completedAt: null,
    cases: cases.map((entry) => ({
      presentationOrder: entry.presentationOrder,
      caseId: entry.caseId,
      setA: emptyRating() as unknown as ExplanationBatchRating,
      setB: emptyRating() as unknown as ExplanationBatchRating,
      forcedPreference: null as unknown as Side | "Tie",
      confidence: null as unknown as number,
      notes: "",
    })),
  }
  assertNoProviderLabels(scorecardTemplate, "blind explanation scorecard template")
  return { pack, reveal, scorecardTemplate }
}

export function validateExplanationScorecard(
  protocol: BenchmarkProtocol,
  pack: BlindExplanationPack,
  scorecard: ExplanationScorecard,
) {
  assertNoProviderLabels(scorecard, `explanation scorecard ${scorecard.raterId || "unknown"}`)
  assertExactKeys(
    scorecard as unknown as Record<string, unknown>,
    EXPLANATION_SCORECARD_KEYS,
    "explanation scorecard",
  )
  assert(scorecard.packId === pack.packId, "explanation scorecard packId differs")
  assert(scorecard.rawFreezeId === pack.rawFreezeId, "explanation scorecard raw freeze differs")
  assert(typeof scorecard.raterId === "string" && scorecard.raterId.trim().length > 0, "explanation scorecard requires raterId")
  assertIsoDate(scorecard.completedAt, `explanation scorecard ${scorecard.raterId}.completedAt`)
  assert(scorecard.cases.length === pack.cases.length, `${scorecard.raterId}: wrong explanation case count`)
  for (const [index, rating] of scorecard.cases.entries()) {
    const source = pack.cases[index]
    assertExactKeys(rating as unknown as Record<string, unknown>, EXPLANATION_CASE_KEYS, `${scorecard.raterId}.${rating.caseId}`)
    assert(rating.presentationOrder === source.presentationOrder, `${rating.caseId}: explanation presentation order differs`)
    assert(rating.caseId === source.caseId, `${rating.caseId}: explanation case order differs`)
    assertExactKeys(
      rating.setA as unknown as Record<string, unknown>,
      Object.keys(protocol.explanations.dimensions),
      `${rating.caseId}.setA`,
    )
    assertExactKeys(
      rating.setB as unknown as Record<string, unknown>,
      Object.keys(protocol.explanations.dimensions),
      `${rating.caseId}.setB`,
    )
    scoreDimensions(rating.setA as unknown as Record<string, unknown>, protocol.explanations.dimensions, `${rating.caseId}.setA`)
    scoreDimensions(rating.setB as unknown as Record<string, unknown>, protocol.explanations.dimensions, `${rating.caseId}.setB`)
    assert(["A", "B", "Tie"].includes(rating.forcedPreference), `${rating.caseId}: invalid explanation preference`)
    assertIntegerInRange(rating.confidence, 1, 5, `${rating.caseId}.confidence`)
    assert(typeof rating.notes === "string", `${rating.caseId}: explanation notes must be text`)
  }
}

function explanationTotal(rating: ExplanationBatchRating, dimensions: DimensionLimits): number {
  return Object.keys(dimensions).reduce(
    (total, dimension) => total + (rating as unknown as Record<string, number>)[dimension],
    0,
  )
}

export function aggregateFinalBenchmark(
  protocol: BenchmarkProtocol,
  raw: RawAggregateReport,
  pack: BlindExplanationPack,
  reveal: ExplanationReveal,
  scorecards: ExplanationScorecard[],
  generatedAt = new Date().toISOString(),
): FinalBenchmarkReport {
  assert(pack.rawFreezeId === raw.rawFreezeId, "explanation pack belongs to another raw freeze")
  assert(reveal.rawFreezeId === raw.rawFreezeId, "explanation reveal belongs to another raw freeze")
  assert(pack.packId === reveal.packId, "explanation pack/reveal IDs differ")
  assertNoProviderLabels(pack, "blind explanation pack")
  const expectedAssignments = explanationAssignments(protocol, pack.cases.map((entry) => entry.caseId))
  assert(
    stableJson(reveal.assignments) === stableJson(expectedAssignments),
    "explanation reveal does not match the frozen independent randomization",
  )
  assertUniqueRaters(scorecards, protocol.requiredRaters)
  const orderedScorecards = [...scorecards].sort((left, right) => left.raterId.localeCompare(right.raterId))
  orderedScorecards.forEach((scorecard) => validateExplanationScorecard(protocol, pack, scorecard))
  const revealById = new Map(reveal.assignments.map((entry) => [entry.caseId, entry]))
  const explanationCases = pack.cases.map((entry, caseIndex): ExplanationAggregateCase => {
    const assignment = revealById.get(entry.caseId)
    assert(assignment, `${entry.caseId}: missing explanation reveal`)
    const scoresBySide = Object.fromEntries(
      (["A", "B"] as const).map((side) => {
        const raterScores = orderedScorecards.map((scorecard) => ({
          raterId: scorecard.raterId,
          score: explanationTotal(scorecard.cases[caseIndex][`set${side}`], protocol.explanations.dimensions),
        }))
        return [side, { medianScore: median(raterScores.map((score) => score.score)), raterScores }]
      }),
    ) as Record<Side, { medianScore: number; raterScores: Array<{ raterId: string; score: number }> }>
    const providers = {
      Namelix: scoresBySide[sideForProvider(assignment, "Namelix")],
      NamoLux: scoresBySide[sideForProvider(assignment, "NamoLux")],
    }
    const forcedPreferences: Record<Provider | "Tie", number> = { Namelix: 0, NamoLux: 0, Tie: 0 }
    for (const scorecard of orderedScorecards) {
      const preference = scorecard.cases[caseIndex].forcedPreference
      if (preference === "Tie") forcedPreferences.Tie += 1
      else forcedPreferences[providerForSide(assignment, preference)] += 1
    }
    const namoluxMedianAdvantage = providers.NamoLux.medianScore - providers.Namelix.medianScore
    return {
      presentationOrder: entry.presentationOrder,
      caseId: entry.caseId,
      providers,
      namoluxMedianAdvantage,
      forcedPreferences,
      namoluxWin:
        namoluxMedianAdvantage >= protocol.explanations.winMinimumMedianAdvantage
        && forcedPreferences.NamoLux >= protocol.explanations.minimumForcedPreferencesForWin,
    }
  })
  const counts = {
    outrightNamoLuxWins: raw.summary.outrightNamoLuxWins,
    matchOrBeat: raw.summary.matchOrBeat,
    criticalQualityLosses: raw.summary.criticalQualityLosses,
    explanationWins: explanationCases.filter((entry) => entry.namoluxWin).length,
  }
  const gates = {
    outrightWinsAtLeastEight: counts.outrightNamoLuxWins >= protocol.raw.releaseMinimumOutrightWins,
    matchOrBeatAtLeastTen: counts.matchOrBeat >= protocol.raw.releaseMinimumMatchOrBeat,
    explanationWinsAtLeastTen: counts.explanationWins >= protocol.explanations.releaseMinimumWins,
    noCriticalQualityLoss: counts.criticalQualityLosses <= protocol.raw.releaseMaximumCriticalQualityLosses,
    overallReleaseGatePassed: false,
  }
  gates.overallReleaseGatePassed = gates.outrightWinsAtLeastEight
    && gates.matchOrBeatAtLeastTen
    && gates.explanationWinsAtLeastTen
    && gates.noCriticalQualityLoss
  return {
    schemaVersion: 1,
    status: "complete",
    packId: raw.packId,
    explanationPackId: pack.packId,
    rawFreezeId: raw.rawFreezeId,
    generatedAt,
    provenance: {
      explanationPackSha256: sha256(stableJson(pack)),
      explanationRevealSha256: sha256(stableJson(reveal)),
      explanationScorecards: orderedScorecards
        .map((entry) => ({ raterId: entry.raterId, sha256: sha256(stableJson(entry)) }))
        .sort((left, right) => left.raterId.localeCompare(right.raterId)),
    },
    counts,
    gates,
    rawCases: raw.cases,
    explanationCases,
  }
}

export function incompleteBenchmarkStatus(
  protocol: BenchmarkProtocol,
  controls: { pass: boolean; errors: string[]; casesChecked: number },
) {
  return {
    schemaVersion: 1,
    status: controls.pass ? "ready_for_three_blind_raw_raters" : "blocked_by_evidence_mismatch",
    controls,
    requiredRatersPerPhase: protocol.requiredRaters,
    nextStep: controls.pass
      ? "Give only evaluator-pack.json and separate copies of rater-scorecard.template.json to three independent raters."
      : "Resolve the reported control mismatch or recapture NamoLux from the final implementation before collecting ratings.",
    counts: {
      outrightNamoLuxWins: null,
      matchOrBeat: null,
      criticalQualityLosses: null,
      explanationWins: null,
    },
    gates: {
      outrightWinsAtLeastEight: null,
      matchOrBeatAtLeastTen: null,
      explanationWinsAtLeastTen: null,
      noCriticalQualityLoss: null,
      overallReleaseGatePassed: null,
    },
    reason: "No result is declared until three valid raw scorecards and three valid explanation scorecards are frozen.",
  }
}
