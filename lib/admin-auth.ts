import { NextRequest, NextResponse } from "next/server"

export function isAdminRequest(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false

  const token =
    request.headers.get("x-admin-token") ||
    request.cookies.get("admin_token")?.value ||
    null

  return token === secret
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
    }
  )
}

export function requireAdminRequest(request: NextRequest): NextResponse | null {
  return isAdminRequest(request) ? null : unauthorizedAdminResponse()
}
