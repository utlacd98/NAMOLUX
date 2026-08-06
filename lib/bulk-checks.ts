import "server-only"

import { createHash, createHmac, randomUUID } from "node:crypto"
import { send } from "@vercel/queue"

import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import type { AvailabilityCheckResult } from "@/lib/domainGen/types"
import { getSupabaseServiceEnvironment } from "@/lib/env"
import { getUserEntitlements } from "@/lib/entitlements"
import {
  checkPlanFeatureQuotaIdempotentForSubject,
  refundPlanFeatureQuotaIdempotentForSubject,
  type QuotaSubject,
} from "@/lib/rate-limit"
import { FREE_MONTHLY_BULK_CHECK_LIMIT, PRO_MONTHLY_BULK_CHECK_LIMIT, type PlanId } from "@/lib/plans"
import { createServiceClient } from "@/lib/supabase/server"

export const BULK_CHECK_TLDS = ["com", "io", "co", "ai", "app", "dev"] as const
export type BulkCheckTld = (typeof BULK_CHECK_TLDS)[number]
export const BULK_CHECK_TOPIC = "bulk-availability-v1"
export const BULK_CHECK_FEATURE = "bulk-check-monthly"
export const BULK_CHECK_CACHE_MS = 15 * 60 * 1_000
// Guest jobs are not a saved-work surface. The browser keeps its capability
// token only in memory and the database removes the transient result shortly
// after a normal working session ends.
export const BULK_CHECK_ANONYMOUS_RETENTION_MS = 2 * 60 * 60 * 1_000
export const BULK_CHECK_MAX_NAMES = 50
export const BULK_CHECK_MAX_DOMAINS = BULK_CHECK_MAX_NAMES * BULK_CHECK_TLDS.length

type BulkCheckStatus = "queued" | "processing" | "completed" | "partial" | "failed"
type AvailabilityStatus = "available" | "taken" | "needs_verification"
type AvailabilityConfidence = "high" | "medium" | "low"

export type BulkCheckInput = {
  names: string[]
  tlds: BulkCheckTld[]
}

export type BulkCheckResult = {
  name: string
  tld: BulkCheckTld
  fullDomain: string
  status: AvailabilityStatus
  available: boolean | null
  confidence: AvailabilityConfidence
  provider: string
  checkedAt: string
  fromCache: boolean
  verificationRequired: boolean
}

export type BulkCheckJobSnapshot = {
  id: string
  status: BulkCheckStatus
  names: string[]
  tlds: BulkCheckTld[]
  totalChecks: number
  providerChecks: number
  cachedChecks: number
  providerFailures: number
  quotaCharged: boolean
  quotaRefunded: boolean
  queuedAt: string
  startedAt: string | null
  completedAt: string | null
  errorCode: string | null
  errorMessage: string | null
  results: BulkCheckResult[]
}

type JobRow = {
  id: string
  user_id: string | null
  subject_type: "user" | "anonymous"
  subject_hash: string
  access_token_hash: string | null
  expires_at: string | null
  idempotency_hash: string
  input_hash: string
  names: unknown
  tlds: unknown
  plan: PlanId
  status: BulkCheckStatus
  attempt_count: number
  worker_token: string | null
  lease_expires_at: string | null
  queue_message_id: string | null
  provider_checks: number
  cached_checks: number
  provider_failures: number
  quota_charged_at: string | null
  quota_refunded_at: string | null
  error_code: string | null
  error_message: string | null
  queued_at: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type JobResultRow = {
  job_id: string
  candidate_name: string
  tld: BulkCheckTld
  full_domain: string
  status: AvailabilityStatus
  confidence: AvailabilityConfidence
  provider: string
  checked_at: string
  from_cache: boolean
}

type DbCacheRow = {
  full_domain: string
  status: AvailabilityStatus
  confidence: AvailabilityConfidence
  provider: string
  checked_at: string
}

type CreateJobResult = {
  job: JobRow
  created: boolean
  guestAccessToken: string | null
}

type ClaimResult = { claimed: boolean; reason: string }

export class BulkCheckInputError extends Error {}
export class BulkCheckIdempotencyConflictError extends Error {}
export class BulkCheckQueueDeferredError extends Error {}

function service() {
  // Types are intentionally narrowed at this server-only persistence boundary.
  // Browser Supabase clients never receive access to these tables.
  return createServiceClient() as any
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function normaliseName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const name = value.trim().toLowerCase()
  if (name.length < 1 || name.length > 63) return null
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name) ? name : null
}

