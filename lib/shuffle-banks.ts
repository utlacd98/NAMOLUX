export type ShuffleBank = {
  nouns: string[]
  verbs: string[]
  modifiers: string[]
}

const MIN_ITEMS_PER_CATEGORY = 20
const MAX_ITEMS_PER_CATEGORY = 28

export const GENERIC_SHUFFLE_BANK: ShuffleBank = {
  nouns: [
    "studio",
    "hub",
    "labs",
    "works",
    "co",
    "group",
    "collective",
    "house",
    "club",
    "service",
    "partners",
    "guild",
    "forge",
    "circle",
    "union",
    "network",
    "base",
    "atelier",
    "point",
    "bureau",
    "company",
    "corner",
    "place",
    "crew",
  ],
  verbs: [
    "build",
    "shape",
    "launch",
    "create",
    "craft",
    "grow",
    "guide",
    "support",
    "boost",
    "elevate",
    "refine",
    "improve",
    "scale",
    "start",
    "run",
    "deliver",
    "connect",
    "unlock",
    "power",
    "drive",
    "plan",
    "design",
    "develop",
    "enable",
  ],
  modifiers: [
    "modern",
    "trusted",
    "bright",
    "clear",
    "bold",
    "smart",
    "agile",
    "steady",
    "fresh",
    "focused",
    "prime",
    "core",
    "dynamic",
    "refined",
    "practical",
    "precise",
    "ready",
    "local",
    "global",
    "friendly",
    "reliable",
    "premium",
    "clean",
    "vibrant",
  ],
}

export const VIBE_SHUFFLE_MODIFIERS: Record<string, string[]> = {
  luxury: [
    "premium",
    "elite",
    "refined",
    "signature",
    "bespoke",
    "grand",
    "opulent",
    "polished",
    "select",
    "prestige",
    "exclusive",
    "timeless",
  ],
  futuristic: [
    "next",
    "neo",
    "quantum",
    "forward",
    "orbit",
    "dynamic",
    "electric",
    "adaptive",
    "advanced",
    "digital",
    "autonomous",
    "hyper",
  ],
  playful: [
    "joyful",
    "spark",
    "bouncy",
    "zippy",
    "sunny",
    "cheery",
    "light",
    "lively",
    "quirky",
    "fun",
    "friendly",
    "poppy",
  ],
  trustworthy: [
    "secure",
    "solid",
    "steady",
    "proven",
    "dependable",
    "assured",
    "honest",
    "credible",
    "reliable",
    "safe",
    "verified",
    "stable",
  ],
  minimal: [
    "clean",
    "simple",
    "pure",
    "calm",
    "tidy",
    "neat",
    "quiet",
    "sleek",
    "lean",
    "plain",
    "clear",
    "subtle",
  ],
}

