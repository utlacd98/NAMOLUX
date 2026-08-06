import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  checkBurstLimit: vi.fn(),
  checkFeatureQuotaIdempotent: vi.fn(),
  getFeatureQuotaReplayState: vi.fn(),
  getFeatureQuotaState: vi.fn(),
  checkRateLimit: vi.fn(),
  getRateLimitState: vi.fn(),
  logGeneration: vi.fn(),
  generateCandidatePool: vi.fn(),
  rankCandidates: vi.fn(),
  generateQuickCandidates: vi.fn(),
  generateGroqQuickCandidates: vi.fn(),
  issueToken: vi.fn(),
  scoreName: vi.fn(),
  trackMetric: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkBurstLimit: mocks.checkBurstLimit,
  checkFeatureQuotaIdempotent: mocks.checkFeatureQuotaIdempotent,
  getFeatureQuotaReplayState: mocks.getFeatureQuotaReplayState,
  getFeatureQuotaState: mocks.getFeatureQuotaState,
  checkRateLimit: mocks.checkRateLimit,
  getRateLimitState: mocks.getRateLimitState,
  logGeneration: mocks.logGeneration,
}))
vi.mock("@/lib/domainGen/generateCandidates", () => ({ generateCandidatePool: mocks.generateCandidatePool }))
vi.mock("@/lib/domainGen/scoreCandidates", () => ({ rankCandidates: mocks.rankCandidates }))
vi.mock("@/lib/domainGen/quickGenerate", () => ({
  generateQuickCandidates: mocks.generateQuickCandidates,
  selectPrimaryQuickCandidates: vi.fn(),
}))
vi.mock("@/lib/domainGen/quickGenerateGroq", () => ({
  generateGroqQuickCandidates: mocks.generateGroqQuickCandidates,
}))
vi.mock("@/lib/domainGen/filters", () => ({
  hasAiSmellPattern: () => false,
  hasMalformedCompoundPattern: () => false,
  hasRandomSyllablePattern: () => false,
  hasRecognisableBrandRoot: () => true,
  hasUnsafeBrandMeaning: () => false,
  passesTasteGate: () => true,
}))
vi.mock("@/lib/domainGen/realness", () => ({ isGibberish: () => false, isKeywordClone: () => false }))
vi.mock("@/lib/generation-workflow-token", () => ({
  ADVANCED_SCORING_TOKEN_TTL_MS: 24 * 60 * 60 * 1_000,
  issueGenerationWorkflowToken: mocks.issueToken,
}))
vi.mock("@/lib/founderSignal/scoreName", () => ({ scoreName: mocks.scoreName }))
vi.mock("@/lib/metrics", () => ({ trackMetric: mocks.trackMetric }))
vi.mock("@/lib/autofind/autoFindByFounderScore", () => ({ autoFind5DotComByFounderScore: vi.fn() }))

import { POST } from "@/app/api/generate-domains/route"

const originalFlag = process.env.GENERATOR_REDESIGN_V2
const originalOpenAiKey = process.env.OPENAI_API_KEY
const originalEmergencyHold = process.env.ADVANCED_GENERATE_EMERGENCY_HOLD
const RECEIPT_CREATED_AT = "2026-07-14T11:58:00.000Z"

const names = [
  "alderlane", "brightmuse", "calmcraft", "driftwell", "emberpath", "fieldnote",
  "grovepilot", "havenmark", "kindredge", "loomspark", "mintbridge", "northbeam",
]
const providerNames = [...names, "oakthread", "quietforge", "riverkind", "steadylane"]

function providerCandidates(candidateNames = providerNames) {
  return candidateNames.map((name, index) => ({
    name,
    personality: `${name} pairs a clear planning cue with a calm, credible character for the intended audience.`,
    style: (["compound", "evocative", "brandable"] as const)[index % 3],
    autoQualityTier: index < 4 ? "grounded" : "exploratory",
    fitRoots: index < 4 ? ["planning", "calm"] : [],
    fitCues: index < 4 ? ["credible", "clear"] : [],
  }))
}

