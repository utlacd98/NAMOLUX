import { describe, expect, it } from "vitest"
import { isSafeRedirectPath, sanitizeRedirectPath } from "./safe-redirect"

describe("isSafeRedirectPath", () => {
  it.each([
    "/generate",
    "/pricing?plan=pro",
    "/results/name?source=generator#founder-signal",
    "/blog/how-to-name-a-startup#conclusion",
    "/search?q=luxury%20brand",
    "/search?q=100%25",
  ])("accepts the clean same-origin path %s", (path) => {
    expect(isSafeRedirectPath(path)).toBe(true)
  })

  it.each([
    null,
    undefined,
    "",
    "generate",
    " https://evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "//evil.example/path",
    "///evil.example/path",
    "/\\evil.example/path",
    "\\\\evil.example/path",
    "/%5cevil.example/path",
    "/%255cevil.example/path",
    "/%2f%2fevil.example/path",
    "/%252f%252fevil.example/path",
    "/https://evil.example/path",
    "/javascript:alert(1)",
    "/%6a%61%76%61%73%63%72%69%70%74%3aalert(1)",
    "/%256a%2561%2576%2561%2573%2563%2572%2569%2570%2574%253aalert(1)",
    "/safe\npath",
    "/safe%0d%0apath",
    "/safe%250d%250apath",
    "/malformed%2",
  ])("rejects the unsafe redirect value %s", (path) => {
    expect(isSafeRedirectPath(path)).toBe(false)
  })

  it("rejects encodings deeper than the validation limit", () => {
    let path = "//evil.example"
    for (let pass = 0; pass < 10; pass += 1) path = encodeURIComponent(path)

    expect(isSafeRedirectPath(`/${path}`)).toBe(false)
  })
})

describe("sanitizeRedirectPath", () => {
  it("returns the requested path when it is safe", () => {
    expect(sanitizeRedirectPath("/pricing?plan=pro#checkout", "/generate"))
      .toBe("/pricing?plan=pro#checkout")
  })

  it("uses a safe fallback for an unsafe requested path", () => {
    expect(sanitizeRedirectPath("//evil.example", "/pricing")).toBe("/pricing")
  })

  it.each([
    "https://evil.example",
    "//evil.example",
    "/%5cevil.example",
    "/javascript:alert(1)",
    "/safe%0apath",
  ])("never returns the unsafe fallback %s", (fallback) => {
    expect(sanitizeRedirectPath(null, fallback)).toBe("/dashboard")
  })
})
