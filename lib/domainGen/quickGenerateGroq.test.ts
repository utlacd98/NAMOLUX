import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { generateGroqQuickCandidates, resetGroqQuickCooldownsForTests } from "@/lib/domainGen/quickGenerateGroq"
import { generateQuickEditorialWorkshop } from "@/lib/domainGen/quickGenerate"

const originalGroqKey = process.env.GROQ_API_KEY
const originalOpenAiKey = process.env.OPENAI_API_KEY
const originalGatewayKey = process.env.AI_GATEWAY_API_KEY
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN
const originalGroqQuickModel = process.env.GROQ_QUICK_MODEL
const originalGroqQuickModels = process.env.GROQ_QUICK_MODELS
const originalGroqQuickEditorModel = process.env.GROQ_QUICK_EDITOR_MODEL
const originalOpenAiQuickModel = process.env.OPENAI_QUICK_MODEL
const originalOpenAiQuickReasoningEffort = process.env.OPENAI_QUICK_REASONING_EFFORT
const originalQuickGeneratePrimaryProvider = process.env.QUICK_GENERATE_PRIMARY_PROVIDER
const originalQuickGeneratePrimaryOnly = process.env.QUICK_GENERATE_PRIMARY_ONLY

const COMPLETE_SCHEDULING_AUTO_NAMES = [
  "timepilot",
  "slotbloom",
  "tempocrest",
  "meethaven",
  "logicbeam",
  "mindharbor",
  "signalgrove",
  "cadenceway",
  "interval",
  "punctual",
  "sequence",
  "mosaic",
  "lantern",
  "compass",
  "headroom",
  "horizon",
  "foundercore",
  "diary",
  "planner",
  "appointment",
  "timekeeper",
  "chronology",
  "timetable",
  "calendar",
  "agenda",
  "orbit",
  "relay",
  "loom",
  "prism",
  "canopy",
  "sundial",
  "waypoint",
] as const

const COMPLETE_BUDGETING_AUTO_NAMES = [
  "nestflow",
  "homeplan",
  "fundio",
  "prudence",
  "allowance",
  "reserve",
  "margin",
  "thrift",
  "provision",
  "steward",
  "headroom",
  "pocketplan",
  "familyfund",
  "homebuffer",
  "helpbudget",
  "familycraft",
  "simplefamily",
  "steadyhelp",
  "simplestock",
  "hearth",
  "anchor",
  "quilt",
  "bridge",
  "harbor",
  "shelter",
  "canopy",
  "keystone",
  "orchard",
  "lantern",
  "meadow",
  "ripple",
  "sunward",
] as const

function successfulNamesResponse(names: readonly string[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ names }) } }],
    }),
  }
}

type EditorialSelectorPrompt = {
  task: string
  approvedDraftNames: string[]
  locallyPublishableCoreNames: string[]
  previouslyReviewedNames: string[]
  rules: string[]
}

function readEditorialSelectorPrompt(
  body: Record<string, unknown>,
): EditorialSelectorPrompt & { selectionTarget: number } {
  const prompt = JSON.parse(
    ((body.messages as Array<{ content: string }>)[1]?.content || "{}"),
  ) as EditorialSelectorPrompt & { draftNames?: string[] }

  expect(prompt).not.toHaveProperty("draftNames")
  expect(prompt.approvedDraftNames.length).toBeGreaterThanOrEqual(24)
  expect(prompt.approvedDraftNames.length).toBeLessThanOrEqual(32)
  expect(new Set(prompt.approvedDraftNames).size).toBe(prompt.approvedDraftNames.length)
  const selectionTarget = Math.min(prompt.approvedDraftNames.length - 4, 24)
  expect(prompt.approvedDraftNames.length - selectionTarget).toBeGreaterThanOrEqual(4)
  if (prompt.approvedDraftNames.length === 32) expect(selectionTarget).toBe(24)
  expect(prompt.task).toContain(`Select exactly ${selectionTarget} approved drafts`)
  expect(prompt.rules).toEqual(expect.arrayContaining([
    expect.stringContaining(`Choose exactly ${selectionTarget} different names`),
    "Every returned string must exactly match one approvedDraftNames value.",
  ]))
  return { ...prompt, selectionTarget }
}

beforeEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.AI_GATEWAY_API_KEY
  delete process.env.VERCEL_OIDC_TOKEN
  delete process.env.GROQ_QUICK_MODEL
  delete process.env.GROQ_QUICK_MODELS
  delete process.env.GROQ_QUICK_EDITOR_MODEL
  delete process.env.OPENAI_QUICK_MODEL
  delete process.env.OPENAI_QUICK_REASONING_EFFORT
  delete process.env.QUICK_GENERATE_PRIMARY_PROVIDER
  delete process.env.QUICK_GENERATE_PRIMARY_ONLY
})

afterEach(() => {
  resetGroqQuickCooldownsForTests()
  if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY
  else process.env.GROQ_API_KEY = originalGroqKey
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalOpenAiKey
  if (originalGatewayKey === undefined) delete process.env.AI_GATEWAY_API_KEY
  else process.env.AI_GATEWAY_API_KEY = originalGatewayKey
  if (originalOidcToken === undefined) delete process.env.VERCEL_OIDC_TOKEN
  else process.env.VERCEL_OIDC_TOKEN = originalOidcToken
  if (originalGroqQuickModel === undefined) delete process.env.GROQ_QUICK_MODEL
  else process.env.GROQ_QUICK_MODEL = originalGroqQuickModel
  if (originalGroqQuickModels === undefined) delete process.env.GROQ_QUICK_MODELS
  else process.env.GROQ_QUICK_MODELS = originalGroqQuickModels
  if (originalGroqQuickEditorModel === undefined) delete process.env.GROQ_QUICK_EDITOR_MODEL
  else process.env.GROQ_QUICK_EDITOR_MODEL = originalGroqQuickEditorModel
  if (originalOpenAiQuickModel === undefined) delete process.env.OPENAI_QUICK_MODEL
  else process.env.OPENAI_QUICK_MODEL = originalOpenAiQuickModel
  if (originalOpenAiQuickReasoningEffort === undefined) delete process.env.OPENAI_QUICK_REASONING_EFFORT
  else process.env.OPENAI_QUICK_REASONING_EFFORT = originalOpenAiQuickReasoningEffort
  if (originalQuickGeneratePrimaryProvider === undefined) delete process.env.QUICK_GENERATE_PRIMARY_PROVIDER
  else process.env.QUICK_GENERATE_PRIMARY_PROVIDER = originalQuickGeneratePrimaryProvider
  if (originalQuickGeneratePrimaryOnly === undefined) delete process.env.QUICK_GENERATE_PRIMARY_ONLY
  else process.env.QUICK_GENERATE_PRIMARY_ONLY = originalQuickGeneratePrimaryOnly
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function mockGroqNames(names: string[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ names }),
            },
          },
        ],
      }),
    })),
  )
}

type AutoCandidateFixture = {
  name: string
  territoryId: "core_job" | "audience_world" | "desired_outcome" | "distinctive_metaphor"
  mechanism: "visible_compound" | "semantic_word" | "abstract_sound" | "locale_form"
  evidenceParts: string[]
}

/**
 * Auto has used the v4 candidate-record contract since the live quality gate
 * shipped. Keep success-path fixtures honest: a legacy `{ names }` payload is
 * intentionally rejected in Auto and belongs only in rejection-path tests.
 */
function autoCandidate(
  name: string,
  mechanism: AutoCandidateFixture["mechanism"] = "abstract_sound",
  evidenceParts: string[] = [],
  territoryId: AutoCandidateFixture["territoryId"] = "core_job",
): AutoCandidateFixture {
  return { name, territoryId, mechanism, evidenceParts }
}

function mockGroqAutoCandidates(candidates: Array<AutoCandidateFixture | { name: string }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ candidates }) } }],
      }),
    })),
  )
}

