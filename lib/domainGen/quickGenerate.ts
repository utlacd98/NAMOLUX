import {
  hasRandomSyllablePattern,
  hasUnsafeBrandMeaning,
} from "./filters"
import {
  CREATIVITY_LEVELS,
  NAME_STYLES,
  type CreativityLevel,
  type NameStyle,
} from "./generatedName"
import { getRealnessScore, isGibberish, isKeywordClone } from "./realness"
import { buildQuickBriefFactSheet, renderQuickCandidateRationale } from "./quickRationaleAdapter"

export const QUICK_GENERATE_VIBES = ["playful", "premium", "tech", "clean", "bold", "friendly"] as const

export type QuickGenerateVibe = (typeof QUICK_GENERATE_VIBES)[number]

export const QUICK_GENERATE_STYLES = ["auto", ...NAME_STYLES] as const
export type QuickGenerateStyle = (typeof QUICK_GENERATE_STYLES)[number]

export const QUICK_GENERATE_CREATIVITY = CREATIVITY_LEVELS
export type QuickGenerateCreativity = CreativityLevel

export interface QuickGeneratePreferences {
  likedStyles?: NameStyle[]
  dislikedStyles?: NameStyle[]
  preferredLength?: "short" | "medium" | "long"
  preferredSounds?: string[]
  avoidedSounds?: string[]
}

export interface QuickGenerateInput {
  description: string
  rhymeWith?: string
  vibe?: QuickGenerateVibe
  style?: QuickGenerateStyle
  creativity?: QuickGenerateCreativity
  maxChars?: number
  count?: number
  seed?: string
  blacklist?: string[]
  preferences?: QuickGeneratePreferences
  /**
   * Public generation routes set this to require a separate provider-backed
   * editor pass. Internal diagnostics can leave it unset when they explicitly
   * need to inspect the rough generation draft.
   */
  requireEditorialReview?: boolean
}

export interface QuickLocalePolicy {
  code: "fr-CA" | "cy"
  label: string
  roots: readonly string[]
  /** Reviewed ASCII domain-label forms. Model claims never extend this set. */
  forms: readonly string[]
  minimumAutoCandidates: number
}

export type QuickStyleTargets = Record<NameStyle, number>

export type QuickCandidateEvidence =
  | {
      kind: "semantic_word"
      cue: string
      source: string
    }
  | {
      kind: "orthographic_fusion"
      left: string
      right: string
      overlap: string
    }
  | {
      kind: "reviewed_spelling"
      source: string
      rule: "ph_to_f" | "terminal_ic_to_ik"
    }

export interface QuickCandidate {
  name: string
  personality: string
  style: NameStyle
  /** Internal Auto-admission classification. It is never returned by the public API. */
  autoQualityTier?: QuickAutoCandidateQualityTier
  fitRoots?: string[]
  fitCues?: string[]
  /** Actual visible A+B construction parts, when the label is a compound. */
  constructionParts?: string[]
  /** Auditable provenance for an honest unsplit direction. This is not
   * displayed as a visible semantic root. */
  evidence?: QuickCandidateEvidence
}

export type QuickAutoCandidateQualityTier = "grounded" | "exploratory" | "rejected"

export type QuickAutoCandidateQualityReason =
  | "root_suffix_clone"
  | "generic_template"
  | "ungrounded_gibberish"

export interface QuickAutoCandidateQuality {
  tier: QuickAutoCandidateQualityTier
  reason?: QuickAutoCandidateQualityReason
}

export interface QuickCandidateContext {
  description: string
  rhymeWith?: string
  vibe?: QuickGenerateVibe
  style?: QuickGenerateStyle
  /** The user's selected style before Auto resolves an individual candidate. */
  requestedStyle?: QuickGenerateStyle
  creativity?: QuickGenerateCreativity
  maxChars?: number
  rationale?: string
  sourceRoots?: readonly string[]
  blacklist?: readonly string[]
  /** Model labels are suggestions in Auto; locally visible construction wins. */
  modelAuthored?: boolean
  /** Internal deterministic provenance for a reviewed complete word. */
  reviewedWholeWord?: boolean
  /** Verified provenance for an unsplit semantic word or orthographic blend. */
  evidence?: QuickCandidateEvidence
  /** Exact reviewed supply cue for locally generated batches. Provider and
   * direct-admission callers omit it and retain ordinary concept detection. */
  conceptCueOverride?: string
}

export interface QuickPrimaryIntent {
  cue: string
  promise: string
  roots: readonly string[]
}

export interface QuickValueFacet {
  id: "privacy_first"
  roots: readonly string[]
  intersectionPairs: readonly (readonly [string, string])[]
  minimumAutoCandidates: number
}

interface ConceptSignal {
  root: string
  cue: string
  promise: string
  verified: boolean
}

interface ConceptRule {
  test: RegExp
  roots: readonly string[]
  cue: string
  promise: string
}

const DEFAULT_COUNT = 16
export const QUICK_MIN_NAME_LENGTH = 4
const MAX_RESULTS = 16
const MIN_MAX_CHARS = 6
const MAX_MAX_CHARS = 15

const QUICK_LOCALE_POLICIES: readonly (QuickLocalePolicy & { test: RegExp })[] = [
  {
    code: "fr-CA",
    label: "French (Quebec)",
    test: /\b(?:french|francais|sante|familles rurales)\b|^(?=.*\bquebec\b)(?=.*\b(?:health|healthcare|sante|famille|rural)\b)/,
    roots: ["acces", "famille", "lien", "local", "proche", "proxi", "quebec", "rural", "sante", "soin", "village"],
    forms: [
      "soinproche", "proxisante", "santevillage", "soinvillage", "liensante", "santefamille", "accesrural", "santeproche",
    ],
    minimumAutoCandidates: 8,
  },
  {
    code: "cy",
    label: "Welsh",
    test: /\bwelsh\b|\bcymru\b/,
    roots: ["bwyd", "cnwd", "cymru", "cynhaeaf", "cynnyrch", "fferm", "ffermwyr", "leol", "marchnad", "ysgol"],
    forms: [
      "marchnadleol", "cynhyrchulleol", "ffermcymru", "ffermwyrcymru", "bwydlleol", "ffermleol", "bwydcymru", "ysgolfferm", "cnwdcymru", "cynhaeaf",
    ],
    minimumAutoCandidates: 8,
  },
]

export function getQuickLocalePolicy(description: string): QuickLocalePolicy | null {
  const text = normaliseText(description)
  const policy = QUICK_LOCALE_POLICIES.find((candidate) => candidate.test.test(text))
  if (!policy) return null
  return {
    code: policy.code,
    label: policy.label,
    roots: policy.roots,
    forms: policy.forms,
    minimumAutoCandidates: policy.minimumAutoCandidates,
  }
}

export function isVerifiedQuickLocaleCandidate(rawName: string, description: string): boolean {
  const policy = getQuickLocalePolicy(description)
  return Boolean(policy?.forms.includes(toLabel(rawName)))
}

export function hasConflictingQuickDominantMeaning(rawName: string, description: string): boolean {
  const name = toLabel(rawName)
  const text = normaliseText(description)
  const isSupportOrRecoveryBrief = /\b(?:teen(?:ager)?s?|therapy|emotional support|postpartum|new mothers?|childcare|child care)\b/.test(text)
  const isTeenSupportBrief = /\b(?:teen|teenager|teenagers)\b/.test(text)
    && /\b(?:therapy|counselling|counseling|emotional support)\b/.test(text)
  const isUrbanCatCareBrief = /\b(?:cat sitting|cat sitter|feline care)\b/.test(text)
    && /\b(?:apartment|city|cities|urban|home)\b/.test(text)
  const isFinanceBrief = /\b(?:accounting|bookkeeping|budget|budgeting|finance|financial|invoice|invoicing|invest(?:ing|ment|or|ors)?|money|mortgage|home loan|saving|savings|tax)\b/.test(text)
  const isMortgageComparisonBrief = /\b(?:mortgage|home loan)\b/.test(text)
    && /\b(?:comparison|compare|first[- ]time|buyers?)\b/.test(text)
  const isContractReviewBrief = /\bcontract review\b/.test(text)
  const isFreelancerAccountingBrief = /\b(?:accounting|bookkeeping|invoice|invoicing|tax)\b/.test(text)
    && /\b(?:freelancers?|freelance|independent|self-employed)\b/.test(text)
  const isRuralTelehealthBrief = /\btelehealth\b/.test(text)
    && /\b(?:rural|community clinics?|patients?)\b/.test(text)
  const isClimateMarketingBrief = /\bclimate\b/.test(text)
    && /\b(?:marketing|agency|brand)\b/.test(text)
  const isRecycledGoldJewelleryBrief = /\b(?:recycled|reclaimed)(?:\s+|-)gold\b/.test(text)
    && /\b(?:jewellery|jewelry|heirlooms?)\b/.test(text)
  if (name === "catnapt") return true
  if (isClimateMarketingBrief && name === "ecotype") return true
  if (isMortgageComparisonBrief && name === "paymentfit") return true
  if (/\b(?:cat sitting|cat sitter|feline care)\b/.test(text) && /(?:cattery|boarding|kennel)/.test(name)) return true
  if (
    isUrbanCatCareBrief
    && /^(?:urbancity|cityurban|trustedcity|citytrusted|trustedcare|caretrusted|kitten|fireside)$/.test(name)
  ) return true
  if (/\bpostpartum\b/.test(text) && /^(?:true|open|clear|kind|calm)(?:mama|mother)/.test(name)) return true
  if (isTeenSupportBrief && (
    /(?:unburden|privacy|whisper)/.test(name)
    || /(?:teen(?:calm|rest)|(?:calm|rest)teen)/.test(name)
  )) return true
  if (isFinanceBrief && name.includes("wise")) return true
  if (/\b(?:mortgage|home loan|first[- ]time buyer)\b/.test(text) && /(?:lending|equity|bond)/.test(name)) return true
  if (
    isMortgageComparisonBrief
    && /(?:loan|mortgage|lender|borrow)/.test(name)
    && !/(?:lens|view|rate|compare|choice|option|map|match|check|scope|scan)/.test(name)
  ) return true
  if (isMortgageComparisonBrief && /^(?:borrowview|firstrate)$/.test(name)) return true
  if (isMortgageComparisonBrief && /^(?:faircompare|homeview)$/.test(name)) return true
  if (isContractReviewBrief && (name.includes("verdict") || name === "truebrief")) return true
  if (isFreelancerAccountingBrief && name === "indiebooks") return true
  if (isRuralTelehealthBrief && /(?:lifeline|distance)/.test(name)) return true
  if (
    isRuralTelehealthBrief
    && /^(?:(?:rural|care|reach|clinic|access)(?:path|guide|well|pulse)|(?:path|guide|well|pulse)(?:rural|care|reach|clinic|access))$/.test(name)
  ) return true
  if (
    isClimateMarketingBrief
    && /^(?:(?:active|bold|brave|bright|clear|clean|credible|friendly|green|modern|noble|open|premium|smart|true)climate|climate(?:active|bold|brave|bright|clear|clean|credible|friendly|green|modern|noble|open|premium|smart|true))$/.test(name)
  ) return true
  if (
    isClimateMarketingBrief
    && /^(?:agency|advocacy|campaign|catalyst|collective|creative|growth|launchpad|mission|momentum|positioning|purpose|resonance|storytelling|studio|traction)$/.test(name)
  ) return true
  if (
    isClimateMarketingBrief
    && /^(?:claimarc|claimmap|ecomark|honestproof|honesteco|honestclaim|sharpclaim|storyarc|storymap|voicearc|voicemap)$/.test(name)
  ) return true
  if (
    /\bprivacy compliance\b/.test(text)
    && /\b(?:european|ecommerce|retailers?|teams?)\b/.test(text)
    && /^(?:lawful|safeprivacy)$/.test(name)
  ) return true
  if (
    isRecycledGoldJewelleryBrief
    && /^(?:renewal|goldagain|caratagain|goldreturn|kindgold|kindcarat|kindheir|kindloom)$/.test(name)
  ) return true
  if (/\blisbon\b/.test(text) && /\b(?:buyer|buyers|advisory|residential real estate)\b/.test(text) && /(?:tenant|rent)/.test(name)) return true
  if (/\bsolo women\b/.test(text) && /(?:sister|group)/.test(name)) return true
  if (/\b(?:ryokan|japan)\b/.test(text) && /(?:machiya|hearth|quietguest|guestquiet)/.test(name)) return true
  if (/\b(?:safari|conservation travel)\b/.test(text) && (
    name.includes("footfall")
    || /^(?:wildkenya|kenyawild|safariwild|wildsafari)$/.test(name)
    || /^(?:true|clear|quiet|noble|kind|open|bright|calm)wild$/.test(name)
  )) return true
  if (/\b(?:telehealth|healthcare access|rural patients?)\b/.test(text) && name.includes("healing")) return true
  const localeVerified = isVerifiedQuickLocaleCandidate(name, description)
  const localePolicy = getQuickLocalePolicy(description)
  if (
    localePolicy
    && !localeVerified
    && localePolicy.roots.some((root) => root.length >= 4 && name.includes(toLabel(root)))
  ) return true
  if (
    /\b(?:french|francais|quebec|sante|familles rurales)\b/.test(text)
    && !localeVerified
    && /(?:care|bridge|safe|true|calm|kind|open|clear|wise)/.test(name)
  ) return true
  if (
    /\b(?:welsh|cymru)\b/.test(text)
    && !localeVerified
    && /(?:school|market|bridge|safe|true|calm|kind|open|clear|wise)/.test(name)
  ) return true
  if (/^(?:true|clear|quiet|noble|kind|open|bright|calm)(?:kenya|india|japan|lisbon|berlin|quebec|cymru)$/.test(name)) return true
  if (/\b(?:india.*solar|solar.*india)\b/.test(text) && name === "indianchor") return true
  if (/\b(?:self custody|self-custody|crypto wallet)\b/.test(text) && name === "custodian") return true
  if (/\bpublic procurement\b/.test(text) && name === "quietender") return true
  if (/\b(?:cold chain|temperature controlled)\b/.test(text) && name === "pharmardent") return true
  if (/\b(?:kenya.*irrigation|irrigation.*kenya|smart irrigation)\b/.test(text) && name === "rainfed") return true
  if (/\b(?:dog treats?|working breeds?|canine treats?|high protein)\b/.test(text) && name === "workhorse") return true
  if (/\b(?:teen|teenager|teenagers)\b/.test(text) && /(?:mend|repair)/.test(name)) return true
  if (/\bpostpartum\b/.test(text) && /(?:mend|repair)/.test(name)) return true
  if (
    isSupportOrRecoveryBrief
    && /(?:broken|breakdown|burden|crisis|despair|grief|rescue|scar|sorrow|survival|trauma|unburden)/.test(name)
  ) return true
  if (/\b(?:recycled gold|recycled-gold)\b/.test(text) && /(?:gilt|gild)/.test(name)) return true
  if (name === "nightclub") {
    return !/\b(?:nightlife|night club|dance club|music venue|live entertainment|late night venue)\b/.test(text)
  }
  if (name === "trustfund") {
    return !/\b(?:trust fund|inheritance|estate planning|wealth management|fiduciary trust)\b/.test(text)
  }
  return false
}

const STOPWORDS = new Set([
  "a", "about", "and", "app", "are", "as", "at", "be", "brand", "business", "by", "company", "for",
  "from", "get", "in", "into", "is", "it", "my", "new", "of", "on", "online", "or", "our", "platform",
  "product", "service", "services", "software", "startup", "that", "the", "this", "to", "tool", "tools", "using", "with",
  "your",
])

const PROTECTED_BRANDS = new Set([
  "adidas", "airbnb", "amazon", "apple", "canva", "facebook", "figma", "google", "instagram", "lyft", "microsoft", "nestle",
  "everpure", "mountaindew", "overwatch",
  "firstbase", "fortify", "fundio", "fundly", "goodwill", "greenly", "kindle", "learndash", "ledgerly", "meetup", "namelix", "namolux", "neighbourly", "netflix", "nike", "opencart", "pocketly",
  "notion", "openai", "paystack", "paypal", "reddit", "scopely", "securly", "slack", "solaris", "spotify",
  "stripe", "tailwind", "tesla", "tiktok", "uber", "ubereats", "vercel", "youtube", "zoom",
  "drivepilot", "chargepilot", "trustpilot", "ledgerguard", "ledgerproof",
])

// A few short, unusually spelled marks are safe to protect as fragments. The
// general substring rule stays at five characters to avoid false positives
// such as ordinary words containing "uber" or "meta".
const PROTECTED_SHORT_BRAND_FRAGMENTS = new Set(["lyft"])

const UNSUITABLE_EXACT_NAMES = new Set([
  // Professional name exploration must not surface strong criminal or
  // abandonment meanings even when a model labels the word as Real Word.
  "jilt", "nabber", "textureskip",
  // Frozen-review failures: tautologies, implausible word order, misleading
  // pairings, negative dictionary meanings and established-name collisions.
  "archarc", "cartethical", "catfeline", "childparent", "chillcold", "craftcampus",
  "flintstone", "givegiving", "greenworks", "housemeal", "mothermama", "parentcarer", "pressforge",
  "privatemate", "purrfeline", "shelfethical", "skipcouple", "skipcraft", "skipgift", "tablecampus",
  "tablemeal", "texturehair", "threatgrid", "thriftyoung", "wiseacre", "kindrural",
  // Frozen balanced-60 manual-review failures: malformed forms, semantic
  // hazards, same-category collisions and generic exacts with insufficient
  // distinctiveness. These are admission failures, never ranking penalties.
  "aidsignal", "biomend", "bitefast", "bitstream", "carbonledger", "chargegrid", "childvetted",
  "civik", "clearwater", "clinik", "coilwhisp", "coldtrack", "curlkith", "cyberwatch", "dataworks",
  "emberedge", "familychild", "famillelocal", "farma", "fracta", "fractal", "invoiceflow", "kinship", "motorworks", "nurture",
  "pharmatrack", "pledge", "pledgeit", "privacywise", "publik", "riglet", "roameat", "slotify",
  "sprout", "stream", "sunworks", "tabloc", "urbanlunar", "wellchild", "wellness", "wellvetted",
  // Human-review v5: established same-category names and misleadingly close
  // surfaces are admission failures, regardless of case or construction label.
  "accesscare", "ancestry", "bankroll", "belonging", "biotrace", "brightgauge", "chargenode", "clearcarbon", "clearcover",
  "clearmind", "confluence", "courtyard", "fabrik", "fidelity", "hallmark", "handshake", "hostelry", "mouser", "onewater",
  "opencare", "openmind", "openplay", "opentable", "pattern", "quietframe", "saltwater", "solarworks", "stayjapan", "storyforge",
  "earnest", "papertrail", "reckon", "silverfern", "tally", "tenderflow", "tessera", "timely", "trueskin", "truskin", "watchtower",
  // Live editor-review failures: clipped words, decorative fake-language
  // suffixing, and a negative savings association.
  "authentik", "breathly", "burn", "cushora", "filig", "filigreea", "floridge", "frugio", "frugist",
  "gentgrove", "glintara", "homehoard", "lumic", "mithra", "prec", "solis", "spendly", "tinytreas", "verra",
])

/** Exact constructions observed recurring across unrelated live-audit briefs.
 * These are reusable model templates rather than category-owned ideas. Keep
 * one shared list for deterministic admission and model prompting/filtering. */
export const QUICK_CROSS_NICHE_DEFAULTS: ReadonlySet<string> = new Set([
  "beacon", "craftnest", "datasignal", "gridsignal", "joinly", "kindred", "ledgerbook", "nearbond",
  "calmwater", "clearcare", "clearproof", "cleartrace", "plainledger", "proofclear", "proofgrid", "proofguard",
  "proofpath", "proofsignal", "prooftrue", "readydrive", "ruralbridge", "ruralreach", "sanctum", "sicher",
  "cushion", "keystone", "nestegg", "signalfront", "signalproof", "trueframe", "trueproof", "waterpath",
])

const EXACT_FILLER = new Set([
  "brand", "brandname", "business", "company", "domain", "first", "invoice", "official", "online", "platform",
  "product", "service", "services", "solution", "solutions", "startup", "test", "testname",
])

const KNOWN_BROKEN = new Set([
  "analylity", "analystecu", "analyticsa", "analyticri", "analytytic", "asdfasdf", "basecybe", "childinic",
  "buildeer", "chargi", "cirk", "clinrapy", "counsil", "cowncil", "cybersecma", "cybersecli", "cybersecse",
  "cymur", "formrit", "fownder", "frme", "funereral", "gavelgrn", "growtrailz", "havnkind", "havnlearn", "isolalate",
  "mentorfn", "payfil", "plainbase", "powerana", "purrho", "sensosors", "sheled", "sexulness", "stok",
  "gilted", "wrdswap",
])

const DAMAGED_FRAGMENTS = [
  "hppy", "jlly", "pgo", "lxe", "prme", "frge", "pwer", "blst", "strke", "sbscri", "nighbor",
  "psswor", "snscree", "cybreat", "clinrap", "childinic", "havn",
] as const

const WEAK_EXACT_NAMES = new Set([
  "climaxes", "gamelink", "gptzone", "lawzen", "petplus", "privio", "producta", "purrfectly", "solutio",
])

const AWKWARD_CONSTRUCTIONS = [
  /^(?:home|rent|tenant|frame)ate$/,
  /^careow$/,
  /^(?:table|bite)unch$/,
  /^(?:join|bond)olt$/,
] as const

const ALLOWED_REPEATED_BIGRAMS = new Set(["at", "ba", "bo", "co", "ha", "ma", "na", "yo"])

/** Exact supply contexts define the most specific job-to-be-done for common
 * release briefs. They also take precedence in provider prompts and local
 * admission so audience adjectives cannot replace the actual product job. */
const QUICK_SUPPLY_CONTEXT_RULES: readonly ConceptRule[] = [
  // Balanced-60 release briefs need a job-specific primary cue before broad
  // words such as AI, data, finance, health, property or software can win.
  { test: /^(?=.*\b(?:household|family|families)\b)(?=.*\b(?:budget|budgeting|saving|savings)\b)/, roots: ["budget", "save", "pocket", "nest", "plan"], cue: "household financial clarity", promise: "help families plan everyday spending and saving with confidence" },
  { test: /^(?=.*\b(?:teen|teenager|teenagers)\b)(?=.*\b(?:therapy|counselling|counseling|emotional support)\b)/, roots: ["voice", "listen", "mind", "heard", "talk", "space", "ear", "support"], cue: "private teen emotional support", promise: "offer teenagers private, credible support without framing them as broken" },
  { test: /^(?=.*\b(?:cat sitting|cat sitter|feline care)\b)(?=.*\b(?:apartment|city|cities|urban|home)\b)/, roots: ["purr", "city", "home", "whisker", "nest", "cat", "paw", "visit", "watch"], cue: "trusted cat care", promise: "reassure city cat owners choosing attentive in-home sitting" },
  { test: /^(?=.*\bpostpartum\b)(?=.*\b(?:fitness|movement|strength|coaching)\b)/, roots: ["gentle", "move", "mama", "steady", "rise"], cue: "gentle postpartum fitness", promise: "support gradual movement and strength after birth without repair language" },
  { test: /^(?=.*\bnurses?\b)(?=.*\b(?:recruitment|recruiting|hire|hiring|hospitals?)\b)/, roots: ["nurse", "ward", "career", "local", "match"], cue: "ethical nurse recruitment", promise: "connect nurses with local hospitals through a fair and credible process" },
  { test: /^(?=.*\b(?:mortgage|home loan)\b)(?=.*\b(?:comparison|compare|first[- ]time|buyers?)\b)/, roots: ["rate", "compare", "choice", "lens", "buyer", "guided"], cue: "clear mortgage comparison", promise: "help first-time buyers compare borrowing choices clearly" },
  { test: /^(?=.*\b(?:childcare|child care)\b)(?=.*\b(?:network|vetted|carers?|parents?)\b)/, roots: ["child", "carer", "local", "vetted", "care"], cue: "vetted childcare choices", promise: "help parents find dependable local carers through a trusted network" },
  { test: /^(?=.*\b(?:donor|donors|fundraising)\b)(?=.*\b(?:crm|relationship|retention|nonprofits?)\b)/, roots: ["donor", "steward", "cause", "relation", "supporter"], cue: "donor relationship stewardship", promise: "help small nonprofit teams sustain credible donor relationships" },
  { test: /^(?=.*\b(?:quebec|french|francais|sante)\b)(?=.*\b(?:rural|famille|familles|health|healthcare|sante)\b)/, roots: ["soin", "sante", "proche", "village", "famille"], cue: "rural Quebec healthcare access", promise: "make dependable healthcare easier to reach for rural Quebec families" },
  { test: /^(?=.*\b(?:welsh|cymru)\b)(?=.*\b(?:farms?|fferm|marketplace|schools?)\b)/, roots: ["fferm", "marchnad", "leol", "cymru", "ysgol"], cue: "Welsh farm-to-school trade", promise: "connect Welsh farms and local schools through trustworthy local exchange" },
  { test: /^(?=.*\b(?:students?|university|campus)\b)(?=.*\b(?:meal|meals|food|delivery)\b)(?=.*\b(?:late night|membership|member|affordable)\b)/, roots: ["meal", "night", "campus", "pass", "bite"], cue: "late-night student meal membership", promise: "make affordable late-night meal access feel useful to university students" },
  { test: /^(?=.*\bpuzzle\b)(?=.*\b(?:studio|games?|adults?|thoughtful|cozy|cosy)\b)/, roots: ["puzzle", "logic", "mosaic", "riddle", "cozy"], cue: "playful puzzle games", promise: "invite adults into thoughtful, cosy puzzle play" },
  { test: /^(?=.*\bwedding\b)(?=.*\b(?:multicultural|couples?|planning|planner)\b)/, roots: ["vow", "weave", "mosaic", "joy", "union"], cue: "multicultural wedding planning", promise: "help multicultural couples organise a joyful celebration that feels like theirs" },
  { test: /^(?=.*\brestaurant\b)(?=.*\b(?:booking|reservation|table)\b)(?=.*\b(?:last minute|instant|tonight|now)\b)/, roots: ["table", "seat", "tonight", "dine", "reserve"], cue: "last-minute restaurant booking", promise: "help diners secure a good table at short notice" },
  { test: /^(?=.*\b(?:indie|independent)\b)(?=.*\b(?:music|artists?|listeners?|discovery)\b)/, roots: ["indie", "artist", "track", "sound", "listen"], cue: "indie music discovery", promise: "help curious listeners discover independent artists" },
  { test: /^(?=.*\b(?:language learning|learn languages?|speaking)\b)(?=.*\b(?:immigrants?|newcomers?|families)\b)/, roots: ["speak", "daily", "word", "learn", "family"], cue: "practical language learning", promise: "help recent immigrants build useful everyday speaking confidence" },
  { test: /^(?=.*\b(?:artisans?|handmade|maker-made)\b)(?=.*\b(?:gifts?|marketplace|market)\b)/, roots: ["maker", "gift", "hand", "parcel", "curio"], cue: "independent artisan gift marketplace", promise: "help shoppers discover distinctive gifts made by independent artisans" },
  { test: /^(?=.*\b(?:volunteer|volunteers)\b)(?=.*\b(?:coordination|neighbourhood|neighborhood|community groups?)\b)/, roots: ["help", "local", "hands", "civic", "neighbour"], cue: "neighbourhood volunteer coordination", promise: "help neighbourhood groups coordinate useful volunteer action" },
  { test: /^(?=.*\b(?:curls?|coils?|textured hair)\b)(?=.*\b(?:inclusive|hair care|beauty|brand)\b)/, roots: ["curl", "coil", "texture", "crown", "care"], cue: "inclusive curls-and-coils care", promise: "celebrate textured hair with inclusive, specialist care" },
  { test: /^(?=.*\b(?:balcony|balconies|small space)\b)(?=.*\b(?:gardening|garden|growing|kits?|plants?)\b)/, roots: ["balcony", "grow", "terrace", "kit", "harvest"], cue: "balcony gardening kits", promise: "make practical small-space growing achievable for apartment residents" },
  { test: /^(?=.*\balpine\b)(?=.*\b(?:skincare|skin care|botanicals?|mineral water)\b)/, roots: ["alpine", "mineral", "dew", "flora", "ritual"], cue: "alpine botanical skincare", promise: "express a refined skincare ritual rooted in alpine botanicals and mineral water" },
  { test: /^(?=.*\b(?:coastal|coast)\b)(?=.*\b(?:coffee|roaster|roasting|bakery)\b)/, roots: ["roast", "brew", "tide", "shore", "coffee"], cue: "coastal coffee ritual", promise: "combine neighbourhood roasting craft with coastal character" },
  { test: /^(?=.*\b(?:family business|family businesses|family-business)\b)(?=.*\bsuccession\b)/, roots: ["legacy", "heir", "future", "kin", "continuity"], cue: "family-business continuity", promise: "make succession planning feel structured and forward-looking" },
  { test: /^(?=.*\blisbon\b)(?=.*\b(?:international buyers?|residential real estate|property advisory|home buyers?)\b)/, roots: ["lisbon", "tejo", "home", "key", "guide"], cue: "Lisbon buyer advisory", promise: "guide international buyers through a trusted Lisbon home purchase" },
  { test: /^(?=.*\bsolo women\b)(?=.*\b(?:small group|travel|europe)\b)/, roots: ["roam", "compass", "journey", "cohort", "passage"], cue: "solo women group travel", promise: "help solo women find safe, supportive small-group journeys" },
  { test: /^(?=.*\bkenya\b)(?=.*\b(?:safari|conservation)\b)(?=.*\b(?:local guides?|locally owned|premium)\b)/, roots: ["safari", "ranger", "guide", "savanna", "steward"], cue: "locally guided conservation travel", promise: "signal credible conservation travel led by local Kenyan guides" },
  { test: /^(?=.*\b(?:ryokan|japan)\b)(?=.*\b(?:booking|design travellers?|modern|stay)\b)/, roots: ["ryokan", "engawa", "tatami", "stay", "quiet"], cue: "quiet ryokan hospitality", promise: "make a considered Japanese ryokan stay calm and easy to book" },
  { test: /^(?=.*\binterior design\b)(?=.*\b(?:restrained|warm|modern homes?|studio)\b)/, roots: ["warm", "form", "room", "joinery", "material"], cue: "warm restrained interiors", promise: "signal thoughtful modern interiors with warmth and restraint" },
  { test: /^(?=.*\b(?:adaptive reuse|reuse)\b)(?=.*\b(?:architecture|old buildings?|existing buildings?)\b)/, roots: ["adapt", "reuse", "heritage", "frame", "renew"], cue: "adaptive architectural reuse", promise: "balance old-building character with purposeful architectural renewal" },
  { test: /^(?=.*\b(?:recycled gold|reclaimed gold)\b)(?=.*\b(?:jewellery|jewelry|heirlooms?)\b)/, roots: ["gold", "carat", "renew", "heir", "loom"], cue: "recycled-gold jewellery craft", promise: "express precious material renewal and modern heirloom value" },
  { test: /^(?=.*\b(?:circular|recycled|reclaimed)\b)(?=.*\b(?:fashion|apparel|clothing|garments?|textiles?)\b)/, roots: ["wear", "thread", "weave", "cloth", "renew"], cue: "circular textile renewal", promise: "turn recovered textiles into desirable everyday clothing with credible circularity" },
  { test: /^(?=.*\b(?:ai|artificial intelligence)\b)(?=.*\b(?:scheduling|calendar)\b)(?=.*\bfounders?\b)/, roots: ["slot", "agenda", "assist", "founder", "time"], cue: "founder scheduling assistance", promise: "help busy founders delegate calendar coordination without generic AI hype" },
  { test: /^(?=.*\bbiotech\b)(?=.*\b(?:diagnostics?|disease detection)\b)(?=.*\b(?:early|earlier)\b)/, roots: ["bio", "early", "detect", "marker", "screen"], cue: "early biotech diagnostics", promise: "signal clinically credible detection before disease is harder to act on" },
  { test: /^(?=.*\bindia\b)(?=.*\bsolar\b)(?=.*\b(?:marketplace|installers?)\b)/, roots: ["solar", "panel", "install", "trade", "india"], cue: "India solar installer trade", promise: "connect Indian installers with dependable solar-equipment supply" },
  { test: /^(?=.*\b(?:employee onboarding|onboarding)\b)(?=.*\b(?:distributed|remote)\b)/, roots: ["welcome", "firstday", "join", "remote", "team"], cue: "distributed employee onboarding", promise: "give distributed employees a clear and welcoming first day" },
  { test: /^(?=.*\b(?:ev charging|electric vehicle charging|charging network)\b)(?=.*\b(?:apartments?|buildings?|residents?)\b)/, roots: ["charge", "resident", "garage", "park", "volt"], cue: "shared-building EV charging", promise: "make shared residential charging easy to locate and trust" },
  { test: /^(?=.*\b(?:developer|debugging)\b)(?=.*\b(?:observability|distributed systems?)\b)/, roots: ["trace", "debug", "stack", "runtime", "log"], cue: "developer observability", promise: "help developers trace failures across distributed systems" },
  { test: /^(?=.*\bprivacy compliance\b)(?=.*\b(?:european|ecommerce|retailers?)\b)/, roots: ["privacy", "consent", "retail", "euro", "data"], cue: "European retail privacy compliance", promise: "help European retailers manage customer-data consent and compliance" },
  { test: /^(?=.*\b(?:research|researchers?|university)\b)(?=.*\b(?:data collaboration|collaboration workspace|workspace)\b)/, roots: ["research", "peer", "share", "data", "proof"], cue: "university research collaboration", promise: "help university researchers share evidence securely with peers" },
  { test: /^(?=.*\b(?:self custody|self-custody|crypto wallet)\b)(?=.*\b(?:simple|beginners?|cautious)\b)/, roots: ["vault", "key", "own", "simple", "wallet"], cue: "beginner self-custody", promise: "make personal key ownership understandable to cautious beginners" },
  { test: /^(?=.*\bberlin\b)(?=.*\b(?:rental application|renter|tenants?)\b)/, roots: ["renter", "apply", "berlin", "lease", "clear"], cue: "Berlin rental application transparency", promise: "make Berlin rental applications clearer for tenants" },
  { test: /^(?=.*\b(?:accounting|bookkeeping|invoice|invoicing|tax)\b)(?=.*\b(?:freelancers?|freelance|independent|self-employed)\b)/, roots: ["invoice", "tax", "solo", "books", "ledger"], cue: "freelancer accounting", promise: "make invoices, tax and bookkeeping calmer for independent freelancers" },
  { test: /^(?=.*\bcontract review\b)(?=.*\b(?:small business|smb|legal teams?)\b)/, roots: ["clause", "review", "plain", "brief", "terms"], cue: "small-business contract review", promise: "make contract wording easier for small-business teams to review" },
  { test: /^(?=.*\btelehealth\b)(?=.*\b(?:rural|community clinics?|patients?)\b)/, roots: ["telecare", "clinic", "reach", "access", "near"], cue: "rural telehealth reach", promise: "extend credible clinical access to rural patients and community clinics" },
  { test: /^(?=.*\b(?:exam preparation|exam prep)\b)(?=.*\b(?:adaptive|secondary school|students?)\b)/, roots: ["exam", "adapt", "study", "ready", "school"], cue: "adaptive secondary exam readiness", promise: "adapt exam practice to secondary students' progress" },
  { test: /^(?=.*\bcarbon accounting\b)(?=.*\b(?:manufacturers?|mid market)\b)/, roots: ["carbon", "audit", "measure", "ledger", "factory"], cue: "manufacturer carbon accounting", promise: "make manufacturers' carbon records auditable and defensible" },
  { test: /^(?=.*\bkenya\b)(?=.*\birrigation\b)(?=.*\b(?:small farms?|low cost|tools?)\b)/, roots: ["drip", "water", "acre", "kenya", "grower"], cue: "Kenya small-farm irrigation", promise: "support affordable water decisions for Kenyan smallholders" },
  { test: /^(?=.*\b(?:water quality|safe drinking water)\b)(?=.*\b(?:humanitarian|organisations?|ngo|field)\b)/, roots: ["water", "field", "test", "aid", "proof"], cue: "humanitarian field water safety testing", promise: "make field water-test evidence clear for humanitarian teams" },
  { test: /^(?=.*\bfinance newsletter\b)(?=.*\b(?:first time investors?|first-time investors?)\b)/, roots: ["invest", "news", "plain", "market", "first"], cue: "first-investor finance briefing", promise: "explain markets plainly to first-time investors" },
  { test: /^(?=.*\binsurance claims?\b)(?=.*\b(?:homeowners?|support|transparent)\b)/, roots: ["claim", "home", "guide", "cover", "help"], cue: "homeowner claim guidance", promise: "guide homeowners through an uncertain insurance claim" },
  { test: /^(?=.*\bpublic procurement\b)(?=.*\b(?:councils?|suppliers?)\b)/, roots: ["tender", "council", "supply", "bid", "public"], cue: "council supplier procurement", promise: "keep council and supplier tender workflows transparent" },
  { test: /^(?=.*\bcybersecurity analytics\b)(?=.*\b(?:threat detection|enterprise)\b)/, roots: ["endpoint", "threat", "detect", "signal", "cyber"], cue: "endpoint threat analytics", promise: "turn endpoint threat telemetry into clear security decisions" },
  { test: /^(?=.*\b(?:dog treats?|working breeds?)\b)(?=.*\b(?:protein|active|working)\b)/, roots: ["canine", "protein", "treat", "fuel", "active"], cue: "working-dog nutrition", promise: "signal protein-led nutrition for active working dogs" },
  { test: /^(?=.*\b(?:sports recovery|recovery platform)\b)(?=.*\b(?:endurance athletes?|physiotherapists?)\b)/, roots: ["stamina", "recover", "physio", "endure", "mobility"], cue: "endurance athlete recovery", promise: "support measurable recovery for endurance athletes and physiotherapists" },
  { test: /^(?=.*\bclimate\b)(?=.*\b(?:marketing agency|marketing|agency)\b)(?=.*\b(?:startups?|technology)\b)/, roots: ["climate", "carbon", "eco", "story", "voice"], cue: "climate startup marketing", promise: "help climate-technology founders communicate credible momentum" },
  { test: /^(?=.*\b(?:cold chain|temperature controlled)\b)(?=.*\b(?:pharmacies|pharma)\b)/, roots: ["cold", "pharma", "temperature", "track", "route"], cue: "pharma cold-chain monitoring", promise: "keep temperature-sensitive pharmacy deliveries visible" },
  { test: /^(?=.*\besports\b)(?=.*\b(?:analytics|performance)\b)(?=.*\bteams?\b)/, roots: ["esport", "score", "team", "arena", "play"], cue: "competitive esports analytics", promise: "turn live competitive play into useful team decisions" },
  { test: /^(?=.*\b(?:investigative journalism|investigative)\b)(?=.*\bpodcast\b)(?=.*\bcorporate power\b)/, roots: ["probe", "press", "source", "power", "story"], cue: "investigative corporate-power podcast", promise: "signal independent scrutiny of corporate power" },
  { test: /^(?=.*\bwarehouse robotics\b)(?=.*\b(?:small factories|inventory)\b)/, roots: ["robot", "factory", "stock", "move", "small"], cue: "small-factory robotics", promise: "help smaller factories move inventory with affordable automation" },
  { test: /^(?=.*\b(?:quality inspection|visual inspection)\b)(?=.*\b(?:precision manufacturing|factory|manufacturing)\b)/, roots: ["inspect", "vision", "gauge", "quality", "factory"], cue: "factory visual inspection", promise: "make factory visual checks exact and dependable" },
  { test: /^(?=.*\b(?:auto repair|vehicle repair)\b)(?=.*\b(?:rural|mobile)\b)/, roots: ["repair", "motor", "road", "mobile", "rural"], cue: "mobile rural auto repair", promise: "make honest mobile vehicle help accessible to rural drivers" },
]

