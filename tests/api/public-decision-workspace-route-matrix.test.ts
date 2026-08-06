import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => {
  class QuotaSubjectUnavailableError extends Error {}

  return {
    QuotaSubjectUnavailableError,
    decisionWorkspaceEnabled: vi.fn(),
    findJob: vi.fn(),
    createJob: vi.fn(),
    enqueueJob: vi.fn(),
    getIdempotencyKey: vi.fn(),
    processJob: vi.fn(),
    queueAvailable: vi.fn(),
    readJob: vi.fn(),
    burst: vi.fn(),
    consumeQuota: vi.fn(),
    replayQuota: vi.fn(),
    preflightQuota: vi.fn(),
    quotaSubject: vi.fn(),
    scoreName: vi.fn(),
  }
})

vi.mock("server-only", () => ({}))

vi.mock("@/lib/decision-workspace", () => ({
  isDecisionWorkspaceEnabled: mocks.decisionWorkspaceEnabled,
}))

vi.mock("@/lib/bulk-checks", () => {
  const supportedTlds = ["com", "io", "co", "ai", "app", "dev"] as const

  class BulkCheckInputError extends Error {}
  class BulkCheckIdempotencyConflictError extends Error {}

  function normaliseName(value: unknown): string | null {
    if (typeof value !== "string") return null
    const name = value.trim().toLowerCase()
    if (name.length < 1 || name.length > 63) return null
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name) ? name : null
  }

  function normaliseTld(value: unknown): string | null {
    if (typeof value !== "string") return null
    const tld = value.trim().toLowerCase().replace(/^\./, "")
    return (supportedTlds as readonly string[]).includes(tld) ? tld : null
  }

  function parseBulkCheckInput(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new BulkCheckInputError("Provide a list of candidate names.")
    }
    const payload = body as Record<string, unknown>
    const namesValue = payload.names ?? payload.domains
    const rawNames = Array.isArray(namesValue)
      ? namesValue
      : typeof namesValue === "string"
        ? namesValue.split(/[\n,]/g)
        : null
    if (!rawNames || rawNames.length < 1 || rawNames.length > 50) {
      throw new BulkCheckInputError("Provide between 1 and 50 candidate names.")
    }
    const names = rawNames.map(normaliseName)
    if (names.some((name) => !name)) {
      throw new BulkCheckInputError("Each name must be a valid domain label.")
    }
    const rawTlds = payload.tlds === undefined ? [...supportedTlds] : payload.tlds
    if (!Array.isArray(rawTlds) || rawTlds.length < 1 || rawTlds.length > supportedTlds.length) {
      throw new BulkCheckInputError("Choose between one and six supported extensions.")
    }
    const parsedTlds = rawTlds.map(normaliseTld)
    if (parsedTlds.some((tld) => !tld)) {
      throw new BulkCheckInputError("Use only .com, .io, .co, .ai, .app, or .dev.")
    }
    const selected = new Set(parsedTlds as string[])
    return {
      names: Array.from(new Set(names as string[])),
      tlds: supportedTlds.filter((tld) => selected.has(tld)),
    }
  }

  function getBulkCheckIdempotencyKey(request: Request, body: unknown) {
    const headerKey = request.headers.get("idempotency-key")?.trim()
    const bodyKey = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).idempotencyKey
      : null
    const key = headerKey || (typeof bodyKey === "string" ? bodyKey.trim() : "")
    if (!/^[a-zA-Z0-9._:-]{16,200}$/.test(key)) {
      throw new BulkCheckInputError("A valid idempotency key is required.")
    }
    return mocks.getIdempotencyKey(key)
  }

  return {
    BULK_CHECK_FEATURE: "bulk-check-monthly",
    BulkCheckInputError,
    BulkCheckIdempotencyConflictError,
    parseBulkCheckInput,
    findBulkCheckJobByIdempotency: mocks.findJob,
    createOrGetBulkCheckJob: mocks.createJob,
    enqueueBulkCheckJob: mocks.enqueueJob,
    getBulkCheckIdempotencyKey,
    processBulkCheckJob: mocks.processJob,
    queueIsAvailable: mocks.queueAvailable,
    readBulkCheckJob: mocks.readJob,
  }
})

