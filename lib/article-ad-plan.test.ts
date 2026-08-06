import { describe, expect, it } from "vitest"
import { blogPosts, getPostReadTime } from "./blog"
import {
  LONG_ARTICLE_MIN_READ_TIME,
  isCtaSection,
  planArticleAds,
} from "./article-ad-plan"

describe("planArticleAds", () => {
  it("covers the complete published article inventory", () => {
    expect(blogPosts.length).toBeGreaterThanOrEqual(139)
  })

  it.each(blogPosts.map((post) => [post.slug, post] as const))(
    "creates a category-aware, CTA-safe plan for %s",
    (_slug, post) => {
      const plan = planArticleAds(post)
      const comparison = post.category === "Tool Comparisons"
      const expectedInlineCount = comparison
        ? 2
        : getPostReadTime(post) >= LONG_ARTICLE_MIN_READ_TIME ? 2 : 1

      expect(plan.inline).toHaveLength(expectedInlineCount)
      expect(plan.beforeRelated).toBe(!comparison)
      expect(plan.sidebar).toBe(!comparison)

      const placements = plan.inline.map((ad) => ad.placement)
      expect(new Set(placements).size).toBe(placements.length)
      expect(new Set(plan.inline.map((ad) => ad.afterSectionIndex)).size).toBe(plan.inline.length)

      if (comparison) {
        expect(placements).toEqual([
          "comparison-after-summary",
          "comparison-before-conclusion",
        ])
      } else {
        expect(placements[0]).toBe("article-after-intro")
        expect(placements.includes("article-mid")).toBe(
          getPostReadTime(post) >= LONG_ARTICLE_MIN_READ_TIME,
        )
      }

      const firstSafeHeadingIndex = post.content.findIndex((section, index) => (
        section.type === "heading"
        && !isCtaSection(post.content[index - 1])
        && !isCtaSection(section)
      ))
      expect(plan.inline[0]?.afterSectionIndex).toBe(firstSafeHeadingIndex - 1)

      for (const ad of plan.inline) {
        const before = post.content[ad.afterSectionIndex]
        const after = post.content[ad.afterSectionIndex + 1]

        expect(ad.afterSectionIndex).toBeGreaterThanOrEqual(0)
        expect(ad.afterSectionIndex).toBeLessThan(post.content.length - 1)
        expect(isCtaSection(before)).toBe(false)
        expect(isCtaSection(after)).toBe(false)
        expect(after?.type).toBe("heading")
      }
    },
  )

  it("does not repeat the legacy ad-before-CTA placement", () => {
    const post = blogPosts.find(({ slug }) => slug === "best-domain-extensions-2026")
    expect(post).toBeDefined()

    const plan = planArticleAds(post!)
    expect(plan.inline.some((ad) => ad.afterSectionIndex === 2)).toBe(false)
    expect(isCtaSection(post!.content[3])).toBe(true)
  })

  it("returns no placements for an article that has not passed monetisation review", () => {
    const post = blogPosts.find(({ slug }) => slug === "launch-checklist-first-product")
    expect(post).toBeDefined()
    expect(planArticleAds(post!, false)).toEqual({
      inline: [],
      beforeRelated: false,
      sidebar: false,
    })
  })
})