describe("generateGroqQuickCandidates", () => {
  it("uses Groq JSON Object Mode for Qwen and marks a complete unedited Auto draft as unreviewed", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body).toMatchObject({
        model: "qwen/qwen3.6-27b",
        response_format: { type: "json_object" },
        reasoning_effort: "none",
        include_reasoning: false,
      })
      expect(body.response_format).not.toHaveProperty("json_schema")
      return successfulNamesResponse(COMPLETE_SCHEDULING_AUTO_NAMES)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", model: "qwen/qwen3.6-27b", outcome: "ready" }),
    ])
    expect(result).toMatchObject({
      provider: "groq",
      model: "qwen/qwen3.6-27b",
      modelBacked: true,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
    })
    expect(result.candidates).toHaveLength(16)
    expect(new Set(result.candidates.map((candidate) => candidate.name)).size).toBe(16)
  })

  it("publishes one GPT-OSS selection from a meaningful private deterministic workshop", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const requestBodies: Array<Record<string, unknown>> = []
    let privateDraftNames: string[] = []
    let selectedNames: string[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requestBodies.push(body)
      const editorialPrompt = readEditorialSelectorPrompt(body)
      privateDraftNames = editorialPrompt.approvedDraftNames
      selectedNames = privateDraftNames.slice(0, editorialPrompt.selectionTarget)
      return successfulNamesResponse(selectedNames)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "editorial-replacement",
      requireEditorialReview: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requestBodies[0]?.model).toBe("openai/gpt-oss-120b")
    expect(JSON.stringify(requestBodies[0]?.messages)).toContain("final naming editor")
    expect(JSON.stringify(requestBodies[0]?.messages)).not.toContain("senior naming director")
    expect(privateDraftNames).toHaveLength(32)
    expect(selectedNames).toHaveLength(24)
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        model: "openai/gpt-oss-120b",
        stage: "editorial",
        outcome: "ready",
        parsedCandidateCount: 24,
        admittedCandidateCount: 24,
        selectionPoolCandidateCount: privateDraftNames.length,
      }),
    ])
    expect(result.candidates).toHaveLength(16)
    expect(result.candidates.every(({ name }) => selectedNames.includes(name))).toBe(true)
    expect(result.modelCandidateCount).toBe(16)
    expect(result.fallbackCandidateCount).toBe(0)
    expect(result.editoriallyReviewed).toBe(true)
    expect(result.editorialCandidateCount).toBe(16)
    expect(result.modelGroundedCandidateCount + result.exploratoryCandidateCount).toBe(result.candidates.length)
  })

  it("does not publish creative-audience contamination from the bookkeeping editor", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const description = "A privacy-first bookkeeping platform for independent creative freelancers"
    const accountingNames = [
      "ledger", "invoice", "daybook", "filing", "accrual", "receipt", "journal", "debits",
    ] as const
    const creativeAudienceNames = [
      "indie", "canvas", "maker", "muse", "palette", "atelier", "craft", "studio",
      "freelance", "creator", "workshop", "sketchbook", "portfolio", "briefcase", "bohemian", "artistry",
      "gallery", "imprint", "motif", "medium", "folio", "draft", "abstract", "handwork",
    ] as const
    const requests: Array<Record<string, unknown>> = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requests.push(body)
      return successfulNamesResponse([...accountingNames, ...creativeAudienceNames])
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description,
      vibe: "clean",
      style: "auto",
      creativity: "balanced",
      // Seven characters leaves only a genuinely sparse 19-name private pool,
      // so this remains an ordinary creative-editor admission test rather
      // than accidentally exercising the exact-pool selector path.
      maxChars: 7,
      count: 16,
      seed: "bookkeeping-editor-contamination",
      requireEditorialReview: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(requests[0]?.messages)).toContain("final naming editor")
    const editorialPrompt = JSON.parse(
      ((requests[0]?.messages as Array<{ content: string }>)[1]?.content),
    ) as { brief: { description: string }; semanticTerrain: string[]; approvedDraftNames?: string[] }
    expect(editorialPrompt).not.toHaveProperty("approvedDraftNames")
    expect(editorialPrompt.brief.description).toBe(description)
    expect(editorialPrompt.semanticTerrain).toEqual(expect.arrayContaining([
      "invoice", "tax", "solo", "books", "ledger",
    ]))
    expect(editorialPrompt.semanticTerrain).not.toContain("indie")
    expect(editorialPrompt.semanticTerrain).not.toContain("maker")
    expect(editorialPrompt.semanticTerrain).not.toContain("studio")

    const leakedNames = result.candidates
      .map((candidate) => candidate.name)
      .filter((name) => creativeAudienceNames.includes(name as typeof creativeAudienceNames[number]))
    expect(leakedNames).toEqual([])
    expect(
      result.modelBacked
        ? result.editoriallyReviewed && result.modelCandidateCount === 16
        : result.provider === "deterministic" && result.editoriallyReviewed === false,
    ).toBe(true)
  })

  it("keeps configured Gateway in reserve when the default 20B selector succeeds in one call", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    const requests: Array<{ url: string; body: Record<string, unknown> }> = []
    let privateDraftNames: string[] = []
    let selectedNames: string[] = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requests.push({ url, body })
      const prompt = readEditorialSelectorPrompt(body)
      privateDraftNames = prompt.approvedDraftNames
      selectedNames = privateDraftNames.slice(0, prompt.selectionTarget)
      return successfulNamesResponse(selectedNames)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "gateway-editorial-success",
      requireEditorialReview: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(requests.map(({ url }) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
    ])
    expect(JSON.stringify(requests[0]?.body.messages)).toContain("final naming editor")
    expect(privateDraftNames).toHaveLength(32)
    expect(selectedNames).toHaveLength(24)
    expect(result).toMatchObject({
      provider: "groq",
      model: "openai/gpt-oss-20b",
      usedGroq: true,
      usedVercelGateway: false,
      modelBacked: true,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        model: "openai/gpt-oss-20b",
        stage: "editorial",
        outcome: "ready",
        parsedCandidateCount: 24,
        admittedCandidateCount: 24,
        selectionPoolCandidateCount: privateDraftNames.length,
      }),
    ])
    expect(result.candidates).toHaveLength(16)
    expect(result.candidates.every(({ name }) => selectedNames.includes(name))).toBe(true)
  })

  it("falls back to the distinct Qwen editor when configured Gateway fails fast", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    const requests: Array<{ url: string; body: Record<string, unknown> }> = []
    let selectedNames: string[] = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requests.push({ url, body })
      const prompt = readEditorialSelectorPrompt(body)
      if (requests.length === 1) return successfulNamesResponse([])
      if (requests.length === 2) {
        return {
          ok: false,
          status: 503,
          headers: { get: () => null },
          json: async () => ({ error: { type: "server_error" } }),
        }
      }
      selectedNames = prompt.approvedDraftNames.slice(0, prompt.selectionTarget)
      return successfulNamesResponse(selectedNames)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "gateway-editorial-fast-failure",
      requireEditorialReview: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requests.map(({ url }) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      "https://api.groq.com/openai/v1/chat/completions",
    ])
    expect(requests.every(({ body }) => JSON.stringify(body.messages).includes("final naming editor"))).toBe(true)
    expect(requests[2]?.body.model).toBe("qwen/qwen3.6-27b")
    expect(result.durationMs).toBeLessThan(7_400)
    expect(result).toMatchObject({
      provider: "groq",
      model: "qwen/qwen3.6-27b",
      usedGroq: true,
      usedVercelGateway: false,
      modelBacked: true,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        model: "openai/gpt-oss-20b",
        stage: "editorial",
        outcome: "no_valid_names",
      }),
      expect.objectContaining({ provider: "vercel_gateway", stage: "editorial", outcome: "http_error", status: 503 }),
      expect.objectContaining({
        provider: "groq",
        model: "qwen/qwen3.6-27b",
        stage: "editorial",
        outcome: "ready",
        parsedCandidateCount: 24,
      }),
    ])
    expect(selectedNames).toHaveLength(24)
    expect(result.candidates.every(({ name }) => selectedNames.includes(name))).toBe(true)
  })

  it("rejects every incomplete selector response without carrying review provenance", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    const requests: Array<{ url: string; body: Record<string, unknown> }> = []
    let repeatedSelection: string[] = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requests.push({ url, body })
      const prompt = readEditorialSelectorPrompt(body)
      expect(prompt.previouslyReviewedNames).toEqual([])
      repeatedSelection = prompt.approvedDraftNames.slice(0, 8)
      return successfulNamesResponse(repeatedSelection)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "incomplete-editor-never-publishes-draft",
      requireEditorialReview: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requests.map(({ url }) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      "https://api.groq.com/openai/v1/chat/completions",
    ])
    expect(requests.every(({ body }) => JSON.stringify(body.messages).includes("final naming editor"))).toBe(true)
    expect(requests[2]?.body.model).toBe("qwen/qwen3.6-27b")
    expect(result).toMatchObject({
      provider: "deterministic",
      modelBacked: false,
      modelCandidateCount: 0,
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        model: "openai/gpt-oss-20b",
        stage: "editorial",
        outcome: "no_valid_names",
        parsedCandidateCount: 8,
        admittedCandidateCount: 0,
      }),
      expect.objectContaining({
        provider: "vercel_gateway",
        stage: "editorial",
        outcome: "no_valid_names",
        parsedCandidateCount: 8,
        admittedCandidateCount: 0,
      }),
      expect.objectContaining({
        provider: "groq",
        model: "qwen/qwen3.6-27b",
        stage: "editorial",
        outcome: "no_valid_names",
        parsedCandidateCount: 8,
        admittedCandidateCount: 0,
      }),
      expect.objectContaining({ provider: "openai", stage: "editorial", outcome: "missing_key" }),
    ])
  })

  it("ignores partial selections and lets a later exact selector recover", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    let privateDraftNames: string[] = []
    let invalidPrimaryNames: string[] = []
    let invalidGatewayNames: string[] = []
    let recoverySelectedNames: string[] = []
    const requests: Array<{ url: string; body: Record<string, unknown> }> = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requests.push({ url, body })
      const prompt = readEditorialSelectorPrompt(body)
      if (privateDraftNames.length === 0) privateDraftNames = prompt.approvedDraftNames
      expect(prompt.approvedDraftNames).toEqual(privateDraftNames)
      expect(prompt.previouslyReviewedNames).toEqual([])
      if (requests.length === 1) {
        invalidPrimaryNames = privateDraftNames.slice(0, 4)
        return successfulNamesResponse(invalidPrimaryNames)
      }
      if (requests.length === 2) {
        invalidGatewayNames = privateDraftNames.slice(4, 8)
        return successfulNamesResponse(invalidGatewayNames)
      }
      recoverySelectedNames = privateDraftNames.slice(0, prompt.selectionTarget)
      return successfulNamesResponse(recoverySelectedNames)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "reviewed-only-accumulation",
      requireEditorialReview: true,
    })

    expect(requests.map(({ url }) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      "https://api.groq.com/openai/v1/chat/completions",
    ])
    expect(requests.every(({ body }) => JSON.stringify(body.messages).includes("final naming editor"))).toBe(true)
    expect(requests[0]?.body.model).toBe("openai/gpt-oss-20b")
    expect(requests[2]?.body.model).toBe("qwen/qwen3.6-27b")
    expect(result).toMatchObject({
      provider: "groq",
      model: "qwen/qwen3.6-27b",
      usedGroq: true,
      usedVercelGateway: false,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        model: "openai/gpt-oss-20b",
        stage: "editorial",
        outcome: "no_valid_names",
        parsedCandidateCount: 4,
        admittedCandidateCount: 0,
        selectionPoolCandidateCount: privateDraftNames.length,
      }),
      expect.objectContaining({
        provider: "vercel_gateway",
        stage: "editorial",
        outcome: "no_valid_names",
        parsedCandidateCount: 4,
        admittedCandidateCount: 0,
        selectionPoolCandidateCount: privateDraftNames.length,
      }),
      expect.objectContaining({
        provider: "groq",
        model: "qwen/qwen3.6-27b",
        stage: "editorial",
        outcome: "ready",
        parsedCandidateCount: 24,
        admittedCandidateCount: 24,
        selectionPoolCandidateCount: privateDraftNames.length,
      }),
    ])
    expect(recoverySelectedNames).toHaveLength(24)
    expect(result.candidates.every(({ name }) => recoverySelectedNames.includes(name))).toBe(true)
    expect(invalidPrimaryNames).toHaveLength(4)
    expect(invalidGatewayNames).toHaveLength(4)
    for (const root of ["slot", "agenda", "assist", "founder", "time"]) {
      expect(
        result.candidates.filter(({ name }) => name === root || name.startsWith(root) || name.endsWith(root)).length,
        root,
      ).toBeLessThanOrEqual(2)
    }
  })

  it("recovers from a 20B selector timeout through Qwen review of the private workshop", async () => {
    vi.useFakeTimers()
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    const requests: Array<{ url: string; body: Record<string, unknown> }> = []
    let privateSeedNames: string[] = []
    let qwenSelectedNames: string[] = []
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requests.push({ url, body })
      const editorialPrompt = readEditorialSelectorPrompt(body)
      if (privateSeedNames.length === 0) privateSeedNames = editorialPrompt.approvedDraftNames
      expect(editorialPrompt.approvedDraftNames).toEqual(privateSeedNames)
      if (requests.length === 1) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          )
        })
      }
      qwenSelectedNames = privateSeedNames.slice(0, editorialPrompt.selectionTarget)
      return Promise.resolve(successfulNamesResponse(qwenSelectedNames))
    })
    vi.stubGlobal("fetch", fetchMock)

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "timeout-private-editor-seed",
      requireEditorialReview: true,
    })
    await vi.advanceTimersByTimeAsync(5_001)
    const result = await pending

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requests.map(({ url }) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
      "https://api.groq.com/openai/v1/chat/completions",
    ])
    expect(requests[1]?.body.model).toBe("qwen/qwen3.6-27b")
    expect(requests.every(({ body }) => JSON.stringify(body.messages).includes("final naming editor"))).toBe(true)
    expect(result).toMatchObject({
      provider: "groq",
      model: "qwen/qwen3.6-27b",
      modelBacked: true,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        model: "openai/gpt-oss-20b",
        stage: "editorial",
        outcome: "timeout",
      }),
      expect.objectContaining({
        provider: "vercel_gateway",
        stage: "editorial",
        outcome: "missing_key",
      }),
      expect.objectContaining({
        provider: "groq",
        model: "qwen/qwen3.6-27b",
        stage: "editorial",
        outcome: "ready",
        parsedCandidateCount: 24,
        selectionPoolCandidateCount: privateSeedNames.length,
      }),
    ])
    expect(qwenSelectedNames).toHaveLength(24)
    expect(result.candidates).toHaveLength(16)
    expect(result.candidates.every(({ name }) => qwenSelectedNames.includes(name))).toBe(true)
  })

  it("returns deterministic fallback when every editor fails over the private workshop", async () => {
    vi.useFakeTimers()
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    const requests: Array<{ url: string; body: Record<string, unknown> }> = []
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      requests.push({ url, body })
      readEditorialSelectorPrompt(body)
      if (requests.length === 1) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          )
        })
      }
      return Promise.resolve({
        ok: false,
        status: 503,
        headers: { get: () => null },
        json: async () => ({ error: { type: "server_error" } }),
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "timeout-private-seed-all-editors-fail",
      requireEditorialReview: true,
    })
    await vi.advanceTimersByTimeAsync(5_001)
    const result = await pending

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requests.map(({ url }) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      "https://api.groq.com/openai/v1/chat/completions",
    ])
    expect(requests.every(({ body }) => JSON.stringify(body.messages).includes("final naming editor"))).toBe(true)
    expect(requests[0]?.body.model).toBe("openai/gpt-oss-20b")
    expect(requests[2]?.body.model).toBe("qwen/qwen3.6-27b")
    expect(result).toMatchObject({
      provider: "deterministic",
      modelBacked: false,
      modelCandidateCount: 0,
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
    })
    expect(result.fallbackCandidateCount).toBeGreaterThan(0)
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        model: "openai/gpt-oss-20b",
        stage: "editorial",
        outcome: "timeout",
      }),
      expect.objectContaining({ provider: "vercel_gateway", stage: "editorial", outcome: "http_error", status: 503 }),
      expect.objectContaining({ provider: "groq", model: "qwen/qwen3.6-27b", stage: "editorial", outcome: "http_error", status: 503 }),
      expect.objectContaining({ provider: "openai", stage: "editorial", outcome: "missing_key" }),
    ])
  })

  it("continues after a partial Auto provider batch and lets a later provider complete it without deterministic filler", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODELS = "qwen/qwen3.6-27b"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    const firstProviderNames = COMPLETE_SCHEDULING_AUTO_NAMES.slice(0, 8)
    const fetchMock = vi.fn(async (url: string) => (
      url.includes("groq.com")
        ? successfulNamesResponse(firstProviderNames)
        : successfulNamesResponse(COMPLETE_SCHEDULING_AUTO_NAMES)
    ))
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "partial-provider-continues",
    })

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
      "https://ai-gateway.vercel.sh/v1/chat/completions",
    ])
    expect(result.provider).toBe("vercel_gateway")
    expect(result.usedGroq).toBe(true)
    expect(result.usedVercelGateway).toBe(true)
    expect(result.modelCandidateCount).toBe(16)
    expect(result.fallbackCandidateCount).toBe(0)
    expect(result.editoriallyReviewed).toBe(false)
    expect(result.editorialCandidateCount).toBe(0)
    expect(result.candidates).toHaveLength(16)
    expect(result.providerAttempts).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: "groq", outcome: "no_valid_names" }),
      expect.objectContaining({ provider: "vercel_gateway", outcome: "ready" }),
    ]))
  })

  it("keeps an all-model accounting slop batch from masquerading as a grounded Auto shortlist", async () => {
    process.env.GROQ_API_KEY = "test-key"
    mockGroqNames([
      "flownest", "clevory", "taxmira", "earnvia", "finqube", "simplara", "trackle", "mintora",
      "cleara", "streamly", "pulsepay", "balance", "solace", "clearcut", "freeman", "taxpath",
    ])

    const result = await generateGroqQuickCandidates({
      description: "A modern accounting platform for independent freelancers that makes taxes and cash flow feel simple",
      vibe: "clean",
      style: "auto",
      creativity: "balanced",
      maxChars: 10,
      count: 16,
    })

    const names = result.candidates.map((candidate) => candidate.name)
    expect(names).not.toEqual(expect.arrayContaining(["taxmira", "finqube", "clevory", "streamly", "mintora", "taxpath"]))
    expect(result.exploratoryCandidateCount).toBeLessThanOrEqual(4)
    expect(result.groundedCandidateCount).toBeLessThan(12)
    expect(result.fallbackCandidateCount).toBeGreaterThan(0)
  })

  it("keeps an emergency OpenAI-primary batch from silently falling through to another provider", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://api.openai.com/v1/chat/completions")
      return successfulNamesResponse(COMPLETE_SCHEDULING_AUTO_NAMES)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      maxChars: 12,
      count: 16,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.provider).toBe("openai")
    expect(result.model).toBe("gpt-4.1-mini")
    expect(result.providerAttempts).toHaveLength(1)
    expect(result.providerAttempts[0]).toMatchObject({ provider: "openai", outcome: "ready" })
  })

  it("uses a 32-name private pool and enforces an explicit evocative style locally", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain("api.groq.com")
      expect(init?.method).toBe("POST")
      return successfulNamesResponse(["mosaic"])
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy founders",
      vibe: "tech",
      style: "evocative",
      creativity: "exploratory",
      maxChars: 10,
      count: 1,
      blacklist: ["calendarbot"],
    })
    const request = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit)?.body))
    const prompt = JSON.parse(request.messages[1].content)

    expect(result.candidates[0]).toMatchObject({ name: "mosaic", style: "evocative" })
    expect(request.temperature).toBe(0.9)
    expect(request.max_completion_tokens).toBe(1_500)
    expect(request.response_format).toEqual({ type: "json_object" })
    expect(prompt.userInput).toMatchObject({ style: "evocative", creativity: "exploratory" })
    expect(prompt.userInput.creativeLens).toEqual(expect.any(String))
    expect(prompt.rules.join(" ")).toContain("do not need a visible theme")
    expect(prompt.rules.join(" ")).toContain("natural speech, memorability, brief specificity and distinctiveness")
    expect(prompt.rules.join(" ")).toContain("head, tail or sound family at most twice")
    expect(prompt.rules.join(" ")).toContain("calendarbot")
    expect(prompt.rules.join(" ")).toContain("lowercase letters only")
    expect(prompt.rules.join(" ")).not.toContain("pocketly")
    expect(prompt.rules.join(" ")).not.toContain("fundio")
    expect(prompt.rules[0]).toBe("Return exactly 32 distinct names, strongest first; never pad with a weak option.")
    expect(prompt.outputShape).toEqual({ names: ["lowercase"] })
    expect(prompt.rules.join(" ")).toContain("builds explanations locally")
    expect(result.candidates[0].personality).not.toContain("provider")
  })

  it("keeps globally reviewed words context-only unless this brief approves their meaning", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ...successfulNamesResponse(COMPLETE_SCHEDULING_AUTO_NAMES),
    })))

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "exploratory",
      maxChars: 12,
      count: 16,
    })
    const timepilot = result.candidates.find((candidate) => candidate.name === "timepilot")
    const mosaic = result.candidates.find((candidate) => candidate.name === "mosaic")

    expect(timepilot).toMatchObject({ constructionParts: ["time", "pilot"] })
    expect(mosaic).toMatchObject({ fitRoots: [] })
    expect(mosaic).not.toHaveProperty("evidence")
    expect(timepilot?.personality).not.toBe(mosaic?.personality)
    expect(timepilot?.personality).toMatch(/scheduling/i)
    expect(mosaic?.personality).not.toContain("distinct pieces")
    expect(result.candidates).toHaveLength(16)
    expect(result.fallbackCandidateCount).toBe(0)
  })

  it("caps a repeated provider construction family at two selected names", async () => {
    process.env.GROQ_API_KEY = "test-key"
    const structured = (name: string, parts: [string, string], territoryId: string) => ({
      name,
      style: "compound",
      territoryId,
      mechanism: "visible_compound",
      evidenceParts: parts,
    })
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ candidates: [
          structured("upfund", ["up", "fund"], "core_job"),
          structured("upsave", ["up", "save"], "desired_outcome"),
          structured("upthrift", ["up", "thrift"], "audience_world"),
          structured("upledger", ["up", "ledger"], "distinctive_metaphor"),
          structured("fundbridge", ["fund", "bridge"], "core_job"),
          structured("saveharbor", ["save", "harbor"], "desired_outcome"),
        ] }) } }],
      }),
    })))

    const result = await generateGroqQuickCandidates({
      description: "family budgeting app that helps parents save and build an emergency fund",
      vibe: "friendly",
      style: "auto",
      maxChars: 12,
      count: 8,
    })
    const repeatedHead = result.candidates.filter((candidate) => candidate.name.startsWith("up"))

    expect(repeatedHead.length).toBeLessThanOrEqual(2)
    expect(result.candidates.map((candidate) => candidate.name)).not.toEqual(expect.arrayContaining(["upthrift", "upledger"]))
  })

  it("lets a reviewed Auto editor retain four members of a brief-owned family", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const semantic = (
      name: string,
      territoryId: AutoCandidateFixture["territoryId"],
    ): AutoCandidateFixture => autoCandidate(name, "semantic_word", [name], territoryId)
    const compound = (
      left: string,
      right: string,
      territoryId: AutoCandidateFixture["territoryId"],
    ): AutoCandidateFixture => autoCandidate(`${left}${right}`, "visible_compound", [left, right], territoryId)
    const editorialCandidates: AutoCandidateFixture[] = [
      semantic("filigree", "core_job"),
      semantic("precious", "audience_world"),
      semantic("luminous", "desired_outcome"),
      semantic("burnished", "distinctive_metaphor"),
      semantic("auriferous", "core_job"),
      semantic("enduring", "audience_world"),
      semantic("treasured", "desired_outcome"),
      semantic("reforged", "distinctive_metaphor"),
      compound("carat", "stone", "core_job"),
      compound("carat", "hearth", "audience_world"),
      compound("carat", "haven", "desired_outcome"),
      compound("carat", "crest", "distinctive_metaphor"),
      compound("gold", "stone", "core_job"),
      compound("gold", "ring", "audience_world"),
      compound("gold", "haven", "desired_outcome"),
      compound("gold", "leaf", "distinctive_metaphor"),
    ]
    const input = {
      description: "fine jewellery made from recycled gold for modern heirlooms",
      vibe: "premium" as const,
      style: "auto" as const,
      creativity: "balanced" as const,
      maxChars: 12,
      count: 16,
      seed: "reviewed-family-cap",
    }
    const editorialNames = new Set(editorialCandidates.map(({ name }) => name))
    const unrestrictedPool = generateQuickEditorialWorkshop(input).editorialPool
    const sparseWorkshopBlacklist = unrestrictedPool
      .filter(({ name }) => !editorialNames.has(name))
      .slice(0, Math.max(0, unrestrictedPool.length - 23))
      .map(({ name }) => name)
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      const prompt = JSON.parse(
        ((body.messages as Array<{ content: string }>)[1]?.content || "{}"),
      ) as { draftNames?: string[]; approvedDraftNames?: string[] }
      expect(prompt).not.toHaveProperty("approvedDraftNames")
      expect(prompt.draftNames?.length).toBeLessThan(24)
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ candidates: editorialCandidates }) } }],
        }),
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      ...input,
      // Deliberately thin only the deterministic workshop to 23 options. The
      // provider fixture remains a normal 12-character authoring response, so
      // this test still exercises the reviewed brief-owned family cap.
      blacklist: sparseWorkshopBlacklist,
      requireEditorialReview: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      provider: "groq",
      modelBacked: true,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        stage: "editorial",
        outcome: "ready",
        parsedCandidateCount: 16,
        admittedCandidateCount: 16,
      }),
    ])
    expect(result.candidates).toHaveLength(16)
    expect(result.candidates.filter(({ name }) => name.startsWith("carat"))).toHaveLength(4)
    expect(result.candidates.filter(({ name }) => name.startsWith("gold"))).toHaveLength(4)
  })

  it("keeps only reviewed locale forms and safe English drafts in a locale editorial batch", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const reviewedWelsh = [
      "marchnadleol",
      "ffermcymru",
      "bwydlleol",
      "ffermleol",
      "bwydcymru",
      "ysgolfferm",
      "cnwdcymru",
      "cynhaeaf",
    ] as const
    const pseudoWelsh = [
      "cwrnfa",
      "eirafarm",
      "celynfield",
      "torfaen",
      "brithfarm",
      "helygrow",
      "telyntrade",
      "drwmstead",
    ] as const
    const safeEnglishAlternates = [
      "schoolmarket",
      "producepath",
      "marketfield",
      "fieldschool",
      "cropmarket",
      "meadowlink",
      "fieldtide",
      "leafexchange",
    ] as const
    const sparseWorkshopBlacklist = [
      "localharvest", "fairharvest", "sharedfarm", "localfarm", "fairfarm",
      "farmexchange", "harvestlink", "fieldtable", "farmshare", "cropclass",
      "harvestfield", "farmcircle", "farmnest", "harvestnest", "harvestmate",
    ]
    const safeDraftPreference = [
      "seasonal", "provenance", "localism", "produce",
      "farmtrade", "farmfield", "harvestbond", "harvesthaven",
    ]
    let safeDrafts: string[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> }
      const prompt = JSON.parse(body.messages[1]?.content || "{}") as {
        draftNames?: string[]
        approvedDraftNames?: string[]
      }
      expect(prompt).not.toHaveProperty("approvedDraftNames")
      safeDrafts = safeDraftPreference.filter((name) => prompt.draftNames?.includes(name))
      return successfulNamesResponse([
        ...reviewedWelsh,
        ...safeDrafts,
        ...pseudoWelsh,
        ...safeEnglishAlternates,
      ])
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "Welsh language marketplace connecting family farms with local schools",
      vibe: "friendly",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "reviewed-welsh-editor",
      // This removes only deterministic English workshop options and leaves a
      // genuine 22-name pool, so locale admission (including pseudo-form
      // rejection) is exercised instead of exact-pool selection.
      blacklist: sparseWorkshopBlacklist,
      requireEditorialReview: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(safeDrafts).toHaveLength(8)
    expect(result).toMatchObject({
      modelBacked: true,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
    })
    expect(result.candidates.filter(({ name }) => reviewedWelsh.includes(name as typeof reviewedWelsh[number]))).toHaveLength(8)
    expect(result.candidates.map(({ name }) => name)).not.toEqual(expect.arrayContaining([...pseudoWelsh]))
  })

  it("gives an incomplete first selector zero provenance before exact Qwen recovery", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
    let privateDraftNames: string[] = []
    let invalidFirstSelection: string[] = []
    let qwenSelection: string[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string
        messages: Array<{ content: string }>
      }
      const prompt = readEditorialSelectorPrompt(body as unknown as Record<string, unknown>)
      if (privateDraftNames.length === 0) {
        privateDraftNames = prompt.approvedDraftNames
        const visibleRootCounts = new Map<string, number>()
        const variedSelection: string[] = [...prompt.locallyPublishableCoreNames]
        const variedSelectionSet = new Set(variedSelection)
        const deferredRootRepeats: string[] = []
        for (const name of privateDraftNames) {
          if (variedSelection.length >= prompt.selectionTarget) break
          if (variedSelectionSet.has(name)) continue
          const visibleRoots = ["slot", "agenda", "assist", "founder", "time"].filter(
            (root) => name === root || name.startsWith(root) || name.endsWith(root),
          )
          if (visibleRoots.some((root) => (visibleRootCounts.get(root) || 0) >= 2)) {
            deferredRootRepeats.push(name)
            continue
          }
          for (const root of visibleRoots) visibleRootCounts.set(root, (visibleRootCounts.get(root) || 0) + 1)
          variedSelection.push(name)
          variedSelectionSet.add(name)
        }
        for (const name of deferredRootRepeats) {
          if (variedSelection.length >= prompt.selectionTarget) break
          if (variedSelectionSet.has(name)) continue
          variedSelection.push(name)
          variedSelectionSet.add(name)
        }
        qwenSelection = variedSelection
        expect(qwenSelection).toHaveLength(prompt.selectionTarget)
        expect(qwenSelection).toHaveLength(24)
      }
      expect(prompt.approvedDraftNames).toEqual(privateDraftNames)
      if (body.model === "openai/gpt-oss-20b") {
        invalidFirstSelection = qwenSelection.slice(0, 8)
        return successfulNamesResponse(invalidFirstSelection)
      }

      expect(body.model).toBe("qwen/qwen3.6-27b")
      expect(prompt.previouslyReviewedNames).toEqual([])
      return successfulNamesResponse(qwenSelection)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "qwen-private-recovery-only",
      requireEditorialReview: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      provider: "groq",
      model: "qwen/qwen3.6-27b",
      modelBacked: true,
      editoriallyReviewed: true,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
    })
    expect(result.candidates).toHaveLength(16)
    expect(result.candidates.every(({ name }) => qwenSelection.includes(name))).toBe(true)
    expect(result.providerAttempts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        model: "openai/gpt-oss-20b",
        outcome: "no_valid_names",
        parsedCandidateCount: 8,
        admittedCandidateCount: 0,
        selectionPoolCandidateCount: privateDraftNames.length,
      }),
      expect.objectContaining({
        model: "qwen/qwen3.6-27b",
        outcome: "ready",
        parsedCandidateCount: 24,
        admittedCandidateCount: 24,
        selectionPoolCandidateCount: privateDraftNames.length,
      }),
    ]))
    expect(privateDraftNames.length).toBeGreaterThanOrEqual(24)
    for (const root of ["slot", "agenda", "assist", "founder", "time"]) {
      expect(
        result.candidates.filter(({ name }) => name === root || name.startsWith(root) || name.endsWith(root)).length,
        root,
      ).toBeLessThanOrEqual(2)
    }
  })

  it("falls back to deterministic generation when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY
    delete process.env.OPENAI_API_KEY

    const result = await generateGroqQuickCandidates({
      description: "friendly dog walking app for busy city owners",
      vibe: "friendly",
      maxChars: 10,
      count: 8,
      seed: "missing-key",
    })

    expect(result.usedGroq).toBe(false)
    expect(result.usedOpenAI).toBe(false)
    expect(result.usedVercelGateway).toBe(false)
    expect(result.provider).toBe("deterministic")
    expect(result.fallbackReason).toBe("missing_groq_api_key")
    expect(result.candidates.length).toBeGreaterThan(0)
  })

  it("uses the alternate Groq pool when independent fallbacks are unavailable", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODELS = "qwen/qwen3.6-27b,openai/gpt-oss-20b"
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      if (body.model === "qwen/qwen3.6-27b") {
        return {
          ok: false,
          status: 429,
          headers: { get: (name: string) => name.toLowerCase() === "retry-after" ? "1.5" : null },
          json: async () => ({}),
        }
      }
      expect(url).toContain("groq.com")
      expect(body.model).toBe("openai/gpt-oss-20b")
      expect(body.response_format).toEqual({ type: "json_object" })
      return successfulNamesResponse(["mosaic"])
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "evocative",
      maxChars: 10,
      count: 8,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.usedGroq).toBe(true)
    expect(result.usedOpenAI).toBe(false)
    expect(result.modelBacked).toBe(true)
    expect(result.provider).toBe("groq")
    expect(result.model).toBe("openai/gpt-oss-20b")
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "http_error", status: 429, retryAfterMs: 1_500 }),
      expect.objectContaining({ provider: "openai", model: "gpt-4.1-mini", outcome: "missing_key" }),
      expect.objectContaining({ provider: "vercel_gateway", outcome: "missing_key" }),
      expect.objectContaining({ provider: "groq", model: "openai/gpt-oss-20b", outcome: "ready" }),
    ])
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("groq.com"))).toHaveLength(2)
    expect(result.modelCandidateCount).toBeGreaterThan(0)
  })

  it("uses one strict-schema OpenAI fallback after a fast Groq 429", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("groq.com")) {
        return {
          ok: false,
          status: 429,
          headers: { get: (name: string) => name.toLowerCase() === "retry-after" ? "2" : null },
          json: async () => ({ error: { code: "rate_limit_exceeded" } }),
        }
      }

      expect(url).toBe("https://api.openai.com/v1/chat/completions")
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer openai-test-key")
      const body = JSON.parse(String(init?.body))
      expect(body.model).toBe("gpt-4.1-mini")
      expect(body.max_completion_tokens).toBe(1_500)
      expect(body.response_format).toMatchObject({
        type: "json_schema",
        json_schema: { strict: true },
      })
      return successfulNamesResponse(COMPLETE_SCHEDULING_AUTO_NAMES)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      maxChars: 10,
      count: 16,
      seed: "fast-openai-fallback",
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.provider).toBe("openai")
    expect(result.model).toBe("gpt-4.1-mini")
    expect(result.usedGroq).toBe(false)
    expect(result.usedOpenAI).toBe(true)
    expect(result.usedVercelGateway).toBe(false)
    expect(result.modelBacked).toBe(true)
    expect(result.candidates).toHaveLength(16)
    expect(new Set(result.candidates.map((candidate) => candidate.name)).size).toBe(16)
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "http_error", status: 429, retryAfterMs: 2_000 }),
      expect.objectContaining({ provider: "openai", model: "gpt-4.1-mini", outcome: "ready" }),
    ])
    expect(JSON.stringify(result.providerAttempts)).not.toContain("groq-test-key")
    expect(JSON.stringify(result.providerAttempts)).not.toContain("openai-test-key")
  })

  it("keeps Groq first by default when both direct provider keys are available", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5-mini"
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://api.groq.com/openai/v1/chat/completions")
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ candidates: [{
            name: "mosaic",
            style: "real_word",
            territoryId: "distinctive_metaphor",
            mechanism: "semantic_word",
            evidenceParts: ["mosaic"],
          }] }) } }],
        }),
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "real_word",
      creativity: "balanced",
      maxChars: 10,
      count: 1,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.provider).toBe("groq")
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "ready" }),
    ])
  })

  it("uses an opt-in GPT-5 mini OpenAI primary with its supported Chat Completions body", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5-mini"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.openai.com/v1/chat/completions")
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer openai-test-key")
      const body = JSON.parse(String(init?.body))
      expect(body).toMatchObject({
        model: "gpt-5-mini",
        reasoning_effort: "low",
        verbosity: "low",
        response_format: {
          type: "json_schema",
          json_schema: { strict: true },
        },
      })
      expect(body.max_completion_tokens).toBeGreaterThanOrEqual(1_800)
      for (const unsupported of [
        "temperature",
        "top_p",
        "frequency_penalty",
        "presence_penalty",
        "logprobs",
        "top_logprobs",
      ]) {
        expect(body).not.toHaveProperty(unsupported)
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ candidates: [{
            name: "mosaic",
            style: "real_word",
            territoryId: "distinctive_metaphor",
            mechanism: "semantic_word",
            evidenceParts: ["mosaic"],
          }] }) } }],
        }),
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "real_word",
      creativity: "exploratory",
      maxChars: 10,
      count: 1,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      provider: "openai",
      model: "gpt-5-mini",
      usedOpenAI: true,
      usedGroq: false,
      modelBacked: true,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "openai", model: "gpt-5-mini", outcome: "ready" }),
    ])
  })

  it("uses minimal reasoning for Direct and honours the constrained GPT-5 mini override", async () => {
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5-mini"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    const observedEfforts: string[] = []
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      observedEfforts.push(JSON.parse(String(init?.body)).reasoning_effort)
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ candidates: [{
            name: "mosaic",
            style: "real_word",
            territoryId: "distinctive_metaphor",
            mechanism: "semantic_word",
            evidenceParts: ["mosaic"],
          }] }) } }],
        }),
      }
    }))

    await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "real_word",
      creativity: "direct",
      maxChars: 10,
      count: 1,
    })
    process.env.OPENAI_QUICK_REASONING_EFFORT = "low"
    await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "real_word",
      creativity: "direct",
      maxChars: 10,
      count: 1,
    })

    expect(observedEfforts).toEqual(["minimal", "low"])
  })

  it("uses the compact v8 names-only contract and none reasoning for GPT-5.6 Luna", async () => {
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5.6-luna"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    // `minimal` belongs to legacy GPT-5 mini and is invalid for GPT-5.6. The
    // constrained config must ignore it and retain Luna's none-effort baseline.
    process.env.OPENAI_QUICK_REASONING_EFFORT = "minimal"
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.openai.com/v1/chat/completions")
      const body = JSON.parse(String(init?.body))
      expect(body).toMatchObject({
        model: "gpt-5.6-luna",
        reasoning_effort: "none",
        verbosity: "low",
        max_completion_tokens: 1_500,
        response_format: {
          type: "json_schema",
          json_schema: {
            strict: true,
            schema: {
              required: ["names"],
              properties: {
                names: { minItems: 32, maxItems: 32 },
              },
            },
          },
        },
      })
      for (const unsupported of ["temperature", "top_p", "frequency_penalty", "presence_penalty"]) {
        expect(body).not.toHaveProperty(unsupported)
      }
      return successfulNamesResponse(COMPLETE_SCHEDULING_AUTO_NAMES)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "gpt-5.6-luna-contract",
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ provider: "openai", model: "gpt-5.6-luna", modelBacked: true })
    expect(result.candidates).toHaveLength(16)
  })

  it("recovers from one transient pre-generation OpenAI 401 inside the existing attempt deadline", async () => {
    delete process.env.GROQ_API_KEY
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5.6-terra"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    const fetchMock = vi.fn(async () => {
      if (fetchMock.mock.calls.length === 1) {
        return {
          ok: false,
          status: 401,
          headers: { get: () => null },
          json: async () => ({ error: { type: "invalid_request_error" } }),
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ candidates: [{
            name: "timepilot",
            style: "compound",
            territoryId: "core_job",
            mechanism: "visible_compound",
            evidenceParts: ["time", "pilot"],
          }] }) } }],
        }),
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "compound",
      creativity: "balanced",
      count: 1,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      provider: "openai",
      model: "gpt-5.6-terra",
      modelBacked: true,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "openai",
        outcome: "ready",
        retryCount: 1,
      }),
    ])
  })

  it("stops after one retry when the transient OpenAI 401 persists", async () => {
    delete process.env.GROQ_API_KEY
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5.6-terra"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    const sensitiveMessage = "temporary credential detail that must not be retained"
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({ error: { type: "invalid_request_error", message: sensitiveMessage } }),
    }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 16,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.provider).toBe("deterministic")
    expect(result.providerAttempts[0]).toMatchObject({
      provider: "openai",
      outcome: "http_error",
      status: 401,
      errorCode: "invalid_request_error",
      retryCount: 1,
    })
    expect(JSON.stringify(result.providerAttempts)).not.toContain(sensitiveMessage)
  })

  it("keeps the recovered-401 retry inside the original OpenAI timeout window", async () => {
    vi.useFakeTimers()
    delete process.env.GROQ_API_KEY
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5.6-terra"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (fetchMock.mock.calls.length === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          headers: { get: () => null },
          json: async () => ({ error: { type: "invalid_request_error" } }),
        })
      }
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"))
        }, { once: true })
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 16,
    })
    await vi.advanceTimersByTimeAsync(6_801)
    const result = await pending

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.provider).toBe("deterministic")
    expect(result.providerAttempts[0]).toMatchObject({
      provider: "openai",
      outcome: "timeout",
      durationMs: 6_800,
      retryCount: 1,
    })
  })

  it.each([
    { status: 400, errorCode: "invalid_request_error" },
    { status: 429, errorCode: "rate_limit_exceeded" },
    { status: 401, errorCode: "invalid_api_key" },
  ])("does not retry OpenAI HTTP $status with $errorCode", async ({ status, errorCode }) => {
    delete process.env.GROQ_API_KEY
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5.6-terra"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status,
      headers: { get: () => null },
      json: async () => ({ error: { code: errorCode } }),
    }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 16,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.providerAttempts[0]).toMatchObject({
      provider: "openai",
      outcome: "http_error",
      status,
      errorCode,
    })
    expect(result.providerAttempts[0]).not.toHaveProperty("retryCount")
  })

  it("aborts an active transient OpenAI retry without starting another provider", async () => {
    delete process.env.GROQ_API_KEY
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5.6-terra"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    const controller = new AbortController()
    let markRetryStarted: (() => void) | undefined
    const retryStarted = new Promise<void>((resolve) => {
      markRetryStarted = resolve
    })
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (fetchMock.mock.calls.length === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          headers: { get: () => null },
          json: async () => ({ error: { type: "invalid_request_error" } }),
        })
      }
      markRetryStarted?.()
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"))
        }, { once: true })
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 16,
    }, controller.signal)
    await retryStarted
    controller.abort()
    const result = await pending

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.provider).toBe("deterministic")
    expect(result.fallbackReason).toBe("request_aborted")
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "openai", outcome: "aborted", retryCount: 1 }),
    ])
  })

  it("returns an all-model v4 GPT-5 mini Auto sample without deterministic padding", async () => {
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5-mini"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    const providerCandidates = [
      { name: "soinproche", territoryId: "core_job", mechanism: "locale_form", evidenceParts: [] },
      { name: "proxisante", territoryId: "audience_world", mechanism: "locale_form", evidenceParts: [] },
      { name: "santevillage", territoryId: "desired_outcome", mechanism: "locale_form", evidenceParts: [] },
      { name: "soinvillage", territoryId: "distinctive_metaphor", mechanism: "locale_form", evidenceParts: [] },
      { name: "liensante", territoryId: "core_job", mechanism: "locale_form", evidenceParts: [] },
      { name: "santefamille", territoryId: "audience_world", mechanism: "locale_form", evidenceParts: [] },
      { name: "accesrural", territoryId: "desired_outcome", mechanism: "locale_form", evidenceParts: [] },
      { name: "santeproche", territoryId: "distinctive_metaphor", mechanism: "locale_form", evidenceParts: [] },
      { name: "voisinage", territoryId: "core_job", mechanism: "semantic_word", evidenceParts: ["voisinage"] },
      { name: "entraide", territoryId: "audience_world", mechanism: "semantic_word", evidenceParts: ["entraide"] },
      { name: "bienetre", territoryId: "desired_outcome", mechanism: "semantic_word", evidenceParts: ["bienetre"] },
      { name: "familial", territoryId: "distinctive_metaphor", mechanism: "semantic_word", evidenceParts: ["familial"] },
      { name: "vitalite", territoryId: "core_job", mechanism: "semantic_word", evidenceParts: ["vitalite"] },
      { name: "healthgo", territoryId: "audience_world", mechanism: "visible_compound", evidenceParts: ["health", "go"] },
      { name: "mosaic", territoryId: "audience_world", mechanism: "semantic_word", evidenceParts: ["mosaic"] },
      { name: "aurora", territoryId: "desired_outcome", mechanism: "semantic_word", evidenceParts: ["aurora"] },
      { name: "compass", territoryId: "distinctive_metaphor", mechanism: "semantic_word", evidenceParts: ["compass"] },
      { name: "lantern", territoryId: "core_job", mechanism: "semantic_word", evidenceParts: ["lantern"] },
      { name: "harbor", territoryId: "audience_world", mechanism: "semantic_word", evidenceParts: ["harbor"] },
      { name: "horizon", territoryId: "desired_outcome", mechanism: "semantic_word", evidenceParts: ["horizon"] },
      { name: "sequence", territoryId: "distinctive_metaphor", mechanism: "semantic_word", evidenceParts: ["sequence"] },
      { name: "cadence", territoryId: "core_job", mechanism: "semantic_word", evidenceParts: ["cadence"] },
      { name: "mosaiclane", territoryId: "audience_world", mechanism: "visible_compound", evidenceParts: ["mosaic", "lane"] },
      { name: "auroraway", territoryId: "desired_outcome", mechanism: "visible_compound", evidenceParts: ["aurora", "way"] },
    ]
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      void init
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            candidates: providerCandidates,
          }) } }],
        }),
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "French-language health navigation for rural Quebec families",
      vibe: "friendly",
      style: "auto",
      creativity: "exploratory",
      maxChars: 12,
      count: 4,
      seed: "simplified-gpt5-auto",
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ provider: "openai", model: "gpt-5-mini", modelBacked: true })
    expect(result.candidates).toHaveLength(4)
    expect(new Set(result.candidates.map((candidate) => candidate.name)).size).toBe(4)
    expect(result.candidates.every((candidate) => providerCandidates.some(({ name }) => name === candidate.name))).toBe(true)
    expect(result.modelCandidateCount).toBe(4)
    expect(result.fallbackCandidateCount).toBe(0)
    expect(result.modelGroundedCandidateCount).toBeGreaterThanOrEqual(3)
    expect(result.exploratoryCandidateCount).toBeLessThanOrEqual(1)
  })

  it("treats empty provider content as an invalid response with diagnostics", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "   " } }] }),
    })))

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for founders",
      vibe: "tech",
      style: "auto",
      count: 8,
    })

    expect(result.provider).toBe("deterministic")
    expect(result.providerAttempts[0]).toMatchObject({
      provider: "groq",
      outcome: "invalid_response",
    })
    expect(result.providerAttempts[0]).not.toHaveProperty("parsedCandidateCount")
    expect(result.fallbackReason).toBe("groq_missing_content")
  })

  it("cancels an opt-in OpenAI primary without starting Groq", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.OPENAI_QUICK_MODEL = "gpt-5-mini"
    process.env.QUICK_GENERATE_PRIMARY_PROVIDER = "openai"
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.openai.com/v1/chat/completions")
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    const controller = new AbortController()

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 8,
    }, controller.signal)
    controller.abort()
    const result = await pending

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.provider).toBe("deterministic")
    expect(result.fallbackReason).toBe("request_aborted")
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "openai", model: "gpt-5-mini", outcome: "aborted" }),
    ])
  })

  it("uses OpenAI after a fast invalid Groq response", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: {} }] }),
        }
      }
      expect(url).toBe("https://api.openai.com/v1/chat/completions")
      return successfulNamesResponse(COMPLETE_SCHEDULING_AUTO_NAMES)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 16,
      seed: "fast-invalid-response",
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.provider).toBe("openai")
    expect(result.candidates).toHaveLength(16)
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "invalid_response" }),
      expect.objectContaining({ provider: "openai", outcome: "ready" }),
    ])
  })

  it("skips OpenAI after a slow successful Groq response yields no valid names", async () => {
    vi.useFakeTimers()
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("groq.com")) {
        return new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: JSON.stringify({ names: ["bcdfgh"] }) } }],
            }),
          }), 1_500)
        })
      }
      if (url.includes("api.openai.com")) throw new Error("slow no-valid responses must not spend the OpenAI window")
      expect(url).toBe("https://ai-gateway.vercel.sh/v1/chat/completions")
      return Promise.resolve(successfulNamesResponse(COMPLETE_SCHEDULING_AUTO_NAMES))
    })
    vi.stubGlobal("fetch", fetchMock)

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 16,
      seed: "slow-no-valid",
    })
    await vi.advanceTimersByTimeAsync(1_501)
    const result = await pending

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
      "https://ai-gateway.vercel.sh/v1/chat/completions",
    ])
    expect(result.provider).toBe("vercel_gateway")
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "no_valid_names", durationMs: 1_500 }),
      expect.objectContaining({ provider: "vercel_gateway", outcome: "ready" }),
    ])
  })

  it("stops the ladder after one OpenAI timeout instead of spending non-viable tail windows", async () => {
    vi.useFakeTimers()
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    const abortedProviders: string[] = []
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("groq.com")) {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: { get: () => null },
          json: async () => ({}),
        })
      }
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          abortedProviders.push(url)
          reject(new DOMException("Aborted", "AbortError"))
        }, { once: true })
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 16,
      seed: "openai-timeout-budget",
    })
    await vi.advanceTimersByTimeAsync(6_301)
    const result = await pending

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
      "https://api.openai.com/v1/chat/completions",
    ])
    expect(abortedProviders).toEqual([
      "https://api.openai.com/v1/chat/completions",
    ])
    expect(result.provider).toBe("deterministic")
    expect(result.usedOpenAI).toBe(false)
    expect(result.candidates).toHaveLength(16)
    expect(new Set(result.candidates.map((candidate) => candidate.name)).size).toBe(16)
    expect(result.durationMs).toBeLessThanOrEqual(6_300)
    expect(result.fallbackReason).toBe("openai_timeout")
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "http_error", status: 429 }),
      expect.objectContaining({ provider: "openai", outcome: "timeout", durationMs: 6_300 }),
    ])
  })

  it("honours a bounded per-model Groq Retry-After cooldown", async () => {
    vi.useFakeTimers()
    process.env.GROQ_API_KEY = "groq-test-key"
    const requestedModels: string[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      requestedModels.push(body.model)
      return {
        ok: false,
        status: 429,
        headers: { get: (name: string) => name.toLowerCase() === "retry-after" ? "3600" : null },
        json: async () => ({ error: { code: "rate_limit_exceeded" } }),
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    process.env.GROQ_QUICK_MODEL = "model-a"
    await generateGroqQuickCandidates({ description: "scheduling software", vibe: "tech", count: 16, seed: "cooldown-a-1" })
    const cooled = await generateGroqQuickCandidates({ description: "scheduling software", vibe: "tech", count: 16, seed: "cooldown-a-2" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(cooled.providerAttempts[0]).toMatchObject({
      provider: "groq",
      model: "model-a",
      outcome: "http_error",
      status: 429,
      durationMs: 0,
      retryAfterMs: 60_000,
      errorCode: "rate_limit_exceeded",
    })

    process.env.GROQ_QUICK_MODEL = "model-b"
    await generateGroqQuickCandidates({ description: "scheduling software", vibe: "tech", count: 16, seed: "cooldown-b" })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    process.env.GROQ_QUICK_MODEL = "model-a"
    await vi.advanceTimersByTimeAsync(60_001)
    await generateGroqQuickCandidates({ description: "scheduling software", vibe: "tech", count: 16, seed: "cooldown-a-3" })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requestedModels).toEqual(["model-a", "model-b", "model-a"])
  })

  it("records only a sanitized provider error code for failed generations", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    const sensitiveFailedOutput = "private rejected generation text"
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      if (body.model === "qwen/qwen3.6-27b") {
        return {
          ok: false,
          status: 400,
          headers: { get: () => null },
          json: async () => ({ error: { type: "invalid_request_error", failed_generation: sensitiveFailedOutput } }),
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({
          candidates: [{
            ...autoCandidate("mosaic", "semantic_word", ["mosaic"]),
            style: "real_word",
          }],
        }) } }] }),
      }
    }))

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for founders",
      vibe: "tech",
      count: 8,
    })

    expect(result.providerAttempts[0]).toMatchObject({ status: 400, errorCode: "failed_generation" })
    expect(JSON.stringify(result.providerAttempts)).not.toContain(sensitiveFailedOutput)
  })

  it("maps unknown provider error codes to a fixed safe value", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    const sensitiveUnknownCode = "tenant_acme_private_rule_9281"
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 400,
      headers: { get: () => null },
      json: async () => ({ error: { code: sensitiveUnknownCode } }),
    })))

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for founders",
      vibe: "tech",
      count: 8,
    })

    expect(result.providerAttempts[0]).toMatchObject({ status: 400, errorCode: "provider_error" })
    expect(JSON.stringify(result.providerAttempts)).not.toContain(sensitiveUnknownCode)
  })

  it("retains the safe invalid-api-key code without recording provider text", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    const sensitiveMessage = "credential ending in secret-fragment is invalid"
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({ error: { code: "invalid_api_key", message: sensitiveMessage } }),
    })))

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for founders",
      vibe: "tech",
      count: 8,
    })

    expect(result.providerAttempts[0]).toMatchObject({ status: 401, errorCode: "invalid_api_key" })
    expect(JSON.stringify(result.providerAttempts)).not.toContain(sensitiveMessage)
  })

  it("uses the Vercel AI Gateway OIDC fallback when direct providers are unavailable", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    delete process.env.OPENAI_API_KEY
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("groq.com")) {
        return { ok: false, status: 429, json: async () => ({}) }
      }
      expect(url).toBe("https://ai-gateway.vercel.sh/v1/chat/completions")
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer oidc-test-token")
      const body = JSON.parse(String(init?.body))
      expect(body.model).toBe("google/gemini-2.5-flash")
      expect(body.response_format).toBeUndefined()
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                candidates: [{
                  name: "mosaic",
                  style: "evocative",
                  sourceRoots: ["time"],
                  rationale: "Mosaic turns many scheduling pieces into one composed view, giving busy founders a calm and intelligent way to coordinate their working day.",
                }],
              }),
            },
          }],
        }),
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "evocative",
      maxChars: 10,
      count: 8,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.usedGroq).toBe(false)
    expect(result.usedOpenAI).toBe(false)
    expect(result.usedVercelGateway).toBe(true)
    expect(result.modelBacked).toBe(true)
    expect(result.provider).toBe("vercel_gateway")
    expect(result.providerAttempts).toHaveLength(3)
    expect(result.providerAttempts).toEqual(expect.arrayContaining([
      expect.objectContaining({ provider: "groq", outcome: "http_error", status: 429 }),
      expect.objectContaining({ provider: "openai", outcome: "missing_key" }),
      expect.objectContaining({ provider: "vercel_gateway", outcome: "ready" }),
    ]))
  })

  it("reserves enough time to call Gateway after a hanging primary provider", async () => {
    vi.useFakeTimers()
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "model-a"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("groq.com")) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                candidates: [{
                  name: "mosaic",
                  style: "evocative",
                  sourceRoots: ["time"],
                  rationale: "Mosaic turns many scheduling pieces into one composed view, giving busy founders a calm and intelligent way to coordinate their working day.",
                }],
              }),
            },
          }],
        }),
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "evocative",
      maxChars: 10,
      count: 8,
    })
    await vi.advanceTimersByTimeAsync(3_001)
    const result = await pending

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.provider).toBe("vercel_gateway")
    expect(result.durationMs).toBeLessThan(3_500)
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "timeout" }),
      expect.objectContaining({ provider: "vercel_gateway", outcome: "ready" }),
    ])
  })

  it("uses configured Gateway before spending the direct OpenAI fallback window", async () => {
    vi.useFakeTimers()
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.GROQ_QUICK_MODEL = "model-a"
    process.env.OPENAI_API_KEY = "openai-test-key"
    process.env.VERCEL_OIDC_TOKEN = "oidc-test-token"
    const abortedProviders: string[] = []
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("groq.com") || url.includes("api.openai.com")) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            abortedProviders.push(url)
            reject(new DOMException("Aborted", "AbortError"))
          }, { once: true })
        })
      }

      expect(url).toBe("https://ai-gateway.vercel.sh/v1/chat/completions")
      expect(init?.signal?.aborted).toBe(false)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                candidates: [{
                  name: "mosaic",
                  style: "evocative",
                  sourceRoots: ["time"],
                  rationale: "Mosaic turns many scheduling pieces into one composed view, giving busy founders a calm and intelligent way to coordinate their working day.",
                }],
              }),
            },
          }],
        }),
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "evocative",
      maxChars: 10,
      count: 8,
    })
    await vi.advanceTimersByTimeAsync(3_001)
    const result = await pending

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
      "https://ai-gateway.vercel.sh/v1/chat/completions",
    ])
    expect(abortedProviders).toEqual([
      "https://api.groq.com/openai/v1/chat/completions",
    ])
    expect(result.provider).toBe("vercel_gateway")
    expect(result.durationMs).toBeLessThan(3_500)
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "timeout" }),
      expect.objectContaining({ provider: "vercel_gateway", outcome: "ready" }),
    ])
  })

  it("keeps the first configured Groq model as the proven primary", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODELS = "model-a,model-b,model-c"
    const models: string[] = []
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      models.push(body.model)
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({
          candidates: [{
            ...autoCandidate("mosaic", "semantic_word", ["mosaic"]),
            style: "real_word",
          }],
        }) } }] }),
      }
    }))

    for (const seed of ["one", "two", "c"]) {
      await generateGroqQuickCandidates({
        description: "AI scheduling assistant for founders",
        vibe: "tech",
        style: "real_word",
        maxChars: 10,
        count: 1,
        seed,
      })
    }

    expect(models).toEqual(["model-a", "model-a", "model-a"])
  })

  it("returns a complete exact-unique 16-name batch when family caps are exhausted", async () => {
    process.env.GROQ_API_KEY = "test-key"
    mockGroqNames(["ledgerbeam", "ledgerbloom", "ledgercrest", "ledgergrove", "ledgerhaven"])

    const result = await generateGroqQuickCandidates({
      description: "privacy-first bookkeeping software for independent creative studios",
      vibe: "clean",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "complete-page-regression",
    })

    expect(result.candidates).toHaveLength(16)
    expect(new Set(result.candidates.map((candidate) => candidate.name)).size).toBe(16)
  })

  it("never pads a partial Auto provider batch with deterministic names", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const providerNames = ["timepilot", "slotbloom", "tempocrest", "meethaven", "logicbeam"]
    vi.stubGlobal("fetch", vi.fn(async () => successfulNamesResponse(providerNames)))

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "provider-first-fill-only",
    })

    expect(result.candidates).toHaveLength(16)
    expect(new Set(result.candidates.map((candidate) => candidate.name)).size).toBe(16)
    expect(result.provider).toBe("deterministic")
    expect(result.modelCandidateCount).toBe(0)
    expect(result.fallbackCandidateCount).toBe(16)
    expect(result.candidates.map((candidate) => candidate.name)).not.toEqual(expect.arrayContaining(providerNames))
    expect(result.providerAttempts[0]).toMatchObject({
      provider: "groq",
      outcome: "no_valid_names",
      parsedCandidateCount: providerNames.length,
    })
  })

  it("returns exactly sixteen for the audited wedding depletion case", async () => {
    process.env.GROQ_API_KEY = "test-key"
    mockGroqNames(["gracebank"])

    const result = await generateGroqQuickCandidates({
      description: "joyful wedding planning app for multicultural couples",
      vibe: "playful",
      style: "auto",
      creativity: "balanced",
      maxChars: 11,
      count: 16,
      seed: "model-audit:wedding-planner",
    })

    expect(result.candidates).toHaveLength(16)
    expect(new Set(result.candidates.map((candidate) => candidate.name)).size).toBe(16)
  })

  it("keeps a complete names-only provider response unique and locally explained", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const providerRationale = "PROVIDER COPY: guarantees a perfect trademark and invents a private meaning."
    const providerNames = COMPLETE_SCHEDULING_AUTO_NAMES
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ...successfulNamesResponse(providerNames),
    })))

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "provider-auto-hard-caps",
    })
    const styleCount = (style: typeof result.candidates[number]["style"]) => (
      result.candidates.filter((candidate) => candidate.style === style).length
    )
    const unevidenced = result.candidates.filter((candidate) => (
      (candidate.fitRoots?.length || 0) === 0
      && !candidate.evidence
      && !candidate.constructionParts?.length
    ))

    expect(result.provider).toBe("groq")
    expect(result.candidates).toHaveLength(16)
    expect(new Set(result.candidates.map((candidate) => candidate.name)).size).toBe(16)
    expect(new Set(result.candidates.map((candidate) => candidate.style)).size).toBeGreaterThanOrEqual(2)
    expect(styleCount("compound")).toBeLessThanOrEqual(5)
    expect(result.modelCandidateCount).toBe(16)
    expect(result.fallbackCandidateCount).toBe(0)
    expect(unevidenced.length).toBeLessThanOrEqual(12)
    expect(result.candidates.every((candidate) => !candidate.personality.includes(providerRationale))).toBe(true)
    expect(result.candidates.every((candidate) => !candidate.personality.includes("guarantees a perfect trademark"))).toBe(true)
  })

  it("does not let an all-abstract model batch occupy an Auto shortlist ahead of grounded directions", async () => {
    process.env.GROQ_API_KEY = "test-key"
    const abstractNames = [
      "alpenza",
      "montelle",
      "claravere",
      "nivoria",
      "silvaris",
      "alpinelle",
      "verdelune",
      "cristelle",
      "elevane",
      "caldria",
      "cadentra",
      "orbita",
      "clarivo",
      "lucenta",
      "balansa",
      "tomorra",
      "avelune",
      "orivane",
      "vesperia",
    ]
    mockGroqNames(abstractNames)

    const result = await generateGroqQuickCandidates({
      description: "premium alpine botanical skincare for sensitive skin",
      vibe: "premium",
      style: "auto",
      creativity: "exploratory",
      maxChars: 12,
      count: 16,
      seed: "auto-twelve-evidence-free-model-names",
    })
    const modelNames = new Set(abstractNames)
    const modelCandidates = result.candidates.filter((candidate) => modelNames.has(candidate.name))

    expect(result.modelCandidateCount).toBeLessThanOrEqual(4)
    expect(result.fallbackCandidateCount).toBeGreaterThan(0)
    expect(result.groundedCandidateCount).toBe(0)
    expect(result.exploratoryCandidateCount).toBeLessThanOrEqual(4)
    expect(modelCandidates.length).toBeLessThanOrEqual(4)
    expect(modelCandidates.every((candidate) => candidate.style === "evocative")).toBe(true)
    expect(modelCandidates.every((candidate) => (
      (candidate.fitRoots?.length || 0) === 0
      && !candidate.evidence
      && !candidate.constructionParts?.length
    ))).toBe(true)
    for (const candidate of modelCandidates) {
      expect(candidate.personality).toMatch(/sound-led|abstract/i)
      expect(candidate.personality).toMatch(/pronunciation|phonetic|cadence|rhythm/i)
      expect(candidate.personality).toMatch(/not (?:as )?evidence of a category meaning/i)
      expect(candidate.personality).not.toMatch(/\bmeans?\b|translat|etymolog|derived from|draws on|comes from|rooted in|\b(?:latin|greek|french|italian)\b/i)
    }
  })

  it("does not apply Auto's construction caps to an explicit style request", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const compoundMarkers = [
      "time|pilot",
      "slot|bloom",
      "tempo|crest",
      "meet|haven",
      "logic|beam",
      "mind|grove",
      "signal|stone",
      "pilot|loom",
    ]
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({ names: compoundMarkers }),
          },
        }],
      }),
    }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "compound",
      creativity: "balanced",
      maxChars: 12,
      count: 8,
      seed: "provider-explicit-compound",
    })
    const request = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit)?.body))
    const prompt = JSON.parse(request.messages[1].content)

    expect(result.candidates).toHaveLength(8)
    expect(result.candidates.every((candidate) => candidate.style === "compound")).toBe(true)
    expect(result.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "timepilot", constructionParts: ["time", "pilot"] }),
      expect.objectContaining({ name: "signalstone", constructionParts: ["signal", "stone"] }),
    ]))
    expect(result.candidates.every((candidate) => !/[|>]/.test(candidate.name))).toBe(true)
    expect(result.candidates.filter((candidate) => candidate.style === "compound").length).toBeGreaterThan(5)
    expect(result.styleFulfilled).toBe(true)
    expect(result.modelCandidateCount).toBe(8)
    expect(result.fallbackCandidateCount).toBe(0)
    expect(request.max_completion_tokens).toBe(1_500)
    expect(prompt.rules[0]).toBe("Return exactly 32 distinct names, strongest first; never pad with a weak option.")
    expect(prompt.outputShape).toEqual({ names: ["left|right"] })
    expect(prompt.rules.join(" ")).toContain("separator is verification metadata and is removed before display")
  })

  it("replays an explicit alternate-spelling source marker locally and never exposes it", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => successfulNamesResponse(["guard>gard"]))
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "Cybersecurity guard platform for small business data",
      vibe: "bold",
      style: "alternate_spelling",
      creativity: "balanced",
      maxChars: 10,
      count: 1,
      seed: "provider-explicit-alternate-marker",
    })
    const request = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit)?.body))
    const prompt = JSON.parse(request.messages[1].content)

    expect(result.candidates).toEqual([
      expect.objectContaining({
        name: "gard",
        style: "alternate_spelling",
      }),
    ])
    expect(result.candidates[0]?.name).not.toMatch(/[|>]/)
    expect(result.modelCandidateCount).toBe(1)
    expect(result.fallbackCandidateCount).toBe(0)
    expect(request.max_completion_tokens).toBe(1_500)
    expect(prompt.rules[0]).toBe("Return exactly 32 distinct names, strongest first; never pad with a weak option.")
    expect(prompt.outputShape).toEqual({ names: ["source>spelling"] })
    expect(prompt.rules.join(" ")).toContain("separator and source are removed before display")
  })

  it("uses the same private boundary protocol for explicit short phrases", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => successfulNamesResponse(["quiet|ledger"]))
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "A quiet ledger for families planning a monthly budget",
      vibe: "friendly",
      style: "short_phrase",
      creativity: "balanced",
      maxChars: 12,
      count: 1,
      seed: "provider-explicit-short-phrase-marker",
    })
    const request = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit)?.body))
    const prompt = JSON.parse(request.messages[1].content)

    expect(result.candidates).toEqual([
      expect.objectContaining({
        name: "quietledger",
        style: "short_phrase",
        constructionParts: ["quiet", "ledger"],
      }),
    ])
    expect(result.candidates[0]?.name).not.toMatch(/[|>]/)
    expect(prompt.outputShape).toEqual({ names: ["left|right"] })
  })

  it("rejects a truncated word even when an explicit compound marker supplies its boundary", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ names: ["budg|craft"] }) } }],
      }),
    })))

    const result = await generateGroqQuickCandidates({
      description: "family budgeting app that helps parents save and build an emergency fund",
      vibe: "friendly",
      style: "compound",
      creativity: "balanced",
      maxChars: 12,
      count: 8,
    })

    expect(result.candidates.map((candidate) => candidate.name)).not.toContain("budgcraft")
    expect(result.providerAttempts[0]).toMatchObject({
      outcome: "no_valid_names",
      parsedCandidateCount: 1,
      admittedCandidateCount: 0,
    })
  })

  it("requests one compact 32-name Auto workshop without forcing filler", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const fetchMock = vi.fn(async (url?: string, init?: RequestInit) => {
      void url
      void init
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ names: ["mosaic"] }) } }] }),
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    await generateGroqQuickCandidates({
      description: "AI scheduling assistant for founders",
      vibe: "tech",
      style: "auto",
      count: 16,
    })

    const requestInit = fetchMock.mock.calls[0]?.[1]
    expect(requestInit).toBeDefined()
    const request = JSON.parse(String(requestInit?.body))
    const prompt = JSON.parse(request.messages[1].content)
    expect(request.max_completion_tokens).toBe(1_500)
    expect(request).not.toHaveProperty("max_tokens")
    expect(prompt.rules.join(" ")).toContain("Return exactly 32 names")
    expect(JSON.stringify(request.messages).length).toBeLessThan(4_500)
    expect(request.messages[1].content).toContain("investor-ready shortlist")
    expect(request.messages[1].content).not.toContain("Prefer six")
    expect(prompt.outputShape).toEqual({ names: ["lowercase"] })
    expect(request.response_format).toEqual({ type: "json_object" })
  })

  it("keeps explicit style batches honest and flags a safe shortfall", async () => {
    process.env.GROQ_API_KEY = "test-key"
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({ names: ["time|pilot", "mosaic"] }),
          },
        }],
      }),
    })))

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for founders",
      vibe: "tech",
      style: "compound",
      count: 16,
      maxChars: 12,
    })

    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.candidates.every((candidate) => candidate.style === "compound")).toBe(true)
    expect(result.candidates.map((candidate) => candidate.name)).not.toContain("mosaic")
    expect(result.fallbackCandidateCount).toBe(0)
    expect(result.styleFulfilled).toBe(result.candidates.length === 16)
    if (!result.styleFulfilled) expect(result.styleShortfallReason).toContain("other construction families were not substituted")
  })

  it("rejects fabricated Non-English glosses and admits only reviewed locale forms", async () => {
    process.env.GROQ_API_KEY = "test-key"
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              candidates: [
                {
                  name: "sylfa",
                  style: "non_english",
                  sourceRoots: ["welsh"],
                  rationale: "Sylfa draws on sylf meaning seed, suggesting growth and sparks of curiosity between Welsh families and learners in a warm community setting.",
                },
                {
                  name: "ffermcymru",
                  style: "non_english",
                  sourceRoots: ["welsh"],
                  rationale: "Ffermcymru uses a reviewed Welsh-language construction for a farm marketplace.",
                },
              ],
            }),
          },
        }],
      }),
    })))

    const result = await generateGroqQuickCandidates({
      description: "Welsh rural learning marketplace for farming families",
      vibe: "friendly",
      style: "non_english",
      count: 4,
      maxChars: 12,
    })
    const names = result.candidates.map((candidate) => candidate.name)

    expect(names).toContain("ffermcymru")
    expect(names).not.toContain("sylfa")
    expect(names).not.toContain("brynca")
    expect(result.candidates.every((candidate) => candidate.style === "non_english")).toBe(true)
  })

  it("infers Auto compound construction locally from the v8 name surface", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    vi.stubGlobal("fetch", vi.fn(async () => successfulNamesResponse(COMPLETE_BUDGETING_AUTO_NAMES)))

    const result = await generateGroqQuickCandidates({
      description: "family budgeting app that helps parents plan savings and build an emergency fund",
      vibe: "friendly",
      style: "auto",
      count: 16,
      maxChars: 12,
    })
    const names = result.candidates.map((candidate) => candidate.name)

    expect(names).toContain("nestflow")
    expect(names).toContain("homeplan")
    expect(result.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "nestflow", style: "compound", constructionParts: ["nest", "flow"] }),
      expect.objectContaining({ name: "homeplan", style: "compound", constructionParts: ["home", "plan"] }),
    ]))
    expect(names).not.toContain("fundio")
    expect(result.modelCandidateCount).toBe(16)
    expect(result.fallbackCandidateCount).toBe(0)
  })

  it("preserves the eight-name locale reserve when a v8 Auto pool is incomplete", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    vi.stubGlobal("fetch", vi.fn(async () => successfulNamesResponse([
      "quebecsante", "carequebec", "liensante", "mosaic",
    ])))

    const result = await generateGroqQuickCandidates({
      description: "plateforme de santé pour familles rurales au Québec",
      vibe: "friendly",
      style: "auto",
      count: 16,
      maxChars: 13,
      seed: "auto-locale-style-evidence",
    })

    expect(result.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "liensante", style: "non_english" }),
    ]))
    expect(result.candidates).toHaveLength(16)
    expect(result.candidates.filter((candidate) => candidate.style === "non_english")).toHaveLength(8)
    expect(result.modelBacked).toBe(false)
    expect(result.modelCandidateCount).toBe(0)
    expect(result.fallbackCandidateCount).toBe(16)
    expect(result.candidates.map((candidate) => candidate.name)).not.toContain("carequebec")
  })

  it("never exposes model-authored rationale text", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          names: COMPLETE_SCHEDULING_AUTO_NAMES,
          // The parser must ignore untrusted prose even if an upstream model
          // mistakenly includes it beside an otherwise valid names-only payload.
          rationale: "Mosaic means perfect scheduling in Welsh and guarantees a unique trademark.",
        }) } }],
      }),
    })))

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy founders",
      vibe: "tech",
      count: 16,
      maxChars: 12,
    })

    const mosaic = result.candidates.find((candidate) => candidate.name === "mosaic")
    expect(mosaic).toBeDefined()
    expect(mosaic?.personality).not.toContain("means perfect scheduling")
    expect(mosaic?.personality).not.toContain("guarantees")
    expect(mosaic?.personality.length).toBeGreaterThanOrEqual(70)
  })

  it("rejects frozen model defects and recurring cross-niche defaults", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_QUICK_MODEL = "qwen/qwen3.6-27b"
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const blocked = [
      "purrho", "kindle", "cymur", "mentorfn", "havnlearn", "havnkind", "nabber", "sheled", "formrit",
      "meetup", "securly", "cirk", "payfil", "growtrailz", "fortify", "scopely", "buildeer", "chargi",
      "wrdswap", "textureskip", "gavelgrn", "beacon", "craftnest", "joinly", "kindred", "ledgerbook",
      "nearbond", "sanctum", "sicher", "waterpath",
      "privatemate", "thriftyoung", "purrfeline", "catfeline", "mothermama", "childparent",
      "parentcarer", "givegiving", "housemeal", "tablemeal", "tablecampus", "texturehair",
      "skipcouple", "skipgift", "skipcraft", "cartethical", "shelfethical", "craftcampus",
      "flintstone", "wiseacre", "archarc", "chillcold", "pressforge", "greenworks", "threatgrid",
    ]
    const suppliedBlocked = blocked.slice(0, 23)
    mockGroqNames([...suppliedBlocked, ...COMPLETE_SCHEDULING_AUTO_NAMES])

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 16,
      maxChars: 15,
    })
    const names = result.candidates.map((candidate) => candidate.name)

    expect(names).toContain("mosaic")
    suppliedBlocked.forEach((name) => expect(names).not.toContain(name))
    expect(result.modelCandidateCount).toBe(16)
    expect(result.fallbackCandidateCount).toBe(0)
  })

  it("aborts the active provider call and does not start a paid fallback after user cancellation", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })
    }))
    vi.stubGlobal("fetch", fetchMock)
    const controller = new AbortController()

    const pending = generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 8,
    }, controller.signal)
    controller.abort()
    const result = await pending

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.provider).toBe("deterministic")
    expect(result.fallbackReason).toBe("request_aborted")
    expect(result.durationMs).toBeLessThan(500)
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "aborted" }),
    ])
  })

  it("rechecks cancellation after listener registration to close the abort race", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    let abortedReads = 0
    const racingSignal = {
      get aborted() {
        abortedReads += 1
        return abortedReads > 1
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as AbortSignal
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      count: 8,
    }, racingSignal)

    expect(abortedReads).toBeGreaterThanOrEqual(2)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.provider).toBe("deterministic")
    expect(result.fallbackReason).toBe("request_aborted")
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({ provider: "groq", outcome: "aborted" }),
    ])
  })

  it("fails closed when a filtered Auto pool cannot complete the requested batch", async () => {
    process.env.GROQ_API_KEY = "test-key"
    mockGroqAutoCandidates([
      { name: "dogbark" },
      { name: "spotify" },
      { name: "hppywalk" },
      autoCandidate("PawNest", "visible_compound", ["paw", "nest"]),
      autoCandidate("walkmate", "visible_compound", ["walk", "mate"]),
      { name: "citypaws" },
      { name: "leashly" },
      { name: "kindwalk" },
    ])

    const result = await generateGroqQuickCandidates({
      description: "friendly dog walking app for busy city owners",
      rhymeWith: "bark",
      vibe: "friendly",
      maxChars: 10,
      count: 6,
      seed: "groq-quality",
    })

    const names = result.candidates.map((candidate) => candidate.name)

    expect(result.usedGroq).toBe(false)
    expect(result.provider).toBe("deterministic")
    expect(result.modelCandidateCount).toBe(0)
    expect(result.fallbackCandidateCount).toBe(6)
    expect(names.some((name) => name.includes("bark"))).toBe(false)
    expect(names).not.toContain("spotify")
    expect(names.some((name) => name.includes("hppy"))).toBe(false)
    expect(names.every((name) => /^[a-z0-9]+$/.test(name))).toBe(true)
  })

  it("uses deterministic fallback if Groq returns no valid names", async () => {
    process.env.GROQ_API_KEY = "test-key"
    mockGroqNames(["spotify", "slack", "hppy", "bcdfgh", "strke"])

    const result = await generateGroqQuickCandidates({
      description: "tech scheduling assistant for founders",
      rhymeWith: "spotify",
      vibe: "tech",
      maxChars: 10,
      count: 8,
      seed: "groq-empty",
    })

    expect(result.usedGroq).toBe(false)
    expect(result.fallbackReason).toBe("groq_no_valid_names")
    expect(result.candidates.length).toBeGreaterThan(0)
  })

  it("rejects weak AI typo spellings and weak near-miss candidates before returning names", async () => {
    process.env.GROQ_API_KEY = "test-key"
    mockGroqAutoCandidates([
      ...[
        "boutiqe", "scedio", "roboxion", "codebotsy", "analsec", "gptzone", "producta", "climaxes",
        "solutio", "petplus", "gamelink", "lawzen", "privio", "scheama", "luxehote", "beautyl",
        "aislate", "foundit", "stocklab",
      ].map((name) => ({ name })),
      autoCandidate("buildwise", "visible_compound", ["build", "wise"]),
    ])

    const result = await generateGroqQuickCandidates({
      description: "warehouse robotics platform for inventory builders",
      vibe: "tech",
      maxChars: 12,
      count: 6,
      seed: "weak-ai",
    })

    const names = result.candidates.map((candidate) => candidate.name)

    expect(result.modelCandidateCount).toBe(0)
    expect(result.usedGroq).toBe(false)
    expect(names).not.toContain("buildwise")
    expect(names).not.toContain("stocklab")
    expect(names).not.toContain("boutiqe")
    expect(names).not.toContain("scedio")
    expect(names).not.toContain("roboxion")
    expect(names).not.toContain("codebotsy")
    expect(names).not.toContain("analsec")
    expect(names).not.toContain("gptzone")
    expect(names).not.toContain("producta")
    expect(names).not.toContain("climaxes")
    expect(names).not.toContain("solutio")
    expect(names).not.toContain("petplus")
    expect(names).not.toContain("gamelink")
    expect(names).not.toContain("lawzen")
    expect(names).not.toContain("privio")
    expect(names).not.toContain("scheama")
    expect(names).not.toContain("luxehote")
    expect(names).not.toContain("beautyl")
    expect(names).not.toContain("aislate")
    expect(names).not.toContain("foundit")
  })

  it("rejects clipped model words even when they retain a valid niche root", async () => {
    process.env.GROQ_API_KEY = "test-key"
    mockGroqAutoCandidates([
      ...[
        "signalp", "pilotme", "guardcy", "datash", "cybers", "signald", "datadect", "careow", "signal",
      ].map((name) => ({ name })),
      autoCandidate("datathreat", "visible_compound", ["data", "threat"]),
      autoCandidate("shieldguard", "visible_compound", ["shield", "guard"], "desired_outcome"),
    ])

    const result = await generateGroqQuickCandidates({
      description: "cybersecurity analytics for enterprise threat detection teams",
      vibe: "tech",
      maxChars: 12,
      count: 8,
      seed: "model-clipping-regression",
    })
    const names = result.candidates.map((candidate) => candidate.name)

    expect(names).not.toEqual(expect.arrayContaining(["signalp", "pilotme", "guardcy", "datash", "cybers", "signald", "datadect", "careow", "signal"]))
    expect(result.provider).toBe("deterministic")
    expect(result.modelCandidateCount).toBe(0)
    expect(result.fallbackCandidateCount).toBe(8)
  })

  it("uses domain-aware fallback names when Groq is rate limited", async () => {
    process.env.GROQ_API_KEY = "test-key"
    delete process.env.OPENAI_API_KEY
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        json: async () => ({}),
      })),
    )

    const legal = await generateGroqQuickCandidates({
      description: "legal contract review assistant",
      vibe: "bold",
      maxChars: 12,
      count: 8,
      seed: "fallback-legal",
    })
    const pet = await generateGroqQuickCandidates({
      description: "dog walking app for city owners",
      vibe: "playful",
      maxChars: 13,
      count: 8,
      seed: "fallback-dog",
    })

    const legalNames = legal.candidates.map((candidate) => candidate.name)
    const petNames = pet.candidates.map((candidate) => candidate.name)

    expect(legal.usedGroq).toBe(false)
    expect(legal.fallbackReason).toBe("groq_http_429")
    expect(legalNames).toHaveLength(8)
    expect(new Set(legalNames).size).toBe(8)
    expect(legal.candidates.filter((candidate) => (
      candidate.fitRoots?.some((root) => root === "clause" || root === "brief")
      || candidate.constructionParts?.some((part) => part === "clause" || part === "brief")
    )).length).toBeGreaterThanOrEqual(2)
    expect(legalNames).not.toContain("legalmax")
    expect(legalNames).not.toContain("legalforge")

    expect(petNames.some((name) => name.startsWith("paw") || name.startsWith("walk"))).toBe(true)
    expect(petNames).not.toContain("dogpop")
    expect(petNames).not.toContain("dogbox")
  })
})
