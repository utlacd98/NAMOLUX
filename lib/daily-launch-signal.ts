import { createHash, randomBytes } from "node:crypto"
import { resolveTxt } from "node:dns/promises"
import { send } from "@vercel/queue"
import { ToolLoopAgent } from "ai"
import { getPlanConfig } from "@/lib/plans"
import { isDailyLaunchSignalEnabled } from "@/lib/agent-release-flags"
import type { SeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"
import { getSeoScheduleKey, runPersistedSeoAudit, SeoMonitoringError } from "@/lib/seo-monitoring-service"
import { safeFetchUrl } from "@/lib/seo-monitoring"
import { createServiceClient } from "@/lib/supabase/server"

export const DAILY_LAUNCH_TOPIC = "seo-daily-v1"
const DAY_MS = 24 * 60 * 60 * 1000

export type DailyLaunchMessage = { siteId: string; userId: string; scheduleKey: string }
export type VerificationMethod = "dns_txt" | "meta_tag"

export function getDailyLaunchAuditIdempotencyKey(siteId: string, scheduleKey: string) {
  return `daily:${siteId}:${scheduleKey}`
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function assertEnabled() {
  if (!isDailyLaunchSignalEnabled()) throw new SeoMonitoringError("feature_disabled", "Daily Launch Signal is not enabled.", 404)
}

function normaliseWinningDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")
}

export function isAllowedWinningHostname(hostname: string, winningDomain: string) {
  const actual = hostname.trim().toLowerCase().replace(/\.$/, "")
  const expected = normaliseWinningDomain(winningDomain)
  return actual === expected || actual === `www.${expected}`
}

function siteLimit(principal: SeoMonitoringPrincipal) {
  return getPlanConfig(principal.entitlements.isPro ? "pro" : "free").seoActiveSiteLimit
}

export async function createDailyLaunchSite(principal: SeoMonitoringPrincipal, input: {
  winnerEntryId: string
  url: string
  method: VerificationMethod
}) {
  assertEnabled()
  let parsed: URL
  try { parsed = new URL(input.url) } catch { throw new SeoMonitoringError("invalid_url", "Enter a valid HTTPS URL.", 400) }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new SeoMonitoringError("invalid_url", "Daily Launch Signal requires a public HTTPS URL.", 400)
  }
  parsed.hash = ""
  parsed.search = ""
  parsed.pathname = "/"
  const hostname = parsed.hostname.toLowerCase()

  const service = createServiceClient() as any
  const { data: entry, error: entryError } = await service.from("naming_shortlist_entries")
    .select("id,user_id,shortlist_id,primary_domain,is_winner")
    .eq("id", input.winnerEntryId).eq("user_id", principal.userId).eq("is_winner", true).maybeSingle()
  if (entryError) throw entryError
  if (!entry) throw new SeoMonitoringError("winner_required", "Choose and save a winning domain before monitoring it.", 400)
  const winningDomain = normaliseWinningDomain(entry.primary_domain)
  if (!isAllowedWinningHostname(hostname, winningDomain)) {
    throw new SeoMonitoringError("domain_mismatch", "The monitored URL must be the saved winning domain or its www variant.", 400)
  }
  const { data: shortlist, error: shortlistError } = await service.from("naming_shortlists")
    .select("project_id").eq("id", entry.shortlist_id).eq("user_id", principal.userId).single()
  if (shortlistError) throw shortlistError

  const { count, error: countError } = await service.from("seo_sites").select("id", { count: "exact", head: true })
    .eq("user_id", principal.userId).neq("status", "disconnected")
  if (countError) throw countError
  const limit = siteLimit(principal)
  if ((count || 0) >= limit) throw new SeoMonitoringError("site_limit_reached", `Your plan supports ${limit} verified live ${limit === 1 ? "URL" : "URLs"}.`, 403)

  // Prove the host is publicly reachable before creating an ownership challenge.
  await safeFetchUrl(parsed.toString(), {}, { maxBytes: 256_000, totalTimeoutMs: 10_000, maxRedirects: 3 })
  const now = new Date()
  const tier = principal.entitlements.isPro ? "pro" : "free"
  const { data: site, error: siteError } = await service.from("seo_sites").insert({
    user_id: principal.userId,
    project_id: shortlist.project_id,
    winner_entry_id: entry.id,
    url: parsed.toString(),
    normalized_url: parsed.toString(),
    origin: parsed.origin,
    hostname,
    status: "pending",
    monitoring_enabled: false,
    verification_status: "pending",
    access_tier: tier,
    crawl_page_limit: getPlanConfig(tier).seoDailyPageLimit,
    updated_at: now.toISOString(),
  }).select("*").single()
  if (siteError?.code === "23505") throw new SeoMonitoringError("site_exists", "This winning domain is already monitored.", 409)
  if (siteError) throw siteError

  const token = `namolux-site-verification=${randomBytes(24).toString("base64url")}`
  const { data: verification, error: verificationError } = await service.from("seo_site_verifications").insert({
    user_id: principal.userId,
    site_id: site.id,
    method: input.method,
    token_hash: sha256(token),
    token_hint: token.slice(-10),
    expires_at: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
  }).select("id,method,status,expires_at").single()
  if (verificationError) throw verificationError

  await service.from("seo_notification_preferences").upsert({
    user_id: principal.userId, site_id: site.id, daily_enabled: true, weekly_enabled: false,
  }, { onConflict: "site_id" })
  return {
    site,
    verification,
    token,
    dnsHost: `_namolux.${hostname}`,
    metaTag: `<meta name="namolux-site-verification" content="${token}">`,
    limit,
  }
}

