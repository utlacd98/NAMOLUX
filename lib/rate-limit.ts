import { createHash, createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { getUserEntitlements } from "@/lib/entitlements"
import type { AccessState } from "@/lib/entitlements"
import { getSupabaseServiceEnvironment } from "@/lib/env"
import {
  FREE_MONTHLY_USAGE_LIMIT,
  TOKEN_METERED_FEATURES,
  canUseBrandPalette,
  getPlanConfig,
  type PlanId,
} from "@/lib/plans"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export type FeatureType =
  | "quick"
  | "domain"
  | "bulk"
  | "seo"
  | "palette"
  | "deep-search"
  | "analyze"
  | "name-tools"
  | "ai-chat"

export interface RateLimitResult {
  allowed: boolean
  isPro: boolean
  userId: string | null
  tokensUsed: number
  tokensTotal: number
  remaining: number
  plan: PlanId
  resetAt: string | null
  canUseBrandPalette: boolean
  statusCode: 200 | 403 | 429 | 503
  message?: string
}

export interface EntitlementState {
  isPro: boolean
  userId: string | null
  plan: PlanId
}

export interface FeatureQuotaResult extends EntitlementState {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  resetAt: string | null
  statusCode: 200 | 429 | 503
  message?: string
}

export interface IdempotentFeatureQuotaResult extends FeatureQuotaResult {
  replayed: boolean
  receiptCreatedAt: string | null
}

export interface FeatureQuotaReplayState {
  replayed: boolean
  unavailable: boolean
}

/** Finite allowances for a feature that applies to both Free and Pro. */
export type PlanFeatureQuotaLimits = {
  free: number
  pro: number
}

/**
 * Server-only identity used by durable jobs. Do not serialize this to a
 * browser: its opaque subject hash is solely for quota and job ownership.
 */
export type QuotaSubject = {
  userId: string | null
  subjectType: "user" | "anonymous"
  subjectHash: string
  plan: PlanId
  accessState: AccessState
}

/**
 * The decision workspace must not downgrade a signed-in user to Free when
 * billing state cannot be read. Doing so could let a lapsed account create a
 * new check or score during a transient profile/database failure.
 */
export class QuotaSubjectUnavailableError extends Error {
  constructor() {
    super("Workspace entitlement state is temporarily unavailable")
    this.name = "QuotaSubjectUnavailableError"
  }
}

type QuotaWindow = { start: Date; reset: Date }

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

function hashSubject(value: string): string {
  const environment = getSupabaseServiceEnvironment()
  const pepper = process.env.ANONYMOUS_ID_PEPPER?.trim() || environment.serviceRoleKey
  return createHmac("sha256", pepper).update(value).digest("hex")
}

function validateIdempotency(feature: string, idempotencyKey: string) {
  if (!/^[a-z0-9-]{3,64}$/.test(feature) || !/^[a-zA-Z0-9._:-]{16,200}$/.test(idempotencyKey)) {
    throw new Error("Invalid feature idempotency configuration")
  }
}

function idempotencyHash(idempotencyKey: string): string {
  return createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 24)
}

function idempotencyFeature(feature: string, idempotencyKey: string): string {
  return `idem:${feature}:${idempotencyHash(idempotencyKey)}`
}

function getMonthWindow(now = new Date()): QuotaWindow {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    reset: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  }
}

function getFixedWindow(seconds: number, now = new Date()): QuotaWindow {
  const duration = Math.max(1, Math.floor(seconds)) * 1_000
  const start = new Date(Math.floor(now.getTime() / duration) * duration)
  return { start, reset: new Date(start.getTime() + duration) }
}

type RequestIdentity = {
  userId: string | null
  subjectType: "user" | "anonymous"
  subjectHash: string
}

function buildIdentity(request: NextRequest, userId: string | null): RequestIdentity {
  const rawSubject = userId ? `user:${userId}` : `anonymous:${getClientIP(request)}`
  return {
    userId,
    subjectType: userId ? "user" : "anonymous",
    subjectHash: hashSubject(rawSubject),
  }
}

async function getIdentity(request: NextRequest): Promise<RequestIdentity> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return buildIdentity(request, user?.id || null)
}

