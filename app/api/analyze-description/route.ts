import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

let openaiInstance: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set")
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiInstance
}

const VALID_INDUSTRIES = [
  "SaaS & Software", "E-Commerce", "Fintech & Finance", "Health & Wellness",
  "AI & Machine Learning", "Marketing & Advertising", "Education & EdTech",
  "Real Estate & PropTech", "Food & Beverage", "Logistics & Supply Chain",
  "Cybersecurity", "Media & Entertainment", "Developer Tools",
  "Technology", "Finance", "Education", "Creative", "Fashion & Beauty",
  "Travel & Tourism", "Sports & Fitness", "Entertainment & Media",
]

const VALID_VIBES = ["luxury", "futuristic", "playful", "trustworthy", "minimal"]

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(request, "analyze")
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "token_limit_reached", message: "You've used all 3 free tokens. Upgrade to Pro for unlimited access.", upgradeUrl: "/pricing" },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const description = (body?.description || "").trim()

    if (!description || description.length < 20) {
      return NextResponse.json(
        { error: "Description is too short. Tell us a bit more about your startup." },
        { status: 400 },
      )
    }

    const truncated = description.slice(0, 1000)

    const systemPrompt = `You are a startup naming consultant analyzing a founder's description of their business. Your job is to extract the information needed to generate great brand names.

Read the startup description carefully, then return ONLY valid JSON with these exact fields:

1. "summary": 1-2 sentence summary starting with "You're building..." — be specific, confirm understanding.

2. "keywords": Array of 3-6 keywords. These feed a name generator, so choose words that produce great brand names:
   - Mix literal keywords (what it does) and emotional keywords (how it should feel)
   - Prefer short, evocative words. Avoid generic filler: "innovative", "solution", "platform", "app", "tool"
   - Include at least one word capturing the startup's unique angle
   - Good example for cloud project tool: ["cloud", "async", "remote", "flow", "sync"]
   - Bad example: ["innovative", "solution", "platform", "management", "tool"]

3. "industry": Best match from: "SaaS & Software", "E-Commerce", "Fintech & Finance", "Health & Wellness", "AI & Machine Learning", "Marketing & Advertising", "Education & EdTech", "Real Estate & PropTech", "Food & Beverage", "Logistics & Supply Chain", "Cybersecurity", "Media & Entertainment", "Developer Tools". Pick exactly one.

4. "brandVibe": Choose ONE from: "Luxury", "Futuristic", "Playful", "Trustworthy", "Minimal"
   - Enterprise/finance/legal/security → "Trustworthy"
   - Fun/social/creative/young audiences → "Playful"
   - AI/cutting-edge/next-generation → "Futuristic"
   - Premium/exclusive/high-end → "Luxury"
   - Simple/clean/straightforward → "Minimal"
   - Default: "Playful" for consumer, "Trustworthy" for B2B if unclear

5. "maxLength": Number 4-12. Consumer apps: 5-7. B2B/enterprise: 8-10. Default 7.

6. "vibeReasoning": One sentence explaining why you chose that vibe.

Return ONLY valid JSON, no markdown, no backticks.`

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: truncated },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const content = completion.choices[0]?.message?.content?.trim() || ""
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Invalid AI response format")

    const raw = JSON.parse(jsonMatch[0])

    // Normalise and validate
    const keywords: string[] = Array.isArray(raw.keywords)
      ? raw.keywords
          .filter((k: unknown) => typeof k === "string")
          .map((k: string) => k.toLowerCase().trim())
          .filter((k: string) => k.length > 0 && k.length <= 20)
          .slice(0, 6)
      : []

    // Supplement with industry keywords if too few
    if (keywords.length < 3) {
      const industryFallback: Record<string, string[]> = {
        "SaaS & Software": ["flow", "sync", "hub"],
        "Fintech & Finance": ["vault", "capital", "fund"],
        "Health & Wellness": ["care", "well", "vital"],
        "AI & Machine Learning": ["neural", "model", "learn"],
        default: ["cloud", "base", "core"],
      }
      const industry = raw.industry || "default"
      const fallback = industryFallback[industry] ?? industryFallback.default
      for (const kw of fallback) {
        if (!keywords.includes(kw) && keywords.length < 3) keywords.push(kw)
      }
    }

    const rawVibe = (raw.brandVibe || "playful").toLowerCase()
    const brandVibe = VALID_VIBES.includes(rawVibe) ? rawVibe : "playful"

    if (!rateLimit.isPro) {
      logGeneration(request, rateLimit.userId, "analyze").catch(() => {})
    }

    return NextResponse.json({
      success: true,
      analysis: {
        summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
        keywords,
        industry: VALID_INDUSTRIES.includes(raw.industry) ? raw.industry : (VALID_INDUSTRIES[0]),
        brandVibe,
        maxLength: Math.min(12, Math.max(4, Number(raw.maxLength) || 7)),
        vibeReasoning: typeof raw.vibeReasoning === "string" ? raw.vibeReasoning.trim() : "",
      },
    })
  } catch (error: unknown) {
    console.error("analyze-description error:", error)
    const msg = error instanceof Error ? error.message : "Analysis failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
