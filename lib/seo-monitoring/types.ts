export const SEO_AUDIT_VERSION = "1.0" as const

export const SEO_SEVERITIES = ["critical", "high", "medium", "low"] as const
export type SeoSeverity = (typeof SEO_SEVERITIES)[number]

export const SEO_ISSUE_CATEGORIES = [
  "availability",
  "crawlability",
  "metadata",
  "content",
  "technical",
  "performance",
] as const
export type SeoIssueCategory = (typeof SEO_ISSUE_CATEGORIES)[number]

export type SeoAuditType = "initial" | "manual" | "daily" | "weekly"

export interface SeoIssueEvidence {
  measuredValue?: string | number | boolean | null
  expectedValue?: string | number | boolean | null
  details?: string[]
}

export interface SeoDetectedIssue {
  fingerprint: string
  checkKey: string
  category: SeoIssueCategory
  severity: SeoSeverity
  title: string
  explanation: string
  whyItMatters: string
  recommendation: string
  evidence: SeoIssueEvidence
  affectedUrl: string
}

export interface SeoHeadingSnapshot {
  level: number
  text: string
}

export interface SeoPageSnapshot {
  requestedUrl: string
  url: string
  statusCode: number | null
  redirectCount: number
  responseTimeMs: number | null
  sizeBytes: number | null
  contentType: string | null
  title: string | null
  metaDescription: string | null
  canonicalUrls: string[]
  robotsDirectives: string[]
  openGraph: {
    title: boolean
    description: boolean
    image: boolean
  }
  twitterCard: boolean
  h1: string[]
  headings: SeoHeadingSnapshot[]
  meaningfulWordCount: number
  imageCount: number
  imagesMissingAlt: number
  internalLinks: string[]
  externalLinks: string[]
  inboundInternalLinkCount: number
  scriptCount: number
  stylesheetCount: number
  hasViewport: boolean
  hasFavicon: boolean
  htmlLang: string | null
  hasHtmlElement: boolean
  hasHeadElement: boolean
  hasBodyElement: boolean
  structuredDataCount: number
  invalidJsonLdCount: number
  mixedContentUrls: string[]
  fetchedAt: string
  fetchError?: string
}

export interface RobotsSnapshot {
  url: string
  available: boolean
  statusCode: number | null
  rootAllowed: boolean | null
  sitemapUrls: string[]
  contentHash: string | null
  error?: string
}

export interface SitemapSnapshot {
  url: string
  available: boolean
  valid: boolean
  statusCode: number | null
  discoveredUrls: string[]
  childSitemaps: string[]
  contentHash: string | null
  error?: string
}

export interface SeoPerformanceMeasurements {
  score: number
  largestContentfulPaintMs: number | null
  interactionToNextPaintMs: number | null
  cumulativeLayoutShift: number | null
  firstContentfulPaintMs: number | null
  opportunities: string[]
}

export interface SeoPerformanceSnapshot {
  provider: string
  measuredAt: string
  mobile: SeoPerformanceMeasurements | null
  desktop: SeoPerformanceMeasurements | null
}

export interface SeoAuditScores {
  overall: number
  technical: number
  metadata: number
  discoverability: number
  performance: number | null
}

export interface SeoSeverityCounts {
  critical: number
  high: number
  medium: number
  low: number
}

export interface SeoAuditSummary {
  text: string
  topActions: string[]
  severityCounts: SeoSeverityCounts
  pagesChecked: number
}

export interface SeoPartialFailure {
  stage: "homepage" | "http_probe" | "robots" | "sitemap" | "crawl" | "performance"
  code: string
  message: string
  url?: string
}

export interface SeoAuditResult {
  version: typeof SEO_AUDIT_VERSION
  auditType: SeoAuditType
  requestedUrl: string
  normalizedUrl: string
  finalUrl: string
  startedAt: string
  completedAt: string
  scores: SeoAuditScores
  issues: SeoDetectedIssue[]
  pages: SeoPageSnapshot[]
  summary: SeoAuditSummary
  robots: RobotsSnapshot | null
  sitemap: SitemapSnapshot | null
  performance: SeoPerformanceSnapshot | null
  partialFailures: SeoPartialFailure[]
  httpRedirectsToHttps: boolean | null
}

export interface SeoIssueDiff {
  newIssues: SeoDetectedIssue[]
  activeIssues: SeoDetectedIssue[]
  resolvedIssues: SeoDetectedIssue[]
  severityIncreased: Array<{ previous: SeoDetectedIssue; current: SeoDetectedIssue }>
  improvingIssues: Array<{ previous: SeoDetectedIssue; current: SeoDetectedIssue }>
}

export interface SeoReportSection {
  heading: string
  items: string[]
}

export interface SeoContentOpportunity {
  title: string
  rationale: string
  recommendation: string
  basis: "strategic_recommendation"
}

export interface SeoGeneratedReport {
  reportType: "daily" | "weekly"
  title: string
  summary: string
  currentScore: number
  scoreChange: number | null
  scores: SeoAuditScores
  newIssueCount: number
  resolvedIssueCount: number
  recommendedActions: string[]
  sections: SeoReportSection[]
  contentOpportunities: SeoContentOpportunity[]
  focusNextWeek: string | null
  generatedAt: string
}

export interface DnsAddress {
  address: string
  family: 4 | 6
}

export type DnsResolver = (hostname: string) => Promise<DnsAddress[]>

export interface HttpRequestInput {
  url: URL
  resolvedAddress: DnsAddress
  headers: Readonly<Record<string, string>>
  signal: AbortSignal
  maxBytes: number
}

export interface HttpResponseData {
  statusCode: number
  headers: Readonly<Record<string, string>>
  body: Uint8Array
  durationMs: number
}

export type HttpRequester = (input: HttpRequestInput) => Promise<HttpResponseData>

export interface SafeNetworkAdapters {
  resolver?: DnsResolver
  requester?: HttpRequester
  now?: () => number
}

export interface ResolvedPublicUrl {
  url: URL
  addresses: DnsAddress[]
}

export interface SafeFetchRedirect {
  from: string
  to: string
  statusCode: number
}

export interface SafeFetchResult {
  requestedUrl: string
  finalUrl: string
  statusCode: number
  headers: Readonly<Record<string, string>>
  body: Uint8Array
  text: string
  durationMs: number
  redirectChain: SafeFetchRedirect[]
}

export interface PageSpeedProvider {
  readonly name: string
  measure(url: string): Promise<SeoPerformanceSnapshot>
}

export interface CrawlResult {
  requestedUrl: string
  normalizedUrl: string
  finalUrl: string
  pages: SeoPageSnapshot[]
  robots: RobotsSnapshot | null
  sitemap: SitemapSnapshot | null
  blockedUrls: string[]
  partialFailures: SeoPartialFailure[]
  documents: ReadonlyArray<{ snapshot: SeoPageSnapshot; html: string }>
}

export interface SeoBusinessContext {
  businessDescription?: string
  category?: string
}
