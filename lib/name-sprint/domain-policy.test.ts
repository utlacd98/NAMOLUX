import { describe, expect, it } from "vitest"

import {
  buildNameSprintDomainOptions,
  selectNameSprintLaunchDomain,
  selectShortlistWithModifiedDomainCap,
} from "./domain-policy"

describe("Name Sprint brand-first domain policy", () => {
  it("checks exact domains before a bounded set of clean dot-com launch domains", () => {
    const options = buildNameSprintDomainOptions("caldrin")

    expect(options.slice(0, 3).map((option) => option.domain)).toEqual([
      "caldrin.com",
      "caldrin.co",
      "caldrin.ai",
    ])
    expect(options.filter((option) => option.kind === "modified").map((option) => option.domain)).toEqual([
      "getcaldrin.com",
      "usecaldrin.com",
      "trycaldrin.com",
      "joincaldrin.com",
      "caldrinhq.com",
    ])
  })

  it("always recommends an available exact domain before a modified domain", () => {
    const checkedAt = new Date().toISOString()
    const result = selectNameSprintLaunchDomain("caldrin", new Map([
      ["caldrin.ai", { available: true, unknown: false, checkedAt }],
      ["getcaldrin.com", { available: true, unknown: false, checkedAt }],
    ]))

    expect(result.launchDomain).toMatchObject({ domain: "caldrin.ai", kind: "exact", modifier: null })
  })

  it("falls back to a clearly identified clean launch domain", () => {
    const checkedAt = new Date().toISOString()
    const result = selectNameSprintLaunchDomain("caldrin", new Map([
      ["caldrin.com", { available: false, unknown: false, checkedAt }],
      ["getcaldrin.com", { available: true, unknown: false, checkedAt }],
    ]))

    expect(result.launchDomain).toMatchObject({ domain: "getcaldrin.com", kind: "modified", modifier: "get" })
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
