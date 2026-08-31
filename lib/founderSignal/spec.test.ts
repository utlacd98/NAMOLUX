import { describe, expect, it } from "vitest"
import { scoreName } from "./scoreName"
import { SYSTEM_RESERVED_NAME_MESSAGE } from "../reserved-names"
import {
  ACTIVE_BRAND_REGISTRY,
  assessBrandCollision,
  CLOSE_MATCH_SCORE_CAP,
  FOUNDER_SIGNAL_BANDS,
  FOUNDER_SIGNAL_DIMENSIONS,
  FOUNDER_SIGNAL_SPEC,
  getFounderSignalBand,
} from "./spec"

describe("Founder Signal v2.0 specification", () => {
  it("defines the canonical seven dimensions and weights", () => {
    expect(FOUNDER_SIGNAL_SPEC.version).toBe("2.0")
    expect(FOUNDER_SIGNAL_SPEC.evaluatedOn).toBe("2026-08-30")
    expect(FOUNDER_SIGNAL_DIMENSIONS).toEqual([
      { key: "strategicFit", label: "Strategic fit & meaning depth", weight: 20 },
      { key: "distinctiveness", label: "Distinctiveness & search uniqueness", weight: 20 },
      { key: "memorability", label: "Memorability", weight: 15 },
      { key: "pronunciation", label: "Pronunciation", weight: 10 },
      { key: "spellingCharacter", label: "Spelling & character quality", weight: 10 },
      { key: "brandRisk", label: "Brand & collision risk", weight: 20 },
      { key: "extensionStrength", label: "Domain & extension strength", weight: 5 },
    ])
    expect(FOUNDER_SIGNAL_DIMENSIONS).toHaveLength(7)
    expect(FOUNDER_SIGNAL_DIMENSIONS.reduce((total, dimension) => total + dimension.weight, 0)).toBe(100)
  })

  it("uses the canonical score bands at every boundary", () => {
    expect(FOUNDER_SIGNAL_BANDS).toEqual([
      { label: "Elite", min: 90, max: 100 },
      { label: "Strong", min: 75, max: 89 },
      { label: "Viable", min: 60, max: 74 },
      { label: "Reconsider", min: 0, max: 59 },
    ])

    expect(getFounderSignalBand(100)).toBe("Elite")
    expect(getFounderSignalBand(90)).toBe("Elite")
    expect(getFounderSignalBand(89)).toBe("Strong")
    expect(getFounderSignalBand(75)).toBe("Strong")
    expect(getFounderSignalBand(74)).toBe("Viable")
    expect(getFounderSignalBand(60)).toBe("Viable")
    expect(getFounderSignalBand(59)).toBe("Reconsider")
    expect(getFounderSignalBand(0)).toBe("Reconsider")
  })

  it("makes strategic fit and distinctiveness first-class v2 dimensions", () => {
    const result = scoreName({ name: "Vaulten", tld: "com" })
    expect(result.breakdown.strategicFitScore).toBe(Math.round(result.rawScores.strategicFit * 0.2))
    expect(result.breakdown.distinctivenessScore).toBe(Math.round(result.rawScores.distinctiveness * 0.2))
  })

  it("allows relevant compounds but rejects shallow keyword mutations", () => {
    const relevantCompound = scoreName({ name: "Carepath", tld: "com", keywords: ["care"] })
    const shallowMutation = scoreName({ name: "Budgetly", tld: "com", keywords: ["budget"] })

    expect(relevantCompound.score).toBeGreaterThan(0)
    expect(shallowMutation.score).toBe(0)
    expect(shallowMutation.reasons).toContain("Low-effort keyword mutation detected")
  })
})

describe("Founder Signal system reservation", () => {
  it.each(["NamoLux", "namo lux", "namo-lux", "namolux.com"])("returns a zero score for %s", (name) => {
    const result = scoreName({ name, tld: "com" })
    expect(result.score).toBe(0)
    expect(result.band).toBe("Reconsider")
    expect(result.reasons).toContain(SYSTEM_RESERVED_NAME_MESSAGE)
  })
})

describe("Founder Signal active-brand collision gate", () => {
  it("contains the audit collisions in the active-brand registry", () => {
    expect(ACTIVE_BRAND_REGISTRY).toEqual(expect.arrayContaining(["anker", "nucleus", "stripe", "vantiq", "axoniq", "corteva"]))
  })

  it.each(["Anker", "Nucleus", "Stripe", "Vantiq", "Axoniq", "Corteva"])("hard-rejects the exact active brand %s", (name) => {
    const result = scoreName({ name, tld: "com" })

    expect(result.score).toBe(0)
    expect(result.band).toBe("Reconsider")
    expect(result.version).toBe("2.0")
    expect(result.evaluatedOn).toBe("2026-08-30")
    expect(result.collision).toEqual({
      type: "exact",
      action: "disqualify",
      matchedBrand: name.toLowerCase(),
      scoreCap: 0,
      confidence: "high",
    })
  })

  it("severely caps a close active-brand match", () => {
    const collision = assessBrandCollision("Strype")
    const result = scoreName({ name: "Strype", tld: "com" })

    expect(collision).toEqual({
      type: "close-match",
      action: "severe-cap",
      matchedBrand: "stripe",
      scoreCap: CLOSE_MATCH_SCORE_CAP,
      confidence: "moderate",
    })
    expect(result.score).toBeLessThanOrEqual(CLOSE_MATCH_SCORE_CAP)
    expect(result.collision).toEqual(collision)
    expect(result.reasons).toContain("Close active-brand match: stripe (score capped at 59)")
  })
})
