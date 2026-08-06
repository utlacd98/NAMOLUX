import { runInNewContext } from "node:vm"
import { describe, expect, it } from "vitest"
import { implicitRecoveryRedirectScript } from "@/lib/supabase/recovery-redirect"

function runRedirectScript(pathname: string, hash: string) {
  let redirectedTo: string | null = null

  runInNewContext(implicitRecoveryRedirectScript, {
    URLSearchParams,
    window: {
      location: {
        pathname,
        hash,
        replace(value: string) {
          redirectedTo = value
        },
      },
    },
  })

  return redirectedTo
}

describe("implicit recovery redirect", () => {
  it("moves a recovery session hash from the site root to the reset form", () => {
    const hash = "#access_token=access&refresh_token=refresh&type=recovery"

    expect(runRedirectScript("/", hash)).toBe(`/reset-password?recovery=1${hash}`)
  })

  it("also sends recovery error hashes to the reset page", () => {
    const hash = "#error=access_denied&error_code=otp_expired&type=recovery"

    expect(runRedirectScript("/", hash)).toBe(`/reset-password?recovery=1${hash}`)
  })

  it("ignores non-recovery hashes", () => {
    expect(runRedirectScript("/", "#access_token=access&type=signup")).toBeNull()
  })

  it("does not redirect again once the reset page owns the hash", () => {
    const hash = "#access_token=access&refresh_token=refresh&type=recovery"

    expect(runRedirectScript("/reset-password", hash)).toBeNull()
  })
})
