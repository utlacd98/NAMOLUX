import { describe, expect, it } from "vitest"

import {
  createQuickCandidateFromName,
  generateQuickCandidates,
  getQuickConceptRoots,
  type QuickCandidateContext,
  type QuickGenerateInput,
} from "@/lib/domainGen/quickGenerate"

const frozenBriefs: ReadonlyArray<Pick<QuickGenerateInput, "description" | "vibe" | "creativity" | "maxChars">> = [
  {
    description: "independent investigative journalism podcast about corporate power",
    vibe: "bold",
    creativity: "exploratory",
    maxChars: 12,
  },
  {
    description: "fine jewellery made from recycled gold for modern heirlooms",
    vibe: "premium",
    creativity: "direct",
    maxChars: 12,
  },
  {
    description: "auditable carbon accounting for mid market manufacturers",
    vibe: "clean",
    creativity: "balanced",
    maxChars: 12,
  },
  {
    description: "Welsh language marketplace connecting family farms with local schools",
    vibe: "friendly",
    creativity: "balanced",
    maxChars: 12,
  },
  {
    description: "cybersecurity analytics platform for enterprise threat detection teams",
    vibe: "bold",
    creativity: "exploratory",
    maxChars: 11,
  },
  {
    description: "premium skincare made with alpine botanicals and mineral water",
    vibe: "premium",
    creativity: "exploratory",
    maxChars: 12,
  },
  {
    description: "cozy puzzle game studio making thoughtful games for adults",
    vibe: "playful",
    creativity: "exploratory",
    maxChars: 11,
  },
  {
    description: "telehealth access for rural patients and community clinics",
    vibe: "friendly",
    creativity: "direct",
    maxChars: 11,
  },
  {
    description: "simple household budgeting and savings app for young families",
    vibe: "friendly",
    creativity: "direct",
    maxChars: 11,
  },
  {
    description: "AI scheduling assistant for busy startup founders",
    vibe: "tech",
    creativity: "direct",
    maxChars: 11,
  },
  {
    description: "privacy compliance SaaS for European ecommerce teams",
    vibe: "tech",
    creativity: "balanced",
    maxChars: 11,
  },
  {
    description: "inclusive hair care brand for curls coils and textured hair",
    vibe: "playful",
    creativity: "balanced",
    maxChars: 11,
  },
]

