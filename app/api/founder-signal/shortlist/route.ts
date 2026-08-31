import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"
import { hasSystemReservedName, systemReservedNameError } from "@/lib/reserved-names"
import { FREE_FOUNDER_SIGNAL_BATCH_LIMIT, PRO_FOUNDER_SIGNAL_BATCH_LIMIT } from "@/lib/plans"
import {
  checkBurstLimit,
  checkPlanFeatureQuotaIdempotentForSubject,
  getPlanFeatureQuotaReplayStateForSubject,
  getPlanFeatureQuotaStateForSubject,
  getQuotaSubject,
  QuotaSubjectUnavailableError,
} from "@/lib/rate-limit"

const MAX_NAMES = 50
const SCORING_BURST_LIMIT = 6
const SUPPORTED_TLDS = new Set(["com", "io", "co", "ai", "app", "dev"])
const SUPPORTED_VIBES = new Set<BrandVibe>(["luxury", "futuristic", "playful", "trustworthy", "minimal", ""])

type ScoredNameInput = {
  name: string
  tld: string
  fullDomain: string
}

function normaliseTld(value: unknown): string | null {
  if (typeof value !== "string") return null
  const tld = value.trim().toLowerCase().replace(/^\./, "")
  return SUPPORTED_TLDS.has(tld) ? tld : null
}

function normaliseName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const name = value.trim().toLowerCase().replace(/\.[a-z0-9-]+$/i, "")
  if (name.length < 1 || name.length > 63) return null
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name) ? name : null
}

function parseNames(body: Record<string, unknown>, primaryTld: string): ScoredNameInput[] | null {
  const rawNames = body.names
  if (Array.isArray(rawNames)) {
    const names = rawNames.map(normaliseName)
    if (names.some((name) => !name)) return null
    return Array.from(new Set(names as string[])).map((name) => ({
      name,
      tld: primaryTld,
      fullDomain: `${name}.${primaryTld}`,
    }))
  }

  // Compatibility for a prior checked-domain payload. Deliberately discard
  // other extensions: Founder Signal compares every candidate on one primary
  // TLD, never a mixed extension set.
  const rawDomains = body.domains
  if (!Array.isArray(rawDomains) || rawDomains.length < 1 || rawDomains.length > 300) return null
  const names = rawDomains.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null
    return normaliseName((value as Record<string, unknown>).name)
  })
  if (names.some((name) => !name)) return null
  return Array.from(new Set(names as string[])).map((name) => ({
    name,
    tld: primaryTld,
    fullDomain: `${name}.${primaryTld}`,
  }))
}

