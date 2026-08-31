import { createHash, randomUUID } from "node:crypto"
import type { Database, Json } from "@/lib/supabase/database.types"
import { getUserEntitlements } from "@/lib/entitlements"
import type { SeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"
import {
  createGooglePageSpeedProvider,
  createIssueFingerprint,
  generateDailySeoReport,
  generateWeeklySeoReport,
  normalizePublicWebsiteUrl,
  runSeoAudit,
  safeFetchUrl,
  type SeoAuditResult,
  type SeoDetectedIssue,
  type SeoGeneratedReport,
} from "@/lib/seo-monitoring"
import { createServiceClient } from "@/lib/supabase/server"

const MANUAL_AUDIT_COOLDOWN_MS = 6 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
const JOB_LEASE_MS = 10 * 60 * 1000
const CRON_WORK_BUDGET_MS = 240 * 1000

const SEO_CRON_BOUNDARIES = {
  daily: { hour: 4, minute: 17 },
  weekly: { day: 1, hour: 5, minute: 17 },
} as const

type AuditKind = "initial" | "manual" | "daily" | "weekly"
type CronKind = "daily" | "weekly"
type SeoTables = Database["public"]["Tables"]
type BrandProjectRow = SeoTables["brand_projects"]["Row"]
type SeoSiteRow = SeoTables["seo_sites"]["Row"]
type SeoAuditRow = SeoTables["seo_audits"]["Row"]
type SeoReportRow = SeoTables["seo_reports"]["Row"]
type SeoIssueRow = SeoTables["seo_issues"]["Row"]
type SeoPreferenceRow = SeoTables["seo_notification_preferences"]["Row"]
type SeoJobRunRow = SeoTables["seo_job_runs"]["Row"]

export class SeoMonitoringError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly resetAt: string | null = null,
  ) {
    super(message)
    this.name = "SeoMonitoringError"
  }
}

function isoAfter(ms: number, from = Date.now()) {
  return new Date(from + ms).toISOString()
}

/**
 * Return the next fixed UTC cron boundary, matching vercel.json. Advancing to a
 * wall-clock boundary rather than adding 24 hours/7 days prevents long-running
 * audits from slowly drifting later each day.
 */
export function getNextSeoScheduleBoundary(kind: CronKind, from = new Date()) {
  const timestamp = from.getTime()
  if (!Number.isFinite(timestamp)) throw new RangeError("A valid schedule date is required.")

  if (kind === "daily") {
    const { hour, minute } = SEO_CRON_BOUNDARIES.daily
    const boundary = new Date(Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      hour,
      minute,
    ))
    if (boundary.getTime() <= timestamp) boundary.setUTCDate(boundary.getUTCDate() + 1)
    return boundary.toISOString()
  }

  const { day, hour, minute } = SEO_CRON_BOUNDARIES.weekly
  const daysUntilBoundary = (day - from.getUTCDay() + 7) % 7
  const boundary = new Date(Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate() + daysUntilBoundary,
    hour,
    minute,
  ))
  if (boundary.getTime() <= timestamp) boundary.setUTCDate(boundary.getUTCDate() + 7)
  return boundary.toISOString()
}

export function getSeoScheduleAdvancement(auditType: AuditKind, completedAt: string) {
  const completed = new Date(completedAt)
  const update: {
    next_daily_audit_at: string
    next_weekly_report_at?: string
  } = {
    // A successful manual or weekly crawl is fresh daily evidence too, so it
    // satisfies today's daily obligation instead of triggering a duplicate.
    next_daily_audit_at: getNextSeoScheduleBoundary("daily", completed),
  }

  if (auditType === "initial" || auditType === "weekly") {
    update.next_weekly_report_at = getNextSeoScheduleBoundary("weekly", completed)
  }
  return update
}

function parseBatchSize() {
  const value = Number.parseInt(process.env.SEO_CRON_BATCH_SIZE || "5", 10)
  return Number.isFinite(value) ? Math.min(10, Math.max(1, value)) : 5
}

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

function cleanErrorMessage(error: unknown) {
  if (error instanceof SeoMonitoringError) return error.message
  if (error instanceof Error && /timeout/i.test(error.message)) return "The website did not respond before the audit deadline."
  return "The website could not be audited. Check that it is public and try again."
}

function cleanErrorCode(error: unknown) {
  if (error instanceof SeoMonitoringError) return error.code
  if (error instanceof Error && /timeout/i.test(error.message)) return "website_timeout"
  return "audit_failed"
}

export function getManualAuditCooldownState(lastStartedAt: string | null | undefined, now = Date.now()) {
  const started = lastStartedAt ? Date.parse(lastStartedAt) : Number.NaN
  const availableAt = Number.isFinite(started) ? started + MANUAL_AUDIT_COOLDOWN_MS : null
  return {
    allowed: availableAt === null || availableAt <= now,
    availableAt: availableAt === null ? null : new Date(availableAt).toISOString(),
  }
}

function manualAuditAvailableAt(audits: Array<{ audit_type: string; started_at: string | null; created_at: string }>) {
  const recent = audits.find((audit) => audit.audit_type === "manual")
  if (!recent) return null
  return getManualAuditCooldownState(recent.started_at || recent.created_at).availableAt
}