function normaliseTld(value: unknown): BulkCheckTld | null {
  if (typeof value !== "string") return null
  const tld = value.trim().toLowerCase().replace(/^\./, "")
  return (BULK_CHECK_TLDS as readonly string[]).includes(tld) ? tld as BulkCheckTld : null
}

function isBulkCheckTld(value: string): value is BulkCheckTld {
  return (BULK_CHECK_TLDS as readonly string[]).includes(value)
}

function asInputNames(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (typeof value === "string") return value.split(/[\n,]/g)
  return null
}

export function parseBulkCheckInput(body: unknown): BulkCheckInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BulkCheckInputError("Provide a list of candidate names.")
  }

  const payload = body as Record<string, unknown>
  const rawNames = asInputNames(payload.names ?? payload.domains)
  if (!rawNames || rawNames.length < 1 || rawNames.length > BULK_CHECK_MAX_NAMES) {
    throw new BulkCheckInputError(`Provide between 1 and ${BULK_CHECK_MAX_NAMES} candidate names.`)
  }

  const parsedNames = rawNames.map(normaliseName)
  if (parsedNames.some((name) => !name)) {
    throw new BulkCheckInputError("Each name must be a valid domain label (letters, numbers, and internal hyphens only).")
  }
  const names = Array.from(new Set(parsedNames as string[]))
  if (names.length < 1) throw new BulkCheckInputError("Provide at least one unique candidate name.")

  const rawTlds = payload.tlds === undefined ? BULK_CHECK_TLDS : payload.tlds
  if (!Array.isArray(rawTlds) || rawTlds.length < 1 || rawTlds.length > BULK_CHECK_TLDS.length) {
    throw new BulkCheckInputError("Choose between one and six supported extensions.")
  }
  const parsedTlds = rawTlds.map(normaliseTld)
  if (parsedTlds.some((tld) => !tld)) {
    throw new BulkCheckInputError("Use only .com, .io, .co, .ai, .app, or .dev.")
  }
  const selected = new Set(parsedTlds as BulkCheckTld[])
  const tlds = BULK_CHECK_TLDS.filter((tld) => selected.has(tld))
  if (names.length * tlds.length > BULK_CHECK_MAX_DOMAINS) {
    throw new BulkCheckInputError(`A batch may contain at most ${BULK_CHECK_MAX_DOMAINS} domain checks.`)
  }
  return { names, tlds }
}

export function getBulkCheckIdempotencyKey(request: Request, body: unknown): string {
  const headerKey = request.headers.get("idempotency-key")?.trim()
  const bodyKey = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).idempotencyKey
    : null
  const key = headerKey || (typeof bodyKey === "string" ? bodyKey.trim() : "")
  if (!/^[a-zA-Z0-9._:-]{16,200}$/.test(key)) {
    throw new BulkCheckInputError("A valid idempotency key is required to protect this bulk check from duplicate billing.")
  }
  return key
}

function inputFingerprint(input: BulkCheckInput): string {
  return sha256(JSON.stringify(input))
}

function guestAccessToken(subjectHash: string, idempotencyHash: string): string {
  const environment = getSupabaseServiceEnvironment()
  const secret = process.env.ANONYMOUS_ID_PEPPER?.trim() || environment.serviceRoleKey
  return createHmac("sha256", secret).update(`bulk-check:${subjectHash}:${idempotencyHash}`).digest("hex")
}

function jobIdempotencyKey(jobId: string): string {
  return `bulk-job-${jobId}`
}

function coerceNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && Boolean(normaliseName(item)))
}

function coerceTlds(value: unknown): BulkCheckTld[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is BulkCheckTld => typeof item === "string" && isBulkCheckTld(item))
}

function toPublicResult(row: JobResultRow): BulkCheckResult {
  return {
    name: row.candidate_name,
    tld: row.tld,
    fullDomain: row.full_domain,
    status: row.status,
    available: row.status === "available" ? true : row.status === "taken" ? false : null,
    confidence: row.confidence,
    provider: row.provider,
    checkedAt: row.checked_at,
    fromCache: row.from_cache,
    verificationRequired: row.status === "needs_verification" || row.confidence !== "high",
  }
}

