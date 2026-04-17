import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, "name-tools")
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "token_limit_reached", message: "You've used all 3 free tokens. Upgrade to Pro for unlimited access.", upgradeUrl: "/pricing" },
      { status: 429 }
    )
  }

  try {
    const { action, name, keyword, vibe, industry } = await req.json()

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const cleanName = name.trim().toLowerCase().replace(/\.[a-z]+$/, "")

    let response: NextResponse
    switch (action) {
      case "narrative":
        response = await handleNarrative(cleanName, vibe, industry, keyword)
        break
      case "taglines":
        response = await handleTaglines(cleanName, vibe, industry, keyword)
        break
      case "names-like":
        response = await handleNamesLike(cleanName, keyword)
        break
      default:
        return NextResponse.json({ error: "invalid action" }, { status: 400 })
    }

    if (!rateLimit.isPro) {
      logGeneration(req, rateLimit.userId, "name-tools", cleanName).catch(() => {})
    }

    return response
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}

// ── Brand Narrative ──────────────────────────────────────────────────────────
// Strict 6-step strategist framework:
//   1. Analyse the name (roots, phonetics, structure, associations)
//   2. Determine context (keywords → category | name implies category | neutral)
//   3. Define positioning (target user, real tension, brand behaviour)
//   4. Write story following the 5-line structure
//   5. (Taglines handled separately)
//   6. Quality check — reject if story could apply to any other name

const BRAND_STRATEGIST_SYSTEM = `You are a brand naming STRATEGIST, not a copywriter.

Your job is to analyse a name and write a brand story that is grounded in reality, positioning, and the structure of the name itself.

DO NOT generate generic, inspirational, or luxury filler content.

════════════════════════════════════════════════════════════════════════
STEP 1 — ANALYSE THE NAME
════════════════════════════════════════════════════════════════════════
Silently work out:
• Possible roots or word associations (real morphemes, etymology)
• Phonetic feel (sharp, soft, fast, heavy, warm, clinical)
• Structure (short, invented, compound, real-word, blend)
• Immediate associations (tech, finance, creative, neutral)

════════════════════════════════════════════════════════════════════════
STEP 2 — DETERMINE CONTEXT (STRICT LOGIC)
════════════════════════════════════════════════════════════════════════
IF keywords are provided
  → Use them to define the category and audience
ELSE IF the name strongly implies a category (e.g. "Ledger" → finance)
  → Use that category
ELSE
  → DO NOT invent a category
  → Keep positioning neutral and flexible (founders, builders, teams)

Never hallucinate an industry.

════════════════════════════════════════════════════════════════════════
STEP 3 — DEFINE POSITIONING
════════════════════════════════════════════════════════════════════════
Before writing, decide:
• Target user — specific, not "everyone"
• Real tension — what is frustrating or broken in their world
• Brand behaviour — what this brand actually does differently (verbs, not virtues)

════════════════════════════════════════════════════════════════════════
STEP 4 — WRITE THE STORY
════════════════════════════════════════════════════════════════════════
Exactly 4–6 sentences, following this structure in order:
  S1. Anchor the story to the NAME (meaning, sound, or structure).
  S2. Define WHO it is for.
  S3. State a REAL problem or tension.
  S4. Explain how the brand BEHAVES differently.
  S5. Close with a line that ties DIRECTLY back to the name.
  (Optional S6 only if it adds a concrete image echoing the name.)

════════════════════════════════════════════════════════════════════════
HARD RULES
════════════════════════════════════════════════════════════════════════
• The story MUST feel like it only works for this specific name.
• If the story could apply to another name → REWRITE it.
• NO poetic filler. No "imagine". No "beautiful". No vague metaphors.
• NO luxury framing unless the name or keywords explicitly call for it.
• BANNED words and phrases (never use any of these):
    "empowering", "meaningful connections", "bringing people together",
    "innovative", "passionate", "visionary", "seamless", "reimagining",
    "in a world where", "lasting memories", "commitment to excellence",
    "elevate", "redefine", "indulge", "opulence", "discerning",
    "timeless sophistication", "modern connoisseur", "crafting elegance",
    "cutting-edge", "we believe", "at our core".
• MUST include at least one concrete detail (a type of user, action, object, environment, or moment).
• MUST include at least one direct reference to something audible or structural in the name (a syllable, sound, root, rhythm, or letter pattern).
• Active voice. Present tense. Plain language.

════════════════════════════════════════════════════════════════════════
STEP 6 — QUALITY CHECK (MANDATORY, INTERNAL)
════════════════════════════════════════════════════════════════════════
Before outputting, verify silently:
  ✓ Does the story clearly link to the name?
  ✓ Does it respect the keyword context (or lack of one)?
  ✓ Does it avoid all banned words and generic phrasing?
If any answer is NO → rewrite and try again before responding.

════════════════════════════════════════════════════════════════════════
OUTPUT
════════════════════════════════════════════════════════════════════════
Return only the final brand story paragraph. No headers. No labels. No quotation marks. No analysis — just the story.`

