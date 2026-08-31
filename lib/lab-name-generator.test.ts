import { describe, expect, it } from "vitest"
import {
  buildLabCompletionRequest,
  containsLabExcludedTerm,
  DEFAULT_LAB_NAMING_MODEL,
  isGenericLabCompound,
  parseLabBrief,
  selectDiverseLabDrafts,
  type LabCandidateDraft,
} from "@/lib/lab-name-generator"

describe("lab name-generator brief validation", () => {
  const valid = { what: "A bookkeeping platform for independent studios", audience: "UK freelancers", tone: "trustworthy", direction: "evocative", include: ["calm"], exclude: ["tax"], maxLength: 10 }
  it("accepts the complete five-step brief", () => expect(parseLabBrief(valid)).toMatchObject({ tone: "trustworthy", direction: "evocative", maxLength: 10 }))
  it("rejects an incomplete, oversized, or invalid brief", () => {
    expect(parseLabBrief({ ...valid, what: "short" })).toBeNull()
    expect(parseLabBrief({ ...valid, tone: "loud" })).toBeNull()
    expect(parseLabBrief({ ...valid, maxLength: 20 })).toBeNull()
  })
  it("normalizes local-only constraint terms", () => expect(parseLabBrief({ ...valid, include: ["Calm!", 3], exclude: ["Tax advice"] })?.include).toEqual(["calm"]))

  it("accepts the comma-separated constraints sent by Domain Scout", () => {
    const parsed = parseLabBrief({
      ...valid,
      direction: "compound",
      include: "clear, flow, ledger, calm, nest",
      exclude: "AI, tax, accounting, bookkeeping, ledger, finance, cloud, pro, app",
    })

    expect(parsed?.include).toEqual(["clear", "flow", "calm", "nest"])
    expect(parsed?.exclude).toEqual(["ai", "tax", "accounting", "bookkeeping", "ledger", "finance", "cloud", "pro", "app"])
  })

  it("lets exclusions win when the same cue appears in both fields", () => {
    expect(parseLabBrief({ ...valid, include: ["calm", "ledger"], exclude: ["ledger"] })?.include).toEqual(["calm"])
  })
})

describe("lab name-generator quality controls", () => {
  it("uses Luna's supported low-cost chat-completions contract", () => {
    const request = buildLabCompletionRequest("Return candidates", 1_100, "gpt-5.6-luna")

    expect(DEFAULT_LAB_NAMING_MODEL).toBe("gpt-5.6-luna")
    expect(request).toMatchObject({
      model: "gpt-5.6-luna",
      reasoning_effort: "none",
      verbosity: "low",
      max_completion_tokens: 1_100,
      response_format: { type: "json_object" },
    })
    expect(request).not.toHaveProperty("temperature")
    expect(request).not.toHaveProperty("max_tokens")
  })

  it("blocks attached short exclusions without rejecting incidental letter pairs", () => {
    expect(containsLabExcludedTerm("aiflow", "ai")).toBe(true)
    expect(containsLabExcludedTerm("flowai", "ai")).toBe(true)
    expect(containsLabExcludedTerm("fairwind", "ai")).toBe(false)
    expect(containsLabExcludedTerm("promise", "pro")).toBe(false)
    expect(containsLabExcludedTerm("taxhaven", "tax")).toBe(true)
  })

  it("rejects the repeated generic compound template observed in Scout", () => {
    expect(isGenericLabCompound(["launch", "cue"])).toBe(true)
    expect(isGenericLabCompound(["stack", "pulse"])).toBe(true)
    expect(isGenericLabCompound(["runtime", "lens"])).toBe(true)
    expect(isGenericLabCompound(["signal", "fire"])).toBe(false)
    expect(isGenericLabCompound(["paper", "kite"])).toBe(false)
  })

  it("limits each compound component to two finalists", () => {
    const draft = (name: string, parts: string[]): LabCandidateDraft => ({ name, parts, rationale: `${name} rationale` })
    const pool = [
      draft("launchcue", ["launch", "cue"]),
      draft("launchwise", ["launch", "wise"]),
      draft("launchloom", ["launch", "loom"]),
      draft("firstcue", ["first", "cue"]),
      draft("marketcue", ["market", "cue"]),
      draft("signalpath", ["signal", "path"]),
      draft("signalnest", ["signal", "nest"]),
      draft("startsignal", ["start", "signal"]),
      draft("founderbeam", ["founder", "beam"]),
      draft("founderway", ["founder", "way"]),
      draft("gofounder", ["go", "founder"]),
      draft("paperkite", ["paper", "kite"]),
      draft("copperfield", ["copper", "field"]),
      draft("cedarbridge", ["cedar", "bridge"]),
      draft("northstar", ["north", "star"]),
      draft("silveroak", ["silver", "oak"]),
    ]
    const selected = selectDiverseLabDrafts(pool.map((candidate) => candidate.name), pool, 12)
    const partCounts = selected.flatMap((candidate) => candidate.parts).reduce<Record<string, number>>((counts, part) => ({ ...counts, [part]: (counts[part] || 0) + 1 }), {})

    expect(selected).toHaveLength(12)
    expect(Math.max(...Object.values(partCounts))).toBeLessThanOrEqual(2)
  })
})
