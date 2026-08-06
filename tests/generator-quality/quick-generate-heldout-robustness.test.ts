import { beforeAll, describe, expect, it } from "vitest"

import { NAME_STYLES, type NameStyle } from "@/lib/domainGen/generatedName"
import {
  hasRandomSyllablePattern,
  hasUnsafeBrandMeaning,
} from "@/lib/domainGen/filters"
import {
  generateQuickCandidates,
  isVerifiedQuickLocaleCandidate,
  type QuickCandidate,
} from "@/lib/domainGen/quickGenerate"
import { BALANCED_60_PROMPTS } from "@/tests/generator-quality/balanced-60"
import { QUICK_HELDOUT_CORPUS, type QuickHeldoutCase } from "@/tests/generator-quality/quick-heldout-corpus"

type HeldoutBatch = {
  fixture: QuickHeldoutCase
  candidates: QuickCandidate[]
}

const STYLE_SET = new Set<NameStyle>(NAME_STYLES)
const PRIVATE_METADATA_PATTERN = /(?:example\.test|client[- ]?pin|case[- ]?ref|intake[- ]?contact|private[- ]?note|zxq[- ]?7319)/i
const UNSAFE_OR_MALFORMED_PATTERN = /(?:asdf|qwer|zxcv|hjkl|porn|fuck|shit|boner|childinic|clinrapy|sensosors|funereral|sexulness|isolalate)/i

let batches: HeldoutBatch[] = []

