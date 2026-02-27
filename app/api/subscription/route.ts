import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

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

    // Use service client to bypass RLS when reading profile
    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single()

    return NextResponse.json({
      isPro: profile?.plan === "pro",
      subscriptionEnd: null,
      customerId: null,
    })
  } catch (error: any) {
    console.error("Error checking subscription:", error)
    return NextResponse.json(
      { isPro: false, subscriptionEnd: null, customerId: null, error: error.message },
      { status: 500 }
    )
  }
}

