import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  ADVANCED_SCORING_TOKEN_TTL_MS,
  issueGenerationWorkflowToken,
  verifyGenerationWorkflowToken,
} from "./generation-workflow-token"

const originalSecret = process.env.GENERATION_WORKFLOW_SECRET
const originalSupabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY
const originalStripeSecret = process.env.STRIPE_WEBHOOK_SECRET

beforeEach(() => {
  process.env.GENERATION_WORKFLOW_SECRET = "test-workflow-secret"
})

afterEach(() => {
  if (originalSecret === undefined) delete process.env.GENERATION_WORKFLOW_SECRET
  else process.env.GENERATION_WORKFLOW_SECRET = originalSecret
  if (originalSupabaseSecret === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupabaseSecret
  if (originalStripeSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET
  else process.env.STRIPE_WEBHOOK_SECRET = originalStripeSecret
})

describe("generation workflow token", () => {
  it("authorises only the generated batch during its short lifetime", () => {
    const now = 1_700_000_000_000
    const subject = "user:test-user"
    const token = issueGenerationWorkflowToken(["CarePath", "TimePilot"], subject, now)

    expect(token).toBeTruthy()
    expect(verifyGenerationWorkflowToken(token, ["timepilot", "carepath"], subject, now + 1_000)).toBe(true)
    expect(verifyGenerationWorkflowToken(token, ["carepath", "othername"], subject, now + 1_000)).toBe(false)
    expect(verifyGenerationWorkflowToken(token, ["carepath", "timepilot"], "user:other", now + 1_000)).toBe(false)
    expect(verifyGenerationWorkflowToken(token, ["carepath", "timepilot"], subject, now + 10 * 60 * 1_000 + 1)).toBe(false)
  })

  it("fails closed when no signing secret exists", () => {
    delete process.env.GENERATION_WORKFLOW_SECRET
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    expect(issueGenerationWorkflowToken(["carepath"], "anonymous:test")).toBeNull()
  })

  it("supports a separately bounded Advanced scoring decision window", () => {
    const now = 1_700_000_000_000
    const names = ["calmledger", "northbeam"]
    const subject = "advanced-founder-signal:user:test-user"
    const token = issueGenerationWorkflowToken(
      names,
      subject,
      now,
      ADVANCED_SCORING_TOKEN_TTL_MS,
      { binding: "ordered" },
    )

    expect(verifyGenerationWorkflowToken(
      token,
      names,
      subject,
      now + 12 * 60 * 60 * 1_000,
      ADVANCED_SCORING_TOKEN_TTL_MS,
      { binding: "ordered" },
    )).toBe(true)
    expect(verifyGenerationWorkflowToken(
      token,
      [...names].reverse(),
      subject,
      now + 12 * 60 * 60 * 1_000,
      ADVANCED_SCORING_TOKEN_TTL_MS,
      { binding: "ordered" },
    )).toBe(false)
    expect(verifyGenerationWorkflowToken(
      token,
      [...names].sort(),
      subject,
      now + 12 * 60 * 60 * 1_000,
      ADVANCED_SCORING_TOKEN_TTL_MS,
    )).toBe(false)
    const legacySetToken = issueGenerationWorkflowToken(names, subject, now, ADVANCED_SCORING_TOKEN_TTL_MS)
    expect(verifyGenerationWorkflowToken(
      legacySetToken,
      names,
      subject,
      now + 12 * 60 * 60 * 1_000,
      ADVANCED_SCORING_TOKEN_TTL_MS,
      { binding: "ordered" },
    )).toBe(false)
    expect(verifyGenerationWorkflowToken(token, names, subject, now + 12 * 60 * 60 * 1_000)).toBe(false)
  })
})
