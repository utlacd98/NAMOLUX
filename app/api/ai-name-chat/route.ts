import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { buildGenerationPrompt } from "@/lib/brandExamples"
import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"
import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 45

const ALLOWED_CLUSTERS =
  /str|nch|nds|nks|ght|tch|dge|nge|rch|rds|rks|rts|nts|mps|lts|fts|cts|spl|spr|scr/gi

function isPronounceable(name: string): boolean {
  if (!/[aeiou]/i.test(name)) return false
  if (name.length < 3) return false
  if (/(.)\1\1/.test(name)) return false
  const masked = name.replace(ALLOWED_CLUSTERS, "aa")
  if (/[^aeiou]{3,}/i.test(masked)) return false
  return true
}

export async function POST(req: NextRequest) {
  const rateLimit = await checkRateLimit(req, "ai-chat")
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "token_limit_reached", message: "You've used all 10 free tokens. Upgrade to Pro for unlimited access.", upgradeUrl: "/pricing" },
      { status: 429 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const description = String(body.description || "").trim()
  const vibe = String(body.vibe || "modern")
  const industry = String(body.industry || "")
  const maxLength = Math.min(Math.max(Number(body.maxLength) || 9, 5), 12)
  const keywords = String(body.keywords || "")

  if (description.length < 10) {
    return NextResponse.json({ error: "description too short" }, { status: 400 })
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Build the generation prompt — use the description as the keyword context
  const promptKeywords = keywords.trim() || description.slice(0, 80)

  const { system, user } = buildGenerationPrompt({
    keywords: promptKeywords,
    industry: industry || "general",
    brandVibe: vibe,
    maxLength,
    batchSize: 40,
    outputFormat: "names-only",
    strategy: "invented",
  })

  // Append the full description so GPT has complete context
  const enhancedUser =
    `${user}\n\nFull brand description: "${description}"\n\n` +
    `Generate names that feel tailor-made for this specific concept and description. ` +
    `Prioritise originality — avoid anything that sounds generic.`

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: enhancedUser },
      ],
      temperature: 0.9,
      max_tokens: 600,
    })

    const content = completion.choices[0]?.message?.content?.trim() ?? "[]"
    const match = content.match(/\[[\s\S]*?\]/)

    let rawNames: string[] = []
    if (match) {
      try {
        const parsed: unknown[] = JSON.parse(match[0])
        rawNames = parsed
          .filter((n): n is string => typeof n === "string")
          .map((n) => n.toLowerCase().replace(/[^a-z]/g, ""))
          .filter((n) => n.length >= 3 && n.length <= maxLength)
          .filter(isPronounceable)
      } catch {
        /* ignore */
      }
    }

    if (rawNames.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    // Score all candidates and take top 22 for availability checking
    const scoredCandidates = rawNames
      .map((name) => ({
        name,
        score: scoreName({
          name,
          tld: "com",
          vibe: vibe as BrandVibe,
          keywords: [promptKeywords],
        }).score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 22)

    const ALL_TLDS = ["com", "io", "co", "ai", "app", "dev"] as const

    // Check all 6 TLDs for every candidate in one batch
    const allDomains = scoredCandidates.flatMap((c) => ALL_TLDS.map((tld) => `${c.name}.${tld}`))
    const availability = await checkAvailabilityBatch(allDomains, { concurrency: 6 })

    // Build final result list with per-TLD breakdown
    const results = scoredCandidates.map(({ name }) => {
      const scored = scoreName({
        name,
        tld: "com",
        vibe: vibe as BrandVibe,
        keywords: [promptKeywords],
      })

      const tlds: Record<string, boolean | null> = {}
      for (const tld of ALL_TLDS) {
        const r = availability.find((a) => a.domain === `${name}.${tld}`)
        tlds[tld] = r ? r.available : null
      }

      const comAvailable = tlds["com"] === true
      const anyAvailable = Object.values(tlds).some((v) => v === true)
      // Best available TLD in priority order
      const bestTld = ALL_TLDS.find((tld) => tlds[tld] === true) ?? null

      return {
        name,
        tld: "com",
        fullDomain: `${name}.com`,
        available: comAvailable,
        anyAvailable,
        bestTld,
        tlds,
        confidence: availability.find((a) => a.domain === `${name}.com`)?.confidence ?? "low",
        score: scored.score,
        label: scored.label,
        reasons: scored.reasons,
      }
    })

    // Names with ANY available TLD first, then by score
    results.sort((a, b) => {
      if (a.anyAvailable !== b.anyAvailable) return a.anyAvailable ? -1 : 1
      return b.score - a.score
    })

    if (!rateLimit.isPro) {
      logGeneration(req, rateLimit.userId, "ai-chat", description.slice(0, 80)).catch(() => {})
    }

    return NextResponse.json({ success: true, results: results.slice(0, 15) })
  } catch (err) {
    console.error("ai-name-chat error:", err)
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 })
  }
}
