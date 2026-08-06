export type FineTuningProviderId = "microsoft-foundry" | "openai-api"

export interface FineTuningProfile {
  providerId: FineTuningProviderId
  label: string
  modelSnapshot: string
  method: "supervised"
  seed: 20260715
  trainingTier: "developer" | "provider-default"
  preferred: boolean
  uploadEnabled: false
  jobSubmissionEnabled: false
}

export const FINE_TUNING_PROFILES: readonly FineTuningProfile[] = [
  {
    providerId: "microsoft-foundry",
    label: "Microsoft Foundry GPT-4.1 mini Developer tier",
    modelSnapshot: "gpt-4.1-mini-2025-04-14",
    method: "supervised",
    seed: 20260715,
    trainingTier: "developer",
    preferred: true,
    uploadEnabled: false,
    jobSubmissionEnabled: false,
  },
  {
    providerId: "openai-api",
    label: "OpenAI API GPT-4.1 mini supervised fine-tuning",
    modelSnapshot: "gpt-4.1-mini-2025-04-14",
    method: "supervised",
    seed: 20260715,
    trainingTier: "provider-default",
    preferred: false,
    uploadEnabled: false,
    jobSubmissionEnabled: false,
  },
] as const

export interface FineTuningApprovalPacket {
  approvalRequired: true
  providerId: FineTuningProviderId
  modelSnapshot: string
  method: "supervised"
  seed: number
  trainExamples: number
  validationExamples: number
  internalTestExamples: number
  trainingTokens: number
  validationTokens: number
  epochs: number
  currency: string
  priceSource: string
  priceCheckedAt: string
  estimatedTrainingCost: number
  estimatedHostingCost: number
  estimatedEvaluationInferenceCost: number
  estimatedMaximumCost: number
  datasetSha256: string
  promptSha256: string
  manifestSha256: string
}

/**
 * Future approval packets must contain fresh, explicit pricing and immutable
 * data identities. This helper does not upload files or submit a job.
 */
export function buildFineTuningApprovalPacket(
  profile: FineTuningProfile,
  input: Omit<FineTuningApprovalPacket, "approvalRequired" | "providerId" | "modelSnapshot" | "method" | "seed">,
): FineTuningApprovalPacket {
  if (!input.priceSource.trim()) throw new Error("Fine-tuning approval requires a current official price source")
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input.priceCheckedAt)) throw new Error("Fine-tuning approval requires an ISO price-check time")
  if (input.trainExamples < 1 || input.validationExamples < 1 || input.internalTestExamples < 1) {
    throw new Error("Fine-tuning approval requires explicit train, validation and internal-test counts")
  }
  if (input.trainingTokens < 1 || input.validationTokens < 1 || input.epochs < 1) {
    throw new Error("Fine-tuning approval requires token counts and a positive epoch count")
  }
  const calculatedMaximum = input.estimatedTrainingCost + input.estimatedHostingCost + input.estimatedEvaluationInferenceCost
  if (Math.abs(calculatedMaximum - input.estimatedMaximumCost) > 0.005) {
    throw new Error("Estimated maximum cost must equal training, hosting and evaluation estimates")
  }
  for (const [label, hash] of [
    ["dataset", input.datasetSha256],
    ["prompt", input.promptSha256],
    ["manifest", input.manifestSha256],
  ] as const) {
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Fine-tuning approval requires a valid ${label} SHA-256`)
  }
  return {
    approvalRequired: true,
    providerId: profile.providerId,
    modelSnapshot: profile.modelSnapshot,
    method: profile.method,
    seed: profile.seed,
    ...input,
  }
}