function mapProject(project: BrandProjectRow) {
  return {
    id: project.id,
    name: project.name,
    selectedBrandName: project.selected_brand_name,
    businessDescription: project.business_description,
    category: project.category,
    locale: project.locale,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }
}

function mapAudit(audit: SeoAuditRow) {
  const summary = audit.summary
  const summaryText = summary && typeof summary === "object" && !Array.isArray(summary) && typeof summary.text === "string"
    ? summary.text
    : typeof summary === "string"
      ? summary
      : null
  return {
    id: audit.id,
    siteId: audit.site_id,
    auditType: audit.audit_type,
    status: audit.status,
    overallScore: audit.overall_score,
    technicalScore: audit.technical_score,
    metadataScore: audit.metadata_score,
    discoverabilityScore: audit.discoverability_score,
    performanceScore: audit.performance_score,
    pagesChecked: audit.pages_checked,
    startedAt: audit.started_at,
    completedAt: audit.completed_at,
    summary: summaryText,
    errorMessage: audit.error_message,
  }
}

function mapReport(report: SeoReportRow) {
  return {
    id: report.id,
    siteId: report.site_id,
    auditId: report.audit_id,
    reportType: report.report_type,
    title: report.title,
    summary: report.summary,
    scoreChange: report.score_change,
    newIssueCount: report.new_issue_count,
    resolvedIssueCount: report.resolved_issue_count,
    outstandingCriticalCount: report.outstanding_critical_count,
    reportData: report.report_data,
    createdAt: report.created_at,
  }
}

function mapIssue(issue: SeoIssueRow) {
  return {
    id: issue.id,
    siteId: issue.site_id,
    auditId: issue.last_detected_audit_id,
    fingerprint: issue.fingerprint,
    category: issue.category,
    severity: issue.severity,
    title: issue.title,
    description: issue.description,
    whyItMatters: issue.why_it_matters,
    recommendation: issue.recommendation,
    evidence: issue.evidence,
    affectedUrl: issue.affected_url,
    status: issue.status,
    firstDetectedAt: issue.first_detected_at,
    lastDetectedAt: issue.last_detected_at,
    resolvedAt: issue.resolved_at,
    ignoredAt: issue.ignored_at,
  }
}

export async function getSeoMonitoringDashboard(principal: SeoMonitoringPrincipal) {
  const service = createServiceClient()
  const { data: projects, error: projectsError } = await service
    .from("brand_projects")
    .select("*")
    .eq("user_id", principal.userId)
    .order("updated_at", { ascending: false })
  if (projectsError) throw projectsError

  const { data: sites, error: sitesError } = await service
    .from("seo_sites")
    .select("*")
    .eq("user_id", principal.userId)
    .order("created_at", { ascending: false })
  if (sitesError) throw sitesError

  const siteIds = (sites || []).map((site) => site.id)
  let audits: SeoAuditRow[] = []
  let reports: SeoReportRow[] = []
  let issues: SeoIssueRow[] = []
  let preferences: SeoPreferenceRow[] = []

  if (siteIds.length > 0) {
    const [auditResult, reportResult, issueResult, preferenceResult] = await Promise.all([
      service.from("seo_audits").select("*").in("site_id", siteIds).order("created_at", { ascending: false }).limit(180),
      service.from("seo_reports").select("*").in("site_id", siteIds).order("created_at", { ascending: false }).limit(180),
      service.from("seo_issues").select("*").in("site_id", siteIds).order("last_detected_at", { ascending: false }).limit(500),
      service.from("seo_notification_preferences").select("*").in("site_id", siteIds),
    ])
    if (auditResult.error) throw auditResult.error
    if (reportResult.error) throw reportResult.error
    if (issueResult.error) throw issueResult.error
    if (preferenceResult.error) throw preferenceResult.error
    audits = auditResult.data || []
    reports = reportResult.data || []
    issues = issueResult.data || []
    preferences = preferenceResult.data || []
  }

  const preferenceBySite = new Map(preferences.map((item) => [item.site_id, item]))
  const auditsBySite = new Map<string, SeoAuditRow[]>()
  for (const audit of audits) {
    const current = auditsBySite.get(audit.site_id) || []
    current.push(audit)
    auditsBySite.set(audit.site_id, current)
  }

  return {
    authenticated: true,
    isPro: principal.entitlements.isPro,
    accessState: principal.entitlements.accessState,
    projects: (projects || []).map(mapProject),
    sites: (sites || []).map((site) => {
      const preference = preferenceBySite.get(site.id)
      const siteAudits = auditsBySite.get(site.id) || []
      return {
        id: site.id,
        projectId: site.project_id,
        url: site.url,
        normalizedUrl: site.normalized_url,
        status: principal.entitlements.isPro ? site.status : "paused",
        pauseReason: principal.entitlements.isPro ? site.pause_reason : "subscription_inactive",
        monitoringEnabled: site.monitoring_enabled,
        lastAuditAt: site.last_audit_at,
        nextAuditAt: site.next_daily_audit_at,
        nextWeeklyReportAt: site.next_weekly_report_at,
        dailyEnabled: preference?.daily_enabled ?? true,
        weeklyEnabled: preference?.weekly_enabled ?? true,
        emailEnabled: preference?.email_enabled ?? false,
        manualAuditAvailableAt: manualAuditAvailableAt(siteAudits),
        createdAt: site.created_at,
      }
    }),
    audits: audits.map(mapAudit),
    reports: reports.map(mapReport),
    issues: issues.map(mapIssue),
    performanceAvailable: Boolean(process.env.PAGESPEED_INSIGHTS_API_KEY),
    notificationDeliveryAvailable: false,
  }
}

