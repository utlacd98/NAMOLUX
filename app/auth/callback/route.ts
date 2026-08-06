import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { applyAuthNoStoreHeaders } from "@/lib/supabase/middleware"
import { getAppUrl } from "@/lib/env"
import { sanitizeRedirectPath } from "@/lib/safe-redirect"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = sanitizeRedirectPath(
    searchParams.get("next") ?? searchParams.get("redirect"),
    type === "recovery" ? "/reset-password" : "/dashboard",
  )
  const isPasswordRecovery = type === "recovery" || next.startsWith("/reset-password")
  const redirectOrigin = process.env.NODE_ENV === "development" ? origin : getAppUrl(origin)

  const buildRedirect = (path: string) => {
    return applyAuthNoStoreHeaders(
      NextResponse.redirect(new URL(path, redirectOrigin)),
    )
  }

  const withRecoveryFlag = (path: string) => {
    if (!isPasswordRecovery) return path

    const recoveryUrl = new URL(path, origin)
    recoveryUrl.searchParams.set("recovery", "1")
    return `${recoveryUrl.pathname}${recoveryUrl.search}`
  }

  const supabase = await createClient()

  if (code || (tokenHash && type)) {
    const { data: sessionData, error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash as string,
          type: type as EmailOtpType,
        })

    if (!error) {
      try {
        const user = sessionData?.user
        if (!isPasswordRecovery && user?.email) {
          const createdAt = new Date(user.created_at).getTime()
          const isNewAccount = Date.now() - createdAt < 5 * 60 * 1000

          if (isNewAccount) {
            const serviceClient = createServiceClient()
            await serviceClient.from("email_subscribers").upsert(
              {
                email: user.email.toLowerCase().trim(),
                source: "signup",
                tags: ["account"],
                status: "subscribed",
                created_at: new Date().toISOString(),
              },
              { onConflict: "email", ignoreDuplicates: true }
            )
          }
        }
      } catch (logErr) {
        console.error("Failed to log signup email:", logErr)
      }

      return buildRedirect(withRecoveryFlag(next))
    }
  }

  const failurePath = isPasswordRecovery
    ? "/reset-password?recovery=1&error=reset_link_invalid"
    : "/sign-in?error=auth_callback_error"

  return buildRedirect(failurePath)
}