function toSnapshot(job: JobRow, results: JobResultRow[]): BulkCheckJobSnapshot {
  const names = coerceNames(job.names)
  const tlds = coerceTlds(job.tlds)
  return {
    id: job.id,
    status: job.status,
    names,
    tlds,
    totalChecks: names.length * tlds.length,
    providerChecks: Number(job.provider_checks) || 0,
    cachedChecks: Number(job.cached_checks) || 0,
    providerFailures: Number(job.provider_failures) || 0,
    quotaCharged: Boolean(job.quota_charged_at),
    quotaRefunded: Boolean(job.quota_refunded_at),
    queuedAt: job.queued_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    errorCode: job.error_code,
    errorMessage: job.error_message,
    results: results.map(toPublicResult),
  }
}

async function existingJob(subject: QuotaSubject, idempotencyHash: string): Promise<JobRow | null> {
  const { data, error } = await service()
    .from("bulk_check_jobs")
    .select("*")
    .eq("subject_type", subject.subjectType)
    .eq("subject_hash", subject.subjectHash)
    .eq("idempotency_hash", idempotencyHash)
    .maybeSingle()
  if (error) throw error
  return data as JobRow | null
}

/**
 * Expire compact cache rows and anonymous results as normal worker traffic
 * arrives. Read access also enforces the expiry, so a temporary cleanup
 * failure can never turn a guest session into durable saved work.
 */
export async function pruneExpiredBulkCheckStorage(now = new Date()): Promise<void> {
  const cutoff = now.toISOString()
  const [anonymousJobs, cacheRows] = await Promise.all([
    service()
      .from("bulk_check_jobs")
      .delete()
      .eq("subject_type", "anonymous")
      .lt("expires_at", cutoff),
    service()
      .from("domain_availability_cache")
      .delete()
      .lt("expires_at", cutoff),
  ])

  if (anonymousJobs.error || cacheRows.error) {
    // Cleanup is intentionally best-effort. The expiry filter in
    // readBulkCheckJob remains the authorization boundary for anonymous
    // results if the database is briefly unavailable.
    console.warn("Bulk-check storage cleanup was deferred", {
      anonymousJobs: anonymousJobs.error?.message,
      cacheRows: cacheRows.error?.message,
    })
  }
}

export async function findBulkCheckJobByIdempotency(
  subject: QuotaSubject,
  idempotencyKey: string,
): Promise<JobRow | null> {
  return existingJob(subject, sha256(idempotencyKey))
}

/** Creates one durable job for an idempotency key, or returns its exact retry. */
export async function createOrGetBulkCheckJob(input: {
  subject: QuotaSubject
  requestInput: BulkCheckInput
  idempotencyKey: string
}): Promise<CreateJobResult> {
  await pruneExpiredBulkCheckStorage()

  const idempotencyHash = sha256(input.idempotencyKey)
  const fingerprint = inputFingerprint(input.requestInput)
  const rawGuestToken = input.subject.userId ? null : guestAccessToken(input.subject.subjectHash, idempotencyHash)
  const accessTokenHash = rawGuestToken ? sha256(rawGuestToken) : null

  const existing = await existingJob(input.subject, idempotencyHash)
  if (existing) {
    if (existing.input_hash !== fingerprint) {
      throw new BulkCheckIdempotencyConflictError("This idempotency key belongs to a different bulk check.")
    }
    return { job: existing, created: false, guestAccessToken: rawGuestToken }
  }

  const { data, error } = await service().from("bulk_check_jobs").insert({
    user_id: input.subject.userId,
    subject_type: input.subject.subjectType,
    subject_hash: input.subject.subjectHash,
    access_token_hash: accessTokenHash,
    expires_at: input.subject.userId
      ? null
      : new Date(Date.now() + BULK_CHECK_ANONYMOUS_RETENTION_MS).toISOString(),
    idempotency_hash: idempotencyHash,
    input_hash: fingerprint,
    names: input.requestInput.names,
    tlds: input.requestInput.tlds,
    plan: input.subject.plan,
  }).select("*").single()

  if (!error) return { job: data as JobRow, created: true, guestAccessToken: rawGuestToken }
  if (error.code !== "23505") throw error

  const raced = await existingJob(input.subject, idempotencyHash)
  if (!raced) throw error
  if (raced.input_hash !== fingerprint) {
    throw new BulkCheckIdempotencyConflictError("This idempotency key belongs to a different bulk check.")
  }
  return { job: raced, created: false, guestAccessToken: rawGuestToken }
}