async function publishedToken(site: any, method: VerificationMethod, token: string) {
  if (method === "dns_txt") {
    try {
      const rows = await resolveTxt(`_namolux.${site.hostname}`)
      return rows.some((parts) => parts.join("").trim() === token)
    } catch { return false }
  }
  const response = await safeFetchUrl(site.normalized_url, {}, { maxBytes: 512_000, totalTimeoutMs: 12_000, maxRedirects: 3 })
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`<meta[^>]+name=["']namolux-site-verification["'][^>]+content=["']${escaped}["']`, "i").test(response.text)
    || new RegExp(`<meta[^>]+content=["']${escaped}["'][^>]+name=["']namolux-site-verification["']`, "i").test(response.text)
}

export async function verifyDailyLaunchSite(principal: SeoMonitoringPrincipal, siteId: string, token: string) {
  assertEnabled()
  if (!token || token.length > 200) throw new SeoMonitoringError("invalid_token", "Use the exact verification token shown during setup.", 400)
  const service = createServiceClient() as any
  const { data: site, error: siteError } = await service.from("seo_sites").select("*")
    .eq("id", siteId).eq("user_id", principal.userId).maybeSingle()
  if (siteError) throw siteError
  if (!site) throw new SeoMonitoringError("site_not_found", "The monitored website was not found.", 404)
  const { data: verification, error: verificationError } = await service.from("seo_site_verifications").select("*")
    .eq("site_id", site.id).eq("user_id", principal.userId).eq("status", "pending").maybeSingle()
  if (verificationError) throw verificationError
  if (!verification || verification.token_hash !== sha256(token) || new Date(verification.expires_at).getTime() <= Date.now()) {
    throw new SeoMonitoringError("invalid_token", "This verification challenge is invalid or expired.", 400)
  }
  const valid = await publishedToken(site, verification.method, token)
  const attemptedAt = new Date().toISOString()
  if (!valid) {
    await service.from("seo_site_verifications").update({ attempt_count: verification.attempt_count + 1, last_attempt_at: attemptedAt, status: "pending", updated_at: attemptedAt }).eq("id", verification.id)
    throw new SeoMonitoringError("verification_not_found", "The verification record is not visible yet. DNS can take time to propagate.", 422)
  }
  await Promise.all([
    service.from("seo_site_verifications").update({ status: "verified", verified_at: attemptedAt, last_attempt_at: attemptedAt, updated_at: attemptedAt }).eq("id", verification.id),
    service.from("seo_sites").update({ verification_status: "verified", verified_at: attemptedAt, verification_recheck_at: new Date(Date.now() + 30 * DAY_MS).toISOString(), status: "active", monitoring_enabled: true, activated_at: attemptedAt, next_daily_audit_at: attemptedAt, pause_reason: null, updated_at: attemptedAt }).eq("id", site.id).eq("user_id", principal.userId),
  ])
  await enqueueDailyLaunchSite(site.id, principal.userId)
  return { verified: true, siteId: site.id }
}

