import { afterEach, describe, expect, it, vi } from "vitest"
import { brandExamples, buildGenerationPrompt, type BuildPromptOptions } from "@/lib/brandExamples"
import {
  hasAiSmellPattern,
  hasRandomSyllablePattern,
  hasUnsafeBrandMeaning,
  passesTasteGate,
} from "@/lib/domainGen/filters"

const BASE_OPTIONS: BuildPromptOptions = {
  keywords: "privacy workflow for product teams",
  industry: "SaaS & Software",
  brandVibe: "futuristic",
  maxLength: 10,
  batchSize: 12,
  outputFormat: "names-only",
}

function deterministicPrompt(overrides: Partial<BuildPromptOptions> = {}) {
  vi.spyOn(Math, "random").mockReturnValue(0.314159)
  return buildGenerationPrompt({ ...BASE_OPTIONS, ...overrides })
}

function extractNamesOnlyExample(userPrompt: string): string[] {
  const match = userPrompt.match(/Example:\s*(\[[^\n]+\])/)?.[1]
  return match ? (JSON.parse(match) as string[]) : []
}

function productionGateFailures(names: readonly string[]): string[] {
  return names.flatMap((name) => {
    const failures: string[] = []
    if (hasAiSmellPattern(name)) failures.push(`${name}:ai_smell`)
    if (hasRandomSyllablePattern(name)) failures.push(`${name}:random_syllables`)
    if (hasUnsafeBrandMeaning(name)) failures.push(`${name}:unsafe_meaning`)
    if (!passesTasteGate(name)) failures.push(`${name}:taste_gate`)
    return failures
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("advanced generation prompt contract", () => {
  it("keeps the curated industry catalogue structurally usable", () => {
    expect(Object.keys(brandExamples).length).toBeGreaterThanOrEqual(10)

    for (const [industry, examples] of Object.entries(brandExamples)) {
      expect(examples.names.length, industry).toBeGreaterThanOrEqual(10)
      expect(examples.names.every((name) => /^[A-Za-z0-9]+$/.test(name)), industry).toBe(true)
      expect(examples.patterns.trim().length, industry).toBeGreaterThanOrEqual(30)
    }
  })

  it("never presents names rejected by the production gates as positive output examples", () => {
    const prompt = deterministicPrompt()
    const positiveExamples = extractNamesOnlyExample(prompt.user)
    const failures = productionGateFailures(positiveExamples)

    expect(positiveExamples.length).toBeGreaterThan(0)
    expect(failures, `positive examples rejected by production: ${failures.join(", ")}`).toEqual([])
  })

  it("does not show the same name as both a positive output and an explicit rejection", () => {
    const prompt = deterministicPrompt()
    const positive = new Set(extractNamesOnlyExample(prompt.user).map((name) => name.toLowerCase()))
    const rejected = prompt.system
      .split(/\r?\n/)
      .filter((line) => line.includes("REJECTED"))
      .map((line) => line.match(/([A-Z][A-Za-z0-9]+).*REJECTED/)?.[1]?.toLowerCase())
      .filter((name): name is string => Boolean(name))
    const overlap = rejected.filter((name) => positive.has(name))

    expect(overlap, `positive and rejected simultaneously: ${overlap.join(", ")}`).toEqual([])
  })

  it("does not promote forbidden suffixes in the root-plus-suffix strategy", () => {
    const prompt = deterministicPrompt({ strategy: "root+suffix" })
    const strategyLine = prompt.system.split(/\r?\n/).find((line) => line.startsWith("THIS BATCH:")) || ""
    const promotedSuffixes = Array.from(strategyLine.matchAll(/-([a-z]+)/g), (match) => match[1])
    const forbiddenSuffixes = new Set(["ora", "ova", "era", "ara", "ava", "ium", "yx", "ix", "rix", "trix", "nix", "vix"])
    const conflicts = promotedSuffixes.filter((suffix) => forbiddenSuffixes.has(suffix))

    expect(strategyLine.length).toBeGreaterThan(0)
    expect(conflicts, `strategy promotes suffixes the prompt forbids: ${conflicts.join(", ")}`).toEqual([])
  })

  it("keeps futuristic positive examples compatible with the production quality gate", () => {
    const prompt = deterministicPrompt({ brandVibe: "futuristic" })
    const exampleLine = prompt.system
      .split(/\r?\n/)
      .find((line) => line.includes("forward-momentum feel:"))
    const names = (exampleLine?.split(":").slice(1).join(":") || "")
      .split(",")
      .map((name) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter(Boolean)
    const failures = productionGateFailures(names)

    expect(names.length).toBeGreaterThan(0)
    expect(failures, `futuristic guidance conflicts with production: ${failures.join(", ")}`).toEqual([])
  })
})
