import { evaluateCandidateFilters } from "@/lib/domainGen/filters"
import { brandabilityScore, rankCandidates } from "@/lib/domainGen/scoreCandidates"

describe("filters and scoring", () => {
  it("rejects awkward low-quality names", () => {
    const decision = evaluateCandidateFilters("zzzzqzx", {
      maxLength: 12,
      controls: {
        seed: "",
        mustIncludeKeyword: "none",
        keywordPosition: "anywhere",
        style: "brandable_blends",
        blocklist: [],
        allowlist: [],
        allowHyphen: false,
        allowNumbers: false,
        meaningFirst: true,
        preferTwoWordBrands: false,
        allowVibeSuffix: false,
        showAnyAvailable: false,
      },
      blocklist: ["lux"],
      allowlist: [],
    })

    expect(decision.accepted).toBe(false)
    expect(decision.reasons).toContain("awkward_cluster")
  })

  it("scores industry-relevant names above off-topic names", () => {
    const ranked = rankCandidates(
      [
        { name: "fitcoachhub", strategy: "compound", roots: ["fit", "coach"], keywordHits: ["fit"] },
        { name: "ledgervault", strategy: "compound", roots: ["ledger", "vault"], keywordHits: [] },
      ],
      {
        industry: "Sports & Fitness",
        vibe: "trustworthy",
        keywordTokens: ["fit"],
        controls: {
          seed: "",
          mustIncludeKeyword: "none",
          keywordPosition: "anywhere",
          style: "brandable_blends",
          blocklist: [],
          allowlist: [],
          allowHyphen: false,
          allowNumbers: false,
          meaningFirst: true,
          preferTwoWordBrands: false,
          allowVibeSuffix: false,
          showAnyAvailable: false,
        },
      },
    )

    expect(ranked[0].name).toBe("fitcoachhub")
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it("accepts short brandable blends when pronounceability is still reasonable", () => {
    const decision = evaluateCandidateFilters("blinkr", {
      maxLength: 8,
      controls: {
        seed: "",
        mustIncludeKeyword: "none",
        keywordPosition: "anywhere",
        style: "brandable_blends",
        blocklist: [],
        allowlist: [],
        allowHyphen: false,
        allowNumbers: false,
        meaningFirst: true,
        preferTwoWordBrands: false,
        allowVibeSuffix: false,
        showAnyAvailable: false,
      },
      blocklist: [],
      allowlist: [],
    })

    expect(decision.accepted).toBe(true)
  })

  it("scores Novalux higher than gosnap for luxury flair", () => {
    const controls = {
      seed: "",
      mustIncludeKeyword: "partial" as const,
      keywordPosition: "anywhere" as const,
      style: "brandable_blends" as const,
      blocklist: [],
      allowlist: [],
      allowHyphen: false,
      allowNumbers: false,
      meaningFirst: true,
      preferTwoWordBrands: true,
      allowVibeSuffix: true,
      showAnyAvailable: false,
    }

    const novalux = brandabilityScore("novalux", {
      industry: "Technology",
      vibe: "luxury",
      keywordTokens: ["nova", "lux"],
      controls,
      strategy: "vibe_compound",
    })

    const gosnap = brandabilityScore("gosnap", {
      industry: "Technology",
      vibe: "luxury",
      keywordTokens: ["nova", "lux"],
      controls,
      strategy: "prefix_root",
    })

    expect(novalux.score).toBeGreaterThan(gosnap.score)
  })
})

