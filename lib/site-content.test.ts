import { describe, expect, it } from "vitest"
import {
  FOOTER_LINKS,
  PRODUCT_CAPABILITIES,
  PUBLIC_PRODUCT_COPY,
  SITE_ACTIONS,
  SITE_NAVIGATION,
} from "./site-content"

describe("public decision-workspace positioning", () => {
  it("publishes Name Sprint as the primary route into the decision workspace", () => {
    expect(PRODUCT_CAPABILITIES.supportsNameGeneration).toBe(true)
    expect(SITE_ACTIONS.startNaming).toEqual({ href: "/generate", label: "Start a Name Sprint" })
    expect(SITE_NAVIGATION.map((entry) => entry.label)).toEqual([
      "Name Sprint",
      "Bulk Check",
      "Founder Signal",
      "Launch Kit",
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

  it("links the company story and founder profile as separate footer destinations", () => {
    expect(FOOTER_LINKS).toContainEqual({ href: "/founder-story", label: "Founder story" })
    expect(FOOTER_LINKS).toContainEqual({
      href: "/journal/andrew-barrett",
      label: "Founder profile",
    })
  })
})
