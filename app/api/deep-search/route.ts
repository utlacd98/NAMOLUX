import { NextRequest } from "next/server"
import OpenAI from "openai"
import { checkAvailability } from "@/lib/domainGen/availability"
import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"
import { buildGenerationPrompt } from "@/lib/brandExamples"

export const runtime = "nodejs"
export const maxDuration = 60

// Each batch asks for this many candidates; 6 batches × 13 ≈ 75 total combos tested
const BATCH_SIZE = 13
const MAX_FOUND = 10
const MAX_BATCHES = 6

// ---------------------------------------------------------------------------
// Server-side pronounceability filter
// Catches garbage names that slip through despite prompt instructions.
// ---------------------------------------------------------------------------
const ALLOWED_CLUSTERS = /str|nch|nds|nks|ght|tch|dge|nge|rch|rds|rks|rts|nts|mps|lts|fts|cts|spl|spr|scr/gi

function isPronounceable(name: string): boolean {
  // Must contain at least one vowel
  if (!/[aeiou]/i.test(name)) return false

  // Must be at least 3 characters
  if (name.length < 3) return false

  // No triple repeated characters
  if (/(.)\1\1/.test(name)) return false

  // Reject 3+ consecutive consonants (after masking known-good clusters)
  const masked = name.replace(ALLOWED_CLUSTERS, "aa")
  if (/[^aeiou]{3,}/i.test(masked)) return false

  return true
}


// ---------------------------------------------------------------------------
// OpenAI call
// ---------------------------------------------------------------------------
function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

async function generateBatch(
  keyword: string,
  vibe: string,
  industry: string,
  maxLength: number,
  alreadySeen: Set<string>,
  signal: AbortSignal,
): Promise<string[]> {
  const client = getClient()
  const { system, user } = buildGenerationPrompt({
    keywords: keyword,
    industry: industry || "general",
    brandVibe: vibe || "modern",
    maxLength,
    batchSize: BATCH_SIZE,
    outputFormat: "names-only",
    alreadySeen: Array.from(alreadySeen),
  })

  const completion = await client.chat.completions.create(
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.92,
      max_tokens: 300,
    },
    { signal },
  )

  const content = completion.choices[0]?.message?.content?.trim() || "[]"
  const match = content.match(/\[[\s\S]*?\]/)
  if (!match) return []

  let names: unknown[]
  try {
    names = JSON.parse(match[0])
  } catch {
    return []
  }

  return (
    names
      .filter((n): n is string => typeof n === "string")
      // Normalise: lowercase, letters only
      .map((n) => n.toLowerCase().replace(/[^a-z]/g, ""))
      // Basic length and dedup filter
      .filter((n) => n.length >= 3 && n.length <= maxLength && !alreadySeen.has(n))
      // Server-side pronounceability gate
      .filter(isPronounceable)
  )
}

// ---------------------------------------------------------------------------
// SSE route
// ---------------------------------------------------------------------------
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
  request.signal.addEventListener("abort", () => abortController.abort())

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // controller already closed
        }
      }

      const found: string[] = []
      const seen = new Set<string>()

      try {
        for (let batchIdx = 0; batchIdx < MAX_BATCHES; batchIdx++) {
          if (found.length >= MAX_FOUND) break
          if (abortController.signal.aborted) break

          send({
            type: "progress",
            batch: batchIdx + 1,
            totalBatches: MAX_BATCHES,
            found: found.length,
            message: `Round ${batchIdx + 1}/${MAX_BATCHES} — generating candidates…`,
          })

          let candidates: string[] = []
          try {
            candidates = await generateBatch(keyword, vibe, industry, maxLength, seen, abortController.signal)
          } catch (err: unknown) {
            if (abortController.signal.aborted) break
            send({
              type: "error",
              message: `AI generation failed: ${err instanceof Error ? err.message : String(err)}`,
              partial: found.length > 0,
            })
            break
          }

          // Mark all candidates as seen so next batch doesn't duplicate
          candidates.forEach((n) => seen.add(n))

          // Check .com availability for each candidate
          for (const name of candidates) {
            if (found.length >= MAX_FOUND) break
            if (abortController.signal.aborted) break

            const domain = `${name}.com`

            try {
              const avResult = await checkAvailability(domain, { signal: abortController.signal })
              if (!avResult.available) continue

              const scored = scoreName({
                name,
                tld: "com",
                vibe: (vibe as BrandVibe) || undefined,
                keywords: [keyword],
              })

              found.push(domain)

              send({
                type: "result",
                result: {
                  name,
                  tld: "com",
                  fullDomain: domain,
                  available: true,
                  score: scored.score,
                  label: scored.label,
                  reasons: scored.reasons,
                  breakdown: scored.breakdown,
                },
              })

              send({
                type: "progress",
                batch: batchIdx + 1,
                totalBatches: MAX_BATCHES,
                found: found.length,
                message: `Found ${found.length}/${MAX_FOUND} available .com names…`,
              })
            } catch (err: unknown) {
              if (abortController.signal.aborted) break
              console.error(`Deep search: availability check failed for ${domain}:`, err)
            }
          }
        }

        send({
          type: "complete",
          found: found.length,
          message:
            found.length === 0
              ? "No available .com names found. Try a different keyword."
              : `Search complete — ${found.length} available .com name${found.length === 1 ? "" : "s"} confirmed.`,
        })
      } catch (err: unknown) {
        if (!abortController.signal.aborted) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
            partial: found.length > 0,
          })
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
