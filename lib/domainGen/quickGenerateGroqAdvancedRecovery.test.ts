import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  assessQuickAutoCandidateQuality,
  createQuickCandidateFromName,
  generateQuickEditorialWorkshop,
  hasQuickPrimaryConceptEvidence,
  hasQuickValueFacetIntersection,
  isQuickCueOwnedSemanticWord,
  isQuickReviewedContextCompound,
  isVerifiedQuickLocaleCandidate,
  type QuickGenerateVibe,
} from "@/lib/domainGen/quickGenerate"
import {
  generateGroqQuickCandidates,
  resetGroqQuickCooldownsForTests,
} from "@/lib/domainGen/quickGenerateGroq"

const ENV_KEYS = [
  "GROQ_API_KEY",
  "OPENAI_API_KEY",
  "AI_GATEWAY_API_KEY",
  "VERCEL_OIDC_TOKEN",
  "GROQ_QUICK_MODEL",
  "GROQ_QUICK_MODELS",
  "GROQ_QUICK_EDITOR_MODEL",
  "QUICK_GENERATE_PRIMARY_PROVIDER",
  "QUICK_GENERATE_PRIMARY_ONLY",
] as const
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

const CASES: ReadonlyArray<{
  id: string
  description: string
  vibe: QuickGenerateVibe
  maxChars: number
  rhymeWith?: string
}> = [
  {
    id: "privacy-accounting",
    description: "Privacy-first bookkeeping software for independent freelancers",
    vibe: "clean",
    maxChars: 12,
  },
  {
    id: "founder-scheduling",
    description: "AI scheduling assistant for busy startup founders",
    vibe: "tech",
    maxChars: 12,
  },
  {
    id: "teen-therapy",
    description: "Confidential therapy and emotional support for teenagers",
    vibe: "friendly",
    maxChars: 12,
  },
  {
    id: "kenya-irrigation",
    description: "Low cost irrigation tools for small farms in Kenya",
    vibe: "clean",
    maxChars: 12,
  },
  {
    id: "welsh-farm-market",
    description: "Welsh language marketplace connecting family farms with local schools",
    vibe: "friendly",
    maxChars: 12,
  },
  {
    id: "circular-fashion",
    description: "Circular fashion label using recycled textiles for city commuters",
    vibe: "premium",
    maxChars: 12,
  },
  {
    id: "legal-review",
    description: "Contract review software for small business legal teams",
    vibe: "clean",
    maxChars: 10,
  },
  {
    id: "tight-cat-care",
    description: "Urban cat sitting service for busy apartment owners",
    vibe: "friendly",
    maxChars: 6,
  },
  {
    id: "tight-climate-marketing",
    description: "Climate technology marketing agency for early stage founders",
    vibe: "bold",
    maxChars: 8,
  },
  {
    id: "rural-telehealth",
    description: "Rural telehealth platform for community clinics and patients",
    vibe: "friendly",
    maxChars: 15,
  },
  {
    id: "mortgage-rhyme",
    description: "friendly mortgage comparison service for first time home buyers",
    vibe: "friendly",
    maxChars: 12,
    rhymeWith: "rate",
  },
]

const GENERIC_RECOVERY_TAIL = new Set([
  "amber", "brio", "coda", "cove", "ember", "flora", "lumen", "merit", "novel",
  "orbit", "sage", "sonic", "tandem", "velvet", "verve", "willow", "zenith",
  "bayway", "elmway", "ashway", "oneway", "trynew", "upnext", "gofree", "upbeat",
  "flowgo", "evergo", "kindgo", "setgo", "aimgo", "teamgo", "workgo",
])

const REVIEWED_TIGHT_CAT_DIRECTIONS = [
  ["catsit", "cat", "sit"],
  ["petsit", "pet", "sit"],
  ["catnap", "cat", "nap"],
  ["pawkin", "paw", "kin"],
  ["furpal", "fur", "pal"],
  ["mewpal", "mew", "pal"],
  ["mewkin", "mew", "kin"],
  ["catkin", "cat", "kin"],
] as const

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
  process.env.GROQ_API_KEY = "groq-test-key"
  resetGroqQuickCooldownsForTests()
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  resetGroqQuickCooldownsForTests()
  vi.unstubAllGlobals()
})

