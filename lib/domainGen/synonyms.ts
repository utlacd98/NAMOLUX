import type { NameStyleMode } from "@/lib/domainGen/types"

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Health & Wellness",
  "Finance",
  "E-commerce",
  "Education",
  "Creative",
  "Real Estate",
  "Food & Beverage",
  "Fashion & Beauty",
  "Travel & Tourism",
  "Sports & Fitness",
  "Entertainment & Media",
  "Consulting & Services",
  "Marketing & Advertising",
  "Legal & Professional",
  "Automotive",
  "Home & Garden",
  "Pet Care",
  "Gaming & Esports",
  "Sustainability & Green Tech",
  "AI & Machine Learning",
  "Blockchain & Crypto",
  "SaaS & Software",
  "Manufacturing",
  "Nonprofit & Social Impact",
  "Other",
] as const

export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number]

export interface IndustryLexicon {
  roots: string[]
  verbs: string[]
  modifiers: string[]
  prefixes: string[]
  suffixes: string[]
  offTopicRoots: string[]
}

export const GENERIC_TERMS = {
  roots: [
    "studio",
    "group",
    "collective",
    "works",
    "house",
    "partners",
    "service",
    "network",
    "co",
    "club",
  ],
  verbs: ["build", "shape", "launch", "create", "grow", "guide", "boost", "support"],
  modifiers: ["modern", "trusted", "clear", "bold", "focused", "smart", "steady", "fresh"],
  prefixes: ["my", "get", "go", "join", "prime", "bright"],
  suffixes: ["labs", "group", "works", "collective", "partners", "studio"],
}

