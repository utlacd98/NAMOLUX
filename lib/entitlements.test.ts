import { describe, expect, it } from "vitest"
import { anonymousEntitlements, computeEntitlements } from "@/lib/entitlements"

const now = new Date("2026-07-10T00:00:00.000Z")

describe("computeEntitlements", () => {
  it("shows ads to an eligible anonymous visitor when ads are enabled", () => {
    expect(anonymousEntitlements({ adsEnabled: true })).toMatchObject({
      plan: "free",
      adFree: false,
      showAds: true,
    })
  })

  it("keeps active paid accounts ad free", () => {
    expect(
      computeEntitlements(
        { plan: "pro", stripe_status: "active", access_expires_at: "2026-08-10T00:00:00.000Z" },
        { now, adsEnabled: true },
      ),
    ).toMatchObject({ plan: "pro", accessState: "active", isPro: true, adFree: true, showAds: false })
  })

  it("recognises legacy Paid plan values as Pro access", () => {
    expect(
      computeEntitlements(
        { plan: "Paid", stripe_status: "active", access_expires_at: "2026-08-10T00:00:00.000Z" },
        { now, adsEnabled: true },
      ),
    ).toMatchObject({ plan: "pro", accessState: "active", isPro: true, adFree: true, showAds: false })
  })

  it("preserves grandfathered lifetime access without an active subscription", () => {
    expect(
      computeEntitlements(
        {
          plan: "pro",
          entitlement_source: "legacy_lifetime",
          subscription_status: "inactive",
        },
        { now, adsEnabled: true },
      ),
    ).toMatchObject({
      plan: "pro",
      entitlementSource: "legacy_lifetime",
      accessState: "active",
      isPro: true,
      adFree: true,
      showAds: false,
    })
  })

  it("keeps trial accounts ad free", () => {
    expect(
      computeEntitlements(
        { plan: "pro", stripe_status: "trialing", access_expires_at: "2026-07-17T00:00:00.000Z" },
        { now, adsEnabled: true },
      ),
    ).toMatchObject({ accessState: "active", adFree: true, showAds: false })
  })

  it("honours a paid-through cancellation", () => {
    expect(
      computeEntitlements(
        { plan: "pro", stripe_status: "canceled", access_expires_at: "2026-07-20T00:00:00.000Z" },
        { now, adsEnabled: true },
      ),
    ).toMatchObject({ accessState: "active", adFree: true, showAds: false })
  })

  it("honours a past-due grace period", () => {
    expect(
      computeEntitlements(
        { plan: "pro", stripe_status: "past_due", access_expires_at: "2026-07-17T00:00:00.000Z" },
        { now, adsEnabled: true },
      ),
    ).toMatchObject({ accessState: "grace", adFree: true, showAds: false })
  })

  it("expires canceled access after the paid-through date", () => {
    expect(
      computeEntitlements(
        { plan: "pro", stripe_status: "canceled", access_expires_at: "2026-07-01T00:00:00.000Z" },
        { now, adsEnabled: true },
      ),
    ).toMatchObject({ plan: "free", accessState: "expired", isPro: false, adFree: false, showAds: true })
  })

  it("fails closed for advertising when eligibility is unknown", () => {
    expect(computeEntitlements(null, { now, adsEnabled: true, failClosedForAds: true }).showAds).toBe(false)
  })
})
