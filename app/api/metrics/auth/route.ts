import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"

const privateHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request)
  if (unauthorized) return unauthorized
  return NextResponse.json({ ok: true }, { headers: privateHeaders })
}

export async function DELETE() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true }, { headers: privateHeaders })
}
