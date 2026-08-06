import { beforeAll, describe, expect, it } from "vitest"

import {
  createQuickCandidateFromName,
  generateQuickCandidates,
  getQuickLocalePolicy,
  isQuickShortlistGrade,
  isVerifiedQuickLocaleCandidate,
  type QuickCandidate,
  type QuickGenerateInput,
} from "@/lib/domainGen/quickGenerate"
import { BALANCED_60_PROMPTS } from "@/tests/generator-quality/balanced-60"

const P0_EXACT_NAMES = new Set([
  "tabloc", "roameat", "bitefast", "slotify", "riglet", "coilwhisp", "curlkith", "groom",
  "farma", "clinik", "civik", "publik", "familychild", "childvetted", "wellvetted", "pledgeit",
  "pledge", "bitstream", "wellchild", "kinship", "nurture", "fractal", "wellness", "sprout",
  "stream", "clearwater", "motorworks", "dataworks", "aidsignal", "urbanlunar", "emberedge",
  "biomend", "sunworks", "chargegrid", "privacywise", "invoiceflow", "carbonledger", "cyberwatch",
  "coldtrack", "pharmatrack", "authentik", "breathly", "burn", "cushora", "filig", "filigreea", "floridge",
  "frugio", "frugist", "gentgrove", "glintara", "homehoard", "lumic", "mithra", "prec", "solis", "spendly",
  "tinytreas", "verra",
])

const UNRELATED_RESERVE_EXACTS = new Set([
  "ridgetrail", "ashwild", "sagegrove", "elmkey", "acornglen", "valeair", "zenithfern", "fablezen",
  "plumedash", "unionwing", "tidetrail", "pinewild", "baycloud", "ridgefield", "greenlark",
  "dunetrail", "ivoryrise", "flamespark", "meritlucid", "keenwave", "oliveplume", "bloomplume",
  "zenithlucid", "claytrue", "driftring", "silveriron", "aerocoast", "brookspark", "northbold",
  "greenever", "autumnbend", "leafbridge", "sagerock", "auricspan", "slateleaf", "auricring",
])

const AUDIT_REVERSE_OR_TAUTOLOGY_NAMES = new Set([
  "archarc", "arcarch",
  "catfeline", "felinecat", "purrfeline", "felinepurr",
  "chillcold", "coldchill",
  "coilcurl", "curlcoil", "hairtexture", "texturehair",
  "giltgold", "goldgilt",
  "givegiving", "givinggive",
  "mamamother", "mothermama",
  "adaptreuse", "reuseadapt", "adaptrenew", "renewadapt",
  "interiorroom", "roominterior",
  "learnlingo", "lingolearn", "speaklingo", "lingospeak",
  "childparent", "parentchild", "parentcarer", "carerparent", "familychild", "childfamily",
  "housemeal", "mealhouse", "tablemeal", "mealtable", "tablecampus", "campustable",
  "cartethical", "ethicalcart", "shelfethical", "ethicalshelf",
  "skipcouple", "coupleskip", "skipgift", "giftskip", "skipcraft", "craftskip",
  "craftcampus", "campuscraft",
])

const REDUNDANT_COMPONENT_GROUPS: readonly ReadonlySet<string>[] = [
  new Set(["arc", "arch"]),
  new Set(["cat", "feline", "purr"]),
  new Set(["chill", "cold"]),
  new Set(["coil", "curl", "hair", "texture"]),
  new Set(["gilt", "gold"]),
  new Set(["give", "giving"]),
  new Set(["mama", "mother"]),
  new Set(["adapt", "renew", "reuse"]),
  new Set(["interior", "room"]),
  new Set(["learn", "lingo", "speak"]),
]

const GRAMMATICAL_SHORT_PHRASE_LEADS = new Set([
  "active", "adaptive", "alpine", "attentive", "bold", "brave", "bright", "calm", "clean", "clear", "clever",
  "coastal", "cold", "cozy", "crafted", "deep", "easy", "everyday", "exact", "fair", "fast", "first", "fit",
  "fresh", "future", "gentle", "guided", "handmade", "honest", "inclusive", "independent", "instant", "joyful",
  "kind", "lasting", "late", "live", "local", "modern", "near", "nightly", "noble", "open", "own", "plain",
  "playful", "precious", "private", "proud", "pure", "quiet", "ready", "refined", "renewed", "safe", "secure",
  "shared", "sharp", "simple", "small", "smart", "steady", "strong", "textured", "true", "trusted", "urban",
  "warm", "wild", "willing", "wise", "woven",
])

