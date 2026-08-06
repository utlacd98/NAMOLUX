import { describe, expect, it } from "vitest"

import { getQuickLocalePolicy } from "./quickGenerate"
import {
  QUICK_RATIONALE_ASSOCIATIONS,
  QUICK_RATIONALE_CONCEPT_ALIASES,
  QUICK_RATIONALE_LOCALES,
  containsDeniedRationaleClaim,
  renderRationaleV2,
  resolveRationaleAssociationId,
  validateRationalePlan,
} from "./quickRationale"
import { buildQuickBriefFactSheet, buildQuickRationalePlan, renderQuickCandidateRationale } from "./quickRationaleAdapter"

describe("Quick rationale adapter", () => {
  it("keeps every cue alias in the resolver's canonical lowercase form", () => {
    expect(Object.keys(QUICK_RATIONALE_CONCEPT_ALIASES).filter((cue) => cue !== cue.toLowerCase())).toEqual([])
  })

  it("replays visible compounds without receiving the raw brief", () => {
    const plan = buildQuickRationalePlan({
      name: "timepilot",
      style: "compound",
      tone: "tech",
      conceptCue: "faster scheduling",
      constructionParts: ["time", "pilot"],
    })

    expect(validateRationalePlan(plan)).toMatchObject({ ok: true })
    const rendered = renderRationaleV2(plan)
    expect(rendered.fallback).toBe(false)
    expect(rendered.text).toMatch(/time.*pilot|pilot.*time/i)
    expect(rendered.text).toMatch(/scheduling|time coordination/i)
  })

  it("separates category evidence from brief context for zero-fit constructions", () => {
    const zeroFit = buildQuickRationalePlan({
      name: "ivorybeam",
      style: "compound",
      tone: "premium",
      conceptCue: "household financial clarity",
      constructionParts: ["ivory", "beam"],
      relevance: "context_only",
    })
    const grounded = buildQuickRationalePlan({
      name: "budgetsaver",
      style: "compound",
      tone: "friendly",
      conceptCue: "household financial clarity",
      constructionParts: ["budget", "saver"],
      relevance: "category_evidence",
    })

    expect(zeroFit.relevance).toBe("context_only")
    expect(zeroFit.evidence.map((part) => part.provenance)).toEqual(["curated", "literal"])
    expect(renderRationaleV2(zeroFit).text).toMatch(/focused beam|visible signal/i)
    expect(renderRationaleV2(zeroFit).text).toMatch(/evidence of a category meaning/i)
    expect(renderRationaleV2(zeroFit).text).toMatch(/families managing household money/i)

    expect(grounded.relevance).toBe("category_evidence")
    expect(grounded.evidence.find((part) => part.surface === "saver")?.provenance).toBe("literal")
    expect(renderRationaleV2(grounded).text).toMatch(/budget.*saver|saver.*budget/i)
    expect(renderRationaleV2(grounded).text).toMatch(/families managing household money/i)
    expect(renderRationaleV2(grounded).text).not.toMatch(/curated naming cue|reviewed category|declared provenance/i)
  })

  it("fails closed for unreviewed relevance or provenance values", () => {
    const plan = buildQuickRationalePlan({
      name: "timepilot",
      style: "compound",
      tone: "tech",
      conceptCue: "faster scheduling",
      constructionParts: ["time", "pilot"],
      relevance: "category_evidence",
    })
    const invalidRelevance = { ...plan, relevance: "model_asserted" }
    const invalidProvenance = structuredClone(plan) as unknown as Record<string, unknown>
    ;(invalidProvenance.evidence as Array<Record<string, unknown>>)[0].provenance = "raw_prompt"

    expect(validateRationalePlan(invalidRelevance)).toMatchObject({ ok: false })
    expect(validateRationalePlan(invalidProvenance)).toMatchObject({ ok: false })
    expect(renderRationaleV2(invalidRelevance)).toMatchObject({ fallback: true })
    expect(renderRationaleV2(invalidProvenance)).toMatchObject({ fallback: true })
  })

  it("maps reviewed semantic, fusion, and spelling evidence into replayable plans", () => {
    const cases = [
      buildQuickRationalePlan({
        name: "cadence",
        style: "real_word",
        tone: "clean",
        conceptCue: "faster scheduling",
        evidence: { kind: "semantic_word", cue: "faster scheduling", source: "cadence" },
      }),
      buildQuickRationalePlan({
        name: "carelay",
        style: "brandable",
        tone: "friendly",
        conceptCue: "reassuring care",
        evidence: { kind: "orthographic_fusion", left: "care", right: "relay", overlap: "re" },
      }),
      buildQuickRationalePlan({
        name: "sonik",
        style: "alternate_spelling",
        tone: "playful",
        conceptCue: "creative discovery",
        evidence: { kind: "reviewed_spelling", source: "sonic", rule: "terminal_ic_to_ik" },
      }),
    ]

    for (const plan of cases) {
      expect(validateRationalePlan(plan), plan.name).toMatchObject({ ok: true })
      expect(renderRationaleV2(plan).fallback, plan.name).toBe(false)
    }
  })

  it("keeps ambiguous word evidence scoped to the current concept", () => {
    const welshHarvest = buildQuickRationalePlan({
      name: "harvest",
      style: "real_word",
      tone: "playful",
      conceptCue: "Welsh farm-to-school trade",
      evidence: { kind: "semantic_word", cue: "Welsh farm-to-school trade", source: "harvest" },
    })
    const carbonTrack = buildQuickRationalePlan({
      name: "track",
      style: "real_word",
      tone: "clean",
      conceptCue: "manufacturer carbon accounting",
      evidence: { kind: "semantic_word", cue: "manufacturer carbon accounting", source: "track" },
    })
    const privacyFlora = buildQuickRationalePlan({
      name: "flora",
      style: "real_word",
      tone: "tech",
      conceptCue: "european retail privacy compliance",
      evidence: { kind: "semantic_word", cue: "european retail privacy compliance", source: "flora" },
      relevance: "category_evidence",
    })

    for (const plan of [welshHarvest, carbonTrack, privacyFlora]) {
      expect(validateRationalePlan(plan), plan.name).toMatchObject({ ok: true })
      expect(renderRationaleV2(plan).fallback, plan.name).toBe(false)
    }

    const harvestText = renderRationaleV2(welshHarvest).text
    expect(welshHarvest.evidence[0]?.associationId).toBe("harvest_yield")
    expect(harvestText).toMatch(/seasonal gathering|cultivated produce/i)
    expect(harvestText).not.toMatch(/water capture|irrigation/i)

    const trackText = renderRationaleV2(carbonTrack).text
    expect(carbonTrack.evidence[0]?.associationId).toBe("track_record")
    expect(trackText).toMatch(/path|recorded sequence|followed over time/i)
    expect(trackText).not.toMatch(/music|song|audio/i)

    const floraText = renderRationaleV2(privacyFlora).text
    expect(privacyFlora.evidence[0]?.associationId).toBe("generic_curated")
    expect(privacyFlora.relevance).toBe("context_only")
    expect(floraText).toMatch(/not (?:as )?evidence of a category meaning/i)
    expect(floraText).not.toMatch(/alpine|mountain|botanical|flower|plant life/i)
  })

  it("uses climate-marketing meanings for ambiguous construction parts only under the exact climate cue", () => {
    const cases = [
      {
        name: "founderstory",
        parts: ["founder", "story"] as const,
        associationIds: ["climate_marketing_audience", "climate_marketing_narrative"],
        expectedCopy: /climate-technology founder.*climate storytelling|climate storytelling.*climate-technology founder/i,
      },
      {
        name: "claimarc",
        parts: ["claim", "arc"] as const,
        associationIds: ["climate_marketing_evidence", "climate_marketing_narrative"],
        expectedCopy: /evidence-aware climate claims.*narrative direction|narrative direction.*evidence-aware climate claims/i,
      },
      {
        name: "ecobrief",
        parts: ["eco", "brief"] as const,
        associationIds: ["climate_marketing_environment", "climate_marketing_campaign"],
        expectedCopy: /environmental positioning.*climate-marketing brief|climate-marketing brief.*environmental positioning/i,
      },
      {
        name: "storyarc",
        parts: ["story", "arc"] as const,
        associationIds: ["climate_marketing_narrative", "climate_marketing_narrative"],
        expectedCopy: /climate storytelling.*narrative direction/i,
      },
      {
        name: "voicearc",
        parts: ["voice", "arc"] as const,
        associationIds: ["climate_marketing_narrative", "climate_marketing_narrative"],
        expectedCopy: /climate storytelling.*market voice/i,
      },
      {
        name: "carbonvoice",
        parts: ["carbon", "voice"] as const,
        associationIds: ["climate_marketing_carbon_context", "climate_marketing_narrative"],
        expectedCopy: /climate-sector subject matter.*market voice|market voice.*climate-sector subject matter/i,
      },
      {
        name: "impactstory",
        parts: ["impact", "story"] as const,
        associationIds: ["climate_marketing_impact_frame", "climate_marketing_narrative"],
        expectedCopy: /intended role.*market audience.*climate storytelling|climate storytelling.*intended role.*market audience/i,
      },
      {
        name: "ecocadence",
        parts: ["eco", "cadence"] as const,
        associationIds: ["climate_marketing_environment", "climate_marketing_communication_cadence"],
        expectedCopy: /environmental positioning.*pacing and rhythm|pacing and rhythm.*environmental positioning/i,
      },
      {
        name: "signalmark",
        parts: ["signal", "mark"] as const,
        associationIds: ["climate_marketing_market_signal", "climate_marketing_campaign"],
        expectedCopy: /market-positioning cue.*climate-marketing brief|climate-marketing brief.*market-positioning cue/i,
      },
      {
        name: "clarionbrief",
        parts: ["clarion", "brief"] as const,
        associationIds: ["climate_marketing_clear_voice", "climate_marketing_campaign"],
        expectedCopy: /distinctive climate-marketing voice.*climate-marketing brief|climate-marketing brief.*distinctive climate-marketing voice/i,
      },
      {
        name: "demandcraft",
        parts: ["demand", "craft"] as const,
        associationIds: ["climate_marketing_demand_context", "climate_marketing_message_craft"],
        expectedCopy: /market demand.*careful shaping|careful shaping.*market demand/i,
      },
      {
        name: "marketshift",
        parts: ["market", "shift"] as const,
        associationIds: ["climate_marketing_market_context", "climate_marketing_market_shift"],
        expectedCopy: /audience for climate-technology positioning.*change in market framing|change in market framing.*audience for climate-technology positioning/i,
      },
      {
        name: "uptakelab",
        parts: ["uptake", "lab"] as const,
        associationIds: ["climate_marketing_audience_reception", "climate_marketing_message_workshop"],
        expectedCopy: /audience receives a message.*testing and shaping messages|testing and shaping messages.*audience receives a message/i,
      },
    ] as const

    for (const testCase of cases) {
      const plan = buildQuickRationalePlan({
        name: testCase.name,
        style: "compound",
        tone: "clean",
        conceptCue: "climate startup marketing",
        constructionParts: testCase.parts,
        relevance: "category_evidence",
      })
      const rendered = renderRationaleV2(plan)

      expect(plan.conceptId, testCase.name).toBe("cue:climate startup marketing")
      expect(plan.evidence.map(({ associationId }) => associationId), testCase.name).toEqual(testCase.associationIds)
      expect(validateRationalePlan(plan), testCase.name).toMatchObject({ ok: true })
      expect(rendered.fallback, testCase.name).toBe(false)
      expect(rendered.text, testCase.name).toMatch(testCase.expectedCopy)
      expect(rendered.text, testCase.name).not.toMatch(
        /founder's working day|calendar coordination|cover, claims|insurance claim|document clauses|careful review|expression, performance and a public voice|being heard, personal expression and agency|journalistic inquiry|carbon measurement|auditable record|participation, teamwork|timing, sequence|dependable coordination|visibility, evidence|public advocacy|measurable environmental (?:progress|outcome)|verified environmental (?:progress|outcome)|reduc(?:e|ed|tion) emissions/i,
      )

      const forgedContext = validateRationalePlan({
        ...plan,
        conceptId: "cue:founder scheduling assistance",
      })
      expect(forgedContext, `${testCase.name} forged context`).toMatchObject({ ok: false })
      if (!forgedContext.ok) {
        expect(
          forgedContext.issues.some(({ code }) => code === "association_concept_mismatch"),
          testCase.name,
        ).toBe(true)
      }
    }

    const semanticCases = [
      {
        name: "impact",
        associationId: "climate_marketing_impact_frame",
        expectedCopy: /intended role.*market audience/i,
      },
      {
        name: "signal",
        associationId: "climate_marketing_market_signal",
        expectedCopy: /market-positioning cue/i,
      },
      {
        name: "clarion",
        associationId: "climate_marketing_clear_voice",
        expectedCopy: /distinctive climate-marketing voice/i,
      },
      {
        name: "salience",
        associationId: "climate_marketing_message_clarity",
        expectedCopy: /clear, relevant climate-technology messaging/i,
      },
      {
        name: "cogent",
        associationId: "climate_marketing_message_clarity",
        expectedCopy: /clear, relevant climate-technology messaging/i,
      },
      {
        name: "resound",
        associationId: "climate_marketing_message_delivery",
        expectedCopy: /how a climate-technology message is conveyed/i,
      },
      {
        name: "convey",
        associationId: "climate_marketing_message_delivery",
        expectedCopy: /how a climate-technology message is conveyed/i,
      },
      {
        name: "cutthrough",
        associationId: "climate_marketing_distinctiveness",
        expectedCopy: /distinctive climate-technology messaging/i,
      },
    ] as const

    for (const testCase of semanticCases) {
      const plan = buildQuickRationalePlan({
        name: testCase.name,
        style: "real_word",
        tone: "bold",
        conceptCue: "climate startup marketing",
        evidence: {
          kind: "semantic_word",
          cue: "climate startup marketing",
          source: testCase.name,
        },
        relevance: "category_evidence",
      })
      const rendered = renderRationaleV2(plan)

      expect(plan.evidence[0]?.associationId, testCase.name).toBe(testCase.associationId)
      expect(validateRationalePlan(plan), testCase.name).toMatchObject({ ok: true })
      expect(rendered.fallback, testCase.name).toBe(false)
      expect(rendered.text, testCase.name).toMatch(testCase.expectedCopy)
      expect(rendered.text, testCase.name).not.toMatch(
        /measur(?:e|ed|ement)|audit(?:able|ed)?|verified outcome|environmental outcome|participation, teamwork|scheduling coordination|public advocacy|lower(?:ed|ing)? emissions/i,
      )

      const forgedContext = validateRationalePlan({
        ...plan,
        conceptId: "cue:neighbourhood volunteer coordination",
      })
      expect(forgedContext, `${testCase.name} forged context`).toMatchObject({ ok: false })
      if (!forgedContext.ok) {
        expect(
          forgedContext.issues.some(({ code }) => code === "association_concept_mismatch"),
          testCase.name,
        ).toBe(true)
      }
    }

    const rawInput = {
      name: "founderstory",
      style: "compound" as const,
      tone: "clean" as const,
      conceptCue: "climate startup marketing",
      constructionParts: ["founder", "story"] as const,
      relevance: "category_evidence" as const,
      brief: "Confidential climate launch ZXQ-CLIMATE-7319 for Jane@example.test",
      modelRationale: "FounderStory guarantees market leadership.",
    }
    expect(renderQuickCandidateRationale(rawInput)).not.toMatch(/ZXQ|Jane|example\.test|guarantees market leadership/i)

    const climatePlan = buildQuickRationalePlan({
      name: "claimarc",
      style: "compound",
      tone: "clean",
      conceptCue: "climate startup marketing",
      constructionParts: ["claim", "arc"],
      relevance: "category_evidence",
    })
    const forgedInsuranceContext = validateRationalePlan({
      ...climatePlan,
      conceptId: "cue:homeowner claim guidance",
    })
    expect(forgedInsuranceContext).toMatchObject({ ok: false })
    if (!forgedInsuranceContext.ok) {
      expect(forgedInsuranceContext.issues.some(({ code }) => code === "association_concept_mismatch")).toBe(true)
    }
  })

  it("preserves founder-scheduling, insurance, legal, media, and personal-voice meanings outside climate marketing", () => {
    const cases = [
      {
        name: "founderstory",
        cue: "founder scheduling assistance",
        parts: ["founder", "story"] as const,
        associationIds: ["founder_assistance", "media"],
        expectedCopy: /founder's working day/i,
      },
      {
        name: "claimarc",
        cue: "homeowner claim guidance",
        parts: ["claim", "arc"] as const,
        associationIds: ["insurance", "generic_literal"],
        expectedCopy: /cover, claims and a navigable process/i,
      },
      {
        name: "ecobrief",
        cue: "small-business contract review",
        parts: ["eco", "brief"] as const,
        associationIds: ["generic_literal", "review_parts"],
        expectedCopy: /document clauses and careful review/i,
      },
      {
        name: "storyarc",
        cue: "credible storytelling",
        parts: ["story", "arc"] as const,
        associationIds: ["media", "generic_literal"],
        expectedCopy: /expression, performance and a public voice/i,
      },
      {
        name: "voicearc",
        cue: "private teen emotional support",
        parts: ["voice", "arc"] as const,
        associationIds: ["personal_voice", "generic_literal"],
        expectedCopy: /being heard, personal expression and agency/i,
      },
      {
        name: "carbonvoice",
        cue: "manufacturer carbon accounting",
        parts: ["carbon", "voice"] as const,
        associationIds: ["carbon_audit", "personal_voice"],
        expectedCopy: /carbon measurement and an auditable record/i,
      },
      {
        name: "impactstory",
        cue: "neighbourhood volunteer coordination",
        parts: ["impact", "story"] as const,
        associationIds: ["community", "media"],
        expectedCopy: /participation, teamwork and shared purpose/i,
      },
      {
        name: "ecocadence",
        cue: "founder scheduling assistance",
        parts: ["eco", "cadence"] as const,
        associationIds: ["generic_literal", "time_order"],
        expectedCopy: /timing, sequence and dependable coordination/i,
      },
      {
        name: "signalmark",
        cue: "developer observability",
        parts: ["signal", "mark"] as const,
        associationIds: ["insight", "distinctive_mark"],
        expectedCopy: /visibility, evidence and a clearer signal/i,
      },
      {
        name: "clarionstory",
        cue: "credible storytelling",
        parts: ["clarion", "story"] as const,
        associationIds: ["campaign_momentum", "media"],
        expectedCopy: /campaign direction, public advocacy and forward momentum/i,
      },
    ] as const

    for (const testCase of cases) {
      const plan = buildQuickRationalePlan({
        name: testCase.name,
        style: "compound",
        tone: "clean",
        conceptCue: testCase.cue,
        constructionParts: testCase.parts,
        relevance: "category_evidence",
      })
      const rendered = renderRationaleV2(plan)

      expect(plan.evidence.map(({ associationId }) => associationId), testCase.name).toEqual(testCase.associationIds)
      expect(plan.evidence.every(({ associationId }) => !associationId.startsWith("climate_marketing_")), testCase.name).toBe(true)
      expect(validateRationalePlan(plan), testCase.name).toMatchObject({ ok: true })
      expect(rendered.fallback, testCase.name).toBe(false)
      expect(rendered.text, testCase.name).toMatch(testCase.expectedCopy)
    }

    expect(resolveRationaleAssociationId("founder")).toBe("founder_assistance")
    expect(resolveRationaleAssociationId("claim")).toBe("insurance")
    expect(resolveRationaleAssociationId("brief")).toBe("review_parts")
    expect(resolveRationaleAssociationId("story")).toBe("media")
    expect(resolveRationaleAssociationId("voice")).toBe("personal_voice")
    expect(resolveRationaleAssociationId("eco")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("arc")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("carbon")).toBe("carbon_audit")
    expect(resolveRationaleAssociationId("impact")).toBe("community")
    expect(resolveRationaleAssociationId("cadence")).toBe("time_order")
    expect(resolveRationaleAssociationId("signal")).toBe("insight")
    expect(resolveRationaleAssociationId("clarion")).toBe("campaign_momentum")
    expect(resolveRationaleAssociationId("salience")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("cogent")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("resound")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("convey")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("cutthrough")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("demand")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("craft")).toBe("craft")
    expect(resolveRationaleAssociationId("market")).toBe("commerce")
    expect(resolveRationaleAssociationId("shift")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("uptake")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("lab")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("credence")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("narrate")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("cohere")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("pitch")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("reframe")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("cue")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("herald")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("stance")).toBe("generic_literal")
    expect(resolveRationaleAssociationId("spark")).toBe("learning")
    expect(resolveRationaleAssociationId("echo")).toBe("echoing_sound")
  })

  it("uses exact cue-scoped meanings for reviewed privacy, accounting, contract, rural, and mortgage surfaces", () => {
    const cases = [
      {
        name: "dataseal",
        cue: "european retail privacy compliance",
        parts: ["data", "seal"] as const,
        expected: { data: "privacy_customer_data", seal: "privacy_boundary_marker" },
      },
      {
        name: "datacustody",
        cue: "european retail privacy compliance",
        parts: ["data", "custody"] as const,
        expected: { data: "privacy_customer_data", custody: "privacy_data_custody" },
      },
      {
        name: "erasure",
        cue: "european retail privacy compliance",
        expected: { erasure: "privacy_erasure_right" },
      },
      {
        name: "portability",
        cue: "european retail privacy compliance",
        expected: { portability: "privacy_portability_right" },
      },
      {
        name: "consentkey",
        cue: "european retail privacy compliance",
        parts: ["consent", "key"] as const,
        expected: { key: "privacy_access_permission" },
      },
      {
        name: "guardledger",
        cue: "european retail privacy compliance",
        parts: ["guard", "ledger"] as const,
        expected: { ledger: "privacy_compliance_record" },
      },
      {
        name: "policyguard",
        cue: "european retail privacy compliance",
        parts: ["policy", "guard"] as const,
        expected: { policy: "privacy_policy_framework" },
      },
      {
        name: "erasuredesk",
        cue: "european retail privacy compliance",
        parts: ["erasure", "desk"] as const,
        expected: {
          erasure: "privacy_erasure_right",
          desk: "privacy_request_workspace",
        },
      },
      {
        name: "basislog",
        cue: "european retail privacy compliance",
        parts: ["basis", "log"] as const,
        expected: {
          basis: "privacy_notice_basis",
          log: "privacy_compliance_record",
        },
      },
      {
        name: "noticetrace",
        cue: "european retail privacy compliance",
        parts: ["notice", "trace"] as const,
        expected: {
          notice: "privacy_notice",
          trace: "privacy_compliance_record",
        },
      },
      {
        name: "balance",
        cue: "freelancer accounting",
        expected: { balance: "freelancer_accounting_records" },
      },
      {
        name: "daybook",
        cue: "freelancer accounting",
        expected: { daybook: "freelancer_accounting_records" },
      },
      {
        name: "ownledger",
        cue: "freelancer accounting",
        parts: ["own", "ledger"] as const,
        expected: { own: "freelancer_accounting_independence" },
      },
      {
        name: "tabulate",
        cue: "freelancer accounting",
        expected: { tabulate: "freelancer_accounting_records" },
      },
      {
        name: "reckoner",
        cue: "freelancer accounting",
        expected: { reckoner: "freelancer_accounting_calculation" },
      },
      {
        name: "accrue",
        cue: "freelancer accounting",
        expected: { accrue: "freelancer_accounting_timing" },
      },
      {
        name: "figurecash",
        cue: "freelancer accounting",
        parts: ["figure", "cash"] as const,
        expected: {
          figure: "freelancer_accounting_figures",
          cash: "freelancer_accounting_figures",
        },
      },
      {
        name: "filinginvoice",
        cue: "freelancer accounting",
        parts: ["filing", "invoice"] as const,
        expected: {
          filing: "freelancer_accounting_records",
          invoice: "freelancer_accounting_invoice",
        },
      },
      {
        name: "billable",
        cue: "freelancer accounting",
        expected: { billable: "freelancer_accounting_billable" },
      },
      {
        name: "setaside",
        cue: "freelancer accounting",
        expected: { setaside: "freelancer_accounting_reserve" },
      },
      {
        name: "lineitem",
        cue: "freelancer accounting",
        expected: { lineitem: "freelancer_accounting_line_item" },
      },
      {
        name: "clauseaudit",
        cue: "small-business contract review",
        parts: ["clause", "audit"] as const,
        expected: { audit: "contract_review_check" },
      },
      {
        name: "termstrace",
        cue: "small-business contract review",
        parts: ["terms", "trace"] as const,
        expected: { trace: "contract_review_history" },
      },
      {
        name: "briefproof",
        cue: "small-business contract review",
        parts: ["brief", "proof"] as const,
        expected: { proof: "contract_review_support" },
      },
      {
        name: "reviewgrid",
        cue: "small-business contract review",
        parts: ["review", "grid"] as const,
        expected: { grid: "contract_review_structure" },
      },
      {
        name: "scopelens",
        cue: "small-business contract review",
        parts: ["scope", "lens"] as const,
        expected: {
          scope: "contract_review_structure",
          lens: "contract_review_view",
        },
      },
      {
        name: "viewsignal",
        cue: "small-business contract review",
        parts: ["view", "signal"] as const,
        expected: {
          view: "contract_review_view",
          signal: "contract_review_attention",
        },
      },
      {
        name: "markupfineprint",
        cue: "small-business contract review",
        parts: ["markup", "fineprint"] as const,
        expected: {
          markup: "contract_review_markup",
          fineprint: "contract_review_fineprint",
        },
      },
      {
        name: "scantrail",
        cue: "small-business contract review",
        parts: ["scan", "trail"] as const,
        expected: {
          scan: "contract_review_check",
          trail: "contract_review_history",
        },
      },
      {
        name: "stipulate",
        cue: "small-business contract review",
        expected: { stipulate: "contract_review_condition" },
      },
      {
        name: "amend",
        cue: "small-business contract review",
        expected: { amend: "contract_review_revision" },
      },
      {
        name: "redraft",
        cue: "small-business contract review",
        expected: { redraft: "contract_review_revision" },
      },
      {
        name: "addendum",
        cue: "small-business contract review",
        expected: { addendum: "contract_review_revision" },
      },
      {
        name: "provision",
        cue: "small-business contract review",
        expected: { provision: "contract_review_clause_language" },
      },
      {
        name: "whereas",
        cue: "small-business contract review",
        expected: { whereas: "contract_review_preamble" },
      },
      {
        name: "recital",
        cue: "small-business contract review",
        expected: { recital: "contract_review_clause_language" },
      },
      {
        name: "annex",
        cue: "small-business contract review",
        expected: { annex: "contract_review_annex" },
      },
      {
        name: "closeread",
        cue: "small-business contract review",
        parts: ["close", "read"] as const,
        expected: {
          close: "contract_review_reading",
          read: "contract_review_reading",
        },
      },
      {
        name: "secondread",
        cue: "small-business contract review",
        parts: ["second", "read"] as const,
        expected: {
          second: "contract_review_reading",
          read: "contract_review_reading",
        },
      },
      {
        name: "redlineroom",
        cue: "small-business contract review",
        parts: ["redline", "room"] as const,
        expected: { room: "contract_review_workspace" },
      },
      {
        name: "marginnote",
        cue: "small-business contract review",
        parts: ["margin", "note"] as const,
        expected: {
          margin: "contract_review_annotation",
          note: "contract_review_annotation",
        },
      },
      {
        name: "risknote",
        cue: "small-business contract review",
        parts: ["risk", "note"] as const,
        expected: {
          risk: "contract_review_attention",
          note: "contract_review_annotation",
        },
      },
      {
        name: "termsdesk",
        cue: "small-business contract review",
        parts: ["terms", "desk"] as const,
        expected: { desk: "contract_review_workspace" },
      },
      {
        name: "routeremote",
        cue: "rural telehealth reach",
        parts: ["route", "remote"] as const,
        expected: {
          route: "rural_telehealth_distance",
          remote: "rural_telehealth_distance",
        },
      },
      {
        name: "signalwave",
        cue: "rural telehealth reach",
        parts: ["signal", "wave"] as const,
        expected: {
          signal: "rural_telehealth_connection",
          wave: "rural_telehealth_connection",
        },
      },
      {
        name: "channelrelay",
        cue: "rural telehealth reach",
        parts: ["channel", "relay"] as const,
        expected: {
          channel: "rural_telehealth_connection",
          relay: "rural_telehealth_connection",
        },
      },
      {
        name: "beaconoutpost",
        cue: "rural telehealth reach",
        parts: ["beacon", "outpost"] as const,
        expected: {
          beacon: "rural_telehealth_beacon",
          outpost: "rural_telehealth_distance",
        },
      },
      {
        name: "conduitnode",
        cue: "rural telehealth reach",
        parts: ["conduit", "node"] as const,
        expected: {
          conduit: "rural_telehealth_connection",
          node: "rural_telehealth_connection",
        },
      },
      {
        name: "vitalspan",
        cue: "rural telehealth reach",
        parts: ["vital", "span"] as const,
        expected: { span: "rural_telehealth_distance" },
      },
      {
        name: "vitalbridge",
        cue: "rural telehealth reach",
        parts: ["vital", "bridge"] as const,
        expected: { bridge: "rural_telehealth_connection" },
      },
      {
        name: "clinicmesh",
        cue: "rural telehealth reach",
        parts: ["clinic", "mesh"] as const,
        expected: { mesh: "rural_telehealth_connection" },
      },
      {
        name: "healthpost",
        cue: "rural telehealth reach",
        parts: ["health", "post"] as const,
        expected: { post: "rural_telehealth_distance" },
      },
      {
        name: "benchmark",
        cue: "clear mortgage comparison",
        expected: { benchmark: "mortgage_comparison_reference" },
      },
      {
        name: "yardstick",
        cue: "clear mortgage comparison",
        expected: { yardstick: "mortgage_comparison_reference" },
      },
      {
        name: "gridscope",
        cue: "clear mortgage comparison",
        parts: ["grid", "scope"] as const,
        expected: {
          grid: "mortgage_comparison_structure",
          scope: "mortgage_comparison_structure",
        },
      },
      {
        name: "compassatlas",
        cue: "clear mortgage comparison",
        parts: ["compass", "atlas"] as const,
        expected: {
          compass: "mortgage_comparison_navigation",
          atlas: "mortgage_comparison_navigation",
        },
      },
      {
        name: "mapkey",
        cue: "clear mortgage comparison",
        parts: ["map", "key"] as const,
        expected: {
          map: "mortgage_comparison_navigation",
          key: "mortgage_comparison_factor",
        },
      },
      {
        name: "loanmatch",
        cue: "clear mortgage comparison",
        parts: ["loan", "match"] as const,
        expected: {
          loan: "mortgage_loan_subject",
          match: "mortgage_offer_comparison",
        },
      },
      {
        name: "viewlens",
        cue: "clear mortgage comparison",
        parts: ["view", "lens"] as const,
        expected: {
          view: "mortgage_comparison_view",
          lens: "mortgage_comparison_view",
        },
      },
      {
        name: "equatecollate",
        cue: "clear mortgage comparison",
        parts: ["equate", "collate"] as const,
        expected: {
          equate: "mortgage_comparison_reference",
          collate: "mortgage_comparison_structure",
        },
      },
      {
        name: "paritypayment",
        cue: "clear mortgage comparison",
        parts: ["parity", "payment"] as const,
        expected: {
          parity: "mortgage_comparison_reference",
          payment: "mortgage_payment_terms",
        },
      },
      {
        name: "termapr",
        cue: "clear mortgage comparison",
        parts: ["term", "apr"] as const,
        expected: {
          term: "mortgage_payment_terms",
          apr: "mortgage_payment_terms",
        },
      },
      {
        name: "calibrate",
        cue: "clear mortgage comparison",
        expected: { calibrate: "mortgage_comparison_reference" },
      },
      {
        name: "navigate",
        cue: "clear mortgage comparison",
        expected: { navigate: "mortgage_comparison_navigation" },
      },
      {
        name: "aprcheck",
        cue: "clear mortgage comparison",
        parts: ["apr", "check"] as const,
        expected: {
          apr: "mortgage_payment_terms",
          check: "mortgage_detail_check",
        },
      },
      {
        name: "offerboard",
        cue: "clear mortgage comparison",
        parts: ["offer", "board"] as const,
        expected: {
          offer: "mortgage_offer_subject",
          board: "mortgage_comparison_structure",
        },
      },
      {
        name: "termsift",
        cue: "clear mortgage comparison",
        parts: ["term", "sift"] as const,
        expected: {
          term: "mortgage_payment_terms",
          sift: "mortgage_term_sift",
        },
      },
      {
        name: "paymentrange",
        cue: "clear mortgage comparison",
        parts: ["payment", "range"] as const,
        expected: {
          payment: "mortgage_payment_terms",
          range: "mortgage_comparison_structure",
        },
      },
      {
        name: "borrowbrief",
        cue: "clear mortgage comparison",
        parts: ["borrow", "brief"] as const,
        expected: {
          borrow: "mortgage_loan_subject",
          brief: "mortgage_borrowing_summary",
        },
      },
      {
        name: "termguide",
        cue: "clear mortgage comparison",
        parts: ["term", "guide"] as const,
        expected: {
          term: "mortgage_payment_terms",
          guide: "mortgage_comparison_navigation",
        },
      },
    ] as const
    const requestedSurfaces = {
      "european retail privacy compliance": [
        "data", "ledger", "erasure", "portability", "key", "seal", "custody", "policy",
        "desk", "basis", "log", "notice", "trace",
      ],
      "freelancer accounting": [
        "balance", "daybook", "own", "tabulate", "reckoner", "accrue", "figure", "cash", "filing", "invoice",
        "billable", "setaside", "lineitem",
      ],
      "small-business contract review": [
        "audit", "trace", "proof", "grid", "scope", "lens", "view", "signal", "markup", "fineprint", "scan", "trail",
        "stipulate", "amend", "redraft", "addendum", "provision", "whereas", "recital", "annex",
        "close", "read", "second", "room", "margin", "note", "risk", "desk",
      ],
      "rural telehealth reach": [
        "route", "remote", "signal", "wave", "channel", "relay", "beacon", "outpost", "conduit", "node",
        "span", "bridge", "mesh", "post",
      ],
      "clear mortgage comparison": [
        "benchmark", "yardstick", "grid", "scope", "compass", "atlas", "map", "key", "match",
        "loan", "view", "lens", "equate", "collate", "parity", "payment", "term", "apr",
        "calibrate", "navigate", "check", "offer", "board", "sift", "range", "borrow", "brief", "guide",
      ],
    } as const
    const foreignCopyByCue = {
      "european retail privacy compliance": /visibility, evidence|financial order|software execution|self-directed custody/i,
      "freelancer accounting": /open, measured tone|timing, sequence|self-directed custody|musical presence|independent roaming/i,
      "small-business contract review": /carbon measurement|systems and modern infrastructure|visibility, evidence|bearings, a useful point of view/i,
      "rural telehealth reach": /routing and operational flow|visibility, evidence|remote team|carries sound outward|immediate occasion/i,
      "clear mortgage comparison": /repeatable inspection|systems and modern infrastructure|independent roaming|places and traditions|self-directed custody|qualified people/i,
    } as const
    const covered = new Map<string, Set<string>>()
    const promiseCopy = /guarantee|ensures? compliance|legally safe|cures?|treats?|prevents?|health outcome|eligib(?:le|ility)|approved|best rates?|lowest rates?/i

    for (const testCase of cases) {
      const plan = "parts" in testCase
        ? buildQuickRationalePlan({
            name: testCase.name,
            style: "compound",
            tone: "clean",
            conceptCue: testCase.cue,
            constructionParts: testCase.parts,
            relevance: "category_evidence",
          })
        : buildQuickRationalePlan({
            name: testCase.name,
            style: "real_word",
            tone: "clean",
            conceptCue: testCase.cue,
            evidence: {
              kind: "semantic_word",
              cue: testCase.cue,
              source: testCase.name,
            },
            relevance: "category_evidence",
          })
      const rendered = renderRationaleV2(plan)
      const evidenceBySurface = new Map(plan.evidence.map((part) => [part.surface, part.associationId]))

      expect(validateRationalePlan(plan), testCase.name).toMatchObject({ ok: true })
      expect(rendered.fallback, testCase.name).toBe(false)
      expect(rendered.text, testCase.name).not.toMatch(foreignCopyByCue[testCase.cue])
      expect(rendered.text, testCase.name).not.toMatch(promiseCopy)
      for (const [surface, associationId] of Object.entries(testCase.expected)) {
        expect(evidenceBySurface.get(surface), `${testCase.name}:${surface}`).toBe(associationId)
        const probePlan = surface.length >= 4
          ? buildQuickRationalePlan({
              name: surface,
              style: "real_word",
              tone: "clean",
              conceptCue: testCase.cue,
              evidence: { kind: "semantic_word", cue: testCase.cue, source: surface },
              relevance: "category_evidence",
            })
          : buildQuickRationalePlan({
              name: `${surface}zz`,
              style: "compound",
              tone: "clean",
              conceptCue: testCase.cue,
              constructionParts: [surface, "zz"],
              relevance: "category_evidence",
            })
        const probeRendered = renderRationaleV2(probePlan)
        const association = QUICK_RATIONALE_ASSOCIATIONS[
          associationId as keyof typeof QUICK_RATIONALE_ASSOCIATIONS
        ].association
        expect(validateRationalePlan(probePlan), `${testCase.name}:${surface} probe`).toMatchObject({ ok: true })
        expect(probeRendered.text, `${testCase.name}:${surface} probe`).toContain(association)
        expect(probeRendered.text, `${testCase.name}:${surface} probe`).not.toMatch(promiseCopy)
        const cueCoverage = covered.get(testCase.cue) || new Set<string>()
        cueCoverage.add(surface)
        covered.set(testCase.cue, cueCoverage)
      }

      const forgedContext = validateRationalePlan({
        ...plan,
        conceptId: "cue:climate startup marketing",
      })
      expect(forgedContext, `${testCase.name} forged context`).toMatchObject({ ok: false })
      if (!forgedContext.ok) {
        expect(
          forgedContext.issues.some(({ code }) => code === "association_concept_mismatch"),
          testCase.name,
        ).toBe(true)
      }
    }

    for (const [cue, surfaces] of Object.entries(requestedSurfaces)) {
      expect(Array.from(covered.get(cue) || []).sort(), cue).toEqual([...surfaces].sort())
    }
  })

  it("renders every final deterministic core with honest category evidence", () => {
    const groups = [
      {
        id: "privacy",
        cue: "european retail privacy compliance",
        specs: [
          "discretion", "restraint", "boundary", "custodian", "anonymity", "privity",
          "confidant", "circumspect", "confide", "fiduciary", "data+seal", "consent+pact",
          "data+dignity", "notice+trace", "due+care", "clear+privacy",
        ],
      },
      {
        id: "accounting",
        cue: "freelancer accounting",
        specs: [
          "reckoner", "accrue", "abacus", "orderly", "reckoning", "provision", "numerate",
          "tallier", "headroom", "wherewithal", "ledger+loom", "tax+compass", "solo+tally",
          "remit+folio", "own+ledger", "steady+books",
        ],
      },
      {
        id: "contract",
        cue: "small-business contract review",
        specs: [
          "redline", "proviso", "covenant", "stipulate", "whereas", "legible", "plainspoken",
          "caveat", "verbatim", "preamble", "terms+pact", "risk+note", "draft+delta",
          "clause+light", "plain+terms", "second+read",
        ],
      },
      {
        id: "rural",
        cue: "rural telehealth reach",
        specs: [
          "relay", "outpost", "crossing", "proximity", "nearness", "vicinity", "presence",
          "adjacency", "rendezvous", "linkage", "vital+reach", "care+beacon", "rural+beacon",
          "clinic+mesh", "near+pulse", "wider+reach",
        ],
      },
      {
        id: "climate",
        cue: "climate startup marketing",
        specs: [
          "credence", "narrate", "cohere", "reframe", "clarion", "herald", "salience", "cogent",
          "resound", "verity", "carbon+voice", "story+signal", "demand+craft", "market+shift",
          "credible+story", "honest+voice",
        ],
      },
      {
        id: "mortgage",
        cue: "clear mortgage comparison",
        specs: [
          "equate", "parity", "calibrate", "bearings", "benchmark", "yardstick", "landmark",
          "headway", "navigate", "discern", "loan+lens", "term+sift", "cost+scope",
          "buyer+compass", "first+buyer", "guided+choice",
        ],
      },
    ] as const
    const foreignCopyByCue = {
      "european retail privacy compliance": /bookkeeping|contract wording|rural patients|climate-technology|mortgage|borrowing options/i,
      "freelancer accounting": /personal information|contract wording|rural patients|climate-technology|mortgage options/i,
      "small-business contract review": /personal information|bookkeeping|rural patients|climate-technology|mortgage options/i,
      "rural telehealth reach": /personal information|bookkeeping|contract wording|climate-technology|mortgage options/i,
      "climate startup marketing": /personal information|bookkeeping|contract wording|rural patients|mortgage options|learning, mentorship|carries sound outward/i,
      "clear mortgage comparison": /personal information|bookkeeping|contract wording|rural patients|climate-technology|independent roaming|places and traditions/i,
    } as const
    let audited = 0

    for (const group of groups) {
      expect(group.specs, group.id).toHaveLength(16)
      for (const spec of group.specs) {
        const parts = spec.split("+")
        const name = parts.join("")
        const plan = parts.length === 2
          ? buildQuickRationalePlan({
              name,
              style: "compound",
              tone: "clean",
              conceptCue: group.cue,
              constructionParts: parts as [string, string],
              relevance: "category_evidence",
            })
          : buildQuickRationalePlan({
              name,
              style: "real_word",
              tone: "clean",
              conceptCue: group.cue,
              evidence: { kind: "semantic_word", cue: group.cue, source: name },
              relevance: "category_evidence",
            })
        const rendered = renderRationaleV2(plan)

        expect(validateRationalePlan(plan), `${group.id}:${name}`).toMatchObject({ ok: true })
        expect(rendered.fallback, `${group.id}:${name}`).toBe(false)
        expect(rendered.text, `${group.id}:${name}`).not.toMatch(foreignCopyByCue[group.cue])
        expect(containsDeniedRationaleClaim(rendered.text), `${group.id}:${name}`).toBe(false)
        expect(
          plan.evidence.every(({ associationId }) => !associationId.startsWith("generic_")),
          `${group.id}:${name} generic evidence`,
        ).toBe(true)
        for (const evidence of plan.evidence) {
          const association = QUICK_RATIONALE_ASSOCIATIONS[evidence.associationId].association
          expect(rendered.text, `${group.id}:${name}:${evidence.surface}`).toContain(association)
        }
        expect(rendered.text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0, name).toBeLessThanOrEqual(65)
        audited += 1
      }
    }

    expect(audited).toBe(96)
  })

  it("renders remitfolio and taxthread as honest freelancer-accounting compounds", () => {
    const cases = [
      {
        name: "remitfolio",
        parts: ["remit", "folio"] as const,
        associationIds: ["freelancer_accounting_remittance", "freelancer_accounting_folio"],
      },
      {
        name: "taxthread",
        parts: ["tax", "thread"] as const,
        associationIds: ["freelancer_accounting_tax", "craft"],
      },
    ] as const
    const foreignCopy = /personal information|contract wording|rural patients|climate-technology|mortgage options|independent roaming|software execution/i

    for (const testCase of cases) {
      const plan = buildQuickRationalePlan({
        name: testCase.name,
        style: "compound",
        tone: "clean",
        conceptCue: "freelancer accounting",
        constructionParts: testCase.parts,
        relevance: "category_evidence",
      })
      const rendered = renderRationaleV2(plan)

      expect(validateRationalePlan(plan), testCase.name).toMatchObject({ ok: true })
      expect(plan.evidence.map(({ associationId }) => associationId), testCase.name).toEqual(testCase.associationIds)
      expect(rendered.fallback, testCase.name).toBe(false)
      for (const evidence of plan.evidence) {
        expect(rendered.text, `${testCase.name}:${evidence.surface}`).toContain(
          QUICK_RATIONALE_ASSOCIATIONS[evidence.associationId].association,
        )
      }
      expect(rendered.text, testCase.name).not.toMatch(foreignCopy)
      expect(containsDeniedRationaleClaim(rendered.text), testCase.name).toBe(false)
      expect(
        rendered.text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0,
        testCase.name,
      ).toBeLessThanOrEqual(65)
    }
  })

  it("renders six accounting semantic surfaces with exact bookkeeping meanings", () => {
    const cases = [
      { name: "sundry", associationId: "freelancer_accounting_sundry_entries" },
      { name: "footing", associationId: "freelancer_accounting_footing_total" },
      { name: "netting", associationId: "freelancer_accounting_netting" },
      { name: "carryover", associationId: "freelancer_accounting_carryover" },
      { name: "outlay", associationId: "freelancer_accounting_outlay" },
      { name: "turnover", associationId: "freelancer_accounting_turnover" },
    ] as const
    const foreignCopy = /personal information|contract wording|rural patients|climate-technology|mortgage options|independent roaming|software execution/i

    for (const testCase of cases) {
      const plan = buildQuickRationalePlan({
        name: testCase.name,
        style: "real_word",
        tone: "clean",
        conceptCue: "freelancer accounting",
        evidence: { kind: "semantic_word", cue: "freelancer accounting", source: testCase.name },
        relevance: "category_evidence",
      })
      const rendered = renderRationaleV2(plan)

      expect(validateRationalePlan(plan), testCase.name).toMatchObject({ ok: true })
      expect(plan.evidence[0]?.associationId, testCase.name).toBe(testCase.associationId)
      expect(plan.evidence[0]?.associationId.startsWith("generic_"), testCase.name).toBe(false)
      expect(rendered.fallback, testCase.name).toBe(false)
      expect(rendered.text, testCase.name).toContain(
        QUICK_RATIONALE_ASSOCIATIONS[testCase.associationId].association,
      )
      expect(rendered.text, testCase.name).not.toMatch(foreignCopy)
      expect(containsDeniedRationaleClaim(rendered.text), testCase.name).toBe(false)
      expect(
        rendered.text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0,
        testCase.name,
      ).toBeLessThanOrEqual(65)

      const forgedContext = validateRationalePlan({
        ...plan,
        conceptId: "cue:climate startup marketing",
      })
      expect(forgedContext, `${testCase.name} forged context`).toMatchObject({ ok: false })
      if (!forgedContext.ok) {
        expect(forgedContext.issues.some(({ code }) => code === "association_concept_mismatch")).toBe(true)
      }
    }
  })

  it("preserves every requested surface's ordinary meaning outside its exact scoped cue", () => {
    const ordinaryAssociations = {
      data: "insight",
      ledger: "finance",
      consent: "consent_boundary",
      pact: "generic_literal",
      redaction: "consent_boundary",
      retail: "privacy_retail",
      euro: "privacy_retail",
      dignity: "generic_literal",
      quiet: "quiet_serenity",
      discretion: "consent_boundary",
      erasure: "generic_literal",
      portability: "generic_literal",
      key: "custody_keys",
      seal: "generic_literal",
      custody: "generic_literal",
      policy: "generic_literal",
      desk: "generic_literal",
      basis: "generic_literal",
      log: "software_runtime",
      notice: "generic_literal",
      balance: "wellbeing",
      daybook: "time_order",
      own: "custody_keys",
      tabulate: "generic_literal",
      reckoner: "generic_literal",
      accrue: "generic_literal",
      tally: "financial_records",
      books: "finance",
      sole: "generic_literal",
      folio: "generic_literal",
      receivable: "generic_literal",
      remit: "generic_literal",
      way: "generic_literal",
      sundry: "generic_literal",
      footing: "generic_literal",
      netting: "generic_literal",
      carryover: "generic_literal",
      outlay: "generic_literal",
      turnover: "generic_literal",
      figure: "generic_literal",
      cash: "generic_literal",
      filing: "financial_records",
      invoice: "freelance_admin",
      billable: "generic_literal",
      setaside: "generic_literal",
      lineitem: "generic_literal",
      audit: "carbon_audit",
      trace: "insight",
      proof: "insight",
      redline: "contract_language",
      proviso: "contract_language",
      terms: "review_parts",
      covenant: "contract_language",
      accord: "contract_language",
      plain: "simplicity",
      draft: "generic_literal",
      delta: "generic_literal",
      clause: "review_parts",
      flag: "generic_literal",
      version: "generic_literal",
      pair: "generic_literal",
      grid: "technology",
      scope: "insight",
      lens: "comparison_bearings",
      view: "comparison_bearings",
      signal: "insight",
      markup: "generic_literal",
      fineprint: "contract_language",
      scan: "generic_literal",
      trail: "guidance",
      stipulate: "generic_literal",
      amend: "generic_literal",
      redraft: "generic_literal",
      addendum: "generic_literal",
      provision: "financial_buffer",
      whereas: "generic_literal",
      recital: "generic_literal",
      annex: "generic_literal",
      close: "generic_literal",
      read: "generic_literal",
      second: "generic_literal",
      room: "room_atmosphere",
      margin: "financial_buffer",
      note: "generic_literal",
      risk: "generic_literal",
      route: "movement",
      remote: "onboarding_team",
      wave: "echoing_sound",
      channel: "generic_literal",
      relay: "generic_literal",
      beacon: "generic_literal",
      outpost: "generic_literal",
      conduit: "infrastructure_link",
      node: "infrastructure_link",
      span: "generic_literal",
      bridge: "cultural_bridge",
      mesh: "generic_literal",
      post: "generic_literal",
      benchmark: "quality_measure",
      yardstick: "generic_literal",
      compass: "independent_roaming",
      atlas: "guiding_atlas",
      map: "generic_literal",
      match: "recruitment_match",
      loan: "finance",
      equate: "generic_literal",
      collate: "generic_literal",
      parity: "generic_literal",
      payment: "generic_literal",
      term: "generic_literal",
      apr: "generic_literal",
      calibrate: "generic_literal",
      navigate: "generic_literal",
      check: "generic_literal",
      offer: "generic_literal",
      board: "generic_literal",
      sift: "generic_literal",
      range: "generic_literal",
      borrow: "generic_literal",
      brief: "review_parts",
      guide: "guidance",
      cost: "generic_literal",
      buyer: "home_purchase",
    } as const

    for (const [surface, associationId] of Object.entries(ordinaryAssociations)) {
      expect(resolveRationaleAssociationId(surface), surface).toBe(associationId)
    }

    const contextualCases = [
      {
        name: "datasignal",
        cue: "developer observability",
        parts: ["data", "signal"] as const,
        expected: { data: "insight", signal: "insight" },
      },
      {
        name: "guardledger",
        cue: "developer observability",
        parts: ["guard", "ledger"] as const,
        expected: { ledger: "finance" },
      },
      {
        name: "balance",
        cue: "open, respectful wellbeing",
        expected: { balance: "wellbeing" },
      },
      {
        name: "daybook",
        cue: "founder scheduling assistance",
        expected: { daybook: "time_order" },
      },
      {
        name: "ownkey",
        cue: "beginner self-custody",
        parts: ["own", "key"] as const,
        expected: { own: "custody_keys", key: "custody_keys" },
      },
      {
        name: "clauseaudit",
        cue: "manufacturer carbon accounting",
        parts: ["clause", "audit"] as const,
        expected: { audit: "carbon_audit" },
      },
      {
        name: "reviewgrid",
        cue: "developer observability",
        parts: ["review", "grid"] as const,
        expected: { grid: "technology" },
      },
      {
        name: "clinicroute",
        cue: "reliable movement",
        parts: ["clinic", "route"] as const,
        expected: { route: "movement" },
      },
      {
        name: "vitalsignal",
        cue: "developer observability",
        parts: ["vital", "signal"] as const,
        expected: { signal: "insight" },
      },
      {
        name: "remoteteam",
        cue: "distributed employee onboarding",
        parts: ["remote", "team"] as const,
        expected: { remote: "onboarding_team", team: "community" },
      },
      {
        name: "benchmark",
        cue: "factory visual inspection",
        expected: { benchmark: "quality_measure" },
      },
      {
        name: "termcompass",
        cue: "solo women group travel",
        parts: ["term", "compass"] as const,
        expected: { compass: "independent_roaming" },
      },
      {
        name: "choiceatlas",
        cue: "multicultural wedding planning",
        parts: ["choice", "atlas"] as const,
        expected: { atlas: "guiding_atlas" },
      },
      {
        name: "choicekey",
        cue: "beginner self-custody",
        parts: ["choice", "key"] as const,
        expected: { key: "custody_keys" },
      },
      {
        name: "loanmatch",
        cue: "ethical nurse recruitment",
        parts: ["loan", "match"] as const,
        expected: { loan: "finance", match: "recruitment_match" },
      },
    ] as const

    for (const testCase of contextualCases) {
      const plan = "parts" in testCase
        ? buildQuickRationalePlan({
            name: testCase.name,
            style: "compound",
            tone: "clean",
            conceptCue: testCase.cue,
            constructionParts: testCase.parts,
            relevance: "category_evidence",
          })
        : buildQuickRationalePlan({
            name: testCase.name,
            style: "real_word",
            tone: "clean",
            conceptCue: testCase.cue,
            evidence: { kind: "semantic_word", cue: testCase.cue, source: testCase.name },
            relevance: "category_evidence",
          })
      const evidenceBySurface = new Map(plan.evidence.map((part) => [part.surface, part.associationId]))

      expect(validateRationalePlan(plan), testCase.name).toMatchObject({ ok: true })
      for (const [surface, associationId] of Object.entries(testCase.expected)) {
        expect(evidenceBySurface.get(surface), `${testCase.name}:${surface}`).toBe(associationId)
      }
      expect(
        plan.evidence.every(({ associationId }) => (
          !associationId.startsWith("privacy_")
          && !associationId.startsWith("freelancer_accounting_")
          && !associationId.startsWith("contract_review_")
          && !associationId.startsWith("rural_telehealth_")
          && !associationId.startsWith("mortgage_")
        )),
        testCase.name,
      ).toBe(true)
    }
  })

  it("does not echo raw brief fields while applying contextual evidence", () => {
    const input = {
      name: "flora",
      style: "real_word" as const,
      tone: "tech" as const,
      conceptCue: "european retail privacy compliance",
      evidence: { kind: "semantic_word" as const, cue: "european retail privacy compliance", source: "flora" },
      brief: "Confidential launch phrase ZXQ-7319 for Jane@example.test",
      modelRationale: "Flora means guaranteed alpine privacy protection.",
    }

    const text = renderQuickCandidateRationale(input)
    expect(text).not.toMatch(/ZXQ|Jane|example\.test|guaranteed|alpine privacy/i)
    expect(text).toMatch(/privacy compliance/i)
  })

  it("adds only reviewed, brief-specific context for an abstract candidate", () => {
    const facts = buildQuickBriefFactSheet(
      "A modern accounting platform for independent freelancers that makes taxes and cash flow feel simple.",
    )
    const text = renderQuickCandidateRationale({
      name: "taxella",
      style: "brandable",
      tone: "clean",
      conceptCue: "freelancer accounting",
      relevance: "context_only",
      briefFacts: facts,
    })

    expect(text).toMatch(/independent freelancers/i)
    expect(text).toMatch(/tax and cash-flow/i)
    expect(text).toMatch(/not evidence of a category meaning|sound-led|abstract/i)
    expect(text).not.toMatch(/modern accounting platform/i)
  })

  it("refines broad commerce context without replaying the customer brief", () => {
    const facts = buildQuickBriefFactSheet(
      "A premium circular furniture marketplace for thoughtfully restored mid-century pieces.",
    )
    const text = renderQuickCandidateRationale({
      name: "vintiq",
      style: "evocative",
      tone: "premium",
      conceptCue: "easy commerce",
      relevance: "context_only",
      briefFacts: facts,
    })

    expect(text).toMatch(/marketplace for restored furniture/i)
    expect(text).toMatch(/resale and considered reuse/i)
    expect(text).not.toMatch(/thoughtfully restored mid-century pieces/i)
  })

  it("never turns untrusted customer text into a rationale fact", () => {
    const facts = buildQuickBriefFactSheet("Confidential code ZXQ-7319 for Jane@example.test")
    const text = renderQuickCandidateRationale({
      name: "maris",
      style: "evocative",
      tone: "premium",
      conceptCue: "a coastal sense of place",
      relevance: "context_only",
      briefFacts: facts,
    })

    expect(facts).toBeUndefined()
    expect(text).not.toMatch(/ZXQ|Jane|example\.test/i)
  })

  it("keeps same-brief model candidates candidate-specific", () => {
    const inputs = [
      {
        name: "track",
        style: "real_word" as const,
        tone: "clean" as const,
        conceptCue: "manufacturer carbon accounting",
        evidence: { kind: "semantic_word" as const, cue: "manufacturer carbon accounting", source: "track" },
      },
      {
        name: "inventory",
        style: "real_word" as const,
        tone: "clean" as const,
        conceptCue: "manufacturer carbon accounting",
        evidence: { kind: "semantic_word" as const, cue: "manufacturer carbon accounting", source: "inventory" },
      },
    ]
    const rendered = inputs.map((input) => renderRationaleV2(buildQuickRationalePlan(input)))

    expect(rendered.every((item) => !item.fallback)).toBe(true)
    expect(new Set(rendered.map((item) => item.frames[0])).size).toBe(2)
    expect(rendered[0].frames[0]).toMatch(/path|recorded sequence|followed over time/i)
    expect(rendered[1].frames[0]).toMatch(/measurement|reduction|traceable environmental records/i)
    expect(rendered[0].frames[0]).not.toContain(rendered[1].frames[0])
    expect(rendered[1].frames[0]).not.toContain(rendered[0].frames[0])
  })

  it("keeps unknown abstract names phonetic and positional without inventing meaning", () => {
    const plan = buildQuickRationalePlan({
      name: "alpenza",
      style: "evocative",
      tone: "premium",
      conceptCue: "alpine botanical skincare",
      relevance: "category_evidence",
    })
    const rendered = renderRationaleV2(plan)

    expect(plan.construction).toEqual({ kind: "abstract" })
    expect(plan.evidence).toEqual([])
    expect(plan.relevance).toBe("context_only")
    expect(rendered.fallback).toBe(false)
    expect(rendered.text).toMatch(/sound-led|abstract/i)
    expect(rendered.text).toMatch(/pronunciation|phonetic|cadence|rhythm/i)
    expect(rendered.text).toMatch(/alpine botanical skincare/i)
    expect(rendered.text).toMatch(/not (?:as )?evidence of a category meaning/i)
    expect(rendered.text).not.toMatch(/\bmeans?\b|translat|etymolog|derived from|draws on|comes from|rooted in|\b(?:latin|greek|french|italian)\b/i)

    const forged = { ...plan, relevance: "category_evidence" }
    const validation = validateRationalePlan(forged)
    expect(validation).toMatchObject({ ok: false })
    if (!validation.ok) {
      expect(validation.issues).toContainEqual({ code: "invalid_relevance", path: "plan.relevance" })
    }
    expect(renderRationaleV2(forged).fallback).toBe(true)
  })

  it("uses exact reviewed locale forms and fails closed for unregistered ones", () => {
    const reviewed = buildQuickRationalePlan({
      name: "liensante",
      style: "non_english",
      tone: "friendly",
      conceptCue: "rural Quebec healthcare access",
    })
    const unregistered = buildQuickRationalePlan({
      name: "sylfa",
      style: "non_english",
      tone: "friendly",
      conceptCue: "Welsh farm-to-school trade",
    })

    expect(renderRationaleV2(reviewed)).toMatchObject({ fallback: false })
    expect(reviewed.construction).toMatchObject({ kind: "locale_form", localeId: "fr-CA" })
    expect(unregistered.construction).toEqual({ kind: "abstract" })
    expect(renderRationaleV2(unregistered)).toMatchObject({ fallback: false })
    expect(renderRationaleV2(unregistered).text).toMatch(/evidence of a category meaning/i)
    expect(renderRationaleV2(unregistered).text).not.toMatch(/translation|translates|exact reviewed form|means (?:as|to)/i)
  })

  it("renders every current reviewed locale form as a visible construction", () => {
    const frenchForms = [
      "soinproche", "proxisante", "santevillage", "soinvillage", "liensante", "santefamille",
      "accesrural", "santeproche",
    ] as const
    const welshForms = [
      "marchnadleol", "cynhyrchulleol", "ffermcymru", "ffermwyrcymru", "bwydlleol",
      "ffermleol", "bwydcymru", "ysgolfferm", "cnwdcymru", "cynhaeaf",
    ] as const
    const plans = [
      ...frenchForms.map((name) => buildQuickRationalePlan({
        name,
        style: "non_english",
        tone: "friendly",
        conceptCue: "rural Quebec healthcare access",
      })),
      ...welshForms.map((name) => buildQuickRationalePlan({
        name,
        style: "non_english",
        tone: "playful",
        conceptCue: "Welsh farm-to-school trade",
      })),
    ]

    for (const plan of plans) {
      const rendered = renderRationaleV2(plan)
      expect(rendered.fallback, plan.name).toBe(false)
      expect(rendered.text, plan.name).toMatch(/reviewed French \(Quebec\) construction|reviewed Welsh (?:construction|form)/i)
      expect(rendered.text, plan.name).not.toMatch(/translation|translates|means (?:as|to)/i)
      expect(plan.construction, plan.name).toMatchObject({ kind: "locale_form", formId: plan.name })
    }

    expect(Object.keys(QUICK_RATIONALE_LOCALES["fr-CA"].forms).sort()).toEqual(
      [...(getQuickLocalePolicy("plateforme de sante pour familles rurales au Quebec")?.forms || [])].sort(),
    )
    expect(Object.keys(QUICK_RATIONALE_LOCALES.cy.forms).sort()).toEqual(
      [...(getQuickLocalePolicy("Welsh language marketplace connecting family farms with local schools")?.forms || [])].sort(),
    )
  })

  it("never accepts or echoes raw prompt and model-rationale fields", () => {
    const input = {
      name: "mosaic",
      style: "evocative" as const,
      tone: "premium" as const,
      conceptCue: "creative discovery",
      brief: "contact jane@example.test with secret ZXQ-7319",
      rationale: "Mosaic guarantees a trademark and means success in Welsh.",
    }
    const text = renderQuickCandidateRationale(input)

    expect(text).not.toMatch(/jane|example\.test|ZXQ|guarantee|trademark|means success|Welsh/i)
    expect(text).toMatch(/Mosaic/)
  })
})