/**
 * Quick Generate remains usable during a transient Auth outage, but only with
 * anonymous/free privileges. Keeping this fallback private to the Quick
 * helpers prevents an unavailable identity provider from granting paid access
 * or bypassing paid-feature checks elsewhere.
 */
async function getQuickIdentity(request: NextRequest): Promise<RequestIdentity> {
  try {
    return await getIdentity(request)
  } catch (error) {
    console.error("Quick Generate auth lookup unavailable; continuing as anonymous free.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    return buildIdentity(request, null)
  }
}

async function resolvePlan(userId: string | null): Promise<PlanId> {
  if (!userId) return "free"
  try {
    const entitlements = await getUserEntitlements(userId)
    return entitlements.isPro ? "pro" : "free"
  } catch (error) {
    console.error("Entitlement lookup failed closed:", error)
    return "free"
  }
}

export async function getQuotaSubject(request: NextRequest): Promise<QuotaSubject> {
  const identity = await getIdentity(request)
  if (!identity.userId) {
    return { ...identity, plan: "free", accessState: "free" }
  }
  try {
    const entitlements = await getUserEntitlements(identity.userId)
    return {
      ...identity,
      plan: entitlements.isPro ? "pro" : "free",
      accessState: entitlements.accessState || (entitlements.isPro ? "active" : "free"),
    }
  } catch (error) {
    console.error("Workspace entitlement lookup unavailable:", error)
    throw new QuotaSubjectUnavailableError()
  }
}

export async function getEntitlementState(request: NextRequest): Promise<EntitlementState> {
  const identity = await getIdentity(request)
  const plan = await resolvePlan(identity.userId)
  return {
    isPro: getPlanConfig(plan).isPaid,
    userId: identity.userId,
    plan,
  }
}

/**
 * Reads Quick Generate entitlement with an anonymous/free fallback when Auth
 * is unreachable. A failed lookup can never advertise or grant Pro.
 */
export async function getQuickEntitlementState(request: NextRequest): Promise<EntitlementState> {
  const identity = await getQuickIdentity(request)
  const plan = await resolvePlan(identity.userId)
  return {
    isPro: getPlanConfig(plan).isPaid,
    userId: identity.userId,
    plan,
  }
}

async function consumeCounter(input: {
  subjectType: string
  subjectHash: string
  feature: string
  window: QuotaWindow
  limit: number
}) {
  const service = createServiceClient()
  const { data, error } = await service.rpc("consume_usage_counter", {
    p_subject_type: input.subjectType,
    p_subject_hash: input.subjectHash,
    p_feature: input.feature,
    p_window_start: input.window.start.toISOString(),
    p_reset_at: input.window.reset.toISOString(),
    p_limit: input.limit,
  })
  if (error) throw error
  const result = data?.[0]
  if (!result) throw new Error("Quota database returned no result")
  return result
}

async function consumeCounterIdempotent(input: {
  subjectType: string
  subjectHash: string
  feature: string
  idempotencyKey: string
  window: QuotaWindow
  limit: number
}) {
  const service = createServiceClient()
  const { data, error } = await service.rpc("consume_usage_counter_idempotent", {
    p_subject_type: input.subjectType,
    p_subject_hash: input.subjectHash,
    p_feature: input.feature,
    p_idempotency_hash: idempotencyHash(input.idempotencyKey),
    p_window_start: input.window.start.toISOString(),
    p_reset_at: input.window.reset.toISOString(),
    p_limit: input.limit,
  })
  if (error) throw error
  const result = data?.[0]
  if (!result) throw new Error("Idempotent quota database returned no result")
  if (!result.allowed) return { ...result, receipt: null }

  const receipt = await readIdempotencyReceipt(input)
  if (!receipt) throw new Error("Idempotent quota database returned no receipt")
  return { ...result, receipt }
}

type IdempotencyReceipt = {
  usageCount: number
  createdAt: string
}

async function readIdempotencyReceipt(input: {
  subjectType: string
  subjectHash: string
  feature: string
  idempotencyKey: string
  window: QuotaWindow
}): Promise<IdempotencyReceipt | null> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("usage_counters")
    .select("usage_count,created_at")
    .eq("subject_type", input.subjectType)
    .eq("subject_hash", input.subjectHash)
    .eq("feature", idempotencyFeature(input.feature, input.idempotencyKey))
    .eq("window_start", input.window.start.toISOString())
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const usageCount = Number(data.usage_count)
  const createdAt = String(data.created_at || "")
  if (!Number.isSafeInteger(usageCount) || usageCount < 0 || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error("Idempotent quota receipt is malformed")
  }
  return { usageCount, createdAt }
}

