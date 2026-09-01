import { describe, expect, it } from "vitest"

import {
  buildNameSprintDomainOptions,
  eligibleNameSprintLaunchTlds,
  selectNameSprintLaunchDomain,
  selectShortlistWithModifiedDomainCap,
} from "./domain-policy"

describe("Name Sprint brand-first domain policy", () => {
  it("checks only exact dot-com, dot-co and dot-ai domains", () => {
    const options = buildNameSprintDomainOptions("caldrin")

    expect(options.slice(0, 3).map((option) => option.domain)).toEqual([
      "caldrin.com",
      "caldrin.co",
      "caldrin.ai",
    ])
    expect(options).toHaveLength(3)
    expect(options.every((option) => option.kind === "exact")).toBe(true)
  })

  it("always recommends an available exact domain before a modified domain", () => {
    const checkedAt = new Date().toISOString()
    const result = selectNameSprintLaunchDomain("caldrin", new Map([
      ["caldrin.ai", { available: true, unknown: false, checkedAt }],
      ["getcaldrin.com", { available: true, unknown: false, checkedAt }],
    ]))

    expect(result.launchDomain).toMatchObject({ domain: "caldrin.ai", kind: "exact", modifier: null })
  })

  it("does not admit a modified dot-com when exact priority domains are unavailable", () => {
    const checkedAt = new Date().toISOString()
    const result = selectNameSprintLaunchDomain("caldrin", new Map([
      ["caldrin.com", { available: false, unknown: false, checkedAt }],
      ["getcaldrin.com", { available: true, unknown: false, checkedAt }],
    ]))

    expect(result.launchDomain).toBeNull()
  })

  it("keeps dot-com, dot-co and dot-ai eligible across naming modes", () => {
    const base = {
      description: "A marketplace that helps pet owners find trusted local carers for holidays and busy working days.",
      category: "pet-care marketplace",
      problem: "Owners struggle to find a trusted nearby carer.",
      namingMode: "consumer_friendly" as const,
    }
    expect(eligibleNameSprintLaunchTlds(base)).toEqual(["com", "co", "ai"])
    expect(eligibleNameSprintLaunchTlds({
      ...base,
      description: "Cybersecurity software that automates threat evidence for engineering teams.",
      category: "cybersecurity software",
      namingMode: "technical_credible",
    })).toEqual(["com", "co", "ai"])
  })

  it("admits an exact available dot-ai for a consumer brief", () => {
    const checkedAt = new Date().toISOString()
    const result = selectNameSprintLaunchDomain("pawstead", new Map([
      ["pawstead.com", { available: false, unknown: false, checkedAt }],
      ["pawstead.co", { available: false, unknown: false, checkedAt }],
      ["pawstead.ai", { available: true, unknown: false, checkedAt }],
    ]), eligibleNameSprintLaunchTlds({
      description: "A marketplace that helps pet owners find trusted local carers.",
      category: "pet-care marketplace",
      problem: "Owners struggle to find a trusted nearby carer.",
      namingMode: "consumer_friendly",
    }))

    expect(result.domainStatuses.find((domain) => domain.tld === "ai")?.status).toBe("available")
    expect(result.launchDomain).toMatchObject({ domain: "pawstead.ai", kind: "exact" })
  })

  it("keeps no more than two modified-domain candidates in a shortlist", () => {
    const exact = (domain: string) => ({ launchDomain: { domain, kind: "exact" as const, modifier: null, checkedAt: "now" } })
    const modified = (domain: string) => ({ launchDomain: { domain, kind: "modified" as const, modifier: "get", checkedAt: "now" } })
    const selected = selectShortlistWithModifiedDomainCap([
      exact("one.com"),
      modified("gettwo.com"),
      modified("getthree.com"),
      modified("getfour.com"),
      exact("five.ai"),
    ], 8)

    expect(selected.map((candidate) => candidate.launchDomain.domain)).toEqual([
      "one.com",
      "gettwo.com",
      "getthree.com",
      "five.ai",
    ])
  })
})
