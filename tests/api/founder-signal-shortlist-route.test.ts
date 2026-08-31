import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { POST } from "@/app/api/founder-signal/shortlist/route"
import { scoreName } from "@/lib/founderSignal/scoreName"
import {
  checkBurstLimit,
  checkPlanFeatureQuotaIdempotentForSubject,
  getPlanFeatureQuotaReplayStateForSubject,
  getPlanFeatureQuotaStateForSubject,
  getQuotaSubject,
} from "@/lib/rate-limit"

vi.mock("@/lib/founderSignal/scoreName", () => ({ scoreName: vi.fn() }))
vi.mock("@/lib/rate-limit", () => ({
  checkBurstLimit: vi.fn(),
  checkPlanFeatureQuotaIdempotentForSubject: vi.fn(),
  getPlanFeatureQuotaReplayStateForSubject: vi.fn(),
  getPlanFeatureQuotaStateForSubject: vi.fn(),
  getQuotaSubject: vi.fn(),
}))

const mockScoreName = vi.mocked(scoreName)
const mockBurst = vi.mocked(checkBurstLimit)
const mockConsume = vi.mocked(checkPlanFeatureQuotaIdempotentForSubject)
const mockReplay = vi.mocked(getPlanFeatureQuotaReplayStateForSubject)
const mockPreflight = vi.mocked(getPlanFeatureQuotaStateForSubject)
const mockSubject = vi.mocked(getQuotaSubject)

function request(body: unknown) {
  return new NextRequest("https://www.namolux.com/api/founder-signal/shortlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function allowance(overrides: Record<string, unknown> = {}) {
  return {
    allowed: true,
    replayed: false,
    receiptCreatedAt: "2026-08-01T00:00:00.000Z",
    isPro: false,
    userId: null,
    plan: "free",
    used: 1,
    limit: 1,
    remaining: 0,
    resetAt: "2026-09-01T00:00:00.000Z",
    statusCode: 200,
    ...overrides,
  } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSubject.mockResolvedValue({ userId: null, subjectType: "anonymous", subjectHash: "a".repeat(64), plan: "free", accessState: "free" })
  mockBurst.mockResolvedValue({ allowed: true, used: 1, resetAt: "2026-08-01T00:01:00.000Z", unavailable: false })
  mockReplay.mockResolvedValue({ replayed: false, unavailable: false })
  mockPreflight.mockResolvedValue(allowance({ used: 0, remaining: 1 }))
  mockConsume.mockResolvedValue(allowance())
  mockScoreName.mockReturnValue({
    score: 86,
    band: "Strong",
    version: "1.0",
    reasons: ["Clear and memorable"],
    rawScores: {
      length: 90,
      clarity: 84,
      pronounceability: 82,
      memorability: 78,
      extension: 100,
      characterQuality: 92,
      brandRisk: 76,
    },
  } as any)
})

describe("/api/founder-signal/shortlist", () => {
  it.each(["NamoLux", "namo lux", "namo-lux", "namolux.com"])("rejects reserved input %s without using quota", async (name) => {
    const response = await POST(request({ names: [name], primaryTld: "com" }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({
      error: "system_reserved_name",
      message: "NamoLux is a reserved platform name and can't be analysed as a candidate.",
    })
    expect(mockBurst).not.toHaveBeenCalled()
    expect(mockScoreName).not.toHaveBeenCalled()
    expect(mockConsume).not.toHaveBeenCalled()
  })

  it("scores every name on the chosen primary TLD and consumes one isolated allowance", async () => {
    const response = await POST(request({
      names: ["Vaulten", "Northline"],
      primaryTld: "ai",
      vibe: "trustworthy",
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.primaryTld).toBe("ai")
    expect(json.results).toHaveLength(2)
    expect(json.results[0]).toMatchObject({
      name: "vaulten",
      tld: "ai",
      fullDomain: "vaulten.ai",
      score: 86,
      pronounceable: true,
      memorability: 7.8,
      founderSignal: { band: "Strong", version: "1.0" },
    })
    expect(mockScoreName).toHaveBeenCalledTimes(2)
    expect(mockConsume).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "free" }),
      "founder-signal-batch-monthly",
      { free: 1, pro: 120 },
      expect.stringMatching(/^[a-f0-9]{64}$/),
    )
  })

  it("normalises the legacy checked-domain payload to one comparable primary TLD", async () => {
    const response = await POST(request({
      domains: [
        { name: "Vaulten", tld: "com" },
        { name: "Vaulten", tld: "io" },
        { name: "Northline", tld: "com" },
      ],
      primaryTld: "com",
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.results.map((item: { fullDomain: string }) => item.fullDomain)).toEqual(["vaulten.com", "northline.com"])
    expect(mockScoreName).toHaveBeenCalledTimes(2)
  })

  it("rejects invalid input before rate-limit or scoring work", async () => {
    const response = await POST(request({ names: ["--bad--"], primaryTld: "xyz" }))

    expect(response.status).toBe(400)
    expect(mockBurst).not.toHaveBeenCalled()
    expect(mockScoreName).not.toHaveBeenCalled()
    expect(mockConsume).not.toHaveBeenCalled()
  })

  it("does not reveal scores once the free allowance is exhausted", async () => {
    mockPreflight.mockResolvedValue(allowance({ allowed: false, statusCode: 429, used: 1, remaining: 0 }))

    const response = await POST(request({ names: ["vaulten"], primaryTld: "com" }))
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json).toMatchObject({
      error: "founder_signal_monthly_limit_reached",
      upgradeUrl: "/pricing?reason=founder-signal-limit&from=founder-signal",
    })
    expect(mockScoreName).not.toHaveBeenCalled()
    expect(mockConsume).not.toHaveBeenCalled()
  })

  it("retains the published 120-run paid cap rather than bypassing it", async () => {
    mockSubject.mockResolvedValue({ userId: "paid-user", subjectType: "user", subjectHash: "b".repeat(64), plan: "pro", accessState: "active" })
    mockPreflight.mockResolvedValue(allowance({ isPro: true, plan: "pro", used: 119, limit: 120, remaining: 1 }))
    mockConsume.mockResolvedValue(allowance({ isPro: true, plan: "pro", used: 120, limit: 120, remaining: 0 }))

    const response = await POST(request({ names: ["vaulten"], primaryTld: "com" }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.allowance).toMatchObject({ used: 120, limit: 120, remaining: 0 })
    expect(mockConsume).toHaveBeenCalledWith(expect.objectContaining({ plan: "pro" }), expect.any(String), { free: 1, pro: 120 }, expect.any(String))
  })

  it("keeps lapsed accounts read-only instead of falling back to free scoring", async () => {
    mockSubject.mockResolvedValue({ userId: "lapsed-user", subjectType: "user", subjectHash: "c".repeat(64), plan: "free", accessState: "expired" })

    const response = await POST(request({ names: ["vaulten"], primaryTld: "com" }))
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe("subscription_lapsed_read_only")
    expect(mockScoreName).not.toHaveBeenCalled()
    expect(mockConsume).not.toHaveBeenCalled()
  })
})