async function ensureIdempotencyReceipt(input: {
  subjectType: string
  subjectHash: string
  feature: string
  idempotencyKey: string
  window: QuotaWindow
  usageCount: number
}): Promise<IdempotencyReceipt> {
  const service = createServiceClient()
  const { error } = await service.from("usage_counters").upsert(
    {
      subject_type: input.subjectType,
      subject_hash: input.subjectHash,
      feature: idempotencyFeature(input.feature, input.idempotencyKey),
      window_start: input.window.start.toISOString(),
      reset_at: input.window.reset.toISOString(),
      usage_count: input.usageCount,
    },
    {
      onConflict: "subject_type,subject_hash,feature,window_start",
      ignoreDuplicates: true,
    },
  )
  if (error) throw error
  const receipt = await readIdempotencyReceipt(input)
  if (!receipt) throw new Error("Could not create idempotent quota receipt")
  return receipt
}

async function readCounter(subjectType: string, subjectHash: string, feature: string, window: QuotaWindow) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("usage_counters")
    .select("usage_count")
    .eq("subject_type", subjectType)
    .eq("subject_hash", subjectHash)
    .eq("feature", feature)
    .eq("window_start", window.start.toISOString())
    .maybeSingle()
  if (error) throw error
  return data?.usage_count || 0
}

function isTokenMeteredFeature(featureType: FeatureType) {
  return (TOKEN_METERED_FEATURES as readonly string[]).includes(featureType)
}

function buildState(input: {
  allowed: boolean
  plan: PlanId
  userId: string | null
  used: number
  resetAt: string | null
  statusCode?: RateLimitResult["statusCode"]
  message?: string
}): RateLimitResult {
  const config = getPlanConfig(input.plan)
  return {
    allowed: input.allowed,
    isPro: config.isPaid,
    userId: input.userId,
    tokensUsed: config.isPaid ? 0 : input.used,
    tokensTotal: config.monthlyUsageLimit,
    remaining: config.isPaid ? -1 : Math.max(0, FREE_MONTHLY_USAGE_LIMIT - input.used),
    plan: input.plan,
    resetAt: input.resetAt,
    canUseBrandPalette: config.canUseBrandPalette,
    statusCode: input.statusCode || 200,
    message: input.message,
  }
}

export async function getRateLimitState(request: NextRequest): Promise<RateLimitResult> {
  const identity = await getIdentity(request)
  const plan = await resolvePlan(identity.userId)
  if (plan === "pro") return buildState({ allowed: true, plan, userId: identity.userId, used: 0, resetAt: null })
  const window = getMonthWindow()
  const used = await readCounter(identity.subjectType, identity.subjectHash, "monthly-metered", window)
  return buildState({
    allowed: used < FREE_MONTHLY_USAGE_LIMIT,
    plan,
    userId: identity.userId,
    used,
    resetAt: window.reset.toISOString(),
    statusCode: used < FREE_MONTHLY_USAGE_LIMIT ? 200 : 429,
  })
}

export async function checkRateLimit(
  request: NextRequest,
  featureType: FeatureType = "domain",
): Promise<RateLimitResult> {
  const identity = await getIdentity(request)
  const plan = await resolvePlan(identity.userId)
  const config = getPlanConfig(plan)

  if (featureType === "palette" && !canUseBrandPalette(plan)) {
    return buildState({
      allowed: false,
      plan,
      userId: identity.userId,
      used: 0,
      resetAt: null,
      statusCode: 403,
      message: "Brand palette is available on the paid plan.",
    })
  }
  if (config.isPaid || !isTokenMeteredFeature(featureType)) {
    return buildState({ allowed: true, plan, userId: identity.userId, used: 0, resetAt: null })
  }

  const window = getMonthWindow()
  try {
    const result = await consumeCounter({
      subjectType: identity.subjectType,
      subjectHash: identity.subjectHash,
      feature: "monthly-metered",
      window,
      limit: FREE_MONTHLY_USAGE_LIMIT,
    })
    return buildState({
      allowed: result.allowed,
      plan,
      userId: identity.userId,
      used: result.used,
      resetAt: window.reset.toISOString(),
      statusCode: result.allowed ? 200 : 429,
      message: result.allowed ? undefined : "Free plan includes 3 uses per month. Upgrade for unlimited access.",
    })
  } catch (error) {
    console.error("Atomic quota check failed closed:", error)
    return buildState({
      allowed: false,
      plan,
      userId: identity.userId,
      used: FREE_MONTHLY_USAGE_LIMIT,
      resetAt: window.reset.toISOString(),
      statusCode: 503,
      message: "Usage checks are temporarily unavailable. Please try again shortly.",
    })
  }
}