export async function enqueueDailyLaunchSite(siteId: string, userId: string, date = new Date()) {
  const scheduleKey = getSeoScheduleKey("daily", date)
  const message: DailyLaunchMessage = { siteId, userId, scheduleKey }
  const result = await send(DAILY_LAUNCH_TOPIC, message, {
    idempotencyKey: `daily-launch:${siteId}:${scheduleKey}`,
    retentionSeconds: 86_400,
  })
  return { queued: true, messageId: result.messageId, scheduleKey }
}

export async function enqueueStaleDailyLaunchReports(principal: SeoMonitoringPrincipal) {
  assertEnabled()
  const service = createServiceClient() as any
  const staleBefore = new Date(Date.now() - DAY_MS).toISOString()
  const { data: sites, error } = await service.from("seo_sites").select("id,last_audit_at")
    .eq("user_id", principal.userId).eq("verification_status", "verified").eq("monitoring_enabled", true)
    .or(`last_audit_at.is.null,last_audit_at.lt.${staleBefore}`)
  if (error) throw error
  const queued = []
  for (const site of sites || []) queued.push(await enqueueDailyLaunchSite(site.id, principal.userId))
  return { queuedCount: queued.length, queued }
}

export async function getDailyLaunchSnapshot(principal: SeoMonitoringPrincipal) {
  const enabled = isDailyLaunchSignalEnabled()
  const service = createServiceClient() as any
  const [{ data: sites, error: siteError }, { data: entries, error: entryError }] = await Promise.all([
    service.from("seo_sites").select("*").eq("user_id", principal.userId).order("created_at", { ascending: false }),
    service.from("naming_shortlist_entries").select("id,candidate_name,primary_domain,shortlist_id,is_winner").eq("user_id", principal.userId).eq("is_winner", true).order("updated_at", { ascending: false }),
  ])
  if (siteError) throw siteError
  if (entryError) throw entryError
  const siteIds = (sites || []).map((site: any) => site.id)
  let reports: any[] = []
  let assessments: any[] = []
  if (siteIds.length) {
    const [{ data: reportRows, error: reportError }, { data: assessmentRows, error: assessmentError }] = await Promise.all([
      service.from("seo_reports").select("*").in("site_id", siteIds).order("created_at", { ascending: false }).limit(50),
      service.from("seo_agent_assessments").select("*").in("site_id", siteIds).order("created_at", { ascending: false }).limit(50),
    ])
    if (reportError) throw reportError
    if (assessmentError) throw assessmentError
    reports = reportRows || []
    assessments = assessmentRows || []
  }
  const plan = getPlanConfig(principal.entitlements.isPro ? "pro" : "free")
  return { enabled, isPro: principal.entitlements.isPro, siteLimit: plan.seoActiveSiteLimit, historyDays: plan.seoHistoryDays, winners: entries || [], sites: sites || [], reports, assessments }
}

export async function continueDailyLaunchSiteOnFree(principal: SeoMonitoringPrincipal, siteId: string) {
  assertEnabled()
  if (principal.entitlements.isPro) throw new SeoMonitoringError("not_required", "Your Pro monitoring allowance is already active.", 409)
  const service = createServiceClient() as any
  const { data: chosen, error } = await service.from("seo_sites").select("id").eq("id", siteId).eq("user_id", principal.userId).eq("verification_status", "verified").maybeSingle()
  if (error) throw error
  if (!chosen) throw new SeoMonitoringError("site_not_found", "Choose one of your verified websites.", 404)
  const now = new Date().toISOString()
  await service.from("seo_sites").update({ status: "paused", monitoring_enabled: false, pause_reason: "free_site_not_selected", updated_at: now }).eq("user_id", principal.userId).eq("verification_status", "verified").neq("id", siteId)
  await service.from("seo_sites").update({ status: "active", monitoring_enabled: true, pause_reason: null, access_tier: "free", crawl_page_limit: 3, next_daily_audit_at: now, updated_at: now }).eq("id", siteId).eq("user_id", principal.userId)
  await enqueueDailyLaunchSite(siteId, principal.userId)
  return { selected: true, siteId }
}

