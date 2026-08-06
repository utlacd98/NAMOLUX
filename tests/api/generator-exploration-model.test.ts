import { describe, expect, it } from "vitest"

import {
  createEmptyPreferenceProfile,
  learnFromCandidate,
  markAvailabilityFailed,
  markAvailabilityTldsFailed,
  mergeAvailability,
  mergeFounderSignal,
  normalisePreferenceProfile,
  parseBlacklist,
  parseGeneratedCandidates,
  sortCandidatesByFounderSignal,
  type GeneratedName,
} from "@/components/generator-exploration-model"

const TLDS = ["com", "io", "ai"] as const

function candidate(overrides: Partial<GeneratedName> = {}): GeneratedName {
  return {
    id: "cand-ledgerly",
    name: "Ledgerly",
    rationale: "A clear ledger cue with a fluent, approachable ending.",
    style: "brandable",
    generationRank: 1,
    availability: {
      com: { status: "checking", available: null, confidence: null, fullDomain: "ledgerly.com" },
      io: { status: "checking", available: null, confidence: null, fullDomain: "ledgerly.io" },
      ai: { status: "checking", available: null, confidence: null, fullDomain: "ledgerly.ai" },
    },
    founderSignal: null,
    ...overrides,
  }
}

describe("candidate-first result contract", () => {
  it("normalises candidates, deduplicates names, and displays generation order", () => {
    const parsed = parseGeneratedCandidates(
      {
        candidates: [
          {
            id: "rank-three",
            name: "  Calvora  ",
            rationale: "Calm conviction for a modern finance brand.",
            style: "evocative",
            generationRank: 3,
          },
          {
            id: "rank-one",
            name: "Ledgerly",
            rationale: "A clear ledger cue with an approachable ending.",
            style: "brandable",
            generationRank: 1,
          },
          {
            id: "duplicate",
            name: "ledgerly",
            rationale: "This duplicate must not create a second card.",
            style: "compound",
            generationRank: 2,
          },
          {
            id: "rank-two",
            name: "VelaMint",
            rationale: "Signals velocity and fresh financial thinking.",
            style: "compound",
            generationRank: 2,
          },
        ],
      },
      TLDS,
      16,
    )

    expect(parsed.map(({ id }) => id)).toEqual(["rank-one", "rank-two", "rank-three"])
    expect(parsed[0]).toMatchObject({
      name: "Ledgerly",
      style: "brandable",
      generationRank: 1,
      founderSignal: null,
    })
    expect(Object.keys(parsed[0].availability)).toEqual(TLDS)
    expect(parsed[0].availability.com).toMatchObject({
      status: "checking",
      fullDomain: "ledgerly.com",
    })
  })

  it("prefers the candidate-first response when stale legacy arrays are also present", () => {
    const parsed = parseGeneratedCandidates(
      {
        candidates: [
          {
            id: "current-workflow-candidate",
            name: "Novara",
            rationale: "A current candidate-first result.",
            style: "brandable",
            generationRank: 1,
          },
        ],
        domains: [{ name: "StaleDomain", tld: "com", available: true }],
        results: [{ name: "StaleResult", tld: "io", available: true }],
      },
      TLDS,
      16,
    )

    expect(parsed.map(({ id }) => id)).toEqual(["current-workflow-candidate"])
  })

  it("adapts legacy one-row-per-TLD results without duplicating cards", () => {
    const parsed = parseGeneratedCandidates(
      {
        results: [
          {
            name: "Northstar",
            tld: "com",
            fullDomain: "northstar.com",
            available: false,
            checkStatus: "taken",
            personality: "A steady navigation cue for decisive founders.",
          },
          {
            name: "northstar",
            tld: "io",
            fullDomain: "northstar.io",
            available: true,
            checkStatus: "likely_available",
            availabilityConfidence: "medium",
          },
          { name: "!", tld: "ai", available: true },
          { tld: "ai", available: true },
        ],
      },
      TLDS,
      16,
    )

    expect(parsed).toHaveLength(1)
    expect(parsed[0].rationale).toContain("navigation")
    expect(parsed[0].availability.com.status).toBe("taken")
    expect(parsed[0].availability.io).toMatchObject({
      status: "likely_available",
      available: true,
      confidence: "medium",
    })
    expect(parsed[0].availability.ai.status).toBe("checking")
  })

  it("returns an empty model for malformed and stale response containers", () => {
    expect(parseGeneratedCandidates(null, TLDS, 16)).toEqual([])
    expect(parseGeneratedCandidates({ candidates: "not-an-array" }, TLDS, 16)).toEqual([])
    expect(parseGeneratedCandidates({ candidates: [{ name: "!" }, 7, null] }, TLDS, 16)).toEqual([])
  })

  it("keeps control-only Auto out of candidate styles and uses explicit null states", () => {
    const [parsed] = parseGeneratedCandidates({
      candidates: [{
        id: "candidate-one",
        name: "Calvora",
        style: "auto",
        generationRank: 1,
        founderSignal: { status: "scoring" },
      }],
    }, TLDS, 16)

    expect(parsed.style).toBe("brandable")
    expect(parsed.availability.com).toMatchObject({
      status: "checking",
      available: null,
      confidence: null,
      fullDomain: "calvora.com",
    })
    expect(parsed.founderSignal).toEqual({
      status: "scoring",
      score: null,
      band: null,
      breakdown: {},
      reasons: [],
      version: null,
    })
  })
})

