import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import {
  billingStateFromSubscription,
  getStripeId,
  syncSubscriptionProfile,
  updateBillingProfile,
} from "@/lib/billing-profile"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe-client"
import { getStripeAllowedPriceIds, isAllowedNamoLuxSubscription } from "@/lib/stripe-plans"

function subscriptionStillGrantsAccess(subscription: Stripe.Subscription): boolean {
  return isAllowedNamoLuxSubscription(subscription) && billingStateFromSubscription(subscription).plan === "pro"
}

async function findSubscriptionByUserId(userId: string): Promise<Stripe.Subscription | null> {
  try {
    const result = await getStripeClient().subscriptions.search({
      query: `metadata['supabase_user_id']:'${userId}'`,
      limit: 25,
    })
    return result.data.find(subscriptionStillGrantsAccess) || null
  } catch (error) {
    console.warn("Stripe subscription metadata search failed:", error)
    return null
  }
}

async function findSubscriptionByVerifiedCustomer(
  email: string,
  userId: string,
  storedCustomerId: string | null,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient()
  const customerIds = new Set<string>()
  if (storedCustomerId) customerIds.add(storedCustomerId)

  const customers = await stripe.customers.list({ email, limit: 25 })
  for (const customer of customers.data) {
    if (!customer.deleted && customer.metadata?.supabase_user_id === userId) {
      customerIds.add(customer.id)
    }
  }

  for (const customerId of customerIds) {
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })
    const match = subscriptions.data.find(subscriptionStillGrantsAccess)
    if (match) return match
  }

  return null
}

async function sessionHasAllowedPrice(sessionId: string): Promise<boolean> {
  const allowedPriceIds = getStripeAllowedPriceIds()
  if (allowedPriceIds.size === 0) return false

  const lineItems = await getStripeClient().checkout.sessions.listLineItems(sessionId, { limit: 100 })
  return lineItems.data.some((item) => item.price?.id && allowedPriceIds.has(item.price.id))
}

async function sessionHasRetainedPayment(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.mode !== "payment" || session.payment_status !== "paid" || (session.amount_total || 0) <= 0) {
    return false
  }

  const paymentIntentId = getStripeId(session.payment_intent)
  if (!paymentIntentId) return false

  const paymentIntent = await getStripeClient().paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  })
  if (paymentIntent.status !== "succeeded" || paymentIntent.amount_received <= 0) return false

  const charge = typeof paymentIntent.latest_charge === "string" ? null : paymentIntent.latest_charge
  if (!charge || charge.disputed) return false

  return paymentIntent.amount_received - charge.amount_refunded > 0
}

async function findLegacyLifetimePurchase(userId: string): Promise<Stripe.Checkout.Session | null> {
  const sessions = getStripeClient().checkout.sessions.list({ limit: 100 })

  for await (const session of sessions) {
    const belongsToUser =
      session.metadata?.supabase_user_id === userId || session.client_reference_id === userId
    if (!belongsToUser) continue
    if (!(await sessionHasAllowedPrice(session.id))) continue
    if (await sessionHasRetainedPayment(session)) return session
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const enteredEmail = typeof body?.email === "string" ? body.email.toLowerCase().trim() : ""
    if (!enteredEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "You must be signed in to restore paid access" }, { status: 401 })
    }

    const accountEmail = user.email?.toLowerCase().trim()
    if (!accountEmail || enteredEmail !== accountEmail) {
      return NextResponse.json(
        { error: "Use the email address on your signed-in NamoLux account." },
        { status: 403 },
      )
    }

    const service = createServiceClient()
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("entitlement_source, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle()
    if (profileError) throw profileError

    if (profile?.entitlement_source === "legacy_lifetime") {
      return NextResponse.json({ success: true, restored: "legacy_lifetime" })
    }

    const subscription =
      (await findSubscriptionByUserId(user.id)) ||
      (await findSubscriptionByVerifiedCustomer(accountEmail, user.id, profile?.stripe_customer_id || null))

    if (subscription) {
      await syncSubscriptionProfile({ userId: user.id, email: user.email, subscription })
      return NextResponse.json({ success: true, restored: "subscription" })
    }

    const lifetimeSession = await findLegacyLifetimePurchase(user.id)
    if (lifetimeSession) {
      await updateBillingProfile({
        userId: user.id,
        email: user.email,
        plan: "pro",
        entitlementSource: "legacy_lifetime",
        stripeCustomerId: getStripeId(lifetimeSession.customer),
        subscriptionStatus: "inactive",
        stripeStatus: "legacy_lifetime",
        subscriptionEnd: null,
        accessExpiresAt: null,
        cancelAtPeriodEnd: false,
      })
      return NextResponse.json({ success: true, restored: "legacy_lifetime" })
    }

    return NextResponse.json(
      { error: "No eligible NamoLux subscription or retained lifetime purchase was found for this account." },
      { status: 404 },
    )
  } catch (error) {
    console.error("Restore paid access failed:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