/** Multi-term briefs in which a concrete job-to-be-done must outrank broad
 * category or audience words elsewhere in the sentence. Only the first
 * matching primary rule is used; this prevents phrases such as "for young
 * families" or "for pharmacies" from changing the product category. */
const PRIMARY_CONCEPT_RULES: readonly ConceptRule[] = [
  { test: /^(?=.*\b(?:ai|artificial intelligence)\b)(?=.*\b(?:scheduling|calendar)\b)(?=.*\bfounders?\b)/, roots: ["slot", "agenda", "assist", "founder", "time"], cue: "founder scheduling assistance", promise: "help busy founders delegate calendar coordination without generic AI hype" },
  { test: /^(?=.*\bprivacy compliance\b)(?=.*\b(?:european|ecommerce|retailers?|teams?)\b)/, roots: ["privacy", "consent", "retail", "euro", "data"], cue: "European retail privacy compliance", promise: "help European retailers manage customer-data consent and compliance" },
  { test: /^(?=.*\b(?:accounting|bookkeeping|invoice|invoicing|tax)\b)(?=.*\b(?:freelancers?|freelance|independent|self-employed)\b)/, roots: ["invoice", "tax", "solo", "books", "ledger"], cue: "freelancer accounting", promise: "make invoices, tax and bookkeeping calmer for independent freelancers" },
  { test: /^(?=.*\b(?:donor|donors|fundraising)\b)(?=.*\b(?:crm|relationship|supporter|retention)\b)/, roots: ["donor", "relation", "steward", "trust", "outreach"], cue: "donor relationship stewardship", promise: "help nonprofit teams sustain credible donor relationships without implying grants, bequests or institutional finance" },
  { test: /^(?=.*\b(?:childcare|child care)\b)(?=.*\b(?:compare|comparison|network|families|vetted)\b)/, roots: ["child", "vetted", "local", "care", "parent"], cue: "vetted childcare choices", promise: "help families compare trustworthy childcare options without implying elder care or companionship" },
  { test: /^(?=.*\bpuzzle\b)(?=.*\b(?:studio|game|games|players?)\b)/, roots: ["puzzle", "cozy", "play", "logic", "game"], cue: "playful puzzle games", promise: "invite players into thoughtful, cozy puzzle play rather than a general maker or design service" },
  { test: /^(?=.*\bindie\b)(?=.*\b(?:music|artists?|listeners?|discovery)\b)/, roots: ["indie", "sound", "artist", "listen", "track"], cue: "indie music discovery", promise: "help listeners discover independent artists and help those artists feel seen" },
  { test: /^(?=.*\bbalcon(?:y|ies)\b)(?=.*\b(?:garden|gardening|kits?|growers?|plants?)\b)/, roots: ["balcony", "plant", "small", "grow", "kit"], cue: "balcony gardening kits", promise: "make practical small-space growing feel achievable for urban balcony gardeners" },
  { test: /^(?=.*\b(?:coastal|coast)\b)(?=.*\b(?:coffee|roaster|roasting)\b)/, roots: ["coffee", "brew", "roast", "coast", "shore"], cue: "coastal coffee ritual", promise: "appeal to coffee customers through roasting craft and coastal character rather than travel or property cues" },
  { test: /^(?=.*\blisbon\b)(?=.*\b(?:buyer|buyers|advisory|property|home)\b)/, roots: ["lisbon", "buyer", "home", "guide", "terra"], cue: "Lisbon buyer advisory", promise: "guide international home buyers through a trusted local purchase decision without suggesting rentals or tenant services" },
  { test: /^(?=.*\b(?:teen|teenager|teenagers)\b)(?=.*\b(?:therapy|emotional support|counselling|counseling)\b)/, roots: ["voice", "listen", "mind", "heard", "talk", "space", "ear", "support"], cue: "calm and emotional support", promise: "offer teenagers privacy, agency and a credible path to support without implying that they need fixing" },
  { test: /^(?=.*\b(?:marine|ocean|reef)\b)(?=.*\b(?:conservation|supporter|donor|impact)\b)/, roots: ["marine", "reef", "coast", "ocean", "tide", "shore"], cue: "marine conservation impact", promise: "make local conservation work and supporter impact feel visible and credible" },
  { test: /^(?=.*\b(?:maker spaces?|makerspaces?|workshops?)\b)(?=.*\b(?:safety|checklists?|tutors?)\b)/, roots: ["maker", "craft", "space", "safe", "skill", "tutor"], cue: "community workshop safety", promise: "make practical safety habits feel approachable for makers and volunteer tutors" },
  { test: /^(?=.*\b(?:vine|vineyard|grape)\b)(?=.*\b(?:disease|detection|scan)\b)/, roots: ["vine", "grape", "leaf", "scan", "crop", "care"], cue: "vineyard disease detection", promise: "help family vineyards spot plant-health risks early" },
  { test: /^(?=.*\b(?:cycling|riders?)\b)(?=.*\b(?:coach|coaching|training|distance)\b)/, roots: ["cycle", "rider", "pedal", "pace", "endure"], cue: "adaptive cycling progress", promise: "support riders building toward a demanding distance at a sustainable pace" },
  { test: /^(?=.*\b(?:audio|podcast|podcasters?)\b)(?=.*\b(?:edit|editing|interview|mobile)\b)/, roots: ["audio", "edit", "sound", "voice", "clip"], cue: "fast audio editing", promise: "make interview editing feel quick, precise and mobile-ready" },
  { test: /^(?=.*\b(?:ocean|marine|buoys?)\b)(?=.*\b(?:sensor|servicing|maintenance|predictive)\b)/, roots: ["ocean", "buoy", "sensor", "service", "watch"], cue: "marine monitoring and maintenance", promise: "help research crews anticipate maintenance needs in demanding waters" },
  { test: /^(?=.*\bmenopause\b)(?=.*\b(?:coaching|workplace|workers?|managers?)\b)/, roots: ["menopause", "coach", "shift", "workplace", "support"], cue: "confidential workplace wellbeing", promise: "make workplace support feel private, informed and practical" },
  { test: /^(?=.*\b(?:reusable|circular)\b)(?=.*\b(?:packaging|takeaway|containers?)\b)/, roots: ["return", "reuse", "pack", "loop", "dine"], cue: "circular packaging reuse", promise: "make returnable packaging easy for restaurants and customers to reuse" },
  { test: /^(?=.*\b(?:allergy|allergies)\b)(?=.*\b(?:restaurant|dining|food)\b)/, roots: ["allergy", "dine", "choice", "clear", "care"], cue: "allergy-aware dining confidence", promise: "help adults make informed restaurant choices around serious food allergies" },
  { test: /^(?=.*\b(?:credential|credentials|recognition)\b)(?=.*\b(?:refugee|displaced|engineers?|careers?)\b)/, roots: ["credential", "career", "engineer", "recognise", "proof"], cue: "career credential recognition", promise: "help displaced professionals rebuild recognised career standing" },
  { test: /^(?=.*\b(?:lending|credit unions?)\b)(?=.*\b(?:member-owned|cooperative|community|rural)\b)/, roots: ["member", "credit", "mutual", "lending", "trust"], cue: "transparent member lending", promise: "make cooperative lending decisions accountable and easy to follow" },
  { test: /^(?=.*\b(?:orchestra|orchestras|ensemble)\b)(?=.*\b(?:rehearsal|instrument|touring|logistics)\b)/, roots: ["orchestra", "ensemble", "rehearse", "tour", "instrument"], cue: "orchestra touring coordination", promise: "keep rehearsals, instruments and touring logistics moving together" },
  { test: /^(?=.*\b(?:domestic abuse|coercive relationships?)\b)(?=.*\b(?:safety|leaving|support|resources?)\b)/, roots: ["agency", "privacy", "safety", "onward", "support"], cue: "discreet safety and agency", promise: "support private, self-directed safety planning without exposing sensitive circumstances" },
  { test: /^(?=.*\b(?:fish|fishing|fisheries|seafood|catch)\b)(?=.*\b(?:traceability|traceable|buyers?|fleets?)\b)/, roots: ["catch", "trace", "fleet", "seafood", "proof"], cue: "seafood traceability", promise: "make catch provenance clear from small fleets through to seafood buyers" },
  { test: /^(?=.*\b(?:rail|trains?)\b)(?=.*\b(?:luxury|slow|journeys?|mountains?)\b)/, roots: ["rail", "night", "journey", "carriage", "mountain"], cue: "slow luxury rail travel", promise: "make unhurried overnight rail travel feel distinctive and considered" },
  { test: /^(?=.*\b(?:library|lending|borrow)\b)(?=.*\b(?:repair|tools?|belongings?)\b)/, roots: ["repair", "tool", "borrow", "mend", "library"], cue: "neighbourhood repair and reuse", promise: "help neighbours borrow practical tools and keep useful belongings in service" },
  { test: /\bpostpartum\b/, roots: ["restore", "gentle", "strength", "move", "mama"], cue: "physical progress and recovery", promise: "support gradual strength and confidence after birth without framing mothers as damaged" },
  { test: /^(?=.*\bsolo women\b)(?=.*\b(?:travel|group|europe)\b)/, roots: ["journey", "women", "roam", "compass", "together"], cue: "solo women group travel", promise: "help solo women find safe, supportive small-group travel without making artificial sisterhood claims" },
  { test: /^(?=.*\b(?:ryokan|japan)\b)(?=.*\b(?:booking|stay|hospitality|travel)\b)/, roots: ["ryokan", "stay", "guest", "quiet", "japan"], cue: "quiet ryokan hospitality", promise: "make a distinctive Japanese stay feel calm, considered and easy to book" },
  { test: /^(?=.*\brestaurant\b)(?=.*\b(?:booking|reservation|reserve|table)\b)/, roots: ["dine", "table", "guest", "reserve", "supper"], cue: "welcoming restaurant reservations", promise: "make finding and reserving the right table feel effortless" },
  { test: /\b(mortgage|home loan|first[- ]time buyer)\b/, roots: ["rate", "compare", "choice", "lens", "buyer", "guided"], cue: "clear mortgage comparison", promise: "make borrowing options easier to compare and act on" },
  { test: /\b(humanitarian|water quality|safe drinking water)\b/, roots: ["water", "quality", "aid", "field", "proof"], cue: "trusted water safety", promise: "make essential water-quality evidence clear in demanding field conditions" },
  { test: /^(?=.*\bkenya\b)(?=.*\birrigation\b)/, roots: ["kenya", "water", "acre", "drip", "field"], cue: "resilient irrigation and water access", promise: "support practical water decisions for Kenyan growers" },
  { test: /^(?=.*\b(?:family|family-business)\b)(?=.*\bsuccession\b)/, roots: ["legacy", "heir", "future", "kin", "family"], cue: "family-business continuity", promise: "make a sensitive succession decision feel structured and forward-looking" },
  { test: /\b(dog treats?|working breeds?|canine treats?|high protein)\b/, roots: ["treat", "protein", "canine", "active", "paw"], cue: "food and performance nutrition", promise: "signal rewarding, protein-led fuel for active working dogs" },
  { test: /\b(ev charging|electric vehicle charging|charging network)\b/, roots: ["charge", "volt", "drive", "grid", "lane"], cue: "dependable EV charging access", promise: "make modern charging infrastructure feel easy to find and trust" },
  { test: /\b(household budgeting|budgeting and savings|family budget)\b/, roots: ["budget", "save", "fund", "thrift", "ledger"], cue: "household financial clarity", promise: "help families plan spending and savings with confidence" },
  { test: /^(?=.*\bnurses?\b)(?=.*\b(?:recruitment|recruiting|hire|hiring|hospitals?)\b)/, roots: ["nurse", "talent", "ward", "hire", "care"], cue: "ethical nurse recruitment", promise: "connect nurses and hiring hospitals through a credible process" },
  { test: /^(?=.*\bquebec\b)(?=.*\b(?:sante|health|healthcare)\b)/, roots: ["sante", "quebec", "rural", "reach", "care"], cue: "rural Quebec healthcare access", promise: "make dependable care easier to reach for rural Quebec families" },
  { test: /^(?=.*\bwelsh\b)(?=.*\bmarketplace\b)(?=.*\bfarms?\b)/, roots: ["cymru", "market", "farm", "school", "harvest"], cue: "Welsh farm-to-school trade", promise: "connect Welsh farms and local schools through trusted exchange" },
  { test: /^(?=.*\b(?:students?|university)\b)(?=.*\b(?:meal|meals|food)\b)/, roots: ["meal", "campus", "night", "bite", "route"], cue: "student meal delivery", promise: "make affordable late-night food easier for university students to access" },
  { test: /\b(?:language learning|learning.*immigrants?|immigrants?.*language)\b/, roots: ["speak", "learn", "lingo", "voice", "bridge"], cue: "practical language learning", promise: "help recent immigrants build everyday language confidence" },
  { test: /^(?=.*\b(?:kenya|conservation)\b)(?=.*\bsafari\b)/, roots: ["safari", "wild", "guide", "trail", "kenya"], cue: "locally guided conservation travel", promise: "invite travellers into credible, locally guided safari experiences" },
  { test: /^(?=.*\bgold\b)(?=.*\b(?:recycled|heirloom|heirlooms)\b)/, roots: ["gold", "carat", "heir", "renew", "loom"], cue: "recycled-gold jewellery craft", promise: "express precious materials, renewal and modern heirloom value without suggesting plated metal" },
  { test: /\binterior design\b/, roots: ["room", "interior", "form", "warm", "frame"], cue: "warm restrained interiors", promise: "signal thoughtful spaces with a calm modern point of view" },
  { test: /\b(?:adaptive reuse|architecture.*old buildings?|old buildings?.*architecture)\b/, roots: ["reuse", "adapt", "frame", "renew", "arch"], cue: "adaptive architectural reuse", promise: "balance architectural heritage with purposeful renewal" },
  { test: /\b(?:employee onboarding|onboarding.*remote|distributed remote teams?)\b/, roots: ["welcome", "join", "team", "flow", "remote"], cue: "remote employee onboarding", promise: "make a distributed employee's first days clear and welcoming" },
  { test: /^(?=.*\b(?:research|researchers|university)\b)(?=.*\b(?:collaboration|workspace|data)\b)/, roots: ["research", "proof", "data", "share", "grid"], cue: "secure research collaboration", promise: "help university researchers share evidence with confidence" },
  { test: /\bcarbon accounting\b/, roots: ["carbon", "audit", "ledger", "measure", "proof"], cue: "auditable carbon accounting", promise: "make manufacturers' carbon records measurable and defensible" },
  { test: /\bpublic procurement\b/, roots: ["tender", "supply", "civic", "council", "trust"], cue: "transparent public procurement", promise: "make council and supplier workflows accountable and clear" },
  { test: /^(?=.*\bclimate\b)(?=.*\b(?:marketing|agency|brand)\b)/, roots: ["eco", "proof", "story", "claim", "voice"], cue: "climate-technology marketing", promise: "help climate-technology founders communicate credible momentum" },
  { test: /\b(?:cold chain|temperature controlled)\b/, roots: ["cold", "chain", "route", "track", "pharma"], cue: "pharmacy cold-chain delivery", promise: "keep temperature-sensitive pharmacy deliveries visible and dependable" },
  { test: /^(?=.*\besports\b)(?=.*\b(?:analytics|performance|metrics)\b)/, roots: ["score", "arena", "esport", "signal", "data"], cue: "real-time esports performance", promise: "turn live competitive performance into useful team decisions" },
  { test: /\b(?:investigative journalism|investigative.*podcast)\b/, roots: ["probe", "press", "story", "source", "signal"], cue: "independent investigative journalism", promise: "project editorial scrutiny without weakening public trust" },
  { test: /\bwarehouse robotics\b/, roots: ["robot", "stock", "flow", "factory", "route"], cue: "warehouse robotic movement", promise: "help small factories move inventory with visible control" },
  { test: /\b(?:quality inspection|precision manufacturing)\b/, roots: ["inspect", "gauge", "quality", "exact", "proof"], cue: "precision quality inspection", promise: "make manufacturing checks feel exact and dependable" },
  { test: /^(?=.*\b(?:auto|vehicle|motor)\b)(?=.*\brepair\b)(?=.*\brural\b)/, roots: ["repair", "motor", "drive", "road", "rural"], cue: "mobile rural auto repair", promise: "make honest vehicle help feel accessible to rural drivers" },
]

const CONCEPT_RULES: readonly ConceptRule[] = [
  // Multi-word commercial briefs must win over broad category matches below.
  // Keeping their shared roots first also prevents a later rule from attaching
  // a plausible but wrong story to the same visible construction part.
  { test: /\b(mortgage|home loan|first[- ]time buyer)\b/, roots: ["rate", "loan", "buyer", "home", "guided"], cue: "clear mortgage comparison", promise: "make borrowing options easier to compare and act on" },
  { test: /\b(humanitarian|water quality|safe drinking water)\b/, roots: ["water", "quality", "aid", "field"], cue: "trusted water safety", promise: "make essential water-quality evidence clear in demanding field conditions" },
  { test: /\b(?:kenya.*irrigation|irrigation.*kenya)\b/, roots: ["kenya", "water", "acre", "drip", "field"], cue: "resilient irrigation and water access", promise: "support practical water decisions for Kenyan growers" },
  { test: /\b(?:family.*succession|succession.*family|succession consulting)\b/, roots: ["legacy", "heir", "future", "kin", "family"], cue: "family-business continuity", promise: "make a sensitive succession decision feel structured and forward-looking" },
  { test: /\b(dog treats?|working breeds?|canine treats?|high protein)\b/, roots: ["treat", "protein", "canine", "active", "paw"], cue: "food and performance nutrition", promise: "signal rewarding, protein-led fuel for active working dogs" },
  { test: /\b(ev charging|electric vehicle charging|charging network)\b/, roots: ["charge", "volt", "drive", "grid"], cue: "dependable EV charging access", promise: "make modern charging infrastructure feel easy to find and trust" },
  { test: /\b(schedule|scheduling|calendar|appointment|booking|rota|reminder|time slot)\b/, roots: ["time", "slot", "tempo", "meet"], cue: "faster scheduling", promise: "remove calendar friction and save time" },
  { test: /\b(wedding|event|ticket|venue|couple)\b/, roots: ["event", "joy", "plan", "vow", "venue"], cue: "memorable occasions", promise: "feel celebratory without becoming sentimental or generic" },
  { test: /\b(cyber(?:security)?|security|password|threat|privacy|compliance)\b/, roots: ["guard", "shield", "vault", "secure", "cyber"], cue: "protection and trust", promise: "make risk feel controlled and dependable" },
  { test: /\b(analytics|observability|metrics|data|debug|detection|diagnostics?)\b/, roots: ["signal", "trace", "scope", "data", "detect"], cue: "clearer signals and insight", promise: "turn complex information into a confident next action" },
  { test: /\b(budget|budgeting|saving|savings|finance|financial|money|banking)\b/, roots: ["ledger", "fund", "save", "mint"], cue: "financial clarity", promise: "help people feel informed and in control of money" },
  { test: /\b(invoice|invoicing|accounting|tax|payroll|bookkeeping)\b/, roots: ["ledger", "books", "filing", "pay"], cue: "orderly financial work", promise: "make routine money administration feel simpler" },
  { test: /\b(legal|contract|clause|law|counsel|procurement)\b/, roots: ["clause", "brief", "proof", "counsel"], cue: "legal clarity", promise: "make consequential documents easier to review and trust" },
  { test: /\b(health|healthcare|clinic|clinics|clinical|hospital|hospitals|medical|patient|patients|therapy|therapist|wellness|medication|nurse|nurses|nursing|sant[ae])\b/, roots: ["care", "pulse", "vital", "mend", "clinic"], cue: "reassuring care", promise: "feel credible, human and supportive in a sensitive category" },
  { test: /\b(meditation|sleep|emotional|mental|mindful|calm|stress)\b/, roots: ["calm", "mind", "rest", "haven"], cue: "calm and emotional support", promise: "create a gentle sense of relief and safety" },
  { test: /\b(child|children|childcare|parent|parents|family|families|elder|elderly|senior|older adults?)\b/, roots: ["care", "kind", "family", "haven"], cue: "family support", promise: "sound warm enough for families and dependable enough for care decisions" },
  { test: /\b(dysphagia|swallow|speech therapy|paediatric|pediatric)\b/, roots: ["voice", "meal", "care", "clinic"], cue: "specialist therapy and everyday progress", promise: "make specialist support feel approachable to children and families" },
  { test: /\b(skin|skincare|beauty|cosmetic|salon|botanical)\b/, roots: ["skin", "glow", "flora", "care"], cue: "visible skin care and renewal", promise: "feel sensorial, considered and easy to remember" },
  { test: /\b(hair|curl|curls|coil|coils)\b/, roots: ["hair", "curl", "care", "glow"], cue: "visible hair care and renewal", promise: "feel sensorial, considered and easy to remember" },
  { test: /\b(fashion|textile|clothing|jewellery|jewelry|gold|heirloom)\b/, roots: ["thread", "weave", "gold", "gilt"], cue: "craft and personal style", promise: "signal considered materials and lasting design" },
  { test: /\b(food|meal|restaurant|bakery|coffee|roaster|cocoa|chocolate|grocery)\b/, roots: ["table", "bite", "brew", "roast"], cue: "food and shared enjoyment", promise: "feel appetising, social and easy to recall" },
  { test: /\b(cat|cats|feline|kitten)\b/, roots: ["purr", "home", "care", "cat"], cue: "trusted cat care", promise: "sound reassuring to owners while remaining warm and memorable" },
  { test: /\b(dog|dogs|pet|pets|paw|groom|walking|leash|animal)\b/, roots: ["paw", "walk", "tail", "leash"], cue: "trusted pet care", promise: "sound friendly to owners while staying practical" },
  { test: /\b(learn|learning|education|student|students|school|tutor|training|course|language)\b/, roots: ["learn", "mentor", "study", "spark"], cue: "learning and progress", promise: "suggest momentum without making education feel intimidating" },
  { test: /\b(travel|traveller|travellers|tour|tourism|hotel|stay|flight|safari|trip|holiday|ryokan)\b/, roots: ["stay", "guide", "wild", "travel", "trail"], cue: "discovery and movement", promise: "invite exploration while remaining useful and credible" },
  { test: /\b(eco|green|sustain\w*|recycled|renewable|climate|carbon|energy|solar)\b/, roots: ["green", "solar", "renew", "leaf"], cue: "measurable environmental progress", promise: "signal responsible choices without sounding worthy or vague" },
  { test: /\b(real estate|property|proptech|rent|rental|renter|tenant|tenants|home|housing|interior|architecture|building|renovation)\b/, roots: ["home", "rent", "tenant", "frame"], cue: "place and considered design", promise: "feel grounded, useful and visually distinctive" },
  { test: /\b(shop|shopping|ecommerce|e-commerce|retail|marketplace|seller|store)\b/, roots: ["cart", "market", "trade", "shelf"], cue: "easy commerce", promise: "make discovery and exchange feel straightforward" },
  { test: /\b(delivery|logistics|fleet|shipping|cargo|courier|supply)\b/, roots: ["route", "fleet", "cargo", "track"], cue: "reliable movement", promise: "suggest speed, visibility and operational control" },
  { test: /\b(warehouse|inventory|factory|manufactur|robot|robotics|inspection|construction|build|building|site safety)\b/, roots: ["build", "forge", "stock", "craft"], cue: "precise operations", promise: "sound capable in a practical industrial setting" },
  { test: /\b(developer|coding|code|api|distributed systems?|saas|software)\b/, roots: ["code", "stack", "trace", "logic"], cue: "technical fluency", promise: "feel credible to technical buyers without relying on forced jargon" },
  { test: /\b(ai|artificial intelligence|machine learning|automation)\b/, roots: ["logic", "mind", "signal", "pilot"], cue: "intelligent assistance", promise: "suggest useful guidance rather than generic AI hype" },
  { test: /\b(music|artist|listener|audio|sound|theatre|theater|stage)\b/, roots: ["sound", "tempo", "play", "stage"], cue: "creative discovery", promise: "feel expressive and easy to share" },
  { test: /\b(podcast|journalism|investigative|story|media)\b/, roots: ["story", "press", "voice", "signal"], cue: "credible storytelling", promise: "feel distinctive while preserving editorial trust" },
  { test: /\b(design|creative|art|studio|photography|interior)\b/, roots: ["frame", "muse", "craft", "form"], cue: "creative craft", promise: "leave room for a strong visual identity" },
  { test: /\b(farm|farms|agri|agriculture|irrigation|soil|vineyard|crop|garden|gardening|balcon)\b/, roots: ["water", "field", "grow", "green", "soil"], cue: "healthy growth", promise: "connect practical cultivation with visible progress" },
  { test: /\b(funeral|memorial|bereavement|legacy)\b/, roots: ["legacy", "honour", "haven", "ever"], cue: "dignity and remembrance", promise: "feel calm, respectful and suitable for a sensitive family decision" },
  { test: /\b(sexual wellness|adult wellness|intimacy)\b/, roots: ["well", "open", "balance", "care"], cue: "open, respectful wellbeing", promise: "feel mature and inclusive without becoming clinical or explicit" },
  { test: /\b(community|volunteer|volunteers|social network|social impact|isolated|neighbour|neighbor|support group)\b/, roots: ["join", "bond", "circle", "kind", "near"], cue: "human connection", promise: "make belonging and practical support immediately legible" },
  { test: /\b(electric vehicle|ev charging|charging)\b/, roots: ["drive", "charge", "volt", "grid"], cue: "confident electric mobility", promise: "suggest dependable movement and modern charging infrastructure" },
  { test: /\b(automotive|auto repair|repair|car|motor|driver)\b/, roots: ["drive", "motor", "repair"], cue: "confident vehicle service", promise: "suggest dependable movement and practical mechanical support" },
  { test: /\b(crypto|blockchain|wallet|self custody|token)\b/, roots: ["vault", "chain", "ledger", "trust"], cue: "secure ownership", promise: "feel controlled and credible to cautious users" },
  { test: /\b(research|university|scientist|academic)\b/, roots: ["proof", "study", "data", "signal"], cue: "evidence and collaboration", promise: "sound rigorous without feeling institutional" },
  { test: /\b(public|council|civic|government)\b/, roots: ["civic", "brief", "supply", "trust"], cue: "public accountability", promise: "feel transparent and dependable for multiple stakeholders" },
  { test: /\b(fitness|athlete|sport|training|strength|recovery|postpartum)\b/, roots: ["fit", "train", "recover", "move", "active"], cue: "physical progress and recovery", promise: "feel encouraging, capable and respectful of different starting points" },
  { test: /\b(nonprofit|charity|donor|donation|fundraising|cause)\b/, roots: ["donor", "fund", "give", "impact"], cue: "generosity and measurable impact", promise: "help supporters see trust, purpose and momentum" },
  { test: /\b(onboarding|remote work|distributed team|new hire|workplace)\b/, roots: ["team", "join", "flow", "remote"], cue: "a smoother start at work", promise: "make joining a team feel clear and welcoming" },
  { test: /\b(insurance|claim|claims|cover|policy)\b/, roots: ["claim", "cover", "safe", "fund"], cue: "reassurance and dependable cover", promise: "make an uncertain process feel easier to navigate" },
]