const RAW_INDUSTRY_SHUFFLE_BANKS: Record<string, ShuffleBank> = {
  "Technology": {
    nouns: ["platform", "software", "network", "cloud", "data", "code", "stack", "logic", "circuit", "compute", "server", "engine", "protocol", "gateway"],
    verbs: ["build", "deploy", "optimise", "automate", "integrate", "code", "launch", "secure", "connect", "streamline", "configure", "monitor", "engineer", "orchestrate"],
    modifiers: ["digital", "smart", "modular", "connected", "adaptive", "rapid", "secure", "scalable", "robust", "efficient", "advanced", "open", "precision", "modern"],
  },
  "Health & Wellness": {
    nouns: ["wellness", "clinic", "therapy", "care", "fitness", "nutrition", "recovery", "mind", "balance", "vitality", "pulse", "health", "habit", "coach"],
    verbs: ["heal", "nourish", "restore", "strengthen", "coach", "support", "balance", "improve", "guide", "refresh", "recover", "energise", "care", "uplift"],
    modifiers: ["healthy", "vital", "calm", "natural", "holistic", "active", "balanced", "gentle", "fresh", "mindful", "supportive", "clean", "renewed", "resilient"],
  },
  "Finance": {
    nouns: ["capital", "wealth", "ledger", "vault", "fund", "equity", "portfolio", "credit", "asset", "bank", "yield", "insight", "adviser", "treasury"],
    verbs: ["invest", "protect", "grow", "budget", "forecast", "save", "fund", "advise", "secure", "analyse", "optimise", "trade", "balance", "allocate"],
    modifiers: ["secure", "stable", "trusted", "prudent", "strategic", "smart", "transparent", "compliant", "measured", "proven", "disciplined", "reliable", "resilient", "steady"],
  },
  "E-commerce": {
    nouns: ["store", "shop", "cart", "catalogue", "checkout", "merchant", "basket", "market", "product", "fulfilment", "retail", "deal", "listing", "order"],
    verbs: ["sell", "ship", "list", "launch", "merchandise", "fulfil", "promote", "bundle", "stock", "deliver", "source", "price", "optimise", "convert"],
    modifiers: ["fast", "seamless", "scalable", "curated", "smart", "reliable", "streamlined", "direct", "trusted", "responsive", "modern", "profitable", "agile", "accessible"],
  },
  "Education": {
    nouns: ["academy", "learning", "school", "classroom", "course", "curriculum", "tutor", "knowledge", "lesson", "campus", "study", "skill", "teacher", "library"],
    verbs: ["teach", "learn", "mentor", "coach", "train", "guide", "explain", "assess", "practice", "inspire", "educate", "revise", "prepare", "progress"],
    modifiers: ["clear", "engaging", "practical", "inclusive", "accessible", "thoughtful", "guided", "structured", "curious", "smart", "supportive", "flexible", "modern", "inspiring"],
  },
  "Creative": {
    nouns: ["studio", "atelier", "design", "canvas", "craft", "story", "brand", "concept", "palette", "frame", "media", "voice", "brief", "portfolio"],
    verbs: ["design", "create", "craft", "illustrate", "compose", "brand", "shape", "edit", "animate", "curate", "produce", "sketch", "write", "direct"],
    modifiers: ["bold", "expressive", "artful", "original", "vibrant", "stylish", "playful", "distinct", "clever", "fresh", "curated", "visual", "inventive", "memorable"],
  },
  "Real Estate": {
    nouns: ["property", "estate", "homes", "listing", "broker", "rental", "mortgage", "neighbourhood", "residence", "plot", "lease", "housing", "agent", "building"],
    verbs: ["buy", "sell", "lease", "list", "invest", "renovate", "stage", "manage", "value", "market", "develop", "finance", "survey", "close"],
    modifiers: ["local", "trusted", "prime", "residential", "commercial", "modern", "verified", "professional", "secure", "strategic", "neighbourhood", "reliable", "smart", "refined"],
  },
  "Food & Beverage": {
    nouns: ["kitchen", "bistro", "bakery", "roastery", "brew", "flavour", "menu", "plate", "pantry", "bite", "sip", "dining", "cafe", "chef"],
    verbs: ["cook", "serve", "bake", "brew", "taste", "source", "season", "roast", "blend", "deliver", "pair", "plate", "host", "prepare"],
    modifiers: ["fresh", "artisan", "tasty", "local", "seasonal", "healthy", "crafted", "premium", "crisp", "bold", "fragrant", "balanced", "wholesome", "satisfying"],
  },
  "Fashion & Beauty": {
    nouns: ["style", "couture", "wardrobe", "apparel", "beauty", "skincare", "makeup", "salon", "runway", "boutique", "look", "glow", "spa", "trend"],
    verbs: ["style", "dress", "curate", "blend", "glow", "nourish", "shape", "polish", "elevate", "refresh", "define", "beautify", "tailor", "refine"],
    modifiers: ["elegant", "radiant", "premium", "luxe", "clean", "timeless", "modern", "confident", "polished", "chic", "smooth", "vibrant", "refined", "signature"],
  },
  "Travel & Tourism": {
    nouns: ["journey", "voyage", "tour", "stay", "escape", "route", "trip", "resort", "guide", "destination", "itinerary", "flight", "booking", "adventure"],
    verbs: ["travel", "explore", "book", "plan", "roam", "discover", "guide", "host", "reserve", "depart", "arrive", "tour", "navigate", "experience"],
    modifiers: ["scenic", "global", "curated", "easy", "seamless", "adventurous", "relaxing", "memorable", "flexible", "trusted", "local", "vibrant", "coastal", "authentic"],
  },
  "Sports & Fitness": {
    nouns: ["fitness", "training", "athlete", "coach", "gym", "performance", "strength", "endurance", "sport", "recovery", "workout", "club", "team", "active"],
    verbs: ["train", "compete", "perform", "strengthen", "recover", "coach", "improve", "push", "run", "lift", "focus", "practice", "condition", "energise"],
    modifiers: ["active", "strong", "fast", "resilient", "focused", "dynamic", "elite", "fit", "steady", "powerful", "driven", "athletic", "balanced", "energised"],
  },
  "Entertainment & Media": {
    nouns: ["media", "studio", "channel", "podcast", "show", "stream", "stage", "cinema", "audience", "content", "broadcast", "series", "story", "performer"],
    verbs: ["produce", "broadcast", "stream", "perform", "edit", "publish", "host", "record", "direct", "entertain", "release", "promote", "present", "capture"],
    modifiers: ["engaging", "viral", "cinematic", "live", "dynamic", "creative", "popular", "immersive", "sharp", "vivid", "captivating", "playful", "bold", "memorable"],
  },
  "Consulting & Services": {
    nouns: ["consulting", "advisory", "service", "practice", "partner", "strategy", "solutions", "expert", "operations", "delivery", "insight", "support", "counsel", "team"],
    verbs: ["advise", "guide", "plan", "improve", "optimise", "deliver", "support", "solve", "audit", "coach", "align", "streamline", "manage", "enable"],
    modifiers: ["professional", "trusted", "strategic", "practical", "proven", "reliable", "bespoke", "experienced", "efficient", "clear", "collaborative", "measured", "focused", "capable"],
  },
  "Marketing & Advertising": {
    nouns: ["marketing", "campaign", "brand", "media", "audience", "growth", "creative", "agency", "funnel", "insight", "reach", "content", "performance", "conversion"],
    verbs: ["promote", "advertise", "position", "target", "convert", "optimise", "analyse", "launch", "amplify", "engage", "scale", "segment", "measure", "brand"],
    modifiers: ["targeted", "creative", "strategic", "dataled", "bold", "highimpact", "engaging", "measurable", "optimised", "smart", "effective", "relevant", "agile", "dynamic"],
  },
  "Legal & Professional": {
    nouns: ["legal", "law", "counsel", "brief", "contract", "compliance", "advocate", "practice", "chambers", "professional", "adviser", "case", "rights", "governance"],
    verbs: ["advise", "represent", "draft", "review", "protect", "negotiate", "comply", "resolve", "mediate", "counsel", "defend", "guide", "assess", "govern"],
    modifiers: ["professional", "trusted", "compliant", "ethical", "precise", "credible", "secure", "confidential", "experienced", "reliable", "measured", "clear", "authoritative", "dependable"],
  },
  "Automotive": {
    nouns: ["auto", "garage", "motors", "vehicle", "drive", "engine", "fleet", "road", "tyre", "service", "transport", "garage", "workshop", "mobility"],
    verbs: ["drive", "service", "repair", "maintain", "upgrade", "tune", "transport", "move", "inspect", "detail", "diagnose", "navigate", "deliver", "accelerate"],
    modifiers: ["reliable", "fast", "durable", "precision", "safe", "modern", "efficient", "robust", "trusted", "responsive", "clean", "highperformance", "steady", "advanced"],
  },
  "Home & Garden": {
    nouns: ["home", "garden", "interiors", "outdoors", "decor", "landscape", "living", "kitchen", "patio", "renovation", "plants", "workspace", "storage", "design"],
    verbs: ["decorate", "renovate", "grow", "organise", "plant", "build", "restore", "style", "maintain", "improve", "refresh", "arrange", "craft", "landscape"],
    modifiers: ["cosy", "fresh", "practical", "stylish", "natural", "warm", "clean", "functional", "bright", "calm", "sustainable", "comfortable", "inviting", "modern"],
  },
  "Pet Care": {
    nouns: ["pet", "paws", "vet", "groom", "care", "companion", "animal", "clinic", "training", "treat", "wellness", "rescue", "shelter", "breed"],
    verbs: ["care", "groom", "train", "feed", "heal", "protect", "walk", "adopt", "nurture", "support", "rescue", "comfort", "guide", "play"],
    modifiers: ["gentle", "loving", "safe", "trusted", "friendly", "healthy", "playful", "calm", "caring", "reliable", "expert", "happy", "warm", "kind"],
  },
  "Gaming & Esports": {
    nouns: ["gaming", "esports", "arena", "squad", "guild", "match", "quest", "stream", "rank", "controller", "pixel", "champion", "lobby", "tournament"],
    verbs: ["play", "compete", "stream", "rank", "challenge", "win", "level", "battle", "coach", "host", "queue", "score", "practice", "squad"],
    modifiers: ["competitive", "epic", "fast", "sharp", "pro", "immersive", "legendary", "skillbased", "dynamic", "live", "intense", "playful", "agile", "vibrant"],
  },
  "Sustainability & Green Tech": {
    nouns: ["green", "climate", "energy", "solar", "wind", "carbon", "recycle", "earth", "ecosystem", "renewal", "sustainability", "impact", "efficiency", "conservation"],
    verbs: ["reduce", "reuse", "recycle", "save", "offset", "preserve", "restore", "power", "clean", "optimise", "measure", "decarbonise", "protect", "renew"],
    modifiers: ["sustainable", "clean", "green", "renewable", "responsible", "ethical", "efficient", "climate", "smart", "circular", "lowcarbon", "futureproof", "conscious", "resilient"],
  },
  "AI & Machine Learning": {
    nouns: ["ai", "model", "neural", "agent", "vector", "inference", "dataset", "intelligence", "automation", "training", "algorithm", "prediction", "vision", "language"],
    verbs: ["predict", "learn", "classify", "detect", "automate", "optimise", "train", "infer", "analyse", "generate", "assist", "reason", "adapt", "score"],
    modifiers: ["intelligent", "adaptive", "autonomous", "predictive", "neural", "smart", "scalable", "efficient", "accurate", "contextual", "real-time", "dynamic", "advanced", "reliable"],
  },
  "Blockchain & Crypto": {
    nouns: ["blockchain", "crypto", "ledger", "chain", "token", "wallet", "node", "protocol", "defi", "exchange", "staking", "contract", "vault", "consensus"],
    verbs: ["trade", "stake", "mint", "swap", "secure", "verify", "validate", "govern", "bridge", "tokenise", "track", "settle", "store", "decentralise"],
    modifiers: ["decentralised", "secure", "transparent", "trustless", "onchain", "open", "composable", "resilient", "permissionless", "scalable", "audited", "verifiable", "robust", "cryptographic"],
  },
  "SaaS & Software": {
    nouns: ["saas", "software", "platform", "workspace", "dashboard", "portal", "suite", "workflow", "automation", "integration", "app", "analytics", "service", "module"],
    verbs: ["simplify", "automate", "integrate", "manage", "track", "optimise", "configure", "deploy", "monitor", "scale", "streamline", "report", "collaborate", "deliver"],
    modifiers: ["cloud", "scalable", "secure", "modular", "intuitive", "efficient", "reliable", "collaborative", "modern", "agile", "adaptive", "lightweight", "robust", "productive"],
  },
  "Manufacturing": {
    nouns: ["factory", "manufacturing", "production", "assembly", "supply", "logistics", "plant", "operations", "machining", "tooling", "materials", "quality", "engineering", "workflow"],
    verbs: ["manufacture", "assemble", "fabricate", "produce", "test", "inspect", "ship", "source", "optimise", "streamline", "scale", "automate", "maintain", "deliver"],
    modifiers: ["industrial", "efficient", "precision", "reliable", "lean", "robust", "safe", "scalable", "durable", "highquality", "automated", "measured", "smart", "consistent"],
  },
  "Nonprofit & Social Impact": {
    nouns: ["impact", "charity", "community", "foundation", "mission", "cause", "support", "equity", "outreach", "advocacy", "volunteer", "giving", "change", "development"],
    verbs: ["support", "advocate", "empower", "uplift", "serve", "organise", "fundraise", "educate", "mentor", "mobilise", "donate", "connect", "improve", "sustain"],
    modifiers: ["social", "ethical", "inclusive", "compassionate", "equitable", "community", "missionled", "purposeful", "trusted", "transparent", "human", "supportive", "responsible", "impactful"],
  },
  "Other": {
    nouns: ["startup", "venture", "brand", "project", "idea", "service", "collective", "company", "studio", "agency", "solution", "platform", "market", "group"],
    verbs: ["build", "launch", "create", "grow", "deliver", "shape", "guide", "support", "develop", "improve", "scale", "test", "connect", "start"],
    modifiers: ["modern", "agile", "trusted", "practical", "focused", "creative", "reliable", "clear", "smart", "bold", "dynamic", "flexible", "useful", "balanced"],
  },
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "get",
  "go",
  "in",
  "into",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "our",
  "the",
  "to",
  "try",
  "up",
  "we",
  "with",
  "your",
])

function normaliseToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function uniqueWords(words: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const word of words) {
    const token = normaliseToken(word)
    if (!token || seen.has(token)) continue
    seen.add(token)
    result.push(token)
  }

  return result
}

function withFallback(words: string[], fallbackWords: string[]): string[] {
  const merged = uniqueWords(words)

  for (const fallbackWord of uniqueWords(fallbackWords)) {
    if (merged.length >= MAX_ITEMS_PER_CATEGORY) break
    if (!merged.includes(fallbackWord)) {
      merged.push(fallbackWord)
    }
  }

  return merged.slice(0, Math.max(MIN_ITEMS_PER_CATEGORY, merged.length))
}

function normaliseBank(bank: ShuffleBank): ShuffleBank {
  return {
    nouns: withFallback(bank.nouns, GENERIC_SHUFFLE_BANK.nouns),
    verbs: withFallback(bank.verbs, GENERIC_SHUFFLE_BANK.verbs),
    modifiers: withFallback(bank.modifiers, GENERIC_SHUFFLE_BANK.modifiers),
  }
}

export const INDUSTRY_SHUFFLE_BANKS: Record<string, ShuffleBank> = Object.fromEntries(
  Object.entries(RAW_INDUSTRY_SHUFFLE_BANKS).map(([industry, bank]) => [industry, normaliseBank(bank)]),
)

