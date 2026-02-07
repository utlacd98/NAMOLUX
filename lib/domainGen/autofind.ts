import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { evaluateCandidateFilters, topRejectedReasons } from "@/lib/domainGen/filters"
import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import {
  buildConcepts as buildConceptVectors,
  buildMeaningBreakdown,
  dedupeByMeaningDiversity,
  type MorphemeEntry,
} from "@/lib/domainGen/meaning"
import { rankCandidates } from "@/lib/domainGen/scoreCandidates"
import type {
  AutoFindRequestInput,
  AutoFindRunResult,
  Candidate,
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
    expandConcepts?: boolean
  }
}

interface ScoredStageResult {
  ranked: ScoredCandidate[]
  qualityFloor: number
  meaningFloor: number
}

const RELAXATION_ORDER: RelaxationConfig[] = [
  { id: "baseline", label: "Strict controls", apply: {} },
  { id: "expand_concepts", label: "Expanded meaning concept set", apply: { expandConcepts: true } },
  { id: "length_plus1", label: "Maximum length increased by 1 character", apply: { maxLengthDelta: 1 } },
  {
    id: "length_plus2_two_word",
    label: "Maximum length increased by 2 characters and 2-word mode enabled",
    apply: { maxLengthDelta: 2, preferTwoWordBrands: true },
  },
  { id: "allow_suffix", label: "Tasteful suffix mode enabled", apply: { allowVibeSuffix: true } },
  { id: "generic_affix", label: "Generic affix fallback enabled", apply: { allowGenericAffix: true } },
  { id: "keyword_partial", label: "Keyword inclusion relaxed to partial or synonym", apply: { mustIncludeKeyword: "partial" } },
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

function wasRelaxationApplied(relaxation: RelaxationConfig): boolean {
  return Object.keys(relaxation.apply).length > 0
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

function computeQualityFloor(
  ranked: ScoredCandidate[],
  stage: number,
  showAnyAvailable: boolean,
): number {
  if (showAnyAvailable || ranked.length === 0) return Number.NEGATIVE_INFINITY

  const idx = Math.min(ranked.length - 1, Math.max(0, Math.floor(ranked.length * 0.25)))
  const percentileScore = ranked[idx]?.score ?? 12
  const floor = Math.max(13, percentileScore - 1.2 - stage * 0.45)
  return Number(floor.toFixed(2))
}

function computeMeaningFloor(
  stage: number,
  meaningFirst: boolean,
  showAnyAvailable: boolean,
): number {
  if (!meaningFirst || showAnyAvailable) return 0
  return Math.max(58, 70 - stage * 4)
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

  const shortlist = candidates.slice(0, 16)
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

function buildConcepts(
  input: AutoFindRequestInput,
  relaxation: RelaxationConfig,
  stage: number,
): MorphemeEntry[] {
  const baseLimit = relaxation.apply.expandConcepts ? 10 : 7
  const conceptLimit = Math.min(14, baseLimit + stage)

  return buildConceptVectors({
    keyword: input.keyword,
    industry: input.industry,
    vibe: input.vibe,
    conceptLimit,
    expanded: Boolean(relaxation.apply.expandConcepts),
  })
}

function generateCandidates(
  input: AutoFindRequestInput,
  relaxation: RelaxationConfig,
  stage: number,
  concepts: MorphemeEntry[],
  poolSize: number,
  runSeedSalt: string,
): {
  candidates: Candidate[]
  keywordTokens: string[]
} {
  const effectiveControls = {
    ...input.controls,
    keywordPosition: relaxation.apply.keywordPosition || input.controls.keywordPosition,
    mustIncludeKeyword: relaxation.apply.mustIncludeKeyword || input.controls.mustIncludeKeyword,
    style: relaxation.apply.style || input.controls.style,
    preferTwoWordBrands: relaxation.apply.preferTwoWordBrands ?? input.controls.preferTwoWordBrands,
    allowVibeSuffix: relaxation.apply.allowVibeSuffix ?? input.controls.allowVibeSuffix,
  }

  const maxLength = Math.max(5, (input.maxLength || 10) + (relaxation.apply.maxLengthDelta || 0))

  const generated = generateCandidatePool(
    {
      ...input,
      controls: effectiveControls,
    },
    {
      poolSize,
      relaxedKeywordPosition: effectiveControls.keywordPosition,
      relaxedKeywordMode: effectiveControls.mustIncludeKeyword,
      relaxedMaxLength: maxLength,
      relaxedStyle: effectiveControls.style,
      relaxedTwoWordMode: effectiveControls.preferTwoWordBrands,
      relaxedAllowVibeSuffix: effectiveControls.allowVibeSuffix,
      allowGenericAffix: relaxation.apply.allowGenericAffix,
      conceptFragments: concepts.map((item) => item.fragment),
      meaningFirst: input.controls.meaningFirst,
      seedSalt: `${runSeedSalt}:${relaxation.id}:${stage}`,
    },
  )

  const enriched = generated.candidates.map((candidate) => {
    const meaning = buildMeaningBreakdown({
      name: candidate.name,
      roots: candidate.roots,
      concepts,
    })

    return {
      ...candidate,
      meaningBreakdown: meaning.breakdown,
      whyItWorks: meaning.oneLiner,
      meaningScore: meaning.meaningScore,
    }
  })

  return {
    candidates: dedupeByMeaningDiversity(enriched),
    keywordTokens: generated.keywordTokens,
  }
}

function scoreCandidates(
  input: AutoFindRequestInput,
  stage: number,
  concepts: MorphemeEntry[],
  generatedCandidates: Candidate[],
  keywordTokens: string[],
): ScoredStageResult {
  const rankedAll = rankCandidates(generatedCandidates, {
    industry: input.industry,
    vibe: input.vibe,
    keywordTokens,
    controls: input.controls,
    concepts,
  })

  const qualityFloor = computeQualityFloor(rankedAll, stage, input.controls.showAnyAvailable)
  const meaningFloor = computeMeaningFloor(stage, input.controls.meaningFirst, input.controls.showAnyAvailable)

  const filtered = rankedAll.filter((candidate) => {
    if (qualityFloor !== Number.NEGATIVE_INFINITY && candidate.score < qualityFloor) return false
    if (input.controls.meaningFirst && (candidate.meaningScore || 0) < meaningFloor) return false
    return true
  })

  return {
    ranked: dedupeByMeaningDiversity(filtered.length > 0 ? filtered : rankedAll).slice(0, 280),
    qualityFloor,
    meaningFloor,
  }
}

async function checkAvailability(
  rankedCandidates: ScoredCandidate[],
  pickedDomains: Map<string, ScoredCandidate>,
  checkedDomains: Set<string>,
  unavailableComCandidates: Map<string, ScoredCandidate>,
  targetCount: number,
  totals: {
    checkedAvailability: number
    providerErrors: number
  },
  options?: {
    signal?: AbortSignal
  },
): Promise<void> {
  const domainsToCheck = rankedCandidates
    .map((candidate) => `${candidate.name}.com`)
    .filter((domain) => !checkedDomains.has(domain) && !pickedDomains.has(domain))

  if (domainsToCheck.length === 0) return

  let cursor = 0

  while (cursor < domainsToCheck.length && pickedDomains.size < targetCount) {
    if (options?.signal?.aborted) {
      throw new Error("aborted")
    }

    if (totals.checkedAvailability >= MAX_TOTAL_AVAILABILITY_CHECKS) {
      break
    }

    const remainingBudget = MAX_TOTAL_AVAILABILITY_CHECKS - totals.checkedAvailability
    const batchSize = Math.max(14, Math.min(AVAILABILITY_BATCH_SIZE, remainingBudget, domainsToCheck.length - cursor))
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

    totals.checkedAvailability += availabilityResults.length
    totals.providerErrors += availabilityResults.filter((entry) => Boolean(entry.error)).length

    const scoredByDomain = new Map(rankedCandidates.map((candidate) => [`${candidate.name}.com`, candidate]))

    for (const availability of availabilityResults) {
      const scored = scoredByDomain.get(availability.domain)
      if (!scored) continue

      if (availability.available) {
        if (!pickedDomains.has(availability.domain)) {
          pickedDomains.set(availability.domain, scored)
        }
      } else if (!unavailableComCandidates.has(scored.name)) {
        unavailableComCandidates.set(scored.name, scored)
      }
    }

    if (cursor < domainsToCheck.length) {
      await sleep(INTER_BATCH_DELAY_MS, options?.signal)
    }
  }
}

function formatResults(input: {
  targetCount: number
  picks: ScoredCandidate[]
  attempts: number
  maxAttempts: number
  generatedCandidates: number
  passedFilters: number
  checkedAvailability: number
  providerErrors: number
  qualityThreshold: number
  relaxationsApplied: string[]
  topRejectedReasons: Array<{ reason: string; count: number }>
  explanation: string
  suggestions: string[]
  nearMisses: NearMissOption[]
  availabilityHitRate: number
}): AutoFindRunResult {
  return {
    picks: input.picks,
    summary: {
      found: input.picks.length,
      target: input.targetCount,
      attempts: input.attempts,
      maxAttempts: input.maxAttempts,
      generatedCandidates: input.generatedCandidates,
      passedFilters: input.passedFilters,
      checkedAvailability: input.checkedAvailability,
      providerErrors: input.providerErrors,
      availabilityHitRate: Number((input.availabilityHitRate * 100).toFixed(2)),
      qualityThreshold: Number(input.qualityThreshold.toFixed(2)),
      relaxationsApplied: input.relaxationsApplied,
      topRejectedReasons: input.topRejectedReasons,
      checkingProgress: `Checking ${input.checkedAvailability}/${Math.max(input.generatedCandidates, input.checkedAvailability)}... Found ${input.picks.length}/${input.targetCount}`,
      suggestions: input.suggestions,
      nearMisses: input.nearMisses,
      explanation: input.explanation,
    },
  }
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
  let qualityThresholdUsed = 0
  let meaningThresholdUsed = 0

  const relaxations: RelaxationStep[] = []
  const availabilityTotals = {
    checkedAvailability: 0,
    providerErrors: 0,
  }
  const runSeedSalt = input.controls.seed
    ? "seeded"
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  for (let stage = 0; stage < maxAttempts; stage += 1) {
    if (options?.signal?.aborted) throw new Error("aborted")

    const relaxation = RELAXATION_ORDER[stage]
    attempts += 1
    relaxations.push({
      id: relaxation.id,
      label: relaxation.label,
      applied: wasRelaxationApplied(relaxation),
    })

    const concepts = buildConcepts(input, relaxation, stage)
    const generated = generateCandidates(input, relaxation, stage, concepts, Math.min(1700, adaptivePoolSize + stage * 90), runSeedSalt)

    totalGenerated += generated.candidates.length

    const filtered = generated.candidates.filter((candidate) => {
      const decision = evaluateCandidateFilters(candidate.name, {
        maxLength: Math.max(5, (input.maxLength || 10) + (relaxation.apply.maxLengthDelta || 0)),
        controls: {
          ...input.controls,
          keywordPosition: relaxation.apply.keywordPosition || input.controls.keywordPosition,
          mustIncludeKeyword: relaxation.apply.mustIncludeKeyword || input.controls.mustIncludeKeyword,
          style: relaxation.apply.style || input.controls.style,
        },
        blocklist,
        allowlist,
      })

      if (!decision.accepted) {
        allRejectedReasons.push(...decision.reasons)
      }

      return decision.accepted
    })

    totalPassedFilters += filtered.length

    const scored = scoreCandidates(input, stage, concepts, filtered, generated.keywordTokens)
    qualityThresholdUsed = Math.max(qualityThresholdUsed, Number.isFinite(scored.qualityFloor) ? scored.qualityFloor : 0)
    meaningThresholdUsed = Math.max(meaningThresholdUsed, scored.meaningFloor)

    if (scored.ranked.length === 0) {
      adaptivePoolSize = Math.min(1700, adaptivePoolSize + 170)
      continue
    }

    await checkAvailability(
      scored.ranked,
      pickedDomains,
      checkedDomains,
      unavailableComCandidates,
      targetCount,
      availabilityTotals,
      {
        signal: options?.signal,
      },
    )

    totalCheckedAvailability = availabilityTotals.checkedAvailability
    providerErrors = availabilityTotals.providerErrors

    if (pickedDomains.size >= targetCount || availabilityTotals.checkedAvailability >= MAX_TOTAL_AVAILABILITY_CHECKS) {
      break
    }

    const hitRate = availabilityTotals.checkedAvailability > 0 ? pickedDomains.size / availabilityTotals.checkedAvailability : 0
    if (hitRate < 0.013) {
      adaptivePoolSize = Math.min(1700, adaptivePoolSize + 180)
    }
  }

  const picks = Array.from(pickedDomains.entries())
    .map(([domain, candidate]) => ({
      ...candidate,
      name: domain.replace(/\.com$/i, ""),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)

  const nearMisses =
    picks.length < targetCount
      ? await buildNearMisses(Array.from(unavailableComCandidates.values()).sort((a, b) => b.score - a.score), options?.signal)
      : []

  const suggestions = buildQuickSuggestions(input, picks.length, providerErrors)

  const explanationParts: string[] = []
  if (picks.length >= targetCount) {
    explanationParts.push(`Found ${picks.length}/${targetCount} available .coms with meaning-first quality filters.`)
  } else {
    explanationParts.push(`Found ${picks.length}/${targetCount} available .coms after checking ${checkedDomains.size} unique domains.`)
    explanationParts.push(`.com scarcity at this length is common. Try +2 chars, 2-word mode, or allow suffix.`)
    if (providerErrors > 0) {
      explanationParts.push(`Some provider responses were degraded.`)
    }
  }

  return formatResults({
    targetCount,
    picks,
    attempts,
    maxAttempts,
    generatedCandidates: totalGenerated,
    passedFilters: totalPassedFilters,
    checkedAvailability: availabilityTotals.checkedAvailability,
    providerErrors,
    qualityThreshold: Math.max(qualityThresholdUsed, meaningThresholdUsed),
    relaxationsApplied: relaxations.filter((item) => item.applied).map((item) => item.label),
    topRejectedReasons: topRejectedReasons(allRejectedReasons, 6),
    explanation: explanationParts.join(" "),
    suggestions,
    nearMisses,
    availabilityHitRate: availabilityTotals.checkedAvailability > 0 ? picks.length / availabilityTotals.checkedAvailability : 0,
  })
}
