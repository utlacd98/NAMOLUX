import { describe, expect, it } from "vitest"
import {
  PRODUCT_CAPABILITIES,
  PUBLIC_PRODUCT_COPY,
  SITE_ACTIONS,
  SITE_NAVIGATION,
} from "./site-content"

describe("public decision-workspace positioning", () => {
  it("keeps the public product focused on Bulk Check and Founder Signal", () => {
    expect(PRODUCT_CAPABILITIES.supportsNameGeneration).toBe(false)
    expect(SITE_ACTIONS.startNaming).toEqual({ href: "/bulk-domain-check", label: "Check a shortlist" })
    expect(SITE_NAVIGATION.map((entry) => entry.label)).toEqual([
      "Bulk Check",
      "Founder Signal",
      "Journal",
      "Pricing",
    ])
  })

  it("publishes the £7.99 Pro workspace allowance consistently", () => {
    expect(PUBLIC_PRODUCT_COPY.proPlanSummary).toContain("120 Bulk Check runs")
    expect(PUBLIC_PRODUCT_COPY.proPlanSummary).toContain("120 Founder Signal runs")
    expect(PUBLIC_PRODUCT_COPY.proPlanSummary).toContain("UTC calendar month")
    expect(PUBLIC_PRODUCT_COPY.proPlanFeatures).not.toContain("Unlimited fair-use bulk shortlist checks")
  })
})