async function getOwnedSite(userId: string, siteId: string) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("seo_sites")
    .select("*")
    .eq("id", siteId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new SeoMonitoringError("site_not_found", "The monitored website could not be found.", 404)
  return data
}

export async function activateSeoMonitoring(input: {
  principal: SeoMonitoringPrincipal
  projectId?: string
  projectName?: string
  businessDescription?: string
  category?: string
  url: string
}) {
  const service = createServiceClient()
  let normalized: URL
  try {
    normalized = normalizePublicWebsiteUrl(input.url)
    const reachable = await safeFetchUrl(normalized, {})
    if (reachable.statusCode < 200 || reachable.statusCode >= 400) {
      throw new Error("unreachable")
    }
    normalized = new URL(reachable.finalUrl)
  } catch {
    throw new SeoMonitoringError(
      "website_unreachable",
      "This website is not publicly reachable. Check the URL and try again.",
      422,
    )
  }

  if (normalized.protocol !== "https:") {
    throw new SeoMonitoringError(
      "https_required",
      "SEO monitoring requires a live HTTPS website. Enable HTTPS, then try again.",
      422,
    )
  }

  let projectId = input.projectId
  if (projectId) {
    const { data, error } = await service
      .from("brand_projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", input.principal.userId)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new SeoMonitoringError("project_not_found", "Choose a valid NamoLux project.", 404)
  } else {
    const { data, error } = await service
      .from("brand_projects")
      .insert({
        user_id: input.principal.userId,
        name: input.projectName || normalized.hostname,
        business_description: input.businessDescription || null,
        category: input.category || null,
      })
      .select("id")
      .single()
    if (error) throw error
    projectId = data.id
  }

  // Monitoring is origin-scoped. A path supplied during activation may prove
  // reachability, but it must not create duplicate monitors for the same site.
  const canonicalUrl = `${normalized.origin}/`
  const now = new Date().toISOString()
  const { data: existing, error: existingError } = await service
    .from("seo_sites")
    .select("*")
    .eq("user_id", input.principal.userId)
    .eq("origin", normalized.origin)
    .maybeSingle()
  if (existingError) throw existingError

  let site = existing
  if (!site) {
    const { data, error } = await service
      .from("seo_sites")
      .insert({
        user_id: input.principal.userId,
        project_id: projectId!,
        url: input.url,
        normalized_url: canonicalUrl,
        origin: normalized.origin,
        hostname: normalized.hostname,
        status: "pending",
        monitoring_enabled: true,
        activated_at: now,
        next_daily_audit_at: now,
        next_weekly_report_at: now,
      })
      .select("*")
      .single()
    if (error) throw error
    site = data
  } else if (site.project_id !== projectId || !site.monitoring_enabled || site.status !== "active") {
    const { data, error } = await service
      .from("seo_sites")
      .update({
        project_id: projectId!,
        monitoring_enabled: true,
        status: "pending",
        pause_reason: null,
        updated_at: now,
      })
      .eq("id", site.id)
      .eq("user_id", input.principal.userId)
      .select("*")
      .single()
    if (error) throw error
    site = data
  }

  const { error: preferenceError } = await service
    .from("seo_notification_preferences")
    .upsert({ site_id: site.id }, { onConflict: "site_id", ignoreDuplicates: true })
  if (preferenceError) throw preferenceError

  await runPersistedSeoAudit(site, "initial", `initial:${site.id}:${randomUUID()}`)
  return getSeoMonitoringDashboard(input.principal)
}

