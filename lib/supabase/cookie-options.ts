import type { CookieOptionsWithName } from "@supabase/ssr"

/**
 * Supabase's browser client must be able to read its PKCE/session cookies, so
 * these cookies intentionally cannot be HttpOnly. SameSite=Lax limits ambient
 * cross-site sends while preserving OAuth and emailed auth-link callbacks.
 */
export function getSupabaseCookieOptions(
  environment = process.env.NODE_ENV,
): CookieOptionsWithName {
  return {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: environment === "production",
  }
}

export const SUPABASE_COOKIE_OPTIONS = getSupabaseCookieOptions()
