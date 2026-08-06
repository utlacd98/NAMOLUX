import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  class SeoMonitoringError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly status = 400,
    ) {
      super(message)
      this.name = "SeoMonitoringError"
    }
  }

  return {
    SeoMonitoringError,
    getPrincipal: vi.fn(),
    getDashboard: vi.fn(),
    runManualAudit: vi.fn(),
  }
})

vi.mock("@/lib/seo-monitoring-access", () => ({
  getSeoMonitoringPrincipal: mocks.getPrincipal,
  monitoringAccessError: () => null,
}))

vi.mock("@/lib/seo-monitoring-service", () => ({
  SeoMonitoringError: mocks.SeoMonitoringError,
  getSeoMonitoringDashboard: mocks.getDashboard,
  runManualSeoAudit: mocks.runManualAudit,
}))

import { GET } from "@/app/api/founder-signal/seo/route"
import { POST as runManualAudit } from "@/app/api/founder-signal/seo/sites/[siteId]/audit/route"

const SITE_ID = "00000000-0000-4000-8000-000000000001"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Founder Signal SEO API contract", () => {
  it("keeps the signed-out dashboard envelope aligned with signed-in responses", async () => {
    mocks.getPrincipal.mockResolvedValue(null)

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      authenticated: false,
      isPro: false,
      accessState: "free",
      performanceAvailable: false,
      notificationDeliveryAvailable: false,
    })
    expect(payload.projects).toEqual([])
    expect(payload.sites).toEqual([])
  })

  it("returns a machine-readable reset time for manual audit cooldowns", async () => {
    const resetAt = "2026-07-17T16:00:00.000Z"
    mocks.getPrincipal.mockResolvedValue({ userId: "user-1" })
    mocks.runManualAudit.mockRejectedValue(new mocks.SeoMonitoringError(
      "manual_audit_cooldown",
      `The next manual audit is available at ${resetAt}.`,
      429,
    ))

    const response = await runManualAudit(new Request("https://www.namolux.com"), {
      params: Promise.resolve({ siteId: SITE_ID }),
    })

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: "manual_audit_cooldown",
      message: `The next manual audit is available at ${resetAt}.`,
      resetAt,
    })
  })

  it("does not invent a reset time for unrelated monitoring errors", async () => {
    mocks.getPrincipal.mockResolvedValue({ userId: "user-1" })
    mocks.runManualAudit.mockRejectedValue(new mocks.SeoMonitoringError(
      "audit_in_progress",
      "An audit is already running for this website.",
      409,
    ))

    const response = await runManualAudit(new Request("https://www.namolux.com"), {
      params: Promise.resolve({ siteId: SITE_ID }),
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: "audit_in_progress",
      message: "An audit is already running for this website.",
    })
  })
})
