import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function grantPro(userId: string, _customerId: string | null) {
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from("profiles")
    .upsert({ id: userId, plan: "pro" }, { onConflict: "id" })

  if (error) {
    console.error("Upsert error:", error)
    // fallback: plain update
    const { error: e2 } = await serviceClient
      .from("profiles")
      .update({ plan: "pro" })
      .eq("id", userId)
    if (e2) throw new Error("DB update failed: " + e2.message)
  }
}

async function findPaidCustomerByEmail(email: string, userId: string): Promise<string | null> {
  const customers = await stripe.customers.list({ email, limit: 10 })

  for (const customer of customers.data) {
    if (customer.metadata?.supabase_user_id !== userId) continue

    const [piList, sessionList] = await Promise.all([
      stripe.paymentIntents.list({ customer: customer.id, limit: 20 }),
      stripe.checkout.sessions.list({ customer: customer.id, limit: 20 }),
    ])

    const hasSucceededPI = piList.data.some((pi) => pi.status === "succeeded")
    const hasPaidSession = sessionList.data.some((s) => s.payment_status === "paid")

    if (hasSucceededPI || hasPaidSession) return customer.id
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "You must be signed in to restore a purchase" }, { status: 401 })
    }

    const enteredEmail = email.toLowerCase().trim()
    const accountEmail = user.email?.toLowerCase().trim()

    if (!accountEmail || enteredEmail !== accountEmail) {
      return NextResponse.json(
        { error: "Use the email address on your signed-in NamoLux account." },
        { status: 403 }
      )
    }

    // 1. Search payment intents by supabase_user_id metadata (most reliable)
    try {
      const piSearch = await stripe.paymentIntents.search({
        query: `metadata['supabase_user_id']:'${user.id}' AND status:'succeeded'`,
        limit: 5,
      })
      console.log(`PI search by user ID found:`, piSearch.data.length)
      if (piSearch.data.length > 0) {
        const customerId = piSearch.data[0].customer as string | null
        await grantPro(user.id, customerId)
        return NextResponse.json({ success: true })
      }
    } catch (e) {
      console.log("PI metadata search not available, skipping:", e)
    }

    // 2. Search checkout sessions by supabase_user_id metadata
    try {
      const csSearch = await (stripe.checkout.sessions as any).search({
        query: `metadata['supabase_user_id']:'${user.id}' AND payment_status:'paid'`,
        limit: 5,
      })
      console.log(`Session search by user ID found:`, csSearch.data.length)
      if (csSearch.data.length > 0) {
        const customerId = csSearch.data[0].customer as string | null
        await grantPro(user.id, customerId)
        return NextResponse.json({ success: true })
      }
    } catch (e) {
      console.log("Session metadata search not available, skipping:", e)
    }

    const foundCustomerId = await findPaidCustomerByEmail(enteredEmail, user.id)

    if (!foundCustomerId) {
      return NextResponse.json({
        error: "No completed purchase found. Make sure you're using the email address you paid with. Contact support if the issue persists.",
      }, { status: 404 })
    }

    await grantPro(user.id, foundCustomerId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Restore purchase error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
