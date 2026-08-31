import { describe, expect, it } from "vitest"
import { SCOUT_MODE_BUDGETS } from "./autonomous-domain-scout"
import { getDailyLaunchAuditIdempotencyKey, isAllowedWinningHostname } from "./daily-launch-signal"
import { getSeoScheduleKey } from "./seo-monitoring-service"
import { PLAN_CONFIG } from "./plans"

describe("Daily Launch Signal entitlement contract", () => {
  it("enforces the published Free and Pro monitoring limits", () => {
    expect(PLAN_CONFIG.free.seoActiveSiteLimit).toBe(1)
    expect(PLAN_CONFIG.free.seoDailyPageLimit).toBe(3)
    expect(PLAN_CONFIG.pro.seoActiveSiteLimit).toBe(5)
    expect(PLAN_CONFIG.pro.seoDailyPageLimit).toBe(8)
  })

  it("accepts only an exact winning hostname or www variant", () => {
    expect(isAllowedWinningHostname("example.com", "example.com")).toBe(true)
    expect(isAllowedWinningHostname("www.example.com", "example.com")).toBe(true)
    expect(isAllowedWinningHostname("shop.example.com", "example.com")).toBe(false)
    expect(isAllowedWinningHostname("example.com.attacker.test", "example.com")).toBe(false)
  })

  it("uses the cron-compatible daily audit key for login catch-up", () => {
    const date = new Date("2026-08-15T12:00:00.000Z")
    const key = getSeoScheduleKey("daily", date)
    expect(getDailyLaunchAuditIdempotencyKey("site-1", key)).toBe("daily:site-1:2026-08-15")
  })
})

describe("Autonomous Scout hard budgets", () => {
  it("matches the 15/30/60-minute release contract", () => {
    expect(SCOUT_MODE_BUDGETS).toEqual({
      15: { creditCost: 1, maxWaves: 2, maxCandidates: 32, maxAvailabilityChecks: 192 },
      30: { creditCost: 2, maxWaves: 4, maxCandidates: 64, maxAvailabilityChecks: 384 },
      60: { creditCost: 4, maxWaves: 8, maxCandidates: 128, maxAvailabilityChecks: 768 },
    })
  })
})
