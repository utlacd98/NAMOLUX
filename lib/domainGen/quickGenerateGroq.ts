import {
  assessQuickAutoCandidateQuality,
  createQuickCandidateFromName,
  generateQuickEditorialWorkshop,
  extractQuickRoots,
  generateQuickCandidates,
  getQuickAutoPromptAnchors,
  getQuickConceptRoots,
  getQuickPrimaryIntent,
  getQuickReviewedEditorialPortfolio,
  getQuickValueFacet,
  requiresQuickPrimaryConceptEvidence,
  getQuickBatchCollision,
  getQuickCompoundSignature,
  getQuickLocalePolicy,
  getQuickVisibleFamilies,
  isQuickCueOwnedSemanticWord,
  isQuickReviewedContextCompound,
  hasQuickPrimaryConceptEvidence,
  hasQuickValueFacetIntersection,
  isVerifiedQuickLocaleCandidate,
  buildQuickStylePlan,
  QUICK_CROSS_NICHE_DEFAULTS,
  QUICK_MIN_NAME_LENGTH,
  QUICK_GENERATE_VIBES,
  type QuickCandidate,
  type QuickGenerateCreativity,
  type QuickGenerateInput,
  type QuickGenerateStyle,
  type QuickGenerateVibe,
  type QuickCandidateEvidence,
} from "./quickGenerate"
import { NAME_STYLES, type NameStyle } from "./generatedName"
import {
  buildQuickAutoEditorialMessages,
  buildQuickAutoMessages,
  buildQuickAutoResponseFormat,
  QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT,
  QUICK_AUTO_EVIDENCE_MECHANISMS,
  QUICK_AUTO_PROVIDER_CANDIDATE_LIMIT,
  QUICK_AUTO_TERRITORY_IDS,
  type QuickAutoEvidenceMechanism,
  type QuickAutoTerritoryId,
} from "./quickAutoContract"

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
const VERCEL_AI_GATEWAY_CHAT_COMPLETIONS_URL = "https://ai-gateway.vercel.sh/v1/chat/completions"
// GPT-OSS 120B follows the compact names-only workshop/editor contract far
// more reliably than Qwen follows portfolio constraints. Keep Qwen only as a
// distinct fallback lane for transport failures.
const DEFAULT_GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
] as const
// A separate, much faster Groq model is retained only for editor transport
// recovery. It uses an independent per-model capacity pool when 120B times
// out or Groq returns `failed_generation`; it never runs after a valid 120B
// shortlist and every result still passes the same local quality gates.
const DEFAULT_GROQ_EDITOR_MODEL = "openai/gpt-oss-20b"
// Gemini Flash is a strong, low-latency naming fallback. The model ID is
// resolved by AI Gateway, so provider failover and usage observability stay in
// Vercel rather than requiring another long-lived secret in this repository.
const DEFAULT_VERCEL_GATEWAY_MODEL = "google/gemini-2.5-flash"
const DEFAULT_OPENAI_QUICK_MODEL = "gpt-4.1-mini"
type QuickGeneratePrimaryProvider = "groq" | "openai"
// Leave roughly 600ms of the public eight-second SLO for request parsing,
// deterministic synthesis, response serialization, and platform overhead.
// Every provider observes this one deadline; fallbacks never add independent
// timeout windows on top of it.
const TOTAL_MODEL_BUDGET_MS = 7_400
// The live balanced-60 audit put every admitted Groq completion below 2.4s.
// One realistic three-second attempt therefore covers normal queueing while
// retaining a complete independent-provider window. Never retry another model
// with the same Groq key inside one user request: Groq's TPM limits are shared
// per organisation/model, and the former three-model retry ladder turned 46
// primary failures into 138 requests that sustained its own rate-limit storm.
const PRIMARY_GROQ_ATTEMPT_BUDGET_MS = 3_000
const PRIMARY_GROQ_MINIMUM_ATTEMPT_MS = 1_200
const EXTENDED_GROQ_ATTEMPT_BUDGET_MS = 6_800
// Public Auto uses one bounded GPT-OSS 120B editorial pass over a private,
// deterministic workshop pool. This leaves the model enough of the public
// deadline to replace weak directions instead of spending a second request on
// a draft that is never shown.
const AUTO_GENERATION_ATTEMPT_BUDGET_MS = 3_000
// The editor normally completes in roughly two to three seconds, but sealed
// multi-brief runs exposed an occasional valid completion just beyond the old
// 3.4s cutoff. Five seconds absorbs that queueing tail while preserving more
// than two seconds of the shared deadline for an independent Gateway fallback.
const AUTO_EDITORIAL_ATTEMPT_BUDGET_MS = 5_000
const AUTO_EDITORIAL_MINIMUM_ATTEMPT_MS = 1_200
const AUTO_EDITORIAL_RESERVE_MS = AUTO_EDITORIAL_ATTEMPT_BUDGET_MS + 300
const QWEN_EDITORIAL_RECOVERY_ATTEMPT_BUDGET_MS = 1_700
const QWEN_EDITORIAL_RECOVERY_MINIMUM_ATTEMPT_MS = 350
const SECONDARY_EDITORIAL_RECOVERY_ATTEMPT_BUDGET_MS = 2_100
const SECONDARY_EDITORIAL_RECOVERY_MINIMUM_ATTEMPT_MS = 350
const GATEWAY_EDITORIAL_SELECTION_ATTEMPT_BUDGET_MS = 2_200
const GATEWAY_EDITORIAL_SELECTION_MINIMUM_ATTEMPT_MS = 600
const OPENAI_EDITORIAL_SELECTION_ATTEMPT_BUDGET_MS = 2_500
const OPENAI_EDITORIAL_SELECTION_MINIMUM_ATTEMPT_MS = 500
const EDITORIAL_RECOVERY_RESERVE_MS = (
  QWEN_EDITORIAL_RECOVERY_ATTEMPT_BUDGET_MS
  + SECONDARY_EDITORIAL_RECOVERY_ATTEMPT_BUDGET_MS
  + 100
)
// The isolated production-key preflight returned 16 strict-schema candidates
// from gpt-4.1-mini in 5.94s. Only start this paid, independent-provider
// fallback when at least six seconds remain, and never allow it to consume more
// than 6.3s. The request path has no general SDK retry loop. It may repeat one
// fast, pre-generation OpenAI 401 invalid_request_error inside this same
// deadline because the live API returned that transiently and accepted the
// identical request immediately afterwards.
const OPENAI_ATTEMPT_BUDGET_MS = 6_300
// GPT-5.6 Sol's sealed six-brief p95 landed just above the legacy 6.3s cap.
// Reasoning-model primaries may use the final 500ms of the provider window,
// while the shared 7.4s deadline still preserves roughly 600ms for admission,
// serialization and the public eight-second time-to-first-name target.
const OPENAI_REASONING_ATTEMPT_BUDGET_MS = 6_800
const OPENAI_MINIMUM_FALLBACK_WINDOW_MS = 6_000
const OPENAI_TRANSIENT_401_RETRY_MIN_REMAINING_MS = 2_000
const VERCEL_GATEWAY_ATTEMPT_BUDGET_MS = 2_800
const VERCEL_GATEWAY_MINIMUM_ATTEMPT_MS = 1_200
const ALTERNATE_GROQ_ATTEMPT_BUDGET_MS = 2_500
const ALTERNATE_GROQ_MINIMUM_ATTEMPT_MS = 900
const OPENAI_EDITORIAL_RECOVERY_MINIMUM_ATTEMPT_MS = 350
const PRIMARY_DOWNSTREAM_RESERVE_MS = 3_500
const GATEWAY_DOWNSTREAM_RESERVE_MS = 700
const RESULT_CANDIDATE_LIMIT = 16
const EDITORIAL_SELECTION_MINIMUM_POOL_SIZE = 24
const EDITORIAL_SELECTION_OMISSION_COUNT = 4
// Ask for 24 from the normal 32-draft workshop. The model still rejects a
// genuine eight-name surplus, while the local weak-literal and family gates
// retain enough reviewed alternatives to publish sixteen without another
// authoring pass.
const EDITORIAL_SELECTION_EXTRA_REVIEW_COUNT = 8
// The sealed live samples admitted only 9-12 of 18 provider names, forcing a
// weak deterministic tail. Ask for eight private alternates, still rank the
// provider output strongest-first, and expose only the final 16. The latency
// gate below decides whether this larger safety pool is viable.
const PROVIDER_TERRITORY_IDS = QUICK_AUTO_TERRITORY_IDS
type ProviderTerritoryId = QuickAutoTerritoryId
const MAX_SELECTED_NAMES_PER_TERRITORY = 6
const PROVIDER_EVIDENCE_MECHANISMS = QUICK_AUTO_EVIDENCE_MECHANISMS
type ProviderEvidenceMechanism = QuickAutoEvidenceMechanism

// These short fragments are especially prone to becoming a mechanical
// template (UpFund, UpSave, UpBudget). They are not forbidden individually,
// but a provider batch may use the same visible head or tail at most twice.
const PROVIDER_TEMPLATE_AFFIXES = [
  "up", "go", "get", "my", "try", "neo", "pro", "smart", "easy", "true", "pure", "kind", "well",
  "nest", "hub", "lab", "flow", "ify", "ly", "io",
] as const
// Keep the provider merge aligned with Quick's deterministic selector. These
// are hard presentation limits in Auto: model output may enrich a batch, but
// it must never turn the page back into a wall of one construction family.
// Explicit style requests are intentionally exempt because they are a product
// promise to return only the construction the user selected.
const AUTO_STYLE_HARD_CAPS: Readonly<Record<NameStyle, number>> = {
  brandable: 5,
  evocative: 5,
  compound: 5,
  real_word: 5,
  short_phrase: 3,
  alternate_spelling: 3,
  non_english: 6,
}
// Auto is creative exploration first. Once a provider name has passed hard
// safety, morphology, pronounceability and the two-per-surface-family gate,
// the absence of locally reviewed semantic evidence must not make a weaker
// deterministic name outrank it. This relaxation is model-only: deterministic
// fallback remains under the ordinary style caps and cannot pad the page with
// abstract forms.
const AUTO_UNEVIDENCED_MODEL_CANDIDATE_LIMIT = RESULT_CANDIDATE_LIMIT
// A public Auto page has already passed an editorial model. At that point,
// unsupported sound-led directions are a deliberate accent, not half the
// shortlist. Keeping this cap at four prevents generic metaphors from surviving
// merely because separate editor attempts each admitted their own lateral set.
const AUTO_REVIEWED_UNEVIDENCED_CANDIDATE_LIMIT = 4
// A strict multi-term brief may retain a small lateral exploration lane, but
// an editorially reviewed page must keep at least 75% of its sixteen names
// visibly tied to the primary job-to-be-done.
const AUTO_NON_PRIMARY_EDITORIAL_CANDIDATE_LIMIT = 4
// Evidence proves that a word belongs to the brief; it does not automatically
// make a page of dictionary or administrative labels a strong brand shortlist.
// Keep whole-word directions to at most half of a reviewed Auto page, then
// require the other half to use more ownable constructions. Six starved
// otherwise strong finance and climate portfolios after family/collision
// checks; eight still preserves an even construction/whole-word split.
const AUTO_REVIEWED_SEMANTIC_WORD_CANDIDATE_LIMIT = 8
const AUTO_REVIEWED_WEAK_LITERAL_CANDIDATE_LIMIT = 2
const WEAK_EDITORIAL_DRAFT_NAMES: Readonly<Record<string, ReadonlySet<string>>> = {
  "founder scheduling assistance": new Set(["timekeeper", "timetable", "timeweave"]),
  "European retail privacy compliance": new Set([
    "integrity", "permission", "diligence", "assurance",
    "lawful", "verifiable", "stewardship", "discreet", "trustworthy",
    "seclusion", "consent", "compliance", "trustpact", "guardledger", "fairtrust", "safetrust",
    "cleartrust", "fairdata", "cleardata", "safeconsent", "saferetail", "privacylock", "shopshield",
    "privacypact", "retailguard", "shopconsent", "euroguard", "consentlog", "policyguard",
    "consentflow", "redaction", "erasure", "portability", "dataguard", "erasuredesk",
    "basislog", "euroconsent", "retailpact",
  ]),
  "freelancer accounting": new Set([
    "cashbook", "daybook", "receipt", "reconcile", "journal", "column", "settled", "squared",
    "balance", "credits", "debits", "postings", "calmsolo", "tally", "reckon", "accrual",
    "folioworks", "sumworks", "bookcraft", "bookharbour", "numbercraft", "tallymark", "tallydesk",
    "indiebooks", "cashclarity", "figureflow", "invoiceway", "filingflow", "invoicegrid", "filingdesk",
    "receiptflow", "truesolo", "tabulate", "billable", "setaside", "lineitem", "receivable",
    "remit", "taxthread",
  ]),
  "small-business contract review": new Set([
    "annotation", "clarifier", "wording", "simplebrief", "clearbrief",
    "plainbrief", "simplereview", "plainreview", "clearreview", "clearplain", "simpleplain",
    "reviewpath", "clausewise", "reviewlens", "reviewgrid", "clausecheck", "clausecraft", "reviewmark",
    "truebrief", "clauseview", "clauselens", "wordinglens", "termstrace", "clausetrace",
    "termscan", "riskscan", "reviewtrail", "markupflow", "termguard", "contractlens", "termsdesk",
    "redlinegrid", "clauseaudit", "accord", "markup", "amend", "clauseflag", "redraft", "versionpair",
  ]),
  "rural telehealth reach": new Set([
    "reachable", "reachability", "outreach", "telecare", "connected",
    "coverage", "accessible", "availability", "telepresence", "accesslink",
    "localclinic", "ruralcare", "openpulse", "localpulse", "nearvital", "openvital", "localvital",
    "openclinic", "openaccess", "localaccess", "openmend", "openreach", "localreach", "mendreach",
    "careconnect", "patientway", "clinicreach", "careportal", "healthreach", "careaccess",
    "conduit", "waystation", "nearcare", "clinicroute", "teleportal",
    "patientlink", "careoutpost", "carechannel", "remotepulse", "clinicwave", "healthrelay",
    "vitalsignal", "nearclinic", "cliniclink", "careconduit", "vitalspan", "healthpost",
  ]),
  "climate startup marketing": new Set([
    "evidence", "message", "category", "adoption", "demand", "uptake",
    "framing", "position", "briefing", "proofed", "storyarc", "claimarc", "voicearc", "storymap",
    "voicemap", "proofmap", "proofarc", "claimmap", "sharpeco", "sharpstory", "honestvoice",
    "sharpvoice", "ecosway", "storylab", "voicelab", "amplify", "impact", "signal", "narrative",
    "brandink", "voiceink", "founderstory", "brandcue", "ecostory", "ecopitch", "stance", "uptakelab",
  ]),
  "clear mortgage comparison": new Set([
    "overview", "guidance", "shortlist", "contrast", "ratecard", "choices",
    "options", "sidebyside", "clearchoice", "choiceatlas",
    "loanchoice", "homechoice", "borrowmap", "choicekey", "buyerlens", "homeview",
    "buyerview", "termlens", "termcompass", "loanscope", "loanmap", "repayview",
    "collate", "paymentrange", "aprcheck", "offerboard", "offergrid", "aprview",
  ]),
}
const WEAK_EDITORIAL_DRAFT_PATTERNS: Readonly<Record<string, readonly RegExp[]>> = {
  "founder scheduling assistance": [
    /^time(?:keeper|table|weave)$/,
  ],
  "European retail privacy compliance": [
    /^(?:calm|clear|fair|plain|safe)(?:consent|data|retail|trust)$/,
    /^(?:guard|trust)(?:ledger|pact)$/,
  ],
  "freelancer accounting": [
    /^(?:book|folio|sum)(?:craft|harbour|works)$/,
    /^(?:calm|clear|plain|simple)(?:books|solo|tax)$/,
  ],
  "small-business contract review": [
    /^(?:clear|plain|simple)(?:brief|plain|review)$/,
    /^(?:plainspoken|wording)$/,
  ],
  "rural telehealth reach": [
    /^(?:local|open)(?:access|clinic|mend|pulse|reach|vital)$/,
    /^(?:accesslink|careaccess|careconnect|careportal|clinicreach|healthreach|mendreach|nearvital|patientway|ruralcare)$/,
  ],
  "climate startup marketing": [
    /^(?:claim|proof|story|voice)(?:arc|map)$/,
    /^(?:honest|sharp)(?:claim|eco|story|voice)$/,
  ],
  "clear mortgage comparison": [
    /^(?:borrowmap|buyerlens|choiceatlas|choicekey|fairbuyer|fairchoice|guidedrate|homechoice|homeview|loanchoice)$/,
  ],
}
const GENERIC_EDITORIAL_PHRASE_LEADS = new Set([
  "calm", "clear", "fair", "guided", "honest", "local", "open", "plain", "safe", "sharp", "simple",
])
const EDITORIAL_REPEATED_TEMPLATE_PARTS: Readonly<Record<string, ReadonlySet<string>>> = {
  "founder scheduling assistance": new Set(["agenda", "relay", "slot", "time"]),
  "European retail privacy compliance": new Set(["guard", "pact", "shield"]),
  "freelancer accounting": new Set(["flow", "ledger", "tally"]),
  "small-business contract review": new Set(["grid", "lens", "scan", "trace"]),
  "rural telehealth reach": new Set(["link", "reach", "relay", "signal"]),
  "climate startup marketing": new Set(["brief", "cue", "ink", "story", "voice"]),
  "clear mortgage comparison": new Set(["choice", "compass", "lens", "map", "scope", "view"]),
}
const AUTO_REVIEWED_TEMPLATE_PART_LIMIT = 2
const CREATIVE_LENSES = [
  "material and craft metaphors",
  "motion and progress metaphors",
  "place and spatial metaphors",
  "ritual and habit metaphors",
  "signal and navigation metaphors",
  "relationship and community metaphors",
  "nature and growth metaphors",
  "precision and structure metaphors",
] as const