export async function updateSeoSite(
  principal: SeoMonitoringPrincipal,
  siteId: string,
  settings: { monitoringEnabled?: boolean; dailyEnabled?: boolean; weeklyEnabled?: boolean; emailEnabled?: boolean },
) {
  const service = createServiceClient()
  await getOwnedSite(principal.userId, siteId)
  const now = new Date().toISOString()

  if (settings.monitoringEnabled !== undefined) {
    const { error } = await service
      .from("seo_sites")
      .update({
        monitoring_enabled: settings.monitoringEnabled,
        status: settings.monitoringEnabled ? "active" : "paused",
        pause_reason: settings.monitoringEnabled ? null : "user_paused",
        next_daily_audit_at: settings.monitoringEnabled ? now : null,
        updated_at: now,
      })
      .eq("id", siteId)
      .eq("user_id", principal.userId)
    if (error) throw error
  }

  if (settings.dailyEnabled !== undefined || settings.weeklyEnabled !== undefined || settings.emailEnabled !== undefined) {
    const { error } = await service.from("seo_notification_preferences").upsert({
      site_id: siteId,
      ...(settings.dailyEnabled !== undefined ? { daily_enabled: settings.dailyEnabled } : {}),
      ...(settings.weeklyEnabled !== undefined ? { weekly_enabled: settings.weeklyEnabled } : {}),
      // No sender exists yet. Persisting the preference keeps the integration point honest,
      // but the dashboard also receives notificationDeliveryAvailable=false.
      ...(settings.emailEnabled !== undefined ? { email_enabled: settings.emailEnabled } : {}),
      updated_at: now,
    })
    if (error) throw error

    const scheduleUpdate: { next_daily_audit_at?: string | null; next_weekly_report_at?: string | null; updated_at: string } = {
      updated_at: now,
    }
    if (settings.dailyEnabled !== undefined) {
      scheduleUpdate.next_daily_audit_at = settings.dailyEnabled ? now : null
    }
    if (settings.weeklyEnabled !== undefined) {
      scheduleUpdate.next_weekly_report_at = settings.weeklyEnabled ? now : null
    }
    if (Object.keys(scheduleUpdate).length > 1) {
      const { error: scheduleError } = await service
        .from("seo_sites")
        .update(scheduleUpdate)
        .eq("id", siteId)
        .eq("user_id", principal.userId)
      if (scheduleError) throw scheduleError
    }
  }

  return getSeoMonitoringDashboard(principal)
}

export async function updateSeoIssueStatus(
  principal: SeoMonitoringPrincipal,
  issueId: string,
  status: "ignored" | "active",
) {
  const service = createServiceClient()
  const { data: issue, error: issueError } = await service
    .from("seo_issues")
    .select("id, site_id")
    .eq("id", issueId)
    .maybeSingle()
  if (issueError) throw issueError
  if (!issue) throw new SeoMonitoringError("issue_not_found", "The issue could not be found.", 404)
  await getOwnedSite(principal.userId, issue.site_id)

  const now = new Date().toISOString()
  const { error } = await service
    .from("seo_issues")
    .update({
      status,
      ignored_at: status === "ignored" ? now : null,
      updated_at: now,
    })
    .eq("id", issueId)
    .eq("site_id", issue.site_id)
  if (error) throw error

  return getSeoMonitoringDashboard(principal)
}

function buildPageSnapshots(result: SeoAuditResult) {
  return result.pages.map((page) => ({
    url: page.requestedUrl,
    normalized_url: page.url,
    response_status: page.statusCode,
    response_time_ms: page.responseTimeMs,
    response_bytes: page.sizeBytes,
    title: page.title,
    meta_description: page.metaDescription,
    canonical_url: page.canonicalUrls[0] || null,
    h1_values: asJson(page.h1),
    robots_directives: page.robotsDirectives,
    word_count: page.meaningfulWordCount,
    image_count: page.imageCount,
    missing_alt_count: page.imagesMissingAlt,
    script_count: page.scriptCount,
    stylesheet_count: page.stylesheetCount,
    content_hash: hashJson({ headings: page.headings, wordCount: page.meaningfulWordCount }),
    metadata_hash: hashJson({
      title: page.title,
      description: page.metaDescription,
      canonical: page.canonicalUrls,
      robots: page.robotsDirectives,
    }),
    response_headers: asJson({ contentType: page.contentType }),
    metrics: asJson(page),
    fetch_error_code: page.fetchError || null,
    crawled_at: page.fetchedAt,
  }))
}

function buildDetectedIssues(detectedIssues: readonly SeoDetectedIssue[]) {
  return detectedIssues.map((issue) => ({
    fingerprint: issue.fingerprint || createIssueFingerprint(issue),
    check_key: issue.checkKey,
    category: issue.category,
    severity: issue.severity,
    title: issue.title,
    description: issue.explanation,
    why_it_matters: issue.whyItMatters,
    recommendation: issue.recommendation,
    evidence: asJson(issue.evidence),
    affected_url: issue.affectedUrl,
  }))
}

function auditResultFromRow(row: Pick<SeoAuditRow, "raw_metrics"> | null | undefined): SeoAuditResult | null {
  const value = row?.raw_metrics
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  if (!("scores" in value) || !("issues" in value) || !("pages" in value)) return null
  return value as unknown as SeoAuditResult
}

export function auditCanResolveMissingIssues(result: SeoAuditResult) {
  return !result.partialFailures.some((failure) =>
    ["homepage", "crawl", "robots", "sitemap"].includes(failure.stage),
  )
}

function reportSafeAuditResult(current: SeoAuditResult, previous: SeoAuditResult | null) {
  if (!previous || auditCanResolveMissingIssues(current)) return current
  const currentFingerprints = new Set(current.issues.map((issue) => issue.fingerprint || createIssueFingerprint(issue)))
  return {
    ...current,
    issues: [
      ...current.issues,
      ...previous.issues.filter((issue) => !currentFingerprints.has(issue.fingerprint || createIssueFingerprint(issue))),
    ],
  }
}

