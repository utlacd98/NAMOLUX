import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getClientIP } from "@/lib/rate-limit"

const FREE_TOKEN_LIMIT = 3

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Pro check
    if (user) {
      const service = createServiceClient()
      const { data: profile, error } = await service
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single()

      if (error) throw error

      if (profile?.plan === "pro") {
        return NextResponse.json({ used: 0, total: -1, remaining: -1, isPro: true })
      }
    }

    // Use service client to bypass RLS
    const service = createServiceClient()

    // Count by IP (always)
    const { count: ipCount, error: ipError } = await service
      .from("generation_logs")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)

    if (ipError) throw ipError

    // Count by user_id if signed in
    let userCount = 0
    if (user) {
      const { count, error } = await service
        .from("generation_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
      if (error) throw error
      userCount = count || 0
    }

    const used = Math.max(ipCount || 0, userCount)
    const remaining = Math.max(0, FREE_TOKEN_LIMIT - used)

    return NextResponse.json({ used, total: FREE_TOKEN_LIMIT, remaining, isPro: false })
  } catch (error: unknown) {
    console.error("Error fetching tokens:", error)
    return NextResponse.json({ used: FREE_TOKEN_LIMIT, total: FREE_TOKEN_LIMIT, remaining: 0, isPro: false })
  }
}
