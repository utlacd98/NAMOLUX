import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { FEEDBACK_TYPES, createFeedbackIdempotencyKey, normaliseFeedbackPayload, type NameFeedbackType } from "@/lib/name-feedback"

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = await currentUserId()
    const record = normaliseFeedbackPayload(body, userId)
    const service = createServiceClient()
    const { error } = await service
      .from("name_feedback_events")
      .upsert(
        {
          ...record,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "idempotency_key" },
      )
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback could not be saved."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const feedbackType = typeof body?.feedbackType === "string" ? body.feedbackType : ""
    const anonymousSessionId = typeof body?.anonymousSessionId === "string" ? body.anonymousSessionId : ""
    const candidateId = typeof body?.candidateId === "string" ? body.candidateId : ""
    const generationId = typeof body?.generationId === "string" ? body.generationId : ""
    if (!anonymousSessionId || !candidateId || !generationId || !FEEDBACK_TYPES.includes(feedbackType as NameFeedbackType)) {
      return NextResponse.json({ error: "Feedback identifiers are required." }, { status: 400 })
    }
    const key = createFeedbackIdempotencyKey({ anonymousSessionId, candidateId, generationId, feedbackType: feedbackType as NameFeedbackType })
    const service = createServiceClient()
    const { error } = await service
      .from("name_feedback_events")
      .delete()
      .eq("idempotency_key", key)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback could not be removed."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
