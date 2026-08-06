import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { QUICK_GENERATE_STYLES } from "@/lib/domainGen/quickGenerate"

const mocks = vi.hoisted(() => ({
  checkQuickBurstLimit: vi.fn(),
  checkRateLimit: vi.fn(),
  getQuickEntitlementState: vi.fn(),
  checkAvailabilityBatch: vi.fn(),
  generate: vi.fn(),
  founderScore: vi.fn(),
  trackMetric: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkQuickBurstLimit: mocks.checkQuickBurstLimit,
  checkRateLimit: mocks.checkRateLimit,
  getQuickEntitlementState: mocks.getQuickEntitlementState,
}))
vi.mock("@/lib/domainGen/availability", () => ({ checkAvailabilityBatch: mocks.checkAvailabilityBatch }))
vi.mock("@/lib/domainGen/quickGenerateGroq", () => ({ generateGroqQuickCandidates: mocks.generate }))
vi.mock("@/lib/founderSignal/scoreName", () => ({ scoreName: mocks.founderScore }))
vi.mock("@/lib/metrics", () => ({ trackMetric: mocks.trackMetric }))

import { POST } from "@/app/api/quick-generate/route"

const originalFeatureFlag = process.env.GENERATOR_REDESIGN_V2
const originalWorkflowSecret = process.env.GENERATION_WORKFLOW_SECRET
const originalEmergencyHold = process.env.QUICK_GENERATE_EMERGENCY_HOLD

function request(body: unknown) {
  return new NextRequest("http://localhost/api/quick-generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.checkQuickBurstLimit.mockResolvedValue({ allowed: true, resetAt: null, unavailable: false })
  mocks.checkRateLimit.mockResolvedValue({ allowed: true, isPro: false, userId: null })
  mocks.getQuickEntitlementState.mockResolvedValue({ isPro: false, userId: null, plan: "free" })
  mocks.generate.mockResolvedValue({
    candidates: [
      { name: "timepilot", personality: "Timepilot uses a time cue and a guidance metaphor for founders who need a calmer scheduling workflow.", style: "compound" },
      { name: "slotwise", personality: "Slotwise pairs a scheduling cue with good judgement for busy teams choosing meeting times.", style: "brandable" },
      ...Array.from({ length: 6 }, (_, index) => ({
        name: `ranked${String.fromCharCode(97 + index)}a`,
        personality: `Ranked candidate ${index + 3} for a scheduling workflow.`,
        style: "brandable",
      })),
    ],
    provider: "groq",
    usedGroq: true,
    modelBacked: true,
    modelCandidateCount: 8,
    fallbackCandidateCount: 0,
    editoriallyReviewed: false,
    editorialCandidateCount: 0,
  })
  mocks.checkAvailabilityBatch.mockResolvedValue([])
  mocks.founderScore.mockImplementation(() => {
    throw new Error("Founder Signal must not run during Quick admission")
  })
  delete process.env.GENERATOR_REDESIGN_V2
  delete process.env.QUICK_GENERATE_EMERGENCY_HOLD
  process.env.GENERATION_WORKFLOW_SECRET = "quick-route-test-secret"
})

afterEach(() => {
  if (originalFeatureFlag === undefined) delete process.env.GENERATOR_REDESIGN_V2
  else process.env.GENERATOR_REDESIGN_V2 = originalFeatureFlag
  if (originalEmergencyHold === undefined) delete process.env.QUICK_GENERATE_EMERGENCY_HOLD
  else process.env.QUICK_GENERATE_EMERGENCY_HOLD = originalEmergencyHold
  if (originalWorkflowSecret === undefined) delete process.env.GENERATION_WORKFLOW_SECRET
  else process.env.GENERATION_WORKFLOW_SECRET = originalWorkflowSecret
})

