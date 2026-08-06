import { describe, expect, it } from "vitest"
import { buildFineTuningApprovalPacket, FINE_TUNING_PROFILES } from "./fine-tuning-adapters"

const hash = "a".repeat(64)

describe("future fine-tuning approval adapters", () => {
  it("keeps every profile inert until an explicit future approval", () => {
    expect(FINE_TUNING_PROFILES).toHaveLength(2)
    expect(FINE_TUNING_PROFILES.every((profile) => !profile.uploadEnabled && !profile.jobSubmissionEnabled)).toBe(true)
    expect(FINE_TUNING_PROFILES[0]).toMatchObject({
      providerId: "microsoft-foundry",
      modelSnapshot: "gpt-4.1-mini-2025-04-14",
      seed: 20260715,
      preferred: true,
    })
  })

  it("requires an exact model, dataset counts, immutable hashes and an additive cost ceiling", () => {
    const packet = buildFineTuningApprovalPacket(FINE_TUNING_PROFILES[0], {
      trainExamples: 60,
      validationExamples: 10,
      internalTestExamples: 10,
      trainingTokens: 12_000,
      validationTokens: 2_000,
      epochs: 2,
      currency: "USD",
      priceSource: "https://azure.microsoft.com/pricing",
      priceCheckedAt: "2026-07-15T20:00:00.000Z",
      estimatedTrainingCost: 4,
      estimatedHostingCost: 0,
      estimatedEvaluationInferenceCost: 1,
      estimatedMaximumCost: 5,
      datasetSha256: hash,
      promptSha256: hash,
      manifestSha256: hash,
    })
    expect(packet).toMatchObject({ approvalRequired: true, estimatedMaximumCost: 5 })
    expect(() => buildFineTuningApprovalPacket(FINE_TUNING_PROFILES[0], {
      ...packet,
      estimatedMaximumCost: 4,
    })).toThrow(/must equal/i)
  })
})
