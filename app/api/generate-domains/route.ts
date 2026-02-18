import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { autoFind5DotComByFounderScore, type AutoFindVibe } from "@/lib/autofind/autoFindByFounderScore"
import { generateNameStyleCandidates, type NameStyleSelection } from "@/lib/nameStyles"
import { trackMetric } from "@/lib/metrics"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiInstance
}

function isAutoFindV2Enabled(): boolean {
  const serverFlag = process.env.AUTO_FIND_V2
  const publicFlag = process.env.NEXT_PUBLIC_AUTO_FIND_V2

  if (serverFlag === "false" || publicFlag === "false") return false
  if (serverFlag === "true" || publicFlag === "true") return true

  // Default on so quality-first multi-TLD auto-find is active unless explicitly disabled.
  return true
}

function toAutoFindVibe(value: unknown): AutoFindVibe {
  const safe = String(value || "").toLowerCase()
  if (safe === "luxury") return "Luxury"
  if (safe === "futuristic") return "Futuristic"
  if (safe === "playful") return "Playful"
  if (safe === "trustworthy") return "Trustworthy"
  return "Minimal"
}

function isNameStyleV2Enabled(): boolean {
  const serverFlag = process.env.NAME_STYLE_MODE_V2
  const publicFlag = process.env.NEXT_PUBLIC_NAME_STYLE_MODE_V2
  if (serverFlag === "false" || publicFlag === "false") return false
  if (serverFlag === "true" || publicFlag === "true") return true
  return true
}

