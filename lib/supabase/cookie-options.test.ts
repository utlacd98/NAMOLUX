import { describe, expect, it } from "vitest"
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options"

describe("getSupabaseCookieOptions", () => {
  it("uses secure browser-readable cookies in production", () => {
    expect(getSupabaseCookieOptions("production")).toEqual({
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: true,
    })
  })

  it("allows local HTTP development without weakening SameSite", () => {
    expect(getSupabaseCookieOptions("development")).toEqual({
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: false,
    })
  })
})