describe("asynchronous availability updates", () => {
  it("merges known name updates without removing or reordering candidates", () => {
    const initial = [
      candidate(),
      candidate({
        id: "cand-calvora",
        name: "Calvora",
        generationRank: 2,
        availability: {
          com: { status: "checking", available: null, confidence: null, fullDomain: "calvora.com" },
          io: { status: "checking", available: null, confidence: null, fullDomain: "calvora.io" },
          ai: { status: "checking", available: null, confidence: null, fullDomain: "calvora.ai" },
        },
      }),
    ]

    const merged = mergeAvailability(initial, {
      results: [
        {
          name: "Calvora",
          tld: "com",
          fullDomain: "calvora.com",
          available: true,
          checkStatus: "available",
          availabilityConfidence: "high",
          registerUrl: "https://example.test/register/calvora.com",
        },
        {
          name: "Ledgerly",
          tld: "com",
          fullDomain: "ledgerly.com",
          available: false,
          checkStatus: "taken",
        },
        {
          name: "CandidateFromAnOldRequest",
          tld: "com",
          available: true,
          checkStatus: "available",
        },
      ],
    })

    expect(merged.map(({ id }) => id)).toEqual(["cand-ledgerly", "cand-calvora"])
    expect(merged[0].availability.com.status).toBe("taken")
    expect(merged[1].availability.com).toMatchObject({
      status: "available",
      available: true,
      confidence: "high",
      registerUrl: "https://example.test/register/calvora.com",
    })
    expect(merged[1].availability.io.status).toBe("checking")
  })

  it("marks only the failed checking TLDs while preserving completed checks", () => {
    const initial = [
      candidate({
        availability: {
          com: { status: "available", available: true, confidence: null, fullDomain: "ledgerly.com" },
          io: { status: "checking", available: null, confidence: null, fullDomain: "ledgerly.io" },
          ai: { status: "checking", available: null, confidence: null, fullDomain: "ledgerly.ai" },
        },
      }),
    ]

    const partiallyFailed = markAvailabilityTldsFailed(initial, ["com", "ai"])
    expect(partiallyFailed[0].availability.com.status).toBe("available")
    expect(partiallyFailed[0].availability.io.status).toBe("checking")
    expect(partiallyFailed[0].availability.ai.status).toBe("error")

    const completelyFailed = markAvailabilityFailed(partiallyFailed)
    expect(completelyFailed[0].availability.com.status).toBe("available")
    expect(completelyFailed[0].availability.io.status).toBe("error")
    expect(completelyFailed[0].availability.ai.status).toBe("error")
  })

  it("ignores malformed availability payloads instead of clearing current state", () => {
    const initial = [candidate()]
    expect(mergeAvailability(initial, null)).toBe(initial)
    expect(mergeAvailability(initial, { results: "stale" })).toBe(initial)
  })
})

describe("optional Founder Signal annotation and sorting", () => {
  it("preserves an exact score of zero instead of treating it as missing", () => {
    const [scored] = mergeFounderSignal([candidate()], {
      results: [
        {
          id: "cand-ledgerly",
          name: "Ledgerly",
          founderSignal: {
            status: "ready",
            score: 0,
            band: "Weak",
            breakdown: { clarity: 0, memorability: 12, malformed: "ignored" },
            reasons: ["Too generic", 42, "Low differentiation"],
            version: "founder-signal-v2",
          },
        },
      ],
    })

    expect(scored.founderSignal).toEqual({
      status: "ready",
      score: 0,
      band: "Weak",
      breakdown: { clarity: 0, memorability: 12 },
      reasons: ["Too generic", "Low differentiation"],
      version: "founder-signal-v2",
    })
  })

  it("sorts only when requested and restores generation order when disabled", () => {
    const generated = [
      candidate({ id: "rank-one", name: "Ledgerly", generationRank: 1 }),
      candidate({ id: "rank-two", name: "Calvora", generationRank: 2 }),
      candidate({ id: "rank-three", name: "VelaMint", generationRank: 3 }),
    ]
    const scored = mergeFounderSignal(generated, {
      results: [
        { id: "rank-one", founderSignal: { status: "ready", score: 0 } },
        { id: "rank-two", founderSignal: { status: "ready", score: 91 } },
        { id: "rank-three", founderSignal: { status: "failed" } },
      ],
    })

    const scoreOrder = sortCandidatesByFounderSignal(scored, true)
    expect(scoreOrder.map(({ id }) => id)).toEqual(["rank-two", "rank-one", "rank-three"])
    expect(sortCandidatesByFounderSignal(scoreOrder, false).map(({ id }) => id)).toEqual([
      "rank-one",
      "rank-two",
      "rank-three",
    ])
    expect(scored.map(({ id }) => id)).toEqual(["rank-one", "rank-two", "rank-three"])
  })

  it("ignores stale scoring rows and can fall back to matching a generated name", () => {
    const initial = [candidate()]
    const scored = mergeFounderSignal(initial, {
      results: [
        {
          id: "old-workflow-id",
          name: "AnUnrelatedOldName",
          founderSignal: { status: "ready", score: 99 },
        },
        {
          name: "ledgerly",
          founderSignal: { status: "ready", score: 64, band: "Promising" },
        },
      ],
    })

    expect(scored[0].founderSignal).toMatchObject({ score: 64, band: "Promising" })
  })
})

