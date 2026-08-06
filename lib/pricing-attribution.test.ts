import { describe, expect, it } from "vitest"
import { parsePricingAttribution, withPricingAttribution } from "./pricing-attribution"

describe("pricing attribution", () => {
  it("preserves allowlisted attribution", () => {
    const attribution = parsePricingAttribution({ source: "article", content: "fintech-naming-guide", return: "/blog/fintech-naming-guide" })
    expect(attribution).toEqual({ source: "article", content: "fintech-naming-guide", returnPath: "/blog/fintech-naming-guide" })
    expect(withPricingAttribution("/api/stripe/checkout", attribution)).toBe("/api/stripe/checkout?source=article&content=fintech-naming-guide&return=%2Fblog%2Ffintech-naming-guide")
  })

  it("drops external redirects and malformed slugs", () => {
    expect(parsePricingAttribution({ source: "unknown", content: "private brief text?", return: "https://attacker.example/collect?q=brief" }))
      .toEqual({ source: "pricing", content: undefined, returnPath: undefined })
  })

  it("does not allow a raw brief in a return query", () => {
    expect(parsePricingAttribution({ source: "generator", return: "/generate?q=a-secret-startup-brief" }))
      .toEqual({ source: "generator", content: undefined, returnPath: undefined })
  })
})
