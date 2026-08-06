import { createHash } from "node:crypto"

import type { ExcludedMaterial } from "./types"

export const EXCLUDED_MATERIAL_LEDGER_SCHEMA_VERSION = 1 as const
export const EXCLUDED_MATERIAL_NORMALIZATION_VERSION = "namolux-excluded-material-v1" as const

export interface ExcludedMaterialSource {
  sourceId: string
  descriptions?: readonly string[]
  names?: readonly string[]
}

export interface ExcludedMaterialSourceLedger {
  readonly sourceId: string
  readonly inputCounts: {
    readonly descriptionValues: number
    readonly nameValues: number
  }
  readonly descriptionHashes: readonly string[]
  readonly nameHashes: readonly string[]
}

export interface ExcludedMaterialLedger {
  readonly schemaVersion: typeof EXCLUDED_MATERIAL_LEDGER_SCHEMA_VERSION
  readonly hashAlgorithm: "sha256"
  readonly normalizationVersion: typeof EXCLUDED_MATERIAL_NORMALIZATION_VERSION
  readonly sources: readonly ExcludedMaterialSourceLedger[]
  readonly descriptionHashes: readonly string[]
  readonly nameHashes: readonly string[]
  readonly ledgerSha256: string
}

export interface ExcludedDescriptionCandidate {
  id: string
  description: string
}

export interface ExcludedDescriptionOverlap {
  id: string
  descriptionHash: string
}

/** Mirrors the exact description normalization consumed by split validation. */
export function normalizeExcludedDescription(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()
}

/** Mirrors the exact name normalization consumed by split validation. */
export function normalizeExcludedName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export function hashExcludedDescription(value: string): string {
  return sha256(normalizeExcludedDescription(value))
}

export function hashExcludedName(value: string): string {
  return sha256(normalizeExcludedName(value))
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function hashSourceValues(
  values: readonly string[] | undefined,
  normalize: (value: string) => string,
  sourceId: string,
  materialKind: "description" | "name",
): string[] {
  return sortedUnique(
    (values || []).map((value, index) => {
      if (typeof value !== "string") {
        throw new TypeError(`${sourceId} ${materialKind} ${index + 1} must be a string`)
      }
      const normalized = normalize(value)
      // Empty and punctuation-only adversarial fixtures are valid excluded
      // material. Hashing the normalized empty value mirrors split validation.
      return sha256(normalized)
    }),
  )
}

function freezeSource(source: ExcludedMaterialSourceLedger): ExcludedMaterialSourceLedger {
  return Object.freeze({
    ...source,
    inputCounts: Object.freeze({ ...source.inputCounts }),
    descriptionHashes: Object.freeze([...source.descriptionHashes]),
    nameHashes: Object.freeze([...source.nameHashes]),
  })
}

/**
 * Builds a deterministic, hashes-only ledger. The returned object never retains
 * the supplied descriptions or names, so it is safe to persist beside exports.
 */
export function buildExcludedMaterialLedger(
  sources: readonly ExcludedMaterialSource[],
): ExcludedMaterialLedger {
  const sourceIds = new Set<string>()
  const sourceLedgers = sources.map((source) => {
    const sourceId = source.sourceId.trim()
    if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(sourceId)) {
      throw new Error(`Invalid excluded-material source id: ${source.sourceId}`)
    }
    if (sourceIds.has(sourceId)) {
      throw new Error(`Duplicate excluded-material source id: ${sourceId}`)
    }
    sourceIds.add(sourceId)

    return freezeSource({
      sourceId,
      inputCounts: {
        descriptionValues: source.descriptions?.length || 0,
        nameValues: source.names?.length || 0,
      },
      descriptionHashes: hashSourceValues(
        source.descriptions,
        normalizeExcludedDescription,
        sourceId,
        "description",
      ),
      nameHashes: hashSourceValues(source.names, normalizeExcludedName, sourceId, "name"),
    })
  })
  sourceLedgers.sort((left, right) => left.sourceId.localeCompare(right.sourceId))

  const descriptionHashes = Object.freeze(
    sortedUnique(sourceLedgers.flatMap((source) => source.descriptionHashes)),
  )
  const nameHashes = Object.freeze(sortedUnique(sourceLedgers.flatMap((source) => source.nameHashes)))
  const frozenSources = Object.freeze(sourceLedgers)
  const digestPayload = {
    schemaVersion: EXCLUDED_MATERIAL_LEDGER_SCHEMA_VERSION,
    hashAlgorithm: "sha256" as const,
    normalizationVersion: EXCLUDED_MATERIAL_NORMALIZATION_VERSION,
    sources: frozenSources,
    descriptionHashes,
    nameHashes,
  }

  return Object.freeze({
    ...digestPayload,
    ledgerSha256: sha256(JSON.stringify(digestPayload)),
  })
}

/** Produces the hashes-only shape accepted by training export validation. */
export function excludedMaterialFromLedger(ledger: ExcludedMaterialLedger): ExcludedMaterial {
  return {
    descriptionHashes: [...ledger.descriptionHashes],
    nameHashes: [...ledger.nameHashes],
  }
}

export function findExactExcludedDescriptionOverlaps(
  candidates: readonly ExcludedDescriptionCandidate[],
  ledger: ExcludedMaterialLedger,
): ExcludedDescriptionOverlap[] {
  const excluded = new Set(ledger.descriptionHashes)
  return candidates.flatMap((candidate) => {
    const descriptionHash = hashExcludedDescription(candidate.description)
    return excluded.has(descriptionHash) ? [{ id: candidate.id, descriptionHash }] : []
  })
}

export function assertNoExactExcludedDescriptions(
  candidates: readonly ExcludedDescriptionCandidate[],
  ledger: ExcludedMaterialLedger,
): void {
  const overlaps = findExactExcludedDescriptionOverlaps(candidates, ledger)
  if (overlaps.length > 0) {
    throw new Error(`Excluded description overlap: ${overlaps.map((overlap) => overlap.id).join(", ")}`)
  }
}