function getProviderResponseFormat(_style: QuickGenerateStyle, count: number) {
  // Name surfaces are the only provider-authored data we trust. The previous
  // explicit-style candidate-record schema routinely truncated after one to
  // seven objects and its claimed evidence was rejected by local replay. A
  // compact names array leaves enough output budget for a genuine private
  // pool; style, morphology and all explanation copy remain locally derived.
  return buildQuickAutoResponseFormat(count)
}

const WEAK_AI_FRAGMENTS = [
  "appoin", "aislate", "assistx", "booknurs", "bookwee", "botsy", "boutiq", "boxx", "codey", "concierv",
  "doggo", "ecommerceo", "ecopacka", "estatexpro", "foresee", "foundati", "foundata", "founderz", "foundsch",
  "friendli", "gpt", "hotelbout", "inventori", "inventroy", "iqe", "kidzonea", "localnurs", "luxehote",
  "luxehotl", "neigb", "nurturey", "planxa", "premiervo", "salonbu", "sced", "scheama", "scheid", "storag",
  "startix", "travellu", "xy", "zax", "xion",
] as const

const WEAK_AI_EXACT_NAMES = new Set([
  "analsec", "careow", "climaxes", "cybers", "datadect", "datash", "foundit", "gamelink", "gptzone", "guardcy",
  "lawzen", "petplus", "pilotme", "privio", "producta", "signal", "signald", "signalp", "solutio",
  // Observed cross-category model defaults from the balanced-60 audit. These
  // are generic templates (and in several cases existing brands/products), not
  // a ban on abstract naming as a whole.
  "bondhub", "briefly", "carepulse", "clausify", "homeframe", "ledgerio", "ledgerly", "ledgerup", "mendwell",
  "musecraft", "museform", "pulsecare", "pulsehub", "renewhub", "signdata", "signalr", "sigtrace", "staywild",
  "stocklab", "wildstay",
  ...QUICK_CROSS_NICHE_DEFAULTS,
])

interface GroqCandidatePayload {
  name?: unknown
  territoryId?: unknown
  mechanism?: unknown
  evidenceParts?: unknown
  visibleRoots?: unknown
  /** Backwards-compatible parser input for cached responses and tests. */
  sourceRoots?: unknown
  style?: unknown
}

interface GroqNameResponse {
  candidates?: unknown
  names?: unknown
}

interface ParsedGroqCandidate {
  name: string
  sourceRoots: string[]
  style?: NameStyle
  territoryId?: ProviderTerritoryId
  mechanism?: ProviderEvidenceMechanism
  evidenceParts: string[]
  /** True only when the provider returned the current candidate-record shape. */
  contractCompliant: boolean
}

export interface GroqQuickGenerateResult {
  candidates: QuickCandidate[]
  usedGroq: boolean
  usedOpenAI: boolean
  usedVercelGateway: boolean
  modelBacked: boolean
  provider: "groq" | "openai" | "vercel_gateway" | "deterministic"
  model: string | null
  durationMs: number
  providerAttempts: Array<{
    provider: "groq" | "openai" | "vercel_gateway"
    model: string
    stage?: "generation" | "editorial"
    outcome: "ready" | "missing_key" | "http_error" | "invalid_response" | "no_valid_names" | "timeout" | "aborted" | "network_error"
    status?: number
    durationMs: number
    retryAfterMs?: number
    /** At most one narrow pre-generation OpenAI 401 retry; never a model-output retry. */
    retryCount?: number
    /** Count-only diagnostics; never includes provider text, names or briefs. */
    parsedCandidateCount?: number
    admittedCandidateCount?: number
    /** Size of the private choice set offered to a selector-style reviewer. */
    selectionPoolCandidateCount?: number
    /** Count-only local admission outcomes, available only for safe operational diagnostics. */
    admissionRejectionCounts?: Partial<Record<ModelAdmissionRejectionReason, number>>
    /** Sanitized machine code only; never provider messages or failed output. */
    errorCode?: string
  }>
  /** True only when every public Auto candidate came from the bounded naming-editor pass. */
  editoriallyReviewed: boolean
  /** Public candidates attributable to the editor, never draft/provider text. */
  editorialCandidateCount: number
  fallbackReason?: string
  styleFulfilled: boolean
  styleShortfallReason?: string
  modelCandidateCount: number
  /** Model-authored Auto candidates with locally verified visible grounding. */
  modelGroundedCandidateCount: number
  fallbackCandidateCount: number
  /** Deterministic reserve candidates that passed the same Auto grounding gate. */
  fallbackGroundedCandidateCount: number
  /** Count-only Auto quality diagnostics; no name or brief data is retained. */
  groundedCandidateCount: number
  exploratoryCandidateCount: number
}

type ModelProvider = "groq" | "openai" | "vercel_gateway"
type OpenAIQuickReasoningEffort = "none" | "minimal" | "low"
type ModelAdmissionRejectionReason =
  | "weak_ai"
  | "requested_style_mismatch"
  | "outside_length"
  | "invalid_evidence"
  | "candidate_admission"
  | "quality_rejected"
  | "exploration_cap"
  | "territory_cap"
  | "family_cap"
  | "editorial_seed_cap"

interface ProviderConfig {
  provider: ModelProvider
  endpoint: string
  apiKey: string | undefined
  model: string
  maximumAttemptMs: number
  minimumAttemptMs: number
  reserveAfterMs: number
  stage?: "generation" | "editorial"
  openAIReasoningEffort?: OpenAIQuickReasoningEffort
}

interface ProviderAttempt {
  config: ProviderConfig
  content: string | null
  outcome: GroqQuickGenerateResult["providerAttempts"][number]["outcome"]
  status?: number
  durationMs: number
  retryAfterMs?: number
  retryCount?: number
  errorCode?: string
  reason: string
}

function normaliseVibe(value: unknown): QuickGenerateVibe {
  return QUICK_GENERATE_VIBES.includes(value as QuickGenerateVibe) ? (value as QuickGenerateVibe) : "friendly"
}

function normaliseStyle(value: unknown): QuickGenerateStyle {
  const styles: readonly string[] = ["auto", ...NAME_STYLES]
  return styles.includes(String(value)) ? (value as QuickGenerateStyle) : "auto"
}

function normaliseCreativity(value: unknown): QuickGenerateCreativity {
  return ["direct", "balanced", "exploratory"].includes(String(value))
    ? (value as QuickGenerateCreativity)
    : "balanced"
}

function isOpenAIReasoningQuickModel(model: string): boolean {
  return model.startsWith("gpt-5")
}

function isOpenAILegacyGpt5MiniModel(model: string): boolean {
  return model === "gpt-5-mini" || model.startsWith("gpt-5-mini-")
}

function getOpenAIQuickReasoningEffort(
  model: string,
  creativity: QuickGenerateCreativity,
): OpenAIQuickReasoningEffort | undefined {
  if (!isOpenAIReasoningQuickModel(model)) return undefined
  const configured = process.env.OPENAI_QUICK_REASONING_EFFORT?.trim().toLowerCase()
  if (isOpenAILegacyGpt5MiniModel(model)) {
    if (configured === "minimal" || configured === "low") return configured
    return creativity === "direct" ? "minimal" : "low"
  }
  if (configured === "none" || configured === "low") return configured
  return "none"
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback
  return Math.min(max, Math.max(min, numeric))
}

function getGroqQuickModels(): string[] {
  const singular = process.env.GROQ_QUICK_MODEL?.trim()
  if (singular) return [singular]
  const configured = process.env.GROQ_QUICK_MODELS
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean)
  return Array.from(new Set(configured?.length ? configured : DEFAULT_GROQ_MODELS)).slice(0, 3)
}

function getQuickGeneratePrimaryProvider(): QuickGeneratePrimaryProvider {
  return process.env.QUICK_GENERATE_PRIMARY_PROVIDER?.trim().toLowerCase() === "openai"
    ? "openai"
    : "groq"
}

/**
 * Emergency-quality mode keeps one explicitly selected provider accountable
 * for a Quick batch. If it cannot produce a safe complete shortlist, the API
 * returns an honest retry rather than silently substituting a lower-quality
 * model. It is server-only and defaults off for backwards-compatible local
 * development; production promotion must set it deliberately.
 */
function isQuickGeneratePrimaryOnly(): boolean {
  return process.env.QUICK_GENERATE_PRIMARY_ONLY?.trim().toLowerCase() === "true"
}

/**
 * Groq exposes structured output capability per model, rather than per
 * endpoint. Qwen supports JSON Object Mode but not Groq's strict JSON Schema
 * mode; sending the latter produces a transport failure before the model can
 * contribute anything. The prompt and the local parser/admission gates remain
 * authoritative in JSON Object Mode, so this is a compatibility adjustment,
 * not a relaxation of the public quality contract.
 */
function requiresGroqJsonObjectMode(model: string): boolean {
  // GPT-OSS 120B advertises strict-schema support, but the production naming
  // contract asks for a large, diverse 24-record array. Groq can reject that
  // otherwise valid request with `failed_generation` while trying to satisfy
  // the schema internally. JSON Object Mode still guarantees valid JSON; the
  // prompt, parser, evidence replay, safety filters and batch quality gate
  // remain the authoritative contract.
  return model.startsWith("qwen/")
    || model.startsWith("openai/gpt-oss-")
    || model === "llama-3.3-70b-versatile"
}

function canUseOpenAIFallback(attempt: ProviderAttempt, deadlineAt: number): boolean {
  if (deadlineAt - Date.now() < OPENAI_MINIMUM_FALLBACK_WINDOW_MS) return false
  if (
    attempt.outcome === "missing_key"
    || attempt.outcome === "network_error"
    || attempt.outcome === "invalid_response"
    || attempt.outcome === "no_valid_names"
  ) {
    return true
  }
  if (attempt.outcome !== "http_error") return false
  return attempt.status === 429 || (typeof attempt.status === "number" && attempt.status >= 500 && attempt.status <= 599)
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function toLabel(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function extractJsonPayload(value: string): unknown | null {
  const direct = safeJsonParse(value)
  if (direct) return direct
  const objectStart = value.indexOf("{")
  const arrayStart = value.indexOf("[")
  const start = [objectStart, arrayStart].filter((index) => index >= 0).sort((left, right) => left - right)[0]
  if (start === undefined) return null
  const end = value[start] === "[" ? value.lastIndexOf("]") : value.lastIndexOf("}")
  return start >= 0 && end > start ? safeJsonParse(value.slice(start, end + 1)) : null
}

function normaliseProviderTerritoryId(value: unknown): ProviderTerritoryId | undefined {
  return PROVIDER_TERRITORY_IDS.includes(value as ProviderTerritoryId)
    ? (value as ProviderTerritoryId)
    : undefined
}

function normaliseProviderEvidenceMechanism(value: unknown): ProviderEvidenceMechanism | undefined {
  return PROVIDER_EVIDENCE_MECHANISMS.includes(value as ProviderEvidenceMechanism)
    ? (value as ProviderEvidenceMechanism)
    : undefined
}

function parseGroqCandidates(content: string): ParsedGroqCandidate[] {
  const parsed = extractJsonPayload(content)
  if (!parsed) return []

  const structuredCandidates: unknown[] | null = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as GroqNameResponse).candidates)
      ? ((parsed as GroqNameResponse).candidates as unknown[])
      : null
  if (structuredCandidates) {
    const seen = new Set<string>()
    return structuredCandidates.slice(0, 32).flatMap((entry) => {
      if (!entry || typeof entry !== "object") return []
      const candidate = entry as GroqCandidatePayload
      if (typeof candidate.name !== "string") return []
      const normalisedName = toLabel(candidate.name)
      if (!normalisedName || seen.has(normalisedName)) return []
      seen.add(normalisedName)
      const evidencePayload = Array.isArray(candidate.evidenceParts)
        ? candidate.evidenceParts
        : Array.isArray(candidate.visibleRoots)
          ? candidate.visibleRoots
          : candidate.sourceRoots
      const evidenceParts = Array.isArray(evidencePayload)
        ? Array.from(new Set(evidencePayload.filter((root): root is string => typeof root === "string").map(toLabel).filter(Boolean))).slice(0, 4)
        : []
      const mechanism = normaliseProviderEvidenceMechanism(candidate.mechanism)
      const territoryId = normaliseProviderTerritoryId(candidate.territoryId)
      return [{
        name: candidate.name,
        sourceRoots: evidenceParts,
        style: NAME_STYLES.includes(candidate.style as NameStyle) ? (candidate.style as NameStyle) : undefined,
        territoryId,
        mechanism,
        evidenceParts,
        contractCompliant: Boolean(
          territoryId
          && mechanism
          && Array.isArray(candidate.evidenceParts)
        ),
      }]
    })
  }

  // Backwards compatibility for cached/older model responses and tests.
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as GroqNameResponse).names)) {
    const legacyNames = (parsed as GroqNameResponse).names as unknown[]
    const seen = new Set<string>()
    return legacyNames.slice(0, 64).flatMap((rawName) => {
      if (typeof rawName !== "string") return []
      const compoundMarker = rawName.match(/^([a-z]{2,})\|([a-z]{2,})$/i)
      const alternateMarker = rawName.match(/^([a-z]{3,})>([a-z]{3,})$/i)
      const evidenceParts = compoundMarker
        ? [toLabel(compoundMarker[1]), toLabel(compoundMarker[2])]
        : alternateMarker
          ? [toLabel(alternateMarker[1])]
          : []
      const name = alternateMarker
        ? alternateMarker[2]
        : compoundMarker
          ? `${compoundMarker[1]}${compoundMarker[2]}`
          : rawName
      const normalisedName = toLabel(name)
      if (!normalisedName || seen.has(normalisedName)) return []
      seen.add(normalisedName)
      return [{
        name,
        sourceRoots: evidenceParts,
        ...(compoundMarker ? { mechanism: "visible_compound" as const } : {}),
        evidenceParts,
        // Delimiters are a private explicit-style morphology protocol. Auto
        // never accepts them, so a provider cannot smuggle claimed evidence
        // into the public default.
        contractCompliant: !compoundMarker && !alternateMarker,
      }]
    })
  }

  return []
}

/**
 * Selector review is provenance, not an authoring lane. Keep this parser
 * deliberately stricter than the ordinary provider parser: a selector must
 * return the requested number of distinct draft strings exactly as supplied.
 * Normalising here would let a provider rewrite a name while the public result
 * was incorrectly attributed to verbatim model review.
 */
function parseExactEditorialSelection(
  content: string,
  approvedDraftNames: readonly string[],
  expectedCount: number,
): string[] | null {
  const parsed = extractJsonPayload(content)
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null
  const rawNames = (parsed as GroqNameResponse).names
  if (!Array.isArray(rawNames) || rawNames.length !== expectedCount) return null
  if (!rawNames.every((name): name is string => typeof name === "string")) return null

  const approved = new Set(approvedDraftNames)
  const exactNames = rawNames as string[]
  if (new Set(exactNames).size !== expectedCount) return null
  if (exactNames.some((name) => !approved.has(name))) return null
  return exactNames
}

/** Provider roots are display evidence only when their boundary can be
 * replayed from the returned spelling. Abstract candidates therefore retain
 * an empty root list instead of laundering model-authored meaning into the
 * locally rendered rationale. */
function filterReplayableRoots(rawName: string, roots: readonly string[], approvedRoots: readonly string[]): string[] {
  const name = toLabel(rawName)
  const approved = new Set(approvedRoots.map(toLabel))
  return Array.from(new Set(roots.map(toLabel).filter((root) => (
    root.length >= 3
    && approved.has(root)
    && (name === root || name.startsWith(root) || name.endsWith(root))
  ))))
}

/** A provider may not turn a clipped brief word into local evidence. `budg`
 * visibly occurs in `budgcraft`, but it is still an unreviewed truncation of
 * `budget`. Exact reviewed roots remain valid (for example `fund` even when a
 * brief also contains `funding`). */
function hasTruncatedProviderEvidencePart(
  partValue: string,
  approvedRoots: readonly string[],
  description: string,
): boolean {
  const part = toLabel(partValue)
  if (part.length < 3) return false
  const approved = new Set(approvedRoots.map(toLabel).filter(Boolean))
  if (approved.has(part)) return false
  const briefRoots = Array.from(new Set([
    ...approved,
    ...extractQuickRoots(description).map(toLabel),
  ].filter(Boolean)))
  return briefRoots.some((root) => root.length > part.length && root.startsWith(part))
}

interface ReplayedProviderEvidence {
  sourceRoots: string[]
  evidence?: QuickCandidateEvidence
}

