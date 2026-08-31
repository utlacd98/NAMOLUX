import { NextRequest, NextResponse } from "next/server"
import { isSystemReservedName } from "@/lib/reserved-names"
import { namecheapLink } from "@/lib/affiliateLink"
import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import {
  createGeneratedNameId,
  NAME_STYLES,
  type AvailabilityState,
  type GeneratedName,
  type NameStyle,
} from "@/lib/domainGen/generatedName"
import {
  QUICK_GENERATE_CREATIVITY,
  QUICK_GENERATE_STYLES,
  QUICK_GENERATE_VIBES,
  type QuickGenerateCreativity,
  type QuickGenerateInput,
  type QuickGeneratePreferences,
  type QuickGenerateStyle,
  type QuickGenerateVibe,
} from "@/lib/domainGen/quickGenerate"
import { generateGroqQuickCandidates, type GroqQuickGenerateResult } from "@/lib/domainGen/quickGenerateGroq"
import { buildQuickGenerateDomains, QUICK_GENERATE_TLDS, type QuickGenerateTld } from "@/lib/domainGen/quickTlds"
import { issueGenerationWorkflowToken } from "@/lib/generation-workflow-token"
import { isGeneratorRedesignEnabled, isQuickAutoEmergencyHoldEnabled } from "@/lib/generator-flags"
import { trackMetric } from "@/lib/metrics"
import { checkQuickBurstLimit, getQuickEntitlementState } from "@/lib/rate-limit"

const MAX_DESCRIPTION_LENGTH = 1_000
const MAX_RHYME_LENGTH = 80
const LEGACY_MAX_RESULTS = 12
const V2_RESULT_COUNT = 16
const THROTTLE_MAX_REQUESTS = 12
const V2_INCOMPLETE_MESSAGE = "We could not complete a full 16-name batch safely. Please retry or adjust the brief."
const V2_DEGRADED_MESSAGE = "High-quality generation is temporarily unavailable. Please retry in a moment; no monthly allowance was used."
const EMERGENCY_QUALITY_HOLD_MESSAGE = "Quick Generate is temporarily being improved to protect result quality. Please try again shortly; no allowance was used."
// Auto is model-only and must pass the separate naming-editor stage. Local
// "grounded" counts remain useful diagnostics, but a literal-root quota is not
// a quality proxy: it rejected the strongest metaphoric names and rewarded
// generic keyword compounds.
const AUTO_MINIMUM_MODEL_CANDIDATES = 16
const EXPLICIT_MINIMUM_MODEL_CANDIDATES = 8

type AutoBatchRejectionReason =
  | "insufficient_unique_candidates"
  | "insufficient_model_candidates"
  | "editorial_review_unconfirmed"
  | "deterministic_fallback_detected"
  | "quality_diagnostics_missing"
  | "quality_accounting_inconsistent"
  | "model_authorship_unconfirmed"

interface AutoBatchQualityGate {
  uniqueCandidateCount: number
  modelCandidateCount: number
  modelGroundedCandidateCount: number
  fallbackCandidateCount: number
  fallbackGroundedCandidateCount: number
  groundedCandidateCount: number
  exploratoryCandidateCount: number
  modelBacked: boolean
  editoriallyReviewed: boolean
  editorialCandidateCount: number
  rejectionReasons: AutoBatchRejectionReason[]
}

interface ParsedQuickRequest extends QuickGenerateInput {
  description: string
  rhymeWith: string
  vibe: QuickGenerateVibe
  style: QuickGenerateStyle
  creativity: QuickGenerateCreativity
  maxChars: number
  blacklist: string[]
  preferences: QuickGeneratePreferences
}

function normaliseVibe(value: unknown): QuickGenerateVibe {
  return QUICK_GENERATE_VIBES.includes(value as QuickGenerateVibe) ? (value as QuickGenerateVibe) : "friendly"
}

function normaliseStyle(value: unknown): QuickGenerateStyle {
  return QUICK_GENERATE_STYLES.includes(value as QuickGenerateStyle) ? (value as QuickGenerateStyle) : "auto"
}

function normaliseCreativity(value: unknown): QuickGenerateCreativity {
  return QUICK_GENERATE_CREATIVITY.includes(value as QuickGenerateCreativity)
    ? (value as QuickGenerateCreativity)
    : "balanced"
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback
  return Math.min(max, Math.max(min, numeric))
}

