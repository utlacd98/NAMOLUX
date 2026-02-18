import { describe, expect, it } from "vitest"
import { generateNameStyleCandidates } from "@/lib/nameStyles"

describe("nameStyles generator", () => {
  it("returns meaning for all results when meaning mode is on", () => {
    const results = generateNameStyleCandidates({
      keywords: "travel booking",
      industry: "Travel & Tourism",
      vibe: "Playful",
      maxLength: 10,
      count: 12,
      selectedStyle: "mix",
      meaningMode: true,
      seed: "meaning-on",
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((item) => typeof item.meaningShort === "string" && item.meaningShort.length > 0)).toBe(true)
  })

  it("returns no meaning when meaning mode is off", () => {
    const results = generateNameStyleCandidates({
      keywords: "finance security",
      industry: "Finance",
      vibe: "Trustworthy",
      maxLength: 10,
      count: 12,
      selectedStyle: "mix",
      meaningMode: false,
      seed: "meaning-off",
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((item) => item.meaningShort == null)).toBe(true)
  })

  it("forces one style when a single style is selected", () => {
    const results = generateNameStyleCandidates({
      keywords: "wellness calm",
      industry: "Health & Wellness",
      vibe: "Luxury",
      maxLength: 10,
      count: 10,
      selectedStyle: "blend",
      meaningMode: true,
      seed: "single-style",
    })

    expect(results.length).toBeGreaterThan(0)
    expect(new Set(results.map((item) => item.style))).toEqual(new Set(["Blend"]))
  })

  it("mix styles returns multiple style labels", () => {
    const results = generateNameStyleCandidates({
      keywords: "software automation",
      industry: "SaaS & Software",
      vibe: "Futuristic",
      maxLength: 10,
      count: 16,
      selectedStyle: "mix",
      meaningMode: true,
      seed: "mix-style",
    })

    const styles = new Set(results.map((item) => item.style))
    expect(styles.size).toBeGreaterThan(1)
  })

  it("invented style meaning remains phonetic and does not fake etymology", () => {
    const results = generateNameStyleCandidates({
      keywords: "analytics platform",
      industry: "Technology",
      vibe: "Futuristic",
      maxLength: 10,
      count: 8,
      selectedStyle: "invented",
      meaningMode: true,
      seed: "invented-honest",
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((item) => item.style === "Invented")).toBe(true)
    expect(results.every((item) => (item.meaningShort || "").toLowerCase().includes("sound"))).toBe(true)
    expect(results.every((item) => !(item.meaningShort || "").includes("+"))).toBe(true)
  })

  it("filters out harsh endings and hard consonant clusters", () => {
    const results = generateNameStyleCandidates({
      keywords: "finance payments",
      industry: "Finance",
      vibe: "Trustworthy",
      maxLength: 10,
      count: 20,
      selectedStyle: "mix",
      meaningMode: true,
      seed: "phonetic-filter",
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((item) => !/(dl|vt|cf|zx|rk|cl)$/.test(item.name))).toBe(true)
    expect(results.every((item) => !/[bcdfghjklmnpqrstvwxyz]{4,}/.test(item.name))).toBe(true)
  })

  it("prioritises brandable endings and avoids obvious chopped output", () => {
    const results = generateNameStyleCandidates({
      keywords: "fintech lending",
      industry: "Finance",
      vibe: "Luxury",
      maxLength: 10,
      count: 18,
      selectedStyle: "mix",
      meaningMode: true,
      seed: "brandability-priority",
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((item) => !/(saveca|guardl)/.test(item.name))).toBe(true)
    expect(results.filter((item) => /(a|o|io|ly|fy|e)$/.test(item.name)).length).toBeGreaterThanOrEqual(
      Math.floor(results.length * 0.4),
    )
  })

  it("uses fintech brand profile for finance context instead of literal keyword mashups", () => {
    const results = generateNameStyleCandidates({
      keywords: "fintech payments lending",
      industry: "Finance",
      vibe: "Trustworthy",
      maxLength: 10,
      count: 20,
      selectedStyle: "mix",
      meaningMode: true,
      seed: "fintech-profile",
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.some((item) => item.style === "Invented")).toBe(true)
    expect(results.every((item) => !/(bank|loan|credit|money|finance)/.test(item.name))).toBe(true)
    expect(results.filter((item) => item.style === "Literal").length).toBeLessThanOrEqual(1)
  })
})
