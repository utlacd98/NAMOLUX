import { describe, expect, it } from "vitest"

import { evaluateEligibility } from "@/lib/name-sprint/eligibility"
import type { NameConstitution, RawNameCandidate } from "@/lib/name-sprint/types"
import { SYSTEM_RESERVED_NAME_MESSAGE } from "@/lib/reserved-names"

const constitution: NameConstitution = {
  description: "A test product",
  category: "software",
  audience: ["founders"],
  problem: "Naming takes too long",
  promise: ["better decisions"],
  personality: ["credible"],
  geographicMarkets: ["United Kingdom"],
  languages: ["English"],
  futureExpansion: [],
  competitors: [],
  likedNames: [],
  namingMode: "distinctive_startup",
  preferredLength: { min: 4, max: 12 },
  include: [],
  avoid: [],
  preferredTlds: ["com"],
}

function candidate(name: string): RawNameCandidate {
  return {
    id: "candidate-1",
    name,
    normalizedName: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    strategy: "invented",
    territoryId: "territory-1",
    roots: [name],
    association: "Test association",
    pronunciation: "nam-oh-lux",
    claimedOrigin: null,
    originVerified: false,
  }
}

describe("Name Sprint system reservation", () => {
  it.each(["NamoLux", "namo lux", "namo-lux", "namolux.com"])("rejects %s before normal eligibility scoring", (name) => {
    const result = evaluateEligibility(candidate(name), { constitution })
    expect(result).toEqual({
      status: "reject",
      failureCodes: ["SYSTEM_RESERVED_NAME"],
      reasons: [SYSTEM_RESERVED_NAME_MESSAGE],
      scoreCap: 0,
      matchedBrand: "NamoLux",
    })
  })

  it.each(["Cadence", "Tidal", "Mosaic", "Parallax", "Accord", "Warden", "Zenith"])("rejects active or saturated exact brand %s", (name) => {
    const result = evaluateEligibility(candidate(name), { constitution })
    expect(result.status).toBe("reject")
    expect(result.failureCodes).toContain("ACTIVE_BRAND_EXACT")
    expect(result.scoreCap).toBe(0)
  })

  it("does not regenerate an exact name seen in a recent user run", () => {
    const result = evaluateEligibility(candidate("Swellin"), { constitution, previouslyRejected: ["swellin"] })
    expect(result.status).toBe("reject")
    expect(result.failureCodes).toContain("PREVIOUSLY_REJECTED")
  })

  it("puts a repeatedly used root into cooldown", () => {
    const result = evaluateEligibility(candidate("Cedaric"), { constitution, recentRootFrequency: { cedaric: 4 } })
    expect(result.status).toBe("reject")
    expect(result.failureCodes).toContain("GENERIC_CLICHE")
  })

  it("does not hard-reject a name for a fatigued semantic root absent from its surface", () => {
    const result = evaluateEligibility(
      { ...candidate("Meldra"), roots: ["grain"] },
      { constitution, recentRootFrequency: { grain: 12 } },
    )
    expect(result.status).toBe("pass")
    expect(result.failureCodes).not.toContain("GENERIC_CLICHE")
  })
})
