import { describe, expect, it } from "vitest"
import { blogPosts, getAllPosts, getPostBySlug, isValidBlogSlug } from "@/lib/blog"

function internalHrefs(post: (typeof blogPosts)[number]) {
  const hrefs = post.content.flatMap((section) => [
    section.ctaLink,
    section.ctaLink2,
    ...(section.links || []).map((link) => link.href),
    ...Array.from(section.content.matchAll(/\[[^\]]+\]\((\/[^)]+)\)/g), (match) => match[1]),
  ]).filter((value): value is string => typeof value === "string")
  return hrefs.filter((href) => href.startsWith("/"))
}

describe("published blog routing", () => {
  it("excludes placeholders and malformed slugs from every public route source", () => {
    expect(isValidBlogSlug("null")).toBe(false)
    expect(isValidBlogSlug("undefined")).toBe(false)
    expect(isValidBlogSlug("")).toBe(false)
    expect(isValidBlogSlug("bad/slug")).toBe(false)
    expect(getPostBySlug("null")).toBeUndefined()
    expect(getAllPosts()).toHaveLength(blogPosts.length)
    expect(getAllPosts().every((post) => isValidBlogSlug(post.slug))).toBe(true)
  })

  it("has no null, undefined, duplicate-slash, or unresolved internal blog links", () => {
    for (const post of getAllPosts()) {
      for (const href of internalHrefs(post)) {
        expect(href, `${post.slug}: ${href}`).not.toMatch(/(?:null|undefined)/i)
        expect(href, `${post.slug}: ${href}`).not.toMatch(/^\/\//)
        if (href.startsWith("/blog/")) {
          expect(getPostBySlug(href.slice("/blog/".length)), `${post.slug}: ${href}`).toBeDefined()
        }
      }
    }
  })
})
