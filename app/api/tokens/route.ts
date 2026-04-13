import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const FREE_TOKEN_LIMIT = 10

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ used: 0, total: FREE_TOKEN_LIMIT, remaining: FREE_TOKEN_LIMIT, isPro: false })
    }

    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single()

    if (profile?.plan === "pro") {
      return NextResponse.json({ used: 0, total: -1, remaining: -1, isPro: true })
    }

    const { count } = await supabase
      .from("generation_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    const used = count || 0
    const remaining = Math.max(0, FREE_TOKEN_LIMIT - used)

    return NextResponse.json({ used, total: FREE_TOKEN_LIMIT, remaining, isPro: false })
  } catch (error: unknown) {
    console.error("Error fetching tokens:", error)
    return NextResponse.json({ used: 0, total: FREE_TOKEN_LIMIT, remaining: FREE_TOKEN_LIMIT, isPro: false })
  }
}
