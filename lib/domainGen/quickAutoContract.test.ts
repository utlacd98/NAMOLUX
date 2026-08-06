import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  buildQuickAutoEditorialMessages,
  buildQuickAutoMessages,
  buildQuickAutoResponseFormat,
  QUICK_AUTO_CONTRACT_VERSION,
  QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT,
  QUICK_AUTO_EVIDENCE_MECHANISMS,
  QUICK_AUTO_PROVIDER_CANDIDATE_LIMIT,
  QUICK_AUTO_RESPONSE_SCHEMA_NAME,
  QUICK_AUTO_SYSTEM_MESSAGE,
  QUICK_AUTO_TERRITORY_IDS,
} from "@/lib/domainGen/quickAutoContract"

describe("Quick Auto production contract", () => {
  it("exports the versioned names-only workshop/editor contract", () => {
    expect(QUICK_AUTO_CONTRACT_VERSION).toBe("quick-auto-v9")
    expect(QUICK_AUTO_PROVIDER_CANDIDATE_LIMIT).toBe(32)
    expect(QUICK_AUTO_EDITORIAL_CANDIDATE_LIMIT).toBe(32)
    expect(QUICK_AUTO_RESPONSE_SCHEMA_NAME).toBe("quick_brand_names_auto_v9")
    expect(QUICK_AUTO_TERRITORY_IDS).toEqual([
      "core_job",
      "audience_world",
      "desired_outcome",
      "distinctive_metaphor",
    ])
    expect(QUICK_AUTO_EVIDENCE_MECHANISMS).toEqual([
      "visible_compound",
      "semantic_word",
      "abstract_sound",
      "locale_form",
    ])
    expect(QUICK_AUTO_SYSTEM_MESSAGE).toBe(
      "You are NamoLux's senior naming director. Build several genuinely different private longlists before answering, then keep only names that feel natural, distinctive and defensible for this exact brief. Reject generic pseudo-Latin or pseudo-tech syllables, bare category words, familiar startup metaphors, close brand-like misspellings, and novelty created only by a suffix. Follow the strict JSON schema. Return only the final ordered names; never output rationale, meaning, explanation, scores or free text.",
    )
  })

  it("builds the exact strict schema for the requested private pool size", () => {
    expect(buildQuickAutoResponseFormat(32)).toEqual({
      type: "json_schema",
      json_schema: {
        name: "quick_brand_names_auto_v9",
        strict: true,
        schema: {
          type: "object",
          properties: {
            names: {
              type: "array",
              minItems: 32,
              maxItems: 32,
              items: { type: "string" },
            },
          },
          required: ["names"],
          additionalProperties: false,
        },
      },
    })

    const smaller = buildQuickAutoResponseFormat(8)
    expect(smaller.json_schema.schema.properties.names).toMatchObject({ minItems: 8, maxItems: 8 })
  })

  it("serializes the production Auto workshop as a names-only private pool", () => {
    const messages = buildQuickAutoMessages({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 10,
      count: 32,
      rhymeWith: "Flow State",
      blacklist: [" Calendar Bot ", "x", "NÉST"],
      preferences: {
        likedStyles: ["brandable", "real_word"],
        dislikedStyles: ["alternate_spelling"],
        preferredLength: "short",
        preferredSounds: ["Bright Tone"],
        avoidedSounds: ["Hard-X"],
      },
    })

    expect(messages).toHaveLength(2)
    expect(messages[0]).toEqual({ role: "system", content: QUICK_AUTO_SYSTEM_MESSAGE })
    expect(messages[1].role).toBe("user")

    const payload = JSON.parse(messages[1].content)
    expect(Object.keys(payload)).toEqual(["task", "outputShape", "explorationMix", "semanticTerrain", "primaryIntent", "rules", "userInput"])
    expect(payload.task).toBe("Create an investor-ready shortlist of brand names for this exact brief. Return JSON only.")
    expect(payload.outputShape).toEqual({ names: ["lowercase"] })
    expect(payload.explorationMix).toEqual([
      { direction: "brandable", aimFor: 8, guidance: "intentional coined phonetics with complete syllables and no arbitrary suffix" },
      { direction: "evocative", aimFor: 6, guidance: "a brief-specific metaphor or suggestive concept" },
      { direction: "compound", aimFor: 6, guidance: "two complete words in natural order expressing one fresh idea" },
      { direction: "alternate_spelling", aimFor: 2, guidance: "an intentional phonetic respelling that preserves every syllable" },
      { direction: "real_word", aimFor: 6, guidance: "a complete dictionary word used as a non-obvious metaphor" },
      { direction: "short_phrase", aimFor: 4, guidance: "a compact natural phrase that sounds credible aloud" },
    ])
    expect(payload.semanticTerrain).toEqual([
      "slot", "agenda", "assist", "founder", "time", "cadence", "clockwise", "sequence", "punctual", "synchronic", "clockwork", "timekeeper",
      "routine", "planner", "timetable", "appointment",
    ])
    expect(payload.primaryIntent).toEqual({
      cue: "founder scheduling assistance",
      roots: ["slot", "agenda", "assist", "founder", "time"],
    })
    expect(payload.rules[0]).toBe("Return exactly 32 names, strongest first.")
    expect(payload.rules[1]).toBe("Return one compact JSON object with a names array; never a top-level array, Markdown, commentary or indentation.")
    expect(payload.rules[2]).toBe("Each name must contain 4-10 lowercase letters, with no digits or TLD.")
    expect(payload.rules).toContain("Build four genuinely different private portfolios before choosing the final set: 8 brief-root transformations, 8 names from audience rituals and objects, 8 unexpected metaphors or real words, and 8 clean phonetic inventions.")
    expect(payload.rules).toContain("At least 23 names must feel meaningfully ownable through intentional phonetics, an unexpected metaphor or a fresh natural construction—not a bare category, feature, document or familiar startup word.")
    expect(payload.rules).toContain("Keep only complete, pronounceable names that sound natural in 'I use ___' and credible on a product, invoice or investor deck. Avoid pseudo-Latin, pseudo-tech and fashionable suffixes.")
    expect(payload.rules).toContain("Return names only: no territory labels, style labels, evidence, rationale, meaning, translation, classification, scores, availability or free text.")
    expect(payload.rules).toContain("Never include blocked terms: calendarbot, nest.")
    expect(payload.rules).toContain("Sound reference is inspiration only; never include: flowstate, flow, state.")
    expect(payload.userInput).toEqual({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 10,
      rhymeWith: "Flow State",
      preferences: {
        likedStyles: ["brandable", "real_word"],
        dislikedStyles: ["alternate_spelling"],
        preferredLength: "short",
        preferredSounds: ["brighttone"],
        avoidedSounds: ["hardx"],
      },
    })
    expect(payload).not.toHaveProperty("territoryGuide")
    expect(payload.userInput).not.toHaveProperty("creativeLens")
    expect(payload.userInput).not.toHaveProperty("approvedThemes")
  })

  it("builds a bounded editorial pass that deduplicates and may replace the workshop draft", () => {
    const messages = buildQuickAutoEditorialMessages({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 10,
      count: 32,
    }, ["Time Pilot", "slotbloom", "time-pilot"], 40)

    expect(messages).toHaveLength(2)
    const payload = JSON.parse(messages[1].content)
    expect(payload.task).toBe("Edit the draft longlist into exactly 32 investor-ready brand names.")
    expect(payload.outputShape).toEqual({ names: ["lowercase"] })
    expect(payload.draftNames).toEqual(["timepilot", "slotbloom"])
    expect(payload.rules).toContain("Keep no more than half of the draft names. Replace weak or repetitive drafts instead of polishing them with a suffix.")
    expect(JSON.stringify(payload)).not.toContain("rationale")
  })

  it("keeps privacy-first bookkeeping grounded in both the job and value facet", () => {
    const input = {
      description: "Privacy-first bookkeeping software for independent freelancers",
      vibe: "clean" as const,
      style: "auto" as const,
      creativity: "balanced" as const,
      maxChars: 12,
      count: 32,
    }

    const workshop = JSON.parse(buildQuickAutoMessages(input)[1].content)
    expect(workshop.primaryIntent).toEqual({
      cue: "freelancer accounting",
      roots: ["invoice", "tax", "solo", "books", "ledger"],
    })
    expect(workshop.valueFacet).toEqual({
      id: "privacy_first",
      roots: ["quiet", "hush", "vault", "lock", "seal", "safe", "private", "secure"],
    })
    expect(workshop.rules).toContain(
      "At least 4 names must visibly combine one primaryIntent root with one valueFacet root. Treat the value facet as a differentiator, not a replacement for the bookkeeping job.",
    )

    const editorial = JSON.parse(buildQuickAutoEditorialMessages(
      input,
      ["quietbooks", "hushledger", "bookvault", "ledgerlock"],
      32,
    )[1].content)
    expect(editorial.valueFacet).toEqual(workshop.valueFacet)
    expect(editorial.rules).toContain(
      "Keep at least 4 names that visibly combine one primaryIntent root with one valueFacet root; the privacy value must differentiate the accounting product rather than replace its job.",
    )
  })

  it("pins locale-sensitive editorial work to reviewed forms", () => {
    const messages = buildQuickAutoEditorialMessages({
      description: "Welsh language marketplace connecting family farms with local schools",
      vibe: "friendly",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 32,
    }, ["bwydcymru", "ffermcymru", "unreviewedwelsh"], 32)

    const payload = JSON.parse(messages[1].content)
    expect(payload.reviewedLocale).toEqual({
      label: "Welsh",
      names: [
        "marchnadleol",
        "ffermcymru",
        "bwydlleol",
        "ffermleol",
        "bwydcymru",
        "ysgolfferm",
        "cnwdcymru",
        "cynhaeaf",
      ],
      required: 8,
    })
    expect(payload.rules).toContain(
      "Return exactly 8 names from reviewedLocale.names. These are the only approved Welsh forms; never invent, translate, respell or hybridize a locale name.",
    )
    expect(payload.rules).toContain(
      "Keep every required reviewed locale name. Those exact allowlisted names do not count toward the draft-retention limit; outside them, keep no more than 8 draft names.",
    )
    expect(payload.rules).toContain(
      "Every remaining name must use ordinary English words, a reviewed draft, or clean language-neutral phonetics. Do not use another local-language word, place, fragment, spelling or translation.",
    )
  })

  it("locks the UTF-8 serialized production 32-name workshop contract", () => {
    const messages = buildQuickAutoMessages({
      description: "AI scheduling assistant for busy startup founders",
      vibe: "tech",
      style: "auto",
      creativity: "balanced",
      maxChars: 10,
      count: 32,
      rhymeWith: "",
      blacklist: [],
      preferences: {},
    })
    const serialized = JSON.stringify({
      messages,
      response_format: buildQuickAutoResponseFormat(32),
    })

    expect(messages[1].content).not.toContain("\u00e2")
    expect(createHash("sha256").update(serialized, "utf8").digest("hex")).toBe(
      "54713c08b7d4a8e9d566f6033905a569bbf8f1af911913276723d5bc91c0aab8",
    )
  })
})
