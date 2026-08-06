import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

let openaiInstance: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set")
    openaiInstance = new OpenAI({ apiKey })
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
  "Consulting & Services", "Legal & Professional", "Automotive",
  "Home & Garden", "Pet Care", "Gaming & Esports",
  "Sustainability & Green Tech", "Blockchain & Crypto",
  "Manufacturing", "Nonprofit & Social Impact", "Other",
]

const VALID_VIBES = ["luxury", "futuristic", "playful", "trustworthy", "minimal"]

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "brand",
  "business",
  "for",
  "from",
  "into",
  "our",
  "platform",
  "small",
  "that",
  "the",
  "their",
  "this",
  "through",
  "using",
  "with",
])

function normaliseToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function inferIndustry(text: string): string {
  const lower = text.toLowerCase()
  if (/(logistics|supply chain|shipping|delivery|freight|warehouse|inventory|e-commerce|ecommerce|commerce|merchant|store)/.test(lower)) return "E-Commerce"
  if (/(mental|therapy|teen|teenager|support network|nonprofit|charity|community|social impact)/.test(lower)) return "Nonprofit & Social Impact"
  if (/(skin|skincare|beauty|botanical|cosmetic|wellness|health|therapy|fitness|care)/.test(lower)) return "Health & Wellness"
  if (/(renewable|clean energy|energy|solar|wind|climate|carbon|green tech|waste|recycle|environment|grid)/.test(lower)) return "Sustainability & Green Tech"
  if (/(ai|machine learning|automation|agent|model|data|analytics)/.test(lower)) return "AI & Machine Learning"
  if (/(software|saas|workflow|dashboard|developer|app)/.test(lower)) return "SaaS & Software"
  if (/(finance|fintech|bank|payment|invoice|ledger|cashflow|accounting)/.test(lower)) return "Fintech & Finance"
  if (/(education|school|student|course|learn|teacher|tutor)/.test(lower)) return "Education & EdTech"
  return "SaaS & Software"
}

function inferVibe(text: string, industry: string): string {
  const lower = text.toLowerCase()
  if (/(luxury|premium|high-end|exclusive|elegant|botanical|heritage)/.test(lower)) return "luxury"
  if (/(ai|futuristic|next-gen|advanced|automation|autonomous|predictive)/.test(lower)) return "futuristic"
  if (/(teen|kids|game|play|fun|community|social|creative)/.test(lower)) return "playful"
  if (/(nonprofit|support|mental|finance|legal|security|consulting|business|trust|reliable)/.test(lower)) return "trustworthy"
  if (industry === "Nonprofit & Social Impact" || industry === "Fintech & Finance") return "trustworthy"
  if (industry === "AI & Machine Learning") return "futuristic"
  return "minimal"
}

function keywordCandidates(text: string, industry: string): string[] {
  const lower = text.toLowerCase()
  const domainHints: Record<string, string[]> = {
    "E-Commerce": ["logistics", "delivery", "route", "ship", "stock", "commerce", "flow", "fleet"],
    "Sustainability & Green Tech": ["energy", "solar", "carbon", "green", "renew", "climate", "grid", "future"],
    "Nonprofit & Social Impact": ["support", "teen", "mind", "care", "community", "safe", "haven", "help"],
    "Health & Wellness": ["skin", "botanical", "well", "care", "pure", "glow", "restore", "nourish"],
    "AI & Machine Learning": ["agent", "model", "signal", "predict", "smart", "data", "flow", "sync"],
    "SaaS & Software": ["workflow", "sync", "team", "flow", "cloud", "signal", "pilot", "frame"],
    "Fintech & Finance": ["vault", "cash", "ledger", "capital", "trust", "balance", "fund", "clear"],
  }

  const extracted = lower
    .split(/[\s,./|&-]+/)
    .map(normaliseToken)
    .filter((token) => token.length >= 3 && token.length <= 16 && !STOPWORDS.has(token))

  const weighted = new Set<string>()
  for (const hint of domainHints[industry] || []) {
    if (lower.includes(hint) || weighted.size < 3) weighted.add(hint)
  }
  for (const token of extracted) {
    if (weighted.size >= 6) break
    weighted.add(token)
  }

  return Array.from(weighted).slice(0, 6)
}

function fallbackAnalysis(description: string) {
  const industry = inferIndustry(description)
  const brandVibe = inferVibe(description, industry)
  const keywords = keywordCandidates(description, industry)
  const lower = description.toLowerCase()
  const maxLength = /(enterprise|consulting|business|nonprofit|support|logistics)/.test(lower) ? 10 : 8

  return {
    summary: `You're building ${description.slice(0, 180).replace(/\s+/g, " ").trim()}.`,
    keywords,
    industry,
    brandVibe,
    maxLength,
    vibeReasoning: `Selected ${brandVibe} based on the category, audience, and tone of the description.`,
  }
}

export async function POST(request: NextRequest) {
  const labBlockResponse = getGeneratorLabApiBlockResponse(request)
  if (labBlockResponse) return labBlockResponse

  const rateLimit = await checkRateLimit(request, "analyze")
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "monthly_usage_limit_reached",
        message: rateLimit.message || "Free plan includes 3 uses per month. Upgrade for unlimited access.",
        resetAt: rateLimit.resetAt,
        tokensUsed: rateLimit.tokensUsed,
        tokensTotal: rateLimit.tokensTotal,
        remaining: rateLimit.remaining,
      },
      { status: rateLimit.statusCode || 429 }
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

    let raw: any
    try {
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
      raw = JSON.parse(jsonMatch[0])
    } catch (error) {
      console.warn("analyze-description falling back to local extraction:", error)
      raw = fallbackAnalysis(truncated)
    }

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
