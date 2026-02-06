import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
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

export async function POST(request: NextRequest) {
  try {
    const { keyword, vibe, industry, maxLength, count } = await request.json()
    const hasCustomCount = typeof count === "number" && Number.isFinite(count)
    const safeCount = hasCustomCount ? Math.max(12, Math.min(Math.floor(count), 20)) : 10

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
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
