import { NextRequest, NextResponse } from "next/server"

import {
  BULK_CHECK_FEATURE,
  BulkCheckIdempotencyConflictError,
  BulkCheckInputError,
  createOrGetBulkCheckJob,
  enqueueBulkCheckJob,
  findBulkCheckJobByIdempotency,
  getBulkCheckIdempotencyKey,
  parseBulkCheckInput,
  processBulkCheckJob,
  queueIsAvailable,
  readBulkCheckJob,
} from "@/lib/bulk-checks"
import { isDecisionWorkspaceEnabled } from "@/lib/decision-workspace"
import { FREE_MONTHLY_BULK_CHECK_LIMIT, PRO_MONTHLY_BULK_CHECK_LIMIT } from "@/lib/plans"
import {
  checkBurstLimit,
  getPlanFeatureQuotaReplayStateForSubject,
  getPlanFeatureQuotaStateForSubject,
  getQuotaSubject,
  QuotaSubjectUnavailableError,
} from "@/lib/rate-limit"

export const maxDuration = 60

const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BULK_START_BURST_LIMIT = 4

function allowanceError(input: {
  status: 429 | 503
  message?: string
  used: number
  limit: number
  remaining: number
  resetAt: string | null
}) {
  return NextResponse.json({
    error: input.status === 503 ? "usage_check_unavailable" : "bulk_check_monthly_limit_reached",
    message: input.message || "This month's bulk-check allowance has been used.",
    upgradeUrl: "/pricing?reason=bulk-check-limit&from=bulk-check",
    used: input.used,
    limit: input.limit,
    remaining: input.remaining,
    resetAt: input.resetAt,
  }, { status: input.status })
}

export async function POST(request: NextRequest) {
  if (!isDecisionWorkspaceEnabled()) {
    return NextResponse.json({
      error: "decision_workspace_paused",
      message: "Bulk Check is temporarily paused while we complete maintenance. Please try again shortly.",
    }, { status: 503 })
  }

  try {
    const body = await request.json().catch(() => null)
    const requestInput = parseBulkCheckInput(body)
    const idempotencyKey = getBulkCheckIdempotencyKey(request, body)

    const burst = await checkBurstLimit(request, "bulk-check-start", BULK_START_BURST_LIMIT)
    if (!burst.allowed) {
      return NextResponse.json({
        error: "bulk_check_rate_limited",
        message: "Please wait a moment before starting another bulk check.",
        resetAt: burst.resetAt,
      }, { status: burst.unavailable ? 503 : 429 })
    }

    const subject = await getQuotaSubject(request)
    if (subject.accessState === "expired") {
      return NextResponse.json({
        error: "subscription_lapsed_read_only",
        message: "Your saved decision work remains available to read, export, or delete. Renew Pro to start another Bulk Check.",
        upgradeUrl: "/pricing?reason=renew-workspace&from=bulk-check",
      }, { status: 403 })
    }
    const existing = await findBulkCheckJobByIdempotency(subject, idempotencyKey)
    if (!existing) {
      const replay = await getPlanFeatureQuotaReplayStateForSubject(subject, BULK_CHECK_FEATURE, idempotencyKey)
      if (replay.unavailable) {
        return allowanceError({ status: 503, used: 0, limit: 0, remaining: 0, resetAt: null })
      }
      const allowance = await getPlanFeatureQuotaStateForSubject(subject, BULK_CHECK_FEATURE, {
        free: FREE_MONTHLY_BULK_CHECK_LIMIT,
        pro: PRO_MONTHLY_BULK_CHECK_LIMIT,
      })
      if (!allowance.allowed && !replay.replayed) {
        return allowanceError({
          status: allowance.statusCode as 429 | 503,
          message: allowance.message,
          used: allowance.used,
          limit: allowance.limit,
          remaining: allowance.remaining,
          resetAt: allowance.resetAt,
        })
      }
    }

    const created = await createOrGetBulkCheckJob({ subject, requestInput, idempotencyKey })
    if (created.created || created.job.status === "queued") {
      try {
        if (queueIsAvailable()) {
          await enqueueBulkCheckJob(created.job.id)
        } else {
          // Local development has no Vercel consumer. Running inline keeps
          // preview and browser verification representative without exposing a
          // second public worker endpoint.
          await processBulkCheckJob(created.job.id)
        }
      } catch (error) {
        console.error("Bulk check enqueue failed:", error)
        return NextResponse.json({
          error: "bulk_check_queue_unavailable",
          message: "Your check is saved safely but could not be queued yet. Retry this exact request shortly.",
          jobId: created.job.id,
          ...(created.guestAccessToken ? { jobToken: created.guestAccessToken } : {}),
        }, { status: 503 })
      }
    }

    const snapshot = await readBulkCheckJob({
      jobId: created.job.id,
      subject,
      guestAccessToken: created.guestAccessToken,
    })
    return NextResponse.json({
      success: true,
      replayed: !created.created,
      job: snapshot,
      ...(created.guestAccessToken ? { jobToken: created.guestAccessToken } : {}),
      pollAfterMs: snapshot?.status === "queued" || snapshot?.status === "processing" ? 1_000 : null,
    }, { status: created.created ? 202 : 200 })
  } catch (error) {
    if (error instanceof QuotaSubjectUnavailableError) {
      return NextResponse.json({
        error: "usage_check_unavailable",
        message: "Your workspace access could not be verified. Please try again shortly.",
      }, { status: 503 })
    }
    if (error instanceof BulkCheckInputError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 })
    }
    if (error instanceof BulkCheckIdempotencyConflictError) {
      return NextResponse.json({ error: "idempotency_conflict", message: error.message }, { status: 409 })
    }
    console.error("Bulk check creation failed:", error)
    return NextResponse.json({ error: "bulk_check_failed", message: "Bulk Check could not be started." }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("id")?.trim() || ""
  if (!JOB_ID_PATTERN.test(jobId)) {
    return NextResponse.json({ error: "invalid_bulk_check", message: "A valid bulk-check job is required." }, { status: 400 })
  }

  try {
    const subject = await getQuotaSubject(request)
    const snapshot = await readBulkCheckJob({
      jobId,
      subject,
      guestAccessToken: request.nextUrl.searchParams.get("token") || request.headers.get("x-bulk-check-token"),
    })
    if (!snapshot) {
      return NextResponse.json({ error: "bulk_check_not_found", message: "This bulk check is unavailable." }, { status: 404 })
    }
    return NextResponse.json({
      success: true,
      job: snapshot,
      pollAfterMs: snapshot.status === "queued" || snapshot.status === "processing" ? 1_000 : null,
    })
  } catch (error) {
    if (error instanceof QuotaSubjectUnavailableError) {
      return NextResponse.json({
        error: "usage_check_unavailable",
        message: "Your workspace access could not be verified. Please try again shortly.",
      }, { status: 503 })
    }
    console.error("Bulk check read failed:", error)
    return NextResponse.json({ error: "bulk_check_read_failed", message: "Bulk Check could not be loaded." }, { status: 500 })
  }
}
