import {
  buildQuickAutoMessages,
  buildQuickAutoResponseFormat,
  QUICK_AUTO_CONTRACT_VERSION,
} from "../domainGen/quickAutoContract"
import type { NamingSpecialistBrief } from "./briefs"
import { SPECIALIST_PROVIDER_MODELS, type SpecialistSourceId } from "./types"

export const CANDIDATES_PER_SPECIALIST_SOURCE = 12 as const

export interface ProviderCandidateRequestPlan {
  schemaVersion: 1
  contractVersion: typeof QUICK_AUTO_CONTRACT_VERSION
  briefId: string
  sourceId: SpecialistSourceId
  providerId: "openai" | "groq"
  requestedModel: string
  candidateCount: typeof CANDIDATES_PER_SPECIALIST_SOURCE
  endpoint: string
  credentialEnvironmentVariable: "OPENAI_API_KEY" | "GROQ_API_KEY"
  requestBody: {
    model: string
    messages: ReturnType<typeof buildQuickAutoMessages>
    temperature: number
    max_tokens: number
    response_format: ReturnType<typeof buildQuickAutoResponseFormat>
  }
}

export interface PilotCandidateCapturePlan {
  schemaVersion: 1
  execution: "disabled"
  contractVersion: typeof QUICK_AUTO_CONTRACT_VERSION
  briefCount: number
  requestCount: number
  candidateSlotCount: number
  requests: ProviderCandidateRequestPlan[]
}

function source(sourceId: SpecialistSourceId) {
  const match = SPECIALIST_PROVIDER_MODELS.find((entry) => entry.sourceId === sourceId)
  if (!match) throw new Error(`Unknown naming-specialist source ${sourceId}`)
  return match
}

/** Builds an inert request description. It never reads credentials or performs I/O. */
export function buildProviderCandidateRequestPlan(
  brief: NamingSpecialistBrief,
  sourceId: SpecialistSourceId,
): ProviderCandidateRequestPlan {
  const target = source(sourceId)
  const providerId = target.providerId
  const endpoint = providerId === "openai"
    ? "https://api.openai.com/v1/chat/completions"
    : "https://api.groq.com/openai/v1/chat/completions"
  return {
    schemaVersion: 1,
    contractVersion: QUICK_AUTO_CONTRACT_VERSION,
    briefId: brief.id,
    sourceId,
    providerId,
    requestedModel: target.modelId,
    candidateCount: CANDIDATES_PER_SPECIALIST_SOURCE,
    endpoint,
    credentialEnvironmentVariable: providerId === "openai" ? "OPENAI_API_KEY" : "GROQ_API_KEY",
    requestBody: {
      model: target.modelId,
      messages: buildQuickAutoMessages({
        description: brief.description,
        vibe: brief.vibe,
        style: "auto",
        creativity: brief.creativity,
        maxChars: brief.maxChars,
        count: CANDIDATES_PER_SPECIALIST_SOURCE,
        rhymeWith: brief.rhymeWith,
        blacklist: brief.blacklist,
        preferences: brief.preferences,
      }),
      temperature: brief.creativity === "direct" ? 0.7 : brief.creativity === "exploratory" ? 1 : 0.85,
      max_tokens: 440,
      response_format: buildQuickAutoResponseFormat(CANDIDATES_PER_SPECIALIST_SOURCE),
    },
  }
}

/**
 * Produces the full 240-request / 2,880-slot plan without contacting a provider.
 * A future executor must be a separate, approval-gated command.
 */
export function buildPilotCandidateCapturePlan(
  briefs: readonly NamingSpecialistBrief[],
): PilotCandidateCapturePlan {
  const requests = briefs.flatMap((brief) => SPECIALIST_PROVIDER_MODELS.map((target) => (
    buildProviderCandidateRequestPlan(brief, target.sourceId)
  )))
  return {
    schemaVersion: 1,
    execution: "disabled",
    contractVersion: QUICK_AUTO_CONTRACT_VERSION,
    briefCount: briefs.length,
    requestCount: requests.length,
    candidateSlotCount: requests.length * CANDIDATES_PER_SPECIALIST_SOURCE,
    requests,
  }
}
