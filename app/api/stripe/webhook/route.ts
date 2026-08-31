import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripeEnvironment } from "@/lib/env"
import { getStripeId, syncSubscriptionProfile } from "@/lib/billing-profile"
import { createServiceClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe-client"
import { isAllowedNamoLuxSubscription } from "@/lib/stripe-plans"
import { claimStripeEvent, completeStripeEvent, failStripeEvent } from "@/lib/stripe-events"
import { trackMetric } from "@/lib/metrics"

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature")
  const webhookSecret = getStripeEnvironment().webhookSecret
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook signature missing" }, { status: 400 })
  }

  const body = await request.text()
  let event: Stripe.Event

  try {
    event = getStripeClient().webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    console.warn("Stripe webhook signature verification failed", {
      reason: "invalid_signature",
    })
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  try {
    const claim = await claimStripeEvent(event)
    if (claim === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true })
    }

    await processStripeEvent(event)
    await completeStripeEvent(event.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook processing failed:", error)
    await failStripeEvent(event.id, error).catch((ledgerError) => {
      console.error("Stripe webhook ledger update failed:", ledgerError)
    })
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function processStripeEvent(event: Stripe.Event): Promise<void> {
  if (event.type === "checkout.session.completed") {
    await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, event.created)
    return
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await handleSubscription(event.data.object as Stripe.Subscription, event.created)
    return
  }

  if (event.type === "invoice.paid") {
    await handlePaidInvoice(event.data.object as Stripe.Invoice)
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session, eventCreated: number): Promise<void> {
  if (session.mode !== "subscription" || session.status !== "complete") return

  const subscriptionId = getStripeId(session.subscription)
  if (!subscriptionId) return

  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId)
  if (!isAllowedNamoLuxSubscription(subscription)) {
    console.warn("Ignoring checkout for a non-NamoLux Stripe price", { sessionId: session.id })
    return
  }
  const userId = session.metadata?.supabase_user_id || subscription.metadata?.supabase_user_id
  if (!userId) {
    console.error("Checkout subscription is missing Supabase user metadata", { sessionId: session.id })
    return
  }

  await syncSubscriptionProfile({
    userId,
    email: session.customer_details?.email || session.customer_email || null,
    subscription,
    eventCreated,
  })
  if (subscription.status === "trialing") {
    await trackMetric({ action: "trial_started", metadata: { source: "stripe", mode: "subscription" } })
  }
}

async function handlePaidInvoice(invoice: Stripe.Invoice): Promise<void> {
  if (
    invoice.amount_paid <= 0
    || invoice.parent?.type !== "subscription_details"
    || !invoice.parent.subscription_details
  ) return
  const subscriptionId = getStripeId(invoice.parent.subscription_details.subscription)
  if (!subscriptionId) return
  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId)
  if (!isAllowedNamoLuxSubscription(subscription) || subscription.status !== "active") return
  await trackMetric({ action: "purchase_completed", metadata: { source: "stripe", mode: "subscription" } })
}

async function handleSubscription(subscription: Stripe.Subscription, eventCreated: number): Promise<void> {
  if (!isAllowedNamoLuxSubscription(subscription)) return

  const userId = await resolveSubscriptionUserId(subscription)
  if (!userId) {
    console.error("Stripe subscription is not linked to a NamoLux profile", {
      subscriptionId: subscription.id,
    })
    return
  }

  await syncSubscriptionProfile({ userId, subscription, eventCreated })
}

async function resolveSubscriptionUserId(subscription: Stripe.Subscription): Promise<string | null> {
  if (subscription.metadata?.supabase_user_id) return subscription.metadata.supabase_user_id

  const customerId = getStripeId(subscription.customer)
  if (!customerId) return null

  const service = createServiceClient()
  const { data, error } = await service
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()
  if (error) throw error
  return data?.id || null
}