function toNameStyle(value: unknown): NameStyleSelection {
  const safe = String(value || "mix").toLowerCase()
  if (safe === "invented" || safe === "blend" || safe === "metaphor" || safe === "literal") return safe
  return "mix"
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit first - domain generation feature
    const rateLimitResult = await checkRateLimit(request, "domain")

    if (!rateLimitResult.allowed) {
      const resetAt = rateLimitResult.resetAt
      const now = new Date()
      const diffMs = resetAt ? resetAt.getTime() - now.getTime() : 0
      const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
      const minutesRemaining = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "You've used your free generation for today",
          resetAt: resetAt?.toISOString(),
          hoursRemaining,
          minutesRemaining,
          upgradeUrl: "/pricing",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(diffMs / 1000)),
            "X-RateLimit-Limit": "1",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetAt?.toISOString() || "",
          },
        }
      )
    }

    const payload = await request.json()
    const { keyword, vibe, industry, maxLength, count, autoFindV2, generatorV2, nameStyle, meaningMode } = payload
    const hasCustomCount = typeof count === "number" && Number.isFinite(count)
    const safeCount = hasCustomCount ? Math.max(12, Math.min(Math.floor(count), 20)) : 10

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

    if (autoFindV2) {
      if (!isAutoFindV2Enabled()) {
        return NextResponse.json({ error: "Auto-find V2 is disabled." }, { status: 400 })
      }

      const started = Date.now()
      const result = await autoFind5DotComByFounderScore({
        keywords: keyword.trim(),
        industry: typeof industry === "string" ? industry : undefined,
        vibe: toAutoFindVibe(vibe),
        maxLen: typeof maxLength === "number" ? maxLength : 9,
        maxAttempts: typeof payload.maxAttempts === "number" ? payload.maxAttempts : undefined,
        timeCapMs: typeof payload.timeCapMs === "number" ? payload.timeCapMs : undefined,
        scoreFloor: typeof payload.scoreFloor === "number" ? payload.scoreFloor : undefined,
        topNToCheck: typeof payload.topNToCheck === "number" ? payload.topNToCheck : undefined,
        poolSize: typeof payload.poolSize === "number" ? payload.poolSize : undefined,
        tlds: Array.isArray(payload.tlds) ? payload.tlds : undefined,
      })

      const userAgent = request.headers.get("user-agent") || undefined
      const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined

      trackMetric({
        action: "name_generation",
        metadata: {
          keyword,
          vibe,
          industry,
          mode: "auto_find_v2",
          found: result.found.length,
          target: 5,
          attempts: result.stats.attempts,
          generatedCandidates: result.stats.generated,
          checkedAvailability: result.stats.checkedAvailability,
          filteredCandidates: Math.max(0, result.stats.generated - result.stats.passedQuality),
          elapsedMs: Date.now() - started,
        },
        userAgent,
        country,
      })

      const checked = Math.max(result.stats.checkedAvailability, 1)
      const availabilityHitRate = Number(((result.found.length / checked) * 100).toFixed(2))

      // Log generation for rate limiting (only for free users - pro users don't need logging for limits)
      if (!rateLimitResult.isPro) {
        logGeneration(request, rateLimitResult.userId, "domain", keyword, result.found.length).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        autoFindV2: true,
        isPro: rateLimitResult.isPro,
        picks: result.found.map((pick) => ({
          name: pick.name,
          tld: pick.tld,
          fullDomain: pick.domain,
          available: true,
          score: pick.founderScore,
          founderScore: pick.founderScore,
          pronounceable: pick.label === "Pronounceable",
          memorability: Number(Math.min(10, Math.max(1, pick.founderScore / 10)).toFixed(1)),
          length: pick.name.length,
          strategy: "founder_score_priority",
          scoreBreakdown: { founderSignal: pick.founderScore },
          roots: [],
          whyTag: pick.reasons.slice(0, 2).join(" | "),
          qualityBand: pick.founderScore >= 85 ? "high" : pick.founderScore >= 75 ? "medium" : "low",
          meaningScore: Math.min(100, Math.max(10, pick.founderScore)),
          meaningBreakdown: "Founder Signal quality-first selection.",
          whyItWorks: `Founder Signal ${pick.founderScore}/100.`,
          brandableScore: Number(Math.min(10, Math.max(1, pick.founderScore / 10)).toFixed(1)),
          pronounceabilityScore: pick.label === "Pronounceable" ? 90 : 72,
        })),
        summary: {
          found: result.found.length,
          target: 5,
          attempts: result.stats.attempts,
          maxAttempts: typeof payload.maxAttempts === "number" ? payload.maxAttempts : 5,
          generatedCandidates: result.stats.generated,
          passedFilters: result.stats.passedQuality,
          checkedAvailability: result.stats.checkedAvailability,
          providerErrors: 0,
          availabilityHitRate,
          qualityThreshold: typeof payload.scoreFloor === "number" ? payload.scoreFloor : 80,
          relaxationsApplied: [],
          topRejectedReasons: [],
          checkingProgress: `Checking ${result.stats.checkedAvailability}/${result.stats.generated}... Found ${result.found.length}/5`,
          suggestions: result.found.length < 5 ? ["increase_length", "two_word_mode", "allow_suffix", "switch_tld_io_ai"] : [],
          nearMisses: [],
          explanation: result.message,
        },
      })
    }

    if (generatorV2 && isNameStyleV2Enabled()) {
      const generated = generateNameStyleCandidates({
        keywords: keyword.trim(),
        industry: typeof industry === "string" ? industry : undefined,
        vibe: typeof vibe === "string" ? vibe : "minimal",
        maxLength: typeof maxLength === "number" ? maxLength : 10,
        count: safeCount,
        selectedStyle: toNameStyle(nameStyle),
        meaningMode: Boolean(meaningMode),
        seed: typeof payload.seed === "string" ? payload.seed : undefined,
      })

      const userAgent = request.headers.get("user-agent") || undefined
      const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
      trackMetric({
        action: "name_generation",
        metadata: {
          keyword,
          vibe,
          industry,
          mode: "style_v2",
          style: toNameStyle(nameStyle),
          meaningMode: Boolean(meaningMode),
          requestedCount: safeCount,
          resultCount: generated.length,
        },
        userAgent,
        country,
      })

      // Log generation for rate limiting (only for free users)
      if (!rateLimitResult.isPro) {
        logGeneration(request, rateLimitResult.userId, "domain", keyword, generated.length).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        generatorV2: true,
        isPro: rateLimitResult.isPro,
        domains: generated.map((item) => ({
          name: item.name,
          style: item.style,
          meaningShort: item.meaningShort || null,
          reasoning: item.meaningShort || `${item.style} style suggestion.`,
        })),
      })
    }

    // Create a prompt for GPT to generate domain names
    const prompt = `Generate ${safeCount} creative, short, and memorable domain names based on the following criteria:

Keyword/Concept: ${keyword}
Brand Vibe: ${vibe || "modern"}
Industry: ${industry || "general"}
Maximum Length: ${maxLength || 10} characters

Requirements:
- Names should be pronounceable and easy to remember
- Avoid hyphens and numbers
- Mix of different styles: compound words, invented words, prefixes/suffixes
- Consider adding trendy suffixes like: ly, io, ify, hub, lab, ware, base, spot, zone
- Consider prefixes like: go, get, try, my, use

Return ONLY a JSON array of domain name suggestions (without .com extension), each with:
- name: the domain name
- reasoning: brief explanation of why this name works

Format: [{"name": "example", "reasoning": "combines X with Y for Z effect"}, ...]`

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a creative branding expert specializing in domain name generation. You create short, memorable, and brandable domain names.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 1000,
    })

    const responseText = completion.choices[0]?.message?.content || "[]"
    
    // Extract JSON from the response (in case GPT adds markdown formatting)
    let domainSuggestions
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      domainSuggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch (parseError) {
      console.error("Failed to parse GPT response:", responseText)
      domainSuggestions = []
    }

    let finalSuggestions = domainSuggestions

    if (hasCustomCount) {
      // Normalise, dedupe, and cap suggestions for high-volume auto-find requests.
      const seenNames = new Set<string>()
      finalSuggestions = (Array.isArray(domainSuggestions) ? domainSuggestions : [])
        .map((item: any) => {
          const rawName = typeof item === "string" ? item : item?.name
          const cleanName = String(rawName || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 63)

          if (cleanName.length < 3 || seenNames.has(cleanName)) return null
          seenNames.add(cleanName)

          return {
            name: cleanName,
            reasoning:
              typeof item?.reasoning === "string" && item.reasoning.trim().length > 0
                ? item.reasoning.trim()
                : "Generated for brandability and memorability.",
          }
        })
        .filter(Boolean)
        .slice(0, safeCount)
    }

    // Track metric (non-blocking)
    const userAgent = request.headers.get("user-agent") || undefined
    const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
    trackMetric({
      action: "name_generation",
      metadata: { keyword, vibe, industry, requestedCount: safeCount, resultCount: finalSuggestions.length },
      userAgent,
      country,
    })

    // Log generation for rate limiting (only for free users)
    if (!rateLimitResult.isPro) {
      logGeneration(request, rateLimitResult.userId, "domain", keyword, finalSuggestions.length).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      isPro: rateLimitResult.isPro,
      domains: finalSuggestions,
    })
  } catch (error: any) {
    console.error("Error generating domains:", error)

    // Handle specific OpenAI errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { error: "Connection error. Please try again." },
        { status: 503 }
      )
    }

    if (error.status === 401) {
      return NextResponse.json(
        { error: "API key invalid. Please contact support." },
        { status: 500 }
      )
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limited. Please try again in a moment." },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate domain names" },
      { status: 500 }
    )
  }
}
