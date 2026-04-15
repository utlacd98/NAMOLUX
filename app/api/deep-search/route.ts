import { NextRequest } from "next/server"
import OpenAI from "openai"
import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"
import { buildGenerationPrompt, type DeepSearchStrategy } from "@/lib/brandExamples"
import { checkSocialHandles, type SocialHandleResult } from "@/lib/socialChecker"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

// 5 batches × 18 names ≈ 90 total candidates
const BATCH_SIZE = 18
const MAX_FOUND = 10
const MAX_BATCHES = 5

// Minimum Founder Signal score before we bother checking availability.
// Cuts wasted RDAP calls on low-quality names by ~40%.
const PRE_SCORE_FLOOR = 68

// Strategy rotation order per batch
const STRATEGIES: DeepSearchStrategy[] = ["invented", "compound", "root+suffix", "metaphor", "invented"]

// Other TLDs to check once a .com is confirmed available
const OTHER_TLDS = ["io", "co", "ai", "app", "dev"] as const

// ---------------------------------------------------------------------------
// Server-side pronounceability filter
// ---------------------------------------------------------------------------
const ALLOWED_CLUSTERS = /str|nch|nds|nks|ght|tch|dge|nge|rch|rds|rks|rts|nts|mps|lts|fts|cts|spl|spr|scr/gi

function isPronounceable(name: string): boolean {
  if (!/[aeiou]/i.test(name)) return false
  if (name.length < 3) return false
  if (/(.)\1\1/.test(name)) return false
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
  takenNames: string[],
  strategy: DeepSearchStrategy,
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
    strategy,
    takenNames,
  })

  const completion = await client.chat.completions.create(
    {
      model: "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.88,
      max_tokens: 360,
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
      .map((n) => n.toLowerCase().replace(/[^a-z]/g, ""))
      .filter((n) => n.length >= 3 && n.length <= maxLength && !alreadySeen.has(n))
      .filter(isPronounceable)
  )
}

// ---------------------------------------------------------------------------
// SSE route
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const rateLimit = await checkRateLimit(request, "deep-search")
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "token_limit_reached", message: "You've used all 3 free tokens. Upgrade to Pro for unlimited access.", upgradeUrl: "/pricing" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    )
  }

  const { searchParams } = new URL(request.url)
  const keyword = (searchParams.get("keyword") || "").trim()
  const vibe = searchParams.get("vibe") || "luxury"
  const industry = searchParams.get("industry") || ""
  const maxLength = Math.min(20, Math.max(4, parseInt(searchParams.get("maxLength") || "10", 10)))

  if (!keyword) {
    return new Response(JSON.stringify({ error: "keyword is required" }), { status: 400 })
  }

  // Log token spend upfront (deep search is expensive)
  if (!rateLimit.isPro) {
    logGeneration(request, rateLimit.userId, "deep-search", keyword).catch(() => {})
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
      const takenNames: string[] = []

      try {
        for (let batchIdx = 0; batchIdx < MAX_BATCHES; batchIdx++) {
          if (found.length >= MAX_FOUND) break
          if (abortController.signal.aborted) break

          const strategy = STRATEGIES[batchIdx]

          send({
            type: "progress",
            batch: batchIdx + 1,
            totalBatches: MAX_BATCHES,
            found: found.length,
            message: `Round ${batchIdx + 1}/${MAX_BATCHES} — generating ${strategy} names…`,
          })

          let candidates: string[] = []
          try {
            candidates = await generateBatch(
              keyword, vibe, industry, maxLength,
              seen, takenNames, strategy,
              abortController.signal,
            )
          } catch (err: unknown) {
            if (abortController.signal.aborted) break
            send({
              type: "error",
              message: `AI generation failed: ${err instanceof Error ? err.message : String(err)}`,
              partial: found.length > 0,
            })
            break
          }

          // Mark all as seen so future batches don't duplicate
          candidates.forEach((n) => seen.add(n))

          // Pre-score: skip availability check for low-quality names
          const qualityCandidates = candidates.filter((name) => {
            const scored = scoreName({ name, tld: "com", vibe: (vibe as BrandVibe) || undefined, keywords: [keyword] })
            return scored.score >= PRE_SCORE_FLOOR
          })

          // Parallel .com availability checks for all quality candidates this batch.
          // This is faster than sequential and allows gpt-4o latency to be absorbed.
          const needed = MAX_FOUND - found.length
          const toCheck = qualityCandidates.slice(0, needed + 5) // small buffer beyond what's needed
          let comResults: Awaited<ReturnType<typeof checkAvailabilityBatch>> = []
          try {
            comResults = await checkAvailabilityBatch(
              toCheck.map((n) => `${n}.com`),
              { signal: abortController.signal, concurrency: 6 },
            )
          } catch {
            if (abortController.signal.aborted) break
          }

          for (const r of comResults) {
            if (found.length >= MAX_FOUND || abortController.signal.aborted) break

            const name = r.domain.replace(/\.com$/, "")

            if (!r.available) {
              takenNames.push(name)
              continue
            }

            const scored = scoreName({
              name,
              tld: "com",
              vibe: (vibe as BrandVibe) || undefined,
              keywords: [keyword],
            })

            found.push(r.domain)

            // Run other TLD checks + social handle checks in parallel
            const otherTldDomains = OTHER_TLDS.map((tld) => `${name}.${tld}`)
            const [otherTldResults, socialResults] = await Promise.all([
              checkAvailabilityBatch(otherTldDomains, {
                signal: abortController.signal,
                concurrency: 5,
              }).catch(() => [] as Awaited<ReturnType<typeof checkAvailabilityBatch>>),
              checkSocialHandles(name).catch(() => [] as SocialHandleResult[]),
            ])

            const otherTlds: Record<string, boolean | null> = {}
            for (const tld of OTHER_TLDS) {
              const res = otherTldResults.find((x) => x.domain === `${name}.${tld}`)
              otherTlds[tld] = res ? res.available : null
            }

            send({
              type: "result",
              result: {
                name,
                tld: "com",
                fullDomain: r.domain,
                available: true,
                score: scored.score,
                label: scored.label,
                reasons: scored.reasons,
                breakdown: scored.breakdown,
                otherTlds,
                socials: socialResults,
              },
            })

            send({
              type: "progress",
              batch: batchIdx + 1,
              totalBatches: MAX_BATCHES,
              found: found.length,
              message: `Found ${found.length}/${MAX_FOUND} available .com names…`,
            })
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
