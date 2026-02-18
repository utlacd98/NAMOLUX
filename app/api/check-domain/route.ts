import { NextRequest, NextResponse } from "next/server"
import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { trackMetric } from "@/lib/metrics"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"
import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"

const SUPPORTED_TLDS = ["com", "io", "co", "ai", "app", "dev"]

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

export async function POST(request: NextRequest) {
  try {
    // Check rate limit first - bulk check feature
    const rateLimitResult = await checkRateLimit(request, "bulk")

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "You've used your free bulk checks for today",
          upgradeUrl: "/pricing",
        },
        { status: 429 }
      )
    }

    const { domains, tlds } = await request.json()

    if (!domains || !Array.isArray(domains)) {
      return NextResponse.json({ error: "Domains array is required" }, { status: 400 })
    }

    const tldsToCheck: string[] = tlds && Array.isArray(tlds) ? tlds : SUPPORTED_TLDS
    const cleanDomains = domains.map((domainName: string) => sanitiseName(String(domainName || ""))).filter(Boolean)

    if (cleanDomains.length === 0) {
      return NextResponse.json({ error: "No valid domains supplied" }, { status: 400 })
    }

    const fullDomains = cleanDomains.flatMap((domainName) => tldsToCheck.map((tld) => `${domainName}.${tld}`))

    const availabilityResults = await checkAvailabilityBatch(fullDomains, {
      signal: request.signal,
      concurrency: 8,
      maxRetries: 2,
      backoffMs: 120,
      ttlMs: 24 * 60 * 60 * 1000,
    })

    const availabilityMap = new Map(availabilityResults.map((result) => [result.domain, result]))

    const results = cleanDomains.flatMap((domainName: string) =>
      tldsToCheck.map((tld: string) => {
        const fullDomain = `${domainName}.${tld}`
        const availability = availabilityMap.get(fullDomain)
        // Pass TLD to scoring so extension strength is factored in
        const metrics = scoreDomain(domainName, tld)

        return {
          name: domainName,
          tld,
          fullDomain,
          available: Boolean(availability?.available),
          availabilityProvider: availability?.provider || "unknown",
          availabilityLatencyMs: availability?.latencyMs || 0,
          availabilityCached: Boolean(availability?.cached),
          ...metrics,
        }
      }),
    )

    const tldPriority: Record<string, number> = { com: 0, io: 1, co: 2, ai: 3, app: 4, dev: 5 }
    const sortedResults = results.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1
      if (a.score !== b.score) return b.score - a.score
      return (tldPriority[a.tld] || 99) - (tldPriority[b.tld] || 99)
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
      },
      userAgent,
      country,
    })

    // Log generation for rate limiting (only for free users)
    if (!rateLimitResult.isPro) {
      logGeneration(request, rateLimitResult.userId, "bulk", undefined, cleanDomains.length).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      results: sortedResults,
      tlds: tldsToCheck,
    })
  } catch (error: any) {
    console.error("Error checking domains:", error)
    return NextResponse.json({ error: error.message || "Failed to check domain availability" }, { status: 500 })
  }
}
