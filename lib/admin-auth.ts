import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export type AdminAuthorization =
  | { status: "authorized"; userId: string }
  | { status: "anonymous"; userId: null }
  | { status: "forbidden"; userId: string }

export async function getAdminAuthorization(): Promise<AdminAuthorization> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: "anonymous", userId: null }

  const service = createServiceClient()
  const { data, error: roleError } = await service
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (roleError) {
    console.error("Admin role lookup failed closed:", roleError)
    return { status: "forbidden", userId: user.id }
  }
  return data
    ? { status: "authorized", userId: user.id }
    : { status: "forbidden", userId: user.id }
}

export async function isAdminRequest(_request?: NextRequest): Promise<boolean> {
  void _request
  return (await getAdminAuthorization()).status === "authorized"
}

export function unauthorizedAdminResponse(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized" },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  )
}

export async function requireAdminRequest(request?: NextRequest): Promise<NextResponse | null> {
  return await isAdminRequest(request) ? null : unauthorizedAdminResponse()
}