export async function explainDailyLaunchReport(principal: SeoMonitoringPrincipal, reportId: string) {
  assertEnabled()
  const service = createServiceClient() as any
  const { data: report, error: reportError } = await service.from("seo_reports").select("*").eq("id", reportId).maybeSingle()
  if (reportError) throw reportError
  if (!report?.audit_id) throw new SeoMonitoringError("report_not_found", "This report cannot be explained.", 404)
  const { data: site, error: siteError } = await service.from("seo_sites").select("id,hostname").eq("id", report.site_id).eq("user_id", principal.userId).maybeSingle()
  if (siteError) throw siteError
  if (!site) throw new SeoMonitoringError("report_not_found", "This report does not belong to your account.", 404)
  const { data: assessment, error: assessmentError } = await service.from("seo_agent_assessments").select("*").eq("audit_id", report.audit_id).eq("user_id", principal.userId).maybeSingle()
  if (assessmentError) throw assessmentError
  if (!assessment) throw new SeoMonitoringError("assessment_pending", "The evidence assessment is not ready yet.", 409)
  if (assessment.explanation) return { explanation: assessment.explanation, cached: true, model: assessment.model_name }

  const model = "openai/gpt-4.1-mini"
  const agent = new ToolLoopAgent({
    model,
    temperature: 0.15,
    maxOutputTokens: 650,
    instructions: "Explain one factual SEO report to a startup founder. Use only supplied evidence. Separate observed facts from inference, give at most three actions, mention partial or unavailable checks, never promise rankings, and never claim a legal or commercial guarantee.",
    providerOptions: { gateway: { tags: ["feature:daily-launch-signal", "action:explain-report"] } },
  })
  const result = await agent.generate({ prompt: JSON.stringify({ hostname: site.hostname, report: { title: report.title, summary: report.summary, scoreChange: report.score_change, data: report.report_data }, assessment: { changeState: assessment.change_state, priorities: assessment.priorities, evidence: assessment.evidence } }) })
  const explanation = result.text.trim()
  if (!explanation) throw new SeoMonitoringError("explanation_failed", "The report explanation was empty. Try again later.", 502)
  const explainedAt = new Date().toISOString()
  await service.from("seo_agent_assessments").update({ explanation, explained_at: explainedAt, model_used: true, model_name: model, model_version: "explicit-explain-v1" }).eq("id", assessment.id).eq("user_id", principal.userId).is("explained_at", null)
  return { explanation, cached: false, model }
}

export async function processDailyLaunchMessage(message: DailyLaunchMessage) {
  if (!message?.siteId || !message?.userId || !/^\d{4}-\d{2}-\d{2}$/.test(message.scheduleKey)) throw new Error("Invalid Daily Launch Signal message")
  const service = createServiceClient() as any
  const { data: site, error } = await service.from("seo_sites").select("*")
    .eq("id", message.siteId).eq("user_id", message.userId).eq("verification_status", "verified")
    .eq("monitoring_enabled", true).maybeSingle()
  if (error) throw error
  if (!site) return "skipped" as const
  const { count } = await service.from("seo_audits").select("id", { count: "exact", head: true }).eq("status", "running")
  if ((count || 0) >= 4) return "deferred" as const
  // Use the same audit type, schedule key, and idempotency key as cron so a
  // login catch-up racing the scheduler resolves to one durable daily audit.
  await runPersistedSeoAudit(site, "daily", getDailyLaunchAuditIdempotencyKey(site.id, message.scheduleKey), message.scheduleKey)
  return "processed" as const
}
