import { describe, expect, it } from "vitest"
import { createFixtureNetwork } from "./test-helpers"
import {
  isBlockedIpAddress,
  NAMOLUX_CRAWLER_USER_AGENT,
  normalizePublicWebsiteUrl,
  safeFetchUrl,
  validatePublicUrl,
} from "./network"

describe("SEO monitoring network safety", () => {
  it("normalises a public website URL and removes query and fragment data", () => {
    expect(normalizePublicWebsiteUrl("Example.COM/path?token=secret#part").toString()).toBe("https://example.com/path")
    expect(normalizePublicWebsiteUrl("//www.example.net").toString()).toBe("https://www.example.net/")
  })

  it.each([
    "ftp://example.com/file",
    "http://localhost/",
    "http://service.internal/",
    "http://example.com:3000/",
    "http://user:password@example.com/",
    "http://127.0.0.1/",
    "http://[::1]/",
  ])("rejects unsafe URL %s", (url) => {
    expect(() => normalizePublicWebsiteUrl(url)).toThrow()
  })

  it("blocks private, reserved, documentation and ambiguous IP ranges", () => {
    expect(isBlockedIpAddress("10.1.2.3")).toBe(true)
    expect(isBlockedIpAddress("100.64.1.2")).toBe(true)
    expect(isBlockedIpAddress("169.254.169.254")).toBe(true)
    expect(isBlockedIpAddress("192.0.2.1")).toBe(true)
    expect(isBlockedIpAddress("198.51.100.1")).toBe(true)
    expect(isBlockedIpAddress("203.0.113.1")).toBe(true)
    expect(isBlockedIpAddress("fe90::1")).toBe(true)
    expect(isBlockedIpAddress("2001:db8::1")).toBe(true)
    expect(isBlockedIpAddress("::ffff:127.0.0.1")).toBe(true)
    expect(isBlockedIpAddress("8.8.8.8")).toBe(false)
    expect(isBlockedIpAddress("2606:4700:4700::1111")).toBe(false)
  })

  it("rejects a hostname when any resolved address is private", async () => {
    await expect(validatePublicUrl("https://mixed-address.com", async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.4", family: 4 },
    ])).rejects.toMatchObject({ code: "blocked_address" })
  })

  it("pins requests to the validated address and uses a transparent user agent", async () => {
    const fixture = createFixtureNetwork({
      "https://acme-public.com/": {
        statusCode: 301,
        headers: { location: "https://www.acme-public.com/" },
      },
      "https://www.acme-public.com/": {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        body: "<html><body>Ready</body></html>",
      },
    }, {
      "acme-public.com": ["8.8.8.8"],
      "www.acme-public.com": ["1.1.1.1"],
    })

    const result = await safeFetchUrl("https://acme-public.com", fixture.network)
    expect(result.finalUrl).toBe("https://www.acme-public.com/")
    expect(result.redirectChain).toHaveLength(1)
    expect(fixture.requests.map((request) => request.address)).toEqual(["8.8.8.8", "1.1.1.1"])
    expect(fixture.requests[0].headers["User-Agent"]).toBe(NAMOLUX_CRAWLER_USER_AGENT)
    expect(fixture.requests[0].headers).not.toHaveProperty("Cookie")
    expect(fixture.requests[0].headers).not.toHaveProperty("Authorization")
  })

  it("revalidates a redirect destination before making the next request", async () => {
    const fixture = createFixtureNetwork({
      "https://safe-start.com/": {
        statusCode: 302,
        headers: { location: "https://private-target.com/admin" },
      },
    }, {
      "safe-start.com": ["8.8.8.8"],
      "private-target.com": ["127.0.0.1"],
    })

    await expect(safeFetchUrl("https://safe-start.com", fixture.network)).rejects.toMatchObject({ code: "blocked_address" })
    expect(fixture.requests).toHaveLength(1)
  })

  it("enforces redirect and body-size ceilings even with injected request adapters", async () => {
    const redirectFixture = createFixtureNetwork({
      "https://redirecting-site.com/": { statusCode: 301, headers: { location: "/next" } },
    })
    await expect(safeFetchUrl("https://redirecting-site.com", redirectFixture.network, { maxRedirects: 0 }))
      .rejects.toMatchObject({ code: "redirect_limit" })

    const bodyFixture = createFixtureNetwork({
      "https://large-page.com/": { statusCode: 200, body: "x".repeat(2_000) },
    })
    await expect(safeFetchUrl("https://large-page.com", bodyFixture.network, { maxBytes: 1_024 }))
      .rejects.toMatchObject({ code: "response_too_large" })
  })
})