vi.mock("@/lib/rate-limit", () => ({
  QuotaSubjectUnavailableError: mocks.QuotaSubjectUnavailableError,
  checkBurstLimit: mocks.burst,
  checkPlanFeatureQuotaIdempotentForSubject: mocks.consumeQuota,
  getPlanFeatureQuotaReplayStateForSubject: mocks.replayQuota,
  getPlanFeatureQuotaStateForSubject: mocks.preflightQuota,
  getQuotaSubject: mocks.quotaSubject,
}))

vi.mock("@/lib/founderSignal/scoreName", () => ({
  scoreName: mocks.scoreName,
}))

import { POST as postBulkCheck } from "@/app/api/bulk-checks/route"
import { POST as postFounderSignal } from "@/app/api/founder-signal/shortlist/route"

type AuthState = "guest" | "signed"
type EntitlementState = "free" | "pro" | "paid_alias" | "legacy_lifetime"
type NameCount = 1 | 10 | 50 | 51
type TldSelection = "valid" | "mixed" | "all" | "invalid"
type AvailabilityOutcome = "available" | "taken" | "needs_verification" | "partial" | "provider_failure"
type QuotaState = "available" | "exhausted" | "unavailable"

type MatrixCase = {
  id: number
  auth: AuthState
  entitlement: EntitlementState
  nameCount: NameCount
  tldSelection: TldSelection
  availabilityOutcome: AvailabilityOutcome
  quotaState: QuotaState
}

const AUTH_STATES: AuthState[] = ["guest", "signed"]
const ENTITLEMENT_STATES: EntitlementState[] = ["free", "pro", "paid_alias", "legacy_lifetime"]
const NAME_COUNTS: NameCount[] = [1, 10, 50, 51]
const TLD_SELECTIONS: TldSelection[] = ["valid", "mixed", "all", "invalid"]
const AVAILABILITY_OUTCOMES: AvailabilityOutcome[] = [
  "available",
  "taken",
  "needs_verification",
  "partial",
  "provider_failure",
]
const QUOTA_STATES: QuotaState[] = ["available", "exhausted", "unavailable"]

const MATRIX: MatrixCase[] = []
let matrixId = 0
for (const auth of AUTH_STATES) {
  for (const entitlement of ENTITLEMENT_STATES) {
    for (const nameCount of NAME_COUNTS) {
      for (const tldSelection of TLD_SELECTIONS) {
        for (const availabilityOutcome of AVAILABILITY_OUTCOMES) {
          for (const quotaState of QUOTA_STATES) {
            matrixId += 1
            MATRIX.push({
              id: matrixId,
              auth,
              entitlement,
              nameCount,
              tldSelection,
              availabilityOutcome,
              quotaState,
            })
          }
        }
      }
    }
  }
}

function candidateNames(count: number) {
  return Array.from({ length: count }, (_, index) => "candidate" + String(index + 1))
}

function selectedTlds(selection: TldSelection): string[] {
  if (selection === "valid") return ["com"]
  if (selection === "mixed") return [".DEV", "com", "ai"]
  if (selection === "all") return ["com", "io", "co", "ai", "app", "dev"]
  return ["com", "not-a-tld"]
}

function primaryTld(selection: TldSelection): string {
  if (selection === "mixed") return ".dev"
  if (selection === "invalid") return "not-a-tld"
  return "com"
}

function effectivePlan(input: MatrixCase): "free" | "pro" {
  // A browser session cannot inherit paid access merely from a client claim.
  // paid and lifetime names exercise the server-normalised Pro path only for
  // authenticated accounts.
  if (input.auth === "guest" || input.entitlement === "free") return "free"
  return "pro"
}

function subjectFor(input: MatrixCase) {
  const plan = effectivePlan(input)
  return {
    userId: input.auth === "signed" ? "matrix-user-" + String(input.id) : null,
    subjectType: input.auth === "signed" ? "user" : "anonymous",
    subjectHash: String(input.id).padStart(64, "a").slice(-64),
    plan,
    accessState: plan === "pro" ? "active" : "free",
  }
}

