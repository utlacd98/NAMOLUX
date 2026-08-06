import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
  "OPENAI_QUICK_MODEL",
  "AI_GATEWAY_QUICK_MODEL",
  "VERCEL",
  "QUICK_GENERATE_PRIMARY_PROVIDER",
  "QUICK_GENERATE_PRIMARY_ONLY",
] as const
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
const SELECTOR_PRIVATE_POOL_SIZE = 32
const SELECTOR_TARGET_SIZE = 24
const SELECTOR_MINIMUM_OMISSION_COUNT = 4

type SelectorPrompt = {
  approvedDraftNames: string[]
  previouslyReviewedNames: string[]
  task: string
  rules: string[]
}

function expectMeaningfulPoolSelectorPrompt(prompt: SelectorPrompt) {
  expect(prompt.approvedDraftNames).toHaveLength(SELECTOR_PRIVATE_POOL_SIZE)
  expect(prompt.task).toContain(`Select exactly ${SELECTOR_TARGET_SIZE} approved drafts`)
  expect(prompt.rules).toContain(
    `Choose exactly ${SELECTOR_TARGET_SIZE} different names from the full approvedDraftNames pool; omit at least ${SELECTOR_MINIMUM_OMISSION_COUNT} weaker alternatives.`,
  )
}

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
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
  vi.useRealTimers()
})

