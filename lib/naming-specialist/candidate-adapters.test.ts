import { describe, expect, it } from "vitest"
import { NAMING_SPECIALIST_BRIEFS } from "./briefs"
import {
  buildPilotCandidateCapturePlan,
  buildProviderCandidateRequestPlan,
} from "./candidate-adapters"

describe("approval-gated specialist candidate adapters", () => {
  it("prepares exactly 36 slots per brief without an execution capability", () => {
    const plan = buildPilotCandidateCapturePlan(NAMING_SPECIALIST_BRIEFS)
    expect(plan).toMatchObject({
      execution: "disabled",
      briefCount: 80,
      requestCount: 240,
      candidateSlotCount: 2880,
    })
    expect(JSON.stringify(plan)).not.toContain("apiKey")
    expect(JSON.stringify(plan)).not.toContain("Authorization")
  })

  it("uses the shared v9 names-only messages and strict 12-name schema for every source", () => {
    const brief = NAMING_SPECIALIST_BRIEFS[0]
    for (const sourceId of ["openai-base", "openai-sol", "qwen-groq"] as const) {
      const request = buildProviderCandidateRequestPlan(brief, sourceId)
      expect(request.contractVersion).toBe("quick-auto-v9")
      expect(request.requestBody.response_format.json_schema.schema.properties.names).toMatchObject({
        minItems: 12,
        maxItems: 12,
        items: { type: "string" },
      })
      expect(request.requestBody.response_format.json_schema.schema).toMatchObject({
        required: ["names"],
        additionalProperties: false,
      })
      expect(request.requestBody.messages).toHaveLength(2)
      const payload = JSON.parse(request.requestBody.messages[1].content)
      expect(payload.outputShape).toEqual({ names: ["lowercase"] })
      expect(payload.userInput).toMatchObject({
        description: brief.description,
        style: "auto",
      })
      expect(JSON.stringify(payload)).not.toContain("evidenceParts")
    }
  })

  it("pins requested provider identities and never silently substitutes a model", () => {
    expect(buildProviderCandidateRequestPlan(NAMING_SPECIALIST_BRIEFS[0], "openai-base").requestedModel).toBe("gpt-4.1-mini-2025-04-14")
    expect(buildProviderCandidateRequestPlan(NAMING_SPECIALIST_BRIEFS[0], "openai-sol").requestedModel).toBe("gpt-5.6-sol")
    expect(buildProviderCandidateRequestPlan(NAMING_SPECIALIST_BRIEFS[0], "qwen-groq").requestedModel).toBe("qwen/qwen3.6-27b")
  })
})
