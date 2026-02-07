import { clearAvailabilityCache } from "@/lib/domainGen/availability/cache"
import { checkAvailability, checkAvailabilityBatch } from "@/lib/domainGen/availability"
import type { AvailabilityProvider } from "@/lib/domainGen/types"

describe("availability adapter", () => {
  beforeEach(() => {
    clearAvailabilityCache()
  })

  it("falls back to secondary provider when primary errors", async () => {
    const failingProvider: AvailabilityProvider = {
      name: "failing",
      async check(domain: string) {
        return {
          domain,
          available: false,
          provider: "failing",
          latencyMs: 5,
          confidence: "low",
          error: "provider_down",
        }
      },
    }

    const fallbackProvider: AvailabilityProvider = {
      name: "fallback",
      async check(domain: string) {
        return {
          domain,
          available: true,
          provider: "fallback",
          latencyMs: 7,
          confidence: "medium",
        }
      },
    }

    const result = await checkAvailability("exampletestdomain.com", {
      providers: [failingProvider, fallbackProvider],
      maxRetries: 0,
      ttlMs: 60_000,
    })

    expect(result.available).toBe(true)
    expect(result.provider).toBe("fallback")
  })

  it("returns cached results on repeated checks", async () => {
    let callCount = 0

    const provider: AvailabilityProvider = {
      name: "counted",
      async check(domain: string) {
        callCount += 1
        return {
          domain,
          available: callCount % 2 === 1,
          provider: "counted",
          latencyMs: 2,
          confidence: "high",
        }
      },
    }

    const first = await checkAvailability("cachecheckdomain.com", {
      providers: [provider],
      ttlMs: 60_000,
      maxRetries: 0,
    })

    const second = await checkAvailability("cachecheckdomain.com", {
      providers: [provider],
      ttlMs: 60_000,
      maxRetries: 0,
    })

    expect(first.available).toBe(true)
    expect(second.cached).toBe(true)
    expect(callCount).toBe(1)
  })

  it("handles batch checks with concurrency", async () => {
    const provider: AvailabilityProvider = {
      name: "batch",
      async check(domain: string) {
        return {
          domain,
          available: domain.includes("open"),
          provider: "batch",
          latencyMs: 1,
          confidence: "medium",
        }
      },
    }

    const results = await checkAvailabilityBatch(["openname.com", "takendomain.com"], {
      providers: [provider],
      concurrency: 2,
      maxRetries: 0,
    })

    const map = new Map(results.map((item) => [item.domain, item.available]))
    expect(map.get("openname.com")).toBe(true)
    expect(map.get("takendomain.com")).toBe(false)
  })

  it("deduplicates repeated domains within the same batch", async () => {
    let callCount = 0

    const provider: AvailabilityProvider = {
      name: "dedupe",
      async check(domain: string) {
        callCount += 1
        return {
          domain,
          available: true,
          provider: "dedupe",
          latencyMs: 1,
          confidence: "high",
        }
      },
    }

    await checkAvailabilityBatch(["repeatdomain.com", "repeatdomain.com", "repeatdomain.com"], {
      providers: [provider],
      concurrency: 3,
      maxRetries: 0,
    })

    expect(callCount).toBe(1)
  })
})