function quotaResult(plan: "free" | "pro", state: QuotaState, feature: string, consumed = false) {
  const limit = plan === "pro" ? 120 : feature === "bulk-check-monthly" ? 3 : 1
  const used = state === "available"
    ? consumed
      ? limit
      : Math.max(0, limit - 1)
    : limit
  return {
    allowed: state === "available",
    replayed: false,
    receiptCreatedAt: null,
    isPro: plan === "pro",
    userId: null,
    plan,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: "2026-09-01T00:00:00.000Z",
    statusCode: state === "available" ? 200 : state === "exhausted" ? 429 : 503,
    message: state === "available" ? undefined : state === "exhausted"
      ? "This month's workspace allowance has been used."
      : "Usage checks are temporarily unavailable. Please try again shortly.",
  }
}

function snapshotFor(input: MatrixCase, names: string[]) {
  const firstName = names[0] || "candidate1"
  const tld = input.tldSelection === "mixed" ? "dev" : "com"
  const tlds = input.tldSelection === "all"
    ? ["com", "io", "co", "ai", "app", "dev"]
    : input.tldSelection === "mixed"
      ? ["com", "ai", "dev"]
      : ["com"]
  const totalChecks = names.length * tlds.length
  const base = {
    id: "11111111-1111-4111-8111-111111111111",
    names,
    tlds,
    totalChecks,
    providerChecks: totalChecks,
    cachedChecks: 0,
    quotaCharged: true,
    quotaRefunded: false,
    queuedAt: "2026-08-01T00:00:00.000Z",
    startedAt: "2026-08-01T00:00:01.000Z",
    completedAt: "2026-08-01T00:00:02.000Z",
    errorCode: null,
    errorMessage: null,
  }
  if (input.availabilityOutcome === "available") {
    return {
      ...base,
      status: "completed",
      providerFailures: 0,
      results: [{
        name: firstName,
        tld,
        fullDomain: firstName + "." + tld,
        status: "available",
        available: true,
        confidence: "high",
        provider: "mock",
        checkedAt: base.completedAt,
        fromCache: false,
        verificationRequired: false,
      }],
    }
  }
  if (input.availabilityOutcome === "taken") {
    return {
      ...base,
      status: "completed",
      providerFailures: 0,
      results: [{
        name: firstName,
        tld,
        fullDomain: firstName + "." + tld,
        status: "taken",
        available: false,
        confidence: "high",
        provider: "mock",
        checkedAt: base.completedAt,
        fromCache: false,
        verificationRequired: false,
      }],
    }
  }
  if (input.availabilityOutcome === "needs_verification") {
    return {
      ...base,
      status: "partial",
      providerFailures: 1,
      results: [{
        name: firstName,
        tld,
        fullDomain: firstName + "." + tld,
        status: "needs_verification",
        available: null,
        confidence: "low",
        provider: "mock",
        checkedAt: base.completedAt,
        fromCache: false,
        verificationRequired: true,
      }],
    }
  }
  if (input.availabilityOutcome === "partial") {
    return {
      ...base,
      status: "partial",
      providerFailures: 1,
      results: [{
        name: firstName,
        tld,
        fullDomain: firstName + "." + tld,
        status: "available",
        available: true,
        confidence: "high",
        provider: "mock",
        checkedAt: base.completedAt,
        fromCache: false,
        verificationRequired: false,
      }, {
        name: firstName,
        tld: "io",
        fullDomain: firstName + ".io",
        status: "needs_verification",
        available: null,
        confidence: "low",
        provider: "mock",
        checkedAt: base.completedAt,
        fromCache: false,
        verificationRequired: true,
      }],
    }
  }
  return {
    ...base,
    status: "failed",
    providerFailures: names.length,
    quotaRefunded: true,
    errorCode: "providers_unavailable",
    errorMessage: "Every provider check failed, so this run was not charged.",
    results: [],
  }
}

function requestForBulk(input: MatrixCase, names: string[]) {
  return new NextRequest("https://www.namolux.com/api/bulk-checks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      names,
      tlds: selectedTlds(input.tldSelection),
      idempotencyKey: "matrix-idempotency-" + String(input.id).padStart(4, "0"),
    }),
  })
}

function requestForFounderSignal(input: MatrixCase, names: string[]) {
  return new NextRequest("https://www.namolux.com/api/founder-signal/shortlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      names,
      primaryTld: primaryTld(input.tldSelection),
    }),
  })
}