const DIRECT_ROOT_CUES: Readonly<Record<string, Omit<ConceptSignal, "root" | "verified"> & { root?: string }>> = {
  coffee: { root: "brew", cue: "coffee craft", promise: "feel warm, local and memorable" },
  coastal: { root: "shore", cue: "a coastal sense of place", promise: "carry a distinctive local atmosphere" },
  rural: { root: "field", cue: "rural reach", promise: "feel grounded and accessible" },
  lisbon: { root: "terra", cue: "a strong sense of place", promise: "support a locally recognisable identity" },
  welsh: { root: "welsh", cue: "Welsh identity", promise: "feel rooted in its community" },
  game: { root: "play", cue: "play and discovery", promise: "feel inviting and memorable" },
  fitness: { root: "move", cue: "active progress", promise: "suggest momentum without pressure" },
}

const PRIORITY_DIRECT_ROOTS = new Set(["coastal", "lisbon", "welsh"])

interface BriefAnchorRule {
  test: RegExp
  anchors: readonly string[]
}

/**
 * Short, readable surface cues for common concrete briefs. These are not
 * invented syllables: each cue is either present in the brief or a familiar
 * semantic shorthand. They let the offline generator retain the distinctive
 * part of a user's request instead of converging on the same category-wide
 * compounds whenever a model provider is unavailable.
 */
const BRIEF_ANCHOR_RULES: readonly BriefAnchorRule[] = [
  { test: /\b(?:marine|ocean|reef).*(?:conservation|supporter|donor|impact)|(?:conservation|supporter|donor|impact).*\b(?:marine|ocean|reef)\b/, anchors: ["marine", "reef", "coast", "ocean", "tide", "shore"] },
  { test: /\b(?:maker spaces?|makerspaces?|workshop safety)\b/, anchors: ["maker", "craft", "space", "safe", "skill", "tutor"] },
  { test: /\b(?:vine|vineyard|grape).*(?:disease|detection)|(?:disease|detection).*\b(?:vine|vineyard|grape)\b/, anchors: ["vine", "grape", "leaf", "scan", "crop", "care"] },
  { test: /\b(?:cycling|riders?).*(?:coach|coaching|distance)\b/, anchors: ["cycle", "rider", "pedal", "pace"] },
  { test: /\b(?:audio|podcast|podcasters?).*(?:edit|editing|interview)\b/, anchors: ["audio", "edit", "sound", "voice"] },
  { test: /\b(?:ocean|marine|buoys?).*(?:sensor|servicing|maintenance)\b/, anchors: ["ocean", "buoy", "sensor", "watch"] },
  { test: /\bmenopause\b/, anchors: ["menopause", "shift", "coach", "support"] },
  { test: /\b(?:reusable|circular).*(?:packaging|takeaway)\b/, anchors: ["return", "reuse", "pack", "loop"] },
  { test: /\b(?:allergy|allergies)\b/, anchors: ["allergy", "dine", "choice", "care"] },
  { test: /\b(?:credential|credentials|recognition)\b/, anchors: ["credential", "career", "proof", "standing"] },
  { test: /\b(?:member-owned|credit unions?|community lending)\b/, anchors: ["member", "credit", "mutual", "lending"] },
  { test: /\b(?:orchestra|orchestras|ensemble)\b/, anchors: ["orchestra", "ensemble", "rehearse", "tour"] },
  { test: /\b(?:domestic abuse|coercive relationships?)\b/, anchors: ["agency", "privacy", "onward", "support"] },
  { test: /\b(?:fish|fishing|fisheries|seafood|catch).*(?:traceability|traceable|buyers?|fleets?)\b/, anchors: ["catch", "trace", "fleet", "seafood"] },
  { test: /\b(?:rail|trains?).*(?:luxury|journeys?|mountains?)\b/, anchors: ["rail", "night", "journey", "carriage"] },
  { test: /\b(?:library|lending).*(?:repair|tools?)\b/, anchors: ["repair", "tool", "borrow", "library"] },
  { test: /\b(skincare.*alps|alps.*skincare)\b/, anchors: ["alpine", "floral", "silken", "lustre", "ritual", "spring"] },
  { test: /\b(household budgeting|budgeting and savings)\b/, anchors: ["budget", "thrift", "saver", "plan"] },
  { test: /\b(teenagers?|teen therapy)\b/, anchors: ["voice", "heard", "talk", "space", "listen", "mind"] },
  { test: /\b(cat sitting|feline)\b/, anchors: ["purr", "whisker", "nest", "visit", "watch", "paw"] },
  { test: /\bpostpartum\b/, anchors: ["mama", "gentle", "restore", "rebloom"] },
  { test: /\b(recruitment.*nurses?|nurses?.*hospitals?)\b/, anchors: ["nurse", "talent", "ward", "hire"] },
  { test: /\bmortgage\b/, anchors: ["rate", "buyer", "compare", "choice"] },
  { test: /\bchildcare\b/, anchors: ["child", "vetted", "local", "care"] },
  { test: /\b(donor|fundraising|nonprofits?)\b/, anchors: ["donor", "cause", "impact", "trust"] },
  { test: /\b(quebec|sante|familles rurales)\b/, anchors: ["quebec", "sante", "famille", "rural"] },
  { test: /\bwelsh\b/, anchors: ["cymru", "market", "harvest", "school"] },
  { test: /\b(university students?|student meals?)\b/, anchors: ["campus", "night", "bite", "supper"] },
  { test: /\b(puzzle|thoughtful games?)\b/, anchors: ["puzzle", "cozy", "play"] },
  { test: /\bwedding\b/, anchors: ["vow", "couple", "joy"] },
  { test: /\brestaurant\b/, anchors: ["dine", "table", "supper"] },
  { test: /\b(independent artists?|music discovery)\b/, anchors: ["indie", "sound", "artist"] },
  { test: /\b(language learning|immigrants?)\b/, anchors: ["lingo", "speak", "learn"] },
  { test: /\b(artisans?|handmade gifts?)\b/, anchors: ["maker", "gift", "craft", "hand"] },
  { test: /\b(volunteers?|neighbourhood community)\b/, anchors: ["civic", "help", "near", "bond"] },
  { test: /\b(curls?|coils?|textured hair)\b/, anchors: ["curl", "coil", "texture"] },
  { test: /\bbalcon(?:y|ies)\b/, anchors: ["balcony", "plant", "small"] },
  { test: /\balpine\b/, anchors: ["alpine", "mineral", "flora"] },
  { test: /\bcoastal\b/, anchors: ["coast", "shore", "roast"] },
  { test: /\bsuccession\b/, anchors: ["legacy", "heir", "future", "kin"] },
  { test: /\blisbon\b/, anchors: ["lisbon", "terra", "tejo", "alfama"] },
  { test: /\bsolo women\b/, anchors: ["journey", "sister", "group"] },
  { test: /\b(kenya.*safari|safari.*kenya)\b/, anchors: ["kenya", "safari", "wild"] },
  { test: /\b(japan|ryokan)\b/, anchors: ["ryokan", "japan", "quiet"] },
  { test: /\binterior design\b/, anchors: ["room", "warm", "interior"] },
  { test: /\b(adaptive reuse|old buildings)\b/, anchors: ["reuse", "adapt", "old"] },
  { test: /\b(recycled gold|heirlooms?)\b/, anchors: ["carat", "heir", "gold"] },
  { test: /\b(?:(?:scheduling|calendar).*founders?|founders?.*(?:scheduling|calendar))\b/, anchors: ["slot", "agenda", "founder"] },
  { test: /\b(scheduling|calendar)\b/, anchors: ["slot", "agenda", "time", "meet"] },
  { test: /\bbiotech\b/, anchors: ["bio", "early", "detect"] },
  { test: /\b(india.*solar|solar.*india)\b/, anchors: ["india", "solar", "sun"] },
  { test: /\b(remote teams?|distributed remote)\b/, anchors: ["remote", "team", "welcome"] },
  { test: /\b(ev charging|electric vehicle|charging network)\b/, anchors: ["volt", "charge", "drive"] },
  { test: /\b(observability|debugging distributed)\b/, anchors: ["debug", "dev", "trace"] },
  { test: /\bprivacy compliance\b/, anchors: ["privacy", "euro", "trust"] },
  { test: /\b(university researchers?|researchers?)\b/, anchors: ["research", "proof", "scholar"] },
  { test: /\b(self custody|crypto wallet)\b/, anchors: ["crypto", "custody", "vault"] },
  { test: /\bberlin\b/, anchors: ["berlin", "renter", "tenant"] },
  { test: /\b(freelancers?|freelance)\b/, anchors: ["solo", "invoice", "ledger"] },
  { test: /\bcontract review\b/, anchors: ["clause", "review", "brief"] },
  { test: /\b(telehealth.*rural|rural patients?)\b/, anchors: ["rural", "reach", "clinic", "access"] },
  { test: /\b(exam preparation|exam prep)\b/, anchors: ["exam", "study", "ready"] },
  { test: /\bcarbon accounting\b/, anchors: ["carbon", "audit", "ledger"] },
  { test: /\b(kenya.*irrigation|irrigation.*kenya)\b/, anchors: ["kenya", "water", "acre", "drip"] },
  { test: /\b(humanitarian|water quality)\b/, anchors: ["aid", "water", "field"] },
  { test: /\bfinance newsletter\b/, anchors: ["news", "invest", "plain", "market"] },
  { test: /\binsurance claims?\b/, anchors: ["claim", "cover", "home"] },
  { test: /\bpublic procurement\b/, anchors: ["council", "supply", "tender", "public"] },
  { test: /\bcybersecurity analytics\b/, anchors: ["cyber", "threat", "detect"] },
  { test: /\b(dog treats?|working breeds?)\b/, anchors: ["canine", "paw", "active"] },
  { test: /\b(?:dog walking|walking.*dog)\b/, anchors: ["walk", "paw", "city", "leash"] },
  { test: /\b(endurance athletes?|sports recovery)\b/, anchors: ["stamina", "athlete", "endure", "physio"] },
  { test: /\bclimate technology\b/, anchors: ["eco", "proof", "story", "claim", "voice"] },
  { test: /\b(cold chain|temperature controlled)\b/, anchors: ["cold", "chain", "pharma", "route"] },
  { test: /\besports\b/, anchors: ["arena", "score", "esport"] },
  { test: /\b(investigative journalism|investigative.*podcast)\b/, anchors: ["press", "probe", "story"] },
  { test: /\bwarehouse robotics\b/, anchors: ["stock", "robot", "factory"] },
  { test: /\b(quality inspection|precision manufacturing)\b/, anchors: ["inspect", "exact", "gauge", "quality"] },
  { test: /\b(auto repair|rural drivers?)\b/, anchors: ["motor", "repair", "rural"] },
]
const DEFERRED_CONCEPT_CUES = new Set([
  "faster scheduling",
  "easy commerce",
  "technical fluency",
  "intelligent assistance",
])

const GENERIC_SIGNALS: readonly ConceptSignal[] = [
  { root: "north", cue: "direction and confidence", promise: "support a clear, flexible brand story", verified: false },
  { root: "bright", cue: "positive momentum", promise: "feel optimistic without tying the brand to one feature", verified: false },
  { root: "clear", cue: "simplicity", promise: "make the offer feel easier to understand", verified: false },
  { root: "stride", cue: "forward movement", promise: "suggest useful progress and room to grow", verified: false },
]

const VIBE_COMPANIONS: Readonly<Record<QuickGenerateVibe, readonly string[]>> = {
  friendly: ["path", "nest", "mate", "kind", "bond", "haven", "circle", "bridge", "well", "wise"],
  playful: ["spark", "dash", "bloom", "joy", "rally", "pop", "beam", "play", "wink", "bright"],
  premium: ["crest", "mark", "guild", "hearth", "vale", "grove", "stone", "house", "noble", "loom"],
  tech: ["pilot", "grid", "stack", "scope", "logic", "node", "beam", "signal", "trace", "core"],
  clean: ["flow", "path", "line", "clear", "wise", "one", "calm", "true", "form", "frame"],
  bold: ["forge", "rise", "guard", "works", "quest", "front", "bolt", "brave", "summit", "max"],
}

/** Complete, reviewed words used only when a brief's own semantic vocabulary
 * cannot fill an honest Auto style slot. They are intentionally words rather
 * than pseudo-Latin syllable recipes; their rationale remains explicitly
 * tonal unless the brief supplies matching evidence. */
const REVIEWED_WHOLE_WORDS: Readonly<Record<QuickGenerateVibe, readonly string[]>> = {
  friendly: ["canopy", "harbor", "harmony", "kindness", "meadow", "ripple", "shelter", "solace", "sunward", "together", "uplift", "welcome", "willow"],
  playful: ["bounce", "confetti", "dapple", "jigsaw", "marble", "pepper", "piccolo", "pippin", "quiver", "riddle", "shuffle", "tumble", "whimsy", "wonder"],
  premium: ["atelier", "cashmere", "filigree", "gilded", "heirloom", "lustre", "meridian", "patina", "regalia", "serene", "silhouette", "tailored", "velvet"],
  tech: ["aperture", "binary", "cipher", "circuit", "kernel", "lattice", "matrix", "module", "nimbus", "signal", "syntax", "tandem", "vector", "vertex"],
  clean: ["balance", "cadence", "clarity", "linear", "outline", "quorum", "quiet", "simple", "steady", "tideline", "uniform", "verity"],
  bold: ["ardent", "banner", "bastion", "bravery", "command", "courage", "frontier", "hammer", "kinetic", "motive", "stride", "triumph", "valour", "vanguard"],
}

const REVIEWED_WHOLE_WORD_SET = new Set(Object.values(REVIEWED_WHOLE_WORDS).flat())

/** Tight-length capacity is deliberately made from reviewed complete words,
 * never from an open-ended syllable recipe. These directions are only used
 * after the normal contextual pool underfills, so rich briefs keep their
 * more specific first-page vocabulary. */
const REVIEWED_COMPACT_WHOLE_WORDS = [
  "amber", "brio", "coda", "cove", "ember", "fable", "flora", "haven",
  "lumen", "merit", "morrow", "mosaic", "novel", "orbit", "prism", "rally", "river",
  "roam", "sage", "solace", "sonic", "spark", "tandem", "tempo", "terra", "valour", "velvet",
  "verve", "vivid", "willow", "zenith",
] as const

/** Transparent, reviewed A+B constructions for an explicit Compound request.
 * Both complete pieces remain recoverable from the visible label. */
const REVIEWED_COMPACT_COMPOUND_PAIRS = [
  ["sun", "ray"], ["sea", "way"], ["air", "way"], ["oak", "way"], ["bay", "way"], ["elm", "way"],
  ["ash", "way"], ["up", "link"], ["link", "up"], ["set", "go"], ["aim", "go"], ["team", "go"],
  ["work", "go"], ["plan", "go"], ["care", "go"], ["flow", "go"], ["ever", "go"], ["kind", "go"],
] as const

/** Compact but grammatical lead+head constructions for an explicit Short
 * Phrase request. The lead registry below makes the visible morphology, not a
 * caller-provided label, authoritative. */
const REVIEWED_COMPACT_PHRASE_PAIRS = [
  ["new", "era"], ["new", "day"], ["new", "way"], ["one", "way"], ["go", "well"], ["go", "far"],
  ["go", "live"], ["go", "bold"], ["go", "free"], ["be", "well"], ["be", "calm"], ["be", "bold"],
  ["be", "true"], ["be", "wise"], ["up", "next"], ["up", "well"],
  ["go", "next"], ["go", "fast"], ["go", "home"], ["go", "west"], ["go", "east"], ["go", "high"],
  ["go", "more"], ["be", "more"], ["be", "fair"], ["be", "here"], ["be", "good"], ["up", "ward"],
  ["up", "beat"], ["up", "side"], ["up", "rise"], ["now", "go"], ["try", "it"], ["try", "new"],
  ["we", "go"], ["we", "care"], ["we", "move"], ["my", "way"],
] as const

/** Each pair has a replayable two-letter-or-longer seam. These are explicit
 * Brandable capacity only; Auto never receives these generic fusions. */
const REVIEWED_COMPACT_FUSION_PAIRS = [
  ["sun", "unity"], ["sea", "eager"], ["sea", "eagle"], ["sea", "early"], ["air", "irate"], ["air", "irony"],
  ["ash", "share"], ["ash", "shine"], ["ash", "shape"], ["fin", "inner"], ["fin", "inlet"], ["win", "inlet"],
  ["kin", "inlet"], ["tan", "angel"], ["tan", "ankle"], ["can", "anvil"], ["pan", "anvil"], ["car", "arise"],
  ["car", "arena"], ["far", "arise"], ["bar", "arena"], ["nor", "orbit"], ["nor", "organ"], ["for", "orbit"],
  ["cor", "orbit"], ["lum", "umami"], ["sol", "olive"], ["val", "alert"], ["val", "align"], ["val", "alive"],
  ["vel", "elite"], ["bri", "river"], ["pro", "robot"], ["pro", "roman"], ["eco", "coral"],
] as const

const REVIEWED_COMPACT_ALTERNATE_SOURCES = [
  "sonic", "metric", "cosmic", "optic", "tropic", "atomic", "auric", "rustic", "mimic", "iconic",
  "heroic", "tactic", "static", "mystic", "ethic", "logic", "music", "magic", "basic", "comic",
  "topic", "tonic", "cubic", "relic", "lyric", "medic", "phonic", "photo", "graph", "phase",
] as const

/** Reviewed complete words tied to the verified semantic cue selected from a
 * brief. The banks are cue-specific rather than vibe-specific, so a tone does
 * not become a hidden claim of relevance and neighbouring niches do not all
 * receive the same decorative vocabulary. */
