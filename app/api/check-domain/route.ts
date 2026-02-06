import { NextRequest, NextResponse } from "next/server"
import { trackMetric } from "@/lib/metrics"

// Supported TLDs
const SUPPORTED_TLDS = ["com", "io", "co", "ai", "app", "dev"]

// Function to check domain availability using DNS NS record check
// NS records are the most reliable indicator - every registered domain MUST have NS records
async function checkDomainAvailability(domain: string): Promise<boolean> {
  try {
    // Check NS records - every registered domain must have nameservers
    const response = await fetch(
      `https://dns.google/resolve?name=${domain}&type=NS`,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!response.ok) {
      console.log(`DNS API error for ${domain}: ${response.status}`)
      // On API error, be conservative and say unavailable
      return false
    }

    const data = await response.json()
    console.log(`DNS check for ${domain}: Status=${data.Status}, Answer=${data.Answer?.length || 0}`)

    // Status codes: 0 = NOERROR, 3 = NXDOMAIN (domain doesn't exist)
    if (data.Status === 3) {
      // NXDOMAIN - domain definitely doesn't exist = available
      return true
    }

    if (data.Status === 0) {
      // NOERROR - check if there are actual NS records
      if (data.Answer && data.Answer.length > 0) {
        // Has NS records = registered = not available
        return false
      }
      // No NS records but no error - might be available, but be conservative
      // Check Authority section for SOA records
      if (data.Authority && data.Authority.length > 0) {
        // Has authority records, likely registered
        return false
      }
      // No records at all, likely available
      return true
    }

    // Other status codes (SERVFAIL, etc.) - be conservative
    return false
  } catch (error) {
    console.error(`Error checking domain ${domain}:`, error)
    // On error, be conservative and say not available
    return false
  }
}

// Function to score a domain name
function scoreDomain(name: string): {
  score: number
  pronounceable: boolean
  memorability: number
  length: number
} {
  const length = name.length

  // Base score calculation
  let score = 10

  // Length scoring (shorter is better, but not too short)
  if (length <= 6) score -= 1
  else if (length <= 8) score += 0
  else if (length <= 10) score -= 0.5
  else score -= 1.5

  // Check for pronounceability (has vowels)
  const vowels = name.match(/[aeiou]/gi)
  const pronounceable = vowels ? vowels.length >= Math.floor(length / 3) : false
  if (pronounceable) score += 1

  // Memorability (simple heuristic based on patterns)
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

export async function POST(request: NextRequest) {
  try {
    const { domains, tlds } = await request.json()

    if (!domains || !Array.isArray(domains)) {
      return NextResponse.json({ error: "Domains array is required" }, { status: 400 })
    }

    // Use provided TLDs or default to all supported TLDs
    const tldsToCheck: string[] = tlds && Array.isArray(tlds) ? tlds : SUPPORTED_TLDS

    // Check availability for each domain across all TLDs
    const results = await Promise.all(
      domains.flatMap((domainName: string) =>
        tldsToCheck.map(async (tld: string) => {
          const fullDomain = `${domainName}.${tld}`
          const available = await checkDomainAvailability(fullDomain)
          const metrics = scoreDomain(domainName)

          return {
            name: domainName,
            tld,
            fullDomain: fullDomain,
            available,
            ...metrics,
          }
        })
      )
    )

    // Sort by availability first, then by score, then by TLD priority
    const tldPriority: Record<string, number> = { com: 0, io: 1, co: 2, ai: 3, app: 4, dev: 5 }
    const sortedResults = results.sort((a, b) => {
      // First sort by availability
      if (a.available !== b.available) {
        return a.available ? -1 : 1
      }
      // Then by score
      if (a.score !== b.score) {
        return b.score - a.score
      }
      // Then by TLD priority
      return (tldPriority[a.tld] || 99) - (tldPriority[b.tld] || 99)
    })

    // Track bulk check metric (non-blocking)
    const userAgent = request.headers.get("user-agent") || undefined
    const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
    trackMetric({
      action: "bulk_check",
      metadata: { domainCount: domains.length, tldCount: tldsToCheck.length },
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
    return NextResponse.json(
      { error: error.message || "Failed to check domain availability" },
      { status: 500 }
    )
  }
}

