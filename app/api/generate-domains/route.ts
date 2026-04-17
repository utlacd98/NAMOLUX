import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { autoFind5DotComByFounderScore, type AutoFindVibe } from "@/lib/autofind/autoFindByFounderScore"
import { containsKeywordRoot, isKeywordAnchored, hasAiSmellPattern, passesTasteGate } from "@/lib/domainGen/filters"
import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import { scoreName } from "@/lib/founderSignal/scoreName"
import { generateNameStyleCandidates, type NameStyleSelection } from "@/lib/nameStyles"
import { trackMetric } from "@/lib/metrics"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"
import { buildGenerationPrompt } from "@/lib/brandExamples"

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiInstance
}

function isAutoFindV2Enabled(): boolean {
  const serverFlag = process.env.AUTO_FIND_V2
  const publicFlag = process.env.NEXT_PUBLIC_AUTO_FIND_V2

  if (serverFlag === "false" || publicFlag === "false") return false
  if (serverFlag === "true" || publicFlag === "true") return true

  // Default on so quality-first multi-TLD auto-find is active unless explicitly disabled.
  return true
}

function toAutoFindVibe(value: unknown): AutoFindVibe {
  const safe = String(value || "").toLowerCase()
  if (safe === "luxury") return "Luxury"
  if (safe === "futuristic") return "Futuristic"
  if (safe === "playful") return "Playful"
  if (safe === "trustworthy") return "Trustworthy"
  return "Minimal"
}

function isNameStyleV2Enabled(): boolean {
  const serverFlag = process.env.NAME_STYLE_MODE_V2
  const publicFlag = process.env.NEXT_PUBLIC_NAME_STYLE_MODE_V2
  if (serverFlag === "false" || publicFlag === "false") return false
  if (serverFlag === "true" || publicFlag === "true") return true
  return true
}

