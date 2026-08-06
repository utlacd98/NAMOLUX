import { describe, expect, it } from "vitest"
import { hasUnsafeBrandMeaning } from "@/lib/domainGen/filters"
import {
  generateQuickCandidates,
  generateQuickEditorialWorkshop,
  QUICK_MIN_NAME_LENGTH,
  type QuickGenerateInput,
} from "@/lib/domainGen/quickGenerate"

interface WorkshopCase {
  id: string
  input: QuickGenerateInput
}

const WORKSHOP_CASES: readonly WorkshopCase[] = [
  {
    id: "Welsh farm marketplace",
    input: {
      description: "Welsh language marketplace connecting family farms with local schools",
      vibe: "friendly",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "editorial-workshop:welsh",
    },
  },
  {
    id: "Kenya conservation safari",
    input: {
      description: "premium conservation safari company owned by local guides in Kenya",
      vibe: "premium",
      style: "auto",
      creativity: "exploratory",
      maxChars: 12,
      count: 16,
      seed: "editorial-workshop:kenya",
    },
  },
  {
    id: "European privacy SaaS",
    input: {
      description: "privacy compliance SaaS for European ecommerce teams",
      vibe: "clean",
      style: "auto",
      creativity: "direct",
      maxChars: 11,
      count: 16,
      seed: "editorial-workshop:privacy",
    },
  },
  {
    id: "freelancer accounting",
    input: {
      description: "invoice and tax accounting software for independent freelancers",
      vibe: "clean",
      style: "auto",
      creativity: "balanced",
      maxChars: 11,
      count: 16,
      seed: "editorial-workshop:accounting",
    },
  },
  {
    id: "rural telehealth",
    input: {
      description: "telehealth access for rural patients and community clinics",
      vibe: "clean",
      style: "auto",
      creativity: "direct",
      maxChars: 11,
      count: 16,
      seed: "editorial-workshop:rural",
    },
  },
  {
    id: "climate technology marketing",
    input: {
      description: "bold marketing agency focused on climate technology startups",
      vibe: "bold",
      style: "auto",
      creativity: "exploratory",
      maxChars: 12,
      count: 16,
      seed: "editorial-workshop:climate",
    },
  },
  {
    id: "first-buyer mortgage comparison",
    input: {
      description: "friendly mortgage comparison service for first time home buyers",
      rhymeWith: "rate",
      vibe: "friendly",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
      seed: "editorial-workshop:mortgage",
    },
  },
]

describe("generateQuickEditorialWorkshop", () => {
  it.each(WORKSHOP_CASES)("keeps a genuine admitted selector surplus for $id", ({ input }) => {
    const workshop = generateQuickEditorialWorkshop(input)
    const publicCandidates = generateQuickCandidates(input)
    const publicNames = publicCandidates.map(({ name }) => name)
    const poolNames = workshop.editorialPool.map(({ name }) => name)
    const poolNameSet = new Set(poolNames)

    expect(publicCandidates).toHaveLength(16)
    expect(new Set(publicNames).size).toBe(16)
    expect(publicCandidates).toEqual(workshop.candidates)

    expect(workshop.editorialPool.length).toBeGreaterThanOrEqual(24)
    expect(workshop.editorialPool.length).toBeGreaterThan(publicCandidates.length)
    expect(poolNameSet.size).toBe(workshop.editorialPool.length)
    expect(publicNames.every((name) => poolNameSet.has(name))).toBe(true)
    expect(poolNames.some((name) => !publicNames.includes(name))).toBe(true)

    for (const candidate of workshop.editorialPool) {
      expect(candidate.name).toMatch(/^[a-z]+$/)
      expect(candidate.name.length).toBeGreaterThanOrEqual(QUICK_MIN_NAME_LENGTH)
      expect(candidate.name.length).toBeLessThanOrEqual(input.maxChars ?? 10)
      expect(hasUnsafeBrandMeaning(candidate.name), candidate.name).toBe(false)
      expect(candidate.personality.trim().length, candidate.name).toBeGreaterThan(0)
    }
  })

  it.each(WORKSHOP_CASES)("is exactly reproducible for $id", ({ input }) => {
    expect(generateQuickEditorialWorkshop(input)).toEqual(generateQuickEditorialWorkshop(input))
  })
})