const primaryPrecedenceCases: ReadonlyArray<{
  description: string
  vibe: NonNullable<QuickGenerateInput["vibe"]>
  roots: readonly string[]
  cue: string
  audience: string
}> = [
  {
    description: "simple household budgeting and savings app for young families",
    vibe: "friendly",
    roots: ["budget", "save", "fund", "thrift", "ledger"],
    cue: "household financial clarity",
    audience: "families managing household money",
  },
  {
    description: "ethical recruitment marketplace connecting nurses with local hospitals",
    vibe: "friendly",
    roots: ["nurse", "talent", "ward", "hire", "care"],
    cue: "ethical nurse recruitment",
    audience: "nurses and hiring hospitals",
  },
  {
    description: "plateforme de santé pour familles rurales au Québec",
    vibe: "friendly",
    roots: ["sante", "quebec", "rural", "reach", "care"],
    cue: "rural Quebec healthcare access",
    audience: "rural Quebec families",
  },
  {
    description: "Welsh language marketplace connecting family farms with local schools",
    vibe: "friendly",
    roots: ["cymru", "market", "farm", "school", "harvest"],
    cue: "Welsh farm-to-school trade",
    audience: "Welsh farms and local schools",
  },
  {
    description: "affordable late night meal delivery membership for university students",
    vibe: "playful",
    roots: ["meal", "campus", "night", "bite", "route"],
    cue: "late-night student meal membership",
    audience: "university students",
  },
  {
    description: "practical language learning for recent immigrants and their families",
    vibe: "friendly",
    roots: ["speak", "learn", "lingo", "voice", "bridge"],
    cue: "practical language learning",
    audience: "recent immigrants and their families",
  },
  {
    description: "premium conservation safari company owned by local guides in Kenya",
    vibe: "premium",
    roots: ["safari", "wild", "guide", "trail", "kenya"],
    cue: "locally guided conservation travel",
    audience: "travellers seeking locally guided safaris",
  },
  {
    description: "fine jewellery made from recycled gold for modern heirlooms",
    vibe: "premium",
    roots: ["gold", "carat", "heir", "renew", "loom"],
    cue: "recycled-gold jewellery craft",
    audience: "modern jewellery customers",
  },
  {
    description: "restrained interior design studio for warm modern homes",
    vibe: "premium",
    roots: ["room", "interior", "form", "warm", "frame"],
    cue: "warm restrained interiors",
    audience: "homeowners seeking restrained modern interiors",
  },
  {
    description: "architecture practice specialising in adaptive reuse of old buildings",
    vibe: "premium",
    roots: ["reuse", "adapt", "frame", "renew", "arch"],
    cue: "adaptive architectural reuse",
    audience: "clients restoring existing buildings",
  },
  {
    description: "employee onboarding software for distributed remote teams",
    vibe: "tech",
    roots: ["welcome", "join", "team", "flow", "remote"],
    cue: "distributed employee onboarding",
    audience: "new hires and distributed teams",
  },
  {
    description: "secure data collaboration workspace for university researchers",
    vibe: "tech",
    roots: ["research", "proof", "data", "share", "grid"],
    cue: "university research collaboration",
    audience: "university researchers",
  },
  {
    description: "auditable carbon accounting for mid market manufacturers",
    vibe: "clean",
    roots: ["carbon", "audit", "ledger", "measure", "proof"],
    cue: "manufacturer carbon accounting",
    audience: "manufacturing sustainability teams",
  },
  {
    description: "public procurement workflow for local councils and suppliers",
    vibe: "clean",
    roots: ["tender", "supply", "civic", "council", "trust"],
    cue: "council supplier procurement",
    audience: "councils and suppliers",
  },
  {
    description: "bold marketing agency focused on climate technology startups",
    vibe: "bold",
    roots: ["eco", "proof", "story", "claim", "voice"],
    cue: "climate startup marketing",
    audience: "climate-technology founders",
  },
  {
    description: "temperature controlled delivery and cold chain logistics for pharmacies",
    vibe: "bold",
    roots: ["cold", "chain", "route", "track", "pharma"],
    cue: "pharma cold-chain monitoring",
    audience: "pharmacy operations teams",
  },
  {
    description: "real time esports performance analytics for professional teams",
    vibe: "bold",
    roots: ["score", "arena", "esport", "signal", "data"],
    cue: "competitive esports analytics",
    audience: "professional esports teams",
  },
  {
    description: "independent investigative journalism podcast about corporate power",
    vibe: "bold",
    roots: ["probe", "press", "story", "source", "signal"],
    cue: "investigative corporate-power podcast",
    audience: "editorial teams and public-interest audiences",
  },
  {
    description: "warehouse robotics that helps small factories move inventory",
    vibe: "bold",
    roots: ["robot", "stock", "flow", "factory", "route"],
    cue: "small-factory robotics",
    audience: "small-factory operations teams",
  },
  {
    description: "quality inspection workflow for precision manufacturing teams",
    vibe: "clean",
    roots: ["inspect", "gauge", "quality", "exact", "proof"],
    cue: "factory visual inspection",
    audience: "manufacturing quality teams",
  },
  {
    description: "honest mobile auto repair service for rural drivers",
    vibe: "friendly",
    roots: ["repair", "motor", "drive", "road", "rural"],
    cue: "mobile rural auto repair",
    audience: "rural drivers",
  },
]