const REVIEWER_REJECTION_CASES: readonly {
  name: string
  description: string
  sourceRoots: readonly string[]
}[] = [
  { name: "famillerural", description: "plateforme de sante pour familles rurales au Quebec", sourceRoots: ["famille", "rural"] },
  { name: "careteen", description: "private therapy service for teenagers", sourceRoots: ["care", "teen"] },
  { name: "mindprivate", description: "private therapy service for teenagers", sourceRoots: ["mind", "private"] },
  { name: "bitesupper", description: "late-night student meal delivery", sourceRoots: ["bite", "supper"] },
  { name: "routesupper", description: "late-night student meal delivery", sourceRoots: ["route", "supper"] },
  { name: "mealsupper", description: "late-night student meal delivery", sourceRoots: ["meal", "supper"] },
  { name: "soilbalcony", description: "balcony gardening kits for city renters", sourceRoots: ["soil", "balcony"] },
  { name: "growplant", description: "balcony gardening kits for city renters", sourceRoots: ["grow", "plant"] },
  { name: "soilplant", description: "balcony gardening kits for city renters", sourceRoots: ["soil", "plant"] },
  { name: "coastshore", description: "premium coastal coffee roaster", sourceRoots: ["coast", "shore"] },
  { name: "adaptold", description: "architecture studio specialising in adaptive reuse of old buildings", sourceRoots: ["adapt", "old"] },
  { name: "oldrenew", description: "architecture studio specialising in adaptive reuse of old buildings", sourceRoots: ["old", "renew"] },
  { name: "oldheritage", description: "architecture studio specialising in adaptive reuse of old buildings", sourceRoots: ["old", "heritage"] },
  { name: "oldcrest", description: "architecture studio specialising in adaptive reuse of old buildings", sourceRoots: ["old", "crest"] },
  { name: "solarsun", description: "solar equipment marketplace in India", sourceRoots: ["solar", "sun"] },
  { name: "slotagenda", description: "AI scheduling assistant for startup founders", sourceRoots: ["slot", "agenda"] },
  { name: "logicdebug", description: "developer observability and debugging platform", sourceRoots: ["logic", "debug"] },
  { name: "signaldebug", description: "developer observability and debugging platform", sourceRoots: ["signal", "debug"] },
  { name: "tracedebug", description: "developer observability and debugging platform", sourceRoots: ["trace", "debug"] },
  { name: "scopedebug", description: "developer observability and debugging platform", sourceRoots: ["scope", "debug"] },
  { name: "tenderpublic", description: "transparent public procurement software", sourceRoots: ["tender", "public"] },
  { name: "trustcouncil", description: "transparent public procurement software", sourceRoots: ["trust", "council"] },
  { name: "trackesport", description: "real-time esports analytics platform", sourceRoots: ["track", "esport"] },
  { name: "trackexact", description: "quality inspection software for precision manufacturing", sourceRoots: ["track", "exact"] },
]

// This deliberately small, test-owned lexicon catches transparent joins from
// the audited corpus without depending on the production construction parser.
const KNOWN_LITERAL_PARTS = new Set([
  "access", "adapt", "aid", "arc", "arch", "audit", "bite", "bridge", "budget", "buyer",
  "campus", "care", "cart", "cat", "chain", "charge", "child", "chill", "civic", "climate",
  "clinic", "coil", "cold", "council", "curl", "cymru", "data", "detect", "dine", "drive",
  "ethical", "event", "family", "farm", "feline", "field", "flow", "fund", "gilt", "give",
  "giving", "gold", "grid", "guest", "guide", "hair", "heir", "hire", "home", "house",
  "interior", "japan", "kenya", "learn", "ledger", "lingo", "market", "meal", "motor",
  "nurse", "parent", "pharma", "pledge", "press", "probe", "proof", "purr", "quebec",
  "quiet", "renew", "repair", "research", "reuse", "road", "room", "route", "ryokan",
  "safari", "sante", "save", "school", "signal", "skip", "slot", "speak", "stay", "story",
  "table", "tempo", "tender", "texture", "time", "trace", "track", "travel", "trust",
  "vault", "vetted", "volt", "ward", "water", "wave", "well", "welsh",
])