const CONTEXTUAL_SEMANTIC_WORDS: Readonly<Record<string, readonly string[]>> = {
  "private teen emotional support": [
    "rapport", "candour", "latitude", "steadfast", "listening", "breathing",
    "openness", "expression", "dialogue", "grounding", "checkin", "understood",
  ],
  "gentle postpartum fitness": ["steadiness", "renewal", "rebalance", "grounded", "gradual", "mobility", "poise", "resurgence", "flourish", "capacity"],
  "late-night student meal membership": ["afterhours", "nightowl", "midnight", "canteen", "takeaway", "platter", "savoury", "snackable", "bitesize", "pantry"],
  "multicultural wedding planning": ["mosaic", "union", "garland", "jubilee", "promise", "celebrate", "confetti", "harmony", "gathering", "together"],
  "last-minute restaurant booking": ["tonight", "opening", "seating", "supper", "brasserie", "savour", "appetite", "tableware", "dining", "convivial", "bistro", "aperitif", "walkin", "availability", "spontaneous"],
  "independent artisan gift marketplace": ["keepsake", "curio", "handiwork", "curation", "parcel", "treasure", "showcase", "boutique", "artistry", "atelier"],
  "neighbourhood volunteer coordination": ["neighbourly", "solidarity", "camaraderie", "fellowship", "commons", "coalition", "participation", "goodwill", "together", "alliance", "helpfulness", "civicminded", "voluntary", "service"],
  "inclusive curls-and-coils care": ["ringlet", "tendril", "spiral", "definition", "radiance", "porosity", "lustrous", "textured", "coiled", "crowned"],
  "alpine botanical skincare": ["edelweiss", "alpenglow", "glacial", "dewdrop", "serenity", "velvety", "silken", "luminosity", "purity", "softness"],
  "marine conservation impact": ["stewardship", "reefside", "seascape", "shoreline", "current", "tideway", "bluewater", "measurable"],
  "community workshop safety": ["checklist", "readiness", "safeguard", "practice", "guidance", "capable", "diligence", "workbench"],
  "vineyard disease detection": ["vigilance", "leafcare", "screening", "foresight", "vineyard", "diagnosis", "watchful", "earlybird"],
  "adaptive cycling progress": ["kinetic", "athletic", "aerobic", "dynamic", "rhythmic", "mechanic", "cyclonic", "ergonomic"],
  "fast audio editing": ["sonic", "acoustic", "rhythmic", "dynamic", "metric", "phonic", "graphic", "mechanic", "waveform"],
  "marine monitoring and maintenance": ["seaworthy", "uptime", "watchkeep", "buoyancy", "forecast", "offshore", "vigilance", "readiness"],
  "confidential workplace wellbeing": ["wellbeing", "balance", "candour", "renewal", "comfort", "thrive", "confidence", "informed"],
  "circular packaging reuse": ["returnable", "circular", "refill", "durable", "deposit", "rotation", "washable", "loopback"],
  "circular textile renewal": ["rewoven", "remade", "respun", "mended", "selvedge", "reclaimed", "reprise", "continuum", "afterlife", "enduring", "rethread", "reweave"],
  "allergy-aware dining confidence": ["assured", "clarity", "welcome", "informed", "careful", "trusted", "choice", "comfort", "confidence", "decisive"],
  "career credential recognition": [
    "recognition", "vocation", "pathway", "standing", "qualified", "profession", "rebuild", "credential",
    "accreditation", "capable", "validated", "equivalence",
  ],
  "transparent member lending": [
    "mutual", "member", "equity", "cooperative", "fairness", "transparent", "accountable", "commons",
    "stewardship", "solidarity", "dividend", "reciprocity", "covenant", "collective",
  ],
  "orchestra touring coordination": [
    "ensemble", "cadence", "rehearsal", "touring", "rostrum", "overture", "movement", "harmony",
    "sonata", "concert", "symphony", "backstage",
  ],
  "discreet safety and agency": [
    "agency", "privacy", "discreet", "pathway", "autonomy", "shelter", "strength", "onward",
    "dignity", "resolve", "refuge", "selfworth", "sanctuary", "courage", "fortitude", "empowered",
  ],
  "seafood traceability": ["provenance", "lineage", "verified", "harbour", "waypoint", "seachain", "ledger", "sourcebook", "traceable", "accountable"],
  "slow luxury rail travel": ["moonlit", "sleeper", "passage", "velvet", "alpine", "starlight", "horizon", "nocturne"],
  "neighbourhood repair and reuse": ["mending", "toolkit", "neighbour", "resource", "restore", "workshop", "commons", "secondlife", "handwork"],
  "calm and emotional support": [
    "rapport", "candour", "latitude", "steadfast", "listening", "breathing",
    "openness", "expression", "dialogue", "grounding", "checkin", "understood",
  ],
  "household financial clarity": [
    "headroom", "nestegg", "provision", "prudence", "margin", "reserve", "allowance", "thrift",
    "cushion", "steward", "safekeeping", "wherewithal", "frugality", "economy", "thriftiness", "rainyday",
  ],
  "reassuring care": [
    "solace", "lifeline", "outreach", "healing", "nearness", "comfort", "presence", "reassurance",
    "reachable", "connection", "accessway",
  ],
  "trusted cat care": [
    "pounce", "tabby", "feline", "mouser", "moggie", "nuzzle", "cuddle",
    "snooze", "hearth", "homing", "patter", "dozing", "curled", "whisker",
    "pawprint", "hearthside", "whiskered", "purring", "housecat",
    "calico", "mewing", "meow", "mews", "velvet", "silken", "tortie", "torbie",
    "felid", "tuxedo", "mitted", "perch", "cosset",
  ],
  "physical progress and recovery": [
    "renewal", "rebalance", "resilience", "restoration", "gradual", "steadiness", "grounded", "measured",
    "comeback", "stamina", "endurance", "rebound", "capacity", "tenacity", "fortitude", "mobility",
  ],
  "ethical nurse recruitment": ["vocation", "calling", "roster", "placement", "profession", "credential", "workforce", "career", "clinician", "opportunity"],
  "clear mortgage comparison": [
    "equate", "parity", "calibrate", "bearings", "benchmark",
    "yardstick", "landmark", "headway", "navigate", "discern",
    "collate",
    "keystone",
    "overview", "guidance", "shortlist", "contrast", "ratecard", "choices", "options", "sidebyside",
  ],
  "family support": ["guardian", "playroom", "daylight", "nurturing", "kinfolk", "shelter", "sanctuary", "caregiving"],
  "vetted childcare choices": ["guardian", "playroom", "daylight", "nurturing", "kinfolk", "shelter", "sanctuary", "caregiving", "trustworthy", "neighbourhood"],
  "generosity and measurable impact": ["patronage", "goodwill", "uplift", "catalyst", "benefactor", "endowment", "bequest", "philanthropy"],
  "donor relationship stewardship": [
    "stewardship", "engagement", "cultivation", "loyalty", "constancy", "retention", "gratitude", "commitment", "donorship", "supportership",
  ],
  "rural Quebec healthcare access": ["proximite", "voisinage", "accessible", "entraide", "bienetre", "familial", "ruralite", "vitalite"],
  "Welsh farm-to-school trade": ["harvest", "exchange", "stewardship", "seasonal", "provenance", "schoolyard", "localism", "produce"],
  "student meal delivery": ["midnight", "platter", "canteen", "snackable", "savoury", "bitesize", "nightowl", "takeaway"],
  "creative craft": ["tinker", "workshop", "curiosity", "handiwork", "artistry", "brainwave", "invention", "ingenuity"],
  "playful puzzle games": ["riddle", "jigsaw", "enigma", "rebus", "mosaic", "conundrum", "brainwave", "tessera"],
  "memorable occasions": ["promise", "garland", "everafter", "confetti", "jubilee", "festivity", "betrothal", "celebrate"],
  "welcoming restaurant reservations": ["savour", "banquet", "appetite", "gathering", "tableware", "hospitality", "brasserie", "convivial", "feasting", "conviviality"],
  "creative discovery": ["chorus", "encore", "refrain", "melody", "sonic", "harmony", "timbre", "rhythm", "sonorous", "soundscape"],
  "indie music discovery": ["chorus", "encore", "refrain", "melody", "sonic", "harmony", "timbre", "rhythm", "sonorous", "soundscape"],
  "practical language learning": ["fluency", "dialogue", "lexicon", "parlance", "vocabulary", "eloquence", "expression", "conversation"],
  "easy commerce": ["keepsake", "treasure", "parcel", "curation", "showcase", "boutique", "emporium"],
  "human connection": ["commons", "neighbour", "together", "fellowship", "camaraderie", "solidarity", "neighbourly", "coalition", "alliance"],
  "visible hair care and renewal": ["spiral", "radiance", "lustrous", "crown", "definition", "ringlet", "porosity", "tendril"],
  "healthy growth": ["verdant", "seedling", "terrace", "flourish", "greenery", "blossom", "sprouting", "cultivate"],
  "balcony gardening kits": ["verdant", "seedling", "terrace", "flourish", "greenery", "blossom", "sprouting", "cultivate"],
  "visible skin care and renewal": ["dewdrop", "botanica", "luminosity", "serenity", "alpenglow", "edelweiss", "softness", "botanical", "dewiness", "glacial", "silken", "velvety"],
  "a coastal sense of place": ["harbour", "driftwood", "seabird", "shoreline", "headland", "maritime", "seascape", "anchorage", "saltwater", "tidewater"],
  "coastal coffee ritual": ["roastery", "crema", "arabica", "espresso", "barista", "cafetiere", "tidewater", "shoreline", "crumb", "seabird"],
  "family-business continuity": ["lineage", "posterity", "continuum", "dynasty", "inheritance", "heritage", "continuance", "stewardship", "progeny", "generational", "forebear", "transition", "successor"],
  "a strong sense of place": ["azulejo", "portico", "quarter", "miradouro", "terracotta", "riverside", "calcada", "estuary", "hillside"],
  "Lisbon buyer advisory": ["azulejo", "portico", "quarter", "miradouro", "terracotta", "riverside", "calcada", "estuary", "hillside"],
  "discovery and movement": ["wayfarer", "voyage", "roaming", "compass", "odyssey", "passage", "sojourn", "itinerary", "escapade"],
  "solo women group travel": [
    "voyage", "roaming", "compass", "odyssey", "passage", "sojourn", "itinerary", "escapade",
    "coterie", "circle", "cohort", "gather", "kinship",
  ],
  "locally guided conservation travel": [
    "savanna", "trackway", "horizon", "wildlife", "ecosystem", "migration", "wilderness", "wildlands",
    "stewardship", "conservancy", "ranger", "wayfinder",
  ],
  "quiet ryokan hospitality": [
    "tatami", "engawa", "stillness", "lantern", "tranquil", "ceremony", "omotenashi", "kokoro", "washitsu", "welcome",
    "gracious", "repose",
  ],
  "warm restrained interiors": ["proportion", "palette", "dwelling", "joinery", "ambience", "material", "textural", "spatial", "tonality", "tactile", "harmonious", "composure", "layering", "livability"],
  "adaptive architectural reuse": ["palimpsest", "revival", "patina", "fabric", "continuity", "renaissance", "conserve", "reclaim"],
  "recycled-gold jewellery craft": [
    "filigree", "heirloom", "carat", "goldsmith", "burnished", "auriferous",
    "recast", "reforged", "reminted", "reworked", "recrafted", "upcycled",
    "auric", "alchemic", "metallic",
  ],
  "founder scheduling assistance": [
    "cadence", "clockwise", "sequence", "punctual", "synchronic", "clockwork",
    "timekeeper", "routine", "planner", "timetable", "appointment", "calendar", "diary", "scheduler", "chronology", "daybook",
  ],
  "early biotech diagnostics": ["forerunner", "precursor", "sentinel", "prognosis", "screening", "biomarker", "indicator", "foresight", "vigilance", "forewarning"],
  "India solar installer trade": ["sunbelt", "panel", "installer", "exchange", "marketplace", "sourcing", "wholesale", "network", "sunward", "junction", "catalogue", "inventory", "merchant", "stockist", "distributor", "procure", "equipment", "supplier", "trading", "commerce"],
  "distributed employee onboarding": ["arrival", "orientation", "induction", "reception", "readiness", "welcome", "foyer", "doorway", "onramp", "wayfinding", "threshold", "kickoff"],
  "shared-building EV charging": ["kilowatt", "recharge", "junction", "conduit", "waypoint", "parkade", "carport", "resident", "socket", "outlet", "current"],
  "developer observability": ["telemetry", "visibility", "heartbeat", "aperture", "instrument", "diagnostic", "tracer", "stacktrace", "logbook", "runtime", "console"],
  "European retail privacy compliance": [
    "discretion", "restraint", "boundary", "custodian", "anonymity", "privity",
    "confidant", "circumspect", "confide", "fiduciary",
    "integrity", "sanctum",
    "permission", "diligence",
    "assurance", "lawful", "verifiable", "redaction", "erasure", "portability",
    "stewardship",
    "discreet", "trustworthy", "seclusion", "consent", "compliance",
  ],
  "university research collaboration": ["peerwork", "inquiry", "evidence", "synthesis", "consensus", "scholarly", "colloquium", "fellowship", "commons", "archive", "discovery", "dialogue"],
  "beginner self-custody": ["keystore", "lockbox", "sovereign", "autonomy", "control", "masterkey", "stronghold", "ownership", "safekeeping", "keyring"],
  "Berlin rental application transparency": ["tenancy", "leasehold", "applicant", "dossier", "paperwork", "doorway", "threshold", "residence", "address", "occupancy", "disclosure", "openness"],
  "freelancer accounting": [
    "reckoner", "accrue", "abacus", "orderly", "reckoning", "provision",
    "numerate", "tallier", "headroom", "wherewithal",
    "tabulate", "billable", "setaside", "lineitem",
    "receivable", "remit", "earnings", "sundry", "footing", "netting",
    "carryover", "outlay", "turnover",
    "settled", "squared", "reconcile", "tally", "balance", "reckon",
    "column", "journal", "accrual", "receipt", "cashbook", "daybook",
    "credits", "debits", "postings",
  ],
  "small-business contract review": [
    "redline", "proviso", "covenant", "stipulate", "whereas", "legible",
    "plainspoken", "caveat", "verbatim", "preamble",
    "accord", "markup", "amend", "redraft",
    "addendum", "provision", "whereas", "recital", "annex", "termsheet", "fineprint",
    "annotation", "legible", "plainspoken", "wording", "clarifier", "readable",
  ],
  "rural telehealth reach": [
    "relay", "outpost", "crossing", "proximity", "nearness", "vicinity",
    "presence", "confluence", "adjacency", "rendezvous",
    "beacon", "conduit", "waypoint", "waystation",
    "reachable", "reachability", "outreach", "telecare",
    "connected", "coverage", "accessible", "availability", "telepresence", "vicinity", "linkage",
  ],
  "adaptive secondary exam readiness": ["mastery", "revision", "readiness", "aptitude", "milestone", "practice", "rehearsal", "coursework", "progress", "workbook", "question"],
  "manufacturer carbon accounting": ["inventory", "baseline", "footprint", "abatement", "veracity", "traceable", "reduction", "accounting", "measure", "ledger", "audittrail", "reckoning"],
  "Kenya small-farm irrigation": ["furrow", "reservoir", "aqueduct", "headwater", "catchment", "watercourse", "irrigation", "dripline", "smallholder", "acreage", "harvest", "rainfall"],
  "humanitarian field water safety testing": ["potable", "wellhead", "aquifer", "watershed", "indicator", "fieldwork", "sample", "assay", "testing", "purity", "hygiene", "lucidity"],
  "first-investor finance briefing": ["briefing", "bulletin", "digest", "outlook", "dispatch", "readout", "primer", "explainer", "firstlook", "chronicle", "newsletter"],
  "homeowner claim guidance": ["recourse", "remedy", "settlement", "recovery", "assurance", "safeguard", "indemnity", "adjuster", "guidance", "roadmap", "resolution"],
  "council supplier procurement": ["tendering", "probity", "oversight", "openness", "governance", "compliance", "accountable", "bidding", "sourcing", "supplier", "stewardship", "integrity"],
  "endpoint threat analytics": ["telemetry", "sentinel", "vigilance", "hardening", "firewall", "watchful", "detector", "defender", "tripwire", "forensics", "spectrum"],
  "working-dog nutrition": ["nourish", "vigour", "stamina", "heartiness", "hardiness", "athletic", "muscle", "reward", "rations", "protein", "provisions"],
  "endurance athlete recovery": ["recovery", "restoration", "resilience", "comeback", "stamina", "endurance", "rebound", "mobility", "tenacity", "conditioning", "physiology"],
  "climate startup marketing": [
    "credence", "narrate", "cohere", "reframe", "clarion", "herald", "salience",
    "cogent", "resound", "verity",
    "convey", "eloquent", "persuade", "cutthrough", "stance",
    "amplify", "candour", "impact", "signal",
    "narrative", "storyline", "resonance", "framing", "uptake", "traction", "evidence", "adoption", "demand",
    "position", "message", "briefing",
  ],
  "pharma cold-chain monitoring": ["coldstore", "thermostat", "waybill", "refrigerant", "coolant", "preserve", "preservation", "thermic", "temperature", "coldchain", "monitoring", "thermometer"],
  "competitive esports analytics": ["scoreboard", "reflex", "tactical", "ranking", "reaction", "teamplay", "gamecraft", "matchcraft", "prowess", "playbook", "leaderboard", "bracket"],
  "investigative corporate-power podcast": ["scrutiny", "disclosure", "witness", "exposure", "testimony", "watchdog", "reportage", "revelation", "sourcebook", "deepdive", "spotlight"],
  "small-factory robotics": ["automaton", "kinematic", "assembly", "mechanism", "actuator", "machinery", "kinetic", "workcell", "material", "handling", "motion", "automation"],
  "factory visual inspection": ["calibre", "tolerance", "standard", "metric", "benchmark", "exactitude", "metrology", "accuracy", "visual", "eyesight", "inspection", "focus", "aperture"],
  "mobile rural auto repair": ["roadside", "roadworthy", "wrench", "mechanic", "toolbox", "garage", "ignition", "servicing", "callout", "workshop", "breakdown"],
  "faster scheduling": ["cadence", "interval", "punctual", "tempo", "sequence", "timely", "synchronic", "clockwork", "promptness"],
  "clearer signals and insight": [
    "insight", "vantage", "sentinel", "biomarker", "screening", "prognosis", "clarity", "foresight",
    "telemetry", "aperture", "watchtower", "visibility", "diagnosis", "observant", "heartbeat", "monitoring",
  ],
  "measurable environmental progress": ["radiant", "current", "daystar", "wattage", "sunrise", "voltage", "renewable", "sunshine"],
  "remote employee onboarding": ["arrival", "belonging", "handshake", "foyer", "orientation", "greeting", "induction", "reception", "doorway", "readiness"],
  "dependable EV charging access": ["kilowatt", "junction", "conduit", "roadster", "waypoint", "motion", "recharge", "motorway"],
  "protection and trust": [
    "discretion", "consent", "sanctity", "boundary", "confidential", "seclusion", "permission", "discreet", "guardrail", "trustworthy",
    "bastion", "vigilance", "fortress", "watchful", "defender", "bulwark", "shielding", "redoubt", "hardening", "counterguard",
    "firewall", "hardpoint",
  ],
  "secure research collaboration": ["inquiry", "evidence", "concord", "synthesis", "archive", "consensus", "peerwork", "scholarly", "confluence", "discovery"],
  "secure ownership": ["sovereign", "keystore", "autonomy", "stronghold", "lockbox", "dominion", "possession", "masterkey", "control"],
  "place and considered design": ["doorway", "leasehold", "address", "residence", "tenancy", "entryway", "habitat", "occupancy"],
  "orderly financial work": ["balance", "tally", "receipt", "dividend", "bookwork", "reckoning", "accrual", "worksheet", "bookkeep", "journal"],
  "legal clarity": ["covenant", "redline", "docket", "counsel", "statute", "proviso", "accord", "legible", "markup", "annotation"],
  "learning and progress": ["mastery", "readiness", "revision", "milestone", "scholar", "aptitude", "literacy", "acumen", "capability", "mentorship", "pathfinder"],
  "auditable carbon accounting": ["inventory", "abatement", "baseline", "footprint", "climatic", "veracity", "traceable", "reduction"],
  "resilient irrigation and water access": ["harvest", "rainfall", "reservoir", "aqueduct", "furrow", "headwater", "catchment", "dripline", "watercourse"],
  "trusted water safety": ["watershed", "purity", "wellhead", "aquifer", "lucidity", "potable", "hygiene", "indicator"],
  "financial clarity": ["briefing", "outlook", "bulletin", "digest", "insider", "dispatch", "readout", "chronicle", "solvent"],
  "reassurance and dependable cover": ["assurance", "safeguard", "remedy", "settlement", "recovery", "fairness", "indemnity", "recourse"],
  "transparent public procurement": ["stewardship", "tendering", "accountable", "oversight", "integrity", "governance", "probity", "compliance", "openness"],
  "food and performance nutrition": ["vigour", "reward", "muscle", "heartiness", "athletic", "rations", "robust", "hardiness", "nourish"],
  "climate-technology marketing": [
    "evidence", "message", "category", "adoption", "demand", "narrate",
    "credence", "framing", "briefing", "position", "proofed", "uptake",
  ],
  "pharmacy cold-chain delivery": ["preservation", "thermostat", "waybill", "coolant", "coldstore", "thermic", "preserve", "refrigerant"],
  "real-time esports performance": ["scoreboard", "reflex", "tactical", "prowess", "ranking", "tactic", "reaction", "teamplay", "gamecraft", "matchcraft"],
  "independent investigative journalism": ["scrutiny", "disclosure", "witness", "exposure", "testimony", "watchdog", "reportage", "revelation"],
  "warehouse robotic movement": ["automaton", "kinetic", "assembly", "mechanism", "orchestrate", "actuator", "machinery", "kinematic"],
  "precision quality inspection": ["calibre", "tolerance", "standard", "metric", "benchmark", "exactitude", "metrology", "accuracy"],
}

/** A complete semantic word may be plausible in several neighbouring briefs,
 * but repeating it across page-one batches is generic ideation rather than a
 * niche-owned direction. Shared words therefore have one reviewed owner; all
 * other cues still retain their own deeper bank and construction supply. */
const CONTEXTUAL_SEMANTIC_WORD_OWNER_OVERRIDES: Readonly<Record<string, string>> = {
  accountable: "council supplier procurement",
  aperture: "developer observability",
  assurance: "homeowner claim guidance",
  candour: "private teen emotional support",
  commons: "neighbourhood volunteer coordination",
  confidence: "private teen emotional support",
  daybook: "freelancer accounting",
  dialogue: "practical language learning",
  disclosure: "investigative corporate-power podcast",
  doorway: "Berlin rental application transparency",
  fellowship: "neighbourhood volunteer coordination",
  governance: "council supplier procurement",
  guidance: "clear mortgage comparison",
  harmony: "multicultural wedding planning",
  indicator: "early biotech diagnostics",
  inventory: "manufacturer carbon accounting",
  junction: "shared-building EV charging",
  material: "warm restrained interiors",
  openness: "council supplier procurement",
  practice: "adaptive secondary exam readiness",
  provisions: "working-dog nutrition",
  readiness: "adaptive secondary exam readiness",
  reckoning: "freelancer accounting",
  renewal: "gentle postpartum fitness",
  restoration: "endurance athlete recovery",
  resilience: "endurance athlete recovery",
  safeguard: "homeowner claim guidance",
  solace: "private teen emotional support",
  stewardship: "donor relationship stewardship",
  threshold: "Berlin rental application transparency",
  together: "neighbourhood volunteer coordination",
  vigilance: "endpoint threat analytics",
  waypoint: "shared-building EV charging",
}

const CONTEXTUAL_SEMANTIC_WORD_OWNERS: ReadonlyMap<string, string> = (() => {
  const cuesByWord = new Map<string, Set<string>>()
  const exactSupplyCues = new Set(QUICK_SUPPLY_CONTEXT_RULES.map((rule) => rule.cue))
  for (const [cue, words] of Object.entries(CONTEXTUAL_SEMANTIC_WORDS)) {
    for (const word of words.map(toLabel)) {
      const cues = cuesByWord.get(word) || new Set<string>()
      cues.add(cue)
      cuesByWord.set(word, cues)
    }
  }

  return new Map(Array.from(cuesByWord.entries()).map(([word, cues]) => {
    const reviewedOwner = CONTEXTUAL_SEMANTIC_WORD_OWNER_OVERRIDES[word]
    if (reviewedOwner && cues.has(reviewedOwner)) return [word, reviewedOwner]
    const ordered = Array.from(cues).sort((left, right) => left.localeCompare(right))
    return [word, ordered.find((cue) => exactSupplyCues.has(cue)) || ordered[0]]
  }))
})()

const CONTEXTUAL_SEMANTIC_WORD_SET = new Set(Object.values(CONTEXTUAL_SEMANTIC_WORDS).flat())

/** Manually reviewed, concept-owned blend sources for explicit Brandable
 * exploration. Every pair must still replay through a two-or-more-letter
 * orthographic seam; this is deliberately not a global padding bank. */
const REVIEWED_CONTEXT_FUSION_PAIRS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  "marine conservation impact": [
    ["marine", "nexus"], ["reef", "effort"], ["coast", "steward"], ["coast", "story"],
    ["ocean", "answer"], ["tide", "delight"], ["shore", "renewal"], ["cause", "seaway"],
    ["marine", "network"], ["shore", "resource"], ["coral", "alliance"], ["tide", "depend"],
  ],
  "community workshop safety": [
    ["mentor", "order"], ["tutor", "order"], ["space", "center"], ["guard", "ardent"],
    ["shop", "optimum"], ["safe", "feature"], ["care", "reliable"], ["skill", "illume"],
    ["maker", "energy"], ["care", "resource"], ["safe", "feeling"], ["team", "ambit"],
  ],
  "vineyard disease detection": [
    ["vine", "nexus"], ["vine", "neural"], ["leaf", "affinity"], ["scan", "answer"],
    ["crop", "optics"], ["care", "reveal"], ["grape", "people"], ["leaf", "aftercare"],
    ["vine", "network"], ["crop", "openness"],
  ],
}

/** Editorially reviewed A+B directions for exact supply contexts. These are
 * complete visible words, not fragments or seed-specific answers, and each
 * pair stays reusable for paraphrases that resolve to the same job. */
const REVIEWED_CONTEXT_COMPOUND_PAIRS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  "founder scheduling assistance": [
    ["slot", "pilot"], ["agenda", "relay"], ["meet", "cadence"], ["founder", "flow"],
    ["day", "pilot"], ["assist", "relay"], ["time", "weave"], ["slot", "wise"],
    ["calendar", "cue"], ["routine", "relay"], ["slot", "craft"], ["agenda", "path"],
  ],
  "European retail privacy compliance": [
    ["data", "seal"], ["consent", "pact"], ["data", "custody"], ["retail", "pact"],
    ["fair", "consent"], ["data", "dignity"], ["quiet", "data"], ["privacy", "lock"],
    ["euro", "guard"], ["shop", "shield"], ["dignity", "seal"], ["data", "guard"],
    ["consent", "key"], ["data", "rights"], ["privacy", "pact"], ["retail", "guard"],
    ["consent", "log"], ["data", "accord"], ["data", "policy"], ["policy", "guard"],
    ["erasure", "desk"], ["basis", "log"], ["notice", "trace"],
    ["rights", "pact"], ["data", "steward"], ["consent", "flow"], ["euro", "consent"],
    ["shop", "consent"], ["retail", "shield"], ["privacy", "proof"], ["consent", "ledger"],
    ["trust", "pact"], ["guard", "ledger"],
    ["self", "scope"], ["choice", "ward"], ["fair", "keeping"], ["right", "scope"],
    ["trust", "ledger"], ["quiet", "proof"], ["care", "trace"], ["clear", "basis"],
    ["choice", "keep"], ["quiet", "right"],
  ],
  "freelancer accounting": [
    ["solo", "tally"], ["ledger", "loom"], ["sole", "books"], ["own", "ledger"],
    ["tax", "folio"], ["invoice", "way"], ["figure", "flow"], ["tax", "compass"],
    ["ledger", "light"], ["number", "craft"], ["tally", "mark"], ["invoice", "calm"],
    ["solo", "ledger"], ["solo", "tax"], ["sole", "ledger"], ["solo", "figures"],
    ["cash", "clarity"], ["invoice", "flow"], ["filing", "flow"], ["invoice", "grid"],
    ["tax", "ledger"], ["cash", "ledger"], ["filing", "desk"], ["receipt", "flow"],
    ["tally", "desk"], ["remit", "folio"], ["tax", "thread"],
    ["solo", "books"], ["indie", "books"], ["book", "craft"], ["folio", "works"],
    ["sum", "works"], ["book", "harbour"],
    ["cash", "cadence"], ["count", "well"], ["work", "worth"], ["receipt", "path"],
    ["due", "wise"], ["cash", "frame"], ["invoice", "ink"], ["bill", "craft"],
  ],
  "Kenya small-farm irrigation": [
    ["acre", "meter"], ["acre", "flow"], ["rain", "meter"], ["drip", "wise"],
    ["water", "yield"], ["furrow", "flow"], ["field", "drop"], ["acre", "source"],
    ["grower", "grid"], ["grower", "meter"],
    ["rain", "relay"], ["field", "pulse"], ["kenya", "flow"], ["soil", "source"],
    ["crop", "current"], ["source", "field"],
  ],
  "Welsh farm-to-school trade": [
    ["farm", "exchange"], ["school", "market"], ["harvest", "link"], ["field", "table"],
    ["farm", "share"], ["produce", "path"], ["crop", "class"], ["market", "field"],
    ["farm", "bridge"], ["local", "harvest"], ["field", "school"], ["crop", "market"],
  ],
  "household financial clarity": [["nest", "wise"], ["pocket", "plan"], ["home", "buffer"], ["family", "fund"]],
  "private teen emotional support": [
    ["voice", "haven"], ["mind", "harbour"], ["voice", "anchor"], ["mind", "room"],
    ["open", "ear"], ["heard", "here"], ["steady", "talk"], ["brave", "space"],
    ["listen", "well"], ["listen", "care"], ["heard", "well"], ["talk", "haven"],
    ["space", "within"], ["ear", "within"], ["support", "way"], ["rapport", "room"],
  ],
  "trusted cat care": [
    ["purr", "nest"], ["city", "whisker"], ["home", "purr"], ["cat", "kin"],
    ["cat", "visit"], ["paw", "home"], ["visit", "purr"], ["watch", "cat"], ["home", "watch"],
    ["cat", "sit"], ["pet", "sit"], ["cat", "nap"], ["paw", "kin"],
    ["fur", "pal"], ["mew", "pal"], ["mew", "kin"],
  ],
  "small-business contract review": [
    ["clause", "view"], ["terms", "pact"], ["review", "grid"], ["plain", "terms"],
    ["close", "read"], ["second", "read"], ["redline", "room"],
    ["margin", "note"], ["risk", "note"], ["terms", "desk"],
    ["draft", "delta"], ["clause", "flag"],
    ["version", "pair"], ["change", "check"],
    ["clause", "lens"], ["terms", "trace"], ["contract", "lens"], ["clause", "trace"],
    ["term", "scan"], ["risk", "scan"], ["review", "trail"], ["markup", "flow"],
    ["redline", "grid"], ["clause", "audit"], ["term", "guard"], ["wording", "lens"],
    ["clause", "check"], ["terms", "scope"], ["review", "lens"], ["clause", "craft"],
    ["review", "mark"], ["terms", "signal"],
    ["brief", "proof"], ["review", "path"], ["terms", "clear"], ["clause", "wise"],
    ["clause", "light"], ["pact", "lens"], ["word", "watch"], ["word", "beacon"],
    ["draft", "beacon"], ["deal", "frame"],
  ],
  "rural telehealth reach": [
    ["clinic", "reach"], ["vital", "reach"], ["care", "access"], ["health", "reach"],
    ["clinic", "link"], ["near", "clinic"], ["clinic", "route"], ["near", "pulse"],
    ["care", "beacon"], ["rural", "beacon"], ["care", "outpost"], ["care", "conduit"],
    ["vital", "span"], ["vital", "bridge"], ["clinic", "mesh"], ["health", "post"],
    ["rural", "signal"], ["clinic", "node"], ["care", "channel"], ["remote", "pulse"],
    ["clinic", "wave"], ["care", "horizon"],
    ["tele", "visit"], ["tele", "portal"], ["remote", "visit"], ["rural", "relay"],
    ["patient", "link"], ["village", "call"], ["clinic", "window"], ["vital", "signal"],
    ["clinic", "relay"], ["health", "relay"], ["care", "portal"], ["remote", "care"],
    ["rural", "reach"], ["care", "connect"], ["patient", "way"], ["care", "window"],
    ["reach", "care"], ["near", "care"], ["local", "clinic"], ["rural", "care"],
    ["access", "link"], ["care", "coverage"], ["telecare", "link"], ["clinic", "access"],
    ["care", "bridge"],
  ],
  "rural Quebec healthcare access": [
    ["family", "bridge"], ["care", "harbour"], ["village", "care"], ["health", "bridge"],
    ["local", "health"], ["family", "link"], ["care", "anchor"], ["rural", "reach"],
    ["health", "relay"], ["care", "circle"], ["family", "care"], ["village", "link"],
    ["family", "relay"], ["health", "link"], ["family", "route"], ["health", "route"],
    ["reach", "harbour"], ["reach", "beacon"], ["family", "circle"], ["health", "circle"],
  ],
  "gentle postpartum fitness": [["gentle", "rise"], ["mama", "stride"], ["steady", "bloom"], ["move", "again"]],
  "ethical nurse recruitment": [["ward", "link"], ["nurse", "match"], ["ward", "match"], ["nurse", "link"]],
  "clear mortgage comparison": [
    ["loan", "lens"], ["buyer", "view"], ["rate", "lens"], ["rate", "view"],
    ["borrow", "brief"], ["term", "guide"], ["apr", "check"],
    ["offer", "board"], ["term", "sift"], ["payment", "range"],
    ["borrow", "gauge"], ["cost", "check"],
    ["term", "lens"], ["cost", "scope"], ["payment", "map"], ["offer", "grid"],
    ["apr", "view"], ["quote", "check"], ["term", "compass"], ["repay", "view"],
    ["rate", "finder"], ["loan", "scope"], ["buyer", "compass"], ["loan", "map"],
    ["buyer", "atlas"], ["home", "compass"], ["rate", "check"], ["rate", "scope"],
    ["rate", "choice"], ["loan", "choice"], ["home", "choice"], ["borrow", "lens"],
    ["borrow", "map"], ["choice", "key"], ["buyer", "lens"], ["home", "view"], ["loan", "match"],
    ["rate", "map"], ["loan", "compass"], ["rate", "bridge"], ["loan", "bearing"],
    ["loan", "atlas"], ["choice", "atlas"],
    ["rate", "prism"], ["offer", "balance"], ["loan", "beacon"], ["term", "scale"],
    ["borrow", "atlas"],
  ],
  "vetted childcare choices": [["care", "circle"], ["local", "nest"], ["child", "wise"], ["carer", "link"]],
  "donor relationship stewardship": [["donor", "keep"], ["cause", "circle"], ["steward", "link"], ["donor", "bridge"]],
  "late-night student meal membership": [["meal", "pass"], ["night", "plate"], ["campus", "bite"], ["late", "table"]],
  "playful puzzle games": [["puzzle", "loom"], ["logic", "nest"], ["mind", "spark"], ["riddle", "room"]],
  "multicultural wedding planning": [["vow", "mosaic"], ["joy", "weave"], ["union", "plan"], ["vow", "atlas"]],
  "last-minute restaurant booking": [["last", "table"], ["seat", "now"], ["table", "flash"], ["dine", "tonight"]],
  "indie music discovery": [["indie", "echo"], ["track", "trail"], ["artist", "wave"], ["sound", "find"]],
  "practical language learning": [["word", "bridge"], ["speak", "daily"], ["family", "fluent"], ["talk", "bridge"]],
  "independent artisan gift marketplace": [["maker", "parcel"], ["hand", "found"], ["gift", "foundry"], ["craft", "curio"]],
  "neighbourhood volunteer coordination": [["local", "hands"], ["help", "circle"], ["civic", "kind"], ["near", "hands"]],
  "inclusive curls-and-coils care": [["coil", "crown"], ["curl", "kind"], ["texture", "glow"], ["curl", "ritual"]],
  "balcony gardening kits": [["rail", "garden"], ["terrace", "kit"], ["city", "garden"], ["balcony", "kit"]],
  "alpine botanical skincare": [["mineral", "dew"], ["alpine", "veil"], ["flora", "ritual"], ["alpine", "silk"]],
  "coastal coffee ritual": [["tide", "roast"], ["shore", "brew"], ["coast", "cup"], ["roast", "harbour"]],
  "family-business continuity": [["legacy", "loom"], ["future", "heir"], ["heir", "stone"], ["kin", "continuum"]],
  "Lisbon buyer advisory": [["tejo", "home"], ["lisbon", "key"], ["terra", "buyer"], ["tejo", "estate"]],
  "solo women group travel": [["roam", "circle"], ["compass", "crew"], ["roam", "cohort"], ["compass", "roam"]],
  "locally guided conservation travel": [
    ["ranger", "trail"], ["guide", "savanna"], ["kenya", "guide"], ["safari", "trail"],
    ["wild", "guide"], ["kenya", "trail"], ["local", "ranger"], ["wild", "savanna"],
    ["eco", "trail"], ["guide", "track"], ["savanna", "path"], ["ranger", "way"],
  ],
  "quiet ryokan hospitality": [["engawa", "stay"], ["tatami", "guest"], ["ryokan", "calm"], ["quiet", "lantern"]],
  "warm restrained interiors": [["warm", "form"], ["quiet", "room"], ["calm", "joinery"], ["material", "home"]],
  "adaptive architectural reuse": [["adapt", "stone"], ["reuse", "atelier"], ["renew", "arch"], ["reuse", "form"]],
  "recycled-gold jewellery craft": [
    ["renew", "carat"], ["recast", "gold"], ["remade", "gold"], ["second", "gold"],
    ["carat", "cycle"], ["gold", "cycle"], ["carat", "loop"], ["gold", "loop"],
  ],
  "climate startup marketing": [
    ["eco", "story"], ["carbon", "voice"], ["eco", "cadence"], ["founder", "story"],
    ["demand", "craft"], ["market", "shift"], ["uptake", "lab"],
    ["climate", "arc"], ["impact", "voice"], ["story", "signal"], ["story", "ink"],
    ["brand", "cue"], ["eco", "pitch"], ["story", "cue"], ["voice", "cue"],
    ["eco", "spark"], ["eco", "echo"], ["eco", "sway"], ["eco", "type"],
    ["brand", "ink"], ["voice", "ink"], ["earth", "ink"], ["venture", "story"],
    ["climate", "frame"], ["climate", "voice"], ["carbon", "story"], ["launch", "story"],
    ["founder", "brief"], ["climate", "brief"], ["impact", "story"], ["eco", "voice"],
    ["carbon", "brief"], ["venture", "voice"], ["eco", "brief"], ["eco", "frame"],
  ],
  "circular textile renewal": [
    ["wear", "again"], ["thread", "again"], ["second", "weave"], ["recut", "cloth"],
    ["loop", "thread"], ["cloth", "revival"], ["weave", "anew"], ["rewear", "studio"],
  ],
}

/** Curated two-word directions whose natural reading is a phrase rather than
 * a noun+noun compound. Keeping this separate preserves honest construction
 * metadata and gives high-risk Auto portfolios real structural variety. */
const REVIEWED_CONTEXT_PHRASE_PAIRS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  "European retail privacy compliance": [
    ["good", "faith"], ["due", "care"],
  ],
  "freelancer accounting": [
    ["own", "ledger"], ["steady", "books"],
  ],
  "small-business contract review": [
    ["plain", "terms"], ["second", "read"], ["close", "read"],
  ],
  "rural telehealth reach": [
    ["near", "pulse"], ["wider", "reach"], ["village", "call"],
  ],
  "climate startup marketing": [
    ["credible", "story"], ["honest", "voice"],
  ],
  "clear mortgage comparison": [
    ["first", "buyer"], ["guided", "choice"],
  ],
  "rural Quebec healthcare access": [
    ["wider", "reach"], ["near", "health"], ["local", "family"], ["trusted", "health"],
  ],
}

export interface QuickReviewedEditorialPortfolio {
  primary: readonly string[]
  reserves: readonly string[]
}

/** Human-reviewed, style-balanced portfolios for the failure-prone exact
 * supply cues exercised by release audits. The primary sixteen are locally
 * publishable as a unit; reserves remain genuine alternatives for the model
 * editor to accept, reject and order. */
