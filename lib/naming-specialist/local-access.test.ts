import { describe, expect, it } from "vitest"
import {
  getCuratorHostname,
  isLocalCuratorRequest,
  isProtectedPreviewCuratorEnabled,
} from "./local-access"

describe("local naming curator access", () => {
  it.each([
    ["localhost:3112", "localhost"],
    ["127.0.0.1:3112", "127.0.0.1"],
    ["[::1]:3112", "::1"],
  ])("accepts a local host header", (host, expected) => {
    expect(getCuratorHostname(host)).toBe(expected)
    expect(isLocalCuratorRequest(host, true)).toBe(true)
  })

  it.each([
    "namolux.com",
    "www.namolux.com",
    "localhost.attacker.example",
    "127.0.0.1.attacker.example",
    "",
  ])("rejects non-local or malformed hosts", (host) => {
    expect(isLocalCuratorRequest(host, true)).toBe(false)
  })

  it("requires the explicit local enable flag", () => {
    expect(isLocalCuratorRequest("localhost:3112", false)).toBe(false)
  })

  it("allows the remote gate only on an explicitly enabled Vercel preview", () => {
    expect(isProtectedPreviewCuratorEnabled({ VERCEL_ENV: "preview", NAMOLUX_ENABLE_PREVIEW_CURATOR: "1" })).toBe(true)
    expect(isProtectedPreviewCuratorEnabled({ VERCEL_ENV: "production", NAMOLUX_ENABLE_PREVIEW_CURATOR: "1" })).toBe(false)
    expect(isProtectedPreviewCuratorEnabled({ VERCEL_ENV: "preview" })).toBe(false)
  })
})