const MAX_UNEVIDENCED_SOUND_LED_CANDIDATES = 2

type AuditedBatch = {
  promptId: string
  candidates: QuickCandidate[]
  repeated: QuickCandidate[]
}

let auditedBatches: AuditedBatch[] = []

function inputFor(prompt: (typeof BALANCED_60_PROMPTS)[number]): QuickGenerateInput {
  return {
    description: prompt.description,
    rhymeWith: prompt.rhymeWith,
    vibe: prompt.quickVibe,
    style: "auto",
    creativity: "balanced",
    maxChars: prompt.maxLength,
    count: 16,
    seed: `release-guard:${prompt.id}`,
  }
}

function literalSplits(name: string): Array<readonly [string, string]> {
  const splits: Array<readonly [string, string]> = []
  for (let index = 2; index <= name.length - 2; index += 1) {
    const left = name.slice(0, index)
    const right = name.slice(index)
    if (KNOWN_LITERAL_PARTS.has(left) && KNOWN_LITERAL_PARTS.has(right)) splits.push([left, right])
  }
  return splits
}

beforeAll(() => {
  auditedBatches = BALANCED_60_PROMPTS.map((prompt) => {
    const input = inputFor(prompt)
    return {
      promptId: prompt.id,
      candidates: generateQuickCandidates(input),
      repeated: generateQuickCandidates(input),
    }
  })
}, 30_000)