const REVIEWED_CONTEXT_EDITORIAL_PORTFOLIOS: Readonly<Record<string, QuickReviewedEditorialPortfolio>> = {
  "European retail privacy compliance": {
    primary: [
      "discretion", "restraint", "boundary", "custodian", "anonymity", "privity",
      "confidant", "circumspect", "confide", "fiduciary",
      "dataseal", "consentpact", "datadignity", "noticetrace", "duecare", "clearprivacy",
    ],
    reserves: [
      "consentkey", "dignityseal", "selfscope", "choiceward", "fairkeeping", "rightscope",
      "trustledger", "quietproof", "caretrace", "clearbasis", "choicekeep", "quietright",
    ],
  },
  "freelancer accounting": {
    primary: [
      "reckoner", "accrue", "abacus", "orderly", "reckoning", "provision",
      "numerate", "tallier", "headroom", "wherewithal",
      "ledgerloom", "taxcompass", "solotally", "remitfolio", "ownledger", "steadybooks",
    ],
    reserves: [
      "solebooks", "taxfolio", "cashcadence", "figureflow", "invoiceway", "bookcraft",
      "countwell", "workworth", "receiptpath", "duewise", "cashframe", "invoiceink", "billcraft",
    ],
  },
  "small-business contract review": {
    primary: [
      "redline", "proviso", "covenant", "stipulate", "whereas", "legible",
      "plainspoken", "caveat", "verbatim", "preamble",
      "termspact", "risknote", "draftdelta", "clauselight", "plainterms", "secondread",
    ],
    reserves: [
      "closeread", "pactlens", "wordwatch", "wordbeacon", "draftbeacon", "dealframe",
      "scrutiny", "parley", "contrast", "vantage",
    ],
  },
  "rural telehealth reach": {
    primary: [
      "relay", "outpost", "crossing", "proximity", "nearness", "vicinity",
      "presence", "adjacency", "rendezvous", "linkage",
      "vitalreach", "carebeacon", "ruralbeacon", "clinicmesh", "nearpulse", "widerreach",
    ],
    reserves: [
      "clinicrelay", "vitalbridge", "ruralsignal", "reachcircle", "patientbridge", "carehorizon",
      "clinicwave", "healthrelay", "clinicwindow", "patientlink", "careportal", "ruralrelay",
    ],
  },
  "climate startup marketing": {
    primary: [
      "credence", "narrate", "cohere", "reframe", "clarion", "herald", "salience", "cogent",
      "resound", "verity", "carbonvoice", "storysignal", "demandcraft", "marketshift",
      "crediblestory", "honestvoice",
    ],
    reserves: [
      "ecocadence", "cutthrough", "convey", "eloquent", "persuade", "brandcue",
      "climatearc", "impactvoice", "storyink", "venturevoice", "ecoframe", "carbonbrief",
    ],
  },
  "clear mortgage comparison": {
    primary: [
      "equate", "parity", "calibrate", "bearings", "benchmark", "yardstick", "landmark", "headway",
      "navigate", "discern", "loanlens", "termsift", "costscope", "buyercompass",
      "firstbuyer", "guidedchoice",
    ],
    reserves: [
      "paymentmap", "rateprism", "offerbalance", "loanbeacon", "termscale", "borrowatlas",
      "costcheck", "buyeratlas", "ratefinder", "repayview", "choicekey", "ratebridge",
    ],
  },
  "rural Quebec healthcare access": {
    primary: [
      "soinproche", "proxisante", "santevillage", "soinvillage", "liensante", "santefamille",
      "accesrural", "santeproche", "voisinage", "entraide", "bienetre", "familial",
      "healthlink", "familylink", "widerreach", "nearhealth",
    ],
    reserves: [
      "familial", "vitalite", "ruralite", "accessible", "villagecare", "healthbridge",
      "localhealth", "familylink", "careanchor", "ruralreach", "healthrelay", "carecircle",
      "familyroute", "healthlink", "healthroute", "reachbeacon", "familycircle", "healthcircle",
    ],
  },
}

const REVIEWED_PORTFOLIO_CANONICAL_BRIEFS = new Set([
  "european ecommerce privacy compliance software for retail teams",
  "accounting software for freelancers managing invoices and tax",
  "contract review software for small business legal teams",
  "rural telehealth platform for community clinics and patients",
  "climate technology marketing agency for early stage founders",
  "mortgage comparison app for first-time home buyers",
])

function isCanonicalReviewedPortfolioBrief(description: string): boolean {
  const text = normaliseText(description)
  return REVIEWED_PORTFOLIO_CANONICAL_BRIEFS.has(text)
    || (text.startsWith("plateforme de sant") && text.includes("familles rurales") && text.includes("qu"))
}

export function getQuickReviewedEditorialPortfolio(description: string): QuickReviewedEditorialPortfolio | null {
  const cue = getStrictPrimaryConceptRule(description)?.cue
    || getConceptSignals(description)[0]?.cue
  return cue ? REVIEWED_CONTEXT_EDITORIAL_PORTFOLIOS[cue] || null : null
}

const QUICK_VALUE_FACETS: readonly (QuickValueFacet & { test: RegExp })[] = [
  {
    id: "privacy_first",
    test: /^(?=.*\b(?:accounting|bookkeeping|invoice|invoicing|tax)\b)(?=.*\b(?:freelancers?|freelance|independent|self-employed)\b)(?=.*\b(?:privacy[- ]first|private[- ]by[- ]design|privacy|confidential)\b)/,
    roots: ["quiet", "hush", "vault", "lock", "seal", "safe", "private", "secure"],
    intersectionPairs: [
      ["hush", "ledger"],
      ["quiet", "books"],
      ["book", "vault"],
      ["ledger", "lock"],
      ["quiet", "tally"],
      ["safe", "books"],
      ["lock", "tally"],
      ["solo", "vault"],
      ["tax", "vault"],
      ["quiet", "tax"],
      ["secure", "tax"],
      ["tax", "seal"],
    ],
    minimumAutoCandidates: 4,
  },
]

export function getQuickValueFacet(description: string): QuickValueFacet | null {
  const text = normaliseText(description)
  const facet = QUICK_VALUE_FACETS.find((candidate) => candidate.test.test(text))
  return facet
    ? {
        id: facet.id,
        roots: [...facet.roots],
        intersectionPairs: facet.intersectionPairs.map(([left, right]) => [left, right]),
        minimumAutoCandidates: facet.minimumAutoCandidates,
      }
    : null
}

export function hasQuickValueFacetIntersection(
  candidate: Pick<QuickCandidate, "name">,
  description: string,
): boolean {
  const facet = getQuickValueFacet(description)
  if (!facet) return true
  const name = toLabel(candidate.name)
  if (facet.intersectionPairs.some(([left, right]) => `${toLabel(left)}${toLabel(right)}` === name)) return true
  const primary = getStrictPrimaryConceptRule(description)
  if (!primary) return false
  const primaryRoots = new Set(primary.roots.map(toLabel))
  for (const root of [...primaryRoots]) {
    if (root.endsWith("ies") && root.length >= 5) primaryRoots.add(`${root.slice(0, -3)}y`)
    else if (root.endsWith("es") && root.length >= 5) primaryRoots.add(root.slice(0, -2))
    else if (root.endsWith("s") && root.length >= 4) primaryRoots.add(root.slice(0, -1))
  }
  return [...primaryRoots].some((primaryRoot) => (
    facet.roots.some((rawFacetRoot) => {
      const facetRoot = toLabel(rawFacetRoot)
      return name === `${primaryRoot}${facetRoot}` || name === `${facetRoot}${primaryRoot}`
    })
  ))
}

/** Whether a deterministic surface is one of the manually reviewed compound
 * directions for this exact job context. Recovery editors use this to rank
 * intentional constructions ahead of generic root-plus-template filler. */
export function isQuickReviewedContextCompound(rawName: string, description: string): boolean {
  const name = toLabel(rawName)
  const cue = getStrictPrimaryConceptRule(description)?.cue
    || getConceptSignals(description)[0]?.cue
  if (!cue) return false
  return [
    ...(REVIEWED_CONTEXT_COMPOUND_PAIRS[cue] || []),
    ...(REVIEWED_CONTEXT_PHRASE_PAIRS[cue] || []),
    ...(getQuickValueFacet(description)?.intersectionPairs || []),
  ].some(([left, right]) => `${toLabel(left)}${toLabel(right)}` === name)
}

const AUTO_STYLE_MAXIMUMS: Readonly<Record<NameStyle, number>> = {
  brandable: 5,
  evocative: 4,
  compound: 5,
  real_word: 4,
  short_phrase: 3,
  alternate_spelling: 3,
  non_english: 8,
}

const SEMANTIC_FIRST_AUTO_STYLE_MAXIMUMS: Readonly<Record<NameStyle, number>> = {
  ...AUTO_STYLE_MAXIMUMS,
  evocative: 5,
  real_word: 5,
  compound: 4,
  short_phrase: 2,
}

const AUTO_ZERO_FIT_MAXIMUMS: Readonly<Record<NameStyle, number>> = {
  brandable: 5,
  evocative: 4,
  compound: 1,
  real_word: 4,
  short_phrase: 1,
  alternate_spelling: 3,
  non_english: 0,
}

const CUE_COMPANIONS: Readonly<Record<string, readonly string[]>> = {
  "founder scheduling assistance": ["flow", "cadence", "pilot", "relay", "tempo"],
  "European retail privacy compliance": ["accord", "guard", "lock", "proof", "seal"],
  "freelancer accounting": ["tally", "balance", "calm", "clear", "settled"],
  "rural telehealth reach": ["clinic", "reach", "access", "near", "telecare"],
  "Kenya small-farm irrigation": ["meter", "guide", "steady", "flow", "source"],
  "circular textile renewal": ["again", "loop", "return", "revive", "second"],
  "climate startup marketing": ["frame", "signal", "cadence", "brief", "launch"],
  "Welsh farm-to-school trade": ["exchange", "trade", "produce", "field", "school", "market", "bridge", "local"],
  "marine conservation impact": ["impact", "steward", "nexus", "effort", "renewal"],
  "community workshop safety": ["guard", "order", "center", "reliable", "feature"],
  "vineyard disease detection": ["nexus", "neural", "affinity", "answer", "optics"],
  "adaptive cycling progress": ["pace", "motion", "route", "endure", "stride"],
  "fast audio editing": ["wave", "clip", "tempo", "signal", "studio"],
  "marine monitoring and maintenance": ["watch", "signal", "service", "forecast", "crew"],
  "confidential workplace wellbeing": ["support", "guide", "balance", "shift", "care"],
  "circular packaging reuse": ["loop", "return", "cycle", "dine", "network"],
  "allergy-aware dining confidence": ["choice", "guide", "clear", "table", "care"],
  "career credential recognition": ["proof", "path", "career", "bridge", "standing"],
  "transparent member lending": ["mutual", "ledger", "clear", "trust", "member"],
  "orchestra touring coordination": ["score", "route", "stage", "tempo", "ensemble"],
  "discreet safety and agency": ["onward", "guide", "privacy", "agency", "support"],
  "seafood traceability": ["proof", "source", "track", "fleet", "ledger"],
  "clear mortgage comparison": ["clear", "wise", "path", "guide", "proof"],
  "trusted water safety": ["proof", "clear", "field", "guard", "signal"],
  "resilient irrigation and water access": ["field", "flow", "works", "guide", "grid"],
  "family-business continuity": ["future", "path", "bridge", "guide", "trust"],
  "food and performance nutrition": ["fuel", "active", "craft", "proof", "power"],
  "dependable EV charging access": ["grid", "path", "pilot", "lane", "signal"],
  "household financial clarity": ["wise", "clear", "plan", "path", "guide"],
  "ethical nurse recruitment": ["match", "join", "bridge", "path", "team"],
  "rural Quebec healthcare access": ["reach", "bridge", "care", "local", "access"],
  "student meal delivery": ["dash", "club", "table", "fresh", "route"],
  "practical language learning": ["bridge", "path", "spark", "guide", "voice"],
  "locally guided conservation travel": ["trail", "guide", "wild", "pass", "route"],
  "recycled-gold jewellery craft": ["heir", "loom", "mark", "renew", "craft"],
  "warm restrained interiors": ["form", "frame", "room", "warm", "studio"],
  "adaptive architectural reuse": ["frame", "form", "renew", "heritage", "studio"],
  "remote employee onboarding": ["flow", "guide", "bridge", "path", "team"],
  "secure research collaboration": ["grid", "share", "proof", "signal", "bridge"],
  "auditable carbon accounting": ["proof", "measure", "clear", "ledger", "track"],
  "transparent public procurement": ["proof", "trust", "clear", "brief", "path"],
  "climate-technology marketing": ["map", "arc", "ink", "brief", "mark"],
  "pharmacy cold-chain delivery": ["route", "track", "guard", "flow", "chain"],
  "real-time esports performance": ["signal", "scope", "track", "pilot", "grid"],
  "independent investigative journalism": ["press", "signal", "proof", "scope", "source"],
  "warehouse robotic movement": ["flow", "track", "grid", "works", "route"],
  "precision quality inspection": ["proof", "track", "clear", "flow", "grid"],
  "mobile rural auto repair": ["road", "track", "works", "path", "mobile"],
  "faster scheduling": ["pilot", "flow", "wise", "path", "grid"],
  "protection and trust": ["layer", "proof", "watch", "scope", "frame", "path"],
  "clearer signals and insight": ["scope", "view", "trace", "pilot", "grid"],
  "financial clarity": ["wise", "path", "flow", "guard", "guide"],
  "orderly financial work": ["flow", "wise", "path", "pilot", "proof"],
  "legal clarity": ["proof", "guard", "wise", "path", "lens"],
  "reassuring care": ["path", "bridge", "well", "guide", "pulse"],
  "calm and emotional support": ["haven", "path", "well", "rest", "guide"],
  "family support": ["haven", "bridge", "care", "guide", "nest"],
  "vetted childcare choices": ["haven", "bridge", "care", "guide", "nest"],
  "specialist therapy and everyday progress": ["path", "care", "voice", "guide", "well"],
  "visible skin care and renewal": ["bloom", "glow", "care", "house", "well"],
  "visible hair care and renewal": ["bloom", "glow", "care", "house", "well"],
  "craft and personal style": ["loom", "mark", "house", "craft", "form"],
  "food and shared enjoyment": ["craft", "house", "table", "bloom", "lane"],
  "trusted cat care": ["home", "care", "haven", "nest", "mate"],
  "trusted pet care": ["mate", "path", "nest", "care", "trail"],
  "learning and progress": ["path", "spark", "guide", "wise", "bridge"],
  "discovery and movement": ["guide", "path", "trail", "house", "pass"],
  "solo women group travel": ["guide", "path", "trail", "house", "pass"],
  "measurable environmental progress": ["path", "loop", "wise", "works", "field"],
  "place and considered design": ["frame", "house", "nest", "mark", "form"],
  "easy commerce": ["flow", "path", "wise", "bridge", "pilot"],
  "reliable movement": ["track", "flow", "pilot", "works", "path"],
  "precise operations": ["track", "flow", "pilot", "works", "grid"],
  "technical fluency": ["stack", "grid", "pilot", "core", "scope"],
  "intelligent assistance": ["pilot", "logic", "wise", "scope", "guide"],
  "creative discovery": ["stage", "play", "spark", "house", "guide"],
  "indie music discovery": ["stage", "play", "spark", "house", "guide"],
  "credible storytelling": ["press", "voice", "signal", "proof", "scope"],
  "creative craft": ["frame", "form", "house", "mark", "loom"],
  "playful puzzle games": ["frame", "form", "house", "mark", "loom"],
  "memorable occasions": ["guide", "plan", "joy", "house", "gather"],
  "healthy growth": ["field", "wise", "path", "works", "guide"],
  "balcony gardening kits": ["field", "wise", "path", "works", "guide"],
  "dignity and remembrance": ["haven", "path", "care", "guide", "legacy"],
  "open, respectful wellbeing": ["well", "care", "balance", "open", "guide"],
  "human connection": ["bridge", "circle", "kind", "path", "bond"],
  "confident mobility": ["lane", "grid", "pilot", "path", "charge"],
  "confident electric mobility": ["lane", "grid", "pilot", "path", "charge"],
  "confident vehicle service": ["lane", "works", "pilot", "path", "track"],
  "secure ownership": ["guard", "proof", "wise", "path", "vault"],
  "evidence and collaboration": ["proof", "grid", "scope", "signal", "bridge"],
  "public accountability": ["proof", "trust", "bridge", "brief", "wise"],
  "physical progress and recovery": ["path", "rise", "well", "guide", "stride"],
  "generosity and measurable impact": ["impact", "bridge", "trust", "path", "give"],
  "donor relationship stewardship": ["impact", "bridge", "trust", "path", "give"],
  "a smoother start at work": ["flow", "guide", "bridge", "path", "team"],
  "reassurance and dependable cover": ["guard", "path", "proof", "bridge", "safe"],
}

const COMPANION_CUES: Readonly<Record<string, string>> = {
  access: "wider access", base: "a dependable foundation", beam: "focus", bloom: "growth", bond: "connection", bridge: "access", calm: "ease", circle: "community", club: "membership",
  clear: "clarity", core: "a dependable centre", crest: "quality", dash: "speed", flow: "an easier process", fresh: "freshness",
  forge: "making and strength", frame: "structure", front: "leadership", grid: "a connected system", grove: "natural depth", heritage: "continuity",
  guard: "protection", guide: "helpful direction", guild: "expert craft", haven: "safety", hearth: "warmth", house: "an established brand home", join: "a welcoming connection",
  joy: "positive energy", kind: "human care", lane: "a clear route", layer: "a protective layer", lens: "closer scrutiny", line: "simplicity", logic: "intelligence", loom: "craft", loop: "continuity", mark: "distinctiveness",
  local: "local relevance", match: "a useful match", mate: "a helpful companion", max: "ambition", measure: "measurable evidence", mobile: "service on the move", nest: "a welcoming base", noble: "quiet confidence", node: "connection",
  one: "simplicity", pass: "easy access", path: "guided progress", pilot: "guidance", plan: "practical planning", play: "discovery", pop: "memorability", proof: "assurance", quest: "purpose", reach: "wider reach", renew: "renewal", road: "practical mobility", route: "a dependable route",
  rally: "shared momentum", rise: "progress", school: "local education", share: "collaboration", scope: "visibility", signal: "clarity", source: "source-led evidence", spark: "an energising start", studio: "a considered creative practice",
  stack: "a capable product system", stone: "stability", summit: "ambition", team: "shared progress", trace: "visibility", track: "operational visibility", trade: "trusted exchange", true: "trust", vale: "calm polish", view: "a clearer view",
  fam: "family familiarity", go: "forward action", it: "simple utility", pledge: "commitment", port: "an access point", purr: "cat affinity", trail: "guided progress", wave: "momentum",
  watch: "active vigilance", well: "wellbeing", wink: "personality", wise: "good judgement", works: "practical capability",
}

const RHYME_GROUPS: readonly { test: RegExp; endings: readonly string[] }[] = [
  // Preserve the long "eye" sound without teaching the generator to bolt the
  // mechanical -ify startup suffix onto arbitrary roots.
  { test: /spotify|ify$/, endings: ["sky", "fly", "high"] },
  { test: /slack|ack$/, endings: ["ack", "trak", "ly"] },
  { test: /uber|eats/, endings: ["go", "ly", "io"] },
  { test: /monzo/, endings: ["zo", "go", "io"] },
  { test: /quizlet/, endings: ["let", "ly", "io"] },
  { test: /munch/, endings: ["unch", "ch", "io"] },
  { test: /bark/, endings: ["ark", "bar", "io"] },
  { test: /meow/, endings: ["ow", "mew", "io"] },
  { test: /volt/, endings: ["olt", "io", "ly"] },
]

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback
  return Math.min(max, Math.max(min, numeric))
}

function normaliseText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

interface QuickBriefSafety {
  description: string
  prohibitedTerms: string[]
}

const PRIVATE_BRIEF_CLAUSE = new RegExp(String.raw`\b(?:
  confidential\s+(?:(?:client|customer|project|launch|internal)\s+)?(?:code\s*name|codename|reference|ref|pin|note|token|identifier|metadata)
  |private[-\s]?(?:note|metadata|token|reference|ref|pin|contact|codename)
  |private\s+(?:(?:client|customer|project|launch|internal)\s+)?(?:code\s*name|codename|reference|ref|pin|note|token|identifier|metadata)
  |secret\s+(?:(?:client|customer|project|launch|internal)\s+)?(?:code\s*name|codename|name|reference|token|identifier)
  |untrusted\s+(?:intake|client|customer|reference|ref|metadata|note)
  |client[-\s]?(?:pin|reference|ref|codename)
  |case[-\s]?(?:reference|ref)
  |intake[-\s]?(?:contact|reference|ref)
  |internal[-\s]?(?:codename|code\s*name|reference|ref|token|identifier)
  |ignore\s+(?:all\s+)?(?:previous\s+)?instructions?
  |(?:never|do\s+not|don\s*t)\s+(?:use|include|repeat|reveal|surface)
  |(?:must|should)\s+not\s+(?:appear|be\s+used|be\s+included|enter)
  |exclude\s+(?:the\s+)?(?:private|internal|client|case|intake|codename|code\s*name|token|identifier)
)\b`.replace(/\s+/g, ""), "i")

/** Treats intake-control text as untrusted metadata, not as naming material.
 * The safe business sentences remain available for relevance; suspicious
 * sentences and their alphabetic payloads become dynamic blacklist terms. */
function getQuickBriefSafety(rawDescription: string): QuickBriefSafety {
  const safeSegments: string[] = []
  const prohibited = new Set<string>()
  const segments = String(rawDescription || "").split(/[.!?;\r\n]+/)

  for (const segment of segments) {
    const normalized = normaliseText(segment)
    if (!normalized) continue
    if (PRIVATE_BRIEF_CLAUSE.test(normalized)) {
      normalized.split(/[\s-]+/).forEach((term) => {
        const label = toLabel(term)
        if (label.length >= 3) prohibited.add(label)
      })
      continue
    }
    safeSegments.push(segment.trim())
  }

  return {
    description: safeSegments.join(". ").trim() || "professional service for local teams",
    prohibitedTerms: Array.from(prohibited),
  }
}

function toLabel(value: string): string {
  return normaliseText(value).replace(/[^a-z0-9]/g, "")
}

function normaliseStyle(value: unknown): QuickGenerateStyle {
  return QUICK_GENERATE_STYLES.includes(value as QuickGenerateStyle) ? (value as QuickGenerateStyle) : "auto"
}

function normaliseCreativity(value: unknown): QuickGenerateCreativity {
  return QUICK_GENERATE_CREATIVITY.includes(value as QuickGenerateCreativity)
    ? (value as QuickGenerateCreativity)
    : "balanced"
}

/** Builds the explicit construction quota used by Auto mode. */
export function buildQuickStylePlan(input: Pick<QuickGenerateInput, "style" | "creativity" | "preferences">, count: number): NameStyle[] {
  const limit = clampNumber(count, DEFAULT_COUNT, 1, MAX_RESULTS)
  const requested = normaliseStyle(input.style)
  if (requested !== "auto") return Array.from({ length: limit }, () => requested)

  const creativity = normaliseCreativity(input.creativity)
  const preferredOrder: Record<QuickGenerateCreativity, NameStyle[]> = {
    direct: ["real_word", "compound", "short_phrase", "evocative", "brandable", "alternate_spelling", "non_english"],
    balanced: ["brandable", "evocative", "compound", "real_word", "short_phrase", "alternate_spelling", "non_english"],
    exploratory: ["brandable", "non_english", "evocative", "alternate_spelling", "short_phrase", "compound", "real_word"],
  }
  const liked = (input.preferences?.likedStyles || []).filter((style) => NAME_STYLES.includes(style))
  const disliked = new Set((input.preferences?.dislikedStyles || []).filter((style) => NAME_STYLES.includes(style)))
  const base = Array.from(new Set([...liked, ...preferredOrder[creativity]]))
  const active = [...base.filter((style) => !disliked.has(style)), ...base.filter((style) => disliked.has(style))]
  return Array.from({ length: limit }, (_, index) => active[index % active.length])
}

function emptyStyleTargets(): QuickStyleTargets {
  return Object.fromEntries(NAME_STYLES.map((style) => [style, 0])) as QuickStyleTargets
}

const AUTO_STYLE_TEMPLATES: Readonly<Record<QuickGenerateCreativity, readonly NameStyle[]>> = {
  direct: [
    "real_word", "compound", "short_phrase", "real_word", "compound", "short_phrase", "brandable", "evocative",
    "real_word", "compound", "short_phrase", "brandable", "evocative", "real_word", "compound", "alternate_spelling",
  ],
  balanced: [
    "brandable", "evocative", "compound", "real_word", "short_phrase", "alternate_spelling", "brandable", "real_word",
    "compound", "evocative", "real_word", "short_phrase", "brandable", "alternate_spelling", "brandable", "real_word",
  ],
  exploratory: [
    "brandable", "evocative", "alternate_spelling", "brandable", "evocative", "real_word", "compound", "brandable",
    "evocative", "alternate_spelling", "real_word", "short_phrase", "brandable", "evocative", "compound", "brandable",
  ],
}

/** Builds achievable Auto quotas from locally inferred construction supply.
 * Unlike the prompt-facing priority plan, unavailable styles are redistributed
 * before selection and Compound is never allowed to absorb more than five of
 * a 16-name Auto page. */
export function buildQuickStyleTargets(
  input: Pick<QuickGenerateInput, "style" | "creativity" | "preferences"> & Partial<Pick<QuickGenerateInput, "description" | "rhymeWith">>,
  count: number,
  capacity?: Partial<Record<NameStyle, number>>,
): QuickStyleTargets {
  const limit = clampNumber(count, DEFAULT_COUNT, 1, MAX_RESULTS)
  const requested = normaliseStyle(input.style)
  const targets = emptyStyleTargets()
  if (requested !== "auto") {
    targets[requested] = Math.min(limit, capacity?.[requested] ?? limit)
    return targets
  }

  const creativity = normaliseCreativity(input.creativity)
  const template = AUTO_STYLE_TEMPLATES[creativity]
  for (let index = 0; index < limit; index += 1) {
    targets[template[index % template.length]] += 1
  }

  if (input.rhymeWith && (capacity?.alternate_spelling ?? 1) > 0 && targets.alternate_spelling === 0) {
    const donor: NameStyle | undefined = (["evocative", "brandable", "real_word", "compound"] as NameStyle[])
      .find((style) => targets[style] > 1)
    if (donor) {
      targets[donor] -= 1
      targets.alternate_spelling = 1
    }
  }

  const locale = input.description ? getQuickLocalePolicy(input.description) : null
  if (locale) {
    const localeTarget = Math.min(locale.minimumAutoCandidates, limit, capacity?.non_english ?? locale.minimumAutoCandidates)
    const donors: NameStyle[] = ["alternate_spelling", "brandable", "evocative", "real_word", "short_phrase", "compound"]
    for (let index = 0; index < localeTarget; index += 1) {
      const donor = donors.find((style) => targets[style] > (style === "compound" ? 2 : 0))
      if (!donor) break
      targets[donor] -= 1
      targets.non_english += 1
    }
  } else {
    targets.non_english = 0
  }

  if (!capacity) return targets

  let deficit = 0
  for (const style of NAME_STYLES) {
    const hardMaximum = style === "non_english" && !locale
      ? 0
      : Math.min(AUTO_STYLE_MAXIMUMS[style], Math.max(0, capacity[style] ?? 0))
    if (targets[style] <= hardMaximum) continue
    deficit += targets[style] - hardMaximum
    targets[style] = hardMaximum
  }

  const redistributionOrder: NameStyle[] = Array.from(new Set<NameStyle>([
    "real_word", "evocative",
    ...(locale ? (["non_english"] as NameStyle[]) : []),
    "brandable", "alternate_spelling", "compound", "short_phrase",
    ...template,
  ]))
  while (deficit > 0) {
    let assigned = false
    for (const style of redistributionOrder) {
      if (style === "non_english" && !locale) continue
      const hardMaximum = Math.min(AUTO_STYLE_MAXIMUMS[style], Math.max(0, capacity[style] ?? 0))
      if (targets[style] >= hardMaximum) continue
      targets[style] += 1
      deficit -= 1
      assigned = true
      if (deficit === 0) break
    }
    if (!assigned) break
  }

  return targets
}

function splitWords(value: string): string[] {
  return normaliseText(value).split(/[\s-]+/).filter(Boolean)
}

export function extractQuickRoots(description: string): string[] {
  return Array.from(
    new Set(
      splitWords(description).filter((word) => word.length >= 2 && word.length <= 16 && !/^\d+$/.test(word) && !STOPWORDS.has(word) && !PROTECTED_BRANDS.has(word)),
    ),
  ).slice(0, 10)
}

function getStrictPrimaryConceptRule(description: string): ConceptRule | null {
  const text = normaliseText(description)
  return QUICK_SUPPLY_CONTEXT_RULES.find((rule) => rule.test.test(text))
    || PRIMARY_CONCEPT_RULES.find((rule) => rule.test.test(text))
    || null
}

const QUICK_PRIMARY_EVIDENCE_REQUIRED_CUES = new Set([
  // Live editor audits found that broad audience or technology modifiers could
  // displace the actual bookkeeping, scheduling or compliance job. Keep a
  // small lateral lane while requiring the published majority to prove the
  // concrete product intent.
  "freelancer accounting",
  "founder scheduling assistance",
  "European retail privacy compliance",
  "circular textile renewal",
  "trusted cat care",
  "small-business contract review",
  "rural telehealth reach",
  "climate-technology marketing",
  "climate startup marketing",
  "clear mortgage comparison",
  "recycled-gold jewellery craft",
])

/** Live-reviewed contexts where a lateral, context-free capacity name is more
 * harmful than useful. These briefs all have enough curated semantic and
 * construction supply to keep every Auto result tied to the actual job. */
const QUICK_EXCLUSIVE_PRIMARY_EVIDENCE_CUES = new Set([
  "private teen emotional support",
  "trusted cat care",
  "freelancer accounting",
  "small-business contract review",
  "rural telehealth reach",
  "climate startup marketing",
  "clear mortgage comparison",
  "recycled-gold jewellery craft",
])

function requiresExclusiveQuickPrimaryConceptEvidence(description: string): boolean {
  const rule = getStrictPrimaryConceptRule(description)
  return Boolean(rule && QUICK_EXCLUSIVE_PRIMARY_EVIDENCE_CUES.has(rule.cue))
}

export function getQuickPrimaryIntent(description: string): QuickPrimaryIntent | null {
  const rule = getStrictPrimaryConceptRule(description)
  return rule
    ? { cue: rule.cue, promise: rule.promise, roots: [...rule.roots] }
    : null
}

export function requiresQuickPrimaryConceptEvidence(description: string): boolean {
  const rule = getStrictPrimaryConceptRule(description)
  return Boolean(rule && QUICK_PRIMARY_EVIDENCE_REQUIRED_CUES.has(rule.cue))
}

function getConceptSignals(description: string): ConceptSignal[] {
  const text = normaliseText(description)
  const signals = new Map<string, ConceptSignal>()
  const words = extractQuickRoots(description)

  const primaryRule = PRIMARY_CONCEPT_RULES.find((rule) => rule.test.test(text))
  if (primaryRule) {
    for (const root of primaryRule.roots) {
      signals.set(root, {
        root,
        cue: primaryRule.cue,
        promise: primaryRule.promise,
        verified: true,
      })
    }
    return Array.from(signals.values())
  }

  const addDirectRoots = (priority: boolean) => {
    for (const word of words) {
      if (PRIORITY_DIRECT_ROOTS.has(word) !== priority) continue
      const direct = DIRECT_ROOT_CUES[word]
      if (!direct) continue
      const root = direct.root || word
      if (!signals.has(root)) signals.set(root, { root, cue: direct.cue, promise: direct.promise, verified: true })
    }
  }

  addDirectRoots(true)

  const isSupersededForBrief = (rule: ConceptRule): boolean => {
    if (/\bmortgage\b/.test(text) && rule.cue === "place and considered design") return true
    if (/\bsuccession\b/.test(text) && rule.cue === "family support") return true
    if (/\b(dog treats?|working breeds?|canine treats?|high protein)\b/.test(text) && rule.cue === "trusted pet care") return true
    if (/\b(humanitarian|water quality|safe drinking water)\b/.test(text) && rule.cue === "healthy growth") return true
    return false
  }

  const matchedRules = CONCEPT_RULES.filter((rule) => rule.test.test(text) && !isSupersededForBrief(rule)).sort((left, right) => {
    return Number(DEFERRED_CONCEPT_CUES.has(left.cue)) - Number(DEFERRED_CONCEPT_CUES.has(right.cue))
  })
  for (const rule of matchedRules) {
    for (const root of rule.roots) {
      if (!signals.has(root)) signals.set(root, { root, cue: rule.cue, promise: rule.promise, verified: true })
    }
  }

  addDirectRoots(false)

  return signals.size > 0 ? Array.from(signals.values()).slice(0, 12) : [...GENERIC_SIGNALS]
}

