import { beforeEach, describe, expect, it, vi } from "vitest"

const generateCandidatePoolMock = vi.fn()
const checkAvailabilityBatchMock = vi.fn()

vi.mock("@/lib/domainGen/generateCandidates", () => ({
  generateCandidatePool: (...args: any[]) => generateCandidatePoolMock(...args),
}))

vi.mock("@/lib/domainGen/availability", () => ({
  checkAvailabilityBatch: (...args: any[]) => checkAvailabilityBatchMock(...args),
}))

import { runAutoFindV2 } from "@/lib/domainGen/autofind"

describe("runAutoFindV2 relaxation", () => {
  beforeEach(() => {
    generateCandidatePoolMock.mockReset()
    checkAvailabilityBatchMock.mockReset()
  })

  it("applies relaxation steps and improves find count", async () => {
    generateCandidatePoolMock.mockImplementation((input: any, options: any) => {
      const maxLen = options?.relaxedMaxLength || input.maxLength || 10

      if (maxLen <= 5) {
        return {
          candidates: [
            { name: "novaio", strategy: "vibe_compound", roots: ["nova", "io"], keywordHits: ["nova"] },
          ],
          keywordTokens: ["nova"],
          relatedTerms: ["nova", "mint"],
        }
      }

      return {
        candidates: [
          { name: "novaio", strategy: "vibe_compound", roots: ["nova", "io"], keywordHits: ["nova"] },
          { name: "lumeno", strategy: "semantic_compound", roots: ["lumen", "io"], keywordHits: [] },
          { name: "mintio", strategy: "semantic_compound", roots: ["mint", "io"], keywordHits: ["mint"] },
        ],
        keywordTokens: ["nova", "mint"],
        relatedTerms: ["nova", "mint", "lumen"],
      }
    })

    checkAvailabilityBatchMock.mockImplementation(async (domains: string[]) =>
      domains.map((domain) => ({
        domain,
        available: domain.includes("novaio") || domain.includes("mintio"),
        provider: "mock",
        latencyMs: 1,
        confidence: "high" as const,
      })),
    )

    const result = await runAutoFindV2(
      {
        keyword: "nova",
        industry: "Technology",
        vibe: "futuristic",
        maxLength: 5,
        targetCount: 2,
        controls: {
          seed: "relax-seed",
          mustIncludeKeyword: "partial",
          keywordPosition: "anywhere",
          style: "real_words",
          blocklist: [],
          allowlist: [],
          allowHyphen: false,
          allowNumbers: false,
          preferTwoWordBrands: false,
          allowVibeSuffix: false,
          showAnyAvailable: false,
        },
      },
      {
        targetCount: 2,
        maxAttempts: 4,
      },
    )

    expect(result.summary.found).toBeGreaterThan(0)
    expect(result.summary.attempts).toBeGreaterThan(1)
    expect(result.summary.relaxationsApplied).toContain("Maximum length increased by 1 character")
  })
})

