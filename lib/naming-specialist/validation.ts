import { createHash } from "node:crypto"
import {
  SPECIALIST_APPROVED_NAMES_PER_BRIEF,
  type ApprovedSpecialistName,
  type CurationWarning,
  type ExcludedMaterial,
  type PassReadyCuration,
  type RankTier,
  type ValidationIssue,
  type ValidationResult,
} from "./types"

const KNOWN_VISIBLE_AFFIXES = [
  "base", "flow", "forge", "hub", "labs", "ly", "nest", "nova", "wise", "works", "ify", "io",
] as const

function normalizeName(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function normalizeDescription(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function levenshtein(left: string, right: string): number {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row]
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      )
    }
    previous = current
  }
  return previous[right.length]
}

function phoneticKey(value: string): string {
  const clean = normalizeName(value).replace(/[^a-z]/g, "")
  if (!clean) return ""
  const codes: Record<string, string> = {
    b: "1", f: "1", p: "1", v: "1",
    c: "2", g: "2", j: "2", k: "2", q: "2", s: "2", x: "2", z: "2",
    d: "3", t: "3",
    l: "4",
    m: "5", n: "5",
    r: "6",
  }
  let encoded = clean[0]
  let previous = codes[clean[0]] || ""
  for (const character of clean.slice(1)) {
    const next = codes[character] || ""
    if (next && next !== previous) encoded += next
    previous = next
  }
  return `${encoded}000`.slice(0, 5)
}

function expectedRankTier(rank: number): RankTier {
  if (rank <= 8) return "lead"
  if (rank <= 16) return "strong"
  return "exploratory"
}

function groupByKey(
  names: readonly ApprovedSpecialistName[],
  keyFor: (name: ApprovedSpecialistName) => readonly string[],
): Map<string, ApprovedSpecialistName[]> {
  const groups = new Map<string, ApprovedSpecialistName[]>()
  for (const name of names) {
    for (const key of new Set(keyFor(name).filter(Boolean))) {
      groups.set(key, [...(groups.get(key) || []), name])
    }
  }
  return groups
}

function derivedVisibleAffixes(name: ApprovedSpecialistName): string[] {
  const clean = normalizeName(name.name)
  return KNOWN_VISIBLE_AFFIXES.filter((affix) => clean.startsWith(affix) || clean.endsWith(affix))
}

export function validateNoPii(value: string): string[] {
  const findings: string[] = []
  if (/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/i.test(value)) findings.push("email")
  if (/\b(?:https?:\/\/|www\.)\S+/i.test(value)) findings.push("url")
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(value)) findings.push("ip_address")
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(value)) findings.push("national_identifier")
  if (/(?:\+?\d[\s().-]*){8,}/.test(value)) findings.push("phone_or_long_number")
  if (/\b(?:\d[ -]*?){13,19}\b/.test(value)) findings.push("payment_card_number")
  return Array.from(new Set(findings))
}

export function assertNoPii(value: string, path = "value"): void {
  const findings = validateNoPii(value)
  if (findings.length > 0) throw new Error(`${path} contains prohibited PII-shaped material: ${findings.join(", ")}`)
}

export function findCurationWarnings(names: readonly ApprovedSpecialistName[]): CurationWarning[] {
  const warnings: CurationWarning[] = []
  const exact = groupByKey(names, (name) => [normalizeName(name.name)])
  for (const [key, members] of exact) {
    if (key && members.length > 1) {
      warnings.push({
        code: "duplicate",
        severity: "error",
        approvedIds: members.map((member) => member.approvedId),
        key,
        message: `Exact normalized duplicate: ${members.map((member) => member.name).join(", ")}`,
      })
    }
  }

  for (let leftIndex = 0; leftIndex < names.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < names.length; rightIndex += 1) {
      const left = normalizeName(names[leftIndex].name)
      const right = normalizeName(names[rightIndex].name)
      if (!left || !right || left === right) continue
      const threshold = Math.min(left.length, right.length) >= 7 ? 2 : 1
      if (levenshtein(left, right) <= threshold) {
        warnings.push({
          code: "near_duplicate",
          severity: "warning",
          approvedIds: [names[leftIndex].approvedId, names[rightIndex].approvedId],
          message: `Near-duplicate surfaces: ${names[leftIndex].name} / ${names[rightIndex].name}`,
        })
      }
    }
  }

  const affixes = groupByKey(names, (name) => [
    ...name.visibleAffixes.map(normalizeName),
    ...derivedVisibleAffixes(name),
  ])
  for (const [key, members] of affixes) {
    if (!key || members.length < 2) continue
    warnings.push({
      code: "visible_affix",
      severity: members.length > 2 ? "error" : "warning",
      approvedIds: members.map((member) => member.approvedId),
      key,
      message: `Visible affix "${key}" appears in ${members.length} approved names`,
    })
  }

  const phonetics = groupByKey(names, (name) => [phoneticKey(name.name)])
  for (const [key, members] of phonetics) {
    if (!key || members.length < 2) continue
    warnings.push({
      code: "phonetic_family",
      severity: "warning",
      approvedIds: members.map((member) => member.approvedId),
      key,
      message: `Phonetically similar family: ${members.map((member) => member.name).join(", ")}`,
    })
  }

  const concepts = groupByKey(names, (name) => [normalizeDescription(name.conceptFamily)])
  for (const [key, members] of concepts) {
    if (!key || members.length < 2) continue
    warnings.push({
      code: "concept_family",
      severity: members.length > 4 ? "error" : "warning",
      approvedIds: members.map((member) => member.approvedId),
      key,
      message: `Concept family "${key}" contains ${members.length} approved names`,
    })
  }
  return warnings
}

