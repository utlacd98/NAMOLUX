import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/stripe-client"

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
  }

  let confirmation = ""
  try {
    const body = await request.json()
    confirmation = typeof body?.confirmation === "string" ? body.confirmation : ""
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
  if (confirmation !== "DELETE") {
    return NextResponse.json({ error: "Account deletion was not confirmed" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const service = createServiceClient()
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle()
    if (profileError) throw profileError

    if (profile?.stripe_subscription_id) {
      const stripe = getStripeClient()
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      if (subscription.status !== "canceled") {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id)
      }
    }

    const { error: deleteError } = await service.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Account deletion failed:", error)
    return NextResponse.json(
      { error: "We could not safely delete the account. No account data was removed; contact support." },
      { status: 500 },
    )
  }
}
