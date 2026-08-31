import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  structured: vi.fn(),
  availability: vi.fn(),
}))

vi.mock("./openai", () => ({
  createStructuredResponse: mocks.structured,
  getNameSprintModel: () => "gpt-5.6-luna",
  getNameSprintRepairModel: () => "gpt-5.6-luna",
}))

vi.mock("@/lib/domainGen/availability", () => ({
  checkAvailabilityBatch: mocks.availability,
}))

import { areRelatedNameFamily, passesControlledCoinedForm, runNameSprint } from "./engine"
import { NAME_SPRINT_STRATEGIES } from "./types"
import type { NameConstitution, NameSprintStrategy, SemanticTerritory } from "./types"

const strategyNames: Record<NameSprintStrategy, string[]> = {
  suggestive: ["CedarLane", "AmberField", "NorthRidge", "WillowTide", "QuietArc", "HarborHelm", "GraniteMark", "SilverThread"],
  metaphorical: ["CedarCourse", "AmberFrame", "NorthRill", "WillowGrove", "QuietVale", "HarborCrest", "GraniteShore", "SilverPeak"],
  invented: ["Cedara", "Amberio", "Northen", "Willora", "Quietra", "Harbora", "Granita", "Silvera"],
  controlled_coined: ["Cedriven", "Ambrinel", "Northrin", "Willoven", "Quielan", "Harbren", "Granivel", "Silvaren"],
  meaningful_compound: ["DawnPath", "OakBeam", "RiverFold", "ClearSpan", "WrenLoom", "MorrowSeed", "FlintCourse", "TideFrame"],
  arbitrary_real_word: ["Cedar", "Amber", "North", "Willow", "Quiet", "Harbor", "Granite", "Silver"],
  verified_root: ["Lumen", "Veralis", "Albora", "Orbis", "Novara", "Vialen", "Meridia", "Alvara"],
}

const territories: SemanticTerritory[] = [
  { id: "signals", label: "Signals", meaning: "See change early.", tone: "clear", roots: ["signal"], avoidRoots: [], strategies: ["suggestive", "invented", "controlled_coined"], phoneticCharacter: "clear and balanced" },
  { id: "navigation", label: "Navigation", meaning: "Choose a confident path.", tone: "credible", roots: ["course"], avoidRoots: [], strategies: ["metaphorical"], phoneticCharacter: "stable rhythm" },
  { id: "resilience", label: "Resilience", meaning: "Stay ready for change.", tone: "assured", roots: ["harbor"], avoidRoots: [], strategies: ["meaningful_compound"], phoneticCharacter: "grounded" },
  { id: "patterns", label: "Patterns", meaning: "Find useful structure.", tone: "intelligent", roots: ["thread"], avoidRoots: [], strategies: ["arbitrary_real_word", "verified_root"], phoneticCharacter: "memorable" },
]

const constitution: NameConstitution = {
  description: "Supply-chain forecasting software for small manufacturers that provides earlier warning of disruption and supports calmer operational decisions.",
  category: "supply-chain forecasting software",
  audience: ["small manufacturers", "operations managers"],
  problem: "Teams learn about disruption too late.",
  promise: ["earlier warning", "calmer decisions"],
  personality: ["credible", "clear", "forward-looking"],
  geographicMarkets: ["United Kingdom"],
  languages: ["English"],
  futureExpansion: ["international operations"],
  competitors: [],
  likedNames: [],
  namingMode: "distinctive_startup",
  preferredLength: { min: 5, max: 12 },
  include: [],
  avoid: ["AI", "quantum", "smart", "solutions"],
  preferredTlds: ["com", "co"],
}

