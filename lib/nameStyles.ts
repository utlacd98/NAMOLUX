export type NameStyleSelection = "mix" | "invented" | "blend" | "metaphor" | "literal"
export type NameStyleLabel = "Invented" | "Blend" | "Metaphor" | "Literal"
export type VibeMode = "luxury" | "futuristic" | "playful" | "trustworthy" | "minimal"

export interface NameStyleInput {
  keywords: string
  industry?: string
  vibe?: string
  maxLength?: number
  count?: number
  selectedStyle?: NameStyleSelection
  meaningMode?: boolean
  seed?: string
}

export interface StyledNameCandidate {
  name: string
  style: NameStyleLabel
  meaningShort?: string
  meaningParts?: string[]
}

interface GeneratorContext {
  vibe: VibeMode
  maxLength: number
  keywordTokens: string[]
  industryKey: string
  conceptRoots: string[]
  metaphorRoots: string[]
  rng: () => number
}

const SCAM_PATTERN = /(free|cheap|crypto1000|earn\d{3,}|guaranteedprofit|doublemoney)/i
const BAD_CLUSTER_PATTERN = /(xq|qz|ptk|qk|zxq|jj|vvv)/i
const REPEATED_PATTERN = /(.)\1\1/i

const PROFANITY_BLOCKLIST = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "dick",
  "cunt",
  "bastard",
]

const GENERIC_SCAMMY_TOKENS = [
  "free",
  "cheap",
  "profit",
  "token",
  "coin",
  "crypto",
  "bank",
  "swap",
  "defi",
  "meta",
  "chain",
  "verse",
  "world",
  "global",
]

const INDUSTRY_SYNONYMS: Record<string, string[]> = {
  technology: ["logic", "signal", "system", "stack", "byte", "grid", "sync", "nexus", "core"],
  "health wellness": ["vital", "pulse", "bloom", "care", "balance", "well", "renew", "calm"],
  finance: ["vault", "anchor", "ledger", "value", "secure", "yield", "capital", "trust"],
  ecommerce: ["cart", "store", "shelf", "market", "shop", "browse", "parcel", "merch"],
  education: ["learn", "lesson", "guide", "mentor", "study", "academy", "class", "skill"],
  creative: ["studio", "craft", "canvas", "story", "spark", "tone", "vision", "frame"],
  "real estate": ["estate", "nest", "parcel", "acre", "house", "key", "roof", "dwell"],
  "food beverage": ["flavour", "harvest", "plate", "brew", "spice", "fresh", "taste", "kitchen"],
  "fashion beauty": ["glow", "style", "silk", "trend", "chic", "shine", "aura", "polish"],
  "travel tourism": ["atlas", "horizon", "route", "voyage", "drift", "coast", "trail", "journey"],
  "sports fitness": ["stride", "motion", "lift", "fit", "power", "active", "tempo", "grit"],
  "entertainment media": ["scene", "stream", "echo", "spotlight", "wave", "reel", "pulse", "buzz"],
  "consulting services": ["advice", "strategy", "insight", "clarity", "partner", "guide", "expert"],
  "marketing advertising": ["reach", "brand", "signal", "campaign", "audience", "growth", "convert"],
  "legal professional": ["counsel", "case", "brief", "trust", "equity", "verdict", "compliance"],
  automotive: ["drive", "route", "motor", "torque", "fleet", "road", "gear"],
  "home garden": ["haven", "sprout", "root", "bloom", "nest", "harvest", "leaf", "yard"],
  "pet care": ["paw", "tail", "whisker", "companion", "care", "pack", "petal"],
  "gaming esports": ["quest", "arena", "level", "clutch", "spawn", "raid", "guild", "pixel"],
  "sustainability green tech": ["terra", "verde", "renew", "clean", "eco", "leaf", "bloom", "future"],
  "ai machine learning": ["model", "logic", "neural", "vector", "prompt", "intel", "signal"],
  "blockchain crypto": ["ledger", "block", "chain", "vault", "node", "protocol", "mint"],
  "saas software": ["cloud", "flow", "suite", "stack", "dash", "pilot", "launch", "tool"],
  manufacturing: ["forge", "factory", "build", "supply", "precision", "craft", "line"],
  "nonprofit social impact": ["impact", "change", "uplift", "cause", "care", "collective", "bridge"],
  other: ["brand", "studio", "works", "collective", "group", "house", "guide", "spark"],
}