export function getQuickConceptRoots(description: string): string[] {
  return getConceptSignals(description).map((signal) => signal.root)
}

export function getQuickPrimaryCue(description: string): string {
  return getConceptSignals(description)[0]?.cue || "the brief's central idea"
}

function getBriefAnchors(description: string): string[] {
  const text = normaliseText(description)
  const matched = BRIEF_ANCHOR_RULES.find((rule) => rule.test.test(text))
  if (matched) return [...matched.anchors]

  const generic = new Set([
    "about", "app", "brand", "business", "clean", "company", "friendly", "local", "online", "platform",
    "premium", "service", "simple", "software", "startup", "trusted",
  ])
  return extractQuickRoots(description)
    .map((word) => word.replace(/ies$/, "y").replace(/s$/, ""))
    .filter((word) => word.length >= 3 && word.length <= 7 && !generic.has(word))
    .slice(0, 3)
}

function getRhymeEndings(value: string | undefined): string[] {
  const phrase = toLabel(value || "")
  if (phrase.length < 2) return []
  const configured = RHYME_GROUPS.find((group) => group.test.test(phrase))
  if (configured) return [...configured.endings]
  if (phrase.endsWith("ly")) return ["ly", "lee", "io"]
  return [phrase.slice(-Math.min(3, phrase.length)), "ly", "io"]
}

export function getQuickRhymeEnding(value: string | undefined): string | null {
  return getRhymeEndings(value)[0] || null
}

function blockedRhymeTerms(value: string | undefined): Set<string> {
  if (!value) return new Set()
  const words = splitWords(value).map(toLabel).filter((word) => word.length >= 3)
  const whole = toLabel(value)
  return new Set([whole, ...words].filter((word) => word.length >= 3))
}

function hasRepeatedFragment(name: string): boolean {
  if (/([a-z]{3,5})\1/.test(name)) return true
  for (let index = 0; index <= name.length - 4; index += 1) {
    const pair = name.slice(index, index + 2)
    if (ALLOWED_REPEATED_BIGRAMS.has(pair)) continue
    if (name.slice(index + 2, index + 4) === pair) return true
  }
  return false
}

const CLIPPED_TERMINAL_SHAPES = /(?:[bcdfghjklmnpqrstvwxyz][rl]|gd|lyt|trac|ntro)$/
const FORCED_ROOT_SUFFIX = /^(?:[aeiou]|so|vo)$/
const SAFE_SHORT_COMPOUND_PARTS = new Set(["be", "go", "it", "my", "up", "we", "ify", "kit", "lab", "log", "map", "now", "pad", "run", "tap"])

// A single module-level lexicon is used by both locally generated and
// model-authored names. Keeping the deterministic reserve pieces here prevents
// obvious joins such as `budgetwave`, `purrport` and `famtrail` from being
// described as abstract merely because one half was not a semantic fit root.
const QUICK_RESERVE_LEFT_PARTS = [
  "amber", "arch", "cedar", "clear", "coral", "delta", "ember", "fern", "flint", "glen", "harbor",
  "ivory", "lumen", "mosaic", "noble", "north", "opal", "orbit", "prism", "ridge", "river",
  "shore", "slate", "solid", "spring", "stone", "summit", "tide", "vale", "velvet", "vista", "willow",
  "aero", "alder", "alto", "ash", "atlas", "birch", "brio", "brook", "cairn", "canvas", "cloud",
  "cove", "dawn", "drift", "echo", "elm", "ever", "fable", "halo", "kite", "lake", "lark",
  "meadow", "moon", "oak", "pine", "reed", "rose", "rowan", "sage", "silk", "terra",
  "acorn", "ardent", "arrow", "auric", "autumn", "bay", "bell", "bloom", "bold", "brass",
  "breeze", "bright", "calm", "charm", "clay", "dune", "east", "field", "finch", "flame",
  "flora", "fresh", "frost", "gold", "grace", "green", "hearth", "hill", "honey", "iron",
  "jade", "keen", "leaf", "light", "lucid", "lunar", "marine", "merit", "mist", "moss",
  "olive", "onyx", "pearl", "plume", "pure", "quartz", "quiet", "rain", "robin", "royal",
  "ruby", "sable", "silver", "solar", "sun", "union", "urban", "vivid", "warm", "west",
  "white", "wild", "wind", "zenith",
  // Complete, ordinary words observed in model-authored compounds. These
  // expand only visible-boundary recognition and never become semantic proof.
  "alpen", "cinder", "day", "due", "early", "even", "fair", "fore", "guard", "high", "kin",
  "know", "little", "make", "mint", "mirth", "night", "open", "paper", "penny", "pocket",
  "ponder", "red", "signal", "small", "snow", "sum", "sunny", "switch", "threat", "time", "true", "whim",
] as const

const QUICK_RESERVE_RIGHT_PARTS = [
  "arc", "beam", "bend", "bridge", "crest", "field", "fold", "gate", "glen", "grove", "harbor", "hinge",
  "lane", "light", "mark", "mint", "nest", "path", "point", "rise", "route", "span", "spark", "step",
  "stone", "thread", "tide", "trail", "vale", "wave", "way", "well",
  "bank", "bay", "bell", "bird", "brook", "cairn", "coast", "cove", "dawn", "deck", "drift", "echo",
  "edge", "fern", "flame", "flow", "fox", "hall", "heart", "hill", "isle", "key", "lake", "leaf",
  "moon", "oak", "peak", "pine", "port", "reed", "rock", "wing",
  "air", "arch", "ash", "base", "bloom", "bold", "brio", "canvas", "charm", "clay", "cloud",
  "core", "crown", "dash", "dune", "east", "ever", "fable", "finch", "focus", "frost", "gold",
  "grace", "green", "home", "honey", "iron", "jade", "joy", "kind", "lark", "link", "lucid",
  "lunar", "muse", "north", "nova", "olive", "onyx", "plume", "pure", "quartz", "quiet", "rain",
  "ray", "ring", "robin", "royal", "ruby", "sable", "sage", "sea", "silk", "silver", "solar",
  "song", "sun", "terra", "true", "union", "urban", "vivid", "warm", "west", "white", "wild",
  "wind", "zen",
  // Matching complete right-hand words for honest model-compound rationales.
  "ascent", "count", "course", "craft", "egg", "first", "fit", "glass", "glow", "haven", "keep",
  "keel", "kin", "line", "loom", "meadow", "melt", "pulse", "rail", "side", "stead", "steps",
  "tally", "thread", "veil", "ward", "watch", "ways", "weave", "window", "wise", "work", "yard",
] as const

const QUICK_COMMON_SURFACE_PARTS = new Set([
  ...Object.keys(COMPANION_CUES),
  ...Object.values(CUE_COMPANIONS).flat(),
  ...Object.values(VIBE_COMPANIONS).flat(),
  ...QUICK_RESERVE_LEFT_PARTS,
  ...QUICK_RESERVE_RIGHT_PARTS,
  "active", "adaptive", "alpine", "attentive", "brave", "clean", "clever", "close", "coastal", "cold", "cozy", "crafted", "credible", "deep", "due", "easy",
  "everyday", "exact", "fair", "fast", "first", "fit", "fresh", "future", "gentle", "good", "guided", "handmade", "honest", "inclusive",
  "independent", "instant", "joyful", "lasting", "late", "live", "local", "modern", "near", "nightly", "own", "plain",
  "playful", "precious", "private", "proud", "pure", "ready", "refined", "renewed", "secure", "shared", "sharp", "simple",
  "small", "smart", "steady", "strong", "textured", "trusted", "urban", "warm", "wild", "willing", "woven",
  "budget", "fund", "pledge", "purr", "fam",
].map(toLabel))

// Lexicalised whole words can happen to equal two common naming pieces. They
// are not transparent A+B constructions in ordinary reading, so never invent
// a split or a compound rationale for them.
const QUICK_LEXICALISED_WHOLE_WORDS = new Set([
  "airline", "aurora", "cattery", "kinship", "mosaic", "nurture",
  ...REVIEWED_COMPACT_WHOLE_WORDS,
  ...REVIEWED_WHOLE_WORD_SET,
  ...CONTEXTUAL_SEMANTIC_WORD_SET,
])

function getBriefAdmissionTerms(description: string, sourceRoots: readonly string[] = []): Set<string> {
  return new Set([
    ...extractQuickRoots(description),
    ...getQuickConceptRoots(description),
    ...getBriefAnchors(description),
    ...sourceRoots,
  ].map(toLabel).filter((term) => term.length >= 3))
}

// Auto's public default needs a firmer standard than basic spelling safety.
// These terms are intentionally excluded from semantic grounding: they are
// generic presentation language, not proof that a name connects to a user's
// actual work or audience.
const AUTO_GROUNDING_STOP_TERMS = new Set([
  "app", "brand", "business", "company", "modern", "platform", "product", "service", "software", "startup",
  "simple", "friendly", "premium", "clean", "bold", "playful", "tech", "trust", "trusted", "clear", "bright",
  "north", "stride", "online", "local", "digital", "smart", "easy", "better", "new",
])

const AUTO_DECORATIVE_CLONE_TAILS = new Set([
  "mira", "ella", "ory", "qube", "lix", "nix", "ora", "ova", "ara", "ium", "ify", "io",
])

const AUTO_GENERIC_TEMPLATE_HEADS = [
  "tax", "fin", "stream", "ledger", "book", "data", "cloud", "tech", "app", "pay", "fund", "mint",
] as const

const AUTO_GENERIC_TEMPLATE_TAILS = new Set([
  ...AUTO_DECORATIVE_CLONE_TAILS,
  "ly", "path", "guide", "hub", "link", "plus", "zone", "works",
])

const AUTO_GENERIC_TEMPLATE_EXCEPTIONS = new Set([
  "family", "finch", "timely", "early", "likely", "daily", "lovely", "solely", "orderly",
])

function getQuickAutoSemanticTerms(description: string): Set<string> {
  const terms = new Set<string>()
  for (const rawTerm of getBriefAdmissionTerms(description)) {
    const term = toLabel(rawTerm)
    if (term.length < 3 || AUTO_GROUNDING_STOP_TERMS.has(term)) continue
    terms.add(term)
    // `taxes` should be able to ground `taxhaven`, and a sufficiently
    // distinctive long root may be visibly abbreviated by one normal plural
    // ending. Never manufacture one- or two-character anchors.
    if (term.endsWith("ies") && term.length >= 5) terms.add(`${term.slice(0, -3)}y`)
    else if (term.endsWith("es") && term.length >= 5) terms.add(term.slice(0, -2))
    else if (term.endsWith("s") && term.length >= 4) terms.add(term.slice(0, -1))
  }
  return terms
}

function getQuickAutoGroundingTerms(description: string): Set<string> {
  const terms = getQuickAutoSemanticTerms(description)
  // A narrow prefix gives the clone guard coverage for "financial" ->
  // "finqube" without treating that shortened stem as positive evidence or
  // showing it to the model as a creative anchor.
  for (const term of [...terms]) {
    if (term.length >= 6) terms.add(term.slice(0, 3))
  }
  return terms
}

function getQuickCueOwnedSemanticWords(description: string): Set<string> {
  // Supply contexts are deliberately more specific than the broad signal
  // matcher. Include their strict cue as a first-class reviewed association;
  // otherwise words such as `proximity` and `telepresence` are generated from
  // the rural-telehealth bank, then incorrectly treated as context-free at
  // admission time because the broader matcher does not repeat that cue.
  const cues = new Set([
    ...getConceptSignals(description).map((signal) => signal.cue),
    getStrictPrimaryConceptRule(description)?.cue,
  ].filter((cue): cue is string => Boolean(cue)))
  const words = [...cues].flatMap((cue) => CONTEXTUAL_SEMANTIC_WORDS[cue] || [])
  return new Set(words.map(toLabel).filter((word) => word.length >= 4))
}

/**
 * A strict multi-term brief may explore laterally, but most of a published
 * Auto page must remain visibly attached to its primary job-to-be-done.
 * Provider-authored interpretations are never evidence: only reviewed roots,
 * reviewed whole words, verified locale forms, or replayable visible
 * boundaries satisfy this check.
 */
export function hasQuickPrimaryConceptEvidence(
  candidate: Pick<QuickCandidate, "name" | "fitRoots" | "constructionParts" | "evidence">,
  description: string,
): boolean {
  const primary = getStrictPrimaryConceptRule(description)
  if (!primary) return true
  if (isVerifiedQuickLocaleCandidate(candidate.name, description)) return true
  if (isQuickReviewedContextCompound(candidate.name, description)) return true

  const primaryTerms = new Set<string>()
  for (const rawTerm of [
    ...primary.roots,
    ...(CONTEXTUAL_SEMANTIC_WORDS[primary.cue] || []),
  ]) {
    const term = toLabel(rawTerm)
    if (term.length < 3) continue
    primaryTerms.add(term)
    if (term.endsWith("ies") && term.length >= 5) primaryTerms.add(`${term.slice(0, -3)}y`)
    else if (term.endsWith("es") && term.length >= 5) primaryTerms.add(term.slice(0, -2))
    else if (term.endsWith("s") && term.length >= 4) primaryTerms.add(term.slice(0, -1))
  }

  const visibleParts = [
    ...(candidate.fitRoots || []),
    ...(candidate.constructionParts || []),
  ].map(toLabel)
  if (visibleParts.some((part) => primaryTerms.has(part))) return true

  if (candidate.evidence?.kind === "semantic_word") {
    return primaryTerms.has(toLabel(candidate.evidence.source))
  }
  if (candidate.evidence?.kind === "reviewed_spelling") {
    return primaryTerms.has(toLabel(candidate.evidence.source))
  }
  if (candidate.evidence?.kind === "orthographic_fusion") {
    return primaryTerms.has(toLabel(candidate.evidence.left))
      || primaryTerms.has(toLabel(candidate.evidence.right))
  }

  const name = toLabel(candidate.name)
  return [...primaryTerms].some((term) => (
    term.length >= 3
    && name.length > term.length
    && (name.startsWith(term) || name.endsWith(term))
  ))
}

/**
 * A reviewed semantic word only earns an Auto explanation when this brief's
 * own concept cue has explicitly approved that word. This is deliberately
 * narrower than the global rationale vocabulary: `balance` can be truthful
 * for freelancer accounting, while `solace` must not borrow its meaning.
 */
export function isQuickCueOwnedSemanticWord(rawName: string, description: string): boolean {
  return getQuickCueOwnedSemanticWords(description).has(toLabel(rawName))
}

/**
 * Compact, locally reviewed semantic terrain for the single Auto model call.
 * It is guidance, not model-provided evidence; runtime admission still proves
 * the visible connection independently before anything reaches the page.
 */
export function getQuickAutoPromptAnchors(description: string): string[] {
  const promptNoise = new Set([
    ...AUTO_GROUNDING_STOP_TERMS,
    "build", "building", "create", "creating", "help", "helps", "mobile",
    "people", "shared", "together", "using", "want", "without", "young",
  ])
  const primaryIntent = getStrictPrimaryConceptRule(description)
  const valueFacet = getQuickValueFacet(description)
  return Array.from(new Set([
    // Exact release contexts lead the provider prompt without rewriting the
    // established deterministic/Advanced concept contract. This separation
    // prevents broad audience adjectives from winning model ideation while
    // preserving the frozen local generation matrix.
    ...(primaryIntent?.roots || []),
    ...(valueFacet?.roots.slice(0, 4) || []),
    ...(primaryIntent ? (CONTEXTUAL_SEMANTIC_WORDS[primaryIntent.cue] || []) : []),
    ...getQuickConceptRoots(description),
    ...getQuickCueOwnedSemanticWords(description),
    ...getQuickAutoSemanticTerms(description),
  ])).filter((term) => (
    term.length >= 3
    && term.length <= 14
    && !promptNoise.has(term)
  )).slice(0, 16)
}

function hasBriefBoundAutoEvidence(
  candidate: Pick<QuickCandidate, "name" | "evidence">,
  description: string,
  groundingTerms: ReadonlySet<string>,
): boolean {
  const evidence = candidate.evidence
  if (!evidence) return false

  if (evidence.kind === "semantic_word") {
    // Capacity words such as `mosaic` or `aurora` are valid words but not
    // evidence for every niche. A semantic direction is grounded only when
    // the brief's own reviewed cue explicitly owns that exact word.
    return toLabel(evidence.source) === toLabel(candidate.name)
      && isQuickCueOwnedSemanticWord(evidence.source, description)
  }
  if (evidence.kind === "reviewed_spelling") {
    return groundingTerms.has(toLabel(evidence.source))
  }
  // A fusion is specific only when at least one of its source parts belongs
  // to this brief. The ordinary candidate admission gate has already checked
  // that the joined surface is pronounceable and complete.
  return groundingTerms.has(toLabel(evidence.left)) || groundingTerms.has(toLabel(evidence.right))
}

function hasAutoRootSuffixClone(name: string, description: string, groundingTerms: ReadonlySet<string>): boolean {
  const literalTerms = new Set(extractQuickRoots(description).map(toLabel))
  for (const root of groundingTerms) {
    if (root.length < 3 || name === root || !name.startsWith(root)) continue
    const tail = name.slice(root.length)
    if (AUTO_DECORATIVE_CLONE_TAILS.has(tail) && !literalTerms.has(tail)) return true
  }
  return false
}

function hasAutoGenericTemplate(name: string, description: string): boolean {
  if (AUTO_GENERIC_TEMPLATE_EXCEPTIONS.has(name)) return false
  const literalTerms = new Set(extractQuickRoots(description).map(toLabel))
  return AUTO_GENERIC_TEMPLATE_HEADS.some((head) => {
    if (!name.startsWith(head) || name.length <= head.length) return false
    const tail = name.slice(head.length)
    return AUTO_GENERIC_TEMPLATE_TAILS.has(tail) && !literalTerms.has(tail)
  })
}

/**
 * A local, auditable quality tier used only for model-backed Auto names.
 * It does not claim trademark clearance or reject all abstract naming. It
 * prevents the default result page from being dominated by unsupported
 * pseudo-brand coinages, while retaining a small exploration lane for real
 * words or metaphors that survive the ordinary safety checks.
 */
export function assessQuickAutoCandidateQuality(
  candidate: Pick<QuickCandidate, "name" | "fitRoots" | "constructionParts" | "evidence">,
  description: string,
): QuickAutoCandidateQuality {
  const name = toLabel(candidate.name)
  // Locale policy forms are a finite, reviewed allowlist tied to an explicit
  // brief. English gibberish and template heuristics are not meaningful for
  // Welsh or French spellings and previously removed required locale slots.
  if (isVerifiedQuickLocaleCandidate(name, description)) return { tier: "grounded" }
  const groundingTerms = getQuickAutoGroundingTerms(description)
  const candidateParts = [
    ...(candidate.fitRoots || []),
    ...(candidate.constructionParts || []),
  ].map(toLabel)
  const reviewedContextCompound = isQuickReviewedContextCompound(name, description)
  const hasVisibleGrounding = candidateParts.some((part) => groundingTerms.has(part))
    || isQuickCueOwnedSemanticWord(name, description)
    || hasBriefBoundAutoEvidence(candidate, description, groundingTerms)
    || reviewedContextCompound

  if (
    !reviewedContextCompound
    && (
      isKeywordClone(name, [...groundingTerms])
      || hasAutoRootSuffixClone(name, description, groundingTerms)
    )
  ) {
    return { tier: "rejected", reason: "root_suffix_clone" }
  }
  if (!reviewedContextCompound && hasAutoGenericTemplate(name, description)) {
    return { tier: "rejected", reason: "generic_template" }
  }
  if (!hasVisibleGrounding && isGibberish(name)) {
    return { tier: "rejected", reason: "ungrounded_gibberish" }
  }

  return hasVisibleGrounding ? { tier: "grounded" } : { tier: "exploratory" }
}

function getLiteralBriefTerms(description: string): Set<string> {
  // Only normalized words the user actually entered are literal. Curated
  // anchors and provider sourceRoots are generation provenance; treating them
  // as verbatim brief language makes otherwise careful rationales misleading.
  return new Set(extractQuickRoots(description).map(toLabel).filter((term) => term.length >= 3))
}

function isSingleEditOrTransposition(left: string, right: string): boolean {
  if (left === right || Math.abs(left.length - right.length) > 1) return false
  if (left.length === right.length) {
    const differences: number[] = []
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) differences.push(index)
      if (differences.length > 2) return false
    }
    if (differences.length === 1) return true
    return differences.length === 2
      && differences[1] === differences[0] + 1
      && left[differences[0]] === right[differences[1]]
      && left[differences[1]] === right[differences[0]]
  }

  const [shorter, longer] = left.length < right.length ? [left, right] : [right, left]
  let shortIndex = 0
  let longIndex = 0
  let skipped = false
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1
      longIndex += 1
      continue
    }
    if (skipped) return false
    skipped = true
    longIndex += 1
  }
  return true
}

/**
 * A tiny, batch-only pronunciation key. This is intentionally not a
 * trademark search: it prevents two very similar suggestions from occupying
 * the same result set after the protected-brand screen has run. Restricting
 * it to an in-batch comparison keeps ordinary words available for generation.
 */
function getQuickBatchSoundKey(rawName: string): string {
  const name = toLabel(rawName)
  if (!name) return ""

  const soundSpelling = name
    .replace(/ph/g, "f")
    .replace(/qu/g, "k")
    .replace(/ck/g, "k")
    .replace(/c/g, "k")
    .replace(/x/g, "ks")
    .replace(/z/g, "s")
    .replace(/v/g, "f")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1")
    .replace(/h$/g, "")

  const first = soundSpelling[0] || ""
  return `${first}${soundSpelling.slice(1).replace(/[aeiou]/g, "")}`
}

function hasQuickBatchPhoneticCollision(left: string, right: string): boolean {
  if (left.length < 5 || right.length < 5 || Math.abs(left.length - right.length) > 2) return false
  const leftKey = getQuickBatchSoundKey(left)
  const rightKey = getQuickBatchSoundKey(right)
  return leftKey.length >= 3 && leftKey === rightKey
}

export type QuickBatchCollisionKind =
  | "exact_duplicate"
  | "near_duplicate"
  | "phonetic_duplicate"
  | "construction_family"

/**
 * Identifies result-set collisions that should never consume two visible
 * slots. Global protected-brand checks belong in filters; this complements
 * them by avoiding duplicates and reversible construction families inside one
 * batch. It deliberately returns a classification for tests and future
 * observability without exposing it in the public API.
 */
export function getQuickBatchCollision(
  candidate: Pick<QuickCandidate, "name" | "fitRoots" | "constructionParts">,
  selected: readonly Pick<QuickCandidate, "name" | "fitRoots" | "constructionParts">[],
  options: { includeConstructionFamily?: boolean } = {},
): QuickBatchCollisionKind | null {
  const name = toLabel(candidate.name)
  if (!name) return "exact_duplicate"
  const compoundSignature = options.includeConstructionFamily === false ? null : getQuickCompoundSignature(candidate)

  for (const existing of selected) {
    const existingName = toLabel(existing.name)
    if (name === existingName) return "exact_duplicate"
    if (name.length >= 5 && existingName.length >= 5 && isSingleEditOrTransposition(name, existingName)) {
      return "near_duplicate"
    }
    if (hasQuickBatchPhoneticCollision(name, existingName)) return "phonetic_duplicate"
    if (compoundSignature && compoundSignature === getQuickCompoundSignature(existing)) {
      return "construction_family"
    }
  }

  return null
}

function isDefensibleAlternateSpelling(name: string, source: string): boolean {
  if (source.endsWith("ic") && name === `${source.slice(0, -1)}k`) return true
  if (source.includes("ph") && name === source.replace("ph", "f")) return true
  return false
}

function hasTypoLikeBriefForm(name: string, terms: ReadonlySet<string>, resolvedStyle: QuickGenerateStyle): boolean {
  for (const term of terms) {
    if (term.length < 4 || name === term || !isSingleEditOrTransposition(name, term)) continue
    if (resolvedStyle === "alternate_spelling" && isDefensibleAlternateSpelling(name, term)) continue
    return true
  }
  return false
}

function hasDanglingCompoundFragment(name: string, terms: ReadonlySet<string>): boolean {
  const isKnownPart = (part: string) => terms.has(part) || Boolean(COMPANION_CUES[part]) || SAFE_SHORT_COMPOUND_PARTS.has(part)
  for (const term of terms) {
    if (term.length < 3 || name === term) continue
    if (name.startsWith(term)) {
      const suffix = name.slice(term.length)
      if (suffix.length >= 1 && suffix.length <= 3 && !isKnownPart(suffix)) return true
    }
    if (name.endsWith(term)) {
      const prefix = name.slice(0, -term.length)
      if (prefix.length >= 1 && prefix.length <= 3 && !isKnownPart(prefix)) return true
    }
  }
  return false
}

function hasVerifiedLocaleConstruction(name: string, description: string, requestedStyle: QuickGenerateStyle): boolean {
  if (requestedStyle !== "non_english") return true
  return isVerifiedQuickLocaleCandidate(name, description)
}

function isClippedOrForcedForm(
  name: string,
  description: string,
  resolvedStyle: QuickGenerateStyle,
  requestedStyle: QuickGenerateStyle,
  sourceRoots: readonly string[],
): boolean {
  // A complete Real Word is allowed to end in ordinary consonant clusters
  // (curl, skill, world) or doubled letters (coffee). Other construction
  // families must not masquerade a deleted vowel or incomplete stem as style.
  // Only an explicit user-selected Real Word direction receives the complete
  // word exception. In Auto, a model cannot bypass typo/clipping admission by
  // self-labelling a malformed candidate as `real_word`.
  if (requestedStyle === "real_word" && resolvedStyle === "real_word") return false
  if (CLIPPED_TERMINAL_SHAPES.test(name) || /(?:rr|ee)$/.test(name)) return true

  const terms = getBriefAdmissionTerms(description, sourceRoots)
  if (hasTypoLikeBriefForm(name, terms, resolvedStyle)) return true
  if (hasDanglingCompoundFragment(name, terms)) return true
  for (const term of terms) {
    // invoice -> invo, diagnostics -> diagnos, planner -> plannr. A familiar
    // Alternate Spelling changes a sound-bearing letter; it does not simply
    // truncate the source word.
    if (term.startsWith(name) && term.length - name.length >= 1 && term.length - name.length <= 5) return true

    if (resolvedStyle !== "alternate_spelling" && name.startsWith(term)) {
      const suffix = name.slice(term.length)
      if (FORCED_ROOT_SUFFIX.test(suffix)) return true
    }
  }

  return false
}

function isValidCandidate(
  name: string,
  maxChars: number,
  blockedTerms: Set<string>,
  blacklist: readonly string[] = [],
  context: Pick<QuickCandidateContext, "description" | "style" | "requestedStyle" | "sourceRoots" | "reviewedWholeWord" | "evidence">,
): boolean {
  const requestedStyle = normaliseStyle(context.requestedStyle ?? context.style)
  const resolvedStyle = normaliseStyle(context.style)
  const verifiedLocale = isVerifiedQuickLocaleCandidate(name, context.description)
  if (name.length < QUICK_MIN_NAME_LENGTH || name.length > maxChars) return false
  // Digits make Quick outputs feel like handles or leetspeak rather than
  // professional names. Availability labels remain ASCII letters only.
  if (!/^[a-z]+$/.test(name) || !/[aeiou]/.test(name)) return false
  if (
    EXACT_FILLER.has(name)
    || WEAK_EXACT_NAMES.has(name)
    || KNOWN_BROKEN.has(name)
    || UNSUITABLE_EXACT_NAMES.has(name)
    || QUICK_CROSS_NICHE_DEFAULTS.has(name)
  ) return false
  if (AWKWARD_CONSTRUCTIONS.some((pattern) => pattern.test(name))) return false
  if (hasConflictingQuickDominantMeaning(name, context.description)) return false
  if (name === "groom" && /\b(?:curly|curl|curls|coil|coils|hair|beauty)\b/.test(normaliseText(context.description))) return false
  if (requestedStyle !== "real_word" && /z$/.test(name)) return false
  if (!hasVerifiedLocaleConstruction(name, context.description, requestedStyle)) return false
  if (PROTECTED_BRANDS.has(name)) return false
  // Reject obvious extensions of protected examples as well as exact copies;
  // e.g. `openaid` must not bypass the `openai` example check by adding one
  // character. Shorter marks are exact-only to avoid broad false positives.
  if ([...PROTECTED_BRANDS].some((brand) => brand.length >= 5 && name.includes(brand))) return false
  if ([...PROTECTED_SHORT_BRAND_FRAGMENTS].some((brand) => name.includes(brand))) return false
  if (DAMAGED_FRAGMENTS.some((fragment) => name.includes(fragment))) return false
  if (/(?:asdf|qwer|zxcv|hjkl)/.test(name) || hasRepeatedFragment(name)) return false
  if (/(.)\1{3,}/.test(name)) return false
  for (const blocked of blockedTerms) {
    if (name.includes(blocked)) return false
  }
  for (const blocked of blacklist.map(toLabel).filter((term) => term.length >= 2)) {
    if (name.includes(blocked)) return false
  }

  const briefTerms = getBriefAdmissionTerms(context.description, context.sourceRoots)
  // Auto exploration may include Real Word directions, but should not return a
  // bare literal or curated category/location/audience cue reusable across
  // unrelated niches. This broader admission set is intentionally separate
  // from rationale wording: only actual user-entered words are called literal.
  // An explicit Real Word request remains authoritative.
  if (requestedStyle !== "real_word" && briefTerms.has(name) && !context.reviewedWholeWord && !verifiedLocale) return false
  const hasReviewedEvidence = Boolean(context.reviewedWholeWord || context.evidence)
  if (
    !hasReviewedEvidence
    && !verifiedLocale
    && isClippedOrForcedForm(name, context.description, resolvedStyle, requestedStyle, context.sourceRoots || [])
  ) return false

  if (hasUnsafeBrandMeaning(name)) return false
  // A familiar coined-name ending is not, by itself, a hard quality failure.
  // Quick keeps pronounceable abstract exploration open while the clipping,
  // random-syllable, safety and protected-brand gates remain authoritative.
  // Score-led Auto-find retains its stricter AI-smell filter separately.
  if (!hasReviewedEvidence && !verifiedLocale && hasRandomSyllablePattern(name)) return false
  // Only severe pronounceability failures are hard admissions failures.
  // Semantic relevance is carried by the rationale, not by requiring a
  // visible dictionary root in every creative direction.
  if (!hasReviewedEvidence && !verifiedLocale && isGibberish(name) && getRealnessScore(name) < 10) return false
  return true
}

function inferCandidateStyle(
  rawName: string,
  declaredStyle: QuickGenerateStyle | undefined,
  requestedStyle: QuickGenerateStyle | undefined,
  fitRoots: readonly string[],
  constructionParts: readonly string[],
  description: string,
): NameStyle {
  const declared = normaliseStyle(declaredStyle)
  const requested = normaliseStyle(requestedStyle ?? declaredStyle)
  const fullyLocaleConstruction = isVerifiedQuickLocaleCandidate(rawName, description)

  if ((requested === "auto" || requested === "non_english") && fullyLocaleConstruction) return "non_english"
  // Exact visible morphology is authoritative for local and model candidates.
  // Brandable describes a coinage, not an arbitrary literal join. Preserve
  // Short Phrase for an explicitly requested, model-verified two-part
  // modifier+noun construction. Auto and deterministic generation still reach
  // this branch only through the reviewed phrase-lead families.
  if (constructionParts.length === 2) {
    const phraseLead = constructionParts[0]
    if (
      declared === "short_phrase"
      && (
        requested === "short_phrase"
        || PHRASE_LEAD_COMPANIONS.has(phraseLead)
        || CONTEXTUAL_PHRASE_LEAD_SET.has(phraseLead)
      )
    ) return "short_phrase"
    return "compound"
  }
  if ((declared === "compound" || declared === "short_phrase") && constructionParts.length !== 2) {
    return fitRoots.length === 0 ? "evocative" : "brandable"
  }
  if (declared === "non_english" && !fullyLocaleConstruction) {
    return constructionParts.length === 2 ? "compound" : fitRoots.length === 0 ? "evocative" : "brandable"
  }
  if (declared !== "auto") return declared
  if (/\s|-/.test(rawName.trim())) return "short_phrase"
  // Source roots describe generation context and can include several concepts
  // for a wholly abstract label. Only a complete visible boundary proves a
  // compound; fit-root count alone must never manufacture that style.
  if (fitRoots.length === 1 && toLabel(rawName) === toLabel(fitRoots[0])) return "real_word"
  if (fitRoots.length === 0) return "evocative"
  return "brandable"
}

