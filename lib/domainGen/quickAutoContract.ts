import { NAME_STYLES, type NameStyle } from "./generatedName"
import {
  buildQuickStyleTargets,
  getQuickAutoPromptAnchors,
  getQuickLocalePolicy,
  getQuickPrimaryIntent,
  getQuickValueFacet,
  requiresQuickPrimaryConceptEvidence,
  QUICK_MIN_NAME_LENGTH,
  type QuickGenerateCreativity,
  type QuickGeneratePreferences,
  type QuickGenerateVibe,
} from "./quickGenerate"

/**
 * Versioned production contract shared by Quick Auto inference and future
 * supervised-training exports. Increment only when the serialized messages or
 * strict response schema intentionally change.
 */
export const QUICK_AUTO_CONTRACT_VERSION = "quick-auto-v9" as const
export const QUICK_AUTO_PROVIDER_CANDIDATE_LIMIT = 32
export const QUICK_AUTO_RESPONSE_SCHEMA_NAME = "quick_brand_names_auto_v9" as const

/**
 * The provider must place every candidate in one broad, product-owned
 * territory. The label is a diversity hint only: runtime still replays every
 * claimed connection from the returned spelling and the brief-specific
 * semantic terrain before it can affect admission or explanation.
 */
export const QUICK_AUTO_TERRITORY_IDS = [
  "core_job",
  "audience_world",
  "desired_outcome",
  "distinctive_metaphor",
] as const

/**
 * Evidence mechanisms are deliberately narrow. They describe only facts the
 * runtime can independently replay from the name, never a model-authored
 * interpretation or rationale.
 */
export const QUICK_AUTO_EVIDENCE_MECHANISMS = [
  "visible_compound",
  "semantic_word",
  "abstract_sound",
  "locale_form",
] as const

export type QuickAutoTerritoryId = (typeof QUICK_AUTO_TERRITORY_IDS)[number]
export type QuickAutoEvidenceMechanism = (typeof QUICK_AUTO_EVIDENCE_MECHANISMS)[number]

export const QUICK_AUTO_SYSTEM_MESSAGE = "You are NamoLux's senior naming director. Build several genuinely different private longlists before answering, then keep only names that feel natural, distinctive and defensible for this exact brief. Reject generic pseudo-Latin or pseudo-tech syllables, bare category words, familiar startup metaphors, close brand-like misspellings, and novelty created only by a suffix. Follow the strict JSON schema. Return only the final ordered names; never output rationale, meaning, explanation, scores or free text."

export interface QuickAutoContractInput {
  description: string
  vibe: QuickGenerateVibe
  style: "auto"
  creativity: QuickGenerateCreativity
  maxChars: number
  count: number
  rhymeWith?: string
  blacklist?: readonly string[]
  preferences?: QuickGeneratePreferences
}

export interface QuickAutoContractMessage {
  role: "system" | "user"
  content: string
}

export interface QuickAutoCandidateRecord {
  name: string
  territoryId: QuickAutoTerritoryId
  mechanism: QuickAutoEvidenceMechanism
  evidenceParts: string[]
}

export interface QuickAutoResponsePayload {
  names: string[]
}

export interface QuickAutoTrainingExample {
  messages: QuickAutoContractMessage[]
}

// The local safety and collision gates intentionally remove a meaningful
// share of editor output. Ask for the same 32-name private reserve as the
// generator so a strong 16-name public page does not need rejected drafts.
export const QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT = 32

const QUICK_AUTO_STYLE_GUIDANCE: Readonly<Record<NameStyle, string>> = {
  brandable: "intentional coined phonetics with complete syllables and no arbitrary suffix",
  evocative: "a brief-specific metaphor or suggestive concept",
  compound: "two complete words in natural order expressing one fresh idea",
  real_word: "a complete dictionary word used as a non-obvious metaphor",
  short_phrase: "a compact natural phrase that sounds credible aloud",
  alternate_spelling: "an intentional phonetic respelling that preserves every syllable",
  non_english: "a defensible language or locale form only when the brief supports it",
}

const QUICK_AUTO_ALTERNATE_STYLE_ORDER = [
  "brandable", "evocative", "compound", "real_word", "short_phrase", "brandable", "evocative", "compound",
] as const

function toLabel(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getCleanRhymeWords(value: string | undefined): string[] {
  if (!value) return []
  const words = value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length >= 3)
  const whole = toLabel(value)
  return Array.from(new Set([whole, ...words].filter((word) => word.length >= 3)))
}

