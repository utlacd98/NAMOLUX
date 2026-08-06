import { describe, expect, it } from "vitest"

import { buildSourceBlindCuratorPack, resolveCurationDraft } from "@/lib/naming-specialist/curation"
import {
  buildTrainingExport,
  SHARED_QUICK_AUTO_TRAINING_CONTRACT,
  stableSha256,
  type AutoTrainingContract,
} from "@/lib/naming-specialist/export"
import {
  applyProviderCandidates,
  assertExactProviderRoster,
  createSpecialistCapturePlan,
  markProviderUnavailable,
} from "@/lib/naming-specialist/providers"
import {
  findCurationWarnings,
  validateGlobalApprovedNames,
  validatePassReadyCuration,
  validateSplitIsolation,
} from "@/lib/naming-specialist/validation"
import {
  SPECIALIST_PROVIDER_MODELS,
  type CurationDraft,
  type PassReadyCuration,
  type PrivateSpecialistCapture,
  type RankTier,
  type SpecialistBrief,
} from "@/lib/naming-specialist/types"
import { buildQuickAutoMessages } from "@/lib/domainGen/quickAutoContract"

const BRIEF: SpecialistBrief = {
  id: "train-premium-renewal",
  description: "Premium circular furniture renewal for boutique hotels",
  vibe: "premium",
  style: "auto",
  creativity: "balanced",
  maxLength: 15,
  rhymeWith: "glow",
  blacklist: ["cheap", "factory"],
  preferences: {
    likedStyles: ["evocative"],
    dislikedStyles: ["alternate_spelling"],
    preferredLength: "medium",
    preferredSounds: ["el", "or"],
    avoidedSounds: ["xq"],
  },
  locale: "English (United Kingdom)",
  semanticClusterId: "hotel-furniture-renewal",
  split: "train",
}

function tier(rank: number): RankTier {
  if (rank <= 8) return "lead"
  if (rank <= 16) return "strong"
  return "exploratory"
}

function completeCapture(): PrivateSpecialistCapture {
  let capture = createSpecialistCapturePlan(BRIEF)
  SPECIALIST_PROVIDER_MODELS.forEach((source, sourceIndex) => {
    capture = applyProviderCandidates(
      capture,
      source.sourceId,
      source.providerId,
      source.modelId,
      Array.from({ length: 12 }, (_, index) => ({
        ordinal: index + 1,
        status: "available" as const,
        candidate: {
          name: `cura${String.fromCharCode(97 + sourceIndex)}${String.fromCharCode(97 + index)}`,
          rationale: `A specific strategic rationale for candidate ${sourceIndex + 1}-${index + 1}.`,
        },
      })),
    )
  })
  return capture
}

function buildPassReadyFixture(): {
  curation: PassReadyCuration
  pack: ReturnType<typeof buildSourceBlindCuratorPack>["curatorPack"]
  draft: CurationDraft
} {
  const { curatorPack: pack } = buildSourceBlindCuratorPack(
    completeCapture(),
    "Premium circular furniture renewal for boutique hospitality teams",
    "a-deterministic-secret-blinding-salt",
  )
  let approvedRank = 0
  const decisions = pack.slots.map((slot) => {
    const approved = approvedRank < 23
    if (!approved) {
      return {
        blindSlotId: slot.blindSlotId,
        rating: "Reject" as const,
        shortlisted: false,
        approved: false,
        criticalDefect: { code: "weak_surface", note: "Not distinctive enough." },
      }
    }
    approvedRank += 1
    const rank = approvedRank
    return {
      blindSlotId: slot.blindSlotId,
      rating: rank <= 16 ? "Good" as const : "Average" as const,
      shortlisted: rank <= 8,
      approved: true,
      editedName: rank === 1 ? "elowen" : undefined,
      rank,
      rankTier: tier(rank),
      conceptFamily: `family-${Math.floor((rank - 1) / 4) + 1}`,
      visibleAffixes: [],
      criticalDefect: null,
    }
  })
  const draft: CurationDraft = {
    schemaVersion: 1,
    passNumber: 1,
    packId: pack.packId,
    status: "pass_ready",
    shortfall: null,
    decisions,
    additions: [{
      additionId: "curator-24",
      name: "veloria",
      rationale: "A warm, premium surface that suggests renewed value without literal category wording.",
      rating: "Average",
      shortlisted: false,
      approved: true,
      rank: 24,
      rankTier: "exploratory",
      conceptFamily: "family-6",
      visibleAffixes: [],
      criticalDefect: null,
    }],
  }
  return { curation: resolveCurationDraft(pack, draft), pack, draft }
}

function cloneCuration(
  source: PassReadyCuration,
  id: string,
  description: string,
  prefix: string,
): PassReadyCuration {
  return {
    ...source,
    packId: `${source.packId}-${id}`,
    brief: {
      ...source.brief,
      id,
      redactedDescription: description,
      semanticClusterId: `${id}-cluster`,
    },
    approvedNames: source.approvedNames.map((name) => ({
      ...name,
      approvedId: `${id}-${name.approvedId}`,
      name: `${prefix}${name.name}`,
    })),
  }
}

