import { describe, expect, it } from "vitest"
import {
  createCurationDraft,
  normalizeApprovedRanks,
  parseCuratorProgress,
  parseSourceBlindWorkspace,
  serializeCuratorProgress,
  upsertCandidateDecision,
} from "./workspace"
import type { SourceBlindCuratorPack } from "./types"

const pack: SourceBlindCuratorPack = {
  schemaVersion: 1,
  packId: "blind-pack-one",
  brief: {
    id: "train-friendly-example",
    redactedDescription: "A calm scheduling tool for neighbourhood repair collectives",
    vibe: "friendly",
    style: "auto",
    creativity: "balanced",
    maxLength: 10,
    split: "train",
  },
  slots: [{
    blindSlotId: "blind-one",
    status: "available",
    name: "mendly",
    rationale: "A warm shorthand for making neighbourhood repairs easier.",
    gapReason: null,
  }],
}

describe("local naming curator workspace format", () => {
  it("accepts a single source-blind pack and rejects provenance-bearing imports", () => {
    expect(parseSourceBlindWorkspace(pack).packs).toEqual([pack])
    expect(() => parseSourceBlindWorkspace({ ...pack, providerId: "openai" })).toThrow(/source-bearing/i)
    expect(() => parseSourceBlindWorkspace({ packs: [pack], privateProvenance: {} })).toThrow(/source-bearing/i)
  })

  it("persists and restores a pass-one draft without changing it", () => {
    const draft = upsertCandidateDecision(createCurationDraft(pack.packId), "blind-one", {
      rating: "Great",
      approved: true,
      shortlisted: true,
      conceptFamily: "repair together",
    })
    const progress = {
      schemaVersion: 1 as const,
      datasetId: "pilot-v1",
      activeBriefId: pack.brief.id,
      drafts: { [pack.brief.id]: draft },
    }
    expect(parseCuratorProgress(serializeCuratorProgress(progress))).toEqual(progress)
  })

  it("assigns contiguous ranks and the three required rank tiers", () => {
    let draft = createCurationDraft(pack.packId)
    for (let index = 24; index >= 1; index -= 1) {
      draft = upsertCandidateDecision(draft, `blind-${index}`, {
        rating: index > 16 ? "Average" : "Good",
        approved: true,
        shortlisted: index <= 8,
        rank: index,
      })
    }
    const ranked = normalizeApprovedRanks(draft)
    const decisions = [...ranked.decisions].sort((left, right) => (left.rank || 0) - (right.rank || 0))
    expect(decisions.map((decision) => decision.rank)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1))
    expect(decisions[7].rankTier).toBe("lead")
    expect(decisions[8].rankTier).toBe("strong")
    expect(decisions[16].rankTier).toBe("exploratory")
  })
})
