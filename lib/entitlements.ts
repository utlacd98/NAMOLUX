import { adsAreEnabled } from "@/lib/env"
import { getPlanConfig, normalizePlan, type EntitlementSource, type PlanId } from "@/lib/plans"
import { createServiceClient } from "@/lib/supabase/server"

export type AccessState = "free" | "active" | "grace" | "expired"

export type BillingProfile = {
  plan?: string | null
  entitlement_source?: string | null
  subscription_status?: string | null
  subscription_end?: string | null
  stripe_status?: string | null
  access_expires_at?: string | null
  cancel_at_period_end?: boolean | null
  stripe_customer_id?: string | null
}

export type EntitlementResponse = {
  plan: PlanId
  planName: string
  entitlementSource: EntitlementSource
  accessState: AccessState
  isPro: boolean
  adFree: boolean
  showAds: boolean
  canUseBrandPalette: boolean
  unlimitedUsage: boolean
  subscriptionStatus: string
  subscriptionEnd: string | null
  accessExpiresAt: string | null
  customerId: string | null
}

function isFuture(value: string | null | undefined, now: Date): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp > now.getTime()
}

export function computeEntitlements(
  profile: BillingProfile | null | undefined,
  options: { now?: Date; adsEnabled?: boolean; failClosedForAds?: boolean } = {},
): EntitlementResponse {
  const now = options.now || new Date()
  const adsEnabled = options.adsEnabled ?? adsAreEnabled()
  const normalizedPlan = normalizePlan(profile?.plan)
  const rawStatus = profile?.stripe_status || profile?.subscription_status || "inactive"
  const accessExpiresAt = profile?.access_expires_at || profile?.subscription_end || null
  const hasFutureAccess = isFuture(accessExpiresAt, now)

  const isDirectlyActive = rawStatus === "active" || rawStatus === "trialing"
  const isGrace = rawStatus === "past_due" && hasFutureAccess
  const isPaidThrough = (rawStatus === "canceled" || rawStatus === "cancelled") && hasFutureAccess
  const storedSource = profile?.entitlement_source
  const entitlementSource: EntitlementSource = storedSource === "legacy_lifetime"
    ? "legacy_lifetime"
    : storedSource === "subscription" || (normalizedPlan === "pro" && (isDirectlyActive || isGrace || isPaidThrough))
      ? "subscription"
      : "free"
  const hasLifetimeAccess = entitlementSource === "legacy_lifetime"
  const hasPaidAccess = hasLifetimeAccess || (normalizedPlan === "pro" && (isDirectlyActive || isGrace || isPaidThrough))

  const accessState: AccessState = hasPaidAccess
    ? isGrace
      ? "grace"
      : "active"
    : normalizedPlan === "pro"
      ? "expired"
      : "free"
  const plan = getPlanConfig(hasPaidAccess ? "pro" : "free")
  const adFree = hasPaidAccess && plan.adFree

  return {
    plan: plan.id,
    planName: plan.name,
    entitlementSource,
    accessState,
    isPro: hasPaidAccess,
    adFree,
    showAds: adsEnabled && !adFree && !options.failClosedForAds,
    // A free kit includes one palette direction; Pro changes the number of
    // directions and adds logo generation rather than gating the tool itself.
    canUseBrandPalette: plan.canUseBrandPalette,
    unlimitedUsage: hasPaidAccess && plan.unlimitedUsage,
    subscriptionStatus: rawStatus,
    subscriptionEnd: profile?.subscription_end || null,
    accessExpiresAt,
    customerId: profile?.stripe_customer_id || null,
  }
}

export function anonymousEntitlements(options: { adsEnabled?: boolean } = {}): EntitlementResponse {
  return computeEntitlements(null, options)
}

export async function getUserEntitlements(userId: string): Promise<EntitlementResponse> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("profiles")
    .select(
      "plan, entitlement_source, subscription_status, subscription_end, stripe_status, access_expires_at, cancel_at_period_end, stripe_customer_id",
    )
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error
  // An authenticated account without a profile row has an unknown billing
  // state. Preserve free product access, but never infer advertising consent
  // or eligibility until the profile has been repaired.
  return computeEntitlements(data, { failClosedForAds: !data })
}