describe("Quick Generate release guards", () => {
  it("returns the same complete page of 16 unique names for every balanced-60 brief", () => {
    for (const batch of auditedBatches) {
      const names = batch.candidates.map((candidate) => candidate.name)
      expect(names, `${batch.promptId}: exact candidate count`).toHaveLength(16)
      expect(new Set(names).size, `${batch.promptId}: unique candidate count`).toBe(16)
      expect(
        batch.repeated.map((candidate) => candidate.name),
        `${batch.promptId}: deterministic order`,
      ).toEqual(names)

      const prompt = BALANCED_60_PROMPTS.find((item) => item.id === batch.promptId)
      expect(prompt, `${batch.promptId}: audit prompt`).toBeDefined()
      const styleCounts = new Map<string, number>()
      for (const candidate of batch.candidates) {
        styleCounts.set(candidate.style, (styleCounts.get(candidate.style) || 0) + 1)
      }
      expect(styleCounts.size, `${batch.promptId}: honest style diversity`).toBeGreaterThanOrEqual(4)
      expect(styleCounts.get("compound") || 0, `${batch.promptId}: compound ceiling`).toBeLessThanOrEqual(5)
      expect(styleCounts.get("short_phrase") || 0, `${batch.promptId}: phrase ceiling`).toBeLessThanOrEqual(4)
      expect(
        batch.candidates.slice(0, 2).every((candidate) => isQuickShortlistGrade(candidate, prompt?.description || "")),
        `${batch.promptId}: first two shortlist-grade`,
      ).toBe(true)

      const locale = getQuickLocalePolicy(prompt?.description || "")
      for (const candidate of batch.candidates.filter((item) => item.style === "non_english")) {
        expect(locale, `${batch.promptId}: locale policy for ${candidate.name}`).not.toBeNull()
        expect(isVerifiedQuickLocaleCandidate(candidate.name, prompt?.description || ""), candidate.name).toBe(true)
      }
    }
  })

  it("replays every unsplit evidence record without treating hidden provenance as fitRoots", () => {
    for (const batch of auditedBatches) {
      for (const candidate of batch.candidates) {
        if (!candidate.evidence) continue
        expect(candidate.fitRoots || [], `${batch.promptId}:${candidate.name}: hidden evidence is not visible fit`).toEqual([])
        if (candidate.evidence.kind === "semantic_word") {
          expect(candidate.evidence.source, candidate.name).toBe(candidate.name)
          continue
        }
        if (candidate.evidence.kind === "reviewed_spelling") {
          const expected = candidate.evidence.rule === "ph_to_f"
            ? candidate.evidence.source.replace("ph", "f")
            : `${candidate.evidence.source.slice(0, -1)}k`
          expect(candidate.name, candidate.evidence.source).toBe(expected)
          continue
        }
        const { left, right, overlap } = candidate.evidence
        expect(left.endsWith(overlap), candidate.name).toBe(true)
        expect(right.startsWith(overlap), candidate.name).toBe(true)
        expect(`${left}${right.slice(overlap.length)}`, candidate.name).toBe(candidate.name)
      }
    }
  })

  it("never admits the frozen P0 or unrelated reserve surfaces", () => {
    const violations: string[] = []
    for (const batch of auditedBatches) {
      for (const candidate of batch.candidates) {
        if (P0_EXACT_NAMES.has(candidate.name) || UNRELATED_RESERVE_EXACTS.has(candidate.name)) {
          violations.push(`${batch.promptId}:${candidate.name}`)
        }
      }
    }
    expect(violations.length, violations.join(", ")).toBe(0)
  })

  it("keeps constructionParts as exact visible A+B evidence", () => {
    const violations: string[] = []
    for (const batch of auditedBatches) {
      for (const candidate of batch.candidates) {
        if (!candidate.constructionParts?.length) continue
        const [left] = candidate.constructionParts
        const permittedStyle = candidate.style === "compound"
          || (candidate.style === "short_phrase" && GRAMMATICAL_SHORT_PHRASE_LEADS.has(left))
          || (candidate.style === "non_english" && isVerifiedQuickLocaleCandidate(candidate.name, BALANCED_60_PROMPTS.find((prompt) => prompt.id === batch.promptId)?.description || ""))
        if (
          candidate.constructionParts.length !== 2
          || candidate.constructionParts.join("") !== candidate.name
          || !permittedStyle
        ) {
          violations.push(
            `${batch.promptId}:${candidate.name}:${candidate.style}:${candidate.constructionParts.join("+")}`,
          )
        }
      }
    }
    expect(violations.length, `${violations.length} morphology violations; first 20: ${violations.slice(0, 20).join(", ")}`)
      .toBe(0)
  })

  it("never substitutes vague brief language for literal construction evidence", () => {
    const violations: string[] = []
    for (const batch of auditedBatches) {
      for (const candidate of batch.candidates) {
        if (/a concrete idea from the brief/i.test(candidate.personality)) {
          violations.push(`${batch.promptId}:${candidate.name}`)
        }
      }
    }
    expect(violations.length, `${violations.length} vague rationales; first 20: ${violations.slice(0, 20).join(", ")}`)
      .toBe(0)
  })

  it("never styles a known literal pair as Evocative/Real Word or calls it abstract", () => {
    const directCases = [
      {
        name: "carebridge",
        description: "trusted childcare network for parents and vetted local carers",
        sourceRoots: ["care"],
      },
      {
        name: "budgetwave",
        description: "simple household budgeting and savings app for young families",
        sourceRoots: ["budget"],
      },
      {
        name: "purrport",
        description: "urban cat sitting service for busy owners",
        sourceRoots: ["purr"],
      },
      {
        name: "storyprobe",
        description: "independent investigative journalism podcast",
        sourceRoots: ["story", "probe"],
      },
    ] as const

    for (const item of directCases) {
      const candidate = createQuickCandidateFromName(item.name, {
        description: item.description,
        vibe: "friendly",
        style: "evocative",
        requestedStyle: "auto",
        maxChars: 15,
        sourceRoots: item.sourceRoots,
      })
      if (!candidate) continue
      expect(candidate?.constructionParts?.join(""), item.name).toBe(item.name)
      expect(["evocative", "real_word"], item.name).not.toContain(candidate?.style)
      expect(candidate?.personality, item.name).not.toMatch(/\babstract(?: direction)?\b/i)
    }

    for (const batch of auditedBatches) {
      for (const candidate of batch.candidates) {
        const splits = literalSplits(candidate.name)
        if (splits.length === 0) continue
        if (candidate.evidence?.kind === "semantic_word") continue
        expect(candidate.constructionParts?.join(""), `${batch.promptId}: ${candidate.name}`).toBe(candidate.name)
        expect(["evocative", "real_word"], `${batch.promptId}: ${candidate.name}`).not.toContain(candidate.style)
        expect(candidate.personality, `${batch.promptId}: ${candidate.name}`).not.toMatch(
          /\babstract(?: direction)?\b|does not carry a literal brief cue/i,
        )
      }
    }
  })

  it("keeps ryokan hospitality separate from generic scheduling", () => {
    const batch = auditedBatches.find((item) => item.promptId === "japan-ryokan")
    expect(batch).toBeDefined()
    for (const candidate of batch?.candidates || []) {
      expect(candidate.name, candidate.name).not.toMatch(/time|slot|tempo/i)
      expect(candidate.personality, candidate.name).not.toMatch(/\bcalendar\b|\bschedul(?:e|ed|ing)\b|\btime\b/i)
    }

    const rawDescriptors = new Set([
      "booking", "design", "guest", "japan", "modern", "quiet", "ryokan", "service", "stay", "travel",
      "traveller", "travellers",
    ])
    const viable = (batch?.candidates || []).filter((candidate) => {
      if (!/^[a-z]{5,12}$/.test(candidate.name)) return false
      if ((candidate.fitRoots?.length || 0) === 0 || candidate.style === "real_word") return false
      if (P0_EXACT_NAMES.has(candidate.name) || UNRELATED_RESERVE_EXACTS.has(candidate.name)) return false
      if (rawDescriptors.has(candidate.name)) return false
      if (candidate.constructionParts?.length === 2 && candidate.constructionParts.every((part) => rawDescriptors.has(part))) {
        return false
      }
      return candidate.personality.includes("quiet ryokan hospitality")
    })
    expect(viable.length, `japan-ryokan: conservative viable shortlist (${viable.map((candidate) => candidate.name).join(", ")})`)
      .toBeGreaterThanOrEqual(2)
  })

  it("rejects mixed English plus Quebec/Welsh constructions in explicit Non-English mode", () => {
    const cases = [
      {
        description: "plateforme de sante pour familles rurales au Quebec",
        names: ["santecare", "quebecbridge", "carequebec"],
      },
      {
        description: "Welsh language marketplace connecting family farms with local schools",
        names: ["cymrumarket", "cymrubridge", "farmcymru"],
      },
    ] as const

    for (const item of cases) {
      for (const name of item.names) {
        expect(createQuickCandidateFromName(name, {
          description: item.description,
          vibe: "friendly",
          style: "non_english",
          requestedStyle: "non_english",
          maxChars: 15,
          sourceRoots: [],
        }), name).toBeNull()
      }
    }
  })

  it("explicitly rejects the reviewer's reverse, tautological and negative constructions", () => {
    const admitted: string[] = []
    for (const item of REVIEWER_REJECTION_CASES) {
      const candidate = createQuickCandidateFromName(item.name, {
        description: item.description,
        vibe: "clean",
        style: "compound",
        requestedStyle: "auto",
        maxChars: 15,
        sourceRoots: item.sourceRoots,
      })
      if (candidate) admitted.push(item.name)
    }
    expect(admitted.length, admitted.join(", ")).toBe(0)
  })

  it("caps sound-led directions that have neither visible fit nor verified provenance", () => {
    const violations: string[] = []
    for (const batch of auditedBatches) {
      const unevidenced = batch.candidates.filter((candidate) => (
        (candidate.fitRoots?.length || 0) === 0
        && !candidate.evidence
        && !candidate.constructionParts?.length
      ))
      if (unevidenced.length > MAX_UNEVIDENCED_SOUND_LED_CANDIDATES) {
        violations.push(`${batch.promptId}:${unevidenced.length}:${unevidenced.map((candidate) => candidate.name).join(",")}`)
      }
    }
    expect(violations.length, violations.join("; ")).toBe(0)
  })

  it("does not surface the audited reverse-order and tautological constructions", () => {
    for (const batch of auditedBatches) {
      for (const candidate of batch.candidates) {
        expect(AUDIT_REVERSE_OR_TAUTOLOGY_NAMES.has(candidate.name), `${batch.promptId}: ${candidate.name}`).toBe(false)
        if (candidate.constructionParts?.length !== 2) continue
        const [left, right] = candidate.constructionParts
        expect(
          REDUNDANT_COMPONENT_GROUPS.some((group) => group.has(left) && group.has(right)),
          `${batch.promptId}: ${candidate.name} (${left}+${right})`,
        ).toBe(false)
      }
    }
  })
})
