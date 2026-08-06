import { describe, expect, it } from "vitest"
import { getOrCreateSessionId } from "@/lib/analytics"
import { sanitizeAnalyticsPath, sanitizeAnalyticsReferrer, sanitizeMetricMetadata } from "@/lib/metrics"

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
    values,
  }
}

describe("analytics sessions", () => {
  it("reuses one site-wide session while activity is within 30 minutes", () => {
    const storage = memoryStorage()
    const first = getOrCreateSessionId(storage, 1_000_000)
    const second = getOrCreateSessionId(storage, 1_000_000 + 29 * 60_000)

    expect(first).toMatch(/^s_/)
    expect(second).toBe(first)
    expect(storage.values.get("namo_session_created")).toBe(String(1_000_000 + 29 * 60_000))
  })

  it("rotates the session after 30 minutes of inactivity", () => {
    const storage = memoryStorage({
      namo_session_id: "s_previous_session",
      namo_session_created: "1000000",
    })

    const next = getOrCreateSessionId(storage, 1_000_000 + 30 * 60_000 + 1)
    expect(next).not.toBe("s_previous_session")
    expect(next).toMatch(/^s_/)
  })
})

describe("analytics privacy boundary", () => {
  it("keeps only approved dimensions and decision values", () => {
    expect(sanitizeMetricMetadata({
      source: "article",
      contentSlug: "fintech-naming-guide",
      topic: "Fintech naming",
      ctaId: "article-mini-generator",
      device: "mobile",
      experiment: "activation-v1",
      decisionAction: "register",
      prompt: "private user brief",
      email: "person@example.com",
      domain: "private-name.com",
      userId: "secret-id",
    })).toEqual({
      source: "article",
      contentSlug: "fintech-naming-guide",
      topic: "Fintech naming",
      ctaId: "article-mini-generator",
      device: "mobile",
      experiment: "activation-v1",
      decisionAction: "register",
    })
  })

  it("rejects invalid controlled values and strips query strings", () => {
    expect(sanitizeMetricMetadata({ device: "television", decisionAction: "purchase" })).toBeUndefined()
    expect(sanitizeAnalyticsPath("https://example.com/blog/guide?email=person@example.com#private"))
      .toBe("/blog/guide")
    expect(sanitizeAnalyticsReferrer("https://google.com/search?q=private#result")).toBe("google.com/search")
  })

  it("keeps only bounded operational generator telemetry", () => {
    expect(sanitizeMetricMetadata({
      mode: "quick",
      style: "evocative",
      creativity: "balanced",
      provider: "openai",
      model: "gpt-4.1-mini",
      resultCount: 16,
      modelCandidateCount: 11,
      fallbackCandidateCount: 5,
      fallbackRatio: 0.3125,
      providerAttemptCount: 2,
      timeToNamesMs: 6421,
      inputTokens: 1450,
      outputTokens: 830,
      rawBrief: "private product idea",
      generatedName: "private-name",
      excessiveLatency: 9999999,
    })).toEqual({
      mode: "quick",
      style: "evocative",
      creativity: "balanced",
      provider: "openai",
      model: "gpt-4.1-mini",
      resultCount: "16",
      modelCandidateCount: "11",
      fallbackCandidateCount: "5",
      fallbackRatio: "0.3125",
      providerAttemptCount: "2",
      timeToNamesMs: "6421",
      inputTokens: "1450",
      outputTokens: "830",
    })
  })
})
