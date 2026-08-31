import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  subject: vi.fn(),
  burst: vi.fn(),
  quotaState: vi.fn(),
  consumeSprint: vi.fn(),
  consumeBrief: vi.fn(),
  refundSprint: vi.fn(),
  refundBrief: vi.fn(),
  emptyRefund: vi.fn(),
  parseConstitution: vi.fn(),
  parseCompiled: vi.fn(),
  compile: vi.fn(),
  run: vi.fn(),
  persistBrief: vi.fn(),
  startRun: vi.fn(),
  completeRun: vi.fn(),
  failRun: vi.fn(),
  fatigue: vi.fn(),
}))

vi.mock("@/lib/generator-lab", () => ({ getGeneratorLabApiBlockResponse: () => null }))
vi.mock("@/lib/rate-limit", () => ({
  getQuotaSubject: mocks.subject,
  checkBurstLimit: mocks.burst,
}))
vi.mock("@/lib/name-sprint/access", () => ({
  getNameSprintQuotaState: mocks.quotaState,
  consumeNameSprintQuota: mocks.consumeSprint,
  consumeNameSprintBriefQuota: mocks.consumeBrief,
  refundNameSprintQuota: mocks.refundSprint,
  refundNameSprintBriefQuota: mocks.refundBrief,
  consumeNameSprintEmptyRefundAllowance: mocks.emptyRefund,
}))
vi.mock("@/lib/name-sprint/constitution", () => ({
  parseConstitutionInput: mocks.parseConstitution,
  parseCompiledNameSprintPayload: mocks.parseCompiled,
  compileNameConstitution: mocks.compile,
}))
vi.mock("@/lib/name-sprint/engine", () => ({ runNameSprint: mocks.run }))
vi.mock("@/lib/name-sprint/openai", () => ({ getNameSprintModel: () => "gpt-5.6-luna" }))
vi.mock("@/lib/name-sprint/persistence", () => ({
  persistNameConstitution: mocks.persistBrief,
  startNameSprintRun: mocks.startRun,
  completeNameSprintRun: mocks.completeRun,
  failNameSprintRun: mocks.failRun,
  loadRecentNameSprintFatigue: mocks.fatigue,
}))

import { POST as compileBrief } from "@/app/api/lab/name-constitution/route"
import { POST as generateNames } from "@/app/api/lab/name-generation/route"

const allowedQuota = {
  allowed: true,
  replayed: false,
  plan: "free",
  used: 0,
  limit: 1,
  remaining: 1,
  resetAt: "2026-09-01T00:00:00.000Z",
  statusCode: 200,
}

function request(path: string, body: Record<string, unknown>) {
  return new NextRequest(`https://lab.namolux.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", host: "lab.namolux.com" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.subject.mockResolvedValue({ userId: "user-1", subjectType: "user", subjectHash: "a".repeat(64), plan: "free", accessState: "free" })
  mocks.burst.mockResolvedValue({ allowed: true, unavailable: false, resetAt: new Date().toISOString() })
  mocks.quotaState.mockResolvedValue(allowedQuota)
  mocks.consumeSprint.mockResolvedValue(allowedQuota)
  mocks.consumeBrief.mockResolvedValue(allowedQuota)
  mocks.emptyRefund.mockResolvedValue(allowedQuota)
  mocks.refundSprint.mockResolvedValue({ refunded: true, unavailable: false })
})

describe("Name Sprint server-side access boundary", () => {
  it("rejects an anonymous compile before any AI work", async () => {
    mocks.subject.mockResolvedValue({ userId: null, subjectType: "anonymous", subjectHash: "b".repeat(64), plan: "free", accessState: "free" })

    const response = await compileBrief(request("/api/lab/name-constitution", { description: "A sufficiently long business description for the test." }))

    expect(response.status).toBe(401)
    expect(mocks.compile).not.toHaveBeenCalled()
    expect(mocks.consumeBrief).not.toHaveBeenCalled()
  })

  it("does not run generation when the daily allowance is exhausted", async () => {
    mocks.parseCompiled.mockReturnValue({ constitution: {}, territories: [] })
    mocks.consumeSprint.mockResolvedValue({ ...allowedQuota, allowed: false, used: 1, remaining: 0, statusCode: 429 })

    const response = await generateNames(request("/api/lab/name-generation", {
      idempotencyKey: "name_sprint_01J2M9NNR3Y6J8QH4T2W7K5P0C",
    }))

    expect(response.status).toBe(429)
    expect(mocks.run).not.toHaveBeenCalled()
    expect(mocks.startRun).not.toHaveBeenCalled()
  })

  it("blocks replayed request keys before a second paid AI run", async () => {
    mocks.parseCompiled.mockReturnValue({ constitution: {}, territories: [] })
    mocks.consumeSprint.mockResolvedValue({ ...allowedQuota, replayed: true })

    const response = await generateNames(request("/api/lab/name-generation", {
      idempotencyKey: "name_sprint_01J2M9NNR3Y6J8QH4T2W7K5P0C",
    }))

    expect(response.status).toBe(409)
    expect(mocks.run).not.toHaveBeenCalled()
    expect(mocks.startRun).not.toHaveBeenCalled()
  })

  it("refunds one completed zero-result run through the daily empty-result allowance", async () => {
    mocks.parseCompiled.mockReturnValue({ constitution: {}, territories: [] })
    mocks.persistBrief.mockResolvedValue("brief-1")
    mocks.startRun.mockResolvedValue("run-1")
    mocks.fatigue.mockResolvedValue({ previouslySeen: [], recentRootFrequency: {} })
    mocks.run.mockResolvedValue({
      version: "2026.08.31.4",
      founderSignalVersion: "2.0",
      registryVersion: "test",
      generatedCount: 10,
      survivorCount: 0,
      candidates: [],
      rejected: [],
      territories: [],
      attempts: 2,
      timingMs: { generation: 1, screening: 1, judgeAndEvidence: 1, total: 3 },
      usage: { model: "gpt-5.6-luna", inputTokens: 10, outputTokens: 10, estimatedUsd: 0.001, webSearchCalls: 0 },
    })

    const response = await generateNames(request("/api/lab/name-generation", {
      idempotencyKey: "name_sprint_01J2M9NNR3Y6J8QH4T2W7K5P0C",
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.emptyResultRefunded).toBe(true)
    expect(body.retryAllowed).toBe(true)
    expect(mocks.emptyRefund).toHaveBeenCalledOnce()
    expect(mocks.refundSprint).toHaveBeenCalledOnce()
  })
})
