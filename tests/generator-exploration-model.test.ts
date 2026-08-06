import { describe, expect, it } from "vitest"
import {
  NAME_STYLE_OPTIONS,
  createEmptyPreferenceProfile,
  getQuickStyleMinimumLength,
  applyCandidateDislikes,
  collectFailedAvailabilityTlds,
  isFounderSignalAllowanceExhaustedResponse,
  learnFromCandidate,
  mergeAvailability,
  mergeFounderSignal,
  markAvailabilityFailed,
  markFailedAvailabilityChecking,
  normalisePreferenceProfile,
  parseBlacklist,
  parseGeneratedCandidates,
  parseQuickGenerationShortfall,
  planAvailabilityTldChunks,
  orderCandidatesForDecision,
  resolveGeneratorResultsAdPosition,
  selectVerifiedAvailableDomain,
  sortCandidatesByFounderSignal,
  type GeneratedName,
} from "@/components/generator-exploration-model"

const TLDS = ["com", "io", "ai"] as const

function candidates(): GeneratedName[] {
  return parseGeneratedCandidates(
    {
      candidates: [
        {
          id: "second",
          name: "Calvora",
          rationale: "Calm confidence for a finance audience.",
          style: "evocative",
          generationRank: 2,
          availability: {},
          founderSignal: null,
        },
        {
          id: "first",
          name: "Ledgerly",
          rationale: "A clear ledger cue with a fluent ending.",
          style: "brandable",
          generationRank: 1,
          availability: {},
          founderSignal: null,
        },
      ],
    },
    TLDS,
    16,
  )
}

describe("generator exploration response adapter", () => {
  it("describes the bounded reviewed locale coverage without broader language claims", () => {
    expect(NAME_STYLE_OPTIONS.find((option) => option.id === "non_english")?.description)
      .toBe("Reviewed French (Québec) or Welsh forms")
    expect(getQuickStyleMinimumLength("non_english")).toBe(12)
    expect(getQuickStyleMinimumLength("auto")).toBe(6)
  })

  it("preserves generation rank rather than availability order", () => {
    const parsed = candidates()
    expect(parsed.map((candidate) => candidate.id)).toEqual(["first", "second"])
    expect(Object.keys(parsed[0].availability)).toEqual(TLDS)
    expect(parsed[0].availability.com.status).toBe("checking")
  })

  it("merges async domain checks without removing or reordering candidates", () => {
    const merged = mergeAvailability(candidates(), {
      results: [
        { name: "Calvora", tld: "com", fullDomain: "calvora.com", available: true, checkStatus: "available" },
        { name: "Ledgerly", tld: "com", fullDomain: "ledgerly.com", available: false, checkStatus: "taken" },
      ],
    })
    expect(merged.map((candidate) => candidate.id)).toEqual(["first", "second"])
    expect(merged[0].availability.com.status).toBe("taken")
    expect(merged[1].availability.com.status).toBe("available")
  })

  it("never invents or saves a .com while availability is pending or inconclusive", () => {
    const [pending] = candidates()
    expect(selectVerifiedAvailableDomain(pending)).toBeNull()

    const [inconclusive] = mergeAvailability([pending], {
      results: [
        { name: pending.name, tld: "com", fullDomain: "ledgerly.com", available: true, checkStatus: "likely_available" },
        { name: pending.name, tld: "io", fullDomain: "ledgerly.io", available: false, checkStatus: "taken" },
      ],
    })
    expect(selectVerifiedAvailableDomain(inconclusive)).toBeNull()

    const [verified] = mergeAvailability([inconclusive], {
      results: [
        { name: pending.name, tld: "ai", fullDomain: "ledgerly.ai", available: true, checkStatus: "available" },
      ],
    })
    expect(selectVerifiedAvailableDomain(verified)).toBe("ledgerly.ai")
  })

  it("places a single free Quick ad after cards while keeping Pro ad-free", () => {
    const base = { hasResultsReady: true, redesignEnabled: true, isQuickMode: true }
    expect(resolveGeneratorResultsAdPosition({ ...base, isProUser: false })).toBe("inline_after_quick_results")
    expect(resolveGeneratorResultsAdPosition({ ...base, isProUser: true })).toBe("none")
    expect(resolveGeneratorResultsAdPosition({ ...base, hasResultsReady: false, isProUser: false })).toBe("none")
    expect(resolveGeneratorResultsAdPosition({ ...base, redesignEnabled: false, isProUser: false })).toBe("after_results")
    expect(resolveGeneratorResultsAdPosition({ ...base, isQuickMode: false, isProUser: false })).toBe("after_results")
  })

  it("retries only failed availability states without changing candidate order", () => {
    const failed = markAvailabilityFailed(candidates())
    failed[0].availability.com = { ...failed[0].availability.com, status: "taken", available: false }
    const retrying = markFailedAvailabilityChecking(failed)

    expect(retrying.map((candidate) => candidate.id)).toEqual(["first", "second"])
    expect(retrying[0].availability.com.status).toBe("taken")
    expect(retrying[0].availability.io.status).toBe("checking")
    expect(retrying[1].availability.com.status).toBe("checking")
    expect(collectFailedAvailabilityTlds(failed)).toEqual(["io", "ai", "com"])
  })

  it("annotates Founder Signal without sorting until explicitly requested", () => {
    const scored = mergeFounderSignal(candidates(), {
      results: [
        { id: "first", name: "Ledgerly", founderSignal: { status: "ready", score: 72, band: "Promising" } },
        { id: "second", name: "Calvora", founderSignal: { status: "ready", score: 91, band: "Exceptional" } },
      ],
    })
    expect(sortCandidatesByFounderSignal(scored, false).map((candidate) => candidate.id)).toEqual(["first", "second"])
    expect(sortCandidatesByFounderSignal(scored, true).map((candidate) => candidate.id)).toEqual(["second", "first"])
    expect(orderCandidatesForDecision(scored, true, "first").map((candidate) => candidate.id)).toEqual(["first", "second"])
  })

  it("distinguishes monthly Founder Signal exhaustion from transient throttling", () => {
    expect(isFounderSignalAllowanceExhaustedResponse(429, { error: "founder_signal_monthly_limit_reached" })).toBe(true)
    expect(isFounderSignalAllowanceExhaustedResponse(429, { error: "founder_signal_rate_limited" })).toBe(false)
    expect(isFounderSignalAllowanceExhaustedResponse(503, { error: "usage_check_unavailable" })).toBe(false)
  })

  it("adapts the legacy flattened result shape", () => {
    const parsed = parseGeneratedCandidates(
      {
        results: [
          { name: "Northstar", tld: "com", fullDomain: "northstar.com", available: false, checkStatus: "taken", personality: "A steady navigation cue." },
          { name: "Northstar", tld: "io", fullDomain: "northstar.io", available: true, checkStatus: "likely_available" },
        ],
      },
      TLDS,
      16,
    )
    expect(parsed).toHaveLength(1)
    expect(parsed[0].rationale).toContain("navigation")
    expect(parsed[0].availability.io.status).toBe("likely_available")
  })

  it("splits only the TLD dimension to stay below the expanded-check cap", () => {
    expect(planAvailabilityTldChunks(16, ["com", "io", "ai", "app", "co", "dev"])).toEqual([
      ["com", "io", "ai", "app"],
      ["co", "dev"],
    ])
    expect(planAvailabilityTldChunks(12, ["com", "io", "ai", "app", "co", "dev"])).toEqual([
      ["com", "io", "ai", "app", "co", "dev"],
    ])
  })

  it("accepts only a fully described explicit-style partial batch", () => {
    const payload = {
      generationMeta: {
        requestedCount: 16,
        resultCount: 7,
        isPartial: true,
        styleShortfallReason: "Only 7 safe Evocative names met this brief; other styles were not substituted.",
      },
    }

    expect(parseQuickGenerationShortfall(payload, "evocative", 7, 16)).toEqual({
      reason: "Only 7 safe Evocative names met this brief; other styles were not substituted.",
      resultCount: 7,
      requestedCount: 16,
    })
    expect(parseQuickGenerationShortfall(payload, "auto", 7, 16)).toBeNull()
    expect(parseQuickGenerationShortfall(payload, "evocative", 16, 16)).toBeNull()
    expect(parseQuickGenerationShortfall({ generationMeta: { ...payload.generationMeta, styleShortfallReason: "" } }, "evocative", 7, 16)).toBeNull()
    expect(parseQuickGenerationShortfall({ generationMeta: { ...payload.generationMeta, resultCount: 6 } }, "evocative", 7, 16)).toBeNull()
  })
})

