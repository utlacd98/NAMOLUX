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
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  return new OpenAI({ apiKey })
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

const HEX_RE = /^#[0-9A-F]{6}$/

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return hash >>> 0
}

function cleanHex(value: unknown, fallback: string): string {
  const raw = String(value || "").trim().toUpperCase()
  return HEX_RE.test(raw) ? raw : fallback
}

function cleanText(value: unknown, fallback: string): string {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  return text || fallback
}

function colour(hex: string, name: string, usage: string): PaletteColour {
  return { hex, name, usage }
}

function toLegacyPalette(variant: PaletteVariant): BrandPaletteResult["palette"] {
  return {
    primary: variant.palette.primary,
    secondary: variant.palette.surface,
    accent: variant.palette.accent,
    background: variant.palette.background,
    text: variant.palette.text,
  }
}

function normaliseVariant(raw: any, index: number, fallback: PaletteVariant): PaletteVariant {
  const sourcePalette = raw?.palette || {}
  return {
    name: cleanText(raw?.name, fallback.name),
    feel: cleanText(raw?.feel, fallback.feel),
    role: raw?.role === "dark" || raw?.role === "expressive" || raw?.role === "core" ? raw.role : fallback.role,
    subStyle: cleanText(raw?.subStyle, fallback.subStyle),
    palette: {
      background: {
        hex: cleanHex(sourcePalette.background?.hex, fallback.palette.background.hex),
        name: cleanText(sourcePalette.background?.name, fallback.palette.background.name),
        usage: cleanText(sourcePalette.background?.usage, fallback.palette.background.usage),
      },
      primary: {
        hex: cleanHex(sourcePalette.primary?.hex, fallback.palette.primary.hex),
        name: cleanText(sourcePalette.primary?.name, fallback.palette.primary.name),
        usage: cleanText(sourcePalette.primary?.usage, fallback.palette.primary.usage),
      },
      accent: {
        hex: cleanHex(sourcePalette.accent?.hex, fallback.palette.accent.hex),
        name: cleanText(sourcePalette.accent?.name, fallback.palette.accent.name),
        usage: cleanText(sourcePalette.accent?.usage, fallback.palette.accent.usage),
      },
      surface: {
        hex: cleanHex(sourcePalette.surface?.hex, fallback.palette.surface.hex),
        name: cleanText(sourcePalette.surface?.name, fallback.palette.surface.name),
        usage: cleanText(sourcePalette.surface?.usage, fallback.palette.surface.usage),
      },
      text: {
        hex: cleanHex(sourcePalette.text?.hex, fallback.palette.text.hex),
        name: cleanText(sourcePalette.text?.name, fallback.palette.text.name),
        usage: cleanText(sourcePalette.text?.usage, fallback.palette.text.usage),
      },
    },
    usageInsight: cleanText(raw?.usageInsight, fallback.usageInsight),
  }
}

