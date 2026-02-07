import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { evaluateCandidateFilters, topRejectedReasons } from "@/lib/domainGen/filters"
import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import { rankCandidates } from "@/lib/domainGen/scoreCandidates"
import type {
  AutoFindRequestInput,
  AutoFindRunResult,
  NameStyleMode,
  NearMissOption,
  RelaxationStep,
  ScoredCandidate,
} from "@/lib/domainGen/types"

interface RelaxationConfig {
  id: string
  label: string
  apply: {
    keywordPosition?: "prefix" | "suffix" | "anywhere"
    mustIncludeKeyword?: "exact" | "partial" | "none"
    maxLengthDelta?: number
    allowGenericAffix?: boolean
    style?: NameStyleMode
    preferTwoWordBrands?: boolean
    allowVibeSuffix?: boolean
  }
}

const RELAXATION_ORDER: RelaxationConfig[] = [
  {
    id: "baseline",
    label: "Strict controls",
    apply: {},
  },
  {
    id: "keyword_anywhere",
    label: "Keyword position relaxed to anywhere",
    apply: { keywordPosition: "anywhere" },
  },
  {
    id: "length_plus1",
    label: "Maximum length increased by 1 character",
    apply: { maxLengthDelta: 1 },
  },
  {
    id: "length_plus2",
    label: "Maximum length increased by 2 characters",
    apply: { maxLengthDelta: 2 },
  },
  {
    id: "two_word_mode",
    label: "2-word brand mode enabled",
    apply: { preferTwoWordBrands: true },
  },
  {
    id: "allow_suffix",
    label: "Tasteful suffix mode enabled",
    apply: { allowVibeSuffix: true },
  },
  {
    id: "generic_affix",
    label: "Generic affix fallback enabled",
    apply: { allowGenericAffix: true },
  },
  {
    id: "keyword_partial",
    label: "Keyword inclusion relaxed to partial or synonym",
    apply: { mustIncludeKeyword: "partial" },
  },
]

const MAX_TOTAL_AVAILABILITY_CHECKS = 1000
const AVAILABILITY_BATCH_SIZE = 40
const INTER_BATCH_DELAY_MS = 120

function toBlocklist(rawBlocklist: string[]): string[] {
  return rawBlocklist
    .map((entry) => entry.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean)
}

function toAllowlist(rawAllowlist: string[]): string[] {
  return rawAllowlist
    .map((entry) => entry.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean)
}

function toPick(domain: string, scoredCandidate: ScoredCandidate): ScoredCandidate {
  return {
    ...scoredCandidate,
    name: domain.replace(/\.com$/i, ""),
    roots: scoredCandidate.roots,
    keywordHits: scoredCandidate.keywordHits,
    strategy: scoredCandidate.strategy,
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"))
      return
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timeout)
      signal?.removeEventListener("abort", onAbort)
      reject(new Error("aborted"))
    }

    signal?.addEventListener("abort", onAbort)
  })
}

function wasRelaxationApplied(relaxation: RelaxationConfig): boolean {
  return Object.keys(relaxation.apply).length > 0
}

function computeQualityFloor(
  ranked: ScoredCandidate[],
  stage: number,
  showAnyAvailable: boolean,
): number {
  if (showAnyAvailable || ranked.length === 0) return Number.NEGATIVE_INFINITY

  const idx = Math.min(ranked.length - 1, Math.max(0, Math.floor(ranked.length * 0.22)))
  const percentileScore = ranked[idx]?.score ?? 12
  const floor = Math.max(13.5, percentileScore - 1.2 - stage * 0.45)
  return Number(floor.toFixed(2))
}

