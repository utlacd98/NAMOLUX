import * as cheerio from "cheerio"
import { normalizePublicWebsiteUrl, SafeFetchError, safeFetchUrl } from "./network"
import type {
  CrawlResult,
  RobotsSnapshot,
  SafeFetchResult,
  SafeNetworkAdapters,
  SeoHeadingSnapshot,
  SeoPageSnapshot,
  SeoPartialFailure,
  SitemapSnapshot,
} from "./types"
import { boundedText, mapWithConcurrency, sha256, uniqueStrings } from "./utils"

export interface SeoCrawlLimits {
  maxPages: number
  maxDepth: number
  concurrency: number
  maxRedirects: number
  requestTimeoutMs: number
  totalRequestTimeoutMs: number
  maxHtmlBytes: number
  maxAuxiliaryBytes: number
}

export interface CrawlWebsiteInput {
  url: string
  network?: SafeNetworkAdapters
  limits?: Partial<SeoCrawlLimits>
  clock?: () => Date
}

export interface RobotsRule {
  allow: boolean
  pattern: string
}

export interface RobotsPolicy {
  rules: RobotsRule[]
  sitemapUrls: string[]
}

const DEFAULT_LIMITS: SeoCrawlLimits = {
  maxPages: 8,
  maxDepth: 2,
  concurrency: 2,
  maxRedirects: 4,
  requestTimeoutMs: 8_000,
  totalRequestTimeoutMs: 20_000,
  maxHtmlBytes: 1_048_576,
  maxAuxiliaryBytes: 524_288,
}

const NON_HTML_EXTENSION = /\.(?:7z|avi|bmp|css|csv|docx?|eot|gif|gz|ico|jpe?g|js|json|m4a|mov|mp3|mp4|mpeg|pdf|png|pptx?|rar|rss|svg|tar|tiff?|txt|webm|webp|woff2?|xlsx?|xml|zip)$/i

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value as number))) : fallback
}

export function normalizeCrawlLimits(input: Partial<SeoCrawlLimits> = {}): SeoCrawlLimits {
  return {
    maxPages: clamp(input.maxPages, DEFAULT_LIMITS.maxPages, 1, 8),
    maxDepth: clamp(input.maxDepth, DEFAULT_LIMITS.maxDepth, 0, 2),
    concurrency: clamp(input.concurrency, DEFAULT_LIMITS.concurrency, 1, 2),
    maxRedirects: clamp(input.maxRedirects, DEFAULT_LIMITS.maxRedirects, 0, 5),
    requestTimeoutMs: clamp(input.requestTimeoutMs, DEFAULT_LIMITS.requestTimeoutMs, 500, 15_000),
    totalRequestTimeoutMs: clamp(input.totalRequestTimeoutMs, DEFAULT_LIMITS.totalRequestTimeoutMs, 1_000, 45_000),
    maxHtmlBytes: clamp(input.maxHtmlBytes, DEFAULT_LIMITS.maxHtmlBytes, 16_384, 2_097_152),
    maxAuxiliaryBytes: clamp(input.maxAuxiliaryBytes, DEFAULT_LIMITS.maxAuxiliaryBytes, 4_096, 1_048_576),
  }
}

function normaliseCrawlUrl(value: string | URL, origin: string): string | null {
  try {
    const url = value instanceof URL ? new URL(value) : new URL(value, origin)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    url.hash = ""
    url.search = ""
    if (url.origin !== origin) return null
    if (NON_HTML_EXTENSION.test(url.pathname)) return null
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "") || "/"
    return url.toString()
  } catch {
    return null
  }
}

function getContentType(result: SafeFetchResult): string | null {
  return result.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() || null
}

function isHtmlContentType(contentType: string | null): boolean {
  return contentType === null || contentType === "text/html" || contentType === "application/xhtml+xml"
}

