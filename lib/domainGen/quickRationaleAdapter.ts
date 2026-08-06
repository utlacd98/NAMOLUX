import type { NameStyle } from "./generatedName"
import {
  QUICK_RATIONALE_ASSOCIATIONS,
  QUICK_RATIONALE_LOCALES,
  QUICK_RATIONALE_VERSION,
  renderRationaleV2,
  resolveRationaleConceptId,
  type EvidencePart,
  type EvidenceProvenance,
  type RationaleAssociationId,
  type RationaleConceptId,
  type RationaleConstruction,
  type RationaleLocaleId,
  type RationalePlan,
  type RationaleRelevance,
  type RationaleTone,
} from "./quickRationale"

export type QuickRationaleEvidence =
  | { kind: "semantic_word"; cue: string; source: string }
  | { kind: "orthographic_fusion"; left: string; right: string; overlap: string }
  | { kind: "reviewed_spelling"; source: string; rule: "ph_to_f" | "terminal_ic_to_ik" }

/**
 * Small, reviewed brief facts that can be used in an explanation without
 * replaying free-form customer text. They refine a broad category cue (for
 * example, "easy commerce") only when the locally checked pattern is present.
 */
export type QuickBriefFactId =
  | "freelancer_accounting"
  | "restored_furniture_marketplace"
  | "premium_skincare"
  | "founder_scheduling"
  | "privacy_saas"
  | "healthcare_access"

export interface QuickBriefFactSheet {
  facts: readonly QuickBriefFactId[]
}

export interface QuickRationaleInput {
  name: string
  style: NameStyle
  tone: RationaleTone
  conceptCue?: string | null
  constructionParts?: readonly string[]
  constructionProvenance?: readonly [EvidenceProvenance, EvidenceProvenance]
  evidence?: QuickRationaleEvidence
  relevance?: RationaleRelevance
  /** Locally derived reviewed facts; never raw customer wording or model prose. */
  briefFacts?: QuickBriefFactSheet
}