function getIndustryBank(selectedIndustry: string): ShuffleBank {
  const key = selectedIndustry && INDUSTRY_SHUFFLE_BANKS[selectedIndustry] ? selectedIndustry : "Other"
  return INDUSTRY_SHUFFLE_BANKS[key]
}

function pickRandom(items: string[]): string {
  if (items.length === 0) return ""
  return items[Math.floor(Math.random() * items.length)]
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ")
}

function extractKeywordTokens(currentKeywordText: string): string[] {
  const tokens = uniqueWords(
    currentKeywordText
      .split(/[\s,]+/)
      .map((token) => normaliseToken(token.trim()))
      .filter((token) => token.length >= 2 && !STOPWORDS.has(token)),
  )

  return tokens.sort((a, b) => b.length - a.length).slice(0, 2)
}

function buildModifierPool(industryBank: ShuffleBank, selectedVibe: string): string[] {
  const vibeModifiers = VIBE_SHUFFLE_MODIFIERS[selectedVibe] || []

  return uniqueWords([
    ...industryBank.modifiers,
    ...industryBank.modifiers,
    ...vibeModifiers,
    ...vibeModifiers,
    ...GENERIC_SHUFFLE_BANK.modifiers,
  ])
}

function buildSuggestion(parts: string[]): string {
  const words = uniqueWords(parts).slice(0, 3)
  if (words.length < 2) return ""
  return toTitleCase(words.join(" "))
}

