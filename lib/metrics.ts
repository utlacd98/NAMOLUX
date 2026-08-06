import { createServiceClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"

export type MetricAction =
  | "name_generation"
  | "bulk_check"
  | "seo_audit"
  | "affiliate_click"
  | "page_view"
  | "blog_view"
  | "generate_started"
  | "quick_generate"
  | "quick_generate_started"
  | "quick_generate_results"
  | "results_seen"
  | "upgrade_offer_seen"
  | "upgrade_clicked"
  | "checkout_started"
  | "checkout_success"
  | "rate_limit_seen"
  | "partner_cta_seen"
  | "shortlist_created"
  | "launch_kit_started"
  | "domain_register_clicked"
  | "brand_export_clicked"
  | "engaged_10s"
  | "engaged_30s"
  | "scroll_50"
  | "scroll_90"
  | "content_cta_seen"
  | "content_cta_clicked"
  | "brief_submitted"
  | "pricing_viewed"
  | "checkout_intent"
  | "decision_action"
  | "names_visible"
  | "save"
  | "dislike"
  | "more_like_this"
  | "advanced_started"
  | "founder_signal_clicked"
  | "founder_signal_scored"
  | "batch_scored"
  | "decision_saved"
  | "decision_report_created"
  | "report_share_created"
  | "score_sort_used"
  | "pricing_clicked"

const METADATA_STRING_LIMITS = {
  source: 64,
  contentSlug: 160,
  topic: 120,
  ctaId: 120,
  device: 16,
  experiment: 120,
  decisionAction: 24,
  mode: 32,
  style: 32,
  creativity: 16,
  provider: 20,
  model: 80,
  fallbackReason: 96,
  contract: 48,
} as const

const METADATA_NUMERIC_LIMITS = {
  resultCount: { min: 0, max: 100, precision: 0 },
  modelCandidateCount: { min: 0, max: 100, precision: 0 },
  modelGroundedCandidateCount: { min: 0, max: 100, precision: 0 },
  fallbackCandidateCount: { min: 0, max: 100, precision: 0 },
  fallbackGroundedCandidateCount: { min: 0, max: 100, precision: 0 },
  groundedCandidateCount: { min: 0, max: 100, precision: 0 },
  exploratoryCandidateCount: { min: 0, max: 100, precision: 0 },
  fallbackRatio: { min: 0, max: 1, precision: 4 },
  providerAttemptCount: { min: 0, max: 10, precision: 0 },
  timeToNamesMs: { min: 0, max: 120_000, precision: 0 },
  inputTokens: { min: 0, max: 100_000, precision: 0 },
  outputTokens: { min: 0, max: 100_000, precision: 0 },
} as const

const DEVICES = new Set(["desktop", "mobile", "tablet"])
const DECISIONS = new Set(["shortlist", "compare", "register", "pricing", "brand_kit"])

/** Keep analytics metadata deliberately narrow: no briefs, names, domains, emails or payment IDs. */
export function sanitizeMetricMetadata(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined

  const input = value as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const [key, limit] of Object.entries(METADATA_STRING_LIMITS)) {
    const candidate = input[key]
    if (typeof candidate !== "string") continue
    const trimmed = candidate.trim().slice(0, limit)
    if (!trimmed) continue
    if (key === "device" && !DEVICES.has(trimmed)) continue
    if (key === "decisionAction" && !DECISIONS.has(trimmed)) continue
    if (!["topic"].includes(key) && !/^[a-zA-Z0-9_./:-]+$/.test(trimmed)) continue
    result[key] = trimmed
  }
  for (const [key, bounds] of Object.entries(METADATA_NUMERIC_LIMITS)) {
    const candidate = input[key]
    if (typeof candidate !== "number" || !Number.isFinite(candidate)) continue
    if (candidate < bounds.min || candidate > bounds.max) continue
    result[key] = String(Number(candidate.toFixed(bounds.precision)))
  }
  return Object.keys(result).length > 0 ? result : undefined
}

