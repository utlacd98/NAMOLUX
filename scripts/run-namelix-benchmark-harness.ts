import { createHash } from "node:crypto"
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  aggregateFinalBenchmark,
  aggregateRawRatings,
  type BenchmarkProtocol,
  type BlindExplanationPack,
  type BlindRawPack,
  buildBlindExplanationArtifacts,
  buildExplanationCaptureTemplate,
  type ExplanationReveal,
  type ExplanationScorecard,
  incompleteBenchmarkStatus,
  type NamelixCapture,
  type NamoLuxCapture,
  type NamoLuxObjectiveReport,
  type ProviderReveal,
  type RawAggregateReport,
  type RawScorecard,
  type SealedExplanationCapture,
  sha256,
  stableJson,
  validateBlindRawPack,
  validateCaptureImplementation,
  validateEquivalentControls,
  validateFrozenProviderAssignments,
  validateObjectiveReleaseGates,
} from "./lib/namelix-benchmark-harness"

const benchmarkDirectory = resolve(
  process.cwd(),
  "tests/generator-quality/benchmarks/namelix-2026-07-14",
)

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function writeJsonAtomic(path: string, value: unknown) {
  const temporaryPath = `${path}.tmp`
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  renameSync(temporaryPath, path)
}

function fixture(name: string): string {
  return resolve(benchmarkDirectory, name)
}

function runFixture(name: string): string {
  const runDirectory = option("--run-directory")
    ? resolve(process.cwd(), option("--run-directory") as string)
    : benchmarkDirectory
  return resolve(runDirectory, name)
}

function option(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || null : null
}

function requiredOption(name: string): string {
  const value = option(name)
  if (!value) throw new Error(`Missing required ${name} option`)
  return resolve(process.cwd(), value)
}

function scorecardPaths(): string[] {
  const value = option("--scorecards")
  if (!value) throw new Error("Missing --scorecards path1,path2,path3")
  return value.split(",").map((entry) => resolve(process.cwd(), entry.trim())).filter(Boolean)
}

function assertFilesExist(paths: string[]) {
  for (const path of paths) {
    if (!existsSync(path)) throw new Error(`File does not exist: ${path}`)
  }
}

function coreFixtures() {
  const protocol = readJson<BenchmarkProtocol>(fixture("benchmark-protocol.json"))
  const namelix = readJson<NamelixCapture>(fixture("capture-manifest.json"))
  const namolux = readJson<NamoLuxCapture>(runFixture("namolux-capture-manifest.json"))
  const pack = readJson<BlindRawPack>(runFixture("evaluator-pack.json"))
  const reveal = readJson<ProviderReveal>(fixture("provider-reveal.json"))
  const objectivePath = runFixture("objective-report.json")
  const objective = existsSync(objectivePath)
    ? readJson<NamoLuxObjectiveReport>(objectivePath)
    : null
  const freshRun = Boolean(option("--run-directory"))
  return { protocol, namelix, namolux, pack, reveal, objective, freshRun }
}

function currentImplementationHash(manifest: NamoLuxCapture): string {
  const hash = createHash("sha256")
  for (const file of manifest.generatorImplementationFiles) {
    hash.update(`${file}\0`, "utf8")
    hash.update(readFileSync(resolve(process.cwd(), file)))
    hash.update("\0", "utf8")
  }
  return hash.digest("hex")
}

function readiness(
  protocol: BenchmarkProtocol,
  namelix: NamelixCapture,
  namolux: NamoLuxCapture,
  pack: BlindRawPack,
  reveal: ProviderReveal,
  objective: NamoLuxObjectiveReport | null,
  freshRun: boolean,
) {
  validateBlindRawPack(pack)
  const equivalence = validateEquivalentControls(protocol, namelix, namolux, pack)
  const implementation = validateCaptureImplementation(
    namolux,
    currentImplementationHash(namolux),
  )
  const assignments = validateFrozenProviderAssignments(namelix, namolux, pack, reveal)
  const objectiveGates = validateObjectiveReleaseGates(namolux, objective, {
    required: freshRun,
    requireCurrentSchema: freshRun,
  })
  return {
    pass: equivalence.pass && implementation.pass && assignments.pass && objectiveGates.pass,
    errors: [
      ...equivalence.errors,
      ...implementation.errors,
      ...assignments.errors,
      ...objectiveGates.errors,
    ],
    casesChecked: equivalence.casesChecked,
  }
}

