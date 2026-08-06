import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  hasAiSmellPattern,
  hasMalformedCompoundPattern,
  hasRandomSyllablePattern,
  hasUnsafeBrandMeaning,
} from "../lib/domainGen/filters"
import {
  type QuickGenerateCreativity,
  type QuickGenerateStyle,
  type QuickGenerateVibe,
} from "../lib/domainGen/quickGenerate"
import { generateGroqQuickCandidates } from "../lib/domainGen/quickGenerateGroq"
import { isGibberish } from "../lib/domainGen/realness"
import {
  assessModelContribution,
  GENERATOR_IMPLEMENTATION_FILES,
  hashGeneratorImplementation,
  MIN_GLOBAL_MODEL_CANDIDATE_SHARE,
  MIN_MODEL_CONTRIBUTED_BRIEF_RATE,
} from "./lib/generator-audit-provenance"
import { stableJson } from "./lib/namelix-benchmark-harness"

type Provider = "groq" | "openai" | "vercel_gateway" | "deterministic"

interface SourceCase {
  caseId: string
  vibeGroup: QuickGenerateVibe
  brief: string
  canonicalStyle: string
  canonicalCreativity: string
  maxLength: number
  first16Names: string[]
}

interface SourceCapture {
  benchmarkVersion: string
  cases: SourceCase[]
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

interface PartialEvaluatorPack {
  schemaVersion: number
  packId: string
  status?: string
  instructions?: string
  cases: EvaluatorCase[]
}

interface RevealAssignment {
  caseId: string
  A: "Namelix" | "NamoLux"
  B: "Namelix" | "NamoLux"
}

interface ProviderReveal {
  benchmarkVersion: string
  assignments: RevealAssignment[]
}

interface CapturedCandidate {
  name: string
  rationale: string
  style: string
  fitRoots: string[]
  fitCues: string[]
}

interface CapturedCase {
  caseId: string
  vibeGroup: QuickGenerateVibe
  brief: string
  canonicalStyle: string
  canonicalCreativity: string
  style: QuickGenerateStyle
  creativity: QuickGenerateCreativity
  maxLength: number
  seed: string
  capturedAt: string
  durationMs: number
  provider: Provider
  model: string | null
  providerAttempts: Array<Record<string, unknown>>
  modelBacked: boolean
  modelCandidateCount: number
  fallbackCandidateCount: number
  fallbackReason: string | null
  transportRetryCount: 0
  transportRetryReason: null
  normalizedResponseSha256: string
  candidates: CapturedCandidate[]
}

interface NamoLuxCaptureManifest {
  schemaVersion: 1
  benchmarkVersion: string
  capturedProvider: "NamoLux"
  captureTarget: "current-local-working-tree"
  buildUrl: null
  captureMethod: string
  selectionRule: string
  rawResponseBodiesRetained: true
  normalizedResponseHashSemantics: string
  preferenceProfile: {
    likedStyles: []
    dislikedStyles: []
    preferredSounds: []
    avoidedSounds: []
  }
  gitHead: string
  gitBranch: string
  workingTreeDirty: boolean
  gitStatusSha256: string
  generatorImplementationFiles: string[]
  generatorImplementationSha256: string
  startedAt: string
  completedAt: string | null
  cases: CapturedCase[]
}

const benchmarkDirectory = resolve(
  process.cwd(),
  "tests/generator-quality/benchmarks/namelix-2026-07-14",
)
const outputDirectory = process.env.NAMOLUX_BENCHMARK_OUTPUT_DIR
  ? resolve(process.cwd(), process.env.NAMOLUX_BENCHMARK_OUTPUT_DIR)
  : benchmarkDirectory
mkdirSync(outputDirectory, { recursive: true })
const sourceCapturePath = resolve(benchmarkDirectory, "capture-manifest.json")
const partialPackPath = resolve(benchmarkDirectory, "evaluator-pack.partial.json")
const revealPath = resolve(benchmarkDirectory, "provider-reveal.json")
const outputManifestPath = resolve(outputDirectory, "namolux-capture-manifest.json")
const completedPackPath = resolve(outputDirectory, "evaluator-pack.json")
const objectiveReportPath = resolve(outputDirectory, "objective-report.json")
const scorecardPath = resolve(outputDirectory, "rater-scorecard.template.json")

const implementationFiles = [...GENERATOR_IMPLEMENTATION_FILES]

const styleMap: Record<string, QuickGenerateStyle> = {
  Auto: "auto",
  Brandable: "brandable",
  Evocative: "evocative",
  Compound: "compound",
  "Alternate spelling": "alternate_spelling",
  "Real word": "real_word",
  "Short phrase": "short_phrase",
  "Non-English": "non_english",
}

const creativityMap: Record<string, QuickGenerateCreativity> = {
  Direct: "direct",
  Balanced: "balanced",
  Exploratory: "exploratory",
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex")
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function writeJsonAtomic(path: string, value: unknown) {
  const temporaryPath = `${path}.tmp`
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  renameSync(temporaryPath, path)
}

function git(command: string): string {
  return execFileSync("git", command.split(" "), {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  }).trim()
}

function normaliseName(value: string): string {
  return value.toLocaleLowerCase("en-GB").replace(/[^\p{L}\p{N}]/gu, "")
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
}

function wait(milliseconds: number) {
  return milliseconds > 0
    ? new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
    : Promise.resolve()
}

function createManifest(source: SourceCapture): NamoLuxCaptureManifest {
  const status = git("status --porcelain=v1")
  return {
    schemaVersion: 1,
    benchmarkVersion: source.benchmarkVersion,
    capturedProvider: "NamoLux",
    captureTarget: "current-local-working-tree",
    buildUrl: null,
    captureMethod: "Sequential direct calls to generateGroqQuickCandidates using the exact frozen brief, style, creativity and maximum length; no domains or Founder Signal.",
    selectionRule: "All candidates returned in generation order, capped at 16; no manual filtering, reordering or replacement.",
    rawResponseBodiesRetained: true,
    normalizedResponseHashSemantics: "SHA-256 of compact JSON containing provider, model, counts and the retained candidate name/rationale/style/root records.",
    preferenceProfile: {
      likedStyles: [],
      dislikedStyles: [],
      preferredSounds: [],
      avoidedSounds: [],
    },
    gitHead: git("rev-parse HEAD"),
    gitBranch: git("branch --show-current"),
    workingTreeDirty: status.length > 0,
    gitStatusSha256: sha256(status),
    generatorImplementationFiles: implementationFiles,
    generatorImplementationSha256: hashGeneratorImplementation(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    cases: [],
  }
}

function buildCompletedPack(
  partial: PartialEvaluatorPack,
  reveal: ProviderReveal,
  capturedCases: CapturedCase[],
) {
  const captureById = new Map(capturedCases.map((entry) => [entry.caseId, entry]))
  const revealById = new Map(reveal.assignments.map((entry) => [entry.caseId, entry]))
  return {
    schemaVersion: partial.schemaVersion,
    packId: partial.packId,
    cases: partial.cases.map((entry) => {
      const capture = captureById.get(entry.caseId)
      const assignment = revealById.get(entry.caseId)
      if (!capture || !assignment) throw new Error(`${entry.caseId}: missing completed capture or reveal`)
      const names = capture.candidates.map((candidate) => candidate.name)
      return {
        ...entry,
        batchA: assignment.A === "NamoLux" ? names : entry.batchA,
        batchB: assignment.B === "NamoLux" ? names : entry.batchB,
      }
    }),
  }
}

function buildObjectiveReport(source: SourceCapture, manifest: NamoLuxCaptureManifest) {
  const sourceById = new Map(source.cases.map((entry) => [entry.caseId, entry]))
  const nameCases = new Map<string, Set<string>>()
  const perCase = manifest.cases.map((entry) => {
    const sourceCase = sourceById.get(entry.caseId)
    if (!sourceCase) throw new Error(`${entry.caseId}: missing frozen source case`)
    const normalised = entry.candidates.map((candidate) => normaliseName(candidate.name))
    for (const name of normalised) {
      const cases = nameCases.get(name) || new Set<string>()
      cases.add(entry.caseId)
      nameCases.set(name, cases)
    }
    const competitorNames = new Set(sourceCase.first16Names.map(normaliseName))
    const requestedStyle = styleMap[entry.canonicalStyle]
    const modelContribution = assessModelContribution(
      entry.modelCandidateCount,
      entry.candidates.length,
    )
    return {
      caseId: entry.caseId,
      candidateCount: entry.candidates.length,
      uniqueCandidateCount: new Set(normalised).size,
      modelBacked: entry.modelBacked,
      provider: entry.provider,
      modelCandidateCount: entry.modelCandidateCount,
      fallbackCandidateCount: entry.fallbackCandidateCount,
      modelContribution: {
        candidateSharePercent: Number((modelContribution.modelCandidateShare * 100).toFixed(1)),
        requiredCandidateCount: modelContribution.requiredModelCandidateCount,
        qualifies: modelContribution.qualifies,
      },
      durationMs: entry.durationMs,
      maxLengthViolations: entry.candidates
        .filter((candidate) => normaliseName(candidate.name).length > entry.maxLength)
        .map((candidate) => candidate.name),
      malformedOrUnsafeFlags: entry.candidates
        .filter((candidate) =>
          hasUnsafeBrandMeaning(candidate.name)
          || hasMalformedCompoundPattern(candidate.name)
          || hasRandomSyllablePattern(candidate.name)
          || hasAiSmellPattern(candidate.name)
          || isGibberish(candidate.name),
        )
        .map((candidate) => candidate.name),
      explicitStyleMismatches: requestedStyle === "auto"
        ? []
        : entry.candidates
            .filter((candidate) => candidate.style !== requestedStyle)
            .map((candidate) => ({ name: candidate.name, actualStyle: candidate.style })),
      rationaleUnder70Characters: entry.candidates
        .filter((candidate) => candidate.rationale.trim().length < 70)
        .map((candidate) => candidate.name),
      rationaleUnder12Words: entry.candidates
        .filter((candidate) => candidate.rationale.trim().split(/\s+/).filter(Boolean).length < 12)
        .map((candidate) => candidate.name),
      candidatesWithoutFitRoots: entry.candidates
        .filter((candidate) => candidate.fitRoots.length === 0)
        .map((candidate) => candidate.name),
      exactSameCaseProviderOverlap: entry.candidates
        .filter((candidate) => competitorNames.has(normaliseName(candidate.name)))
        .map((candidate) => candidate.name),
    }
  })

  const totalCandidates = manifest.cases.reduce((total, entry) => total + entry.candidates.length, 0)
  const modelBackedCases = manifest.cases.filter((entry) => entry.modelBacked).length
  const modelContributedCases = perCase.filter((entry) => entry.modelContribution.qualifies).length
  const modelCandidates = manifest.cases.reduce((total, entry) => total + entry.modelCandidateCount, 0)
  const fallbackCandidates = manifest.cases.reduce((total, entry) => total + entry.fallbackCandidateCount, 0)
  const modelCandidateShare = totalCandidates > 0 ? modelCandidates / totalCandidates : 0
  const crossCaseDuplicates = [...nameCases.entries()]
    .filter(([, cases]) => cases.size > 1)
    .map(([name, cases]) => ({ name, cases: [...cases].sort(), occurrences: cases.size }))
    .sort((left, right) => right.occurrences - left.occurrences || left.name.localeCompare(right.name))
  const duplicateOccurrences = crossCaseDuplicates.reduce(
    (total, entry) => total + Math.max(0, entry.occurrences - 1),
    0,
  )
  const providerCounts = Object.fromEntries(
    [...new Set(manifest.cases.map((entry) => entry.provider))]
      .sort()
      .map((provider) => [provider, manifest.cases.filter((entry) => entry.provider === provider).length]),
  )

  return {
    schemaVersion: 2,
    benchmarkVersion: manifest.benchmarkVersion,
    generatedAt: new Date().toISOString(),
    provenance: {
      captureManifestSha256: sha256(stableJson(manifest)),
      generatorImplementationSha256: manifest.generatorImplementationSha256,
    },
    scope: "Objective contract checks only. This report does not score creative quality or declare a winner.",
    summary: {
      cases: manifest.cases.length,
      totalCandidates,
      allCasesHave16UniqueNames: perCase.every(
        (entry) => entry.candidateCount === 16 && entry.uniqueCandidateCount === 16,
      ),
      modelBackedCases,
      modelBackedCaseRatePercent: Number(((modelBackedCases / manifest.cases.length) * 100).toFixed(1)),
      modelContributedCases,
      modelContributedCaseRatePercent: Number(((modelContributedCases / manifest.cases.length) * 100).toFixed(1)),
      modelCandidates,
      fallbackCandidates,
      modelCandidateRatePercent: Number((modelCandidateShare * 100).toFixed(1)),
      fallbackCandidateRatePercent: Number(((fallbackCandidates / totalCandidates) * 100).toFixed(1)),
      providerCounts,
      p95DurationMs: percentile95(manifest.cases.map((entry) => entry.durationMs)),
      maxDurationMs: Math.max(...manifest.cases.map((entry) => entry.durationMs)),
      crossCaseExactDuplicateOccurrences: duplicateOccurrences,
      crossCaseExactDuplicateRatePercent: Number(((duplicateOccurrences / totalCandidates) * 100).toFixed(2)),
      crossCaseDuplicates,
      totalMaxLengthViolations: perCase.reduce((total, entry) => total + entry.maxLengthViolations.length, 0),
      totalMalformedOrUnsafeFlags: perCase.reduce((total, entry) => total + entry.malformedOrUnsafeFlags.length, 0),
      totalExplicitStyleMismatches: perCase.reduce((total, entry) => total + entry.explicitStyleMismatches.length, 0),
      totalExactSameCaseProviderOverlap: perCase.reduce((total, entry) => total + entry.exactSameCaseProviderOverlap.length, 0),
      gates: {
        candidateContract: perCase.every((entry) => entry.candidateCount === 16 && entry.uniqueCandidateCount === 16),
        maxLength: perCase.every((entry) => entry.maxLengthViolations.length === 0),
        malformedUnsafeHeuristics: perCase.every((entry) => entry.malformedOrUnsafeFlags.length === 0),
        explicitStyleMetadata: perCase.every((entry) => entry.explicitStyleMismatches.length === 0),
        modelContributionCasesAtLeast90Percent:
          modelContributedCases / manifest.cases.length >= MIN_MODEL_CONTRIBUTED_BRIEF_RATE,
        modelCandidateShareAtLeast25Percent:
          modelCandidateShare >= MIN_GLOBAL_MODEL_CANDIDATE_SHARE,
        crossCaseExactDuplicationAtMost1Percent: duplicateOccurrences / totalCandidates <= 0.01,
        p95GenerationAtMost8Seconds: percentile95(manifest.cases.map((entry) => entry.durationMs)) <= 8_000,
      },
    },
    perCase,
  }
}

function buildScorecard(pack: ReturnType<typeof buildCompletedPack>) {
  const emptyBatchScore = () => ({
    relevance: null,
    pronounceability: null,
    distinctiveness: null,
    controlFit: null,
    shortlistDepth: null,
    shortlistWorthyCount: null,
    topTwoNames: [],
    criticalDefect: null,
  })
  return {
    schemaVersion: 1,
    packId: pack.packId,
    raterId: null,
    completedAt: null,
    instructions: "Score only the provider-neutral A/B names in evaluator-pack.json. Do not open provider-reveal.json until every raw-name score is frozen.",
    cases: pack.cases.map((entry) => ({
      presentationOrder: entry.presentationOrder,
      caseId: entry.caseId,
      batchA: emptyBatchScore(),
      batchB: emptyBatchScore(),
      forcedPreference: null,
      confidence: null,
      notes: "",
    })),
  }
}

async function run() {
  const source = readJson<SourceCapture>(sourceCapturePath)
  const partial = readJson<PartialEvaluatorPack>(partialPackPath)
  const reveal = readJson<ProviderReveal>(revealPath)
  const expectedImplementationHash = hashGeneratorImplementation()
  const manifest = existsSync(outputManifestPath)
    ? readJson<NamoLuxCaptureManifest>(outputManifestPath)
    : createManifest(source)

  if (manifest.benchmarkVersion !== source.benchmarkVersion) {
    throw new Error("Existing NamoLux capture uses another benchmark version")
  }
  if (manifest.generatorImplementationSha256 !== expectedImplementationHash) {
    throw new Error("Generator implementation changed after capture began; refusing to mix batches")
  }

  const sourceById = new Map(source.cases.map((entry) => [entry.caseId, entry]))
  const completedIds = new Set(manifest.cases.map((entry) => entry.caseId))
  const delayMs = Math.max(0, Number.parseInt(process.env.BENCHMARK_CAPTURE_DELAY_MS || "5000", 10) || 0)

  for (const evaluatorCase of partial.cases) {
    if (completedIds.has(evaluatorCase.caseId)) continue
    const sourceCase = sourceById.get(evaluatorCase.caseId)
    if (!sourceCase) throw new Error(`${evaluatorCase.caseId}: missing frozen source metadata`)
    const style = styleMap[sourceCase.canonicalStyle]
    const creativity = creativityMap[sourceCase.canonicalCreativity]
    if (!style || !creativity) throw new Error(`${sourceCase.caseId}: unsupported controls`)
    const seed = `${source.benchmarkVersion}:${sourceCase.caseId}:frozen-first-batch`

    const generated = await generateGroqQuickCandidates({
      description: sourceCase.brief,
      vibe: sourceCase.vibeGroup,
      style,
      creativity,
      maxChars: sourceCase.maxLength,
      count: 16,
      seed,
      preferences: {
        likedStyles: [],
        dislikedStyles: [],
        preferredSounds: [],
        avoidedSounds: [],
      },
    })
    const candidates = generated.candidates.slice(0, 16).map((candidate): CapturedCandidate => ({
      name: candidate.name,
      rationale: candidate.personality,
      style: candidate.style,
      fitRoots: [...(candidate.fitRoots || [])],
      fitCues: [...(candidate.fitCues || [])],
    }))
    const responseForHash = {
      provider: generated.provider,
      model: generated.model,
      modelCandidateCount: generated.modelCandidateCount,
      fallbackCandidateCount: generated.fallbackCandidateCount,
      candidates,
    }
    const capturedCase: CapturedCase = {
      caseId: sourceCase.caseId,
      vibeGroup: sourceCase.vibeGroup,
      brief: sourceCase.brief,
      canonicalStyle: sourceCase.canonicalStyle,
      canonicalCreativity: sourceCase.canonicalCreativity,
      style,
      creativity,
      maxLength: sourceCase.maxLength,
      seed,
      capturedAt: new Date().toISOString(),
      durationMs: generated.durationMs,
      provider: generated.provider,
      model: generated.model,
      providerAttempts: generated.providerAttempts,
      modelBacked: generated.modelBacked,
      modelCandidateCount: generated.modelCandidateCount,
      fallbackCandidateCount: generated.fallbackCandidateCount,
      fallbackReason: generated.fallbackReason || null,
      transportRetryCount: 0,
      transportRetryReason: null,
      normalizedResponseSha256: sha256(JSON.stringify(responseForHash)),
      candidates,
    }
    manifest.cases.push(capturedCase)
    completedIds.add(sourceCase.caseId)
    writeJsonAtomic(outputManifestPath, manifest)
    console.log(JSON.stringify({
      caseId: sourceCase.caseId,
      count: candidates.length,
      provider: generated.provider,
      model: generated.model,
      modelCandidates: generated.modelCandidateCount,
      fallbackCandidates: generated.fallbackCandidateCount,
      durationMs: generated.durationMs,
      names: candidates.map((candidate) => candidate.name),
    }))
    if (completedIds.size < partial.cases.length) await wait(delayMs)
  }

  const allComplete = partial.cases.every((entry) => {
    const capture = manifest.cases.find((candidate) => candidate.caseId === entry.caseId)
    return capture?.candidates.length === 16
      && new Set(capture.candidates.map((candidate) => normaliseName(candidate.name))).size === 16
  })
  if (!allComplete) {
    throw new Error("Capture is frozen but at least one case does not contain 16 unique names; blind pack was not emitted")
  }

  manifest.completedAt = new Date().toISOString()
  writeJsonAtomic(outputManifestPath, manifest)
  const completedPack = buildCompletedPack(partial, reveal, manifest.cases)
  writeJsonAtomic(completedPackPath, completedPack)
  writeJsonAtomic(objectiveReportPath, buildObjectiveReport(source, manifest))
  writeJsonAtomic(scorecardPath, buildScorecard(completedPack))
  console.log(JSON.stringify({
    summary: {
      cases: manifest.cases.length,
      completedPackPath,
      objectiveReportPath,
      scorecardPath,
    },
  }))
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
