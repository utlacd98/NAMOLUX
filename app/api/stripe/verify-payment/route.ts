import { NextRequest, NextResponse } from "next/server"
import { syncSubscriptionProfile } from "@/lib/billing-profile"
import { trackMetric } from "@/lib/metrics"
import { createClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe-client"
import { isAllowedNamoLuxSubscription } from "@/lib/stripe-plans"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : ""
    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.mode !== "subscription" || session.status !== "complete") {
      return NextResponse.json({ error: "Checkout is not complete" }, { status: 400 })
    }
    if (session.metadata?.supabase_user_id !== user.id) {
      return NextResponse.json({ error: "Payment session does not belong to this account" }, { status: 403 })
    }

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 400 })
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    if (!isAllowedNamoLuxSubscription(subscription)) {
      return NextResponse.json({ error: "Payment is not for a NamoLux plan" }, { status: 400 })
    }
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json({ error: "Subscription is not active" }, { status: 400 })
    }

    await syncSubscriptionProfile({
      userId: user.id,
      email: user.email,
      subscription,
    })

    await trackMetric({
      action: "checkout_success",
      metadata: {
        userId: user.id,
        sessionId,
        mode: session.mode,
        amountTotal: session.amount_total,
        currency: session.currency,
        plan: "pro",
      },
      userAgent: request.headers.get("user-agent") || undefined,
      country: request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined,
      route: "/dashboard",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Verify payment failed:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
