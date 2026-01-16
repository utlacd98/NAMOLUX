import { NextRequest, NextResponse } from "next/server"

// Function to check domain availability using WHOIS-like approach
async function checkDomainAvailability(domain: string): Promise<boolean> {
  try {
    // Using a free domain availability API
    // Option 1: Use DNS lookup (simple but not 100% accurate)
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
      headers: {
        Accept: "application/dns-json",
      },
    })

    const data = await response.json()

    // If there's no Answer section, the domain might be available
    // Note: This is a simplified check. For production, use a proper WHOIS API
    const hasRecords = data.Answer && data.Answer.length > 0

    return !hasRecords
  } catch (error) {
    console.error(`Error checking domain ${domain}:`, error)
    // If there's an error, assume it might be available
    return true
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
    const { domains } = await request.json()

    if (!domains || !Array.isArray(domains)) {
      return NextResponse.json({ error: "Domains array is required" }, { status: 400 })
    }

    // Check availability for each domain
    const results = await Promise.all(
      domains.map(async (domainName: string) => {
        const fullDomain = `${domainName}.com`
        const available = await checkDomainAvailability(fullDomain)
        const metrics = scoreDomain(domainName)

        return {
          name: domainName,
          available,
          ...metrics,
        }
      })
    )

    // Sort by availability first, then by score
    const sortedResults = results.sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? -1 : 1
      }
      return b.score - a.score
    })

    return NextResponse.json({
      success: true,
      results: sortedResults,
    })
  } catch (error: any) {
    console.error("Error checking domains:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check domain availability" },
      { status: 500 }
    )
  }
}

