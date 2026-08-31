import { NextRequest, NextResponse } from "next/server"
import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { trackMetric } from "@/lib/metrics"
import { checkBurstLimit, checkRateLimit, getEntitlementState, logGeneration } from "@/lib/rate-limit"
import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"
import { verifyGenerationWorkflowToken } from "@/lib/generation-workflow-token"
import { isGeneratorRedesignEnabled } from "@/lib/generator-flags"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { hasSystemReservedName, systemReservedNameError } from "@/lib/reserved-names"

const SUPPORTED_TLDS = ["com", "io", "co", "ai", "app", "dev"]
const MAX_DOMAINS_PER_REQUEST = 50
const MAX_TLDS_PER_REQUEST = 6
const MAX_EXPANDED_CHECKS = 300
const MAX_DOMAIN_LABEL_LENGTH = 63
const AVAILABILITY_BURST_LIMIT = 30

interface DomainScoreResult {
  /** Founder Signal score (0-100) */
  score: number
  /** Raw pronounceability score (0-100) */
  pronounceable: boolean
  /** Raw memorability score (0-100), divided by 10 for display */
  memorability: number
  length: number
  /** Full Founder Signal breakdown for UI */
  founderSignal: {
    score: number
    rawScores: {
      length: number
      pronounceability: number
      memorability: number
      extension: number
      characterQuality: number
      brandRisk: number
    }
  }
}

type DomainAvailabilityResult = {
  name: string
  tld: string
  fullDomain: string
  available: boolean
  availabilityProvider: string
  availabilityLatencyMs: number
  availabilityCached: boolean
  availabilityConfidence: string
  checkStatus: string
  checkTiers: {
    dns: { google: string | null; cloudflare: string | null }
    rdap: unknown
  } | null
  length: number
  score?: number
  pronounceable?: boolean
  memorability?: number
  founderSignal?: DomainScoreResult["founderSignal"]
}

function scoreDomain(name: string, tld: string, vibe?: BrandVibe): DomainScoreResult {
  const result = scoreName({ name, tld, vibe })
  const length = name.length

  return {
    // Main score is now Founder Signal (0-100)
    score: result.score,
    // Pronounceable if raw score >= 60
    pronounceable: result.rawScores.pronounceability >= 60,
    // Memorability as 0-10 for backward compat (divide by 10)
    memorability: Number((result.rawScores.memorability / 10).toFixed(1)),
    length,
    founderSignal: {
      score: result.score,
      rawScores: result.rawScores,
    },
  }
}

function sanitiseName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, "")
}

function normaliseTld(input: unknown): string | null {
  if (typeof input !== "string") return null
  const tld = input.toLowerCase().replace(/^\./, "").replace(/[^a-z0-9-]/g, "")
  return SUPPORTED_TLDS.includes(tld) ? tld : null
}

function generationWorkflowIdentity(request: NextRequest, userId: string | null): string {
  if (userId) return `user:${userId}`
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown"
  return `anonymous:${ip}`
}