function modelBackedGeneration(overrides: Record<string, unknown> = {}) {
  return {
    candidates: providerCandidates(),
    usedGroq: false,
    usedOpenAI: true,
    usedVercelGateway: false,
    modelBacked: true,
    editoriallyReviewed: true,
    editorialCandidateCount: 16,
    provider: "openai",
    model: "gpt-4.1-mini",
    durationMs: 1_842,
    providerAttempts: [{
      provider: "openai",
      model: "gpt-4.1-mini",
      stage: "generation",
      outcome: "ready",
      durationMs: 1_720,
      retryCount: 0,
      parsedCandidateCount: 16,
      admittedCandidateCount: 16,
    }],
    styleFulfilled: true,
    modelCandidateCount: 16,
    modelGroundedCandidateCount: 4,
    fallbackCandidateCount: 0,
    fallbackGroundedCandidateCount: 0,
    groundedCandidateCount: 4,
    exploratoryCandidateCount: 12,
    ...overrides,
  }
}

function request(body: unknown, signal?: AbortSignal) {
  return new NextRequest("https://www.namolux.com/api/generate-domains", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: JSON.stringify(
      body && typeof body === "object" && !Array.isArray(body)
        ? { requestId: "request_01J2M9NNR3Y6J8QH4T2W7K5P0C", ...body }
        : body,
    ),
    signal,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GENERATOR_REDESIGN_V2 = "true"
  delete process.env.ADVANCED_GENERATE_EMERGENCY_HOLD
  delete process.env.OPENAI_API_KEY
  mocks.checkBurstLimit.mockResolvedValue({
    allowed: true,
    used: 1,
    resetAt: "2026-07-14T12:01:00.000Z",
    unavailable: false,
  })
  mocks.getFeatureQuotaReplayState.mockResolvedValue({ replayed: false, unavailable: false })
  mocks.getFeatureQuotaState.mockResolvedValue({
    allowed: true,
    isPro: false,
    userId: null,
    plan: "free",
    used: 0,
    limit: 3,
    remaining: 3,
    resetAt: "2026-08-01T00:00:00.000Z",
    statusCode: 200,
  })
  mocks.checkFeatureQuotaIdempotent.mockResolvedValue({
    allowed: true,
    replayed: false,
    receiptCreatedAt: RECEIPT_CREATED_AT,
    isPro: false,
    userId: null,
    plan: "free",
    used: 1,
    limit: 3,
    remaining: 2,
    resetAt: "2026-08-01T00:00:00.000Z",
    statusCode: 200,
  })
  mocks.generateCandidatePool.mockReturnValue({ keywordTokens: ["planning"], candidates: names.map((name) => ({ name })) })
  mocks.rankCandidates.mockReturnValue(names.map((name, index) => ({
    name,
    strategy: index % 2 === 0 ? "verified_concept_compound" : "brandable_blend",
    whyItWorks: `${name} connects a calm planning cue to the professional audience in the brief.`,
    meaningBreakdown: `${name} combines a familiar image with a practical category cue.`,
  })))
  mocks.generateQuickCandidates.mockReturnValue([])
  mocks.generateGroqQuickCandidates.mockResolvedValue(modelBackedGeneration())
  mocks.logGeneration.mockResolvedValue(undefined)
  mocks.issueToken.mockImplementation((_names: string[], subject: string, now: number) => `signed:${subject}:${now}`)
  mocks.scoreName.mockImplementation(() => {
    throw new Error("Founder Signal must not run during Advanced generation")
  })
})

afterEach(() => {
  if (originalFlag === undefined) delete process.env.GENERATOR_REDESIGN_V2
  else process.env.GENERATOR_REDESIGN_V2 = originalFlag
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalOpenAiKey
  if (originalEmergencyHold === undefined) delete process.env.ADVANCED_GENERATE_EMERGENCY_HOLD
  else process.env.ADVANCED_GENERATE_EMERGENCY_HOLD = originalEmergencyHold
})

