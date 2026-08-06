import { describe, expect, it } from "vitest"
import { getAllPosts } from "@/lib/blog"

const retiredProductHref = /^\/(?:generate(?:\/|$)|preview-gen(?:\/|$)|seo-audit(?:\/|$))/
const retiredOfferCopy = /(?:quick generate|quick exploration|three advanced batches|unlimited fair[- ]use|brand palette access|stress tests?, exports, brand tools|seo monitoring)/i
const staleNamoLuxCapabilityClaim = /\bNamoLux\b[^.\n]{0,120}\b(?:generates?\s+(?:names?|candidates?|shortlists?)|name generation|brand palettes?|stress tests?|seo monitoring)\b/i

function publicPostText() {
  return getAllPosts().flatMap((post) => [
    post.title,
    post.description,
    post.seoTitle || "",
    post.metaDescription || "",
    ...(post.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
    ...post.content.flatMap((section) => [
      section.content,
      ...(section.items || []),
      ...(section.headers || []),
      ...(section.rows || []).flat(),
      section.alt || "",
      section.caption || "",
    ]),
  ])
}

describe("public blog decision-workspace compatibility", () => {
  it("does not expose retired product routes through article CTAs or links", () => {
    for (const post of getAllPosts()) {
      for (const section of post.content) {
        expect(section.ctaLink || "").not.toMatch(retiredProductHref)
        expect(section.ctaLink2 || "").not.toMatch(retiredProductHref)
        for (const link of section.links || []) {
          expect(link.href).not.toMatch(retiredProductHref)
        }
      }
    }

    expect(publicPostText().join("\n")).not.toMatch(/\]\(\/(?:generate(?:\/|\)|\?)|preview-gen(?:\/|\)|\?)|seo-audit(?:\/|\)|\?))/i)
  })

  it("replaces the legacy NamoLux offer copy with the published decision-workspace offer", () => {
    const productClaims = publicPostText().filter((text) => /\b(?:NamoLux|Founder Signal|Quick Generate|Quick exploration|Advanced batches?|Pro)\b/i.test(text))

    expect(productClaims.join("\n")).not.toMatch(retiredOfferCopy)
    expect(productClaims.join("\n")).not.toMatch(staleNamoLuxCapabilityClaim)
    expect(productClaims.join("\n")).toContain("120 Bulk Check runs")
    expect(productClaims.join("\n")).toContain("120 Founder Signal runs")
  })
})
