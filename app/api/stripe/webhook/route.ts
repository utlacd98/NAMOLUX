import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServiceClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const customerEmail = session.customer_details?.email

  if (!customerEmail) {
    console.error("No customer email in checkout session")
    return
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const supabase = createServiceClient()

  // Find user by email or by supabase_user_id in metadata
  const supabaseUserId = subscription.metadata?.supabase_user_id

  if (supabaseUserId) {
    // Update user profile by Supabase user ID
    const { error } = await supabase
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan: "pro",
        subscription_status: "active",
        subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("id", supabaseUserId)

    if (error) {
      console.error("Error updating profile by user ID:", error)
    } else {
      console.log(`Subscription activated for user ${supabaseUserId}`)
    }
  } else {
    // Fallback: find user by email
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single()

    if (findError || !profile) {
      console.error("No profile found for email:", customerEmail)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan: "pro",
        subscription_status: "active",
        subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("id", profile.id)

    if (error) {
      console.error("Error updating profile by email:", error)
    } else {
      console.log(`Subscription activated for ${customerEmail}`)
    }
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const supabase = createServiceClient()

  // Find user by subscription ID
  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("stripe_subscription_id", subscription.id)
    .single()

  if (findError || !profile) {
    console.error(`No user found for subscription ${subscription.id}`)
    return
  }

  // Map Stripe status to our subscription_status
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "inactive",
    trialing: "active",
    incomplete: "inactive",
    incomplete_expired: "inactive",
    paused: "inactive",
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_status: statusMap[subscription.status] || "inactive",
      subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", profile.id)

  if (error) {
    console.error("Error updating subscription:", error)
  } else {
    console.log(`Subscription updated for user ${profile.email}: ${subscription.status}`)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createServiceClient()

  // Find user by subscription ID
  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("stripe_subscription_id", subscription.id)
    .single()

  if (findError || !profile) return

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "free",
      subscription_status: "cancelled",
      subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("id", profile.id)

  if (error) {
    console.error("Error cancelling subscription:", error)
  } else {
    console.log(`Subscription cancelled for user ${profile.email}`)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Subscription renewed successfully
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("stripe_subscription_id", subscriptionId)
    .single()

  if (profile) {
    // Ensure subscription is marked as active on successful payment
    await supabase
      .from("profiles")
      .update({ subscription_status: "active" })
      .eq("id", profile.id)

    console.log(`Invoice paid for user ${profile.email}`)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("stripe_subscription_id", subscriptionId)
    .single()

  if (profile) {
    await supabase
      .from("profiles")
      .update({ subscription_status: "past_due" })
      .eq("id", profile.id)

    console.log(`Payment failed for user ${profile.email}`)
  }
}
