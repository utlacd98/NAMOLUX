import { NextRequest, NextResponse } from "next/server"
import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { trackMetric } from "@/lib/metrics"

const SUPPORTED_TLDS = ["com", "io", "co", "ai", "app", "dev"]

function scoreDomain(name: string): {
  score: number
  pronounceable: boolean
  memorability: number
  length: number
} {
  const length = name.length

  let score = 10
  if (length <= 6) score -= 1
  else if (length <= 8) score += 0
  else if (length <= 10) score -= 0.5
  else score -= 1.5

  const vowels = name.match(/[aeiou]/gi)
  const pronounceable = vowels ? vowels.length >= Math.floor(length / 3) : false
  if (pronounceable) score += 1

  const hasRepeatingChars = /(.)\1/.test(name)
  const hasCommonPatterns = /ly$|io$|ify$|hub$|lab$/.test(name)
  let memorability = 7

  if (hasCommonPatterns) memorability += 1
  if (length <= 8) memorability += 1
  if (hasRepeatingChars) memorability += 0.5

  memorability = Math.min(10, memorability)

  return {
    score: Math.max(1, Math.min(10, Number(score.toFixed(1)))),
    pronounceable,
    memorability: Number(memorability.toFixed(1)),
    length,
  }
}

function sanitiseName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, "")
}

export async function POST(request: NextRequest) {
  try {
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
        const metrics = scoreDomain(domainName)

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