export async function checkBurstLimit(
  request: NextRequest,
  feature: string,
  limit: number,
  windowSeconds = 60,
) {
  const identity = await getIdentity(request)
  const window = getFixedWindow(windowSeconds)
  try {
    const result = await consumeCounter({
      subjectType: identity.subjectType,
      subjectHash: identity.subjectHash,
      feature: `burst:${feature}`,
      window,
      limit,
    })
    return { allowed: result.allowed, used: result.used, resetAt: window.reset.toISOString(), unavailable: false }
  } catch (error) {
    console.error(`Burst limit failed closed for ${feature}:`, error)
    return { allowed: false, used: limit, resetAt: window.reset.toISOString(), unavailable: true }
  }
}

/**
 * Quick-specific burst protection. If Auth is temporarily unreachable, the
 * request is still counted against the anonymous IP-derived subject instead
 * of bypassing abuse controls or failing generation outright.
 */
export async function checkQuickBurstLimit(
  request: NextRequest,
  limit: number,
  windowSeconds = 60,
) {
  const identity = await getQuickIdentity(request)
  const window = getFixedWindow(windowSeconds)
  try {
    const result = await consumeCounter({
      subjectType: identity.subjectType,
      subjectHash: identity.subjectHash,
      feature: "burst:quick-generate",
      window,
      limit,
    })
    return { allowed: result.allowed, used: result.used, resetAt: window.reset.toISOString(), unavailable: false }
  } catch (error) {
    console.error("Burst limit failed closed for quick-generate:", error)
    return { allowed: false, used: limit, resetAt: window.reset.toISOString(), unavailable: true }
  }
}

/**
 * Atomically consumes one unit from an isolated feature allowance.
 *
 * Feature names are server-owned constants. Keeping each allowance on its own
 * usage_counters key prevents unrelated product actions from consuming the
 * same monthly budget. Paid plans bypass counters under fair-use terms.
 */
export async function checkFeatureQuota(
  request: NextRequest,
  feature: string,
  limit: number,
): Promise<FeatureQuotaResult> {
  if (!/^[a-z0-9-]{3,64}$/.test(feature) || !Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Invalid feature quota configuration")
  }

  const identity = await getIdentity(request)
  const plan = await resolvePlan(identity.userId)
  const isPro = getPlanConfig(plan).isPaid
  if (isPro) {
    return {
      allowed: true,
      isPro: true,
      userId: identity.userId,
      plan,
      used: 0,
      limit: -1,
      remaining: -1,
      resetAt: null,
      statusCode: 200,
    }
  }

  const window = getMonthWindow()
  try {
    const result = await consumeCounter({
      subjectType: identity.subjectType,
      subjectHash: identity.subjectHash,
      feature,
      window,
      limit,
    })
    const used = Math.max(0, Number(result.used) || 0)
    return {
      allowed: Boolean(result.allowed),
      isPro: false,
      userId: identity.userId,
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt: window.reset.toISOString(),
      statusCode: result.allowed ? 200 : 429,
      message: result.allowed ? undefined : "This month's free allowance has been used.",
    }
  } catch (error) {
    console.error(`Feature quota failed closed for ${feature}:`, error)
    return {
      allowed: false,
      isPro: false,
      userId: identity.userId,
      plan,
      used: limit,
      limit,
      remaining: 0,
      resetAt: window.reset.toISOString(),
      statusCode: 503,
      message: "Usage checks are temporarily unavailable. Please try again shortly.",
    }
  }
}

