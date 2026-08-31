import { describe, expect, it } from "vitest"

import {
  rankScoutCandidateRows,
  SCOUT_FOUNDER_SIGNAL_FLOOR,
  SCOUT_STRONG_SIGNAL_FLOOR,
} from "@/lib/autonomous-domain-scout"

describe("Autonomous Domain Scout shortlist quality", () => {
  it("uses a meaningful shortlist floor and a separate strong-stop floor", () => {
    expect(SCOUT_FOUNDER_SIGNAL_FLOOR).toBe(65)
    expect(SCOUT_STRONG_SIGNAL_FLOOR).toBeGreaterThan(SCOUT_FOUNDER_SIGNAL_FLOOR)
  })

  it("omits rejected evidence and ranks quality before extension breadth", () => {
    const ranked = rankScoutCandidateRows([
      { candidate_name: "widebutweak", state: "survived", founder_signal: { score: 66 }, availability: { com: { available: true }, io: { available: true }, co: { available: true } } },
      { candidate_name: "strongidea", state: "survived", founder_signal: { score: 79 }, availability: { com: { available: true } } },
      { candidate_name: "rejectedname", state: "rejected", founder_signal: { score: 95 }, availability: { com: { available: true } } },
      { candidate_name: "unknownidea", state: "partial", founder_signal: { score: 72 }, availability: { com: { confidence: "low" } } },
    ])

    expect(ranked.map((candidate) => candidate.candidate_name)).toEqual(["strongidea", "unknownidea", "widebutweak"])
  })

  it("uses confirmed extension breadth and evidence state as deterministic tie-breakers", () => {
    const ranked = rankScoutCandidateRows([
      { candidate_name: "partialname", state: "partial", founder_signal: { score: 72 }, availability: { com: { confidence: "low" } } },
      { candidate_name: "oneextension", state: "survived", founder_signal: { score: 72 }, availability: { com: { available: true } } },
      { candidate_name: "twoextensions", state: "survived", founder_signal: { score: 72 }, availability: { com: { available: true }, io: { available: true } } },
    ])

    expect(ranked.map((candidate) => candidate.candidate_name)).toEqual(["twoextensions", "oneextension", "partialname"])
  })
})
