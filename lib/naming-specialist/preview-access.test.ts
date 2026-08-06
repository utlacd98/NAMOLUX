import { describe, expect, it } from "vitest"
import { isValidPreviewCuratorToken } from "./preview-access"

describe("preview curator access token", () => {
  const secret = "founder-preview-secret-123456789"

  it("accepts only an exact sufficiently long token", () => {
    expect(isValidPreviewCuratorToken(secret, secret)).toBe(true)
    expect(isValidPreviewCuratorToken("wrong-preview-secret-123456789", secret)).toBe(false)
    expect(isValidPreviewCuratorToken(secret.slice(0, -1), secret)).toBe(false)
  })

  it("fails closed when either token is absent or too short", () => {
    expect(isValidPreviewCuratorToken(null, secret)).toBe(false)
    expect(isValidPreviewCuratorToken(secret, undefined)).toBe(false)
    expect(isValidPreviewCuratorToken("short", "short")).toBe(false)
  })
})