function buildQuickSuggestions(input: AutoFindRequestInput, picksFound: number, providerErrors: number): string[] {
  const suggestions: string[] = []

  if (picksFound >= (input.targetCount || 5)) {
    return suggestions
  }

  suggestions.push("increase_length")

  if (!input.controls.preferTwoWordBrands) {
    suggestions.push("two_word_mode")
  }

  if (!input.controls.allowVibeSuffix) {
    suggestions.push("allow_suffix")
  }

  suggestions.push("switch_tld_io_ai")

  if (!input.controls.showAnyAvailable) {
    suggestions.push("show_any_available")
  }

  if (providerErrors > 0) {
    suggestions.push("retry")
  }

  return Array.from(new Set(suggestions)).slice(0, 6)
}

async function buildNearMisses(
  candidates: ScoredCandidate[],
  signal?: AbortSignal,
): Promise<NearMissOption[]> {
  if (candidates.length === 0) return []

  const shortlist = candidates.slice(0, 14)
  const altDomains = shortlist.flatMap((candidate) => ["io", "ai", "co"].map((tld) => `${candidate.name}.${tld}`))
  const altResults = await checkAvailabilityBatch(altDomains, {
    signal,
    concurrency: 6,
    maxRetries: 2,
    backoffMs: 120,
    ttlMs: 24 * 60 * 60 * 1000,
  })

  const byName = new Map<string, Set<string>>()

  for (const result of altResults) {
    if (!result.available) continue
    const [name, tld] = result.domain.split(".")
    if (!name || !tld) continue

    if (!byName.has(name)) {
      byName.set(name, new Set())
    }

    byName.get(name)?.add(tld)
  }

  const nearMisses: NearMissOption[] = []

  for (const candidate of shortlist) {
    const availableTlds = Array.from(byName.get(candidate.name) || [])
    if (availableTlds.length === 0) continue

    nearMisses.push({
      name: candidate.name,
      availableTlds: availableTlds.sort((a, b) => {
        const order: Record<string, number> = { io: 0, ai: 1, co: 2 }
        return (order[a] ?? 99) - (order[b] ?? 99)
      }),
    })

    if (nearMisses.length >= 6) break
  }

  return nearMisses
}