const CONTRACT: AutoTrainingContract = {
  id: "quick-auto-v1",
  buildInputMessages: (brief) => [
    { role: "system", content: "Return the production Auto response contract." },
    { role: "user", content: JSON.stringify(brief) },
  ],
  serializeAssistant: (names) => JSON.stringify({ names }),
}

describe("naming specialist provider capture", () => {
  it("retains exactly 12 slots for each exact model without silent substitution", () => {
    const capture = createSpecialistCapturePlan(BRIEF)
    expect(capture.batches).toHaveLength(3)
    expect(capture.batches.flatMap((batch) => batch.slots)).toHaveLength(36)
    expect(capture.batches.map(({ providerId, modelId }) => ({ providerId, modelId }))).toEqual([
      { providerId: "openai", modelId: "gpt-4.1-mini-2025-04-14" },
      { providerId: "openai", modelId: "gpt-5.6-sol" },
      { providerId: "groq", modelId: "qwen/qwen3.6-27b" },
    ])
    expect(capture.batches.flatMap((batch) => batch.slots).every((slot) => slot.status === "pending")).toBe(true)

    expect(() => applyProviderCandidates(
      capture,
      "openai-base",
      "openai",
      "gpt-5.6-sol",
      [],
    )).toThrow(/substitution is not allowed/)
    expect(() => applyProviderCandidates(
      capture,
      "openai-base",
      "openai",
      "gpt-4.1-mini-2025-04-14",
      [],
    )).toThrow(/all 12 slots/)
  })

  it("records a provider failure as 12 explicit unavailable gaps", () => {
    const capture = markProviderUnavailable(
      createSpecialistCapturePlan(BRIEF),
      "qwen-groq",
      "groq",
      "qwen/qwen3.6-27b",
      "Provider unavailable during scheduled capture.",
    )
    assertExactProviderRoster(capture)
    const batch = capture.batches.find((entry) => entry.sourceId === "qwen-groq")!
    expect(batch.slots).toHaveLength(12)
    expect(batch.slots.every((slot) => slot.status === "unavailable" && Boolean(slot.gapReason))).toBe(true)
  })
})

describe("source-blind curation", () => {
  it("separates the source-blind pack from private provenance and preserves all production inputs", () => {
    const { curatorPack, privateProvenance } = buildSourceBlindCuratorPack(
      completeCapture(),
      "Premium circular furniture renewal for boutique hospitality teams",
      "a-deterministic-secret-blinding-salt",
    )
    const publicJson = JSON.stringify(curatorPack)
    expect(publicJson).not.toContain("providerId")
    expect(publicJson).not.toContain("modelId")
    expect(publicJson).not.toContain("sourceSlotId")
    expect(publicJson).not.toContain("gpt-4.1-mini-2025-04-14")
    expect(privateProvenance.entries).toHaveLength(36)
    expect(curatorPack.slots).toHaveLength(36)
    expect(curatorPack.brief).toMatchObject({
      rhymeWith: "glow",
      blacklist: ["cheap", "factory"],
      locale: "English (United Kingdom)",
      preferences: BRIEF.preferences,
    })
    expect(curatorPack.brief).not.toHaveProperty("description")
  })

  it("allows Average only in ranks 17-24 and only requires ranks 1-8 to be shortlisted", () => {
    const { curation } = buildPassReadyFixture()
    expect(curation.approvedNames).toHaveLength(24)
    expect(curation.approvedNames.find((name) => name.rank === 9)?.shortlisted).toBe(false)
    expect(curation.approvedNames.find((name) => name.rank === 17)?.rating).toBe("Average")
    expect(validatePassReadyCuration(curation).valid).toBe(true)

    const invalidLead = structuredClone(curation)
    invalidLead.approvedNames[0].shortlisted = false
    expect(validatePassReadyCuration(invalidLead).issues.map((issue) => issue.code)).toContain("shortlist")

    const invalidStrong = structuredClone(curation)
    invalidStrong.approvedNames.find((name) => name.rank === 16)!.rating = "Average"
    expect(validatePassReadyCuration(invalidStrong).issues.map((issue) => issue.code)).toContain("rating")
  })

  it("refuses to pad an honest insufficient-quality shortfall into pass-ready output", () => {
    const { pack, draft } = buildPassReadyFixture()
    const shortfallDraft: CurationDraft = {
      ...draft,
      shortfall: { code: "insufficient_quality", note: "Only 19 candidates meet the quality bar." },
    }
    expect(() => resolveCurationDraft(pack, shortfallDraft)).toThrow(/cannot be pass-ready/)

    const invalidRuntime = { ...buildPassReadyFixture().curation, shortfall: shortfallDraft.shortfall } as unknown as PassReadyCuration
    expect(validatePassReadyCuration(invalidRuntime).issues.map((issue) => issue.code)).toContain("shortfall")
  })

  it("reports duplicate, near-duplicate, affix, phonetic and concept-family risks", () => {
    const { curation } = buildPassReadyFixture()
    const risky = structuredClone(curation.approvedNames)
    risky[1].name = risky[0].name
    risky[2].name = `${risky[0].name}a`
    risky.slice(0, 3).forEach((name) => { name.visibleAffixes = ["flow"] })
    risky.slice(0, 5).forEach((name) => { name.conceptFamily = "same-family" })
    const warnings = findCurationWarnings(risky)
    expect(new Set(warnings.map((warning) => warning.code))).toEqual(new Set([
      "duplicate",
      "near_duplicate",
      "visible_affix",
      "phonetic_family",
      "concept_family",
    ]))
    expect(warnings.some((warning) => warning.code === "visible_affix" && warning.severity === "error")).toBe(true)
    expect(warnings.some((warning) => warning.code === "concept_family" && warning.severity === "error")).toBe(true)
  })
})

