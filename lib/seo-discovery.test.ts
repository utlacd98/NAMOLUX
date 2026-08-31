import { describe, expect, it } from "vitest"
import { getPublicPosts } from "@/lib/blog"
import { FOOTER_LINKS } from "@/lib/site-content"

const searchConsolePrioritySlugs = [
  "business-name-vs-legal-company-name-vs-dba",
  "best-domain-extensions-2026",
  "how-to-name-saas-product",
  "seo-friendly-startup-name",
  "domain-name-after-pivot",
  "wordoid-vs-namolux",
  "panabee-vs-namolux",
  "dot-com-vs-dot-ai-for-startups",
  "domain-hacks-guide",
  "namolux-vs-chatgpt-domain-name-generator",
] as const

describe("SEO discovery surfaces", () => {
  it("keeps every priority Search Console article published under a valid unique slug", () => {
    const slugs = getPublicPosts().map((post) => post.slug)

    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of searchConsolePrioritySlugs) {
      expect(slugs).toContain(slug)
    }
  })

  it("links the founder entity from the site-wide footer", () => {
    expect(FOOTER_LINKS).toContainEqual({
      href: "/journal/andrew-barrett",
      label: "Founder profile",
    })
  })

  it("publishes the editorial standards and corrections route site-wide", () => {
    expect(FOOTER_LINKS).toContainEqual({
      href: "/editorial-standards",
      label: "Editorial standards",
    })
  })
})