const METAPHOR_LIBRARY: Record<string, string[]> = {
  technology: ["beacon", "prism", "vector", "nexus", "orbit", "lighthouse"],
  finance: ["anchor", "vault", "beacon", "compass", "keystone", "harbour"],
  "health wellness": ["bloom", "pulse", "horizon", "spring", "ember", "haven"],
  "travel tourism": ["atlas", "horizon", "drift", "compass", "harbour", "summit"],
  "sports fitness": ["stride", "summit", "pulse", "forge", "peak", "momentum"],
  "sustainability green tech": ["terra", "canopy", "river", "seed", "horizon", "grove"],
  "saas software": ["bridge", "pilot", "engine", "compass", "beacon", "switchboard"],
  other: ["beacon", "horizon", "atlas", "forge", "spark", "anchor"],
}

const ROOT_MEANINGS: Record<string, string> = {
  lux: "light and premium clarity",
  nova: "a new beginning",
  vera: "truth and reliability",
  omni: "broad coverage",
  aero: "air and movement",
  mint: "fresh value",
  spark: "creative ignition",
  pulse: "live momentum",
  forge: "building with intent",
  atlas: "navigation and guidance",
  drift: "smooth movement",
  bloom: "growth and vitality",
  vault: "security and trust",
  anchor: "stability and confidence",
  beacon: "guidance and visibility",
  horizon: "forward vision",
  flow: "smooth execution",
  craft: "quality workmanship",
}

const VIBE_PHONEMES: Record<
  VibeMode,
  { onsets: string[]; vowels: string[]; codas: string[]; cue: string; prefixes: string[]; suffixes: string[] }