function toLabel(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function normaliseBrief(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const BRIEF_FACT_RULES: readonly { id: QuickBriefFactId; test: RegExp }[] = [
  {
    id: "freelancer_accounting",
    test: /(?=.*\b(?:freelancers?|freelance|independent)\b)(?=.*\b(?:accounting|invoice|invoicing|bookkeeping|tax|cash flow)\b)/,
  },
  {
    id: "restored_furniture_marketplace",
    test: /(?=.*\b(?:furniture|mid-century|midcentury|interior)\b)(?=.*\b(?:restored|restoration|circular|resale|marketplace|vintage)\b)/,
  },
  {
    id: "premium_skincare",
    test: /(?=.*\b(?:skin|skincare|beauty|cosmetic)\b)(?=.*\b(?:premium|alpine|botanical|luxury|luxurious)\b)/,
  },
  {
    id: "founder_scheduling",
    test: /(?=.*\b(?:schedule|scheduling|calendar|meeting)\b)(?=.*\b(?:founders?|startup|team|teams)\b)/,
  },
  {
    id: "privacy_saas",
    test: /(?=.*\b(?:privacy|compliance|data protection)\b)(?=.*\b(?:saas|software|platform|retail|business)\b)/,
  },
  {
    id: "healthcare_access",
    test: /(?=.*\b(?:health|healthcare|telehealth|clinic|medical)\b)(?=.*\b(?:access|rural|patient|patients|care)\b)/,
  },
]

/**
 * Extracts only IDs from a short, reviewed taxonomy. The raw brief never
 * becomes rendering data, which keeps explanations useful without exposing
 * personal or confidential wording entered into the form.
 */
export function buildQuickBriefFactSheet(description: string): QuickBriefFactSheet | undefined {
  const text = normaliseBrief(description)
  const facts = BRIEF_FACT_RULES.filter((rule) => rule.test.test(text)).map((rule) => rule.id)
  return facts.length > 0 ? { facts: Array.from(new Set(facts)).slice(0, 2) } : undefined
}

const BRIEF_FACT_COPY: Readonly<Record<QuickBriefFactId, string>> = {
  freelancer_accounting: "The brief is an accounting product for independent freelancers, intended to make tax and cash-flow work feel simpler.",
  restored_furniture_marketplace: "The brief is a marketplace for restored furniture, where resale and considered reuse need to feel credible.",
  premium_skincare: "The brief is premium skincare, where a sensorial but considered impression matters alongside credibility.",
  founder_scheduling: "The brief helps founders and teams make scheduling feel calmer and more decisive.",
  privacy_saas: "The brief is privacy software, where clarity and trust matter more than a clever technical claim.",
  healthcare_access: "The brief concerns healthcare access, where reassurance and comprehension matter before novelty.",
}

function briefFactFrame(factSheet: QuickBriefFactSheet | undefined): string | null {
  const fact = factSheet?.facts.find((id): id is QuickBriefFactId => id in BRIEF_FACT_COPY)
  return fact ? BRIEF_FACT_COPY[fact] : null
}

function specificCueAlreadyCarriesBriefFact(
  conceptId: RationaleConceptId,
  factSheet: QuickBriefFactSheet | undefined,
): boolean {
  // Most brief facts deliberately add an important detail to a broad cue
  // (for example, cash-flow to `freelancer accounting`). Only these two
  // exact supply profiles are already more precise than their matching fact.
  return Boolean(
    (conceptId === "cue:founder scheduling assistance" && factSheet?.facts.includes("founder_scheduling"))
    || (conceptId === "cue:rural telehealth reach" && factSheet?.facts.includes("healthcare_access")),
  )
}

interface ContextualAssociationPolicy {
  associationId: RationaleAssociationId
  allowedConceptIds: readonly RationaleConceptId[]
}

/**
 * Exact concept overrides for surfaces whose ordinary global meaning would
 * misdescribe this naming context. These are registry IDs, not free-form
 * brief-derived copy, and the rationale validator enforces their concept
 * scope independently of this adapter.
 */
const CONTEXTUAL_ASSOCIATION_OVERRIDES: Readonly<Partial<
  Record<RationaleConceptId, Readonly<Record<string, RationaleAssociationId>>>
>> = {
  "cue:climate startup marketing": {
    founder: "climate_marketing_audience",
    eco: "climate_marketing_environment",
    claim: "climate_marketing_evidence",
    proof: "climate_marketing_evidence",
    credence: "climate_marketing_credibility",
    verity: "climate_marketing_credibility",
    credible: "climate_marketing_credibility",
    honest: "climate_marketing_credibility",
    story: "climate_marketing_narrative",
    voice: "climate_marketing_narrative",
    arc: "climate_marketing_narrative",
    narrate: "climate_marketing_narrative",
    brief: "climate_marketing_campaign",
    map: "climate_marketing_campaign",
    ink: "climate_marketing_campaign",
    mark: "climate_marketing_campaign",
    pitch: "climate_marketing_campaign",
    carbon: "climate_marketing_carbon_context",
    impact: "climate_marketing_impact_frame",
    cadence: "climate_marketing_communication_cadence",
    signal: "climate_marketing_market_signal",
    cue: "climate_marketing_market_signal",
    clarion: "climate_marketing_clear_voice",
    salience: "climate_marketing_message_clarity",
    cogent: "climate_marketing_message_clarity",
    cohere: "climate_marketing_message_clarity",
    resound: "climate_marketing_message_delivery",
    convey: "climate_marketing_message_delivery",
    cutthrough: "climate_marketing_distinctiveness",
    demand: "climate_marketing_demand_context",
    craft: "climate_marketing_message_craft",
    market: "climate_marketing_market_context",
    shift: "climate_marketing_market_shift",
    reframe: "climate_marketing_market_shift",
    uptake: "climate_marketing_audience_reception",
    lab: "climate_marketing_message_workshop",
    stance: "climate_marketing_positioning",
    herald: "climate_marketing_announcement",
    spark: "climate_marketing_message_idea",
    echo: "climate_marketing_message_echo",
  },
  "cue:european retail privacy compliance": {
    data: "privacy_customer_data",
    ledger: "privacy_compliance_record",
    erasure: "privacy_erasure_right",
    portability: "privacy_portability_right",
    key: "privacy_access_permission",
    seal: "privacy_boundary_marker",
    boundary: "privacy_boundary_marker",
    custody: "privacy_data_custody",
    custodian: "privacy_data_custody",
    policy: "privacy_policy_framework",
    desk: "privacy_request_workspace",
    basis: "privacy_notice_basis",
    notice: "privacy_notice",
    log: "privacy_compliance_record",
    trace: "privacy_compliance_record",
    consent: "privacy_consent_choice",
    pact: "privacy_consent_choice",
    redaction: "privacy_redaction",
    dignity: "privacy_data_dignity",
    quiet: "privacy_discreet_handling",
    discretion: "privacy_discreet_handling",
    restraint: "privacy_discreet_handling",
    circumspect: "privacy_discreet_handling",
    anonymity: "privacy_anonymity",
    privity: "privacy_entrusted_information",
    confidant: "privacy_entrusted_information",
    confide: "privacy_entrusted_information",
    fiduciary: "privacy_entrusted_information",
    due: "privacy_careful_practice",
    care: "privacy_careful_practice",
    good: "privacy_careful_practice",
    faith: "privacy_careful_practice",
  },
  "cue:freelancer accounting": {
    balance: "freelancer_accounting_records",
    daybook: "freelancer_accounting_records",
    own: "freelancer_accounting_independence",
    tabulate: "freelancer_accounting_records",
    reckoner: "freelancer_accounting_calculation",
    accrue: "freelancer_accounting_timing",
    abacus: "freelancer_accounting_calculation",
    numerate: "freelancer_accounting_calculation",
    tallier: "freelancer_accounting_calculation",
    reckoning: "freelancer_accounting_calculation",
    orderly: "freelancer_accounting_order",
    steady: "freelancer_accounting_order",
    provision: "freelancer_accounting_provision",
    headroom: "freelancer_accounting_headroom",
    wherewithal: "freelancer_accounting_headroom",
    figure: "freelancer_accounting_figures",
    cash: "freelancer_accounting_figures",
    filing: "freelancer_accounting_records",
    invoice: "freelancer_accounting_invoice",
    tax: "freelancer_accounting_tax",
    solo: "freelancer_accounting_solo",
    billable: "freelancer_accounting_billable",
    setaside: "freelancer_accounting_reserve",
    lineitem: "freelancer_accounting_line_item",
    ledger: "freelancer_accounting_records",
    tally: "freelancer_accounting_records",
    books: "freelancer_accounting_records",
    sole: "freelancer_accounting_independence",
    folio: "freelancer_accounting_folio",
    receivable: "freelancer_accounting_receivable",
    remit: "freelancer_accounting_remittance",
    compass: "freelancer_accounting_navigation",
    way: "freelancer_accounting_navigation",
    desk: "freelancer_accounting_workspace",
    sundry: "freelancer_accounting_sundry_entries",
    footing: "freelancer_accounting_footing_total",
    netting: "freelancer_accounting_netting",
    carryover: "freelancer_accounting_carryover",
    outlay: "freelancer_accounting_outlay",
    turnover: "freelancer_accounting_turnover",
  },
  "cue:small-business contract review": {
    audit: "contract_review_check",
    trace: "contract_review_history",
    proof: "contract_review_support",
    grid: "contract_review_structure",
    scope: "contract_review_structure",
    lens: "contract_review_view",
    view: "contract_review_view",
    signal: "contract_review_attention",
    markup: "contract_review_markup",
    fineprint: "contract_review_fineprint",
    scan: "contract_review_check",
    trail: "contract_review_history",
    stipulate: "contract_review_condition",
    proviso: "contract_review_condition",
    caveat: "contract_review_condition",
    whereas: "contract_review_preamble",
    preamble: "contract_review_preamble",
    legible: "contract_review_clarity",
    plainspoken: "contract_review_clarity",
    plain: "contract_review_clarity",
    light: "contract_review_clarity",
    verbatim: "contract_review_exact_wording",
    amend: "contract_review_revision",
    redraft: "contract_review_revision",
    addendum: "contract_review_revision",
    provision: "contract_review_clause_language",
    recital: "contract_review_clause_language",
    annex: "contract_review_annex",
    close: "contract_review_reading",
    read: "contract_review_reading",
    second: "contract_review_reading",
    room: "contract_review_workspace",
    margin: "contract_review_annotation",
    note: "contract_review_annotation",
    risk: "contract_review_attention",
    desk: "contract_review_workspace",
    redline: "contract_review_markup",
    terms: "contract_review_clause_language",
    clause: "contract_review_clause_language",
    pact: "contract_review_agreement",
    covenant: "contract_review_agreement",
    accord: "contract_review_agreement",
    draft: "contract_review_version",
    version: "contract_review_version",
    pair: "contract_review_version",
    delta: "contract_review_change",
    flag: "contract_review_attention",
  },
  "cue:rural telehealth reach": {
    route: "rural_telehealth_distance",
    remote: "rural_telehealth_distance",
    signal: "rural_telehealth_connection",
    wave: "rural_telehealth_connection",
    channel: "rural_telehealth_connection",
    relay: "rural_telehealth_connection",
    beacon: "rural_telehealth_beacon",
    outpost: "rural_telehealth_distance",
    conduit: "rural_telehealth_connection",
    node: "rural_telehealth_connection",
    span: "rural_telehealth_distance",
    bridge: "rural_telehealth_connection",
    mesh: "rural_telehealth_connection",
    post: "rural_telehealth_distance",
    crossing: "rural_telehealth_distance",
    proximity: "rural_telehealth_distance",
    vicinity: "rural_telehealth_distance",
    adjacency: "rural_telehealth_distance",
    wider: "rural_telehealth_distance",
    linkage: "rural_telehealth_connection",
    rendezvous: "rural_telehealth_connection",
    confluence: "rural_telehealth_connection",
    presence: "rural_telehealth_presence",
    nearness: "rural_telehealth_presence",
  },
  "cue:clear mortgage comparison": {
    benchmark: "mortgage_comparison_reference",
    yardstick: "mortgage_comparison_reference",
    grid: "mortgage_comparison_structure",
    scope: "mortgage_comparison_structure",
    compass: "mortgage_comparison_navigation",
    atlas: "mortgage_comparison_navigation",
    map: "mortgage_comparison_navigation",
    key: "mortgage_comparison_factor",
    match: "mortgage_offer_comparison",
    loan: "mortgage_loan_subject",
    view: "mortgage_comparison_view",
    lens: "mortgage_comparison_view",
    equate: "mortgage_comparison_reference",
    collate: "mortgage_comparison_structure",
    parity: "mortgage_comparison_reference",
    payment: "mortgage_payment_terms",
    term: "mortgage_payment_terms",
    apr: "mortgage_payment_terms",
    calibrate: "mortgage_comparison_reference",
    navigate: "mortgage_comparison_navigation",
    bearings: "mortgage_comparison_navigation",
    landmark: "mortgage_comparison_navigation",
    headway: "mortgage_comparison_navigation",
    guided: "mortgage_comparison_navigation",
    discern: "mortgage_comparison_distinction",
    first: "mortgage_first_buyer",
    check: "mortgage_detail_check",
    offer: "mortgage_offer_subject",
    board: "mortgage_comparison_structure",
    sift: "mortgage_term_sift",
    range: "mortgage_comparison_structure",
    borrow: "mortgage_loan_subject",
    brief: "mortgage_borrowing_summary",
    guide: "mortgage_comparison_navigation",
    cost: "mortgage_cost_factor",
    buyer: "mortgage_buyer_context",
    choice: "mortgage_comparison_factor",
  },
}

/**
 * A small number of ordinary words have a truthful meaning that is still
 * misleading in an unrelated category. Keep those bindings concept-scoped;
 * an unrecognised or incompatible cue receives neutral evidence instead.
 */
const CONTEXTUAL_ASSOCIATION_POLICIES: Readonly<Record<string, ContextualAssociationPolicy>> = {
  harvest: {
    associationId: "harvest_yield",
    allowedConceptIds: [
      "agriculture",
      "cue:balcony gardening kits",
      "cue:healthy growth",
      "cue:kenya small-farm irrigation",
      "cue:welsh farm-to-school trade",
    ],
  },
  flora: {
    associationId: "botanical_flora",
    allowedConceptIds: [
      "cue:alpine botanical skincare",
      "cue:visible skin care and renewal",
    ],
  },
}

const GENERIC_ASSOCIATION_IDS = new Set<RationaleAssociationId>([
  "generic_literal",
  "generic_curated",
  "generic_sound",
])

function associationForSurface(
  surface: string,
  fallback: RationaleAssociationId,
  conceptId: RationaleConceptId,
): RationaleAssociationId {
  const label = toLabel(surface)
  const contextualOverride = CONTEXTUAL_ASSOCIATION_OVERRIDES[conceptId]?.[label]
  if (contextualOverride) return contextualOverride

  for (const [associationId, definition] of Object.entries(QUICK_RATIONALE_ASSOCIATIONS)) {
    const surfaces: readonly string[] | undefined = "surfaces" in definition
      ? (definition.surfaces as readonly string[])
      : undefined
    if (!surfaces?.includes(label)) continue
    const allowedConceptIds: readonly RationaleConceptId[] | undefined = "allowedConceptIds" in definition
      ? (definition.allowedConceptIds as readonly RationaleConceptId[])
      : undefined
    if (allowedConceptIds && !allowedConceptIds.includes(conceptId)) continue

    const resolved = associationId as RationaleAssociationId
    const contextualPolicy = CONTEXTUAL_ASSOCIATION_POLICIES[label]
    if (contextualPolicy?.associationId === resolved
      && !contextualPolicy.allowedConceptIds.includes(conceptId)) {
      return fallback
    }
    return resolved
  }
  return fallback
}

function part(
  id: string,
  surface: string,
  kind: EvidencePart["kind"],
  fallback: RationaleAssociationId,
  conceptId: RationaleConceptId,
  provenance?: EvidenceProvenance,
): EvidencePart {
  // Sound provenance proves only a visible/phonetic construction. Never turn
  // an unreviewed model part into category meaning merely because the same
  // spelling has a reviewed association in some other niche.
  const associationId = provenance === "sound"
    ? fallback
    : associationForSurface(surface, fallback, conceptId)
  const inferredProvenance: EvidenceProvenance = associationId !== fallback
    ? "literal"
    : fallback === "generic_sound"
      ? "sound"
      : "curated"
  return {
    id,
    surface: toLabel(surface),
    associationId,
    kind,
    provenance: provenance ?? inferredProvenance,
  }
}

function findLocaleForm(name: string): { localeId: RationaleLocaleId; formId: string } | null {
  const label = toLabel(name)
  for (const [localeId, locale] of Object.entries(QUICK_RATIONALE_LOCALES)) {
    if (label in locale.forms) return { localeId: localeId as RationaleLocaleId, formId: label }
  }
  return null
}

function buildConstruction(input: QuickRationaleInput, conceptId: RationaleConceptId): {
  construction: RationaleConstruction
  evidence: readonly EvidencePart[]
} {
  const name = toLabel(input.name)
  const locale = input.style === "non_english" ? findLocaleForm(name) : null
  if (locale) {
    return {
      construction: { kind: "locale_form", localeId: locale.localeId, formId: locale.formId },
      evidence: [],
    }
  }

  if (input.evidence?.kind === "orthographic_fusion") {
    const evidence = [
      part("left", input.evidence.left, "source_word", "generic_sound", conceptId),
      part("right", input.evidence.right, "source_word", "generic_sound", conceptId),
    ] as const
    return {
      construction: {
        kind: "orthographic_fusion",
        leftEvidenceId: "left",
        rightEvidenceId: "right",
        overlap: toLabel(input.evidence.overlap),
      },
      evidence,
    }
  }

  if (input.evidence?.kind === "reviewed_spelling") {
    return {
      construction: {
        kind: "alternate_spelling",
        sourceEvidenceId: "source",
        rule: input.evidence.rule,
      },
      evidence: [part("source", input.evidence.source, "source_word", "generic_curated", conceptId)],
    }
  }

  if (input.evidence?.kind === "semantic_word") {
    return {
      construction: { kind: "semantic_word", evidenceId: "word" },
      evidence: [part("word", input.evidence.source, "whole_word", "generic_curated", conceptId)],
    }
  }

  if (input.constructionParts?.length === 2) {
    const [left, right] = input.constructionParts
    return {
      construction: {
        kind: input.style === "short_phrase" ? "short_phrase" : "literal_compound",
        leftEvidenceId: "left",
        rightEvidenceId: "right",
      },
      evidence: [
        part("left", left, "visible_part", "generic_literal", conceptId, input.constructionProvenance?.[0]),
        part("right", right, "visible_part", "generic_literal", conceptId, input.constructionProvenance?.[1]),
      ],
    }
  }

  return { construction: { kind: "abstract" }, evidence: [] }
}

/**
 * Converts already-reviewed candidate provenance into the strict V2 contract.
 * Raw customer wording and model-authored prose remain absent from the plan;
 * only a compact, locally reviewed fact ID may refine the final explanation.
 */
export function buildQuickRationalePlan(input: QuickRationaleInput): RationalePlan {
  const conceptId = resolveRationaleConceptId(input.conceptCue)
  const replay = buildConstruction(input, conceptId)
  const hasGroundedAssociation = replay.construction.kind === "locale_form"
    || replay.evidence.some((item) => !GENERIC_ASSOCIATION_IDS.has(item.associationId))
  const inferredRelevance: RationaleRelevance = input.evidence?.kind === "semantic_word"
    || replay.construction.kind === "locale_form"
    ? "category_evidence"
    : "context_only"
  const requestedRelevance = input.relevance ?? inferredRelevance
  return {
    version: QUICK_RATIONALE_VERSION,
    name: toLabel(input.name),
    conceptId,
    tone: input.tone,
    relevance: requestedRelevance === "category_evidence" && !hasGroundedAssociation
      ? "context_only"
      : requestedRelevance,
    construction: replay.construction,
    evidence: replay.evidence,
  }
}

export function renderQuickCandidateRationale(input: QuickRationaleInput): string {
  const plan = buildQuickRationalePlan(input)
  const rendered = renderRationaleV2(plan)
  const fact = briefFactFrame(input.briefFacts)
  // A few exact supply profiles already carry a more precise safe account of
  // the audience and job than their matching broad fact. Keep those profiles
  // intact; other facts still add useful specific detail to broad cues.
  if (!fact || rendered.fallback || specificCueAlreadyCarriesBriefFact(plan.conceptId, input.briefFacts)) return rendered.text

  // The first and last frames are tied to the candidate's visible form and
  // its honest uncertainty. Swap only the generic middle category frame for a
  // reviewed brief fact, rather than asking the model to invent a rationale.
  const text = [rendered.frames[0], fact, rendered.frames[3]].filter(Boolean).join(" ")
  return (text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0) <= 65
    ? text
    : [rendered.frames[0], fact].join(" ")
}