describe("training JSONL export", () => {
  it("defaults to the exact shared production Auto messages and names-only response", () => {
    const curation = buildPassReadyFixture().curation
    const exported = buildTrainingExport({
      curations: [curation],
      split: "train",
      passNumber: 1,
    })
    const record = JSON.parse(exported.jsonl.trim()) as {
      messages: Array<{ role: string; content: string }>
    }
    const expectedInput = buildQuickAutoMessages({
      description: curation.brief.redactedDescription,
      vibe: curation.brief.vibe,
      style: "auto",
      creativity: curation.brief.creativity,
      maxChars: curation.brief.maxLength,
      count: 24,
      rhymeWith: curation.brief.rhymeWith,
      blacklist: curation.brief.blacklist,
      preferences: curation.brief.preferences,
    })
    expect(record.messages.slice(0, -1)).toEqual(expectedInput)
    expect(exported.manifest.contractId).toBe(SHARED_QUICK_AUTO_TRAINING_CONTRACT.id)
    const assistant = JSON.parse(record.messages.at(-1)!.content) as Record<string, unknown>
    expect(Object.keys(assistant)).toEqual(["names"])
    expect(assistant.names).toEqual(curation.approvedNames.map((name) => name.name))
  })

  it("uses the injected Auto contract, preserves split isolation and hashes deterministically", () => {
    const first = buildPassReadyFixture().curation
    const second = cloneCuration(
      first,
      "train-clean-procurement",
      "Clear procurement workflow for independent hospitality operators",
      "z",
    )
    const excludedMaterial = { descriptions: ["An unrelated held-out benchmark"], names: ["heldoria"] }
    const forward = buildTrainingExport({
      curations: [first, second],
      split: "train",
      passNumber: 1,
      contract: CONTRACT,
      excludedMaterial,
    })
    const reversed = buildTrainingExport({
      curations: [second, first],
      split: "train",
      passNumber: 1,
      contract: CONTRACT,
      excludedMaterial,
    })
    expect(reversed).toEqual(forward)
    expect(forward.jsonl.trim().split("\n")).toHaveLength(2)
    expect(forward.manifest).toMatchObject({
      contractId: "quick-auto-v1",
      passNumber: 1,
      split: "train",
      exampleCount: 2,
      excludedMaterialSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
    expect(forward.manifest.jsonlSha256).toBe(stableSha256(forward.jsonl))
    expect(forward.manifest.datasetSha256).toBe(forward.manifest.jsonlSha256)
    expect(forward.manifest.promptSha256).toHaveLength(2)
    expect(forward.manifest.manifestSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(forward.jsonl).toContain('\\"rhymeWith\\":\\"glow\\"')
    expect(forward.jsonl).not.toContain("providerId")
    expect(forward.jsonl).not.toContain("modelId")
    expect(JSON.stringify(forward.manifest)).not.toContain("An unrelated held-out benchmark")
  })

  it("rejects global duplicates, excluded material, split mismatch and PII emitted by an adapter", () => {
    const first = buildPassReadyFixture().curation
    const duplicate = {
      ...first,
      packId: `${first.packId}-duplicate`,
      brief: {
        ...first.brief,
        id: "train-duplicate",
        redactedDescription: "A distinct brief description for a duplicate-output check",
        semanticClusterId: "duplicate-check",
      },
      approvedNames: first.approvedNames.map((name) => ({ ...name, approvedId: `duplicate-${name.approvedId}` })),
    }
    expect(validateGlobalApprovedNames([first, duplicate]).valid).toBe(false)
    expect(validateSplitIsolation([first], { names: [first.approvedNames[0].name] }).valid).toBe(false)
    expect(() => buildTrainingExport({
      curations: [first],
      split: "validation",
      passNumber: 1,
      contract: CONTRACT,
    })).toThrow(/belongs to train/)
    expect(() => buildTrainingExport({
      curations: [first],
      split: "train",
      passNumber: 1,
      contract: {
        ...CONTRACT,
        buildInputMessages: () => [{ role: "user", content: "Contact private.user@example.com" }],
      },
    })).toThrow(/PII-shaped/)
  })
})