function label(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function replayEvidence(candidate: QuickCandidate): string | null {
  const evidence = candidate.evidence
  if (!evidence) return null
  if (evidence.kind === "semantic_word") return label(evidence.source)
  if (evidence.kind === "orthographic_fusion") {
    if (!evidence.left.endsWith(evidence.overlap) || !evidence.right.startsWith(evidence.overlap)) return null
    return `${evidence.left}${evidence.right.slice(evidence.overlap.length)}`
  }
  return evidence.rule === "ph_to_f"
    ? evidence.source.replace("ph", "f")
    : `${evidence.source.slice(0, -1)}k`
}

beforeAll(() => {
  batches = QUICK_HELDOUT_CORPUS.map((fixture) => ({
    fixture,
    candidates: generateQuickCandidates({
      description: fixture.description,
      vibe: fixture.vibe,
      creativity: fixture.creativity,
      style: fixture.style,
      maxChars: fixture.maxChars,
      count: fixture.count,
      seed: `heldout-robustness-v1:${fixture.id}`,
    }),
  }))
}, 20_000)

describe("Quick Generate held-out robustness", () => {
  it("keeps at least 30 cases independent from the balanced audit shape", () => {
    const balancedDescriptions = new Set(BALANCED_60_PROMPTS.map((fixture) => label(fixture.description)))
    expect(QUICK_HELDOUT_CORPUS.length).toBeGreaterThanOrEqual(30)
    expect(new Set(QUICK_HELDOUT_CORPUS.map((fixture) => fixture.id)).size).toBe(QUICK_HELDOUT_CORPUS.length)
    expect(new Set(QUICK_HELDOUT_CORPUS.map((fixture) => fixture.description)).size).toBe(QUICK_HELDOUT_CORPUS.length)
    for (const fixture of QUICK_HELDOUT_CORPUS) {
      expect(balancedDescriptions.has(label(fixture.description)), `${fixture.id}: duplicated balanced-60 brief`).toBe(false)
    }
    expect(new Set(QUICK_HELDOUT_CORPUS.map((fixture) => fixture.style))).toEqual(new Set(["auto", ...NAME_STYLES]))
    expect(Math.min(...QUICK_HELDOUT_CORPUS.map((fixture) => fixture.maxChars))).toBeLessThanOrEqual(8)
    expect(Math.max(...QUICK_HELDOUT_CORPUS.map((fixture) => fixture.maxChars))).toBe(15)
  })

  it("returns the complete requested batch with unique names for every mode", () => {
    const violations: string[] = []
    for (const { fixture, candidates } of batches) {
      const names = candidates.map((candidate) => candidate.name)
      if (candidates.length !== fixture.count) {
        violations.push(`${fixture.id}: expected ${fixture.count}, received ${candidates.length}`)
      }
      if (new Set(names).size !== names.length) violations.push(`${fixture.id}: duplicate names`)
    }
    expect(violations, violations.join("; ")).toEqual([])
  })

  it("keeps every surface domain-safe, pronounceable enough, and within the requested maximum", () => {
    for (const { fixture, candidates } of batches) {
      for (const candidate of candidates) {
        expect(candidate.name, `${fixture.id}: ${candidate.name}`).toMatch(/^[a-z][a-z0-9]*$/)
        expect(candidate.name.length, `${fixture.id}: ${candidate.name}`).toBeGreaterThanOrEqual(4)
        expect(candidate.name.length, `${fixture.id}: ${candidate.name}`).toBeLessThanOrEqual(fixture.maxChars)
        expect(candidate.name, `${fixture.id}: unsafe or malformed`).not.toMatch(UNSAFE_OR_MALFORMED_PATTERN)
        expect(hasUnsafeBrandMeaning(candidate.name), `${fixture.id}: ${candidate.name}`).toBe(false)
        // Reviewed complete words and replayable fusions may legitimately
        // trigger heuristic shape filters (for example, "binary"). The
        // evidence contract is the stronger proof for those candidates. Quick
        // deliberately does not apply the broad AI-smell suffix heuristic: it
        // misclassifies ordinary words and compounds such as `wellfamily`.
        // Exact reviewed locale forms are checked against the locale registry
        // below; English syllable heuristics are not meaningful for Welsh or
        // French forms such as `cynhaeaf`.
        if (!candidate.evidence && candidate.style !== "non_english") {
          expect(hasRandomSyllablePattern(candidate.name), `${fixture.id}: ${candidate.name}`).toBe(false)
        }
        expect(candidate.name, `${fixture.id}: repeated junk`).not.toMatch(/(.)\1{3,}|([a-z]{3,5})\2/i)
        expect(candidate.name, `${fixture.id}: missing vowel`).toMatch(/[aeiouy]/i)
      }
    }
  })

  it("makes every evidence record mechanically replayable", () => {
    for (const { fixture, candidates } of batches) {
      for (const candidate of candidates) {
        if (!candidate.evidence) continue
        expect(replayEvidence(candidate), `${fixture.id}: ${candidate.name}`).toBe(candidate.name)
        if (candidate.evidence.kind === "semantic_word") {
          expect(candidate.style, `${fixture.id}: ${candidate.name}`).toMatch(/^(?:real_word|evocative)$/)
        }
        if (candidate.evidence.kind === "orthographic_fusion") {
          expect(candidate.style, `${fixture.id}: ${candidate.name}`).toBe("brandable")
        }
        if (candidate.evidence.kind === "reviewed_spelling") {
          expect(candidate.style, `${fixture.id}: ${candidate.name}`).toBe("alternate_spelling")
        }
      }
    }
  })

  it("reports construction styles from visible morphology rather than requested labels", () => {
    for (const { fixture, candidates } of batches) {
      for (const candidate of candidates) {
        expect(STYLE_SET.has(candidate.style), `${fixture.id}: ${candidate.style}`).toBe(true)

        if (fixture.style !== "auto") {
          expect(candidate.style, `${fixture.id}: explicit ${fixture.style} produced ${candidate.name}`).toBe(fixture.style)
        }

        if (candidate.constructionParts) {
          expect(candidate.constructionParts, `${fixture.id}: ${candidate.name}`).toHaveLength(2)
          expect(candidate.constructionParts.join(""), `${fixture.id}: ${candidate.name}`).toBe(candidate.name)
          expect(
            candidate.style === "compound"
              || candidate.style === "short_phrase"
              || (candidate.style === "non_english" && isVerifiedQuickLocaleCandidate(candidate.name, fixture.description)),
            `${fixture.id}: ${candidate.name} is mislabeled ${candidate.style}`,
          ).toBe(true)
        }

        if (candidate.style === "compound" || candidate.style === "short_phrase") {
          expect(candidate.constructionParts?.join(""), `${fixture.id}: ${candidate.name}`).toBe(candidate.name)
        }
        if (candidate.style === "non_english") {
          expect(isVerifiedQuickLocaleCandidate(candidate.name, fixture.description), `${fixture.id}: ${candidate.name}`).toBe(true)
        }
      }
    }
  })

  it("never repeats a raw brief or untrusted intake metadata in names and rationales", () => {
    for (const { fixture, candidates } of batches) {
      const rawBrief = fixture.description.toLowerCase().replace(/\s+/g, " ").trim()
      for (const candidate of candidates) {
        const output = `${candidate.name} ${candidate.personality}`.toLowerCase().replace(/\s+/g, " ")
        expect(output, `${fixture.id}: full prompt echo`).not.toContain(rawBrief)
        expect(output, `${fixture.id}: metadata-shaped prompt leakage`).not.toMatch(PRIVATE_METADATA_PATTERN)
        for (const privateToken of fixture.privateTokens || []) {
          expect(label(output), `${fixture.id}: leaked ${privateToken}`).not.toContain(label(privateToken))
        }
      }
    }
  })
})
