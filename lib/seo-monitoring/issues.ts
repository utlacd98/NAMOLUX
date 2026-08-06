import type { SeoDetectedIssue, SeoIssueDiff } from "./types"
import { normaliseEvidenceUrl, severityRank, sha256 } from "./utils"

export type SeoIssueIdentity = Pick<SeoDetectedIssue, "checkKey" | "affectedUrl">

export function createIssueFingerprint(issue: SeoIssueIdentity): string {
  const checkKey = issue.checkKey.trim().toLowerCase().replace(/[^a-z0-9_.:-]+/g, "_")
  return sha256(`${checkKey}\0${normaliseEvidenceUrl(issue.affectedUrl)}`)
}

export function withIssueFingerprint(issue: Omit<SeoDetectedIssue, "fingerprint">): SeoDetectedIssue {
  return { ...issue, fingerprint: createIssueFingerprint(issue) }
}

export function diffSeoIssues(
  previous: readonly SeoDetectedIssue[],
  current: readonly SeoDetectedIssue[],
): SeoIssueDiff {
  const previousByFingerprint = new Map(previous.map((issue) => [issue.fingerprint, issue]))
  const currentByFingerprint = new Map(current.map((issue) => [issue.fingerprint, issue]))
  const newIssues: SeoDetectedIssue[] = []
  const activeIssues: SeoDetectedIssue[] = []
  const resolvedIssues: SeoDetectedIssue[] = []
  const severityIncreased: SeoIssueDiff["severityIncreased"] = []
  const improvingIssues: SeoIssueDiff["improvingIssues"] = []

  for (const issue of current) {
    const prior = previousByFingerprint.get(issue.fingerprint)
    if (!prior) {
      newIssues.push(issue)
      continue
    }
    activeIssues.push(issue)
    const previousRank = severityRank(prior.severity)
    const currentRank = severityRank(issue.severity)
    if (currentRank > previousRank) severityIncreased.push({ previous: prior, current: issue })
    else if (currentRank < previousRank) improvingIssues.push({ previous: prior, current: issue })
  }

  for (const issue of previous) {
    if (!currentByFingerprint.has(issue.fingerprint)) resolvedIssues.push(issue)
  }

  return { newIssues, activeIssues, resolvedIssues, severityIncreased, improvingIssues }
}