describe("POST /api/quick-generate", () => {
  it("validates the brief before consuming monthly usage", async () => {
    const response = await POST(request({ description: " " }))
    expect(response.status).toBe(400)
    expect(mocks.checkQuickBurstLimit).not.toHaveBeenCalled()
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
  })

  it("fails closed before provider, quota, scoring or domain work for every Quick style when the emergency hold is enabled", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    process.env.QUICK_GENERATE_EMERGENCY_HOLD = "true"

    for (const style of QUICK_GENERATE_STYLES) {
      const response = await POST(request({
        description: "A modern accounting platform for independent freelancers",
        style,
      }))
      const payload = await response.json()

      expect(response.status).toBe(503)
      expect(payload).toMatchObject({
        error: "quick_generation_quality_hold",
        retryable: true,
        generationMeta: {
          requestedCount: 16,
          resultCount: 0,
          isPartial: true,
          qualityState: "temporarily_paused",
        },
      })
    }
    expect(mocks.checkQuickBurstLimit).not.toHaveBeenCalled()
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(mocks.getQuickEntitlementState).not.toHaveBeenCalled()
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.founderScore).not.toHaveBeenCalled()
  })

  it("preserves quality rank, exposes entitlement, and keeps unknown availability explicit", async () => {
    const response = await POST(request({ description: "AI scheduling for founders", vibe: "tech", style: "brandable", count: 8 }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.isPro).toBe(false)
    expect(payload.quality).toEqual({
      modelCandidateCount: 8,
      fallbackCandidateCount: 0,
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
    })
    expect(payload.results[0].name).toBe("timepilot")
    expect(payload.results[0].checkStatus).toBe("needs_verification")
    expect(payload.results.findIndex((item: { name: string }) => item.name === "slotwise")).toBeGreaterThan(0)
  })

  it("returns 16 candidate-first names without monthly metering or blocking on availability in v2", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 16 }, (_, index) => ({
        name: `signal${String.fromCharCode(97 + index)}a`,
        personality: `Signal direction ${index + 1} connects a clear scheduling metaphor to founders who need calmer coordination and dependable next steps.`,
        style: ["brandable", "evocative", "compound", "real_word"][index % 4],
      })),
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 16,
      modelGroundedCandidateCount: 0,
      fallbackCandidateCount: 0,
      fallbackGroundedCandidateCount: 0,
      groundedCandidateCount: 0,
      exploratoryCandidateCount: 16,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
    })

    const response = await POST(request({
      description: "AI scheduling for founders",
      vibe: "tech",
      style: "auto",
      creativity: "exploratory",
      blacklist: ["calendar"],
      preferences: { likedStyles: ["evocative"], avoidedSounds: ["bot"] },
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.state).toBe("names_ready")
    expect(payload.availabilityState).toBe("checking_domains")
    expect(payload.candidates).toHaveLength(16)
    expect(payload.candidates[0]).toMatchObject({
      id: expect.stringMatching(/^name_/),
      generationRank: 1,
      founderSignal: null,
      availability: { com: { status: "checking", available: null } },
    })
    expect(payload.results).toBeUndefined()
    expect(payload.availabilityToken).toEqual(expect.any(String))
    expect(payload.workflowToken).toBe(payload.availabilityToken)
    expect(payload.generationMeta).toMatchObject({
      requestedCount: 16,
      resultCount: 16,
      isPartial: false,
      styleShortfallReason: null,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
    })
    expect(payload.quality).toEqual({
      modelCandidateCount: 16,
      modelGroundedCandidateCount: 0,
      fallbackCandidateCount: 0,
      fallbackGroundedCandidateCount: 0,
      groundedCandidateCount: 0,
      exploratoryCandidateCount: 16,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
    })
    expect(mocks.getQuickEntitlementState).toHaveBeenCalledWith(expect.any(NextRequest))
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.founderScore).not.toHaveBeenCalled()
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 16,
        style: "auto",
        creativity: "exploratory",
        blacklist: ["calendar"],
        preferences: expect.objectContaining({ likedStyles: ["evocative"], avoidedSounds: ["bot"] }),
      }),
      expect.any(AbortSignal),
    )
  })

  it("clamps a Non-English max length to twelve before provider generation", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: ["soinvillage", "liensante", "santefamille", "accesrural", "santeproche"].map((name, index) => ({
        name,
        personality: `Reviewed French (Quebec) direction ${index + 1}.`,
        style: "non_english",
      })),
      provider: "groq",
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 5,
      fallbackCandidateCount: 0,
      styleFulfilled: false,
      styleShortfallReason: "Only 5 safe non-English names met this brief; other styles were not substituted.",
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
    })

    const response = await POST(request({
      description: "French healthcare access for rural Quebec families",
      style: "non_english",
      maxChars: 6,
    }))

    expect(response.status).toBe(200)
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({ style: "non_english", maxChars: 12, count: 16 }),
      expect.any(AbortSignal),
    )
  })

  it("fails closed when an Auto batch omits its local quality accounting", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 16 }, (_, index) => ({
        name: `uncounted${String.fromCharCode(97 + index)}a`,
        personality: `Candidate ${index + 1}.`,
        style: "brandable",
      })),
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
    })

    const response = await POST(request({ description: "AI scheduling for founders", style: "auto" }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.candidates).toBeUndefined()
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.trackMetric).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        qualityRejectionReasons: expect.arrayContaining([
          "quality_diagnostics_missing",
          "editorial_review_unconfirmed",
        ]),
      }),
    }))
  })

  it("fails closed when an Auto batch reports inconsistent quality accounting", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 16 }, (_, index) => ({
        name: `miscounted${String.fromCharCode(97 + index)}a`,
        personality: `Candidate ${index + 1}.`,
        style: "brandable",
      })),
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 16,
      modelGroundedCandidateCount: 14,
      fallbackCandidateCount: 0,
      fallbackGroundedCandidateCount: 0,
      groundedCandidateCount: 15,
      exploratoryCandidateCount: 1,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
    })

    const response = await POST(request({ description: "AI scheduling for founders", style: "auto" }))

    expect(response.status).toBe(503)
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.trackMetric).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        qualityRejectionReasons: expect.arrayContaining(["quality_accounting_inconsistent"]),
      }),
    }))
  })

  it("rejects an incomplete Auto batch as a clear retryable response without publishing names", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    const unique = Array.from({ length: 15 }, (_, index) => ({
      name: `autoname${String.fromCharCode(97 + index)}`,
      personality: `Reviewed Auto rationale ${index + 1}.`,
      style: "brandable",
    }))
    mocks.generate.mockResolvedValue({
      candidates: [...unique, { ...unique[0] }],
      usedGroq: false,
      modelCandidateCount: 0,
      fallbackCandidateCount: 16,
      styleFulfilled: false,
      styleShortfallReason: "Only 15 unique safe candidates were available.",
    })

    const response = await POST(request({ description: "A scheduling product", style: "auto" }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      error: "quick_generation_incomplete",
      retryable: true,
      message: expect.stringContaining("full 16-name batch"),
      generationMeta: { requestedCount: 16, resultCount: 15, isPartial: true },
    })
    expect(payload.candidates).toBeUndefined()
    expect(payload.availabilityToken).toBeUndefined()
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.founderScore).not.toHaveBeenCalled()
  })

  it("does not publish a normal-looking Auto page when provider quality is degraded", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 16 }, (_, index) => ({
        name: `fallback${String.fromCharCode(97 + index)}a`,
        personality: `Deterministic fallback rationale ${index + 1}.`,
        style: "evocative",
      })),
      usedGroq: false,
      usedOpenAI: false,
      modelBacked: false,
      provider: "deterministic",
      modelCandidateCount: 0,
      fallbackCandidateCount: 16,
      fallbackReason: "openai_invalid_api_key",
    })

    const response = await POST(request({ description: "A scheduling product", style: "auto" }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      error: "quick_generation_temporarily_limited",
      retryable: true,
      message: expect.stringContaining("High-quality generation is temporarily unavailable"),
      generationMeta: {
        requestedCount: 16,
        resultCount: 0,
        isPartial: true,
        qualityState: "degraded",
      },
    })
    expect(payload.candidates).toBeUndefined()
    expect(payload.availabilityToken).toBeUndefined()
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.founderScore).not.toHaveBeenCalled()
    expect(mocks.trackMetric).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        rejectedAutoQualityBatch: true,
        qualityRejectionReasons: expect.arrayContaining(["model_authorship_unconfirmed", "deterministic_fallback_detected"]),
      }),
    }))
  })

  it("rejects an Auto batch with fewer than sixteen model-authored candidates even when all names are unique", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 16 }, (_, index) => ({
        name: `modelshort${String.fromCharCode(97 + index)}`,
        personality: `Candidate ${index + 1}.`,
        style: "brandable",
      })),
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 15,
      modelGroundedCandidateCount: 15,
      fallbackCandidateCount: 1,
      fallbackGroundedCandidateCount: 0,
      groundedCandidateCount: 15,
      exploratoryCandidateCount: 1,
      editoriallyReviewed: true,
      editorialCandidateCount: 15,
    })

    const response = await POST(request({ description: "A scheduling product", style: "auto" }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      error: "quick_generation_temporarily_limited",
      retryable: true,
      generationMeta: { requestedCount: 16, resultCount: 0, qualityState: "degraded" },
    })
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.trackMetric).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        qualityRejectionReasons: expect.arrayContaining(["insufficient_model_candidates"]),
        uniqueCandidateCount: 16,
        modelCandidateCount: 15,
        fallbackCandidateCount: 1,
      }),
    }))
  })

  it("rejects an unedited 16-model Auto draft even when every name is otherwise publishable", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 16 }, (_, index) => ({
        name: `unedited${String.fromCharCode(97 + index)}a`,
        personality: `Candidate ${index + 1}.`,
        style: "brandable",
      })),
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 16,
      modelGroundedCandidateCount: 0,
      fallbackCandidateCount: 0,
      fallbackGroundedCandidateCount: 0,
      groundedCandidateCount: 0,
      exploratoryCandidateCount: 16,
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
    })

    const response = await POST(request({ description: "A scheduling product", style: "auto" }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      error: "quick_generation_temporarily_limited",
      retryable: true,
      generationMeta: { requestedCount: 16, resultCount: 0, qualityState: "degraded" },
    })
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.trackMetric).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        qualityRejectionReasons: expect.arrayContaining(["editorial_review_unconfirmed"]),
        editoriallyReviewed: false,
        editorialCandidateCount: 0,
      }),
    }))
  })

  it("rejects an Auto batch containing deterministic fallback names even when the model count is otherwise sufficient", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 16 }, (_, index) => ({
        name: `mixedbatch${String.fromCharCode(97 + index)}`,
        personality: `Candidate ${index + 1}.`,
        style: "brandable",
      })),
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 15,
      modelGroundedCandidateCount: 15,
      fallbackCandidateCount: 1,
      fallbackGroundedCandidateCount: 0,
      groundedCandidateCount: 15,
      exploratoryCandidateCount: 1,
    })

    const response = await POST(request({ description: "A scheduling product", style: "auto" }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.error).toBe("quick_generation_temporarily_limited")
    expect(payload.retryable).toBe(true)
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.trackMetric).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        qualityRejectionReasons: expect.arrayContaining(["deterministic_fallback_detected"]),
        fallbackCandidateCount: 1,
      }),
    }))
  })

  it("publishes an eight-model explicit-style shortfall with an honest generationMeta notice", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 8 }, (_, index) => ({
        name: `brandname${String.fromCharCode(97 + index)}`,
        personality: `Reviewed Brandable rationale ${index + 1}.`,
        style: "brandable",
      })),
      provider: "groq",
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 8,
      fallbackCandidateCount: 0,
      styleFulfilled: false,
      styleShortfallReason: "Only 8 safe Brandable names met this brief; other styles were not substituted.",
    })

    const response = await POST(request({ description: "A scheduling product", style: "brandable" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.candidates).toHaveLength(8)
    expect(payload.generationMeta).toMatchObject({
      requestedCount: 16,
      resultCount: 8,
      isPartial: true,
      styleFulfilled: false,
      styleShortfallReason: "Only 8 safe Brandable names met this brief; other styles were not substituted.",
    })
    expect(payload.candidates.every((candidate: { founderSignal: unknown }) => candidate.founderSignal === null)).toBe(true)
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.founderScore).not.toHaveBeenCalled()
  })

  it("rejects deterministic explicit-style output even when it contains eight names", async () => {
    process.env.GENERATOR_REDESIGN_V2 = "true"
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 8 }, (_, index) => ({
        name: `reserve${String.fromCharCode(97 + index)}a`,
        personality: `Deterministic reserve ${index + 1}.`,
        style: "brandable",
      })),
      provider: "deterministic",
      usedGroq: false,
      usedOpenAI: false,
      modelBacked: false,
      modelCandidateCount: 0,
      fallbackCandidateCount: 8,
    })

    const response = await POST(request({ description: "A scheduling product", style: "brandable" }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({
      error: "quick_generation_temporarily_limited",
      retryable: true,
      generationMeta: { requestedCount: 16, resultCount: 0, qualityState: "degraded" },
    })
    expect(payload.candidates).toBeUndefined()
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.trackMetric).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ rejectedExplicitQualityBatch: true, resultCount: 0 }),
    }))
  })

  it("protects Auto users on the legacy path before any synchronous domain check", async () => {
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 16 }, (_, index) => ({
        name: `legacymixed${String.fromCharCode(97 + index)}`,
        personality: `Candidate ${index + 1}.`,
        style: "brandable",
      })),
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 15,
      fallbackCandidateCount: 1,
    })

    const response = await POST(request({ description: "AI scheduling for founders", count: 2 }))
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({ error: "quick_generation_temporarily_limited", retryable: true })
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ count: 16, style: "auto" }), expect.any(AbortSignal))
    expect(mocks.checkAvailabilityBatch).not.toHaveBeenCalled()
    expect(mocks.trackMetric).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ contract: "legacy", rejectedAutoQualityBatch: true }),
    }))
  })

  it("keeps the legacy synchronous response shape for a protected Auto batch when the feature flag is disabled", async () => {
    mocks.generate.mockResolvedValue({
      candidates: Array.from({ length: 16 }, (_, index) => ({
        name: `legacyready${String.fromCharCode(97 + index)}`,
        personality: `Candidate ${index + 1}.`,
        style: "brandable",
      })),
      usedGroq: true,
      modelBacked: true,
      modelCandidateCount: 16,
      modelGroundedCandidateCount: 14,
      fallbackCandidateCount: 0,
      fallbackGroundedCandidateCount: 0,
      groundedCandidateCount: 14,
      exploratoryCandidateCount: 2,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
    })

    const response = await POST(request({ description: "AI scheduling for founders", count: 2 }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.candidates).toBeUndefined()
    expect(payload.state).toBeUndefined()
    expect(mocks.getQuickEntitlementState).toHaveBeenCalledWith(expect.any(NextRequest))
    expect(mocks.checkRateLimit).not.toHaveBeenCalled()
    expect(mocks.checkAvailabilityBatch).toHaveBeenCalledOnce()
  })
})
