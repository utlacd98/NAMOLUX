export type SeoAccessState = "free" | "active" | "grace" | "expired"
export type SeoAuditStatus = "queued" | "running" | "completed" | "partial" | "failed"
export type SeoIssueSeverity = "critical" | "high" | "medium" | "low"
export type SeoIssueStatus = "new" | "active" | "improving" | "resolved" | "ignored"
export type SeoReportType = "daily" | "weekly"

export type SeoProject = {
  id: string
  name: string
  businessDescription?: string | null
  category?: string | null
}

export type SeoSite = {
  id: string
  projectId?: string | null
  name?: string | null
  url: string
  normalizedUrl?: string | null
  status: string
  monitoringEnabled: boolean
  activatedAt?: string | null
  lastAuditAt?: string | null
  nextAuditAt?: string | null
  manualAuditAvailableAt?: string | null
  dailyEnabled?: boolean
  weeklyEnabled?: boolean
  emailEnabled?: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export type SeoAudit = {
  id: string
  siteId: string
  auditType: "initial" | "manual" | "daily" | "weekly" | string
  status: SeoAuditStatus | string
  overallScore?: number | null
  technicalScore?: number | null
  metadataScore?: number | null
  discoverabilityScore?: number | null
  performanceScore?: number | null
  pagesChecked?: number | null
  startedAt?: string | null
  completedAt?: string | null
  errorMessage?: string | null
  summary?: unknown
}

export type SeoIssue = {
  id: string
  siteId: string
  auditId?: string | null
  fingerprint?: string | null
  category: string
  severity: SeoIssueSeverity | string
  title: string
  description: string
  recommendation: string
  evidence?: unknown
  affectedUrl?: string | null
  affectedUrls?: string[] | null
  status: SeoIssueStatus | string
  firstDetectedAt?: string | null
  lastDetectedAt?: string | null
  resolvedAt?: string | null
  ignoredAt?: string | null
}

export type SeoReport = {
  id: string
  siteId: string
  auditId?: string | null
  reportType: SeoReportType | string
  title: string
  summary: string
  scoreChange?: number | null
  newIssueCount?: number | null
  resolvedIssueCount?: number | null
  reportData?: unknown
  createdAt: string
}

export type FounderSignalSeoPayload = {
  authenticated: boolean
  isPro: boolean
  accessState: SeoAccessState | string
  projects: SeoProject[]
  sites: SeoSite[]
  audits: SeoAudit[]
  reports: SeoReport[]
  issues: SeoIssue[]
  performanceAvailable: boolean
  notificationDeliveryAvailable: boolean
}

export type SeoTrendPoint = {
  id: string
  score: number
  date: string
  label: string
}

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

export function auditSummaryText(summary: unknown): string | null {
  if (typeof summary === "string") return summary.trim() || null
  if (!isRecord(summary)) return null
  const text = summary.text
  return typeof text === "string" ? text.trim() || null : null
}

export function normaliseSeoPayload(value: unknown): FounderSignalSeoPayload | null {
  if (!isRecord(value)) return null
  const audits = asArray<Record<string, unknown>>(value.audits)
    .filter(isRecord)
    .map((audit) => ({
      ...audit,
      summary: auditSummaryText(audit.summary),
    })) as SeoAudit[]

  return {
    authenticated: value.authenticated === true,
    isPro: value.isPro === true,
    accessState: typeof value.accessState === "string" ? value.accessState : "free",
    projects: asArray<SeoProject>(value.projects),
    sites: asArray<SeoSite>(value.sites),
    audits,
    reports: asArray<SeoReport>(value.reports),
    issues: asArray<SeoIssue>(value.issues),
    performanceAvailable: value.performanceAvailable === true,
    notificationDeliveryAvailable: value.notificationDeliveryAvailable === true,
  }
}

export function latestCompletedAudit(audits: readonly SeoAudit[], siteId: string): SeoAudit | null {
  let latest: SeoAudit | null = null
  let latestTime = Number.NEGATIVE_INFINITY

  for (const audit of audits) {
    if (audit.siteId !== siteId || !["completed", "partial"].includes(audit.status)) continue
    const timestamp = Date.parse(audit.completedAt || audit.startedAt || "")
    if (Number.isFinite(timestamp) && timestamp > latestTime) {
      latest = audit
      latestTime = timestamp
    }
  }

  return latest
}

export function hasRunningAudit(audits: readonly SeoAudit[], siteId: string): boolean {
  return audits.some((audit) => audit.siteId === siteId && ["queued", "running"].includes(audit.status))
}

export function buildTrendPoints(
  audits: readonly SeoAudit[],
  siteId: string,
  days: 7 | 30 | 90,
  now = new Date(),
): SeoTrendPoint[] {
  const floor = now.getTime() - days * 24 * 60 * 60 * 1_000
  const points: SeoTrendPoint[] = []

  for (const audit of audits) {
    if (audit.siteId !== siteId || !["completed", "partial"].includes(audit.status)) continue
    const score = Number(audit.overallScore)
    const date = audit.completedAt || audit.startedAt || ""
    const timestamp = Date.parse(date)
    if (!Number.isFinite(score) || score < 0 || score > 100 || !Number.isFinite(timestamp) || timestamp < floor) continue
    points.push({
      id: audit.id,
      score: Math.round(score),
      date,
      label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(timestamp)),
    })
  }

  return points.sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
}

export function sortIssuesByPriority(issues: readonly SeoIssue[]): SeoIssue[] {
  return [...issues].sort((left, right) => {
    const severity = (SEVERITY_WEIGHT[left.severity] ?? 4) - (SEVERITY_WEIGHT[right.severity] ?? 4)
    if (severity !== 0) return severity
    return Date.parse(right.lastDetectedAt || "") - Date.parse(left.lastDetectedAt || "")
  })
}

export function siteProjectName(
  site: SeoSite,
  projects: readonly SeoProject[],
): string {
  const explicitName = site.name?.trim()
    || projects.find((project) => project.id === site.projectId)?.name?.trim()
  if (explicitName) return explicitName

  try {
    return new URL(site.normalizedUrl || site.url).hostname.replace(/^www\./, "")
  } catch {
    return site.url.trim() || "Connected website"
  }
}

export function reportDataValue(reportData: unknown, key: string): string | null {
  if (!isRecord(reportData)) return null
  const value = reportData[key]
  if (typeof value === "string" && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    return items.length > 0 ? items.join(" | ") : null
  }
  return null
}
