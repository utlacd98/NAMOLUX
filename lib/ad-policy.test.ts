import { describe, expect, it } from "vitest"
import {
  AD_PLACEMENT_CONFIG,
  AD_PLACEMENTS,
  getAdPlacementConfig,
  isMonetizedPathname,
  type AdPlacement,
} from "./ad-policy"

const expectedPlacements = [
  "generator-after-results",
  "founder-result-after-primary",
  "article-after-intro",
  "article-mid",
  "article-before-related",
  "comparison-after-summary",
  "comparison-before-conclusion",
  "journal-after-first-section",
  "guide-after-intro",
  "guide-mid",
  "guide-before-conclusion",
  "article-sidebar",
] as const satisfies readonly AdPlacement[]

describe("ad placement policy", () => {
  it("publishes the complete placement union and immutable configuration", () => {
    expect(AD_PLACEMENTS).toEqual(expectedPlacements)
    expect(Object.keys(AD_PLACEMENT_CONFIG)).toEqual(expectedPlacements)
    expect(Object.isFrozen(AD_PLACEMENT_CONFIG)).toBe(true)

    for (const placement of expectedPlacements) {
      const config = getAdPlacementConfig(placement)
      expect(config).toBe(AD_PLACEMENT_CONFIG[placement])
      expect(Object.isFrozen(config)).toBe(true)
      expect(config.rootMargin).toBe("700px 0px")
      expect(config.responsive).toBe(true)
      expect(config.reserveClassName).toMatch(/min-h-/)
      expect(config.adClassName).toMatch(/min-h-/)
    }
  })

  it("maps placements to their shared slot groups", () => {
    expect(getAdPlacementConfig("generator-after-results").slotGroup).toBe("generator")
    expect(getAdPlacementConfig("founder-result-after-primary").slotGroup).toBe("results")
    expect(getAdPlacementConfig("journal-after-first-section").slotGroup).toBe("journal")

    const articlePlacements = expectedPlacements.filter((placement) => (
      placement.startsWith("article-")
      || placement.startsWith("comparison-")
      || placement.startsWith("guide-")
    )).filter((placement) => placement !== "article-sidebar")

    for (const placement of articlePlacements) {
      expect(getAdPlacementConfig(placement).slotGroup).toBe("article")
    }
  })

  it("makes only the vertical sidebar desktop-only", () => {
    for (const placement of expectedPlacements) {
      const config = getAdPlacementConfig(placement)
      const sidebar = placement === "article-sidebar"
      expect(config.desktopOnly).toBe(sidebar)
      expect(config.format).toBe(sidebar ? "vertical" : "auto")
      expect(config.fullWidth).toBe(!sidebar)
    }
  })
})

describe("isMonetizedPathname", () => {
  it.each([
    "/blog/how-to-pick-a-startup-name",
  ])("allows the monetized route %s", (pathname) => {
    expect(isMonetizedPathname(pathname)).toBe(true)
  })

  it("normalizes trailing slashes, queries, hashes, and dot segments", () => {
    expect(isMonetizedPathname("  /blog/naming-guide/?utm_source=test#summary  ")).toBe(true)
    expect(isMonetizedPathname("/blog/drafts/../published-name#intro")).toBe(true)
  })

  it.each([
    null,
    undefined,
    "",
    "generate",
    "https://namolux.com/blog/name-guide",
    "//namolux.com/blog/name-guide",
    "/",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/dashboard",
    "/dashboard/settings",
    "/account",
    "/pricing",
    "/generate",
    "/generate/advanced",
    "/results",
    "/results/example-result",
    "/blog",
    "/blog/",
    "/blog/article/comments",
    "/journal",
    "/journal/founder-notes",
    "/journal/andrew-barrett",
    "/journal/article/comments",
    "/how-to-name-a-startup",
    "/domain-vs-brand",
    "/name-mistakes",
    "/seo-domain-check",
    "/brand-longevity",
    "/seo-audit",
    "/seo-audit/result",
    "/founder-signal",
    "/founder-signal/methodology",
    "/startup-name-ideas",
    "/startup-name-ideas/fintech",
    "/startup-name-ideas/fintech/archive",
    "/generate-more",
    "/results-preview",
    "/blogger/name-guide",
    "/generate//advanced",
    "/blog/name%2Fguide",
    "/blog\\name-guide",
  ])("rejects the non-monetized or unsafe route %s", (pathname) => {
    expect(isMonetizedPathname(pathname)).toBe(false)
  })
})
