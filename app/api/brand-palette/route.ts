import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

export const runtime = "nodejs"

export interface PaletteColour {
  hex: string
  name: string
  usage: string
}

export interface BrandPaletteResult {
  palette: {
    primary: PaletteColour
    secondary: PaletteColour
    accent: PaletteColour
    background: PaletteColour
    text: PaletteColour
  }
  rationale: string
}

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const SYSTEM_PROMPT = `You are a senior brand identity designer. You create intentional, distinctive colour palettes for startup brands that will be used across websites and apps.

Rules:
- Avoid "AI startup purple" and generic SaaS blue unless the brand context genuinely calls for it
- Each palette should feel ownable — unique to this specific brand's personality
- Background and text colours must have strong contrast (pass WCAG AA at minimum)
- Accent colours should be used sparingly (CTAs, highlights)
- Think about the industry, tone, and connotations of the brand name
- Warm brands (food, lifestyle, luxury) → earthy, warm tones
- Tech/AI brands → can still avoid generic blue if the name suggests otherwise
- Minimal/clean brands → off-whites, charcoal, single bold accent

Respond ONLY with valid JSON. No markdown. No explanation outside the JSON.`

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, "palette")
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "token_limit_reached", message: "You've used all 3 free tokens. Upgrade to Pro for unlimited access.", upgradeUrl: "/pricing" },
      { status: 429 }
    )
  }

  let body: { brandName?: string; keywords?: string; vibe?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { brandName, keywords, vibe } = body
  if (!brandName?.trim()) {
    return NextResponse.json({ error: "brandName is required" }, { status: 400 })
  }

  const client = getClient()

  const userPrompt = `Create a brand colour palette for this startup:

Brand name: "${brandName.trim()}"
Context / keywords: "${keywords?.trim() || "none provided"}"
Brand vibe / personality: "${vibe?.trim() || "modern"}"

Think carefully about what this name evokes — its sound, connotations, industry context, and the vibe above.
Then return exactly this JSON:

{
  "palette": {
    "primary":    { "hex": "#XXXXXX", "name": "colour name", "usage": "where to use this" },
    "secondary":  { "hex": "#XXXXXX", "name": "colour name", "usage": "where to use this" },
    "accent":     { "hex": "#XXXXXX", "name": "colour name", "usage": "where to use this" },
    "background": { "hex": "#XXXXXX", "name": "colour name", "usage": "where to use this" },
    "text":       { "hex": "#XXXXXX", "name": "colour name", "usage": "where to use this" }
  },
  "rationale": "1–2 sentences explaining why this palette fits the brand"
}`

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.88,
      max_tokens: 450,
      response_format: { type: "json_object" },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 })
    }

    const parsed: BrandPaletteResult = JSON.parse(content)

    if (!rateLimit.isPro) {
      logGeneration(req, rateLimit.userId, "palette", brandName.trim()).catch(() => {})
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error("Brand palette generation error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    )
  }
}