function emptyPageSnapshot(input: {
  requestedUrl: string
  url?: string
  statusCode?: number | null
  redirectCount?: number
  responseTimeMs?: number | null
  sizeBytes?: number | null
  contentType?: string | null
  fetchedAt: string
  error: string
}): SeoPageSnapshot {
  return {
    requestedUrl: input.requestedUrl,
    url: input.url || input.requestedUrl,
    statusCode: input.statusCode ?? null,
    redirectCount: input.redirectCount || 0,
    responseTimeMs: input.responseTimeMs ?? null,
    sizeBytes: input.sizeBytes ?? null,
    contentType: input.contentType ?? null,
    title: null,
    metaDescription: null,
    canonicalUrls: [],
    robotsDirectives: [],
    openGraph: { title: false, description: false, image: false },
    twitterCard: false,
    h1: [],
    headings: [],
    meaningfulWordCount: 0,
    imageCount: 0,
    imagesMissingAlt: 0,
    internalLinks: [],
    externalLinks: [],
    inboundInternalLinkCount: 0,
    scriptCount: 0,
    stylesheetCount: 0,
    hasViewport: false,
    hasFavicon: false,
    htmlLang: null,
    hasHtmlElement: false,
    hasHeadElement: false,
    hasBodyElement: false,
    structuredDataCount: 0,
    invalidJsonLdCount: 0,
    mixedContentUrls: [],
    fetchedAt: input.fetchedAt,
    fetchError: input.error,
  }
}

function resolveDocumentUrl(value: string | undefined, baseUrl: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value, baseUrl)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    url.hash = ""
    return url.toString()
  } catch {
    return null
  }
}

