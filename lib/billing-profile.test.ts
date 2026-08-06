import { describe, expect, it } from "vitest"
import type Stripe from "stripe"
import { billingStateFromSubscription } from "@/lib/billing-profile"

const now = new Date("2026-07-10T12:00:00.000Z")

function subscription(status: Stripe.Subscription.Status, periodEnd: string): Stripe.Subscription {
  return {
    id: "sub_test",
    status,
    cancel_at_period_end: status === "canceled",
    customer: "cus_test",
    items: {
      data: [{ current_period_end: Math.floor(Date.parse(periodEnd) / 1_000) }],
    },
  } as unknown as Stripe.Subscription
}

describe("billingStateFromSubscription", () => {
  it("grants paid access to active subscriptions", () => {
    const state = billingStateFromSubscription(subscription("active", "2026-08-10T12:00:00.000Z"), now)
    expect(state).toMatchObject({ plan: "pro", subscriptionStatus: "active", stripeStatus: "active" })
  })

  it("keeps canceled subscriptions paid through a future period end", () => {
    const state = billingStateFromSubscription(subscription("canceled", "2026-07-20T12:00:00.000Z"), now)
    expect(state).toMatchObject({ plan: "pro", subscriptionStatus: "cancelled" })
    expect(state.accessExpiresAt).toBe("2026-07-20T12:00:00.000Z")
  })

  it("revokes canceled subscriptions whose paid period has ended", () => {
    const state = billingStateFromSubscription(subscription("canceled", "2026-07-09T12:00:00.000Z"), now)
    expect(state).toMatchObject({ plan: "free", subscriptionStatus: "cancelled" })
  })

  it("uses a bounded seven-day grace period for past-due subscriptions", () => {
    const state = billingStateFromSubscription(subscription("past_due", "2026-08-10T12:00:00.000Z"), now)
    expect(state).toMatchObject({ plan: "pro", subscriptionStatus: "past_due" })
    expect(state.accessExpiresAt).toBe("2026-07-17T12:00:00.000Z")
  })
})
