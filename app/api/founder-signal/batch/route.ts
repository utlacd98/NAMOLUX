import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createGeneratedNameId } from "@/lib/domainGen/generatedName"
import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"
import { ADVANCED_SCORING_TOKEN_TTL_MS, verifyGenerationWorkflowToken } from "@/lib/generation-workflow-token"
import { isGeneratorRedesignEnabled } from "@/lib/generator-flags"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { hasSystemReservedName, systemReservedNameError } from "@/lib/reserved-names"
import {
  checkBurstLimit,
  checkFeatureQuotaIdempotent,
  getClientIP,
  getEntitlementState,
  getFeatureQuotaReplayState,
  getFeatureQuotaState,
} from "@/lib/rate-limit"

const MAX_CANDIDATES = 20
const SCORING_BURST_LIMIT = 10
const SUPPORTED_TLDS = new Set(["com", "io", "co", "ai", "app", "dev"])
const SUPPORTED_VIBES = new Set<BrandVibe>(["luxury", "futuristic", "playful", "trustworthy", "minimal", ""])

type ScoringCandidate = {
  id: string
  name: string
}

function workflowIdentity(request: NextRequest, userId: string | null): string {
  return userId ? `user:${userId}` : `anonymous:${getClientIP(request)}`
}

function normaliseCandidate(value: unknown): ScoringCandidate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const id = typeof input.id === "string" ? input.id.trim() : ""
  const name = typeof input.name === "string"
    ? input.name.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 63)
    : ""
  if (!/^name_[a-z0-9]+$/.test(id) || name.length < 3) return null
  return { id, name }
}