/**
 * Atomically consumes a feature allowance once for a client workflow key.
 * Repeating the same key returns the existing allowance state without charging
 * another unit. Only a short SHA-256 prefix is persisted in usage_counters.
 */
export async function checkFeatureQuotaIdempotent(
  request: NextRequest,
  feature: string,
  limit: number,
  idempotencyKey: string,
): Promise<IdempotentFeatureQuotaResult> {
  validateIdempotency(feature, idempotencyKey)
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("Invalid feature quota configuration")

  const identity = await getIdentity(request)
  const plan = await resolvePlan(identity.userId)
  const isPro = getPlanConfig(plan).isPaid
  const window = getMonthWindow()
  if (isPro) {
    try {
      const receipt = await ensureIdempotencyReceipt({
        subjectType: identity.subjectType,
        subjectHash: identity.subjectHash,
        feature,
        idempotencyKey,
        window,
        usageCount: 0,
      })
      return {
        allowed: true,
        replayed: false,
        receiptCreatedAt: receipt.createdAt,
        isPro: true,
        userId: identity.userId,
        plan,
        used: 0,
        limit: -1,
        remaining: -1,
        resetAt: null,
        statusCode: 200,
      }
    } catch (error) {
      console.error(`Idempotent feature receipt failed closed for ${feature}:`, error)
      return {
        allowed: false,
        replayed: false,
        receiptCreatedAt: null,
        isPro: true,
        userId: identity.userId,
        plan,
        used: 0,
        limit: -1,
        remaining: -1,
        resetAt: null,
        statusCode: 503,
        message: "Usage checks are temporarily unavailable. Please try again shortly.",
      }
    }
  }

  try {
    const result = await consumeCounterIdempotent({
      subjectType: identity.subjectType,
      subjectHash: identity.subjectHash,
      feature,
      idempotencyKey,
      window,
      limit,
    })
    const used = Math.max(0, Number(result.receipt?.usageCount ?? result.used) || 0)
    return {
      allowed: Boolean(result.allowed),
      replayed: Boolean(result.replayed),
      receiptCreatedAt: result.receipt?.createdAt || null,
      isPro: false,
      userId: identity.userId,
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt: window.reset.toISOString(),
      statusCode: result.allowed ? 200 : 429,
      message: result.allowed ? undefined : "This month's free allowance has been used.",
    }
  } catch (error) {
    console.error(`Idempotent feature quota failed closed for ${feature}:`, error)
    return {
      allowed: false,
      replayed: false,
      receiptCreatedAt: null,
      isPro: false,
      userId: identity.userId,
      plan,
      used: limit,
      limit,
      remaining: 0,
      resetAt: window.reset.toISOString(),
      statusCode: 503,
      message: "Usage checks are temporarily unavailable. Please try again shortly.",
    }
  }
}

/** Reads whether this exact workflow key was already charged. */
export async function getFeatureQuotaReplayState(
  request: NextRequest,
  feature: string,
  idempotencyKey: string,
): Promise<FeatureQuotaReplayState> {
  validateIdempotency(feature, idempotencyKey)
  const identity = await getIdentity(request)
  const plan = await resolvePlan(identity.userId)
  if (getPlanConfig(plan).isPaid) return { replayed: false, unavailable: false }

  const window = getMonthWindow()
  try {
    const used = await readCounter(
      identity.subjectType,
      identity.subjectHash,
      idempotencyFeature(feature, idempotencyKey),
      window,
    )
    return { replayed: used > 0, unavailable: false }
  } catch (error) {
    console.error(`Feature replay lookup failed closed for ${feature}:`, error)
    return { replayed: false, unavailable: true }
  }
}

