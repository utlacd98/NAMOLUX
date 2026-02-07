import { beforeEach, describe, expect, it, vi } from "vitest"

const generateCandidatePoolMock = vi.fn()
const checkAvailabilityBatchMock = vi.fn()
const scoreNameMock = vi.fn()

vi.mock("@/lib/domainGen/generateCandidates", () => ({
  generateCandidatePool: (...args: any[]) => generateCandidatePoolMock(...args),
}))

vi.mock("@/lib/domainGen/availability", () => ({
  checkAvailabilityBatch: (...args: any[]) => checkAvailabilityBatchMock(...args),
}))

vi.mock("@/lib/founderSignal/scoreName", () => ({
  scoreName: (...args: any[]) => scoreNameMock(...args),
}))

import { autoFind5DotComByFounderScore } from "@/lib/autofind/autoFindByFounderScore"

describe("autoFind5DotComByFounderScore", () => {
  beforeEach(() => {
    generateCandidatePoolMock.mockReset()
    checkAvailabilityBatchMock.mockReset()
    scoreNameMock.mockReset()
  })

  it("rejects brethub, planiohub, plniq, futurns even when availability is true", async () => {
    generateCandidatePoolMock.mockReturnValue({
      candidates: [
        { name: "brethub" },
        { name: "planiohub" },
        { name: "plniq" },
        { name: "futurns" },
        { name: "soilux" },
      ],
      keywordTokens: ["eco"],
      relatedTerms: ["green"],
    })

    scoreNameMock.mockImplementation(({ name }: { name: string }) => ({
      score: name === "soilux" ? 91 : 98,
      label: "Pronounceable",
      reasons: ["mock-score"],
      breakdown: {
        lengthScore: 18,
        pronounceScore: 16,
        memorabilityScore: 12,
        extensionScore: 10,
        characterScore: 14,
        brandRiskPenalty: 0,
        relevanceScore: 20,
      },
    }))

    checkAvailabilityBatchMock.mockImplementation(async (domains: string[]) =>
      domains.map((domain) => ({
        domain,
        available: true,
        provider: "mock",
        latencyMs: 1,
        confidence: "high" as const,
      })),
    )

    const result = await autoFind5DotComByFounderScore({
      keywords: "eco, green",
      industry: "Sustainability & Green Tech",
      vibe: "Minimal",
      maxAttempts: 1,
      poolSize: 20,
      topNToCheck: 10,
      scoreFloor: 80,
    })

    const pickedNames = result.found.map((item) => item.name)

    expect(pickedNames).toContain("soilux")
    expect(result.found[0]?.domain.endsWith(".com")).toBe(true)
    expect(pickedNames).not.toContain("brethub")
    expect(pickedNames).not.toContain("planiohub")
    expect(pickedNames).not.toContain("plniq")
    expect(pickedNames).not.toContain("futurns")
  })

  it("prefers higher Founder Signal scores when both are available", async () => {
    generateCandidatePoolMock.mockReturnValue({
      candidates: [{ name: "soilux" }, { name: "terravio" }, { name: "verdava" }],
      keywordTokens: ["eco"],
      relatedTerms: ["green"],
    })

    scoreNameMock.mockImplementation(({ name }: { name: string }) => {
      const table: Record<string, number> = {
        terravio: 95,
        verdava: 88,
        soilux: 82,
      }

      return {
        score: table[name] || 70,
        label: "Brandable",
        reasons: [`score:${table[name] || 70}`],
        breakdown: {
          lengthScore: 18,
          pronounceScore: 14,
          memorabilityScore: 12,
          extensionScore: 10,
          characterScore: 14,
          brandRiskPenalty: 0,
          relevanceScore: 20,
        },
      }
    })

    checkAvailabilityBatchMock.mockImplementation(async (domains: string[]) =>
      domains.map((domain) => ({
        domain,
        available: true,
        provider: "mock",
        latencyMs: 1,
        confidence: "high" as const,
      })),
    )

    const result = await autoFind5DotComByFounderScore({
      keywords: "eco, green",
      industry: "Sustainability & Green Tech",
      vibe: "Luxury",
      maxAttempts: 1,
      poolSize: 30,
      topNToCheck: 10,
      scoreFloor: 80,
    })

    expect(result.found.length).toBe(3)
    expect(result.found[0].name).toBe("terravio")
    expect(result.found[1].name).toBe("verdava")
    expect(result.found[2].name).toBe("soilux")
    expect(result.found[0].founderScore).toBeGreaterThan(result.found[2].founderScore)
  })

  it("returns fewer than 5 with refusal message when most domains are taken", async () => {
    generateCandidatePoolMock.mockReturnValue({
      candidates: [
        { name: "soilux" },
        { name: "terravio" },
        { name: "verdava" },
        { name: "greenora" },
        { name: "bloomera" },
        { name: "lumenva" },
      ],
      keywordTokens: ["eco"],
      relatedTerms: ["green"],
    })

    scoreNameMock.mockImplementation(({ name }: { name: string }) => ({
      score: ["soilux", "terravio", "verdava", "greenora", "bloomera", "lumenva"].includes(name) ? 86 : 60,
      label: "Pronounceable",
      reasons: ["high-founder-score"],
      breakdown: {
        lengthScore: 18,
        pronounceScore: 16,
        memorabilityScore: 12,
        extensionScore: 10,
        characterScore: 14,
        brandRiskPenalty: 0,
        relevanceScore: 16,
      },
    }))

    checkAvailabilityBatchMock.mockImplementation(async (domains: string[]) => {
      const available = new Set(["soilux.com", "verdava.com"])
      return domains.map((domain) => ({
        domain,
        available: available.has(domain),
        provider: "mock",
        latencyMs: 1,
        confidence: "high" as const,
      }))
    })

    const result = await autoFind5DotComByFounderScore({
      keywords: "eco, green",
      industry: "Sustainability & Green Tech",
      vibe: "Minimal",
      maxAttempts: 1,
      poolSize: 40,
      topNToCheck: 20,
      scoreFloor: 80,
    })

    expect(result.found.length).toBe(2)
    expect(result.message).toBe(
      "Found 2 premium domains within the attempt/time cap. We refuse to show low-scoring names.",
    )
  })

  it("uses alternate TLDs when .com is unavailable but quality remains high", async () => {
    generateCandidatePoolMock.mockReturnValue({
      candidates: [{ name: "soilux" }, { name: "terravio" }],
      keywordTokens: ["eco"],
      relatedTerms: ["green"],
    })

    scoreNameMock.mockImplementation(({ name, tld }: { name: string; tld: string }) => {
      const base = name === "soilux" ? 90 : 88
      const tldBonus = tld === "com" ? 5 : tld === "io" ? 3 : 1
      return {
        score: base + tldBonus,
        label: "Pronounceable",
        reasons: [`${name}-${tld}`],
        breakdown: {
          lengthScore: 18,
          pronounceScore: 16,
          memorabilityScore: 12,
          extensionScore: 10,
          characterScore: 14,
          brandRiskPenalty: 0,
          relevanceScore: 20,
        },
      }
    })

    checkAvailabilityBatchMock.mockImplementation(async (domains: string[]) =>
      domains.map((domain) => ({
        domain,
        available: domain.endsWith(".io"),
        provider: "mock",
        latencyMs: 1,
        confidence: "high" as const,
      })),
    )

    const result = await autoFind5DotComByFounderScore({
      keywords: "eco, green",
      industry: "Sustainability & Green Tech",
      vibe: "Minimal",
      maxAttempts: 1,
      poolSize: 20,
      topNToCheck: 20,
      scoreFloor: 80,
      tlds: ["com", "io", "app"],
    })

    expect(result.found.length).toBe(2)
    expect(result.found.every((pick) => pick.tld === "io")).toBe(true)
    expect(result.found.every((pick) => pick.domain.endsWith(".io"))).toBe(true)
  })
})
