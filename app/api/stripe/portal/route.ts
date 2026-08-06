import { NextRequest, NextResponse } from "next/server"
import { getAppUrl } from "@/lib/env"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe-client"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const signInUrl = new URL("/sign-in", request.url)
      signInUrl.searchParams.set("redirect", "/dashboard")
      return NextResponse.redirect(signInUrl)
    }

    const service = createServiceClient()
    const { data: profile, error } = await service
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle()
    if (error) throw error

    if (!profile?.stripe_customer_id) {
      return NextResponse.redirect(new URL("/pricing", request.url))
    }

    const origin = getAppUrl(new URL(request.url).origin)
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    })
    return NextResponse.redirect(session.url)
  } catch (error) {
    console.error("Stripe portal failed:", error)
    return NextResponse.redirect(new URL("/dashboard?billing=portal-failed", request.url))
  }
}
