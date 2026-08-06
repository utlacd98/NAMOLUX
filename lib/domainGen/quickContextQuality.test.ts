import { describe, expect, it } from "vitest"

import {
  createQuickCandidateFromName,
  generateQuickCandidates,
  hasConflictingQuickDominantMeaning,
  hasQuickPrimaryConceptEvidence,
  type QuickGenerateVibe,
} from "./quickGenerate"

const riskyBriefs = {
  teen: "A confidential online therapy and emotional support service for teenagers",
  cat: "An urban in-home cat sitting service for apartment cat owners",
  accounting: "Simple tax accounting and bookkeeping for independent freelancers",
  legal: "Plain-language contract review for small business legal teams",
  telehealth: "Telehealth access for rural patients and community clinics",
  climate: "A climate technology marketing agency for early-stage startups",
  mortgage: "A mortgage comparison service for first-time home buyers",
  gold: "Modern heirloom jewellery made with recycled gold",
} as const

describe("Quick contextual creative-quality admission", () => {
  it.each([
    [riskyBriefs.teen, ["teenwhisper", "whisper"], ["voicehaven", "mindharbour"]],
    [riskyBriefs.cat, ["urbancity", "cityurban", "trustedcity", "trustedcare", "kitten", "fireside"], ["citywhisker", "purrnest"]],
    [riskyBriefs.accounting, ["bookwise", "taxwise", "indiebooks"], ["sololedger", "invoicegrid"]],
    [riskyBriefs.legal, ["verdict", "verdictview"], ["clauseview", "plainterms"]],
    [riskyBriefs.telehealth, ["lifeline", "carelifeline", "distance", "clinicpath", "carepulse"], ["clinicreach", "telecare"]],
    [riskyBriefs.climate, ["boldclimate", "climateclear", "momentum", "agency", "launchpad", "ecotype"], ["ecosignal", "proofpoint"]],
    [riskyBriefs.mortgage, ["loanpilot", "borrowbridge", "mortgageflow", "borrowview", "firstrate", "wisechoice", "paymentfit"], ["loanlens", "ratelens", "loanchoice"]],
    [riskyBriefs.gold, ["renewal", "goldagain", "caratagain", "goldreturn", "kindgold", "kindcarat", "kindheir"], ["renewcarat", "recastgold", "caratcycle"]],
  ])("blocks contextual hazards without blocking the reviewed replacement lane", (description, blocked, allowed) => {
    blocked.forEach((name) => {
      expect(hasConflictingQuickDominantMeaning(name, description), `${name} should be blocked`).toBe(true)
      expect(createQuickCandidateFromName(name, {
        description,
        style: "brandable",
        requestedStyle: "auto",
        creativity: "balanced",
        maxChars: 15,
        modelAuthored: true,
      })).toBeNull()
    })

    allowed.forEach((name) => {
      expect(hasConflictingQuickDominantMeaning(name, description), `${name} should remain available`).toBe(false)
    })
  })
})

describe("Quick contextual creative-quality batches", () => {
  const cases: readonly {
    description: string
    maxChars: number
    blocked: RegExp
  }[] = [
    { description: riskyBriefs.teen, maxChars: 15, blocked: /whisper/ },
    { description: riskyBriefs.cat, maxChars: 10, blocked: /^(?:urbancity|cityurban|trustedcity|citytrusted|trustedcare|caretrusted|kitten|fireside)$/ },
    { description: riskyBriefs.accounting, maxChars: 10, blocked: /wise/ },
    { description: riskyBriefs.legal, maxChars: 10, blocked: /verdict/ },
    { description: riskyBriefs.telehealth, maxChars: 15, blocked: /(?:lifeline|distance)|^(?:(?:rural|care|reach|clinic|access)(?:path|guide|well|pulse)|(?:path|guide|well|pulse)(?:rural|care|reach|clinic|access))$/ },
    { description: riskyBriefs.climate, maxChars: 8, blocked: /^(?:agency|advocacy|campaign|catalyst|collective|creative|ecotype|growth|launchpad|mission|momentum|positioning|purpose|resonance|storytelling|studio|traction)$/ },
    { description: riskyBriefs.mortgage, maxChars: 10, blocked: /^(?:borrowbridge|borrowview|firstrate|loanpilot|mortgageflow|paymentfit|wisechoice)$/ },
    { description: riskyBriefs.gold, maxChars: 10, blocked: /^(?:renewal|goldagain|caratagain|goldreturn|kindgold|kindcarat|kindheir)$/ },
  ]
  const vibes: readonly QuickGenerateVibe[] = ["friendly", "premium", "tech", "clean"]

  it("keeps every risky brief complete, unique, within length, and free of reviewed hazards across seeds and vibes", () => {
    for (const testCase of cases) {
      for (const [index, vibe] of vibes.entries()) {
        const candidates = generateQuickCandidates({
          description: testCase.description,
          vibe,
          style: "auto",
          creativity: index % 2 === 0 ? "balanced" : "exploratory",
          maxChars: testCase.maxChars,
          count: 16,
          seed: `context-quality-${index}`,
        })
        const names = candidates.map((candidate) => candidate.name)

        expect(names, `${testCase.description} (${vibe}) should complete`).toHaveLength(16)
        expect(new Set(names).size, `${testCase.description} (${vibe}) should be unique`).toBe(16)
        expect(names.every((name) => name.length <= testCase.maxChars)).toBe(true)
        expect(names.some((name) => testCase.blocked.test(name)), names.join(", ")).toBe(false)
        expect(
          candidates.every((candidate) => hasQuickPrimaryConceptEvidence(candidate, testCase.description)),
          names.join(", "),
        ).toBe(true)
      }
    }
  }, 20_000)

  it("reserves dual-signal constructions for briefs where one side alone is misleading", () => {
    const accounting = generateQuickCandidates({
      description: riskyBriefs.accounting,
      style: "auto",
      count: 16,
      maxChars: 10,
      seed: "accounting-intersections",
    }).map((candidate) => candidate.name)
    const mortgage = generateQuickCandidates({
      description: riskyBriefs.mortgage,
      style: "auto",
      count: 16,
      maxChars: 10,
      seed: "mortgage-intersections",
    }).map((candidate) => candidate.name)
    const gold = generateQuickCandidates({
      description: riskyBriefs.gold,
      style: "auto",
      count: 16,
      maxChars: 10,
      seed: "gold-intersections",
    }).map((candidate) => candidate.name)
    const climate = generateQuickCandidates({
      description: riskyBriefs.climate,
      style: "auto",
      count: 16,
      maxChars: 8,
      seed: "climate-intersections",
    }).map((candidate) => candidate.name)

    expect(accounting.filter((name) => /(?:solo|sole|own|indie)/.test(name) && /(?:tally|ledger|books|tax)/.test(name)).length).toBeGreaterThanOrEqual(3)
    expect(mortgage.filter((name) => /(?:lens|view|rate|compare|choice|option|map|benchmark|shortlist|contrast|sidebyside)/.test(name)).length).toBeGreaterThanOrEqual(4)
    expect(gold.filter((name) => /(?:renew|recast|remade|second|cycle|loop)/.test(name) && /(?:gold|carat)/.test(name)).length).toBeGreaterThanOrEqual(3)
    expect(climate.filter((name) => /^(?:ecostory|ecovoice|ecobrief|ecoframe|storyink|brandcue|ecopitch|storycue|ecospark|ecoecho|ecotype|brandink|voiceink|earthink)$/.test(name)).length).toBeGreaterThanOrEqual(4)
  })
})