function buildGeneratedReportPayload(input: {
  auditId: string
  report: SeoGeneratedReport
  periodStart: string
  periodEnd: string
}) {
  return {
    report_type: input.report.reportType,
    period_start: input.periodStart.slice(0, 10),
    period_end: input.periodEnd.slice(0, 10),
    idempotency_key: `${input.report.reportType}:${input.auditId}`,
    title: input.report.title,
    summary: input.report.summary,
    score_change: input.report.scoreChange,
    report_data: asJson(input.report),
  }
}

async function findPreviousAudit(siteId: string, currentAuditId: string) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("seo_audits")
    .select("*")
    .eq("site_id", siteId)
    .in("status", ["completed", "partial"])
    .neq("id", currentAuditId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

async function projectContext(projectId: string) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("brand_projects")
    .select("business_description, category")
    .eq("id", projectId)
    .maybeSingle()
  if (error) throw error
  return {
    businessDescription: data?.business_description || undefined,
    category: data?.category || undefined,
  }
}

type SeoAuditClaim = {
  claimed: boolean
  disposition: "created" | "resumed" | "reclaimed" | "in_progress" | "site_busy" | "replay_complete"
  audit: SeoAuditRow
}

export async function runPersistedSeoAudit(
  site: SeoSiteRow,
  auditType: AuditKind,
  idempotencyKey: string,
  scheduleKey?: string,
  siteLeaseToken?: string,
) {
  const service = createServiceClient()
  const workerToken = randomUUID()
  const effectiveScheduleKey = scheduleKey || idempotencyKey
  const { data: claimData, error: claimError } = await service.rpc("claim_seo_audit", {
    p_site_id: site.id,
    p_audit_type: auditType,
    p_schedule_key: effectiveScheduleKey,
    p_idempotency_key: idempotencyKey,
    p_worker_token: workerToken,
    p_lease_seconds: 600,
    p_scheduled_for: auditType === "daily" || auditType === "weekly"
      ? new Date().toISOString().slice(0, 10)
      : null,
  })
  if (claimError) throw claimError

  const claim = claimData as unknown as SeoAuditClaim
  if (!claim?.audit) throw new SeoMonitoringError("audit_unavailable", "The audit could not be started.", 500)
  if (!claim.claimed) {
    if (claim.disposition === "replay_complete") return auditResultFromRow(claim.audit) || claim.audit
    throw new SeoMonitoringError("audit_in_progress", "An audit is already running for this website.", 409)
  }
  const audit = claim.audit

  try {
    const apiKey = process.env.PAGESPEED_INSIGHTS_API_KEY
    const performanceProvider = apiKey ? createGooglePageSpeedProvider(apiKey) : null
    const launchSite = site as SeoSiteRow & { crawl_page_limit?: number }
    const result = await runSeoAudit({
      url: site.normalized_url,
      auditType,
      performanceProvider,
      limits: { maxPages: Math.max(1, Math.min(8, launchSite.crawl_page_limit || 3)) },
    })

    const previousRow = await findPreviousAudit(site.id, audit.id)
    const previousResult = auditResultFromRow(previousRow)
    const completedAt = result.completedAt
    const finalStatus = result.partialFailures.length > 0 ? "partial" : "completed"
    const allowResolutions = auditCanResolveMissingIssues(result)
    const reportResult = reportSafeAuditResult(result, previousResult)
    let reportPayload: Json | null = null

    if (auditType === "daily" || auditType === "initial") {
      const report = generateDailySeoReport({ siteUrl: site.normalized_url, current: reportResult, previous: previousResult })
      reportPayload = asJson(buildGeneratedReportPayload({
        auditId: audit.id,
        report,
        periodStart: previousResult?.completedAt || result.startedAt,
        periodEnd: result.completedAt,
      }))
    }

    if (auditType === "weekly") {
      const { data: recentRows, error: recentError } = await service
        .from("seo_audits")
        .select("raw_metrics")
        .eq("site_id", site.id)
        .in("status", ["completed", "partial"])
        .gte("completed_at", new Date(Date.now() - WEEK_MS).toISOString())
        .order("completed_at", { ascending: true })
      if (recentError) throw recentError
      const recentResults = (recentRows || []).map(auditResultFromRow).filter((item): item is SeoAuditResult => Boolean(item))
      if (!recentResults.some((item) => item.completedAt === result.completedAt)) recentResults.push(reportResult)

      const { data: previousReportRow, error: previousReportError } = await service
        .from("seo_reports")
        .select("report_data")
        .eq("site_id", site.id)
        .eq("report_type", "weekly")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (previousReportError) throw previousReportError
      const previousReport = previousReportRow?.report_data as SeoGeneratedReport | null
      const report = generateWeeklySeoReport({
        siteUrl: site.normalized_url,
        audits: recentResults,
        previousReport,
        businessContext: await projectContext(site.project_id),
      })
      reportPayload = asJson(buildGeneratedReportPayload({
        auditId: audit.id,
        report,
        periodStart: recentResults[0]?.startedAt || result.startedAt,
        periodEnd: result.completedAt,
      }))
    }

    const advancement = getSeoScheduleAdvancement(auditType, completedAt)
    const { error: completionError } = await service.rpc("complete_seo_audit", {
      p_audit_id: audit.id,
      p_site_id: site.id,
      p_worker_token: workerToken,
      p_completed_at: completedAt,
      p_status: finalStatus,
      p_overall_score: result.scores.overall,
      p_technical_score: result.scores.technical,
      p_metadata_score: result.scores.metadata,
      p_discoverability_score: result.scores.discoverability,
      p_performance_score: result.scores.performance,
      p_pages_checked: result.pages.length,
      p_summary: asJson(result.summary),
      p_raw_metrics: asJson(result),
      p_pages: asJson(buildPageSnapshots(result)),
      p_issues: asJson(buildDetectedIssues(result.issues)),
      p_allow_resolutions: allowResolutions,
      p_report: reportPayload,
      p_error_code: result.partialFailures.length > 0 ? "partial_audit" : null,
      p_error_message: result.partialFailures.length > 0
        ? "Some checks were unavailable; measured results are still shown."
        : null,
      p_next_daily_audit_at: advancement.next_daily_audit_at,
      p_next_weekly_report_at: advancement.next_weekly_report_at || null,
      p_site_lease_token: siteLeaseToken || null,
    })
    if (completionError) throw completionError

    const currentIssues = [...result.issues]
      .sort((a, b) => {
        const weight = { critical: 4, high: 3, medium: 2, low: 1 } as const
        return (weight[b.severity] || 0) - (weight[a.severity] || 0)
      })
      .slice(0, 3)
    const scoreDelta = previousResult ? result.scores.overall - previousResult.scores.overall : null
    const changeState = result.partialFailures.length > 0
      ? "partial"
      : !previousResult
        ? "baseline"
        : Math.abs(scoreDelta || 0) >= 5 || currentIssues.some((issue) => issue.severity === "critical")
          ? "material_change"
          : "stable"
    const { error: assessmentError } = await (service as any).from("seo_agent_assessments").upsert({
      user_id: site.user_id,
      site_id: site.id,
      audit_id: audit.id,
      change_state: changeState,
      priorities: currentIssues.map((issue) => ({
        title: issue.title,
        severity: issue.severity,
        action: issue.recommendation,
        affectedUrl: issue.affectedUrl,
      })),
      evidence: currentIssues.map((issue) => ({
        checkKey: issue.checkKey,
        affectedUrl: issue.affectedUrl,
        evidence: issue.evidence,
      })),
      model_used: false,
      model_name: null,
      model_version: "daily-launch-signal-rules-v1",
    }, { onConflict: "audit_id" })
    if (assessmentError) console.error("[daily-launch-signal] assessment_save_failed", { auditId: audit.id, code: assessmentError.code })
    return result
  } catch (error) {
    const completedAt = new Date().toISOString()
    const scheduledAdvancement = auditType === "daily" || auditType === "weekly"
      ? getSeoScheduleAdvancement(auditType, completedAt)
      : null
    await Promise.all([
      service.from("seo_audits").update({
        status: "failed",
        worker_token: null,
        lease_expires_at: null,
        error_code: cleanErrorCode(error),
        error_message: cleanErrorMessage(error),
        completed_at: completedAt,
        updated_at: completedAt,
      }).eq("id", audit.id).eq("site_id", site.id).eq("status", "running").eq("worker_token", workerToken),
      service.from("seo_sites").update({
        status: "error",
        pause_reason: "last_audit_failed",
        ...(scheduledAdvancement || {}),
        updated_at: completedAt,
      }).eq("id", site.id).eq("user_id", site.user_id).eq("monitoring_enabled", true),
    ])
    throw error
  }
}

