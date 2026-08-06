import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseEnvironment } from "@/lib/env"
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"

export const AUTH_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
} as const

const SUPABASE_RESPONSE_HEADER_NAMES = ["cache-control", "expires", "pragma"] as const

export function applyAuthNoStoreHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(AUTH_NO_STORE_HEADERS)) {
    response.headers.set(name, value)
  }
  return response
}

/**
 * Carries refreshed auth cookies onto a replacement response such as a
 * redirect. Only the Supabase anti-cache headers are copied; internal Next.js
 * middleware request-override headers must not be exposed on redirects.
 */
export function preserveSupabaseSessionResponse(
  source: NextResponse,
  target: NextResponse,
  ensureNoStore = false,
): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie))

  for (const name of SUPABASE_RESPONSE_HEADER_NAMES) {
    const value = source.headers.get(name)
    if (value) target.headers.set(name, value)
  }

  if (ensureNoStore) {
    applyAuthNoStoreHeaders(target)
  }

  return target
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const environment = getSupabaseEnvironment()
  const supabase = createServerClient(
    environment.url,
    environment.publishableKey,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, responseHeaders) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          const refreshedResponse = NextResponse.next({
            request,
          })
          preserveSupabaseSessionResponse(supabaseResponse, refreshedResponse)
          supabaseResponse = refreshedResponse
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(responseHeaders).forEach(([name, value]) =>
            supabaseResponse.headers.set(name, value)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  if (!claimsError && claimsData?.claims?.sub) {
    return { claims: claimsData.claims, supabaseResponse }
  }

  // A legacy cookie, a temporary JWKS problem, or a key rotation should not
  // turn a valid session into a redirect loop. Verify with the Auth server
  // before treating the request as signed out.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError && userError.name !== "AuthSessionMissingError") {
    console.warn("Supabase session verification failed", {
      claimsError: claimsError?.name || null,
      userError: userError.name,
    })
  }

  return {
    claims: user ? { sub: user.id } : null,
    supabaseResponse,
  }
}
