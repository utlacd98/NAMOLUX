import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function cleanEnv(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/^["']|["']$/g, "").replace(/\\r|\\n/g, "").trim()
  return cleaned || undefined
}

export async function GET(request: NextRequest) {
  try {
    const priceId =
      cleanEnv(process.env.STRIPE_PRICE_ID) ||
      cleanEnv(process.env.STRIPE_PRICE_PRO) ||
      cleanEnv(process.env.STRIPE_PRICE_STARTER)

    if (!priceId) {
      console.error("Stripe checkout failed: no price ID configured")
      return NextResponse.redirect(new URL("/pricing?checkout=unavailable", request.url))
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      const signInUrl = new URL("/sign-in", request.url)
      signInUrl.searchParams.set("redirect", "/api/stripe/checkout")
      return NextResponse.redirect(signInUrl)
    }

    const appUrl = cleanEnv(process.env.NEXT_PUBLIC_APP_URL)
    const origin = appUrl && URL.canParse(appUrl) ? appUrl : new URL(request.url).origin
    const price = await stripe.prices.retrieve(priceId)
    const metadata = {
      supabase_user_id: user.id,
    }
    const session = await stripe.checkout.sessions.create({
      mode: price.type === "recurring" ? "subscription" : "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata,
      ...(price.type === "recurring"
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
    })

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL")
    }

    return NextResponse.redirect(session.url)
  } catch (error) {
    console.error("Stripe checkout failed:", error)
    return NextResponse.redirect(new URL("/pricing?checkout=failed", request.url))
  }
}
