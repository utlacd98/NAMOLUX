import { describe, expect, it } from "vitest"
import { NextResponse } from "next/server"
import { preserveSupabaseSessionResponse } from "@/lib/supabase/middleware"

describe("preserveSupabaseSessionResponse", () => {
  it("copies refreshed cookies and Supabase anti-cache headers", () => {
    const source = NextResponse.next()
    source.cookies.set("sb-session", "refreshed", {
      httpOnly: false,
      sameSite: "lax",
      secure: true,
    })
    source.headers.set("Cache-Control", "private, no-store")
    source.headers.set("Expires", "0")
    source.headers.set("Pragma", "no-cache")
    source.headers.set("x-middleware-request-cookie", "must-not-be-copied")

    const target = NextResponse.redirect("https://www.namolux.com/generate")
    preserveSupabaseSessionResponse(source, target)

    expect(target.cookies.get("sb-session")).toMatchObject({
      name: "sb-session",
      value: "refreshed",
      sameSite: "lax",
      secure: true,
    })
    expect(target.headers.get("cache-control")).toBe("private, no-store")
    expect(target.headers.get("expires")).toBe("0")
    expect(target.headers.get("pragma")).toBe("no-cache")
    expect(target.headers.has("x-middleware-request-cookie")).toBe(false)
  })

  it("can make an auth-dependent redirect explicitly non-cacheable", () => {
    const target = NextResponse.redirect("https://www.namolux.com/sign-in")
    preserveSupabaseSessionResponse(NextResponse.next(), target, true)

    expect(target.headers.get("cache-control")).toContain("private")
    expect(target.headers.get("cache-control")).toContain("no-store")
    expect(target.headers.get("expires")).toBe("0")
    expect(target.headers.get("pragma")).toBe("no-cache")
  })
})