export async function runManualSeoAudit(principal: SeoMonitoringPrincipal, siteId: string) {
  if (!principal.entitlements.isPro) {
    throw new SeoMonitoringError("upgrade_required", "Manual SEO rechecks are available on Pro; Free receives one scheduled report per UTC day.", 403)
  }
  const service = createServiceClient()
  const site = await getOwnedSite(principal.userId, siteId)
  const { data: recent, error: recentError } = await service
    .from("seo_audits")
    .select("started_at, created_at")
    .eq("site_id", siteId)
    .eq("audit_type", "manual")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (recentError) throw recentError

  if (recent) {
    const cooldown = getManualAuditCooldownState(recent.started_at || recent.created_at)
    if (!cooldown.allowed && cooldown.availableAt) {
      throw new SeoMonitoringError(
        "manual_audit_cooldown",
        `The next manual audit is available at ${cooldown.availableAt}.`,
        429,
        cooldown.availableAt,
      )
    }
  }

  await runPersistedSeoAudit(site, "manual", `manual:${siteId}:${randomUUID()}`)
  return getSeoMonitoringDashboard(principal)
}

export function getSeoScheduleKey(kind: CronKind, date = new Date()) {
  const day = date.toISOString().slice(0, 10)
  if (kind === "daily") return day
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date.getTime() - start.getTime()) / DAY_MS) + start.getUTCDay() + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

export function getSeoJobIdempotencyKey(kind: CronKind, date = new Date()) {
  return `seo-${kind}:${getSeoScheduleKey(kind, date)}`
}