export async function POST(request: NextRequest) {
  const labBlock = getGeneratorLabApiBlockResponse(request)
  if (labBlock) return labBlock

  if (!isGeneratorRedesignEnabled()) {
    return NextResponse.json({ error: "feature_disabled" }, { status: 404 })
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid JSON request is required" }, { status: 400 })
    }

    const workflowToken = typeof body.workflowToken === "string" ? body.workflowToken : ""
    const rawCandidates = Array.isArray(body.candidates) ? body.candidates : []
    if (!workflowToken || rawCandidates.length < 1 || rawCandidates.length > MAX_CANDIDATES) {
      return NextResponse.json(
        { error: `Provide a workflow token and between 1 and ${MAX_CANDIDATES} generated candidates.` },
        { status: 400 },
      )
    }
    const rawCandidateNames = rawCandidates.map((value: unknown) => value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).name
      : null)
    if (hasSystemReservedName(rawCandidateNames)) {
      return NextResponse.json(systemReservedNameError(), { status: 400 })
    }

    const candidates = rawCandidates.map(normaliseCandidate)
    if (candidates.some((candidate: ScoringCandidate | null) => candidate === null)) {
      return NextResponse.json({ error: "Every candidate must include its generated id and name." }, { status: 400 })
    }
    const safeCandidates = candidates as ScoringCandidate[]
    if (
      new Set(safeCandidates.map((candidate) => candidate.id)).size !== safeCandidates.length ||
      new Set(safeCandidates.map((candidate) => candidate.name)).size !== safeCandidates.length
    ) {
      return NextResponse.json({ error: "Candidate ids and names must be unique." }, { status: 400 })
    }
    if (safeCandidates.some((candidate, index) => candidate.id !== createGeneratedNameId(candidate.name, index + 1))) {
      return NextResponse.json(
        { error: "invalid_candidate_id", message: "Candidate ids must match the original Advanced generation order." },
        { status: 400 },
      )
    }

    // Authenticate the request and validate the Advanced-only token before
    // consuming the monthly scoring allowance. A Quick or availability token
    // cannot be replayed against this endpoint because the scope is signed.
    const entitlement = await getEntitlementState(request)
    const subject = `advanced-founder-signal:${workflowIdentity(request, entitlement.userId)}`
    const names = safeCandidates.map((candidate) => candidate.name)
    if (!verifyGenerationWorkflowToken(
      workflowToken,
      names,
      subject,
      Date.now(),
      ADVANCED_SCORING_TOKEN_TTL_MS,
      { binding: "ordered" },
    )) {
      return NextResponse.json(
        { error: "invalid_workflow_token", message: "This shortlist has expired. Generate a new Advanced batch to score it." },
        { status: 403 },
      )
    }

    const burst = await checkBurstLimit(request, "founder-signal-batch", SCORING_BURST_LIMIT)
    if (!burst.allowed) {
      return NextResponse.json(
        {
          error: "founder_signal_rate_limited",
          message: "Please wait a moment before scoring another shortlist.",
          resetAt: burst.resetAt,
        },
        { status: burst.unavailable ? 503 : 429 },
      )
    }

    const requestedTld = typeof body.tld === "string" ? body.tld.toLowerCase().replace(/^\./, "") : "com"
    const tld = SUPPORTED_TLDS.has(requestedTld) ? requestedTld : "com"
    const requestedVibe = typeof body.vibe === "string" ? body.vibe.toLowerCase() as BrandVibe : ""
    const vibe = SUPPORTED_VIBES.has(requestedVibe) ? requestedVibe : ""
    const scoringQuotaKey = createHash("sha256")
      .update(`${workflowToken}\0${tld}\0${vibe}`)
      .digest("hex")

    const replayState = await getFeatureQuotaReplayState(
      request,
      "founder-signal-batch-monthly",
      scoringQuotaKey,
    )
    if (replayState.unavailable) {
      return NextResponse.json(
        { error: "usage_check_unavailable", message: "Usage checks are temporarily unavailable. Please try again shortly." },
        { status: 503 },
      )
    }

    const preflight = await getFeatureQuotaState(request, "founder-signal-batch-monthly", 1)
    if (!preflight.allowed && !replayState.replayed) {
      const unavailable = preflight.statusCode === 503
      return NextResponse.json(
        {
          error: unavailable ? "usage_check_unavailable" : "founder_signal_monthly_limit_reached",
          message: unavailable
            ? preflight.message
            : "The free plan includes one complete Founder Signal batch per month. Upgrade for unlimited fair-use scoring.",
          upgradeUrl: "/pricing",
          resetAt: preflight.resetAt,
          tokensUsed: preflight.used,
          tokensTotal: preflight.limit,
          remaining: preflight.remaining,
        },
        { status: preflight.statusCode },
      )
    }

    if (request.signal.aborted) {
      return NextResponse.json({ error: "scoring_cancelled" }, { status: 499 })
    }

    // map() deliberately preserves generation order. Scoring annotates the
    // shortlist; it never silently removes or promotes a candidate.
    const results = safeCandidates.map((candidate) => {
      const score = scoreName({ name: candidate.name, tld, vibe })
      return {
        id: candidate.id,
        name: candidate.name,
        founderSignal: {
          status: "ready" as const,
          score: score.score,
          band: score.band,
          breakdown: score.rawScores,
          reasons: score.reasons,
          version: score.version,
        },
      }
    })

    if (request.signal.aborted) {
      return NextResponse.json({ error: "scoring_cancelled" }, { status: 499 })
    }

    // Scoring completed successfully. Consume only after the deterministic
    // work so an exception remains safely retryable. The atomic RPC still
    // resolves races before any scores are returned.
    const allowance = await checkFeatureQuotaIdempotent(
      request,
      "founder-signal-batch-monthly",
      1,
      scoringQuotaKey,
    )
    if (!allowance.allowed) {
      const unavailable = allowance.statusCode === 503
      return NextResponse.json(
        {
          error: unavailable ? "usage_check_unavailable" : "founder_signal_monthly_limit_reached",
          message: unavailable
            ? allowance.message
            : "The free plan includes one complete Founder Signal batch per month. Upgrade for unlimited fair-use scoring.",
          upgradeUrl: "/pricing",
          resetAt: allowance.resetAt,
          tokensUsed: allowance.used,
          tokensTotal: allowance.limit,
          remaining: allowance.remaining,
        },
        { status: allowance.statusCode },
      )
    }

    return NextResponse.json({
      success: true,
      replayed: allowance.replayed,
      results,
      allowance: {
        used: allowance.used,
        limit: allowance.limit,
        remaining: allowance.remaining,
        resetAt: allowance.resetAt,
      },
    })
  } catch (error) {
    console.error("Founder Signal batch scoring failed:", error)
    return NextResponse.json({ error: "Failed to score this shortlist" }, { status: 500 })
  }
}
