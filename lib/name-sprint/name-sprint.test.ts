import { describe, expect, it } from "vitest"

import { GOLDEN_NAMING_SET, getGoldenNamingSetSummary } from "./benchmark"
import { assessCollisionV2, COLLISION_REGISTRY_VERSION, normalizeName } from "./collision-registry"
import { evaluateEligibility } from "./eligibility"
import { FOUNDER_SIGNAL_V2_DIMENSIONS, scoreFounderSignalV2 } from "./founder-signal-v2"
import type { RawNameCandidate } from "./types"

function candidate(name: string, roots: string[]): RawNameCandidate {
  return {
    id: `test-${normalizeName(name)}`,
    name,
    normalizedName: normalizeName(name),
    strategy: "meaningful_compound",
    territoryId: "test",
    roots,
    association: "A meaningful metaphor for clear progress and confident decisions.",
    pronunciation: name.toLowerCase(),
    claimedOrigin: null,
    originVerified: true,
  }
}

describe("Name Sprint trust foundation", () => {
  it("defines Founder Signal v2 with the agreed seven dimensions and weights", () => {
    expect(FOUNDER_SIGNAL_V2_DIMENSIONS).toEqual([
      { key: "strategicFit", label: "Strategic fit & meaning depth", weight: 20 },
      { key: "distinctiveness", label: "Distinctiveness & search uniqueness", weight: 20 },
      { key: "memorability", label: "Memorability", weight: 15 },
      { key: "pronunciation", label: "Pronunciation", weight: 10 },
      { key: "spellingCharacter", label: "Spelling & character quality", weight: 10 },
      { key: "brandCollisionRisk", label: "Brand & collision risk", weight: 20 },
      { key: "domainExtension", label: "Domain & extension strength", weight: 5 },
    ])
    expect(FOUNDER_SIGNAL_V2_DIMENSIONS.reduce((total, item) => total + item.weight, 0)).toBe(100)
  })

  it.each([
    "Anker", "Nucleus", "Stripe", "Actura", "Farline", "Ballast", "Holden", "Lumen", "Meridian", "Orbis", "Waypoint",
    "Hintline", "Telltide", "Granary", "Mapstone", "TraceSpan", "ClearRoute", "SetCourse", "Telltale", "SetGuard", "PlanHarbor", "Keelward",
    "Handrail", "Readout", "CourseMark",
  ])("rejects the published active-brand trap %s before scoring", (name) => {
    const collision = assessCollisionV2(name, { category: "marketing and technology" })
    const benchmark = GOLDEN_NAMING_SET[0]
    const decision = evaluateEligibility(candidate(name, [normalizeName(name)]), { constitution: benchmark.constitution })

    expect(collision.registryVersion).toBe(COLLISION_REGISTRY_VERSION)
    expect(collision.action).toBe("reject")
    expect(decision.status).toBe("reject")
    expect(decision.failureCodes).toContain("ACTIVE_BRAND_EXACT")
  })

  it("does not let a high comparative score rescue a rejected candidate", () => {
    const benchmark = GOLDEN_NAMING_SET[0]
    const active = candidate("Anker", ["anker"])
    const eligibility = evaluateEligibility(active, { constitution: benchmark.constitution })
    const score = scoreFounderSignalV2({ candidate: active, constitution: benchmark.constitution, eligibility })

    expect(score.eligibility.status).toBe("reject")
    expect(score.score).toBe(0)
    expect(score.band).toBe("Reconsider")
  })

  it("calibrates a conservative no-fatal judge against the deterministic quality baseline", () => {
    const benchmark = GOLDEN_NAMING_SET[0]
    const serious = candidate("CedarLane", ["cedar", "lane"])
    const eligibility = evaluateEligibility(serious, { constitution: benchmark.constitution })
    const score = scoreFounderSignalV2({
      candidate: serious,
      constitution: benchmark.constitution,
      eligibility,
      judged: {
        name: serious.name,
        fatalFlawCodes: [],
        scores: { strategicFit: 45, distinctiveness: 45, memorability: 45, pronunciation: 45, spellingCharacter: 45 },
        strongestReason: "A restrained metaphor with a clear verbal shape.",
        mainRisk: "The metaphor may need explanation.",
        confidence: "moderate",
        preferredWithinGroup: 80,
      },
    })

    expect(eligibility.status).toBe("pass")
    expect(score.score).toBeGreaterThanOrEqual(60)
    expect(score.band).not.toBe("Reconsider")
  })

  it("keeps the legal disclaimer separate from a candidate-specific main risk", () => {
    const benchmark = GOLDEN_NAMING_SET[0]
    const serious = candidate("CedarLane", ["cedar", "lane"])
    const eligibility = evaluateEligibility(serious, { constitution: benchmark.constitution })
    const score = scoreFounderSignalV2({
      candidate: serious,
      constitution: benchmark.constitution,
      eligibility,
      judged: {
        name: serious.name,
        fatalFlawCodes: [],
        scores: { strategicFit: 75, distinctiveness: 72, memorability: 74, pronunciation: 82, spellingCharacter: 80 },
        strongestReason: "A restrained metaphor with a clear verbal shape.",
        mainRisk: "Automated screening is not legal or trademark clearance.",
        confidence: "high",
        preferredWithinGroup: 76,
      },
    })

    expect(score.mainRisk).toContain("compound")
    expect(score.mainRisk).not.toMatch(/legal|trademark clearance/i)
  })

  it.each(["Canary", "Lookout", "Lifeline", "Foretell"])("does not misclassify the ordinary word %s as random syllables", (name) => {
    const benchmark = GOLDEN_NAMING_SET[0]
    const decision = evaluateEligibility(candidate(name, [normalizeName(name)]), { constitution: benchmark.constitution })

    expect(decision.failureCodes).not.toContain("RANDOM_SYLLABLES")
  })

  it("evaluates a transparent compound by its pronounceable roots rather than its consonant seam", () => {
    const benchmark = GOLDEN_NAMING_SET[0]
    const decision = evaluateEligibility(candidate("Rightstock", ["right", "stock"]), { constitution: benchmark.constitution })

    expect(decision.failureCodes).not.toContain("PRONUNCIATION_CLUSTER")
  })

  it("contains 100 briefs and catches every labelled trap with the hard gate", () => {
    expect(getGoldenNamingSetSummary()).toEqual({
      briefs: 100,
      knownGoodCandidates: 100,
      trapCandidates: 400,
      categories: 10,
    })

    for (const benchmark of GOLDEN_NAMING_SET) {
      for (const trap of benchmark.traps) {
        const decision = evaluateEligibility(trap.candidate, { constitution: benchmark.constitution })
        expect(decision.status, `${benchmark.id}: ${trap.candidate.name}`).toBe("reject")
        expect(decision.failureCodes, `${benchmark.id}: ${trap.candidate.name}`).toContain(trap.expectedFailure)
      }
    }
  })

  it("allows local-service clarity without applying the startup generic-compound rejection", () => {
    const base = GOLDEN_NAMING_SET.find((item) => item.constitution.namingMode === "local_service")!
    const local = candidate("Rhyl Plumbing Services", ["rhyl", "plumbing", "services"])
    const decision = evaluateEligibility(local, { constitution: base.constitution })

    expect(decision.failureCodes).not.toContain("GENERIC_COMPOUND")
  })
})
