import { diffSeoIssues } from "./issues"
import type {
  SeoAuditResult,
  SeoBusinessContext,
  SeoContentOpportunity,
  SeoGeneratedReport,
  SeoPageSnapshot,
} from "./types"
import { normaliseEvidenceUrl, severityRank, uniqueStrings } from "./utils"

export interface GenerateDailySeoReportInput {
  siteUrl: string
  current: SeoAuditResult
  previous?: SeoAuditResult | null
  generatedAt?: Date
}

export interface GenerateWeeklySeoReportInput {
  siteUrl: string
  audits: readonly SeoAuditResult[]
  previousReport?: SeoGeneratedReport | null
  businessContext?: SeoBusinessContext
  generatedAt?: Date
}

function scoreChange(current: SeoAuditResult, previous?: SeoAuditResult | null): number | null {
  return previous ? current.scores.overall - previous.scores.overall : null
}

function scoreChangeSentence(change: number | null, previousScore?: number): string {
  if (change === null || previousScore === undefined) return "This report establishes the first measured SEO baseline."
  if (change > 0) return `The measured SEO score increased from ${previousScore} to ${previousScore + change}.`
  if (change < 0) return `The measured SEO score decreased from ${previousScore} to ${previousScore + change}.`
  return `The measured SEO score remains ${previousScore}.`
}

function mostImportantIssue(audit: SeoAuditResult) {
  return [...audit.issues].sort((left, right) =>
    severityRank(right.severity) - severityRank(left.severity) || left.title.localeCompare(right.title),
  )[0]
}

function pageMap(pages: readonly SeoPageSnapshot[]): Map<string, SeoPageSnapshot> {
  return new Map(pages.map((page) => [normaliseEvidenceUrl(page.url), page]))
}

function detectMeasuredPageChanges(previous: SeoAuditResult, current: SeoAuditResult): string[] {
  const priorPages = pageMap(previous.pages)
  const changes: string[] = []
  for (const page of current.pages) {
    const prior = priorPages.get(normaliseEvidenceUrl(page.url))
    if (!prior) continue
    if (prior.title !== page.title) changes.push(`The title changed on ${page.url}.`)
    if (prior.metaDescription !== page.metaDescription) changes.push(`The meta description changed on ${page.url}.`)
    if (prior.canonicalUrls.join("|") !== page.canonicalUrls.join("|")) changes.push(`Canonical metadata changed on ${page.url}.`)
    if (!prior.fetchError && page.fetchError) changes.push(`${page.url} stopped responding to the bounded audit.`)
  }
  if (previous.robots?.contentHash !== current.robots?.contentHash) changes.push("robots.txt changed since the previous audit.")
  if (previous.sitemap?.contentHash !== current.sitemap?.contentHash) changes.push("The XML sitemap changed since the previous audit.")
  return uniqueStrings(changes, 12)
}

function dailySummary(input: GenerateDailySeoReportInput): string {
  const { current, previous } = input
  const change = scoreChange(current, previous)
  const diff = diffSeoIssues(previous?.issues || [], current.issues)
  const sentences = [scoreChangeSentence(change, previous?.scores.overall)]
  if (diff.resolvedIssues.length > 0) {
    sentences.push(`${diff.resolvedIssues.length} issue${diff.resolvedIssues.length === 1 ? " was" : "s were"} resolved.`)
  }
  if (diff.newIssues.length > 0) {
    const highestNew = [...diff.newIssues].sort((left, right) => severityRank(right.severity) - severityRank(left.severity))[0]
    sentences.push(`${diff.newIssues.length} new issue${diff.newIssues.length === 1 ? " was" : "s were"} detected; the highest priority is “${highestNew.title}”.`)
  } else if (previous) {
    sentences.push("No new issue was detected in today's bounded crawl.")
  }
  const action = current.summary.topActions[0]
  if (action) sentences.push(`The best next action is to ${action.charAt(0).toLowerCase()}${action.slice(1)}`)
  return sentences.join(" ")
}

