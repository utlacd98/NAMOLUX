import { NextRequest, NextResponse } from "next/server"
import {
  hasAiSmellPattern,
  hasRandomSyllablePattern,
  hasRecognisableBrandRoot,
  hasUnsafeBrandMeaning,
  passesTasteGate,
} from "@/lib/domainGen/filters"
import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import { rankCandidates } from "@/lib/domainGen/scoreCandidates"
import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 45

const ALL_TLDS = ["com", "io", "co", "ai", "app", "dev"] as const
type Tld = (typeof ALL_TLDS)[number]

function toBrandVibe(value: string): BrandVibe {
  const safe = value.toLowerCase()
  if (safe === "luxury") return "luxury"
  if (safe === "playful") return "playful"
  if (safe === "futuristic") return "futuristic"
  if (safe === "trustworthy") return "trustworthy"
  return "minimal"
}

function contextSeeds(description: string, industry: string, keywords: string): string[] {
  const context = `${description} ${industry} ${keywords}`.toLowerCase()
  const seeds = new Set<string>()
  const isFood = /(food|meal|meals|prep|kitchen|vegan|plant based|plant-based|restaurant|chef|plate|gym people|nutrition)/.test(context)
  const isPet = /\b(pet|pets|dog|dogs|cat|cats|paw|paws|vet|vets|walking|sitting|groom|grooming|companion)\b/.test(context)

  if (/(bookkeep|accounting|accountant|invoice|invoicing|receipt|receipts|cashflow|cash flow|ledger|tax)/.test(context)) {
    ;[
      "ledgernest",
      "clearledger",
      "cashridge",
      "northledger",
      "vaultflow",
      "pilotbooks",
      "signalbooks",
      "frameledger",
      "atlasbooks",
      "hingeledger",
      "basisbooks",
    ].forEach((name) => seeds.add(name))
  }

  if (/(beauty|skin|skincare|cosmetic|botanical|refill|sensitive|salon|spa)/.test(context)) {
    ;[
      "sagemint",
      "opalbloom",
      "velasage",
      "puregrove",
      "glowfield",
      "cedarglow",
      "lumenleaf",
      "stillbloom",
      "maevaskin",
    ].forEach((name) => seeds.add(name))
  }

  if (/(therapy|mental|wellness|journal|calm|mind|support|care|anxiety|reflection)/.test(context)) {
    ;[
      "kindhaven",
      "stillnest",
      "mendwell",
      "solace",
      "hearth",
      "kindra",
      "sonder",
      "amity",
      "sagewell",
    ].forEach((name) => seeds.add(name))
  }

  if (isPet) {
    ;[
      "pawpath",
      "petstride",
      "tailwise",
      "walkhaven",
      "pawpilot",
      "citypaw",
      "caretail",
      "pawmate",
      "petanchor",
      "dogstride",
    ].forEach((name) => seeds.add(name))
  }

  if (/(education|school|student|students|teen|teenager|math|maths|tutor|tutoring|exam|exams|learn|study|class)/.test(context)) {
    ;[
      "mathmentor",
      "studywise",
      "exambridge",
      "tutorpath",
      "classforge",
      "skillnest",
      "learnpilot",
      "mentorline",
      "studycraft",
      "logicclass",
    ].forEach((name) => seeds.add(name))
  }

  if (isFood) {
    ;[
      "plantplate",
      "mealcraft",
      "freshprep",
      "prepwise",
      "kitchenfit",
      "platepath",
      "dailyplate",
      "greenmeal",
      "fitplate",
      "prepfuel",
    ].forEach((name) => seeds.add(name))
  }

  if (/(legal|law|contract|contracts|counsel|compliance|freelance|rights|review software)/.test(context)) {
    ;[
      "briefwise",
      "contractpath",
      "counselcraft",
      "draftwell",
      "clearbrief",
      "lawbridge",
      "rightframe",
      "clientbrief",
      "briefpilot",
      "trustdraft",
    ].forEach((name) => seeds.add(name))
  }

  if (/(schedul|calendar|meeting|meetings|booking|bookings|appointment|appointments|remote|team|teams|shift|availability|slot|slots)/.test(context)) {
    ;[
      "meetflow",
      "syncpath",
      "teamtempo",
      "slotpilot",
      "timeframe",
      "shiftflow",
      "calridge",
      "teamstride",
      "meetatlas",
      "syncframe",
    ].forEach((name) => seeds.add(name))
  }

  if (!isFood && !isPet && /(logistics|supply chain|shipping|delivery|freight|warehouse|inventory|e-?commerce|merchant|fulfill|route|fleet)/.test(context)) {
    ;[
      "routeforge",
      "fleetflow",
      "shipgrid",
      "cartpilot",
      "stockpath",
      "orderly",
      "dockwise",
      "fulfillr",
      "loadpath",
    ].forEach((name) => seeds.add(name))
  }

  if (/(renewable|clean energy|energy|solar|wind|climate|carbon|green tech|waste|recycle|environment|grid)/.test(context)) {
    ;[
      "gridwise",
      "solarpath",
      "carbonclear",
      "greenridge",
      "renewly",
      "climateforge",
      "wattfield",
      "brightgrid",
      "terraflow",
      "futuregrid",
    ].forEach((name) => seeds.add(name))
  }

  if (/(ai|software|saas|automation|analytics|data|workflow|developer|tool)/.test(context)) {
    ;[
      "atlasflow",
      "clearpilot",
      "lumen",
      "hinge",
      "frame",
      "pilot",
      "vector",
      "atlas",
      "signal",
    ].forEach((name) => seeds.add(name))
  }

  if (seeds.size === 0) {
    ;[
      "lumenforge",
      "havennest",
      "bloomfield",
      "ridgecraft",
      "sagemint",
      "slatepath",
      "cedarflow",
      "northstar",
    ].forEach((name) => seeds.add(name))
  }

  return Array.from(seeds)
}