/** Reads a job only when the authenticated owner or the anonymous capability matches. */
export async function readBulkCheckJob(input: {
  jobId: string
  subject: QuotaSubject
  guestAccessToken?: string | null
}): Promise<BulkCheckJobSnapshot | null> {
  let query = service().from("bulk_check_jobs").select("*").eq("id", input.jobId)
  if (input.subject.userId) {
    query = query.eq("user_id", input.subject.userId)
  } else {
    const token = input.guestAccessToken?.trim() || ""
    if (!/^[a-f0-9]{64}$/.test(token)) return null
    query = query
      .eq("subject_type", "anonymous")
      .eq("subject_hash", input.subject.subjectHash)
      .eq("access_token_hash", sha256(token))
      .gt("expires_at", new Date().toISOString())
  }
  const { data: jobData, error: jobError } = await query.maybeSingle()
  if (jobError) throw jobError
  if (!jobData) return null
  const job = jobData as JobRow
  const { data: resultData, error: resultError } = await service()
    .from("bulk_check_job_results")
    .select("job_id,candidate_name,tld,full_domain,status,confidence,provider,checked_at,from_cache")
    .eq("job_id", job.id)
    .order("created_at", { ascending: true })
  if (resultError) throw resultError
  return toSnapshot(job, (resultData || []) as JobResultRow[])
}

export function queueIsAvailable(): boolean {
  return process.env.VERCEL === "1"
}

/** Enqueue a job exactly once in Vercel; local development runs it inline. */
export async function enqueueBulkCheckJob(jobId: string): Promise<{ queued: boolean; messageId: string | null }> {
  if (!queueIsAvailable()) return { queued: false, messageId: null }
  const message = await send(BULK_CHECK_TOPIC, { jobId }, {
    idempotencyKey: jobId,
    retentionSeconds: 3_600,
  })
  const { error } = await service()
    .from("bulk_check_jobs")
    .update({ queue_message_id: message.messageId, updated_at: new Date().toISOString() })
    .eq("id", jobId)
  if (error) throw error
  return { queued: true, messageId: message.messageId }
}

function splitDomain(domain: string): { name: string; tld: BulkCheckTld } | null {
  const match = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.(com|io|co|ai|app|dev)$/.exec(domain)
  return match ? { name: match[1], tld: match[2] as BulkCheckTld } : null
}

function statusFromAvailability(result: AvailabilityCheckResult): AvailabilityStatus {
  if (result.error) return "needs_verification"
  return result.available ? "available" : "taken"
}

function rowFromAvailability(jobId: string, result: AvailabilityCheckResult, fromCache: boolean): JobResultRow | null {
  const parts = splitDomain(result.domain.toLowerCase())
  if (!parts) return null
  return {
    job_id: jobId,
    candidate_name: parts.name,
    tld: parts.tld,
    full_domain: result.domain.toLowerCase(),
    status: statusFromAvailability(result),
    confidence: result.error ? "low" : result.confidence,
    provider: (result.provider || "unknown").slice(0, 80),
    checked_at: new Date().toISOString(),
    from_cache: fromCache,
  }
}

function rowFromCache(jobId: string, cache: DbCacheRow): JobResultRow | null {
  const parts = splitDomain(cache.full_domain)
  if (!parts) return null
  return {
    job_id: jobId,
    candidate_name: parts.name,
    tld: parts.tld,
    full_domain: cache.full_domain,
    status: cache.status,
    confidence: cache.confidence,
    provider: cache.provider,
    checked_at: cache.checked_at,
    from_cache: true,
  }
}

async function upsertJobResults(rows: JobResultRow[]) {
  if (!rows.length) return
  const now = new Date().toISOString()
  const { error } = await service().from("bulk_check_job_results").upsert(
    rows.map((row) => ({ ...row, updated_at: now })),
    { onConflict: "job_id,full_domain" },
  )
  if (error) throw error
}

async function upsertCache(rows: JobResultRow[]) {
  const usable = rows.filter((row) => row.status !== "needs_verification")
  if (!usable.length) return
  const now = new Date()
  const expiresAt = new Date(now.getTime() + BULK_CHECK_CACHE_MS).toISOString()
  const { error } = await service().from("domain_availability_cache").upsert(
    usable.map((row) => ({
      full_domain: row.full_domain,
      status: row.status,
      confidence: row.confidence,
      provider: row.provider,
      checked_at: row.checked_at,
      expires_at: expiresAt,
      updated_at: now.toISOString(),
    })),
    { onConflict: "full_domain" },
  )
  if (error) throw error
}