function cleanList(value: unknown, maximum: number, itemLength = 40): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, itemLength))
        .filter(Boolean),
    ),
  ).slice(0, maximum)
}

function cleanStyles(value: unknown): NameStyle[] {
  return cleanList(value, NAME_STYLES.length).filter((style): style is NameStyle => NAME_STYLES.includes(style as NameStyle))
}

function parsePreferences(value: unknown): QuickGeneratePreferences {
  if (!value || typeof value !== "object") return {}
  const preferences = value as Record<string, unknown>
  const preferredLength = ["short", "medium", "long"].includes(String(preferences.preferredLength))
    ? (preferences.preferredLength as QuickGeneratePreferences["preferredLength"])
    : undefined
  return {
    likedStyles: cleanStyles(preferences.likedStyles),
    dislikedStyles: cleanStyles(preferences.dislikedStyles),
    preferredLength,
    preferredSounds: cleanList(preferences.preferredSounds, 8, 12),
    avoidedSounds: cleanList(preferences.avoidedSounds, 8, 12),
  }
}

function parseBody(body: unknown): ParsedQuickRequest {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const style = normaliseStyle(input.style)
  const minimumMaxChars = style === "non_english" ? 12 : 6
  return {
    description: typeof input.description === "string" ? input.description.trim().slice(0, MAX_DESCRIPTION_LENGTH) : "",
    rhymeWith: typeof input.rhymeWith === "string" ? input.rhymeWith.trim().slice(0, MAX_RHYME_LENGTH) : "",
    vibe: normaliseVibe(input.vibe),
    style,
    creativity: normaliseCreativity(input.creativity),
    maxChars: clampNumber(input.maxChars, Math.max(10, minimumMaxChars), minimumMaxChars, 15),
    count: clampNumber(input.count, LEGACY_MAX_RESULTS, 1, LEGACY_MAX_RESULTS),
    blacklist: cleanList(input.blacklist, 30),
    preferences: parsePreferences(input.preferences),
  }
}

function generationWorkflowIdentity(request: NextRequest, userId: string | null): string {
  if (userId) return `user:${userId}`
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown"
  return `anonymous:${ip}`
}

function trackGeneration(
  request: NextRequest,
  input: ParsedQuickRequest,
  generation: GroqQuickGenerateResult,
  extra: Record<string, unknown>,
) {
  const provider = generation.provider || (generation.usedGroq ? "groq" : generation.usedOpenAI ? "openai" : "deterministic")
  trackMetric({
    action: "quick_generate",
    metadata: {
      mode: "quick",
      style: input.style,
      creativity: input.creativity,
      provider,
      model: generation.model || undefined,
      timeToNamesMs: generation.durationMs,
      providerAttemptCount: generation.providerAttempts?.length ?? 0,
      modelCandidateCount: generation.modelCandidateCount,
      modelGroundedCandidateCount: generation.modelGroundedCandidateCount,
      fallbackCandidateCount: generation.fallbackCandidateCount,
      fallbackGroundedCandidateCount: generation.fallbackGroundedCandidateCount,
      groundedCandidateCount: generation.groundedCandidateCount,
      exploratoryCandidateCount: generation.exploratoryCandidateCount,
      editoriallyReviewed: generation.editoriallyReviewed,
      editorialCandidateCount: generation.editorialCandidateCount,
      fallbackRatio: generation.candidates.length > 0
        ? Number((generation.fallbackCandidateCount / generation.candidates.length).toFixed(2))
        : 0,
      fallbackReason: generation.fallbackReason,
      ...extra,
    },
    userAgent: request.headers.get("user-agent") || undefined,
    country: request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined,
  })
}

function buildPendingAvailability(name: string): Record<QuickGenerateTld, AvailabilityState> {
  return Object.fromEntries(
    QUICK_GENERATE_TLDS.map((tld) => [
      tld,
      {
        status: "checking",
        available: null,
        confidence: null,
        fullDomain: `${name}.${tld}`,
      } satisfies AvailabilityState,
    ]),
  ) as Record<QuickGenerateTld, AvailabilityState>
}

function publishableCandidateKey(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9-]/g, "").slice(0, 63).toLowerCase()
}

