import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ isPro: false, subscriptionEnd: null, customerId: null })
    }

    const service = createServiceClient()
    const { data: profile, error } = await service
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Subscription lookup failed:", error)
      return NextResponse.json({ isPro: false, subscriptionEnd: null, customerId: null })
    }

    return NextResponse.json({
      isPro: profile?.plan === "pro",
      subscriptionEnd: null,
      customerId: null,
    })
  } catch (error) {
    console.error("Subscription route failed:", error)
    return NextResponse.json({ isPro: false, subscriptionEnd: null, customerId: null })
  }
}