> = {
  luxury: {
    onsets: ["l", "r", "m", "n", "s", "v", "el", "al", "or"],
    vowels: ["a", "o", "e", "au", "io"],
    codas: ["la", "ra", "na", "lo", "re", "via", "elle", "ora"],
    cue: "Soft lo/na sounds -> premium, calm",
    prefixes: ["vel", "aur", "lumi", "sero"],
    suffixes: ["elle", "ora", "luxe", "via"],
  },
  futuristic: {
    onsets: ["x", "z", "v", "q", "tr", "syn", "neo", "cy"],
    vowels: ["a", "i", "o", "ei", "io"],
    codas: ["ix", "on", "ex", "or", "yn", "iq", "va"],
    cue: "Sharp x/tri sounds -> futuristic, tech",
    prefixes: ["neo", "quant", "vox", "zy"],
    suffixes: ["ix", "iq", "ex", "on"],
  },
  playful: {
    onsets: ["b", "p", "k", "z", "j", "bo", "po", "ki"],
    vowels: ["a", "e", "i", "o", "oo"],
    codas: ["pop", "joy", "zi", "bo", "ka", "bee", "roo"],
    cue: "Bright bo/zi sounds -> playful and upbeat",
    prefixes: ["zippy", "bop", "jolly", "pop"],
    suffixes: ["joy", "pop", "bee", "roo"],
  },
  trustworthy: {
    onsets: ["c", "b", "d", "f", "gr", "st", "tr", "cl"],
    vowels: ["a", "e", "o", "u"],
    codas: ["core", "guard", "line", "sure", "bridge", "mark"],
    cue: "Clear stable sounds -> dependable and confident",
    prefixes: ["true", "sure", "clear", "steady"],
    suffixes: ["trust", "guard", "core", "line"],
  },
  minimal: {
    onsets: ["m", "n", "l", "c", "s", "t"],
    vowels: ["a", "e", "i", "o"],
    codas: ["n", "m", "r", "lo", "co", "form", "base"],
    cue: "Clean short sounds -> minimal and modern",
    prefixes: ["mono", "pure", "core", "base"],
    suffixes: ["co", "base", "form", "line"],
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normaliseWord(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

function titleToIndustryKey(value?: string): string {
  const cleaned = normaliseWord((value || "").replace(/&/g, " and "))
  if (!cleaned) return "other"

  const candidate = Object.keys(INDUSTRY_SYNONYMS).find((key) => normaliseWord(key) === cleaned)
  return candidate || "other"
}

function normaliseVibe(value?: string): VibeMode {
  const lowered = normaliseWord(value || "minimal")
  if (lowered === "luxury") return "luxury"
  if (lowered === "futuristic") return "futuristic"
  if (lowered === "playful") return "playful"
  if (lowered === "trustworthy") return "trustworthy"
  return "minimal"
}

function parseKeywordTokens(input: string): string[] {
  return Array.from(
    new Set(
      String(input || "")
        .split(/[\s,]+/)
        .map(normaliseWord)
        .filter((token) => token.length >= 2),
    ),
  ).slice(0, 10)
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return hash >>> 0
}

function createRng(seed: string): () => number {
  let state = hashSeed(seed) || 123456789
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickOne<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function removeAwkwardJoin(left: string, right: string): string {
  if (!left) return right
  if (!right) return left
  if (left[left.length - 1] === right[0]) return `${left}${right.slice(1)}`
  if (/[aeiou]$/.test(left) && /^[aeiou]/.test(right)) return `${left}${right.slice(1)}`
  return `${left}${right}`
}

function softBlend(left: string, right: string): string {
  const l = left.length <= 4 ? left : left.slice(0, Math.max(3, Math.ceil(left.length * 0.6)))
  const r = right.length <= 4 ? right : right.slice(Math.max(1, Math.floor(right.length * 0.4)))
  return removeAwkwardJoin(l, r)
}

function shouldRejectBySafety(name: string, maxLength: number): boolean {
  if (name.length < 4 || name.length > maxLength) return true
  if (/[-_\d]/.test(name)) return true
  if (SCAM_PATTERN.test(name)) return true
  if (BAD_CLUSTER_PATTERN.test(name)) return true
  if (REPEATED_PATTERN.test(name)) return true
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(name)) return true
  if (PROFANITY_BLOCKLIST.some((bad) => name.includes(bad))) return true
  if (GENERIC_SCAMMY_TOKENS.some((bad) => name.includes(bad) && name.length > 8 && bad.length >= 5)) return true
  return false
}

function trigrams(value: string): Set<string> {
  const s = `  ${value}  `
  const out = new Set<string>()
  for (let i = 0; i < s.length - 2; i += 1) {
    out.add(s.slice(i, i + 3))
  }
  return out
}

function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const at = trigrams(a)
  const bt = trigrams(b)
  let intersect = 0
  for (const item of at) {
    if (bt.has(item)) intersect += 1
  }
  const union = at.size + bt.size - intersect
  return union === 0 ? 0 : intersect / union
}

export function filterCandidates(candidates: StyledNameCandidate[], maxLength: number): StyledNameCandidate[] {
  const accepted: StyledNameCandidate[] = []

  for (const candidate of candidates) {
    const clean = normaliseWord(candidate.name)
    if (!clean) continue
    if (shouldRejectBySafety(clean, maxLength)) continue

    const tooClose = accepted.some((existing) => {
      if (existing.name === clean) return true
      return trigramSimilarity(existing.name, clean) >= 0.82
    })
    if (tooClose) continue

    accepted.push({
      ...candidate,
      name: clean,
      meaningShort: candidate.meaningShort ? candidate.meaningShort.slice(0, 90) : undefined,
    })
  }

  return accepted
}

function buildConceptRoots(tokens: string[], industryKey: string, vibe: VibeMode): string[] {
  const industry = INDUSTRY_SYNONYMS[industryKey] || INDUSTRY_SYNONYMS.other
  const vibeRoots = [...VIBE_PHONEMES[vibe].prefixes, ...VIBE_PHONEMES[vibe].suffixes].map(normaliseWord)
  return Array.from(new Set([...tokens, ...industry, ...vibeRoots])).filter((word) => word.length >= 2)
}

function buildMetaphorRoots(industryKey: string): string[] {
  return METAPHOR_LIBRARY[industryKey] || METAPHOR_LIBRARY.other
}

export function attachMeaning(input: {
  style: NameStyleLabel
  vibe: VibeMode
  meaningMode: boolean
  partA?: string
  partB?: string
  concept?: string
}): string | undefined {
  if (!input.meaningMode) return undefined

  const a = (input.partA || "").trim()
  const b = (input.partB || "").trim()
  const concept = (input.concept || "brand clarity").trim()

  if (input.style === "Blend") {
    return `${a} + ${b} -> ${concept}`.slice(0, 90)
  }

  if (input.style === "Literal") {
    return `${a} + ${b} -> ${concept}`.slice(0, 90)
  }

  if (input.style === "Metaphor") {
    return `${a} -> ${concept}`.slice(0, 90)
  }

  return VIBE_PHONEMES[input.vibe].cue.slice(0, 90)
}

export function generateInvented(context: GeneratorContext): StyledNameCandidate {
  const phoneme = VIBE_PHONEMES[context.vibe]
  const syllableTarget = context.vibe === "minimal" ? (context.rng() > 0.6 ? 1 : 2) : context.rng() > 0.5 ? 2 : 3

  let name = ""
  for (let i = 0; i < syllableTarget; i += 1) {
    const onset = pickOne(phoneme.onsets, context.rng)
    const vowel = pickOne(phoneme.vowels, context.rng)
    const coda = pickOne(phoneme.codas, context.rng)
    name += `${onset}${vowel}${coda}`
    if (name.length > context.maxLength + 2) break
  }

  const rootHint = context.keywordTokens.length > 0 ? pickOne(context.keywordTokens, context.rng) : ""
  if (rootHint && name.length < context.maxLength - 2 && context.rng() > 0.65) {
    name = softBlend(rootHint.slice(0, 3), name)
  }

  name = normaliseWord(name).slice(0, context.maxLength)

  return {
    name,
    style: "Invented",
    meaningShort: attachMeaning({
      style: "Invented",
      vibe: context.vibe,
      meaningMode: true,
    }),
    meaningParts: [phoneme.cue],
  }
}

export function generateBlend(context: GeneratorContext): StyledNameCandidate {
  const rootA = pickOne(context.conceptRoots, context.rng)
  const rootB = pickOne(context.conceptRoots, context.rng)
  const blended = softBlend(rootA, rootB).slice(0, context.maxLength)
  const concept = ROOT_MEANINGS[rootA] || ROOT_MEANINGS[rootB] || `${context.industryKey} brand direction`

  return {
    name: blended,
    style: "Blend",
    meaningShort: attachMeaning({
      style: "Blend",
      vibe: context.vibe,
      meaningMode: true,
      partA: rootA,
      partB: rootB,
      concept,
    }),
    meaningParts: [rootA, rootB],
  }
}

export function generateLiteral(context: GeneratorContext): StyledNameCandidate {
  const industryWords = INDUSTRY_SYNONYMS[context.industryKey] || INDUSTRY_SYNONYMS.other
  const wordA = context.keywordTokens.length > 0 ? pickOne(context.keywordTokens, context.rng) : pickOne(industryWords, context.rng)
  const wordB = pickOne(industryWords, context.rng)
  const literal = removeAwkwardJoin(wordA, wordB).slice(0, context.maxLength)
  const concept = `${context.industryKey} relevance`

  return {
    name: literal,
    style: "Literal",
    meaningShort: attachMeaning({
      style: "Literal",
      vibe: context.vibe,
      meaningMode: true,
      partA: wordA,
      partB: wordB,
      concept,
    }),
    meaningParts: [wordA, wordB],
  }
}

export function generateMetaphor(context: GeneratorContext): StyledNameCandidate {
  const metaphor = pickOne(context.metaphorRoots, context.rng)
  const support = context.keywordTokens.length > 0 ? pickOne(context.keywordTokens, context.rng) : pickOne(context.conceptRoots, context.rng)
  const name = softBlend(metaphor, support).slice(0, context.maxLength)
  const concept = ROOT_MEANINGS[metaphor] || `a ${context.industryKey} brand with forward momentum`

  return {
    name,
    style: "Metaphor",
    meaningShort: attachMeaning({
      style: "Metaphor",
      vibe: context.vibe,
      meaningMode: true,
      partA: metaphor,
      concept,
    }),
    meaningParts: [metaphor, support],
  }
}

function mixPlan(total: number): Array<{ style: NameStyleLabel; count: number }> {
  const base = [
    { style: "Invented" as const, count: Math.floor(total * 0.4) },
    { style: "Blend" as const, count: Math.floor(total * 0.3) },
    { style: "Metaphor" as const, count: Math.floor(total * 0.2) },
    { style: "Literal" as const, count: Math.floor(total * 0.1) },
  ]

  let allocated = base.reduce((sum, item) => sum + item.count, 0)
  let idx = 0
  while (allocated < total) {
    base[idx % base.length].count += 1
    allocated += 1
    idx += 1
  }

  return base
}

function enforceStyleDiversity(sorted: StyledNameCandidate[]): StyledNameCandidate[] {
  const output: StyledNameCandidate[] = []

  for (const candidate of sorted) {
    const len = output.length
    if (len >= 2 && output[len - 1].style === candidate.style && output[len - 2].style === candidate.style) {
      const swapIndex = sorted.findIndex(
        (alt) => alt !== candidate && alt.style !== candidate.style && !output.some((existing) => existing.name === alt.name),
      )
      if (swapIndex >= 0) {
        output.push(sorted[swapIndex])
        continue
      }
    }
    if (!output.some((existing) => existing.name === candidate.name)) {
      output.push(candidate)
    }
  }

  return output
}

export function generateNameStyleCandidates(input: NameStyleInput): StyledNameCandidate[] {
  const count = clamp(Math.floor(input.count || 10), 8, 40)
  const maxLength = clamp(Math.floor(input.maxLength || 10), 5, 18)
  const vibe = normaliseVibe(input.vibe)
  const industryKey = titleToIndustryKey(input.industry)
  const keywordTokens = parseKeywordTokens(input.keywords)
  const style = input.selectedStyle || "mix"
  const meaningMode = Boolean(input.meaningMode)
  const seed = `${input.keywords}:${input.industry || "other"}:${vibe}:${maxLength}:${style}:${input.seed || "seed"}`
  const rng = createRng(seed)

  const context: GeneratorContext = {
    vibe,
    maxLength,
    keywordTokens,
    industryKey,
    conceptRoots: buildConceptRoots(keywordTokens, industryKey, vibe),
    metaphorRoots: buildMetaphorRoots(industryKey),
    rng,
  }

  const raw: StyledNameCandidate[] = []

  const pushStyle = (styleLabel: NameStyleLabel, target: number) => {
    const attempts = target * 6
    let generated = 0
    let loops = 0

    while (generated < target && loops < attempts) {
      loops += 1
      let candidate: StyledNameCandidate

      if (styleLabel === "Invented") candidate = generateInvented(context)
      else if (styleLabel === "Blend") candidate = generateBlend(context)
      else if (styleLabel === "Metaphor") candidate = generateMetaphor(context)
      else candidate = generateLiteral(context)

      if (!meaningMode) {
        candidate = { ...candidate, meaningShort: undefined, meaningParts: undefined }
      }

      raw.push(candidate)
      generated += 1
    }
  }

  if (style === "mix") {
    for (const part of mixPlan(count)) {
      pushStyle(part.style, Math.max(1, part.count))
    }
  } else if (style === "invented") {
    pushStyle("Invented", count)
  } else if (style === "blend") {
    pushStyle("Blend", count)
  } else if (style === "metaphor") {
    pushStyle("Metaphor", count)
  } else {
    pushStyle("Literal", count)
  }

  const filtered = filterCandidates(raw, maxLength).slice(0, count * 2)
  const diverse = enforceStyleDiversity(filtered)
  return diverse.slice(0, count)
}
