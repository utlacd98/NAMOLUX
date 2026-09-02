import { describe, expect, it } from "vitest"

import { getFounderSignalAccessDecision } from "@/lib/founder-signal-access"

describe("Founder Signal access", () => {
  it("requires authentication", () => {
    expect(getFounderSignalAccessDecision({ userId: null, isPro: false })).toMatchObject({
      allowed: false,
      status: 401,
      error: "authentication_required",
    })
  })

  it("requires Pro for a signed-in Free account", () => {
    expect(getFounderSignalAccessDecision({ userId: "free-user", isPro: false, accessState: "free" })).toMatchObject({
      allowed: false,
      status: 403,
      error: "founder_signal_pro_required",
    })
  })

  it("allows an active Pro account", () => {
    expect(getFounderSignalAccessDecision({ userId: "pro-user", isPro: true, accessState: "active" })).toEqual({ allowed: true })
  })

  it("keeps a lapsed account read-only", () => {
    expect(getFounderSignalAccessDecision({ userId: "lapsed-user", isPro: false, accessState: "expired" })).toMatchObject({
      allowed: false,
      status: 403,
      error: "subscription_lapsed_read_only",
    })
  })
})
