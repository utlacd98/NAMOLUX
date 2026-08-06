import { describe, expect, it } from "vitest"
import { evaluateCandidateFilters, hasMalformedCompoundPattern } from "@/lib/domainGen/filters"
import { generateCandidatePool } from "@/lib/domainGen/generateCandidates"
import { satisfiesKeywordConstraint } from "@/lib/domainGen/scoreCandidates"
import type { AutoFindControls } from "@/lib/domainGen/types"

function controls(mode: AutoFindControls["mustIncludeKeyword"]): AutoFindControls {
  return {
    seed: `keyword-optionality:${mode}`,
    mustIncludeKeyword: mode,
    keywordPosition: "anywhere",
    style: "brandable_blends",
    blocklist: [],
    allowlist: [],
    allowHyphen: false,
    allowNumbers: false,
    meaningFirst: true,
    preferTwoWordBrands: true,
    allowVibeSuffix: false,
    showAnyAvailable: false,
  }
}

describe("optional keyword semantics", () => {
  it("rejects vowel-damaged compound starts without blocking natural English clusters", () => {
    expect(hasMalformedCompoundPattern("vlvetvault")).toBe(true)
    expect(hasMalformedCompoundPattern("stridepath")).toBe(false)
    expect(hasMalformedCompoundPattern("shieldbase")).toBe(false)
  })

  it("does not reject an otherwise valid keyword-root name when inclusion is optional", () => {
    const decision = evaluateCandidateFilters("ledgerflow", {
      maxLength: 12,
      controls: controls("none"),
      blocklist: [],
      allowlist: [],
      keywordRoots: ["ledger"],
    })

    expect(decision.reasons).not.toContain("keyword_mutation")
    expect(decision.reasons).not.toContain("keyword_anchored")
  })

  it("allows organic keyword-root candidates into a deterministic optional pool", () => {
    const pool = generateCandidatePool(
      {
        keyword: "ledger accounting",
        industry: "Finance",
        vibe: "trustworthy",
        maxLength: 12,
        targetCount: 12,
        controls: controls("none"),
      },
      { poolSize: 240, seedSalt: "optional-root-regression" },
    )

    expect(pool.candidates.some((candidate) => candidate.name.includes("ledger"))).toBe(true)
  })

  it("keeps exact and partial constraints strict", () => {
    expect(satisfiesKeywordConstraint("ledgerflow", ["ledger"], "exact")).toBe(true)
    expect(satisfiesKeywordConstraint("emberpath", ["ledger"], "exact")).toBe(false)
    expect(satisfiesKeywordConstraint("ledgermint", ["ledger"], "partial")).toBe(true)
    expect(satisfiesKeywordConstraint("emberpath", ["ledger"], "partial")).toBe(false)
    expect(satisfiesKeywordConstraint("emberpath", ["ledger"], "none")).toBe(true)
  })
})