describe("Advanced production-equivalent recovery matrix", () => {
  it("keeps eleven varied briefs complete, reviewed, relevant, and free of generic public tails", async () => {
    for (const testCase of CASES) {
      resetGroqQuickCooldownsForTests()
      let ordinaryEditorPayloadSeen = false
      const selectorPoolSizes: number[] = []
      const selectorResponseSizes: number[] = []
      const selectorReviewedNames = new Set<string>()
      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          model: string
          messages: Array<{ content: string }>
        }
        const prompt = JSON.parse(body.messages[1]?.content || "{}") as {
          task?: string
          approvedDraftNames?: string[]
          draftNames?: string[]
          previouslyReviewedNames?: string[]
          reviewedLocale?: { names?: string[] }
        }

        if (prompt.draftNames && !prompt.approvedDraftNames) ordinaryEditorPayloadSeen = true

        if (body.model === "openai/gpt-oss-120b") {
          return {
            ok: false,
            status: 429,
            headers: { get: () => null },
            json: async () => ({ error: { type: "rate_limit" } }),
          }
        }

        expect(
          ["qwen/qwen3.6-27b", "openai/gpt-oss-20b"],
          testCase.id,
        ).toContain(body.model)
        const previouslyReviewed = new Set(prompt.previouslyReviewedNames || [])
        let selectedCandidates: Array<{
          name: string
          style: "real_word" | "compound"
          territoryId: "core_job" | "audience_world" | "desired_outcome" | "distinctive_metaphor"
          mechanism: "semantic_word" | "visible_compound"
          evidenceParts: string[]
        }> | undefined
        let selectedNames: string[] | undefined
        if (prompt.approvedDraftNames) {
          const requestedCountMatch = prompt.task?.match(/Select exactly (\d+) approved drafts/)
          expect(requestedCountMatch, `${testCase.id} selector task`).not.toBeNull()
          const requestedCount = Number(requestedCountMatch?.[1])
          expect(requestedCount, `${testCase.id} selector count`).toBeGreaterThanOrEqual(16)
          expect(
            prompt.approvedDraftNames.length - requestedCount,
            `${testCase.id} genuine selector omissions`,
          ).toBeGreaterThanOrEqual(4)
          if (prompt.approvedDraftNames.length === 32) {
            expect(requestedCount, `${testCase.id} 32-name selector target`).toBe(24)
          }

          selectedNames = [
              ...prompt.approvedDraftNames.filter((name) => !previouslyReviewed.has(name)),
              ...prompt.approvedDraftNames,
            ].filter((name, index, all) => all.indexOf(name) === index).slice(0, requestedCount)
          expect(selectedNames, `${testCase.id} exact selector response`).toHaveLength(requestedCount)
          expect(
            selectedNames.every((name) => prompt.approvedDraftNames?.includes(name)),
            `${testCase.id} selector provenance`,
          ).toBe(true)
          selectorPoolSizes.push(prompt.approvedDraftNames.length)
          selectorResponseSizes.push(selectedNames.length)
          for (const name of selectedNames) selectorReviewedNames.add(name)
        }
        if (!selectedNames && testCase.id === "welsh-farm-market") {
          const localeNames = prompt.reviewedLocale?.names || []
          const localeSet = new Set(localeNames)
          selectedNames = [
            ...localeNames.slice(0, 8),
            ...(prompt.draftNames || []).filter((name) => !localeSet.has(name)).slice(0, 8),
          ]
        }
        if (!selectedNames && testCase.id === "tight-cat-care") {
          const catSemanticWords = [
            "pounce", "tabby", "feline", "mouser", "moggie", "nuzzle", "cuddle",
            "snooze", "hearth", "homing", "patter", "dozing", "curled", "meow",
            "mews", "velvet", "silken", "tortie", "torbie", "felid", "tuxedo",
            "mitted", "perch", "cosset",
          ]
          const retainedSemantic = (prompt.draftNames || [])
            .filter((name) => catSemanticWords.includes(name))
            .slice(0, 8)
          expect(retainedSemantic, "tight-cat-care retained private drafts").toHaveLength(8)

          const territories = [
            "core_job", "audience_world", "desired_outcome", "distinctive_metaphor",
          ] as const
          selectedCandidates = [
            ...REVIEWED_TIGHT_CAT_DIRECTIONS.map(([name, left, right], index) => ({
              name,
              style: "compound" as const,
              territoryId: territories[index % territories.length],
              mechanism: "visible_compound" as const,
              evidenceParts: [left, right],
            })),
            ...retainedSemantic.map((name, index) => ({
              name,
              style: "real_word" as const,
              territoryId: territories[index % territories.length],
              mechanism: "semantic_word" as const,
              evidenceParts: [name],
            })),
          ]
          selectedNames = selectedCandidates.map(({ name }) => name)
        }
        if (!selectedNames && testCase.id === "rural-telehealth") {
          const retainedSemanticDrafts = [
            "reachable", "outreach", "nearness", "proximity", "connected",
            "accessible", "telepresence", "availability",
          ]
          const territories = [
            "core_job", "audience_world", "desired_outcome", "distinctive_metaphor",
          ] as const
          const newCompounds = [
            ["carenear", "care", "near"],
            ["clinicbridge", "clinic", "bridge"],
            ["clinicrelay", "clinic", "relay"],
            ["accessway", "access", "way"],
            ["telecarecircle", "telecare", "circle"],
          ] as const
          selectedCandidates = [
            ...retainedSemanticDrafts.map((name, index) => ({
              name,
              style: "real_word" as const,
              territoryId: territories[index % territories.length],
              mechanism: "semantic_word" as const,
              evidenceParts: [name],
            })),
            ...newCompounds.map(([name, left, right], index) => ({
              name,
              style: "compound" as const,
              territoryId: territories[(index + retainedSemanticDrafts.length) % territories.length],
              mechanism: "visible_compound" as const,
              evidenceParts: [left, right],
            })),
            ...["waypoint", "touchpoint", "closer"].map((name, index) => ({
              name,
              style: "real_word" as const,
              territoryId: territories[
                (index + retainedSemanticDrafts.length + newCompounds.length) % territories.length
              ],
              mechanism: "semantic_word" as const,
              evidenceParts: [name],
            })),
          ]
          selectedNames = selectedCandidates.map(({ name }) => name)
        }
        if (!selectedNames) {
          throw new Error(`${testCase.id}: unexpected ordinary-editor recovery payload`)
        }
        expect(selectedNames?.length, testCase.id).toBeGreaterThanOrEqual(16)
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify(
                  selectedCandidates
                    ? { candidates: selectedCandidates }
                    : { names: selectedNames },
                ),
              },
            }],
          }),
        }
      })
      vi.stubGlobal("fetch", fetchMock)

      const result = await generateGroqQuickCandidates({
        description: testCase.description,
        rhymeWith: testCase.rhymeWith,
        vibe: testCase.vibe,
        style: "auto",
        creativity: "balanced",
        maxChars: testCase.maxChars,
        count: 16,
        seed: `advanced-recovery:${testCase.id}`,
        requireEditorialReview: true,
      })
      const publicNames = result.candidates.slice(0, 12)
      const publicGrounded = publicNames.filter((candidate) => (
        hasQuickPrimaryConceptEvidence(candidate, testCase.description)
        || isQuickReviewedContextCompound(candidate.name, testCase.description)
        || isVerifiedQuickLocaleCandidate(candidate.name, testCase.description)
      ))

      expect(
        result.modelBacked,
        `${testCase.id} (${result.durationMs}ms): ${JSON.stringify(result.providerAttempts)}`,
      ).toBe(true)
      expect(result.editoriallyReviewed, testCase.id).toBe(true)
      expect(result.candidates, testCase.id).toHaveLength(16)
      expect(new Set(result.candidates.map(({ name }) => name)).size, testCase.id).toBe(16)
      expect(result.candidates.every(({ name }) => name.length <= testCase.maxChars), testCase.id).toBe(true)
      expect(publicGrounded.length, testCase.id).toBeGreaterThanOrEqual(10)
      expect(publicNames.every(({ name }) => !GENERIC_RECOVERY_TAIL.has(name)), testCase.id).toBe(true)

      if (selectorPoolSizes.length > 0) {
        expect(
          result.candidates.every(({ name }) => selectorReviewedNames.has(name)),
          `${testCase.id} published selector provenance`,
        ).toBe(true)
        expect(
          selectorPoolSizes.every((poolSize, index) => poolSize - selectorResponseSizes[index]! >= 4),
          `${testCase.id} selector omissions`,
        ).toBe(true)
      }
      if (testCase.id === "tight-climate-marketing" || testCase.id === "mortgage-rhyme") {
        expect(ordinaryEditorPayloadSeen, testCase.id).toBe(false)
        expect(selectorPoolSizes.length, testCase.id).toBeGreaterThan(0)
        expect(selectorPoolSizes.every((size) => size === 32), testCase.id).toBe(true)
        expect(selectorResponseSizes.every((size) => size === 24), testCase.id).toBe(true)
        expect(
          result.providerAttempts.some((attempt) => attempt.selectionPoolCandidateCount === 32),
          testCase.id,
        ).toBe(true)
      }
      if (testCase.id === "privacy-accounting") {
        expect(
          result.candidates.filter(
            (candidate) => hasQuickValueFacetIntersection(candidate, testCase.description),
          ).length,
        ).toBeGreaterThanOrEqual(4)
      }
      if (testCase.id === "welsh-farm-market") {
        expect(
          result.candidates.filter(
            (candidate) => isVerifiedQuickLocaleCandidate(candidate.name, testCase.description),
          ).length,
        ).toBeGreaterThanOrEqual(8)
      }
    }
  }, 30_000)

  it("keeps a genuinely sparse private pool on ordinary editor admission", async () => {
    process.env.QUICK_GENERATE_PRIMARY_ONLY = "true"
    const description = "A privacy-first bookkeeping platform for independent creative freelancers"
    const sparseInput = {
      description,
      vibe: "clean" as const,
      style: "auto" as const,
      creativity: "balanced" as const,
      maxChars: 7,
      count: 16,
      seed: "advanced-recovery:sparse-ordinary-editor",
    }
    const unrestrictedDraftNames = generateQuickEditorialWorkshop(sparseInput)
      .editorialPool
      .map(({ name }) => name)
    const blacklist = unrestrictedDraftNames.slice(20)
    let ordinaryDraftNames: string[] = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ content: string }>
      }
      const prompt = JSON.parse(body.messages[1]?.content || "{}") as {
        brief?: { description?: string }
        draftNames?: string[]
        approvedDraftNames?: string[]
      }

      expect(prompt).not.toHaveProperty("approvedDraftNames")
      expect(prompt.brief?.description).toBe(description)
      expect(prompt.draftNames?.length).toBeLessThan(24)
      ordinaryDraftNames = prompt.draftNames || []

      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ names: [] }) } }],
        }),
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateGroqQuickCandidates({
      ...sparseInput,
      blacklist,
      requireEditorialReview: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(ordinaryDraftNames.length).toBeGreaterThan(0)
    expect(result).toMatchObject({
      provider: "deterministic",
      modelBacked: false,
      editoriallyReviewed: false,
    })
    expect(result.providerAttempts).toEqual([
      expect.objectContaining({
        provider: "groq",
        stage: "editorial",
        outcome: "no_valid_names",
        parsedCandidateCount: 0,
        admittedCandidateCount: 0,
      }),
    ])
  })

  it("keeps reviewed six-character cat directions grounded only for the cat-care context", () => {
    const catDescription = "Urban cat sitting service for busy apartment owners"
    const unrelatedDescription = "AI scheduling assistant for busy startup founders"

    for (const [name, left, right] of REVIEWED_TIGHT_CAT_DIRECTIONS) {
      const candidate = createQuickCandidateFromName(name, {
        description: catDescription,
        vibe: "friendly",
        style: "auto",
        requestedStyle: "auto",
        creativity: "balanced",
        maxChars: 6,
        sourceRoots: [left, right],
        modelAuthored: true,
      })

      expect(candidate, name).not.toBeNull()
      expect(isQuickReviewedContextCompound(name, catDescription), name).toBe(true)
      expect(hasQuickPrimaryConceptEvidence(candidate!, catDescription), name).toBe(true)
      expect(assessQuickAutoCandidateQuality(candidate!, catDescription), name).toMatchObject({
        tier: "grounded",
      })

      const outsideCandidate = {
        name,
        fitRoots: [],
        constructionParts: [left, right],
      }
      expect(isQuickReviewedContextCompound(name, unrelatedDescription), name).toBe(false)
      expect(hasQuickPrimaryConceptEvidence(outsideCandidate, unrelatedDescription), name).toBe(false)
      expect(assessQuickAutoCandidateQuality(outsideCandidate, unrelatedDescription).tier, name).not.toBe("grounded")
    }
  })

  it("owns strict rural-telehealth semantic words only in their reviewed context", () => {
    const ruralDescription = "Rural telehealth platform for community clinics and patients"
    const unrelatedDescription = "AI scheduling assistant for busy startup founders"

    for (const name of [
      "reachable", "outreach", "nearness", "proximity", "connected",
      "accessible", "telepresence", "availability",
    ]) {
      expect(isQuickCueOwnedSemanticWord(name, ruralDescription), name).toBe(true)
      expect(isQuickCueOwnedSemanticWord(name, unrelatedDescription), name).toBe(false)
    }
  })

})