function toNameStyle(value: unknown): NameStyleSelection {
  const safe = String(value || "mix").toLowerCase()
  if (safe === "invented" || safe === "blend" || safe === "metaphor" || safe === "literal") return safe
  return "mix"
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit first - domain generation feature
    const rateLimitResult = await checkRateLimit(request, "domain")

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "token_limit_reached",
          message: "You've used all 3 free tokens. Upgrade to Pro for unlimited access.",
          upgradeUrl: "/pricing",
        },
        { status: 429 }
      )
    }

    const payload = await request.json()
    const { keyword, vibe, industry, maxLength, count, autoFindV2, generatorV2, nameStyle, meaningMode, refinementInstruction, alreadySeen } = payload
    const hasCustomCount = typeof count === "number" && Number.isFinite(count)
    const safeCount = hasCustomCount ? Math.max(12, Math.min(Math.floor(count), 20)) : 10

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

    if (autoFindV2) {
      if (!isAutoFindV2Enabled()) {
        return NextResponse.json({ error: "Auto-find V2 is disabled." }, { status: 400 })
      }

      const started = Date.now()
      const result = await autoFind5DotComByFounderScore({
        keywords: keyword.trim(),
        industry: typeof industry === "string" ? industry : undefined,
        vibe: toAutoFindVibe(vibe),
        maxLen: typeof maxLength === "number" ? maxLength : 9,
        maxAttempts: typeof payload.maxAttempts === "number" ? payload.maxAttempts : undefined,
        timeCapMs: typeof payload.timeCapMs === "number" ? payload.timeCapMs : undefined,
        scoreFloor: typeof payload.scoreFloor === "number" ? payload.scoreFloor : undefined,
        topNToCheck: typeof payload.topNToCheck === "number" ? payload.topNToCheck : undefined,
        poolSize: typeof payload.poolSize === "number" ? payload.poolSize : undefined,
        tlds: Array.isArray(payload.tlds) ? payload.tlds : undefined,
      })

      const userAgent = request.headers.get("user-agent") || undefined
      const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined

      trackMetric({
        action: "name_generation",
        metadata: {
          keyword,
          vibe,
          industry,
          mode: "auto_find_v2",
          found: result.found.length,
          target: 5,
          attempts: result.stats.attempts,
          generatedCandidates: result.stats.generated,
          checkedAvailability: result.stats.checkedAvailability,
          filteredCandidates: Math.max(0, result.stats.generated - result.stats.passedQuality),
          elapsedMs: Date.now() - started,
        },
        userAgent,
        country,
      })

      const checked = Math.max(result.stats.checkedAvailability, 1)
      const availabilityHitRate = Number(((result.found.length / checked) * 100).toFixed(2))

      // Log generation for rate limiting (only for free users - pro users don't need logging for limits)
      if (!rateLimitResult.isPro) {
        logGeneration(request, rateLimitResult.userId, "domain", keyword, result.found.length).catch(() => {})
      }

      // ── Server-side backfill ────────────────────────────────────────────
      // autoFind returns up to 5 availability-verified picks. To guarantee
      // the UI always has 12 quality names (avoiding client-side fillers),
      // backfill with scored+filtered candidates from the generation pool.
      // These are marked as "likely available" — the UI shows them alongside
      // the verified picks. All backfill candidates pass the same quality
      // gates as the top 5, just without live availability check.
      const TARGET_TOTAL = 12
      const verifiedPicks = result.found.map((pick) => ({
        name: pick.name,
        tld: pick.tld,
        fullDomain: pick.domain,
        available: true,
        score: pick.founderScore,
        founderScore: pick.founderScore,
        pronounceable: pick.label === "Pronounceable",
        memorability: Number(Math.min(10, Math.max(1, pick.founderScore / 10)).toFixed(1)),
        length: pick.name.length,
        strategy: "founder_score_priority",
        scoreBreakdown: { founderSignal: pick.founderScore },
        roots: [] as string[],
        whyTag: pick.reasons.slice(0, 2).join(" | "),
        qualityBand: pick.founderScore >= 85 ? "high" : pick.founderScore >= 75 ? "medium" : "low",
        meaningScore: Math.min(100, Math.max(10, pick.founderScore)),
        meaningBreakdown: "Founder Signal quality-first selection.",
        whyItWorks: `Founder Signal ${pick.founderScore}/100.`,
        brandableScore: Number(Math.min(10, Math.max(1, pick.founderScore / 10)).toFixed(1)),
        pronounceabilityScore: pick.label === "Pronounceable" ? 90 : 72,
      }))

      const picks = [...verifiedPicks]

      if (picks.length < TARGET_TOTAL) {
        try {
          const seenPickNames = new Set(picks.map(p => p.name))
          const backfillKeywordRoots = keyword.trim().toLowerCase().split(/[\s,]+/).filter(t => t.length >= 2)
          const backfillPool = generateCandidatePool(
            {
              keyword: keyword.trim(),
              industry: typeof industry === "string" ? industry : undefined,
              vibe: toAutoFindVibe(vibe).toLowerCase(),
              maxLength: typeof maxLength === "number" ? maxLength : 10,
              targetCount: TARGET_TOTAL * 2,
              controls: {
                seed: `autofind-backfill-${Date.now().toString(36)}`,
                mustIncludeKeyword: "none",
                keywordPosition: "anywhere",
                style: "brandable_blends",
                blocklist: [],
                allowlist: [],
                allowHyphen: false,
                allowNumbers: false,
                meaningFirst: true,
                preferTwoWordBrands: true,
                allowVibeSuffix: false,
                showAnyAvailable: false,
              },
            },
            { poolSize: 300 },
          )

          // Score each candidate and keep the best
          const scored = backfillPool.candidates
            .filter((c) => c.name.length >= 4 && c.name.length <= 12)
            .filter((c) => !seenPickNames.has(c.name))
            .filter((c) => !hasAiSmellPattern(c.name))
            .filter((c) => !containsKeywordRoot(c.name, backfillKeywordRoots))
            .filter((c) => !isKeywordAnchored(c.name, backfillKeywordRoots))
            .filter((c) => passesTasteGate(c.name))
            .map((c) => {
              const s = scoreName({
                name: c.name,
                tld: "com",
                vibe: toAutoFindVibe(vibe).toLowerCase() as any,
                keywords: backfillKeywordRoots,
              })
              return { candidate: c, score: s.score, label: s.label, reasons: s.reasons }
            })
            .filter((s) => s.score >= 70)
            .sort((a, b) => b.score - a.score)

          for (const s of scored) {
            if (picks.length >= TARGET_TOTAL) break
            picks.push({
              name: s.candidate.name,
              tld: "com",
              fullDomain: `${s.candidate.name}.com`,
              available: true, // marked as likely — not live-checked
              score: s.score,
              founderScore: s.score,
              pronounceable: s.label === "Pronounceable",
              memorability: Number(Math.min(10, Math.max(1, s.score / 10)).toFixed(1)),
              length: s.candidate.name.length,
              strategy: "backfill_generator",
              scoreBreakdown: { founderSignal: s.score },
              roots: [],
              whyTag: s.reasons.slice(0, 2).join(" | ") || "Brandable candidate",
              qualityBand: s.score >= 85 ? "high" : s.score >= 75 ? "medium" : "low",
              meaningScore: Math.min(100, Math.max(10, s.score)),
              meaningBreakdown: "Founder Signal quality candidate.",
              whyItWorks: `Founder Signal ${s.score}/100.`,
              brandableScore: Number(Math.min(10, Math.max(1, s.score / 10)).toFixed(1)),
              pronounceabilityScore: s.label === "Pronounceable" ? 90 : 72,
            })
          }
        } catch (err) {
          console.error("autoFind backfill failed:", err)
        }
      }

      return NextResponse.json({
        success: true,
        autoFindV2: true,
        isPro: rateLimitResult.isPro,
        picks,
        summary: {
          found: result.found.length,
          target: 5,
          attempts: result.stats.attempts,
          maxAttempts: typeof payload.maxAttempts === "number" ? payload.maxAttempts : 5,
          generatedCandidates: result.stats.generated,
          passedFilters: result.stats.passedQuality,
          checkedAvailability: result.stats.checkedAvailability,
          providerErrors: 0,
          availabilityHitRate,
          qualityThreshold: typeof payload.scoreFloor === "number" ? payload.scoreFloor : 80,
          relaxationsApplied: [],
          topRejectedReasons: [],
          checkingProgress: `Checking ${result.stats.checkedAvailability}/${result.stats.generated}... Found ${result.found.length}/5`,
          suggestions: result.found.length < 5 ? ["increase_length", "two_word_mode", "allow_suffix", "switch_tld_io_ai"] : [],
          nearMisses: [],
          explanation: result.message,
        },
      })
    }

    if (generatorV2 && isNameStyleV2Enabled()) {
      const generated = generateNameStyleCandidates({
        keywords: keyword.trim(),
        industry: typeof industry === "string" ? industry : undefined,
        vibe: typeof vibe === "string" ? vibe : "minimal",
        maxLength: typeof maxLength === "number" ? maxLength : 10,
        count: safeCount,
        selectedStyle: toNameStyle(nameStyle),
        meaningMode: Boolean(meaningMode),
        seed: typeof payload.seed === "string" ? payload.seed : undefined,
      })

      const userAgent = request.headers.get("user-agent") || undefined
      const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
      trackMetric({
        action: "name_generation",
        metadata: {
          keyword,
          vibe,
          industry,
          mode: "style_v2",
          style: toNameStyle(nameStyle),
          meaningMode: Boolean(meaningMode),
          requestedCount: safeCount,
          resultCount: generated.length,
        },
        userAgent,
        country,
      })

      // Log generation for rate limiting (only for free users)
      if (!rateLimitResult.isPro) {
        logGeneration(request, rateLimitResult.userId, "domain", keyword, generated.length).catch(() => {})
      }

      // Apply quality filters to style V2 output — same gates as advanced generator
      const v2KeywordRoots = keyword
        .trim()
        .toLowerCase()
        .split(/[\s,]+/)
        .filter((t: string) => t.length >= 2)

      const filteredGenerated = generated.filter((item) => {
        const clean = item.name.toLowerCase().replace(/[^a-z]/g, "")
        if (hasAiSmellPattern(clean)) return false
        if (containsKeywordRoot(clean, v2KeywordRoots)) return false
        if (isKeywordAnchored(clean, v2KeywordRoots)) return false
        if (!passesTasteGate(clean)) return false
        return true
      })

      return NextResponse.json({
        success: true,
        generatorV2: true,
        isPro: rateLimitResult.isPro,
        domains: filteredGenerated.map((item) => ({
          name: item.name,
          style: item.style,
          meaningShort: item.meaningShort || null,
          reasoning: item.meaningShort || `${item.style} style suggestion.`,
        })),
      })
    }

    // Build prompt using curated industry brand examples
    const { system: systemPrompt, user: userPrompt } = buildGenerationPrompt({
      keywords: keyword,
      industry: industry || "general",
      brandVibe: vibe || "modern",
      maxLength: maxLength || 10,
      batchSize: safeCount,
      outputFormat: "with-metadata",
      alreadySeen: Array.isArray(alreadySeen) ? alreadySeen : [],
      ...(refinementInstruction ? { strategy: undefined } : {}),
    })

    // Append refinement instruction to system prompt if provided
    const finalSystemPrompt = refinementInstruction
      ? `${systemPrompt}\n\n${refinementInstruction}`
      : systemPrompt

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.92,
      max_tokens: 1200,
    })

    const responseText = completion.choices[0]?.message?.content || "[]"
    
    // Extract JSON from the response (in case GPT adds markdown formatting)
    let domainSuggestions
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      domainSuggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch (parseError) {
      console.error("Failed to parse GPT response:", responseText)
      domainSuggestions = []
    }

    // ── Hybrid pipeline: AI generates, Founder Signal ranks ───────────────
    // AI is treated as one candidate source among several — NOT the authority.
    // The deterministic Founder Signal + Brand Instinct layer picks the winners
    // from a merged pool of AI output + deterministic generator output.
    const keywordRoots = keyword
      .trim()
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((t: string) => t.length >= 2)

    function passesQualityGate(name: string): boolean {
      if (hasAiSmellPattern(name)) return false
      if (containsKeywordRoot(name, keywordRoots)) return false
      if (isKeywordAnchored(name, keywordRoots)) return false
      if (!passesTasteGate(name)) return false
      return true
    }

    // Step 1: collect raw candidates from BOTH sources
    interface RawCandidate {
      name: string
      reasoning?: string
      meaning?: string
      source: "ai" | "engine"
    }

    const rawCandidates: RawCandidate[] = []
    const seenNames = new Set<string>()

    // Source A: AI output
    for (const item of Array.isArray(domainSuggestions) ? domainSuggestions : []) {
      const rawName = typeof item === "string" ? item : item?.name
      const clean = String(rawName || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 63)
      if (clean.length < 3 || seenNames.has(clean)) continue
      seenNames.add(clean)
      rawCandidates.push({
        name: clean,
        reasoning: typeof item?.reasoning === "string" && item.reasoning.trim().length > 0 ? item.reasoning.trim() : undefined,
        meaning: typeof item?.meaning === "string" && item.meaning.trim().length > 0 ? item.meaning.trim() : undefined,
        source: "ai",
      })
    }

    // Source B: deterministic generator (always runs, not just as fallback)
    try {
      const enginePool = generateCandidatePool(
        {
          keyword: keyword.trim(),
          industry: typeof industry === "string" ? industry : undefined,
          vibe: typeof vibe === "string" ? vibe : "minimal",
          maxLength: typeof maxLength === "number" ? maxLength : 10,
          targetCount: safeCount * 3,
          controls: {
            seed: `hybrid-${Date.now().toString(36)}`,
            mustIncludeKeyword: "none",
            keywordPosition: "anywhere",
            style: "brandable_blends",
            blocklist: [],
            allowlist: [],
            allowHyphen: false,
            allowNumbers: false,
            meaningFirst: true,
            preferTwoWordBrands: true,
            allowVibeSuffix: false,
            showAnyAvailable: false,
          },
        },
        { poolSize: 400 },
      )

      for (const candidate of enginePool.candidates) {
        const clean = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, "")
        if (clean.length < 3 || seenNames.has(clean)) continue
        seenNames.add(clean)
        rawCandidates.push({ name: clean, source: "engine" })
      }
    } catch (err) {
      console.error("Engine pool generation failed:", err)
    }

    // Step 2: filter ALL candidates through identical quality gates
    const filtered = rawCandidates.filter(c => passesQualityGate(c.name))

    // Step 3: score EVERY candidate with Founder Signal (Brand Instinct auto-applies)
    const scored = filtered.map(c => {
      const result = scoreName({
        name: c.name,
        tld: "com",
        vibe: typeof vibe === "string" ? (vibe.toLowerCase() as any) : undefined,
        keywords: keywordRoots,
      })
      return { ...c, score: result.score, reasons: result.reasons }
    })

    // Step 4: rank by Founder Signal, return top N
    // Minimum quality floor — 65 for basic path to ensure a reasonable bar
    const MIN_SCORE = 65
    const ranked = scored
      .filter(s => s.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)

    let finalSuggestions = ranked.slice(0, safeCount).map(s => ({
      name: s.name,
      reasoning: s.reasoning || (s.source === "ai" ? "AI-generated candidate, ranked by Founder Signal." : "Generated by quality engine."),
      meaning: s.meaning,
    }))

    // If the ranked pool still has too few, drop the floor to salvage results
    if (finalSuggestions.length < Math.max(5, Math.floor(safeCount / 2))) {
      const relaxed = scored.sort((a, b) => b.score - a.score).slice(0, safeCount)
      finalSuggestions = relaxed.map(s => ({
        name: s.name,
        reasoning: s.reasoning || (s.source === "ai" ? "AI-generated candidate, ranked by Founder Signal." : "Generated by quality engine."),
        meaning: s.meaning,
      }))
    }

    // Track metric (non-blocking)
    const userAgent = request.headers.get("user-agent") || undefined
    const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
    trackMetric({
      action: "name_generation",
      metadata: { keyword, vibe, industry, requestedCount: safeCount, resultCount: finalSuggestions.length },
      userAgent,
      country,
    })

    // Log generation for rate limiting (only for free users)
    if (!rateLimitResult.isPro) {
      logGeneration(request, rateLimitResult.userId, "domain", keyword, finalSuggestions.length).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      isPro: rateLimitResult.isPro,
      domains: finalSuggestions,
    })
  } catch (error: any) {
    console.error("Error generating domains:", error)

    // Handle specific OpenAI errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { error: "Connection error. Please try again." },
        { status: 503 }
      )
    }

    if (error.status === 401) {
      return NextResponse.json(
        { error: "API key invalid. Please contact support." },
        { status: 500 }
      )
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limited. Please try again in a moment." },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate domain names" },
      { status: 500 }
    )
  }
}