/** Reads an isolated monthly allowance without consuming it. */
export async function getFeatureQuotaState(
  request: NextRequest,
  feature: string,
  limit: number,
): Promise<FeatureQuotaResult> {
  if (!/^[a-z0-9-]{3,64}$/.test(feature) || !Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Invalid feature quota configuration")
  }

  const identity = await getIdentity(request)
  const plan = await resolvePlan(identity.userId)
  const isPro = getPlanConfig(plan).isPaid
  if (isPro) {
    return {
      allowed: true,
      isPro: true,
      userId: identity.userId,
      plan,
      used: 0,
      limit: -1,
      remaining: -1,
      resetAt: null,
      statusCode: 200,
    }
  }

  const window = getMonthWindow()
  try {
    const used = Math.max(0, Number(await readCounter(identity.subjectType, identity.subjectHash, feature, window)) || 0)
    const allowed = used < limit
    return {
      allowed,
      isPro: false,
      userId: identity.userId,
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt: window.reset.toISOString(),
      statusCode: allowed ? 200 : 429,
      message: allowed ? undefined : "This month's free allowance has been used.",
    }
  } catch (error) {
    console.error(`Feature quota preflight failed closed for ${feature}:`, error)
    return {
      allowed: false,
      isPro: false,
      userId: identity.userId,
      plan,
      used: limit,
      limit,
      remaining: 0,
      resetAt: window.reset.toISOString(),
      statusCode: 503,
      message: "Usage checks are temporarily unavailable. Please try again shortly.",
    }
  }
}

function validatePlanQuotaLimits(limits: PlanFeatureQuotaLimits) {
  for (const limit of [limits.free, limits.pro]) {
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new Error("Plan feature quota limits must be positive integers")
    }
  }
}

function planQuotaLimit(plan: PlanId, limits: PlanFeatureQuotaLimits): number {
  return plan === "pro" ? limits.pro : limits.free
}

function buildPlanFeatureQuotaResult(input: {
  subject: QuotaSubject
  allowed: boolean
  used: number
  limit: number
  resetAt: string | null
  statusCode: 200 | 429 | 503
  message?: string
}): FeatureQuotaResult {
  return {
    allowed: input.allowed,
    isPro: input.subject.plan === "pro",
    userId: input.subject.userId,
    plan: input.subject.plan,
    used: input.used,
    limit: input.limit,
    remaining: Math.max(0, input.limit - input.used),
    resetAt: input.resetAt,
    statusCode: input.statusCode,
    message: input.message,
  }
}

/**
 * Reads a finite Free/Pro allowance without consuming it. Unlike the legacy
 * fair-use helpers, Pro is deliberately metered here as part of the £7.99
 * decision-workspace offer.
 */
export async function getPlanFeatureQuotaStateForSubject(
  subject: QuotaSubject,
  feature: string,
  limits: PlanFeatureQuotaLimits,
): Promise<FeatureQuotaResult> {
  if (!/^[a-z0-9-]{3,64}$/.test(feature)) throw new Error("Invalid feature quota configuration")
  validatePlanQuotaLimits(limits)

  const window = getMonthWindow()
  const limit = planQuotaLimit(subject.plan, limits)
  try {
    const used = Math.max(0, Number(await readCounter(subject.subjectType, subject.subjectHash, feature, window)) || 0)
    return buildPlanFeatureQuotaResult({
      subject,
      allowed: used < limit,
      used,
      limit,
      resetAt: window.reset.toISOString(),
      statusCode: used < limit ? 200 : 429,
      message: used < limit ? undefined : "This month's workspace allowance has been used.",
    })
  } catch (error) {
    console.error(`Plan feature quota preflight failed closed for ${feature}:`, error)
    return buildPlanFeatureQuotaResult({
      subject,
      allowed: false,
      used: limit,
      limit,
      resetAt: window.reset.toISOString(),
      statusCode: 503,
      message: "Usage checks are temporarily unavailable. Please try again shortly.",
    })
  }
}

export async function getPlanFeatureQuotaState(
  request: NextRequest,
  feature: string,
  limits: PlanFeatureQuotaLimits,
): Promise<FeatureQuotaResult> {
  return getPlanFeatureQuotaStateForSubject(await getQuotaSubject(request), feature, limits)
}

export async function getPlanFeatureQuotaReplayStateForSubject(
  subject: QuotaSubject,
  feature: string,
  idempotencyKey: string,
): Promise<FeatureQuotaReplayState> {
  validateIdempotency(feature, idempotencyKey)
  const window = getMonthWindow()
  try {
    const used = await readCounter(
      subject.subjectType,
      subject.subjectHash,
      idempotencyFeature(feature, idempotencyKey),
      window,
    )
    return { replayed: used > 0, unavailable: false }
  } catch (error) {
    console.error(`Plan feature replay lookup failed closed for ${feature}:`, error)
    return { replayed: false, unavailable: true }
  }
}