describe("Advanced creative generation v2", () => {
  it("fails closed before burst, allowance, generation, scoring, or token work during the emergency quality hold", async () => {
    process.env.ADVANCED_GENERATE_EMERGENCY_HOLD = "true"

    for (const autoFindV2 of [false, true]) {
      const response = await POST(request({
        keyword: "Calm financial planning for UK freelancers",
        autoFindV2,
      }))
      const payload = await response.json()

      expect(response.status).toBe(503)
      expect(payload).toMatchObject({
        error: "advanced_generation_quality_hold",
        retryable: true,
        generationMeta: {
          resultCount: 0,
          isPartial: true,
          qualityState: "temporarily_paused",
        },
      })
    }

    expect(mocks.checkBurstLimit).not.toHaveBeenCalled()
    expect(mocks.getFeatureQuotaReplayState).not.toHaveBeenCalled()
    expect(mocks.getFeatureQuotaState).not.toHaveBeenCalled()
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.getRateLimitState).not.toHaveBeenCalled()
    expect(mocks.generateCandidatePool).not.toHaveBeenCalled()
    expect(mocks.generateQuickCandidates).not.toHaveBeenCalled()
    expect(mocks.generateGroqQuickCandidates).not.toHaveBeenCalled()
    expect(mocks.rankCandidates).not.toHaveBeenCalled()
    expect(mocks.scoreName).not.toHaveBeenCalled()
    expect(mocks.issueToken).not.toHaveBeenCalled()
  })

  it("returns twelve model-backed candidates with provider metadata and no fallback", async () => {
    const response = await POST(request({
      keyword: "Calm financial planning for UK freelancers",
      industry: "financial planning",
      vibe: "trustworthy",
      maxLength: 15,
      count: 20,
      generatorV2: true,
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.generateGroqQuickCandidates).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Calm financial planning for UK freelancers Industry context: financial planning.",
        vibe: "clean",
        style: "auto",
        creativity: "balanced",
        maxChars: 15,
        count: 16,
        blacklist: [],
      }),
      expect.any(AbortSignal),
    )
    expect(mocks.getFeatureQuotaState).toHaveBeenCalledWith(expect.any(NextRequest), "advanced-generation-monthly", 3)
    expect(mocks.checkFeatureQuotaIdempotent).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "advanced-generation-monthly",
      3,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    )
    expect(mocks.scoreName).not.toHaveBeenCalled()
    expect(mocks.generateCandidatePool).not.toHaveBeenCalled()
    expect(mocks.rankCandidates).not.toHaveBeenCalled()
    expect(mocks.generateQuickCandidates).not.toHaveBeenCalled()
    expect(payload).toMatchObject({
      generation: "openai",
      generationMeta: {
        modelBacked: true,
        model: "gpt-4.1-mini",
        durationMs: 1_842,
        providerAttempts: [{
          provider: "openai",
          model: "gpt-4.1-mini",
          stage: "generation",
          outcome: "ready",
          durationMs: 1_720,
          retryCount: 0,
          parsedCandidateCount: 16,
          admittedCandidateCount: 16,
        }],
        editoriallyReviewed: true,
        editorialCandidateCount: 16,
        requestedCount: 12,
        resultCount: 12,
        isPartial: false,
        styleFulfilled: true,
      },
      quality: {
        modelCandidateCount: 12,
        modelGroundedCandidateCount: 4,
        fallbackCandidateCount: 0,
        fallbackGroundedCandidateCount: 0,
        groundedCandidateCount: 4,
        exploratoryCandidateCount: 8,
      },
    })
    expect(payload.domains).toHaveLength(12)
    expect(payload.domains.every((candidate: { founderSignal: unknown }) => candidate.founderSignal === null)).toBe(true)
    expect(payload.domains.map((candidate: { generationRank: number }) => candidate.generationRank)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12])
    expect(mocks.issueToken).toHaveBeenNthCalledWith(
      1,
      expect.any(Array),
      "advanced-founder-signal:anonymous:203.0.113.9",
      Date.parse(RECEIPT_CREATED_AT),
      24 * 60 * 60 * 1_000,
      { binding: "ordered" },
    )
    expect(payload.workflowToken).toBe(`signed:advanced-founder-signal:anonymous:203.0.113.9:${Date.parse(RECEIPT_CREATED_AT)}`)
    expect(payload.availabilityToken).toMatch(/^signed:availability:anonymous:203\.0\.113\.9:\d+$/)
    expect(payload.availabilityToken).not.toBe(`signed:availability:anonymous:203.0.113.9:${Date.parse(RECEIPT_CREATED_AT)}`)
    expect(payload.advancedGenerationAllowance).toEqual({
      used: 1,
      limit: 3,
      remaining: 2,
      resetAt: "2026-08-01T00:00:00.000Z",
    })
  })

  it("cannot be forced back onto the legacy Founder Signal path by a client flag", async () => {
    const response = await POST(request({
      keyword: "Private healthcare for rural communities",
      generatorV2: false,
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.generatorV2).toBe(true)
    expect(payload.domains).toHaveLength(12)
    expect(mocks.scoreName).not.toHaveBeenCalled()
    expect(mocks.checkFeatureQuotaIdempotent).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "advanced-generation-monthly",
      3,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    )
  })

  it("applies a server-side burst limit before expensive generation", async () => {
    mocks.checkBurstLimit.mockResolvedValue({
      allowed: false,
      used: 6,
      resetAt: "2026-07-14T12:01:00.000Z",
      unavailable: false,
    })

    const response = await POST(request({ keyword: "AI scheduling for field teams" }))

    expect(response.status).toBe(429)
    expect(mocks.generateCandidatePool).not.toHaveBeenCalled()
    expect(mocks.generateGroqQuickCandidates).not.toHaveBeenCalled()
    expect(mocks.getFeatureQuotaState).not.toHaveBeenCalled()
  })

  it("uses the dedicated Advanced allowance error without running generation", async () => {
    mocks.getFeatureQuotaState.mockResolvedValue({
      allowed: false,
      isPro: false,
      userId: null,
      plan: "free",
      used: 3,
      limit: 3,
      remaining: 0,
      resetAt: "2026-08-01T00:00:00.000Z",
      statusCode: 429,
    })

    const response = await POST(request({ keyword: "Accounting for freelancers", generatorV2: true }))
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload).toMatchObject({
      error: "advanced_generation_monthly_limit_reached",
      tokensUsed: 3,
      tokensTotal: 3,
      remaining: 0,
      upgradeUrl: "/pricing",
    })
    expect(mocks.generateCandidatePool).not.toHaveBeenCalled()
    expect(mocks.generateGroqQuickCandidates).not.toHaveBeenCalled()
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
  })

  it("does not consume an allowance when the provider batch was not editorially reviewed", async () => {
    mocks.generateGroqQuickCandidates.mockResolvedValue(modelBackedGeneration({
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
    }))

    const response = await POST(request({ keyword: "Unusually constrained category", generatorV2: true }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      error: "advanced_generation_temporarily_limited",
      retryable: true,
      generationMeta: {
        modelBacked: true,
        model: "gpt-4.1-mini",
        editoriallyReviewed: false,
        editorialCandidateCount: 0,
        requestedCount: 12,
        resultCount: 0,
        isPartial: true,
        qualityState: "degraded",
      },
      quality: {
        modelCandidateCount: 16,
        fallbackCandidateCount: 0,
        groundedCandidateCount: 4,
        exploratoryCandidateCount: 12,
      },
    })
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
    expect(mocks.issueToken).not.toHaveBeenCalled()
  })

  it.each([
    {
      label: "editorial candidate count does not cover the full model batch",
      overrides: { editorialCandidateCount: 15 },
    },
    {
      label: "model and tier accounting disagree with the returned candidates",
      overrides: {
        modelCandidateCount: 15,
        modelGroundedCandidateCount: 4,
        groundedCandidateCount: 5,
        exploratoryCandidateCount: 11,
      },
    },
  ])("rejects malformed provider provenance when $label without consuming allowance", async ({ overrides }) => {
    mocks.generateGroqQuickCandidates.mockResolvedValue(modelBackedGeneration(overrides))

    const response = await POST(request({ keyword: "Unusually constrained category", generatorV2: true }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      error: "advanced_generation_temporarily_limited",
      retryable: true,
      generationMeta: {
        requestedCount: 12,
        resultCount: 0,
        isPartial: true,
        qualityState: "degraded",
      },
    })
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
    expect(mocks.issueToken).not.toHaveBeenCalled()
  })

  it("clamps an Advanced max length below the supported range to six", async () => {
    const shortNames = [
      "alvio", "brena", "corvi", "delma", "evren", "ferro", "gleno", "helvi",
      "ivora", "jovia", "kelro", "lumet", "morvi", "nexel", "orvia", "pelro",
    ]
    mocks.generateGroqQuickCandidates.mockResolvedValue(modelBackedGeneration({
      candidates: providerCandidates(shortNames),
    }))

    const response = await POST(request({ keyword: "AI scheduling for field teams", maxLength: 1 }))

    expect(response.status).toBe(200)
    expect(mocks.generateGroqQuickCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ maxChars: 6, count: 16 }),
      expect.any(AbortSignal),
    )
  })

  it("does not consume an Advanced allowance after the client cancels", async () => {
    const controller = new AbortController()
    controller.abort()

    const response = await POST(request({ keyword: "Privacy software for small clinics" }, controller.signal))

    expect(response.status).toBe(499)
    expect(mocks.checkFeatureQuotaIdempotent).not.toHaveBeenCalled()
  })

  it("replays immutable candidates and allowance while refreshing the short availability continuation", async () => {
    mocks.getFeatureQuotaReplayState
      .mockResolvedValueOnce({ replayed: false, unavailable: false })
      .mockResolvedValueOnce({ replayed: true, unavailable: false })
    mocks.getFeatureQuotaState
      .mockResolvedValueOnce({
        allowed: true,
        isPro: false,
        userId: null,
        plan: "free",
        used: 0,
        limit: 3,
        remaining: 3,
        resetAt: "2026-08-01T00:00:00.000Z",
        statusCode: 200,
      })
      .mockResolvedValueOnce({
        allowed: false,
        isPro: false,
        userId: null,
        plan: "free",
        used: 3,
        limit: 3,
        remaining: 0,
        resetAt: "2026-08-01T00:00:00.000Z",
        statusCode: 429,
      })
    mocks.checkFeatureQuotaIdempotent
      .mockResolvedValueOnce({
        allowed: true,
        replayed: false,
        receiptCreatedAt: RECEIPT_CREATED_AT,
        isPro: false,
        userId: null,
        plan: "free",
        used: 1,
        limit: 3,
        remaining: 2,
        resetAt: "2026-08-01T00:00:00.000Z",
        statusCode: 200,
      })
      .mockResolvedValueOnce({
        allowed: true,
        replayed: true,
        receiptCreatedAt: RECEIPT_CREATED_AT,
        isPro: false,
        userId: null,
        plan: "free",
        used: 1,
        limit: 3,
        remaining: 2,
        resetAt: "2026-08-01T00:00:00.000Z",
        statusCode: 200,
      })

    const firstResponse = await POST(request({ keyword: "Privacy software for small clinics" }))
    const firstPayload = await firstResponse.json()
    const replayResponse = await POST(request({ keyword: "Privacy software for small clinics" }))
    const replayPayload = await replayResponse.json()

    expect(firstResponse.status).toBe(200)
    expect(replayResponse.status).toBe(200)
    const { availabilityToken: firstAvailabilityToken, ...firstStablePayload } = firstPayload
    const { availabilityToken: replayAvailabilityToken, ...replayStablePayload } = replayPayload
    expect(replayStablePayload).toEqual(firstStablePayload)
    expect(firstAvailabilityToken).toMatch(/^signed:availability:/)
    expect(replayAvailabilityToken).toMatch(/^signed:availability:/)
    expect(mocks.checkFeatureQuotaIdempotent).toHaveBeenCalledTimes(2)
    expect(mocks.trackMetric).toHaveBeenCalledTimes(1)
    expect(mocks.logGeneration).toHaveBeenCalledTimes(1)
  })

  it("binds an idempotency marker to the normalized request, not only the client request id", async () => {
    const first = await POST(request({ keyword: "Privacy software for small clinics" }))
    const firstReplayKey = mocks.getFeatureQuotaReplayState.mock.calls[0]?.[2]
    const firstConsumeKey = mocks.checkFeatureQuotaIdempotent.mock.calls[0]?.[3]

    const changed = await POST(request({ keyword: "Finance software for small clinics" }))
    const changedReplayKey = mocks.getFeatureQuotaReplayState.mock.calls[1]?.[2]
    const changedConsumeKey = mocks.checkFeatureQuotaIdempotent.mock.calls[1]?.[3]

    expect(first.status).toBe(200)
    expect(changed.status).toBe(200)
    expect(firstReplayKey).toMatch(/^[a-f0-9]{64}$/)
    expect(firstConsumeKey).toBe(firstReplayKey)
    expect(changedReplayKey).toMatch(/^[a-f0-9]{64}$/)
    expect(changedConsumeKey).toBe(changedReplayKey)
    expect(changedReplayKey).not.toBe(firstReplayKey)
  })

  it("treats a changed brief under the same client request id as a new, blockable allowance", async () => {
    mocks.getFeatureQuotaState
      .mockResolvedValueOnce({
        allowed: true,
        isPro: false,
        userId: null,
        plan: "free",
        used: 2,
        limit: 3,
        remaining: 1,
        resetAt: "2026-08-01T00:00:00.000Z",
        statusCode: 200,
      })
      .mockResolvedValueOnce({
        allowed: false,
        isPro: false,
        userId: null,
        plan: "free",
        used: 3,
        limit: 3,
        remaining: 0,
        resetAt: "2026-08-01T00:00:00.000Z",
        statusCode: 429,
      })

    const first = await POST(request({ keyword: "Privacy software for small clinics" }))
    const firstReplayKey = mocks.getFeatureQuotaReplayState.mock.calls[0]?.[2]
    const changed = await POST(request({ keyword: "Finance software for small clinics" }))
    const changedPayload = await changed.json()
    const changedReplayKey = mocks.getFeatureQuotaReplayState.mock.calls[1]?.[2]

    expect(first.status).toBe(200)
    expect(changed.status).toBe(429)
    expect(changedPayload.error).toBe("advanced_generation_monthly_limit_reached")
    expect(changedReplayKey).not.toBe(firstReplayKey)
    expect(mocks.checkFeatureQuotaIdempotent).toHaveBeenCalledTimes(1)
  })

  it("returns the same immutable batch to both concurrent callers", async () => {
    mocks.checkFeatureQuotaIdempotent
      .mockResolvedValueOnce({
        allowed: true,
        replayed: false,
        receiptCreatedAt: RECEIPT_CREATED_AT,
        isPro: false,
        userId: null,
        plan: "free",
        used: 1,
        limit: 3,
        remaining: 2,
        resetAt: "2026-08-01T00:00:00.000Z",
        statusCode: 200,
      })
      .mockResolvedValueOnce({
        allowed: true,
        replayed: true,
        receiptCreatedAt: RECEIPT_CREATED_AT,
        isPro: false,
        userId: null,
        plan: "free",
        used: 1,
        limit: 3,
        remaining: 2,
        resetAt: "2026-08-01T00:00:00.000Z",
        statusCode: 200,
      })

    const [firstResponse, loserResponse] = await Promise.all([
      POST(request({ keyword: "Privacy software for small clinics" })),
      POST(request({ keyword: "Privacy software for small clinics" })),
    ])
    const [firstPayload, loserPayload] = await Promise.all([firstResponse.json(), loserResponse.json()])

    expect(firstResponse.status).toBe(200)
    expect(loserResponse.status).toBe(200)
    const { availabilityToken: firstAvailabilityToken, ...firstStablePayload } = firstPayload
    const { availabilityToken: loserAvailabilityToken, ...loserStablePayload } = loserPayload
    expect(loserStablePayload).toEqual(firstStablePayload)
    expect(firstAvailabilityToken).toMatch(/^signed:availability:/)
    expect(loserAvailabilityToken).toMatch(/^signed:availability:/)
    expect(mocks.trackMetric).toHaveBeenCalledTimes(1)
    expect(mocks.logGeneration).toHaveBeenCalledTimes(1)
  })
})
