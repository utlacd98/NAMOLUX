import { db } from "@/lib/db"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "none"

export interface SubscriptionInfo {
  isSubscribed: boolean
  status: SubscriptionStatus
  endDate: Date | null
  canAccess: boolean // true if active, trialing, or in grace period
}

/**
 * Check if a user has an active subscription by email
 */
export async function getSubscriptionByEmail(email: string): Promise<SubscriptionInfo> {
  const user = await db.user.findUnique({
    where: { email },
    select: {
      subscriptionStatus: true,
      subscriptionEndDate: true,
    },
  })

  if (!user || !user.subscriptionStatus) {
    return {
      isSubscribed: false,
      status: "none",
      endDate: null,
      canAccess: false,
    }
  }

  const status = user.subscriptionStatus as SubscriptionStatus
  const endDate = user.subscriptionEndDate

  // User can access if:
  // - Status is active or trialing
  // - Status is canceled but end date is in the future (grace period)
  const canAccess =
    status === "active" ||
    status === "trialing" ||
    (status === "canceled" && endDate && endDate > new Date())

  return {
    isSubscribed: status === "active" || status === "trialing",
    status,
    endDate,
    canAccess,
  }
}

/**
 * Check if a user has an active subscription by Stripe customer ID
 */
export async function getSubscriptionByCustomerId(customerId: string): Promise<SubscriptionInfo> {
  const user = await db.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: {
      subscriptionStatus: true,
      subscriptionEndDate: true,
    },
  })

  if (!user || !user.subscriptionStatus) {
    return {
      isSubscribed: false,
      status: "none",
      endDate: null,
      canAccess: false,
    }
  }

  const status = user.subscriptionStatus as SubscriptionStatus
  const endDate = user.subscriptionEndDate

  const canAccess =
    status === "active" ||
    status === "trialing" ||
    (status === "canceled" && endDate && endDate > new Date())

  return {
    isSubscribed: status === "active" || status === "trialing",
    status,
    endDate,
    canAccess,
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
  return session.url
}

/**
 * Cancel a subscription (at period end)
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * Reactivate a canceled subscription (before period ends)
 */
export async function reactivateSubscription(subscriptionId: string): Promise<void> {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

