"use client"

import Link from "next/link"
import { FormEvent, type CSSProperties, useCallback, useEffect, useId, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileSearch,
  Gauge,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  PauseCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wrench,
} from "lucide-react"
import {
  auditSummaryText,
  buildTrendPoints,
  hasRunningAudit,
  latestCompletedAudit,
  normaliseSeoPayload,
  reportDataValue,
  siteProjectName,
  sortIssuesByPriority,
  type FounderSignalSeoPayload,
  type SeoIssue,
  type SeoReport,
  type SeoSite,
  type SeoTrendPoint,
} from "./model"
import styles from "./founder-signal-seo.module.css"

const API_ROOT = "/api/founder-signal/seo"
const NEW_PROJECT_VALUE = "__new_project__"
const TREND_RANGES = [7, 30, 90] as const

class SeoApiError extends Error {
  status: number
  resetAt: string | null

  constructor(message: string, status: number, resetAt: string | null = null) {
    super(message)
    this.name = "SeoApiError"
    this.status = status
    this.resetAt = resetAt
  }
}

async function apiRequest(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  })
  const body = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok) {
    const message = typeof body?.message === "string"
      ? body.message
      : typeof body?.error === "string"
        ? body.error
        : "Founder Signal could not complete that request."
    throw new SeoApiError(
      message,
      response.status,
      typeof body?.resetAt === "string" ? body.resetAt : null,
    )
  }
  return body
}

function formatDate(value: string | null | undefined, includeTime = false): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not yet available"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value))
}

function relativeCooldown(value: string | null | undefined, now: number): string | null {
  if (!value) return null
  const remaining = Date.parse(value) - now
  if (!Number.isFinite(remaining) || remaining <= 0) return null
  const minutes = Math.max(1, Math.ceil(remaining / 60_000))
  return minutes < 60 ? `${minutes}m` : `${Math.ceil(minutes / 60)}h`
}

function scoreTone(score: number | null | undefined): "strong" | "steady" | "attention" | "unknown" {
  if (!Number.isFinite(Number(score))) return "unknown"
  if (Number(score) >= 80) return "strong"
  if (Number(score) >= 60) return "steady"
  return "attention"
}

function normaliseScore(score: number | null | undefined): number | null {
  const value = Number(score)
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : null
}

function getSavedBoardSuggestion(): string {
  try {
    const stored = JSON.parse(window.localStorage.getItem("namolux_saved_board") || "[]") as unknown
    if (!Array.isArray(stored)) return ""
    const first = stored.find((item) => item && typeof item === "object" && "domain" in item) as { domain?: unknown } | undefined
    if (typeof first?.domain !== "string") return ""
    const base = first.domain.trim().replace(/^https?:\/\//, "").split(/[./]/)[0] || ""
    return base
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .slice(0, 80)
  } catch {
    return ""
  }
}

function StatusMark({ status }: { status: string }) {
  const active = status === "active" || status === "completed"
  const running = status === "running" || status === "queued" || status === "activating"
  return (
    <span className={styles.statusMark} data-status={active ? "active" : running ? "running" : "paused"}>
      <span aria-hidden="true" />
      {active ? "Monitoring active" : running ? "Audit in progress" : "Monitoring paused"}
    </span>
  )
}

function Delta({ value }: { value: number | null | undefined }) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount === 0) {
    return <span className={styles.delta} data-tone="flat">No recorded change</span>
  }
  const positive = amount > 0
  return (
    <span className={styles.delta} data-tone={positive ? "up" : "down"}>
      {positive ? <TrendingUp aria-hidden="true" /> : <TrendingDown aria-hidden="true" />}
      {positive ? "+" : ""}{amount} since the previous report
    </span>
  )
}