function quotaError(input: {
  status: 429 | 503
  message?: string
  used: number
  limit: number
  remaining: number
  resetAt: string | null
}) {
  return NextResponse.json({
    error: input.status === 503 ? "usage_check_unavailable" : "founder_signal_monthly_limit_reached",
    message: input.message || "This month's Founder Signal allowance has been used.",
    upgradeUrl: "/pricing?reason=founder-signal-limit&from=founder-signal",
    used: input.used,
    limit: input.limit,
    remaining: input.remaining,
    resetAt: input.resetAt,
  }, { status: input.status })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "invalid_founder_signal", message: "Provide a shortlist to score." }, { status: 400 })
    }
    const payload = body as Record<string, unknown>
    const rawCandidateNames = Array.isArray(payload.names)
      ? payload.names
      : Array.isArray(payload.domains)
        ? payload.domains.map((value) => value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).name : null)
        : []
    if (hasSystemReservedName(rawCandidateNames)) {
      return NextResponse.json(systemReservedNameError(), { status: 400 })
    }
    const suppliedPrimaryTld = payload.primaryTld === undefined ? "com" : normaliseTld(payload.primaryTld)
    if (!suppliedPrimaryTld) {
      return NextResponse.json({
        error: "invalid_founder_signal",
        message: "Choose .com, .io, .co, .ai, .app, or .dev as the primary extension.",
      }, { status: 400 })
    }
    const primaryTld = suppliedPrimaryTld
    const candidates = parseNames(payload, primaryTld)
    if (!candidates || candidates.length < 1 || candidates.length > MAX_NAMES) {
      return NextResponse.json({
        error: "invalid_founder_signal",
        message: `Founder Signal accepts between 1 and ${MAX_NAMES} valid candidate names.`,
      }, { status: 400 })
    }

    const rawVibe = typeof payload.vibe === "string" ? payload.vibe.trim().toLowerCase() as BrandVibe : ""
    const vibe = SUPPORTED_VIBES.has(rawVibe) ? rawVibe : ""
    const quotaKey = createHash("sha256")
      .update(JSON.stringify({ names: candidates.map(({ name }) => name), primaryTld, vibe }))
      .digest("hex")

    const burst = await checkBurstLimit(request, "founder-signal-shortlist", SCORING_BURST_LIMIT)
    if (!burst.allowed) {
      return NextResponse.json({
        error: "founder_signal_rate_limited",
        message: "Please wait a moment before scoring another shortlist.",
        resetAt: burst.resetAt,
      }, { status: burst.unavailable ? 503 : 429 })
    }

    const subject = await getQuotaSubject(request)
    if (subject.accessState === "expired") {
      return NextResponse.json({
        error: "subscription_lapsed_read_only",
        message: "Your saved decision work remains available to read, export, or delete. Renew Pro to run Founder Signal again.",
        upgradeUrl: "/pricing?reason=renew-workspace&from=founder-signal",
      }, { status: 403 })
    }
    const replay = await getPlanFeatureQuotaReplayStateForSubject(subject, "founder-signal-batch-monthly", quotaKey)
    if (replay.unavailable) return quotaError({ status: 503, used: 0, limit: 0, remaining: 0, resetAt: null })

    const preflight = await getPlanFeatureQuotaStateForSubject(subject, "founder-signal-batch-monthly", {
      free: FREE_FOUNDER_SIGNAL_BATCH_LIMIT,
      pro: PRO_FOUNDER_SIGNAL_BATCH_LIMIT,
    })
    if (!preflight.allowed && !replay.replayed) {
      return quotaError({
        status: preflight.statusCode as 429 | 503,
        message: preflight.message,
        used: preflight.used,
        limit: preflight.limit,
        remaining: preflight.remaining,
        resetAt: preflight.resetAt,
      })
    }

    // This is the sole public score calculation. Clients only render the
    // server-returned snapshot, preventing score drift or entitlement bypass.
    const results = candidates.map((candidate) => {
      const score = scoreName({ name: candidate.name, tld: candidate.tld, vibe })
      return {
        ...candidate,
        score: score.score,
        pronounceable: score.rawScores.pronounceability >= 60,
        memorability: Number((score.rawScores.memorability / 10).toFixed(1)),
        founderSignal: {
          score: score.score,
          band: score.band,
          rawScores: score.rawScores,
          reasons: score.reasons,
          version: score.version,
        },
      }
    })

    const allowance = await checkPlanFeatureQuotaIdempotentForSubject(
      subject,
      "founder-signal-batch-monthly",
      { free: FREE_FOUNDER_SIGNAL_BATCH_LIMIT, pro: PRO_FOUNDER_SIGNAL_BATCH_LIMIT },
      quotaKey,
    )
    if (!allowance.allowed) {
      return quotaError({
        status: allowance.statusCode as 429 | 503,
        message: allowance.message,
        used: allowance.used,
        limit: allowance.limit,
        remaining: allowance.remaining,
        resetAt: allowance.resetAt,
      })
    }

    return NextResponse.json({
      success: true,
      replayed: allowance.replayed,
      isPro: allowance.isPro,
      primaryTld,
      results,
      allowance: {
        used: allowance.used,
        limit: allowance.limit,
        remaining: allowance.remaining,
        resetAt: allowance.resetAt,
      },
    })
  } catch (error) {
    if (error instanceof QuotaSubjectUnavailableError) {
      return quotaError({
        status: 503,
        message: "Your workspace access could not be verified. Please try again shortly.",
        used: 0,
        limit: 0,
        remaining: 0,
        resetAt: null,
      })
    }
    console.error("Founder Signal shortlist scoring failed:", error)
    return NextResponse.json({ error: "founder_signal_failed", message: "Founder Signal could not score this shortlist." }, { status: 500 })
  }
}
