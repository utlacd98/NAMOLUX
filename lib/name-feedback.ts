import { createHash } from "node:crypto"
import type { Json } from "@/lib/supabase/database.types"

export const FEEDBACK_TYPES = [
  "like",
  "dislike",
  "more_like_this",
  "save",
  "unsave",
  "copy",
  "domain_check",
  "selected",
] as const

export type NameFeedbackType = (typeof FEEDBACK_TYPES)[number]

export const DISLIKE_REASONS = [
  "too_generic",
  "hard_to_pronounce",
  "does_not_fit_business",
  "feels_ai_generated",
  "too_long",
  "wrong_tone",
  "similar_to_another_brand",
  "domain_problem",
  "other",
  "skip",
] as const

export type DislikeReason = (typeof DISLIKE_REASONS)[number]

export interface NameFeedbackPayload {
  anonymousSessionId: string
  briefId?: string | null
  briefTextSnapshot?: string | null
  candidateId: string
  candidateName: string
  candidateDescription?: string | null
  candidatePosition?: number | null
  generationId: string
  modelProvider?: string | null
  modelName?: string | null
  promptVersion?: string | null
  namingStyle?: string | null
  vibe?: string | null
  creativityLevel?: string | null
  displayedScores?: Json | null
  domainAvailabilitySnapshot?: Json | null
  feedbackType: NameFeedbackType
  feedbackReason?: DislikeReason | null
  isFounderFeedback?: boolean
}

export interface NameFeedbackRecord {
  anonymous_session_id: string
  user_id?: string | null
  brief_id?: string | null
  brief_text_snapshot?: string | null
  candidate_id: string
  candidate_name: string
  candidate_description?: string | null
  candidate_position?: number | null
  generation_id: string
  model_provider?: string | null
  model_name?: string | null
  prompt_version?: string | null
  naming_style?: string | null
  vibe?: string | null
  creativity_level?: string | null
  displayed_scores?: Json | null
  domain_availability_snapshot?: Json | null
  feedback_type: NameFeedbackType
  feedback_reason?: DislikeReason | null
  is_founder_feedback: boolean
  idempotency_key: string
}

export interface FeedbackPreferenceSummary {
  reduceLiteralCompounds: boolean
  preferSimplePhonetics: boolean
  preferShortCoined: boolean
  avoidAiSoundingNames: boolean
  avoidLongNames: boolean
  avoidWrongTone: boolean
  directionalReference?: {
    style?: string
    tone?: string
    lengthBand: "short" | "medium" | "long"
    abstraction: "direct" | "balanced" | "abstract"
  }
}

const TYPE_SET = new Set<string>(FEEDBACK_TYPES)
const REASON_SET = new Set<string>(DISLIKE_REASONS)

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const cleaned = value
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, "[email]")
    .replace(/\b(?:\+?\d[\d .()-]{7,}\d)\b/g, "[phone]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[number]")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
  return cleaned || null
}

function cleanJsonObject(value: unknown): Json | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Json
}

function cleanNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  const integer = Math.floor(value)
  return integer >= 0 && integer <= 1000 ? integer : null
}

export function normaliseFeedbackPayload(value: unknown, userId?: string | null): NameFeedbackRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Feedback payload must be an object.")
  }
  const input = value as Record<string, unknown>
  const feedbackType = cleanText(input.feedbackType, 40)
  if (!feedbackType || !TYPE_SET.has(feedbackType)) throw new Error("Unsupported feedback type.")

  const feedbackReason = cleanText(input.feedbackReason, 64)
  if (feedbackReason && !REASON_SET.has(feedbackReason)) throw new Error("Unsupported feedback reason.")

  const anonymousSessionId = cleanText(input.anonymousSessionId, 128)
  const candidateId = cleanText(input.candidateId, 160)
  const candidateName = cleanText(input.candidateName, 80)
  const generationId = cleanText(input.generationId, 160)
  if (!anonymousSessionId || anonymousSessionId.length < 8) throw new Error("A valid anonymous session is required.")
  if (!candidateId || !candidateName || !generationId) throw new Error("Candidate and generation identifiers are required.")

  const idempotencyKey = createFeedbackIdempotencyKey({
    anonymousSessionId,
    candidateId,
    generationId,
    feedbackType: feedbackType as NameFeedbackType,
  })

  return {
    anonymous_session_id: anonymousSessionId,
    user_id: userId || null,
    brief_id: cleanText(input.briefId, 120),
    brief_text_snapshot: cleanText(input.briefTextSnapshot, 1000),
    candidate_id: candidateId,
    candidate_name: candidateName,
    candidate_description: cleanText(input.candidateDescription, 1000),
    candidate_position: cleanNumber(input.candidatePosition),
    generation_id: generationId,
    model_provider: cleanText(input.modelProvider, 80),
    model_name: cleanText(input.modelName, 120),
    prompt_version: cleanText(input.promptVersion, 120),
    naming_style: cleanText(input.namingStyle, 64),
    vibe: cleanText(input.vibe, 64),
    creativity_level: cleanText(input.creativityLevel, 64),
    displayed_scores: cleanJsonObject(input.displayedScores),
    domain_availability_snapshot: cleanJsonObject(input.domainAvailabilitySnapshot),
    feedback_type: feedbackType as NameFeedbackType,
    feedback_reason: feedbackReason as DislikeReason | null,
    is_founder_feedback: input.isFounderFeedback === true,
    idempotency_key: idempotencyKey,
  }
}

export function createFeedbackIdempotencyKey(input: Pick<NameFeedbackPayload, "anonymousSessionId" | "candidateId" | "generationId" | "feedbackType">): string {
  return createHash("sha256")
    .update(JSON.stringify({
      anonymousSessionId: input.anonymousSessionId,
      candidateId: input.candidateId,
      generationId: input.generationId,
      feedbackType: input.feedbackType,
    }))
    .digest("hex")
}

export function lengthBand(name: string): "short" | "medium" | "long" {
  if (name.length <= 7) return "short"
  if (name.length <= 11) return "medium"
  return "long"
}

export function derivePreferenceSummary(events: readonly Pick<NameFeedbackRecord, "feedback_type" | "feedback_reason" | "candidate_name" | "naming_style" | "vibe">[]): FeedbackPreferenceSummary {
  const reasonCount = new Map<string, number>()
  for (const event of events) {
    if (event.feedback_reason) reasonCount.set(event.feedback_reason, (reasonCount.get(event.feedback_reason) || 0) + 1)
  }
  const directional = [...events].reverse().find((event) => event.feedback_type === "more_like_this" || event.feedback_type === "like" || event.feedback_type === "save")
  return {
    reduceLiteralCompounds: (reasonCount.get("too_generic") || 0) >= 2,
    preferSimplePhonetics: (reasonCount.get("hard_to_pronounce") || 0) >= 1,
    preferShortCoined: Boolean(directional && lengthBand(directional.candidate_name) === "short" && directional.naming_style === "brandable"),
    avoidAiSoundingNames: (reasonCount.get("feels_ai_generated") || 0) >= 1,
    avoidLongNames: (reasonCount.get("too_long") || 0) >= 1,
    avoidWrongTone: (reasonCount.get("wrong_tone") || 0) >= 1,
    directionalReference: directional
      ? {
          style: directional.naming_style || undefined,
          tone: directional.vibe || undefined,
          lengthBand: lengthBand(directional.candidate_name),
          abstraction: directional.naming_style === "compound" || directional.naming_style === "real_word" ? "direct" : directional.naming_style === "evocative" ? "balanced" : "abstract",
        }
      : undefined,
  }
}