function expectedAccepted(input: MatrixCase): boolean {
  return input.nameCount <= 50 && input.tldSelection !== "invalid"
}

function configureMocks(input: MatrixCase, names: string[]) {
  const subject = subjectFor(input)
  const snapshot = snapshotFor(input, names)

  mocks.decisionWorkspaceEnabled.mockReturnValue(true)
  mocks.getIdempotencyKey.mockReturnValue("matrix-idempotency-" + String(input.id).padStart(4, "0"))
  mocks.findJob.mockResolvedValue(null)
  mocks.createJob.mockResolvedValue({
    created: true,
    job: { id: snapshot.id, status: "queued" },
    guestAccessToken: input.auth === "guest" ? "b".repeat(64) : null,
  })
  mocks.queueAvailable.mockReturnValue(false)
  mocks.processJob.mockResolvedValue("processed")
  mocks.readJob.mockResolvedValue(snapshot)
  mocks.enqueueJob.mockResolvedValue({ queued: true, messageId: "queue-message" })
  mocks.burst.mockResolvedValue({
    allowed: true,
    resetAt: "2026-08-01T00:01:00.000Z",
    unavailable: false,
  })
  mocks.quotaSubject.mockResolvedValue(subject)
  mocks.replayQuota.mockResolvedValue({
    replayed: false,
    unavailable: input.quotaState === "unavailable",
  })
  mocks.preflightQuota.mockImplementation(async (_subject: unknown, feature: string) => {
    return quotaResult(subject.plan, input.quotaState, feature)
  })
  mocks.consumeQuota.mockImplementation(async (_subject: unknown, feature: string) => {
    return quotaResult(subject.plan, input.quotaState, feature, true)
  })
  mocks.scoreName.mockReturnValue({
    score: 86,
    band: "Strong",
    version: "matrix-v1",
    reasons: ["Mocked server score"],
    rawScores: {
      length: 90,
      clarity: 84,
      pronounceability: 82,
      memorability: 78,
      extension: 100,
      characterQuality: 92,
      brandRisk: 76,
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("public decision-workspace generated route matrix", () => {
  it("generates the promised 1,920 route-contract combinations", () => {
    expect(MATRIX).toHaveLength(1920)
  })

  it.each(MATRIX)(
    "$id $auth $entitlement $nameCount names $tldSelection $availabilityOutcome $quotaState",
    async (input) => {
      const names = candidateNames(input.nameCount)
      configureMocks(input, names)
      const accepted = expectedAccepted(input)
      const subject = subjectFor(input)

      const bulkResponse = await postBulkCheck(requestForBulk(input, names))
      const founderSignalResponse = await postFounderSignal(requestForFounderSignal(input, names))

      if (!accepted) {
        expect(bulkResponse.status).toBe(400)
        expect(founderSignalResponse.status).toBe(400)
        expect(mocks.burst).not.toHaveBeenCalled()
        expect(mocks.findJob).not.toHaveBeenCalled()
        expect(mocks.createJob).not.toHaveBeenCalled()
        expect(mocks.processJob).not.toHaveBeenCalled()
        expect(mocks.scoreName).not.toHaveBeenCalled()
        expect(mocks.consumeQuota).not.toHaveBeenCalled()
        return
      }

      if (input.quotaState === "unavailable") {
        expect(bulkResponse.status).toBe(503)
        expect(founderSignalResponse.status).toBe(503)
        expect(mocks.createJob).not.toHaveBeenCalled()
        expect(mocks.processJob).not.toHaveBeenCalled()
        expect(mocks.scoreName).not.toHaveBeenCalled()
        expect(mocks.consumeQuota).not.toHaveBeenCalled()
        return
      }

      if (input.quotaState === "exhausted") {
        expect(bulkResponse.status).toBe(429)
        expect(founderSignalResponse.status).toBe(429)
        expect(mocks.createJob).not.toHaveBeenCalled()
        expect(mocks.processJob).not.toHaveBeenCalled()
        expect(mocks.scoreName).not.toHaveBeenCalled()
        expect(mocks.consumeQuota).not.toHaveBeenCalled()
        return
      }

      expect(bulkResponse.status).toBe(202)
      expect(founderSignalResponse.status).toBe(200)
      const bulkPayload = await bulkResponse.json()
      const signalPayload = await founderSignalResponse.json()
      const expectedSnapshot = snapshotFor(input, names)
      expect(bulkPayload.job.status).toBe(expectedSnapshot.status)
      expect(bulkPayload.job.totalChecks).toBe(input.nameCount * expectedSnapshot.tlds.length)
      expect(signalPayload.results).toHaveLength(input.nameCount)
      expect(mocks.processJob).toHaveBeenCalledTimes(1)
      expect(mocks.scoreName).toHaveBeenCalledTimes(input.nameCount)
      expect(mocks.createJob).toHaveBeenCalledWith(expect.objectContaining({
        requestInput: {
          names,
          tlds: expectedSnapshot.tlds,
        },
      }))
      expect(mocks.preflightQuota).toHaveBeenCalledWith(
        expect.objectContaining({ plan: subject.plan }),
        "bulk-check-monthly",
        { free: 3, pro: 120 },
      )
      expect(mocks.preflightQuota).toHaveBeenCalledWith(
        expect.objectContaining({ plan: subject.plan }),
        "founder-signal-batch-monthly",
        { free: 1, pro: 120 },
      )
      expect(mocks.consumeQuota).toHaveBeenCalledWith(
        expect.objectContaining({ plan: subject.plan }),
        "founder-signal-batch-monthly",
        { free: 1, pro: 120 },
        expect.stringMatching(/^[a-f0-9]{64}$/),
      )

      if (subject.plan === "pro") {
        expect(signalPayload.allowance).toMatchObject({ limit: 120, used: 120, remaining: 0 })
      } else {
        expect(signalPayload.allowance.limit).toBe(1)
      }
    },
  )

  it("fails closed for a signed-in entitlement lookup outage before job creation or scoring", async () => {
    const input = MATRIX.find((candidate) => (
      candidate.auth === "signed"
      && candidate.entitlement === "paid_alias"
      && candidate.nameCount === 1
      && candidate.tldSelection === "valid"
      && candidate.availabilityOutcome === "available"
      && candidate.quotaState === "available"
    ))
    expect(input).toBeDefined()

    const resolvedInput = input as MatrixCase
    const names = candidateNames(resolvedInput.nameCount)
    configureMocks(resolvedInput, names)
    mocks.quotaSubject.mockRejectedValue(new mocks.QuotaSubjectUnavailableError("Entitlements unavailable"))

    const bulkResponse = await postBulkCheck(requestForBulk(resolvedInput, names))
    const founderSignalResponse = await postFounderSignal(requestForFounderSignal(resolvedInput, names))

    expect(bulkResponse.status).toBe(503)
    expect(founderSignalResponse.status).toBe(503)
    expect(await bulkResponse.json()).toMatchObject({ error: "usage_check_unavailable" })
    expect(await founderSignalResponse.json()).toMatchObject({ error: "usage_check_unavailable" })
    expect(mocks.createJob).not.toHaveBeenCalled()
    expect(mocks.processJob).not.toHaveBeenCalled()
    expect(mocks.scoreName).not.toHaveBeenCalled()
    expect(mocks.consumeQuota).not.toHaveBeenCalled()
  })

  it("puts newly-created Bulk Check jobs on the durable queue when the consumer is available", async () => {
    const input = MATRIX.find((candidate) => (
      candidate.auth === "signed"
      && candidate.entitlement === "pro"
      && candidate.nameCount === 50
      && candidate.tldSelection === "all"
      && candidate.availabilityOutcome === "available"
      && candidate.quotaState === "available"
    )) as MatrixCase
    const names = candidateNames(input.nameCount)
    configureMocks(input, names)
    mocks.queueAvailable.mockReturnValue(true)
    mocks.readJob.mockResolvedValue({
      ...snapshotFor(input, names),
      status: "queued",
      startedAt: null,
      completedAt: null,
    })

    const response = await postBulkCheck(requestForBulk(input, names))

    expect(response.status).toBe(202)
    expect(mocks.enqueueJob).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111")
    expect(mocks.processJob).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({ pollAfterMs: 1_000 })
  })
})
