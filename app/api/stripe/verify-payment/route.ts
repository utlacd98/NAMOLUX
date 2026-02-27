import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Verify the user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Retrieve the session from Stripe to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Use service client to bypass RLS and update the profile
    const serviceClient = createServiceClient()

    const { error } = await serviceClient
      .from("profiles")
      .update({
        plan: "pro",
        subscription_status: "active",
        stripe_customer_id: session.customer as string,
      })
      .eq("id", user.id)

    if (error) {
      console.error("Error granting pro access:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    console.log(`Pro access granted via verify-payment for user ${user.id}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Verify payment error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