const RAW_LEXICONS: Record<IndustryOption, IndustryLexicon> = {
  Technology: {
    roots: ["tech", "stack", "cloud", "logic", "compute", "data", "signal", "byte", "grid", "system"],
    verbs: ["build", "deploy", "optimise", "connect", "automate", "integrate", "ship", "scale"],
    modifiers: ["digital", "scalable", "adaptive", "robust", "fast", "modular", "connected", "secure"],
    prefixes: ["hyper", "neo", "meta", "sync", "auto", "infra"],
    suffixes: ["stack", "forge", "labs", "cloud", "works", "core"],
    offTopicRoots: ["bakery", "pet", "estate", "yoga"],
  },
  "Health & Wellness": {
    roots: ["health", "well", "vital", "care", "pulse", "balance", "fit", "mind", "restore", "nourish"],
    verbs: ["heal", "support", "restore", "nourish", "coach", "strengthen", "guide", "refresh"],
    modifiers: ["holistic", "calm", "healthy", "natural", "balanced", "gentle", "active", "clean"],
    prefixes: ["vita", "pure", "calm", "zen", "my", "well"],
    suffixes: ["health", "care", "wellness", "clinic", "studio", "fit"],
    offTopicRoots: ["chain", "crypto", "ledger", "garage"],
  },
  Finance: {
    roots: ["fund", "wealth", "capital", "ledger", "vault", "asset", "yield", "credit", "fiscal", "equity"],
    verbs: ["invest", "protect", "save", "grow", "budget", "forecast", "trade", "manage"],
    modifiers: ["secure", "trusted", "stable", "prudent", "strategic", "measured", "transparent", "compliant"],
    prefixes: ["fin", "asset", "safe", "vault", "prime", "wise"],
    suffixes: ["capital", "wealth", "fund", "ledger", "advisory", "partners"],
    offTopicRoots: ["yoga", "bakery", "runway", "garden"],
  },
  "E-commerce": {
    roots: ["shop", "store", "cart", "market", "checkout", "retail", "merchant", "basket", "order", "catalogue"],
    verbs: ["sell", "list", "ship", "convert", "deliver", "bundle", "stock", "promote"],
    modifiers: ["seamless", "fast", "direct", "scalable", "curated", "modern", "responsive", "reliable"],
    prefixes: ["shop", "cart", "quick", "buy", "my", "go"],
    suffixes: ["store", "market", "cart", "checkout", "shop", "retail"],
    offTopicRoots: ["clinic", "estate", "litigation", "carbon"],
  },
  Education: {
    roots: ["learn", "study", "class", "course", "academy", "skill", "mentor", "lesson", "campus", "tutor"],
    verbs: ["teach", "learn", "train", "mentor", "guide", "prepare", "practice", "explain"],
    modifiers: ["clear", "engaging", "inclusive", "structured", "practical", "guided", "flexible", "thoughtful"],
    prefixes: ["edu", "learn", "skill", "study", "bright", "future"],
    suffixes: ["academy", "learning", "class", "campus", "school", "tutor"],
    offTopicRoots: ["token", "garage", "runway", "restaurant"],
  },
  Creative: {
    roots: ["studio", "design", "craft", "canvas", "story", "brand", "palette", "frame", "art", "brief"],
    verbs: ["create", "design", "craft", "shape", "compose", "edit", "brand", "curate"],
    modifiers: ["bold", "vivid", "playful", "stylish", "expressive", "distinct", "inventive", "fresh"],
    prefixes: ["art", "brand", "design", "craft", "pixel", "story"],
    suffixes: ["studio", "creative", "works", "collective", "design", "lab"],
    offTopicRoots: ["mortgage", "blockchain", "warehouse", "pharma"],
  },
  "Real Estate": {
    roots: ["estate", "property", "home", "lease", "broker", "listing", "plot", "residence", "rental", "housing"],
    verbs: ["list", "buy", "sell", "lease", "invest", "manage", "market", "close"],
    modifiers: ["local", "prime", "trusted", "verified", "residential", "commercial", "secure", "professional"],
    prefixes: ["home", "estate", "prop", "local", "prime", "urban"],
    suffixes: ["realty", "estate", "homes", "property", "group", "advisory"],
    offTopicRoots: ["token", "esports", "bakery", "clinic"],
  },
  "Food & Beverage": {
    roots: ["kitchen", "flavour", "taste", "brew", "bistro", "bakery", "cafe", "plate", "sip", "pantry"],
    verbs: ["cook", "serve", "bake", "brew", "taste", "roast", "blend", "plate"],
    modifiers: ["fresh", "artisan", "seasonal", "local", "crafted", "balanced", "wholesome", "premium"],
    prefixes: ["fresh", "chef", "taste", "daily", "urban", "farm"],
    suffixes: ["kitchen", "bakery", "bistro", "cafe", "foods", "brew"],
    offTopicRoots: ["ledger", "legal", "cloud", "robot"],
  },
  "Fashion & Beauty": {
    roots: ["style", "beauty", "glow", "skin", "couture", "salon", "trend", "wardrobe", "chic", "makeup"],
    verbs: ["style", "polish", "refine", "dress", "glow", "nourish", "define", "curate"],
    modifiers: ["elegant", "radiant", "chic", "timeless", "luxe", "polished", "vibrant", "premium"],
    prefixes: ["style", "glow", "pure", "luxe", "chic", "moda"],
    suffixes: ["beauty", "style", "boutique", "salon", "couture", "skin"],
    offTopicRoots: ["protocol", "factory", "ledger", "fleet"],
  },
  "Travel & Tourism": {
    roots: ["travel", "tour", "voyage", "journey", "stay", "escape", "route", "trip", "destination", "guide"],
    verbs: ["explore", "book", "travel", "plan", "discover", "tour", "host", "reserve"],
    modifiers: ["scenic", "global", "curated", "relaxed", "adventurous", "authentic", "seamless", "local"],
    prefixes: ["trip", "tour", "go", "easy", "wander", "roam"],
    suffixes: ["travel", "tours", "journeys", "stays", "guide", "voyage"],
    offTopicRoots: ["defi", "factory", "laws", "clinic"],
  },
  "Sports & Fitness": {
    roots: ["sport", "fitness", "athlete", "train", "coach", "strength", "endurance", "active", "gym", "recovery"],
    verbs: ["train", "compete", "improve", "recover", "lift", "run", "coach", "perform"],
    modifiers: ["active", "strong", "fast", "resilient", "focused", "elite", "dynamic", "balanced"],
    prefixes: ["fit", "sport", "pro", "active", "peak", "run"],
    suffixes: ["fitness", "training", "athletics", "club", "coach", "gym"],
    offTopicRoots: ["ledger", "compliance", "rdap", "property"],
  },
  "Entertainment & Media": {
    roots: ["media", "studio", "show", "stream", "podcast", "stage", "audience", "content", "cinema", "series"],
    verbs: ["produce", "stream", "broadcast", "perform", "publish", "record", "host", "edit"],
    modifiers: ["engaging", "cinematic", "live", "immersive", "vibrant", "captivating", "dynamic", "bold"],
    prefixes: ["show", "stream", "media", "cast", "live", "story"],
    suffixes: ["media", "studio", "channel", "stream", "shows", "podcast"],
    offTopicRoots: ["mortgage", "clinic", "warehouse", "token"],
  },
  "Consulting & Services": {
    roots: ["consult", "advisory", "service", "strategy", "solutions", "practice", "operations", "support", "insight", "partner"],
    verbs: ["advise", "guide", "improve", "plan", "solve", "deliver", "support", "audit"],
    modifiers: ["professional", "trusted", "strategic", "reliable", "practical", "efficient", "clear", "experienced"],
    prefixes: ["pro", "smart", "prime", "clear", "trusted", "expert"],
    suffixes: ["advisory", "consulting", "partners", "services", "group", "solutions"],
    offTopicRoots: ["esports", "cosmetic", "bakery", "token"],
  },
  "Marketing & Advertising": {
    roots: ["market", "brand", "campaign", "audience", "growth", "reach", "media", "content", "funnel", "ads"],
    verbs: ["promote", "advertise", "convert", "optimise", "target", "amplify", "engage", "scale"],
    modifiers: ["targeted", "creative", "measurable", "strategic", "agile", "relevant", "effective", "bold"],
    prefixes: ["growth", "brand", "ad", "market", "reach", "funnel"],
    suffixes: ["marketing", "media", "growth", "ads", "agency", "studio"],
    offTopicRoots: ["shelter", "clinic", "concrete", "token"],
  },
  "Legal & Professional": {
    roots: ["legal", "law", "counsel", "brief", "compliance", "contract", "rights", "governance", "advocate", "chambers"],
    verbs: ["advise", "represent", "draft", "review", "protect", "mediate", "resolve", "defend"],
    modifiers: ["compliant", "ethical", "trusted", "precise", "professional", "secure", "reliable", "confidential"],
    prefixes: ["legal", "law", "counsel", "trust", "secure", "clear"],
    suffixes: ["legal", "law", "counsel", "advisory", "chambers", "partners"],
    offTopicRoots: ["esports", "bakery", "retail", "carbon"],
  },
  Automotive: {
    roots: ["auto", "motor", "drive", "fleet", "garage", "engine", "road", "mobility", "tyre", "workshop"],
    verbs: ["drive", "repair", "service", "maintain", "tune", "inspect", "transport", "accelerate"],
    modifiers: ["reliable", "durable", "safe", "fast", "precision", "modern", "responsive", "clean"],
    prefixes: ["auto", "drive", "road", "gear", "fleet", "swift"],
    suffixes: ["motors", "garage", "drive", "auto", "fleet", "mobility"],
    offTopicRoots: ["mindful", "crypto", "classroom", "estate"],
  },
  "Home & Garden": {
    roots: ["home", "garden", "decor", "living", "landscape", "renovate", "outdoor", "plants", "patio", "interior"],
    verbs: ["decorate", "renovate", "plant", "grow", "organise", "refresh", "design", "maintain"],
    modifiers: ["cosy", "inviting", "fresh", "practical", "warm", "stylish", "natural", "comfortable"],
    prefixes: ["home", "garden", "green", "cozy", "urban", "nest"],
    suffixes: ["home", "garden", "living", "interiors", "landscape", "design"],
    offTopicRoots: ["token", "court", "esports", "ledger"],
  },
  "Pet Care": {
    roots: ["pet", "paw", "vet", "groom", "care", "companion", "animal", "shelter", "rescue", "treat"],
    verbs: ["care", "groom", "train", "feed", "protect", "rescue", "comfort", "nurture"],
    modifiers: ["gentle", "loving", "safe", "friendly", "caring", "happy", "trusted", "warm"],
    prefixes: ["pet", "paw", "happy", "care", "vet", "tail"],
    suffixes: ["pet", "paws", "care", "clinic", "groom", "vet"],
    offTopicRoots: ["defi", "estate", "ads", "factory"],
  },
  "Gaming & Esports": {
    roots: ["game", "esports", "arena", "guild", "squad", "quest", "lobby", "rank", "pixel", "tournament"],
    verbs: ["play", "compete", "stream", "rank", "battle", "queue", "coach", "score"],
    modifiers: ["competitive", "epic", "fast", "sharp", "immersive", "legendary", "dynamic", "pro"],
    prefixes: ["game", "esport", "pro", "play", "quest", "rank"],
    suffixes: ["gaming", "arena", "guild", "esports", "play", "quest"],
    offTopicRoots: ["mortgage", "clinic", "compliance", "farm"],
  },
  "Sustainability & Green Tech": {
    roots: ["green", "climate", "solar", "wind", "carbon", "renew", "recycle", "earth", "eco", "efficiency"],
    verbs: ["reduce", "reuse", "recycle", "offset", "preserve", "clean", "renew", "protect"],
    modifiers: ["sustainable", "clean", "responsible", "renewable", "ethical", "circular", "resilient", "efficient"],
    prefixes: ["eco", "green", "renew", "clean", "climate", "earth"],
    suffixes: ["green", "eco", "climate", "energy", "renew", "impact"],
    offTopicRoots: ["betting", "lawsuit", "makeup", "esports"],
  },
  "AI & Machine Learning": {
    roots: ["ai", "model", "neural", "agent", "vector", "inference", "predict", "vision", "language", "training"],
    verbs: ["predict", "learn", "classify", "detect", "train", "infer", "optimise", "score"],
    modifiers: ["intelligent", "adaptive", "autonomous", "accurate", "realtime", "scalable", "efficient", "contextual"],
    prefixes: ["ai", "neuro", "auto", "smart", "model", "agent"],
    suffixes: ["ai", "labs", "model", "agent", "vector", "neural"],
    offTopicRoots: ["bakery", "law", "estate", "salon"],
  },
  "Blockchain & Crypto": {
    roots: ["chain", "crypto", "token", "ledger", "wallet", "node", "defi", "exchange", "staking", "vault"],
    verbs: ["trade", "stake", "mint", "swap", "secure", "verify", "bridge", "govern"],
    modifiers: ["decentralised", "secure", "transparent", "onchain", "audited", "composable", "resilient", "open"],
    prefixes: ["chain", "crypto", "defi", "block", "token", "vault"],
    suffixes: ["chain", "crypto", "token", "wallet", "node", "defi"],
    offTopicRoots: ["garden", "fit", "salon", "cafe"],
  },
  "SaaS & Software": {
    roots: ["saas", "software", "app", "suite", "platform", "workflow", "dashboard", "portal", "automation", "module"],
    verbs: ["automate", "manage", "track", "configure", "deploy", "monitor", "report", "streamline"],
    modifiers: ["cloud", "scalable", "secure", "modular", "efficient", "reliable", "intuitive", "collaborative"],
    prefixes: ["app", "saas", "sync", "flow", "smart", "cloud"],
    suffixes: ["app", "suite", "cloud", "software", "platform", "ops"],
    offTopicRoots: ["pet", "runway", "kitchen", "estate"],
  },
  Manufacturing: {
    roots: ["factory", "manufacture", "assembly", "supply", "plant", "quality", "tooling", "materials", "logistics", "operations"],
    verbs: ["manufacture", "assemble", "fabricate", "inspect", "ship", "source", "automate", "maintain"],
    modifiers: ["industrial", "efficient", "precision", "durable", "lean", "robust", "safe", "consistent"],
    prefixes: ["pro", "forge", "build", "factory", "steel", "prime"],
    suffixes: ["manufacturing", "factory", "supply", "industrial", "works", "logistics"],
    offTopicRoots: ["beauty", "wellness", "tour", "legal"],
  },
  "Nonprofit & Social Impact": {
    roots: ["impact", "charity", "community", "mission", "cause", "outreach", "equity", "foundation", "giving", "advocacy"],
    verbs: ["support", "empower", "uplift", "serve", "educate", "mobilise", "mentor", "fundraise"],
    modifiers: ["social", "ethical", "inclusive", "compassionate", "purposeful", "transparent", "trusted", "equitable"],
    prefixes: ["impact", "care", "community", "mission", "social", "give"],
    suffixes: ["impact", "foundation", "community", "charity", "collective", "initiative"],
    offTopicRoots: ["casino", "token", "garage", "couture"],
  },
  Other: {
    roots: ["venture", "startup", "brand", "project", "service", "idea", "group", "studio", "network", "collective"],
    verbs: ["build", "launch", "create", "grow", "shape", "support", "deliver", "connect"],
    modifiers: ["modern", "agile", "reliable", "clear", "bold", "focused", "fresh", "balanced"],
    prefixes: ["my", "go", "prime", "bright", "nova", "base"],
    suffixes: ["works", "studio", "group", "collective", "partners", "co"],
    offTopicRoots: ["casino", "medical", "attorney", "cryptic"],
  },
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "get",
  "go",
  "in",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "try",
  "up",
  "we",
  "with",
  "your",
])

