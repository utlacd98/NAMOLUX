import type {
  CrawlResult,
  SeoDetectedIssue,
  SeoIssueCategory,
  SeoIssueEvidence,
  SeoPerformanceSnapshot,
  SeoSeverity,
} from "./types"
import { withIssueFingerprint } from "./issues"
import { normaliseEvidenceUrl, severityRank, uniqueStrings } from "./utils"

export interface DetectSeoIssuesInput {
  crawl: CrawlResult
  httpRedirectsToHttps: boolean | null
  performance?: SeoPerformanceSnapshot | null
}

type IssueInput = {
  checkKey: string
  category: SeoIssueCategory
  severity: SeoSeverity
  title: string
  explanation: string
  whyItMatters: string
  recommendation: string
  evidence?: SeoIssueEvidence
  affectedUrl: string
}

const GENERIC_HEADINGS = new Set([
  "home",
  "welcome",
  "learn more",
  "about",
  "services",
  "products",
  "page",
  "untitled",
])

function createIssue(input: IssueInput): SeoDetectedIssue {
  return withIssueFingerprint({ ...input, evidence: input.evidence || {} })
}

function normaliseComparable(value: string | null): string {
  return (value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim()
}

function hasSkippedHeadingLevel(levels: readonly number[]): boolean {
  let previous = 0
  for (const level of levels) {
    if (previous > 0 && level > previous + 1) return true
    previous = level
  }
  return false
}

function isHomepage(pageUrl: string, finalUrl: string): boolean {
  return normaliseEvidenceUrl(pageUrl) === normaliseEvidenceUrl(finalUrl)
}

function addDuplicateIssues(
  issues: SeoDetectedIssue[],
  entries: Array<{ url: string; value: string | null }>,
  input: Omit<IssueInput, "affectedUrl" | "evidence">,
) {
  const byValue = new Map<string, string[]>()
  for (const entry of entries) {
    const value = normaliseComparable(entry.value)
    if (!value) continue
    byValue.set(value, [...(byValue.get(value) || []), entry.url])
  }
  for (const [value, urls] of byValue) {
    if (urls.length < 2) continue
    for (const url of urls) {
      issues.push(createIssue({
        ...input,
        affectedUrl: url,
        evidence: { measuredValue: value.slice(0, 160), details: urls.filter((candidate) => candidate !== url).slice(0, 5) },
      }))
    }
  }
}

function addPerformanceIssues(issues: SeoDetectedIssue[], performance: SeoPerformanceSnapshot, affectedUrl: string) {
  for (const [strategy, measurements] of [["mobile", performance.mobile], ["desktop", performance.desktop]] as const) {
    if (!measurements) continue
    if (measurements.score < 50) {
      issues.push(createIssue({
        checkKey: `performance.${strategy}.score`,
        category: "performance",
        severity: "high",
        title: `${strategy === "mobile" ? "Mobile" : "Desktop"} performance needs attention`,
        explanation: `The measured ${strategy} performance score is ${measurements.score} out of 100.`,
        whyItMatters: "Slow or unstable pages can frustrate visitors and weaken search visibility.",
        recommendation: measurements.opportunities[0] || "Review the largest measured performance opportunity and retest after making changes.",
        evidence: { measuredValue: measurements.score, expectedValue: "50 or higher" },
        affectedUrl,
      }))
    } else if (measurements.score < 90) {
      issues.push(createIssue({
        checkKey: `performance.${strategy}.score`,
        category: "performance",
        severity: "medium",
        title: `${strategy === "mobile" ? "Mobile" : "Desktop"} performance can improve`,
        explanation: `The measured ${strategy} performance score is ${measurements.score} out of 100.`,
        whyItMatters: "Improving measured performance can make the site easier to use and more resilient on slower devices.",
        recommendation: measurements.opportunities[0] || "Work through the highest-impact measured performance opportunity.",
        evidence: { measuredValue: measurements.score, expectedValue: "90 or higher" },
        affectedUrl,
      }))
    }

    const metrics = [
      {
        key: "lcp",
        title: "Largest Contentful Paint is slow",
        value: measurements.largestContentfulPaintMs,
        medium: 2_500,
        high: 4_000,
        unit: "ms",
        recommendation: "Optimise the largest above-the-fold image or content block and reduce render-blocking work.",
      },
      {
        key: "inp",
        title: "Interaction responsiveness is slow",
        value: measurements.interactionToNextPaintMs,
        medium: 200,
        high: 500,
        unit: "ms",
        recommendation: "Reduce long-running JavaScript work and keep interaction handlers lightweight.",
      },
      {
        key: "cls",
        title: "Page elements move unexpectedly",
        value: measurements.cumulativeLayoutShift,
        medium: 0.1,
        high: 0.25,
        unit: "",
        recommendation: "Reserve space for images, embeds and dynamic content before they load.",
      },
    ] as const
    for (const metric of metrics) {
      if (metric.value === null || metric.value <= metric.medium) continue
      issues.push(createIssue({
        checkKey: `performance.${strategy}.${metric.key}`,
        category: "performance",
        severity: metric.value > metric.high ? "high" : "medium",
        title: `${strategy === "mobile" ? "Mobile" : "Desktop"}: ${metric.title}`,
        explanation: `The measured value is ${metric.value}${metric.unit}.`,
        whyItMatters: "Core Web Vitals describe real aspects of loading, responsiveness and visual stability.",
        recommendation: metric.recommendation,
        evidence: { measuredValue: metric.value, expectedValue: `at or below ${metric.medium}${metric.unit}` },
        affectedUrl,
      }))
    }
  }
}

export function detectSeoIssues(input: DetectSeoIssuesInput): SeoDetectedIssue[] {
  const { crawl } = input
  const issues: SeoDetectedIssue[] = []
  const homepage = crawl.pages[0]
  const successfulPages = crawl.pages.filter((page) => !page.fetchError && page.statusCode !== null && page.statusCode >= 200 && page.statusCode < 300)

  if (homepage.fetchError || homepage.statusCode === null) {
    issues.push(createIssue({
      checkKey: "availability.homepage_unreachable",
      category: "availability",
      severity: "critical",
      title: "Website could not be reached",
      explanation: "NamoLux could not retrieve the public homepage during this audit.",
      whyItMatters: "Visitors and search crawlers cannot use a website that is unavailable.",
      recommendation: "Check the domain, hosting and DNS configuration, then run the audit again.",
      evidence: { measuredValue: homepage.fetchError || "no_response" },
      affectedUrl: homepage.url,
    }))
  }

  for (const page of crawl.pages) {
    const status = page.statusCode
    if (status !== null && status >= 400) {
      issues.push(createIssue({
        checkKey: "availability.http_error",
        category: "availability",
        severity: status >= 500 ? "critical" : "high",
        title: `Page returns HTTP ${status}`,
        explanation: `The page returned an error response instead of usable content.`,
        whyItMatters: "Broken pages interrupt visitors and can be removed from search results over time.",
        recommendation: status === 404
          ? "Restore the page or redirect its internal links to the correct live page."
          : "Investigate the hosting or application error and restore a successful response.",
        evidence: { measuredValue: status, expectedValue: "200-299" },
        affectedUrl: page.url,
      }))
    } else if (page.fetchError && page !== homepage) {
      issues.push(createIssue({
        checkKey: "availability.page_fetch_failed",
        category: "availability",
        severity: "high",
        title: "An internal page stopped responding",
        explanation: "A page discovered through the website could not be retrieved safely.",
        whyItMatters: "Visitors and crawlers may encounter a dead end.",
        recommendation: "Open the affected URL, repair the page or update links that point to it.",
        evidence: { measuredValue: page.fetchError },
        affectedUrl: page.url,
      }))
    }

    if (page.responseTimeMs !== null && page.responseTimeMs > 3_000) {
      issues.push(createIssue({
        checkKey: "availability.slow_response",
        category: "technical",
        severity: page.responseTimeMs > 5_000 ? "high" : "medium",
        title: "Server response is slow",
        explanation: `The measured response took ${(page.responseTimeMs / 1_000).toFixed(1)} seconds.`,
        whyItMatters: "A slow initial response delays every visible part of the page.",
        recommendation: "Review hosting response time, caching and slow server-side work.",
        evidence: { measuredValue: page.responseTimeMs, expectedValue: "3000 ms or less" },
        affectedUrl: page.url,
      }))
    }
    if (page.redirectCount > 2) {
      issues.push(createIssue({
        checkKey: "availability.redirect_chain",
        category: "technical",
        severity: "medium",
        title: "Redirect chain is longer than necessary",
        explanation: `The request followed ${page.redirectCount} redirects before reaching the page.`,
        whyItMatters: "Extra redirects add delay and make migrations harder to maintain.",
        recommendation: "Update links and redirects so they point directly to the final HTTPS URL.",
        evidence: { measuredValue: page.redirectCount, expectedValue: "0-2" },
        affectedUrl: page.requestedUrl,
      }))
    }
  }

  if (!new URL(crawl.finalUrl).protocol.startsWith("https")) {
    issues.push(createIssue({
      checkKey: "availability.https_missing",
      category: "technical",
      severity: "critical",
      title: "Website is not using HTTPS",
      explanation: "The final homepage is served over an unencrypted HTTP connection.",
      whyItMatters: "HTTPS protects visitors and is a baseline requirement for modern search and browser trust.",
      recommendation: "Install a valid TLS certificate and redirect every HTTP URL to HTTPS.",
      affectedUrl: crawl.finalUrl,
    }))
  } else if (input.httpRedirectsToHttps === false) {
    issues.push(createIssue({
      checkKey: "availability.http_not_redirected",
      category: "technical",
      severity: "high",
      title: "HTTP does not redirect cleanly to HTTPS",
      explanation: "The HTTP version did not reach the secure version during the audit.",
      whyItMatters: "Multiple protocols can split signals and expose visitors to an insecure entry point.",
      recommendation: "Configure a permanent server-side redirect from HTTP to the canonical HTTPS URL.",
      affectedUrl: crawl.finalUrl,
    }))
  }

  if (!crawl.robots?.available) {
    issues.push(createIssue({
      checkKey: "crawlability.robots_missing",
      category: "crawlability",
      severity: "low",
      title: "robots.txt was not available",
      explanation: "No readable robots.txt file was found at the standard location.",
      whyItMatters: "A robots.txt file gives crawlers clear instructions and points them towards the sitemap.",
      recommendation: "Publish a simple robots.txt file and include the XML sitemap location.",
      affectedUrl: crawl.robots?.url || new URL("/robots.txt", crawl.finalUrl).toString(),
    }))
  } else if (crawl.robots.rootAllowed === false) {
    issues.push(createIssue({
      checkKey: "crawlability.homepage_blocked",
      category: "crawlability",
      severity: "critical",
      title: "robots.txt blocks the website",
      explanation: "The applicable robots.txt rules disallow crawling from the site root.",
      whyItMatters: "Search crawlers may be unable to discover or refresh the site's pages.",
      recommendation: "Remove the broad disallow rule unless blocking the public website is intentional.",
      affectedUrl: crawl.robots.url,
    }))
  }
  for (const url of crawl.blockedUrls.slice(0, 50)) {
    issues.push(createIssue({
      checkKey: "crawlability.discovered_page_blocked",
      category: "crawlability",
      severity: "medium",
      title: "A discovered page is blocked by robots.txt",
      explanation: "NamoLux discovered the URL but did not crawl it because the site's robots rules disallow it.",
      whyItMatters: "A public page that cannot be crawled may not appear or update correctly in search.",
      recommendation: "Confirm that this page should be blocked; otherwise narrow the relevant robots.txt rule.",
      affectedUrl: url,
    }))
  }

  if (!crawl.sitemap?.available) {
    issues.push(createIssue({
      checkKey: "crawlability.sitemap_missing",
      category: "crawlability",
      severity: "medium",
      title: "XML sitemap was not available",
      explanation: "No readable XML sitemap was found from robots.txt or the standard sitemap URL.",
      whyItMatters: "A sitemap helps search engines discover important pages and notice changes.",
      recommendation: "Generate an XML sitemap, publish it and reference it from robots.txt.",
      affectedUrl: crawl.sitemap?.url || new URL("/sitemap.xml", crawl.finalUrl).toString(),
    }))
  } else if (!crawl.sitemap.valid) {
    issues.push(createIssue({
      checkKey: "crawlability.sitemap_invalid",
      category: "crawlability",
      severity: "high",
      title: "XML sitemap could not be parsed",
      explanation: "The sitemap response did not contain a valid sitemap URL set or sitemap index.",
      whyItMatters: "Search engines may ignore a malformed sitemap.",
      recommendation: "Regenerate the sitemap as valid XML and validate every listed URL.",
      affectedUrl: crawl.sitemap.url,
    }))
  }

  const sitemapUrls = new Set((crawl.sitemap?.discoveredUrls || []).map(normaliseEvidenceUrl))
  for (const page of successfulPages) {
    const home = isHomepage(page.url, crawl.finalUrl)
    const noindex = page.robotsDirectives.some((directive) => directive === "noindex" || directive.startsWith("noindex:"))
    if (noindex) {
      issues.push(createIssue({
        checkKey: "crawlability.noindex",
        category: "crawlability",
        severity: home ? "critical" : "high",
        title: home ? "Homepage is marked noindex" : "Page is marked noindex",
        explanation: "The page contains a robots directive asking search engines not to index it.",
        whyItMatters: "A noindex page is intentionally excluded from normal search results.",
        recommendation: "Remove the noindex directive if this public page should appear in search.",
        evidence: { measuredValue: page.robotsDirectives.join(", ") },
        affectedUrl: page.url,
      }))
    }
    if (page.canonicalUrls.length === 0) {
      issues.push(createIssue({
        checkKey: "metadata.canonical_missing",
        category: "crawlability",
        severity: "medium",
        title: "Canonical URL is missing",
        explanation: "The page does not declare its preferred canonical URL.",
        whyItMatters: "Canonical tags help consolidate duplicate URL variants around one preferred page.",
        recommendation: "Add one self-referencing canonical URL to the page head.",
        affectedUrl: page.url,
      }))
    } else if (page.canonicalUrls.length > 1) {
      issues.push(createIssue({
        checkKey: "metadata.canonical_conflict",
        category: "crawlability",
        severity: "high",
        title: "Page declares conflicting canonical URLs",
        explanation: "More than one canonical destination was found.",
        whyItMatters: "Conflicting canonical signals make the preferred page ambiguous.",
        recommendation: "Keep exactly one correct canonical tag.",
        evidence: { measuredValue: page.canonicalUrls.length, details: page.canonicalUrls },
        affectedUrl: page.url,
      }))
    }
    if (sitemapUrls.has(normaliseEvidenceUrl(page.url)) && !home && page.inboundInternalLinkCount === 0) {
      issues.push(createIssue({
        checkKey: "content.orphan_page",
        category: "crawlability",
        severity: "medium",
        title: "Sitemap page has no detected internal links",
        explanation: "The page appears in the sitemap but no crawled page links to it.",
        whyItMatters: "Pages without internal links are harder for visitors and crawlers to discover in context.",
        recommendation: "Link to this page from a relevant navigation, hub or article page.",
        affectedUrl: page.url,
      }))
    }

    const titleLength = page.title?.length || 0
    if (!page.title) {
      issues.push(createIssue({
        checkKey: "metadata.title_missing",
        category: "metadata",
        severity: "high",
        title: "Title tag is missing",
        explanation: "The page has no usable HTML title.",
        whyItMatters: "The title is a primary description used by browsers and search results.",
        recommendation: "Write a unique, descriptive title for this page.",
        affectedUrl: page.url,
      }))
    } else if (titleLength < 30 || titleLength > 60) {
      issues.push(createIssue({
        checkKey: titleLength < 30 ? "metadata.title_short" : "metadata.title_long",
        category: "metadata",
        severity: "medium",
        title: titleLength < 30 ? "Title tag is unusually short" : "Title tag is unusually long",
        explanation: `The title contains ${titleLength} characters.`,
        whyItMatters: "A clear, appropriately sized title gives searchers useful context without unnecessary truncation.",
        recommendation: "Aim for a clear title of roughly 30 to 60 characters without padding or keyword stuffing.",
        evidence: { measuredValue: titleLength, expectedValue: "30-60 characters" },
        affectedUrl: page.url,
      }))
    }

    const descriptionLength = page.metaDescription?.length || 0
    if (!page.metaDescription) {
      issues.push(createIssue({
        checkKey: "metadata.description_missing",
        category: "metadata",
        severity: "medium",
        title: "Meta description is missing",
        explanation: "The page has no meta description.",
        whyItMatters: "A useful description can help people understand the page before they click.",
        recommendation: "Add a specific description that accurately summarises this page.",
        affectedUrl: page.url,
      }))
    } else if (descriptionLength < 70 || descriptionLength > 160) {
      issues.push(createIssue({
        checkKey: descriptionLength < 70 ? "metadata.description_short" : "metadata.description_long",
        category: "metadata",
        severity: "low",
        title: descriptionLength < 70 ? "Meta description is unusually short" : "Meta description is unusually long",
        explanation: `The description contains ${descriptionLength} characters.`,
        whyItMatters: "A concise, informative description gives searchers a clearer preview of the page.",
        recommendation: "Rewrite it as a natural summary of roughly 70 to 160 characters.",
        evidence: { measuredValue: descriptionLength, expectedValue: "70-160 characters" },
        affectedUrl: page.url,
      }))
    }
    if (!page.openGraph.title || !page.openGraph.description) {
      issues.push(createIssue({
        checkKey: "metadata.open_graph_incomplete",
        category: "metadata",
        severity: "low",
        title: "Open Graph metadata is incomplete",
        explanation: "The page is missing an Open Graph title or description.",
        whyItMatters: "Social platforms use these fields when building shared-link previews.",
        recommendation: "Add accurate og:title and og:description values.",
        affectedUrl: page.url,
      }))
    }
    if (!page.openGraph.image) {
      issues.push(createIssue({
        checkKey: "metadata.open_graph_image_missing",
        category: "metadata",
        severity: "low",
        title: "Social sharing image is missing",
        explanation: "No Open Graph image was detected.",
        whyItMatters: "A relevant image makes shared links easier to recognise.",
        recommendation: "Add a properly sized og:image that represents this page.",
        affectedUrl: page.url,
      }))
    }
    if (!page.twitterCard) {
      issues.push(createIssue({
        checkKey: "metadata.twitter_card_missing",
        category: "metadata",
        severity: "low",
        title: "Twitter card metadata is missing",
        explanation: "The page does not declare a Twitter card type.",
        whyItMatters: "Card metadata helps compatible social platforms render a predictable preview.",
        recommendation: "Add a twitter:card value that matches the page's sharing format.",
        affectedUrl: page.url,
      }))
    }

    if (page.h1.length === 0) {
      issues.push(createIssue({
        checkKey: "content.h1_missing",
        category: "content",
        severity: "high",
        title: "Main heading is missing",
        explanation: "No H1 heading was found on the page.",
        whyItMatters: "A clear main heading helps visitors and crawlers understand the page topic.",
        recommendation: "Add one descriptive H1 that matches the page's main purpose.",
        affectedUrl: page.url,
      }))
    } else if (page.h1.length > 1) {
      issues.push(createIssue({
        checkKey: "content.multiple_h1",
        category: "content",
        severity: "medium",
        title: "Page has multiple main headings",
        explanation: `${page.h1.length} H1 headings were detected.`,
        whyItMatters: "Multiple competing main headings can make the page structure less clear.",
        recommendation: "Use one primary H1 and move supporting sections to H2 or lower levels.",
        evidence: { measuredValue: page.h1.length, details: page.h1.slice(0, 5) },
        affectedUrl: page.url,
      }))
    }
    if (hasSkippedHeadingLevel(page.headings.map((heading) => heading.level))) {
      issues.push(createIssue({
        checkKey: "content.heading_hierarchy",
        category: "content",
        severity: "medium",
        title: "Heading hierarchy skips levels",
        explanation: "At least one heading jumps over an intermediate level.",
        whyItMatters: "A logical heading order makes long pages easier to scan and understand.",
        recommendation: "Reorder headings so sections progress from H1 to H2 to H3 without unnecessary jumps.",
        affectedUrl: page.url,
      }))
    }
    if (page.h1.some((heading) => GENERIC_HEADINGS.has(normaliseComparable(heading)))) {
      issues.push(createIssue({
        checkKey: "content.weak_h1",
        category: "content",
        severity: "medium",
        title: "Main heading is too generic",
        explanation: "The main heading does not clearly describe the page's purpose.",
        whyItMatters: "Visitors should understand the page from its primary heading alone.",
        recommendation: "Replace the generic heading with a specific statement about this page.",
        evidence: { measuredValue: page.h1[0] || "" },
        affectedUrl: page.url,
      }))
    }
    if (page.meaningfulWordCount < 150) {
      issues.push(createIssue({
        checkKey: "content.thin_page",
        category: "content",
        severity: page.meaningfulWordCount < 50 ? "high" : "medium",
        title: "Page has very little meaningful text",
        explanation: `Approximately ${page.meaningfulWordCount} meaningful words were detected.`,
        whyItMatters: "Very thin pages often leave visitors' questions unanswered and give crawlers little context.",
        recommendation: "Add useful, original information that helps the visitor complete the page's intended task.",
        evidence: { measuredValue: page.meaningfulWordCount, expectedValue: "150 or more where appropriate" },
        affectedUrl: page.url,
      }))
    }
    if (page.imagesMissingAlt > 0) {
      issues.push(createIssue({
        checkKey: "content.image_alt_missing",
        category: "content",
        severity: page.imagesMissingAlt === page.imageCount ? "medium" : "low",
        title: "Images are missing alternative text",
        explanation: `${page.imagesMissingAlt} of ${page.imageCount} images have no usable alt text.`,
        whyItMatters: "Alternative text supports accessibility and helps explain meaningful images.",
        recommendation: "Add concise alt text to informative images and use an empty alt value for purely decorative images.",
        evidence: { measuredValue: page.imagesMissingAlt, expectedValue: 0 },
        affectedUrl: page.url,
      }))
    }

    if (!page.hasViewport) {
      issues.push(createIssue({
        checkKey: "technical.viewport_missing",
        category: "technical",
        severity: "high",
        title: "Mobile viewport metadata is missing",
        explanation: "The page does not declare a usable viewport.",
        whyItMatters: "Without viewport metadata, mobile browsers may render the page at an unsuitable desktop width.",
        recommendation: "Add a viewport meta tag configured for device width.",
        affectedUrl: page.url,
      }))
    }
    const missingStructuralElements = [
      !page.hasHtmlElement ? "html" : "",
      !page.hasHeadElement ? "head" : "",
      !page.hasBodyElement ? "body" : "",
    ].filter(Boolean)
    if (missingStructuralElements.length > 0) {
      issues.push(createIssue({
        checkKey: "technical.html_structure",
        category: "technical",
        severity: "medium",
        title: "Core HTML structure is incomplete",
        explanation: `The source did not clearly contain: ${missingStructuralElements.join(", ")}.`,
        whyItMatters: "A predictable document structure improves compatibility with browsers and crawlers.",
        recommendation: "Validate the source HTML and add the missing structural elements.",
        evidence: { details: missingStructuralElements },
        affectedUrl: page.url,
      }))
    }
    if (page.sizeBytes !== null && page.sizeBytes > 750_000) {
      issues.push(createIssue({
        checkKey: "technical.large_html",
        category: "technical",
        severity: page.sizeBytes > 1_000_000 ? "high" : "medium",
        title: "HTML response is large",
        explanation: `The HTML response is approximately ${Math.round(page.sizeBytes / 1_024)} KB.`,
        whyItMatters: "Large documents take longer to transfer and parse, especially on mobile devices.",
        recommendation: "Remove unused markup and avoid embedding large data payloads in the initial HTML.",
        evidence: { measuredValue: page.sizeBytes, expectedValue: "750000 bytes or less" },
        affectedUrl: page.url,
      }))
    }
    if (page.scriptCount > 20 || page.stylesheetCount > 10) {
      issues.push(createIssue({
        checkKey: "technical.excessive_assets",
        category: "technical",
        severity: "medium",
        title: "Page requests many scripts or stylesheets",
        explanation: `${page.scriptCount} external scripts and ${page.stylesheetCount} stylesheets were detected.`,
        whyItMatters: "A high number of blocking assets can slow rendering and make failures harder to diagnose.",
        recommendation: "Remove unused assets, combine small files where practical and defer non-critical scripts.",
        evidence: { details: [`scripts:${page.scriptCount}`, `stylesheets:${page.stylesheetCount}`] },
        affectedUrl: page.url,
      }))
    }
    if (home && !page.hasFavicon) {
      issues.push(createIssue({
        checkKey: "technical.favicon_missing",
        category: "technical",
        severity: "low",
        title: "Favicon is missing",
        explanation: "No favicon link was detected on the homepage.",
        whyItMatters: "A favicon helps people recognise the site in tabs, bookmarks and some search surfaces.",
        recommendation: "Add a small, accessible favicon in common browser formats.",
        affectedUrl: page.url,
      }))
    }
    if (home && page.structuredDataCount === 0) {
      issues.push(createIssue({
        checkKey: "technical.structured_data_missing",
        category: "technical",
        severity: "low",
        title: "No structured data was detected",
        explanation: "The homepage contains no JSON-LD structured data block.",
        whyItMatters: "Accurate structured data can help search engines understand the organisation and page type.",
        recommendation: "Add only the schema.org markup that accurately describes the organisation and page.",
        affectedUrl: page.url,
      }))
    }
    if (page.invalidJsonLdCount > 0) {
      issues.push(createIssue({
        checkKey: "technical.structured_data_invalid",
        category: "technical",
        severity: "high",
        title: "JSON-LD structured data is invalid",
        explanation: `${page.invalidJsonLdCount} structured data block(s) could not be parsed as JSON.`,
        whyItMatters: "Invalid markup is ignored and can hide intended structured information.",
        recommendation: "Correct the JSON syntax and validate the markup before publishing it again.",
        evidence: { measuredValue: page.invalidJsonLdCount, expectedValue: 0 },
        affectedUrl: page.url,
      }))
    }
    if (!page.htmlLang) {
      issues.push(createIssue({
        checkKey: "technical.language_missing",
        category: "technical",
        severity: "medium",
        title: "Page language is not declared",
        explanation: "The HTML element has no lang attribute.",
        whyItMatters: "Declaring the language helps accessibility tools and search systems interpret the content.",
        recommendation: "Set the html lang attribute to the page's primary language.",
        affectedUrl: page.url,
      }))
    }
    if (new URL(page.url).protocol === "https:" && page.mixedContentUrls.length > 0) {
      issues.push(createIssue({
        checkKey: "technical.mixed_content",
        category: "technical",
        severity: "high",
        title: "Secure page references insecure resources",
        explanation: `${page.mixedContentUrls.length} HTTP resource reference(s) were detected on an HTTPS page.`,
        whyItMatters: "Mixed content can be blocked by browsers and weakens the security of the page.",
        recommendation: "Update every resource URL to HTTPS or host it on the secure site.",
        evidence: { measuredValue: page.mixedContentUrls.length, details: page.mixedContentUrls.slice(0, 10) },
        affectedUrl: page.url,
      }))
    }
  }

  addDuplicateIssues(
    issues,
    successfulPages.map((page) => ({ url: page.url, value: page.title })),
    {
      checkKey: "metadata.title_duplicate",
      category: "metadata",
      severity: "high",
      title: "Title tag is duplicated",
      explanation: "Another crawled page uses the same title.",
      whyItMatters: "Unique titles help people and crawlers distinguish pages.",
      recommendation: "Write a specific title that reflects this page alone.",
    },
  )
  addDuplicateIssues(
    issues,
    successfulPages.map((page) => ({ url: page.url, value: page.metaDescription })),
    {
      checkKey: "metadata.description_duplicate",
      category: "metadata",
      severity: "medium",
      title: "Meta description is duplicated",
      explanation: "Another crawled page uses the same description.",
      whyItMatters: "Page-specific descriptions give searchers a clearer preview of each result.",
      recommendation: "Write a distinct description based on this page's actual content.",
    },
  )
  addDuplicateIssues(
    issues,
    successfulPages.map((page) => ({ url: page.url, value: page.h1[0] || null })),
    {
      checkKey: "content.h1_duplicate",
      category: "content",
      severity: "medium",
      title: "Main heading is duplicated",
      explanation: "Another crawled page uses the same main heading.",
      whyItMatters: "Distinct headings make each page's purpose easier to understand.",
      recommendation: "Rewrite the H1 to describe this page specifically.",
    },
  )

  if (input.performance) addPerformanceIssues(issues, input.performance, crawl.finalUrl)

  const deduplicated = new Map<string, SeoDetectedIssue>()
  for (const issue of issues) deduplicated.set(issue.fingerprint, issue)
  return [...deduplicated.values()].sort((left, right) =>
    severityRank(right.severity) - severityRank(left.severity) ||
    left.category.localeCompare(right.category) ||
    left.checkKey.localeCompare(right.checkKey) ||
    left.affectedUrl.localeCompare(right.affectedUrl),
  )
}

export function issueRecommendations(issues: readonly SeoDetectedIssue[], limit = 3): string[] {
  return uniqueStrings(issues.map((issue) => issue.recommendation), limit)
}
