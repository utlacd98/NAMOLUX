import { describe, expect, it } from "vitest"
import type Stripe from "stripe"
import { subscriptionUsesAllowedPriceIds } from "@/lib/stripe-plans"

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
