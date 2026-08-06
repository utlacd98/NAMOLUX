import type {
  SeoAuditScores,
  SeoAuditSummary,
  SeoDetectedIssue,
  SeoPageSnapshot,
  SeoPerformanceSnapshot,
  SeoSeverity,
  SeoSeverityCounts,
} from "./types"
import { issueRecommendations } from "./checks"

export interface CalculateSeoScoresInput {
  issues: readonly SeoDetectedIssue[]
  pages: readonly SeoPageSnapshot[]
  performance?: SeoPerformanceSnapshot | null
}

const SEVERITY_PENALTY: Record<SeoSeverity, number> = {
  critical: 35,
  high: 15,
  medium: 7,
  low: 2,
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function scoreForCategories(
  issues: readonly SeoDetectedIssue[],
  categories: ReadonlySet<SeoDetectedIssue["category"]>,
): number {
  const penalty = issues
    .filter((issue) => categories.has(issue.category))
    .reduce((total, issue) => total + SEVERITY_PENALTY[issue.severity], 0)
  return clampScore(100 - penalty)
}

function performanceScore(performance?: SeoPerformanceSnapshot | null): number | null {
  if (!performance) return null
  const values = [performance.mobile?.score, performance.desktop?.score]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  if (values.length === 0) return null
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function calculateSeoScores(input: CalculateSeoScoresInput): SeoAuditScores {
  const technical = scoreForCategories(input.issues, new Set(["availability", "technical"]))
  const metadata = scoreForCategories(input.issues, new Set(["metadata", "content"]))
  const discoverability = scoreForCategories(input.issues, new Set(["crawlability", "content"]))
  const performance = performanceScore(input.performance)

  const overall = performance === null
    ? technical * 0.4 + metadata * 0.3 + discoverability * 0.3
    : technical * 0.3 + metadata * 0.25 + discoverability * 0.25 + performance * 0.2

  return { overall: clampScore(overall), technical, metadata, discoverability, performance }
}

export function countIssueSeverities(issues: readonly SeoDetectedIssue[]): SeoSeverityCounts {
  return issues.reduce<SeoSeverityCounts>((counts, issue) => {
    counts[issue.severity] += 1
    return counts
  }, { critical: 0, high: 0, medium: 0, low: 0 })
}

export function createAuditSummary(
  scores: SeoAuditScores,
  issues: readonly SeoDetectedIssue[],
  pages: readonly SeoPageSnapshot[],
): SeoAuditSummary {
  const severityCounts = countIssueSeverities(issues)
  const topActions = issueRecommendations(issues, 3)
  let text: string
  if (severityCounts.critical > 0) {
    text = `The site scored ${scores.overall} out of 100. ${severityCounts.critical} critical issue${severityCounts.critical === 1 ? " needs" : "s need"} attention before smaller improvements.`
  } else if (severityCounts.high > 0) {
    text = `The site scored ${scores.overall} out of 100. The strongest next step is to work through the ${severityCounts.high} high-priority issue${severityCounts.high === 1 ? "" : "s"}.`
  } else if (issues.length > 0) {
    text = `The site scored ${scores.overall} out of 100. No critical issue was detected in the bounded crawl, but ${issues.length} improvement${issues.length === 1 ? "" : "s"} remain.`
  } else {
    text = `The site scored ${scores.overall} out of 100. No issue was detected in the ${pages.length}-page bounded crawl.`
  }
  if (scores.performance === null) {
    text += " Real performance measurements were unavailable and were not estimated."
  }

  return { text, topActions, severityCounts, pagesChecked: pages.length }
}