async function finishJob(input: {
  jobId: string
  workerToken: string
  status: Exclude<BulkCheckStatus, "queued" | "processing">
  providerChecks: number
  cachedChecks: number
  providerFailures: number
  quotaRefunded?: boolean
  errorCode?: string | null
  errorMessage?: string | null
}) {
  const now = new Date().toISOString()
  const { error } = await service().from("bulk_check_jobs").update({
    status: input.status,
    provider_checks: input.providerChecks,
    cached_checks: input.cachedChecks,
    provider_failures: input.providerFailures,
    ...(input.quotaRefunded ? { quota_refunded_at: now } : {}),
    error_code: input.errorCode || null,
    error_message: input.errorMessage || null,
    completed_at: now,
    lease_expires_at: null,
    updated_at: now,
  }).eq("id", input.jobId).eq("worker_token", input.workerToken)
  if (error) throw error
}

async function loadJob(jobId: string): Promise<JobRow | null> {
  const { data, error } = await service().from("bulk_check_jobs").select("*").eq("id", jobId).maybeSingle()
  if (error) throw error
  return data as JobRow | null
}

async function claimJob(jobId: string, workerToken: string): Promise<ClaimResult> {
  const { data, error } = await service().rpc("claim_bulk_check_job", {
    p_job_id: jobId,
    p_worker_token: workerToken,
  })
  if (error) throw error
  const claim = Array.isArray(data) ? data[0] : data
  return {
    claimed: Boolean(claim?.claimed),
    reason: typeof claim?.reason === "string" ? claim.reason : "unavailable",
  }
}

async function cacheForDomains(domains: string[]): Promise<DbCacheRow[]> {
  if (!domains.length) return []
  const { data, error } = await service()
    .from("domain_availability_cache")
    .select("full_domain,status,confidence,provider,checked_at")
    .in("full_domain", domains)
    .gt("expires_at", new Date().toISOString())
  if (error) throw error
  return (data || []) as DbCacheRow[]
}

function isFullProviderFailure(results: AvailabilityCheckResult[], providerChecks: number): boolean {
  return providerChecks > 0 && results.length === providerChecks && results.every((result) => Boolean(result.error))
}

export function isBulkCheckClaimDeferred(reason: string): boolean {
  return reason === "global_capacity" || reason === "account_capacity" || reason === "already_processing"
}

/**
 * Claims and processes one job. The function is safe under at-least-once queue
 * delivery: the database claim gate serializes active work and the quota key is
 * derived from the stable job ID.
 */
