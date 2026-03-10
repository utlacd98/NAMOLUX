import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const redirect = searchParams.get("redirect") || "/generate"
  const next = searchParams.get("next") ?? redirect

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Auto-log email to admin email list on new account creation
      try {
        const user = sessionData?.user
        if (user?.email) {
          // Only log if account was created within the last 5 minutes (new signup, not returning login)
          const createdAt = new Date(user.created_at).getTime()
          const isNewAccount = Date.now() - createdAt < 5 * 60 * 1000

          if (isNewAccount) {
            const serviceClient = createServiceClient()
            // Upsert — safe to call multiple times, won't create duplicates
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
        // Non-fatal — don't block auth redirect if email logging fails
        console.error("Failed to log signup email:", logErr)
      }

      // Successful authentication — redirect
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // If there's an error or no code, redirect to sign-in with error
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`)
}