function replayProviderEvidence(
  entry: ParsedGroqCandidate,
  approvedRoots: readonly string[],
  description: string,
): ReplayedProviderEvidence | null {
  const name = toLabel(entry.name)

  // Cached pre-contract responses stay readable, but their claimed roots are
  // retained only when the returned spelling proves the boundary.
  if (!entry.mechanism) {
    const sourceRoots = filterReplayableRoots(name, entry.sourceRoots, approvedRoots)
    // The production names-only contract cannot assert semantic evidence, but
    // NamoLux can still recognize an exact word from its own brief-owned,
    // reviewed vocabulary. This is local evidence, never provider-authored
    // meaning, and lets strong words such as `cadence` compete honestly with
    // visible compounds while unrelated words remain context-only.
    if (
      sourceRoots.length === 0
      && isQuickCueOwnedSemanticWord(name, description)
    ) {
      return {
        sourceRoots,
        evidence: { kind: "semantic_word", source: name, cue: "generic" },
      }
    }
    return { sourceRoots }
  }

  const parts = entry.evidenceParts.map(toLabel).filter(Boolean)
  if (
    !isQuickReviewedContextCompound(name, description)
    && parts.some((part) => hasTruncatedProviderEvidencePart(part, approvedRoots, description))
  ) return null
  if (entry.mechanism === "abstract_sound") {
    return parts.length === 0 ? { sourceRoots: [] } : null
  }

  if (entry.mechanism === "visible_compound") {
    if (parts.length !== 2 || parts.some((part) => part.length < 2) || `${parts[0]}${parts[1]}` !== name) return null
    // The spelling itself replays this mechanism. Pass both exact parts into
    // local construction inference; they are never treated as model-authored
    // definitions or translations.
    return { sourceRoots: parts }
  }

  if (entry.mechanism === "semantic_word") {
    if (parts.length !== 1 || parts[0] !== name) return null
    // The cue-specific semantic bank is itself NamoLux's reviewed association
    // for this exact surface and brief. It does not need a duplicate entry in
    // the global rationale table. A provider cannot extend that vocabulary or
    // lend a word from one category to another: anything outside this brief's
    // cue remains an unevidenced exploration candidate.
    if (!isQuickCueOwnedSemanticWord(name, description)) return { sourceRoots: [] }
    return {
      sourceRoots: [],
      evidence: { kind: "semantic_word", source: name, cue: "generic" },
    }
  }

  if (entry.mechanism === "locale_form") {
    if (!isVerifiedQuickLocaleCandidate(name, description)) return null
    if (parts.length > 1 || (parts.length === 1 && parts[0] !== name)) return null
    return { sourceRoots: filterReplayableRoots(name, entry.sourceRoots, approvedRoots) }
  }

  return null
}

function getProviderFamilyFingerprints(candidate: QuickCandidate, description?: string): string[] {
  const fingerprints = new Set<string>()
  const name = candidate.name
  for (const family of getQuickVisibleFamilies(candidate)) fingerprints.add(`root:${family}`)
  for (const part of candidate.constructionParts || []) {
    if (part.length >= 2) fingerprints.add(`part:${part}`)
  }
  if (candidate.evidence?.kind === "semantic_word") {
    const source = toLabel(candidate.evidence.source)
    if (source.length >= 2) fingerprints.add(`part:${source}`)
  }
  for (const affix of PROVIDER_TEMPLATE_AFFIXES) {
    if (name.length <= affix.length + 2) continue
    if (name.startsWith(affix)) fingerprints.add(`head:${affix}`)
    if (name.endsWith(affix)) fingerprints.add(`tail:${affix}`)
  }
  if (name.length >= 8) {
    fingerprints.add(`head4:${name.slice(0, 4)}`)
    fingerprints.add(`tail4:${name.slice(-4)}`)
  }
  if (description && requiresQuickPrimaryConceptEvidence(description)) {
    for (const rawRoot of getQuickPrimaryIntent(description)?.roots || []) {
      const root = toLabel(rawRoot)
      const variants = new Set([root])
      if (root.endsWith("ies") && root.length >= 5) variants.add(`${root.slice(0, -3)}y`)
      else if (root.endsWith("es") && root.length >= 5) variants.add(root.slice(0, -2))
      else if (root.endsWith("s") && root.length >= 4) variants.add(root.slice(0, -1))
      if ([...variants].some((variant) => (
        variant.length >= 3
        && (name === variant || name.startsWith(variant) || name.endsWith(variant))
      ))) {
        fingerprints.add(`primary:${root}`)
      }
    }
  }
  if (description) {
    const reviewedSurfaceTerms = new Set([
      ...extractQuickRoots(description),
      ...getQuickConceptRoots(description),
      ...getQuickAutoPromptAnchors(description),
    ].map(toLabel))
    for (const rawTerm of reviewedSurfaceTerms) {
      const variants = new Set([rawTerm])
      if (rawTerm.endsWith("ies") && rawTerm.length >= 5) variants.add(`${rawTerm.slice(0, -3)}y`)
      else if (rawTerm.endsWith("es") && rawTerm.length >= 5) variants.add(rawTerm.slice(0, -2))
      else if (rawTerm.endsWith("s") && rawTerm.length >= 4) variants.add(rawTerm.slice(0, -1))
      for (const term of variants) {
        // Three-character fragments such as `car` or `art` are too broad for
        // substring family matching. Strict primary roots retain their
        // dedicated, reviewed matcher above; general context starts at four.
        if (
          term.length >= 4
          && (name === term || name.startsWith(term) || name.endsWith(term))
        ) fingerprints.add(`context:${term}`)
      }
    }
  }
  return [...fingerprints]
}

function isWeakEditorialDraft(
  candidate: Pick<QuickCandidate, "name" | "fitRoots" | "constructionParts" | "evidence">,
  description: string,
): boolean {
  const cue = getQuickPrimaryIntent(description)?.cue
  if (!cue) return false
  if (WEAK_EDITORIAL_DRAFT_NAMES[cue]?.has(candidate.name)) return true
  if (WEAK_EDITORIAL_DRAFT_PATTERNS[cue]?.some((pattern) => pattern.test(candidate.name))) return true

  const constructionParts = candidate.constructionParts || []
  if (constructionParts.length !== 2) return false
  const reviewedContextCompound = isQuickReviewedContextCompound(candidate.name, description)
  if (
    (candidate.fitRoots?.length || 0) === 0
    && !candidate.evidence
    && !reviewedContextCompound
  ) return true

  const [lead, remainder] = constructionParts.map(toLabel)
  if (!GENERIC_EDITORIAL_PHRASE_LEADS.has(lead) || reviewedContextCompound) return false
  return !(candidate.fitRoots || []).some((root) => {
    const label = toLabel(root)
    return label === remainder || (label.length >= 4 && remainder.includes(label))
  })
}

function isWeakAiName(rawName: string): boolean {
  const name = toLabel(rawName)
  if (WEAK_AI_EXACT_NAMES.has(name)) return true
  if (WEAK_AI_FRAGMENTS.some((fragment) => name.includes(fragment))) return true
  if (/^(product|solutio|climax)/.test(name)) return true
  if (/^(law|priv)(zen|io|ify|ly|ova|ora|iva|nexa)$/.test(name)) return true
  if (["zone", "plus", "link"].some((suffix) => name.endsWith(suffix) && name.length <= 9)) return true
  if (/^anal(?!ytics)/.test(name) || /(yl|yb|bu)$/.test(name)) return true
  if (/(craf|groc|nur|monit)$/.test(name) || /x$/.test(name)) return true
  if (/sch$/.test(name) && !name.includes("sched")) return true
  if (/(.)\1{2,}/.test(name) || /^[a-z]{3,5}(ixo|ixi|ixa|xio|zine)$/.test(name)) return true
  return false
}

function buildDefensibleAlternateSurfaces(sourceValue: string): Set<string> {
  const source = toLabel(sourceValue)
  const surfaces = new Set<string>()
  if (!source) return surfaces
  const transforms = [
    (value: string) => value.includes("ph") ? value.replaceAll("ph", "f") : "",
    (value: string) => value.includes("ck") ? value.replaceAll("ck", "k") : "",
    (value: string) => value.endsWith("ic") ? `${value.slice(0, -1)}k` : "",
    (value: string) => /c(?=[aou])/.test(value) ? value.replace(/c(?=[aou])/g, "k") : "",
    (value: string) => /c(?=[eiy])/.test(value) ? value.replace(/c(?=[eiy])/g, "s") : "",
    (value: string) => value.includes("ie") ? value.replace("ie", "y") : "",
    (value: string) => value.includes("ie") ? value.replace("ie", "ee") : "",
    (value: string) => value.includes("dg") ? value.replace("dg", "dj") : "",
    (value: string) => value.includes("oo") ? value.replace("oo", "u") : "",
    (value: string) => /s$/.test(value) ? `${value.slice(0, -1)}z` : "",
    (value: string) => /i(?=[bcdfghjklmnpqrstvwxyz])/.test(value)
      ? value.replace(/i(?=[bcdfghjklmnpqrstvwxyz])/, "y")
      : "",
    (value: string) => value.includes("au") ? value.replace("au", "a") : "",
    (value: string) => value.includes("gua") ? value.replace("gua", "ga") : "",
    (value: string) => /a[bcdfghjklmnpqrstvwxyz]e$/.test(value)
      ? value.replace(/a([bcdfghjklmnpqrstvwxyz])e$/, "ai$1")
      : "",
    (value: string) => /s(?=[aeiou]$)/.test(value) ? value.replace(/s(?=[aeiou]$)/, "z") : "",
  ]
  let frontier = new Set([source])
  // At most two familiar substitutions may be combined (books -> bukz).
  // This remains a small replayable set, not an edit-distance loophole.
  for (let round = 0; round < 2; round += 1) {
    const next = new Set<string>()
    for (const value of frontier) {
      for (const transform of transforms) {
        const transformed = transform(value)
        if (!transformed || transformed === source || transformed.length < QUICK_MIN_NAME_LENGTH) continue
        surfaces.add(transformed)
        next.add(transformed)
      }
    }
    frontier = next
  }
  return surfaces
}

function isDefensibleModelAlternate(
  name: string,
  description: string,
  approvedRoots: readonly string[],
  claimedSources: readonly string[] = [],
): boolean {
  const locallyApproved = new Set([...extractQuickRoots(description), ...approvedRoots].map(toLabel))
  const replayableClaims = claimedSources.map(toLabel).filter((source) => locallyApproved.has(source))
  const sources = Array.from(new Set([...locallyApproved, ...replayableClaims]))
  return sources.some((source) => {
    if (source.length < 4 || source === name) return false
    return buildDefensibleAlternateSurfaces(source).has(name)
  })
}

function hasTruthfulModelStyle(
  entry: ParsedGroqCandidate,
  candidate: QuickCandidate,
  context: { description: string; approvedRoots: readonly string[]; requestedStyle: QuickGenerateStyle },
): boolean {
  const partCount = candidate.constructionParts?.length || 0
  const effectiveStyle = context.requestedStyle === "auto" ? entry.style : context.requestedStyle
  // Auto treats locally visible construction as the authority. A model may
  // call `fundgo` Brandable or Evocative, but the exact `fund` + `go` boundary
  // makes it a Compound. Explicit controls remain promises and reject any
  // disagreement instead of silently relabelling it.
  if (context.requestedStyle !== "auto" && entry.style && entry.style !== candidate.style) return false
  if (context.requestedStyle === "auto" && partCount === 2) return true
  if (effectiveStyle === "alternate_spelling") {
    return isDefensibleModelAlternate(candidate.name, context.description, context.approvedRoots, entry.sourceRoots)
  }
  if (effectiveStyle === "real_word") {
    return partCount === 0 && candidate.name !== "shyne"
  }
  if (effectiveStyle === "compound" || effectiveStyle === "short_phrase") return partCount === 2
  if (effectiveStyle === "evocative") return partCount === 0
  if (effectiveStyle === "non_english") return isVerifiedQuickLocaleCandidate(candidate.name, context.description)
  return true
}

function getCleanRhymeWords(value: string | undefined): string[] {
  if (!value) return []
  const words = value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length >= 3)
  const whole = toLabel(value)
  return Array.from(new Set([whole, ...words].filter((word) => word.length >= 3)))
}

function mergeCandidates(
  primary: QuickCandidate[],
  fallback: QuickCandidate[],
  count: number,
  input: Partial<Pick<QuickGenerateInput, "style" | "creativity" | "preferences" | "description">>
    & { reviewedModelBatch?: boolean } = {},
): QuickCandidate[] {
  const merged: QuickCandidate[] = []
  const names = new Set<string>()
  const prefixCounts = new Map<string, number>()
  const suffixCounts = new Map<string, number>()
  const compoundSignatures = new Set<string>()
  const familyCounts = new Map<string, number>()
  const editorialTemplatePartCounts = new Map<string, number>()
  const styleCounts = new Map<NameStyle, number>()
  const requestedStyle = normaliseStyle(input.style)
  const localeMinimum = requestedStyle === "auto" && input.description
    ? (getQuickLocalePolicy(input.description)?.minimumAutoCandidates || 0)
    : 0
  const maxUnevidenced = requestedStyle === "auto"
    ? input.reviewedModelBatch
      ? AUTO_REVIEWED_UNEVIDENCED_CANDIDATE_LIMIT
      : AUTO_UNEVIDENCED_MODEL_CANDIDATE_LIMIT
    : Number.POSITIVE_INFINITY
  const enforceReviewedFamilyDiversity = requestedStyle === "auto"
    && input.reviewedModelBatch === true
  const enforcePrimaryIntent = requestedStyle === "auto"
    && input.reviewedModelBatch === true
    && Boolean(input.description && requiresQuickPrimaryConceptEvidence(input.description))
  const valueFacet = enforceReviewedFamilyDiversity && input.description
    ? getQuickValueFacet(input.description)
    : null
  const valueFacetMinimum = valueFacet?.minimumAutoCandidates || 0
  const candidateLengthCeiling = [...primary, ...fallback].reduce(
    (maximum, candidate) => Math.max(maximum, candidate.name.length),
    0,
  )
  const primaryCue = input.description
    ? getQuickPrimaryIntent(input.description)?.cue
    : null
  const reviewedSemanticWordLimit = input.description && getQuickReviewedEditorialPortfolio(input.description)
    ? 10
    : primaryCue === "rural telehealth reach"
    ? 10
    : primaryCue === "climate startup marketing" && candidateLengthCeiling <= 8
      ? 12
    : candidateLengthCeiling <= 6
      ? 12
      : candidateLengthCeiling <= 8
      ? 10
      : input.description && (
        /\brecycled[- ]gold\b/.test(input.description.toLowerCase())
        || primaryCue === "circular textile renewal"
        || primaryCue === "private teen emotional support"
        || primaryCue === "small-business contract review"
      )
        ? 8
        : AUTO_REVIEWED_SEMANTIC_WORD_CANDIDATE_LIMIT
  let unevidencedCount = 0
  let nonPrimaryIntentCount = 0
  let reviewedSemanticWordCount = 0
  let weakEditorialLiteralCount = 0
  let valueFacetIntersectionCount = 0
  // An explicit style control is a product promise, not a ranking hint. Never
  // fill its page with other construction metadata merely to reach sixteen.
  // In Auto, validated primary/model candidates are the creative ranking.
  // Deterministic quotas only shape the fallback supply that fills remaining
  // slots; they must not interleave fallback names ahead of provider output.
  const primaryPool = requestedStyle === "auto"
    ? primary
    : primary.filter((candidate) => candidate.style === requestedStyle)
  const fallbackPool = requestedStyle === "auto"
    ? fallback
    : fallback.filter((candidate) => candidate.style === requestedStyle)
  const stylePlan = buildQuickStylePlan(input, count)

  const add = (
    candidate: QuickCandidate | undefined,
    relaxSurfaceDiversity = false,
    reserveLocaleSlots = false,
    modelCandidate = false,
  ) => {
    if (!candidate) return false
    if (names.has(candidate.name)) return false
    const unevidenced = (candidate.fitRoots?.length || 0) === 0
      && !candidate.evidence
      && !candidate.constructionParts?.length
    const missesPrimaryIntent = Boolean(
      enforcePrimaryIntent
      && input.description
      && !hasQuickPrimaryConceptEvidence(candidate, input.description),
    )
    const valueFacetIntersection = Boolean(
      valueFacet
      && input.description
      && hasQuickValueFacetIntersection(candidate, input.description),
    )
    const weakEditorialLiteral = Boolean(
      enforceReviewedFamilyDiversity
      && input.description
      && isWeakEditorialDraft(candidate, input.description),
    )
    const verifiedLocale = Boolean(
      input.description && isVerifiedQuickLocaleCandidate(candidate.name, input.description),
    )
    const ordinaryStyleHardCap = candidate.style === "non_english"
      ? Math.max(AUTO_STYLE_HARD_CAPS.non_english, localeMinimum)
      : AUTO_STYLE_HARD_CAPS[candidate.style]
    const styleHardCap = requestedStyle === "auto"
      && modelCandidate
      && (unevidenced || input.reviewedModelBatch)
      ? Math.max(ordinaryStyleHardCap, AUTO_UNEVIDENCED_MODEL_CANDIDATE_LIMIT)
      : ordinaryStyleHardCap
    if (requestedStyle === "auto" && (styleCounts.get(candidate.style) || 0) >= styleHardCap) return false
    if (unevidenced && unevidencedCount >= maxUnevidenced) return false
    if (missesPrimaryIntent && nonPrimaryIntentCount >= AUTO_NON_PRIMARY_EDITORIAL_CANDIDATE_LIMIT) return false
    if (
      enforceReviewedFamilyDiversity
      && candidate.evidence?.kind === "semantic_word"
      && reviewedSemanticWordCount >= reviewedSemanticWordLimit
    ) return false
    if (
      weakEditorialLiteral
      && weakEditorialLiteralCount >= AUTO_REVIEWED_WEAK_LITERAL_CANDIDATE_LIMIT
    ) return false
    if (reserveLocaleSlots && requestedStyle === "auto" && candidate.style !== "non_english") {
      const localeStillNeeded = Math.max(0, localeMinimum - (styleCounts.get("non_english") || 0))
      const remainingSlots = count - merged.length
      if (remainingSlots <= localeStillNeeded) return false
    }
    if (reserveLocaleSlots && valueFacetMinimum > 0 && !valueFacetIntersection) {
      const facetStillNeeded = Math.max(0, valueFacetMinimum - valueFacetIntersectionCount)
      const remainingSlots = count - merged.length
      if (remainingSlots <= facetStillNeeded) return false
    }
    const prefix = candidate.name.slice(0, 4)
    const suffix = candidate.name.slice(-4)
    const compoundSignature = getQuickCompoundSignature(candidate)
    const editorialTemplateParts = Array.from(new Set(
      enforceReviewedFamilyDiversity && primaryCue
        ? (candidate.constructionParts || [])
            .map(toLabel)
            .filter((part) => EDITORIAL_REPEATED_TEMPLATE_PARTS[primaryCue]?.has(part))
        : [],
    ))
    const families = Array.from(new Set(
      enforceReviewedFamilyDiversity && input.description
        ? getProviderFamilyFingerprints(candidate, input.description).filter(
            (fingerprint) => (
              fingerprint.startsWith("root:")
              || fingerprint.startsWith("primary:")
              || fingerprint.startsWith("context:")
            ),
          )
        : getQuickVisibleFamilies(candidate),
    ))
    const expandedReviewedFamily = enforceReviewedFamilyDiversity
      && Boolean(
        verifiedLocale
        || (input.description && /\brecycled[- ]gold\b/.test(input.description.toLowerCase()))
        || primaryCue === "rural telehealth reach"
        || primaryCue === "locally guided conservation travel"
      )
    const reviewedContextFamily = enforceReviewedFamilyDiversity
      && Boolean(input.description && isQuickReviewedContextCompound(candidate.name, input.description))
    const familyLimit = enforceReviewedFamilyDiversity
      ? verifiedLocale ? Math.max(4, localeMinimum) : expandedReviewedFamily || reviewedContextFamily ? 4 : 2
      : 4
    // Primary model names and deterministic candidates share this one merge,
    // so near-spelling, phonetic and reversible-construction collisions must
    // be checked across the combined shortlist rather than only within the
    // provider's response.
    if (!verifiedLocale && getQuickBatchCollision(candidate, merged)) return false
    if (compoundSignature && compoundSignatures.has(compoundSignature)) return false
    if (editorialTemplateParts.some(
      (part) => (editorialTemplatePartCounts.get(part) || 0) >= AUTO_REVIEWED_TEMPLATE_PART_LIMIT,
    )) return false
    if (
      (!relaxSurfaceDiversity || enforceReviewedFamilyDiversity)
      && !verifiedLocale
      && families.some((family) => (familyCounts.get(family) || 0) >= familyLimit)
    ) return false
    if (!relaxSurfaceDiversity && ((prefixCounts.get(prefix) || 0) >= 3 || (suffixCounts.get(suffix) || 0) >= 3)) return false
    names.add(candidate.name)
    styleCounts.set(candidate.style, (styleCounts.get(candidate.style) || 0) + 1)
    prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1)
    suffixCounts.set(suffix, (suffixCounts.get(suffix) || 0) + 1)
    if (compoundSignature) compoundSignatures.add(compoundSignature)
    editorialTemplateParts.forEach((part) => (
      editorialTemplatePartCounts.set(part, (editorialTemplatePartCounts.get(part) || 0) + 1)
    ))
    families.forEach((family) => familyCounts.set(family, (familyCounts.get(family) || 0) + 1))
    merged.push(candidate)
    if (unevidenced) unevidencedCount += 1
    if (missesPrimaryIntent) nonPrimaryIntentCount += 1
    if (candidate.evidence?.kind === "semantic_word") reviewedSemanticWordCount += 1
    if (weakEditorialLiteral) weakEditorialLiteralCount += 1
    if (valueFacetIntersection) valueFacetIntersectionCount += 1
    return true
  }

  const takeStyle = (
    pool: readonly QuickCandidate[],
    desiredStyle: NameStyle,
    relaxSurfaceDiversity = false,
  ): boolean => {
    // A rejected mirror/family collision must not starve every later candidate
    // in the same style slot. Walk the whole safe pool until one is admitted.
    for (const candidate of pool) {
      if (candidate.style !== desiredStyle || names.has(candidate.name)) continue
      if (add(candidate, relaxSurfaceDiversity)) return true
    }
    return false
  }

  // Provider order is the default result order. Surface-family limits are a
  // soft presentation constraint, so retry the same candidate immediately
  // with only those limits relaxed. Hard style/evidence/locale/mirror gates
  // remain active in both attempts.
  for (const candidate of primaryPool) {
    if (!add(candidate, false, true, true)) add(candidate, true, true, true)
    if (merged.length >= count) break
  }
  if (merged.length >= count) return merged

  while (
    requestedStyle === "auto"
    && (styleCounts.get("non_english") || 0) < localeMinimum
    && takeStyle(fallbackPool, "non_english", true)
  ) {
    // Reviewed locale forms are a brief-specific product requirement, not a
    // generic diversity preference. Reserve their slots before Auto fills the
    // remaining mixed-style plan.
  }

  // Primary candidates satisfy matching quota slots. Walk the plan only to
  // identify missing construction families in deterministic fallback supply.
  const plannedStyleSlots = new Map<NameStyle, number>()
  for (const desiredStyle of stylePlan) {
    const plannedCount = (plannedStyleSlots.get(desiredStyle) || 0) + 1
    plannedStyleSlots.set(desiredStyle, plannedCount)
    if ((styleCounts.get(desiredStyle) || 0) < plannedCount) {
      takeStyle(fallbackPool, desiredStyle)
    }
    if (merged.length >= count) break
  }

  for (const candidate of fallbackPool) {
    add(candidate)
    if (merged.length >= count) break
  }

  // Prefix/family repetition are soft presentation constraints. If the safe
  // pool can fulfil the request, retry with those two constraints relaxed.
  // Style caps, evidence limits and mirror dedupe remain hard in every pass.
  if (merged.length < count) {
    for (const candidate of fallbackPool) {
      add(candidate, true)
      if (merged.length >= count) break
    }
  }

  return merged
}

