import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServiceClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature")
    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Webhook signature missing" }, { status: 400 })
    }

    const body = await request.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    if (event.type === "checkout.session.completed") {
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const supabaseUserId = session.metadata?.supabase_user_id

  if (session.payment_status !== "paid" || !supabaseUserId) {
    console.error("Checkout session missing paid status or Supabase user metadata")
    return
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: supabaseUserId, plan: "pro" }, { onConflict: "id" })

  if (error) {
    console.error("Error updating profile by user ID:", error)
  } else {
    console.log(`Pro access granted for user ${supabaseUserId}`)
  }
}