export async function getPlanFeatureQuotaReplayState(
  request: NextRequest,
  feature: string,
  idempotencyKey: string,
): Promise<FeatureQuotaReplayState> {
  return getPlanFeatureQuotaReplayStateForSubject(await getQuotaSubject(request), feature, idempotencyKey)
}

/** Atomically consumes one unit of a finite Free/Pro allowance. */
export async function checkPlanFeatureQuotaIdempotentForSubject(
  subject: QuotaSubject,
  feature: string,
  limits: PlanFeatureQuotaLimits,
  idempotencyKey: string,
): Promise<IdempotentFeatureQuotaResult> {
  validateIdempotency(feature, idempotencyKey)
  validatePlanQuotaLimits(limits)

  const window = getMonthWindow()
  const limit = planQuotaLimit(subject.plan, limits)
  try {
    const result = await consumeCounterIdempotent({
      subjectType: subject.subjectType,
      subjectHash: subject.subjectHash,
      feature,
      idempotencyKey,
      window,
      limit,
    })
    const used = Math.max(0, Number(result.receipt?.usageCount ?? result.used) || 0)
    return {
      ...buildPlanFeatureQuotaResult({
        subject,
        allowed: Boolean(result.allowed),
        used,
        limit,
        resetAt: window.reset.toISOString(),
        statusCode: result.allowed ? 200 : 429,
        message: result.allowed ? undefined : "This month's workspace allowance has been used.",
      }),
      replayed: Boolean(result.replayed),
      receiptCreatedAt: result.receipt?.createdAt || null,
    }
  } catch (error) {
    console.error(`Plan idempotent feature quota failed closed for ${feature}:`, error)
    return {
      ...buildPlanFeatureQuotaResult({
        subject,
        allowed: false,
        used: limit,
        limit,
        resetAt: window.reset.toISOString(),
        statusCode: 503,
        message: "Usage checks are temporarily unavailable. Please try again shortly.",
      }),
      replayed: false,
      receiptCreatedAt: null,
    }
  }
}

export async function checkPlanFeatureQuotaIdempotent(
  request: NextRequest,
  feature: string,
  limits: PlanFeatureQuotaLimits,
  idempotencyKey: string,
): Promise<IdempotentFeatureQuotaResult> {
  return checkPlanFeatureQuotaIdempotentForSubject(await getQuotaSubject(request), feature, limits, idempotencyKey)
}

/**
 * A fully failed provider run must not cost a monthly allowance. This only
 * removes the matching immutable receipt and exactly one aggregate unit.
 */
export async function refundPlanFeatureQuotaIdempotentForSubject(
  subject: QuotaSubject,
  feature: string,
  idempotencyKey: string,
): Promise<{ refunded: boolean; unavailable: boolean }> {
  validateIdempotency(feature, idempotencyKey)
  const window = getMonthWindow()
  try {
    const service = createServiceClient()
    const { data, error } = await service.rpc("refund_usage_counter_idempotent", {
      p_subject_type: subject.subjectType,
      p_subject_hash: subject.subjectHash,
      p_feature: feature,
      p_idempotency_hash: idempotencyHash(idempotencyKey),
      p_window_start: window.start.toISOString(),
    })
    if (error) throw error
    return { refunded: Boolean(data), unavailable: false }
  } catch (error) {
    console.error(`Plan feature quota refund failed for ${feature}:`, error)
    return { refunded: false, unavailable: true }
  }
}

/** Records successful work for analytics without storing the visitor's raw IP. */
export async function logGeneration(
  request: NextRequest,
  userId: string | null,
  generationType: FeatureType = "domain",
  keyword?: string,
  resultsCount = 0,
): Promise<void> {
  const subjectHash = hashSubject(userId ? `user:${userId}` : `anonymous:${getClientIP(request)}`)
  const service = createServiceClient()
  const { error } = await service.from("generation_logs").insert({
    user_id: userId,
    ip_address: null,
    subject_hash: subjectHash,
    user_agent: request.headers.get("user-agent")?.slice(0, 1_000) || null,
    generation_type: generationType,
    keyword_used: keyword?.slice(0, 200) || null,
    results_count: Math.max(0, Math.floor(resultsCount)),
  })
  if (error) throw error
}
