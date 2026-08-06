import type Stripe from "stripe"
import { createServiceClient } from "@/lib/supabase/server"

type StripeEventStatus = "processing" | "completed" | "failed"

export async function claimStripeEvent(event: Stripe.Event): Promise<"claimed" | "duplicate"> {
  const service = createServiceClient()
  const { error } = await service.from("stripe_events").insert({
    event_id: event.id,
    type: event.type,
    created: event.created,
    status: "processing" satisfies StripeEventStatus,
    attempts: 1,
  })

  if (!error) return "claimed"
  if (error.code !== "23505") throw error

  const { data: existing, error: lookupError } = await service
    .from("stripe_events")
    .select("status")
    .eq("event_id", event.id)
    .single()
  if (lookupError) throw lookupError
  if (existing.status !== "failed") return "duplicate"

  const { error: retryError } = await service
    .from("stripe_events")
    .update({ status: "processing", error: null, attempts: 2 })
    .eq("event_id", event.id)
    .eq("status", "failed")
  if (retryError) throw retryError
  return "claimed"
}

export async function completeStripeEvent(eventId: string): Promise<void> {
  await setStripeEventStatus(eventId, "completed")
}

export async function failStripeEvent(eventId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : "Unknown webhook failure"
  await setStripeEventStatus(eventId, "failed", message.slice(0, 1000))
}

async function setStripeEventStatus(
  eventId: string,
  status: StripeEventStatus,
  error: string | null = null,
): Promise<void> {
  const service = createServiceClient()
  const { error: updateError } = await service
    .from("stripe_events")
    .update({
      status,
      error,
      processed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("event_id", eventId)

  if (updateError) throw updateError
}
