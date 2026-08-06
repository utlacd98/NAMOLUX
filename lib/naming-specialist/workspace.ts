import type {
  CurationDraft,
  CuratorCandidateDecision,
  SourceBlindCuratorPack,
} from "./types"

export const CURATOR_PROGRESS_STORAGE_KEY = "namolux_naming_curator_progress_v1"

export interface SourceBlindWorkspaceFile {
  schemaVersion: 1
  datasetId: string
  packs: SourceBlindCuratorPack[]
}

export interface LocalCuratorProgress {
  schemaVersion: 1
  datasetId: string
  activeBriefId: string | null
  drafts: Record<string, CurationDraft>
}

const PROVENANCE_KEYS = new Set([
  "sourceId",
  "sourceSlotId",
  "providerId",
  "modelId",
  "privateProvenance",
  "provenance",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function assertSourceBlind(value: unknown, path = "workspace"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSourceBlind(entry, `${path}[${index}]`))
    return
  }
  if (!isRecord(value)) return
  for (const [key, entry] of Object.entries(value)) {
    if (PROVENANCE_KEYS.has(key)) {
      throw new Error(`Source-bearing field ${path}.${key} is not allowed in the curator workspace`)
    }
    assertSourceBlind(entry, `${path}.${key}`)
  }
}

function parsePack(value: unknown, index: number): SourceBlindCuratorPack {
  if (!isRecord(value)) throw new Error(`packs[${index}] must be an object`)
  if (value.schemaVersion !== 1 || typeof value.packId !== "string") {
    throw new Error(`packs[${index}] has an unsupported schema or missing packId`)
  }
  if (!isRecord(value.brief) || typeof value.brief.id !== "string" || typeof value.brief.redactedDescription !== "string") {
    throw new Error(`packs[${index}] has an invalid source-blind brief`)
  }
  if (!Array.isArray(value.slots)) throw new Error(`packs[${index}].slots must be an array`)
  for (const [slotIndex, slot] of value.slots.entries()) {
    if (!isRecord(slot) || typeof slot.blindSlotId !== "string") {
      throw new Error(`packs[${index}].slots[${slotIndex}] is invalid`)
    }
    if (!["pending", "available", "unavailable"].includes(String(slot.status))) {
      throw new Error(`packs[${index}].slots[${slotIndex}] has an invalid status`)
    }
    if (slot.status === "available" && typeof slot.name !== "string") {
      throw new Error(`packs[${index}].slots[${slotIndex}] is available without a name`)
    }
  }
  return value as unknown as SourceBlindCuratorPack
}

/**
 * Accepts either one source-blind pack or the normal multi-pack workspace file.
 * Any provider/model provenance is rejected before it can reach the UI.
 */
export function parseSourceBlindWorkspace(value: unknown): SourceBlindWorkspaceFile {
  assertSourceBlind(value)
  if (!isRecord(value)) throw new Error("The curator import must be a JSON object")
  const rawPacks = Array.isArray(value.packs) ? value.packs : [value]
  const packs = rawPacks.map(parsePack)
  const briefIds = packs.map((pack) => pack.brief.id)
  const packIds = packs.map((pack) => pack.packId)
  if (new Set(briefIds).size !== briefIds.length) throw new Error("A curator import contains duplicate brief ids")
  if (new Set(packIds).size !== packIds.length) throw new Error("A curator import contains duplicate pack ids")
  return {
    schemaVersion: 1,
    datasetId: typeof value.datasetId === "string" && value.datasetId.trim()
      ? value.datasetId.trim()
      : "naming-specialist-pilot-v1",
    packs,
  }
}

export function createCurationDraft(packId: string): CurationDraft {
  return {
    schemaVersion: 1,
    passNumber: 1,
    packId,
    status: "draft",
    decisions: [],
    additions: [],
    shortfall: null,
  }
}

export function upsertCandidateDecision(
  draft: CurationDraft,
  blindSlotId: string,
  patch: Partial<Omit<CuratorCandidateDecision, "blindSlotId">>,
): CurationDraft {
  const current = draft.decisions.find((decision) => decision.blindSlotId === blindSlotId)
  const next: CuratorCandidateDecision = {
    blindSlotId,
    rating: current?.rating || "Average",
    shortlisted: current?.shortlisted || false,
    approved: current?.approved || false,
    ...current,
    ...patch,
  }
  return {
    ...draft,
    status: "draft",
    decisions: current
      ? draft.decisions.map((decision) => decision.blindSlotId === blindSlotId ? next : decision)
      : [...draft.decisions, next],
  }
}

export function normalizeApprovedRanks(draft: CurationDraft): CurationDraft {
  const approved = [
    ...draft.decisions.filter((decision) => decision.approved).map((decision) => ({
      kind: "decision" as const,
      id: decision.blindSlotId,
      rank: decision.rank || Number.MAX_SAFE_INTEGER,
    })),
    ...draft.additions.filter((addition) => addition.approved).map((addition) => ({
      kind: "addition" as const,
      id: addition.additionId,
      rank: addition.rank || Number.MAX_SAFE_INTEGER,
    })),
  ].sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id))
  const rankById = new Map(approved.map((entry, index) => [`${entry.kind}:${entry.id}`, index + 1]))
  const tier = (rank: number) => rank <= 8 ? "lead" as const : rank <= 16 ? "strong" as const : "exploratory" as const
  return {
    ...draft,
    decisions: draft.decisions.map((decision) => {
      if (!decision.approved) return { ...decision, rank: undefined, rankTier: undefined }
      const rank = rankById.get(`decision:${decision.blindSlotId}`)!
      return { ...decision, rank, rankTier: tier(rank) }
    }),
    additions: draft.additions.map((addition) => {
      if (!addition.approved) return { ...addition, rank: undefined, rankTier: undefined }
      const rank = rankById.get(`addition:${addition.additionId}`)!
      return { ...addition, rank, rankTier: tier(rank) }
    }),
  }
}

export function serializeCuratorProgress(progress: LocalCuratorProgress): string {
  return `${JSON.stringify(progress, null, 2)}\n`
}

export function parseCuratorProgress(value: string): LocalCuratorProgress {
  const parsed: unknown = JSON.parse(value)
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || typeof parsed.datasetId !== "string" || !isRecord(parsed.drafts)) {
    throw new Error("Unsupported curator progress file")
  }
  for (const [briefId, draft] of Object.entries(parsed.drafts)) {
    if (!isRecord(draft) || draft.schemaVersion !== 1 || draft.passNumber !== 1 || typeof draft.packId !== "string") {
      throw new Error(`Invalid pass-one draft for ${briefId}`)
    }
  }
  return parsed as unknown as LocalCuratorProgress
}
