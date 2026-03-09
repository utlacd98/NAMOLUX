import { NextRequest } from "next/server"
import OpenAI from "openai"
import { checkAvailability } from "@/lib/domainGen/availability"
import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"

export const runtime = "nodejs"
export const maxDuration = 60

const STRATEGIES = [
  "BLENDING: fuse two relevant words into one smooth portmanteau (e.g. keyword + related concept merged)",
  "TRUNCATION: shorten the keyword by removing vowels or syllables to create a punchy abbreviated name",
  "PHONETIC RESPELLING: respell the keyword or concept phonetically to make it unique (e.g. Lyft, Fiverr, Tumblr)",
  "PREFIX/SUFFIX: add power prefixes or suffixes (get, try, use, go, my, -ly, -ify, -io, -hub, -base, -spot)",
  "LETTER SWAP: replace letters in the keyword with similar-sounding letters to create a distinctive brand variant",
  "CROSS-KEYWORD MASHUP: combine the keyword with the industry or vibe context to form a brand-new compound name",
]

const BATCH_SIZE = 13 // 6 strategies × ~13 = ~75 combos total
const MAX_FOUND = 10
const MAX_BATCHES = 6

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

async function generateBatch(
  keyword: string,
  vibe: string,
  industry: string,
  maxLength: number,
  strategy: string,
  alreadySeen: Set<string>,
  signal: AbortSignal,
): Promise<string[]> {
  const client = getClient()

  const systemPrompt = `You are an expert startup naming consultant specialising in .com domain names.
Rules:
- Output ONLY a JSON array of strings — no explanation, no markdown, no code fences
- Each entry is the domain SLD only (no .com, no dots, no hyphens, letters only)
- Max ${maxLength} characters per name
- Every name must be easy to pronounce and remember
- Apply ONLY the strategy specified — do not mix strategies
- Do NOT suggest: ${Array.from(alreadySeen).slice(0, 40).join(", ") || "none"}`

  const userPrompt = `Keyword: "${keyword}"
Vibe: ${vibe || "modern"}
Industry: ${industry || "technology"}
Strategy: ${strategy}

Generate exactly ${BATCH_SIZE} .com domain name candidates using ONLY the strategy above.
Return ONLY a JSON array like: ["name1","name2","name3"]`

  const completion = await client.chat.completions.create(
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.95,
      max_tokens: 200,
    },
    { signal },
  )

  const content = completion.choices[0]?.message?.content?.trim() || "[]"
  const match = content.match(/\[[\s\S]*\]/)
  if (!match) return []

  const names: unknown[] = JSON.parse(match[0])
  return names
    .filter((n): n is string => typeof n === "string")
    .map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((n) => n.length >= 3 && n.length <= maxLength && !alreadySeen.has(n))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = (searchParams.get("keyword") || "").trim()
  const vibe = searchParams.get("vibe") || "luxury"
  const industry = searchParams.get("industry") || ""
  const maxLength = Math.min(20, Math.max(4, parseInt(searchParams.get("maxLength") || "10", 10)))

  if (!keyword) {
    return new Response(JSON.stringify({ error: "keyword is required" }), { status: 400 })
  }

  const encoder = new TextEncoder()
  const abortController = new AbortController()

  // If the client disconnects, abort our own work
  request.signal.addEventListener("abort", () => abortController.abort())

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // controller may already be closed
        }
      }

      const found: string[] = []
      const seen = new Set<string>()

      try {
        for (let batchIdx = 0; batchIdx < MAX_BATCHES; batchIdx++) {
          if (found.length >= MAX_FOUND) break
          if (abortController.signal.aborted) break

          const strategy = STRATEGIES[batchIdx % STRATEGIES.length]

          send({
            type: "progress",
            batch: batchIdx + 1,
            totalBatches: MAX_BATCHES,
            found: found.length,
            message: `Batch ${batchIdx + 1}/${MAX_BATCHES} — generating with strategy: ${strategy.split("(")[0].trim()}…`,
          })

          let candidates: string[] = []
          try {
            candidates = await generateBatch(keyword, vibe, industry, maxLength, strategy, seen, abortController.signal)
          } catch (err: unknown) {
            if (abortController.signal.aborted) break
            const errorMsg = err instanceof Error ? err.message : String(err)
            send({ type: "error", message: `AI generation failed: ${errorMsg}`, partial: true })
            break
          }

          // Add to seen
          candidates.forEach((n) => seen.add(n))

          // Check each candidate
          for (const name of candidates) {
            if (found.length >= MAX_FOUND) break
            if (abortController.signal.aborted) break

            const domain = `${name}.com`

            try {
              const avResult = await checkAvailability(domain, { signal: abortController.signal })
              if (!avResult.available) continue

              // Score it
              const scored = scoreName({
                name,
                tld: "com",
                vibe: (vibe as BrandVibe) || undefined,
                keywords: [keyword],
              })

              const result = {
                name,
                tld: "com",
                fullDomain: domain,
                available: true,
                score: scored.score,
                label: scored.label,
                reasons: scored.reasons,
                breakdown: scored.breakdown,
              }

              found.push(domain)

              send({ type: "result", result })

              send({
                type: "progress",
                batch: batchIdx + 1,
                totalBatches: MAX_BATCHES,
                found: found.length,
                message: `Found ${found.length}/${MAX_FOUND} available .com names…`,
              })
            } catch (err: unknown) {
              if (abortController.signal.aborted) break
              // Silently skip failed availability checks — don't abort the whole search
              console.error(`Deep search availability check failed for ${domain}:`, err)
            }
          }
        }

        send({
          type: "complete",
          found: found.length,
          message:
            found.length === 0
              ? "No available .com names found. Try a different keyword."
              : `Search complete — found ${found.length} available .com name${found.length === 1 ? "" : "s"}.`,
        })
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          send({ type: "error", message: errorMsg, partial: found.length > 0 })
        }
      } finally {
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
