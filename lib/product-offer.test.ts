import { describe, expect, it } from "vitest"

import { PLAN_CONFIG } from "@/lib/plans"
import { PRODUCT_OFFER } from "@/lib/product-offer"

describe("public shortlist offer", () => {
  it("keeps Bulk Check on Free and Founder Signal on Pro", () => {
    expect(PLAN_CONFIG.free.bulkCheckMonthlyLimit).toBe(3)
    expect(PRODUCT_OFFER.freeAdvancedBatches).toBe(3)
    expect(PRODUCT_OFFER.freeFounderSignalBatches).toBe(0)
    expect(PRODUCT_OFFER.freeFeatures).toContain("3 bulk shortlist checks per month")
    expect(PRODUCT_OFFER.freeUsageLabel).toMatch(/3 bulk check runs/i)
    expect(PRODUCT_OFFER.freeFounderSignalUsageLabel).toMatch(/available with Pro/i)
  })

  it("keeps Pro ad-free with published finite checking and scoring access", () => {
    expect(PLAN_CONFIG.pro.adFree).toBe(true)
    expect(PLAN_CONFIG.pro.bulkCheckMonthlyLimit).toBe(120)
    expect(PLAN_CONFIG.pro.founderSignalBatchMonthlyLimit).toBe(120)
    expect(PLAN_CONFIG.pro.unlimitedUsage).toBe(false)
    expect(PRODUCT_OFFER.proFeatures.join(" ")).toMatch(/120 bulk shortlist checks/i)
    expect(PRODUCT_OFFER.proFeatures.join(" ")).toMatch(/120 Founder Signal runs/i)
  })
})
