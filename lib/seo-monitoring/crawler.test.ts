import { describe, expect, it } from "vitest"
import { crawlWebsite, isPathAllowedByRobots, normalizeCrawlLimits, parseRobotsTxt } from "./crawler"
import { createFixtureNetwork } from "./test-helpers"

const healthyHead = `
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="A detailed description that clearly explains this page to prospective visitors and gives them useful context before opening it.">
  <meta property="og:title" content="Acme">
  <meta property="og:description" content="Acme description">
  <meta property="og:image" content="/share.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.ico">
  <script type="application/ld+json">{"@context":"https://schema.org"}</script>
`

describe("bounded SEO crawler", () => {
  it("clamps product limits to eight pages, depth two and concurrency two", () => {
    expect(normalizeCrawlLimits({ maxPages: 100, maxDepth: 10, concurrency: 10 })).toMatchObject({
      maxPages: 8,
      maxDepth: 2,
      concurrency: 2,
    })
  })

  it("applies the longest matching robots rule", () => {
    const policy = parseRobotsTxt(`
      User-agent: *
      Disallow: /private
      Allow: /private/public
      Sitemap: https://robots-site.com/sitemap.xml
    `)
    expect(isPathAllowedByRobots(policy, "https://robots-site.com/private/notes")).toBe(false)
    expect(isPathAllowedByRobots(policy, "https://robots-site.com/private/public/page")).toBe(true)
    expect(policy.sitemapUrls).toEqual(["https://robots-site.com/sitemap.xml"])
  })

  it("crawls only bounded same-origin HTML pages and respects robots.txt", async () => {
    const fixture = createFixtureNetwork({
      "https://bounded-crawl.com/": {
        statusCode: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: `<html lang="en"><head><title>Acme Software Platform for Growing Teams</title>${healthyHead}<link rel="canonical" href="/"></head><body><h1>Build calmer workflows for growing teams</h1><p>${"Useful product information ".repeat(20)}</p><a href="/about">About</a><a href="/private">Private</a><a href="https://outside.com/page">Outside</a><a href="/guide.pdf">PDF</a></body></html>`,
      },
      "https://bounded-crawl.com/robots.txt": {
        statusCode: 200,
        headers: { "content-type": "text/plain" },
        body: "User-agent: *\nDisallow: /private\nSitemap: https://bounded-crawl.com/sitemap.xml",
      },
      "https://bounded-crawl.com/sitemap.xml": {
        statusCode: 200,
        headers: { "content-type": "application/xml" },
        body: `<?xml version="1.0"?><urlset><url><loc>https://bounded-crawl.com/</loc></url><url><loc>https://bounded-crawl.com/about</loc></url><url><loc>https://bounded-crawl.com/orphan</loc></url></urlset>`,
      },
      "https://bounded-crawl.com/about": {
        statusCode: 200,
        delayMs: 10,
        headers: { "content-type": "text/html" },
        body: `<html lang="en"><head><title>About the Acme Team and Our Mission</title>${healthyHead}<link rel="canonical" href="/about"></head><body><h1>About the Acme team</h1><p>${"Useful company information ".repeat(20)}</p></body></html>`,
      },
      "https://bounded-crawl.com/orphan": {
        statusCode: 200,
        delayMs: 10,
        headers: { "content-type": "text/html" },
        body: `<html lang="en"><head><title>Acme Customer Research and Product Principles</title>${healthyHead}<link rel="canonical" href="/orphan"></head><body><h1>Customer research principles</h1><p>${"Useful research information ".repeat(20)}</p></body></html>`,
      },
    })

    const result = await crawlWebsite({
      url: "https://bounded-crawl.com",
      network: fixture.network,
      limits: { maxPages: 3, concurrency: 2 },
      clock: () => new Date("2026-07-17T12:00:00.000Z"),
    })

    expect(result.pages).toHaveLength(3)
    expect(result.pages.map((page) => page.url)).toEqual([
      "https://bounded-crawl.com/",
      "https://bounded-crawl.com/about",
      "https://bounded-crawl.com/orphan",
    ])
    expect(result.blockedUrls).toEqual(["https://bounded-crawl.com/private"])
    expect(result.pages[0].externalLinks).toContain("https://outside.com/page")
    expect(result.pages[0].internalLinks).not.toContain("https://bounded-crawl.com/guide.pdf")
    expect(result.pages[2].inboundInternalLinkCount).toBe(0)
    expect(result.robots?.rootAllowed).toBe(true)
    expect(result.sitemap?.valid).toBe(true)
    expect(fixture.maxActive()).toBeLessThanOrEqual(2)
    expect(fixture.requests.some((request) => request.url === "https://bounded-crawl.com/private")).toBe(false)
  })

  it("does not follow links beyond the configured depth", async () => {
    const fixture = createFixtureNetwork({
      "https://depth-limited.com/": {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        body: "<html><body><a href='/one'>One</a></body></html>",
      },
      "https://depth-limited.com/robots.txt": { statusCode: 404 },
      "https://depth-limited.com/sitemap.xml": { statusCode: 404 },
      "https://depth-limited.com/one": {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        body: "<html><body><a href='/two'>Two</a></body></html>",
      },
      "https://depth-limited.com/two": {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        body: "<html><body>Too deep</body></html>",
      },
    })
    const result = await crawlWebsite({
      url: "https://depth-limited.com",
      network: fixture.network,
      limits: { maxDepth: 1 },
    })
    expect(result.pages.map((page) => page.url)).toEqual([
      "https://depth-limited.com/",
      "https://depth-limited.com/one",
    ])
    expect(fixture.requests.some((request) => request.url === "https://depth-limited.com/two")).toBe(false)
  })
})
