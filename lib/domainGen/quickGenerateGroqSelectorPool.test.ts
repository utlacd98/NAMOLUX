import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  generateQuickEditorialWorkshop,
  type QuickGenerateVibe,
} from "@/lib/domainGen/quickGenerate"
import {
  generateGroqQuickCandidates,
  resetGroqQuickCooldownsForTests,
} from "@/lib/domainGen/quickGenerateGroq"

const ENV_KEYS = [
  "GROQ_API_KEY",
  "OPENAI_API_KEY",
  "AI_GATEWAY_API_KEY",
  "VERCEL_OIDC_TOKEN",
  "GROQ_QUICK_MODEL",
  "GROQ_QUICK_MODELS",
  "GROQ_QUICK_EDITOR_MODEL",
  "QUICK_GENERATE_PRIMARY_PROVIDER",
  "QUICK_GENERATE_PRIMARY_ONLY",
] as const
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

type SelectorPrompt = {
  task: string
  approvedDraftNames: string[]
  locallyPublishableCoreNames: string[]
  previouslyReviewedNames: string[]
}

const SELECTOR_CASES: ReadonlyArray<{
  id: string
  description: string
  vibe: QuickGenerateVibe
  maxChars: number
}> = [
  {
    id: "privacy",
    description: "privacy compliance SaaS for European ecommerce teams",
    vibe: "tech",
    maxChars: 11,
  },
  {
    id: "accounting",
    description: "invoice and tax accounting software for independent freelancers",
    vibe: "clean",
    maxChars: 11,
  },
  {
    id: "contract",
    description: "contract review workspace for small business legal teams",
    vibe: "clean",
    maxChars: 12,
  },
]

const SCHEDULING_INPUT = {
  description: "AI scheduling assistant for busy startup founders",
  vibe: "tech" as const,
  style: "auto" as const,
  creativity: "balanced" as const,
  maxChars: 12,
  count: 16,
  seed: "selector-boundary",
}

function readSelectorPrompt(body: Record<string, unknown>): SelectorPrompt {
  const prompt = JSON.parse(
    ((body.messages as Array<{ content: string }>)[1]?.content || "{}"),
  ) as Partial<SelectorPrompt> & { draftNames?: string[] }

  expect(prompt).not.toHaveProperty("draftNames")
  expect(prompt.approvedDraftNames).toBeDefined()
  expect(prompt.locallyPublishableCoreNames).toHaveLength(16)
  return prompt as SelectorPrompt
}

function selectorTarget(prompt: SelectorPrompt): number {
  const match = prompt.task.match(/Select exactly (\d+) approved drafts/)
  expect(match).not.toBeNull()
  return Number(match?.[1])
}

function successfulNamesResponse(names: readonly string[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ names }) } }],
    }),
  }
}

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
  process.env.GROQ_API_KEY = "selector-regression-key"
  process.env.GROQ_QUICK_MODEL = "openai/gpt-oss-120b"
  process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
  resetGroqQuickCooldownsForTests()
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  resetGroqQuickCooldownsForTests()
  vi.unstubAllGlobals()
})

