import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  checkBurstLimit: vi.fn(),
  checkFeatureQuotaIdempotent: vi.fn(),
  getFeatureQuotaReplayState: vi.fn(),
  verifyToken: vi.fn(),
  getEntitlementState: vi.fn(),
  getFeatureQuotaState: vi.fn(),
  scoreName: vi.fn(),
}))

vi.mock("@/lib/generation-workflow-token", () => ({
  ADVANCED_SCORING_TOKEN_TTL_MS: 24 * 60 * 60 * 1_000,
  verifyGenerationWorkflowToken: mocks.verifyToken,
}))
vi.mock("@/lib/rate-limit", () => ({
  checkBurstLimit: mocks.checkBurstLimit,
  checkFeatureQuotaIdempotent: mocks.checkFeatureQuotaIdempotent,
  getFeatureQuotaReplayState: mocks.getFeatureQuotaReplayState,
  getClientIP: () => "203.0.113.8",
  getEntitlementState: mocks.getEntitlementState,
  getFeatureQuotaState: mocks.getFeatureQuotaState,
}))
vi.mock("@/lib/founderSignal/scoreName", () => ({ scoreName: mocks.scoreName }))

import { POST } from "@/app/api/founder-signal/batch/route"
import { createGeneratedNameId } from "@/lib/domainGen/generatedName"

const originalFlag = process.env.GENERATOR_REDESIGN_V2

