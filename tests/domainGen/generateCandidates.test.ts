import { generateDomainCandidates } from "@/lib/domainGen/generateCandidates"

describe("generateDomainCandidates", () => {
  it("returns deterministic output for the same seed", () => {
    const input = {
      keyword: "fitness app",
      industry: "Sports & Fitness",
      vibe: "trustworthy",
      maxLength: 10,
      controls: {
        seed: "seed-123",
        mustIncludeKeyword: "partial" as const,
        keywordPosition: "anywhere" as const,
        style: "brandable_blends" as const,
        blocklist: [],
        allowlist: [],
        allowHyphen: false,
        allowNumbers: false,
        preferTwoWordBrands: true,
        allowVibeSuffix: false,
        showAnyAvailable: false,
      },
    }

    const first = generateDomainCandidates(input, { poolSize: 120 }).candidates.slice(0, 20).map((c) => c.name)
    const second = generateDomainCandidates(input, { poolSize: 120 }).candidates.slice(0, 20).map((c) => c.name)

    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(0)
  })

  it("injects keyword roots when exact inclusion is requested", () => {
    const input = {
      keyword: "travel guide",
      industry: "Travel & Tourism",
      vibe: "minimal",
      maxLength: 12,
      controls: {
        seed: "travel-seed",
        mustIncludeKeyword: "exact" as const,
        keywordPosition: "prefix" as const,
        style: "real_words" as const,
        blocklist: [],
        allowlist: [],
        allowHyphen: false,
        allowNumbers: false,
        preferTwoWordBrands: false,
        allowVibeSuffix: false,
        showAnyAvailable: false,
      },
    }

    const generated = generateDomainCandidates(input, { poolSize: 140 }).candidates
    const withKeyword = generated.filter((item) => item.name.includes("travel") || item.name.includes("guide"))

    expect(withKeyword.length).toBeGreaterThan(0)
  })

  it("keeps candidates compact under tight length constraints", () => {
    const input = {
      keyword: "blink pixel snap",
      industry: "Technology",
      vibe: "minimal",
      maxLength: 7,
      controls: {
        seed: "short-seed",
        mustIncludeKeyword: "partial" as const,
        keywordPosition: "anywhere" as const,
        style: "real_words" as const,
        blocklist: [],
        allowlist: [],
        allowHyphen: false,
        allowNumbers: false,
        preferTwoWordBrands: true,
        allowVibeSuffix: false,
        showAnyAvailable: false,
      },
    }

    const generated = generateDomainCandidates(input, { poolSize: 120 }).candidates

    expect(generated.length).toBeGreaterThan(0)
    expect(generated.every((item) => item.name.length <= 7)).toBe(true)
    expect(generated.some((item) => /[aeiouy]/.test(item.name))).toBe(true)
  })
})
