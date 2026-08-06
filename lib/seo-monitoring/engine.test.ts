import { describe, expect, it } from "vitest"
import { runSeoAudit } from "./engine"
import { createFixtureNetwork } from "./test-helpers"
import type { PageSpeedProvider } from "./types"

describe("SEO monitoring engine", () => {
  it("produces a real deterministic audit without inventing performance data", async () => {
    const fixture = createFixtureNetwork({
      "https://audit-ready.com/": {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        body: `<html><head><title>Short</title></head><body><p>Small page</p><img src="/photo.jpg"></body></html>`,
      },
      "http://audit-ready.com/": {
        statusCode: 301,
        headers: { location: "https://audit-ready.com/" },
      },
      "https://audit-ready.com/robots.txt": { statusCode: 404, headers: { "content-type": "text/plain" } },
      "https://audit-ready.com/sitemap.xml": { statusCode: 404, headers: { "content-type": "application/xml" } },
    })

    const result = await runSeoAudit({
      url: "audit-ready.com?private=value",
      auditType: "initial",
      network: fixture.network,
      limits: { maxPages: 1 },
      clock: () => new Date("2026-07-17T12:00:00.000Z"),
    })

    expect(result.version).toBe("1.0")
    expect(result.auditType).toBe("initial")
    expect(result.normalizedUrl).toBe("https://audit-ready.com/")
    expect(result.performance).toBeNull()
    expect(result.scores.performance).toBeNull()
    expect(result.httpRedirectsToHttps).toBe(true)
    expect(result.issues.map((issue) => issue.checkKey)).toEqual(expect.arrayContaining([
      "metadata.title_short",
      "metadata.description_missing",
      "content.h1_missing",
      "technical.viewport_missing",
      "content.image_alt_missing",
    ]))
    expect(result.summary.text).toContain("were unavailable and were not estimated")
    expect(result.summary.severityCounts.high).toBeGreaterThan(0)
    expect(result.partialFailures.some((failure) => failure.stage === "performance")).toBe(false)
  })

  it("incorporates optional measured performance without changing crawler bounds", async () => {
    const fixture = createFixtureNetwork({
      "https://performance-site.com/": {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        body: `<html lang="en"><head><title>A Complete Performance Test Website Page</title><meta name="description" content="A complete description for the performance test website that gives visitors enough useful context before they choose to open the page."><meta name="viewport" content="width=device-width"><link rel="canonical" href="/"><link rel="icon" href="/favicon.ico"><meta property="og:title" content="Performance"><meta property="og:description" content="Description"><meta property="og:image" content="/share.png"><meta name="twitter:card" content="summary"><script type="application/ld+json">{"@context":"https://schema.org"}</script></head><body><h1>A measured performance test page</h1><p>${"Substantive founder-friendly content ".repeat(60)}</p></body></html>`,
      },
      "http://performance-site.com/": { statusCode: 301, headers: { location: "https://performance-site.com/" } },
      "https://performance-site.com/robots.txt": { statusCode: 200, body: "User-agent: *\nAllow: /" },
      "https://performance-site.com/sitemap.xml": { statusCode: 200, body: "<urlset><url><loc>https://performance-site.com/</loc></url></urlset>" },
    })
    const provider: PageSpeedProvider = {
      name: "fixture_pagespeed",
      async measure() {
        return {
          provider: "fixture_pagespeed",
          measuredAt: "2026-07-17T12:00:00.000Z",
          mobile: {
            score: 42,
            largestContentfulPaintMs: 4_500,
            interactionToNextPaintMs: 180,
            cumulativeLayoutShift: 0.05,
            firstContentfulPaintMs: 1_200,
            opportunities: ["Serve smaller hero images"],
          },
          desktop: {
            score: 94,
            largestContentfulPaintMs: 1_800,
            interactionToNextPaintMs: 90,
            cumulativeLayoutShift: 0.02,
            firstContentfulPaintMs: 800,
            opportunities: [],
          },
        }
      },
    }

    const result = await runSeoAudit({
      url: "https://performance-site.com",
      network: fixture.network,
      performanceProvider: provider,
      limits: { maxPages: 1 },
    })
    expect(result.performance?.provider).toBe("fixture_pagespeed")
    expect(result.scores.performance).toBe(68)
    expect(result.issues.map((issue) => issue.checkKey)).toContain("performance.mobile.score")
    expect(result.issues.map((issue) => issue.checkKey)).toContain("performance.mobile.lcp")
  })

  it("reports an unreachable homepage honestly instead of creating synthetic checks", async () => {
    const fixture = createFixtureNetwork({})
    const result = await runSeoAudit({
      url: "https://offline-site.com",
      network: fixture.network,
      limits: { maxPages: 1 },
    })
    const unavailable = result.issues.find((issue) => issue.checkKey === "availability.homepage_unreachable")
    expect(unavailable?.severity).toBe("critical")
    expect(result.pages[0].fetchError).toBe("http_status_404")
    expect(result.performance).toBeNull()
  })
})