function extractPageSnapshot(result: SafeFetchResult, fetchedAt: string, crawlOrigin: string): { snapshot: SeoPageSnapshot; html: string } {
  const contentType = getContentType(result)
  if (result.statusCode < 200 || result.statusCode >= 300) {
    return {
      snapshot: emptyPageSnapshot({
        requestedUrl: result.requestedUrl,
        url: result.finalUrl,
        statusCode: result.statusCode,
        redirectCount: result.redirectChain.length,
        responseTimeMs: result.durationMs,
        sizeBytes: result.body.byteLength,
        contentType,
        fetchedAt,
        error: `http_status_${result.statusCode}`,
      }),
      html: "",
    }
  }
  if (!isHtmlContentType(contentType)) {
    return {
      snapshot: emptyPageSnapshot({
        requestedUrl: result.requestedUrl,
        url: result.finalUrl,
        statusCode: result.statusCode,
        redirectCount: result.redirectChain.length,
        responseTimeMs: result.durationMs,
        sizeBytes: result.body.byteLength,
        contentType,
        fetchedAt,
        error: "unsupported_content_type",
      }),
      html: "",
    }
  }

  const html = result.text
  const $ = cheerio.load(html)
  const finalUrl = result.finalUrl
  const headings: SeoHeadingSnapshot[] = []
  $("h1, h2, h3, h4, h5, h6").each((_, element) => {
    const tagName = String((element as { tagName?: string }).tagName || "").toLowerCase()
    const level = Number(tagName.slice(1))
    const text = boundedText($(element).text(), 240)
    if (level >= 1 && level <= 6 && text) headings.push({ level, text })
  })

  const canonicalUrls = uniqueStrings(
    $("link[rel~='canonical']")
      .map((_, element) => resolveDocumentUrl($(element).attr("href"), finalUrl) || "")
      .get(),
    4,
  )
  const robotsDirectives = uniqueStrings(
    $("meta[name='robots'], meta[name='googlebot']")
      .map((_, element) => $(element).attr("content") || "")
      .get()
      .flatMap((content: string) => content.toLowerCase().split(",").map((part: string) => part.trim())),
    20,
  )

  const internalLinks: string[] = []
  const externalLinks: string[] = []
  $("a[href]").each((_, element) => {
    const href = resolveDocumentUrl($(element).attr("href"), finalUrl)
    if (!href) return
    const normalised = normaliseCrawlUrl(href, crawlOrigin)
    if (normalised) internalLinks.push(normalised)
    else {
      try {
        const external = new URL(href)
        external.hash = ""
        if (external.origin !== crawlOrigin) externalLinks.push(external.toString())
      } catch {
        // Ignore malformed links; a separate placeholder-link signal is not
        // reliable enough to classify as a broken network destination.
      }
    }
  })

  let invalidJsonLdCount = 0
  const jsonLd = $("script[type='application/ld+json']")
  jsonLd.each((_, element) => {
    try {
      JSON.parse($(element).text())
    } catch {
      invalidJsonLdCount += 1
    }
  })

  const body = $("body").clone()
  body.find("script, style, noscript, template, svg").remove()
  const text = body.text().replace(/\s+/g, " ").trim()
  const meaningfulWordCount = text ? text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length : 0
  const images = $("img")
  let imagesMissingAlt = 0
  images.each((_, element) => {
    const alt = $(element).attr("alt")
    if (alt === undefined || !alt.trim()) imagesMissingAlt += 1
  })

  const mixedContentUrls = uniqueStrings(
    $("[src], [href]")
      .map((_, element) => $(element).attr("src") || $(element).attr("href") || "")
      .get()
      .filter((value) => value.toLowerCase().startsWith("http://")),
    20,
  )

  return {
    html,
    snapshot: {
      requestedUrl: result.requestedUrl,
      url: finalUrl,
      statusCode: result.statusCode,
      redirectCount: result.redirectChain.length,
      responseTimeMs: result.durationMs,
      sizeBytes: result.body.byteLength,
      contentType,
      title: boundedText($("title").first().text(), 300) || null,
      metaDescription: boundedText($("meta[name='description']").first().attr("content"), 600) || null,
      canonicalUrls,
      robotsDirectives,
      openGraph: {
        title: Boolean(boundedText($("meta[property='og:title']").attr("content"), 300)),
        description: Boolean(boundedText($("meta[property='og:description']").attr("content"), 600)),
        image: Boolean(boundedText($("meta[property='og:image']").attr("content"), 1_000)),
      },
      twitterCard: Boolean(boundedText($("meta[name='twitter:card']").attr("content"), 100)),
      h1: headings.filter((heading) => heading.level === 1).map((heading) => heading.text),
      headings,
      meaningfulWordCount,
      imageCount: images.length,
      imagesMissingAlt,
      internalLinks: uniqueStrings(internalLinks, 500),
      externalLinks: uniqueStrings(externalLinks, 200),
      inboundInternalLinkCount: 0,
      scriptCount: $("script[src]").length,
      stylesheetCount: $("link[rel~='stylesheet']").length,
      hasViewport: Boolean(boundedText($("meta[name='viewport']").attr("content"), 300)),
      hasFavicon: $("link[rel~='icon']").length > 0,
      htmlLang: boundedText($("html").attr("lang"), 40) || null,
      hasHtmlElement: /<html(?:\s|>)/i.test(html),
      hasHeadElement: /<head(?:\s|>)/i.test(html),
      hasBodyElement: /<body(?:\s|>)/i.test(html),
      structuredDataCount: jsonLd.length,
      invalidJsonLdCount,
      mixedContentUrls,
      fetchedAt,
    },
  }
}

function parseRobotsGroups(text: string): Array<{ agents: string[]; rules: RobotsRule[] }> {
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = []
  let agents: string[] = []
  let rules: RobotsRule[] = []

  const flush = () => {
    if (agents.length > 0) groups.push({ agents, rules })
    agents = []
    rules = []
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim()
    if (!line) continue
    const separator = line.indexOf(":")
    if (separator < 1) continue
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (key === "user-agent") {
      if (rules.length > 0) flush()
      agents.push(value.toLowerCase())
    } else if ((key === "allow" || key === "disallow") && agents.length > 0) {
      if (value) rules.push({ allow: key === "allow", pattern: value })
    }
  }
  flush()
  return groups
}

