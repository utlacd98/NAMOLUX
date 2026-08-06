import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  checkBurstLimit: vi.fn(),
  getEntitlementState: vi.fn(),
  logGeneration: vi.fn(),
  checkAvailabilityBatch: vi.fn(),
  verifyToken: vi.fn(),
  trackMetric: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  checkBurstLimit: mocks.checkBurstLimit,
  getEntitlementState: mocks.getEntitlementState,
  logGeneration: mocks.logGeneration,
}))
vi.mock("@/lib/domainGen/availability", () => ({ checkAvailabilityBatch: mocks.checkAvailabilityBatch }))
vi.mock("@/lib/generation-workflow-token", () => ({ verifyGenerationWorkflowToken: mocks.verifyToken }))
vi.mock("@/lib/metrics", () => ({ trackMetric: mocks.trackMetric }))

import { POST } from "@/app/api/check-domain/route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyToken.mockReturnValue(true)
  mocks.checkBurstLimit.mockResolvedValue({ allowed: true, unavailable: false, resetAt: null })
  mocks.getEntitlementState.mockResolvedValue({
    isPro: false,
    userId: null,
    plan: "free",
  })
  mocks.checkAvailabilityBatch.mockResolvedValue([])
})

describe("generated-name availability continuation", () => {
  it("does not consume a second use even when generation used the final free allowance", async () => {
    const request = new NextRequest("http://localhost/api/check-domain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domains: ["timepilot", "carepath"], tlds: ["com"], workflowToken: "signed-token" }),
    })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.workflowContinuation).toBe(true)
    expect(mocks.getEntitlementState).toHaveBeenCalledOnce()
    expect(mocks.checkBurstLimit).toHaveBeenCalledOnce()
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.logGeneration).not.toHaveBeenCalled()
  })
})
