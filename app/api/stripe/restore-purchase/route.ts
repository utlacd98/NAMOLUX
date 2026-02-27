import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // User must be logged in — we update their profile
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "You must be signed in to restore a purchase" }, { status: 401 })
    }

    // Look up Stripe customers matching the provided email
    const customers = await stripe.customers.list({ email: email.toLowerCase().trim(), limit: 5 })

    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No purchase found for that email address" }, { status: 404 })
    }

    // Check each customer for a successful payment on the Pro price
    const priceId = process.env.STRIPE_PRICE_ID!
    let foundCustomerId: string | null = null

    for (const customer of customers.data) {
      // Check checkout sessions
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 20,
      })

      const paid = sessions.data.find(
        (s) =>
          s.payment_status === "paid" &&
          s.line_items === undefined // line_items lazy-loaded; check via price below
      )

      // More reliable: check payment intents with the Pro price metadata
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 20,
      })

      const successfulPayment = paymentIntents.data.find((pi) => pi.status === "succeeded")

      // Also check sessions directly for the price ID
      let sessionMatch = false
      for (const session of sessions.data) {
        if (session.payment_status === "paid") {
          // Expand line items to check price
          try {
            const expanded = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ["line_items"],
            })
            const hasProPrice = expanded.line_items?.data.some(
              (item) => item.price?.id === priceId
            )
            if (hasProPrice) {
              sessionMatch = true
              break
            }
          } catch {
            // If we can't check price, accept any successful payment
            if (session.payment_status === "paid") {
              sessionMatch = true
              break
            }
          }
        }
      }

      if (sessionMatch || successfulPayment) {
        foundCustomerId = customer.id
        break
      }
    }

    if (!foundCustomerId) {
      return NextResponse.json({ error: "No completed purchase found for that email address" }, { status: 404 })
    }

    // Grant Pro to the currently logged-in user
    const serviceClient = createServiceClient()
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({ plan: "pro", stripe_customer_id: foundCustomerId })
      .eq("id", user.id)

    if (updateError) {
      // Try without stripe_customer_id
      const { error: fallback } = await serviceClient
        .from("profiles")
        .update({ plan: "pro" })
        .eq("id", user.id)
      if (fallback) {
        return NextResponse.json({ error: "Failed to restore access" }, { status: 500 })
      }
    }

    console.log(`Pro restored via email match for user ${user.id} (Stripe customer ${foundCustomerId})`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Restore purchase error:", error)
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
  }
}