describe("privacy-safe local preference learning", () => {
  it.each(["save", "more_like_this"] as const)(
    "derives style, length, and phonetic preferences for %s without retaining raw input",
    (signal) => {
      const privateBrief = "A confidential zero-emissions payroll product for dentists"
      const input = {
        ...candidate({
          name: "VelaMint",
          rationale: "A private rationale that must not enter local preference storage.",
          style: "compound",
        }),
        brief: privateBrief,
      }

      const learned = learnFromCandidate(createEmptyPreferenceProfile(), input, signal, 1_234)
      const persisted = JSON.stringify(learned)

      expect(learned).toMatchObject({
        version: 1,
        likedStyles: ["compound"],
        preferredLength: "medium",
        preferredSounds: ["int"],
        updatedAt: 1_234,
      })
      expect(Object.keys(learned).sort()).toEqual(
        [
          "avoidedSounds",
          "dislikedStyles",
          "likedStyles",
          "preferredLength",
          "preferredSounds",
          "updatedAt",
          "version",
        ].sort(),
      )
      expect(persisted).not.toContain(privateBrief)
      expect(persisted).not.toContain(input.name)
      expect(persisted).not.toContain(input.rationale)
      expect(persisted).not.toContain("brief")
      expect(persisted).not.toContain("rationale")
    },
  )

  it("learns dislikes as derived negative preferences and removes conflicting positives", () => {
    const starting = {
      ...createEmptyPreferenceProfile(),
      likedStyles: ["brandable" as const],
      preferredSounds: ["rly"],
    }
    const learned = learnFromCandidate(starting, candidate(), "dislike", 456)

    expect(learned.likedStyles).toEqual([])
    expect(learned.dislikedStyles).toEqual(["brandable"])
    expect(learned.preferredSounds).toEqual([])
    expect(learned.avoidedSounds).toEqual(["rly"])
    expect(learned.updatedAt).toBe(456)
  })

  it("normalises malformed localStorage data to a bounded safe profile", () => {
    const normalised = normalisePreferenceProfile({
      version: 1,
      likedStyles: ["brandable", "not-a-style", 42, "compound", "evocative", "real_word", "short_phrase"],
      dislikedStyles: "brandable",
      preferredLength: "enormous",
      preferredSounds: ["ora", "A!", "toolong", 7, "mint", "vel", "ria", "nova", "zen"],
      avoidedSounds: ["zzz", "<script>", null],
      updatedAt: Number.NaN,
      brief: "must be discarded",
      name: "must also be discarded",
    })

    expect(normalised).toEqual({
      version: 1,
      likedStyles: ["brandable", "compound", "evocative", "real_word"],
      dislikedStyles: [],
      preferredLength: undefined,
      preferredSounds: ["ora", "mint", "vel", "ria", "nova", "zen"],
      avoidedSounds: ["zzz"],
      updatedAt: 0,
    })
    expect(normalisePreferenceProfile({ version: 2, likedStyles: ["brandable"] })).toEqual(
      createEmptyPreferenceProfile(),
    )
    expect(normalisePreferenceProfile("corrupt-json-fallback")).toEqual(createEmptyPreferenceProfile())
  })
})

describe("optional blacklist sanitisation", () => {
  it("normalises, deduplicates, bounds, and strips unsafe blacklist input", () => {
    const manyEntries = Array.from({ length: 25 }, (_, index) => `Word${index}`).join(",")
    const parsed = parseBlacklist(` Hub, nova\nHUB, co-op, <script>alert(1)</script>, ${manyEntries}`)

    expect(parsed.slice(0, 5)).toEqual(["hub", "nova", "co-op", "scriptalert1script", "word0"])
    expect(parsed).toHaveLength(20)
    expect(new Set(parsed).size).toBe(parsed.length)
    expect(parsed.every((entry) => /^[a-z0-9-]+$/.test(entry))).toBe(true)
  })

  it("drops entries that become empty", () => {
    expect(parseBlacklist(" , !!!, \n***")).toEqual([])
  })
})
