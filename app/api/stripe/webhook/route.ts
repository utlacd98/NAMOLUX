import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServiceClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  // TEMPORARY: webhook disabled while API keys are rotated — acknowledge but do not process
  return NextResponse.json({ received: true })
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const customerEmail = session.customer_details?.email

  if (!customerEmail) {
    console.error("No customer email in checkout session")
    return
  }

  const supabase = createServiceClient()

  // Read supabase_user_id from session metadata (set during checkout creation)
  const supabaseUserId = session.metadata?.supabase_user_id

  if (supabaseUserId) {
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: supabaseUserId, plan: "pro" }, { onConflict: "id" })

    if (error) {
      console.error("Error updating profile by user ID:", error)
    } else {
      console.log(`Pro access granted for user ${supabaseUserId}`)
    }
  }
}
