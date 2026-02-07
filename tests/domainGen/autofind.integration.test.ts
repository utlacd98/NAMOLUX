import { beforeEach, describe, expect, it, vi } from "vitest"

const checkAvailabilityBatchMock = vi.fn()

vi.mock("@/lib/domainGen/availability", () => ({
  checkAvailabilityBatch: (...args: any[]) => checkAvailabilityBatchMock(...args),
}))

import { runAutoFindV2 } from "@/lib/domainGen/autofind"

describe("runAutoFindV2 integration-style flow", () => {
  beforeEach(() => {
    checkAvailabilityBatchMock.mockReset()
  })

  it("returns 5 picks when enough domains are available", async () => {
    checkAvailabilityBatchMock.mockImplementation(async (domains: string[]) =>
      domains.map((domain, index) => ({
        domain,
        available: index < 5,
        provider: "mock",
        latencyMs: 1,
        confidence: "high" as const,
      })),
    )

    const result = await runAutoFindV2(
      {
        keyword: "blink pixel snap",
        industry: "Technology",
        vibe: "futuristic",
        maxLength: 9,
        targetCount: 5,
        controls: {
          mustIncludeKeyword: "partial",
          keywordPosition: "anywhere",
          style: "real_words",
          blocklist: [],
          allowlist: [],
          allowHyphen: false,
          allowNumbers: false,
          meaningFirst: true,
          preferTwoWordBrands: true,
          allowVibeSuffix: true,
          showAnyAvailable: false,
        },
      },
      {
        targetCount: 5,
        maxAttempts: 4,
        poolSize: 520,
        shortlistSize: 180,
      },
    )

    expect(result.picks.length).toBe(5)
    expect(result.summary.found).toBe(5)
    expect(result.summary.checkedAvailability).toBeGreaterThanOrEqual(5)
  })
})


