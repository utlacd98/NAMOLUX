import { NextResponse } from "next/server"
import { isProtectedPreviewCuratorEnabled } from "@/lib/naming-specialist/local-access"
import {
  isValidPreviewCuratorToken,
  PREVIEW_CURATOR_COOKIE,
} from "@/lib/naming-specialist/preview-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!isProtectedPreviewCuratorEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const formData = await request.formData()
  const accessCode = formData.get("accessCode")
  if (typeof accessCode !== "string" || !isValidPreviewCuratorToken(accessCode)) {
    return NextResponse.redirect(new URL("/namo-curator-local?access=invalid", request.url), 303)
  }

  const response = NextResponse.redirect(new URL("/namo-curator-local", request.url), 303)
  response.cookies.set(PREVIEW_CURATOR_COOKIE, accessCode, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/namo-curator-local",
    maxAge: 60 * 60 * 12,
  })
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return response
}