export function generateDailySeoReport(input: GenerateDailySeoReportInput): SeoGeneratedReport {
  const generatedAt = (input.generatedAt || new Date()).toISOString()
  const previous = input.previous || null
  const diff = diffSeoIssues(previous?.issues || [], input.current.issues)
  const measuredChanges = previous ? detectMeasuredPageChanges(previous, input.current) : []
  const change = scoreChange(input.current, previous)
  const whatChanged = [
    scoreChangeSentence(change, previous?.scores.overall),
    `${diff.newIssues.length} new, ${diff.resolvedIssues.length} resolved and ${diff.severityIncreased.length} more severe issue${diff.severityIncreased.length === 1 ? "" : "s"}.`,
    ...measuredChanges,
  ]
  const currentPriority = mostImportantIssue(input.current)

  return {
    reportType: "daily",
    title: `Daily SEO update for ${new URL(input.siteUrl).hostname}`,
    summary: dailySummary(input),
    currentScore: input.current.scores.overall,
    scoreChange: change,
    scores: input.current.scores,
    newIssueCount: diff.newIssues.length,
    resolvedIssueCount: diff.resolvedIssues.length,
    recommendedActions: input.current.summary.topActions.slice(0, 3),
    sections: [
      { heading: "What changed", items: uniqueStrings(whatChanged, 15) },
      {
        heading: "Why it matters",
        items: currentPriority
          ? [`${currentPriority.title}: ${currentPriority.whyItMatters}`]
          : ["No unresolved issue was detected in the bounded crawl."],
      },
      {
        heading: "What to do next",
        items: input.current.summary.topActions.length > 0
          ? input.current.summary.topActions.slice(0, 3)
          : ["Keep the site stable and review the next scheduled report for measured changes."],
      },
    ],
    contentOpportunities: [],
    focusNextWeek: null,
    generatedAt,
  }
}

function hasPageSignal(pages: readonly SeoPageSnapshot[], pattern: RegExp): boolean {
  return pages.some((page) => {
    const urlAndHeadings = `${new URL(page.url).pathname} ${page.title || ""} ${page.h1.join(" ")}`
    return pattern.test(urlAndHeadings)
  })
}

export function suggestContentOpportunities(
  audit: SeoAuditResult,
  businessContext: SeoBusinessContext = {},
): SeoContentOpportunity[] {
  const opportunities: SeoContentOpportunity[] = []
  const successfulPages = audit.pages.filter((page) => !page.fetchError)
  const thinPages = successfulPages.filter((page) => page.meaningfulWordCount < 150)
  if (thinPages.length > 0) {
    opportunities.push({
      title: "Strengthen thin existing pages",
      rationale: `${thinPages.length} crawled page${thinPages.length === 1 ? " has" : "s have"} fewer than 150 meaningful words.`,
      recommendation: "Answer the visitor's main questions on those pages before creating a large volume of new content.",
      basis: "strategic_recommendation",
    })
  }

  const category = businessContext.category?.trim()
  if (category && !hasPageSignal(successfulPages, /\b(service|services|solutions|what-we-do)\b/i)) {
    opportunities.push({
      title: `Create a clear ${category} service or solution page`,
      rationale: "The bounded crawl did not detect a clearly labelled service or solution page.",
      recommendation: "Explain the audience, problem, offer, proof and next step on one dedicated page.",
      basis: "strategic_recommendation",
    })
  }
  if (!hasPageSignal(successfulPages, /\b(faq|frequently-asked|questions)\b/i)) {
    opportunities.push({
      title: "Add a focused FAQ section",
      rationale: "The bounded crawl did not detect a clearly labelled FAQ page or section.",
      recommendation: "Answer real pre-purchase or onboarding questions in plain language; do not invent questions solely for search engines.",
      basis: "strategic_recommendation",
    })
  }
  if (successfulPages.length < 4) {
    opportunities.push({
      title: "Publish one foundational educational guide",
      rationale: `Only ${successfulPages.length} usable page${successfulPages.length === 1 ? " was" : "s were"} present in the bounded crawl.`,
      recommendation: "Create one substantial guide that answers the most important problem your ideal customer researches before buying.",
      basis: "strategic_recommendation",
    })
  }
  const context = `${businessContext.category || ""} ${businessContext.businessDescription || ""}`
  if (/\b(saas|software|platform|tool|app)\b/i.test(context) && !hasPageSignal(successfulPages, /\b(compare|comparison|versus|vs)\b/i)) {
    opportunities.push({
      title: "Consider an honest comparison page",
      rationale: "The business context describes a software product, but no comparison-oriented page was detected.",
      recommendation: "Compare the product with a genuine alternative using fair criteria, clear limitations and no invented market data.",
      basis: "strategic_recommendation",
    })
  }
  return opportunities.slice(0, 4)
}