function ScoreDial({ score, label }: { score: number | null | undefined; label: string }) {
  const value = normaliseScore(score)
  return (
    <div
      className={styles.scoreDial}
      data-tone={scoreTone(value)}
      role="meter"
      aria-label={`${label}: ${value === null ? "unavailable" : `${value} out of 100`}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      style={{ "--score": value ?? 0 } as CSSProperties}
    >
      <div>
        <strong>{value ?? "--"}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

function ScoreCell({ label, score, unavailable = false }: { label: string; score: number | null | undefined; unavailable?: boolean }) {
  const value = unavailable ? null : normaliseScore(score)
  return (
    <div className={styles.scoreCell} data-tone={scoreTone(value)}>
      <span>{label}</span>
      <strong>{value ?? "--"}</strong>
      <small>{unavailable ? "Provider unavailable" : value === null ? "Not measured" : "out of 100"}</small>
    </div>
  )
}

function TrendChart({ points, range }: { points: SeoTrendPoint[]; range: number }) {
  const width = 640
  const height = 230
  const left = 38
  const right = 18
  const top = 20
  const bottom = 36
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const coordinates = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? left + plotWidth / 2 : left + (index / (points.length - 1)) * plotWidth,
    y: top + ((100 - point.score) / 100) * plotHeight,
  }))
  const path = coordinates.map((point) => `${point.x},${point.y}`).join(" ")

  if (points.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        <Activity aria-hidden="true" />
        <strong>Your trend begins after the first completed audit</strong>
        <span>NamoLux never fills missing dates with estimated scores.</span>
      </div>
    )
  }

  return (
    <div className={styles.chartViewport}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="seo-trend-title seo-trend-description">
        <title id="seo-trend-title">SEO score trend for the last {range} days</title>
        <desc id="seo-trend-description">
          {points.map((point) => `${point.label}: ${point.score}`).join(", ")}
        </desc>
        {[0, 25, 50, 75, 100].map((score) => {
          const y = top + ((100 - score) / 100) * plotHeight
          return (
            <g key={score}>
              <line className={styles.chartGrid} x1={left} x2={width - right} y1={y} y2={y} />
              <text className={styles.chartAxis} x={left - 8} y={y + 4} textAnchor="end">{score}</text>
            </g>
          )
        })}
        {coordinates.length > 1 ? <polyline className={styles.chartLine} points={path} fill="none" /> : null}
        {coordinates.map((point, index) => (
          <g key={point.id}>
            <circle className={styles.chartPointHalo} cx={point.x} cy={point.y} r="8" />
            <circle className={styles.chartPoint} cx={point.x} cy={point.y} r="4" />
            {(index === 0 || index === coordinates.length - 1 || coordinates.length <= 5) ? (
              <text className={styles.chartLabel} x={point.x} y={height - 10} textAnchor={index === 0 ? "start" : index === coordinates.length - 1 ? "end" : "middle"}>
                {point.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  )
}

function PreviewState({ authenticated }: { authenticated: boolean }) {
  return (
    <div className={styles.previewGrid}>
      <div className={styles.previewCopy}>
        <h3>{authenticated ? "Turn Founder Signal into a post-launch growth assistant." : "Your name is chosen. Founder Signal can keep watching what happens next."}</h3>
        <p>
          Connect a live website to establish a real SEO baseline, detect new problems, and receive a focused daily update plus a deeper weekly growth briefing.
        </p>
        <Link
          href={authenticated ? "/pricing?from=founder-signal-seo#plans" : "/sign-in?redirect=/founder-signal%23seo-monitoring"}
          className={styles.primaryButton}
        >
          {authenticated ? "Unlock SEO monitoring" : "Sign in to continue"}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <ol className={styles.previewSteps} aria-label="SEO monitoring includes">
        <li><span>01</span><div><strong>Establish a baseline</strong><p>Real crawlability, metadata, structure and technical checks.</p></div></li>
        <li><span>02</span><div><strong>See what changed</strong><p>New, improving and resolved issues without repeating noise.</p></div></li>
        <li><span>03</span><div><strong>Know what to do next</strong><p>Founder-friendly actions ordered by likely impact.</p></div></li>
      </ol>
    </div>
  )
}

type ActivationFormProps = {
  data: FounderSignalSeoPayload
  busy: boolean
  error: string | null
  onSubmit: (input: {
    projectId?: string
    projectName?: string
    businessDescription?: string
    category?: string
    url: string
  }) => Promise<void>
}

function ActivationForm({ data, busy, error, onSubmit }: ActivationFormProps) {
  const projectSelectId = useId()
  const nameId = useId()
  const descriptionId = useId()
  const categoryId = useId()
  const urlId = useId()
  const [projectId, setProjectId] = useState(data.projects[0]?.id || NEW_PROJECT_VALUE)
  const [projectName, setProjectName] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [category, setCategory] = useState("")
  const [url, setUrl] = useState("")
  const [localSuggestion, setLocalSuggestion] = useState(false)
  const creatingProject = projectId === NEW_PROJECT_VALUE

  useEffect(() => {
    if (!creatingProject) return
    const timer = window.setTimeout(() => {
      const suggestion = getSavedBoardSuggestion()
      if (!suggestion) return
      setProjectName((current) => current || suggestion)
      setLocalSuggestion(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [creatingProject])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({
      ...(creatingProject ? {
        projectName: projectName.trim() || undefined,
        businessDescription: businessDescription.trim() || undefined,
        category: category.trim() || undefined,
      } : { projectId }),
      url: url.trim(),
    })
  }

  return (
    <div className={styles.activationLayout}>
      <div className={styles.activationCopy}>
        <Globe2 aria-hidden="true" />
        <h3>My website is live</h3>
        <p>Connect the public URL to your NamoLux project. We will verify HTTPS and reachability before any monitoring is activated.</p>
        <ul>
          <li><Check aria-hidden="true" />No scripts or forms are executed</li>
          <li><Check aria-hidden="true" />Crawling stays deliberately limited</li>
          <li><Check aria-hidden="true" />Only measured signals appear in reports</li>
        </ul>
      </div>
      <form className={styles.activationForm} onSubmit={submit} aria-busy={busy}>
        <div className={styles.field}>
          <label htmlFor={projectSelectId}>NamoLux project</label>
          <select id={projectSelectId} value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={busy}>
            {data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            <option value={NEW_PROJECT_VALUE}>Create a new project</option>
          </select>
        </div>

        {creatingProject ? (
          <>
            <div className={styles.field}>
              <label htmlFor={nameId}>Project name</label>
              <input id={nameId} value={projectName} onChange={(event) => { setProjectName(event.target.value); setLocalSuggestion(false) }} maxLength={100} required placeholder="Your brand or company" disabled={busy} />
              {localSuggestion ? <small>Suggested from a name saved in this browser. Confirm or change it before activation.</small> : null}
            </div>
            <div className={styles.field}>
              <label htmlFor={descriptionId}>What does the business do? <span>Optional</span></label>
              <textarea id={descriptionId} value={businessDescription} onChange={(event) => setBusinessDescription(event.target.value)} rows={3} maxLength={600} placeholder="A concise description helps weekly recommendations stay relevant." disabled={busy} />
            </div>
            <div className={styles.field}>
              <label htmlFor={categoryId}>Category <span>Optional</span></label>
              <input id={categoryId} value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} placeholder="e.g. Fintech, design studio, local bakery" disabled={busy} />
            </div>
          </>
        ) : null}

        <div className={styles.field}>
          <label htmlFor={urlId}>Live website URL</label>
          <input id={urlId} type="url" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://example.com" disabled={busy} />
        </div>

        {error ? <p className={styles.formError} role="alert"><AlertTriangle aria-hidden="true" />{error}</p> : null}

        {busy ? (
          <div className={styles.auditProgress} role="status" aria-live="polite">
            <LoaderCircle aria-hidden="true" />
            <div><strong>Connecting and preparing the first real audit</strong><span>Reachability, crawlability, structure, metadata and configured performance signals are being checked.</span></div>
          </div>
        ) : null}

        <button className={styles.primaryButton} type="submit" disabled={busy || !url.trim()}>
          {busy ? "Activating monitoring..." : "Activate SEO Monitoring"}
          {busy ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </button>
      </form>
    </div>
  )
}

function IssueRow({ issue, busy, onStatus }: { issue: SeoIssue; busy: boolean; onStatus: (issue: SeoIssue, status: "ignored" | "active") => Promise<void> }) {
  const urls = issue.affectedUrls?.length ? issue.affectedUrls : issue.affectedUrl ? [issue.affectedUrl] : []
  const evidence = typeof issue.evidence === "string"
    ? issue.evidence
    : issue.evidence
      ? JSON.stringify(issue.evidence, null, 2)
      : null

  return (
    <details className={styles.issueRow}>
      <summary>
        <span className={styles.severity} data-severity={issue.severity}>{issue.severity}</span>
        <span className={styles.issueSummary}><strong>{issue.title}</strong><small>{issue.category} | {issue.status}</small></span>
        <ChevronRight aria-hidden="true" />
      </summary>
      <div className={styles.issueBody}>
        <div><h5>What changed</h5><p>{issue.description}</p></div>
        <div><h5>Recommended fix</h5><p>{issue.recommendation}</p></div>
        {urls.length > 0 ? <div><h5>Affected {urls.length === 1 ? "page" : "pages"}</h5><ul>{urls.slice(0, 10).map((url) => <li key={url}>{url}</li>)}</ul></div> : null}
        {evidence ? <details className={styles.evidence}><summary>Technical evidence</summary><pre>{evidence}</pre></details> : null}
        <dl className={styles.issueDates}>
          <div><dt>First detected</dt><dd>{formatDate(issue.firstDetectedAt)}</dd></div>
          <div><dt>Last checked</dt><dd>{formatDate(issue.lastDetectedAt)}</dd></div>
          {issue.resolvedAt ? <div><dt>Resolved</dt><dd>{formatDate(issue.resolvedAt)}</dd></div> : null}
        </dl>
        {!(["resolved"].includes(issue.status)) ? (
          <button className={styles.textButton} type="button" disabled={busy} onClick={() => onStatus(issue, issue.status === "ignored" ? "active" : "ignored")}>
            {issue.status === "ignored" ? "Restore issue" : "Ignore this issue"}
          </button>
        ) : null}
      </div>
    </details>
  )
}

function ReportRow({ report }: { report: SeoReport }) {
  const focus = reportDataValue(report.reportData, "focusForNextWeek") || reportDataValue(report.reportData, "focus")
  const recommendations = reportDataValue(report.reportData, "recommendations")
  return (
    <details className={styles.reportRow}>
      <summary>
        <span className={styles.reportType}>{report.reportType}</span>
        <span><strong>{report.title}</strong><small>{formatDate(report.createdAt, true)}</small></span>
        <Delta value={report.scoreChange} />
        <ChevronRight aria-hidden="true" />
      </summary>
      <div className={styles.reportBody}>
        <p>{report.summary}</p>
        <dl>
          <div><dt>New issues</dt><dd>{report.newIssueCount ?? 0}</dd></div>
          <div><dt>Resolved</dt><dd>{report.resolvedIssueCount ?? 0}</dd></div>
        </dl>
        {focus ? <div className={styles.reportFocus}><strong>Focus for next week</strong><span>{focus}</span></div> : null}
        {recommendations ? <p className={styles.reportRecommendation}>{recommendations}</p> : null}
      </div>
    </details>
  )
}

type DashboardProps = {
  data: FounderSignalSeoPayload
  selectedSite: SeoSite
  onSelectSite: (siteId: string) => void
  onRefresh: () => Promise<void>
  onManualAudit: (site: SeoSite) => Promise<void>
  onSitePatch: (site: SeoSite, patch: Record<string, boolean>) => Promise<void>
  onIssueStatus: (issue: SeoIssue, status: "ignored" | "active") => Promise<void>
  mutation: string | null
  actionError: string | null
  manualResetAt: string | null
}

function MonitoringDashboard({ data, selectedSite: site, onSelectSite, onRefresh, onManualAudit, onSitePatch, onIssueStatus, mutation, actionError, manualResetAt }: DashboardProps) {
  const [range, setRange] = useState<(typeof TREND_RANGES)[number]>(7)
  const [now, setNow] = useState(() => Date.now())
  const siteAudits = useMemo(() => data.audits.filter((audit) => audit.siteId === site.id), [data.audits, site.id])
  const siteIssues = useMemo(() => sortIssuesByPriority(data.issues.filter((issue) => issue.siteId === site.id)), [data.issues, site.id])
  const siteReports = useMemo(() => data.reports.filter((report) => report.siteId === site.id).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)), [data.reports, site.id])
  const latestAudit = useMemo(() => latestCompletedAudit(siteAudits, site.id), [siteAudits, site.id])
  const points = useMemo(() => buildTrendPoints(siteAudits, site.id, range), [siteAudits, site.id, range])
  const activeIssues = siteIssues.filter((issue) => ["new", "active", "improving"].includes(issue.status))
  const criticalIssues = activeIssues.filter((issue) => ["critical", "high"].includes(issue.severity))
  const quickWins = activeIssues.filter((issue) => ["medium", "low"].includes(issue.severity)).slice(0, 3)
  const resolvedIssues = siteIssues.filter((issue) => issue.status === "resolved").slice(0, 4)
  const running = hasRunningAudit(siteAudits, site.id)
  const expired = data.accessState === "expired"
  const paused = expired || !site.monitoringEnabled || ["paused", "inactive"].includes(site.status)
  const cooldown = relativeCooldown(manualResetAt || site.manualAuditAvailableAt, now)
  const latestReport = siteReports[0]
  const projectName = siteProjectName(site, data.projects)

  useEffect(() => {
    if (!cooldown) return
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [cooldown])

  return (
    <div className={styles.dashboard}>
      {paused ? (
        <div className={styles.pausedBanner} role="status">
          <PauseCircle aria-hidden="true" />
          <div>
            <strong>{expired ? "Monitoring paused because paid access ended" : "Monitoring is paused"}</strong>
            <span>Your existing audits and reports remain available. No new scheduled checks will run while monitoring is paused.</span>
          </div>
          {expired ? (
            <Link className={styles.compactButton} href="/pricing?from=founder-signal-seo-paused#plans">Reactivate</Link>
          ) : (
            <button className={styles.compactButton} type="button" disabled={Boolean(mutation)} onClick={() => onSitePatch(site, { monitoringEnabled: true })}>
              <Play aria-hidden="true" />Resume
            </button>
          )}
        </div>
      ) : null}

      <header className={styles.connectedHeader}>
        <div className={styles.connectedIdentity}>
          <div className={styles.siteIcon}><Globe2 aria-hidden="true" /></div>
          <div>
            <span>Connected website</span>
            <h3>{projectName}</h3>
            <a href={site.normalizedUrl || site.url} target="_blank" rel="noreferrer">{site.normalizedUrl || site.url}<ExternalLink aria-hidden="true" /></a>
          </div>
        </div>
        <div className={styles.connectedActions}>
          {data.sites.length > 1 ? (
            <label className={styles.siteSelect}>Website<select value={site.id} onChange={(event) => onSelectSite(event.target.value)}>{data.sites.map((item) => <option value={item.id} key={item.id}>{siteProjectName(item, data.projects)}</option>)}</select></label>
          ) : null}
          <StatusMark status={running ? "running" : paused ? "paused" : "active"} />
          <button className={styles.iconButton} type="button" disabled={mutation === "refresh"} onClick={() => onRefresh()} aria-label="Refresh SEO monitoring data">
            <RefreshCw className={mutation === "refresh" ? styles.spin : undefined} aria-hidden="true" />
          </button>
        </div>
      </header>

      {actionError ? <p className={styles.actionError} role="alert"><AlertTriangle aria-hidden="true" />{actionError}</p> : null}

      <section className={styles.scoreOverview} aria-labelledby="seo-current-score">
        <div className={styles.primaryScore}>
          <ScoreDial score={latestAudit?.overallScore} label="SEO score" />
          <div>
            <h4 id="seo-current-score">Your current position</h4>
            <Delta value={latestReport?.scoreChange} />
            <p>{auditSummaryText(latestAudit?.summary) || latestReport?.summary || "The first completed audit will establish your measured baseline."}</p>
            <span>Last completed {formatDate(latestAudit?.completedAt || site.lastAuditAt, true)}</span>
          </div>
        </div>
        <div className={styles.scoreBreakdown}>
          <ScoreCell label="Technical" score={latestAudit?.technicalScore} />
          <ScoreCell label="Content & metadata" score={latestAudit?.metadataScore} />
          <ScoreCell label="Discoverability" score={latestAudit?.discoverabilityScore} />
          <ScoreCell label="Mobile & performance" score={latestAudit?.performanceScore} unavailable={!data.performanceAvailable} />
        </div>
      </section>

      <div className={styles.actionRail}>
        <div><Clock3 aria-hidden="true" /><span>Next scheduled check</span><strong>{paused ? "Paused" : formatDate(site.nextAuditAt, true)}</strong></div>
        <div><FileSearch aria-hidden="true" /><span>Pages in latest audit</span><strong>{latestAudit?.pagesChecked ?? "--"}</strong></div>
        <button
          className={styles.manualButton}
          type="button"
          disabled={Boolean(mutation) || running || paused || Boolean(cooldown)}
          onClick={() => onManualAudit(site)}
        >
          {running ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <Gauge aria-hidden="true" />}
          {running ? "Audit in progress" : cooldown ? `Available in ${cooldown}` : "Run manual audit"}
        </button>
      </div>

      <section className={styles.trendPanel} aria-labelledby="seo-trend-heading">
        <div className={styles.panelHeading}>
          <div><h4 id="seo-trend-heading">Score trend</h4><p>Measured completed audits only</p></div>
          <fieldset className={styles.rangeControl}>
            <legend className={styles.srOnly}>Trend date range</legend>
            {TREND_RANGES.map((option) => <button key={option} type="button" aria-pressed={range === option} onClick={() => setRange(option)}>{option}d</button>)}
          </fieldset>
        </div>
        <TrendChart points={points} range={range} />
      </section>

      <div className={styles.insightColumns}>
        <section className={styles.issuePanel} aria-labelledby="critical-issues-heading">
          <div className={styles.panelHeading}><div><h4 id="critical-issues-heading">Needs attention</h4><p>{criticalIssues.length} critical or high-priority {criticalIssues.length === 1 ? "issue" : "issues"}</p></div><AlertTriangle aria-hidden="true" /></div>
          {criticalIssues.length > 0 ? criticalIssues.slice(0, 5).map((issue) => <IssueRow key={issue.id} issue={issue} busy={mutation === `issue:${issue.id}`} onStatus={onIssueStatus} />) : <div className={styles.clearState}><ShieldCheck aria-hidden="true" /><strong>No outstanding critical issues</strong><span>We will surface newly detected risks here.</span></div>}
        </section>

        <section className={styles.quickWins} aria-labelledby="quick-wins-heading">
          <div className={styles.panelHeading}><div><h4 id="quick-wins-heading">Quick wins</h4><p>Practical next actions</p></div><Wrench aria-hidden="true" /></div>
          {quickWins.length > 0 ? <ol>{quickWins.map((issue) => <li key={issue.id}><span>{issue.severity}</span><strong>{issue.title}</strong><p>{issue.recommendation}</p></li>)}</ol> : <div className={styles.clearState}><CheckCircle2 aria-hidden="true" /><strong>No quick wins waiting</strong><span>The next audit will check again.</span></div>}
        </section>
      </div>

      <section className={styles.allIssues} aria-labelledby="all-issues-heading">
        <div className={styles.panelHeading}><div><h4 id="all-issues-heading">Issue history</h4><p>New, active, improving, resolved and ignored findings</p></div><span>{siteIssues.length}</span></div>
        {siteIssues.length > 0 ? siteIssues.map((issue) => <IssueRow key={issue.id} issue={issue} busy={mutation === `issue:${issue.id}`} onStatus={onIssueStatus} />) : <div className={styles.clearState}><FileSearch aria-hidden="true" /><strong>No issue history yet</strong><span>Findings appear after the initial audit completes.</span></div>}
      </section>

      {resolvedIssues.length > 0 ? (
        <section className={styles.resolvedRail} aria-labelledby="resolved-heading">
          <div><CheckCircle2 aria-hidden="true" /><h4 id="resolved-heading">Recently resolved</h4></div>
          <ul>{resolvedIssues.map((issue) => <li key={issue.id}><strong>{issue.title}</strong><span>{formatDate(issue.resolvedAt)}</span></li>)}</ul>
        </section>
      ) : null}

      <section className={styles.reportsPanel} aria-labelledby="reports-heading">
        <div className={styles.panelHeading}><div><h4 id="reports-heading">Founder briefings</h4><p>Daily changes and deeper weekly reports</p></div><FileSearch aria-hidden="true" /></div>
        {siteReports.length > 0 ? siteReports.map((report) => <ReportRow key={report.id} report={report} />) : <div className={styles.clearState}><Sparkles aria-hidden="true" /><strong>Your first briefing is being prepared</strong><span>Reports appear after completed scheduled audits.</span></div>}
      </section>

      <details className={styles.settingsPanel}>
        <summary><span><strong>Monitoring settings</strong><small>Schedule and report preferences</small></span><ChevronRight aria-hidden="true" /></summary>
        <div className={styles.settingsBody}>
          <label><span><strong>Website monitoring</strong><small>Allow scheduled checks for this website</small></span><input type="checkbox" checked={site.monitoringEnabled} disabled={expired || Boolean(mutation)} onChange={(event) => onSitePatch(site, { monitoringEnabled: event.target.checked })} /></label>
          <label><span><strong>Daily report</strong><small>Prepare a concise change report after daily monitoring</small></span><input type="checkbox" checked={site.dailyEnabled ?? true} disabled={expired || Boolean(mutation)} onChange={(event) => onSitePatch(site, { dailyEnabled: event.target.checked })} /></label>
          <label><span><strong>Weekly growth briefing</strong><small>Prepare the executive seven-day review</small></span><input type="checkbox" checked={site.weeklyEnabled ?? true} disabled={expired || Boolean(mutation)} onChange={(event) => onSitePatch(site, { weeklyEnabled: event.target.checked })} /></label>
          <div className={styles.unavailableSetting}><span><strong>Email delivery</strong><small>No email delivery provider is configured. Reports remain available here.</small></span><LockKeyhole aria-hidden="true" /></div>
        </div>
      </details>
    </div>
  )
}

export function FounderSignalSeo() {
  const [data, setData] = useState<FounderSignalSeoPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [mutation, setMutation] = useState<string | null>(null)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [manualResetAt, setManualResetAt] = useState<string | null>(null)

  const applyPayload = useCallback((value: unknown) => {
    const payload = normaliseSeoPayload(value)
    if (!payload) return false
    setData(payload)
    setSelectedSiteId((current) => payload.sites.some((site) => site.id === current) ? current : payload.sites[0]?.id || null)
    return true
  }, [])

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setLoadError(null)
    try {
      const body = await apiRequest(API_ROOT, { cache: "no-store" })
      if (!applyPayload(body)) throw new Error("Founder Signal returned an invalid monitoring response.")
    } catch (error) {
      if (showLoading) {
        setLoadError(error instanceof Error ? error.message : "SEO monitoring could not be loaded.")
      }
      throw error
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [applyPayload])

  useEffect(() => {
    const controller = new AbortController()
    apiRequest(API_ROOT, { cache: "no-store", signal: controller.signal })
      .then((body) => {
        if (!applyPayload(body)) throw new Error("Founder Signal returned an invalid monitoring response.")
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setLoadError(error instanceof Error ? error.message : "SEO monitoring could not be loaded.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [applyPayload])

  async function reconcileMutation(value: unknown) {
    if (!applyPayload(value)) await load()
  }

  async function activate(input: { projectId?: string; projectName?: string; businessDescription?: string; category?: string; url: string }) {
    setMutation("activate")
    setActivationError(null)
    try {
      const body = await apiRequest(`${API_ROOT}/sites`, { method: "POST", body: JSON.stringify(input) })
      await reconcileMutation(body)
    } catch (error) {
      setActivationError(error instanceof Error ? error.message : "This website could not be connected.")
    } finally {
      setMutation(null)
    }
  }

  async function refresh() {
    setMutation("refresh")
    setActionError(null)
    try {
      await load()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Monitoring data could not be refreshed.")
    } finally {
      setMutation(null)
    }
  }

  async function manualAudit(site: SeoSite) {
    setMutation(`audit:${site.id}`)
    setActionError(null)
    setManualResetAt(null)
    try {
      const body = await apiRequest(`${API_ROOT}/sites/${encodeURIComponent(site.id)}/audit`, { method: "POST" })
      await reconcileMutation(body)
    } catch (error) {
      if (error instanceof SeoApiError && error.resetAt) setManualResetAt(error.resetAt)
      setActionError(error instanceof Error ? error.message : "A manual audit could not be started.")
    } finally {
      setMutation(null)
    }
  }

  async function patchSite(site: SeoSite, patch: Record<string, boolean>) {
    setMutation(`site:${site.id}`)
    setActionError(null)
    try {
      const body = await apiRequest(`${API_ROOT}/sites/${encodeURIComponent(site.id)}`, { method: "PATCH", body: JSON.stringify(patch) })
      await reconcileMutation(body)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Monitoring settings could not be updated.")
    } finally {
      setMutation(null)
    }
  }

  async function patchIssue(issue: SeoIssue, status: "ignored" | "active") {
    setMutation(`issue:${issue.id}`)
    setActionError(null)
    try {
      const body = await apiRequest(`${API_ROOT}/issues/${encodeURIComponent(issue.id)}`, { method: "PATCH", body: JSON.stringify({ status }) })
      await reconcileMutation(body)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The issue status could not be updated.")
    } finally {
      setMutation(null)
    }
  }

  const selectedSite = data?.sites.find((site) => site.id === selectedSiteId) || data?.sites[0] || null

  return (
    <section id="seo-monitoring" className={styles.section} aria-labelledby="seo-monitoring-heading">
      <div className={styles.sectionHeading}>
        <div>
          <span>Post-launch Founder Signal</span>
          <h2 id="seo-monitoring-heading">Keep growing after launch.</h2>
        </div>
        <p>Connect the live site, understand what changed, and leave each report with a clear next move.</p>
      </div>

      <div className={styles.shell}>
        {loading ? (
          <div className={styles.loadingState} role="status" aria-live="polite"><LoaderCircle className={styles.spin} aria-hidden="true" /><strong>Loading SEO monitoring</strong><span>Checking your projects, access and latest reports.</span></div>
        ) : loadError ? (
          <div className={styles.errorState} role="alert"><AlertTriangle aria-hidden="true" /><strong>SEO monitoring could not be loaded</strong><span>{loadError}</span><button type="button" onClick={() => { void load(true) }}>Try again</button></div>
        ) : !data?.authenticated ? (
          <PreviewState authenticated={false} />
        ) : !data.isPro && data.accessState !== "expired" ? (
          <PreviewState authenticated />
        ) : selectedSite ? (
          <MonitoringDashboard
            data={data}
            selectedSite={selectedSite}
            onSelectSite={setSelectedSiteId}
            onRefresh={refresh}
            onManualAudit={manualAudit}
            onSitePatch={patchSite}
            onIssueStatus={patchIssue}
            mutation={mutation}
            actionError={actionError}
            manualResetAt={manualResetAt}
          />
        ) : (
          <ActivationForm data={data} busy={mutation === "activate"} error={activationError} onSubmit={activate} />
        )}
      </div>
    </section>
  )
}