function contextualRoots(description: string, industry: string, keywords: string): string[] {
  const context = `${description} ${industry} ${keywords}`.toLowerCase()
  if (/\b(pet|pets|dog|dogs|cat|cats|paw|paws|vet|vets|walking|sitting|groom|grooming|companion)\b/.test(context)) {
    return ["paw", "pet", "dog", "tail", "walk", "care", "stride", "companion", "vet"]
  }
  if (/(education|school|student|students|teen|teenager|math|maths|tutor|tutoring|exam|exams|learn|study|class)/.test(context)) {
    return ["math", "study", "tutor", "learn", "mentor", "class", "skill", "exam", "logic"]
  }
  if (/(food|meal|meals|prep|kitchen|vegan|plant based|plant-based|restaurant|chef|plate|gym people|nutrition)/.test(context)) {
    return ["meal", "plate", "prep", "fresh", "kitchen", "plant", "green", "fit", "fuel", "daily"]
  }
  if (/(legal|law|contract|contracts|counsel|compliance|freelance|rights|review software)/.test(context)) {
    return ["brief", "contract", "counsel", "law", "draft", "right", "trust", "client"]
  }
  if (/(bookkeep|accounting|accountant|invoice|invoicing|receipt|receipts|cashflow|cash flow|ledger|tax)/.test(context)) {
    return ["ledger", "cash", "vault", "book", "books", "invoice", "receipt", "balance", "clear", "pilot", "frame", "signal", "basis"]
  }
  if (/(beauty|skin|skincare|cosmetic|botanical|refill|sensitive|salon|spa)/.test(context)) {
    return ["skin", "sage", "mint", "opal", "bloom", "glow", "grove", "lumen", "leaf", "pure", "cedar", "still"]
  }
  if (/(therapy|mental|wellness|journal|calm|mind|support|care|anxiety|reflection)/.test(context)) {
    return ["kind", "haven", "still", "mend", "well", "solace", "hearth", "sage", "mind", "amity", "sonder"]
  }
  if (/(schedul|calendar|meeting|meetings|booking|bookings|appointment|appointments|remote|team|teams|shift|availability|slot|slots)/.test(context)) {
    return ["sync", "team", "time", "slot", "meet", "tempo", "shift", "flow", "path", "pilot", "frame", "atlas"]
  }
  if (/(logistics|supply chain|shipping|delivery|freight|warehouse|inventory|e-?commerce|merchant|fulfill|route|fleet)/.test(context)) {
    return ["route", "fleet", "ship", "grid", "cart", "stock", "dock", "order", "load", "path", "flow"]
  }
  if (/(renewable|clean energy|energy|solar|wind|climate|carbon|green tech|waste|recycle|environment|grid)/.test(context)) {
    return ["grid", "solar", "carbon", "green", "renew", "climate", "watt", "terra", "future", "clear", "field"]
  }
  if (/(ai|software|saas|automation|analytics|data|workflow|developer|tool)/.test(context)) {
    return ["signal", "pilot", "frame", "atlas", "flow", "scope", "lumen", "hinge", "vector", "clear"]
  }
  return []
}

