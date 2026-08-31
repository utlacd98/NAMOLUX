import type { BlogPost } from "@/lib/blog"
import { getPostWordCount } from "@/lib/blog"

export interface BlogQualityIssue {
  slug: string
  message: string
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function duplicateIssues(posts: BlogPost[], field: "slug" | "title"): BlogQualityIssue[] {
  const seen = new Map<string, string>()
  const issues: BlogQualityIssue[] = []

  for (const post of posts) {
    const value = normalize(post[field])
    const existing = seen.get(value)
    if (existing) {
      issues.push({ slug: post.slug, message: `Duplicate ${field} also used by ${existing}` })
    } else {
      seen.set(value, post.slug)
    }
  }

  return issues
}

function articleText(post: BlogPost) {
  return post.content.flatMap((section) => [
    section.content,
    ...(section.items || []),
    ...(section.headers || []),
    ...(section.rows || []).flat(),
  ]).join(" ")
}

function ngrams(value: string, size = 5) {
  const words = normalize(value).split(/\s+/).filter(Boolean)
  const grams = new Set<string>()
  for (let index = 0; index <= words.length - size; index += 1) {
    grams.add(words.slice(index, index + size).join(" "))
  }
  return grams
}

function priorityOverlapIssues(posts: BlogPost[]): BlogQualityIssue[] {
  const articleGrams = new Map(posts.map((post) => [post.slug, ngrams(articleText(post))]))
  const issues: BlogQualityIssue[] = []

  for (const post of posts.filter((item) => item.qualityTier === "priority")) {
    const current = articleGrams.get(post.slug) || new Set<string>()
    if (current.size === 0) continue

    for (const candidate of posts) {
      if (candidate.slug === post.slug || candidate.qualityTier === "priority" && candidate.slug < post.slug) continue
      const other = articleGrams.get(candidate.slug) || new Set<string>()
      if (other.size === 0) continue
      let shared = 0
      for (const gram of current) if (other.has(gram)) shared += 1
      const containment = shared / Math.min(current.size, other.size)
      if (containment >= 0.12) {
        issues.push({
          slug: post.slug,
          message: `Potential content overlap with ${candidate.slug} (${Math.round(containment * 100)}% shared five-word phrases)`,
        })
      }
    }
  }

  return issues
}

/**
 * Archive drafts remain in source control while they are reviewed, but the
 * live article route publishes only the curated public set. New priority
 * articles must meet this stricter publication contract.
 */
export function auditBlogPosts(posts: BlogPost[]): BlogQualityIssue[] {
  const issues = [
    ...duplicateIssues(posts, "slug"),
    ...duplicateIssues(posts, "title"),
    ...priorityOverlapIssues(posts),
  ]

  for (const post of posts.filter((item) => item.qualityTier === "priority")) {
    const wordCount = getPostWordCount(post)
    if (wordCount < 900) issues.push({ slug: post.slug, message: `Priority article has only ${wordCount} words; minimum is 900` })
    if (!post.seoTitle || post.seoTitle.length > 60) issues.push({ slug: post.slug, message: "Priority article needs an SEO title of 60 characters or fewer" })
    if (!post.metaDescription || post.metaDescription.length < 120 || post.metaDescription.length > 160) issues.push({ slug: post.slug, message: "Priority article needs a 120–160 character meta description" })
    if (!post.updatedAt) issues.push({ slug: post.slug, message: "Priority article needs an updatedAt date" })
    if (!post.primaryKeyword) issues.push({ slug: post.slug, message: "Priority article needs one primary keyword" })
    if (!post.searchIntent) issues.push({ slug: post.slug, message: "Priority article needs a declared search intent" })
    if (!post.pillar) issues.push({ slug: post.slug, message: "Priority article needs a pillar" })
    if ((post.relatedSlugs || []).length < 3) issues.push({ slug: post.slug, message: "Priority article needs at least three intentional related articles" })
    if ((post.sources || []).length < 2) issues.push({ slug: post.slug, message: "Priority article needs at least two authoritative sources" })
    for (const relatedSlug of post.relatedSlugs || []) {
      if (!posts.some((candidate) => candidate.slug === relatedSlug)) {
        issues.push({ slug: post.slug, message: `Related article does not exist: ${relatedSlug}` })
      }
    }
    for (const source of post.sources || []) {
      if (!source.url.startsWith("https://")) {
        issues.push({ slug: post.slug, message: `Source must use HTTPS: ${source.url}` })
      }
    }
  }

  return issues
}
