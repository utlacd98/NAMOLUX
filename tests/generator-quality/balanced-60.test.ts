import { describe, expect, it } from "vitest"

import { generateQuickCandidates } from "@/lib/domainGen/quickGenerate"
import { BALANCED_60_IDS, BALANCED_60_PROMPTS } from "@/tests/generator-quality/balanced-60"
import { evaluateGeneratorBatch } from "@/tests/generator-quality/harness"

describe("balanced 60-niche generator audit", () => {
  it("contains exactly ten unique briefs in each of six vibe families", () => {
    expect(Object.keys(BALANCED_60_IDS)).toHaveLength(6)
    for (const ids of Object.values(BALANCED_60_IDS)) expect(ids).toHaveLength(10)

    const ids = BALANCED_60_PROMPTS.map((prompt) => prompt.id)
    expect(ids).toHaveLength(60)
    expect(new Set(ids).size).toBe(60)
  })

  it("contains no missing or rejected briefs", () => {
    for (const prompt of BALANCED_60_PROMPTS) {
      expect(prompt.description.trim().length, prompt.id).toBeGreaterThanOrEqual(2)
      expect(prompt.expectation ?? "generate", prompt.id).toBe("generate")
    }
  })

  it("keeps deterministic fallback professional, reproducible, and cross-niche distinct", () => {
    const nameBriefs = new Map<string, Set<string>>()
    let totalCandidates = 0

    for (const prompt of BALANCED_60_PROMPTS) {
      const input = {
        description: prompt.description,
        rhymeWith: prompt.rhymeWith,
        vibe: prompt.quickVibe,
        maxChars: prompt.maxLength,
        count: 16,
        seed: `deterministic-audit:${prompt.id}`,
      } as const
      const first = generateQuickCandidates(input)
      const repeated = generateQuickCandidates(input)

      expect(first.map((candidate) => candidate.name), `${prompt.id}: reproducibility`).toEqual(
        repeated.map((candidate) => candidate.name),
      )
      expect(first.length, `${prompt.id}: complete candidate page`).toBe(16)
      expect(new Set(first.map((candidate) => candidate.name)).size, `${prompt.id}: exact uniqueness`).toBe(16)
      expect(first.filter((candidate) => (candidate.fitRoots?.length || 0) > 0).length, `${prompt.id}: shortlist provenance`)
        .toBeGreaterThanOrEqual(2)
      for (const candidate of first) {
        const rationaleWords = candidate.personality.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0
        const rationaleSentences = candidate.personality.match(/[^.!?]+[.!?](?:\s|$)/g)?.length ?? 0
        expect(rationaleWords, `${prompt.id}:${candidate.name}: rationale minimum`).toBeGreaterThanOrEqual(35)
        expect(rationaleWords, `${prompt.id}:${candidate.name}: rationale maximum`).toBeLessThanOrEqual(65)
        expect(rationaleSentences, `${prompt.id}:${candidate.name}: rationale sentences`).toBeGreaterThanOrEqual(2)
        expect(rationaleSentences, `${prompt.id}:${candidate.name}: rationale sentences`).toBeLessThanOrEqual(3)
        expect(candidate.personality, `${prompt.id}:${candidate.name}: rationale boilerplate`).not.toMatch(
          /curated naming cue|declared provenance|reviewed evidence|reviewed category|reviewed cue selected|concrete and readable naming element|ordinary literal word used visibly/i,
        )
        expect(candidate.personality.toLowerCase(), `${prompt.id}:${candidate.name}: raw brief leak`)
          .not.toContain(prompt.description.trim().toLowerCase())
      }

      const report = evaluateGeneratorBatch(
        first.map((candidate) => ({
          name: candidate.name,
          narrative: candidate.personality,
          roots: candidate.fitRoots,
        })),
        {
          minUniqueCandidates: 8,
          maxLength: prompt.maxLength,
          relevanceTerms: prompt.relevanceTerms,
          minNarrativeCharacters: 70,
          minNarrativeWords: 12,
        },
      )
      expect(report.score, `${prompt.id}: ${report.issues.join("; ")}`).toBeGreaterThanOrEqual(80)

      totalCandidates += first.length
      for (const candidate of first) {
        const briefs = nameBriefs.get(candidate.name) || new Set<string>()
        briefs.add(prompt.id)
        nameBriefs.set(candidate.name, briefs)
      }
    }

    const duplicateOccurrences = Array.from(nameBriefs.values())
      .reduce((total, briefs) => total + Math.max(0, briefs.size - 1), 0)
    expect(duplicateOccurrences / totalCandidates).toBeLessThanOrEqual(0.01)
  }, 30_000)
})
