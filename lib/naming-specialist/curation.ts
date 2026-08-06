import { createHash } from "node:crypto"
import { assertExactProviderRoster } from "./providers"
import { assertNoPii, validatePassReadyCuration } from "./validation"
import {
  type ApprovedSpecialistName,
  type CurationDraft,
  type PassReadyCuration,
  type PrivateCuratorProvenance,
  type PrivateSpecialistCapture,
  type SourceBlindCuratorPack,
} from "./types"

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function cleanAffixes(values: readonly string[] | undefined): string[] {
  return Array.from(new Set((values || [])
    .map((value) => value.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)))
    .sort()
}

function assertReviewPass(passNumber: number): asserts passNumber is 1 | 2 {
  if (passNumber !== 1 && passNumber !== 2) throw new Error("Curation review pass must be 1 or 2")
}

function assertApprovedDecision(
  id: string,
  rating: "Great" | "Good" | "Average" | "Reject",
  rank: number,
  shortlisted: boolean,
  criticalDefect: unknown,
  visibleAffixes: readonly string[] | undefined,
): asserts rating is "Great" | "Good" | "Average" {
  if (rating === "Reject" || (rank <= 16 && rating === "Average")) {
    throw new Error(`Approved name ${id} has an invalid ${rating} rating for rank ${rank}`)
  }
  if (rank >= 1 && rank <= 8 && !shortlisted) {
    throw new Error(`Lead-tier approved name ${id} must be shortlisted`)
  }
  if (criticalDefect) throw new Error(`Approved name ${id} has a critical defect`)
  if (!visibleAffixes) throw new Error(`Approved name ${id} requires an explicit visible-affix review`)
}

export function buildSourceBlindCuratorPack(
  capture: PrivateSpecialistCapture,
  redactedDescription: string,
  blindingSalt: string,
): { curatorPack: SourceBlindCuratorPack; privateProvenance: PrivateCuratorProvenance } {
  assertExactProviderRoster(capture)
  const description = redactedDescription.trim()
  const salt = blindingSalt.trim()
  if (!description) throw new Error("A curator pack requires a redacted brief description")
  if (salt.length < 16) throw new Error("A curator pack requires a blinding salt of at least 16 characters")
  assertNoPii(description, "redactedDescription")
  if (capture.brief.rhymeWith) assertNoPii(capture.brief.rhymeWith, "brief.rhymeWith")
  if (capture.brief.locale) assertNoPii(capture.brief.locale, "brief.locale")
  for (const [index, value] of (capture.brief.blacklist || []).entries()) {
    assertNoPii(value, `brief.blacklist[${index}]`)
  }
  for (const [field, values] of Object.entries(capture.brief.preferences || {})) {
    if (Array.isArray(values)) {
      values.forEach((value, index) => assertNoPii(String(value), `brief.preferences.${field}[${index}]`))
    }
  }

  const sourceSlots = capture.batches.flatMap((batch) => batch.slots)
  for (const slot of sourceSlots) {
    if (slot.candidate) {
      assertNoPii(slot.candidate.name, `candidate:${slot.sourceSlotId}:name`)
      if (slot.candidate.rationale) {
        assertNoPii(slot.candidate.rationale, `candidate:${slot.sourceSlotId}:rationale`)
      }
    }
  }

  const packId = `curator_${sha256(JSON.stringify({
    schemaVersion: 1,
    briefId: capture.brief.id,
    redactedDescription: description,
    slots: sourceSlots.map((slot) => ({
      status: slot.status,
      name: slot.candidate?.name || null,
      rationale: slot.candidate?.rationale || null,
    })),
    salt,
  })).slice(0, 24)}`

  const blinded = sourceSlots.map((slot) => {
    const blindSlotId = `blind_${sha256(`${salt}\0${capture.brief.id}\0${slot.sourceSlotId}`).slice(0, 20)}`
    return {
      blindSlotId,
      orderKey: sha256(`${packId}\0${blindSlotId}\0order`),
      publicSlot: {
        blindSlotId,
        status: slot.status,
        name: slot.candidate?.name || null,
        rationale: slot.candidate?.rationale || null,
        gapReason: slot.status === "unavailable" ? "Candidate unavailable for this slot." : null,
      },
      provenance: {
        blindSlotId,
        sourceSlotId: slot.sourceSlotId,
        sourceId: slot.sourceId,
        providerId: slot.providerId,
        modelId: slot.modelId,
        ordinal: slot.ordinal,
      },
    }
  }).sort((left, right) => left.orderKey.localeCompare(right.orderKey))

  const { description: _privateDescription, ...briefWithoutDescription } = capture.brief
  void _privateDescription
  const curatorPack: SourceBlindCuratorPack = {
    schemaVersion: 1,
    packId,
    brief: {
      ...briefWithoutDescription,
      redactedDescription: description,
      blacklist: capture.brief.blacklist ? [...capture.brief.blacklist] : undefined,
      preferences: capture.brief.preferences ? {
        ...capture.brief.preferences,
        likedStyles: capture.brief.preferences.likedStyles ? [...capture.brief.preferences.likedStyles] : undefined,
        dislikedStyles: capture.brief.preferences.dislikedStyles ? [...capture.brief.preferences.dislikedStyles] : undefined,
        preferredSounds: capture.brief.preferences.preferredSounds ? [...capture.brief.preferences.preferredSounds] : undefined,
        avoidedSounds: capture.brief.preferences.avoidedSounds ? [...capture.brief.preferences.avoidedSounds] : undefined,
      } : undefined,
    },
    slots: blinded.map((entry) => entry.publicSlot),
  }
  const privateProvenance: PrivateCuratorProvenance = {
    schemaVersion: 1,
    packId,
    briefId: capture.brief.id,
    entries: blinded.map((entry) => entry.provenance),
  }
  return { curatorPack, privateProvenance }
}