function usage(): never {
  throw new Error([
    "Usage:",
    "  npx tsx scripts/run-namelix-benchmark-harness.ts check [--run-directory path]",
    "  npx tsx scripts/run-namelix-benchmark-harness.ts aggregate-raw --run-directory path --scorecards a.json,b.json,c.json --output raw-aggregate.json",
    "  npx tsx scripts/run-namelix-benchmark-harness.ts prepare-explanations --run-directory path --raw raw-aggregate.json --output sealed-explanation-capture.json",
    "  npx tsx scripts/run-namelix-benchmark-harness.ts build-explanation-pack --run-directory path --raw raw-aggregate.json --capture sealed-explanation-capture.json --pack explanation-pack.json --reveal explanation-reveal.json --scorecard explanation-scorecard.template.json",
    "  npx tsx scripts/run-namelix-benchmark-harness.ts aggregate-final --run-directory path --raw raw-aggregate.json --pack explanation-pack.json --reveal explanation-reveal.json --scorecards a.json,b.json,c.json --output final-report.json",
  ].join("\n"))
}

function run() {
  const command = process.argv[2]
  const { protocol, namelix, namolux, pack, reveal, objective, freshRun } = coreFixtures()

  if (command === "check") {
    const controls = readiness(protocol, namelix, namolux, pack, reveal, objective, freshRun)
    console.log(JSON.stringify(incompleteBenchmarkStatus(protocol, controls), null, 2))
    if (!controls.pass) process.exitCode = 1
    return
  }

  if (command === "aggregate-raw") {
    const controls = readiness(protocol, namelix, namolux, pack, reveal, objective, freshRun)
    if (!controls.pass) throw new Error(`Benchmark is not ready: ${controls.errors.join("; ")}`)
    const paths = scorecardPaths()
    assertFilesExist(paths)
    const scorecards = paths.map((path) => readJson<RawScorecard>(path))
    const report = aggregateRawRatings(
      protocol,
      pack,
      reveal,
      scorecards,
      new Date().toISOString(),
      {
        namelixCaptureSha256: sha256(stableJson(namelix)),
        namoluxCaptureSha256: sha256(stableJson(namolux)),
      },
    )
    const output = requiredOption("--output")
    writeJsonAtomic(output, report)
    console.log(JSON.stringify({ status: report.status, output, summary: report.summary }, null, 2))
    return
  }

  if (command === "prepare-explanations") {
    const rawPath = requiredOption("--raw")
    assertFilesExist([rawPath])
    const raw = readJson<RawAggregateReport>(rawPath)
    const sealed = buildExplanationCaptureTemplate(raw, namolux)
    const output = requiredOption("--output")
    writeJsonAtomic(output, sealed)
    console.log(JSON.stringify({ status: sealed.status, output, rawFreezeId: sealed.rawFreezeId }, null, 2))
    return
  }

  if (command === "build-explanation-pack") {
    const rawPath = requiredOption("--raw")
    const capturePath = requiredOption("--capture")
    assertFilesExist([rawPath, capturePath])
    const raw = readJson<RawAggregateReport>(rawPath)
    const sealed = readJson<SealedExplanationCapture>(capturePath)
    const artifacts = buildBlindExplanationArtifacts(protocol, raw, sealed)
    const packOutput = requiredOption("--pack")
    const revealOutput = requiredOption("--reveal")
    const scorecardOutput = requiredOption("--scorecard")
    writeJsonAtomic(packOutput, artifacts.pack)
    writeJsonAtomic(revealOutput, artifacts.reveal)
    writeJsonAtomic(scorecardOutput, artifacts.scorecardTemplate)
    console.log(JSON.stringify({
      status: "ready_for_three_blind_explanation_raters",
      pack: packOutput,
      reveal: revealOutput,
      scorecard: scorecardOutput,
      rawFreezeId: raw.rawFreezeId,
    }, null, 2))
    return
  }

  if (command === "aggregate-final") {
    const rawPath = requiredOption("--raw")
    const packPath = requiredOption("--pack")
    const revealPath = requiredOption("--reveal")
    const paths = scorecardPaths()
    assertFilesExist([rawPath, packPath, revealPath, ...paths])
    const raw = readJson<RawAggregateReport>(rawPath)
    const explanationPack = readJson<BlindExplanationPack>(packPath)
    const explanationReveal = readJson<ExplanationReveal>(revealPath)
    const scorecards = paths.map((path) => readJson<ExplanationScorecard>(path))
    const report = aggregateFinalBenchmark(
      protocol,
      raw,
      explanationPack,
      explanationReveal,
      scorecards,
    )
    const output = requiredOption("--output")
    writeJsonAtomic(output, report)
    console.log(JSON.stringify({ status: report.status, output, counts: report.counts, gates: report.gates }, null, 2))
    return
  }

  usage()
}

try {
  run()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