describe("Quick Auto selector-pool provenance", () => {
  it("rejects an exact 16-of-32 echo of the deterministic publishable core", async () => {
    let echoedCore: string[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      const prompt = readSelectorPrompt(body)
      expect(prompt.approvedDraftNames).toHaveLength(32)
      expect(selectorTarget(prompt)).toBe(24)
      echoedCore = prompt.approvedDraftNames.slice(0, 16)
      return successfulNamesResponse(echoedCore)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      ...SCHEDULING_INPUT,
      seed: "selector-rejects-16-core-echo",
      requireEditorialReview: true,
    })

    expect(echoedCore).toHaveLength(16)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      provider: "deterministic",
      modelBacked: false,
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
      modelCandidateCount: 0,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        stage: "editorial",
        outcome: "no_valid_names",
        parsedCandidateCount: 16,
        selectionPoolCandidateCount: 32,
      }),
    ])
  })

  it("gives case, punctuation, and whitespace variants zero selector provenance", async () => {
    let approvedDraftNames: string[] = []
    let variantNames: string[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      const prompt = readSelectorPrompt(body)
      expect(prompt.approvedDraftNames).toHaveLength(32)
      approvedDraftNames = prompt.approvedDraftNames
      variantNames = approvedDraftNames.slice(0, selectorTarget(prompt)).map((name, index) => {
        if (index % 3 === 0) return name.toUpperCase()
        if (index % 3 === 1) return `${name.slice(0, 1)}-${name.slice(1)}`
        return `${name.slice(0, 1)} ${name.slice(1)}`
      })
      expect(variantNames.every((name) => !approvedDraftNames.includes(name))).toBe(true)
      return successfulNamesResponse(variantNames)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      ...SCHEDULING_INPUT,
      seed: "selector-rejects-normalised-variants",
      requireEditorialReview: true,
    })

    expect(variantNames).toHaveLength(24)
    expect(result).toMatchObject({
      provider: "deterministic",
      modelBacked: false,
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
      modelCandidateCount: 0,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        stage: "editorial",
        outcome: "no_valid_names",
        parsedCandidateCount: 24,
        admittedCandidateCount: 0,
        selectionPoolCandidateCount: 32,
      }),
    ])
  })

  it("rejects an exact 24-name response that omits even one publishable-core name", async () => {
    let selectedNames: string[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      const prompt = readSelectorPrompt(body)
      const core = new Set(prompt.locallyPublishableCoreNames)
      const reserves = prompt.approvedDraftNames.filter((name) => !core.has(name))
      selectedNames = [
        ...prompt.locallyPublishableCoreNames.slice(0, 15),
        ...reserves.slice(0, 9),
      ]
      expect(selectedNames).toHaveLength(24)
      expect(selectedNames.filter((name) => core.has(name))).toHaveLength(15)
      return successfulNamesResponse(selectedNames)
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      ...SCHEDULING_INPUT,
      seed: "selector-rejects-core-starvation",
      requireEditorialReview: true,
    })

    expect(result).toMatchObject({
      provider: "deterministic",
      modelBacked: false,
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
      modelCandidateCount: 0,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        stage: "editorial",
        outcome: "no_valid_names",
        parsedCandidateCount: 24,
        admittedCandidateCount: 0,
        selectionPoolCandidateCount: 32,
      }),
    ])
  })

  it.each(SELECTOR_CASES)(
    "keeps the exact last 24 approved $id drafts publishable as a complete reviewed shortlist",
    async ({ id, description, vibe, maxChars }) => {
      let approvedDraftNames: string[] = []
      let selectedNames: string[] = []
      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        const prompt = readSelectorPrompt(body)
        approvedDraftNames = prompt.approvedDraftNames
        expect(approvedDraftNames, id).toHaveLength(32)
        expect(selectorTarget(prompt), id).toBe(24)
        selectedNames = approvedDraftNames.slice(-24)
        expect(
          selectedNames.filter((name) => prompt.locallyPublishableCoreNames.includes(name)),
          `${id} retained publishable core`,
        ).toHaveLength(16)
        return successfulNamesResponse(selectedNames)
      })
      vi.stubGlobal("fetch", fetchMock)

      const result = await generateGroqQuickCandidates({
        description,
        vibe,
        style: "auto",
        creativity: "balanced",
        maxChars,
        count: 16,
        seed: `review-fixed:${id}`,
        requireEditorialReview: true,
      })

      expect(selectedNames, id).toHaveLength(24)
      expect(selectedNames.every((name) => approvedDraftNames.includes(name)), id).toBe(true)
      expect(result, id).toMatchObject({
        modelBacked: true,
        editoriallyReviewed: true,
        editorialCandidateCount: 16,
        modelCandidateCount: 16,
        fallbackCandidateCount: 0,
      })
      expect(result.candidates, id).toHaveLength(16)
      expect(result.candidates.every(({ name }) => selectedNames.includes(name)), id).toBe(true)
      expect(result.providerAttempts).toEqual([
        expect.objectContaining({
          stage: "editorial",
          outcome: "ready",
          parsedCandidateCount: 24,
          admittedCandidateCount: 24,
          selectionPoolCandidateCount: 32,
        }),
      ])
    },
  )
})

describe("Quick Auto selector-pool size boundaries", () => {
  it.each([
    { label: "minimum", retainedUnrestrictedDrafts: 20, expectedPoolSize: 24, expectedTarget: 20 },
    { label: "mid-range", retainedUnrestrictedDrafts: 28, expectedPoolSize: 28, expectedTarget: 24 },
  ])(
    "honours the $label selector contract for a $expectedPoolSize-name approved pool",
    async ({ retainedUnrestrictedDrafts, expectedPoolSize, expectedTarget }) => {
      const unrestrictedDraftNames = generateQuickEditorialWorkshop(SCHEDULING_INPUT)
        .editorialPool
        .map(({ name }) => name)
      const blacklist = unrestrictedDraftNames.slice(retainedUnrestrictedDrafts)
      let selectedNames: string[] = []
      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        const prompt = readSelectorPrompt(body)
        expect(prompt.approvedDraftNames).toHaveLength(expectedPoolSize)
        expect(selectorTarget(prompt)).toBe(expectedTarget)
        selectedNames = prompt.approvedDraftNames.slice(0, expectedTarget)
        return successfulNamesResponse(selectedNames)
      })
      vi.stubGlobal("fetch", fetchMock)

      const result = await generateGroqQuickCandidates({
        ...SCHEDULING_INPUT,
        blacklist,
        requireEditorialReview: true,
      })

      expect(selectedNames).toHaveLength(expectedTarget)
      expect(result).toMatchObject({
        modelBacked: true,
        editoriallyReviewed: true,
        editorialCandidateCount: 16,
        modelCandidateCount: 16,
        fallbackCandidateCount: 0,
      })
      expect(result.candidates).toHaveLength(16)
      expect(result.candidates.every(({ name }) => selectedNames.includes(name))).toBe(true)
      expect(result.providerAttempts).toEqual([
        expect.objectContaining({
          stage: "editorial",
          outcome: "ready",
          parsedCandidateCount: expectedTarget,
          admittedCandidateCount: expectedTarget,
          selectionPoolCandidateCount: expectedPoolSize,
        }),
      ])
    },
  )
})
