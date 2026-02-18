import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Hardcode the production URL - must use www to match cookie domain
    const baseUrl = "https://www.namolux.com"

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // Redirect to sign-in with return URL
      const signInUrl = new URL("/sign-in", request.url)
      signInUrl.searchParams.set("redirect", "/pricing")
      return NextResponse.redirect(signInUrl)
    }

    // Check if user is already a customer with an active subscription
    // Search Stripe directly instead of querying local DB
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    let customerId: string

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id

      // Check if they already have an active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      })

      if (subscriptions.data.length > 0) {
        // Already subscribed - redirect to dashboard
        return NextResponse.redirect(new URL("/dashboard?already_subscribed=true", request.url))
      }
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!, // £9.99/month price ID from Stripe
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/pricing?cancelled=true`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_update: {
        address: "auto",
        name: "auto",
      },
    })

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      )
    }

    // Redirect to Stripe Checkout
    return NextResponse.redirect(session.url)
  } catch (error: any) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    )
  }
}

