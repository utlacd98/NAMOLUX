import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

export const runtime = "nodejs"

export interface PaletteColour {
  hex: string
  name: string
  usage: string
}

export interface PaletteVariant {
  name: string          // palette name (e.g. "Ink Prestige")
  feel: string          // 2–3 words (e.g. "Quiet, sharp, archival")
  role: "core" | "dark" | "expressive"
  subStyle: string      // sub-style applied (e.g. "Dark Prestige")
  palette: {
    background: PaletteColour
    primary: PaletteColour
    accent: PaletteColour
    surface: PaletteColour
    text: PaletteColour
  }
  usageInsight: string  // 1 sentence
}

export interface BrandPaletteResult {
  variants: PaletteVariant[]
  // Back-compat: first variant exposed as `palette`, with `surface` aliased to
  // `secondary` so existing LandingPreview / StitchPrompt keep working.
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

const SYSTEM_PROMPT = `You are a brand identity system inside NamoLux. You generate high-quality colour palettes that feel intentional, diverse, and non-generic — the way a real designer would pick a direction for a specific brand.

════════════════════════════════════════════════════════════════════════
STEP 1 — ANALYSE THE NAME
════════════════════════════════════════════════════════════════════════
Silently note:
• Phonetic tone (soft / sharp / balanced)
• Semantic signals (real word fragments inside the name)
• Emotional feel (calm, bold, premium, technical)

════════════════════════════════════════════════════════════════════════
STEP 2 — SELECT ONE SUB-STYLE
════════════════════════════════════════════════════════════════════════
From the brand type, pick exactly ONE sub-style. Rotate sub-styles across
runs so repeat requests feel varied.

SaaS / AI Tool: Neon System | Corporate Clean | Data Grid | Minimal Tech | Futuristic UI
Fintech / Trust: Institutional | Modern Finance | Wealth | Clean Banking | Secure System
Luxury Brand: Dark Prestige | Editorial Luxury | Modern Luxury | Warm Luxury | Minimal Luxury
Consumer App: Friendly Bright | Soft UI | Clean Modern | Youthful | App Store Style
Creative / Playful: Candy | Gradient Pop | Retro Modern | Artistic | Startup Fun
Wellness / Calm: Nature | Soft Air | Spa | Minimal Calm | Organic
Developer Tool: Terminal Dark | Neon Dev | Hacker Minimal | Code UI | Infra Tool

If brand type is unclear, infer the closest match from the name's feel.

════════════════════════════════════════════════════════════════════════
STEP 3 — APPLY NAME INFLUENCE
════════════════════════════════════════════════════════════════════════
Refine the palette based on the name:
• Soft names → softer tones, gentler contrast
• Sharp, consonant-heavy names → higher contrast
• Names with "lux", "light", "bloom", "glow" → brighter highlights
• Names with "forge", "core", "stone", "iron" → heavier, grounded tones
• Names with "ink", "slate", "node" → cleaner, more editorial tones

════════════════════════════════════════════════════════════════════════
STEP 4 — GENERATE THREE PALETTES FROM THE SAME SUB-STYLE
════════════════════════════════════════════════════════════════════════
All three palettes must come from the SAME sub-style chosen in Step 2,
so they feel cohesive. But each has a different role:

  Palette 1 — CORE           (the reference version of this sub-style)
  Palette 2 — DARK/PREMIUM   (same direction, darker & more confident)
  Palette 3 — EXPRESSIVE     (same direction, pushed slightly further — more saturation, or one bolder accent)

For each palette, return:
• name — 2–3 word palette name (e.g. "Ink Prestige", "Graphite Luxe")
• feel — 2–3 words describing the brand feeling
• role — one of "core" | "dark" | "expressive"
• subStyle — the sub-style label you chose in Step 2 (same for all 3)
• palette — five HEX colours with role + usage:
    - background (the page backdrop)
    - primary    (buttons, logo marks, core actions)
    - accent     (highlights, sparingly)
    - surface    (cards, secondary panels, dividers)
    - text       (body copy)
• usageInsight — 1 sentence on where this variant shines

════════════════════════════════════════════════════════════════════════
STRICT RULES
════════════════════════════════════════════════════════════════════════
• background × text must clear WCAG AA contrast (4.5:1 for body)
• No random / disconnected colour sets — the 3 must feel like siblings
• Do not output generic "AI startup purple" or SaaS blue unless the
  sub-style genuinely calls for it (e.g. Futuristic UI, App Store Style)
• Never produce identical palettes on repeat runs — vary the sub-style
  across generations
• Hex values must be 6-digit uppercase (#RRGGBB)
• Each palette must feel like a real designer chose it for this brand

════════════════════════════════════════════════════════════════════════
OUTPUT
════════════════════════════════════════════════════════════════════════
Respond with ONLY valid JSON. No markdown, no commentary.
Shape:
{
  "variants": [
    { "name":"…","feel":"…","role":"core","subStyle":"…",
      "palette": {
        "background": {"hex":"#…","name":"…","usage":"…"},
        "primary":    {"hex":"#…","name":"…","usage":"…"},
        "accent":     {"hex":"#…","name":"…","usage":"…"},
        "surface":    {"hex":"#…","name":"…","usage":"…"},
        "text":       {"hex":"#…","name":"…","usage":"…"}
      },
      "usageInsight": "…" },
    { "role":"dark", ... },
    { "role":"expressive", ... }
  ]
}`

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