function buildDeterministicFallback(input: QuickGenerateInput, count: number): QuickCandidate[] {
  const primary = generateQuickCandidates({ ...input, count })
  if (primary.length >= count) return primary

  const alternate = generateQuickCandidates({
    ...input,
    rhymeWith: input.rhymeWith ? "" : input.rhymeWith,
    count,
    seed: `${input.seed || input.description}|fallback-expansion`,
  })
  return mergeCandidates(primary, alternate, count, input)
}

function rankEditorialPrivateDrafts(
  candidates: readonly QuickCandidate[],
  description: string,
): QuickCandidate[] {
  const semanticOrder = new Map(
    getQuickAutoPromptAnchors(description).map((term, index) => [toLabel(term), index]),
  )
  const locale: QuickCandidate[] = []
  const semantic: QuickCandidate[] = []
  const reviewedCompounds: QuickCandidate[] = []
  const grounded: QuickCandidate[] = []
  const exploratory: QuickCandidate[] = []

  for (const candidate of candidates) {
    if (isVerifiedQuickLocaleCandidate(candidate.name, description)) {
      locale.push(candidate)
    } else if (candidate.evidence?.kind === "semantic_word") {
      semantic.push(candidate)
    } else if (isQuickReviewedContextCompound(candidate.name, description)) {
      reviewedCompounds.push(candidate)
    } else if (
      (candidate.fitRoots?.length || 0) > 0
      || candidate.evidence
      || candidate.constructionParts?.length
    ) {
      grounded.push(candidate)
    } else {
      exploratory.push(candidate)
    }
  }

  semantic.sort((left, right) => (
    (semanticOrder.get(toLabel(left.evidence?.kind === "semantic_word" ? left.evidence.source : left.name)) ?? 999)
    - (semanticOrder.get(toLabel(right.evidence?.kind === "semantic_word" ? right.evidence.source : right.name)) ?? 999)
  ))

  // Evidence breadth is not shortlist rank. Interleave the strongest reviewed
  // whole words with manually reviewed compounds and other grounded forms so
  // recovery cannot publish an eight-name thesaurus wall followed by joins.
  const candidateLengthCeiling = candidates.reduce(
    (maximum, candidate) => Math.max(maximum, candidate.name.length),
    0,
  )
  const primaryCue = getQuickPrimaryIntent(description)?.cue
  const heroSemanticLimit = getQuickReviewedEditorialPortfolio(description)
    ? 10
    : primaryCue === "rural telehealth reach"
    ? 10
    : primaryCue === "climate startup marketing" && candidateLengthCeiling <= 8
      ? 12
    : primaryCue === "circular textile renewal"
      || primaryCue === "private teen emotional support"
      || primaryCue === "small-business contract review"
      ? 8
      : candidateLengthCeiling <= 6
      ? 12
      : candidateLengthCeiling <= 8
        ? 10
        : AUTO_REVIEWED_SEMANTIC_WORD_CANDIDATE_LIMIT
  const heroSemantic = semantic.slice(0, heroSemanticLimit)
  const editorialLanes: QuickCandidate[][] = locale.length > 0
    ? [
        locale.slice(0, 2),
        heroSemantic,
        reviewedCompounds,
        locale.slice(2),
      ]
    : [heroSemantic, reviewedCompounds]
  const interleaved: QuickCandidate[] = []
  for (let laneIndex = 0; editorialLanes.some((lane) => laneIndex < lane.length); laneIndex += 1) {
    for (const lane of editorialLanes) {
      const candidate = lane[laneIndex]
      if (candidate) interleaved.push(candidate)
    }
  }

  // The 32-draft selector pool needs a small whole-word reserve after the
  // hero lane. Without it, ordinary root compounds filled the cap before
  // collision alternatives such as journal/accrual could enter the pool,
  // leaving an otherwise rich accounting workshop one publishable name short.
  const semanticReserve = semantic.slice(heroSemanticLimit, heroSemanticLimit + 4)
  const editorialCore = [...interleaved, ...semanticReserve]
  const residual = [
    ...grounded,
    ...semantic.slice(heroSemanticLimit + semanticReserve.length),
    ...exploratory,
  ]
  // Weakness is a shortlist rank, not only a publication cap. Partition each
  // editorial tier so stronger reviewed directions lead, while the selector
  // still sees a small weak reserve before ordinary combinatorial compounds.
  // A single global partition let low-value root matrices displace reviewed
  // whole words from the finite 32-draft window.
  const ranked = [
    ...editorialCore.filter((candidate) => !isWeakEditorialDraft(candidate, description)),
    ...editorialCore.filter((candidate) => isWeakEditorialDraft(candidate, description)),
    ...residual.filter((candidate) => !isWeakEditorialDraft(candidate, description)),
    ...residual.filter((candidate) => isWeakEditorialDraft(candidate, description)),
  ]
  const portfolio = getQuickReviewedEditorialPortfolio(description)
  if (!portfolio) return ranked

  const portfolioOrder = new Map(
    [...portfolio.primary, ...portfolio.reserves].map((name, index) => [toLabel(name), index]),
  )
  const originalOrder = new Map(ranked.map((candidate, index) => [candidate.name, index]))
  return [...ranked].sort((left, right) => (
    (portfolioOrder.get(left.name) ?? Number.POSITIVE_INFINITY)
    - (portfolioOrder.get(right.name) ?? Number.POSITIVE_INFINITY)
    || (originalOrder.get(left.name) || 0) - (originalOrder.get(right.name) || 0)
  ))
}

function buildPrompt(
  input: Required<Pick<QuickGenerateInput, "description" | "vibe" | "maxChars" | "count" | "style" | "creativity">>
    & Pick<QuickGenerateInput, "rhymeWith" | "blacklist" | "preferences">,
) {
  if (input.style === "auto") {
    return buildQuickAutoMessages({ ...input, style: "auto" })
  }

  const rhymeWords = getCleanRhymeWords(input.rhymeWith)
  const approvedThemes = getQuickConceptRoots(input.description).slice(0, 8)
  const verifiedLocaleForms = input.style === "non_english"
    ? (getQuickLocalePolicy(input.description)?.forms || [])
        .map(toLabel)
        .filter((form) => form.length <= input.maxChars)
        .slice(0, 32)
    : []
  const rhymeRule = rhymeWords.length
    ? `Sound reference is inspiration only; never include: ${rhymeWords.join(", ")}.`
    : null
  const stylePlan = buildQuickStylePlan(input, input.count)
  const blacklist = (input.blacklist || []).map(toLabel).filter((word) => word.length >= 2).slice(0, 20)
  const preferenceCopy = {
    likedStyles: input.preferences?.likedStyles?.filter((style) => NAME_STYLES.includes(style)).slice(0, 4) || [],
    dislikedStyles: input.preferences?.dislikedStyles?.filter((style) => NAME_STYLES.includes(style)).slice(0, 4) || [],
    preferredLength: input.preferences?.preferredLength || null,
    preferredSounds: input.preferences?.preferredSounds?.map(toLabel).filter(Boolean).slice(0, 4) || [],
    avoidedSounds: input.preferences?.avoidedSounds?.map(toLabel).filter(Boolean).slice(0, 4) || [],
  }
  const creativeLens = CREATIVE_LENSES[
    stableHash(`${input.description}|${input.vibe}|${input.style}|${input.creativity}`) % CREATIVE_LENSES.length
  ]
  const lengthRule = `${Math.max(QUICK_MIN_NAME_LENGTH, input.maxChars - 6)}-${input.maxChars} lowercase letters`
  const explicitStyleGuidance: Readonly<Record<Exclude<QuickGenerateStyle, "auto">, string>> = {
    brandable: "Use clean coined words with complete syllables. Do not disguise a literal two-word compound as a coinage.",
    evocative: "Use non-literal images, feelings, rituals or metaphors specific to the brief. Do not return a visible two-word compound.",
    compound: "Join exactly two complete familiar words in natural order. Both boundaries must be obvious in the final spelling.",
    alternate_spelling: "Use an intentional phonetic respelling of a brief-relevant complete word while preserving every spoken syllable; never clip.",
    real_word: "Use complete dictionary words as surprising, defensible metaphors. Do not return bare categories, features or invented spellings.",
    short_phrase: "Use a compact, natural modifier-plus-noun phrase whose two complete word boundaries remain obvious.",
    non_english: "Use only defensible forms from a language or locale explicitly present in the brief. Do not invent translations or mix a locale token with generic English filler.",
  }
  const morphologyProtocol = input.style === "compound" || input.style === "short_phrase"
    ? "For every name, preserve its two complete word boundaries as left|right inside the private JSON string (example: quiet|ledger). The separator is verification metadata and is removed before display."
    : input.style === "alternate_spelling"
      ? "For every name, return source>spelling inside the private JSON string. Source must be a complete approvedThemes word. Use only these replayable phonetic patterns where applicable: guard>gard, shield>sheeld, vault>valt, secure>sekure, cyber>syber, ledger>ledjer, books>buks, filing>fyling, frame>fraim, muse>muze, craft>kraft, photo>foto, metric>metrik. The separator and source are removed before display."
      : null
  const outputExample = input.style === "compound" || input.style === "short_phrase"
    ? "left|right"
    : input.style === "alternate_spelling"
      ? "source>spelling"
      : "lowercase"
  const explicitRules = [
    `Return exactly ${input.count} distinct names, strongest first; never pad with a weak option.`,
    "Return one compact JSON object with a names array and no other fields, prose, Markdown or explanations.",
    `Displayed name surfaces use lowercase letters only, no digits/TLD, ${lengthRule}; only the requested private morphology separator may appear in JSON.`,
    `Every candidate must visibly and honestly satisfy the requested ${input.style} style. Use this requested construction throughout: ${stylePlan.join(", ")}.`,
    explicitStyleGuidance[input.style],
    ...(input.style === "non_english"
      ? [`Return only exact entries from verifiedLocaleForms. Do not translate, inflect, combine or respell them. At least ${Math.min(8, verifiedLocaleForms.length)} unique verified forms are required.`]
      : []),
    ...(morphologyProtocol ? [morphologyProtocol] : []),
    `Creativity ${input.creativity}; abstract names do not need a visible theme.`,
    "Privately test every candidate for natural speech, memorability, brief specificity and distinctiveness before returning it.",
    "Use any visible head, tail or sound family at most twice. Never return reversals or one repeated template with swapped roots.",
    "Return no rationale, meaning, translation or free text. NamoLux builds explanations locally from reviewed evidence.",
    "Use natural word order, complete pronounceable forms and intentional spellings; reject generic, awkward, unsafe, famous, clipped or mechanically joined options.",
    ...(blacklist.length ? [`Never include blocked terms: ${blacklist.join(", ")}.`] : []),
    ...(rhymeRule ? [rhymeRule] : []),
  ]
  const compactPayload = {
    task: "Create an investor-ready shortlist in the requested naming style. Return JSON only.",
    outputShape: {
      names: [outputExample],
    },
    rules: explicitRules,
    userInput: {
      description: input.description,
      vibe: input.vibe,
      style: input.style,
      creativity: input.creativity,
      maxChars: input.maxChars,
      ...(input.rhymeWith ? { rhymeWith: input.rhymeWith } : {}),
      ...(input.preferences ? { preferences: preferenceCopy } : {}),
      approvedThemes,
      ...(verifiedLocaleForms.length ? { verifiedLocaleForms } : {}),
      creativeLens,
    },
  }

  return [
    {
      role: "system",
      content: "You are NamoLux's senior naming director. Build a broad private longlist before answering. Select for brief-specific distinctiveness and naturalness, not literal category clarity. Reject bare category or feature words, familiar startup metaphors, and novelty created only by suffixes or misspelling. Follow the strict JSON schema and never output rationale.",
    },
    {
      role: "user",
      content: JSON.stringify(compactPayload),
      /* Previous verbose prompt retained temporarily for audit comparison.
        task: "Act as a rigorous senior brand namer. Return the full requested set as valid JSON only.",
        outputShape: {
          candidates: [
            {
              name: "lowercase",
              style: "NameStyle",
              sourceRoots: ["approved theme"],
            },
          ],
        },
        rules: [
          "Return JSON only.",
          `Return ${Math.min(20, input.count)} distinct candidate objects; never pad the list with a weak option.`,
          `Each name must use lowercase letters only (no digits) and contain ${Math.max(QUICK_MIN_NAME_LENGTH, input.maxChars - 6)}-${input.maxChars} characters.`,
          `Follow this construction mix in order where quality allows: ${stylePlan.join(", ")}.`,
          `Creativity is ${input.creativity}: direct stays recognisable, balanced mixes clarity and invention, exploratory may use stronger metaphor and coined forms.`,
          "A name may be abstract and does not need to contain an approved theme visibly.",
          "Every sourceRoots item must come from approvedThemes and reflect real semantic inspiration, not a fabricated spelling claim.",
          "Do not return rationale, meaning, translation, etymology or explanation fields; NamoLux builds explanations locally from verified evidence.",
          "Use Non-English only when the user supplied a language or locale and the name contains a defensible root from that context.",
          "In Auto, label a defensible Welsh, Cymru, French or Quebec-root construction as non_english even when it joins that root to another readable word.",
          "Style metadata must describe the visible construction: a literal two-part label is never evocative or real_word.",
          "Never join synonyms, translations or redundant role words (for example cold+chill, gold+gilt, cat+feline, mother+mama or give+giving).",
          "Prefer natural English word order and avoid mechanically reversing the same two roots.",
          "Do not claim domain availability, trademark safety, uniqueness, a score, or guaranteed business outcomes.",
          "Use complete readable words or established morphemes. Never clip a word merely to satisfy the character limit.",
          "Never delete a final or interior vowel to make an incomplete stem (circle→circl, planner→plannr, invoice→invo), append an arbitrary vowel, or use texting/leetspeak.",
          "Alternate spelling must be an intentional pronounceable substitution that preserves every syllable (for example sonic→sonik), never simple truncation.",
          "A Real Word direction must be a complete evocative dictionary word, not a bare category, location, audience or input keyword.",
          "Reject spelling collisions, duplicated fragments, keyboard patterns, stutters, missing-vowel fragments, and typo-like blends.",
          "No famous brands or close variants. No random x/z/q endings and no fake-Latin endings such as ora, ova, ara, ava, ix, or ium.",
          "Avoid generic filler and shallow keyword-plus-app, plus, zone, link, online, web, site, io, ify, or ly constructions.",
          "Vary the roots and name structures so the first page does not look like one repeated family.",
          `Use ${creativeLens} as this brief's creative tie-breaker so abstract directions are not generic defaults reusable across unrelated categories.`,
          `Never return these known overused model defaults: ${[...WEAK_AI_EXACT_NAMES].slice(-20).join(", ")}.`,
          blacklist.length ? `Never return a name containing any of these user-blocked terms: ${blacklist.join(", ")}.` : "No user blacklist was supplied.",
          rhymeRule,
        ],
        userInput: {
          description: input.description,
          approvedThemes,
          surfaceThemes,
          vibe: input.vibe,
          style: input.style,
          creativity: input.creativity,
          maxChars: input.maxChars,
          rhymeWith: input.rhymeWith || null,
          preferences: preferenceCopy,
          creativeLens,
        },
      }), */
    },
  ]
}

