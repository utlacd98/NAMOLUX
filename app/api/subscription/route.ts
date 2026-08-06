import { NextResponse } from "next/server"
import { anonymousEntitlements, getUserEntitlements } from "@/lib/entitlements"
import { createClient } from "@/lib/supabase/server"

const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError && authError.name !== "AuthSessionMissingError") {
    return NextResponse.json(anonymousEntitlements({ adsEnabled: false }), {
      headers: PRIVATE_NO_STORE,
      status: 503,
    })
  }

  if (!user) {
    return NextResponse.json(anonymousEntitlements(), { headers: PRIVATE_NO_STORE })
  }

  try {
    const entitlements = await getUserEntitlements(user.id)
    return NextResponse.json(entitlements, { headers: PRIVATE_NO_STORE })
  } catch (error) {
    console.error("Subscription lookup failed:", error)
    return NextResponse.json(anonymousEntitlements({ adsEnabled: false }), {
      headers: PRIVATE_NO_STORE,
      status: 503,
    })
  }
}