export function validatePassReadyCuration(curation: PassReadyCuration): ValidationResult {
  const issues: ValidationIssue[] = []
  const names = curation.approvedNames
  if (curation.status !== "pass_ready") issues.push({ code: "status", path: "status", message: "Curation is not pass-ready" })
  if (curation.shortfall !== null) {
    issues.push({ code: "shortfall", path: "shortfall", message: "A curation with a quality shortfall cannot be pass-ready" })
  }
  if (curation.passNumber !== 1 && curation.passNumber !== 2) {
    issues.push({ code: "pass_number", path: "passNumber", message: "Review pass must be 1 or 2" })
  }
  if (names.length !== SPECIALIST_APPROVED_NAMES_PER_BRIEF) {
    issues.push({
      code: "approved_count",
      path: "approvedNames",
      message: `Exactly ${SPECIALIST_APPROVED_NAMES_PER_BRIEF} approved names are required`,
    })
  }
  const ranks = names.map((name) => name.rank)
  const expectedRanks = Array.from({ length: SPECIALIST_APPROVED_NAMES_PER_BRIEF }, (_, index) => index + 1)
  if (new Set(ranks).size !== names.length || ranks.slice().sort((a, b) => a - b).join(",") !== expectedRanks.join(",")) {
    issues.push({ code: "ranks", path: "approvedNames.rank", message: "Approved ranks must be unique and cover 1 through 24" })
  }
  names.forEach((name, index) => {
    const path = `approvedNames[${index}]`
    if (!name.name.trim()) issues.push({ code: "name", path: `${path}.name`, message: "Approved name is empty" })
    if (!/^[a-z]+$/.test(name.name)) {
      issues.push({
        code: "name_format",
        path: `${path}.name`,
        message: `${name.name || "Approved name"} must contain lowercase ASCII letters only`,
      })
    }
    if (normalizeName(name.name).length > curation.brief.maxLength) {
      issues.push({ code: "max_length", path: `${path}.name`, message: `${name.name} exceeds the brief maximum length` })
    }
    if (!name.rationale.trim()) issues.push({ code: "rationale", path: `${path}.rationale`, message: `${name.name} has no rationale` })
    const allowedRatings = name.rank <= 16 ? ["Great", "Good"] : ["Great", "Good", "Average"]
    if (!allowedRatings.includes(name.rating)) {
      issues.push({
        code: "rating",
        path: `${path}.rating`,
        message: `${name.name} has an invalid ${name.rating} rating for rank ${name.rank}`,
      })
    }
    if (name.rank <= 8 && !name.shortlisted) {
      issues.push({ code: "shortlist", path: `${path}.shortlisted`, message: `${name.name} must be shortlisted at rank ${name.rank}` })
    }
    if (!name.conceptFamily.trim()) {
      issues.push({ code: "concept_family", path: `${path}.conceptFamily`, message: `${name.name} needs a concept family` })
    }
    if (name.rankTier !== expectedRankTier(name.rank)) {
      issues.push({ code: "rank_tier", path: `${path}.rankTier`, message: `${name.name} has the wrong tier for rank ${name.rank}` })
    }
    for (const [field, value] of [["name", name.name], ["rationale", name.rationale], ["conceptFamily", name.conceptFamily]] as const) {
      const pii = validateNoPii(value)
      if (pii.length > 0) issues.push({ code: "pii", path: `${path}.${field}`, message: `${name.name || path} contains ${pii.join(", ")}` })
    }
  })
  const briefPii = validateNoPii(curation.brief.redactedDescription)
  if (briefPii.length > 0) issues.push({ code: "pii", path: "brief.redactedDescription", message: `Redacted brief contains ${briefPii.join(", ")}` })
  const briefTextValues: Array<[string, string]> = [
    ...(curation.brief.rhymeWith ? [["brief.rhymeWith", curation.brief.rhymeWith] as [string, string]] : []),
    ...(curation.brief.locale ? [["brief.locale", curation.brief.locale] as [string, string]] : []),
    ...(curation.brief.blacklist || []).map((value, index) => [`brief.blacklist[${index}]`, value] as [string, string]),
    ...(curation.brief.preferences?.preferredSounds || []).map((value, index) => [`brief.preferences.preferredSounds[${index}]`, value] as [string, string]),
    ...(curation.brief.preferences?.avoidedSounds || []).map((value, index) => [`brief.preferences.avoidedSounds[${index}]`, value] as [string, string]),
  ]
  for (const [path, value] of briefTextValues) {
    const pii = validateNoPii(value)
    if (pii.length > 0) issues.push({ code: "pii", path, message: `${path} contains ${pii.join(", ")}` })
  }

  const warnings = findCurationWarnings(names)
  for (const warning of warnings.filter((warning) => warning.severity === "error")) {
    issues.push({ code: warning.code, path: "approvedNames", message: warning.message })
  }
  return { valid: issues.length === 0, issues, warnings }
}

