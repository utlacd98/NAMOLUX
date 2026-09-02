import { afterEach, describe, expect, it, vi } from "vitest"
import type Stripe from "stripe"
import { getStripeAllowedPriceIds, getStripePaidPriceId, subscriptionUsesAllowedPriceIds } from "@/lib/stripe-plans"

function subscriptionWithPrice(priceId: string): Pick<Stripe.Subscription, "items"> {
  return {
    items: {
      data: [{ price: { id: priceId } }],
    },
  } as unknown as Pick<Stripe.Subscription, "items">
}

describe("subscriptionUsesAllowedPriceIds", () => {
  it("accepts an exact NamoLux price", () => {
    expect(
      subscriptionUsesAllowedPriceIds(subscriptionWithPrice("price_namolux"), new Set(["price_namolux"])),
    ).toBe(true)
  })

  it("rejects an unrelated product in a shared Stripe account", () => {
    expect(
      subscriptionUsesAllowedPriceIds(subscriptionWithPrice("price_other_product"), new Set(["price_namolux"])),
    ).toBe(false)
  })
})

describe("Stripe Pro billing variants", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("selects monthly and annual prices independently", () => {
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_monthly")
    vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "price_annual")

    expect(getStripePaidPriceId("monthly")).toBe("price_monthly")
    expect(getStripePaidPriceId("annual")).toBe("price_annual")
    expect(getStripeAllowedPriceIds().has("price_monthly")).toBe(true)
    expect(getStripeAllowedPriceIds().has("price_annual")).toBe(true)
  })
})