function providerAttemptMetadata(attempt: ProviderAttempt): GroqQuickGenerateResult["providerAttempts"][number] {
  return {
    provider: attempt.config.provider,
    model: attempt.config.model,
    ...(attempt.config.stage ? { stage: attempt.config.stage } : {}),
    outcome: attempt.outcome,
    ...(attempt.status ? { status: attempt.status } : {}),
    durationMs: attempt.durationMs,
    ...(attempt.retryAfterMs ? { retryAfterMs: attempt.retryAfterMs } : {}),
    ...(attempt.retryCount ? { retryCount: attempt.retryCount } : {}),
    ...(attempt.errorCode ? { errorCode: attempt.errorCode } : {}),
  }
}

const KNOWN_PROVIDER_ERROR_CODES = new Set([
  "authentication_error",
  "context_length_exceeded",
  "failed_generation",
  "invalid_api_key",
  "insufficient_quota",
  "invalid_request_error",
  "model_not_found",
  "permission_error",
  "rate_limit_error",
  "rate_limit_exceeded",
  "server_error",
  "service_unavailable",
])

function knownProviderErrorCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const code = value.trim().toLowerCase()
  return KNOWN_PROVIDER_ERROR_CODES.has(code) ? code : undefined
}

async function readProviderErrorCode(response: Response): Promise<string | undefined> {
  try {
    const payload = await response.json() as {
      error?: { code?: unknown; type?: unknown; failed_generation?: unknown }
      failed_generation?: unknown
    }
    // `failed_generation` can contain rejected model output. Record only its
    // presence, never the value, provider message, brief or generated text.
    if (payload.failed_generation !== undefined || payload.error?.failed_generation !== undefined) return "failed_generation"
    return knownProviderErrorCode(payload.error?.code) || knownProviderErrorCode(payload.error?.type) || "provider_error"
  } catch {
    return "provider_error"
  }
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(60_000, Math.ceil(seconds * 1_000))
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return undefined
  return Math.min(60_000, Math.max(0, timestamp - Date.now())) || undefined
}

const MAX_GROQ_COOLDOWN_MS = 60_000
const MAX_GROQ_COOLDOWN_ENTRIES = 8
// A full 120B timeout is a stronger overload signal than a fast validation
// rejection. Keep later requests on the compact recovery lanes for a short
// window instead of repeatedly spending half the public SLO on a saturated
// primary model. Smaller recovery models are deliberately exempt: the live
// audit showed that each could recover immediately after an isolated timeout.
const PRIMARY_GROQ_TIMEOUT_COOLDOWN_MS = 20_000
const groqCooldownUntilByModel = new Map<string, number>()

/** @internal Test isolation for the bounded in-process provider circuit. */
export function resetGroqQuickCooldownsForTests(): void {
  groqCooldownUntilByModel.clear()
}

function pruneGroqCooldowns(now: number): void {
  for (const [model, cooldownUntil] of groqCooldownUntilByModel) {
    if (cooldownUntil <= now) groqCooldownUntilByModel.delete(model)
  }
}

function groqCooldownRemainingMs(model: string, now = Date.now()): number {
  pruneGroqCooldowns(now)
  return Math.max(0, (groqCooldownUntilByModel.get(model) || 0) - now)
}

function startGroqCooldown(model: string, retryAfterMs: number, now = Date.now()): void {
  pruneGroqCooldowns(now)
  if (!groqCooldownUntilByModel.has(model) && groqCooldownUntilByModel.size >= MAX_GROQ_COOLDOWN_ENTRIES) {
    const oldest = Array.from(groqCooldownUntilByModel.entries()).sort((left, right) => left[1] - right[1])[0]
    if (oldest) groqCooldownUntilByModel.delete(oldest[0])
  }
  groqCooldownUntilByModel.set(model, now + Math.min(MAX_GROQ_COOLDOWN_MS, Math.max(1, retryAfterMs)))
}

function startPrimaryGroqTimeoutCooldown(config: ProviderConfig): void {
  if (config.provider === "groq" && config.model === DEFAULT_GROQ_MODELS[0]) {
    startGroqCooldown(config.model, PRIMARY_GROQ_TIMEOUT_COOLDOWN_MS)
  }
}

