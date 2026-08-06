import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  claimStripeEvent: vi.fn(),
  completeStripeEvent: vi.fn(),
  constructEvent: vi.fn(),
}))

vi.mock("@/lib/env", () => ({
  getStripeEnvironment: () => ({ webhookSecret: "whsec_test" }),
}))

vi.mock("@/lib/stripe-client", () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent: mocks.constructEvent,
    },
  }),
}))

vi.mock("@/lib/stripe-events", () => ({
  claimStripeEvent: mocks.claimStripeEvent,
  completeStripeEvent: mocks.completeStripeEvent,
  failStripeEvent: vi.fn(),
}))

import { POST } from "@/app/api/stripe/webhook/route"

function webhookRequest() {
  return new NextRequest("https://www.namolux.com/api/stripe/webhook", {
    body: '{"untrusted":"webhook payload"}',
    headers: { "stripe-signature": "t=1,v1=invalid" },
    method: "POST",
  })
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects an invalid signature without logging an attacker-controlled payload", async () => {
    const verificationError = Object.assign(new Error("Invalid signature"), {
      header: "t=1,v1=invalid",
      name: "StripeSignatureVerificationError",
      payload: "customer@example.com should never reach logs",
    })
    mocks.constructEvent.mockImplementation(() => {
      throw verificationError
    })
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const response = await POST(webhookRequest())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid webhook signature" })
    expect(warning).toHaveBeenCalledWith("Stripe webhook signature verification failed", {
      reason: "invalid_signature",
    })
    expect(JSON.stringify(warning.mock.calls)).not.toContain("customer@example.com")
  })

  it("continues to accept and acknowledge a verified event", async () => {
    mocks.constructEvent.mockReturnValue({
      created: 1,
      data: { object: {} },
      id: "evt_verified",
      type: "invoice.paid",
    })
    mocks.claimStripeEvent.mockResolvedValue("claimed")
    mocks.completeStripeEvent.mockResolvedValue(undefined)
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const response = await POST(webhookRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
    expect(mocks.completeStripeEvent).toHaveBeenCalledWith("evt_verified")
    expect(warning).not.toHaveBeenCalled()
  })
})
