import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Initialize Stripe lazily
let stripe: Stripe | null = null

function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured")
    }
    stripe = new Stripe(key, {
      apiVersion: "2024-12-18.acacia",
    })
  }
  return stripe
}

export async function GET(request: NextRequest) {
  try {
    const stripeClient = getStripe()
    
    const priceId = process.env.STRIPE_PRICE_PRO?.trim()
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured. Please set STRIPE_PRICE_PRO in environment variables." },
        { status: 500 }
      )
    }

    // Get the origin for redirect URLs
    const requestOrigin = request.headers.get("origin")
    const referer = request.headers.get("referer")

    // Try to get origin from various sources
    let origin = requestOrigin
    if (!origin && referer) {
      try {
        origin = new URL(referer).origin
      } catch {
        // Invalid referer URL
      }
    }
    if (!origin) {
      origin = process.env.NEXT_PUBLIC_APP_URL || "https://www.namolux.com"
    }

    // Ensure origin is a valid URL
    if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
      origin = "https://www.namolux.com"
    }

    // Create a checkout session for the monthly subscription
    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
      // Optional: Allow promotion codes
      allow_promotion_codes: true,
      // Billing address collection
      billing_address_collection: "auto",
      // Customer email (optional, will be asked during checkout)
      // customer_email: undefined,
    })

    // Redirect to Stripe Checkout
    if (session.url) {
      return NextResponse.redirect(session.url)
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  } catch (error: any) {
    console.error("Stripe checkout error:", error)
    console.error("Price ID used:", process.env.STRIPE_PRICE_PRO)
    return NextResponse.json(
      {
        error: error.message || "Failed to create checkout session",
        code: error.code,
        type: error.type,
        priceId: process.env.STRIPE_PRICE_PRO?.substring(0, 20) + "..."
      },
      { status: 500 }
    )
  }
}
