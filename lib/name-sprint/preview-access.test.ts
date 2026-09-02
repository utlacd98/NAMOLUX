import { describe, expect, it } from "vitest"

import { isNameSprintPreviewUser } from "./preview-access"

describe("Name Sprint private preview access", () => {
  it("allows only the internal test account", () => {
    expect(isNameSprintPreviewUser({ email: "utlacd98@gmail.com" })).toBe(true)
    expect(isNameSprintPreviewUser({ email: " UTLACD98@GMAIL.COM " })).toBe(true)
  })

  it("rejects anonymous users and every other account", () => {
    expect(isNameSprintPreviewUser(null)).toBe(false)
    expect(isNameSprintPreviewUser({ email: null })).toBe(false)
    expect(isNameSprintPreviewUser({ email: "founder@example.com" })).toBe(false)
    expect(isNameSprintPreviewUser({ email: "utlacd98+test@gmail.com" })).toBe(false)
  })
})