async function requestProviderCandidates(
  config: ProviderConfig,
  body: Record<string, unknown>,
  deadlineAt: number,
  maximumAttemptMs: number,
  signal?: AbortSignal,
): Promise<ProviderAttempt> {
  const startedAt = Date.now()
  if (!config.apiKey?.trim()) {
    return { config, content: null, outcome: "missing_key", durationMs: 0, reason: `missing_${config.provider}_api_key` }
  }
  if (signal?.aborted) {
    return { config, content: null, outcome: "aborted", durationMs: 0, reason: "request_aborted" }
  }
  if (config.provider === "groq") {
    const retryAfterMs = groqCooldownRemainingMs(config.model)
    if (retryAfterMs > 0) {
      return {
        config,
        content: null,
        outcome: "http_error",
        status: 429,
        durationMs: 0,
        retryAfterMs,
        errorCode: "rate_limit_exceeded",
        reason: "groq_http_429",
      }
    }
  }

  const remainingMs = Math.max(0, deadlineAt - Date.now())
  const attemptMs = Math.min(maximumAttemptMs, Math.max(0, remainingMs - config.reserveAfterMs))
  if (attemptMs < config.minimumAttemptMs) {
    return { config, content: null, outcome: "timeout", durationMs: 0, reason: `${config.provider}_budget_exhausted` }
  }

  const controller = new AbortController()
  let timedOut = false
  let retryCount = 0
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, attemptMs)
  const relayAbort = () => controller.abort()
  signal?.addEventListener("abort", relayAbort, { once: true })
  // Abort can occur between the early `aborted` check and listener
  // registration. Recheck after subscribing so that edge cannot leak a paid
  // fallback request or leave it running after user cancellation.
  if (signal?.aborted) controller.abort()

  try {
    if (controller.signal.aborted) {
      return { config, content: null, outcome: "aborted", durationMs: Date.now() - startedAt, reason: "request_aborted" }
    }
    const providerBody: Record<string, unknown> = { ...body, model: config.model }
    // Groq's seed is best-effort rather than a persistence guarantee, but it
    // makes an exact workflow retry substantially more stable and gives the
    // regression harness repeatable provider inputs. Other OpenAI-compatible
    // endpoints do not all accept this field, so keep it Groq-only.
    if (config.provider !== "groq") delete providerBody.seed
    if (config.provider === "groq" && requiresGroqJsonObjectMode(config.model)) {
      providerBody.response_format = { type: "json_object" }
    }
    if (config.provider === "groq" && config.model === "qwen/qwen3.6-27b") {
      providerBody.reasoning_effort = "none"
      providerBody.include_reasoning = false
    } else if (config.provider === "groq" && config.model.startsWith("openai/gpt-oss-")) {
      providerBody.reasoning_effort = "low"
      providerBody.include_reasoning = false
    }
    // OpenAI Structured Outputs uses the same compact, strict candidate
    // contract as GPT-OSS. There is no general SDK retry loop. The fetch loop
    // below is limited to one observed pre-generation 401 anomaly and never
    // repeats a successful generation, timeout, rate limit or validation error.
    if (config.provider === "openai") {
      // GPT-5 reasoning models use a different request shape from 4.1. Keep
      // them opt-in through OPENAI_QUICK_MODEL and avoid unsupported sampling
      // controls. Legacy GPT-5 mini alone needs extra reasoning-token headroom;
      // none-effort successors retain the compact names-only ceiling.
      if (isOpenAIReasoningQuickModel(config.model)) {
        providerBody.reasoning_effort = config.openAIReasoningEffort
        providerBody.verbosity = "low"
        // Minimal reasoning still consumes completion tokens. The former
        // 520-token ceiling could end with an empty content string after the
        // reasoning budget was spent, leaving no structured candidates.
        if (isOpenAILegacyGpt5MiniModel(config.model)) {
          providerBody.max_completion_tokens = Math.max(1_800, Number(providerBody.max_completion_tokens) || 0)
        }
        delete providerBody.temperature
        delete providerBody.top_p
        delete providerBody.frequency_penalty
        delete providerBody.presence_penalty
        delete providerBody.logprobs
        delete providerBody.top_logprobs
      }
    }
    // AI Gateway currently rejects OpenAI's json_object response format for
    // Gemini. The prompt still requires JSON and the parser already extracts a
    // JSON object from fenced model output, so omit only that incompatible hint.
    if (config.provider === "vercel_gateway") delete providerBody.response_format
    const serializedProviderBody = JSON.stringify(providerBody)
    const attemptDeadlineAt = startedAt + attemptMs
    while (true) {
      if (controller.signal.aborted) {
        const outcome = signal?.aborted ? "aborted" : "timeout"
        if (outcome === "timeout") startPrimaryGroqTimeoutCooldown(config)
        return {
          config,
          content: null,
          outcome,
          durationMs: Date.now() - startedAt,
          ...(retryCount ? { retryCount } : {}),
          reason: outcome === "aborted" ? "request_aborted" : `${config.provider}_timeout`,
        }
      }

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey.trim()}`, "Content-Type": "application/json" },
        body: serializedProviderBody,
        signal: controller.signal,
      })
      if (!response.ok) {
        const retryAfterMs = parseRetryAfterMs(response.headers?.get?.("retry-after") || null)
        const errorCode = await readProviderErrorCode(response)
        if (controller.signal.aborted) {
          const outcome = signal?.aborted ? "aborted" : "timeout"
          if (outcome === "timeout") startPrimaryGroqTimeoutCooldown(config)
          return {
            config,
            content: null,
            outcome,
            durationMs: Date.now() - startedAt,
            ...(retryCount ? { retryCount } : {}),
            reason: outcome === "aborted" ? "request_aborted" : `${config.provider}_timeout`,
          }
        }

        const remainingAttemptMs = Math.max(0, attemptDeadlineAt - Date.now())
        const shouldRetryTransientOpenAI401 = config.provider === "openai"
          && response.status === 401
          && errorCode === "invalid_request_error"
          && retryCount === 0
          && remainingAttemptMs >= OPENAI_TRANSIENT_401_RETRY_MIN_REMAINING_MS

        if (shouldRetryTransientOpenAI401) {
          retryCount = 1
          continue
        }

        if (config.provider === "groq" && response.status === 429 && retryAfterMs) {
          startGroqCooldown(config.model, retryAfterMs)
        }
        return {
          config,
          content: null,
          outcome: "http_error",
          status: response.status,
          durationMs: Date.now() - startedAt,
          ...(retryAfterMs ? { retryAfterMs } : {}),
          ...(retryCount ? { retryCount } : {}),
          ...(errorCode ? { errorCode } : {}),
          reason: `${config.provider}_http_${response.status}`,
        }
      }

      const payload = await response.json()
      const content = payload?.choices?.[0]?.message?.content
      if (typeof content !== "string" || !content.trim()) {
        return {
          config,
          content: null,
          outcome: "invalid_response",
          durationMs: Date.now() - startedAt,
          ...(retryCount ? { retryCount } : {}),
          reason: `${config.provider}_missing_content`,
        }
      }
      return {
        config,
        content,
        outcome: "ready",
        durationMs: Date.now() - startedAt,
        ...(retryCount ? { retryCount } : {}),
        reason: "",
      }
    }
  } catch (error) {
    if (signal?.aborted) {
      return {
        config,
        content: null,
        outcome: "aborted",
        durationMs: Date.now() - startedAt,
        ...(retryCount ? { retryCount } : {}),
        reason: "request_aborted",
      }
    }
    if (timedOut || (error instanceof Error && error.name === "AbortError")) {
      startPrimaryGroqTimeoutCooldown(config)
      return {
        config,
        content: null,
        outcome: "timeout",
        durationMs: Date.now() - startedAt,
        ...(retryCount ? { retryCount } : {}),
        reason: `${config.provider}_timeout`,
      }
    }
    return {
      config,
      content: null,
      outcome: "network_error",
      durationMs: Date.now() - startedAt,
      ...(retryCount ? { retryCount } : {}),
      reason: `${config.provider}_error`,
    }
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener("abort", relayAbort)
  }
}

function admitModelCandidates(
  content: string,
  context: {
    description: string
    rhymeWith?: string
    vibe: QuickGenerateVibe
    style: QuickGenerateStyle
    creativity: QuickGenerateCreativity
    maxChars: number
    approvedRoots: readonly string[]
    blacklist?: readonly string[]
    avoidedSounds?: readonly string[]
    reviewedEditorial?: boolean
    localeSafeDraftNames?: readonly string[]
  },
): {
  candidates: QuickCandidate[]
  rejectionCounts: Partial<Record<ModelAdmissionRejectionReason, number>>
} {
  const admitted: QuickCandidate[] = []
  const groundedAuto: QuickCandidate[] = []
  const exploratoryAuto: QuickCandidate[] = []
  const territoryCounts = new Map<ProviderTerritoryId, number>()
  const familyCounts = new Map<string, number>()
  const editorialLocalePolicy = context.reviewedEditorial
    ? getQuickLocalePolicy(context.description)
    : null
  const localeSafeDraftNames = new Set((context.localeSafeDraftNames || []).map(toLabel))
  const rejectionCounts: Partial<Record<ModelAdmissionRejectionReason, number>> = {}
  const reject = (reason: ModelAdmissionRejectionReason) => {
    rejectionCounts[reason] = (rejectionCounts[reason] || 0) + 1
  }

  for (const entry of parseGroqCandidates(content)) {
    if (isWeakAiName(entry.name)) {
      reject("weak_ai")
      continue
    }
    if (context.style !== "auto" && entry.style && entry.style !== context.style) {
      reject("requested_style_mismatch")
      continue
    }
    const name = toLabel(entry.name)
    if (name.length < QUICK_MIN_NAME_LENGTH || name.length > context.maxChars) {
      reject("outside_length")
      continue
    }
    if (context.style === "auto" && !entry.contractCompliant) {
      reject("invalid_evidence")
      continue
    }
    // Provider evidence is never taken as a meaning claim. The replay helper
    // accepts it only when spelling, NamoLux-owned lexical records and the
    // current brief independently prove the declared construction. This lets
    // Auto use a provider's precise, checkable boundaries without trusting a
    // source to invent relevance.
    const replay = replayProviderEvidence(entry, context.approvedRoots, context.description)
    if (!replay) {
      reject("invalid_evidence")
      continue
    }
    const defensibleAlternate = context.style === "alternate_spelling"
      && isDefensibleModelAlternate(entry.name, context.description, context.approvedRoots, entry.sourceRoots)

    const candidate = createQuickCandidateFromName(entry.name, {
      description: context.description,
      rhymeWith: context.rhymeWith,
      vibe: context.vibe,
      // Auto is always locally inferred. Explicit controls preserve the
      // declared construction only after the replay contract validates it.
      style: context.style === "auto"
        ? (replay.evidence?.kind === "semantic_word" ? "real_word" : undefined)
        : context.style,
      requestedStyle: context.style,
      modelAuthored: true,
      creativity: context.creativity,
      maxChars: context.maxChars,
      sourceRoots: replay.sourceRoots,
      evidence: replay.evidence,
      reviewedWholeWord: defensibleAlternate,
      blacklist: [...(context.blacklist || []), ...(context.avoidedSounds || [])],
    })
    if (!candidate || (context.style !== "auto" && !hasTruthfulModelStyle(entry, candidate, {
      description: context.description,
      approvedRoots: context.approvedRoots,
      requestedStyle: context.style,
    }))) {
      reject("candidate_admission")
      continue
    }

    const verifiedLocale = isVerifiedQuickLocaleCandidate(candidate.name, context.description)
    if (
      editorialLocalePolicy
      && !verifiedLocale
      && !localeSafeDraftNames.has(candidate.name)
      && candidate.constructionParts?.length !== 2
      && !isQuickCueOwnedSemanticWord(candidate.name, context.description)
    ) {
      // A locale-sensitive brief must never turn an unreviewed Welsh/French
      // looking invention into a generic Evocative name merely because the
      // response omitted a language label. Clean English compounds and the
      // explicitly reviewed private drafts remain available for the other
      // half of the page.
      reject("candidate_admission")
      continue
    }

    const autoQuality = context.style === "auto"
      ? assessQuickAutoCandidateQuality(candidate, context.description)
      : null
    if (autoQuality?.tier === "rejected") {
      reject("quality_rejected")
      continue
    }
    if (autoQuality?.tier) candidate.autoQualityTier = autoQuality.tier
    // Keep a small deliberate exploration lane, but never let unsupported
    // coinages fill the whole Quick result page ahead of grounded directions.
    // The private 32-name pool intentionally contains many lateral/metaphoric
    // directions. Do not discard later, stronger real words merely because
    // eight earlier exploratory names appeared first; the final merge and
    // public batch gate bound the 16-name presentation mix.
    if (autoQuality?.tier === "exploratory" && exploratoryAuto.length >= 24) {
      reject("exploration_cap")
      continue
    }

    // Territory IDs prevent a provider from collapsing into one conceptual
    // route, but do not force equal filler. Family, style and safety gates
    // remain the stronger selectors. Legacy cached responses have no
    // territory metadata and retain their former behaviour until expiry.
    if (entry.territoryId && (territoryCounts.get(entry.territoryId) || 0) >= MAX_SELECTED_NAMES_PER_TERRITORY) {
      reject("territory_cap")
      continue
    }
    const fingerprints = getProviderFamilyFingerprints(candidate, context.description)
    const expandedReviewedFamily = context.reviewedEditorial
      && (
        Boolean(editorialLocalePolicy && isVerifiedQuickLocaleCandidate(candidate.name, context.description))
        || /\brecycled[- ]gold\b/.test(context.description.toLowerCase())
        || getQuickPrimaryIntent(context.description)?.cue === "rural telehealth reach"
        || getQuickPrimaryIntent(context.description)?.cue === "locally guided conservation travel"
      )
    const reviewedContextFamily = context.reviewedEditorial
      && isQuickReviewedContextCompound(candidate.name, context.description)
    const familyLimit = context.style === "auto"
      // Only finite locale vocabularies, an explicitly central recycled-gold
      // material, rural telehealth's unusually narrow reach/access vocabulary,
      // and locally guided conservation travel's guide/safari vocabulary get
      // four family members. Exact manually reviewed context compounds may
      // also use four; ordinary provider-authored families stay at two so results
      // do not collapse into Trust*, Ledger*, Care*, or similar walls.
      ? expandedReviewedFamily || reviewedContextFamily ? 4 : 2
      : context.style === "non_english"
        ? Number.POSITIVE_INFINITY
        : 4
    if (fingerprints.some((fingerprint) => (familyCounts.get(fingerprint) || 0) >= familyLimit)) {
      reject("family_cap")
      continue
    }

    if (autoQuality?.tier === "grounded") groundedAuto.push(candidate)
    else if (autoQuality?.tier === "exploratory") exploratoryAuto.push(candidate)
    else admitted.push(candidate)
    if (entry.territoryId) territoryCounts.set(entry.territoryId, (territoryCounts.get(entry.territoryId) || 0) + 1)
    for (const fingerprint of fingerprints) {
      familyCounts.set(fingerprint, (familyCounts.get(fingerprint) || 0) + 1)
    }
  }

  const balancedAuto: QuickCandidate[] = []
  const groundedQueue = [...groundedAuto]
  const exploratoryQueue = [...exploratoryAuto]
  const groundedRunLength = context.reviewedEditorial
    && requiresQuickPrimaryConceptEvidence(context.description)
    ? 5
    : 1
  while (groundedQueue.length > 0 || exploratoryQueue.length > 0) {
    for (let index = 0; index < groundedRunLength; index += 1) {
      const grounded = groundedQueue.shift()
      if (!grounded) break
      balancedAuto.push(grounded)
    }
    const exploratory = exploratoryQueue.shift()
    if (exploratory) balancedAuto.push(exploratory)
  }

  return {
    candidates: context.style === "auto" ? balancedAuto : admitted,
    rejectionCounts,
  }
}

export async function generateGroqQuickCandidates(input: QuickGenerateInput, signal?: AbortSignal): Promise<GroqQuickGenerateResult> {
  const startedAt = Date.now()
  const count = clampNumber(input.count, RESULT_CANDIDATE_LIMIT, 1, RESULT_CANDIDATE_LIMIT)
  let fallbackCache: QuickCandidate[] | null = null
  const getFallback = () => {
    fallbackCache ||= buildDeterministicFallback(input, count)
    return fallbackCache
  }
  const providerAttempts: GroqQuickGenerateResult["providerAttempts"] = []
  const requestedStyle = normaliseStyle(input.style)
  const styleStatus = (candidateCount: number) => ({
    styleFulfilled: candidateCount >= count,
    ...(candidateCount < count
      ? { styleShortfallReason: requestedStyle === "auto"
        ? `Only ${candidateCount} safe candidates were available for this brief and length setting.`
        : `Only ${candidateCount} safe ${requestedStyle} candidates were available; other construction families were not substituted.` }
      : {}),
  })
  const fallbackResult = (fallbackReason: string): GroqQuickGenerateResult => {
    const fallback = getFallback()
    return {
      candidates: fallback,
      usedGroq: false,
      usedOpenAI: false,
      usedVercelGateway: false,
      modelBacked: false,
      provider: "deterministic",
      model: null,
      durationMs: Date.now() - startedAt,
      providerAttempts,
      editoriallyReviewed: false,
      editorialCandidateCount: 0,
      fallbackReason,
      ...styleStatus(fallback.length),
      modelCandidateCount: 0,
      modelGroundedCandidateCount: 0,
      fallbackCandidateCount: fallback.length,
      fallbackGroundedCandidateCount: 0,
      groundedCandidateCount: 0,
      exploratoryCandidateCount: 0,
    }
  }

  const vibe = normaliseVibe(input.vibe)
  const style = requestedStyle
  const creativity = normaliseCreativity(input.creativity)
  const requireEditorialReview = style === "auto" && input.requireEditorialReview === true
  const maxChars = clampNumber(input.maxChars, 10, 6, 15)
  const description = input.description.trim()
  const approvedRoots = getQuickConceptRoots(description)
  // Every style gets a private reserve. Local morphology, safety and family
  // gates are intentionally strict; asking for only the 16 public slots made
  // explicit modes collapse to deterministic filler after the first reject.
  const verifiedLocaleCandidateCount = style === "non_english"
    ? new Set(
        (getQuickLocalePolicy(description)?.forms || [])
          .map(toLabel)
          .filter((form) => form.length <= maxChars),
      ).size
    : 0
  const modelCandidateTarget = style === "non_english" && verifiedLocaleCandidateCount > 0
    ? Math.min(QUICK_AUTO_PROVIDER_CANDIDATE_LIMIT, verifiedLocaleCandidateCount)
    : QUICK_AUTO_PROVIDER_CANDIDATE_LIMIT
  const messages = buildPrompt({
    description,
    rhymeWith: input.rhymeWith,
    vibe,
    style,
    creativity,
    maxChars,
    count: modelCandidateTarget,
    blacklist: input.blacklist,
    preferences: input.preferences,
  })
  const requestBody = {
    messages,
    temperature: creativity === "direct" ? 0.5 : creativity === "exploratory" ? 0.9 : 0.7,
    // Qwen formats candidate records generously even when asked for JSON. The
    // former 680-token ceiling cut valid 24-record pools short. This is output
    // capacity rather than forced spend and stays within the shared deadline.
    max_completion_tokens: 1_500,
    response_format: getProviderResponseFormat(style, modelCandidateTarget),
    seed: stableHash([
      input.seed || description,
      description,
      input.rhymeWith || "",
      vibe,
      style,
      creativity,
      maxChars,
      modelCandidateTarget,
    ].join("|")),
  }
  // Qwen is the proven non-thinking primary. One compact GPT-OSS 20B fallback
  // uses a separate per-model TPM pool and strict schema; there is never a
  // retry of the same throttled model, so Retry-After is respected.
  const groqModels = getGroqQuickModels()
  const primaryGroq: ProviderConfig = {
      provider: "groq",
      endpoint: GROQ_CHAT_COMPLETIONS_URL,
      apiKey: process.env.GROQ_API_KEY,
      model: groqModels[0],
      maximumAttemptMs: requireEditorialReview
        ? AUTO_GENERATION_ATTEMPT_BUDGET_MS
        : ["qwen/qwen3.6-27b", "openai/gpt-oss-120b"].includes(groqModels[0])
          ? EXTENDED_GROQ_ATTEMPT_BUDGET_MS
        : PRIMARY_GROQ_ATTEMPT_BUDGET_MS,
      minimumAttemptMs: PRIMARY_GROQ_MINIMUM_ATTEMPT_MS,
      reserveAfterMs: requireEditorialReview
        ? AUTO_EDITORIAL_RESERVE_MS
        : ["qwen/qwen3.6-27b", "openai/gpt-oss-120b"].includes(groqModels[0])
          ? 0
        : PRIMARY_DOWNSTREAM_RESERVE_MS,
    }
  const openAIModel = process.env.OPENAI_QUICK_MODEL?.trim() || DEFAULT_OPENAI_QUICK_MODEL
  const openAI: ProviderConfig = {
      provider: "openai",
      endpoint: OPENAI_CHAT_COMPLETIONS_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: openAIModel,
      maximumAttemptMs: requireEditorialReview
        ? AUTO_GENERATION_ATTEMPT_BUDGET_MS
        : isOpenAIReasoningQuickModel(openAIModel)
          ? OPENAI_REASONING_ATTEMPT_BUDGET_MS
          : OPENAI_ATTEMPT_BUDGET_MS,
      minimumAttemptMs: requireEditorialReview
        ? PRIMARY_GROQ_MINIMUM_ATTEMPT_MS
        : OPENAI_MINIMUM_FALLBACK_WINDOW_MS,
      reserveAfterMs: requireEditorialReview ? AUTO_EDITORIAL_RESERVE_MS : 0,
      openAIReasoningEffort: getOpenAIQuickReasoningEffort(openAIModel, creativity),
    }
  const gateway: ProviderConfig = {
      provider: "vercel_gateway",
      endpoint: VERCEL_AI_GATEWAY_CHAT_COMPLETIONS_URL,
      // Vercel injects a short-lived OIDC token into deployments. A Gateway
      // key remains an explicit local/CI override, but neither value is ever
      // exposed to the client or written to analytics.
      apiKey: process.env.VERCEL === "1"
        ? process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY
        : process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
      model: process.env.AI_GATEWAY_QUICK_MODEL?.trim() || DEFAULT_VERCEL_GATEWAY_MODEL,
      maximumAttemptMs: VERCEL_GATEWAY_ATTEMPT_BUDGET_MS,
      minimumAttemptMs: VERCEL_GATEWAY_MINIMUM_ATTEMPT_MS,
      reserveAfterMs: requireEditorialReview ? AUTO_EDITORIAL_RESERVE_MS : GATEWAY_DOWNSTREAM_RESERVE_MS,
    }
  const configuredGroqEditorModel = process.env.GROQ_QUICK_EDITOR_MODEL?.trim()
  const groqEditorModel = configuredGroqEditorModel || DEFAULT_GROQ_EDITOR_MODEL
  const hasDefaultSecondaryDraftRecovery = groqEditorModel === DEFAULT_GROQ_EDITOR_MODEL
  const independentGroqEditor: ProviderConfig = {
      provider: "groq",
      endpoint: GROQ_CHAT_COMPLETIONS_URL,
      apiKey: process.env.GROQ_API_KEY,
      model: groqEditorModel,
      maximumAttemptMs: AUTO_EDITORIAL_ATTEMPT_BUDGET_MS,
      minimumAttemptMs: AUTO_EDITORIAL_MINIMUM_ATTEMPT_MS,
      reserveAfterMs: 0,
    }
  const qwenEditorialRecovery: ProviderConfig = {
      provider: "groq",
      endpoint: GROQ_CHAT_COMPLETIONS_URL,
      apiKey: process.env.GROQ_API_KEY,
      model: "qwen/qwen3.6-27b",
      maximumAttemptMs: ALTERNATE_GROQ_ATTEMPT_BUDGET_MS,
      minimumAttemptMs: ALTERNATE_GROQ_MINIMUM_ATTEMPT_MS,
      reserveAfterMs: 0,
    }
  const primaryProvider = getQuickGeneratePrimaryProvider()
  const selectedPrimary = primaryProvider === "openai" ? openAI : primaryGroq
  const alternateGroq: ProviderConfig[] = groqModels[1] ? [{
        provider: "groq" as const,
        endpoint: GROQ_CHAT_COMPLETIONS_URL,
        apiKey: process.env.GROQ_API_KEY,
        model: groqModels[1],
        maximumAttemptMs: ALTERNATE_GROQ_ATTEMPT_BUDGET_MS,
        minimumAttemptMs: ALTERNATE_GROQ_MINIMUM_ATTEMPT_MS,
        reserveAfterMs: requireEditorialReview ? AUTO_EDITORIAL_RESERVE_MS : 0,
      }] : []
  const providerConfigs: ProviderConfig[] = isQuickGeneratePrimaryOnly()
    ? [selectedPrimary]
    : primaryProvider === "openai"
      ? [openAI, primaryGroq, gateway, ...alternateGroq]
      : requireEditorialReview
        // A fast Groq rate-limit/transport failure must leave enough time for
        // Gateway generation plus its own editor pass. Direct OpenAI remains
        // the final independent-provider lane because its normal completion
        // latency is too large to precede that two-stage fallback.
        ? [primaryGroq, gateway, openAI, ...alternateGroq]
        : [primaryGroq, openAI, gateway, ...alternateGroq]
  const deadlineAt = Date.now() + TOTAL_MODEL_BUDGET_MS
  let lastFailure = ""
  let openAiFallbackEligible = false
  const accumulatedAutoCandidates: QuickCandidate[] = []
  const contributingProviders = new Set<ModelProvider>()
  const editoriallyReviewedNames = new Set<string>()

  if (requireEditorialReview) {
    const editorialWorkshop = generateQuickEditorialWorkshop({ ...input, count })
    if (editorialWorkshop.candidates.length >= count) {
      fallbackCache = editorialWorkshop.candidates
    }
    const privateDraftBySurface = new Map<string, QuickCandidate>()
    for (const candidate of getFallback()) privateDraftBySurface.set(candidate.name, candidate)
    for (const candidate of editorialWorkshop.editorialPool) {
      privateDraftBySurface.set(candidate.name, candidate)
    }
    const rankedPrivateDraftCandidates = rankEditorialPrivateDrafts(
      Array.from(privateDraftBySurface.values()),
      description,
    )
    // A finite first-32 slice can accidentally contain only fifteen mutually
    // compatible names even when the complete workshop has a strong sixteen.
    // Build the selector pool around a locally publishable core, then add the
    // strongest remaining drafts as genuine alternatives. The model still
    // chooses 24 of 32 and every published surface must appear in its response;
    // this only prevents arbitrary rank-window starvation from routing a rich
    // workshop through the slower ordinary-authoring path.
    const publishableSelectionCore = mergeCandidates(
      rankedPrivateDraftCandidates,
      [],
      count,
      {
        description,
        style,
        creativity,
        preferences: input.preferences,
        reviewedModelBatch: true,
      },
    )
    const publishableSelectionCoreNames = new Set(
      publishableSelectionCore.map((candidate) => candidate.name),
    )
    const selectionAlternatives = rankedPrivateDraftCandidates.filter(
      (candidate) => !publishableSelectionCoreNames.has(candidate.name),
    )
    // Weakness is a pool-level rank, not just a tier-local rank. The workshop
    // rank intentionally keeps reviewed whole words near their own lane, but a
    // finite selector reserve must not admit known generic literals ahead of
    // later non-weak constructions merely because they came from a different
    // editorial tier.
    const rankedSelectionAlternatives = [
      ...selectionAlternatives.filter((candidate) => !isWeakEditorialDraft(candidate, description)),
      ...selectionAlternatives.filter((candidate) => isWeakEditorialDraft(candidate, description)),
    ]
    const intendedPoolSize = Math.min(
      QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT,
      publishableSelectionCore.length + rankedSelectionAlternatives.length,
    )
    const intendedSelectionTarget = Math.min(
      intendedPoolSize - EDITORIAL_SELECTION_OMISSION_COUNT,
      count + EDITORIAL_SELECTION_EXTRA_REVIEW_COUNT,
    )
    // Prefer reserves that can replace a large omitted block of the local core.
    // This makes arbitrary model choices more useful without relaxing a single
    // publication gate.
    const maximumLeadingCoreOmissions = Math.max(0, intendedPoolSize - intendedSelectionTarget)
    const retainedCoreAtSelectionBoundary = publishableSelectionCore.slice(maximumLeadingCoreOmissions)
    const boundaryCompletion = mergeCandidates(
      rankEditorialPrivateDrafts(
        [...retainedCoreAtSelectionBoundary, ...rankedSelectionAlternatives],
        description,
      ),
      [],
      count,
      {
        description,
        style,
        creativity,
        preferences: input.preferences,
        reviewedModelBatch: true,
      },
    )
    const retainedBoundaryNames = new Set(
      retainedCoreAtSelectionBoundary.map((candidate) => candidate.name),
    )
    const boundaryReplacementCandidates = boundaryCompletion.filter(
      (candidate) => !retainedBoundaryNames.has(candidate.name),
    )
    const boundaryReplacementNames = new Set(
      boundaryReplacementCandidates.map((candidate) => candidate.name),
    )
    const orderedSelectionAlternatives = [
      ...boundaryReplacementCandidates,
      ...rankedSelectionAlternatives.filter(
        (candidate) => !boundaryReplacementNames.has(candidate.name),
      ),
    ].slice(0, Math.max(0, intendedPoolSize - publishableSelectionCore.length))
    const exclusiveBoundarySize = Math.max(0, intendedPoolSize - intendedSelectionTarget)
    const headReserve = orderedSelectionAlternatives.slice(0, exclusiveBoundarySize)
    const tailReserve = orderedSelectionAlternatives.slice(
      exclusiveBoundarySize,
      exclusiveBoundarySize * 2,
    )
    const overlapReserve = orderedSelectionAlternatives.slice(exclusiveBoundarySize * 2)
    // Put the complete locally publishable core inside the overlap of the
    // first and last valid selector windows. For a 24-of-32 review this is the
    // middle sixteen: [8 reserves, 16 core names, 8 reserves]. Both boundaries
    // therefore remain capable of publishing sixteen, while the model still
    // has a genuine eight-name surplus to reject and may choose any approved
    // names from the full pool.
    const privateDraftCandidates = publishableSelectionCore.length === count
      ? [
          ...headReserve,
          ...publishableSelectionCore,
          ...overlapReserve,
          ...tailReserve,
        ]
      : [
          ...publishableSelectionCore,
          ...orderedSelectionAlternatives,
        ]
    const privateDraftNames = privateDraftCandidates.map((candidate) => candidate.name)
    const privateDraftSet = new Set(privateDraftNames)
    const privateDraftByName = new Map(privateDraftCandidates.map((candidate) => [candidate.name, candidate]))
    const locallyPublishableCoreNames = publishableSelectionCore.map((candidate) => candidate.name)
    // The selector must review every member of the independently publishable
    // core. Stress testing proved that 15/16 is not sufficient: a valid
    // 24-name response can replace the omitted core name only with reserves
    // that are blocked by semantic, template and collision caps. Requiring all
    // sixteen still leaves a genuine model decision over eight of the reserve
    // names, plus ordering of the full 24-name response.
    const minimumPublishableCoreSelection = publishableSelectionCore.length === count
      ? publishableSelectionCore.length
      : 0
    // A large raw pool is not automatically a meaningful selector task. Very
    // short length limits can produce 24 distinct drafts from one morphology
    // family even though no locally valid 16-name presentation exists. Route
    // that case through the ordinary editor so it can author the missing
    // directions; otherwise repeated exact-pool selectors can never recover.
    const selectionPoolPreview = mergeCandidates(privateDraftCandidates, [], count, {
      description,
      style,
      creativity,
      preferences: input.preferences,
      reviewedModelBatch: true,
    })
    const editorialSelectionTarget = Math.min(
      privateDraftNames.length - EDITORIAL_SELECTION_OMISSION_COUNT,
      count + EDITORIAL_SELECTION_EXTRA_REVIEW_COUNT,
    )
    const selectionBoundaryPreview = mergeCandidates(
      rankEditorialPrivateDrafts(
        privateDraftCandidates.slice(-Math.max(0, editorialSelectionTarget)),
        description,
      ),
      [],
      count,
      {
        description,
        style,
        creativity,
        preferences: input.preferences,
        reviewedModelBatch: true,
      },
    )
    const hasMeaningfulSelectionPool = (
      privateDraftNames.length >= EDITORIAL_SELECTION_MINIMUM_POOL_SIZE
      && selectionPoolPreview.length >= count
      && selectionBoundaryPreview.length >= count
    )
    const primaryTiedDraftNames = privateDraftCandidates.filter(
      (candidate) => hasQuickPrimaryConceptEvidence(candidate, description),
    ).map((candidate) => candidate.name)
    const wholeWordDraftNames = privateDraftCandidates.filter(
      (candidate) => candidate.evidence?.kind === "semantic_word",
    ).map((candidate) => candidate.name)
    const weakLiteralDraftNames = privateDraftCandidates.filter(
      (candidate) => isWeakEditorialDraft(candidate, description),
    ).map((candidate) => candidate.name)
    const editorialValueFacet = getQuickValueFacet(description)
    const editorialBody = {
      messages: buildQuickAutoEditorialMessages({
        description,
        rhymeWith: input.rhymeWith,
        vibe,
        style: "auto" as const,
        creativity,
        maxChars,
        count: QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT,
        blacklist: input.blacklist,
        preferences: input.preferences,
      }, privateDraftNames, QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT),
      temperature: creativity === "direct" ? 0.35 : creativity === "exploratory" ? 0.72 : 0.52,
      max_completion_tokens: 1_800,
      response_format: buildQuickAutoResponseFormat(QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT),
      seed: stableHash([
        input.seed || description,
        description,
        vibe,
        creativity,
        maxChars,
        "editorial",
      ].join("|")),
    }
    // Recovery selectors receive a genuine private choice set rather than an
    // already-final deterministic page. A verbatim selection can therefore be
    // attributed to model review; an echo of exactly sixteen preselected names
    // cannot. When fewer than 24 safe drafts exist these providers remain
    // ordinary creative editors and pass the full admission path below.
    const buildRecoverySelectionBody = (previouslyReviewedNames: readonly string[]) => ({
      messages: [
        {
          role: "system" as const,
          content:
            "You are NamoLux's final naming editor in independent recovery mode. Choose only from the approved private drafts. Reject weaker drafts by omission. Never invent, rewrite, translate, respell, clip, join or extend a name. Return JSON only.",
        },
        {
          role: "user" as const,
          content: JSON.stringify({
            task: `Select exactly ${editorialSelectionTarget} approved drafts for the strongest, most varied review set. Return them strongest first; NamoLux will publish the best ${count}.`,
            outputShape: { names: ["lowercase"] },
            approvedDraftNames: privateDraftNames,
            locallyPublishableCoreNames,
            previouslyReviewedNames,
            primaryTiedDraftNames,
            wholeWordDraftNames,
            weakLiteralDraftNames,
            rules: [
              "Every returned string must exactly match one approvedDraftNames value.",
              `Choose exactly ${editorialSelectionTarget} different names from the full approvedDraftNames pool; omit at least ${EDITORIAL_SELECTION_OMISSION_COUNT} weaker alternatives.`,
              ...(minimumPublishableCoreSelection > 0 ? [
                `Include every one of the ${minimumPublishableCoreSelection} locallyPublishableCoreNames; choose the remaining names from the reserves.`,
              ] : []),
              "Prefer strong drafts outside previouslyReviewedNames when quality is comparable, so independent reviews add useful coverage.",
              "Prefer distinctive brand directions over bare category, feature, document or administrative labels.",
              "Interleave whole-word, compound and evocative directions; use no visible semantic root more than twice.",
              `Choose at least ${Math.min(editorialSelectionTarget, Math.ceil(count * 0.75))} names listed in primaryTiedDraftNames.`,
              `Choose no more than ${Math.min(8, editorialSelectionTarget)} names listed in wholeWordDraftNames.`,
              `Choose no more than ${AUTO_REVIEWED_WEAK_LITERAL_CANDIDATE_LIMIT} names listed in weakLiteralDraftNames; these are grounded but too literal to carry a brand portfolio.`,
              ...(editorialValueFacet ? [
                `Include at least ${editorialValueFacet.minimumAutoCandidates} approved drafts that visibly combine the accounting job with the privacy-first value facet.`,
              ] : []),
              "Return one compact JSON object with a names array and no other fields or prose.",
            ],
          }),
        },
      ],
      temperature: 0.1,
      max_completion_tokens: 700,
      response_format: buildQuickAutoResponseFormat(editorialSelectionTarget),
      seed: stableHash([
        input.seed || description,
        description,
        vibe,
        creativity,
        maxChars,
        previouslyReviewedNames.join(","),
        "editorial-recovery-selection",
      ].join("|")),
    })
    const recoveryEditors = independentGroqEditor.model === qwenEditorialRecovery.model
      // An explicit Qwen editor override remains an ordinary creative editor;
      // keeping its object first makes the identity-based selector check below
      // preserve that contract when the duplicate recovery model is removed.
      ? [independentGroqEditor, qwenEditorialRecovery]
      : hasDefaultSecondaryDraftRecovery
      // Live sealed traffic showed the compact 20B model completing valid
      // selections faster and more often than Qwen. Preserve the historical
      // order for explicit editor overrides.
      ? [independentGroqEditor, qwenEditorialRecovery]
      : [qwenEditorialRecovery, independentGroqEditor]
    const editorConfigs = (isQuickGeneratePrimaryOnly()
      ? [selectedPrimary]
      : hasMeaningfulSelectionPool
        // The locally admitted pool already owns creation and evidence. Use
        // the fastest compact reviewers first, give deployment Gateway a real
        // independent window, and avoid spending three seconds/TPM on a 120B
        // authoring pass whose inventions would be discarded on this path.
        ? [independentGroqEditor, gateway, qwenEditorialRecovery, openAI]
        : [selectedPrimary, gateway, ...recoveryEditors, openAI]
    ).filter((candidate, index, all) => all.findIndex(
      (other) => other.provider === candidate.provider && other.model === candidate.model,
    ) === index)
    const selectorReviewedCandidates: QuickCandidate[] = []
    const selectorReviewedNames = new Set<string>()
    const gatewaySelectionAttemptReserve = gateway.apiKey?.trim()
      ? GATEWAY_EDITORIAL_SELECTION_ATTEMPT_BUDGET_MS
      : 0

    for (const editorProviderConfig of editorConfigs) {
      const isQwenRecovery = editorProviderConfig === qwenEditorialRecovery
      const isSecondaryDraftRecovery = editorProviderConfig === independentGroqEditor
      const isOpenAIRecovery = editorProviderConfig === openAI
      const isGatewayRecovery = editorProviderConfig === gateway
      const isSelectionRecovery = hasMeaningfulSelectionPool
      const isBoundedDefaultPrimary = !isQuickGeneratePrimaryOnly()
        && editorProviderConfig === selectedPrimary
        && selectedPrimary.provider === "groq"
        && selectedPrimary.model === DEFAULT_GROQ_MODELS[0]
      const editorialConfig: ProviderConfig = {
        ...editorProviderConfig,
        stage: "editorial",
        maximumAttemptMs: isSecondaryDraftRecovery && isSelectionRecovery
          ? SECONDARY_EDITORIAL_RECOVERY_ATTEMPT_BUDGET_MS
          : isGatewayRecovery && isSelectionRecovery
            ? GATEWAY_EDITORIAL_SELECTION_ATTEMPT_BUDGET_MS
          : isQwenRecovery && isSelectionRecovery
            ? QWEN_EDITORIAL_RECOVERY_ATTEMPT_BUDGET_MS
          : isOpenAIRecovery && isSelectionRecovery
            ? OPENAI_EDITORIAL_SELECTION_ATTEMPT_BUDGET_MS
            : isBoundedDefaultPrimary
              ? AUTO_GENERATION_ATTEMPT_BUDGET_MS
              : AUTO_EDITORIAL_ATTEMPT_BUDGET_MS,
        minimumAttemptMs: isSecondaryDraftRecovery && isSelectionRecovery
          ? SECONDARY_EDITORIAL_RECOVERY_MINIMUM_ATTEMPT_MS
          : isGatewayRecovery && isSelectionRecovery
            ? GATEWAY_EDITORIAL_SELECTION_MINIMUM_ATTEMPT_MS
          : isQwenRecovery && isSelectionRecovery
            ? QWEN_EDITORIAL_RECOVERY_MINIMUM_ATTEMPT_MS
          : isOpenAIRecovery && isSelectionRecovery
            ? OPENAI_EDITORIAL_SELECTION_MINIMUM_ATTEMPT_MS
            : AUTO_EDITORIAL_MINIMUM_ATTEMPT_MS,
        reserveAfterMs: isQuickGeneratePrimaryOnly()
          ? 0
          : isSelectionRecovery && isSecondaryDraftRecovery
            // Give configured Gateway a complete independent attempt, then
            // preserve minimum viable Qwen/OpenAI windows. When Gateway is not
            // configured locally, its reserve disappears immediately so the
            // final independent provider can use the otherwise stranded time.
            ? gatewaySelectionAttemptReserve
              + QWEN_EDITORIAL_RECOVERY_MINIMUM_ATTEMPT_MS
              + OPENAI_EDITORIAL_SELECTION_MINIMUM_ATTEMPT_MS
              + 150
            : isSelectionRecovery && isGatewayRecovery
              ? QWEN_EDITORIAL_RECOVERY_MINIMUM_ATTEMPT_MS
                + OPENAI_EDITORIAL_SELECTION_MINIMUM_ATTEMPT_MS
                + 100
              : isSelectionRecovery && isQwenRecovery
                ? OPENAI_EDITORIAL_SELECTION_MINIMUM_ATTEMPT_MS + 50
                : isSelectionRecovery && isOpenAIRecovery
                  ? 0
                  : isSecondaryDraftRecovery
                    ? QWEN_EDITORIAL_RECOVERY_ATTEMPT_BUDGET_MS + 100
                    : isQwenRecovery
                      ? OPENAI_EDITORIAL_RECOVERY_MINIMUM_ATTEMPT_MS + 50
                      : isOpenAIRecovery
                        ? 0
                        : !hasDefaultSecondaryDraftRecovery
                          ? 0
                          : EDITORIAL_RECOVERY_RESERVE_MS,
      }
      const editorialAttempt = await requestProviderCandidates(
        editorialConfig,
        isSelectionRecovery
          ? buildRecoverySelectionBody(Array.from(selectorReviewedNames))
          : editorialBody,
        deadlineAt,
        editorialConfig.maximumAttemptMs,
        signal,
      )
      providerAttempts.push(providerAttemptMetadata(editorialAttempt))
      const attemptIndex = providerAttempts.length - 1
      if (editorialAttempt.reason && (editorialAttempt.outcome !== "missing_key" || !lastFailure)) {
        lastFailure = editorialAttempt.reason
      }
      if (editorialAttempt.outcome === "aborted") return fallbackResult("request_aborted")
      if (!editorialAttempt.content) continue

      const parsedNames = parseGroqCandidates(editorialAttempt.content)
      if (isSelectionRecovery) {
        const exactSelectedNames = parseExactEditorialSelection(
          editorialAttempt.content,
          privateDraftNames,
          editorialSelectionTarget,
        )
        const exactSelectedNameSet = new Set(exactSelectedNames || [])
        const selectedPublishableCoreCount = locallyPublishableCoreNames.filter(
          (name) => exactSelectedNameSet.has(name),
        ).length
        if (
          !exactSelectedNames
          || selectedPublishableCoreCount < minimumPublishableCoreSelection
        ) {
          providerAttempts[attemptIndex] = {
            ...providerAttempts[attemptIndex],
            parsedCandidateCount: parsedNames.length,
            admittedCandidateCount: 0,
            selectionPoolCandidateCount: privateDraftNames.length,
            outcome: "no_valid_names" as const,
          }
          lastFailure = `${editorProviderConfig.provider}_invalid_editorial_selection`
          continue
        }

        let admittedThisAttempt = 0
        for (const name of exactSelectedNames) {
          const candidate = privateDraftByName.get(name)
          if (!candidate || selectorReviewedNames.has(name)) continue
          selectorReviewedNames.add(name)
          selectorReviewedCandidates.push(candidate)
          editoriallyReviewedNames.add(name)
          admittedThisAttempt += 1
        }
        if (admittedThisAttempt > 0) contributingProviders.add(editorProviderConfig.provider)
        const recoveredPool = Array.from(new Map([
          ...accumulatedAutoCandidates,
          ...selectorReviewedCandidates,
        ].map((candidate) => [candidate.name, candidate])).values())
        let recovered = mergeCandidates(
          rankEditorialPrivateDrafts(recoveredPool, description),
          [],
          count,
          {
          description,
          style,
          creativity,
          preferences: input.preferences,
          reviewedModelBatch: true,
          },
        )
        if (recovered.length < count) {
          // Defensive certification path: the canonical core was produced by
          // this same merge under the same gates, and the exact selector
          // contract proves the provider reviewed every one of its surfaces.
          // Retry core-first before declaring the response incomplete; this
          // changes ranking only and never relaxes evidence or diversity.
          const recoveredNames = new Set(recoveredPool.map((candidate) => candidate.name))
          const canonicalSelectedCore = publishableSelectionCore.filter(
            (candidate) => recoveredNames.has(candidate.name),
          )
          const canonicalCoreNames = new Set(canonicalSelectedCore.map((candidate) => candidate.name))
          const selectedReserves = rankEditorialPrivateDrafts(recoveredPool, description).filter(
            (candidate) => !canonicalCoreNames.has(candidate.name),
          )
          recovered = mergeCandidates(
            [...canonicalSelectedCore, ...selectedReserves],
            [],
            count,
            {
              description,
              style,
              creativity,
              preferences: input.preferences,
              reviewedModelBatch: true,
            },
          )
        }
        providerAttempts[attemptIndex] = {
          ...providerAttempts[attemptIndex],
          parsedCandidateCount: parsedNames.length,
          admittedCandidateCount: admittedThisAttempt,
          selectionPoolCandidateCount: privateDraftNames.length,
          ...(recovered.length < count ? { outcome: "no_valid_names" as const } : {}),
        }
        if (recovered.length < count) {
          lastFailure = `${editorProviderConfig.provider}_incomplete_editorial_selection`
          continue
        }

        // Every published surface appeared verbatim in at least one provider's
        // selection from a 24+ draft pool. Local merging still owns semantic,
        // family, value-facet and locale constraints; selection is review
        // provenance, never semantic evidence by itself.
        const groundedCandidateCount = recovered.filter(
          (candidate) => assessQuickAutoCandidateQuality(candidate, description).tier === "grounded",
        ).length
        return {
          candidates: recovered,
          usedGroq: contributingProviders.has("groq"),
          usedOpenAI: contributingProviders.has("openai"),
          usedVercelGateway: contributingProviders.has("vercel_gateway"),
          modelBacked: true,
          provider: editorProviderConfig.provider,
          model: editorProviderConfig.model,
          durationMs: Date.now() - startedAt,
          providerAttempts,
          editoriallyReviewed: true,
          editorialCandidateCount: recovered.length,
          ...styleStatus(recovered.length),
          modelCandidateCount: recovered.length,
          modelGroundedCandidateCount: groundedCandidateCount,
          fallbackCandidateCount: 0,
          fallbackGroundedCandidateCount: 0,
          groundedCandidateCount,
          exploratoryCandidateCount: recovered.length - groundedCandidateCount,
        }
      }

      const admission = admitModelCandidates(editorialAttempt.content, {
        description,
        rhymeWith: input.rhymeWith,
        vibe,
        style,
        creativity,
        maxChars,
        approvedRoots,
        blacklist: input.blacklist,
        avoidedSounds: input.preferences?.avoidedSounds,
        reviewedEditorial: true,
        localeSafeDraftNames: privateDraftNames.filter(
          (name) => !isVerifiedQuickLocaleCandidate(name, description),
        ),
      })
      const rejectionCounts = { ...admission.rejectionCounts }
      let retainedPrivateDrafts = accumulatedAutoCandidates.filter(
        (candidate) => (
          privateDraftSet.has(candidate.name)
          && !isVerifiedQuickLocaleCandidate(candidate.name, description)
        ),
      ).length
      let editorialSeedCapRejections = 0
      for (const admittedCandidate of admission.candidates) {
        // An exact private-draft spelling has already passed deterministic
        // evidence construction. The provider may review that spelling, but
        // it cannot replace or erase NamoLux-owned provenance by omitting a
        // semantic record from its response. Admission still runs first; only
        // then do we reuse the locally generated candidate, with the ordinary
        // eight-draft publication cap unchanged.
        const privateDraft = privateDraftByName.get(admittedCandidate.name)
        // A locally verified draft owns the evidence we want to retain, while
        // the editor admission owns the current Auto quality tier. Keeping
        // both is essential: otherwise a valid private draft becomes
        // unclassified after editorial selection and the route rejects the
        // entire batch as internally inconsistent.
        const candidate = privateDraft
          ? {
            ...privateDraft,
            autoQualityTier: admittedCandidate.autoQualityTier ?? privateDraft.autoQualityTier,
          }
          : admittedCandidate
        const cappedPrivateDraft = privateDraftSet.has(candidate.name)
          && !isVerifiedQuickLocaleCandidate(candidate.name, description)
        if (cappedPrivateDraft && retainedPrivateDrafts >= Math.floor(count / 2)) {
          editorialSeedCapRejections += 1
          continue
        }
        if (accumulatedAutoCandidates.some((existing) => existing.name === candidate.name)) continue
        accumulatedAutoCandidates.push(candidate)
        editoriallyReviewedNames.add(candidate.name)
        if (cappedPrivateDraft) retainedPrivateDrafts += 1
      }
      if (editorialSeedCapRejections > 0) {
        rejectionCounts.editorial_seed_cap = editorialSeedCapRejections
      }
      contributingProviders.add(editorProviderConfig.provider)
      const merged = mergeCandidates(accumulatedAutoCandidates, [], count, {
        description,
        style,
        creativity,
        preferences: input.preferences,
        reviewedModelBatch: true,
      })
      providerAttempts[attemptIndex] = {
        ...providerAttempts[attemptIndex],
        parsedCandidateCount: parsedNames.length,
        admittedCandidateCount: admission.candidates.length - editorialSeedCapRejections,
        admissionRejectionCounts: rejectionCounts,
        ...(merged.length < count ? { outcome: "no_valid_names" as const } : {}),
      }
      if (merged.length < count) {
        lastFailure = `${editorProviderConfig.provider}_incomplete_editorial_batch`
        continue
      }

      const modelGroundedCandidateCount = merged.filter(
        (candidate) => candidate.autoQualityTier === "grounded",
      ).length
      const exploratoryCandidateCount = merged.filter(
        (candidate) => candidate.autoQualityTier === "exploratory",
      ).length
      return {
        candidates: merged,
        usedGroq: contributingProviders.has("groq"),
        usedOpenAI: contributingProviders.has("openai"),
        usedVercelGateway: contributingProviders.has("vercel_gateway"),
        modelBacked: true,
        provider: editorProviderConfig.provider,
        model: editorProviderConfig.model,
        durationMs: Date.now() - startedAt,
        providerAttempts,
        editoriallyReviewed: true,
        editorialCandidateCount: merged.length,
        ...styleStatus(merged.length),
        modelCandidateCount: merged.length,
        modelGroundedCandidateCount,
        fallbackCandidateCount: 0,
        fallbackGroundedCandidateCount: 0,
        groundedCandidateCount: modelGroundedCandidateCount,
        exploratoryCandidateCount,
      }
    }

    return fallbackResult(lastFailure || "editorial_providers_unavailable")
  }

  for (const config of providerConfigs) {
    // Direct OpenAI is a deliberately narrow serial fallback. It is not used
    // after a slow Groq completion/timeout, and it never races another model.
    if (config.provider === "openai" && primaryProvider !== "openai" && !openAiFallbackEligible) continue
    const attempt = await requestProviderCandidates(config, requestBody, deadlineAt, config.maximumAttemptMs, signal)
    providerAttempts.push(providerAttemptMetadata(attempt))
    if (attempt.reason && (attempt.outcome !== "missing_key" || !lastFailure)) lastFailure = attempt.reason

    if (config === primaryGroq && !attempt.content) {
      openAiFallbackEligible = canUseOpenAIFallback(attempt, deadlineAt)
    }

    if (attempt.outcome === "aborted") return fallbackResult("request_aborted")
    // A timed-out OpenAI fallback has already consumed the only viable
    // independent-provider window. Do not spend the final 400-700ms on calls
    // that cannot realistically complete; return the deterministic batch now.
    if (config.provider === "openai" && attempt.outcome === "timeout" && !requireEditorialReview) break
    const privateEditorialSeedContent = requireEditorialReview
      && config === selectedPrimary
      && !attempt.content
      ? JSON.stringify({ names: getFallback().map((candidate) => candidate.name) })
      : null
    const workshopContent = attempt.content || privateEditorialSeedContent
    if (!workshopContent) continue

    const generationAttemptIndex = providerAttempts.length - 1
    const generatedNames = parseGroqCandidates(workshopContent).map((candidate) => candidate.name)
    if (attempt.content) {
      providerAttempts[generationAttemptIndex] = {
        ...providerAttempts[generationAttemptIndex],
        parsedCandidateCount: generatedNames.length,
      }
    }

    let admissionContent = workshopContent
    let admissionAttemptIndex = generationAttemptIndex
    let admissionWasEditorial = false
    let publicationConfig = config
    if (
      requireEditorialReview
      && generatedNames.length >= count
      && deadlineAt - Date.now() >= AUTO_EDITORIAL_MINIMUM_ATTEMPT_MS
    ) {
      const editorialBody = {
        messages: buildQuickAutoEditorialMessages({
          description,
          rhymeWith: input.rhymeWith,
          vibe,
          style: "auto" as const,
          creativity,
          maxChars,
          count: QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT,
          blacklist: input.blacklist,
          preferences: input.preferences,
        }, generatedNames, QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT),
        temperature: creativity === "direct" ? 0.35 : creativity === "exploratory" ? 0.72 : 0.52,
        // Low reasoning can consume a meaningful share before the JSON body.
        // This is a capacity ceiling, not forced spend; 1,250 intermittently
        // ended in Groq json_validate_failed before all 32 edited names landed.
        max_completion_tokens: 1_800,
        response_format: buildQuickAutoResponseFormat(QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT),
        seed: stableHash([
          input.seed || description,
          description,
          vibe,
          creativity,
          maxChars,
          "editorial",
        ].join("|")),
      }

      // Split the workshop and editor across configured providers whenever
      // possible. This cuts same-model burst pressure in half in production,
      // and makes the editor an independent quality check. If Gateway is not
      // configured or rejects immediately, the originating provider remains a
      // bounded in-deadline fallback.
      const independentEditorialConfig = !isQuickGeneratePrimaryOnly()
        && config.provider !== "vercel_gateway"
        && gateway.apiKey?.trim()
        ? gateway
        : null
      const independentGroqEditorialConfig = !isQuickGeneratePrimaryOnly()
        && (
          config.provider !== independentGroqEditor.provider
          || config.model !== independentGroqEditor.model
        )
        ? independentGroqEditor
        : null
      const editorialConfigs = [
        ...(independentEditorialConfig ? [independentEditorialConfig] : []),
        ...(independentGroqEditorialConfig ? [independentGroqEditorialConfig] : []),
        config,
      ].filter((candidate, index, all) => all.findIndex(
        (other) => other.provider === candidate.provider && other.model === candidate.model,
      ) === index)

      for (const editorProviderConfig of editorialConfigs) {
        const editorialConfig: ProviderConfig = {
          ...editorProviderConfig,
          stage: "editorial",
          maximumAttemptMs: AUTO_EDITORIAL_ATTEMPT_BUDGET_MS,
          minimumAttemptMs: AUTO_EDITORIAL_MINIMUM_ATTEMPT_MS,
          reserveAfterMs: 0,
        }
        const editorialAttempt = await requestProviderCandidates(
          editorialConfig,
          editorialBody,
          deadlineAt,
          editorialConfig.maximumAttemptMs,
          signal,
        )
        providerAttempts.push(providerAttemptMetadata(editorialAttempt))
        const editorialAttemptIndex = providerAttempts.length - 1
        if (editorialAttempt.outcome === "aborted") return fallbackResult("request_aborted")
        if (!editorialAttempt.content) continue

        const editorialNames = parseGroqCandidates(editorialAttempt.content)
        const editorialAdmission = admitModelCandidates(editorialAttempt.content, {
          description,
          rhymeWith: input.rhymeWith,
          vibe,
          style,
          creativity,
          maxChars,
          approvedRoots,
          blacklist: input.blacklist,
          avoidedSounds: input.preferences?.avoidedSounds,
        })
        providerAttempts[editorialAttemptIndex] = {
          ...providerAttempts[editorialAttemptIndex],
          parsedCandidateCount: editorialNames.length,
          admittedCandidateCount: editorialAdmission.candidates.length,
          admissionRejectionCounts: editorialAdmission.rejectionCounts,
        }
        for (const candidate of editorialAdmission.candidates) {
          editoriallyReviewedNames.add(candidate.name)
          if (!accumulatedAutoCandidates.some((existing) => existing.name === candidate.name)) {
            accumulatedAutoCandidates.push(candidate)
          }
        }
        if (editorialAdmission.candidates.length > 0) {
          contributingProviders.add(editorProviderConfig.provider)
        }
        const editorialPreview = mergeCandidates(accumulatedAutoCandidates, [], count, {
          description,
          style,
          creativity,
          preferences: input.preferences,
          reviewedModelBatch: true,
        })
        // A partial editor response may contribute reviewed names to another
        // independent editor, but it can never cause the unreviewed workshop
        // draft to be published or counted as editorially reviewed.
        if (editorialPreview.length < count) {
          providerAttempts[editorialAttemptIndex] = {
            ...providerAttempts[editorialAttemptIndex],
            outcome: "no_valid_names",
          }
          continue
        }

        admissionContent = editorialAttempt.content
        admissionAttemptIndex = editorialAttemptIndex
        admissionWasEditorial = true
        publicationConfig = editorProviderConfig
        break
      }
    }

    const modelCandidateAdmission = admitModelCandidates(admissionContent, {
      description,
      rhymeWith: input.rhymeWith,
      vibe,
      style,
      creativity,
      maxChars,
      approvedRoots,
      blacklist: input.blacklist,
      avoidedSounds: input.preferences?.avoidedSounds,
    })
    const modelCandidates = modelCandidateAdmission.candidates
    if (admissionWasEditorial) {
      for (const candidate of modelCandidates) editoriallyReviewedNames.add(candidate.name)
    }
    providerAttempts[admissionAttemptIndex] = {
      ...providerAttempts[admissionAttemptIndex],
      parsedCandidateCount: parseGroqCandidates(admissionContent).length,
      admittedCandidateCount: modelCandidates.length,
      admissionRejectionCounts: modelCandidateAdmission.rejectionCounts,
    }
    if (modelCandidates.length === 0) {
      if (!requireEditorialReview || admissionWasEditorial) {
        const previousAttempt = providerAttempts[admissionAttemptIndex]
        providerAttempts[admissionAttemptIndex] = {
          ...previousAttempt,
          outcome: "no_valid_names",
        }
      }
      lastFailure = `${config.provider}_no_valid_names`
      if (config === primaryGroq) {
        openAiFallbackEligible = canUseOpenAIFallback({
          ...attempt,
          content: null,
          outcome: "no_valid_names",
          reason: lastFailure,
        }, deadlineAt)
      }
      continue
    }

    // A public Auto shortlist may accumulate reviewed candidates across
    // independent providers, but an unreviewed rough draft must never help a
    // later provider appear to satisfy the editorial provenance contract.
    if (!requireEditorialReview || admissionWasEditorial) {
      contributingProviders.add(config.provider)
      if (admissionWasEditorial) contributingProviders.add(publicationConfig.provider)
    }
    if (style === "auto") {
      const seen = new Set(accumulatedAutoCandidates.map((candidate) => candidate.name))
      if (!requireEditorialReview || admissionWasEditorial) {
        for (const candidate of modelCandidates) {
          if (!seen.has(candidate.name)) {
            seen.add(candidate.name)
            accumulatedAutoCandidates.push(candidate)
          }
        }
      }
    }
    const primaryCandidates = style === "auto" ? accumulatedAutoCandidates : modelCandidates
    const merged = mergeCandidates(primaryCandidates, [], count, {
      description,
      style,
      creativity,
      preferences: input.preferences,
      reviewedModelBatch: requireEditorialReview,
    })
    const modelNames = new Set(primaryCandidates.map((candidate) => candidate.name))
    const modelCandidateCount = merged.filter((candidate) => modelNames.has(candidate.name)).length
    if (modelCandidateCount === 0) {
      lastFailure = `${config.provider}_no_admitted_names`
      if (config === primaryGroq) {
        openAiFallbackEligible = canUseOpenAIFallback({
          ...attempt,
          content: null,
          outcome: "no_valid_names",
          reason: lastFailure,
        }, deadlineAt)
      }
      continue
    }
    const modelGroundedCandidateCount = style === "auto"
      ? merged.filter((candidate) => modelNames.has(candidate.name) && candidate.autoQualityTier === "grounded").length
      : modelCandidateCount
    const fallbackCandidateCount = merged.length - modelCandidateCount
    // Auto never promotes deterministic candidates today; this is explicit in
    // the result so the route can fail closed if a provider did not produce a
    // complete quality-approved model batch.
    const fallbackGroundedCandidateCount = 0
    const groundedCandidateCount = style === "auto"
      ? merged.filter((candidate) => candidate.autoQualityTier === "grounded").length
      : modelCandidateCount
    const exploratoryCandidateCount = style === "auto"
      ? merged.filter((candidate) => candidate.autoQualityTier === "exploratory").length
      : 0
    const editorialCandidateCount = style === "auto"
      ? merged.filter((candidate) => editoriallyReviewedNames.has(candidate.name)).length
      : 0
    // Auto is an all-model quality contract. A partial provider response used
    // to return immediately with deterministic filler, which the route then
    // rejected as a 503. Accumulate safe names across independent providers
    // and return only when the full public shortlist is actually publishable.
    if (
      style === "auto"
      && (
        merged.length < count
        || modelCandidateCount < count
        || (requireEditorialReview && editorialCandidateCount < count)
      )
    ) {
      if (!requireEditorialReview || admissionWasEditorial) {
        const previousAttempt = providerAttempts[admissionAttemptIndex]
        providerAttempts[admissionAttemptIndex] = {
          ...previousAttempt,
          outcome: "no_valid_names",
        }
      }
      lastFailure = `${config.provider}_incomplete_quality_batch`
      if (config === primaryGroq) {
        openAiFallbackEligible = canUseOpenAIFallback({
          ...attempt,
          content: null,
          outcome: "no_valid_names",
          reason: lastFailure,
        }, deadlineAt)
      }
      continue
    }
    return {
      candidates: merged,
      usedGroq: contributingProviders.has("groq"),
      usedOpenAI: contributingProviders.has("openai"),
      usedVercelGateway: contributingProviders.has("vercel_gateway"),
      modelBacked: true,
      provider: publicationConfig.provider,
      model: publicationConfig.model,
      durationMs: Date.now() - startedAt,
      providerAttempts,
      editoriallyReviewed: style === "auto" && editorialCandidateCount === modelCandidateCount,
      editorialCandidateCount,
      ...styleStatus(merged.length),
      modelCandidateCount,
      modelGroundedCandidateCount,
      fallbackCandidateCount,
      fallbackGroundedCandidateCount,
      groundedCandidateCount,
      exploratoryCandidateCount,
    }
  }

  return fallbackResult(lastFailure || "model_providers_unavailable")
}