describe("local naming preferences", () => {
  it("stores only derived style, length and sound preferences", () => {
    const [candidate] = candidates()
    const learned = learnFromCandidate(createEmptyPreferenceProfile(), candidate, "save", 123)
    expect(learned.likedStyles).toEqual([candidate.style])
    expect(learned.preferredLength).toBeDefined()
    expect(learned.preferredSounds[0]).toHaveLength(3)
    expect(JSON.stringify(learned)).not.toContain(candidate.name)
    expect(JSON.stringify(learned)).not.toContain(candidate.rationale)
  })

  it("rebuilds active dislikes from a positive baseline so Undo restores that baseline", () => {
    const [candidate] = candidates()
    const positive = learnFromCandidate(createEmptyPreferenceProfile(), candidate, "save", 100)
    const disliked = applyCandidateDislikes(positive, [candidate])
    const undone = applyCandidateDislikes(positive, [])

    expect(disliked.dislikedStyles).toContain(candidate.style)
    expect(disliked.likedStyles).not.toContain(candidate.style)
    expect(undone).toEqual(positive)
  })

  it("sanitises untrusted persisted profiles and blacklist input", () => {
    const profile = normalisePreferenceProfile({
      version: 1,
      likedStyles: ["brandable", "not-a-style"],
      dislikedStyles: ["compound"],
      preferredSounds: ["ora", "<script>"],
      avoidedSounds: ["zzz"],
      updatedAt: 10,
    })
    expect(profile.likedStyles).toEqual(["brandable"])
    expect(profile.preferredSounds).toEqual(["ora"])
    expect(parseBlacklist(" Hub, nova\nHUB, script<script> ")).toEqual(["hub", "nova", "scriptscript"])
  })
})
