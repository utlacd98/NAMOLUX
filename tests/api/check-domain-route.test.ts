import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/check-domain/route"
import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { scoreName } from "@/lib/founderSignal/scoreName"
import { verifyGenerationWorkflowToken } from "@/lib/generation-workflow-token"
import { checkBurstLimit, checkRateLimit, getEntitlementState, logGeneration } from "@/lib/rate-limit"

vi.mock("@/lib/domainGen/availability", () => ({
  checkAvailabilityBatch: vi.fn(),
}))

vi.mock("@/lib/founderSignal/scoreName", () => ({
  scoreName: vi.fn(),
}))

vi.mock("@/lib/generation-workflow-token", () => ({
  verifyGenerationWorkflowToken: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkBurstLimit: vi.fn(),
  checkRateLimit: vi.fn(),
  getEntitlementState: vi.fn(),
  logGeneration: vi.fn(),
}))

vi.mock("@/lib/metrics", () => ({
  trackMetric: vi.fn(),
}))

const mockCheckAvailabilityBatch = vi.mocked(checkAvailabilityBatch)
const mockCheckBurstLimit = vi.mocked(checkBurstLimit)
const mockScoreName = vi.mocked(scoreName)
const mockVerifyGenerationWorkflowToken = vi.mocked(verifyGenerationWorkflowToken)
const mockCheckRateLimit = vi.mocked(checkRateLimit)
const mockGetEntitlementState = vi.mocked(getEntitlementState)
const mockLogGeneration = vi.mocked(logGeneration)
const originalFlag = process.env.GENERATOR_REDESIGN_V2

function makeRequest(body: unknown) {
  return new Request("https://www.namolux.com/api/check-domain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any
}

function rateLimitState(isPro: boolean) {
  return {
    allowed: true,
    isPro,
    userId: isPro ? "user_paid" : null,
    tokensUsed: 0,
    tokensTotal: isPro ? -1 : 3,
    remaining: isPro ? -1 : 3,
    plan: isPro ? "pro" : "free",
    resetAt: null,
    canUseBrandPalette: isPro,
  } as const
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.GENERATOR_REDESIGN_V2
  mockGetEntitlementState.mockResolvedValue({ isPro: false, userId: null, plan: "free" } as any)
  mockCheckBurstLimit.mockResolvedValue({
    allowed: true,
    used: 1,
    resetAt: "2026-07-14T12:01:00.000Z",
    unavailable: false,
  })
  mockLogGeneration.mockResolvedValue(undefined)
  mockVerifyGenerationWorkflowToken.mockReturnValue(false)
  mockCheckAvailabilityBatch.mockResolvedValue([
    {
      domain: "greenuxe.com",
      available: true,
      provider: "tiered",
      latencyMs: 12,
      cached: false,
      confidence: "high",
      tieredDetails: {
        status: "available",
        tier1: { google: "available", cloudflare: "available" },
        tier2: { rdap: "available" },
      },
    },
  ] as any)
  mockScoreName.mockReturnValue({
    score: 88,
    rawScores: {
      length: 90,
      pronounceability: 84,
      memorability: 82,
      extension: 100,
      characterQuality: 95,
      brandRisk: 80,
    },
  } as any)
})

afterEach(() => {
  if (originalFlag === undefined) delete process.env.GENERATOR_REDESIGN_V2
  else process.env.GENERATOR_REDESIGN_V2 = originalFlag
})

