import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { isPro: false, subscriptionEnd: null, customerId: null },
        { status: 200 }
      )
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, stripe_customer_id")
      .eq("id", user.id)
      .single()

    return NextResponse.json({
      isPro: profile?.plan === "pro",
      subscriptionEnd: null,
      customerId: profile?.stripe_customer_id || null,
    })
  } catch (error: any) {
    console.error("Error checking subscription:", error)
    return NextResponse.json(
      { isPro: false, subscriptionEnd: null, customerId: null, error: error.message },
      { status: 500 }
    )
  }
}

