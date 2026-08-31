import { describe, expect, it, vi } from "vitest"
import { hasValidCronSecret, monitoringAccessError } from "@/lib/seo-monitoring-access"

function request(authorization?: string) {
  return {
    headers: new Headers(authorization ? { authorization } : undefined),
  } as never
}

describe("SEO monitoring cron authentication", () => {
  it("fails closed when no secret is configured", () => {
    vi.stubEnv("CRON_SECRET", "")
    expect(hasValidCronSecret(request("Bearer anything"))).toBe(false)
    vi.unstubAllEnvs()
  })

  it("requires the exact bearer value", () => {
    vi.stubEnv("CRON_SECRET", "a-long-random-secret")
    expect(hasValidCronSecret(request("Bearer a-long-random-secret"))).toBe(true)
    expect(hasValidCronSecret(request("Bearer wrong"))).toBe(false)
    expect(hasValidCronSecret(request())).toBe(false)
    vi.unstubAllEnvs()
  })
})

describe("SEO monitoring account access", () => {
  it("requires authentication", () => {
    expect(monitoringAccessError(null)).toMatchObject({ status: 401, body: { error: "authentication_required" } })
  })

  it("allows authenticated free and lapsed accounts to retain monitoring access", () => {
    expect(monitoringAccessError({ entitlements: { isPro: false, accessState: "free" } } as never)).toBeNull()
    expect(monitoringAccessError({ entitlements: { isPro: false, accessState: "expired" } } as never)).toBeNull()
  })

  it("allows active paid access", () => {
    expect(monitoringAccessError({ entitlements: { isPro: true, accessState: "active" } } as never)).toBeNull()
  })
})
