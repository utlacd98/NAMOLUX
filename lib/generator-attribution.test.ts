import { describe, expect, it } from "vitest"
import {
  buildGeneratorHref,
  formatContentLabel,
  parseContentSlug,
  parseGeneratorSource,
} from "./generator-attribution"

describe("generator attribution", () => {
  it.each(["home", "article", "niche", "guide"])("accepts source %s", (source) => {
    expect(parseGeneratorSource(source)).toBe(source)
  })

  it.each([undefined, "", "campaign", "ARTICLE", "https://evil.example"])("rejects source %s", (source) => {
    expect(parseGeneratorSource(source)).toBeNull()
  })

  it.each(["fintech-naming", "best-ai-name-generators-2026", "saas"])("accepts safe content slug %s", (slug) => {
    expect(parseContentSlug(slug)).toBe(slug)
  })

  it.each(["../admin", "hello/world", "has spaces", "https://evil.example", "a".repeat(121)])("rejects unsafe content slug %s", (slug) => {
    expect(parseContentSlug(slug)).toBeNull()
  })

  it("builds a bounded, encoded first-party generator URL", () => {
    expect(buildGeneratorHref({
      brief: "A privacy-first fintech for freelancers",
      source: "article",
      contentSlug: "fintech-naming",
    })).toBe("/generate?q=A+privacy-first+fintech+for+freelancers&source=article&content=fintech-naming")
  })

  it("formats a useful, non-sensitive context label", () => {
    expect(formatContentLabel("niche", "fintech-name-ideas")).toBe("Continuing from Fintech Name Ideas")
  })
})