export async function runAutoFindV2(
  input: AutoFindRequestInput,
  options?: {
    signal?: AbortSignal
    targetCount?: number
    maxAttempts?: number
    poolSize?: number
    shortlistSize?: number
  },
): Promise<AutoFindRunResult> {
  const targetCount = Math.max(1, Math.min(options?.targetCount ?? input.targetCount ?? 5, 10))
  const maxAttempts = Math.max(1, Math.min(options?.maxAttempts ?? RELAXATION_ORDER.length, RELAXATION_ORDER.length))
  let adaptivePoolSize = Math.max(340, Math.min(options?.poolSize ?? 720, 1600))
  const shortlistSize = Math.max(90, Math.min(options?.shortlistSize ?? 180, 320))

  const blocklist = toBlocklist(input.controls.blocklist)
  const allowlist = toAllowlist(input.controls.allowlist)

  const pickedDomains = new Map<string, ScoredCandidate>()
  const checkedDomains = new Set<string>()
  const allRejectedReasons: string[] = []
  const unavailableComCandidates = new Map<string, ScoredCandidate>()

  let totalGenerated = 0
  let totalPassedFilters = 0
  let totalCheckedAvailability = 0
  let providerErrors = 0
  let attempts = 0
  let availabilityBudgetReached = false
  let qualityThresholdUsed = Number.NEGATIVE_INFINITY

  const relaxations: RelaxationStep[] = []
  const runSeedSalt = input.controls.seed
    ? "seeded"
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  for (let stage = 0; stage < maxAttempts; stage += 1) {
    if (options?.signal?.aborted) {
      throw new Error("aborted")
    }

    const relaxation = RELAXATION_ORDER[stage]
    attempts += 1
    relaxations.push({
      id: relaxation.id,
      label: relaxation.label,
      applied: wasRelaxationApplied(relaxation),
    })

    const maxLength = Math.max(5, (input.maxLength || 10) + (relaxation.apply.maxLengthDelta || 0))
    const effectiveControls = {
      ...input.controls,
      keywordPosition: relaxation.apply.keywordPosition || input.controls.keywordPosition,
      mustIncludeKeyword: relaxation.apply.mustIncludeKeyword || input.controls.mustIncludeKeyword,
      style: relaxation.apply.style || input.controls.style,
      preferTwoWordBrands: relaxation.apply.preferTwoWordBrands ?? input.controls.preferTwoWordBrands,
      allowVibeSuffix: relaxation.apply.allowVibeSuffix ?? input.controls.allowVibeSuffix,
    }

    const generated = generateCandidatePool(input, {
      poolSize: Math.min(1700, adaptivePoolSize + stage * 80),
      relaxedKeywordPosition: effectiveControls.keywordPosition,
      relaxedKeywordMode: effectiveControls.mustIncludeKeyword,
      relaxedMaxLength: maxLength,
      relaxedStyle: effectiveControls.style,
      relaxedTwoWordMode: effectiveControls.preferTwoWordBrands,
      relaxedAllowVibeSuffix: effectiveControls.allowVibeSuffix,
      allowGenericAffix: relaxation.apply.allowGenericAffix,
      seedSalt: `${runSeedSalt}:${relaxation.id}:${stage}`,
    })

    totalGenerated += generated.candidates.length

    const filtered = generated.candidates.filter((candidate) => {
      const decision = evaluateCandidateFilters(candidate.name, {
        maxLength,
        controls: effectiveControls,
        blocklist,
        allowlist,
      })

      if (!decision.accepted) {
        allRejectedReasons.push(...decision.reasons)
      }

      return decision.accepted
    })

    totalPassedFilters += filtered.length

    const rankedAll = rankCandidates(filtered, {
      industry: input.industry,
      vibe: input.vibe,
      keywordTokens: generated.keywordTokens,
      controls: effectiveControls,
    }).slice(0, Math.min(420, shortlistSize + stage * 18))

    if (rankedAll.length === 0) {
      adaptivePoolSize = Math.min(1700, adaptivePoolSize + 160)
      continue
    }

    const qualityFloor = computeQualityFloor(rankedAll, stage, input.controls.showAnyAvailable)
    qualityThresholdUsed = Math.max(qualityThresholdUsed, qualityFloor)

    const ranked =
      qualityFloor === Number.NEGATIVE_INFINITY
        ? rankedAll
        : rankedAll.filter((candidate) => candidate.score >= qualityFloor)

    const qualityRanked = ranked.length > 0 ? ranked : rankedAll.slice(0, Math.max(40, Math.floor(rankedAll.length * 0.4)))

    const domainsToCheck = qualityRanked
      .map((candidate) => `${candidate.name}.com`)
      .filter((domain) => !checkedDomains.has(domain) && !pickedDomains.has(domain))

    if (domainsToCheck.length === 0) {
      continue
    }

    let cursor = 0
    while (cursor < domainsToCheck.length && pickedDomains.size < targetCount) {
      if (options?.signal?.aborted) {
        throw new Error("aborted")
      }

      if (totalCheckedAvailability >= MAX_TOTAL_AVAILABILITY_CHECKS) {
        availabilityBudgetReached = true
        break
      }

      const remainingBudget = MAX_TOTAL_AVAILABILITY_CHECKS - totalCheckedAvailability
      const adaptiveBatchSize = Math.min(AVAILABILITY_BATCH_SIZE + stage * 4, 72)
      const batchSize = Math.max(16, Math.min(adaptiveBatchSize, remainingBudget, domainsToCheck.length - cursor))
      const chunk = domainsToCheck.slice(cursor, cursor + batchSize)
      cursor += batchSize

      for (const domain of chunk) {
        checkedDomains.add(domain)
      }

      const availabilityResults = await checkAvailabilityBatch(chunk, {
        signal: options?.signal,
        concurrency: 8,
        maxRetries: 2,
        backoffMs: 160,
        ttlMs: 24 * 60 * 60 * 1000,
      })

      totalCheckedAvailability += availabilityResults.length
      providerErrors += availabilityResults.filter((entry) => Boolean(entry.error)).length

      const scoredByDomain = new Map(qualityRanked.map((candidate) => [`${candidate.name}.com`, candidate]))

      for (const availability of availabilityResults) {
        const scored = scoredByDomain.get(availability.domain)
        if (!scored) continue

        if (availability.available) {
          if (pickedDomains.size < targetCount && !pickedDomains.has(availability.domain)) {
            pickedDomains.set(availability.domain, scored)
          }
          continue
        }

        if (!unavailableComCandidates.has(scored.name)) {
          unavailableComCandidates.set(scored.name, scored)
        }
      }

      if (pickedDomains.size >= targetCount) {
        break
      }

      if (cursor < domainsToCheck.length) {
        await sleep(INTER_BATCH_DELAY_MS + stage * 10, options?.signal)
      }
    }

    const hitRate = totalCheckedAvailability > 0 ? pickedDomains.size / totalCheckedAvailability : 0
    if (hitRate < 0.012 && stage >= 1) {
      adaptivePoolSize = Math.min(1700, adaptivePoolSize + 180)
    }

    if (pickedDomains.size >= targetCount || availabilityBudgetReached) {
      break
    }
  }

  const picks = Array.from(pickedDomains.entries())
    .map(([domain, candidate]) => toPick(domain, candidate))
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)

  const availabilityHitRate = totalCheckedAvailability > 0 ? picks.length / totalCheckedAvailability : 0
  const relaxationsApplied = relaxations.filter((step) => step.applied).map((step) => step.label)
  const topRejected = topRejectedReasons(allRejectedReasons, 6)

  let nearMisses: NearMissOption[] = []
  if (picks.length < targetCount) {
    nearMisses = await buildNearMisses(
      Array.from(unavailableComCandidates.values()).sort((a, b) => b.score - a.score),
      options?.signal,
    )
  }

  const suggestions = buildQuickSuggestions(input, picks.length, providerErrors)

  const checkingProgress = `Checking ${totalCheckedAvailability}/${Math.max(totalGenerated, totalCheckedAvailability)}... Found ${picks.length}/${targetCount}`
  const explanationParts: string[] = []

  if (picks.length >= targetCount) {
    explanationParts.push(`Found ${picks.length}/${targetCount} available .coms with quality filtering.`)
  } else {
    explanationParts.push(`Found ${picks.length}/${targetCount} available .coms after checking ${totalCheckedAvailability} unique domains.`)
    explanationParts.push(`.com scarcity at this length is common. Try +2 chars, 2-word mode, or suffix mode.`)

    if ((input.maxLength || 10) <= 8 || topRejected.some((reason) => reason.reason === "too_long")) {
      explanationParts.push(`A strict name length cap reduced the pool.`)
    }

    if (input.controls.mustIncludeKeyword === "exact") {
      explanationParts.push(`Exact keyword matching narrowed coverage.`)
    }

    if (availabilityBudgetReached) {
      explanationParts.push(`Safety cap reached at ${MAX_TOTAL_AVAILABILITY_CHECKS} availability checks.`)
    }

    if (providerErrors > 0) {
      explanationParts.push(`Some provider responses were degraded.`)
    }
  }

  return {
    picks,
    summary: {
      found: picks.length,
      target: targetCount,
      attempts,
      maxAttempts,
      generatedCandidates: totalGenerated,
      passedFilters: totalPassedFilters,
      checkedAvailability: totalCheckedAvailability,
      providerErrors,
      availabilityHitRate: Number((availabilityHitRate * 100).toFixed(2)),
      qualityThreshold: Number.isFinite(qualityThresholdUsed) ? Number(qualityThresholdUsed.toFixed(2)) : 0,
      relaxationsApplied,
      topRejectedReasons: topRejected,
      checkingProgress,
      suggestions,
      nearMisses,
      explanation: explanationParts.join(" "),
    },
  }
}