export async function POST(request: NextRequest) {
  const labBlock = getGeneratorLabApiBlockResponse(request)
  if (labBlock) return labBlock

  try {
    const body = await request.json().catch(() => null)
    const domains = body?.domains
    const tlds = body?.tlds
    const vibe = body?.vibe

    if (!domains || !Array.isArray(domains)) {
      return NextResponse.json({ error: "Domains array is required" }, { status: 400 })
    }
    if (hasSystemReservedName(domains)) {
      return NextResponse.json(systemReservedNameError(), { status: 400 })
    }

    const requestedTlds = tlds && Array.isArray(tlds) ? tlds : SUPPORTED_TLDS
    const tldsToCheck = Array.from(new Set(requestedTlds.map(normaliseTld).filter(Boolean) as string[])).slice(0, MAX_TLDS_PER_REQUEST)
    const cleanDomains = Array.from(
      new Set(
        domains
          .map((domainName: string) => sanitiseName(String(domainName || "")))
          .filter((domainName: string) => domainName.length > 0 && domainName.length <= MAX_DOMAIN_LABEL_LENGTH)
      )
    ).slice(0, MAX_DOMAINS_PER_REQUEST)

    if (cleanDomains.length === 0) {
      return NextResponse.json({ error: "No valid domains supplied" }, { status: 400 })
    }

    if (tldsToCheck.length === 0) {
      return NextResponse.json({ error: "No supported TLDs supplied" }, { status: 400 })
    }

    if (cleanDomains.length * tldsToCheck.length > MAX_EXPANDED_CHECKS) {
      return NextResponse.json(
        { error: `Too many checks requested. Limit requests to ${MAX_EXPANDED_CHECKS} domain/TLD combinations.` },
        { status: 400 }
      )
    }

    // A signed continuation avoids double-charging a generation workflow, but
    // it must never become an unlimited provider-work replay token.
    const burst = await checkBurstLimit(request, "domain-availability", AVAILABILITY_BURST_LIMIT)
    if (!burst.allowed) {
      return NextResponse.json(
        {
          error: "availability_rate_limited",
          message: "Please wait a moment before checking more domains.",
          resetAt: burst.resetAt,
        },
        { status: burst.unavailable ? 503 : 429 },
      )
    }

    // A signed token proves these names were produced by the immediately
    // preceding generation request. That continuation is one user workflow,
    // so it reads entitlement state without consuming a second monthly use.
    const entitlementState = body?.workflowToken ? await getEntitlementState(request) : null
    const workflowIdentity = entitlementState
      ? generationWorkflowIdentity(request, entitlementState.userId)
      : null
    const v2WorkflowContinuation = Boolean(
      entitlementState &&
      workflowIdentity &&
      verifyGenerationWorkflowToken(body.workflowToken, cleanDomains, `availability:${workflowIdentity}`),
    )
    const legacyWorkflowContinuation = Boolean(
      entitlementState &&
      workflowIdentity &&
      // Tokens issued before the generator redesign remain usable until their
      // ten-minute expiry so an in-flight generation is never stranded.
      verifyGenerationWorkflowToken(body.workflowToken, cleanDomains, workflowIdentity),
    )
    const workflowContinuation = v2WorkflowContinuation || legacyWorkflowContinuation
    const rateLimitResult = workflowContinuation && entitlementState
      ? {
          ...entitlementState,
          allowed: true,
          tokensUsed: 0,
          tokensTotal: entitlementState.isPro ? -1 : 0,
          remaining: entitlementState.isPro ? -1 : 0,
          resetAt: null,
          canUseBrandPalette: entitlementState.isPro,
          statusCode: 200 as const,
        }
      : await checkRateLimit(request, "bulk")

    if (!workflowContinuation && !rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "monthly_usage_limit_reached",
          message: rateLimitResult.message || "Free plan includes 3 uses per month. Upgrade for unlimited access.",
          resetAt: rateLimitResult.resetAt,
          tokensUsed: rateLimitResult.tokensUsed,
          tokensTotal: rateLimitResult.tokensTotal,
          remaining: rateLimitResult.remaining,
        },
        { status: rateLimitResult.statusCode || 429 },
      )
    }

    const fullDomains = cleanDomains.flatMap((domainName) => tldsToCheck.map((tld) => `${domainName}.${tld}`))

    const availabilityResults = await checkAvailabilityBatch(fullDomains, {
      signal: request.signal,
      concurrency: 12,
      maxRetries: 2,
      backoffMs: 120,
      ttlMs: 24 * 60 * 60 * 1000,
    })

    const availabilityMap = new Map(availabilityResults.map((result) => [result.domain, result]))

    const redesignV2 = isGeneratorRedesignEnabled()
    const candidateFirstContinuation = redesignV2 && v2WorkflowContinuation
    const founderSignalUnlocked = rateLimitResult.isPro
      && body?.includeFounderSignal !== false
      && !candidateFirstContinuation

    const results: DomainAvailabilityResult[] = cleanDomains.flatMap((domainName: string) =>
      tldsToCheck.map((tld: string) => {
        const fullDomain = `${domainName}.${tld}`
        const availability = availabilityMap.get(fullDomain)
        // Pass TLD to scoring so extension strength is factored in
        const metrics = founderSignalUnlocked
          ? scoreDomain(domainName, tld, typeof vibe === "string" ? (vibe as BrandVibe) : undefined)
          : null

        const tiered = availability?.tieredDetails
        const baseResult: DomainAvailabilityResult = {
          name: domainName,
          tld,
          fullDomain,
          available: Boolean(availability?.available),
          availabilityProvider: availability?.provider || "unknown",
          availabilityLatencyMs: availability?.latencyMs || 0,
          availabilityCached: Boolean(availability?.cached),
          availabilityConfidence: availability?.confidence || "low",
          // Tiered check details — optional UI use for confidence indicators
          checkStatus: tiered?.status ?? (availability?.available ? "available" : availability ? "taken" : "needs_verification"),
          checkTiers: tiered
            ? {
                dns: { google: tiered.tier1.google, cloudflare: tiered.tier1.cloudflare },
                rdap: tiered.tier2?.rdap ?? null,
              }
            : null,
          length: domainName.length,
        }

        if (!founderSignalUnlocked || !metrics) return baseResult

        return {
          ...baseResult,
          score: metrics.score,
          pronounceable: metrics.pronounceable,
          memorability: metrics.memorability,
          founderSignal: metrics.founderSignal,
        }
      }),
    )

    const responseResults = candidateFirstContinuation
      ? results
      : results.sort((a, b) => {
          if (a.available !== b.available) return a.available ? -1 : 1
          if (founderSignalUnlocked && a.score !== b.score) return (b.score || 0) - (a.score || 0)
          const tldPriority: Record<string, number> = { com: 0, io: 1, co: 2, ai: 3, app: 4, dev: 5 }
          return (tldPriority[a.tld] ?? 99) - (tldPriority[b.tld] ?? 99)
        })

    const userAgent = request.headers.get("user-agent") || undefined
    const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
    trackMetric({
      action: "bulk_check",
      metadata: {
        domainCount: cleanDomains.length,
        tldCount: tldsToCheck.length,
        checkedCount: availabilityResults.length,
        providerErrors: availabilityResults.filter((item) => item.error).length,
        workflowContinuation,
      },
      userAgent,
      country,
    })

    // Log generation for rate limiting (only for free users)
    if (!workflowContinuation && !rateLimitResult.isPro) {
      logGeneration(request, rateLimitResult.userId, "bulk", undefined, cleanDomains.length).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      isPro: rateLimitResult.isPro,
      founderSignalUnlocked,
      workflowContinuation,
      candidateFirstContinuation,
      results: responseResults,
      tlds: tldsToCheck,
    })
  } catch (error: any) {
    console.error("Error checking domains:", error)
    return NextResponse.json({ error: "Failed to check domain availability" }, { status: 500 })
  }
}