  const { brandName, keywords, vibe, brandType } = body as {
    brandName?: string
    keywords?: string
    vibe?: string
    brandType?: string
  }
  if (!brandName?.trim()) {
    return NextResponse.json({ error: "brandName is required" }, { status: 400 })
  }

  const client = getClient()

  // If the caller gave us an explicit brand type, use it. Otherwise infer from
  // the vibe the UI passes. This keeps the existing vibe selector working.
  const inferredType = brandType?.trim() || inferBrandTypeFromVibe(vibe)

  const userPrompt = `Generate three palette variants for:

Name: "${brandName.trim()}"
Brand Type: "${inferredType}"
Context / keywords: "${keywords?.trim() || "none provided"}"

Work through the 4 steps silently. Pick ONE sub-style from the brand-type list. Return all three variants (core / dark / expressive) from that same sub-style.`

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.92,
      max_tokens: 1400,
      response_format: { type: "json_object" },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 })
    }

    const parsed = JSON.parse(content) as { variants?: PaletteVariant[] }
    const variants = Array.isArray(parsed.variants) ? parsed.variants.slice(0, 3) : []
    if (variants.length === 0) {
      return NextResponse.json({ error: "No palette variants returned" }, { status: 500 })
    }

    // Back-compat shape: expose first variant's palette at the top level,
    // with `surface` aliased to `secondary` for existing consumers.
    const first = variants[0]
    const legacy = first?.palette
      ? {
          primary: first.palette.primary,
          secondary: first.palette.surface,
          accent: first.palette.accent,
          background: first.palette.background,
          text: first.palette.text,
        }
      : undefined

    const response: BrandPaletteResult = {
      variants,
      palette: legacy as BrandPaletteResult["palette"],
      rationale: first?.usageInsight ?? "",
    }

    if (!rateLimit.isPro) {
      logGeneration(req, rateLimit.userId, "palette", brandName.trim()).catch(() => {})
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("Brand palette generation error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    )
  }
}

function inferBrandTypeFromVibe(vibe?: string): string {
  const v = (vibe || "").toLowerCase()
  if (v === "luxury") return "Luxury Brand"
  if (v === "futuristic") return "SaaS / AI Tool"
  if (v === "trustworthy") return "Fintech / Trust"
  if (v === "playful") return "Creative / Playful"
  if (v === "minimal") return "SaaS / AI Tool"
  return "SaaS / AI Tool"
}
