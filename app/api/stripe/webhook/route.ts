import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServiceClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
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
      .update({
        stripe_customer_id: customerId,
        plan: "pro",
        subscription_status: "active",
      })
      .eq("id", supabaseUserId)

    if (error) {
      console.error("Error updating profile by user ID:", error)
    } else {
      console.log(`Pro access granted for user ${supabaseUserId}`)
    }
  } else {
    // Fallback: find user by email
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single()

    if (findError || !profile) {
      console.error("No profile found for email:", customerEmail)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
        plan: "pro",
        subscription_status: "active",
      })
      .eq("id", profile.id)

    if (error) {
      console.error("Error updating profile by email:", error)
    } else {
      console.log(`Pro access granted for ${customerEmail}`)
    }
  }
}