export function parseRobotsTxt(text: string): RobotsPolicy {
  const groups = parseRobotsGroups(text)
  const bot = "namoluxfoundersignalbot"
  const exact = groups.filter((group) => group.agents.some((agent) => bot.startsWith(agent) && agent !== "*"))
  const wildcard = groups.filter((group) => group.agents.includes("*"))
  const selected = exact.length > 0 ? exact : wildcard
  const sitemapUrls = uniqueStrings(
    text
      .split(/\r?\n/)
      .map((line) => line.replace(/#.*$/, "").trim())
      .filter((line) => /^sitemap\s*:/i.test(line))
      .map((line) => line.slice(line.indexOf(":") + 1).trim()),
    20,
  )
  return { rules: selected.flatMap((group) => group.rules), sitemapUrls }
}

function robotsPatternMatches(pattern: string, pathname: string): boolean {
  const endAnchored = pattern.endsWith("$")
  const withoutAnchor = endAnchored ? pattern.slice(0, -1) : pattern
  const escaped = withoutAnchor.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")
  try {
    return new RegExp(`^${escaped}${endAnchored ? "$" : ""}`).test(pathname)
  } catch {
    return pathname.startsWith(withoutAnchor)
  }
}

export function isPathAllowedByRobots(policy: RobotsPolicy | null, url: string | URL): boolean {
  if (!policy || policy.rules.length === 0) return true
  const target = url instanceof URL ? url : new URL(url)
  const matched = policy.rules
    .filter((rule) => robotsPatternMatches(rule.pattern, `${target.pathname}${target.search}`))
    .sort((left, right) => right.pattern.length - left.pattern.length || Number(right.allow) - Number(left.allow))[0]
  return matched ? matched.allow : true
}

async function fetchRobots(
  origin: string,
  network: SafeNetworkAdapters,
  limits: SeoCrawlLimits,
): Promise<{ snapshot: RobotsSnapshot; policy: RobotsPolicy | null; failure?: SeoPartialFailure }> {
  const url = new URL("/robots.txt", origin).toString()
  try {
    const result = await safeFetchUrl(url, network, {
      maxBytes: limits.maxAuxiliaryBytes,
      requestTimeoutMs: limits.requestTimeoutMs,
      totalTimeoutMs: limits.totalRequestTimeoutMs,
      maxRedirects: limits.maxRedirects,
      accept: "text/plain,text/*;q=0.9,*/*;q=0.1",
    })
    if (result.statusCode !== 200) {
      return {
        snapshot: {
          url: result.finalUrl,
          available: false,
          statusCode: result.statusCode,
          rootAllowed: null,
          sitemapUrls: [],
          contentHash: null,
        },
        policy: null,
      }
    }
    const policy = parseRobotsTxt(result.text)
    return {
      snapshot: {
        url: result.finalUrl,
        available: true,
        statusCode: result.statusCode,
        rootAllowed: isPathAllowedByRobots(policy, new URL("/", origin)),
        sitemapUrls: policy.sitemapUrls,
        contentHash: sha256(result.text),
      },
      policy,
    }
  } catch (error) {
    const code = error instanceof SafeFetchError ? error.code : "robots_fetch_failed"
    return {
      snapshot: {
        url,
        available: false,
        statusCode: null,
        rootAllowed: null,
        sitemapUrls: [],
        contentHash: null,
        error: code,
      },
      policy: null,
      failure: { stage: "robots", code, message: "robots.txt could not be checked.", url },
    }
  }
}

function parseSitemap(xml: string, sitemapUrl: string, origin: string): { valid: boolean; urls: string[]; childSitemaps: string[] } {
  try {
    const $ = cheerio.load(xml, { xmlMode: true })
    const isUrlSet = $("urlset").length > 0
    const isIndex = $("sitemapindex").length > 0
    if (!isUrlSet && !isIndex) return { valid: false, urls: [], childSitemaps: [] }
    const resolveLoc = (value: string) => {
      try {
        const url = new URL(value.trim(), sitemapUrl)
        url.hash = ""
        return url.origin === origin ? url.toString() : null
      } catch {
        return null
      }
    }
    const urls = uniqueStrings(
      $("url > loc").map((_, element) => resolveLoc($(element).text()) || "").get(),
      500,
    )
    const childSitemaps = uniqueStrings(
      $("sitemap > loc").map((_, element) => resolveLoc($(element).text()) || "").get(),
      20,
    )
    return { valid: true, urls, childSitemaps }
  } catch {
    return { valid: false, urls: [], childSitemaps: [] }
  }
}

async function fetchSitemap(
  origin: string,
  declaredUrls: readonly string[],
  network: SafeNetworkAdapters,
  limits: SeoCrawlLimits,
): Promise<{ snapshot: SitemapSnapshot; failure?: SeoPartialFailure }> {
  const sameOriginDeclared = declaredUrls.find((value) => {
    try {
      return new URL(value, origin).origin === origin
    } catch {
      return false
    }
  })
  const url = sameOriginDeclared ? new URL(sameOriginDeclared, origin).toString() : new URL("/sitemap.xml", origin).toString()
  try {
    const result = await safeFetchUrl(url, network, {
      maxBytes: limits.maxAuxiliaryBytes,
      requestTimeoutMs: limits.requestTimeoutMs,
      totalTimeoutMs: limits.totalRequestTimeoutMs,
      maxRedirects: limits.maxRedirects,
      accept: "application/xml,text/xml,text/plain;q=0.8,*/*;q=0.1",
    })
    if (result.statusCode !== 200) {
      return {
        snapshot: {
          url: result.finalUrl,
          available: false,
          valid: false,
          statusCode: result.statusCode,
          discoveredUrls: [],
          childSitemaps: [],
          contentHash: null,
        },
      }
    }
    const parsed = parseSitemap(result.text, result.finalUrl, origin)
    return {
      snapshot: {
        url: result.finalUrl,
        available: true,
        valid: parsed.valid,
        statusCode: result.statusCode,
        discoveredUrls: parsed.urls,
        childSitemaps: parsed.childSitemaps,
        contentHash: sha256(result.text),
      },
    }
  } catch (error) {
    const code = error instanceof SafeFetchError ? error.code : "sitemap_fetch_failed"
    return {
      snapshot: {
        url,
        available: false,
        valid: false,
        statusCode: null,
        discoveredUrls: [],
        childSitemaps: [],
        contentHash: null,
        error: code,
      },
      failure: { stage: "sitemap", code, message: "The XML sitemap could not be checked.", url },
    }
  }
}

function updateInboundCounts(pages: SeoPageSnapshot[]): SeoPageSnapshot[] {
  const inbound = new Map<string, number>()
  for (const page of pages) {
    for (const link of page.internalLinks) inbound.set(link, (inbound.get(link) || 0) + 1)
  }
  return pages.map((page) => ({ ...page, inboundInternalLinkCount: inbound.get(page.url) || 0 }))
}

export async function crawlWebsite(input: CrawlWebsiteInput): Promise<CrawlResult> {
  const clock = input.clock || (() => new Date())
  const limits = normalizeCrawlLimits(input.limits)
  const network = input.network || {}
  const normalized = normalizePublicWebsiteUrl(input.url)
  const partialFailures: SeoPartialFailure[] = []
  const fetchedAt = () => clock().toISOString()

  let homepageResult: SafeFetchResult
  try {
    homepageResult = await safeFetchUrl(normalized, network, {
      maxBytes: limits.maxHtmlBytes,
      requestTimeoutMs: limits.requestTimeoutMs,
      totalTimeoutMs: limits.totalRequestTimeoutMs,
      maxRedirects: limits.maxRedirects,
    })
  } catch (error) {
    const code = error instanceof SafeFetchError ? error.code : "homepage_fetch_failed"
    const message = error instanceof SafeFetchError ? error.message : "The website homepage could not be reached."
    partialFailures.push({ stage: "homepage", code, message, url: normalized.toString() })
    const page = emptyPageSnapshot({ requestedUrl: normalized.toString(), fetchedAt: fetchedAt(), error: code })
    return {
      requestedUrl: input.url,
      normalizedUrl: normalized.toString(),
      finalUrl: normalized.toString(),
      pages: [page],
      robots: null,
      sitemap: null,
      blockedUrls: [],
      partialFailures,
      documents: [{ snapshot: page, html: "" }],
    }
  }

  const homepageOrigin = new URL(homepageResult.finalUrl).origin
  const homepageDocument = extractPageSnapshot(homepageResult, fetchedAt(), homepageOrigin)
  const documents: Array<{ snapshot: SeoPageSnapshot; html: string }> = [homepageDocument]

  const robotsResult = await fetchRobots(homepageOrigin, network, limits)
  if (robotsResult.failure) partialFailures.push(robotsResult.failure)
  const sitemapResult = await fetchSitemap(homepageOrigin, robotsResult.snapshot.sitemapUrls, network, limits)
  if (sitemapResult.failure) partialFailures.push(sitemapResult.failure)

  const blockedUrls: string[] = []
  const visited = new Set<string>([normaliseCrawlUrl(homepageResult.finalUrl, homepageOrigin) || homepageResult.finalUrl])
  type QueueItem = { url: string; depth: number }
  const queue: QueueItem[] = []
  const queued = new Set<string>()

  const enqueue = (value: string, depth: number) => {
    if (depth > limits.maxDepth || documents.length + queue.length >= limits.maxPages * 4) return
    const url = normaliseCrawlUrl(value, homepageOrigin)
    if (!url || visited.has(url) || queued.has(url)) return
    if (!isPathAllowedByRobots(robotsResult.policy, url)) {
      blockedUrls.push(url)
      return
    }
    queued.add(url)
    queue.push({ url, depth })
  }

  for (const url of homepageDocument.snapshot.internalLinks) enqueue(url, 1)
  for (const url of sitemapResult.snapshot.discoveredUrls) enqueue(url, 1)

  while (queue.length > 0 && documents.length < limits.maxPages) {
    const remaining = limits.maxPages - documents.length
    const batch = queue.splice(0, Math.min(limits.concurrency, remaining))
    for (const item of batch) queued.delete(item.url)
    const results = await mapWithConcurrency(batch, limits.concurrency, async (item) => {
      try {
        const result = await safeFetchUrl(item.url, network, {
          maxBytes: limits.maxHtmlBytes,
          requestTimeoutMs: limits.requestTimeoutMs,
          totalTimeoutMs: limits.totalRequestTimeoutMs,
          maxRedirects: limits.maxRedirects,
        })
        if (new URL(result.finalUrl).origin !== homepageOrigin) {
          return {
            item,
            document: {
              snapshot: emptyPageSnapshot({
                requestedUrl: item.url,
                url: result.finalUrl,
                statusCode: result.statusCode,
                redirectCount: result.redirectChain.length,
                responseTimeMs: result.durationMs,
                sizeBytes: result.body.byteLength,
                contentType: getContentType(result),
                fetchedAt: fetchedAt(),
                error: "cross_origin_redirect",
              }),
              html: "",
            },
          }
        }
        return { item, document: extractPageSnapshot(result, fetchedAt(), homepageOrigin) }
      } catch (error) {
        const code = error instanceof SafeFetchError ? error.code : "page_fetch_failed"
        partialFailures.push({ stage: "crawl", code, message: "A discovered page could not be checked.", url: item.url })
        return {
          item,
          document: {
            snapshot: emptyPageSnapshot({ requestedUrl: item.url, fetchedAt: fetchedAt(), error: code }),
            html: "",
          },
        }
      }
    })

    for (const result of results) {
      const canonical = normaliseCrawlUrl(result.document.snapshot.url, homepageOrigin) || result.item.url
      if (visited.has(canonical)) continue
      visited.add(canonical)
      documents.push(result.document)
      if (result.item.depth < limits.maxDepth && !result.document.snapshot.fetchError) {
        for (const url of result.document.snapshot.internalLinks) enqueue(url, result.item.depth + 1)
      }
    }
  }

  const pages = updateInboundCounts(documents.map((document) => document.snapshot))
  const updatedDocuments = documents.map((document, index) => ({ ...document, snapshot: pages[index] }))
  return {
    requestedUrl: input.url,
    normalizedUrl: normalized.toString(),
    finalUrl: homepageResult.finalUrl,
    pages,
    robots: robotsResult.snapshot,
    sitemap: sitemapResult.snapshot,
    blockedUrls: uniqueStrings(blockedUrls, 500),
    partialFailures,
    documents: updatedDocuments,
  }
}