describe("/api/check-domain", () => {
  it("keeps availability but omits Founder Signal fields for free users", async () => {
    mockCheckRateLimit.mockResolvedValue(rateLimitState(false) as any)

    const response = await POST(makeRequest({ domains: ["greenuxe"], tlds: ["com"] }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.founderSignalUnlocked).toBe(false)
    expect(json.results).toHaveLength(1)
    expect(json.results[0]).toMatchObject({
      name: "greenuxe",
      tld: "com",
      fullDomain: "greenuxe.com",
      available: true,
      length: 8,
    })
    expect(json.results[0]).not.toHaveProperty("score")
    expect(json.results[0]).not.toHaveProperty("founderSignal")
    expect(json.results[0]).not.toHaveProperty("memorability")
    expect(json.results[0]).not.toHaveProperty("pronounceable")
    expect(mockLogGeneration).toHaveBeenCalled()
  })

  it("returns Founder Signal fields for paid users", async () => {
    mockCheckRateLimit.mockResolvedValue(rateLimitState(true) as any)
    mockGetEntitlementState.mockResolvedValue({ isPro: true, userId: "user_paid", plan: "pro" } as any)

    const response = await POST(makeRequest({ domains: ["greenuxe"], tlds: ["com"] }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.founderSignalUnlocked).toBe(true)
    expect(json.results[0]).toMatchObject({
      score: 88,
      pronounceable: true,
      memorability: 8.2,
      founderSignal: {
        score: 88,
        rawScores: {
          extension: 100,
        },
      },
    })
    expect(mockLogGeneration).not.toHaveBeenCalled()
  })

  it("accepts the advertised 50-name batch across all six extensions", async () => {
    mockCheckRateLimit.mockResolvedValue(rateLimitState(false) as any)
    const domains = Array.from({ length: 50 }, (_, index) => `brand${index}`)

    const response = await POST(makeRequest({ domains }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.results).toHaveLength(300)
    expect(mockCheckAvailabilityBatch).toHaveBeenCalledWith(
      expect.arrayContaining(["brand0.com", "brand49.dev"]),
      expect.objectContaining({ concurrency: 12 }),
    )
  })

  it("lets the focused bulk workspace defer Founder Signal to its explicit scoring step", async () => {
    mockCheckRateLimit.mockResolvedValue(rateLimitState(true) as any)

    const response = await POST(makeRequest({
      domains: ["greenuxe"],
      tlds: ["com"],
      includeFounderSignal: false,
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.founderSignalUnlocked).toBe(false)
    expect(json.results[0]).not.toHaveProperty("score")
    expect(mockScoreName).not.toHaveBeenCalled()
  })

  it("preserves rate-limit response shape", async () => {
    mockCheckRateLimit.mockResolvedValue({
      ...rateLimitState(false),
      allowed: false,
      tokensUsed: 3,
      remaining: 0,
      resetAt: "2026-07-01T00:00:00.000Z",
      message: "Free plan includes 3 uses per month. Upgrade for unlimited access.",
    } as any)

    const response = await POST(makeRequest({ domains: ["greenuxe"], tlds: ["com"] }))
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json).toMatchObject({
      error: "monthly_usage_limit_reached",
      tokensUsed: 3,
      tokensTotal: 3,
      remaining: 0,
      resetAt: "2026-07-01T00:00:00.000Z",
    })
    expect(mockCheckAvailabilityBatch).not.toHaveBeenCalled()
  })

  it("burst-limits replayed availability work before provider calls", async () => {
    mockCheckBurstLimit.mockResolvedValue({
      allowed: false,
      used: 30,
      resetAt: "2026-07-14T12:01:00.000Z",
      unavailable: false,
    })

    const response = await POST(makeRequest({ domains: ["greenuxe"], tlds: ["com"] }))

    expect(response.status).toBe(429)
    expect(mockCheckAvailabilityBatch).not.toHaveBeenCalled()
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
  })

  it("keeps generation order and performs no automatic Founder Signal work for a signed v2 continuation", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mockGetEntitlementState.mockResolvedValue({ isPro: true, userId: "user_paid", plan: "pro" } as any)
    mockVerifyGenerationWorkflowToken.mockImplementation((_token, _names, subject) => subject.startsWith("availability:"))
    mockCheckAvailabilityBatch.mockResolvedValue([
      { domain: "firstname.com", available: false, provider: "tiered", latencyMs: 10, cached: false, confidence: "high" },
      { domain: "secondname.com", available: true, provider: "tiered", latencyMs: 10, cached: false, confidence: "high" },
    ] as any)

    const response = await POST(makeRequest({ domains: ["firstname", "secondname"], tlds: ["com"], workflowToken: "signed-v2-token" }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.founderSignalUnlocked).toBe(false)
    expect(json.candidateFirstContinuation).toBe(true)
    expect(json.results.map((item: { name: string }) => item.name)).toEqual(["firstname", "secondname"])
    expect(json.results[0]).not.toHaveProperty("score")
    expect(json.results[1]).not.toHaveProperty("founderSignal")
    expect(mockScoreName).not.toHaveBeenCalled()
  })

  it("preserves Founder Signal for the shared Pro bulk checker while the redesign flag is on", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mockCheckRateLimit.mockResolvedValue(rateLimitState(true) as any)

    const response = await POST(makeRequest({ domains: ["greenuxe"], tlds: ["com"] }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.candidateFirstContinuation).toBe(false)
    expect(json.founderSignalUnlocked).toBe(true)
    expect(json.results[0]).toHaveProperty("founderSignal.score", 88)
    expect(mockScoreName).toHaveBeenCalledOnce()
  })
})
