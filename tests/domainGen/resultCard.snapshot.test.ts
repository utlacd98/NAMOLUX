import { buildResultCardView } from "@/lib/domainGen/resultCard"

describe("result card view", () => {
  it("includes meaning text and badges", () => {
    const view = buildResultCardView({
      fullDomain: "namolux.com",
      whyItWorks: "Namo hints at naming, while Lux adds premium light energy.",
      meaningBreakdown: "namo (name cue) + lux (light/premium) -> namolux",
      meaningScore: 88,
      brandableScore: 9.2,
      pronounceable: true,
      available: true,
    })

    expect(view).toMatchInlineSnapshot(`
      {
        "badges": [
          "Meaning 88",
          "Brandable 9.2/10",
          "Pronounceable",
          "Available",
        ],
        "meaningBreakdown": "namo (name cue) + lux (light/premium) -> namolux",
        "title": "namolux.com",
        "whyItWorks": "Namo hints at naming, while Lux adds premium light energy.",
      }
    `)
  })
})
