import { NextRequest, NextResponse } from "next/server"

import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { parseCompiledNameSprintPayload } from "@/lib/name-sprint/constitution"
import { runNameSprint } from "@/lib/name-sprint/engine"
import { completeNameSprintRun, failNameSprintRun, loadRecentNameSprintFatigue, persistNameConstitution, startNameSprintRun } from "@/lib/name-sprint/persistence"
import { consumeNameSprintEmptyRefundAllowance, consumeNameSprintQuota, refundNameSprintQuota } from "@/lib/name-sprint/access"
import { getNameSprintModel } from "@/lib/name-sprint/openai"
import { checkBurstLimit, getQuotaSubject } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 90

export async function POST(request: NextRequest) {
  const blocked = getGeneratorLabApiBlockResponse(request)
  if (blocked) return blocked
  const subject = await getQuotaSubject(request)
  if (!subject.userId) return NextResponse.json({ error: "Sign in is required to use Name Sprint." }, { status: 401 })
  const burst = await checkBurstLimit(request, "lab-name-generation", 2, 60)
  if (!burst.allowed) return NextResponse.json({ error: "Please wait a moment before starting another lab generation.", retryAfter: burst.resetAt }, { status: burst.unavailable ? 503 : 429 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const parsed = parseCompiledNameSprintPayload(body)
  if (!parsed) return NextResponse.json({ error: "Confirm a complete Name Constitution and at least four semantic territories before generating." }, { status: 400 })
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : ""
  let quota
  try {
    quota = await consumeNameSprintQuota(subject, idempotencyKey)
  } catch {
    return NextResponse.json({ error: "A valid generation request key is required." }, { status: 400 })
  }
  if (!quota.allowed) {
    const cadence = subject.plan === "pro" ? "monthly" : "daily"
    return NextResponse.json({
      error: quota.statusCode === 503
        ? quota.message
        : `Your ${cadence} Name Sprint allowance has been used.`,
      quota,
    }, { status: quota.statusCode })
  }
  if (quota.replayed) {
    return NextResponse.json({
      error: "This generation request was already used. Start a new Name Sprint request instead of replaying it.",
      quota,
    }, { status: 409 })
  }
  const previouslyRejected = Array.isArray(body?.previouslyRejected)
    ? body.previouslyRejected.filter((item): item is string => typeof item === "string").slice(0, 200)
    : []
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 85_000)
  const started = Date.now()
  const suppliedBriefId = typeof body?.briefId === "string" ? body.briefId : null
  const briefId = suppliedBriefId || await persistNameConstitution({ userId: subject.userId, ...parsed })
  if (!briefId) {
    await refundNameSprintQuota(subject, idempotencyKey)
    clearTimeout(timer)
    return NextResponse.json({ error: "The naming brief could not be reserved. Please retry; no Name Sprint allowance was used." }, { status: 503 })
  }
  const runId = await startNameSprintRun({ userId: subject.userId, briefId, model: getNameSprintModel() })
  if (!runId) {
    await refundNameSprintQuota(subject, idempotencyKey)
    clearTimeout(timer)
    return NextResponse.json({ error: "The Name Sprint could not be reserved. Please retry; no allowance was used." }, { status: 503 })
  }
  try {
    const fatigue = await loadRecentNameSprintFatigue(subject.userId)
    const result = await runNameSprint({
      ...parsed,
      signal: controller.signal,
      userIdentifier: subject.userId,
      previouslyRejected: Array.from(new Set([...previouslyRejected, ...fatigue.previouslySeen])),
      recentRootFrequency: fatigue.recentRootFrequency,
    })
    const rejectionCodeCounts = result.rejected.reduce<Record<string, number>>((counts, candidate) => {
      for (const code of candidate.eligibility.failureCodes) counts[code] = (counts[code] || 0) + 1
      return counts
    }, {})
    console.info("name-sprint-generation-complete", {
      generatedCount: result.generatedCount,
      survivorCount: result.survivorCount,
      rejectedCount: result.rejected.length,
      attempts: result.attempts,
      durationMs: Date.now() - started,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      estimatedUsd: result.usage.estimatedUsd,
      webSearchCalls: result.usage.webSearchCalls,
      timingMs: result.timingMs,
      rejectionCodeCounts,
    })
    await completeNameSprintRun({ userId: subject.userId, runId, constitution: parsed.constitution, result, latencyMs: Date.now() - started })
    let emptyResultRefunded = false
    if (result.survivorCount === 0) {
      const refundAllowance = await consumeNameSprintEmptyRefundAllowance(subject, `empty:${idempotencyKey}`)
      if (refundAllowance.allowed && !refundAllowance.replayed) {
        const refund = await refundNameSprintQuota(subject, idempotencyKey)
        emptyResultRefunded = refund.refunded
      }
    }
    const discoveryCandidates = result.candidates.map((candidate) => {
      const publicCandidate = { ...candidate } as Partial<typeof candidate>
      delete publicCandidate.founderSignal
      return {
        ...publicCandidate,
        strongestReason: "Passed the Name Sprint hard gate and has a verified exact launch domain.",
        mainRisk: "Run Founder Signal and check the official registers before committing to this name.",
      }
    })
    return NextResponse.json({
      ...result,
      candidates: discoveryCandidates,
      briefId,
      runId,
      emptyResultRefunded,
      retryAllowed: emptyResultRefunded,
      quota: {
        ...quota,
        remaining: Math.max(0, quota.remaining + (emptyResultRefunded ? 1 : 0)),
      },
    })
  } catch (error) {
    await failNameSprintRun(subject.userId, runId, error instanceof Error ? error.message : "unknown")
    await refundNameSprintQuota(subject, idempotencyKey)
    console.error("name-sprint-generation-failed", { code: error instanceof Error ? error.message : "unknown", durationMs: Date.now() - started })
    return NextResponse.json({ error: "The quality pass could not complete. Please retry; no Name Sprint allowance was used.", retryable: true }, { status: 503 })
  } finally { clearTimeout(timer) }
}
