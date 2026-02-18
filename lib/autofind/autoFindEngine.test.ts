import { beforeEach, describe, expect, it, vi } from "vitest"

const checkAvailabilityBatchMock = vi.fn()

vi.mock("@/lib/domainGen/availability", () => ({
  checkAvailabilityBatch: (...args: any[]) => checkAvailabilityBatchMock(...args),
}))

import { autoFind5AvailableComs, evaluateCandidateQuality } from "@/lib/autofind/autoFindEngine"

describe("autoFindEngine quality gates", () => {
  beforeEach(() => {
    checkAvailabilityBatchMock.mockReset()
  })

  it("rejects soulless or banned-pattern names", () => {
    const params = {
      keywords: "future, finance",
      industry: "Finance",
      vibe: "Trustworthy" as const,
      maxLen: 9,
    }

    const rejectedSamples = [
      {
        name: "brethub",
        meaning: "Bre suggests breadth and hub implies centralisation for finance workflows.",
      },
      {
        name: "planiohub",
        meaning: "Plan and io create a planning engine for teams.",
      },
      {
        name: "grnzone",
        meaning: "Green zone themed sustainability label.",
      },
      {
        name: "futurns",
        meaning: "A future sounding twist for markets.",
      },
    ]

    for (const sample of rejectedSamples) {
      const result = evaluateCandidateQuality(sample, params)
      expect(result.accepted, `${sample.name} should be rejected`).toBe(false)
    }
  })

  it("accepts plausible eco names with meaningful explanations", () => {
    const params = {
      keywords: "eco, green",
      industry: "Sustainability & Green Tech",
      vibe: "Minimal" as const,
      maxLen: 9,
    }

    const acceptedSamples = [
      {
        name: "soilux",
        meaning: "Soil suggests grounded growth; lux hints at clean clarity, matching eco and green ventures.",
      },
      {
        name: "verdava",
        meaning:
          "Verde signals green vitality; ava adds renewal momentum, fitting eco, clean and earth-friendly sustainability brands.",
      },
      {
        name: "terravio",
        meaning:
          "Terra anchors earth-first purpose; vio adds vivid clean energy for eco renewal and green technology founders.",
      },
    ]

    for (const sample of acceptedSamples) {
      const result = evaluateCandidateQuality(sample, params)
      expect(result.accepted, `${sample.name} should be accepted. ${result.reasons.join(" | ")}`).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(75)
      expect(result.meaningDepth).toBeGreaterThanOrEqual(10)
      expect(result.relevanceSimilarity).toBeGreaterThanOrEqual(0.55)
    }
  })

  it("returns up to 5 available .com picks after quality-first filtering", async () => {
    checkAvailabilityBatchMock.mockImplementation(async (domains: string[]) =>
      domains.map((domain, index) => ({
        domain,
        available: index < 8,
        provider: "mock",
        latencyMs: 1,
        confidence: "high" as const,
      })),
    )

    const result = await autoFind5AvailableComs({
      keywords: "eco, green, growth",
      industry: "Sustainability & Green Tech",
      vibe: "Luxury",
      maxLen: 9,
      maxAttempts: 3,
      timeCapMs: 8_000,
    })

    expect(result.found.length).toBeGreaterThan(0)
    expect(result.found.length).toBeLessThanOrEqual(5)
    expect(result.stats.generated).toBeGreaterThan(0)
    expect(result.stats.checked).toBeGreaterThan(0)

    for (const pick of result.found) {
      expect(pick.domain.endsWith(".com")).toBe(true)
      expect(pick.score).toBeGreaterThanOrEqual(75)
      expect(pick.meaning.length).toBeGreaterThan(20)
    }
  })
})
