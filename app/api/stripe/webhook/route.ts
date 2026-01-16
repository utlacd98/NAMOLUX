import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { addCredits } from "@/lib/credits"
import type Stripe from "stripe"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = (await headers()).get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session

      const userId = session.metadata?.userId
      const credits = parseInt(session.metadata?.credits || "0")
      const amount = (session.amount_total || 0) / 100 // Convert from cents to dollars

      if (userId && credits > 0) {
        try {
          await addCredits(userId, credits, "purchase", amount, session.id)
          console.log(`Added ${credits} credits to user ${userId}`)
        } catch (error) {
          console.error("Error adding credits:", error)
          return NextResponse.json({ error: "Failed to add credits" }, { status: 500 })
        }
      }
      break
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session

      const userId = session.metadata?.userId
      const credits = parseInt(session.metadata?.credits || "0")
      const amount = (session.amount_total || 0) / 100

      if (userId && credits > 0) {
        try {
          await addCredits(userId, credits, "purchase", amount, session.id)
          console.log(`Added ${credits} credits to user ${userId} (async payment)`)
        } catch (error) {
          console.error("Error adding credits:", error)
        }
      }
      break
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`Payment failed for session ${session.id}`)
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

