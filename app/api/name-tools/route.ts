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
      { error: "token_limit_reached", message: "You've used all 10 free tokens. Upgrade to Pro for unlimited access.", upgradeUrl: "/pricing" },
      { status: 429 }
    )
  }

  try {
    const { action, name, keyword, vibe } = await req.json()

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const cleanName = name.trim().toLowerCase().replace(/\.[a-z]+$/, "")

    let response: NextResponse
    switch (action) {
      case "narrative":
        response = await handleNarrative(cleanName)
        break
      case "taglines":
        response = await handleTaglines(cleanName, vibe)
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

async function handleNarrative(name: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 120,
    messages: [
      {
        role: "system",
        content: `You write 2-sentence brand origin stories for startup names.
Be specific, confident, and poetic. Sentence 1: where the name comes from or what it evokes.
Sentence 2: what that signals about the brand — values, feeling, or promise.
Never start with "This name" or "The name". Speak as if you know the brand deeply.
Write in present tense. No fluff. No marketing buzzwords.`,
      },
      {
        role: "user",
        content: `Write the brand origin story for: ${name}`,
      },
    ],
  })

  const narrative = completion.choices[0]?.message?.content?.trim() ?? ""
  return NextResponse.json({ narrative })
}

// ── Tagline Pairing ──────────────────────────────────────────────────────────

async function handleTaglines(name: string, vibe?: string) {
  const vibeContext = vibe ? ` The brand vibe is: ${vibe}.` : ""
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.85,
    max_tokens: 150,
    messages: [
      {
        role: "system",
        content: `You generate taglines for startup brand names. Output exactly 3 taglines, one per line.
No bullets, no numbers, no labels. Just the taglines.
Each tagline must be ≤ 7 words. Vary the style: one aspirational, one functional, one provocative.
Model these on great real examples: Stripe ("Payments infrastructure for the internet"),
Notion ("A new tool for thinking"), Linear ("The issue tracker you'll actually enjoy using").
Don't use the name itself in the tagline.`,
      },
      {
        role: "user",
        content: `Generate 3 taglines for the brand name: ${name}.${vibeContext}`,
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ""
  const taglines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
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