function contextFit(name: string, roots: string[]): number {
  if (roots.length === 0) return 0
  const clean = name.toLowerCase()
  return roots.reduce((count, root) => count + (clean.includes(root) ? 1 : 0), 0)
}

function isHighQualityName(name: string, maxLength: number): boolean {
  const clean = name.toLowerCase().replace(/[^a-z]/g, "")
  if (clean.length < 4 || clean.length > maxLength) return false
  if (hasUnsafeBrandMeaning(clean) || hasRandomSyllablePattern(clean)) return false
  if (hasAiSmellPattern(clean) || !passesTasteGate(clean)) return false
  return hasRecognisableBrandRoot(clean)
}

export async function POST(req: NextRequest) {
  const labBlockResponse = getGeneratorLabApiBlockResponse(req)
  if (labBlockResponse) return labBlockResponse

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const description = String(body.description || "").trim().slice(0, 1_000)
  const vibe = toBrandVibe(String(body.vibe || "minimal"))
  const industry = String(body.industry || "").replace(/[<>]/g, "").trim().slice(0, 80)
  const maxLength = Math.min(Math.max(Number(body.maxLength) || 9, 5), 12)
  const keywords = String(body.keywords || "").trim().slice(0, 200)

  if (description.length < 10) {
    return NextResponse.json({ error: "description too short" }, { status: 400 })
  }

  const rateLimit = await checkRateLimit(req, "ai-chat")
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "monthly_usage_limit_reached",
        message: rateLimit.message || "Free plan includes 3 uses per month. Upgrade for unlimited access.",
        resetAt: rateLimit.resetAt,
        tokensUsed: rateLimit.tokensUsed,
        tokensTotal: rateLimit.tokensTotal,
        remaining: rateLimit.remaining,
      },
      { status: rateLimit.statusCode || 429 },
    )
  }

  const promptKeywords = [keywords, industry, description].filter(Boolean).join(" ")
  const requiredRoots = contextualRoots(description, industry, keywords)
  const keywordTokens = promptKeywords
    .toLowerCase()
    .split(/[\s,./|]+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length >= 3)

  try {
    const controls = {
      seed: `chat-${promptKeywords}:${vibe}:${maxLength}`,
      mustIncludeKeyword: "none" as const,
      keywordPosition: "anywhere" as const,
      style: "brandable_blends" as const,
      blocklist: [],
      allowlist: [],
      allowHyphen: false,
      allowNumbers: false,
      meaningFirst: true,
      preferTwoWordBrands: maxLength >= 8,
      allowVibeSuffix: false,
      showAnyAvailable: false,
    }

    const pool = generateCandidatePool(
      {
        keyword: promptKeywords,
        industry: industry || undefined,
        vibe,
        maxLength,
        targetCount: 48,
        controls,
      },
      { poolSize: 900, seedSalt: "ai-chat-quality" },
    )

    const seeded = contextSeeds(description, industry, keywords).map((name) => ({
      candidate: {
        name,
        strategy: "curated_chat_seed",
        score: 98,
        roots: [],
        meaningBreakdown: "Context-aware seed selected for clarity and brand fit.",
        whyItWorks: "Grounded in the user's brief and screened by Founder Signal.",
      },
      source: "seed" as const,
    }))

    const generated = rankCandidates(pool.candidates, {
      industry: industry || undefined,
      vibe,
      keywordTokens,
      controls,
    }).map((candidate) => ({ candidate, source: "engine" as const }))

    const candidates = [...seeded, ...generated]
      .map(({ candidate, source }) => ({
        candidate,
        source,
        founder: scoreName({ name: candidate.name, tld: "com", vibe, keywords: keywordTokens }),
      }))
      .filter(({ candidate, source }) => source === "seed" || isHighQualityName(candidate.name, maxLength))
      .filter(({ candidate }) => requiredRoots.length === 0 || contextFit(candidate.name, requiredRoots) > 0)
      .filter(({ founder }) => founder.score >= 62)
      .map((item) => ({
        ...item,
        rankScore:
          item.founder.score +
          item.candidate.score / 10 +
          contextFit(item.candidate.name, requiredRoots) * 16 +
          (item.source === "seed" ? 18 : 0) -
          (item.candidate.name.length <= 5 ? 28 : item.candidate.name.length <= 6 ? 12 : 0),
      }))
      .sort((a, b) => b.rankScore - a.rankScore || b.founder.score - a.founder.score)
      .filter((item, index, items) => items.findIndex((other) => other.candidate.name === item.candidate.name) === index)
      .slice(0, 10)

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    const domainsToCheck = candidates.flatMap(({ candidate }) =>
      ALL_TLDS.map((tld) => `${candidate.name}.${tld}`),
    )
    const availability = await checkAvailabilityBatch(domainsToCheck, {
      concurrency: 10,
      dnsTimeoutMs: 1800,
      rdapTimeoutMs: 2600,
      ttlMs: 24 * 60 * 60 * 1000,
    })

    const results = candidates.map(({ candidate, founder, rankScore }) => {
      const tlds: Partial<Record<Tld, boolean | null>> = {}
      for (const tld of ALL_TLDS) {
        const domain = `${candidate.name}.${tld}`
        const check = availability.find((item) => item.domain === domain)
        tlds[tld] = check ? check.available : null
      }

      const anyAvailable = Object.values(tlds).some((value) => value === true)
      const bestTld = ALL_TLDS.find((tld) => tlds[tld] === true) ?? null
      const comCheck = availability.find((item) => item.domain === `${candidate.name}.com`)

      return {
        name: candidate.name,
        tld: "com",
        fullDomain: `${candidate.name}.com`,
        available: tlds.com === true,
        anyAvailable,
        bestTld,
        tlds,
        confidence: comCheck?.confidence ?? "low",
        score: founder.score,
        label: founder.label,
        reasons: founder.reasons,
        rankScore,
      }
    })

    results.sort((a, b) => {
      if (a.anyAvailable !== b.anyAvailable) return a.anyAvailable ? -1 : 1
      if (a.available !== b.available) return a.available ? -1 : 1
      return b.rankScore - a.rankScore
    })

    if (!rateLimit.isPro) {
      logGeneration(req, rateLimit.userId, "ai-chat", undefined, results.length).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      isPro: rateLimit.isPro,
      founderSignalUnlocked: rateLimit.isPro,
      results: results.slice(0, 8).map(({ rankScore: _rankScore, score, label, reasons, ...result }) =>
        rateLimit.isPro ? { ...result, score, label, reasons } : result,
      ),
    })
  } catch (err) {
    console.error("ai-name-chat error:", err)
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 })
  }
}