export function resolveCurationDraft(
  pack: SourceBlindCuratorPack,
  draft: CurationDraft,
): PassReadyCuration {
  if (draft.packId !== pack.packId) throw new Error("Curation draft belongs to another curator pack")
  assertReviewPass(draft.passNumber)
  if (draft.status !== "pass_ready") throw new Error("Curation draft has not been marked pass-ready")
  if (draft.shortfall) {
    if (draft.shortfall.code !== "insufficient_quality" || !draft.shortfall.note.trim()) {
      throw new Error("Curation shortfall requires the insufficient_quality code and a note")
    }
    throw new Error(`A curation with an honest quality shortfall cannot be pass-ready: ${draft.shortfall.note.trim()}`)
  }
  if (pack.slots.some((slot) => slot.status === "pending")) {
    throw new Error("Pending capture slots must become available or explicitly unavailable before pass-ready curation")
  }

  const availableSlots = pack.slots.filter((slot) => slot.status === "available")
  const availableById = new Map(availableSlots.map((slot) => [slot.blindSlotId, slot]))
  const decisionById = new Map(draft.decisions.map((decision) => [decision.blindSlotId, decision]))
  if (decisionById.size !== draft.decisions.length) throw new Error("Curation draft contains duplicate candidate decisions")
  if (decisionById.size !== availableSlots.length || availableSlots.some((slot) => !decisionById.has(slot.blindSlotId))) {
    throw new Error("Pass-ready curation requires one decision for every available blind candidate")
  }
  for (const decision of draft.decisions) {
    if (!availableById.has(decision.blindSlotId)) {
      throw new Error(`Curation decision references a non-available slot: ${decision.blindSlotId}`)
    }
  }
  if (new Set(draft.additions.map((addition) => addition.additionId)).size !== draft.additions.length) {
    throw new Error("Curation draft contains duplicate addition ids")
  }

  const capturedApproved: ApprovedSpecialistName[] = draft.decisions
    .filter((decision) => decision.approved)
    .map((decision) => {
      const slot = availableById.get(decision.blindSlotId)!
      const rank = decision.rank || 0
      assertApprovedDecision(
        decision.blindSlotId,
        decision.rating,
        rank,
        decision.shortlisted,
        decision.criticalDefect,
        decision.visibleAffixes,
      )
      const name = decision.editedName?.trim() || slot.name?.trim() || ""
      return {
        approvedId: `approved_${sha256(`${pack.packId}\0captured\0${decision.blindSlotId}\0${name}`).slice(0, 20)}`,
        origin: "captured" as const,
        blindSlotId: decision.blindSlotId,
        additionId: null,
        name,
        rationale: slot.rationale?.trim() || "",
        rating: decision.rating,
        shortlisted: decision.shortlisted,
        rank,
        rankTier: decision.rankTier || "exploratory",
        conceptFamily: decision.conceptFamily?.trim() || "",
        visibleAffixes: cleanAffixes(decision.visibleAffixes),
      }
    })

  const additionsApproved: ApprovedSpecialistName[] = draft.additions
    .filter((addition) => addition.approved)
    .map((addition) => {
      const rank = addition.rank || 0
      assertApprovedDecision(
        addition.additionId,
        addition.rating,
        rank,
        addition.shortlisted,
        addition.criticalDefect,
        addition.visibleAffixes,
      )
      const name = addition.name.trim()
      return {
        approvedId: `approved_${sha256(`${pack.packId}\0addition\0${addition.additionId}\0${name}`).slice(0, 20)}`,
        origin: "curator_addition" as const,
        blindSlotId: null,
        additionId: addition.additionId,
        name,
        rationale: addition.rationale.trim(),
        rating: addition.rating,
        shortlisted: addition.shortlisted,
        rank,
        rankTier: addition.rankTier || "exploratory",
        conceptFamily: addition.conceptFamily?.trim() || "",
        visibleAffixes: cleanAffixes(addition.visibleAffixes),
      }
    })

  const result: PassReadyCuration = {
    schemaVersion: 1,
    passNumber: draft.passNumber,
    status: "pass_ready",
    shortfall: null,
    packId: pack.packId,
    brief: pack.brief,
    approvedNames: [...capturedApproved, ...additionsApproved].sort((left, right) => left.rank - right.rank),
    reviewedBlindSlotIds: availableSlots.map((slot) => slot.blindSlotId).sort(),
    gaps: pack.slots
      .filter((slot) => slot.status !== "available")
      .map(({ blindSlotId, status, gapReason }) => ({ blindSlotId, status, gapReason })),
  }
  const validation = validatePassReadyCuration(result)
  if (!validation.valid) {
    throw new Error(`Pass-ready curation failed validation: ${validation.issues.map((issue) => issue.message).join("; ")}`)
  }
  return result
}