function fallbackVariants(brandName: string, brandType: string, vibe?: string): PaletteVariant[] {
  const key = `${brandName}:${brandType}:${vibe || ""}`.toLowerCase()
  const offset = hashString(key) % 3
  const type = brandType.toLowerCase()

  const sets: Record<string, PaletteVariant[]> = {
    saas: [
      {
        name: "Signal Grove",
        feel: "Calm, precise",
        role: "core",
        subStyle: "Corporate Clean",
        palette: {
          background: colour("#F7F7F2", "Soft Chalk", "Main page backdrop"),
          primary: colour("#2F5D50", "Deep Teal", "Primary actions and logo marks"),
          accent: colour("#C89B3C", "Measured Gold", "Highlights and success moments"),
          surface: colour("#E6E2D8", "Warm Stone", "Cards and secondary panels"),
          text: colour("#17201D", "Ink Green", "Body copy and navigation"),
        },
        usageInsight: "Best for a credible product that needs to feel polished without looking generic.",
      },
      {
        name: "Graphite Console",
        feel: "Focused, premium",
        role: "dark",
        subStyle: "Corporate Clean",
        palette: {
          background: colour("#101512", "Graphite Green", "Dark app background"),
          primary: colour("#D5B46A", "Quiet Gold", "Buttons and active states"),
          accent: colour("#6FAE9A", "System Mint", "Charts and secondary emphasis"),
          surface: colour("#1B231F", "Panel Green", "Cards and tool surfaces"),
          text: colour("#F3F1EA", "Soft White", "Body copy on dark surfaces"),
        },
        usageInsight: "Use this when the brand should feel more enterprise and command-centre ready.",
      },
      {
        name: "Copper Grid",
        feel: "Distinct, sharp",
        role: "expressive",
        subStyle: "Corporate Clean",
        palette: {
          background: colour("#FBFAF5", "Porcelain", "Marketing and documentation background"),
          primary: colour("#7A4E2D", "Burnished Copper", "Primary brand mark"),
          accent: colour("#1E7C68", "Deep Aqua", "Interactive highlights"),
          surface: colour("#EDE4D3", "Linen Panel", "Cards and form fields"),
          text: colour("#211A14", "Umber Ink", "Primary text"),
        },
        usageInsight: "A stronger direction for launch pages that need a memorable accent system.",
      },
    ],
    luxury: [
      {
        name: "Editorial Ivory",
        feel: "Quiet, refined",
        role: "core",
        subStyle: "Editorial Luxury",
        palette: {
          background: colour("#F6F1E8", "Editorial Ivory", "Main canvas"),
          primary: colour("#6B5135", "Aged Bronze", "Logo marks and key actions"),
          accent: colour("#B88645", "Polished Brass", "Highlights"),
          surface: colour("#E8DDCC", "Warm Parchment", "Cards and product panels"),
          text: colour("#1D1712", "Espresso Ink", "Editorial text"),
        },
        usageInsight: "Best for premium brands that need restraint and warmth.",
      },
      {
        name: "Black Label",
        feel: "Dark, assured",
        role: "dark",
        subStyle: "Editorial Luxury",
        palette: {
          background: colour("#11100E", "Black Label", "Dark hero and high-end sections"),
          primary: colour("#D1AF6A", "Champagne Gold", "Primary CTA and monogram"),
          accent: colour("#8C5E3C", "Cognac", "Secondary emphasis"),
          surface: colour("#1F1B16", "Walnut Panel", "Cards and navigation"),
          text: colour("#F7F1E7", "Silk White", "Body copy"),
        },
        usageInsight: "Use for a prestige direction with strong photography or minimal product imagery.",
      },
      {
        name: "Sage Atelier",
        feel: "Natural, elevated",
        role: "expressive",
        subStyle: "Editorial Luxury",
        palette: {
          background: colour("#F2EFE6", "Atelier Linen", "Page backdrop"),
          primary: colour("#385144", "Deep Sage", "Primary identity colour"),
          accent: colour("#C09254", "Soft Gilt", "Highlights and details"),
          surface: colour("#DDD3C0", "Stone Silk", "Cards and image frames"),
          text: colour("#18211C", "Botanical Ink", "Body text"),
        },
        usageInsight: "A useful premium route for wellness, beauty, and craft brands.",
      },
    ],
    consumer: [
      {
        name: "Fresh Market",
        feel: "Friendly, clear",
        role: "core",
        subStyle: "Friendly Bright",
        palette: {
          background: colour("#FFFDF7", "Milk Glass", "Main background"),
          primary: colour("#256D5A", "Fresh Green", "Primary buttons"),
          accent: colour("#F2B84B", "Sunny Marigold", "Highlights and badges"),
          surface: colour("#EAF2E7", "Soft Mint", "Cards and input surfaces"),
          text: colour("#17221E", "Garden Ink", "Text and navigation"),
        },
        usageInsight: "Works for approachable apps that still need a trustworthy base.",
      },
      {
        name: "Night Pop",
        feel: "Bold, social",
        role: "dark",
        subStyle: "Friendly Bright",
        palette: {
          background: colour("#161514", "Charcoal Cocoa", "Dark app shell"),
          primary: colour("#FFB84D", "Mango Button", "Primary actions"),
          accent: colour("#55C7A4", "Fresh Mint", "Secondary actions"),
          surface: colour("#24211E", "Cocoa Surface", "Cards and drawers"),
          text: colour("#FFF7E8", "Cream White", "Body copy"),
        },
        usageInsight: "Useful for a playful mobile product without falling into neon purple.",
      },
      {
        name: "Coral Field",
        feel: "Warm, lively",
        role: "expressive",
        subStyle: "Friendly Bright",
        palette: {
          background: colour("#FFF7EF", "Warm Paper", "Main canvas"),
          primary: colour("#D85B3F", "Soft Coral", "Buttons and logo fill"),
          accent: colour("#287C72", "Harbour Teal", "Highlights and links"),
          surface: colour("#F4DFCA", "Peach Stone", "Cards and panels"),
          text: colour("#2A1B16", "Brown Ink", "Primary text"),
        },
        usageInsight: "A memorable choice for consumer brands that need warmth and energy.",
      },
    ],
  }

  const selected =
    type.includes("luxury") ? sets.luxury :
    type.includes("consumer") || type.includes("creative") || type.includes("wellness") ? sets.consumer :
    sets.saas

  return [...selected.slice(offset), ...selected.slice(0, offset)].map((variant, index) => ({
    ...variant,
    role: index === 0 ? "core" : index === 1 ? "dark" : "expressive",
  }))
}

function buildResponse(variants: PaletteVariant[]): BrandPaletteResult {
  const first = variants[0]
  return {
    variants,
    palette: toLegacyPalette(first),
    rationale: first.usageInsight,
  }
}

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
  const fallback = fallbackVariants(brandName.trim(), inferredType, vibe)

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
    const variants = Array.from({ length: 3 }, (_, index) =>
      normaliseVariant(Array.isArray(parsed.variants) ? parsed.variants[index] : null, index, fallback[index]),
    )
    const response = buildResponse(variants)

    if (!rateLimit.isPro) {
      logGeneration(req, rateLimit.userId, "palette", brandName.trim()).catch(() => {})
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("Brand palette generation error:", err)
    return NextResponse.json(buildResponse(fallback))
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