export async function processBulkCheckJob(jobId: string): Promise<"processed" | "deferred" | "skipped"> {
  const workerToken = randomUUID()
  const claim = await claimJob(jobId, workerToken)
  if (!claim.claimed) {
    // A duplicate delivery may arrive while a prior worker still holds its
    // lease. The retry must survive until that lease can be reclaimed after a
    // crash; acknowledging it here would strand the job in "processing".
    return isBulkCheckClaimDeferred(claim.reason) ? "deferred" : "skipped"
  }

  const job = await loadJob(jobId)
  if (!job) return "skipped"
  const names = coerceNames(job.names)
  const tlds = coerceTlds(job.tlds)
  if (!names.length || !tlds.length) {
    await finishJob({
      jobId,
      workerToken,
      status: "failed",
      providerChecks: 0,
      cachedChecks: 0,
      providerFailures: 0,
      errorCode: "invalid_job_input",
      errorMessage: "This saved bulk check could not be read safely.",
    })
    return "processed"
  }

  let subject: QuotaSubject = {
    userId: job.user_id,
    subjectType: job.subject_type,
    subjectHash: job.subject_hash,
    plan: job.plan === "pro" ? "pro" : "free",
    accessState: job.plan === "pro" ? "active" : "free",
  }
  if (job.user_id) {
    const entitlements = await getUserEntitlements(job.user_id)
    subject = {
      ...subject,
      plan: entitlements.isPro ? "pro" : "free",
      accessState: entitlements.accessState,
    }
    if (subject.accessState === "expired") {
      await finishJob({
        jobId,
        workerToken,
        status: "failed",
        providerChecks: 0,
        cachedChecks: 0,
        providerFailures: 0,
        errorCode: "subscription_lapsed_read_only",
        errorMessage: "This account is now read-only. Renew Pro before starting another Bulk Check.",
      })
      return "processed"
    }
  }
  const allowance = await checkPlanFeatureQuotaIdempotentForSubject(
    subject,
    BULK_CHECK_FEATURE,
    { free: FREE_MONTHLY_BULK_CHECK_LIMIT, pro: PRO_MONTHLY_BULK_CHECK_LIMIT },
    jobIdempotencyKey(job.id),
  )
  if (!allowance.allowed) {
    await finishJob({
      jobId,
      workerToken,
      status: "failed",
      providerChecks: 0,
      cachedChecks: 0,
      providerFailures: 0,
      errorCode: allowance.statusCode === 503 ? "usage_check_unavailable" : "monthly_limit_reached",
      errorMessage: allowance.message || "This month's bulk-check allowance has been used.",
    })
    return "processed"
  }
  const { error: chargeError } = await service().from("bulk_check_jobs").update({
    quota_charged_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", jobId).eq("worker_token", workerToken)
  if (chargeError) throw chargeError

  const fullDomains = names.flatMap((name) => tlds.map((tld) => `${name}.${tld}`))
  const cached = await cacheForDomains(fullDomains)
  const cachedRows = cached.map((row) => rowFromCache(jobId, row)).filter((row): row is JobResultRow => Boolean(row))
  await upsertJobResults(cachedRows)
  const cachedDomains = new Set(cachedRows.map((row) => row.full_domain))
  const uncachedDomains = fullDomains.filter((domain) => !cachedDomains.has(domain))

  const stagedRows: JobResultRow[] = []
  let progressWrites = Promise.resolve()
  const flushProgress = () => {
    const rows = stagedRows.splice(0, stagedRows.length)
    if (!rows.length) return progressWrites
    progressWrites = progressWrites.then(() => upsertJobResults(rows))
    return progressWrites
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 42_000)
  let availability: AvailabilityCheckResult[] = []
  let providerPipelineFailed = false
  try {
    availability = await checkAvailabilityBatch(uncachedDomains, {
      signal: controller.signal,
      concurrency: 8,
      maxRetries: 1,
      backoffMs: 100,
      dnsTimeoutMs: 2_000,
      rdapTimeoutMs: 2_500,
      ttlMs: 0,
      cache: false,
      onResult: async (result) => {
        const row = rowFromAvailability(jobId, result, false)
        if (!row) return
        stagedRows.push(row)
        if (stagedRows.length >= 8) await flushProgress()
      },
    })
  } catch (error) {
    providerPipelineFailed = true
    console.error("Bulk availability worker encountered a provider error:", error)
  } finally {
    clearTimeout(timeout)
    await flushProgress()
  }

  const providerRows = availability
    .map((result) => rowFromAvailability(jobId, result, false))
    .filter((row): row is JobResultRow => Boolean(row))
  await upsertJobResults(providerRows)
  await upsertCache(providerRows)

  const providerFailures = availability.filter((result) => Boolean(result.error)).length
  const fullProviderFailure = (providerPipelineFailed && availability.length === 0)
    || isFullProviderFailure(availability, uncachedDomains.length)
  let quotaRefunded = false
  if (fullProviderFailure) {
    const refund = await refundPlanFeatureQuotaIdempotentForSubject(subject, BULK_CHECK_FEATURE, jobIdempotencyKey(job.id))
    quotaRefunded = refund.refunded
  }
  const hasUsableProviderResult = providerRows.some((row) => row.status !== "needs_verification")
  const hasAnyVisibleResult = cachedRows.length > 0 || providerRows.length > 0
  const status: Exclude<BulkCheckStatus, "queued" | "processing"> = fullProviderFailure && !cachedRows.length
    ? "failed"
    : providerFailures > 0 || !hasUsableProviderResult || controller.signal.aborted
      ? "partial"
      : "completed"

  await finishJob({
    jobId,
    workerToken,
    status,
    providerChecks: uncachedDomains.length,
    cachedChecks: cachedRows.length,
    providerFailures,
    quotaRefunded,
    errorCode: status === "completed" ? null : fullProviderFailure ? "providers_unavailable" : "partial_provider_result",
    errorMessage: status === "completed"
      ? null
      : fullProviderFailure
        ? "Every provider check failed, so this run was not charged. Please try again later."
        : hasAnyVisibleResult
          ? "Some domains need verification because a provider did not return a conclusive result."
          : "No conclusive availability results were returned before the job deadline.",
  })
  return "processed"
}
