import { describe, expect, it } from "vitest"

import {
  NAMING_SPECIALIST_AUTO_BRIEFS,
  NAMING_SPECIALIST_BRIEFS,
  type NamingSpecialistBrief,
  toSpecialistAutoBrief,
} from "@/lib/naming-specialist/briefs"
import type { SpecialistBrief } from "@/lib/naming-specialist/types"
import { BALANCED_60_PROMPTS } from "@/tests/generator-quality/balanced-60"
import namelixEvaluatorPack from "@/tests/generator-quality/benchmarks/namelix-2026-07-14/evaluator-pack.json"
import { GENERATOR_QUALITY_CORPUS } from "@/tests/generator-quality/corpus"
import { QUICK_HELDOUT_CORPUS } from "@/tests/generator-quality/quick-heldout-corpus"

const VIBES = ["friendly", "premium", "tech", "bold", "clean", "playful"] as const

// Compile-time assertion that callers can use the bridge without a cast.
const SHARED_CONTRACT_BRIEFS: readonly SpecialistBrief[] = NAMING_SPECIALIST_AUTO_BRIEFS

function normaliseDescription(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function descriptionTokens(value: string): Set<string> {
  return new Set(normaliseDescription(value).split(" ").filter((token) => token.length >= 3))
}

function tokenJaccard(left: string, right: string): number {
  const leftTokens = descriptionTokens(left)
  const rightTokens = descriptionTokens(right)
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  return union === 0 ? 0 : intersection / union
}

function splitOf(split: NamingSpecialistBrief["split"]): NamingSpecialistBrief[] {
  return NAMING_SPECIALIST_BRIEFS.filter((brief) => brief.split === split)
}

describe("naming specialist editorial briefs", () => {
  it("contains an exact 60/10/10 split with unique stable identifiers", () => {
    expect(NAMING_SPECIALIST_BRIEFS).toHaveLength(80)
    expect(splitOf("train")).toHaveLength(60)
    expect(splitOf("validation")).toHaveLength(10)
    expect(splitOf("test")).toHaveLength(10)

    const ids = NAMING_SPECIALIST_BRIEFS.map((brief) => brief.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^(?:train|validation|test)-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true)
    for (const brief of NAMING_SPECIALIST_BRIEFS) {
      expect(brief.id.startsWith(`${brief.split}-`), brief.id).toBe(true)
      expect(brief.semanticClusterId, brief.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it("gives every training vibe ten briefs and the exact creativity mix", () => {
    const train = splitOf("train")
    for (const vibe of VIBES) {
      expect(train.filter((brief) => brief.vibe === vibe), vibe).toHaveLength(10)
    }

    const creativityCounts = Object.fromEntries(
      ["direct", "balanced", "exploratory"].map((creativity) => [
        creativity,
        train.filter((brief) => brief.creativity === creativity).length,
      ]),
    )
    expect(creativityCounts).toEqual({ direct: 18, balanced: 30, exploratory: 12 })
  })

  it("matches the exact training maximum-length buckets", () => {
    const train = splitOf("train")
    const buckets = {
      "6-7": train.filter((brief) => brief.maxChars >= 6 && brief.maxChars <= 7).length,
      "8-10": train.filter((brief) => brief.maxChars >= 8 && brief.maxChars <= 10).length,
      "11-12": train.filter((brief) => brief.maxChars >= 11 && brief.maxChars <= 12).length,
      "13-15": train.filter((brief) => brief.maxChars >= 13 && brief.maxChars <= 15).length,
    }
    expect(buckets).toEqual({ "6-7": 6, "8-10": 30, "11-12": 18, "13-15": 6 })
    expect(NAMING_SPECIALIST_BRIEFS.every((brief) => brief.maxChars >= 6 && brief.maxChars <= 15)).toBe(true)
  })

  it("contains enough locale, rhyme and preference-or-blacklist coverage", () => {
    expect(NAMING_SPECIALIST_BRIEFS.filter((brief) => Boolean(brief.locale?.trim())).length).toBeGreaterThanOrEqual(8)
    expect(NAMING_SPECIALIST_BRIEFS.filter((brief) => Boolean(brief.rhymeWith?.trim())).length).toBeGreaterThanOrEqual(8)
    expect(
      NAMING_SPECIALIST_BRIEFS.filter((brief) => Boolean(brief.blacklist?.length || brief.preferences)).length,
    ).toBeGreaterThanOrEqual(16)
  })

  it("is Auto-only input and never smuggles an explicit construction control", () => {
    for (const brief of NAMING_SPECIALIST_BRIEFS) {
      expect("style" in brief, brief.id).toBe(false)
      expect("count" in brief, brief.id).toBe(false)
      expect(brief.description.trim().length, brief.id).toBeGreaterThanOrEqual(20)
    }
  })

  it("maps losslessly to the shared Auto specialist contract", () => {
    expect(SHARED_CONTRACT_BRIEFS).toHaveLength(NAMING_SPECIALIST_BRIEFS.length)

    for (const source of NAMING_SPECIALIST_BRIEFS) {
      const mapped = toSpecialistAutoBrief(source)
      expect(mapped).toMatchObject(source)
      expect(mapped.style).toBe("auto")
      expect(mapped.maxLength).toBe(source.maxChars)
      expect(mapped.maxChars).toBe(source.maxChars)
      expect(mapped.rhymeWith).toBe(source.rhymeWith)
      expect(mapped.blacklist).toEqual(source.blacklist)
      expect(mapped.preferences).toEqual(source.preferences)
      expect(mapped.locale).toBe(source.locale)
    }
  })

  it("does not copy or near-copy any existing audit or competitor brief", () => {
    const excludedDescriptions = [
      ...GENERATOR_QUALITY_CORPUS.map((brief) => brief.description),
      ...BALANCED_60_PROMPTS.map((brief) => brief.description),
      ...QUICK_HELDOUT_CORPUS.map((brief) => brief.description),
      ...namelixEvaluatorPack.cases.map((brief) => brief.brief),
    ]
    const excludedExact = new Set(excludedDescriptions.map(normaliseDescription))

    for (const brief of NAMING_SPECIALIST_BRIEFS) {
      expect(excludedExact.has(normaliseDescription(brief.description)), `${brief.id}: exact excluded brief`).toBe(false)

      const nearest = excludedDescriptions.reduce(
        (best, candidate) => {
          const similarity = tokenJaccard(brief.description, candidate)
          return similarity > best.similarity ? { similarity, candidate } : best
        },
        { similarity: 0, candidate: "" },
      )
      expect(
        nearest.similarity,
        `${brief.id}: too close to excluded brief "${nearest.candidate}"`,
      ).toBeLessThan(0.55)
    }
  })

  it("contains no obvious personal data, email address or URL-shaped intake", () => {
    const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
    const url = /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|io|co\.uk)\b)/i
    const privateReference = /\b(?:case[- ]?ref|client[- ]?pin|account[- ]?id|private[- ]?note|intake[- ]?contact)\b/i
    const phoneLike = /\b(?:\+?\d[\d ().-]{7,}\d)\b/

    for (const brief of NAMING_SPECIALIST_BRIEFS) {
      expect(brief.description, brief.id).not.toMatch(email)
      expect(brief.description, brief.id).not.toMatch(url)
      expect(brief.description, brief.id).not.toMatch(privateReference)
      expect(brief.description, brief.id).not.toMatch(phoneLike)
    }
  })
})