function uniquePublishableCandidates(generation: GroqQuickGenerateResult) {
  const seen = new Set<string>()
  return generation.candidates.filter((candidate) => {
    if (isSystemReservedName(candidate.name)) return false
    const key = publishableCandidateKey(candidate.name)
    if (key.length < 2 || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, V2_RESULT_COUNT)
}

/**
 * Auto is the public default, so it must never turn an incomplete provider
 * response into a normal-looking shortlist. The generation module records
 * candidate provenance as aggregate counts; use only those count-only fields
 * here so metrics and error responses never include a brief or a name.
 */
function assessAutoBatchQuality(
  generation: GroqQuickGenerateResult,
  publishableCandidates: ReturnType<typeof uniquePublishableCandidates>,
): AutoBatchQualityGate {
  const modelBacked = generation.modelBacked ?? generation.modelCandidateCount > 0
  const hasQualityDiagnostics = [
    generation.modelGroundedCandidateCount,
    generation.fallbackGroundedCandidateCount,
    generation.groundedCandidateCount,
    generation.exploratoryCandidateCount,
  ].every(Number.isFinite)
  // Auto generation and the route run in the same deployment, so missing
  // count-only tier diagnostics are a quality fault, not a compatibility
  // case. Fail closed rather than treating an unclassified batch as grounded.
  const groundedCandidateCount = Number.isFinite(generation.groundedCandidateCount)
    ? generation.groundedCandidateCount
    : 0
  const modelGroundedCandidateCount = Number.isFinite(generation.modelGroundedCandidateCount)
    ? generation.modelGroundedCandidateCount
    : 0
  // A missing reserve tier is also unsafe. No deterministic reserve is public
  // in the emergency contract, but retaining the count makes future changes
  // fail closed by default.
  const fallbackGroundedCandidateCount = Number.isFinite(generation.fallbackGroundedCandidateCount)
    ? generation.fallbackGroundedCandidateCount
    : 0
  const exploratoryCandidateCount = Number.isFinite(generation.exploratoryCandidateCount)
    ? generation.exploratoryCandidateCount
    : Math.max(0, generation.modelCandidateCount - groundedCandidateCount)
  const editorialCandidateCount = Number.isFinite(generation.editorialCandidateCount)
    ? generation.editorialCandidateCount
    : 0
  const editoriallyReviewed = generation.editoriallyReviewed === true
  const qualityAccountingConsistent =
    generation.modelCandidateCount + generation.fallbackCandidateCount === publishableCandidates.length
    && modelGroundedCandidateCount <= generation.modelCandidateCount
    && fallbackGroundedCandidateCount <= generation.fallbackCandidateCount
    && groundedCandidateCount === modelGroundedCandidateCount + fallbackGroundedCandidateCount
    && groundedCandidateCount + exploratoryCandidateCount === publishableCandidates.length
    && editorialCandidateCount <= generation.modelCandidateCount
  const rejectionReasons: AutoBatchRejectionReason[] = []

  if (publishableCandidates.length < V2_RESULT_COUNT) {
    rejectionReasons.push("insufficient_unique_candidates")
  }
  if (!modelBacked) {
    rejectionReasons.push("model_authorship_unconfirmed")
  }
  if (!hasQualityDiagnostics) {
    rejectionReasons.push("quality_diagnostics_missing")
  }
  if (!qualityAccountingConsistent) {
    rejectionReasons.push("quality_accounting_inconsistent")
  }
  if (generation.modelCandidateCount < AUTO_MINIMUM_MODEL_CANDIDATES) {
    rejectionReasons.push("insufficient_model_candidates")
  }
  if (!editoriallyReviewed || editorialCandidateCount < AUTO_MINIMUM_MODEL_CANDIDATES) {
    rejectionReasons.push("editorial_review_unconfirmed")
  }
  if (generation.fallbackCandidateCount > 0 || generation.provider === "deterministic") {
    rejectionReasons.push("deterministic_fallback_detected")
  }

  return {
    uniqueCandidateCount: publishableCandidates.length,
    modelCandidateCount: generation.modelCandidateCount,
    modelGroundedCandidateCount,
    fallbackCandidateCount: generation.fallbackCandidateCount,
    fallbackGroundedCandidateCount,
    groundedCandidateCount,
    exploratoryCandidateCount,
    modelBacked,
    editoriallyReviewed,
    editorialCandidateCount,
    rejectionReasons,
  }
}

function autoQualityFailureResponse(qualityGate: AutoBatchQualityGate) {
  const incomplete = qualityGate.rejectionReasons.includes("insufficient_unique_candidates")
  return NextResponse.json(
    {
      error: incomplete ? "quick_generation_incomplete" : "quick_generation_temporarily_limited",
      message: incomplete ? V2_INCOMPLETE_MESSAGE : V2_DEGRADED_MESSAGE,
      retryable: true,
      generationMeta: {
        requestedCount: V2_RESULT_COUNT,
        // A partial count is useful to the client for an incomplete provider
        // response. Quality-rejected candidates are intentionally never
        // represented as usable results.
        resultCount: incomplete ? qualityGate.uniqueCandidateCount : 0,
        isPartial: true,
        qualityState: incomplete ? "incomplete" : "degraded",
        // Safe operational diagnostics help the client distinguish an
        // incomplete provider response from a quality rejection without ever
        // revealing a prompt, candidate, provider message, or score.
        modelCandidateCount: qualityGate.modelCandidateCount,
        modelGroundedCandidateCount: qualityGate.modelGroundedCandidateCount,
        groundedCandidateCount: qualityGate.groundedCandidateCount,
        exploratoryCandidateCount: qualityGate.exploratoryCandidateCount,
        editoriallyReviewed: qualityGate.editoriallyReviewed,
        editorialCandidateCount: qualityGate.editorialCandidateCount,
        fallbackCandidateCount: qualityGate.fallbackCandidateCount,
        fallbackGroundedCandidateCount: qualityGate.fallbackGroundedCandidateCount,
        ...(incomplete ? { styleShortfallReason: V2_INCOMPLETE_MESSAGE } : {}),
      },
    },
    { status: 503 },
  )
}

function trackAutoQualityRejection(
  request: NextRequest,
  input: ParsedQuickRequest,
  generation: GroqQuickGenerateResult,
  contract: "candidate_first_v2" | "legacy",
  qualityGate: AutoBatchQualityGate,
) {
  trackGeneration(request, input, generation, {
    contract,
    requestedCount: V2_RESULT_COUNT,
    resultCount: 0,
    rejectedAutoQualityBatch: true,
    qualityRejectionReasons: qualityGate.rejectionReasons,
    uniqueCandidateCount: qualityGate.uniqueCandidateCount,
    modelCandidateCount: qualityGate.modelCandidateCount,
    modelGroundedCandidateCount: qualityGate.modelGroundedCandidateCount,
    fallbackCandidateCount: qualityGate.fallbackCandidateCount,
    fallbackGroundedCandidateCount: qualityGate.fallbackGroundedCandidateCount,
    groundedCandidateCount: qualityGate.groundedCandidateCount,
    exploratoryCandidateCount: qualityGate.exploratoryCandidateCount,
    editoriallyReviewed: qualityGate.editoriallyReviewed,
    editorialCandidateCount: qualityGate.editorialCandidateCount,
    modelBacked: qualityGate.modelBacked,
  })

  // Preview-only operational telemetry for the emergency repair. This keeps
  // the diagnostic boundary intentionally narrow: no brief, candidate,
  // provider response, user identifier, or IP is ever written. It lets us
  // distinguish transport/schema failures from local admission rejection
  // before a provider can be considered for release.
  if (process.env.QUICK_GENERATE_EMERGENCY_DIAGNOSTICS?.trim().toLowerCase() === "true") {
    const diagnostic = {
      provider: generation.provider,
      model: generation.model,
      rejectionReasons: qualityGate.rejectionReasons,
      counts: {
        uniqueCandidateCount: qualityGate.uniqueCandidateCount,
        modelCandidateCount: qualityGate.modelCandidateCount,
        modelGroundedCandidateCount: qualityGate.modelGroundedCandidateCount,
        fallbackCandidateCount: qualityGate.fallbackCandidateCount,
        fallbackGroundedCandidateCount: qualityGate.fallbackGroundedCandidateCount,
        groundedCandidateCount: qualityGate.groundedCandidateCount,
        exploratoryCandidateCount: qualityGate.exploratoryCandidateCount,
        editoriallyReviewed: qualityGate.editoriallyReviewed,
        editorialCandidateCount: qualityGate.editorialCandidateCount,
      },
      attempts: generation.providerAttempts.map((attempt) => ({
        provider: attempt.provider,
        model: attempt.model,
        outcome: attempt.outcome,
        status: attempt.status,
        durationMs: attempt.durationMs,
        retryAfterMs: attempt.retryAfterMs,
        retryCount: attempt.retryCount,
        parsedCandidateCount: attempt.parsedCandidateCount,
        admittedCandidateCount: attempt.admittedCandidateCount,
        admissionRejectionCounts: attempt.admissionRejectionCounts,
        errorCode: attempt.errorCode,
      })),
    }
    // Vercel collapses nested objects to [Object] in expanded logs. Serializing
    // this already-sanitized, count-only envelope keeps the actual admission
    // reason observable without logging a brief, name, response, user ID, or IP.
    console.warn("quick_auto_quality_rejected", JSON.stringify(diagnostic))
  }
}

function explicitStyleShortfallReason(
  input: ParsedQuickRequest,
  generation: GroqQuickGenerateResult,
  resultCount: number,
): string | null {
  if (input.style === "auto" || resultCount >= V2_RESULT_COUNT) return null
  const supplied = generation.styleShortfallReason?.trim().slice(0, 360)
  if (supplied) return supplied
  const styleLabel = input.style.replaceAll("_", " ")
  return `Only ${resultCount} safe ${styleLabel} names met this brief. Other styles were not substituted.`
}

function hasPublishableExplicitModelBatch(
  generation: GroqQuickGenerateResult,
  resultCount: number,
  style: QuickGenerateStyle,
): boolean {
  const minimum = style === "non_english" ? 5 : EXPLICIT_MINIMUM_MODEL_CANDIDATES
  return generation.modelBacked
    && generation.provider !== "deterministic"
    && generation.fallbackCandidateCount === 0
    && generation.modelCandidateCount === resultCount
    && resultCount >= minimum
}

function explicitQualityFailureResponse(input: ParsedQuickRequest) {
  const styleLabel = input.style.replaceAll("_", " ")
  return NextResponse.json(
    {
      error: "quick_generation_temporarily_limited",
      message: `We could not complete a strong ${styleLabel} shortlist. Please retry or adjust the brief; no allowance was used.`,
      retryable: true,
      generationMeta: {
        requestedCount: V2_RESULT_COUNT,
        resultCount: 0,
        isPartial: true,
        qualityState: "degraded",
      },
    },
    { status: 503 },
  )
}

async function handleV2(request: NextRequest, input: ParsedQuickRequest) {
  // Entitlement lookup is deliberately read-only: Quick generation never
  // consumes the shared monthly counter.
  const entitlement = await getQuickEntitlementState(request)
  const generation = await generateGroqQuickCandidates({
    ...input,
    count: V2_RESULT_COUNT,
    requireEditorialReview: input.style === "auto",
  }, request.signal)
  const generationProvider = generation.provider || (generation.usedGroq ? "groq" : generation.usedOpenAI ? "openai" : "deterministic")
  const publishableCandidates = uniquePublishableCandidates(generation)
  const resultCount = publishableCandidates.length
  if (input.style === "auto") {
    const qualityGate = assessAutoBatchQuality(generation, publishableCandidates)
    if (qualityGate.rejectionReasons.length > 0) {
      trackAutoQualityRejection(request, input, generation, "candidate_first_v2", qualityGate)
      return autoQualityFailureResponse(qualityGate)
    }
  } else if (!hasPublishableExplicitModelBatch(generation, resultCount, input.style)) {
    trackGeneration(request, input, generation, {
      contract: "candidate_first_v2",
      requestedCount: V2_RESULT_COUNT,
      resultCount: 0,
      rejectedExplicitQualityBatch: true,
    })
    return explicitQualityFailureResponse(input)
  }

  const modelBacked = generation.modelBacked ?? generation.modelCandidateCount > 0

  const styleShortfallReason = explicitStyleShortfallReason(input, generation, resultCount)
  const isPartial = resultCount < V2_RESULT_COUNT

  const candidates: GeneratedName<QuickGenerateTld>[] = publishableCandidates.map((candidate, index) => {
    const generationRank = index + 1
    return {
      id: createGeneratedNameId(candidate.name, generationRank),
      name: candidate.name,
      rationale: candidate.personality,
      style: candidate.style,
      generationRank,
      availability: buildPendingAvailability(candidate.name),
      founderSignal: null,
    }
  })
  const names = candidates.map((candidate) => candidate.name)
  const availabilityToken = issueGenerationWorkflowToken(
    names,
    `availability:${generationWorkflowIdentity(request, entitlement.userId)}`,
  )

  trackGeneration(request, input, generation, {
    resultCount: candidates.length,
    requestedCount: V2_RESULT_COUNT,
    partialStyleBatch: isPartial,
    contract: "candidate_first_v2",
  })

  return NextResponse.json({
    success: true,
    isPro: entitlement.isPro,
    generation: generationProvider,
    state: "names_ready",
    availabilityState: "checking_domains",
    availabilityToken,
    workflowToken: availabilityToken,
    generationMeta: {
      modelBacked,
      model: generation.model || null,
      durationMs: generation.durationMs ?? null,
      providerAttempts: generation.providerAttempts || [],
      editoriallyReviewed: generation.editoriallyReviewed,
      editorialCandidateCount: generation.editorialCandidateCount,
      requestedCount: V2_RESULT_COUNT,
      resultCount,
      isPartial,
      styleFulfilled: isPartial ? false : generation.styleFulfilled,
      styleShortfallReason,
    },
    quality: {
      modelCandidateCount: generation.modelCandidateCount,
      modelGroundedCandidateCount: generation.modelGroundedCandidateCount,
      fallbackCandidateCount: generation.fallbackCandidateCount,
      fallbackGroundedCandidateCount: generation.fallbackGroundedCandidateCount,
      groundedCandidateCount: generation.groundedCandidateCount,
      exploratoryCandidateCount: generation.exploratoryCandidateCount,
      editoriallyReviewed: generation.editoriallyReviewed,
      editorialCandidateCount: generation.editorialCandidateCount,
    },
    candidates,
  })
}

async function handleLegacy(request: NextRequest, input: ParsedQuickRequest) {
  // Quick is unlimited on both sides of the rollout flag. The flag changes the
  // response/loading architecture, never the advertised entitlement.
  const entitlement = await getQuickEntitlementState(request)

  // Legacy pages still expect synchronous domain results. Auto nevertheless
  // generates a private 16-name validation batch before any domain request so
  // the rollout flag can never make the public default accept fallback filler.
  const generationInput = input.style === "auto"
    ? { ...input, count: V2_RESULT_COUNT, requireEditorialReview: true }
    : input
  const generation = await generateGroqQuickCandidates(generationInput, request.signal)
  const generationProvider = generation.provider || (generation.usedGroq ? "groq" : generation.usedOpenAI ? "openai" : "deterministic")
  const publishableCandidates = uniquePublishableCandidates(generation)
  const legacyResultCount = publishableCandidates.length
  if (input.style === "auto") {
    const qualityGate = assessAutoBatchQuality(generation, publishableCandidates)
    if (qualityGate.rejectionReasons.length > 0) {
      trackAutoQualityRejection(request, input, generation, "legacy", qualityGate)
      return autoQualityFailureResponse(qualityGate)
    }
  } else if (!hasPublishableExplicitModelBatch(generation, legacyResultCount, input.style)) {
    trackGeneration(request, input, generation, {
      contract: "legacy",
      requestedCount: input.count,
      resultCount: 0,
      rejectedExplicitQualityBatch: true,
    })
    return explicitQualityFailureResponse(input)
  }
  const candidates = input.style === "auto"
    ? publishableCandidates.slice(0, input.count)
    : generation.candidates.filter((candidate) => !isSystemReservedName(candidate.name))
  if (candidates.length === 0) {
    return NextResponse.json({ error: "No valid names generated. Try a different description." }, { status: 400 })
  }

  const domainMatrix = buildQuickGenerateDomains(candidates.map((candidate) => candidate.name))
  const availabilityResults = await checkAvailabilityBatch(domainMatrix.map((domain) => domain.fullDomain), {
    signal: request.signal,
    concurrency: 6,
    maxRetries: 0,
    dnsTimeoutMs: 2_000,
    rdapTimeoutMs: 3_500,
    ttlMs: 24 * 60 * 60 * 1_000,
  })
  const availabilityMap = new Map(availabilityResults.map((result) => [result.domain, result]))
  const candidateByName = new Map(candidates.map((candidate, index) => [candidate.name, { candidate, index }]))

  const results = domainMatrix.map(({ name, tld, fullDomain }) => {
    const availability = availabilityMap.get(fullDomain)
    const tiered = availability?.tieredDetails
    return {
      name,
      fullDomain,
      tld,
      available: Boolean(availability?.available),
      availabilityConfidence: availability?.confidence || "low",
      checkStatus: tiered?.status ?? (availability?.available ? "available" : availability ? "taken" : "needs_verification"),
      checkTiers: tiered
        ? { dns: { google: tiered.tier1.google, cloudflare: tiered.tier1.cloudflare }, rdap: tiered.tier2?.rdap ?? null }
        : null,
      personality: candidateByName.get(name)?.candidate.personality || "",
      registerUrl: namecheapLink(fullDomain, { source: "quick_generate", content: tld }),
    }
  }).sort((left, right) => {
    const nameRank = (candidateByName.get(left.name)?.index ?? Number.MAX_SAFE_INTEGER)
      - (candidateByName.get(right.name)?.index ?? Number.MAX_SAFE_INTEGER)
    if (nameRank !== 0) return nameRank
    if (left.available !== right.available) return left.available ? -1 : 1
    if (left.availabilityConfidence !== right.availabilityConfidence) {
      const rank = { high: 0, medium: 1, low: 2 }
      return rank[left.availabilityConfidence] - rank[right.availabilityConfidence]
    }
    return left.name.length - right.name.length
  })

  trackGeneration(request, input, generation, {
    resultCount: results.length,
    contract: "legacy",
  })

  return NextResponse.json({
    success: true,
    isPro: entitlement.isPro,
    generation: generationProvider,
    generationMeta: {
      modelBacked: generation.modelBacked ?? generation.modelCandidateCount > 0,
      model: generation.model || null,
      durationMs: generation.durationMs ?? null,
      providerAttempts: generation.providerAttempts || [],
      editoriallyReviewed: generation.editoriallyReviewed,
      editorialCandidateCount: generation.editorialCandidateCount,
      styleFulfilled: generation.styleFulfilled,
      styleShortfallReason: generation.styleShortfallReason || null,
    },
    quality: {
      modelCandidateCount: generation.modelCandidateCount,
      modelGroundedCandidateCount: generation.modelGroundedCandidateCount,
      fallbackCandidateCount: generation.fallbackCandidateCount,
      fallbackGroundedCandidateCount: generation.fallbackGroundedCandidateCount,
      groundedCandidateCount: generation.groundedCandidateCount,
      exploratoryCandidateCount: generation.exploratoryCandidateCount,
      editoriallyReviewed: generation.editoriallyReviewed,
      editorialCandidateCount: generation.editorialCandidateCount,
    },
    results,
  })
}

export async function POST(request: NextRequest) {
  const labBlockResponse = getGeneratorLabApiBlockResponse(request)
  if (labBlockResponse) return labBlockResponse

  try {
    const input = parseBody(await request.json())
    if (input.description.length < 2) {
      return NextResponse.json({ error: "Description or keywords are required" }, { status: 400 })
    }

    // This is intentionally evaluated after basic input validation but before
    // any provider, quota, Founder Signal or domain work. During an emergency
    // quality investigation every Quick style must fail honestly rather than
    // let an alternate control bypass the public quality hold.
    if (isQuickAutoEmergencyHoldEnabled()) {
      return NextResponse.json(
        {
          error: "quick_generation_quality_hold",
          message: EMERGENCY_QUALITY_HOLD_MESSAGE,
          retryable: true,
          generationMeta: {
            requestedCount: isGeneratorRedesignEnabled() ? V2_RESULT_COUNT : LEGACY_MAX_RESULTS,
            resultCount: 0,
            isPartial: true,
            qualityState: "temporarily_paused",
          },
        },
        { status: 503 },
      )
    }

    const throttle = await checkQuickBurstLimit(request, THROTTLE_MAX_REQUESTS)
    if (!throttle.allowed) {
      return NextResponse.json(
        {
          error: "quick_generate_rate_limited",
          message: "Please slow down for a moment before generating again.",
          resetAt: throttle.resetAt,
        },
        { status: throttle.unavailable ? 503 : 429 },
      )
    }

    return isGeneratorRedesignEnabled() ? handleV2(request, input) : handleLegacy(request, input)
  } catch (error) {
    console.error("Error in quick generate:", error)
    return NextResponse.json({ error: "Failed to quick generate names" }, { status: 500 })
  }
}