const LIGHTWEIGHT_THESAURUS: Record<string, string[]> = {
  fit: ["active", "athlete", "training", "well", "health"],
  health: ["wellness", "vital", "care", "fit", "mind"],
  ai: ["model", "agent", "neural", "predict", "smart"],
  travel: ["trip", "tour", "voyage", "journey", "stay"],
  beauty: ["style", "glow", "skin", "cosmetic", "salon"],
  food: ["taste", "kitchen", "chef", "fresh", "brew"],
  finance: ["capital", "wealth", "fund", "ledger", "asset"],
  legal: ["law", "counsel", "compliance", "brief", "rights"],
  home: ["living", "garden", "interior", "decor", "nest"],
  pet: ["paw", "animal", "care", "vet", "companion"],
  marketing: ["brand", "ads", "growth", "audience", "campaign"],
  software: ["app", "suite", "platform", "workflow", "cloud"],
  crypto: ["chain", "token", "wallet", "defi", "ledger"],
}

export const VIBE_MODIFIERS: Record<string, string[]> = {
  luxury: ["premium", "signature", "select", "refined", "grand", "luxe", "velvet", "elevated", "regal", "prestige"],
  futuristic: ["next", "neo", "future", "orbit", "quant", "adaptive", "nova", "pulse", "neon", "forward"],
  playful: ["spark", "joy", "zesty", "lively", "bounce", "happy", "bright", "peppy", "sunny", "cheery"],
  trustworthy: ["secure", "steady", "trusted", "proven", "reliable", "clear", "honest", "solid", "shield", "anchor"],
  minimal: ["clean", "simple", "pure", "plain", "tidy", "sleek", "calm", "crisp", "neat", "quiet"],
}

function normaliseToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

function unique(words: string[]): string[] {
  return Array.from(new Set(words.map((word) => normaliseToken(word)).filter(Boolean)))
}

export function getIndustryLexicon(industry: string | undefined): IndustryLexicon {
  const safeIndustry = (industry || "Other") as IndustryOption
  const source = RAW_LEXICONS[safeIndustry] || RAW_LEXICONS.Other

  return {
    roots: unique([...source.roots, ...GENERIC_TERMS.roots]),
    verbs: unique([...source.verbs, ...GENERIC_TERMS.verbs]),
    modifiers: unique([...source.modifiers, ...GENERIC_TERMS.modifiers]),
    prefixes: unique([...source.prefixes, ...GENERIC_TERMS.prefixes]),
    suffixes: unique([...source.suffixes, ...GENERIC_TERMS.suffixes]),
    offTopicRoots: unique(source.offTopicRoots),
  }
}

export function parseKeywordTokens(input: string): string[] {
  const parts = input
    .split(/[\s,]+/)
    .map((part) => normaliseToken(part))
    .filter((part) => part.length >= 2 && !STOPWORDS.has(part))

  return unique(parts).slice(0, 6)
}

export function expandRelatedTerms(keywordTokens: string[], industry: string | undefined): string[] {
  const lexicon = getIndustryLexicon(industry)
  const expanded = new Set<string>([...keywordTokens, ...lexicon.roots.slice(0, 6), ...lexicon.modifiers.slice(0, 4)])

  for (const token of keywordTokens) {
    for (const synonym of LIGHTWEIGHT_THESAURUS[token] || []) {
      expanded.add(normaliseToken(synonym))
    }
  }

  return Array.from(expanded).filter((term) => term.length >= 2).slice(0, 36)
}

export function getWeightedModifiers(vibe: string | undefined, industry: string | undefined): string[] {
  const lexicon = getIndustryLexicon(industry)
  const vibeList = VIBE_MODIFIERS[vibe || ""] || []

  // Weighted by duplication: industry first, then vibe, then shared fallback.
  return unique([
    ...lexicon.modifiers,
    ...lexicon.modifiers,
    ...vibeList,
    ...vibeList,
    ...GENERIC_TERMS.modifiers,
  ])
}

export function isStyleBlend(style: NameStyleMode): boolean {
  return style === "brandable_blends"
}