/** Builds the exact strict JSON schema used by the production Auto request. */
export function buildQuickAutoResponseFormat(count: number) {
  return {
    type: "json_schema",
    json_schema: {
      name: QUICK_AUTO_RESPONSE_SCHEMA_NAME,
      strict: true,
      schema: {
        type: "object",
        properties: {
          names: {
            type: "array",
            minItems: count,
            maxItems: count,
            items: { type: "string" },
          },
        },
        required: ["names"],
        additionalProperties: false,
      },
    },
  } as const
}

/** Builds the exact ordered messages sent by production Quick Auto. */
export function buildQuickAutoMessages(input: QuickAutoContractInput): QuickAutoContractMessage[] {
  const rhymeWords = getCleanRhymeWords(input.rhymeWith)
  const rhymeRule = rhymeWords.length
    ? `Sound reference is inspiration only; never include: ${rhymeWords.join(", ")}.`
    : null
  const blacklist = (input.blacklist || []).map(toLabel).filter((word) => word.length >= 2).slice(0, 20)
  const preferenceCopy = {
    likedStyles: input.preferences?.likedStyles?.filter((style) => NAME_STYLES.includes(style)).slice(0, 4) || [],
    dislikedStyles: input.preferences?.dislikedStyles?.filter((style) => NAME_STYLES.includes(style)).slice(0, 4) || [],
    preferredLength: input.preferences?.preferredLength || null,
    preferredSounds: input.preferences?.preferredSounds?.map(toLabel).filter(Boolean).slice(0, 4) || [],
    avoidedSounds: input.preferences?.avoidedSounds?.map(toLabel).filter(Boolean).slice(0, 4) || [],
  }
  const autoStyleTargets = buildQuickStyleTargets({
    description: input.description,
    rhymeWith: input.rhymeWith,
    style: input.style,
    creativity: input.creativity,
    preferences: input.preferences,
  }, input.count)
  // Product style quotas describe the 16-name page. Auto asks for private
  // alternates so admission can remove weak or unsafe names without padding.
  // Allocate those alternates to broad directions rather than leaving the
  // prompt totals inconsistent.
  let unassignedStyleAlternates = Math.max(
    0,
    input.count - Object.values(autoStyleTargets).reduce((sum, target) => sum + target, 0),
  )
  for (let index = 0; unassignedStyleAlternates > 0; index += 1) {
    const style = QUICK_AUTO_ALTERNATE_STYLE_ORDER[index % QUICK_AUTO_ALTERNATE_STYLE_ORDER.length]
    autoStyleTargets[style] += 1
    unassignedStyleAlternates -= 1
  }
  const explorationMix = NAME_STYLES.flatMap((style) => {
    const target = autoStyleTargets[style]
    return target > 0 ? [{ direction: style, aimFor: target, guidance: QUICK_AUTO_STYLE_GUIDANCE[style] }] : []
  })
  const semanticTerrain = getQuickAutoPromptAnchors(input.description)
  const primaryIntent = getQuickPrimaryIntent(input.description)
  const valueFacet = getQuickValueFacet(input.description)
  const requirePrimaryEvidence = requiresQuickPrimaryConceptEvidence(input.description)
  const lengthRule = `${Math.max(QUICK_MIN_NAME_LENGTH, input.maxChars - 6)}-${input.maxChars} lowercase letters`
  const requestedCount = Math.min(QUICK_AUTO_PROVIDER_CANDIDATE_LIMIT, input.count)
  const rootPortfolioCount = Math.ceil(requestedCount / 4)
  const audiencePortfolioCount = Math.ceil((requestedCount - rootPortfolioCount) / 3)
  const metaphorPortfolioCount = Math.ceil((requestedCount - rootPortfolioCount - audiencePortfolioCount) / 2)
  const phoneticPortfolioCount = requestedCount - rootPortfolioCount - audiencePortfolioCount - metaphorPortfolioCount
  const rules = [
    `Return exactly ${requestedCount} names, strongest first.`,
    "Return one compact JSON object with a names array; never a top-level array, Markdown, commentary or indentation.",
    `Each name must contain ${lengthRule}, with no digits or TLD.`,
    `Build four genuinely different private portfolios before choosing the final set: ${rootPortfolioCount} brief-root transformations, ${audiencePortfolioCount} names from audience rituals and objects, ${metaphorPortfolioCount} unexpected metaphors or real words, and ${phoneticPortfolioCount} clean phonetic inventions.`,
    "A brief-root transformation uses one semanticTerrain term in a fresh complete construction; use each terrain term at most once and never return a bare category word.",
    "Use audience-specific rituals, objects or payoffs for metaphors; inventions need complete, pronounceable syllables without decorative endings.",
    ...(primaryIntent ? [
      requirePrimaryEvidence
        ? `Primary intent is binding. At least ${Math.ceil(requestedCount * 0.75)} names must visibly express its concrete job through primaryIntent.roots or the matching job-specific semanticTerrain, while using each visible root at most twice. Reject root-plus-random-noun filler and bare administrative labels. Modifiers and audience professions cannot replace that product job or be reinterpreted as another industry.`
        : "Primary intent is binding; modifiers and audience professions may inspire lateral ideas but cannot replace the product job or be reinterpreted as another industry.",
    ] : []),
    ...(valueFacet ? [
      `At least ${valueFacet.minimumAutoCandidates} names must visibly combine one primaryIntent root with one valueFacet root. Treat the value facet as a differentiator, not a replacement for the bookkeeping job.`,
    ] : []),
    "Interleave portfolios; do not group literal names or inventions, and do not repeat a root, ending or construction family.",
    "Across all portfolios, never return save/fund/budget/cash/plan/nest/pocket/wise plus a generic second word, and never use -ly, -ify, -io, -ora, -ova or -ara as decoration.",
    "Keep only complete, pronounceable names that sound natural in 'I use ___' and credible on a product, invoice or investor deck. Avoid pseudo-Latin, pseudo-tech and fashionable suffixes.",
    `At least ${Math.ceil(requestedCount * 0.7)} names must feel meaningfully ownable through intentional phonetics, an unexpected metaphor or a fresh natural construction—not a bare category, feature, document or familiar startup word.`,
    "Reject reusable, generic, awkward, unsafe, famous, clipped, mechanical or close-brand directions; rank by brief relevance, naturalness and ownability.",
    `Creativity ${input.creativity}: direct favours clarity, balanced favours explainable evocation, exploratory permits bolder metaphor or clean phonetics.`,
    "Return names only: no territory labels, style labels, evidence, rationale, meaning, translation, classification, scores, availability or free text.",
    ...(blacklist.length ? [`Never include blocked terms: ${blacklist.join(", ")}.`] : []),
    ...(rhymeRule ? [rhymeRule] : []),
  ]
  // Normalize a legacy mojibake sequence before messages leave the server.
  // The canonical provider message remains ASCII-only so it hashes and renders
  // identically across the runtime, curation, and future fine-tuning export.
  const normalizedRules = rules.map((rule) => rule.replace(/\u00e2\u20ac\u201d/g, ", "))
  const userPayload = {
    task: "Create an investor-ready shortlist of brand names for this exact brief. Return JSON only.",
    outputShape: {
      names: ["lowercase"],
    },
      explorationMix,
      semanticTerrain,
      ...(primaryIntent ? { primaryIntent: { cue: primaryIntent.cue, roots: primaryIntent.roots } } : {}),
      ...(valueFacet ? { valueFacet: { id: valueFacet.id, roots: valueFacet.roots } } : {}),
      rules: normalizedRules,
    userInput: {
      description: input.description,
      vibe: input.vibe,
      style: input.style,
      creativity: input.creativity,
      maxChars: input.maxChars,
      ...(input.rhymeWith ? { rhymeWith: input.rhymeWith } : {}),
      ...(input.preferences ? { preferences: preferenceCopy } : {}),
    },
  }

  return [
    { role: "system", content: QUICK_AUTO_SYSTEM_MESSAGE },
    { role: "user", content: JSON.stringify(userPayload) },
  ]
}

