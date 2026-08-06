import { createHash } from "node:crypto"
import {
  buildQuickAutoMessages,
  QUICK_AUTO_CONTRACT_VERSION,
} from "../domainGen/quickAutoContract"
import {
  validatePassReadyCuration,
  validateSplitIsolation,
  validateNoPii,
} from "./validation"
import type {
  ApprovedSpecialistName,
  DatasetSplit,
  ExcludedMaterial,
  PassReadyCuration,
  ReviewPassNumber,
  SourceBlindCuratorPack,
  TrainingExportManifest,
} from "./types"

export type AutoTrainingMessageRole = "system" | "user"

export interface AutoTrainingMessage {
  role: AutoTrainingMessageRole
  content: string
}

export interface AutoTrainingBrief {
  description: string
  vibe: SourceBlindCuratorPack["brief"]["vibe"]
  style: "auto"
  creativity: "direct" | "balanced" | "exploratory"
  maxChars: number
  rhymeWith?: string
  blacklist?: string[]
  preferences?: SourceBlindCuratorPack["brief"]["preferences"]
  locale?: string
}

export interface AutoTrainingApprovedName {
  name: string
  rationale: string
  rank: number
  rankTier: ApprovedSpecialistName["rankTier"]
  rating: ApprovedSpecialistName["rating"]
}

/**
 * Narrow seam to the production Auto prompt/response contract.
 *
 * The corpus layer intentionally owns neither a provider prompt nor a second
 * response shape. Its caller must adapt the shared production Auto contract
 * through these two deterministic functions.
 */
export interface AutoTrainingContract {
  id: string
  buildInputMessages(brief: Readonly<AutoTrainingBrief>): readonly AutoTrainingMessage[]
  serializeAssistant(names: readonly AutoTrainingApprovedName[]): string
}

/** Default adapter: exact production Auto messages and exact `{ names }` response payload. */
export const SHARED_QUICK_AUTO_TRAINING_CONTRACT: AutoTrainingContract = {
  id: QUICK_AUTO_CONTRACT_VERSION,
  buildInputMessages: (brief) => buildQuickAutoMessages({
    description: brief.description,
    vibe: brief.vibe,
    style: "auto",
    creativity: brief.creativity,
    maxChars: brief.maxChars,
    count: 24,
    rhymeWith: brief.rhymeWith,
    blacklist: brief.blacklist,
    preferences: brief.preferences,
  }),
  serializeAssistant: (names) => JSON.stringify({ names: names.map((name) => name.name) }),
}

export interface TrainingExportOptions {
  curations: readonly PassReadyCuration[]
  split: DatasetSplit
  passNumber: ReviewPassNumber
  contract?: AutoTrainingContract
  excludedMaterial?: ExcludedMaterial
}

export interface TrainingExportBundle {
  jsonl: string
  manifest: TrainingExportManifest
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => [key, canonicalize(record[key])]),
    )
  }
  return value
}

function stableStringify(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value))
  if (serialized === undefined) throw new Error("Cannot deterministically serialize an undefined value")
  return serialized
}

export function stableSha256(value: unknown): string {
  const bytes = typeof value === "string" ? value : stableStringify(value)
  return createHash("sha256").update(bytes, "utf8").digest("hex")
}

function normalizeExcludedMaterial(material: ExcludedMaterial): ExcludedMaterial {
  const clean = (values: readonly string[] | undefined) => Array.from(new Set((values || []).map((value) => value.trim()).filter(Boolean))).sort()
  return {
    descriptions: clean(material.descriptions),
    names: clean(material.names),
    descriptionHashes: clean(material.descriptionHashes).map((value) => value.toLowerCase()),
    nameHashes: clean(material.nameHashes).map((value) => value.toLowerCase()),
  }
}

export function toAutoTrainingBrief(brief: SourceBlindCuratorPack["brief"]): AutoTrainingBrief {
  return {
    description: brief.redactedDescription,
    vibe: brief.vibe,
    style: brief.style,
    creativity: brief.creativity,
    maxChars: brief.maxLength,
    rhymeWith: brief.rhymeWith,
    blacklist: brief.blacklist ? [...brief.blacklist] : undefined,
    preferences: brief.preferences ? {
      ...brief.preferences,
      likedStyles: brief.preferences.likedStyles ? [...brief.preferences.likedStyles] : undefined,
      dislikedStyles: brief.preferences.dislikedStyles ? [...brief.preferences.dislikedStyles] : undefined,
      preferredSounds: brief.preferences.preferredSounds ? [...brief.preferences.preferredSounds] : undefined,
      avoidedSounds: brief.preferences.avoidedSounds ? [...brief.preferences.avoidedSounds] : undefined,
    } : undefined,
    locale: brief.locale,
  }
}

