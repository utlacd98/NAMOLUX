import { buildConcepts, buildMeaningBreakdown, dedupeByMeaningDiversity, scorePronounceability } from "@/lib/domainGen/meaning"

describe("meaning pipeline", () => {
  it("builds a meaning breakdown for generated-style names", () => {
    const concepts = buildConcepts({
      keyword: "brand name light",
      industry: "Technology",
      vibe: "luxury",
      conceptLimit: 10,
    })

    const breakdown = buildMeaningBreakdown({
      name: "namolux",
      roots: ["name", "lux"],
      concepts,
    })

    expect(concepts.length).toBeGreaterThanOrEqual(3)
    expect(breakdown.breakdown).toContain("->")
    expect(breakdown.oneLiner.length).toBeGreaterThan(16)
    expect(breakdown.meaningScore).toBeGreaterThanOrEqual(60)
  })

  it("scores pronounceable names higher than awkward clusters", () => {
    const clear = scorePronounceability("novalux")
    const awkward = scorePronounceability("zzzzqzx")

    expect(clear).toBeGreaterThan(awkward)
    expect(clear).toBeGreaterThanOrEqual(60)
    expect(awkward).toBeLessThanOrEqual(40)
  })

  it("dedupes near-identical roots and tiny spelling variants", () => {
    const deduped = dedupeByMeaningDiversity([
      { name: "novalux", roots: ["nova", "lux"] },
      { name: "novaluxa", roots: ["nova", "lux"] },
      { name: "mintforge", roots: ["mint", "forge"] },
    ])

    expect(deduped).toHaveLength(2)
    expect(deduped.map((item) => item.name)).toContain("novalux")
    expect(deduped.map((item) => item.name)).toContain("mintforge")
  })
})