function hasIndustryToken(candidate: string, industryBank: ShuffleBank): boolean {
  const candidateTokens = uniqueWords(candidate.split(/\s+/))
  const industryTokens = new Set(industryBank.nouns)
  return candidateTokens.some((token) => industryTokens.has(normaliseToken(token)))
}

function addUniqueSuggestion(collection: string[], suggestion: string): void {
  if (!suggestion) return
  const alreadyExists = collection.some((entry) => entry.toLowerCase() === suggestion.toLowerCase())
  if (!alreadyExists) {
    collection.push(suggestion)
  }
}

export function getShufflePool(selectedIndustry: string, selectedVibe: string): string[] {
  const industryBank = getIndustryBank(selectedIndustry)
  const modifierPool = buildModifierPool(industryBank, selectedVibe)

  return uniqueWords([
    ...industryBank.nouns,
    ...industryBank.verbs,
    ...modifierPool,
    ...GENERIC_SHUFFLE_BANK.nouns,
  ]).filter((word) => word.length >= 3)
}

export function shuffleSeedSuggestions(
  currentKeywordText: string,
  selectedIndustry: string,
  selectedVibe: string,
): string[] {
  const industryBank = getIndustryBank(selectedIndustry)
  const keywordTokens = extractKeywordTokens(currentKeywordText)
  const modifierPool = buildModifierPool(industryBank, selectedVibe)
  const suggestions: string[] = []

  if (keywordTokens.length > 0) {
    const firstToken = keywordTokens[0]
    const secondToken = keywordTokens[1] || keywordTokens[0]

    addUniqueSuggestion(suggestions, buildSuggestion([firstToken, pickRandom(industryBank.nouns)]))
    addUniqueSuggestion(suggestions, buildSuggestion([pickRandom(industryBank.nouns), secondToken]))
  }

  const templateBuilders: Array<() => string> = [
    () => buildSuggestion([pickRandom(modifierPool), pickRandom(industryBank.nouns)]),
    () => buildSuggestion([pickRandom(industryBank.verbs), pickRandom(industryBank.nouns)]),
    () => buildSuggestion([pickRandom(industryBank.nouns), pickRandom(GENERIC_SHUFFLE_BANK.nouns)]),
    () => buildSuggestion([pickRandom(modifierPool), pickRandom(industryBank.nouns), pickRandom(GENERIC_SHUFFLE_BANK.nouns)]),
    () => buildSuggestion([pickRandom(industryBank.verbs), pickRandom(industryBank.nouns), pickRandom(GENERIC_SHUFFLE_BANK.nouns)]),
  ]

  let attempts = 0
  while (suggestions.length < 5 && attempts < 40) {
    const template = templateBuilders[attempts % templateBuilders.length]
    const candidate = template()

    if (candidate && hasIndustryToken(candidate, industryBank)) {
      addUniqueSuggestion(suggestions, candidate)
    }

    attempts += 1
  }

  while (suggestions.length < 5) {
    addUniqueSuggestion(
      suggestions,
      buildSuggestion([pickRandom(industryBank.nouns), pickRandom(GENERIC_SHUFFLE_BANK.nouns)]),
    )
  }

  return suggestions.slice(0, 5)
}