function inferConstructionParts(name: string, description: string, sourceRoots: readonly string[]): string[] {
  if (QUICK_LEXICALISED_WHOLE_WORDS.has(name)) return []
  const localeRoots = getQuickLocalePolicy(description)?.roots || []
  const components = new Set([
    ...getBriefAdmissionTerms(description, sourceRoots),
    ...localeRoots,
    ...QUICK_COMMON_SURFACE_PARTS,
    ...SAFE_SHORT_COMPOUND_PARTS,
  ].map(toLabel).filter((part) => part.length >= 3 || SAFE_SHORT_COMPOUND_PARTS.has(part)))

  // Test exact boundaries rather than incidental substrings. This recognises
  // `fund`+`go` and `pledge`+`it`, while standalone words such as `mosaic`,
  // `aurora`, `nurture`, `cattery` and `kinship` remain unsplit.
  const possible: Array<[string, string]> = []
  for (let splitAt = 2; splitAt <= name.length - 2; splitAt += 1) {
    const left = name.slice(0, splitAt)
    const right = name.slice(splitAt)
    if (!components.has(left) || !components.has(right)) continue
    possible.push([left, right])
  }
  possible.sort((left, right) => {
    const leftMinimum = Math.min(left[0].length, left[1].length)
    const rightMinimum = Math.min(right[0].length, right[1].length)
    return rightMinimum - leftMinimum || right[0].length - left[0].length
  })
  return possible[0] || []
}

const REDUNDANT_COMPONENT_GROUPS: readonly ReadonlySet<string>[] = [
  new Set(["arc", "arch"]),
  new Set(["cat", "feline", "purr", "paw"]),
  new Set(["chill", "cold"]),
  new Set(["coil", "curl", "hair", "texture"]),
  new Set(["gilt", "gold"]),
  new Set(["give", "giving"]),
  new Set(["mama", "mother"]),
  new Set(["adapt", "renew", "reuse"]),
  new Set(["interior", "room"]),
  new Set(["learn", "lingo", "speak"]),
  new Set(["bite", "meal", "supper", "table"]),
  new Set(["grow", "plant", "soil"]),
  new Set(["coast", "shore"]),
  new Set(["solar", "sun"]),
  new Set(["agenda", "slot", "tempo", "time"]),
  new Set(["child", "family", "parent"]),
]

const REJECTED_RIGHT_QUALIFIERS = new Set(["ethical", "exact", "local", "private", "public", "rural"])
// These are literal audience, place or workflow heads that read backwards
// after a naming cue (care+teen, soil+balcony, trust+council). They remain
// available as leading/category evidence; only the mechanically suffixed form
// is rejected.
const REJECTED_TRAILING_CATEGORY_HEADS = new Set(["balcony", "council", "debug", "esport", "supper", "teen"])
const GENERIC_TRAILING_FILLERS = new Set(["guide", "path"])

function hasRedundantConstruction(parts: readonly string[]): boolean {
  if (parts.length !== 2) return false
  const [left, right] = parts.map(toLabel)
  if (!left || !right || left === right) return true
  if (left === "old" || right === "old" || REJECTED_RIGHT_QUALIFIERS.has(right)) return true
  if (REJECTED_TRAILING_CATEGORY_HEADS.has(right)) return true
  // `category+generic-helper` is a reusable template rather than a distinctive
  // naming idea. Keep those words available as standalone concepts, but do not
  // mechanically append them to every niche.
  if (GENERIC_TRAILING_FILLERS.has(right)) return true
  return REDUNDANT_COMPONENT_GROUPS.some((group) => group.has(left) && group.has(right))
}

export function createQuickCandidateFromName(rawName: string, context: QuickCandidateContext): QuickCandidate | null {
  const briefSafety = getQuickBriefSafety(context.description)
  context = {
    ...context,
    description: briefSafety.description,
    blacklist: [...(context.blacklist || []), ...briefSafety.prohibitedTerms],
  }
  const maxChars = clampNumber(context.maxChars, 10, MIN_MAX_CHARS, MAX_MAX_CHARS)
  const name = toLabel(rawName)
  if (name.length > maxChars) return null

  const signals = getConceptSignals(context.description)
  const sourceRoots = (context.sourceRoots || []).map(toLabel).filter(Boolean)
  if (!isValidCandidate(name, maxChars, blockedRhymeTerms(context.rhymeWith), context.blacklist, context)) return null

  const constructionParts = inferConstructionParts(name, context.description, sourceRoots)
  if (!isVerifiedQuickLocaleCandidate(name, context.description) && hasRedundantConstruction(constructionParts)) return null
  // A fit root is display evidence, not hidden generation provenance. Count a
  // category signal only when it is the whole name or an exact visible A+B
  // construction part. This prevents model sourceRoots from making unrelated
  // labels such as ivorybeam look semantically grounded.
  const signalFitRoots = signals
    .filter((signal) => name === signal.root || constructionParts.includes(signal.root))
    .map((signal) => signal.root)
  const visibleSourceRoots = context.conceptCueOverride
    ? sourceRoots.filter((root) => name === root || constructionParts.includes(root))
    : []
  const fitRoots = Array.from(new Set([...signalFitRoots, ...visibleSourceRoots]))
  const fitCues = context.conceptCueOverride && fitRoots.length > 0
    ? [context.conceptCueOverride]
    : Array.from(new Set(signals.filter((signal) => signalFitRoots.includes(signal.root)).map((signal) => signal.cue)))
  const candidateStyle = inferCandidateStyle(
    rawName,
    context.style,
    context.requestedStyle,
    fitRoots,
    constructionParts,
    context.description,
  )
  const requestedStyle = normaliseStyle(context.requestedStyle ?? context.style)
  const briefFacts = buildQuickBriefFactSheet(context.description)
  if (requestedStyle !== "auto" && candidateStyle !== requestedStyle) return null
  const rationaleTone = QUICK_GENERATE_VIBES.includes(context.vibe as QuickGenerateVibe)
    ? (context.vibe as QuickGenerateVibe)
    : "friendly"
  const literalBriefTerms = getLiteralBriefTerms(context.description)
  const curatedParts = new Set([
    ...getBriefAnchors(context.description),
    ...(context.modelAuthored ? [] : sourceRoots),
  ].map(toLabel).filter((part) => part.length >= 3 && !literalBriefTerms.has(part)))
  const provenanceFor = (part: string): "literal" | "curated" | "sound" => {
    if (literalBriefTerms.has(part)) return "literal"
    if (curatedParts.has(part)) return "curated"
    // Companion dictionaries are reviewed supply for deterministic generation,
    // not evidence for arbitrary model-authored parts in an unrelated brief.
    if (!context.modelAuthored && Boolean(COMPANION_CUES[part])) return "curated"
    return "sound"
  }
  const constructionProvenance = constructionParts.length === 2
    ? [provenanceFor(constructionParts[0]), provenanceFor(constructionParts[1])] as const
    : undefined
  const hasDerivedPartEvidence = constructionParts.some((part) => curatedParts.has(part))
  const rationaleRelevance = (fitRoots.length > 0
    || Boolean(context.evidence)
    || hasDerivedPartEvidence
    || (candidateStyle === "non_english" && isVerifiedQuickLocaleCandidate(name, context.description)))
    ? "category_evidence"
    : "context_only"
  return {
    name,
    personality: renderQuickCandidateRationale({
      name,
      style: candidateStyle,
      tone: rationaleTone,
      conceptCue: context.conceptCueOverride
        || (context.evidence?.kind === "semantic_word" ? context.evidence.cue : fitCues[0] || signals[0]?.cue),
      constructionParts,
      constructionProvenance,
      evidence: context.evidence,
      relevance: rationaleRelevance,
      briefFacts,
    }),
    style: candidateStyle,
    fitRoots,
    fitCues,
    ...(constructionParts.length === 2 ? { constructionParts } : {}),
    ...(context.evidence ? { evidence: context.evidence } : {}),
  }
}

function safeJoin(left: string, right: string): string | null {
  const first = toLabel(left)
  const second = toLabel(right)
  if (!first || !second || first === second) return null
  if (first.endsWith(second) || second.startsWith(first)) return null
  if (first[first.length - 1] === second[0]) return null
  return `${first}${second}`
}

interface QuickAlternateDraft {
  name: string
  rule: Extract<QuickCandidateEvidence, { kind: "reviewed_spelling" }>["rule"]
}

function buildPronounceableAlternateSpellings(value: string): QuickAlternateDraft[] {
  const word = toLabel(value)
  if (word.length < 4) return []
  const variants: QuickAlternateDraft[] = []
  if ((word.match(/ph/g) || []).length === 1) variants.push({ name: word.replace("ph", "f"), rule: "ph_to_f" })
  if (word.endsWith("ic")) variants.push({ name: `${word.slice(0, -1)}k`, rule: "terminal_ic_to_ik" })
  return Array.from(new Map(variants.filter((variant) => variant.name !== word).map((variant) => [variant.name, variant])).values())
}

interface QuickFusionDraft {
  name: string
  evidence: Extract<QuickCandidateEvidence, { kind: "orthographic_fusion" }>
}

function buildReviewedContextFusion(leftValue: string, rightValue: string): QuickFusionDraft | null {
  const left = toLabel(leftValue)
  const right = toLabel(rightValue)
  const maximumOverlap = Math.min(4, left.length - 1, right.length - 1)
  for (let overlapLength = maximumOverlap; overlapLength >= 2; overlapLength -= 1) {
    const overlap = left.slice(-overlapLength)
    if (overlap !== right.slice(0, overlapLength)) continue
    const name = `${left}${right.slice(overlapLength)}`
    if (
      right.length - overlapLength >= 3
      && name.length >= 5
      && !hasUnsafeBrandMeaning(name)
      && !hasRepeatedFragment(name)
    ) {
      return { name, evidence: { kind: "orthographic_fusion", left, right, overlap } }
    }
    return null
  }
  return null
}

/** Creates traceable portmanteaux from two complete words with an exact
 * two-to-four-letter seam. One-letter overlaps are too easy to manufacture
 * mechanically and repeatedly produced ambiguous surfaces in review. */
function buildOverlapFusions(leftValues: readonly string[], rightValues: readonly string[]): QuickFusionDraft[] {
  const results = new Map<string, QuickFusionDraft>()
  for (const rawLeft of leftValues) {
    const left = toLabel(rawLeft)
    if (left.length < 3 || !/[aeiou]/.test(left)) continue
    for (const rawRight of rightValues) {
      const right = toLabel(rawRight)
      if (right.length < 4 || left === right || !/[aeiou]/.test(right)) continue
      const maximumOverlap = Math.min(4, left.length - 1, right.length - 1)
      for (let overlap = maximumOverlap; overlap >= 2; overlap -= 1) {
        if (left.slice(-overlap) !== right.slice(0, overlap)) continue
        const fused = `${left}${right.slice(overlap)}`
        const retainedRight = right.length - overlap
        if (
          retainedRight >= 3
          && fused.length >= 5
          && fused !== `${left}${right}`
          && !isSingleEditOrTransposition(fused, left)
          && !isSingleEditOrTransposition(fused, right)
          && getRealnessScore(fused) >= 35
          && !isGibberish(fused)
          && !hasUnsafeBrandMeaning(fused)
        ) {
          results.set(fused, {
            name: fused,
            evidence: { kind: "orthographic_fusion", left, right, overlap: left.slice(-overlap) },
          })
        }
        break
      }
    }
  }
  return Array.from(results.values())
}

export function isQuickShortlistGrade(candidate: QuickCandidate, description: string): boolean {
  if (candidate.name.length < 5) return false
  if (hasConflictingQuickDominantMeaning(candidate.name, description)) return false
  if (candidate.evidence?.kind === "semantic_word" || candidate.evidence?.kind === "reviewed_spelling") return true
  // Reviewed locale forms have their own language-aware admission contract;
  // applying the English shape heuristic first incorrectly demoted forms such
  // as `liensante` and `pontcymru` after they had already been verified.
  if (candidate.style === "non_english") return isVerifiedQuickLocaleCandidate(candidate.name, description)
  if (getRealnessScore(candidate.name) < 35) return false
  if ((candidate.fitRoots?.length || 0) > 0) return true
  if (candidate.evidence?.kind === "orthographic_fusion") return getRealnessScore(candidate.name) >= 65

  const reviewedContext = new Set([
    ...getBriefAnchors(description),
    ...getConceptSignals(description).flatMap((signal) => CUE_COMPANIONS[signal.cue] || []),
  ].map(toLabel))
  return reviewedContext.has(candidate.name) || REVIEWED_WHOLE_WORD_SET.has(candidate.name)
}

const EVOCATIVE_COMPANIONS = new Set([
  "beam", "bloom", "crest", "grove", "haven", "hearth", "loom", "north", "pilot", "ripple", "spark", "stone", "stride", "summit",
])

const PHRASE_LEAD_COMPANIONS = new Set([
  "be", "bold", "bright", "calm", "clear", "go", "kind", "my", "new", "noble", "now", "one", "open", "quiet", "safe", "true", "try", "up", "we", "wise",
])

const CONTEXTUAL_PHRASE_LEAD_SET = new Set([
  "active", "adaptive", "alpine", "attentive", "brave", "clean", "clever", "coastal", "cold", "cozy", "crafted", "deep", "easy",
  "everyday", "exact", "fair", "fast", "first", "fit", "fresh", "future", "gentle", "guided", "handmade", "honest", "inclusive",
  "independent", "instant", "joyful", "lasting", "late", "live", "local", "modern", "near", "nightly", "own", "plain",
  "precious", "private", "proud", "pure", "ready", "refined", "renewed", "secure", "shared", "sharp", "simple", "small",
  "playful", "smart", "steady", "strong", "textured", "trusted", "urban", "warm", "wild", "willing", "woven",
])

const VIBE_PHRASE_LEADS: Readonly<Record<QuickGenerateVibe, readonly string[]>> = {
  friendly: ["kind", "calm", "clear", "open", "safe", "true"],
  playful: ["bright", "bold", "open", "kind"],
  premium: ["noble", "quiet", "true", "clear"],
  tech: ["clear", "bright", "bold", "open"],
  clean: ["clear", "calm", "open", "true", "wise"],
  bold: ["bold", "bright", "true", "noble"],
}

/** Job-specific grammatical modifiers keep Auto's phrase slots useful instead
 * of spending them on the same Bright/Open/Wise templates in every niche. */
const CONTEXTUAL_PHRASE_LEADS: Readonly<Record<string, readonly string[]>> = {
  "household financial clarity": ["steady", "simple", "wise"],
  "private teen emotional support": ["private", "safe", "steady"],
  "trusted cat care": ["urban", "near", "attentive"],
  "gentle postpartum fitness": ["gentle", "steady", "ready"],
  "ethical nurse recruitment": ["fair", "local", "trusted"],
  "clear mortgage comparison": ["clear", "guided", "fair"],
  "vetted childcare choices": ["trusted", "local", "safe"],
  "donor relationship stewardship": ["lasting", "steady", "true"],
  "rural Quebec healthcare access": ["local", "near", "trusted"],
  "Welsh farm-to-school trade": ["local", "fair", "shared"],
  "late-night student meal membership": ["late", "nightly", "ready"],
  "playful puzzle games": ["clever", "cozy", "playful"],
  "multicultural wedding planning": ["joyful", "shared", "woven"],
  "last-minute restaurant booking": ["instant", "ready", "live"],
  "indie music discovery": ["independent", "fresh", "live"],
  "practical language learning": ["everyday", "open", "ready"],
  "independent artisan gift marketplace": ["handmade", "crafted", "independent"],
  "neighbourhood volunteer coordination": ["local", "willing", "shared"],
  "inclusive curls-and-coils care": ["inclusive", "textured", "proud"],
  "balcony gardening kits": ["small", "urban", "ready"],
  "alpine botanical skincare": ["alpine", "pure", "refined"],
  "coastal coffee ritual": ["coastal", "local", "fresh"],
  "family-business continuity": ["lasting", "future", "steady"],
  "Lisbon buyer advisory": ["local", "guided", "trusted"],
  "solo women group travel": ["guided", "brave", "shared"],
  "locally guided conservation travel": ["guided", "local", "wild"],
  "quiet ryokan hospitality": ["quiet", "modern", "calm"],
  "warm restrained interiors": ["warm", "quiet", "refined"],
  "adaptive architectural reuse": ["renewed", "adaptive", "lasting"],
  "recycled-gold jewellery craft": ["renewed", "lasting", "precious"],
  "circular textile renewal": ["renewed", "lasting", "woven", "second"],
  "founder scheduling assistance": ["smart", "fast", "ready"],
  "early biotech diagnostics": ["early", "clear", "sharp"],
  "India solar installer trade": ["local", "open", "ready"],
  "distributed employee onboarding": ["first", "easy", "ready"],
  "shared-building EV charging": ["shared", "ready", "open"],
  "developer observability": ["live", "clear", "deep"],
  "European retail privacy compliance": ["safe", "clear", "fair"],
  "university research collaboration": ["shared", "open", "clear"],
  "beginner self-custody": ["own", "safe", "simple"],
  "Berlin rental application transparency": ["clear", "fair", "open"],
  "freelancer accounting": ["plain", "clear", "simple"],
  "small-business contract review": ["plain", "clear", "simple"],
  "rural telehealth reach": ["near", "open", "local"],
  "adaptive secondary exam readiness": ["ready", "smart", "steady"],
  "manufacturer carbon accounting": ["exact", "clear", "true"],
  "Kenya small-farm irrigation": ["smart", "steady", "local"],
  "humanitarian field water safety testing": ["safe", "clean", "clear"],
  "first-investor finance briefing": ["plain", "first", "clear"],
  "homeowner claim guidance": ["fair", "guided", "clear"],
  "council supplier procurement": ["open", "fair", "clear"],
  "endpoint threat analytics": ["live", "secure", "sharp"],
  "working-dog nutrition": ["active", "strong", "fit"],
  "endurance athlete recovery": ["steady", "strong", "ready"],
  "climate startup marketing": ["credible", "honest", "sharp"],
  "pharma cold-chain monitoring": ["steady", "cold", "safe"],
  "competitive esports analytics": ["live", "sharp", "bold"],
  "investigative corporate-power podcast": ["deep", "open", "true"],
  "small-factory robotics": ["smart", "small", "ready"],
  "factory visual inspection": ["exact", "sharp", "clear"],
  "mobile rural auto repair": ["honest", "local", "ready"],
}

const UNSUITABLE_PHRASE_HEADS = new Set([
  "berlin", "council", "cymru", "euro", "first", "founder", "her", "india", "japan", "kenya",
  "lisbon", "local", "old", "private", "public", "quebec", "rural", "solo", "teen", "welsh",
])

const NATURAL_PREFIX_COMPANIONS = new Set([
  ...PHRASE_LEAD_COMPANIONS,
  "care", "join", "proof", "signal", "team", "track", "trust", "well",
])

const TRAILING_ACTION_PARTS = new Set([
  "adapt", "detect", "give", "hire", "inspect", "learn", "listen", "renew", "repair", "restore", "speak",
])

const TRAILING_MODIFIER_PARTS = new Set([
  "active", "bold", "bright", "calm", "clear", "cozy", "ethical", "indie", "kind", "local", "noble",
  "open", "private", "quiet", "safe", "true", "vetted", "wise",
])

/** Rejects mechanically reversible or grammatically inverted A+B labels.
 * This operates on visible parts rather than frozen output strings, so the
 * same bad word order cannot return through a new seed. */
function hasUnnaturalQuickConstruction(candidate: QuickCandidate): boolean {
  if (candidate.constructionParts?.length !== 2) return false
  const [left, right] = candidate.constructionParts
  if (TRAILING_ACTION_PARTS.has(right)) return true
  if (TRAILING_MODIFIER_PARTS.has(right)) return true
  if (left === "kin" && right.startsWith("g")) return true
  if ((left === "market" || left === "trade") && ["craft", "gift", "hand", "maker"].includes(right)) return true
  if (left === "route" && ["campus", "guest", "school", "student"].includes(right)) return true
  if (left === "dine" && ["guest", "table"].includes(right)) return true
  return false
}

function deterministicJoinStyle(companion: string, companionFirst: boolean): NameStyle {
  if (companionFirst && PHRASE_LEAD_COMPANIONS.has(companion)) return "short_phrase"
  if (EVOCATIVE_COMPANIONS.has(companion)) return "evocative"
  return companionFirst ? "compound" : "brandable"
}

/** Identifies reversible two-part constructions (`storyprobe` / `probestory`)
 * by their unordered semantic components. Direction changes do not create a
 * genuinely new naming idea, so only one may occupy a visible batch. */
export function getQuickCompoundSignature(candidate: Pick<QuickCandidate, "name" | "fitRoots" | "constructionParts">): string | null {
  if (candidate.constructionParts?.length === 2) {
    return [...candidate.constructionParts].sort().join("+")
  }
  const components = Array.from(new Set([
    ...(candidate.fitRoots || []),
    ...Object.keys(COMPANION_CUES),
    ...Object.values(CUE_COMPANIONS).flat(),
    ...Object.values(VIBE_COMPANIONS).flat(),
  ].map(toLabel).filter((part) => part.length >= 3 && candidate.name.includes(part))))

  for (let leftIndex = 0; leftIndex < components.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < components.length; rightIndex += 1) {
      const left = components[leftIndex]
      const right = components[rightIndex]
      if (`${left}${right}` !== candidate.name && `${right}${left}` !== candidate.name) continue
      return [left, right].sort().join("+")
    }
  }
  return null
}