function request(body: unknown, signal?: AbortSignal) {
  return new NextRequest("https://www.namolux.com/api/founder-signal/batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
}

function allowance(allowed = true) {
  return {
    allowed,
    isPro: false,
    userId: "user_1",
    plan: "free",
    used: 1,
    limit: 1,
    remaining: 0,
    resetAt: "2026-08-01T00:00:00.000Z",
    statusCode: allowed ? 200 : 429,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GENERATOR_REDESIGN_V2 = "true"
  mocks.checkBurstLimit.mockResolvedValue({
    allowed: true,
    used: 1,
    resetAt: "2026-07-14T12:01:00.000Z",
    unavailable: false,
  })
  mocks.getFeatureQuotaReplayState.mockResolvedValue({ replayed: false, unavailable: false })
  mocks.verifyToken.mockReturnValue(true)
  mocks.getEntitlementState.mockResolvedValue({ isPro: false, userId: "user_1", plan: "free" })
  mocks.getFeatureQuotaState.mockResolvedValue({ ...allowance(), used: 0, remaining: 1 })
  mocks.checkFeatureQuotaIdempotent.mockResolvedValue({ ...allowance(), replayed: false })
  mocks.scoreName.mockImplementation(({ name }: { name: string }) => ({
    score: name === "riskname" ? 0 : 82,
    band: name === "riskname" ? "Reconsider" : "Strong",
    rawScores: { clarity: 80, memorability: 78 },
    reasons: name === "riskname" ? ["Active-brand collision"] : ["Easy to pronounce"],
    version: "1.0",
  }))
})

afterEach(() => {
  if (originalFlag === undefined) delete process.env.GENERATOR_REDESIGN_V2
  else process.env.GENERATOR_REDESIGN_V2 = originalFlag
})

describe("POST /api/founder-signal/batch", () => {
  const candidates = [
    { id: createGeneratedNameId("calmledger", 1), name: "calmledger" },
    { id: createGeneratedNameId("riskname", 2), name: "riskname" },
  ]

  it("rejects the reserved platform name before token, entitlement, or quota work", async () => {
    const response = await POST(request({
      workflowToken: "token",
      candidates: [{ id: "name_reserved", name: "NamoLux.com" }],
    }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({
      error: "system_reserved_name",
      message: "NamoLux is a reserved platform name and can't be analysed as a candidate.",
    })
    expect(mocks.verifyToken).not.toHaveBeenCalled()
    expect(mocks.getEntitlementState).not.toHaveBeenCalled()
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
  })

  it("is unavailable until the server rollout flag is enabled", async () => {
    delete process.env.GENERATOR_REDESIGN_V2
    const response = await POST(request({ workflowToken: "token", candidates }))
    expect(response.status).toBe(404)
    expect(mocks.getEntitlementState).not.toHaveBeenCalled()
  })

  it("scores every signed candidate in generation order without filtering or ranking", async () => {
    const response = await POST(request({ workflowToken: "token", candidates, vibe: "trustworthy" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.verifyToken).toHaveBeenCalledWith(
      "token",
      ["calmledger", "riskname"],
      "advanced-founder-signal:user:user_1",
      expect.any(Number),
      24 * 60 * 60 * 1_000,
      { binding: "ordered" },
    )
    expect(mocks.checkFeatureQuotaIdempotent).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "founder-signal-batch-monthly",
      1,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    )
    expect(payload.results.map((item: { name: string }) => item.name)).toEqual(["calmledger", "riskname"])
    expect(payload.results[1].founderSignal).toMatchObject({ status: "ready", score: 0, band: "Reconsider" })
    expect(payload.allowance).toEqual({ used: 1, limit: 1, remaining: 0, resetAt: "2026-08-01T00:00:00.000Z" })
  })

  it("rate-limits repeated scoring before score work or allowance consumption", async () => {
    mocks.checkBurstLimit.mockResolvedValue({
      allowed: false,
      used: 10,
      resetAt: "2026-07-14T12:01:00.000Z",
      unavailable: false,
    })

    const response = await POST(request({ workflowToken: "token", candidates }))

    expect(response.status).toBe(429)
    expect(mocks.scoreName).not.toHaveBeenCalled()
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
  })

  it("does not consume scoring allowance for an invalid or expired workflow token", async () => {
    mocks.verifyToken.mockReturnValue(false)
    const response = await POST(request({ workflowToken: "expired", candidates }))
    expect(response.status).toBe(403)
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
    expect(mocks.scoreName).not.toHaveBeenCalled()
  })

  it("rejects substituted candidate ids before entitlement, scoring, or quota work", async () => {
    const response = await POST(request({
      workflowToken: "token",
      candidates: [{ id: "name_substituted", name: "calmledger" }],
    }))
    expect(response.status).toBe(400)
    expect(mocks.getEntitlementState).not.toHaveBeenCalled()
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
  })

  it("does not consume the allowance when deterministic scoring fails", async () => {
    mocks.scoreName.mockImplementation(() => { throw new Error("scoring failed") })
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await POST(request({ workflowToken: "token", candidates }))

    expect(response.status).toBe(500)
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it("does not score or consume an allowance after cancellation", async () => {
    const controller = new AbortController()
    controller.abort()

    const response = await POST(request({ workflowToken: "token", candidates }, controller.signal))

    expect(response.status).toBe(499)
    expect(mocks.scoreName).not.toHaveBeenCalled()
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
  })

  it("returns the dedicated upgrade response after the free scored batch is used", async () => {
    mocks.getFeatureQuotaState.mockResolvedValue(allowance(false))
    const response = await POST(request({ workflowToken: "token", candidates }))
    const payload = await response.json()
    expect(response.status).toBe(429)
    expect(payload).toMatchObject({
      error: "founder_signal_monthly_limit_reached",
      upgradeUrl: "/pricing",
      tokensUsed: 1,
      tokensTotal: 1,
      remaining: 0,
    })
    expect(mocks.scoreName).not.toHaveBeenCalled()
  })

  it("replays the same scored workflow after a lost response without another charge", async () => {
    mocks.getFeatureQuotaReplayState.mockResolvedValue({ replayed: true, unavailable: false })
    mocks.getFeatureQuotaState.mockResolvedValue(allowance(false))
    mocks.checkFeatureQuotaIdempotent.mockResolvedValue({ ...allowance(), replayed: true })

    const response = await POST(request({ workflowToken: "token", candidates }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.replayed).toBe(true)
    expect(payload.results).toHaveLength(2)
    expect(mocks.checkFeatureQuotaIdempotent).toHaveBeenCalledTimes(1)
  })

  it("does not treat a different TLD or vibe as the same free scored batch", async () => {
    const first = await POST(request({ workflowToken: "token", candidates, tld: "com", vibe: "trustworthy" }))
    const firstKey = mocks.getFeatureQuotaReplayState.mock.calls[0]?.[2]

    mocks.getFeatureQuotaReplayState.mockResolvedValue({ replayed: false, unavailable: false })
    mocks.getFeatureQuotaState.mockResolvedValue(allowance(false))
    mocks.scoreName.mockClear()
    const variant = await POST(request({ workflowToken: "token", candidates, tld: "ai", vibe: "playful" }))
    const variantKey = mocks.getFeatureQuotaReplayState.mock.calls[1]?.[2]

    expect(first.status).toBe(200)
    expect(variant.status).toBe(429)
    expect(firstKey).toMatch(/^[a-f0-9]{64}$/)
    expect(variantKey).toMatch(/^[a-f0-9]{64}$/)
    expect(variantKey).not.toBe(firstKey)
    expect(mocks.scoreName).not.toHaveBeenCalled()
  })

  it("rejects oversized batches before entitlement or quota work", async () => {
    const tooMany = Array.from({ length: 21 }, (_, index) => ({ id: `name_${index}`, name: `name${index}` }))
    const response = await POST(request({ workflowToken: "token", candidates: tooMany }))
    expect(response.status).toBe(400)
    expect(mocks.getEntitlementState).not.toHaveBeenCalled()
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
  })
})
