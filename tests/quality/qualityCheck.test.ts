import { describe, it, afterAll, expect } from "vitest"
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

// ─────────────────────────────────────────────────────────────────────────────
// Collect all reports for the afterAll summary
// ─────────────────────────────────────────────────────────────────────────────

const allReports: BatchReport[] = []
const scenarios = buildScenarioMatrix()

afterAll(() => {
  const systemReport = buildSystemReport(allReports)
  printReport(allReports, systemReport)
})

// ─────────────────────────────────────────────────────────────────────────────
// Batch quality — full matrix
// ─────────────────────────────────────────────────────────────────────────────

describe("Quality Check Engine", () => {
  describe("Batch quality — parametric sweep", () => {
    const sweepScenarios = scenarios.filter(s => s.id.startsWith("sweep-"))

    for (const scenario of sweepScenarios) {
      it(`[${scenario.id}] ${scenario.keyword} / ${scenario.vibe} / ${scenario.style}`, () => {
        const report = runScenario(scenario)
        allReports.push(report)
        assertHardRules(report)
      })
    }
  })

  describe("Batch quality — curated cross-industry", () => {
    const curatedScenarios = scenarios.filter(s => !s.id.startsWith("sweep-"))

    for (const scenario of curatedScenarios) {
      it(`[${scenario.id}] ${scenario.keyword} / ${scenario.vibe} / ${scenario.style}`, () => {
        const report = runScenario(scenario)
        allReports.push(report)
        assertHardRules(report)
      })
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Founder Signal scoring sanity
  // ───────────────────────────────────────────────────────────────────────────

  describe("Founder Signal scoring sanity", () => {
    it("good names outscore AI-smell names", () => {
      const good = scoreName({ name: "stripe", tld: "com", vibe: "minimal" })
      const bad = scoreName({ name: "nexorium", tld: "com", vibe: "minimal" })
      expect(good.score).toBeGreaterThan(bad.score)
    })

    it("AI-smell suffixes penalised in brandRisk", () => {
      const clean = scoreName({ name: "ember", tld: "com" })
      const aiSmell = scoreName({ name: "embora", tld: "com" })
      expect(clean.rawScores.brandRisk).toBeGreaterThan(aiSmell.rawScores.brandRisk)
    })

    it("AI-smell suffixes penalised in memorability", () => {
      const clean = scoreName({ name: "lumen", tld: "com" })
      const aiSmell = scoreName({ name: "lumova", tld: "com" })
      expect(clean.rawScores.memorability).toBeGreaterThan(aiSmell.rawScores.memorability)
    })

    it("generic prefix+suffix combos penalised", () => {
      const clean = scoreName({ name: "ridgecraft", tld: "com" })
      const generic = scoreName({ name: "getcodehub", tld: "com" })
      expect(clean.rawScores.memorability).toBeGreaterThan(generic.rawScores.memorability)
    })

    it("CVCV rhythm rewarded in memorability", () => {
      const cvcv = scoreName({ name: "vela", tld: "com" })
      // CVCV names should get high memorability
      expect(cvcv.rawScores.memorability).toBeGreaterThanOrEqual(90)
    })

    it("real-word substrates rewarded", () => {
      const withSubstrate = scoreName({ name: "ember", tld: "com" })
      // "ember" contains real-word substrate → should boost memorability
      expect(withSubstrate.rawScores.memorability).toBeGreaterThanOrEqual(90)
    })

    it("known founder-grade names all score > 90", () => {
      const founderGrade = ["stripe", "notion", "lumen", "ember", "slate", "forge", "haven"]
      for (const name of founderGrade) {
        const result = scoreName({ name, tld: "com" })
        expect(result.score, `${name} scored ${result.score}`).toBeGreaterThanOrEqual(90)
      }
    })

    it("known AI-smell names all score < 85", () => {
      const aiNames = ["horizora", "vexorium", "zentara", "nexovix", "zynthexa"]
      for (const name of aiNames) {
        const result = scoreName({ name, tld: "com" })
        expect(result.score, `${name} scored ${result.score}`).toBeLessThan(85)
      }
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AI-smell regression guard
  // ───────────────────────────────────────────────────────────────────────────

  describe("AI-smell regression guard", () => {
    const regressionKeywords = ["tech", "finance", "health", "eco", "learn"]

    for (const kw of regressionKeywords) {
      it(`no AI-smell in top 20 for keyword "${kw}"`, () => {
        const report = runScenario({
          id: `regression-${kw}`,
          keyword: kw,
          industry: "Technology",
          vibe: "minimal",
          style: "brandable_blends",
          maxLength: 10,
          seed: `qc-regression-${kw}`,
        })
        const leaks = report.top20Names.filter(hasAiSmell)
        expect(leaks, `AI-smell leaks: ${leaks.join(", ")}`).toHaveLength(0)
      })
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Suffix diversity enforcement
  // ───────────────────────────────────────────────────────────────────────────

  describe("Suffix diversity enforcement", () => {
    const vibes = ["luxury", "futuristic", "playful", "trustworthy", "minimal"]

    for (const vibe of vibes) {
      it(`suffix diversity holds for vibe "${vibe}"`, () => {
        const report = runScenario({
          id: `diversity-${vibe}`,
          keyword: "startup brand",
          industry: "Technology",
          vibe,
          style: "brandable_blends",
          maxLength: 10,
          seed: `qc-diversity-${vibe}`,
        })
        expect(report.suffixDiversityOk, "Too many names share a suffix in top 20").toBe(true)
      })
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // feelsHuman heuristic validation
  // ───────────────────────────────────────────────────────────────────────────

  describe("feelsHuman heuristic", () => {
    it("accepts known good names", () => {
      const good = ["ember", "slate", "haven", "forge", "bloom", "cedar"]
      for (const name of good) {
        expect(feelsHuman(name), `${name} should feel human`).toBe(true)
      }
    })

    it("rejects AI-smell names", () => {
      const bad = ["horizora", "vexorium", "zentara", "nexovix"]
      for (const name of bad) {
        expect(feelsHuman(name), `${name} should not feel human`).toBe(false)
      }
    })
  })
})