describe("Name Sprint multi-stage engine", () => {
  beforeEach(() => {
    delete process.env.NAMOLUX_NAME_SPRINT_EXPENSIVE_REPAIR
    delete process.env.NAMOLUX_NAME_SPRINT_AI_ADMISSIONS
    delete process.env.NAMOLUX_NAME_SPRINT_WEB_COLLISION
    delete process.env.NAMOLUX_NAME_SPRINT_ENABLED
    mocks.structured.mockReset()
    mocks.availability.mockReset()
    mocks.availability.mockImplementation(async (domains: string[]) => domains.map((domain) => ({
      domain,
      available: true,
      provider: "test",
      confidence: "high",
      latencyMs: 1,
    })))
    let collisionRejected = false
    mocks.structured.mockImplementation(async (request: { schemaName: string; input: string }) => {
      if (request.schemaName === "name_sprint_current_collision_screen") {
        const candidates = JSON.parse(request.input.split("Candidates: ")[1]) as string[]
        return {
          data: { checks: candidates.map((name) => {
            if (!collisionRejected) {
              collisionRejected = true
              return { name, status: "reject", matchedName: name, reason: "An exact active software match was found.", sourceUrls: ["https://example.com/evidence"] }
            }
            return { name, status: "clear", matchedName: null, reason: "No active exact or adjacent match found.", sourceUrls: [] }
          }) },
          model: "gpt-5.6-luna",
          inputTokens: 180,
          outputTokens: 120,
          estimatedUsd: 0.00018,
          webSearchCalls: 1,
        }
      }
      if (NAME_SPRINT_STRATEGIES.some((strategy) => request.schemaName === `name_sprint_${strategy}`)) {
        const strategy = request.schemaName.replace("name_sprint_", "") as NameSprintStrategy
        const verifiedRoots: Record<string, string[]> = {
          Lumen: ["lumen"], Veralis: ["vera"], Albora: ["alba"], Orbis: ["orbis"],
          Novara: ["nova"], Vialen: ["via"], Meridia: ["meridian"], Alvara: ["alba"],
        }
        return {
          data: {
            candidates: strategyNames[strategy].map((name, index) => ({
              name,
              territoryId: territories[index % territories.length].id,
              roots: verifiedRoots[name] || name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(" "),
              pronunciation: name.toLowerCase(),
            })),
          },
          model: "gpt-5.6-luna",
          inputTokens: 100,
          outputTokens: 200,
          estimatedUsd: 0.00026,
        }
      }
      if (request.schemaName === "name_sprint_final_admissions") {
        const candidates = JSON.parse(request.input.split("Candidate set: ")[1]) as Array<{ name: string }>
        return {
          data: { decisions: candidates.map(({ name }, index) => ({
            name,
            admit: index < 8,
            reason: index < 8 ? "A serious shortlist candidate." : "Not distinctive enough for the final shortlist.",
          })) },
          model: "gpt-5.6-luna",
          inputTokens: 200,
          outputTokens: 160,
          estimatedUsd: 0.000232,
        }
      }
      const blinded = JSON.parse(request.input.split("Shuffled candidate set: ")[1]) as Array<{ name: string }>
      return {
        data: {
          judgments: blinded.map(({ name }, index) => ({
            name,
            fatalFlawCodes: [],
            scores: { strategicFit: 86, distinctiveness: 84, memorability: 82, pronunciation: 88, spellingCharacter: 87 },
            strongestReason: "The name has a clear strategic association without describing the product literally.",
            mainRisk: index === 1
              ? "Ordinary adjective with limited distinctiveness."
              : index === 2
                ? "Descriptive compound is relevant but less distinctive."
                : index === 3
                  ? "Compound spacing may vary in verbal use."
                  : index === 4
                    ? "The invented construction feels slightly forced."
                    : "Confirm broader commercial and language evidence before committing.",
            confidence: "high",
            preferredWithinGroup: 90 - index,
          })),
        },
        model: "gpt-5.6-luna",
        inputTokens: 300,
        outputTokens: 500,
        estimatedUsd: 0.00066,
      }
    })
  })

  it("uses one Luna-only strategy wave, one blind judge, and no paid web-search stage", async () => {
    const result = await runNameSprint({
      constitution,
      territories,
      signal: new AbortController().signal,
      userIdentifier: "test-user",
    })

    const generationCalls = mocks.structured.mock.calls.filter(([request]) => NAME_SPRINT_STRATEGIES.some((strategy) => request.schemaName === `name_sprint_${strategy}`))
    const judgeCalls = mocks.structured.mock.calls.filter(([request]) => request.schemaName === "name_sprint_blind_judgments")
    const collisionCalls = mocks.structured.mock.calls.filter(([request]) => request.schemaName === "name_sprint_current_collision_screen")
    expect(generationCalls).toHaveLength(6)
    expect(new Set(generationCalls.map(([request]) => request.schemaName))).toHaveLength(6)
    expect(judgeCalls).toHaveLength(1)
    const admissionCalls = mocks.structured.mock.calls.filter(([request]) => request.schemaName === "name_sprint_final_admissions")
    expect(collisionCalls).toHaveLength(0)
    expect(admissionCalls).toHaveLength(0)
    expect(generationCalls.every(([request]) => request.reasoningEffort === "low" && request.maxOutputTokens === 1_200)).toBe(true)
    expect(judgeCalls[0][0].maxOutputTokens).toBe(1_400)
    expect(judgeCalls[0][0].input).not.toContain("association")
    expect(mocks.availability).toHaveBeenCalledTimes(1)
    expect(result.generatedCount).toBe(48)
    expect(mocks.structured.mock.calls.some(([request]) => request.schemaName === "name_sprint_editorial_repair")).toBe(false)
    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.candidates.length).toBeLessThanOrEqual(12)
    expect(result.candidates.every((candidate) => candidate.eligibility.status === "pass")).toBe(true)
    expect(result.candidates.every((candidate) => candidate.founderSignal.band !== "Reconsider")).toBe(true)
    expect(result.candidates.every((candidate) => candidate.collisionScreen?.status === "not_run")).toBe(true)
    expect(result.rejected.some((candidate) => candidate.eligibility.failureCodes.includes("SPELLING_AMBIGUITY"))).toBe(true)
    expect(result.timingMs.total).toBeGreaterThanOrEqual(0)
    expect(result.usage.estimatedUsd).toBeGreaterThan(0)
    expect(result.usage.estimatedUsd).toBeLessThan(0.01)
    expect(result.usage.model).toBe("gpt-5.6-luna")
    expect(result.usage.webSearchCalls).toBe(0)
  })

  it("returns useful current collision evidence with every displayed candidate when enabled", async () => {
    process.env.NAMOLUX_NAME_SPRINT_WEB_COLLISION = "true"

    const result = await runNameSprint({
      constitution,
      territories,
      signal: new AbortController().signal,
      userIdentifier: "test-user",
    })

    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.candidates.every((candidate) => candidate.collisionScreen?.status === "clear")).toBe(true)
    expect(result.candidates.every((candidate) => candidate.collisionScreen?.summary.includes("No active exact or adjacent match"))).toBe(true)
    expect(result.candidates.every((candidate) => candidate.collisionScreen?.category === constitution.category)).toBe(true)
    expect(result.candidates.every((candidate) => candidate.collisionScreen?.markets.includes("United Kingdom"))).toBe(true)
    expect(result.usage.webSearchCalls).toBeGreaterThan(0)
    expect(result.rejected.some((candidate) => candidate.eligibility.failureCodes.includes("ACTIVE_BRAND_EXACT"))).toBe(true)
  })

  it("runs one combined live screen and caps the public shortlist at eight", async () => {
    process.env.NAMOLUX_NAME_SPRINT_ENABLED = "true"

    const result = await runNameSprint({ constitution, territories, signal: new AbortController().signal, userIdentifier: "test-user" })
    const collisionCalls = mocks.structured.mock.calls.filter(([request]) => request.schemaName === "name_sprint_current_collision_screen")

    expect(collisionCalls).toHaveLength(1)
    expect(result.usage.webSearchCalls).toBe(1)
    expect(result.candidates.length).toBeLessThanOrEqual(8)
    expect(result.candidates.every((candidate) => candidate.collisionScreen?.status === "clear")).toBe(true)
    expect(result.candidates.every((candidate) => candidate.evidenceConfidence === "high")).toBe(true)
    expect(result.candidates.filter((candidate) => candidate.founderSignal.band === "Elite").length).toBeLessThanOrEqual(1)
  })

  it("fails closed when the required live screen does not actually search", async () => {
    process.env.NAMOLUX_NAME_SPRINT_ENABLED = "true"
    const normalImplementation = mocks.structured.getMockImplementation()
    mocks.structured.mockImplementation(async (request: { schemaName: string }) => {
      if (request.schemaName === "name_sprint_current_collision_screen") {
        return { data: { checks: [] }, model: "gpt-5.6-luna", inputTokens: 0, outputTokens: 0, estimatedUsd: 0, webSearchCalls: 0 }
      }
      if (!normalImplementation) throw new Error("missing_test_implementation")
      return normalImplementation(request)
    })

    await expect(runNameSprint({ constitution, territories, signal: new AbortController().signal, userIdentifier: "test-user" }))
      .rejects.toThrow("name_sprint_live_screen_incomplete")
  })

  it("does not silently retry or lose the whole run when one strategy response is malformed", async () => {
    const normalImplementation = mocks.structured.getMockImplementation()
    let failedOnce = false
    mocks.structured.mockImplementation(async (request: { schemaName: string; input: string; reasoningEffort?: string }) => {
      if (request.schemaName === "name_sprint_metaphorical" && !failedOnce) {
        failedOnce = true
        throw new Error("name_sprint_metaphorical_empty_response")
      }
      if (!normalImplementation) throw new Error("missing_test_implementation")
      return normalImplementation(request)
    })

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const result = await runNameSprint({
      constitution,
      territories,
      signal: new AbortController().signal,
      userIdentifier: "test-user",
    })

    const metaphoricalCalls = mocks.structured.mock.calls
      .filter(([request]) => request.schemaName === "name_sprint_metaphorical")
    expect(metaphoricalCalls).toHaveLength(1)
    expect(metaphoricalCalls[0][0].reasoningEffort).toBe("low")
    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.attempts).toBe(1)
    expect(consoleSpy).toHaveBeenCalledWith("name-sprint-strategy-modules-incomplete", { failedStrategies: 1 })
    consoleSpy.mockRestore()
  })

  it("rejects candidates when no verified launch domain is available", async () => {
    mocks.availability.mockImplementation(async (domains: string[]) => domains.map((domain) => ({
      domain,
      available: domain.endsWith(".dev"),
      provider: "test",
      confidence: "high",
      latencyMs: 1,
    })))

    const result = await runNameSprint({
      constitution: { ...constitution, preferredTlds: ["com", "co", "dev"] },
      territories,
      signal: new AbortController().signal,
      userIdentifier: "test-user",
    })

    expect(result.candidates).toHaveLength(0)
    expect(result.survivorCount).toBe(0)
    expect(result.rejected.some((candidate) => candidate.eligibility.failureCodes.includes("NO_PREFERRED_DOMAIN"))).toBe(true)
    const checkedDomains = mocks.availability.mock.calls[0]?.[0] as string[]
    expect(checkedDomains.length).toBeLessThanOrEqual(128)
    expect(checkedDomains.every((domain) => domain.endsWith(".com") || domain.endsWith(".co") || domain.endsWith(".ai"))).toBe(true)
    expect(new Set(checkedDomains.map((domain) => domain.split(".").at(-1)))).toEqual(new Set(["com", "co", "ai"]))
    expect(result.attempts).toBe(1)
    expect(mocks.structured.mock.calls.some(([request]) => request.schemaName === "name_sprint_editorial_repair")).toBe(false)
  })

  it("puts verified dot-com options ahead of names with weaker domain evidence", async () => {
    mocks.availability.mockImplementation(async (domains: string[]) => domains.map((domain) => ({
      domain,
      available: domain === domains[0] || domain.endsWith(".co"),
      provider: "test",
      confidence: "high",
      latencyMs: 1,
    })))

    const result = await runNameSprint({
      constitution,
      territories,
      signal: new AbortController().signal,
      userIdentifier: "test-user",
    })

    expect(result.candidates[0]?.domainStatuses[0]).toMatchObject({ tld: "com", status: "available" })
    expect(result.candidates[0]?.launchDomain.kind).toBe("exact")
    expect(result.candidates[0]?.launchDomain.domain.endsWith(".com")).toBe(true)
  })

  it("calculates domain strength from the verified available TLD", async () => {
    mocks.availability.mockImplementation(async (domains: string[]) => domains.map((domain) => ({
      domain,
      available: domain.endsWith(".co"),
      provider: "test",
      confidence: "high",
      latencyMs: 1,
    })))

    const result = await runNameSprint({ constitution, territories, signal: new AbortController().signal, userIdentifier: "test-user" })
    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.candidates.every((candidate) => candidate.founderSignal.dimensions.domainExtension === 78)).toBe(true)
  })

  it("admits a credible name with a clean modified dot-com and caps modified domains at two", async () => {
    mocks.availability.mockImplementation(async (domains: string[]) => domains.map((domain) => ({
      domain,
      available: domain.startsWith("get") && domain.endsWith(".com"),
      provider: "test",
      confidence: "high",
      latencyMs: 1,
    })))

    const result = await runNameSprint({ constitution, territories, signal: new AbortController().signal, userIdentifier: "test-user" })

    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.candidates.length).toBeLessThanOrEqual(2)
    expect(result.candidates.every((candidate) => candidate.launchDomain.kind === "modified")).toBe(true)
    expect(result.candidates.every((candidate) => candidate.launchDomain.domain.startsWith("get"))).toBe(true)
    expect(result.candidates.every((candidate) => candidate.founderSignal.dimensions.domainExtension === 60)).toBe(true)
  })

  it("treats shared roots, phonetics, and close strings as one related family", () => {
    const raw = (name: string, roots: string[]) => ({
      id: name,
      name,
      normalizedName: name.toLowerCase(),
      strategy: "invented" as const,
      territoryId: "signals",
      roots,
      association: "A credible signal.",
      pronunciation: name.toLowerCase(),
      claimedOrigin: null,
      originVerified: true,
    })

    expect(areRelatedNameFamily(raw("CedarLane", ["cedar"]), raw("CedarArc", ["cedar"]))).toBe(true)
    expect(areRelatedNameFamily(raw("Novara", ["nova"]), raw("Novaro", ["novaro"]))).toBe(true)
    expect(areRelatedNameFamily(raw("Tembra", ["tembra"]), raw("Harbor", ["harbor"]))).toBe(false)
  })

  it("requires controlled coinages to preserve semantic-root sounds without cliché endings", () => {
    expect(passesControlledCoinedForm("Caldrin", ["calm", "adrift"])).toBe(true)
    expect(passesControlledCoinedForm("Zuqtrix", ["calm", "signal"])).toBe(false)
    expect(passesControlledCoinedForm("Calmora", ["calm", "aura"])).toBe(false)
  })

  it("replaces malformed mixed-script pronunciations with a safe fallback", async () => {
    const normalImplementation = mocks.structured.getMockImplementation()
    mocks.structured.mockImplementation(async (request: { schemaName: string; input: string }) => {
      if (!normalImplementation) throw new Error("missing_test_implementation")
      const response = await normalImplementation(request)
      if (NAME_SPRINT_STRATEGIES.some((strategy) => request.schemaName === `name_sprint_${strategy}`)) {
        return {
          ...response,
          data: {
            ...response.data,
            candidates: response.data.candidates.map((item: Record<string, unknown>) => ({ ...item, pronunciation: "KAY-dन्स" })),
          },
        }
      }
      return response
    })

    const result = await runNameSprint({ constitution, territories, signal: new AbortController().signal, userIdentifier: "test-user" })
    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.candidates.every((candidate) => /^[A-Za-z\s'-]+$/.test(candidate.pronunciation))).toBe(true)
  })

  it("falls back to deterministic scoring instead of retrying a failed judge", async () => {
    const normalImplementation = mocks.structured.getMockImplementation()
    mocks.structured.mockImplementation(async (request: { schemaName: string; input: string }) => {
      if (request.schemaName === "name_sprint_blind_judgments") throw new Error("judge_output_truncated")
      if (!normalImplementation) throw new Error("missing_test_implementation")
      return normalImplementation(request)
    })
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const result = await runNameSprint({
      constitution,
      territories,
      signal: new AbortController().signal,
      userIdentifier: "test-user",
    })

    const judgeCalls = mocks.structured.mock.calls.filter(([request]) => request.schemaName === "name_sprint_blind_judgments")
    expect(judgeCalls).toHaveLength(1)
    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.attempts).toBe(1)
    expect(result.usage.model).toBe("gpt-5.6-luna")
    expect(consoleSpy).toHaveBeenCalledWith("name-sprint-judge-incomplete", { reason: "judge_output_truncated" })
    consoleSpy.mockRestore()
  })

  it("repairs once when final admissions leaves fewer than three shortlist names", async () => {
    process.env.NAMOLUX_NAME_SPRINT_ENABLED = "true"
    const normalImplementation = mocks.structured.getMockImplementation()
    let admissionCalls = 0
    mocks.structured.mockImplementation(async (request: { schemaName: string; input: string }) => {
      if (request.schemaName === "name_sprint_editorial_repair") {
        const names = ["Caldrin", "Venset", "Ordan", "Tembra", "Keldan", "Rovant", "Selkin", "Dovren", "Marven", "Tavrin"]
        return {
          data: {
            candidates: names.map((name, index) => ({
              name,
              strategy: "invented",
              territoryId: territories[index % territories.length].id,
              roots: [name.toLowerCase()],
              pronunciation: name.toLowerCase(),
            })),
          },
          model: "gpt-5.6-luna",
          inputTokens: 300,
          outputTokens: 300,
          estimatedUsd: 0.00042,
        }
      }
      if (request.schemaName === "name_sprint_final_admissions") {
        admissionCalls += 1
        const candidates = JSON.parse(request.input.split("Candidate set: ")[1]) as Array<{ name: string }>
        const admit = admissionCalls > 1
        return {
          data: {
            decisions: candidates.map(({ name }, index) => ({
              name,
              admit: admit && index < 8,
              reason: admit && index < 8
                ? "A serious shortlist candidate."
                : "Not strong enough to shortlist.",
            })),
          },
          model: "gpt-5.6-luna",
          inputTokens: 160,
          outputTokens: 120,
          estimatedUsd: 0.000176,
        }
      }
      if (!normalImplementation) throw new Error("missing_test_implementation")
      return normalImplementation(request)
    })

    const result = await runNameSprint({
      constitution,
      territories,
      signal: new AbortController().signal,
      userIdentifier: "test-user",
    })

    const repairCalls = mocks.structured.mock.calls.filter(([request]) => request.schemaName === "name_sprint_editorial_repair")
    const collisionCalls = mocks.structured.mock.calls.filter(([request]) => request.schemaName === "name_sprint_current_collision_screen")
    expect(repairCalls).toHaveLength(1)
    expect(repairCalls[0][0].input).toContain("BELOW_QUALITY_BAR")
    expect(admissionCalls).toBe(2)
    expect(collisionCalls).toHaveLength(1)
    expect(result.attempts).toBe(2)
    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.usage.webSearchCalls).toBe(1)
    expect(result.usage.estimatedUsd).toBeLessThan(0.025)
  })

  it("records below-bar names in the rejection audit instead of dropping them silently", async () => {
    mocks.structured.mockImplementation(async (request: { schemaName: string; input: string }) => {
      if (request.schemaName === "name_sprint_editorial_repair") {
        const names = ["Caldrin", "Venset", "Ordan", "Tembra", "Keldan", "Rovant", "Selkin", "Dovren", "Marven", "Tavrin"]
        return {
          data: {
            candidates: names.map((name, index) => ({
              name,
              strategy: "invented",
              territoryId: territories[index % territories.length].id,
              roots: [name.toLowerCase()],
              pronunciation: name.toLowerCase(),
            })),
          },
          model: "gpt-5.6-terra",
          inputTokens: 300,
          outputTokens: 300,
          estimatedUsd: 0.0042,
        }
      }
      if (NAME_SPRINT_STRATEGIES.some((strategy) => request.schemaName === `name_sprint_${strategy}`)) {
        const strategy = request.schemaName.replace("name_sprint_", "") as NameSprintStrategy
        return {
          data: {
            candidates: strategyNames[strategy].map((name, index) => ({
              name,
              territoryId: territories[index % territories.length].id,
              roots: strategy === "verified_root" ? ["lumen"] : ["cedar", "lane"],
              pronunciation: name.toLowerCase(),
            })),
          },
          model: "gpt-5.6-luna",
          inputTokens: 100,
          outputTokens: 120,
          estimatedUsd: 0.000164,
        }
      }
      if (request.schemaName === "name_sprint_final_admissions") {
        const candidates = JSON.parse(request.input.split("Candidate set: ")[1]) as Array<{ name: string }>
        return {
          data: { decisions: candidates.map(({ name }) => ({ name, admit: false, reason: "Not strong enough to shortlist." })) },
          model: "gpt-5.6-luna",
          inputTokens: 120,
          outputTokens: 100,
          estimatedUsd: 0.000144,
        }
      }
      const blinded = JSON.parse(request.input.split("Shuffled candidate set: ")[1]) as Array<{ name: string }>
      return {
        data: {
          judgments: blinded.map(({ name }) => ({
            name,
            fatalFlawCodes: [],
            scores: { strategicFit: 0, distinctiveness: 0, memorability: 0, pronunciation: 50, spellingCharacter: 50 },
            strongestReason: "No persuasive advantage was identified.",
            mainRisk: "The name is not strong enough to shortlist.",
            confidence: "high",
            preferredWithinGroup: 0,
          })),
        },
        model: "gpt-5.6-luna",
        inputTokens: 200,
        outputTokens: 300,
        estimatedUsd: 0.0004,
      }
    })

    const result = await runNameSprint({
      constitution,
      territories,
      signal: new AbortController().signal,
      userIdentifier: "test-user",
    })

    const repairCall = mocks.structured.mock.calls.find(([request]) => request.schemaName === "name_sprint_editorial_repair")
    expect(repairCall).toBeUndefined()
    expect(result.attempts).toBe(1)
    expect(result.usage.model).toBe("gpt-5.6-luna")
    expect(result.candidates).toHaveLength(0)
    expect(result.rejected.some((candidate) => candidate.eligibility.failureCodes.includes("BELOW_QUALITY_BAR"))).toBe(true)
  })
})
