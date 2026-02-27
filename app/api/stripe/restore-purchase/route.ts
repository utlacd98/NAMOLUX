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

    const cleanEmail = email.toLowerCase().trim()
    console.log(`Restore purchase attempt: user=${user.id}, email=${cleanEmail}`)

    // Look up Stripe customers matching the provided email
    const customers = await stripe.customers.list({ email: cleanEmail, limit: 10 })
    console.log(`Stripe customers found for ${cleanEmail}:`, customers.data.length)

    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No purchase found for that email address" }, { status: 404 })
    }

    let foundCustomerId: string | null = null

    for (const customer of customers.data) {
      console.log(`Checking customer ${customer.id}`)

      // Check payment intents — any succeeded payment qualifies
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 20,
      })
      const succeeded = paymentIntents.data.filter((pi) => pi.status === "succeeded")
      console.log(`  Payment intents succeeded: ${succeeded.length}`)

      // Check checkout sessions
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 20,
      })
      const paidSessions = sessions.data.filter((s) => s.payment_status === "paid")
      console.log(`  Paid checkout sessions: ${paidSessions.length}`)

      if (succeeded.length > 0 || paidSessions.length > 0) {
        foundCustomerId = customer.id
        break
      }
    }

    if (!foundCustomerId) {
      return NextResponse.json({ error: "No completed purchase found for that email address" }, { status: 404 })
    }

    console.log(`Found valid purchase. Granting Pro to user ${user.id}`)

    // Use upsert so it works even if no profiles row exists yet
    const serviceClient = createServiceClient()
    const { error: upsertError } = await serviceClient
      .from("profiles")
      .upsert(
        { id: user.id, plan: "pro", stripe_customer_id: foundCustomerId },
        { onConflict: "id" }
      )

    if (upsertError) {
      console.error("Upsert error:", upsertError)
      // Fallback: try update only
      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({ plan: "pro" })
        .eq("id", user.id)
      if (updateError) {
        console.error("Update fallback error:", updateError)
        return NextResponse.json({ error: "Failed to restore access. Please contact support." }, { status: 500 })
      }
    }

    console.log(`Pro restored for user ${user.id} via Stripe customer ${foundCustomerId}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Restore purchase error:", error)
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
  }
}
