import { describe, expect, it } from "vitest"

import { parseCompiledNameSprintPayload } from "./constitution"

describe("Name Constitution parsing", () => {
  it("preserves complete future-expansion statements", () => {
    const futureExpansion = "Potential expansion into adjacent trusted in-home services only if the brand can credibly stretch beyond the initial pet-care marketplace."
    const territory = (id: string) => ({
      id,
      label: id,
      meaning: "A relevant strategic territory.",
      tone: "credible",
      roots: [id],
      avoidRoots: [],
      strategies: ["suggestive"],
      phoneticCharacter: "clear and balanced",
    })
    const parsed = parseCompiledNameSprintPayload({
      constitution: {
        description: "A marketplace that helps pet owners find trusted local carers for holidays and busy working days.",
        category: "pet-care marketplace",
        audience: ["pet owners"],
        problem: "Owners struggle to find a trusted nearby carer.",
        promise: ["trusted local care"],
        personality: ["warm", "credible"],
        geographicMarkets: ["United Kingdom"],
        languages: ["English"],
        futureExpansion: [futureExpansion],
        competitors: [],
        likedNames: [],
        namingMode: "consumer_friendly",
        preferredLength: { min: 5, max: 12 },
        include: [],
        avoid: [],
        preferredTlds: ["com", "co"],
      },
      territories: [territory("care"), territory("trust"), territory("home"), territory("bond")],
    })

    expect(parsed?.constitution.futureExpansion).toEqual([futureExpansion])
  })
})