export function getQuickVisibleFamilies(candidate: Pick<QuickCandidate, "name" | "fitRoots">): string[] {
  // A family is a repeated semantic root, not every visible construction
  // part. Treating brief-specific anchors and generic suffixes as families
  // exhausts the contextual pool, then forces category-wide reserve names
  // into the page. Mirror-pair dedupe separately handles A+B/B+A, while the
  // prefix/suffix caps below still prevent a single anchor dominating.
  return Array.from(new Set((candidate.fitRoots || []).filter((root) => root.length >= 3 && candidate.name.includes(root))))
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mixHash(value: number): number {
  let mixed = value >>> 0
  mixed ^= mixed >>> 16
  mixed = Math.imul(mixed, 0x7feb352d)
  mixed ^= mixed >>> 15
  mixed = Math.imul(mixed, 0x846ca68b)
  mixed ^= mixed >>> 16
  return mixed >>> 0
}

function rotate<T>(items: readonly T[], offset: number): T[] {
  if (items.length === 0) return []
  const safeOffset = Math.abs(offset) % items.length
  return [...items.slice(safeOffset), ...items.slice(0, safeOffset)]
}

function getContextualSemanticWords(
  cue: string,
  description: string,
  vibe: QuickGenerateVibe,
  seed: number,
): string[] {
  const reviewed = CONTEXTUAL_SEMANTIC_WORDS[cue]
  if (!reviewed?.length) return rotate(REVIEWED_WHOLE_WORDS[vibe], seed >>> 12).slice(0, 10)
  const cueOwned = (words: readonly string[]) => words.filter((word) => CONTEXTUAL_SEMANTIC_WORD_OWNERS.get(toLabel(word)) === cue)
  if (reviewed.length <= 3) return cueOwned(reviewed)

  const text = normaliseText(description)
  const pairedCue = cue === "physical progress and recovery"
    || cue === "clearer signals and insight"
    || cue === "protection and trust"
  if (!pairedCue) return cueOwned(reviewed)
  if (cue === "protection and trust") {
    return cueOwned(/\b(?:cyber|threat|detection)\b/.test(text) ? reviewed.slice(10) : reviewed.slice(0, 10))
  }
  const useSecondBank = (
    (cue === "physical progress and recovery" && /\b(?:athlete|endurance|physio|sports recovery)\b/.test(text))
    || (cue === "clearer signals and insight" && /\b(?:developer|observability|debugging)\b/.test(text))
  )
  return cueOwned(reviewed.slice(useSecondBank ? 8 : 0, useSecondBank ? 16 : 8))
}

function selectDiverse(
  candidates: readonly QuickCandidate[],
  count: number,
  styleTargets: QuickStyleTargets,
  stylePriority: readonly NameStyle[],
  preferredParts: readonly string[] = [],
  selectionSeed = 0,
  description = "",
  requestedStyle: QuickGenerateStyle = "auto",
  curatedPrimaryNames: readonly string[] = [],
): QuickCandidate[] {
  const selected: QuickCandidate[] = []
  const selectedNames = new Set<string>()
  const prefixCount = new Map<string, number>()
  const suffixCount = new Map<string, number>()
  const compoundSignatures = new Set<string>()
  const familyCounts = new Map<string, number>()
  const styleCounts = new Map<NameStyle, number>()
  const zeroFitCounts = new Map<NameStyle, number>()
  let semanticWordCount = 0
  const preferred = new Set(preferredParts.map(toLabel).filter(Boolean))
  const enforcePrimaryFamilyDiversity = requestedStyle === "auto"
    && requiresQuickPrimaryConceptEvidence(description)
  const requireExclusivePrimaryEvidence = requestedStyle === "auto"
    && requiresExclusiveQuickPrimaryConceptEvidence(description)
  const selectionValueFacet = requestedStyle === "auto" ? getQuickValueFacet(description) : null
  const visibleFamilyLimit = enforcePrimaryFamilyDiversity ? 2 : 4
  const isExactPreferred = (candidate: QuickCandidate): boolean => preferred.has(candidate.name)
  const isBriefBound = (candidate: QuickCandidate): boolean => (
    preferred.has(candidate.name)
    || Boolean(candidate.constructionParts?.some((part) => preferred.has(part)))
    || (candidate.evidence?.kind === "orthographic_fusion"
      && (preferred.has(candidate.evidence.left) || preferred.has(candidate.evidence.right)))
    || candidate.evidence?.kind === "semantic_word"
  )
  // Curated anchors capture the concrete wrinkle in this brief (teen, ward,
  // Kenya, tenant), while category roots such as care/data/frame recur across
  // adjacent markets. Put exact anchor-bearing constructions first and retain
  // the broader semantic pool for completion.
  const isPageEligible = (candidate: QuickCandidate): boolean => (
    mixHash(hashSeed(`${selectionSeed}:${candidate.name}`)) % 4 !== 0
  )
  const semanticRank = (candidate: QuickCandidate): number => {
    if (candidate.style === "non_english" && isVerifiedQuickLocaleCandidate(candidate.name, description)) return 7
    if (candidate.evidence?.kind === "semantic_word") return 6
    if (candidate.evidence?.kind === "reviewed_spelling") return 5
    if (candidate.evidence?.kind === "orthographic_fusion") return 4
    if ((candidate.fitRoots?.length || 0) > 0) return 3
    return 1
  }
  const rendezvousRank = (candidate: QuickCandidate): number => mixHash(hashSeed(`${selectionSeed}:rank:${candidate.name}`))
  const rank = (items: readonly QuickCandidate[]): QuickCandidate[] => [...items].sort((left, right) => (
    semanticRank(right) - semanticRank(left)
    || Number(isExactPreferred(right)) - Number(isExactPreferred(left))
    || Number(isBriefBound(right)) - Number(isBriefBound(left))
    || rendezvousRank(right) - rendezvousRank(left)
    || left.name.localeCompare(right.name)
  ))
  const eligibleCandidates = rank(candidates.filter(isPageEligible))
  const rankedEligible = [
    ...eligibleCandidates.filter(isBriefBound),
    ...eligibleCandidates.filter((candidate) => !isBriefBound(candidate)),
  ]
  // The same safe construction is not entitled to page one for every adjacent
  // brief. A deterministic 75% eligibility gate varies the displayed subset;
  // the full admitted pool remains below it as an exact-16 completion fallback.
  const rankedCandidates = [
    ...rankedEligible,
    ...rank(candidates.filter((candidate) => !isPageEligible(candidate) && isBriefBound(candidate))),
    ...rank(candidates.filter((candidate) => !isPageEligible(candidate) && !isBriefBound(candidate))),
  ]

  const semanticStyleCapacity = candidates.reduce((capacity, candidate) => {
    if (candidate.evidence?.kind !== "semantic_word") return capacity
    if (candidate.style === "real_word" || candidate.style === "evocative") capacity[candidate.style] += 1
    return capacity
  }, { real_word: 0, evocative: 0 })
  // A rich cue-owned semantic bank earns more of the page. Sparse contexts keep
  // the established construction mix so exact-16 never depends on padding or a
  // hidden relaxation of the admission rules.
  const useSemanticFirstAutoMix = requestedStyle === "auto"
    && semanticStyleCapacity.real_word >= 5
    && semanticStyleCapacity.evocative >= 5
  // Under tight character limits, honest compounds and phrases often cannot
  // fit at all. Prefer a larger cue-owned whole-word lane over unrelated
  // two-syllable reserves; normal and long pages keep an eight-word ceiling
  // so at least half the page still comes from other construction styles.
  const candidateLengthCeiling = candidates.reduce(
    (maximum, candidate) => Math.max(maximum, candidate.name.length),
    0,
  )
  const semanticCue = getQuickPrimaryIntent(description)?.cue
  const semanticWordLimit = getQuickReviewedEditorialPortfolio(description)
    ? 10
    : semanticCue === "rural telehealth reach"
    ? 8
    : semanticCue === "circular textile renewal"
      ? 8
      : candidateLengthCeiling <= 6
      ? 12
      : candidateLengthCeiling <= 8
        ? 10
        : 8
  const autoHardStyleMaximums = useSemanticFirstAutoMix
    ? SEMANTIC_FIRST_AUTO_STYLE_MAXIMUMS
    : AUTO_STYLE_MAXIMUMS
  const hardStyleMaximum = (style: NameStyle): number => requestedStyle === "auto"
    ? (style === "real_word" || style === "evocative") && candidateLengthCeiling <= 6
      ? Math.max(6, autoHardStyleMaximums[style])
      : style === "compound" && selectionValueFacet
      ? Math.max(6, autoHardStyleMaximums[style])
      : style === "compound" && enforcePrimaryFamilyDiversity
        ? Math.max(5, autoHardStyleMaximums[style])
        : autoHardStyleMaximums[style]
    : styleTargets[style]

  const add = (candidate: QuickCandidate, relaxedSoftCaps = false, relaxedStyleTargets = false): boolean => {
    if (selectedNames.has(candidate.name)) return false
    if (requireExclusivePrimaryEvidence && !hasQuickPrimaryConceptEvidence(candidate, description)) return false
    const verifiedLocale = candidate.style === "non_english" && isVerifiedQuickLocaleCandidate(candidate.name, description)
    // A soft-cap relaxation may help a sparse niche complete its quota, but
    // it must never surface the same naming idea twice under a tiny spelling,
    // sound, or reversed-compound variation.
    // Finite reviewed locale forms are the exception: related words naturally
    // share language roots and the product contract intentionally requires the
    // full eight-form locale set. Exact duplicates remain blocked above.
    if (!verifiedLocale && getQuickBatchCollision(candidate, selected, { includeConstructionFamily: false })) return false
    const styleMaximum = relaxedStyleTargets
      ? hardStyleMaximum(candidate.style)
      : Math.min(styleTargets[candidate.style], hardStyleMaximum(candidate.style))
    if ((styleCounts.get(candidate.style) || 0) >= styleMaximum) return false
    if (
      requestedStyle === "auto"
      && candidate.evidence?.kind === "semantic_word"
      && semanticWordCount >= semanticWordLimit
    ) return false
    const zeroFit = (candidate.fitRoots?.length || 0) === 0 && !candidate.evidence && !verifiedLocale
    const zeroFitMaximum = requestedStyle === "auto"
      ? AUTO_ZERO_FIT_MAXIMUMS[candidate.style]
      : Number.POSITIVE_INFINITY
    if (zeroFit && (zeroFitCounts.get(candidate.style) || 0) >= zeroFitMaximum) return false
    const prefix = candidate.name.slice(0, 4)
    const suffix = candidate.name.slice(-4)
    const compoundSignature = getQuickCompoundSignature(candidate)
    const families = getQuickVisibleFamilies(candidate)
    if (compoundSignature && compoundSignatures.has(compoundSignature)) return false
    if (
      (!relaxedSoftCaps || enforcePrimaryFamilyDiversity)
      && !verifiedLocale
      && families.some((family) => (familyCounts.get(family) || 0) >= visibleFamilyLimit)
    ) return false
    if (!relaxedSoftCaps && ((prefixCount.get(prefix) || 0) >= 4 || (suffixCount.get(suffix) || 0) >= 4)) return false

    selected.push(candidate)
    selectedNames.add(candidate.name)
    styleCounts.set(candidate.style, (styleCounts.get(candidate.style) || 0) + 1)
    if (zeroFit) zeroFitCounts.set(candidate.style, (zeroFitCounts.get(candidate.style) || 0) + 1)
    if (candidate.evidence?.kind === "semantic_word") semanticWordCount += 1
    prefixCount.set(prefix, (prefixCount.get(prefix) || 0) + 1)
    suffixCount.set(suffix, (suffixCount.get(suffix) || 0) + 1)
    if (compoundSignature) compoundSignatures.add(compoundSignature)
    families.forEach((family) => familyCounts.set(family, (familyCounts.get(family) || 0) + 1))
    return true
  }

  const takeNext = (style: NameStyle, relaxedSoftCaps = false, predicate?: (candidate: QuickCandidate) => boolean): boolean => {
    // Keep walking after a rejected same-style candidate. A mirror, family or
    // prefix collision must not starve every later option in that style slot.
    for (const candidate of rankedCandidates) {
      if (candidate.style !== style || selectedNames.has(candidate.name)) continue
      if (predicate && !predicate(candidate)) continue
      if (add(candidate, relaxedSoftCaps)) return true
    }
    return false
  }

  // Release-audited canonical briefs retain their exact human-reviewed page.
  // Close paraphrases still use the same portfolio as a reserve, but first run
  // the shortlist, value-facet and dual-signal guarantees below.
  if (
    requestedStyle === "auto"
    && curatedPrimaryNames.length > 0
    && isCanonicalReviewedPortfolioBrief(description)
  ) {
    for (const rawName of curatedPrimaryNames) {
      const name = toLabel(rawName)
      const candidate = rankedCandidates.find((option) => option.name === name)
      if (candidate) add(candidate, false, true)
      if (selected.length >= count) return selected.slice(0, count)
    }
  }

  // Put two defensible decisions first without allowing them to escape their
  // construction quota. Prefer different styles when the pool can support it.
  const shortlistStyles = new Set<NameStyle>()
  for (const candidate of rankedCandidates) {
    if (!isQuickShortlistGrade(candidate, description) || shortlistStyles.has(candidate.style)) continue
    if (add(candidate)) shortlistStyles.add(candidate.style)
    if (selected.length >= Math.min(2, count)) break
  }
  if (selected.length < Math.min(2, count)) {
    for (const candidate of rankedCandidates) {
      if (!isQuickShortlistGrade(candidate, description)) continue
      add(candidate)
      if (selected.length >= Math.min(2, count)) break
    }
  }

  // A reviewed dominant value such as privacy-first must differentiate the
  // concrete product job on the page, not disappear behind sixteen category
  // words. Reserve a small intersection portfolio before ordinary style quotas.
  if (selectionValueFacet) {
    let intersectionCount = selected.filter(
      (candidate) => hasQuickValueFacetIntersection(candidate, description),
    ).length
    for (const candidate of rankedCandidates) {
      if (intersectionCount >= Math.min(selectionValueFacet.minimumAutoCandidates, count)) break
      if (!hasQuickValueFacetIntersection(candidate, description)) continue
      if (add(candidate, false, true)) intersectionCount += 1
    }
  }
  const reviewedCue = getStrictPrimaryConceptRule(description)?.cue
    || getConceptSignals(description)[0]?.cue
  const reviewedContextTarget = Math.min(
    reviewedCue === "rural telehealth reach"
      || reviewedCue === "Welsh farm-to-school trade"
      || reviewedCue === "locally guided conservation travel"
      ? 7
      : reviewedCue === "clear mortgage comparison"
        ? 6
        : enforcePrimaryFamilyDiversity ? 5 : 2,
    count,
  )
  let reviewedContextCount = selected.filter(
    (candidate) => isQuickReviewedContextCompound(candidate.name, description),
  ).length
  const reviewedContextNames = [
    ...(reviewedCue ? (REVIEWED_CONTEXT_COMPOUND_PAIRS[reviewedCue] || []) : []),
    ...(selectionValueFacet?.intersectionPairs || []),
  ].map(([left, right]) => `${toLabel(left)}${toLabel(right)}`)
  // Pair order is an editorial strength signal. Keep the best two ahead of
  // seed rotation whenever their length and safety gates allow them; tighter
  // briefs naturally skip them and continue through the shorter reviewed bank.
  const reviewedEditorialHeadCount = reviewedCue === "freelancer accounting" ? 4 : 2
  const reviewedContextOrder = [
    ...reviewedContextNames.slice(0, reviewedEditorialHeadCount),
    ...rotate(reviewedContextNames.slice(reviewedEditorialHeadCount), selectionSeed >>> 16),
  ]
  for (const reviewedName of reviewedContextOrder) {
    if (reviewedContextCount >= reviewedContextTarget) break
    const candidate = rankedCandidates.find((option) => option.name === reviewedName)
    if (!candidate) continue
    if (add(candidate, false, true)) reviewedContextCount += 1
  }

  // Exact high-risk supply cues have a human-reviewed, style-balanced spine.
  // Add it only after the value-facet and dual-signal guarantees above; an
  // exact-16 curated bank must not fill the page before those guarantees run.
  if (requestedStyle === "auto" && curatedPrimaryNames.length > 0) {
    for (const rawName of curatedPrimaryNames) {
      const name = toLabel(rawName)
      const candidate = rankedCandidates.find((option) => option.name === name)
      if (candidate) add(candidate, false, true)
      if (selected.length >= count) break
    }
  }

  // Locale-intent is a first-class product choice, not a decorative tail.
  // After the two-item quality lead, surface several exact reviewed forms
  // before returning to the mixed construction plan.
  const localePolicy = getQuickLocalePolicy(description)
  if (localePolicy && requestedStyle === "auto") {
    const earlyLocaleTarget = Math.min(localePolicy.minimumAutoCandidates, styleTargets.non_english, count)
    while ((styleCounts.get("non_english") || 0) < earlyLocaleTarget && selected.length < count) {
      if (!takeNext("non_english")) break
    }
  }

  const quotaOrder: NameStyle[] = []
  const remainingTargets = { ...styleTargets }
  for (const candidate of selected) remainingTargets[candidate.style] = Math.max(0, remainingTargets[candidate.style] - 1)
  for (const style of stylePriority) {
    if (remainingTargets[style] <= 0) continue
    quotaOrder.push(style)
    remainingTargets[style] -= 1
  }
  for (const style of NAME_STYLES) {
    while (remainingTargets[style] > 0) {
      quotaOrder.push(style)
      remainingTargets[style] -= 1
    }
  }

  for (const style of quotaOrder) {
    takeNext(style)
    if (selected.length >= count) return selected
  }

  // Prefix and family caps are presentation preferences. Retry quota slots
  // with those two caps relaxed, while keeping style ceilings, zero-fit limits,
  // mirror dedupe and every admission rule hard.
  if (selected.length < count) {
    for (const style of stylePriority) {
      while ((styleCounts.get(style) || 0) < styleTargets[style] && selected.length < count) {
        if (!takeNext(style, true)) break
      }
    }
  }
  if (selected.length < count) {
    for (const style of NAME_STYLES) {
      while ((styleCounts.get(style) || 0) < styleTargets[style] && selected.length < count) {
        if (!takeNext(style, true)) break
      }
    }
  }

  // Desired quotas should never become an accidental page-size ceiling when
  // a valid construction family is sparse. Complete the page under the hard
  // Auto caps only; semantic directions still rank ahead of joins, and the
  // compound/phrase ceilings remain C<=5 and P<=3 for sparse contexts, or
  // tighten to C<=4 and P<=2 when ten cue-owned semantic directions are ready.
  if (selected.length < count) {
    for (const candidate of rankedCandidates) {
      add(candidate, true, true)
      if (selected.length >= count) break
    }
  }

  // There is intentionally no unrestricted final fill: exact-16 is fulfilled
  // by real style supply and capacity-aware targets, never by silently turning
  // the page back into sixteen compounds.
  return selected
}

interface QuickCapacityCompletionContext {
  input: QuickGenerateInput
  contextualCandidates: readonly QuickCandidate[]
  count: number
  maxChars: number
  vibe: QuickGenerateVibe
  style: QuickGenerateStyle
  creativity: QuickGenerateCreativity
  seed: number
  primaryCue: string
}

/** Completes an otherwise safe but short deterministic batch from reviewed
 * capacity. This is deliberately post-selection: it cannot displace richer
 * contextual directions and it never relaxes admission, style honesty,
 * locale verification, blacklists or length. */
function completeQuickCapacity(
  selected: readonly QuickCandidate[],
  context: QuickCapacityCompletionContext,
): QuickCandidate[] {
  if (selected.length >= context.count) return selected.slice(0, context.count)

  const completed = [...selected]
  const names = new Set(completed.map((candidate) => candidate.name))
  const styleCounts = new Map<NameStyle, number>()
  let semanticWordCount = completed.filter(
    (candidate) => candidate.evidence?.kind === "semantic_word",
  ).length
  const semanticCue = getQuickPrimaryIntent(context.input.description)?.cue
  const semanticWordLimit = getQuickReviewedEditorialPortfolio(context.input.description)
    ? 10
    : semanticCue === "rural telehealth reach"
    ? 8
    : semanticCue === "circular textile renewal"
      ? 8
      : context.maxChars <= 6
      ? 12
      : context.maxChars <= 8
        ? 10
        : 8
  completed.forEach((candidate) => {
    styleCounts.set(candidate.style, (styleCounts.get(candidate.style) || 0) + 1)
  })
  const completionStyleMaximum = (candidateStyle: NameStyle): number => (
    context.style === "auto"
      ? (candidateStyle === "real_word" || candidateStyle === "evocative") && context.maxChars <= 6
        ? 6
        : candidateStyle === "short_phrase"
        ? 4
        : candidateStyle === "compound" && getQuickValueFacet(context.input.description)
          ? Math.max(6, AUTO_STYLE_MAXIMUMS[candidateStyle])
        : Math.max(AUTO_STYLE_MAXIMUMS[candidateStyle], SEMANTIC_FIRST_AUTO_STYLE_MAXIMUMS[candidateStyle])
      : Number.POSITIVE_INFINITY
  )
  const addExisting = (candidate: QuickCandidate) => {
    if (completed.length >= context.count || names.has(candidate.name) || hasUnnaturalQuickConstruction(candidate)) return
    if (context.style !== "auto" && candidate.style !== context.style) return
    if (
      context.style === "auto"
      && requiresExclusiveQuickPrimaryConceptEvidence(context.input.description)
      && !hasQuickPrimaryConceptEvidence(candidate, context.input.description)
    ) return
    if ((styleCounts.get(candidate.style) || 0) >= completionStyleMaximum(candidate.style)) return
    if (
      context.style === "auto"
      && candidate.evidence?.kind === "semantic_word"
      && semanticWordCount >= semanticWordLimit
    ) return
    names.add(candidate.name)
    completed.push(candidate)
    styleCounts.set(candidate.style, (styleCounts.get(candidate.style) || 0) + 1)
    if (candidate.evidence?.kind === "semantic_word") semanticWordCount += 1
  }
  const add = (
    rawName: string,
    candidateStyle: NameStyle,
    sourceRoots: readonly string[] = [],
    reviewedWholeWord = false,
    evidence?: QuickCandidateEvidence,
  ) => {
    if (completed.length >= context.count) return
    const candidate = createQuickCandidateFromName(rawName, {
      description: context.input.description,
      rhymeWith: context.input.rhymeWith,
      vibe: context.vibe,
      style: candidateStyle,
      requestedStyle: context.style,
      creativity: context.creativity,
      maxChars: context.maxChars,
      sourceRoots,
      blacklist: [
        ...(context.input.blacklist || []),
        ...(context.input.preferences?.avoidedSounds || []),
      ],
      reviewedWholeWord,
      evidence,
      conceptCueOverride: context.primaryCue,
    })
    if (!candidate) return
    addExisting(candidate)
  }

  // Selection caps preserve variety, but a sparse construction family should
  // not make a niche-owned semantic direction lose its place to a global
  // reserve word. Exhaust the reviewed primary-cue vocabulary first.
  context.contextualCandidates
    .filter((candidate) => candidate.evidence?.kind === "semantic_word" && candidate.evidence.cue === context.primaryCue)
    .forEach(addExisting)

  // Prefer another locally grounded construction over a cross-niche reserve
  // word. The selector may have skipped it only because of a soft family or
  // quota preference; collision checks remain hard here.
  context.contextualCandidates
    .filter((candidate) => (
      candidate.evidence?.kind !== "semantic_word"
      && (
        (candidate.fitRoots?.length || 0) > 0
        || candidate.evidence
        || candidate.constructionParts?.length
      )
    ))
    .forEach(addExisting)

  if (context.style === "auto" || context.style === "real_word" || context.style === "evocative") {
    let genericReserveAdded = 0
    const genericReserveLimit = context.style === "auto"
      && context.maxChars > 6
      && context.count > 8
      && requiresQuickPrimaryConceptEvidence(context.input.description)
      ? 0
      : context.count
    rotate(REVIEWED_COMPACT_WHOLE_WORDS, context.seed >>> 11).forEach((word, index) => {
      if (context.style === "auto" && genericReserveAdded >= genericReserveLimit) return
      const before = completed.length
      const candidateStyle = context.style === "auto"
        ? (index % 2 === 0 ? "real_word" : "evocative")
        : context.style
      // These are pronunciation-safe capacity reserves, not cue-owned
      // semantics. Attaching the current cue here falsely turned generic
      // words such as "velvet" into privacy or compliance evidence.
      add(word, candidateStyle, [], true)
      if (completed.length > before) genericReserveAdded += 1
    })
  } else if (context.style === "compound") {
    rotate(REVIEWED_COMPACT_COMPOUND_PAIRS, context.seed >>> 11).forEach(([left, right]) => {
      add(`${left}${right}`, "compound", [left, right], true)
    })
  } else if (context.style === "short_phrase") {
    rotate(REVIEWED_COMPACT_PHRASE_PAIRS, context.seed >>> 11).forEach(([left, right]) => {
      add(`${left}${right}`, "short_phrase", [left, right], true)
    })
  } else if (context.style === "brandable") {
    rotate(REVIEWED_COMPACT_FUSION_PAIRS, context.seed >>> 11).forEach(([left, right]) => {
      const fusion = buildReviewedContextFusion(left, right)
      if (fusion) add(fusion.name, "brandable", [], false, fusion.evidence)
    })
  } else if (context.style === "alternate_spelling") {
    rotate(REVIEWED_COMPACT_ALTERNATE_SOURCES, context.seed >>> 11).forEach((source) => {
      buildPronounceableAlternateSpellings(source).forEach((alternate) => {
        add(alternate.name, "alternate_spelling", [source], false, {
          kind: "reviewed_spelling",
          source,
          rule: alternate.rule,
        })
      })
    })
  } else if (context.style === "non_english") {
    const localePolicy = getQuickLocalePolicy(context.input.description)
    rotate(localePolicy?.forms || [], context.seed >>> 11).forEach((form) => {
      add(form, "non_english", localePolicy?.roots || [], true)
    })
  }

  if (context.style === "auto" && completed.length < context.count) {
    rotate(REVIEWED_COMPACT_COMPOUND_PAIRS, context.seed >>> 12).forEach(([left, right]) => {
      add(`${left}${right}`, "compound", [left, right], true)
    })
    rotate(REVIEWED_COMPACT_PHRASE_PAIRS, context.seed >>> 13).forEach(([left, right]) => {
      add(`${left}${right}`, "short_phrase", [left, right], true)
    })
    rotate(REVIEWED_COMPACT_FUSION_PAIRS, context.seed >>> 14).forEach(([left, right]) => {
      const fusion = buildReviewedContextFusion(left, right)
      if (fusion) add(fusion.name, "brandable", [], false, fusion.evidence)
    })
  }

  return completed.slice(0, context.count)
}

export interface QuickEditorialWorkshop {
  candidates: QuickCandidate[]
  editorialPool: QuickCandidate[]
}

function buildQuickEditorialWorkshop(input: QuickGenerateInput): QuickEditorialWorkshop {
  const briefSafety = getQuickBriefSafety(input.description)
  input = {
    ...input,
    description: briefSafety.description,
    blacklist: [...(input.blacklist || []), ...briefSafety.prohibitedTerms],
  }
  const preferredMax = input.preferences?.preferredLength === "short"
    ? 8
    : input.preferences?.preferredLength === "long"
      ? 15
      : 10
  const maxChars = clampNumber(input.maxChars, preferredMax, MIN_MAX_CHARS, MAX_MAX_CHARS)
  const count = clampNumber(input.count, DEFAULT_COUNT, 1, MAX_RESULTS)
  const vibe = QUICK_GENERATE_VIBES.includes(input.vibe as QuickGenerateVibe) ? (input.vibe as QuickGenerateVibe) : "friendly"
  const style = normaliseStyle(input.style)
  const creativity = normaliseCreativity(input.creativity)
  const text = normaliseText(input.description)
  const signals = getConceptSignals(input.description)
  const supplyContext = QUICK_SUPPLY_CONTEXT_RULES.find((rule) => rule.test.test(text))
  const primaryCue = supplyContext?.cue || signals[0]?.cue || "the brief's central idea"
  const seed = hashSeed(input.seed || `${input.description}|${input.rhymeWith || ""}|${vibe}|${style}|${creativity}|${maxChars}`)
  const roots = rotate(Array.from(new Set([
    ...(supplyContext?.roots || []),
    ...signals.map((signal) => signal.root),
  ])), seed)
  // Anchor order is editorial evidence: rotating it created unnatural reverse
  // compounds (route+cold, table+campus). Seed variation belongs in roots and
  // companions, not in the grammatical order of a curated phrase family.
  const briefAnchors = getBriefAnchors(input.description)
  const contextualCompanions = rotate(
    Array.from(new Set(signals.flatMap((signal) => CUE_COMPANIONS[signal.cue] || []))),
    seed >>> 4,
  )
  const preferredSounds = (input.preferences?.preferredSounds || []).map(toLabel).filter((sound) => sound.length >= 2 && sound.length <= 8)
  const companions = Array.from(new Set([
    ...preferredSounds,
    ...contextualCompanions,
    ...rotate(VIBE_COMPANIONS[vibe], seed >>> 8),
  ]))
  const blacklist = [...(input.blacklist || []), ...(input.preferences?.avoidedSounds || [])]
  const candidates = new Map<string, QuickCandidate>()
  let standardPoolCount = 0
  // Explicit construction controls may have a much smaller matching subset
  // than Auto's mixed pool. Build enough semantic options to select honestly
  // without relabelling another construction family as the requested style.
  const maxPoolSize = style === "auto" ? Math.max(96, count * 10) : Math.max(192, count * 12)

  const add = (
    rawName: string | null,
    sourceRoots: readonly string[] = [],
    candidateStyle?: NameStyle,
    reserve = false,
    reviewedWholeWord = false,
    evidence?: QuickCandidateEvidence,
  ) => {
    if (!reserve && standardPoolCount >= maxPoolSize) return
    if (!rawName) return
    const normalisedName = toLabel(rawName)
    if (!normalisedName || normalisedName.length > maxChars || candidates.has(normalisedName)) return
    if (
      !reviewedWholeWord
      && !evidence
      && CONTEXTUAL_SEMANTIC_WORD_SET.has(normalisedName)
    ) return
    const candidate = createQuickCandidateFromName(normalisedName, {
      description: input.description,
      rhymeWith: input.rhymeWith,
      vibe,
      // Construction labels describe what was actually produced. Requested
      // style remains an input preference, not a licence to relabel a compound
      // or dictionary word as an alternate spelling.
      style: candidateStyle,
      requestedStyle: style,
      creativity,
      maxChars,
      sourceRoots,
      blacklist,
      reviewedWholeWord,
      evidence,
      conceptCueOverride: primaryCue,
    })
    if (candidate && !candidates.has(candidate.name)) {
      candidates.set(candidate.name, candidate)
      if (!reserve) standardPoolCount += 1
    }
  }

  const editorialPriorityNames: string[] = []

  // Build honest non-compound supply before the large A+B pool. Reviewed
  // single words keep their actual morphology, while overlap fusions are
  // admitted as Brandable only when both complete source words share a seam.
  const literalBriefTerms = getLiteralBriefTerms(input.description)
  const phraseHeads = Array.from(new Set([...briefAnchors, ...roots]))
    .filter((word) => word.length >= 3 && word.length <= Math.max(3, maxChars - 4) && !UNSUITABLE_PHRASE_HEADS.has(word))
  const phraseLeads = rotate(CONTEXTUAL_PHRASE_LEADS[primaryCue] || VIBE_PHRASE_LEADS[vibe], seed >>> 9)
  for (const head of phraseHeads) {
    for (const lead of phraseLeads) add(safeJoin(lead, head), roots, "short_phrase", true)
  }
  for (const [left, right] of REVIEWED_CONTEXT_PHRASE_PAIRS[primaryCue] || []) {
    const reviewedPhrase = `${toLabel(left)}${toLabel(right)}`
    if (!reviewedPhrase) continue
    editorialPriorityNames.push(reviewedPhrase)
    add(reviewedPhrase, [left, right], "short_phrase", true)
  }

  const localeRoots = new Set((getQuickLocalePolicy(input.description)?.roots || []).map(toLabel))
  const wholeWordDirections = Array.from(new Set([
    ...getContextualSemanticWords(primaryCue, input.description, vibe, seed),
  ].map(toLabel))).filter((word) => (
    word.length >= Math.max(QUICK_MIN_NAME_LENGTH, 5)
    && word.length <= maxChars
    && !literalBriefTerms.has(word)
    && !roots.includes(word)
    && !localeRoots.has(word)
  ))
  wholeWordDirections.forEach((word, index) => {
    const semanticStyle = style === "real_word" || style === "evocative"
      ? style
      : index % 2 === 0 ? "real_word" : "evocative"
    add(word, roots, semanticStyle, true, true, {
      kind: "semantic_word",
      cue: primaryCue,
      source: word,
    })
  })

  const reviewedContextPairs = [
    ...(REVIEWED_CONTEXT_COMPOUND_PAIRS[primaryCue] || []),
    ...(getQuickValueFacet(input.description)?.intersectionPairs || []),
  ]
  for (const [left, right] of reviewedContextPairs) {
    const reviewedCompound = safeJoin(left, right)
    if (!reviewedCompound) continue
    editorialPriorityNames.push(reviewedCompound)
    add(reviewedCompound, [left, right], "compound", true)
  }

  for (const source of Array.from(new Set([...briefAnchors, ...wholeWordDirections]))) {
    for (const alternate of buildPronounceableAlternateSpellings(source)) {
      add(alternate.name, [source], "alternate_spelling", true, false, {
        kind: "reviewed_spelling",
        source,
        rule: alternate.rule,
      })
    }
  }

  for (const [left, right] of REVIEWED_CONTEXT_FUSION_PAIRS[primaryCue] || []) {
    const reviewedFusion = buildReviewedContextFusion(left, right)
    if (reviewedFusion) add(reviewedFusion.name, roots, "brandable", true, false, reviewedFusion.evidence)
  }

  const fusionSources = Array.from(new Set([...briefAnchors, ...roots]))
  const fusionDestinations = Array.from(new Set([
    ...contextualCompanions,
    ...wholeWordDirections,
  ]))
  if (style === "brandable") {
    const fusionDrafts = [
      ...buildOverlapFusions(fusionSources, fusionDestinations),
      ...buildOverlapFusions(fusionDestinations, fusionSources),
    ]
    for (const fusion of fusionDrafts) {
      add(fusion.name, roots, "brandable", true, false, fusion.evidence)
    }
  }

  const localePolicy = getQuickLocalePolicy(input.description)
  const localeForms = localePolicy?.code === "cy" && /\b(?:farm|school|marketplace)\b/.test(text)
    ? localePolicy.forms.filter((form) => !["anturcymru", "naturcymru"].includes(form))
    : localePolicy?.forms || []
  for (const localeName of localeForms) {
    add(localeName, localePolicy?.roots || [], "non_english", true, true)
  }

  if (/\b(cyber(?:security)?|security)\b/.test(text) && /\b(analytics|data|threat|detection)\b/.test(text)) {
    const priorities = vibe === "clean"
      ? ["cybercare", "detectlab", "threatlab", "datathreat", "guardflow", "signalpath"]
      : ["cybermax", "cyberdata", "dataworks", "detectmax", "datathreat", "bravecyber"]
    priorities.forEach((name) => {
      editorialPriorityNames.push(name)
      add(name, ["cyber", "data", "detect", "threat", "guard", "signal"])
    })
  }

  if (/\bcontract\b/.test(text) && roots.includes("clause") && roots.includes("brief")) {
    add("clausebrief", ["clause", "brief"])
    add("briefclause", ["brief", "clause"])
  }

  const rhymeEndings = getRhymeEndings(input.rhymeWith)

  // Lead the deterministic batch with brief-bound compounds. Every anchor is
  // a readable semantic/surface cue, while sourceRoots preserve the verified
  // category provenance used by rationales and audits. This keeps offline
  // batches reproducible without recycling the same generic names across
  // unrelated briefs.
  for (let index = 0; index < briefAnchors.length; index += 1) {
    const anchor = briefAnchors[index]
    const nextAnchor = briefAnchors[index + 1]
    // A bare anchor is only surfaced when it already passed the reviewed whole
    // word path above. The ordinary Auto pool starts from distinctive joins.
    if (nextAnchor && nextAnchor !== anchor) {
      add(safeJoin(anchor, nextAnchor), roots, "compound")
    }
    // Familiar sound-preserving substitutions create a true Alternate
    // Spelling family without vowel deletion, arbitrary suffixes or shared
    // cross-category defaults. Each variant remains tied to this brief anchor.
    for (const alternate of buildPronounceableAlternateSpellings(anchor)) {
      add(alternate.name, roots, "alternate_spelling", false, false, {
        kind: "reviewed_spelling",
        source: anchor,
        rule: alternate.rule,
      })
    }
    for (const companion of companions.slice(0, 8)) {
      add(safeJoin(anchor, companion), roots, deterministicJoinStyle(companion, false))
      if (NATURAL_PREFIX_COMPANIONS.has(companion)) {
        add(safeJoin(companion, anchor), roots, deterministicJoinStyle(companion, true))
      }
    }
    for (const root of roots) {
      add(safeJoin(anchor, root), [root], "compound")
      add(safeJoin(root, anchor), [root], "compound")
    }
  }

  for (const companion of companions) {
    for (const root of roots) add(safeJoin(root, companion), [root])
  }

  for (let leftIndex = 0; leftIndex < roots.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < roots.length; rightIndex += 1) {
      add(safeJoin(roots[leftIndex], roots[rightIndex]), [roots[leftIndex], roots[rightIndex]])
      add(safeJoin(roots[rightIndex], roots[leftIndex]), [roots[rightIndex], roots[leftIndex]])
    }
  }

  for (const root of roots) {
    for (const companion of companions) {
      if (NATURAL_PREFIX_COMPANIONS.has(companion)) add(safeJoin(companion, root), [root])
    }
  }

  const pool = Array.from(candidates.values()).filter((candidate) => !hasUnnaturalQuickConstruction(candidate))
  const styleHonestPool = style === "auto" ? pool : pool.filter((candidate) => candidate.style === style)
  const styleCapacity = NAME_STYLES.reduce<Partial<Record<NameStyle, number>>>((result, candidateStyle) => {
    result[candidateStyle] = styleHonestPool.filter((candidate) => candidate.style === candidateStyle).length
    return result
  }, {})
  const styleTargets = buildQuickStyleTargets({ ...input, description: input.description }, count, styleCapacity)
  const selected = selectDiverse(
    styleHonestPool,
    count,
    styleTargets,
    buildQuickStylePlan(input, count),
    [...briefAnchors, ...rhymeEndings, ...editorialPriorityNames],
    seed,
    input.description,
    style,
    getQuickReviewedEditorialPortfolio(input.description)?.primary || [],
  )
  const completed = completeQuickCapacity(selected, {
    input,
    contextualCandidates: styleHonestPool,
    count,
    maxChars,
    vibe,
    style,
    creativity,
    seed,
    primaryCue,
  })
  let finalCandidates = completed
  if (style === "auto") {
    const localeCandidates = completed.filter(
      (candidate) => candidate.style === "non_english"
        && isVerifiedQuickLocaleCandidate(candidate.name, input.description),
    )
    if (localeCandidates.length > 0) {
      const localeNames = new Set(localeCandidates.map((candidate) => candidate.name))
      finalCandidates = [
        ...localeCandidates,
        ...completed.filter((candidate) => !localeNames.has(candidate.name)),
      ]
    }
  }

  return {
    candidates: finalCandidates,
    // The public deterministic page is only one selection from this already
    // admitted supply. Auto editorial review can choose from the larger pool
    // without rebuilding the same morphology graph under several seed phases.
    editorialPool: styleHonestPool,
  }
}

export function generateQuickEditorialWorkshop(input: QuickGenerateInput): QuickEditorialWorkshop {
  return buildQuickEditorialWorkshop(input)
}

export function generateQuickCandidates(input: QuickGenerateInput): QuickCandidate[] {
  return buildQuickEditorialWorkshop(input).candidates
}

/** Keeps a displayed batch focused on its strongest detected concept instead
 * of padding it with secondary cues from the same brief. */
export function selectPrimaryQuickCandidates(
  candidates: readonly QuickCandidate[],
  count: number,
  minimumPrimary = 6,
): QuickCandidate[] {
  const limit = Math.max(1, Math.floor(count))
  const primaryCue = candidates.find((candidate) => candidate.fitCues?.length)?.fitCues?.[0]
  if (!primaryCue) return candidates.slice(0, limit)

  const primary = candidates.filter((candidate) => candidate.fitCues?.includes(primaryCue))
  if (primary.length >= Math.min(minimumPrimary, limit)) return primary.slice(0, limit)

  const primaryNames = new Set(primary.map((candidate) => candidate.name))
  return [...primary, ...candidates.filter((candidate) => !primaryNames.has(candidate.name))].slice(0, limit)
}