describe("Quick Auto editorial transport recovery", () => {
  it("times out a hanging 20B selector and starts the configured Gateway selector inside the shared deadline", async () => {
    vi.useFakeTimers()
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.AI_GATEWAY_API_KEY = "gateway-test-key"
    const requests: Array<{ model: string; prompt: SelectorPrompt }> = []
    let approvedDraftNames: string[] = []
    let selectedDraftNames: string[] = []

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string
        messages: Array<{ content: string }>
      }
      const prompt = JSON.parse(body.messages[1]?.content || "{}") as SelectorPrompt
      requests.push({ model: body.model, prompt })

      if (body.model === "openai/gpt-oss-20b") {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          )
        })
      }

      expect(body.model).toBe("google/gemini-2.5-flash")
      approvedDraftNames = prompt.approvedDraftNames
      expectMeaningfulPoolSelectorPrompt(prompt)
      selectedDraftNames = approvedDraftNames.slice(0, SELECTOR_TARGET_SIZE)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({ names: selectedDraftNames }),
            },
          }],
        }),
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
      seed: "secondary-exact-recovery",
      requireEditorialReview: true,
    })
    await vi.advanceTimersByTimeAsync(2_101)
    const result = await pending

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requests.map(({ model }) => model)).toEqual([
      "openai/gpt-oss-20b",
      "google/gemini-2.5-flash",
    ])
    expect(result).toMatchObject({
      provider: "vercel_gateway",
      model: "google/gemini-2.5-flash",
      modelBacked: true,
      editoriallyReviewed: true,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
    })
    expect(result.candidates).toHaveLength(16)
    expect(new Set(result.candidates.map(({ name }) => name)).size).toBe(16)
    expect(result.candidates.every(({ name }) => approvedDraftNames.includes(name))).toBe(true)
    expect(selectedDraftNames).toHaveLength(SELECTOR_TARGET_SIZE)
    expect(approvedDraftNames.length - selectedDraftNames.length).toBeGreaterThanOrEqual(
      SELECTOR_MINIMUM_OMISSION_COUNT,
    )
    expect(result.durationMs).toBeGreaterThanOrEqual(2_100)
    expect(result.durationMs).toBeLessThan(7_400)
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        model: "openai/gpt-oss-20b",
        stage: "editorial",
        outcome: "timeout",
      }),
      expect.objectContaining({
        provider: "vercel_gateway",
        model: "google/gemini-2.5-flash",
        stage: "editorial",
        outcome: "ready",
        admittedCandidateCount: SELECTOR_TARGET_SIZE,
        selectionPoolCandidateCount: SELECTOR_PRIVATE_POOL_SIZE,
      }),
    ])
    expect(result.providerAttempts.at(-1)?.selectionPoolCandidateCount).toBe(SELECTOR_PRIVATE_POOL_SIZE)
  })

  it("recovers from a fast Gateway failure through an exact Qwen selection without partial provenance", async () => {
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.AI_GATEWAY_API_KEY = "gateway-test-key"
    const requestedModels: string[] = []
    const selectionPrompts: Array<{
      model: string
      prompt: SelectorPrompt
    }> = []
    let invalidPartialNames: string[] = []
    let qwenSelectedNames: string[] = []

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string
        messages: Array<{ content: string }>
      }
      requestedModels.push(body.model)
      if (body.model === "google/gemini-2.5-flash") {
        return {
          ok: false,
          status: 503,
          headers: { get: () => null },
          json: async () => ({ error: { type: "server_error" } }),
        }
      }

      const prompt = JSON.parse(body.messages[1]?.content || "{}") as SelectorPrompt
      selectionPrompts.push({ model: body.model, prompt })
      expectMeaningfulPoolSelectorPrompt(prompt)
      if (body.model === "qwen/qwen3.6-27b") {
        qwenSelectedNames = prompt.approvedDraftNames.slice(0, SELECTOR_TARGET_SIZE)
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({ names: qwenSelectedNames }),
              },
            }],
          }),
        }
      }

      expect(body.model).toBe("openai/gpt-oss-20b")
      invalidPartialNames = prompt.approvedDraftNames.slice(0, 12)
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                names: [
                  ...invalidPartialNames,
                  "invented0a",
                  "invented0b",
                  "invented0c",
                  "invented0d",
                  "invented0e",
                  "invented0f",
                  "invented0g",
                  "invented0h",
                  "invented0i",
                  "invented0j",
                  "invented0k",
                  "invented0l",
                ],
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
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "partial-selector-union",
      requireEditorialReview: true,
    })

    expect(requestedModels).toEqual([
      "openai/gpt-oss-20b",
      "google/gemini-2.5-flash",
      "qwen/qwen3.6-27b",
    ])
    expect(selectionPrompts.map(({ model }) => model)).toEqual([
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
    ])
    expect(selectionPrompts[0]?.prompt.previouslyReviewedNames).toEqual([])
    expect(selectionPrompts[1]?.prompt.previouslyReviewedNames).toEqual([])
    expect(selectionPrompts[1]?.prompt.approvedDraftNames).toEqual(
      selectionPrompts[0]?.prompt.approvedDraftNames,
    )
    expect(result).toMatchObject({
      provider: "groq",
      model: "qwen/qwen3.6-27b",
      modelBacked: true,
      editoriallyReviewed: true,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
    })
    expect(result.candidates).toHaveLength(16)
    expect(invalidPartialNames).toHaveLength(12)
    expect(qwenSelectedNames).toHaveLength(SELECTOR_TARGET_SIZE)
    expect(result.candidates.every(({ name }) => qwenSelectedNames.includes(name))).toBe(true)

    expect(result.providerAttempts.map(({ model, outcome }) => ({ model, outcome }))).toEqual([
      { model: "openai/gpt-oss-20b", outcome: "no_valid_names" },
      { model: "google/gemini-2.5-flash", outcome: "http_error" },
      { model: "qwen/qwen3.6-27b", outcome: "ready" },
    ])
    const selectorAttempts = result.providerAttempts.filter(
      ({ selectionPoolCandidateCount }) => selectionPoolCandidateCount !== undefined,
    )
    expect(selectorAttempts).toEqual([
      expect.objectContaining({
        model: "openai/gpt-oss-20b",
        outcome: "no_valid_names",
        parsedCandidateCount: SELECTOR_TARGET_SIZE,
        admittedCandidateCount: 0,
        selectionPoolCandidateCount: SELECTOR_PRIVATE_POOL_SIZE,
      }),
      expect.objectContaining({
        model: "qwen/qwen3.6-27b",
        outcome: "ready",
        parsedCandidateCount: SELECTOR_TARGET_SIZE,
        admittedCandidateCount: SELECTOR_TARGET_SIZE,
        selectionPoolCandidateCount: SELECTOR_PRIVATE_POOL_SIZE,
      }),
    ])
    expect(selectorAttempts.every(
      ({ selectionPoolCandidateCount }) => selectionPoolCandidateCount === SELECTOR_PRIVATE_POOL_SIZE,
    )).toBe(true)
  })

  it("uses the final OpenAI selector inside the shared deadline after both earlier Groq selectors time out", async () => {
    vi.useFakeTimers()
    process.env.GROQ_API_KEY = "groq-test-key"
    process.env.OPENAI_API_KEY = "openai-test-key"
    const requests: string[] = []
    let approvedDraftNames: string[] = []
    let selectedDraftNames: string[] = []

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string
        messages: Array<{ content: string }>
      }
      requests.push(body.model)
      if (body.model === "openai/gpt-oss-20b" || body.model === "qwen/qwen3.6-27b") {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          )
        })
      }

      expect(body.model).toBe("gpt-4.1-mini")
      const prompt = JSON.parse(body.messages[1]?.content || "{}") as SelectorPrompt
      approvedDraftNames = prompt.approvedDraftNames
      expectMeaningfulPoolSelectorPrompt(prompt)
      selectedDraftNames = prompt.approvedDraftNames.slice(0, SELECTOR_TARGET_SIZE)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({ names: selectedDraftNames }),
            },
          }],
        }),
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
      seed: "secondary-exact-recovery",
      requireEditorialReview: true,
    })
    await vi.advanceTimersByTimeAsync(3_802)
    const result = await pending

    expect(requests).toEqual([
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
      "gpt-4.1-mini",
    ])
    expect(result).toMatchObject({
      provider: "openai",
      model: "gpt-4.1-mini",
      modelBacked: true,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
      fallbackCandidateCount: 0,
    })
    expect(result.candidates).toHaveLength(16)
    expect(result.candidates.every(({ name }) => approvedDraftNames.includes(name))).toBe(true)
    expect(selectedDraftNames).toHaveLength(SELECTOR_TARGET_SIZE)
    expect(approvedDraftNames.length - selectedDraftNames.length).toBeGreaterThanOrEqual(
      SELECTOR_MINIMUM_OMISSION_COUNT,
    )
    expect(result.durationMs).toBeLessThan(7_400)
    expect(result.providerAttempts).toEqual(expect.arrayContaining([
      expect.objectContaining({ model: "openai/gpt-oss-20b", outcome: "timeout" }),
      expect.objectContaining({ model: "qwen/qwen3.6-27b", outcome: "timeout" }),
      expect.objectContaining({
        provider: "openai",
        outcome: "ready",
        admittedCandidateCount: SELECTOR_TARGET_SIZE,
        selectionPoolCandidateCount: SELECTOR_PRIVATE_POOL_SIZE,
      }),
    ]))
    expect(result.providerAttempts.at(-1)?.selectionPoolCandidateCount).toBe(SELECTOR_PRIVATE_POOL_SIZE)
  })
})
