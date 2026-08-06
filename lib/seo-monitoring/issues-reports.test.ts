import { describe, expect, it } from "vitest"
import { createIssueFingerprint, diffSeoIssues, withIssueFingerprint } from "./issues"
import { generateDailySeoReport, generateWeeklySeoReport } from "./reports"
import type { SeoAuditResult, SeoDetectedIssue, SeoPageSnapshot } from "./types"

function issue(checkKey: string, affectedUrl: string, severity: SeoDetectedIssue["severity"]): SeoDetectedIssue {
  return withIssueFingerprint({
    checkKey,
    affectedUrl,
    severity,
    category: checkKey.startsWith("availability") ? "availability" : "metadata",
    title: checkKey,
    explanation: `Measured explanation for ${checkKey}`,
    whyItMatters: "This is based on a measured website condition.",
    recommendation: `Fix ${checkKey}.`,
    evidence: { measuredValue: true },
  })
}

function page(url: string, words = 300): SeoPageSnapshot {
  return {
    requestedUrl: url,
    url,
    statusCode: 200,
    redirectCount: 0,
    responseTimeMs: 100,
    sizeBytes: 10_000,
    contentType: "text/html",
    title: "Useful page title for a growing company",
    metaDescription: "A specific description that gives a prospective visitor useful context before opening this page and deciding what to do next.",
    canonicalUrls: [url],
    robotsDirectives: [],
    openGraph: { title: true, description: true, image: true },
    twitterCard: true,
    h1: ["A specific main heading"],
    headings: [{ level: 1, text: "A specific main heading" }],
    meaningfulWordCount: words,
    imageCount: 0,
    imagesMissingAlt: 0,
    internalLinks: [],
    externalLinks: [],
    inboundInternalLinkCount: 0,
    scriptCount: 1,
    stylesheetCount: 1,
    hasViewport: true,
    hasFavicon: true,
    htmlLang: "en",
    hasHtmlElement: true,
    hasHeadElement: true,
    hasBodyElement: true,
    structuredDataCount: 1,
    invalidJsonLdCount: 0,
    mixedContentUrls: [],
    fetchedAt: "2026-07-17T12:00:00.000Z",
  }
}

function audit(input: {
  completedAt: string
  score: number
  issues: SeoDetectedIssue[]
  pages?: SeoPageSnapshot[]
}): SeoAuditResult {
  return {
    version: "1.0",
    auditType: "daily",
    requestedUrl: "https://report-site.com",
    normalizedUrl: "https://report-site.com/",
    finalUrl: "https://report-site.com/",
    startedAt: input.completedAt,
    completedAt: input.completedAt,
    scores: {
      overall: input.score,
      technical: input.score,
      metadata: input.score,
      discoverability: input.score,
      performance: null,
    },
    issues: input.issues,
    pages: input.pages || [page("https://report-site.com/")],
    summary: {
      text: "Measured audit summary.",
      topActions: input.issues.slice(0, 3).map((value) => value.recommendation),
      severityCounts: {
        critical: input.issues.filter((value) => value.severity === "critical").length,
        high: input.issues.filter((value) => value.severity === "high").length,
        medium: input.issues.filter((value) => value.severity === "medium").length,
        low: input.issues.filter((value) => value.severity === "low").length,
      },
      pagesChecked: input.pages?.length || 1,
    },
    robots: null,
    sitemap: null,
    performance: null,
    partialFailures: [],
    httpRedirectsToHttps: true,
  }
}

describe("SEO issue identity and change detection", () => {
  it("keeps fingerprints stable when severity or explanatory copy changes", () => {
    const identity = { checkKey: "metadata.title_missing", affectedUrl: "https://EXAMPLE.com/page?source=x#part" }
    expect(createIssueFingerprint(identity)).toBe(createIssueFingerprint({
      checkKey: "metadata.title_missing",
      affectedUrl: "https://example.com/page",
    }))
    expect(issue("metadata.title_missing", "https://example.com/page", "high").fingerprint)
      .toBe(issue("metadata.title_missing", "https://example.com/page", "low").fingerprint)
  })

  it("detects new, resolved, worsening and improving issues", () => {
    const resolved = issue("metadata.description_missing", "https://report-site.com/old", "medium")
    const worseningBefore = issue("metadata.title_short", "https://report-site.com/", "low")
    const worseningAfter = issue("metadata.title_short", "https://report-site.com/", "high")
    const improvingBefore = issue("availability.http_error", "https://report-site.com/pricing", "critical")
    const improvingAfter = issue("availability.http_error", "https://report-site.com/pricing", "high")
    const added = issue("metadata.title_missing", "https://report-site.com/new", "high")
    const diff = diffSeoIssues(
      [resolved, worseningBefore, improvingBefore],
      [worseningAfter, improvingAfter, added],
    )
    expect(diff.newIssues).toEqual([added])
    expect(diff.resolvedIssues).toEqual([resolved])
    expect(diff.severityIncreased).toHaveLength(1)
    expect(diff.improvingIssues).toHaveLength(1)
  })
})

describe("founder-friendly SEO reports", () => {
  it("generates a daily change report without claiming traffic changed", () => {
    const fixed = issue("metadata.description_missing", "https://report-site.com/", "medium")
    const broken = issue("availability.http_error", "https://report-site.com/pricing", "high")
    const previous = audit({ completedAt: "2026-07-16T08:00:00.000Z", score: 72, issues: [fixed] })
    const current = audit({ completedAt: "2026-07-17T08:00:00.000Z", score: 76, issues: [broken] })
    const report = generateDailySeoReport({
      siteUrl: "https://report-site.com",
      previous,
      current,
      generatedAt: new Date("2026-07-17T09:00:00.000Z"),
    })
    expect(report.scoreChange).toBe(4)
    expect(report.newIssueCount).toBe(1)
    expect(report.resolvedIssueCount).toBe(1)
    expect(report.summary).toContain("increased from 72 to 76")
    expect(report.summary).toContain("highest priority")
    expect(report.summary.toLowerCase()).not.toMatch(/traffic (increased|grew|rose)/)
  })

  it("generates a weekly executive briefing and labels strategic content opportunities", () => {
    const baseline = audit({
      completedAt: "2026-07-10T08:00:00.000Z",
      score: 61,
      issues: [issue("metadata.description_missing", "https://report-site.com/", "medium")],
    })
    const current = audit({
      completedAt: "2026-07-17T08:00:00.000Z",
      score: 70,
      issues: [],
      pages: [page("https://report-site.com/", 80)],
    })
    const report = generateWeeklySeoReport({
      siteUrl: "https://report-site.com",
      audits: [current, baseline],
      businessContext: { category: "project management", businessDescription: "A SaaS tool for small teams" },
      generatedAt: new Date("2026-07-17T09:00:00.000Z"),
    })
    expect(report.scoreChange).toBe(9)
    expect(report.resolvedIssueCount).toBe(1)
    expect(report.focusNextWeek).toBeTruthy()
    expect(report.sections.map((section) => section.heading)).toContain("Seven-day trend")
    expect(report.contentOpportunities.length).toBeGreaterThan(0)
    expect(report.contentOpportunities.every((opportunity) => opportunity.basis === "strategic_recommendation")).toBe(true)
    expect(JSON.stringify(report).toLowerCase()).not.toContain("search volume")
  })
})