export function sanitizeAnalyticsPath(value: unknown, maxLength = 512): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined
  try {
    const url = new URL(value, "https://www.namolux.com")
    return url.pathname.slice(0, maxLength)
  } catch {
    return undefined
  }
}

export function sanitizeAnalyticsReferrer(value: unknown, maxLength = 2_048): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`
    const url = new URL(normalized)
    return `${url.hostname}${url.pathname}`.slice(0, maxLength)
  } catch {
    return undefined
  }
}

interface TrackMetricParams {
  action: MetricAction
  metadata?: Record<string, unknown>
  userAgent?: string
  country?: string
  sessionId?: string
  device?: string
  referrer?: string
  route?: string
}

export interface MetricEvent {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  userAgent: string | null
  country: string | null
  sessionId: string | null
  device: string | null
  referrer: string | null
  route: string | null
  createdAt: Date
}

export interface DecisionWorkspaceMetrics {
  bulkChecks: number
  completedBulkChecks: number
  partialBulkChecks: number
  failedBulkChecks: number
  candidatesSubmitted: number
  domainResults: number
  availableDomains: number
  takenDomains: number
  verificationRequired: number
  providerChecks: number
  cachedChecks: number
  providerFailures: number
  founderSignalRuns: number
  savedDecisions: number
  savedCandidates: number
  scoredCandidatesSaved: number
  winnersChosen: number
  decisionReports: number
  reportShares: number
  daily: Array<{
    date: string
    bulkChecks: number
    domainResults: number
    availableDomains: number
    savedDecisions: number
    decisionReports: number
  }>
}

const MAX_ANALYTICS_ROWS = 50_000
const PAGE_SIZE = 1_000

function getStartDate(days: number): Date {
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 365)
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - safeDays + 1)
}

function asMetadata(value: Json | null): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function toMetricEvent(row: {
  id: string
  action: string
  metadata: Json | null
  user_agent: string | null
  country: string | null
  session_id: string | null
  device: string | null
  referrer: string | null
  route: string | null
  created_at: string
}): MetricEvent {
  return {
    id: row.id,
    action: row.action,
    metadata: asMetadata(row.metadata),
    userAgent: row.user_agent,
    country: row.country,
    sessionId: row.session_id,
    device: row.device,
    referrer: row.referrer,
    route: row.route,
    createdAt: new Date(row.created_at),
  }
}

async function fetchMetricRows(start: Date, end?: Date): Promise<MetricEvent[]> {
  const service = createServiceClient()
  const events: MetricEvent[] = []

  for (let offset = 0; offset < MAX_ANALYTICS_ROWS; offset += PAGE_SIZE) {
    let query = service
      .from("metric_events")
      .select("*")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (end) query = query.lt("created_at", end.toISOString())

    const { data, error } = await query
    if (error) throw error
    events.push(...(data || []).map(toMetricEvent))
    if (!data || data.length < PAGE_SIZE) break
  }

  return events
}

export async function trackMetric(params: TrackMetricParams) {
  try {
    const service = createServiceClient()
    const { error } = await service.from("metric_events").insert({
      action: params.action,
      metadata: (sanitizeMetricMetadata(params.metadata) || null) as Json | null,
      user_agent: params.userAgent?.slice(0, 1_000) || null,
      country: params.country?.slice(0, 8) || null,
      session_id: params.sessionId?.slice(0, 128) || null,
      device: params.device?.slice(0, 32) || null,
      referrer: sanitizeAnalyticsReferrer(params.referrer) || null,
      route: sanitizeAnalyticsPath(params.route) || null,
    })
    if (error) throw error
  } catch (error) {
    // Analytics must never break a customer request.
    console.error("Failed to track metric:", error)
  }
}

function emptyDaily(days: number) {
  const startDate = getStartDate(days)
  return Array.from({ length: days }, (_, index) => ({
    date: new Date(startDate.getTime() + index * 86_400_000).toISOString().split("T")[0],
    nameGeneration: 0,
    bulkCheck: 0,
    seoAudit: 0,
  }))
}

export async function getDailyTrends(days = 7) {
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 365)
  const result = emptyDaily(safeDays)
  const byDate = new Map(result.map((row) => [row.date, row]))
  const metrics = await fetchMetricRows(getStartDate(safeDays))

  for (const metric of metrics) {
    const row = byDate.get(metric.createdAt.toISOString().split("T")[0])
    if (!row) continue
    if (metric.action === "name_generation") row.nameGeneration += 1
    if (metric.action === "bulk_check") row.bulkCheck += 1
    if (metric.action === "seo_audit") row.seoAudit += 1
  }
  return result
}

function countCore(metrics: MetricEvent[], after?: Date) {
  const selected = after ? metrics.filter((metric) => metric.createdAt >= after) : metrics
  const nameGeneration = selected.filter((metric) => metric.action === "name_generation").length
  const bulkCheck = selected.filter((metric) => metric.action === "bulk_check").length
  const seoAudit = selected.filter((metric) => metric.action === "seo_audit").length
  return { nameGeneration, bulkCheck, seoAudit, total: nameGeneration + bulkCheck + seoAudit }
}

export async function getMetricsSummary() {
  const epoch = new Date(0)
  const metrics = await fetchMetricRows(epoch)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisWeek = new Date(today.getTime() - 7 * 86_400_000)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    allTime: countCore(metrics),
    today: countCore(metrics, today),
    thisWeek: countCore(metrics, thisWeek),
    thisMonth: countCore(metrics, thisMonth),
    recentActivity: [...metrics].reverse().slice(0, 20),
  }
}

export async function getDashboardMetrics(days = 7) {
  const startDate = getStartDate(days)
  const span = Date.now() - startDate.getTime()
  const previousStart = new Date(startDate.getTime() - span)
  const [metrics, previousMetrics] = await Promise.all([
    fetchMetricRows(startDate),
    fetchMetricRows(previousStart, startDate),
  ])

  const uniqueSessions = new Set(metrics.flatMap((metric) => metric.sessionId ? [metric.sessionId] : [])).size
  const previousUniqueSessions = new Set(previousMetrics.flatMap((metric) => metric.sessionId ? [metric.sessionId] : [])).size
  const sessionDays = new Map<string, Set<string>>()
  const sessionActions = new Map<string, number>()
  for (const metric of metrics) {
    if (!metric.sessionId) continue
    const daysSeen = sessionDays.get(metric.sessionId) || new Set<string>()
    daysSeen.add(metric.createdAt.toISOString().split("T")[0])
    sessionDays.set(metric.sessionId, daysSeen)
    sessionActions.set(metric.sessionId, (sessionActions.get(metric.sessionId) || 0) + 1)
  }

  const count = (action: string) => metrics.filter((metric) => metric.action === action).length
  const eventCounts = {
    nameGeneration: count("name_generation"),
    bulkCheck: count("bulk_check"),
    seoAudit: count("seo_audit"),
    affiliateClick: count("affiliate_click"),
    partnerCtaSeen: count("partner_cta_seen"),
    shortlistCreated: count("shortlist_created"),
    launchKitStarted: count("launch_kit_started"),
    domainRegisterClicked: count("domain_register_clicked"),
    brandExportClicked: count("brand_export_clicked"),
    pageView: count("page_view"),
  }
  const registerClicks = metrics.filter((metric) => ["domain_register_clicked", "affiliate_click"].includes(metric.action))
  const domainCounts = new Map<string, number>()
  let resultCardClicks = 0
  let shortlistRegisterClicks = 0
  for (const metric of registerClicks) {
    const metadata = metric.metadata || {}
    const domain = [metadata.domain, metadata.fullDomain, metadata.content]
      .find((value) => typeof value === "string" && value.includes("."))
    if (typeof domain === "string") domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
    const source = typeof metadata.source === "string" ? metadata.source : ""
    if (source.includes("result") || source.includes("top_pick")) resultCardClicks += 1
    if (source.includes("shortlist")) shortlistRegisterClicks += 1
  }
  const percent = (part: number, total: number) => total > 0 ? Math.round((part / total) * 1_000) / 10 : 0
  const resultsSeen = count("results_seen")
  const affiliateSessions = new Set(metrics.flatMap((metric) =>
    metric.action === "affiliate_click" && metric.sessionId ? [metric.sessionId] : []
  )).size
  const countries = new Map<string, number>()
  for (const metric of metrics) countries.set(metric.country || "Unknown", (countries.get(metric.country || "Unknown") || 0) + 1)

  return {
    totalEvents: metrics.length,
    uniqueSessions,
    returningSessions: [...sessionDays.values()].filter((value) => value.size > 1).length,
    affiliateClickRate: percent(affiliateSessions, uniqueSessions),
    avgActionsPerSession: uniqueSessions > 0
      ? Math.round(([...sessionActions.values()].reduce((sum, value) => sum + value, 0) / uniqueSessions) * 10) / 10
      : 0,
    eventCounts,
    partnerMetrics: {
      outboundCtr: percent(registerClicks.length, eventCounts.partnerCtaSeen),
      resultCardCtr: percent(resultCardClicks, eventCounts.partnerCtaSeen),
      shortlistCtr: percent(shortlistRegisterClicks, eventCounts.shortlistCreated),
      launchKitConversion: percent(eventCounts.launchKitStarted, resultsSeen),
      topClickedDomains: [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([domain, clicks]) => ({ domain, clicks })),
    },
    deviceCounts: {
      desktop: metrics.filter((metric) => metric.device === "desktop").length,
      mobile: metrics.filter((metric) => metric.device === "mobile").length,
      tablet: metrics.filter((metric) => metric.device === "tablet").length,
      unknown: metrics.filter((metric) => !metric.device).length,
    },
    topCountries: [...countries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([country, countValue]) => ({ country, count: countValue })),
    eventGrowth: percent(metrics.length - previousMetrics.length, previousMetrics.length),
    sessionGrowth: percent(uniqueSessions - previousUniqueSessions, previousUniqueSessions),
  }
}

/**
 * Product metrics for the live NamoLux decision workspace. These values come
 * from durable workspace records rather than legacy generator analytics, so a
 * completed check or saved report is counted even when client analytics is
 * blocked.
 */
export async function getDecisionWorkspaceMetrics(days = 7): Promise<DecisionWorkspaceMetrics> {
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 365)
  const start = getStartDate(safeDays)
  const service = createServiceClient()
  const [jobsResult, resultsResult, shortlistsResult, entriesResult, reportsResult, sharesResult, signalResult] = await Promise.all([
    service.from("bulk_check_jobs")
      .select("id,status,names,provider_checks,cached_checks,provider_failures,created_at")
      .gte("created_at", start.toISOString())
      .limit(MAX_ANALYTICS_ROWS),
    service.from("bulk_check_job_results")
      .select("status,created_at")
      .gte("created_at", start.toISOString())
      .limit(MAX_ANALYTICS_ROWS),
    service.from("naming_shortlists")
      .select("created_at")
      .gte("created_at", start.toISOString())
      .limit(MAX_ANALYTICS_ROWS),
    service.from("naming_shortlist_entries")
      .select("is_winner,founder_signal_snapshot,created_at")
      .gte("created_at", start.toISOString())
      .limit(MAX_ANALYTICS_ROWS),
    service.from("naming_decision_reports")
      .select("created_at")
      .gte("created_at", start.toISOString())
      .limit(MAX_ANALYTICS_ROWS),
    service.from("naming_report_share_tokens")
      .select("created_at")
      .gte("created_at", start.toISOString())
      .limit(MAX_ANALYTICS_ROWS),
    service.from("metric_events")
      .select("action")
      .eq("action", "founder_signal_scored")
      .gte("created_at", start.toISOString())
      .limit(MAX_ANALYTICS_ROWS),
  ])

  for (const result of [jobsResult, resultsResult, shortlistsResult, entriesResult, reportsResult, sharesResult, signalResult]) {
    if (result.error) throw result.error
  }

  const daily = Array.from({ length: safeDays }, (_, index) => ({
    date: new Date(start.getTime() + index * 86_400_000).toISOString().split("T")[0],
    bulkChecks: 0,
    domainResults: 0,
    availableDomains: 0,
    savedDecisions: 0,
    decisionReports: 0,
  }))
  const dailyByDate = new Map(daily.map((row) => [row.date, row]))
  const byDate = (createdAt: string) => dailyByDate.get(new Date(createdAt).toISOString().split("T")[0])

  const jobs = jobsResult.data || []
  const results = resultsResult.data || []
  const shortlists = shortlistsResult.data || []
  const entries = entriesResult.data || []
  const reports = reportsResult.data || []
  const shares = sharesResult.data || []

  let candidatesSubmitted = 0
  let providerChecks = 0
  let cachedChecks = 0
  let providerFailures = 0
  for (const job of jobs) {
    const nameCount = Array.isArray(job.names) ? job.names.length : 0
    candidatesSubmitted += nameCount
    providerChecks += job.provider_checks || 0
    cachedChecks += job.cached_checks || 0
    providerFailures += job.provider_failures || 0
    const row = byDate(job.created_at)
    if (row) row.bulkChecks += 1
  }

  let availableDomains = 0
  let takenDomains = 0
  let verificationRequired = 0
  for (const result of results) {
    if (result.status === "available") availableDomains += 1
    if (result.status === "taken") takenDomains += 1
    if (result.status === "needs_verification") verificationRequired += 1
    const row = byDate(result.created_at)
    if (row) {
      row.domainResults += 1
      if (result.status === "available") row.availableDomains += 1
    }
  }

  for (const shortlist of shortlists) {
    const row = byDate(shortlist.created_at)
    if (row) row.savedDecisions += 1
  }
  for (const report of reports) {
    const row = byDate(report.created_at)
    if (row) row.decisionReports += 1
  }

  return {
    bulkChecks: jobs.length,
    completedBulkChecks: jobs.filter((job) => job.status === "completed").length,
    partialBulkChecks: jobs.filter((job) => job.status === "partial").length,
    failedBulkChecks: jobs.filter((job) => job.status === "failed").length,
    candidatesSubmitted,
    domainResults: results.length,
    availableDomains,
    takenDomains,
    verificationRequired,
    providerChecks,
    cachedChecks,
    providerFailures,
    founderSignalRuns: (signalResult.data || []).length,
    savedDecisions: shortlists.length,
    savedCandidates: entries.length,
    scoredCandidatesSaved: entries.filter((entry) => entry.founder_signal_snapshot !== null).length,
    winnersChosen: entries.filter((entry) => entry.is_winner).length,
    decisionReports: reports.length,
    reportShares: shares.length,
    daily,
  }
}

export async function getFunnelData(days = 7) {
  const metrics = await fetchMetricRows(getStartDate(days))
  type SessionJourney = {
    actions: Set<string>
    device: string
    source: string
    topic: string
    entryRoute: string
    referrer: string
  }
  const sessions = new Map<string, SessionJourney>()
  for (const metric of metrics) {
    if (!metric.sessionId) continue
    const existing = sessions.get(metric.sessionId)
    const metadata = metric.metadata || {}
    const journey = existing || {
      actions: new Set<string>(),
      device: metric.device || "unknown",
      source: typeof metadata.source === "string" ? metadata.source : "unknown",
      topic: typeof metadata.topic === "string" ? metadata.topic : "unknown",
      entryRoute: metric.route || "unknown",
      referrer: metric.referrer || "direct",
    }
    journey.actions.add(metric.action)
    if (journey.source === "unknown" && typeof metadata.source === "string") journey.source = metadata.source
    if (journey.topic === "unknown" && typeof metadata.topic === "string") journey.topic = metadata.topic
    sessions.set(metric.sessionId, journey)
  }

  const hasAction = (journey: SessionJourney, actions: string[]) => actions.some((action) => journey.actions.has(action))
  const stageActions = {
    engaged: ["engaged_10s", "engaged_30s", "scroll_50", "scroll_90"],
    generated: ["bulk_check"],
    results: ["founder_signal_scored"],
    decision: ["decision_saved", "decision_report_created", "report_share_created"],
    paidIntent: ["pricing_viewed", "pricing_clicked", "upgrade_clicked", "checkout_intent"],
    checkout: ["checkout_started", "checkout_success"],
  }
  const journeys = [...sessions.values()]
  const sessionCount = (actions: string[]) => journeys.filter((journey) => hasAction(journey, actions)).length
  const landing = journeys.length
  const engaged = sessionCount(stageActions.engaged)
  const generated = sessionCount(stageActions.generated)
  const resultsSeen = sessionCount(stageActions.results)
  const decision = sessionCount(stageActions.decision)
  const paidIntent = sessionCount(stageActions.paidIntent)
  const checkout = sessionCount(stageActions.checkout)
  const rate = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0
  const drop = (from: number, to: number) => from > 0 ? Math.max(0, Math.round(((from - to) / from) * 100)) : 0

  const segment = (dimension: "device" | "source" | "topic" | "entryRoute" | "referrer") => {
    const grouped = new Map<string, SessionJourney[]>()
    for (const journey of journeys) {
      const value = journey[dimension]
      grouped.set(value, [...(grouped.get(value) || []), journey])
    }
    return [...grouped.entries()]
      .map(([value, rows]) => ({
        dimension,
        value,
        sessions: rows.length,
        engaged: rows.filter((row) => hasAction(row, stageActions.engaged)).length,
        generated: rows.filter((row) => hasAction(row, stageActions.generated)).length,
        results: rows.filter((row) => hasAction(row, stageActions.results)).length,
        decision: rows.filter((row) => hasAction(row, stageActions.decision)).length,
        paidIntent: rows.filter((row) => hasAction(row, stageActions.paidIntent)).length,
        checkout: rows.filter((row) => hasAction(row, stageActions.checkout)).length,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 12)
  }

  return {
    funnel: [
      { step: "Landing / Content", count: landing, rate: landing > 0 ? 100 : 0 },
      { step: "Engaged", count: engaged, rate: rate(engaged, landing) },
      { step: "Bulk Check started", count: generated, rate: rate(generated, landing) },
      { step: "Founder Signal run", count: resultsSeen, rate: rate(resultsSeen, landing) },
      { step: "Decision saved or shared", count: decision, rate: rate(decision, landing) },
      { step: "Paid Intent", count: paidIntent, rate: rate(paidIntent, landing) },
      { step: "Checkout", count: checkout, rate: rate(checkout, landing) },
    ],
    dropOffs: {
      landingToEngaged: drop(landing, engaged),
      engagedToGenerate: drop(engaged, generated),
      generateToResults: drop(generated, resultsSeen),
      resultsToDecision: drop(resultsSeen, decision),
      decisionToPaidIntent: drop(decision, paidIntent),
      paidIntentToCheckout: drop(paidIntent, checkout),
    },
    segments: {
      device: segment("device"),
      source: segment("source"),
      topic: segment("topic"),
      entryRoute: segment("entryRoute"),
      referrer: segment("referrer"),
    },
  }
}

export async function getEnhancedTrends(days = 7) {
  const safeDays = Math.min(Math.max(Math.floor(days), 1), 365)
  const start = getStartDate(safeDays)
  const rows = Array.from({ length: safeDays }, (_, index) => ({
    date: new Date(start.getTime() + index * 86_400_000).toISOString().split("T")[0],
    nameGeneration: 0,
    bulkCheck: 0,
    seoAudit: 0,
    affiliateClick: 0,
    domainRegisterClicked: 0,
    launchKitStarted: 0,
    brandExportClicked: 0,
    total: 0,
  }))
  const byDate = new Map(rows.map((row) => [row.date, row]))
  const actionMap = {
    name_generation: "nameGeneration",
    bulk_check: "bulkCheck",
    seo_audit: "seoAudit",
    affiliate_click: "affiliateClick",
    domain_register_clicked: "domainRegisterClicked",
    launch_kit_started: "launchKitStarted",
    brand_export_clicked: "brandExportClicked",
  } as const
  for (const metric of await fetchMetricRows(start)) {
    const row = byDate.get(metric.createdAt.toISOString().split("T")[0])
    if (!row) continue
    const key = actionMap[metric.action as keyof typeof actionMap]
    if (key) row[key] += 1
    row.total += 1
  }
  return rows
}

export async function getEvents(options: {
  days?: number
  page?: number
  limit?: number
  action?: string
  country?: string
  device?: string
  search?: string
}) {
  const days = Math.min(Math.max(Math.floor(options.days || 7), 1), 365)
  const page = Math.max(Math.floor(options.page || 1), 1)
  const limit = Math.min(Math.max(Math.floor(options.limit || 50), 1), MAX_ANALYTICS_ROWS)
  const service = createServiceClient()
  let query = service
    .from("metric_events")
    .select("*", { count: "exact" })
    .gte("created_at", getStartDate(days).toISOString())
    .order("created_at", { ascending: false })
  if (options.action) query = query.eq("action", options.action)
  if (options.country) query = query.eq("country", options.country)
  if (options.device) query = query.eq("device", options.device)

  if (options.search) {
    const needle = options.search.toLowerCase().slice(0, 200)
    const { data, error } = await query.range(0, MAX_ANALYTICS_ROWS - 1)
    if (error) throw error
    const matching = (data || []).map(toMetricEvent).filter((event) =>
      Object.values(event.metadata || {}).some((value) =>
        typeof value === "string" && value.toLowerCase().includes(needle)
      )
    )
    const start = (page - 1) * limit
    return {
      events: matching.slice(start, start + limit),
      pagination: { page, limit, total: matching.length, totalPages: Math.ceil(matching.length / limit) },
    }
  }

  const start = (page - 1) * limit
  const { data, error, count } = await query.range(start, start + limit - 1)
  if (error) throw error
  const total = count || 0
  return {
    events: (data || []).map(toMetricEvent),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export interface FeedbackAnalyticsSummary {
  totalLikes: number
  totalDislikes: number
  likeRate: number
  saveRate: number
  domainCheckRate: number
  moreLikeThisRate: number
  byStyleVibe: Array<{ namingStyle: string; vibe: string; likes: number; dislikes: number; likeRate: number }>
  dislikeReasons: Array<{ reason: string; count: number }>
  highPositiveNames: Array<{ name: string; positive: number; negative: number }>
  weakBriefs: Array<{ briefId: string; dislikes: number; likes: number }>
  promptModelComparisons: Array<{ promptVersion: string; modelName: string; likes: number; dislikes: number; likeRate: number }>
  founderVsGeneral: {
    founder: { positive: number; negative: number; likeRate: number }
    general: { positive: number; negative: number; likeRate: number }
  }
}

type FeedbackMetricRow = {
  candidate_name: string
  feedback_type: string
  feedback_reason: string | null
  naming_style: string | null
  vibe: string | null
  brief_id: string | null
  model_name: string | null
  prompt_version: string | null
  is_founder_feedback: boolean
}

export async function getFeedbackAnalytics(days = 7): Promise<FeedbackAnalyticsSummary> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("name_feedback_events")
    .select("candidate_name,feedback_type,feedback_reason,naming_style,vibe,brief_id,model_name,prompt_version,is_founder_feedback")
    .gte("created_at", getStartDate(days).toISOString())
    .limit(MAX_ANALYTICS_ROWS)
  if (error) throw error

  const rows = (data || []) as FeedbackMetricRow[]
  const positiveTypes = new Set(["like", "more_like_this", "save", "copy", "domain_check", "selected"])
  const negativeTypes = new Set(["dislike"])
  const totalLikes = rows.filter((row) => row.feedback_type === "like").length
  const totalDislikes = rows.filter((row) => row.feedback_type === "dislike").length
  const totalExplicit = totalLikes + totalDislikes
  const percent = (part: number, total: number) => total > 0 ? Math.round((part / total) * 1_000) / 10 : 0

  const group = <T>(key: (row: FeedbackMetricRow) => string, map: (key: string, rows: FeedbackMetricRow[]) => T): T[] => {
    const grouped = new Map<string, FeedbackMetricRow[]>()
    for (const row of rows) grouped.set(key(row), [...(grouped.get(key(row)) || []), row])
    return [...grouped.entries()].map(([groupKey, groupRows]) => map(groupKey, groupRows))
  }

  const byStyleVibe = group(
    (row) => `${row.naming_style || "unknown"}\0${row.vibe || "unknown"}`,
    (key, groupRows) => {
      const [namingStyle, vibe] = key.split("\0")
      const likes = groupRows.filter((row) => row.feedback_type === "like").length
      const dislikes = groupRows.filter((row) => row.feedback_type === "dislike").length
      return { namingStyle, vibe, likes, dislikes, likeRate: percent(likes, likes + dislikes) }
    },
  ).sort((a, b) => (b.likes + b.dislikes) - (a.likes + a.dislikes)).slice(0, 12)

  const dislikeReasons = group(
    (row) => row.feedback_type === "dislike" ? row.feedback_reason || "skip" : "",
    (reason, groupRows) => ({ reason, count: groupRows.filter((row) => row.feedback_type === "dislike").length }),
  ).filter((row) => row.reason && row.count > 0).sort((a, b) => b.count - a.count).slice(0, 10)

  const highPositiveNames = group(
    (row) => row.candidate_name,
    (name, groupRows) => ({
      name,
      positive: groupRows.filter((row) => positiveTypes.has(row.feedback_type)).length,
      negative: groupRows.filter((row) => negativeTypes.has(row.feedback_type)).length,
    }),
  ).filter((row) => row.positive >= 2 && row.positive > row.negative * 2).sort((a, b) => b.positive - a.positive).slice(0, 10)

  const weakBriefs = group(
    (row) => row.brief_id || "unknown",
    (briefId, groupRows) => ({
      briefId,
      dislikes: groupRows.filter((row) => row.feedback_type === "dislike").length,
      likes: groupRows.filter((row) => row.feedback_type === "like").length,
    }),
  ).filter((row) => row.dislikes >= 2 && row.dislikes > row.likes).sort((a, b) => b.dislikes - a.dislikes).slice(0, 10)

  const promptModelComparisons = group(
    (row) => `${row.prompt_version || "unknown"}\0${row.model_name || "unknown"}`,
    (key, groupRows) => {
      const [promptVersion, modelName] = key.split("\0")
      const likes = groupRows.filter((row) => row.feedback_type === "like").length
      const dislikes = groupRows.filter((row) => row.feedback_type === "dislike").length
      return { promptVersion, modelName, likes, dislikes, likeRate: percent(likes, likes + dislikes) }
    },
  ).sort((a, b) => (b.likes + b.dislikes) - (a.likes + a.dislikes)).slice(0, 10)

  const confidence = (founder: boolean) => {
    const selected = rows.filter((row) => row.is_founder_feedback === founder)
    const positive = selected.filter((row) => positiveTypes.has(row.feedback_type)).length
    const negative = selected.filter((row) => negativeTypes.has(row.feedback_type)).length
    return { positive, negative, likeRate: percent(positive, positive + negative) }
  }

  return {
    totalLikes,
    totalDislikes,
    likeRate: percent(totalLikes, totalExplicit),
    saveRate: percent(rows.filter((row) => row.feedback_type === "save").length, rows.length),
    domainCheckRate: percent(rows.filter((row) => row.feedback_type === "domain_check").length, rows.length),
    moreLikeThisRate: percent(rows.filter((row) => row.feedback_type === "more_like_this").length, rows.length),
    byStyleVibe,
    dislikeReasons,
    highPositiveNames,
    weakBriefs,
    promptModelComparisons,
    founderVsGeneral: {
      founder: confidence(true),
      general: confidence(false),
    },
  }
}
