import { describe, expect, it } from "vitest"
import {
  getNicheBySlug,
  pseoNiches,
  validatePseoContentIntegrity,
  type NicheData,
} from "./pseo-niches"

describe("pSEO niche content integrity", () => {
  it("publishes post-gate counts and canonical Founder Signal scores", () => {
    expect(validatePseoContentIntegrity()).toEqual([])

    for (const niche of pseoNiches) {
      expect(niche.publishedNameCount).toBe(niche.names.length)
      expect(niche.displayedNameCount).toBe(niche.names.length)
      expect(niche.industryName).toBe(niche.niche)
      expect(niche.industryArticle).toMatch(/^(a|an)$/)
      expect(niche.scoreVersion).toBe("1.0")
      expect(niche.lastVerified).toBe("2026-07-10")
      expect(niche.availableExtensions).toEqual([".com", ".io", ".co", ".ai", ".app", ".dev"])
      expect(niche.supportsSocialHandleCheck).toBe(false)
      expect([niche.metaTitle, niche.metaDescription, niche.h1, niche.intro].join(" ")).not.toMatch(/\b150\b/)
    }

    const aiNames = getNicheBySlug("ai")?.names.map((idea) => idea.name.toLowerCase()) ?? []
    expect(getNicheBySlug("ai")?.industryArticle).toBe("an")
    expect(aiNames).not.toEqual(expect.arrayContaining(["vantiq", "axoniq", "corteva"]))
  })

  it("reports count, version, collision, and unsupported social claims", () => {
    const ai = getNicheBySlug("ai")
    expect(ai).toBeDefined()
    if (!ai) return

    const invalidNiche = {
      ...ai,
      publishedNameCount: ai.publishedNameCount + 1,
      scoreVersion: "0.9",
      intro: `${ai.intro} Live social-handle availability is included.`,
      names: [
        ...ai.names,
        {
          name: "Vantiq",
          meaning: "Known active company collision",
          domain: "vantiq.com",
          score: 88,
          band: "Strong",
        },
      ],
    } as unknown as NicheData

    const codes = validatePseoContentIntegrity([invalidNiche]).map((issue) => issue.code)
    expect(codes).toEqual(
      expect.arrayContaining(["count", "score-version", "collision", "social-claim"]),
    )
  })
})
