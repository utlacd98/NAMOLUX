import { describe, expect, it } from "vitest"
import type { SeoAuditResult } from "@/lib/seo-monitoring"
import {
  auditCanResolveMissingIssues,
  getManualAuditCooldownState,
  getNextSeoScheduleBoundary,
  getSeoJobIdempotencyKey,
  getSeoScheduleAdvancement,
  getSeoScheduleKey,
} from "@/lib/seo-monitoring-service"

describe("SEO monitoring scheduling", () => {
  it("enforces a six-hour manual audit cooldown", () => {
    const started = "2026-07-17T10:00:00.000Z"
    expect(getManualAuditCooldownState(started, Date.parse("2026-07-17T15:59:59.000Z"))).toEqual({
      allowed: false,
      availableAt: "2026-07-17T16:00:00.000Z",
    })
    expect(getManualAuditCooldownState(started, Date.parse("2026-07-17T16:00:00.000Z")).allowed).toBe(true)
  })

  it("uses deterministic daily and weekly keys to prevent duplicate scheduled work", () => {
    const date = new Date("2026-07-17T23:59:00.000Z")
    expect(getSeoScheduleKey("daily", date)).toBe("2026-07-17")
    expect(getSeoJobIdempotencyKey("daily", date)).toBe("seo-daily:2026-07-17")
    expect(getSeoJobIdempotencyKey("weekly", date)).toBe("seo-weekly:2026-W29")
  })

  it("advances to fixed UTC cron boundaries without duration drift", () => {
    expect(getNextSeoScheduleBoundary("daily", new Date("2026-07-17T04:16:59.000Z")))
      .toBe("2026-07-17T04:17:00.000Z")
    expect(getNextSeoScheduleBoundary("daily", new Date("2026-07-17T04:17:00.000Z")))
      .toBe("2026-07-18T04:17:00.000Z")
    expect(getNextSeoScheduleBoundary("weekly", new Date("2026-07-17T23:59:00.000Z")))
      .toBe("2026-07-20T05:17:00.000Z")
    expect(getNextSeoScheduleBoundary("weekly", new Date("2026-07-20T05:17:00.000Z")))
      .toBe("2026-07-27T05:17:00.000Z")
  })

  it("uses a successful manual audit to satisfy the current daily schedule", () => {
    expect(getSeoScheduleAdvancement("manual", "2026-07-17T06:42:00.000Z")).toEqual({
      next_daily_audit_at: "2026-07-18T04:17:00.000Z",
    })
    expect(getSeoScheduleAdvancement("weekly", "2026-07-20T05:30:00.000Z")).toEqual({
      next_daily_audit_at: "2026-07-21T04:17:00.000Z",
      next_weekly_report_at: "2026-07-27T05:17:00.000Z",
    })
  })

  it("rejects invalid boundary dates rather than writing an invalid timestamp", () => {
    expect(() => getNextSeoScheduleBoundary("daily", new Date("invalid"))).toThrow(RangeError)
  })

  it("never resolves missing issues from an incomplete crawl", () => {
    expect(auditCanResolveMissingIssues({ partialFailures: [] } as unknown as SeoAuditResult)).toBe(true)
    expect(auditCanResolveMissingIssues({
      partialFailures: [{ stage: "performance" }],
    } as unknown as SeoAuditResult)).toBe(true)
    expect(auditCanResolveMissingIssues({
      partialFailures: [{ stage: "crawl" }],
    } as unknown as SeoAuditResult)).toBe(false)
    expect(auditCanResolveMissingIssues({
      partialFailures: [{ stage: "sitemap" }],
    } as unknown as SeoAuditResult)).toBe(false)
  })
})