async function handleNarrative(name: string, vibe?: string, industry?: string, keyword?: string) {
  const userContext = [
    `Name: "${name}"`,
    keyword ? `Keywords: ${keyword}` : `Keywords: (none provided — keep positioning neutral)`,
    industry ? `Industry hint: ${industry}` : null,
    vibe ? `Vibe hint: ${vibe}` : null,
  ].filter(Boolean).join("\n")

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 280,
    messages: [
      { role: "system", content: BRAND_STRATEGIST_SYSTEM },
      {
        role: "user",
        content: `${userContext}

Work through the 6 steps silently, then output only the final brand story paragraph.`,
      },
    ],
  })

  const narrative = completion.choices[0]?.message?.content?.trim() ?? ""
  return NextResponse.json({ narrative })
}

// ── Tagline Pairing ──────────────────────────────────────────────────────────
// Strict 6-step framework — taglines are positioning, not poetry.
// Functional / experiential / aspirational, each locked to the name.

const TAGLINE_STRATEGIST_SYSTEM = `You are a brand naming STRATEGIST, not a copywriter.

You write taglines that are grounded in the name, the positioning, and the category — never generic inspirational filler.

════════════════════════════════════════════════════════════════════════
STEP 1 — ANALYSE THE NAME
════════════════════════════════════════════════════════════════════════
Silently note: roots, phonetics, structure, associations.

════════════════════════════════════════════════════════════════════════
STEP 2 — DETERMINE CONTEXT (STRICT)
════════════════════════════════════════════════════════════════════════
IF keywords exist → use them for category and audience.
ELSE IF name strongly implies a category → use that category.
ELSE → keep neutral. DO NOT invent a category or hallucinate an industry.

════════════════════════════════════════════════════════════════════════
STEP 3 — DEFINE POSITIONING
════════════════════════════════════════════════════════════════════════
Target user, real tension, brand behaviour. Specific, not "everyone".

════════════════════════════════════════════════════════════════════════
STEP 5 — WRITE EXACTLY 3 TAGLINES
════════════════════════════════════════════════════════════════════════
In this order, one per line:
  1. FUNCTIONAL — what it does. Plain, clear, category-evident.
  2. EXPERIENTIAL — how it feels. Rhythm, texture, sensory.
  3. ASPIRATIONAL — what it enables. Outcome, not process.

RULES:
• 3–7 words. No exceptions.
• One idea per line. If you need "and" you are cramming.
• Must NOT contain the brand name itself.
• Each line must connect to the name or positioning.
• If a line is generic or could apply to any brand → REWRITE it.

BANNED (reject any line containing these):
"empowering", "meaningful connections", "elevate", "redefine", "indulge",
"opulence", "discerning", "seamless", "unlock your potential",
"take it to the next level", "crafted elegance", "timeless sophistication",
"modern connoisseur", "innovative solutions", "bringing people together",
"passion", "reimagine".

TONE GUIDE:
• Sharp consonant-heavy name → blunt, kinetic lines.
• Soft vowel-rich name → calm, warm lines.
• Invented word → functional line must make the category obvious.

MODEL EXAMPLES (study the rhythm, don't copy):
Stripe — "Payments infrastructure for the internet." / "Money moves fast." / "Start, run, scale."
Notion — "A new tool for thinking." / "Write, plan, share." / "One workspace. Every team."
Linear — "The issue tracker you'll enjoy." / "Built for modern teams." / "Ship fast without chaos."

════════════════════════════════════════════════════════════════════════
STEP 6 — QUALITY CHECK (INTERNAL)
════════════════════════════════════════════════════════════════════════
Before outputting, verify silently:
  ✓ Does each tagline connect to the name?
  ✓ Does it respect the keyword context (or neutral if none)?
  ✓ Does it avoid every banned phrase?
If any answer is NO → rewrite that line.

════════════════════════════════════════════════════════════════════════
OUTPUT
════════════════════════════════════════════════════════════════════════
Exactly 3 taglines. One per line. No labels. No numbers. No quotes. No commentary.`

