import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserEntitlements: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock("@/lib/env", () => ({
  getSupabaseServiceEnvironment: () => ({ serviceRoleKey: "service-role-test-key" }),
}))
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
  createServiceClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}))

import {
  checkQuickBurstLimit,
  checkFeatureQuota,
  checkFeatureQuotaIdempotent,
  checkPlanFeatureQuotaIdempotent,
  getPlanFeatureQuotaState,
  getFeatureQuotaReplayState,
  getFeatureQuotaState,
  getQuickEntitlementState,
} from "./rate-limit"

function request() {
  return new NextRequest("https://www.namolux.com/api/generate-domains", {
    headers: { "x-forwarded-for": "203.0.113.25" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: null } })
  mocks.getUserEntitlements.mockResolvedValue({ isPro: false })
  mocks.rpc.mockResolvedValue({ data: [{ allowed: true, used: 2 }], error: null })
  mocks.upsert.mockResolvedValue({ error: null })
  mocks.maybeSingle.mockResolvedValue({
    data: { usage_count: 2, created_at: "2026-07-14T11:58:00.000Z" },
    error: null,
  })
  mocks.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: mocks.maybeSingle,
    upsert: mocks.upsert,
  })
})

describe("isolated feature allowances", () => {
  it("keeps Quick available as anonymous/free when Auth is unreachable and still consumes its burst counter", async () => {
    mocks.getUser.mockRejectedValue(new TypeError("auth network unavailable"))
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const entitlement = await getQuickEntitlementState(request())
    const burst = await checkQuickBurstLimit(request(), 12)

    expect(entitlement).toEqual({ isPro: false, userId: null, plan: "free" })
    expect(burst).toMatchObject({ allowed: true, used: 2, unavailable: false })
    expect(mocks.getUserEntitlements).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledWith("consume_usage_counter", expect.objectContaining({
      p_subject_type: "anonymous",
      p_feature: "burst:quick-generate",
      p_limit: 12,
    }))
    consoleSpy.mockRestore()
  })

  it("does not bypass Quick abuse protection when Auth is unreachable", async () => {
    mocks.getUser.mockRejectedValue(new TypeError("auth network unavailable"))
    mocks.rpc.mockResolvedValue({ data: [{ allowed: false, used: 12 }], error: null })
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const burst = await checkQuickBurstLimit(request(), 12)

    expect(burst).toMatchObject({ allowed: false, used: 12, unavailable: false })
    expect(mocks.rpc).toHaveBeenCalledOnce()
    consoleSpy.mockRestore()
  })

  it("preflights without consuming so failed generation can be retried", async () => {
    const result = await getFeatureQuotaState(request(), "advanced-generation-monthly", 3)

    expect(result).toMatchObject({ allowed: true, used: 2, limit: 3, remaining: 1 })
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.from).toHaveBeenCalledWith("usage_counters")
  })

  it("closes the free Founder Signal allowance after one unique batch", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { usage_count: 1 }, error: null })

    const result = await getFeatureQuotaState(request(), "founder-signal-batch-monthly", 1)

    expect(result).toMatchObject({
      allowed: false,
      isPro: false,
      used: 1,
      limit: 1,
      remaining: 0,
      statusCode: 429,
    })
  })

  it("atomically consumes the exact feature key and reports its own remaining allowance", async () => {
    const result = await checkFeatureQuota(request(), "advanced-generation-monthly", 3)

    expect(mocks.rpc).toHaveBeenCalledWith("consume_usage_counter", expect.objectContaining({
      p_subject_type: "anonymous",
      p_feature: "advanced-generation-monthly",
      p_limit: 3,
    }))
    expect(result).toMatchObject({ allowed: true, isPro: false, used: 2, limit: 3, remaining: 1, statusCode: 200 })
  })

  it("atomically consumes once for an opaque workflow key", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ allowed: true, used: 1, replayed: false }], error: null })
    mocks.maybeSingle.mockResolvedValue({
      data: { usage_count: 1, created_at: "2026-07-14T11:58:00.000Z" },
      error: null,
    })

    const result = await checkFeatureQuotaIdempotent(
      request(),
      "advanced-generation-monthly",
      3,
      "request_01J2M9NNR3Y6J8QH4T2W7K5P0C",
    )

    expect(mocks.rpc).toHaveBeenCalledWith("consume_usage_counter_idempotent", expect.objectContaining({
      p_feature: "advanced-generation-monthly",
      p_idempotency_hash: expect.stringMatching(/^[a-f0-9]{24}$/),
      p_limit: 3,
    }))
    expect(result).toMatchObject({
      allowed: true,
      used: 1,
      remaining: 2,
      replayed: false,
      receiptCreatedAt: "2026-07-14T11:58:00.000Z",
    })
  })

  it("recognises a previously charged workflow without storing its raw key", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { usage_count: 1 }, error: null })

    const result = await getFeatureQuotaReplayState(
      request(),
      "founder-signal-batch-monthly",
      "workflow_token_01J2M9NNR3Y6J8QH4T2W7K5P0C",
    )

    expect(result).toEqual({ replayed: true, unavailable: false })
    expect(mocks.from).toHaveBeenCalledWith("usage_counters")
  })

  it("bypasses monthly counters for a paid entitlement", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "paid_user" } } })
    mocks.getUserEntitlements.mockResolvedValue({ isPro: true })

    const result = await checkFeatureQuota(request(), "founder-signal-batch-monthly", 1)

    expect(result).toMatchObject({ allowed: true, isPro: true, used: 0, limit: -1, remaining: -1, resetAt: null })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("creates a durable idempotency receipt without consuming a paid allowance", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "paid_user" } } })
    mocks.getUserEntitlements.mockResolvedValue({ isPro: true })
    mocks.maybeSingle.mockResolvedValue({
      data: { usage_count: 0, created_at: "2026-07-14T11:58:00.000Z" },
      error: null,
    })

    const result = await checkFeatureQuotaIdempotent(
      request(),
      "advanced-generation-monthly",
      3,
      "request_01J2M9NNR3Y6J8QH4T2W7K5P0C",
    )

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        subject_type: "user",
        usage_count: 0,
        feature: expect.stringMatching(/^idem:advanced-generation-monthly:/),
      }),
      expect.objectContaining({ ignoreDuplicates: true }),
    )
    expect(result).toMatchObject({
      allowed: true,
      isPro: true,
      used: 0,
      limit: -1,
      remaining: -1,
      receiptCreatedAt: "2026-07-14T11:58:00.000Z",
    })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("meters Pro against the published 120-run workspace cap", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "paid_user" } } })
    mocks.getUserEntitlements.mockResolvedValue({ isPro: true })
    mocks.rpc.mockResolvedValue({ data: [{ allowed: true, used: 120, replayed: false }], error: null })
    mocks.maybeSingle.mockResolvedValue({
      data: { usage_count: 120, created_at: "2026-08-01T11:58:00.000Z" },
      error: null,
    })

    const result = await checkPlanFeatureQuotaIdempotent(
      request(),
      "bulk-check-monthly",
      { free: 3, pro: 120 },
      "bulk_job_01J2M9NNR3Y6J8QH4T2W7K5P0C",
    )

    expect(mocks.rpc).toHaveBeenCalledWith("consume_usage_counter_idempotent", expect.objectContaining({
      p_subject_type: "user",
      p_feature: "bulk-check-monthly",
      p_limit: 120,
    }))
    expect(result).toMatchObject({
      allowed: true,
      isPro: true,
      used: 120,
      limit: 120,
      remaining: 0,
    })
  })

  it("reports a finite Pro allowance without consuming it", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "paid_user" } } })
    mocks.getUserEntitlements.mockResolvedValue({ isPro: true })
    mocks.maybeSingle.mockResolvedValue({ data: { usage_count: 119 }, error: null })

    const result = await getPlanFeatureQuotaState(request(), "founder-signal-batch-monthly", { free: 1, pro: 120 })

    expect(result).toMatchObject({ allowed: true, isPro: true, used: 119, limit: 120, remaining: 1 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("uses a UTC daily window for Free Name Sprint and a monthly window for Pro", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ allowed: true, used: 1, replayed: false }], error: null })
    mocks.maybeSingle.mockResolvedValue({
      data: { usage_count: 1, created_at: "2026-08-31T00:01:00.000Z" },
      error: null,
    })

    await checkPlanFeatureQuotaIdempotent(
      request(),
      "name-sprint",
      { free: 1, pro: 40 },
      "name_sprint_01J2M9NNR3Y6J8QH4T2W7K5P0C",
      { free: "day", pro: "month" },
    )

    const payload = mocks.rpc.mock.calls[0]?.[1]
    const start = new Date(payload.p_window_start)
    const reset = new Date(payload.p_reset_at)
    expect(reset.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1_000)
    expect(payload.p_limit).toBe(1)
  })

  it("fails closed without spending work when the quota database is unavailable", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("database unavailable") })
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await checkFeatureQuota(request(), "founder-signal-batch-monthly", 1)

    expect(result).toMatchObject({ allowed: false, used: 1, limit: 1, remaining: 0, statusCode: 503 })
    consoleSpy.mockRestore()
  })
})