function assertContractMessages(messages: readonly AutoTrainingMessage[], briefId: string): void {
  if (messages.length === 0 || !messages.some((message) => message.role === "user")) {
    throw new Error(`Auto training contract must emit at least one user message for ${briefId}`)
  }
  messages.forEach((message, index) => {
    if (message.role !== "system" && message.role !== "user") {
      throw new Error(`Auto training contract emitted an unsupported input role at ${briefId}:${index}`)
    }
    if (!message.content.trim()) throw new Error(`Auto training contract emitted an empty message at ${briefId}:${index}`)
    const pii = validateNoPii(message.content)
    if (pii.length > 0) {
      throw new Error(`Auto training input ${briefId}:${index} contains prohibited PII-shaped material: ${pii.join(", ")}`)
    }
  })
}

export function buildTrainingExport(options: TrainingExportOptions): TrainingExportBundle {
  const contract = options.contract || SHARED_QUICK_AUTO_TRAINING_CONTRACT
  const contractId = contract.id.trim()
  if (!contractId) throw new Error("A training export requires a stable Auto contract id")
  if (options.passNumber !== 1 && options.passNumber !== 2) throw new Error("Training export pass must be 1 or 2")
  if (options.curations.length === 0) throw new Error("A training export requires at least one pass-ready curation")

  const excludedMaterial = normalizeExcludedMaterial(options.excludedMaterial || {})
  for (const curation of options.curations) {
    if (curation.brief.split !== options.split) {
      throw new Error(`Curation ${curation.brief.id} belongs to ${curation.brief.split}, not ${options.split}`)
    }
    if (curation.passNumber !== options.passNumber) {
      throw new Error(`Curation ${curation.brief.id} belongs to review pass ${curation.passNumber}, not ${options.passNumber}`)
    }
    const validation = validatePassReadyCuration(curation)
    if (!validation.valid) {
      throw new Error(`Curation ${curation.brief.id} is not exportable: ${validation.issues.map((issue) => issue.message).join("; ")}`)
    }
  }
  const isolation = validateSplitIsolation(options.curations, excludedMaterial)
  if (!isolation.valid) {
    throw new Error(`Training split isolation failed: ${isolation.issues.map((issue) => issue.message).join("; ")}`)
  }

  const curations = [...options.curations].sort((left, right) => left.brief.id.localeCompare(right.brief.id))
  const examples = curations.map((curation) => {
    const inputMessages = contract.buildInputMessages(toAutoTrainingBrief(curation.brief))
    assertContractMessages(inputMessages, curation.brief.id)
    const approvedNames: AutoTrainingApprovedName[] = [...curation.approvedNames]
      .sort((left, right) => left.rank - right.rank)
      .map(({ name, rationale, rank, rankTier, rating }) => ({ name, rationale, rank, rankTier, rating }))
    const assistantContent = contract.serializeAssistant(approvedNames)
    if (!assistantContent.trim()) throw new Error(`Auto training contract emitted an empty assistant response for ${curation.brief.id}`)
    const assistantPii = validateNoPii(assistantContent)
    if (assistantPii.length > 0) {
      throw new Error(`Auto training output ${curation.brief.id} contains prohibited PII-shaped material: ${assistantPii.join(", ")}`)
    }
    const canonicalInputMessages = inputMessages.map(({ role, content }) => ({ role, content }))
    const line = stableStringify({
      messages: [
        ...canonicalInputMessages,
        { role: "assistant", content: assistantContent },
      ],
    })
    return { line, promptSha256: stableSha256(canonicalInputMessages) }
  })
  const lines = examples.map((example) => example.line)
  const jsonl = `${lines.join("\n")}\n`
  const datasetSha256 = stableSha256(jsonl)
  const manifestWithoutSelfHash: Omit<TrainingExportManifest, "manifestSha256"> = {
    schemaVersion: 1,
    passNumber: options.passNumber,
    contractId,
    split: options.split,
    exampleCount: curations.length,
    briefIds: curations.map((curation) => curation.brief.id),
    datasetSha256,
    jsonlSha256: datasetSha256,
    promptSha256: examples.map((example) => example.promptSha256),
    exampleSha256: lines.map(stableSha256),
    sourceCurationSha256: curations.map(stableSha256),
    excludedMaterialSha256: options.excludedMaterial ? stableSha256(excludedMaterial) : null,
  }
  const manifest: TrainingExportManifest = {
    ...manifestWithoutSelfHash,
    manifestSha256: stableSha256(manifestWithoutSelfHash),
  }
  return { jsonl, manifest }
}

export function exportTrainingJsonl(options: TrainingExportOptions): string {
  return buildTrainingExport(options).jsonl
}
