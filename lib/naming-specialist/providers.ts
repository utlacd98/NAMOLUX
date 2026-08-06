import {
  SPECIALIST_PROVIDER_MODELS,
  SPECIALIST_SLOTS_PER_BRIEF,
  SPECIALIST_SLOTS_PER_MODEL,
  type PrivateSpecialistCapture,
  type SpecialistBrief,
  type SpecialistCandidatePayload,
  type SpecialistModelId,
  type SpecialistProviderBatch,
  type SpecialistProviderId,
  type SpecialistSourceId,
} from "./types"

export type ProviderSlotResult =
  | { ordinal: number; status: "available"; candidate: SpecialistCandidatePayload }
  | { ordinal: number; status: "unavailable"; reason: string }

function sourceFor(sourceId: SpecialistSourceId) {
  const source = SPECIALIST_PROVIDER_MODELS.find((entry) => entry.sourceId === sourceId)
  if (!source) throw new Error(`Unknown naming-specialist source: ${sourceId}`)
  return source
}

function assertSourceIdentity(
  sourceId: SpecialistSourceId,
  providerId: SpecialistProviderId,
  modelId: SpecialistModelId,
) {
  const expected = sourceFor(sourceId)
  if (expected.providerId !== providerId || expected.modelId !== modelId) {
    throw new Error(
      `Source ${sourceId} requires ${expected.providerId}/${expected.modelId}; provider or model substitution is not allowed`,
    )
  }
}

export function createSpecialistCapturePlan(brief: SpecialistBrief): PrivateSpecialistCapture {
  const batches: SpecialistProviderBatch[] = SPECIALIST_PROVIDER_MODELS.map((source) => ({
    sourceId: source.sourceId,
    providerId: source.providerId,
    modelId: source.modelId,
    slots: Array.from({ length: SPECIALIST_SLOTS_PER_MODEL }, (_, index) => ({
      sourceSlotId: `${brief.id}:${source.sourceId}:${String(index + 1).padStart(2, "0")}`,
      sourceId: source.sourceId,
      providerId: source.providerId,
      modelId: source.modelId,
      ordinal: index + 1,
      status: "pending" as const,
      candidate: null,
      gapReason: null,
    })),
  }))
  return { schemaVersion: 1, brief: { ...brief }, batches }
}

export function assertExactProviderRoster(capture: PrivateSpecialistCapture): void {
  if (capture.batches.length !== SPECIALIST_PROVIDER_MODELS.length) {
    throw new Error(`A naming-specialist capture must contain exactly ${SPECIALIST_PROVIDER_MODELS.length} source batches`)
  }
  const seen = new Set<SpecialistSourceId>()
  for (const batch of capture.batches) {
    if (seen.has(batch.sourceId)) throw new Error(`Duplicate naming-specialist source batch: ${batch.sourceId}`)
    seen.add(batch.sourceId)
    assertSourceIdentity(batch.sourceId, batch.providerId, batch.modelId)
    if (batch.slots.length !== SPECIALIST_SLOTS_PER_MODEL) {
      throw new Error(`Source ${batch.sourceId} must retain exactly ${SPECIALIST_SLOTS_PER_MODEL} explicit slots`)
    }
    const ordinals = batch.slots.map((slot) => slot.ordinal)
    if (new Set(ordinals).size !== SPECIALIST_SLOTS_PER_MODEL || ordinals.some((value) => value < 1 || value > 12)) {
      throw new Error(`Source ${batch.sourceId} has an invalid slot ordinal set`)
    }
    for (const slot of batch.slots) {
      assertSourceIdentity(slot.sourceId, slot.providerId, slot.modelId)
      if (slot.sourceId !== batch.sourceId || slot.providerId !== batch.providerId || slot.modelId !== batch.modelId) {
        throw new Error(`Slot ${slot.sourceSlotId} does not belong to its declared source batch`)
      }
      if (slot.status === "available" && !slot.candidate) {
        throw new Error(`Available slot ${slot.sourceSlotId} has no candidate`)
      }
      if (slot.status !== "available" && slot.candidate) {
        throw new Error(`Gap slot ${slot.sourceSlotId} cannot retain a candidate`)
      }
      if (slot.status === "unavailable" && !slot.gapReason?.trim()) {
        throw new Error(`Unavailable slot ${slot.sourceSlotId} requires an explicit reason`)
      }
    }
  }
  if (capture.batches.flatMap((batch) => batch.slots).length !== SPECIALIST_SLOTS_PER_BRIEF) {
    throw new Error(`A naming-specialist capture must retain exactly ${SPECIALIST_SLOTS_PER_BRIEF} slots`)
  }
}

export function markProviderUnavailable(
  capture: PrivateSpecialistCapture,
  sourceId: SpecialistSourceId,
  providerId: SpecialistProviderId,
  modelId: SpecialistModelId,
  reason: string,
): PrivateSpecialistCapture {
  assertExactProviderRoster(capture)
  assertSourceIdentity(sourceId, providerId, modelId)
  const gapReason = reason.trim()
  if (!gapReason) throw new Error("An unavailable provider requires an explicit reason")
  return {
    ...capture,
    batches: capture.batches.map((batch) => batch.sourceId !== sourceId ? batch : {
      ...batch,
      slots: batch.slots.map((slot) => ({
        ...slot,
        status: "unavailable" as const,
        candidate: null,
        gapReason,
      })),
    }),
  }
}

export function applyProviderCandidates(
  capture: PrivateSpecialistCapture,
  sourceId: SpecialistSourceId,
  providerId: SpecialistProviderId,
  modelId: SpecialistModelId,
  results: readonly ProviderSlotResult[],
): PrivateSpecialistCapture {
  assertExactProviderRoster(capture)
  assertSourceIdentity(sourceId, providerId, modelId)
  if (results.length !== SPECIALIST_SLOTS_PER_MODEL) {
    throw new Error(
      `Source ${sourceId} must report all ${SPECIALIST_SLOTS_PER_MODEL} slots; missing outputs must be explicit unavailable gaps`,
    )
  }
  const byOrdinal = new Map(results.map((result) => [result.ordinal, result]))
  if (byOrdinal.size !== SPECIALIST_SLOTS_PER_MODEL) {
    throw new Error(`Source ${sourceId} contains duplicate slot ordinals`)
  }

  const next: PrivateSpecialistCapture = {
    ...capture,
    batches: capture.batches.map((batch) => batch.sourceId !== sourceId ? batch : {
      ...batch,
      slots: batch.slots.map((slot) => {
        const result = byOrdinal.get(slot.ordinal)
        if (!result) throw new Error(`Source ${sourceId} omitted slot ${slot.ordinal}`)
        if (result.status === "unavailable") {
          const gapReason = result.reason.trim()
          if (!gapReason) throw new Error(`Unavailable slot ${slot.ordinal} requires an explicit reason`)
          return { ...slot, status: "unavailable" as const, candidate: null, gapReason }
        }
        const name = result.candidate.name.trim()
        if (!name) throw new Error(`Available slot ${slot.ordinal} has an empty candidate name`)
        return {
          ...slot,
          status: "available" as const,
          candidate: {
            name,
            rationale: result.candidate.rationale?.trim() || undefined,
          },
          gapReason: null,
        }
      }),
    }),
  }
  assertExactProviderRoster(next)
  return next
}
