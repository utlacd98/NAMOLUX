import { getPostReadTime, type BlogCategory, type BlogPost, type BlogSection } from "./blog"

export const LONG_ARTICLE_MIN_READ_TIME = 8

export type ArticleInlineAdPlacement =
  | "article-after-intro"
  | "article-mid"
  | "comparison-after-summary"
  | "comparison-before-conclusion"

export interface PlannedArticleInlineAd {
  placement: ArticleInlineAdPlacement
  afterSectionIndex: number
}

export interface ArticleAdPlan {
  inline: PlannedArticleInlineAd[]
  beforeRelated: boolean
  sidebar: boolean
}

const isComparisonCategory = (category: BlogCategory) => category === "Tool Comparisons"

export function isCtaSection(section: BlogSection | undefined): boolean {
  if (!section) return false
  return section.type === "buttonCta"
    || section.type === "dualCta"
    || (section.type === "callout" && section.calloutType === "cta")
}

function isSafeBreakBefore(content: BlogSection[], sectionIndex: number): boolean {
  if (sectionIndex <= 0 || sectionIndex >= content.length) return false
  return !isCtaSection(content[sectionIndex - 1]) && !isCtaSection(content[sectionIndex])
}

function findIntroBreak(content: BlogSection[]): number | null {
  const firstSafeHeadingIndex = content.findIndex(
    (section, index) => section.type === "heading" && isSafeBreakBefore(content, index),
  )
  return firstSafeHeadingIndex === -1 ? null : firstSafeHeadingIndex - 1
}

function midpointHeadingCandidates(
  content: BlogSection[],
  introBreakIndex: number,
  level?: 2 | 3,
): number[] {
  return content.flatMap((section, index) => {
    if (section.type !== "heading") return []
    if (level && section.level !== level) return []
    if (index <= introBreakIndex + 3 || index >= content.length - 3) return []
    if (!isSafeBreakBefore(content, index)) return []
    return [index]
  })
}

function findMidpointBreak(content: BlogSection[], introBreakIndex: number): number | null {
  const h2Candidates = midpointHeadingCandidates(content, introBreakIndex, 2)
  const candidates = h2Candidates.length > 0
    ? h2Candidates
    : midpointHeadingCandidates(content, introBreakIndex)

  const midpoint = content.length / 2
  const headingIndex = candidates.toSorted(
    (left, right) => Math.abs(left - midpoint) - Math.abs(right - midpoint),
  )[0]

  return headingIndex === undefined ? null : headingIndex - 1
}

function conclusionHeadingCandidates(
  content: BlogSection[],
  introBreakIndex: number,
  level?: 2 | 3,
): number[] {
  return content.flatMap((section, index) => {
    if (section.type !== "heading") return []
    if (level && section.level !== level) return []
    if (index <= introBreakIndex + 3) return []
    if (!isSafeBreakBefore(content, index)) return []
    return [index]
  })
}

function findConclusionBreak(content: BlogSection[], introBreakIndex: number): number | null {
  const h2Candidates = conclusionHeadingCandidates(content, introBreakIndex, 2)
  const candidates = h2Candidates.length > 0
    ? h2Candidates
    : conclusionHeadingCandidates(content, introBreakIndex)
  const headingIndex = candidates.at(-1)

  return headingIndex === undefined ? null : headingIndex - 1
}

export function planArticleAds(post: BlogPost, monetizable = true): ArticleAdPlan {
  if (!monetizable) {
    return { inline: [], beforeRelated: false, sidebar: false }
  }

  const comparison = isComparisonCategory(post.category)
  const readTime = getPostReadTime(post)
  const introBreakIndex = findIntroBreak(post.content)
  const inline: PlannedArticleInlineAd[] = []

  if (introBreakIndex !== null) {
    inline.push({
      placement: comparison ? "comparison-after-summary" : "article-after-intro",
      afterSectionIndex: introBreakIndex,
    })

    if (comparison) {
      const conclusionBreakIndex = findConclusionBreak(post.content, introBreakIndex)
      if (conclusionBreakIndex !== null && conclusionBreakIndex !== introBreakIndex) {
        inline.push({
          placement: "comparison-before-conclusion",
          afterSectionIndex: conclusionBreakIndex,
        })
      }
    } else if (readTime >= LONG_ARTICLE_MIN_READ_TIME) {
      const midpointBreakIndex = findMidpointBreak(post.content, introBreakIndex)
      if (midpointBreakIndex !== null && midpointBreakIndex !== introBreakIndex) {
        inline.push({
          placement: "article-mid",
          afterSectionIndex: midpointBreakIndex,
        })
      }
    }
  }

  return {
    inline,
    beforeRelated: !comparison,
    sidebar: !comparison,
  }
}
