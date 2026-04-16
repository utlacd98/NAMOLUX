/**
 * Standalone quality check runner — bypasses vitest (broken ESM compat).
 * Run: npx tsx tests/quality/run.ts
 */
import { scoreName } from "@/lib/founderSignal/scoreName"
import {
  buildScenarioMatrix,
  runScenario,
  assertHardRules,
  buildSystemReport,
  printReport,
  feelsHuman,
  hasAiSmell,
  type BatchReport,
} from "./qualityHelpers"

const w = process.stdout.write.bind(process.stdout)
const line = (s: string) => w(s + "\n")

const allReports: BatchReport[] = []
const scenarios = buildScenarioMatrix()
let passed = 0
let failed = 0
const failures: string[] = []

line(`\nRunning ${scenarios.length} quality scenarios...\n`)

// ── Batch quality tests ────────────────────────────────────────────────────

for (const scenario of scenarios) {
  try {
    const report = runScenario(scenario)
    allReports.push(report)
    assertHardRules(report)
    passed++
  } catch (err: any) {
    failed++
    failures.push(err.message)
    // Still push report for summary even if assertions fail
    try {
      const report = runScenario(scenario)
      allReports.push(report)
    } catch {}
  }
}

// ── Scoring sanity tests ───────────────────────────────────────────────────

function assert(condition: boolean, msg: string) {
  if (!condition) {
    failed++
    failures.push(msg)
  } else {
    passed++
  }
}

// Good names outscore AI-smell
const goodStripe = scoreName({ name: "stripe", tld: "com", vibe: "minimal" })
const badNexo = scoreName({ name: "nexorium", tld: "com", vibe: "minimal" })
assert(goodStripe.score > badNexo.score, `stripe (${goodStripe.score}) should outscore nexorium (${badNexo.score})`)

// AI-smell suffixes penalised in brandRisk
const cleanEmber = scoreName({ name: "ember", tld: "com" })
const aiEmb = scoreName({ name: "embora", tld: "com" })
assert(cleanEmber.rawScores.brandRisk > aiEmb.rawScores.brandRisk, `ember brandRisk (${cleanEmber.rawScores.brandRisk}) > embora (${aiEmb.rawScores.brandRisk})`)

// AI-smell suffixes penalised in memorability
const cleanLumen = scoreName({ name: "lumen", tld: "com" })
const aiLum = scoreName({ name: "lumova", tld: "com" })
assert(cleanLumen.rawScores.memorability > aiLum.rawScores.memorability, `lumen memorability (${cleanLumen.rawScores.memorability}) > lumova (${aiLum.rawScores.memorability})`)

// Generic prefix+suffix penalised
const cleanRidge = scoreName({ name: "ridgecraft", tld: "com" })
const genGet = scoreName({ name: "getcodehub", tld: "com" })
assert(cleanRidge.rawScores.memorability > genGet.rawScores.memorability, `ridgecraft memo (${cleanRidge.rawScores.memorability}) > getcodehub (${genGet.rawScores.memorability})`)

// Known founder-grade names score > 90
for (const name of ["stripe", "notion", "lumen", "ember", "slate", "forge", "haven"]) {
  const r = scoreName({ name, tld: "com" })
  assert(r.score >= 90, `${name} should score ≥90, got ${r.score}`)
}

// Known AI-smell names score < 85
for (const name of ["horizora", "vexorium", "zentara", "nexovix", "zynthexa"]) {
  const r = scoreName({ name, tld: "com" })
  assert(r.score < 85, `${name} should score <85, got ${r.score}`)
}

// feelsHuman accepts good names
for (const name of ["ember", "slate", "haven", "forge", "bloom", "cedar"]) {
  assert(feelsHuman(name), `feelsHuman should accept "${name}"`)
}

// feelsHuman rejects AI names
for (const name of ["horizora", "vexorium", "zentara", "nexovix"]) {
  assert(!feelsHuman(name), `feelsHuman should reject "${name}"`)
}

// ── System report ──────────────────────────────────────────────────────────

const systemReport = buildSystemReport(allReports)
printReport(allReports, systemReport)

// ── Test summary ───────────────────────────────────────────────────────────

line("\n" + "=".repeat(90))
line(`  TEST RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`)
line("=".repeat(90))

if (failures.length > 0) {
  line("\n--- Failures ---\n")
  for (const f of failures) {
    line(`  FAIL: ${f}`)
  }
  line("")
  process.exit(1)
} else {
  line("\n  All tests passed.\n")
}
