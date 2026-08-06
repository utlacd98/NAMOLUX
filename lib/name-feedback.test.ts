import { describe, expect, it } from "vitest"
import {
  createFeedbackIdempotencyKey,
  derivePreferenceSummary,
  normaliseFeedbackPayload,
  type NameFeedbackRecord,
} from "./name-feedback"

describe("name feedback validation", () => {
  const basePayload = {
    anonymousSessionId: "s_1234567890",
    candidateId: "cand_1",
    candidateName: "calmly",
    generationId: "generation-7",
    feedbackType: "like",
  } as const

  it("normalises valid payloads and redacts obvious personal data in brief snapshots", () => {
    const row = normaliseFeedbackPayload({
      ...basePayload,
      briefTextSnapshot: "Email me at founder@example.com or call +44 7700 900123 about a budgeting app.",
      candidateDescription: "<A calm budgeting name>",
    }, "user_1")

    expect(row.user_id).toBe("user_1")
    expect(row.brief_text_snapshot).toContain("[email]")
    expect(row.brief_text_snapshot).toContain("[phone]")
    expect(row.candidate_description).toBe("A calm budgeting name")
  })

  it("rejects unsupported feedback types and reasons", () => {
    expect(() => normaliseFeedbackPayload({ ...basePayload, feedbackType: "train_model" })).toThrow(/Unsupported feedback type/)
    expect(() => normaliseFeedbackPayload({ ...basePayload, feedbackType: "dislike", feedbackReason: "bad" })).toThrow(/Unsupported feedback reason/)
  })

  it("creates stable idempotency keys for duplicate clicks", () => {
    const first = createFeedbackIdempotencyKey(basePayload)
    const second = createFeedbackIdempotencyKey({ ...basePayload, candidateName: "different" } as never)
    expect(first).toBe(second)
    expect(first).toHaveLength(64)
  })
})

describe("name feedback preference summary", () => {
  it("turns repeated feedback into bounded generation guidance", () => {
    const rows: NameFeedbackRecord[] = [
      row("dislike", "budgetspark", "compound", "friendly", "too_generic"),
      row("dislike", "moneyhelper", "compound", "friendly", "too_generic"),
      row("dislike", "xqorra", "brandable", "tech", "hard_to_pronounce"),
      row("more_like_this", "lumora", "brandable", "premium", null),
    ]

    expect(derivePreferenceSummary(rows)).toMatchObject({
      reduceLiteralCompounds: true,
      preferSimplePhonetics: true,
      preferShortCoined: true,
      directionalReference: {
        style: "brandable",
        tone: "premium",
        lengthBand: "short",
        abstraction: "abstract",
      },
    })
  })
})

function row(
  feedbackType: NameFeedbackRecord["feedback_type"],
  candidateName: string,
  namingStyle: string,
  vibe: string,
  feedbackReason: NameFeedbackRecord["feedback_reason"],
): NameFeedbackRecord {
  return {
    anonymous_session_id: "s_1234567890",
    candidate_id: candidateName,
    candidate_name: candidateName,
    generation_id: "generation-1",
    feedback_type: feedbackType,
    feedback_reason: feedbackReason,
    naming_style: namingStyle,
    vibe,
    is_founder_feedback: false,
    idempotency_key: candidateName,
  }
}