export function validateGlobalApprovedNames(curations: readonly PassReadyCuration[]): ValidationResult {
  const issues: ValidationIssue[] = []
  const all = curations.flatMap((curation) => curation.approvedNames.map((name) => ({ curation, name })))
  const byName = new Map<string, typeof all>()
  for (const entry of all) {
    const key = normalizeName(entry.name.name)
    byName.set(key, [...(byName.get(key) || []), entry])
  }
  for (const [key, entries] of byName) {
    if (key && entries.length > 1) {
      issues.push({
        code: "global_duplicate",
        path: "approvedNames",
        message: `${entries[0].name.name} is approved in multiple records: ${entries.map((entry) => entry.curation.brief.id).join(", ")}`,
      })
    }
  }
  return { valid: issues.length === 0, issues, warnings: [] }
}

export function validateSplitIsolation(
  curations: readonly PassReadyCuration[],
  excludedMaterial: ExcludedMaterial = {},
): ValidationResult {
  const issues: ValidationIssue[] = [...validateGlobalApprovedNames(curations).issues]
  const descriptions = new Map<string, PassReadyCuration[]>()
  for (const curation of curations) {
    const key = sha256(normalizeDescription(curation.brief.redactedDescription))
    descriptions.set(key, [...(descriptions.get(key) || []), curation])
  }
  for (const entries of descriptions.values()) {
    if (entries.length > 1) {
      issues.push({
        code: "split_description_overlap",
        path: "brief.redactedDescription",
        message: `The same normalized brief appears in multiple records or splits: ${entries.map((entry) => `${entry.brief.id}:${entry.brief.split}`).join(", ")}`,
      })
    }
  }

  const semanticClusters = new Map<string, PassReadyCuration[]>()
  for (const curation of curations) {
    const key = normalizeDescription(curation.brief.semanticClusterId || "")
    if (key) semanticClusters.set(key, [...(semanticClusters.get(key) || []), curation])
  }
  for (const [cluster, entries] of semanticClusters) {
    if (new Set(entries.map((entry) => entry.brief.split)).size > 1) {
      issues.push({
        code: "split_semantic_cluster_overlap",
        path: "brief.semanticClusterId",
        message: `Semantic cluster ${cluster} crosses dataset splits: ${entries.map((entry) => `${entry.brief.id}:${entry.brief.split}`).join(", ")}`,
      })
    }
  }

  const excludedDescriptionHashes = new Set([
    ...(excludedMaterial.descriptionHashes || []).map((value) => value.toLowerCase()),
    ...(excludedMaterial.descriptions || []).map((value) => sha256(normalizeDescription(value))),
  ])
  const excludedNameHashes = new Set([
    ...(excludedMaterial.nameHashes || []).map((value) => value.toLowerCase()),
    ...(excludedMaterial.names || []).map((value) => sha256(normalizeName(value))),
  ])
  for (const value of [...(excludedMaterial.descriptions || []), ...(excludedMaterial.names || [])]) {
    const pii = validateNoPii(value)
    if (pii.length > 0) issues.push({ code: "excluded_pii", path: "excludedMaterial", message: `Excluded material contains ${pii.join(", ")}` })
  }
  for (const curation of curations) {
    if (excludedDescriptionHashes.has(sha256(normalizeDescription(curation.brief.redactedDescription)))) {
      issues.push({ code: "excluded_brief", path: curation.brief.id, message: `${curation.brief.id} overlaps excluded brief material` })
    }
    for (const name of curation.approvedNames) {
      if (excludedNameHashes.has(sha256(normalizeName(name.name)))) {
        issues.push({ code: "excluded_name", path: `${curation.brief.id}.${name.approvedId}`, message: `${name.name} overlaps excluded name material` })
      }
    }
  }
  return { valid: issues.length === 0, issues, warnings: [] }
}
