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
// Based on professional naming-agency structure:
//   1. Anchor to the name (sound, metaphor, root)
//   2. Concrete context (implied founder or use case)
//   3. Real-world tension (the frustration this brand addresses)
//   4. Distinctive promise / behaviour (verbs, not virtues)
//   5. Name-echoing image or metaphor to close the loop

async function handleNarrative(name: string, vibe?: string, industry?: string, keyword?: string) {
  const vibeLine = vibe ? `Vibe: ${vibe}.` : ""
  const industryLine = industry ? `Industry hint: ${industry}.` : ""
  const keywordLine = keyword ? `Keywords the founder shared: ${keyword}.` : ""

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.78,
    max_tokens: 240,
    messages: [
      {
        role: "system",
        content: `You are a senior brand strategist at a top naming agency. You write brand origin stories the way Lexicon Branding, Igor, or Lark's copywriters do — grounded, specific, and inseparable from the name itself.

STRUCTURE (follow this exactly, in one flowing paragraph of 3–5 sentences):
1. Anchor sentence — name the sound, rhythm, metaphor, or root the name is built on. Make the reader notice something specific about the word.
2. Context sentence — sketch the implied founder, product, or category this would fit. Something concrete: "small teams shipping fast", "studios that care about craft", "founders tired of dashboards that lie."
3. Tension sentence — name the real-world frustration this brand exists to push against. Everyday language, not "in a world where…".
4. Promise sentence — describe the brand's behaviour with verbs: what it always does, what it refuses to do.
5. (Optional) Close with an image that echoes the name's sound or meaning again.

HARD RULES — violating any of these will get the story rejected:
• BANNED PHRASES (never use): "meaningful connections", "empowering journeys", "in a world where", "reimagining", "passionate about", "bringing people together", "lasting memories", "seamless experience", "commitment to quality", "innovative solutions", "cutting-edge", "we believe".
• BANNED ADJECTIVES without concrete proof: "innovative", "passionate", "empowering", "dynamic", "visionary", "unique" (unless followed by a specific example).
• At least ONE direct reference to something audible in the name (a letter sound, syllable, rhythm, or a real-word root it contains).
• At least ONE concrete detail — a type of user, an action, an object, a place, or an environment.
• Active voice, present tense, no marketing fluff.
• Never start with "This name" or "The name" or "In a world".

TONE: Match the vibe. A sharp consonant-heavy name suits kinetic, blunt language. A soft, rounded name suits warmer, calmer language. Mirror the name's texture in the writing.

Output ONLY the paragraph. No headers, no labels, no quotation marks.`,
      },
      {
        role: "user",
        content: `Write the brand origin story for: "${name}"
${vibeLine}
${industryLine}
${keywordLine}

Think first: what is the name built from — sound, root, metaphor? What kind of founder would pick this name? What tension or frustration fits it? Then write the paragraph following the structure.`,
      },
    ],
  })

  const narrative = completion.choices[0]?.message?.content?.trim() ?? ""
  return NextResponse.json({ narrative })
}

// ── Tagline Pairing ──────────────────────────────────────────────────────────
// Agency approach: each tagline is a compressed positioning statement.
// Three distinct types — descriptive, experiential, aspirational — each locked
// to the name's semantics or phonetics. No mission-statement length. No jargon.
// Single idea per line.

async function handleTaglines(name: string, vibe?: string, industry?: string, keyword?: string) {
  const vibeLine = vibe ? `Vibe: ${vibe}.` : ""
  const industryLine = industry ? `Industry: ${industry}.` : ""
  const keywordLine = keyword ? `Product keywords: ${keyword}.` : ""

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.9,
    max_tokens: 220,
    messages: [
      {
        role: "system",
        content: `You write taglines the way a senior naming agency does. Each tagline is a compressed positioning statement locked to the specific name — its sound, its meaning, or the metaphor it evokes.

OUTPUT EXACTLY 3 TAGLINES, one per line, in this order:
1. Descriptive — "what it does / for whom". Plain, clear, immediately understandable.
2. Experiential — "how it feels to use". Rhythm, texture, a single sensory word.
3. Aspirational — "what it makes possible". Outcome, not process.

HARD RULES:
• 3–7 words each. No exceptions.
• ONE idea per line. If you need "and" you are cramming.
• Must NOT contain the brand name itself.
• Must NOT start with "The" unless absolutely necessary.
• Each line should echo something about the name — a syllable, a meaning, or a metaphor the name suggests. The reader should sense the tagline belongs to this specific word.

BANNED WORDS AND PHRASES (never use):
"meaningful connections", "empowering journeys", "lasting memories", "seamless", "reimagining", "unlock your potential", "take your X to the next level", "elevate", "redefine", "opulence", "discerning", "indulge", "commitment to excellence", "passion", "innovation" (on its own — okay with an object).

AVOID luxury-perfume clichés: "crafted elegance", "timeless sophistication", "discerning tastes", "modern connoisseur", "redefine your space".

TONE GUIDE:
• Sharp, consonant-heavy names → blunt, kinetic lines ("Ship in a week").
• Soft, vowel-rich names → calm, warm lines ("Where quiet work happens").
• Invented words → descriptive first line matters most — tell the reader what it is.

MODEL EXAMPLES (study the rhythm and directness, don't copy):
Stripe — "Payments infrastructure for the internet." "Money moves, so does everything." "Start, run, scale online."
Notion — "A new tool for thinking." "Write, plan, share." "One workspace. Every team."
Linear — "The issue tracker you'll enjoy." "Built for modern software teams." "Ship fast without chaos."
Figma — "Nothing great is made alone." "Design, together." "From idea to interface."

Output ONLY the three taglines. No labels. No numbers. No quotes. One per line.`,
      },
      {
        role: "user",
        content: `Write 3 taglines for the brand name: "${name}"
${vibeLine}
${industryLine}
${keywordLine}

First, identify what the name evokes (sound, meaning, metaphor). Then write three taglines — descriptive, experiential, aspirational — each locked to that.`,
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""

  // Filter out generic/banned phrases that slip through
  const banned = [
    /meaningful connection/i, /empowering journey/i, /lasting memor/i, /seamless/i,
    /reimagin/i, /unlock your potential/i, /next level/i, /elevate your/i,
    /redefine your/i, /opulence/i, /discerning/i, /indulge/i, /timeless sophistic/i,
    /modern connoisseur/i, /crafted elegance/i, /commitment to excellence/i,
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
