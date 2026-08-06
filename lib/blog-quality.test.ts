import { describe, expect, it } from "vitest"
import { blogPosts, getAllPosts, getPostReadTime, getPublicPosts, isMonetizableBlogPost, isPublicBlogPost } from "@/lib/blog"
import { auditBlogPosts } from "@/lib/blog-quality"

describe("blog editorial quality", () => {
  it("keeps the catalogue free of duplicate slugs and titles", () => {
    const duplicateIssues = auditBlogPosts(blogPosts).filter((issue) => issue.message.startsWith("Duplicate"))
    expect(duplicateIssues).toEqual([])
  })

  it("enforces the priority article publication contract", () => {
    const priorityIssues = auditBlogPosts(blogPosts).filter((issue) =>
      blogPosts.some((post) => post.slug === issue.slug && post.qualityTier === "priority"),
    )
    expect(priorityIssues).toEqual([])
  })

  it("sorts without mutating the source catalogue", () => {
    const firstSlug = blogPosts[0]?.slug
    getAllPosts()
    expect(blogPosts[0]?.slug).toBe(firstSlug)
  })

  it("uses content depth for honest read times", () => {
    const longestPost = getAllPosts().reduce((longest, post) =>
      getPostReadTime(post) > getPostReadTime(longest) ? post : longest,
    )
    expect(getPostReadTime(longestPost)).toBeGreaterThan(1)
  })

  it("keeps the public Journal intentionally curated while archive pages are reviewed", () => {
    const publicPosts = getPublicPosts()

    expect(publicPosts).toHaveLength(19)
    expect(publicPosts.every(isPublicBlogPost)).toBe(true)
    expect(publicPosts.map((post) => post.slug)).toEqual(expect.arrayContaining([
      "why-i-built-namolux",
      "best-namelix-alternatives-2026",
      "bust-a-name-vs-namolux",
      "namify-vs-namolux",
      "best-domain-extensions-2026",
    ]))
    expect(getAllPosts().filter(isMonetizableBlogPost)).toHaveLength(10)
  })
})
