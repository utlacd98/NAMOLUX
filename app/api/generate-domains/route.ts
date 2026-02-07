import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { runAutoFindV2 } from "@/lib/domainGen/autofind"
import type { AutoFindControls } from "@/lib/domainGen/types"
import { trackMetric } from "@/lib/metrics"

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
  return process.env.AUTO_FIND_V2 === "true" || process.env.NEXT_PUBLIC_AUTO_FIND_V2 === "true"
}

function parseCsvInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").toLowerCase().replace(/[^a-z0-9-]/g, "").trim())
      .filter(Boolean)
  }

  if (typeof value !== "string") return []

  return value
    .split(/[,\n]/)
    .map((item) => item.toLowerCase().replace(/[^a-z0-9-]/g, "").trim())
    .filter(Boolean)
}

function parseControls(value: any): AutoFindControls {
  const controls = value || {}

  return {
    seed: typeof controls.seed === "string" ? controls.seed.trim() || undefined : undefined,
    mustIncludeKeyword:
      controls.mustIncludeKeyword === "exact" || controls.mustIncludeKeyword === "partial" || controls.mustIncludeKeyword === "none"
        ? controls.mustIncludeKeyword
        : "partial",
    keywordPosition:
      controls.keywordPosition === "prefix" || controls.keywordPosition === "suffix" || controls.keywordPosition === "anywhere"
        ? controls.keywordPosition
        : "anywhere",
    style: controls.style === "real_words" || controls.style === "brandable_blends" ? controls.style : "real_words",
    blocklist: parseCsvInput(controls.blocklist),
    allowlist: parseCsvInput(controls.allowlist),
    allowHyphen: Boolean(controls.allowHyphen),
    allowNumbers: Boolean(controls.allowNumbers),
    preferTwoWordBrands: controls.preferTwoWordBrands !== false,
    allowVibeSuffix: Boolean(controls.allowVibeSuffix),
    showAnyAvailable: Boolean(controls.showAnyAvailable),
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { keyword, vibe, industry, maxLength, count, autoFindV2 } = payload
    const hasCustomCount = typeof count === "number" && Number.isFinite(count)
    const safeCount = hasCustomCount ? Math.max(12, Math.min(Math.floor(count), 20)) : 10

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

    if (autoFindV2) {
      if (!isAutoFindV2Enabled()) {
        return NextResponse.json({ error: "Auto-find V2 is disabled." }, { status: 400 })
      }

      const controls = parseControls(payload.controls)
      const targetCountRaw = typeof payload.targetCount === "number" ? payload.targetCount : 5
      const targetCount = Math.max(1, Math.min(Math.floor(targetCountRaw), 10))

      const started = Date.now()
      const result = await runAutoFindV2(
        {
          keyword: keyword.trim(),
          vibe,
          industry,
          maxLength: typeof maxLength === "number" ? maxLength : 10,
          targetCount,
          controls,
        },
        {
          targetCount,
          signal: request.signal,
        },
      )

      const userAgent = request.headers.get("user-agent") || undefined
      const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined

      trackMetric({
        action: "name_generation",
        metadata: {
          keyword,
          vibe,
          industry,
          mode: "auto_find_v2",
          found: result.summary.found,
          target: result.summary.target,
          attempts: result.summary.attempts,
          generatedCandidates: result.summary.generatedCandidates,
          checkedAvailability: result.summary.checkedAvailability,
          providerErrors: result.summary.providerErrors,
          elapsedMs: Date.now() - started,
        },
        userAgent,
        country,
      })

      return NextResponse.json({
        success: true,
        autoFindV2: true,
        picks: result.picks.map((pick) => ({
          name: pick.name,
          tld: "com",
          fullDomain: `${pick.name}.com`,
          available: true,
          score: Number(Math.min(10, Math.max(1, pick.score / 2.2)).toFixed(1)),
          pronounceable: true,
          memorability: Number(Math.min(10, Math.max(6, pick.score / 2.1)).toFixed(1)),
          length: pick.name.length,
          strategy: pick.strategy,
          scoreBreakdown: pick.scoreBreakdown,
          roots: pick.roots,
          whyTag: pick.whyTag,
          qualityBand: pick.qualityBand,
        })),
        summary: result.summary,
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

    return NextResponse.json({
      success: true,
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
