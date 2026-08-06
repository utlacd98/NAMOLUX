import { detectSeoIssues } from "./checks"
import { crawlWebsite, type SeoCrawlLimits } from "./crawler"
import { normalizePublicWebsiteUrl, SafeFetchError, safeFetchUrl } from "./network"
import { createGooglePageSpeedProvider } from "./performance"
import { calculateSeoScores, createAuditSummary } from "./scoring"
import type {
  PageSpeedProvider,
  SafeNetworkAdapters,
  SeoAuditResult,
  SeoAuditType,
  SeoPartialFailure,
  SeoPerformanceSnapshot,
} from "./types"
import { SEO_AUDIT_VERSION } from "./types"

export interface RunSeoAuditInput {
  url: string
  auditType?: SeoAuditType
  network?: SafeNetworkAdapters
  performanceProvider?: PageSpeedProvider | null
  pageSpeedApiKey?: string
  fetchImpl?: typeof fetch
  limits?: Partial<SeoCrawlLimits>
  clock?: () => Date
}

async function probeHttpRedirect(
  finalUrl: string,
  network: SafeNetworkAdapters,
  limits: Partial<SeoCrawlLimits> | undefined,
): Promise<{ value: boolean | null; failure?: SeoPartialFailure }> {
  const final = new URL(finalUrl)
  if (final.protocol !== "https:") return { value: false }
  const httpUrl = new URL(final)
  httpUrl.protocol = "http:"
  httpUrl.port = ""

  try {
    const response = await safeFetchUrl(httpUrl, network, {
      maxBytes: Math.min(limits?.maxAuxiliaryBytes || 65_536, 65_536),
      requestTimeoutMs: limits?.requestTimeoutMs,
      totalTimeoutMs: limits?.totalRequestTimeoutMs,
      maxRedirects: limits?.maxRedirects,
    })
    return { value: new URL(response.finalUrl).protocol === "https:" && response.redirectChain.length > 0 }
  } catch (error) {
    const code = error instanceof SafeFetchError ? error.code : "http_probe_failed"
    return {
      value: null,
      failure: {
        stage: "http_probe",
        code,
        message: "The HTTP-to-HTTPS redirect could not be verified.",
        url: httpUrl.toString(),
      },
    }
  }
}

function selectPerformanceProvider(input: RunSeoAuditInput): PageSpeedProvider | null {
  if (input.performanceProvider !== undefined) return input.performanceProvider
  const key = input.pageSpeedApiKey?.trim()
  return key ? createGooglePageSpeedProvider(key, input.fetchImpl) : null
}

export async function runSeoAudit(input: RunSeoAuditInput): Promise<SeoAuditResult> {
  const clock = input.clock || (() => new Date())
  const startedAt = clock().toISOString()
  const normalized = normalizePublicWebsiteUrl(input.url)
  const crawl = await crawlWebsite({
    url: normalized.toString(),
    network: input.network,
    limits: input.limits,
    clock,
  })
  const partialFailures = [...crawl.partialFailures]
  const httpProbe = await probeHttpRedirect(crawl.finalUrl, input.network || {}, input.limits)
  if (httpProbe.failure) partialFailures.push(httpProbe.failure)

  let performance: SeoPerformanceSnapshot | null = null
  const provider = selectPerformanceProvider(input)
  const homepageUsable = !crawl.pages[0]?.fetchError && (crawl.pages[0]?.statusCode || 0) >= 200 && (crawl.pages[0]?.statusCode || 0) < 300
  if (provider && homepageUsable) {
    try {
      performance = await provider.measure(crawl.finalUrl)
    } catch {
      partialFailures.push({
        stage: "performance",
        code: "performance_provider_unavailable",
        message: "Real performance measurements were temporarily unavailable and were not estimated.",
        url: crawl.finalUrl,
      })
    }
  }

  const issues = detectSeoIssues({
    crawl,
    httpRedirectsToHttps: httpProbe.value,
    performance,
  })
  const scores = calculateSeoScores({ issues, pages: crawl.pages, performance })
  const summary = createAuditSummary(scores, issues, crawl.pages)

  return {
    version: SEO_AUDIT_VERSION,
    auditType: input.auditType || "manual",
    requestedUrl: input.url,
    normalizedUrl: normalized.toString(),
    finalUrl: crawl.finalUrl,
    startedAt,
    completedAt: clock().toISOString(),
    scores,
    issues,
    pages: crawl.pages,
    summary,
    robots: crawl.robots,
    sitemap: crawl.sitemap,
    performance,
    partialFailures,
    httpRedirectsToHttps: httpProbe.value,
  }
}
