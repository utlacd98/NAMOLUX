import { describe, expect, it } from "vitest"
import {
  auditSummaryText,
  buildTrendPoints,
  hasRunningAudit,
  latestCompletedAudit,
  normaliseSeoPayload,
  reportDataValue,
  siteProjectName,
  sortIssuesByPriority,
  type SeoAudit,
  type SeoIssue,
} from "@/components/founder-signal-seo/model"

const NOW = new Date("2026-07-17T12:00:00.000Z")

function audit(input: Partial<SeoAudit> & Pick<SeoAudit, "id">): SeoAudit {
  return {
    siteId: "site-1",
    auditType: "daily",
    status: "completed",
    ...input,
  }
}

describe("Founder Signal SEO dashboard model", () => {
  it("normalises only the documented dashboard envelope", () => {
    expect(normaliseSeoPayload(null)).toBeNull()
    expect(normaliseSeoPayload({ authenticated: true, projects: "invalid" })).toEqual({
      authenticated: true,
      isPro: false,
      accessState: "free",
      projects: [],
      sites: [],
      audits: [],
      reports: [],
      issues: [],
      performanceAvailable: false,
      notificationDeliveryAvailable: false,
    })
  })

  it("normalises structured audit summaries to safe display text", () => {
    const payload = normaliseSeoPayload({
      authenticated: true,
      notificationDeliveryAvailable: true,
      audits: [
        { id: "audit-1", summary: { text: "  Three issues need attention.  ", topActions: ["Fix titles"] } },
        { id: "audit-2", summary: { topActions: ["Fix links"] } },
      ],
    })

    expect(payload?.audits.map((item) => item.summary)).toEqual(["Three issues need attention.", null])
    expect(payload?.notificationDeliveryAvailable).toBe(true)
    expect(auditSummaryText({ text: "Measured summary" })).toBe("Measured summary")
    expect(auditSummaryText({ text: { unsafe: true } })).toBeNull()
  })

  it("selects the latest completed or partial audit for the selected site", () => {
    const audits = [
      audit({ id: "old", completedAt: "2026-07-14T12:00:00.000Z" }),
      audit({ id: "running", status: "running", startedAt: "2026-07-17T11:00:00.000Z" }),
      audit({ id: "latest", status: "partial", completedAt: "2026-07-16T12:00:00.000Z" }),
      audit({ id: "other", siteId: "site-2", completedAt: "2026-07-17T12:00:00.000Z" }),
    ]

    expect(latestCompletedAudit(audits, "site-1")?.id).toBe("latest")
    expect(hasRunningAudit(audits, "site-1")).toBe(true)
    expect(hasRunningAudit(audits, "site-2")).toBe(false)
  })

  it("builds an ordered trend from measured in-range audits only", () => {
    const points = buildTrendPoints([
      audit({ id: "later", overallScore: 72, completedAt: "2026-07-16T12:00:00.000Z" }),
      audit({ id: "too-old", overallScore: 95, completedAt: "2026-06-01T12:00:00.000Z" }),
      audit({ id: "failed", status: "failed", overallScore: 80, completedAt: "2026-07-15T12:00:00.000Z" }),
      audit({ id: "earlier", overallScore: 64, completedAt: "2026-07-12T12:00:00.000Z" }),
      audit({ id: "invalid", overallScore: 108, completedAt: "2026-07-13T12:00:00.000Z" }),
    ], "site-1", 7, NOW)

    expect(points.map(({ id, score }) => ({ id, score }))).toEqual([
      { id: "earlier", score: 64 },
      { id: "later", score: 72 },
    ])
  })

  it("sorts issues by severity before recency", () => {
    const issues = [
      { id: "low", severity: "low", lastDetectedAt: "2026-07-17", siteId: "site-1" },
      { id: "high-old", severity: "high", lastDetectedAt: "2026-07-14", siteId: "site-1" },
      { id: "critical", severity: "critical", lastDetectedAt: "2026-07-12", siteId: "site-1" },
      { id: "high-new", severity: "high", lastDetectedAt: "2026-07-16", siteId: "site-1" },
    ] as SeoIssue[]

    expect(sortIssuesByPriority(issues).map((issue) => issue.id)).toEqual([
      "critical",
      "high-new",
      "high-old",
      "low",
    ])
  })

  it("uses safe project and report fallbacks", () => {
    expect(siteProjectName({ id: "site-1", url: "not a URL", status: "active", monitoringEnabled: true }, [])).toBe("not a URL")
    expect(siteProjectName({ id: "site-1", url: "https://www.example.com", status: "active", monitoringEnabled: true }, [])).toBe("example.com")
    expect(reportDataValue({ recommendations: ["Fix titles", "Improve links"] }, "recommendations")).toBe("Fix titles | Improve links")
  })
})
