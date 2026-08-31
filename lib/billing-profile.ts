import type Stripe from "stripe"
import { createServiceClient } from "@/lib/supabase/server"
import { normalizePlan, type EntitlementSource, type PlanId } from "@/lib/plans"

export type BillingStatus = "active" | "inactive" | "cancelled" | "past_due"

export type BillingProfileUpdate = {
  userId: string
  email?: string | null
  plan?: PlanId
  entitlementSource?: EntitlementSource
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  subscriptionStatus?: BillingStatus
  subscriptionEnd?: string | null
  stripeStatus?: string | null
  accessExpiresAt?: string | null
  cancelAtPeriodEnd?: boolean
  trialStartedAt?: string | null
  trialSubscriptionId?: string | null
  eventCreated?: number
}

export type BillingUpdateResult = "updated" | "stale"

export function getStripeId(value: string | { id?: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id || null
}

export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const itemPeriodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number")
  const legacyPeriodEnd = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end
  const periodEnd = itemPeriodEnds.length > 0 ? Math.max(...itemPeriodEnds) : legacyPeriodEnd
  return typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null
}

function addDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function billingStateFromSubscription(subscription: Stripe.Subscription, now = new Date()) {
  const stripeStatus = subscription.status
  const subscriptionEnd = getSubscriptionPeriodEnd(subscription)
  const periodIsFuture = subscriptionEnd ? Date.parse(subscriptionEnd) > now.getTime() : false

  if (stripeStatus === "active" || stripeStatus === "trialing") {
    return {
      plan: "pro" as const,
      subscriptionStatus: "active" as const,
      stripeStatus,
      subscriptionEnd,
      accessExpiresAt: subscriptionEnd,
    }
  }

  if (stripeStatus === "past_due") {
    return {
      plan: "pro" as const,
      subscriptionStatus: "past_due" as const,
      stripeStatus,
      subscriptionEnd,
      accessExpiresAt: addDays(now, 7),
    }
  }

  if (stripeStatus === "canceled") {
    return {
      plan: periodIsFuture ? ("pro" as const) : ("free" as const),
      subscriptionStatus: "cancelled" as const,
      stripeStatus,
      subscriptionEnd,
      accessExpiresAt: periodIsFuture ? subscriptionEnd : now.toISOString(),
    }
  }

  return {
    plan: "free" as const,
    subscriptionStatus: stripeStatus === "unpaid" ? ("past_due" as const) : ("inactive" as const),
    stripeStatus,
    subscriptionEnd,
    accessExpiresAt: now.toISOString(),
  }
}

export async function updateBillingProfile(update: BillingProfileUpdate): Promise<BillingUpdateResult> {
  const service = createServiceClient()
  const payload = {
    ...(update.plan !== undefined ? { plan: normalizePlan(update.plan) } : {}),
    ...(update.entitlementSource !== undefined ? { entitlement_source: update.entitlementSource } : {}),
    ...(update.stripeCustomerId !== undefined ? { stripe_customer_id: update.stripeCustomerId } : {}),
    ...(update.stripeSubscriptionId !== undefined ? { stripe_subscription_id: update.stripeSubscriptionId } : {}),
    ...(update.subscriptionStatus ? { subscription_status: update.subscriptionStatus } : {}),
    ...(update.subscriptionEnd !== undefined ? { subscription_end: update.subscriptionEnd } : {}),
    ...(update.stripeStatus !== undefined ? { stripe_status: update.stripeStatus } : {}),
    ...(update.accessExpiresAt !== undefined ? { access_expires_at: update.accessExpiresAt } : {}),
    ...(update.cancelAtPeriodEnd !== undefined ? { cancel_at_period_end: update.cancelAtPeriodEnd } : {}),
    ...(update.trialStartedAt !== undefined ? { trial_started_at: update.trialStartedAt } : {}),
    ...(update.trialSubscriptionId !== undefined ? { trial_subscription_id: update.trialSubscriptionId } : {}),
    ...(update.eventCreated !== undefined ? { last_stripe_event_created: update.eventCreated } : {}),
  }

  let query = service.from("profiles").update(payload).eq("id", update.userId)
  if (update.eventCreated !== undefined) {
    query = query.or(
      `last_stripe_event_created.is.null,last_stripe_event_created.lte.${Math.floor(update.eventCreated)}`,
    )
  }

  const { data, error } = await query.select("id").maybeSingle()
  if (!error && data) return "updated"
  if (!error && !data && update.eventCreated !== undefined) return "stale"
  if (!update.email) throw error || new Error("Profile not found for billing update")

  const { error: upsertError } = await service.from("profiles").upsert(
    {
      id: update.userId,
      email: update.email,
      plan: "free",
      ...payload,
    },
    { onConflict: "id", ignoreDuplicates: true },
  )

  if (upsertError) throw upsertError
  return "updated"
}

export async function syncSubscriptionProfile(input: {
  userId: string
  email?: string | null
  subscription: Stripe.Subscription
  eventCreated?: number
}): Promise<BillingUpdateResult> {
  const state = billingStateFromSubscription(input.subscription)
  const service = createServiceClient()
  const { data: currentProfile, error: profileError } = await service
    .from("profiles")
    .select("entitlement_source")
    .eq("id", input.userId)
    .maybeSingle()
  if (profileError) throw profileError

  const preservesLifetimeAccess = currentProfile?.entitlement_source === "legacy_lifetime"
  return updateBillingProfile({
    userId: input.userId,
    email: input.email,
    ...state,
    plan: preservesLifetimeAccess ? "pro" : state.plan,
    entitlementSource: preservesLifetimeAccess
      ? "legacy_lifetime"
      : state.plan === "pro"
        ? "subscription"
        : "free",
    stripeCustomerId: getStripeId(input.subscription.customer),
    stripeSubscriptionId: input.subscription.id,
    cancelAtPeriodEnd: input.subscription.cancel_at_period_end,
    ...(typeof input.subscription.trial_start === "number"
      ? {
          trialStartedAt: new Date(input.subscription.trial_start * 1000).toISOString(),
          trialSubscriptionId: input.subscription.id,
        }
      : {}),
    eventCreated: input.eventCreated,
  })
}

export async function revokePaidAccess(
  userId: string,
  subscriptionStatus: BillingStatus = "cancelled",
): Promise<void> {
  const service = createServiceClient()
  const { data: profile, error: lookupError } = await service
    .from("profiles")
    .select("entitlement_source")
    .eq("id", userId)
    .maybeSingle()
  if (lookupError) throw lookupError

  const preservesLifetimeAccess = profile?.entitlement_source === "legacy_lifetime"
  const { error } = await service
    .from("profiles")
    .update({
      plan: preservesLifetimeAccess ? "pro" : "free",
      entitlement_source: preservesLifetimeAccess ? "legacy_lifetime" : "free",
      subscription_status: subscriptionStatus,
      access_expires_at: preservesLifetimeAccess ? null : new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) throw error
}
