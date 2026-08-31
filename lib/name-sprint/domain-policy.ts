import { NAME_SPRINT_TLDS, type NameSprintCandidate } from "./types"

export const CLEAN_LAUNCH_DOMAIN_MODIFIERS = ["get", "use", "try", "join", "hq"] as const
export const MAX_MODIFIED_DOMAINS_PER_SHORTLIST = 2

export type NameSprintDomainOption = {
  domain: string
  tld: "com" | "co" | "ai"
  kind: "exact" | "modified"
  modifier: (typeof CLEAN_LAUNCH_DOMAIN_MODIFIERS)[number] | null
  priority: number
}

export type NameSprintDomainEvidence = {
  domainStatuses: NameSprintCandidate["domainStatuses"]
  launchDomain: NameSprintCandidate["launchDomain"] | null
}

export function buildNameSprintDomainOptions(normalizedName: string): NameSprintDomainOption[] {
  const name = normalizedName.replace(/[^a-z0-9]/g, "")
  if (!name) return []

  const exact = NAME_SPRINT_TLDS.map((tld, index): NameSprintDomainOption => ({
    domain: `${name}.${tld}`,
    tld,
    kind: "exact",
    modifier: null,
    priority: 100 - index,
  }))
  const modified: NameSprintDomainOption[] = [
    { domain: `get${name}.com`, tld: "com", kind: "modified", modifier: "get", priority: 50 },
    { domain: `use${name}.com`, tld: "com", kind: "modified", modifier: "use", priority: 49 },
    { domain: `try${name}.com`, tld: "com", kind: "modified", modifier: "try", priority: 48 },
    { domain: `join${name}.com`, tld: "com", kind: "modified", modifier: "join", priority: 47 },
    { domain: `${name}hq.com`, tld: "com", kind: "modified", modifier: "hq", priority: 46 },
  ].filter((option) => {
    if (option.modifier === "hq") return !name.endsWith("hq")
    return !name.startsWith(option.modifier || "")
  }) as NameSprintDomainOption[]

  return [...exact, ...modified]
}

export function selectNameSprintLaunchDomain(
  normalizedName: string,
  results: ReadonlyMap<string, { available: boolean; unknown: boolean; checkedAt: string | null }>,
): NameSprintDomainEvidence {
  const options = buildNameSprintDomainOptions(normalizedName)
  const exactOptions = options.filter((option) => option.kind === "exact")
  const domainStatuses = exactOptions.map((option) => {
    const result = results.get(option.domain)
    return {
      tld: option.tld,
      status: !result || result.unknown ? "unknown" as const : result.available ? "available" as const : "unavailable" as const,
      checkedAt: result?.checkedAt || null,
    }
  })
  const selected = options
    .filter((option) => {
      const result = results.get(option.domain)
      return result?.available === true && result.unknown === false && Boolean(result.checkedAt)
    })
    .sort((left, right) => right.priority - left.priority)[0]

  return {
    domainStatuses,
    launchDomain: selected ? {
      domain: selected.domain,
      kind: selected.kind,
      modifier: selected.modifier,
      checkedAt: results.get(selected.domain)!.checkedAt!,
    } : null,
  }
}

export function selectShortlistWithModifiedDomainCap<T extends Pick<NameSprintCandidate, "launchDomain">>(
  candidates: readonly T[],
  limit: number,
): T[] {
  const selected: T[] = []
  let modifiedCount = 0
  for (const candidate of candidates) {
    if (candidate.launchDomain.kind === "modified") {
      if (modifiedCount >= MAX_MODIFIED_DOMAINS_PER_SHORTLIST) continue
      modifiedCount += 1
    }
    selected.push(candidate)
    if (selected.length >= limit) break
  }
  return selected
}
