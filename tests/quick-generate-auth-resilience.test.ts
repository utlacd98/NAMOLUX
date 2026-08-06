import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserEntitlements: vi.fn(),
  rpc: vi.fn(),
  generate: vi.fn(),
  trackMetric: vi.fn(),
}))

vi.mock("@/lib/env", () => ({
  getSupabaseServiceEnvironment: () => ({ serviceRoleKey: "service-role-test-key" }),
}))
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
  createServiceClient: () => ({ rpc: mocks.rpc }),
}))
vi.mock("@/lib/domainGen/quickGenerateGroq", () => ({ generateGroqQuickCandidates: mocks.generate }))
vi.mock("@/lib/domainGen/availability", () => ({ checkAvailabilityBatch: vi.fn() }))
vi.mock("@/lib/metrics", () => ({ trackMetric: mocks.trackMetric }))

import { POST } from "@/app/api/quick-generate/route"

const originalFeatureFlag = process.env.GENERATOR_REDESIGN_V2
const originalWorkflowSecret = process.env.GENERATION_WORKFLOW_SECRET

function request() {
  return new NextRequest("http://localhost/api/quick-generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.42",
    },
    body: JSON.stringify({ description: "AI scheduling for independent founders", style: "auto" }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GENERATOR_REDESIGN_V2 = "true"
  process.env.GENERATION_WORKFLOW_SECRET = "quick-auth-resilience-test-secret"
  mocks.getUser.mockRejectedValue(new TypeError("auth network unavailable"))
  mocks.getUserEntitlements.mockResolvedValue({ isPro: true })
  mocks.rpc.mockResolvedValue({ data: [{ allowed: true, used: 1 }], error: null })
  mocks.generate.mockResolvedValue({
    candidates: Array.from({ length: 16 }, (_, index) => ({
      name: `resilient${String.fromCharCode(97 + index)}`,
      personality: `Resilient candidate ${index + 1} is tailored to a scheduling product for independent founders.`,
      style: "brandable",
    })),
    provider: "openai",
    usedGroq: false,
    usedOpenAI: true,
    modelBacked: true,
    modelCandidateCount: 16,
    modelGroundedCandidateCount: 0,
    fallbackCandidateCount: 0,
    fallbackGroundedCandidateCount: 0,
    groundedCandidateCount: 0,
    exploratoryCandidateCount: 16,
    editoriallyReviewed: true,
    editorialCandidateCount: 16,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  if (originalFeatureFlag === undefined) delete process.env.GENERATOR_REDESIGN_V2
  else process.env.GENERATOR_REDESIGN_V2 = originalFeatureFlag
  if (originalWorkflowSecret === undefined) delete process.env.GENERATION_WORKFLOW_SECRET
  else process.env.GENERATION_WORKFLOW_SECRET = originalWorkflowSecret
})

describe("POST /api/quick-generate during an Auth outage", () => {
  it("continues as anonymous/free while counting the request against the IP burst limit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await POST(request())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, isPro: false, state: "names_ready" })
    expect(payload.candidates).toHaveLength(16)
    expect(mocks.getUser).toHaveBeenCalledTimes(2)
    expect(mocks.getUserEntitlements).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledWith("consume_usage_counter", expect.objectContaining({
      p_subject_type: "anonymous",
      p_feature: "burst:quick-generate",
      p_limit: 12,
    }))
  })

  it("still rejects the request when the anonymous burst allowance is exhausted", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.rpc.mockResolvedValue({ data: [{ allowed: false, used: 12 }], error: null })

    const response = await POST(request())
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload.error).toBe("quick_generate_rate_limited")
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(mocks.getUserEntitlements).not.toHaveBeenCalled()
  })
})