const exactSupplyAudiences: Readonly<Record<string, RegExp>> = {
  "employee onboarding software for distributed remote teams": /new employees joining distributed teams/i,
  "secure data collaboration workspace for university researchers": /university researchers collaborating on data and evidence/i,
  "auditable carbon accounting for mid market manufacturers": /mid-market manufacturing teams responsible for carbon accounting/i,
  "public procurement workflow for local councils and suppliers": /local councils and suppliers working through procurement/i,
  "bold marketing agency focused on climate technology startups": /climate-technology founders choosing a specialist marketing partner/i,
  "temperature controlled delivery and cold chain logistics for pharmacies": /pharmacy and logistics teams monitoring cold-chain deliveries/i,
  "real time esports performance analytics for professional teams": /professional esports teams reviewing performance/i,
  "independent investigative journalism podcast about corporate power": /listeners choosing public-interest investigative journalism/i,
  "warehouse robotics that helps small factories move inventory": /small-factory operations teams adopting warehouse robotics/i,
  "quality inspection workflow for precision manufacturing teams": /precision-manufacturing quality teams/i,
  "honest mobile auto repair service for rural drivers": /rural drivers seeking mobile vehicle repair/i,
}

function label(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function attributedCueRoots(rationale: string): string[] {
  return Array.from(
    rationale.matchAll(/\bcarries a clear\s+[“"]([^”"]+)[”"]\s+cue\b/giu),
    (match) => label(match[1]),
  ).filter(Boolean)
}

function reversedComponentPairs(names: readonly string[]): string[] {
  const available = new Set(names)
  const pairs = new Set<string>()

  for (const name of names) {
    for (let split = 3; split <= name.length - 3; split += 1) {
      const left = name.slice(0, split)
      const right = name.slice(split)
      const reversed = `${right}${left}`
      if (!available.has(reversed) || reversed === name) continue
      pairs.add([name, reversed].sort().join("/"))
    }
  }

  return [...pairs].sort()
}

describe("Quick Generate frozen-evidence regressions", () => {
  it("never attributes a quoted fallback cue to a root absent from the candidate", () => {
    for (const [index, benchmark] of frozenBriefs.entries()) {
      const candidates = generateQuickCandidates({
        ...benchmark,
        style: "auto",
        count: 16,
        seed: `evidence-rationale-${index}`,
      })

      expect(candidates.length, benchmark.description).toBeGreaterThan(0)
      for (const candidate of candidates) {
        for (const root of attributedCueRoots(candidate.personality)) {
          expect(
            candidate.name,
            `${candidate.name} falsely attributes “${root}” in: ${candidate.personality}`,
          ).toContain(root)
        }
      }
    }
  })

  it("keeps alpine skincare rationales and fit metadata free of hair-category cues", () => {
    const candidates = generateQuickCandidates({
      description: "premium skincare made with alpine botanicals and mineral water",
      vibe: "premium",
      style: "auto",
      creativity: "exploratory",
      maxChars: 12,
      count: 16,
      seed: "evidence-alpine-skin-not-hair",
    })

    expect(candidates).toHaveLength(16)
    for (const candidate of candidates) {
      expect(candidate.fitRoots || [], candidate.name).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/^(?:hair|curl|coil)$/i)]),
      )
      expect(candidate.fitCues || [], candidate.name).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/\bhair\b/i)]),
      )
      expect(candidate.personality, candidate.name).not.toMatch(/\b(?:hair|curl|coil)\b/i)
    }
  })

  it("does not spend a 16-name page on reversed versions of the same component pair", () => {
    const cases: QuickGenerateInput[] = [
      {
        description: "cozy puzzle game studio making thoughtful games for adults",
        vibe: "playful",
        style: "auto",
        creativity: "exploratory",
        maxChars: 11,
        count: 16,
        seed: "namelix-2026-07-14-v1:cozy-puzzle-studio:frozen-first-batch",
      },
      {
        description: "auditable carbon accounting for mid market manufacturers",
        vibe: "clean",
        style: "auto",
        creativity: "balanced",
        maxChars: 12,
        count: 16,
        seed: "namelix-2026-07-14-v1:carbon-accounting:frozen-first-batch",
      },
      {
        description: "inclusive hair care brand for curls coils and textured hair",
        vibe: "playful",
        style: "auto",
        creativity: "balanced",
        maxChars: 11,
        count: 16,
        seed: "namelix-2026-07-14-v1:curly-hair-beauty:frozen-first-batch",
      },
    ]

    for (const input of cases) {
      const candidates = generateQuickCandidates(input)
      const names = candidates.map((candidate) => candidate.name)

      expect(names, input.description).toHaveLength(16)
      expect(new Set(names).size, input.description).toBe(16)
      expect(reversedComponentPairs(names), input.description).toEqual([])
    }
  })

  it("rejects confirmed damaged, misleading and negative candidates", () => {
    const defects: Array<{ name: string; context: QuickCandidateContext }> = [
      {
        name: "wrdswap",
        context: {
          description: "independent investigative journalism podcast about corporate power",
          vibe: "bold",
          style: "alternate_spelling",
          requestedStyle: "auto",
          maxChars: 12,
        },
      },
      {
        name: "gavelgrn",
        context: {
          description: "independent investigative journalism podcast about corporate power",
          vibe: "bold",
          style: "brandable",
          requestedStyle: "auto",
          maxChars: 12,
        },
      },
      {
        name: "jilt",
        context: {
          description: "fine jewellery made from recycled gold for modern heirlooms",
          vibe: "premium",
          style: "alternate_spelling",
          requestedStyle: "auto",
          maxChars: 12,
        },
      },
      {
        name: "gilted",
        context: {
          description: "fine jewellery made from recycled gold for modern heirlooms",
          vibe: "premium",
          style: "alternate_spelling",
          requestedStyle: "auto",
          maxChars: 12,
        },
      },
      {
        name: "ledjer",
        context: {
          description: "auditable carbon accounting for mid market manufacturers",
          vibe: "clean",
          style: "alternate_spelling",
          requestedStyle: "compound",
          maxChars: 12,
        },
      },
      {
        name: "schul",
        context: {
          description: "Welsh language marketplace connecting family farms with local schools",
          vibe: "friendly",
          style: "alternate_spelling",
          requestedStyle: "non_english",
          maxChars: 12,
        },
      },
      {
        name: "yowng",
        context: {
          description: "simple household budgeting and savings app for young families",
          vibe: "friendly",
          style: "alternate_spelling",
          requestedStyle: "evocative",
          maxChars: 11,
        },
      },
      {
        name: "budjet",
        context: {
          description: "simple household budgeting and savings app for young families",
          vibe: "friendly",
          style: "alternate_spelling",
          requestedStyle: "evocative",
          maxChars: 11,
        },
      },
      {
        name: "fownder",
        context: {
          description: "AI scheduling assistant for busy startup founders",
          vibe: "tech",
          style: "alternate_spelling",
          requestedStyle: "compound",
          maxChars: 11,
        },
      },
      {
        name: "ajenda",
        context: {
          description: "AI scheduling assistant for busy startup founders",
          vibe: "tech",
          style: "alternate_spelling",
          requestedStyle: "compound",
          maxChars: 11,
        },
      },
      {
        name: "textureskip",
        context: {
          description: "inclusive hair care brand for curls coils and textured hair",
          vibe: "playful",
          style: "brandable",
          requestedStyle: "alternate_spelling",
          maxChars: 11,
        },
      },
    ]

    for (const defect of defects) {
      expect(createQuickCandidateFromName(defect.name, defect.context), defect.name).toBeNull()
    }
  })

  it("keeps fully Welsh constructions but rejects mixed English locale labels", () => {
    const context: QuickCandidateContext = {
      description: "Welsh language marketplace connecting family farms with local schools",
      vibe: "friendly",
      style: "non_english",
      requestedStyle: "non_english",
      maxChars: 12,
      sourceRoots: ["welsh"],
    }

    for (const name of ["ffermcymru", "marchnadleol", "bwydlleol", "ysgolfferm"]) {
      expect(createQuickCandidateFromName(name, context), name).toMatchObject({
        name,
        style: "non_english",
      })
    }

    for (const name of ["cymruhaven", "cymrubridge", "carecymru", "cymrucare", "cymruguide"]) {
      expect(createQuickCandidateFromName(name, context), name).toBeNull()
    }
  })

  it("hard-blocks every second-pass frozen-review surface", () => {
    const blocked = [
      "privatemate", "thriftyoung", "purrfeline", "catfeline", "mothermama", "childparent",
      "parentcarer", "givegiving", "housemeal", "tablemeal", "tablecampus", "texturehair",
      "skipcouple", "skipgift", "skipcraft", "cartethical", "shelfethical", "craftcampus",
      "flintstone", "wiseacre", "archarc", "chillcold", "pressforge", "greenworks", "threatgrid",
    ]

    for (const name of blocked) {
      expect(createQuickCandidateFromName(name, {
        description: "professional service for local customers",
        vibe: "friendly",
        style: "brandable",
        requestedStyle: "auto",
        maxChars: 15,
      }), name).toBeNull()
    }
  })

  it("systemically rejects synonymous and redundant construction parts", () => {
    const redundantPairs: Array<[string, string, string]> = [
      ["felinecat", "feline", "cat"],
      ["mamamother", "mama", "mother"],
      ["givinggive", "giving", "give"],
      ["hairtexture", "hair", "texture"],
      ["coldchill", "cold", "chill"],
      ["goldgilt", "gold", "gilt"],
      ["interiorroom", "interior", "room"],
      ["adaptreuse", "adapt", "reuse"],
      ["speaklingo", "speak", "lingo"],
    ]

    for (const [name, left, right] of redundantPairs) {
      expect(createQuickCandidateFromName(name, {
        description: "professional specialist service",
        vibe: "clean",
        style: "compound",
        requestedStyle: "auto",
        maxChars: 15,
        sourceRoots: [left, right],
      }), name).toBeNull()
    }
  })

  it("gives every audited multi-term brief one primary concept and its real audience", () => {
    for (const [index, item] of primaryPrecedenceCases.entries()) {
      expect(getQuickConceptRoots(item.description), item.description).toEqual(item.roots)

      const candidates = generateQuickCandidates({
        description: item.description,
        vibe: item.vibe,
        style: "auto",
        creativity: "balanced",
        maxChars: 15,
        count: 16,
        seed: `second-pass-precedence-${index}`,
      })

      expect(candidates, item.description).toHaveLength(16)
      expect(candidates.some((candidate) => candidate.fitCues?.includes(item.cue)), item.description).toBe(true)
      for (const candidate of candidates) {
        expect((candidate.fitCues || []).every((cue) => cue === item.cue), candidate.name).toBe(true)
        const exactAudience = exactSupplyAudiences[item.description]
        if (exactAudience) expect(candidate.personality, `${item.description}: ${candidate.name}`).toMatch(exactAudience)
        else expect(candidate.personality, `${item.description}: ${candidate.name}`).toContain(item.audience)
        expect(candidate.personality, candidate.name).not.toMatch(/\bhelps the brand help\b|\bcreating a lively without\b/i)
        if (candidate.constructionParts?.length === 2) {
          expect(candidate.style, candidate.name).not.toBe("evocative")
        }
      }
    }
  })

  it("keeps generic reserve rationales neutral and ignores supplied model prose", () => {
    const candidate = createQuickCandidateFromName("mosaic", {
      description: "simple household budgeting and savings app for young families",
      vibe: "friendly",
      style: "evocative",
      requestedStyle: "auto",
      maxChars: 12,
      rationale: "Mosaic means perfect budgeting and guarantees a unique trademark.",
    })

    expect(candidate).toMatchObject({ name: "mosaic", style: "evocative", fitRoots: [] })
    expect(candidate?.personality).toContain("does not carry a literal brief cue")
    expect(candidate?.personality).not.toMatch(/perfect budgeting|guarantees|metaphor for household financial clarity/i)
  })

  it("derives Auto style from locale and visible construction evidence", () => {
    const localeCases: Array<{ name: string; description: string; roots: string[]; expectedStyle: string }> = [
      {
        name: "liensante",
        description: "plateforme de santé pour familles rurales au Québec",
        roots: ["lien", "sante"],
        expectedStyle: "non_english",
      },
      {
        name: "ffermcymru",
        description: "Welsh language marketplace connecting family farms with local schools",
        roots: ["fferm", "cymru"],
        expectedStyle: "non_english",
      },
    ]

    for (const item of localeCases) {
      expect(createQuickCandidateFromName(item.name, {
        description: item.description,
        vibe: "friendly",
        style: "compound",
        requestedStyle: "auto",
        maxChars: 15,
        sourceRoots: item.roots,
      }), item.name).toMatchObject({ name: item.name, style: item.expectedStyle })
    }

    expect(createQuickCandidateFromName("quebecsante", {
      description: "plateforme de sante pour familles rurales au Quebec",
      vibe: "friendly",
      style: "compound",
      requestedStyle: "auto",
      maxChars: 15,
      sourceRoots: ["quebec", "sante"],
    })).toBeNull()

    expect(createQuickCandidateFromName("cymrumarket", {
      description: "Welsh language marketplace connecting family farms with local schools",
      vibe: "friendly",
      style: "compound",
      requestedStyle: "auto",
      maxChars: 15,
      sourceRoots: ["cymru", "market"],
    })).toBeNull()

    expect(createQuickCandidateFromName("carebond", {
      description: "trusted childcare network for parents and vetted local carers",
      vibe: "friendly",
      style: "evocative",
      requestedStyle: "auto",
      maxChars: 12,
      sourceRoots: ["care"],
    })).toMatchObject({ name: "carebond", style: "compound" })

    expect(createQuickCandidateFromName("carebond", {
      description: "trusted childcare network for parents and vetted local carers",
      vibe: "friendly",
      style: "evocative",
      requestedStyle: "evocative",
      maxChars: 12,
      sourceRoots: ["care"],
    })).toBeNull()
  })

  it("does not invent maple for Quebec or founders for generic scheduling", () => {
    const quebec = generateQuickCandidates({
      description: "plateforme de santé pour familles rurales au Québec",
      vibe: "friendly",
      style: "auto",
      maxChars: 12,
      count: 16,
      seed: "diag-quebec",
    })
    expect(quebec).toHaveLength(16)
    expect(quebec.some((candidate) => candidate.name.includes("maple"))).toBe(false)

    const veterinary = generateQuickCandidates({
      description: "a trusted scheduling assistant for independent veterinary clinics",
      vibe: "friendly",
      style: "auto",
      maxChars: 12,
      count: 16,
      seed: "generic-veterinary-scheduling",
    })
    expect(veterinary).toHaveLength(16)
    expect(veterinary.some((candidate) => candidate.name.includes("founder"))).toBe(false)
  })

  it("keeps primary matching stable across reordered brief language", () => {
    const paraphrases = [
      ["A marketplace linking Welsh family farms to local schools", "cymru"],
      ["Hospitals hiring local nurses through an ethical recruitment marketplace", "nurse"],
      ["Healthcare access for rural families across Quebec", "sante"],
      ["Rural mobile vehicle repair for drivers", "repair"],
    ] as const

    for (const [description, expectedRoot] of paraphrases) {
      expect(getQuickConceptRoots(description), description).toContain(expectedRoot)
    }
  })
})