/**
 * A bounded provider-backed naming-editor pass. It sees
 * only the brief and draft name surfaces—never provider prose or hidden
 * reasoning—and may replace weak drafts. The runtime still applies every
 * spelling, safety, family and batch gate after this pass.
 */
export function buildQuickAutoEditorialMessages(
  input: QuickAutoContractInput,
  draftNames: readonly string[],
  count = QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT,
): QuickAutoContractMessage[] {
  const targetCount = Math.min(QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT, Math.max(16, count))
  const drafts = Array.from(new Set(draftNames.map(toLabel).filter(Boolean))).slice(0, 40)
  const semanticTerrain = getQuickAutoPromptAnchors(input.description)
  const primaryIntent = getQuickPrimaryIntent(input.description)
  const valueFacet = getQuickValueFacet(input.description)
  const requirePrimaryEvidence = requiresQuickPrimaryConceptEvidence(input.description)
  const localePolicy = getQuickLocalePolicy(input.description)
  const reviewedLocaleNames = (localePolicy?.forms || [])
    .map(toLabel)
    .filter((name) => name.length >= QUICK_MIN_NAME_LENGTH && name.length <= input.maxChars)
  const requiredLocaleNames = localePolicy
    ? Math.min(localePolicy.minimumAutoCandidates, reviewedLocaleNames.length, Math.floor(targetCount / 2))
    : 0
  const maximumNonLocaleDrafts = Math.min(8, Math.floor(targetCount / 2))

  return [
    {
      role: "system",
      content:
        "You are NamoLux's final naming editor. Be more selective than the generator. Privately score every direction for exact-brief relevance, natural speech, distinctiveness, and fit with the requested vibe. Reject a name if any dimension is weak. Keep strong drafts, rewrite promising ideas, and replace the rest from genuinely new conceptual territory. Return only the final ordered JSON names.",
    },
    {
      role: "user",
      content: JSON.stringify({
        task: `Edit the draft longlist into exactly ${targetCount} investor-ready brand names.`,
        outputShape: { names: ["lowercase"] },
        brief: {
          description: input.description,
          vibe: input.vibe,
          creativity: input.creativity,
          maxChars: input.maxChars,
          ...(input.rhymeWith ? { rhymeWith: input.rhymeWith } : {}),
        },
        semanticTerrain,
        ...(primaryIntent ? { primaryIntent: { cue: primaryIntent.cue, roots: primaryIntent.roots } } : {}),
        ...(valueFacet ? { valueFacet: { id: valueFacet.id, roots: valueFacet.roots } } : {}),
        ...(localePolicy ? {
          reviewedLocale: {
            label: localePolicy.label,
            names: reviewedLocaleNames,
            required: requiredLocaleNames,
          },
        } : {}),
        draftNames: drafts,
        rules: [
          `Return exactly ${targetCount} unique names, strongest first.`,
          `Use ${Math.max(QUICK_MIN_NAME_LENGTH, input.maxChars - 6)}-${input.maxChars} lowercase letters only.`,
          ...(localePolicy
            ? [
                `Keep every required reviewed locale name. Those exact allowlisted names do not count toward the draft-retention limit; outside them, keep no more than ${maximumNonLocaleDrafts} draft names.`,
              ]
            : ["Keep no more than half of the draft names. Replace weak or repetitive drafts instead of polishing them with a suffix."]),
          "Reject literal utility labels, bare category words, familiar startup metaphors, close famous-brand echoes, typo-like spellings, and generic pseudo-brand syllables.",
          "Reject save/fund/budget/cash/plan/nest/pocket/wise plus a generic second word. Reject decorative -ly, -ify, -io, -ora, -ova, -ara, -ix and random x/z/q novelty.",
          ...(primaryIntent ? [
            requirePrimaryEvidence
              ? `Primary intent is binding. At least ${Math.ceil(targetCount * 0.75)} names must visibly express its concrete job through primaryIntent.roots or the matching job-specific semanticTerrain, while using each visible root at most twice. Reject root-plus-random-noun filler and bare administrative labels. Modifiers and audience professions cannot replace that product job or be reinterpreted as another industry.`
              : "Primary intent is binding; modifiers and audience professions may inspire lateral ideas but cannot replace the product job or be reinterpreted as another industry.",
          ] : []),
          ...(valueFacet ? [
            `Keep at least ${valueFacet.minimumAutoCandidates} names that visibly combine one primaryIntent root with one valueFacet root; the privacy value must differentiate the accounting product rather than replace its job.`,
          ] : []),
          "At least half the final set must use an unexpected but defensible audience ritual, concrete image, emotional payoff, real-word metaphor, or fresh natural construction.",
          "Include at most four invented words; every invented word must be instantly pronounceable and must not resemble a generic AI-generator name.",
          "Use each visible root, ending, metaphor family, and phonetic skeleton once.",
          "The list must feel specific to this exact brief and requested vibe; discard any direction reusable unchanged for an unrelated company.",
          ...(localePolicy ? [
            `Return exactly ${requiredLocaleNames} names from reviewedLocale.names. These are the only approved ${localePolicy.label} forms; never invent, translate, respell or hybridize a locale name.`,
            "Every remaining name must use ordinary English words, a reviewed draft, or clean language-neutral phonetics. Do not use another local-language word, place, fragment, spelling or translation.",
          ] : []),
          "Return one compact JSON object with a names array and no other fields, prose, Markdown, explanations, scores, or availability claims.",
        ],
      }),
    },
  ]
}