async function runWithConcurrency<T>(items: readonly T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]
      await worker(item)
    }
  })
  await Promise.all(runners)
}

export async function runSeoCronBatch(kind: CronKind) {
  const service = createServiceClient()
  const key = getSeoScheduleKey(kind)
  const workerToken = randomUUID()
  const idempotencyKey = getSeoJobIdempotencyKey(kind)
  const invocationStartedAt = Date.now()
  const workDeadline = invocationStartedAt + CRON_WORK_BUDGET_MS
  const now = new Date(invocationStartedAt).toISOString()

  const { data: jobClaimData, error: jobError } = await service.rpc("claim_seo_job_run", {
    p_job_type: kind,
    p_schedule_key: key,
    p_batch_key: "primary",
    p_idempotency_key: idempotencyKey,
    p_worker_token: workerToken,
    p_lease_seconds: Math.round(JOB_LEASE_MS / 1000),
  })
  if (jobError) throw jobError
  const jobClaim = jobClaimData as unknown as {
    claimed: boolean
    disposition: "created" | "reclaimed" | "in_progress" | "replay_complete"
    job: SeoJobRunRow
  }
  const claimedJob = jobClaim?.job
  if (!claimedJob) throw new SeoMonitoringError("job_unavailable", "The scheduled SEO job could not be claimed.", 500)
  if (!jobClaim.claimed) {
    return {
      duplicate: true,
      status: claimedJob.status,
      processed: claimedJob.processed_count,
      succeeded: claimedJob.succeeded_count,
      failed: claimedJob.failed_count,
      hasMore: claimedJob.status !== "completed",
      cursor: claimedJob.cursor,
    }
  }

  const jobId = claimedJob.id
  const priorProcessed = Number(claimedJob.processed_count) || 0
  const priorSucceeded = Number(claimedJob.succeeded_count) || 0
  const priorFailed = Number(claimedJob.failed_count) || 0
  const batchSize = parseBatchSize()
  const dueColumn = kind === "daily" ? "next_daily_audit_at" : "next_weekly_report_at"
  const enabledColumn = kind === "daily" ? "daily_enabled" : "weekly_enabled"
  let scanCursor: string | null = claimedJob.cursor
  let exhaustedPreferences = false
  let processingStarted = false
  let claimSkipped = false
  let processed = 0
  let succeeded = 0
  let failed = 0
  const errors: string[] = []
  try {
    const sites: SeoSiteRow[] = []

    // Preferences are the pagination source so enabled/disabled reporting is
    // applied before the batch limit. Keyset pagination also remains stable as
    // successful audits move their site's due timestamp into the future.
    while (sites.length < batchSize && Date.now() < workDeadline) {
      const remaining = batchSize - sites.length
      let preferenceQuery = service
        .from("seo_notification_preferences")
        .select("site_id")
        .eq(enabledColumn, true)
        .order("site_id", { ascending: true })
        .limit(remaining)
      if (scanCursor) preferenceQuery = preferenceQuery.gt("site_id", scanCursor)

      const { data: preferencePage, error: preferenceError } = await preferenceQuery
      if (preferenceError) throw preferenceError
      if (!preferencePage || preferencePage.length === 0) {
        exhaustedPreferences = true
        break
      }

      scanCursor = preferencePage[preferencePage.length - 1].site_id
      const candidateIds = preferencePage.map((preference) => preference.site_id)
      const { data: dueSites, error: candidateError } = await service
        .from("seo_sites")
        .select("*")
        .in("id", candidateIds)
        .eq("monitoring_enabled", true)
        .in("status", ["active", "paused", "error"])
        .or(`${dueColumn}.is.null,${dueColumn}.lte.${now}`)
        .order("id", { ascending: true })
      if (candidateError) throw candidateError
      sites.push(...(dueSites || []))

      if (preferencePage.length < remaining) {
        exhaustedPreferences = true
        break
      }
    }

    const renewedAt = new Date().toISOString()
    const { data: renewedJob, error: renewalError } = await service
      .from("seo_job_runs")
      .update({
        cursor: scanCursor,
        lease_expires_at: isoAfter(JOB_LEASE_MS),
        updated_at: renewedAt,
      })
      .eq("id", jobId)
      .eq("status", "running")
      .eq("worker_token", workerToken)
      .select("id")
      .maybeSingle()
    if (renewalError) throw renewalError
    if (!renewedJob) throw new SeoMonitoringError("job_lease_lost", "The scheduled SEO job lease was lost.", 409)

    processingStarted = sites.length > 0
    await runWithConcurrency(sites, 2, async (site) => {
      const claimStartedAt = Date.now()
      const claimNow = new Date(claimStartedAt).toISOString()
      const siteLeaseExpiresAt = isoAfter(JOB_LEASE_MS, claimStartedAt)
      const leaseToken = randomUUID()
      const { data: claimed, error: claimError } = await service
        .from("seo_sites")
        .update({ lease_token: leaseToken, lease_expires_at: siteLeaseExpiresAt, updated_at: claimNow })
        .eq("id", site.id)
        .eq("updated_at", site.updated_at)
        .eq("monitoring_enabled", true)
        .in("status", ["active", "paused", "error"])
        .or(`${dueColumn}.is.null,${dueColumn}.lte.${now}`)
        .or(`lease_expires_at.is.null,lease_expires_at.lt.${claimNow}`)
        .select("*")
        .maybeSingle()
      if (claimError) throw claimError
      if (!claimed) {
        claimSkipped = true
        return
      }

      try {
        const { data: currentPreference, error: currentPreferenceError } = await service
          .from("seo_notification_preferences")
          .select(enabledColumn)
          .eq("site_id", site.id)
          .eq(enabledColumn, true)
          .maybeSingle()
        if (currentPreferenceError) throw currentPreferenceError
        if (!currentPreference) return

        processed += 1
        const entitlement = await getUserEntitlements(site.user_id)
        const claimedLaunchSite = claimed as SeoSiteRow & { access_tier?: "free" | "pro"; crawl_page_limit?: number }
        if ((claimedLaunchSite as any).verification_status !== "verified") {
          await service.from("seo_sites").update({
            status: "paused",
            monitoring_enabled: false,
            pause_reason: "verification_required",
            lease_token: null,
            lease_expires_at: null,
            updated_at: new Date().toISOString(),
          } as any).eq("id", site.id).eq("lease_token", leaseToken)
          return
        }
        if (!entitlement.isPro && claimedLaunchSite.access_tier === "pro") {
          await service.from("seo_sites").update({
            status: "paused",
            pause_reason: "subscription_inactive",
            lease_token: null,
            lease_expires_at: null,
            updated_at: new Date().toISOString(),
          }).eq("id", site.id).eq("lease_token", leaseToken)
          return
        }

        if (!entitlement.isPro && claimedLaunchSite.access_tier === "free") {
          await service.from("seo_sites").update({ crawl_page_limit: 3, updated_at: new Date().toISOString() } as any)
            .eq("id", site.id).eq("lease_token", leaseToken)
          claimedLaunchSite.crawl_page_limit = 3
        }

        await runPersistedSeoAudit(claimedLaunchSite, kind, `${kind}:${site.id}:${key}`, key, leaseToken)
        succeeded += 1
      } catch (error) {
        failed += 1
        errors.push(`${site.id}:${cleanErrorCode(error)}`)
        console.error(`[seo-monitoring] ${kind}_site_failed`, { siteId: site.id, error: cleanErrorCode(error) })
      } finally {
        const { error: releaseError } = await service
          .from("seo_sites")
          .update({ lease_token: null, lease_expires_at: null })
          .eq("id", site.id)
          .eq("lease_token", leaseToken)
        if (releaseError) console.error("[seo-monitoring] site_lease_release_failed", { siteId: site.id })
      }
    })

    const budgetExpired = Date.now() >= workDeadline
    const hasMore = !exhaustedPreferences || budgetExpired || failed > 0 || claimSkipped
    // A skipped or failed claim may sit before the scan cursor. Restarting the
    // next bounded continuation is safe because successful sites are no longer
    // due, while it guarantees a transient race cannot permanently skip work.
    const continuationCursor = hasMore
      ? (failed > 0 || claimSkipped ? null : scanCursor)
      : null
    const completedAt = new Date().toISOString()
    const finalStatus = hasMore ? "partial" : "completed"
    const { data: completedJob, error: completionError } = await service
      .from("seo_job_runs")
      .update({
        status: finalStatus,
        cursor: continuationCursor,
        processed_count: priorProcessed + processed,
        succeeded_count: priorSucceeded + succeeded,
        failed_count: priorFailed + failed,
        last_error: errors.slice(0, 5).join(",") || null,
        completed_at: completedAt,
        worker_token: null,
        lease_expires_at: null,
        updated_at: completedAt,
      })
      .eq("id", jobId)
      .eq("status", "running")
      .eq("worker_token", workerToken)
      .select("id")
      .maybeSingle()
    if (completionError) throw completionError
    if (!completedJob) throw new SeoMonitoringError("job_lease_lost", "The scheduled SEO job lease was lost.", 409)

    return {
      duplicate: false,
      status: finalStatus,
      processed,
      succeeded,
      failed,
      hasMore,
      cursor: continuationCursor,
    }
  } catch (error) {
    const failedAt = new Date().toISOString()
    const recordedFailed = Math.max(failed, 1)
    const recordedProcessed = Math.max(processed, succeeded + recordedFailed)
    const { error: failureUpdateError } = await service
      .from("seo_job_runs")
      .update({
        status: "failed",
        cursor: processingStarted ? null : scanCursor,
        processed_count: priorProcessed + recordedProcessed,
        succeeded_count: priorSucceeded + succeeded,
        failed_count: priorFailed + recordedFailed,
        last_error: cleanErrorCode(error),
        completed_at: failedAt,
        worker_token: null,
        lease_expires_at: null,
        updated_at: failedAt,
      })
      .eq("id", jobId)
      .eq("status", "running")
      .eq("worker_token", workerToken)
    if (failureUpdateError) {
      console.error("[seo-monitoring] cron_failure_state_update_failed", {
        jobId,
        error: failureUpdateError.code,
      })
    }
    throw error
  }
}