function sortedAudits(audits: readonly SeoAuditResult[]): SeoAuditResult[] {
  return [...audits].sort((left, right) => Date.parse(left.completedAt) - Date.parse(right.completedAt))
}

function categoryTrend(label: string, current: number | null, baseline: number | null): string {
  if (current === null || baseline === null) return `${label}: real measurements were unavailable and no trend was estimated.`
  const change = current - baseline
  if (change > 0) return `${label}: improved by ${change} points to ${current}.`
  if (change < 0) return `${label}: declined by ${Math.abs(change)} points to ${current}.`
  return `${label}: unchanged at ${current}.`
}

export function generateWeeklySeoReport(input: GenerateWeeklySeoReportInput): SeoGeneratedReport {
  if (input.audits.length === 0) throw new Error("At least one completed audit is required for a weekly report.")
  const audits = sortedAudits(input.audits)
  const baseline = audits[0]
  const current = audits[audits.length - 1]
  const diff = diffSeoIssues(baseline.issues, current.issues)
  const change = current.scores.overall - baseline.scores.overall
  const critical = current.issues.filter((issue) => issue.severity === "critical")
  const contentOpportunities = suggestContentOpportunities(current, input.businessContext)
  const focus = current.summary.topActions[0]
    || contentOpportunities[0]?.recommendation
    || "Keep the website stable and review the next measured report."
  const comparison = input.previousReport
    ? `Compared with the previous weekly report, the current score is ${current.scores.overall - input.previousReport.currentScore >= 0 ? "+" : ""}${current.scores.overall - input.previousReport.currentScore} points.`
    : "This is the first weekly report available for comparison."
  const summaryParts = [
    scoreChangeSentence(change, baseline.scores.overall),
    `${diff.newIssues.length} issue${diff.newIssues.length === 1 ? " was" : "s were"} discovered and ${diff.resolvedIssues.length} ${diff.resolvedIssues.length === 1 ? "was" : "were"} resolved across the comparison period.`,
    critical.length > 0
      ? `${critical.length} critical issue${critical.length === 1 ? " remains" : "s remain"} open.`
      : "No critical issue remains in the latest bounded audit.",
    `Next week's focus: ${focus}`,
  ]

  return {
    reportType: "weekly",
    title: `Weekly SEO growth briefing for ${new URL(input.siteUrl).hostname}`,
    summary: summaryParts.join(" "),
    currentScore: current.scores.overall,
    scoreChange: change,
    scores: current.scores,
    newIssueCount: diff.newIssues.length,
    resolvedIssueCount: diff.resolvedIssues.length,
    recommendedActions: uniqueStrings([
      ...current.summary.topActions,
      ...contentOpportunities.map((opportunity) => opportunity.recommendation),
    ], 5),
    sections: [
      {
        heading: "Seven-day trend",
        items: [
          scoreChangeSentence(change, baseline.scores.overall),
          categoryTrend("Technical SEO", current.scores.technical, baseline.scores.technical),
          categoryTrend("Content and metadata", current.scores.metadata, baseline.scores.metadata),
          categoryTrend("Discoverability", current.scores.discoverability, baseline.scores.discoverability),
          categoryTrend("Performance", current.scores.performance, baseline.scores.performance),
        ],
      },
      {
        heading: "Issues this week",
        items: [
          `${diff.newIssues.length} discovered`,
          `${diff.resolvedIssues.length} resolved`,
          `${diff.severityIncreased.length} became more severe`,
          `${critical.length} critical issue${critical.length === 1 ? "" : "s"} outstanding`,
        ],
      },
      {
        heading: "Comparison with the previous briefing",
        items: [comparison],
      },
      {
        heading: "Focus for next week",
        items: [focus],
      },
    ],
    contentOpportunities,
    focusNextWeek: focus,
    generatedAt: (input.generatedAt || new Date()).toISOString(),
  }
}