async function handleTaglines(name: string, vibe?: string, industry?: string, keyword?: string) {
  const userContext = [
    `Name: "${name}"`,
    keyword ? `Keywords: ${keyword}` : `Keywords: (none provided — keep positioning neutral)`,
    industry ? `Industry hint: ${industry}` : null,
    vibe ? `Vibe hint: ${vibe}` : null,
  ].filter(Boolean).join("\n")

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.85,
    max_tokens: 220,
    messages: [
      { role: "system", content: TAGLINE_STRATEGIST_SYSTEM },
      {
        role: "user",
        content: `${userContext}

Work through the 6 steps silently, then output only the three final taglines, one per line.`,
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""

  // Server-side filter — backstop in case the model slips a banned phrase through
  const banned = [
    /empowering/i, /meaningful connection/i, /bringing people together/i,
    /lasting memor/i, /seamless/i, /reimagin/i, /unlock your potential/i,
    /next level/i, /elevate your/i, /redefine your/i, /opulence/i,
    /discerning/i, /indulge/i, /timeless sophistic/i, /modern connoisseur/i,
    /crafted elegance/i, /commitment to excellence/i, /innovative solutions/i,
  ]

  const taglines = raw
    .split("\n")
    .map((l) => l.trim().replace(/^["'\d.)\s*•-]+/, "").replace(/["']$/, "").trim())
    .filter(Boolean)
    .filter((l) => l.length >= 3 && l.split(/\s+/).length <= 9)
    .filter((l) => !banned.some((re) => re.test(l)))
    .slice(0, 3)

  return NextResponse.json({ taglines })
}

// ── Names Like ───────────────────────────────────────────────────────────────

async function handleNamesLike(inspirationName: string, keyword?: string) {
  const keywordContext = keyword ? ` The product is about: ${keyword}.` : ""
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.88,
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: `You are a world-class brand naming expert. Analyze the structural DNA of a given brand name and generate 8 new names with the same naming style.

Extract these qualities: naming strategy (invented/compound/metaphor/root+suffix), syllable count, emotional register (serious/playful/minimal/bold), and whether it uses a real word, invented word, or hybrid.

Output exactly 8 names, one per line. No explanations. No numbers. No TLD extensions.
Each name must:
- Be 5–11 characters
- Be pronounceable in one try
- Have the same emotional register as the inspiration
- Be a .com candidate (not obviously already a huge brand)
- Pass the Meaning Anchor Test: it must come from somewhere (a word, root, feeling, concept)

REJECT: fake-Latin (-ora/-ova/-era), sci-fi endings (-ix/-rix/-trix), meaningless prefixes (Nexo-, Zyro-), generic tech compounds (DataFlow, SmartHub)`,
      },
      {
        role: "user",
        content: `Generate 8 names with the same DNA as: ${inspirationName}.${keywordContext}`,
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  const names = raw
    .split("\n")
    .map((l) => l.trim().replace(/^[-•*\d.]+\s*/, "").split(/[^a-zA-Z]/)[0])
    .filter((n) => n && n.length >= 3 && n.length <= 14)
    .slice(0, 8)

  return NextResponse.json({ names })
}
