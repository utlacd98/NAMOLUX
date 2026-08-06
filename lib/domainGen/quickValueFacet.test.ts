import { describe, expect, it } from "vitest"
import {
  generateQuickCandidates,
  getQuickValueFacet,
  hasQuickValueFacetIntersection,
} from "@/lib/domainGen/quickGenerate"

describe("Quick privacy value facet", () => {
  it("preserves privacy inside the bookkeeping job across paraphrases and seeds", () => {
    const descriptions = [
      "A privacy-first bookkeeping platform for independent creative freelancers",
      "Confidential accounting software for freelance consultants",
      "Private-by-design invoicing and tax tools for self-employed designers",
    ]

    for (const description of descriptions) {
      expect(getQuickValueFacet(description)?.id, description).toBe("privacy_first")

      for (const seed of ["facet-a", "facet-b", "facet-c", "facet-d"]) {
        const results = generateQuickCandidates({
          description,
          vibe: "clean",
          style: "auto",
          creativity: "balanced",
          maxChars: 12,
          count: 16,
          seed,
        })
        const intersections = results.filter(
          (candidate) => hasQuickValueFacetIntersection(candidate, description),
        )

        expect(results, `${description} / ${seed}`).toHaveLength(16)
        expect(new Set(results.map(({ name }) => name)).size, `${description} / ${seed}`).toBe(16)
        expect(intersections.length, `${description} / ${seed}`).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it("does not apply a privacy quota to unrelated bookkeeping briefs", () => {
    const description = "Simple bookkeeping software for a family-owned bakery"
    expect(getQuickValueFacet(description)).toBeNull()
  })
})
