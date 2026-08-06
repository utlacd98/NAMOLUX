import { describe, expect, it } from "vitest"

import { getBrandFootprintLinks } from "@/components/bulk-decision-workspace"

describe("brand footprint links", () => {
  it("prepares direct social and official registry verification links for a candidate", () => {
    const links = getBrandFootprintLinks("harbor-lume")

    expect(links.social.map((link) => link.label)).toEqual(["X", "Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook"])
    expect(links.social.every((link) => link.href.includes("harbor-lume"))).toBe(true)
    expect(links.registries.map((link) => link.label)).toEqual(["UK IPO", "USPTO", "EUIPO", "Companies House"])
    expect(links.registries.find((link) => link.label === "USPTO")?.href).toContain("harbor-lume")
    expect(links.registries.find((link) => link.label === "Companies House")?.href).toContain("harbor-lume")
  })
})
