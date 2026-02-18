import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      // Redirect to sign-in
      const signInUrl = new URL("/sign-in", request.url)
      signInUrl.searchParams.set("redirect", "/dashboard")
      return NextResponse.redirect(signInUrl)
    }

    // Get user profile to get Stripe customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      // No subscription yet, redirect to pricing
      return NextResponse.redirect(new URL("/pricing", request.url))
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/dashboard`,
    })

    // Redirect to Stripe Billing Portal
    return NextResponse.redirect(session.url)
  } catch (error: any) {
    console.error("Portal error:", error)
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    )
  }
}

