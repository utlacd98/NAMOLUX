import { NextRequest, NextResponse } from "next/server"
import { updateBillingProfile } from "@/lib/billing-profile"
import { computeEntitlements } from "@/lib/entitlements"
import { getAppUrl } from "@/lib/env"
import { trackMetric } from "@/lib/metrics"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe-client"
import { getStripePaidPriceId } from "@/lib/stripe-plans"
import { isAllowedNamoLuxSubscription } from "@/lib/stripe-plans"
import { parsePricingAttribution, withPricingAttribution } from "@/lib/pricing-attribution"

export async function GET(request: NextRequest) {
  const requestOrigin = new URL(request.url).origin
  const attribution = parsePricingAttribution({
    source: request.nextUrl.searchParams.get("source"),
    content: request.nextUrl.searchParams.get("content"),
    return: request.nextUrl.searchParams.get("return"),
  })
  const attributedCheckoutPath = withPricingAttribution("/api/stripe/checkout", attribution)

  try {
    const priceId = getStripePaidPriceId()
    if (!priceId) {
      console.error("Stripe checkout failed: no price ID configured")
      await trackMetric({
        action: "checkout_failed",
        metadata: { source: attribution.source, fallbackReason: "price-not-configured" },
        route: "/api/stripe/checkout",
      })
      return NextResponse.redirect(new URL("/pricing?checkout=unavailable", request.url))
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      const signInUrl = new URL("/sign-in", request.url)
      signInUrl.searchParams.set("redirect", attributedCheckoutPath)
      return NextResponse.redirect(signInUrl)
    }

    const service = createServiceClient()
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select(
        "plan, entitlement_source, subscription_status, subscription_end, stripe_status, access_expires_at, cancel_at_period_end, stripe_customer_id, trial_started_at, trial_subscription_id",
      )
      .eq("id", user.id)
      .maybeSingle()
    if (profileError) throw profileError

    if (computeEntitlements(profile).isPro) {
      return NextResponse.redirect(new URL("/dashboard?billing=active", request.url))
    }

    const stripe = getStripeClient()
    const price = await stripe.prices.retrieve(priceId)
    const isExpectedPaidPrice =
      price.active &&
      price.type === "recurring" &&
      price.currency === "gbp" &&
      price.unit_amount === 799 &&
      price.recurring?.interval === "month"
    if (!isExpectedPaidPrice) {
      console.error("Stripe checkout failed: paid tier must use an active recurring GBP 7.99 monthly Price")
      await trackMetric({
        action: "checkout_failed",
        metadata: { source: attribution.source, fallbackReason: "price-validation-failed" },
        route: "/api/stripe/checkout",
      })
      return NextResponse.redirect(new URL("/pricing?checkout=unavailable", request.url))
    }

    let customerId = profile?.stripe_customer_id || null
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: user.email, metadata: { supabase_user_id: user.id } },
        { idempotencyKey: `namolux-customer-${user.id}` },
      )
      customerId = customer.id
      await updateBillingProfile({
        userId: user.id,
        email: user.email,
        stripeCustomerId: customerId,
      })
    }

    // A trial is a one-time customer benefit. The stored marker makes the
    // decision durable; Stripe history closes the gap for customers created
    // before this migration or after a database repair.
    let isTrialEligible = !profile?.trial_started_at && !profile?.trial_subscription_id
    if (isTrialEligible) {
      for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
        if (isAllowedNamoLuxSubscription(subscription)) {
          isTrialEligible = false
          break
        }
      }
    }

    const metadata = {
      supabase_user_id: user.id,
      plan: "pro",
      price_id: priceId,
      attribution_source: attribution.source,
      ...(attribution.content ? { attribution_content: attribution.content } : {}),
    }
    const appUrl = getAppUrl(requestOrigin)
    const successParams = new URLSearchParams({ source: attribution.source })
    if (attribution.content) successParams.set("content", attribution.content)
    if (attribution.returnPath) successParams.set("return", attribution.returnPath)
    const cancelPath = withPricingAttribution("/pricing?checkout=cancelled", attribution)
    const fiveMinuteBucket = Math.floor(Date.now() / (5 * 60 * 1000))
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        integration_identifier: "namolux_web_qzmxtrpa",
        customer: customerId,
        client_reference_id: user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&${successParams.toString()}`,
        cancel_url: `${appUrl}${cancelPath}`,
        metadata,
        subscription_data: {
          metadata,
          ...(isTrialEligible ? { trial_period_days: 7 } : {}),
        },
      },
      { idempotencyKey: `namolux-checkout-${user.id}-${priceId}-${fiveMinuteBucket}` },
    )

    if (!session.url) throw new Error("Stripe did not return a Checkout URL")

    await trackMetric({
      action: "checkout_started",
      metadata: {
        userId: user.id,
        priceId,
        plan: "pro",
        mode: "subscription",
        trialEligible: isTrialEligible,
        source: attribution.source,
        ...(attribution.content ? { contentSlug: attribution.content } : {}),
      },
      userAgent: request.headers.get("user-agent") || undefined,
      country: request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined,
      route: "/api/stripe/checkout",
    })

    return NextResponse.redirect(session.url)
  } catch (error) {
    console.error("Stripe checkout failed:", error)
    await trackMetric({
      action: "checkout_failed",
      metadata: { source: attribution.source, fallbackReason: "checkout-exception" },
      userAgent: request.headers.get("user-agent") || undefined,
      country: request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined,
      route: "/api/stripe/checkout",
    })
    return NextResponse.redirect(new URL("/pricing?checkout=failed", request.url))
  }
}
