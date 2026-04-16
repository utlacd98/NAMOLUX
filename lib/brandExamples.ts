/**
 * Curated real company names by industry.
 * Injected into AI prompts so the model pattern-matches against proven brands
 * instead of inventing random syllable combinations.
 */

interface IndustryExamples {
  names: string[]
  patterns: string
}

export const brandExamples: Record<string, IndustryExamples> = {
  "SaaS & Software": {
    names: [
      "Stripe", "Notion", "Figma", "Canva", "Slack", "Vercel", "Linear",
      "Webflow", "Airtable", "Retool", "Loom", "Miro", "Asana", "Trello",
      "Plaid", "Brex", "Ramp", "Deel", "Rippling", "Gusto",
      "Zapier", "Postman", "Datadog", "Snyk", "Sentry", "LaunchDarkly",
      "Amplitude", "Mixpanel", "Segment", "Twilio", "Sendgrid",
      "Algolia", "Supabase", "Neon", "Prisma", "Turso",
      "Render", "Railway", "Planetscale", "Convex", "Replit",
      "Coda", "Craft", "Pitch", "Tome", "Gamma",
      "Clerk", "Stytch", "Descope", "Frontegg",
      "Drata", "Vanta", "Secureframe", "Launchnotes",
      "Cal", "Calendly", "Doodle", "Reclaim",
      "Lattice", "Leapsome", "Pave", "Carta",
    ],
    patterns:
      "Short invented words (Figma, Canva), real words in new contexts (Notion, Slack, Plaid, Linear), clean compound words (Webflow, Airtable, Sendgrid), Latin/Greek roots (Amplitude, Prisma, Convex)",
  },

  "E-Commerce": {
    names: [
      "Shopify", "Stripe", "Bolt", "Faire", "Klarna", "Affirm",
      "Squarespace", "BigCommerce", "WooCommerce", "Gorgias",
      "Klaviyo", "Attentive", "Yotpo", "Stamped", "Okendo",
      "Shippo", "Shipbob", "Flexport", "Returnly", "Loop",
      "Recharge", "Bold", "Privy", "Omnisend", "Drip",
      "Alloy", "Mesa", "Tapcart", "Plobal", "Vajro",
      "Spocket", "Modalyst", "Printful", "Printify", "Gooten",
      "Smile", "Swell", "Rise", "Fondue", "Disco",
      "Triple", "Elevar", "Littledata", "Peel", "Polar",
      "Grin", "Aspire", "Impact", "Refersion", "Everflow",
    ],
    patterns:
      "Action words (Bolt, Rise, Drip, Loop), friendly/approachable (Smile, Disco, Fondue), modified real words (Shopify, Klaviyo, Affirm), short and punchy (Grin, Peel, Mesa)",
  },

  "Fintech & Finance": {
    names: [
      "Stripe", "Plaid", "Brex", "Ramp", "Deel", "Carta",
      "Mercury", "Arc", "Novo", "Relay", "Found", "Lili",
      "Meow", "Treasure", "Vesto", "Capchase", "Pipe",
      "Clearco", "Wayflyer", "Uncapped", "Lighter",
      "Navan", "Divvy", "Airbase",
      "Alloy", "Unit", "Moov", "Astra",
      "Marqeta", "Lithic", "Highnote", "Galileo",
      "Adyen", "Mollie", "Payoneer", "Remitly", "Wise",
      "Upstart", "Blend", "Tala", "Branch", "Brigit",
      "Wealthfront", "Betterment", "Titan", "Public", "Alpaca",
    ],
    patterns:
      "Trust/stability words (Mercury, Titan, Relay, Vesto), short monosyllables (Arc, Pipe, Wise, Unit), Latin/classical (Marqeta, Galileo, Astra), compound clarity (Wealthfront, Airbase, Capchase)",
  },

  "Health & Wellness": {
    names: [
      "Calm", "Headspace", "Noom", "Hims", "Hers", "Ro",
      "Nurx", "Alto", "Capsule", "Truepill", "Cerebral",
      "Lyra", "Spring", "Ginger", "Talkspace", "Alma",
      "Oura", "Whoop", "Levels", "Virta", "Omada",
      "Nuviva", "Parsley", "Forward", "Carbon", "Heal",
      "Maven", "Kindbody", "Carrot", "Progyny", "Stork",
      "Hinge", "Wellthy", "Garner", "Transcarent", "Accolade",
      "Sword", "Halo", "Kaia", "Bold", "Woebot",
      "Lark", "Vida", "Foodsmart", "Zipongo", "Nourish",
      "Tends", "Quip", "Byte", "Candid",
    ],
    patterns:
      "Warm/natural words (Calm, Parsley, Ginger, Lark), short Latin roots (Alma, Lyra, Vida, Kaia), empowering words (Bold, Forward, Levels), body/wellness metaphors (Halo, Spring, Oura)",
  },

  "AI & Machine Learning": {
    names: [
      "Anthropic", "Cohere", "Mistral", "Perplexity", "Inflection",
      "Adept", "Jasper", "Writer", "Synthesia",
      "Runway", "Midjourney", "Stability", "Pika", "Luma",
      "Pinecone", "Weaviate", "Chroma", "Qdrant", "Milvus",
      "Roboflow", "Scale", "Labelbox", "Snorkel",
      "Langchain", "Modal", "Replicate", "Together",
      "Cerebras", "Groq", "Sambanova",
      "Glean", "Moveworks", "Forethought", "Ada", "Sierra",
      "Harvey", "Casetext", "EvenUp", "Ironclad", "Robin",
      "Tome", "Gamma", "Otter",
    ],
    patterns:
      "Scientific/intellectual (Anthropic, Cohere, Cerebras, Mistral), nature metaphors (Pinecone, Sierra, Luma), action words (Glean, Replicate, Inflection), human names as brands (Harvey, Ada, Jasper, Robin)",
  },

  "Marketing & Advertising": {
    names: [
      "HubSpot", "Mailchimp", "Klaviyo", "Braze", "Iterable",
      "Amplitude", "Mixpanel", "Heap", "Pendo", "Sprig",
      "Drift", "Intercom", "Crisp", "Olark", "Tidio",
      "Buffer", "Hootsuite", "Sprout", "Later", "Planoly",
      "Semrush", "Ahrefs", "Moz", "Surfer", "Clearscope",
      "Unbounce", "Instapage", "Leadpages", "Carrd",
      "Mutiny", "Proof", "Fomo", "Nudge",
      "Lavender", "Smartlead", "Apollo", "Outreach",
      "Gong", "Chorus", "Clari", "Salesloft", "Groove",
      "Canva", "Figma", "Pitch", "Gamma", "Tome",
    ],
    patterns:
      "Energetic verbs (Drift, Braze, Nudge), nature/organic (Sprout, Sprig, Lavender), confidence words (Proof, Gong, Apollo, Clari), playful compounds (Mailchimp, HubSpot, Hootsuite)",
  },

  "Education & EdTech": {
    names: [
      "Coursera", "Duolingo", "Quizlet", "Kahoot", "Brainly",
      "Outschool", "Masterclass", "Skillshare", "Udemy", "Udacity",
      "Canvas", "Schoology", "Brightspace", "Thinkific",
      "Teachable", "Podia", "Kajabi", "Mighty",
      "Degreed", "Guild", "Hone", "Ethena",
      "Praxis", "Lambda", "Springboard", "Flatiron", "Bloom",
      "Quill", "Newsela", "Kami", "Nearpod",
      "Pear", "Gradescope", "Grammarly", "Hemingway",
      "Labster", "Transfr", "Interplay",
      "ClassDojo", "Remind", "Seesaw", "Brightwheel", "Sawyer",
    ],
    patterns:
      "Knowledge metaphors (Quill, Bloom, Lambda, Praxis), friendly/approachable (Kahoot, Duolingo, Pear), aspirational (Masterclass, Mighty, Guild), compound descriptors (Brightwheel, Outschool, Skillshare)",
  },

  "Real Estate & PropTech": {
    names: [
      "Zillow", "Redfin", "Opendoor", "Offerpad", "Flyhomes",
      "Compass", "Divvy", "Ribbon", "Knock", "Orchard",
      "Loft", "Lessen", "Vesta", "Belong", "Arrived",
      "Fundrise", "Cadre", "Roofstock", "Yieldstreet", "Groundfloor",
      "Pacaso", "Ember", "Kocomo", "Kindred",
      "Rhino", "Jetty", "Steady", "Obligo", "Zego",
      "Latch", "Openpath", "Sonder", "Placemakr",
      "Buildium", "AppFolio", "Entrata",
      "Matterport", "Hover",
      "Qualia", "Snapdocs", "Notarize", "Spruce", "Doma",
    ],
    patterns:
      "Home/place words (Loft, Orchard, Ember, Compass), trust words (Steady, Belong, Ribbon), action words (Knock, Hover, Arrive), short invented (Zillow, Zego, Doma, Pacaso)",
  },

  "Food & Beverage": {
    names: [
      "Toast", "Square", "Olo", "Chowly", "Resy",
      "Tock", "OpenTable", "Yelp", "Bento",
      "Sweetgreen", "Cava", "Zume",
      "DoorDash", "Grubhub", "Caviar", "Ritual", "Snackpass",
      "Thistle", "Hungryroot", "Splendid", "Factor",
      "Misfits", "Imperfect", "Thrive", "Grove",
      "Oatly", "Impossible", "Beyond", "NotCo", "Daring",
      "Olipop", "Poppi", "Athletic", "Recess",
      "Soylent", "Huel", "Ample",
      "Apeel", "Crisp", "Afresh",
    ],
    patterns:
      "Food words repurposed (Toast, Caviar, Cava, Thistle), fresh/natural (Sweetgreen, Grove, Thrive, Afresh), playful short (Olo, Poppi, Huel), bold statements (Impossible, Beyond, Daring, Misfits)",
  },

  "Logistics & Supply Chain": {
    names: [
      "Flexport", "Convoy", "Transfix", "Emerge", "Loadsmart",
      "FourKites", "Samsara", "Motive",
      "Bringg", "Onfleet", "Locus", "Fareye",
      "Shippo", "Shipbob", "Easyship", "Sendle",
      "Stord", "Flowspace", "Fulfil",
      "Turvo", "Haven", "Overhaul", "Tive",
      "Coupa", "Scout", "Fairmarkit", "Zip",
      "Celonis", "Kinaxis", "Anaplan",
      "Nuvocargo", "Nowports", "Flock", "Forto", "Zencargo",
      "Beacon", "Route", "Circuit", "Onward",
    ],
    patterns:
      "Movement/speed (Convoy, Emerge, Onfleet, Motive), reliability (Beacon, Haven, Locus), compound clarity (Flexport, Flowspace, FourKites), short punchy (Zip, Stord, Forto, Flock)",
  },

  "Cybersecurity": {
    names: [
      "CrowdStrike", "SentinelOne", "Snyk", "Wiz", "Orca",
      "Lacework", "Aqua", "Sysdig", "Falco",
      "Okta", "Auth0", "Stytch", "Descope", "Passage",
      "Vanta", "Drata", "Secureframe", "Laika",
      "Cybereason", "Vectra", "Darktrace", "Arctic", "Halcyon",
      "Tessian", "Abnormal", "Material", "Sublime",
      "Snyk", "Semgrep", "Socket", "Endor", "Phylum",
      "Illumio", "Zscaler", "Netskope", "Cato", "Axis",
      "Huntress", "Blumira", "Todyl", "Perch", "Stellar",
      "Salt", "Noname", "Traceable", "Cequence",
    ],
    patterns:
      "Strength/protection (Sentinel, Halcyon, Passage), predators (Falcon, Orca, Huntress), subtle power (Wiz, Okta, Cato, Salt), watchfulness (Darktrace, Vectra, Sysdig, Stellar)",
  },

  "Media & Entertainment": {
    names: [
      "Spotify", "Netflix", "Hulu", "Roku", "Sonos",
      "Deezer", "Tidal", "Plex",
      "Twitch", "Discord", "Kick", "Rumble",
      "Substack", "Beehiiv", "Ghost", "Buttondown",
      "Anchor", "Riverside", "Descript", "Podium", "Buzzsprout",
      "Canva", "Runway", "Pika", "Kapwing",
      "Wattpad", "Radish", "Tapas", "Webtoon", "Inkitt",
      "Cameo", "Patreon", "Gumroad", "Podia", "Kajabi",
      "Mubi", "Shudder", "Crunchyroll",
      "Vimeo", "Loom", "Vidyard", "Wistia",
    ],
    patterns:
      "Sound/rhythm words (Spotify, Deezer, Tidal, Sonos), short punchy (Hulu, Roku, Kick, Plex, Mubi), creative energy (Runway, Descript, Kapwing), community feel (Discord, Anchor, Patreon)",
  },

  "Developer Tools": {
    names: [
      "Vercel", "Supabase", "Prisma", "Neon", "Turso",
      "Railway", "Render", "Fly", "Deno", "Bun",
      "Vite", "Astro", "Remix", "Svelte", "Solid",
      "Tailwind", "Radix", "Shadcn", "Mantine", "Chakra",
      "Sentry", "Datadog", "Grafana", "Axiom",
      "Linear", "Shortcut", "Height", "Orbit",
      "Clerk", "Stytch", "Hanko", "Passage",
      "Resend", "Postmark", "Loops", "Novu",
      "Trigger", "Inngest", "Temporal", "Windmill", "Prefect",
      "Depot", "Earthly", "Dagger", "Pulumi", "Terraform",
    ],
    patterns:
      "Speed/power (Vite, Turso, Bun, Fly, Bolt), precision tools (Prisma, Axiom, Sentry, Dagger), natural elements (Astro, Neon, Tailwind, Windmill), clean invented (Vercel, Supabase, Svelte, Grafana)",
  },

  default: {
    names: [
      "Stripe", "Notion", "Figma", "Slack", "Canva",
      "Shopify", "Spotify", "Airbnb", "Uber", "Lyft",
      "Bolt", "Ramp", "Brex", "Plaid", "Arc",
      "Linear", "Vercel", "Loom", "Miro", "Coda",
      "Calm", "Hims", "Oura", "Noom", "Alto",
      "Toast", "Faire", "Gusto", "Deel", "Pipe",
      "Webflow", "Airtable", "Retool", "Zapier", "Postman",
      "Mercury", "Wiz", "Snyk", "Vanta", "Drata",
      "Gong", "Drift", "Braze", "Pendo", "Sprig",
      "Zillow", "Compass", "Loft", "Sonder", "Orchard",
    ],
    patterns:
      "Mix of short real words (Bolt, Calm, Pipe, Loom), invented with clear phonetics (Figma, Canva, Zillow), action/emotion words (Drift, Ramp, Faire), compound clarity (Webflow, Airtable, Airbnb)",
  },
}

// ---------------------------------------------------------------------------
// Normalise industry strings coming from the frontend to match our keys.
// The frontend might send "Technology" or "SaaS & Software" or "Finance" etc.
// ---------------------------------------------------------------------------
const INDUSTRY_ALIASES: Record<string, string> = {
  technology: "SaaS & Software",
  saas: "SaaS & Software",
  software: "SaaS & Software",
  "saas & software": "SaaS & Software",
  ecommerce: "E-Commerce",
  "e-commerce": "E-Commerce",
  "e commerce": "E-Commerce",
  retail: "E-Commerce",
  finance: "Fintech & Finance",
  fintech: "Fintech & Finance",
  "fintech & finance": "Fintech & Finance",
  health: "Health & Wellness",
  healthcare: "Health & Wellness",
  wellness: "Health & Wellness",
  "health & wellness": "Health & Wellness",
  ai: "AI & Machine Learning",
  "artificial intelligence": "AI & Machine Learning",
  "machine learning": "AI & Machine Learning",
  "ai & machine learning": "AI & Machine Learning",
  marketing: "Marketing & Advertising",
  advertising: "Marketing & Advertising",
  "marketing & advertising": "Marketing & Advertising",
  education: "Education & EdTech",
  edtech: "Education & EdTech",
  "education & edtech": "Education & EdTech",
  "real estate": "Real Estate & PropTech",
  proptech: "Real Estate & PropTech",
  "real estate & proptech": "Real Estate & PropTech",
  food: "Food & Beverage",
  "food & beverage": "Food & Beverage",
  beverage: "Food & Beverage",
  "food and beverage": "Food & Beverage",
  logistics: "Logistics & Supply Chain",
  "supply chain": "Logistics & Supply Chain",
  "logistics & supply chain": "Logistics & Supply Chain",
  security: "Cybersecurity",
  cybersecurity: "Cybersecurity",
  infosec: "Cybersecurity",
  media: "Media & Entertainment",
  entertainment: "Media & Entertainment",
  "media & entertainment": "Media & Entertainment",
  "developer tools": "Developer Tools",
  devtools: "Developer Tools",
  dev: "Developer Tools",
}

function resolveIndustry(industry: string): string {
  const key = (industry || "").toLowerCase().trim()
  return INDUSTRY_ALIASES[key] ?? industry
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

// ---------------------------------------------------------------------------
// Shared prompt builder used by both normal generation and Deep Search.
// outputFormat:
//   "names-only"    → returns a JSON array of lowercase strings (Deep Search)
//   "with-metadata" → returns a JSON array of {name, reasoning, meaning} (normal gen)
// ---------------------------------------------------------------------------
export type DeepSearchStrategy = "invented" | "compound" | "root+suffix" | "metaphor"

export interface BuildPromptOptions {
  keywords: string
  industry: string
  brandVibe: string
  maxLength: number
  batchSize: number
  outputFormat: "names-only" | "with-metadata"
  alreadySeen?: string[]
  /** Deep Search: which naming strategy to emphasise this batch */
  strategy?: DeepSearchStrategy
  /** Deep Search: names confirmed taken — lets GPT learn which patterns to avoid */
  takenNames?: string[]
}

// ── Vibe-specific naming guidance injected into every generation batch ───────
const VIBE_GUIDANCE: Record<string, string> = {
  playful: `VIBE: PLAYFUL — This is the most important section. Read it carefully.
Playful names must feel alive, warm, and human. They should make someone smile or say "that's clever".

DRAW FROM SENSORY + EMOTIONAL VOCABULARY:
- Textures: fluffy, crisp, silky, bouncy, fizzy, snappy, gooey
- Sounds: pop, snap, zip, whip, ping, buzz, jingle
- Movement: flip, dash, spin, leap, burst, glide, roll
- Warmth: sunny, cozy, golden, bright, glow, bloom
- Delight: sweet, zesty, sparkle, charm, whimsy, joy

PROVEN PLAYFUL NAMING PATTERNS:
- Unexpected real word in a new context: Mailchimp (chimp = fun twist), Hootsuite (hoot = owl + joke)
- Sensory compound: SyrupJoy, FluffyFlip, ButterStack, SunPop
- Action + object: StackFlip, DashCrisp, SnapGlow
- Friendly invented words following natural phonetics: Popsy, Fluffsy, Stackly, Zestify

WHAT GREAT PLAYFUL NAMES FEEL LIKE:
✓ Short vowel sounds (short 'a', 'o', 'u') — pop, snap, hop, fun, buzz
✓ Plosive consonants (p, b, t, k) — crispy, punchy, memorable
✓ Light endings (-sy, -ly, -pop, -snap, -flip, -joy)
✓ They tell a mini-story or create a sensory image

REJECT these "playful" patterns:
✗ Names that are just random invented syllables with no feeling (Vulo, Plopper, Snacko)
✗ Generic + random: "Whippy", "Snappy" with no product connection
✗ Any name that could be mistaken for a tech SaaS brand

MANDATE: Every playful name must have a clear sensory or emotional hook.
The test: can you describe what it smells, tastes, feels, or sounds like?`,

  luxury: `VIBE: LUXURY — Restraint is sophistication. Less is more.

LUXURY NAMING PRINCIPLES:
- Short and elegant: 1-2 syllables ideal (Arc, Prim, Vale, Lune, Sable, Cove)
- French and Latin roots carry prestige: -ier, -eau, -mont, -aux, -ai, -ure
- Nature and geography: Crest, Summit, Ridge, Maison, Villa, Grove, Strand
- Timeless materials and crafts: Grain, Quill, Fold, Lath, Burl, Silk
- Premium feeling words: Meridian, Aven, Crest, Haven, Verdant, Lumière

PROVEN LUXURY PATTERNS: Aesop, Glossier, Kinfolk, Caspian, Maison, Verdant, Penrose, Balmain
REJECT: -ify, -hub, tech compounds, numbers, anything that sounds like software`,

  futuristic: `VIBE: FUTURISTIC — Should feel like it arrived from 10 years ahead, not just "tech".

FUTURISTIC NAMING PRINCIPLES:
- Clean invented CVCV words with forward-momentum feel: Vexa, Nuvra, Synq, Axon, Plex, Flux
- Physics and systems vocabulary: Arc, Vector, Flux, Prism, Core, Node, Helix
- Compound precision words: NexGen (only if both parts have meaning)
- Hard consonants and crisp vowels give a precise, confident feel

WHAT WORKS: Stripe, Linear, Vercel, Brex, Figma, Temporal, Modal, Scale
REJECT: Sci-fi clichés (-tron, -ron, -nix used lazily), anything that feels like a spaceship name`,

  trustworthy: `VIBE: TRUSTWORTHY — Should feel like an institution you already trust.

TRUSTWORTHY NAMING PRINCIPLES:
- Solid, grounded real English words: Anchor, Bedrock, Granite, Pillar, Keystone, Hearth
- Professions and expertise: Charter, Guild, Bureau, Council, Forum, Foundation
- Clear and direct: no wordplay, no puns — clarity signals confidence
- Two-syllable steady names: Comet, Foster, Norton, Beacon, Shield, Harbor

PROVEN PATTERNS: Intuit, Plaid, Stripe, Affirm, Guideline, Gusto, Mercury, Bench
REJECT: Anything cute, pun-based, or that could be confused with a playful brand`,

  minimal: `VIBE: MINIMAL — One idea. Zero noise. Maximum clarity.

MINIMAL NAMING PRINCIPLES:
- 4-6 characters maximum — shorter is stronger
- Single clear concept words: Loop, Beam, Fold, Note, Form, Base, Line, Read
- Geometric and structural: Arc, Cube, Grid, Node, Mesh, Point, Axis
- Nothing decorative — every letter earns its place

PROVEN MINIMAL PATTERNS: Notion, Linear, Loom, Arc, Fig, Pitch, Craft, Plain, Grain, Leaf
REJECT: Compound names, suffixes (-ify, -ly), anything that needs explanation`,
}

const STRATEGY_INSTRUCTIONS: Record<DeepSearchStrategy, string> = {
  invented:
    "THIS BATCH: Focus on clean invented words only (Approach 4). Pure coined words following CVCV, CVCCV, or CVCVC patterns. No real English words, no compounds. Think Figma, Canva, Vercel, Zillow, Brex, Pendo. All names must be ≤7 characters.",
  compound:
    "THIS BATCH: Focus on short compound words only (Approach 3). Two short real English words merged into one. Think Dropbox, Webflow, Mailchimp, Basecamp, Hubspot. Both parts must be recognisable. Total length ≤10 characters.",
  "root+suffix":
    "THIS BATCH: Focus on roots with clean endings (Approach 2). Real word root + natural ending: -ly, -io, -era, -va, -ix, -ify, -ara, -ora, -ova. Think Shopify, Cloudera, Airtable. Root must be instantly recognisable. Do not repeat any suffix used in a previous name.",
  metaphor:
    "THIS BATCH: Focus on evocative real words from adjacent domains (Approach 1). Pick words from nature, physics, mythology, architecture, or craft that carry the right emotional weight for this industry. Think Notion, Slack, Plaid, Mercury, Titan, Arc. No made-up words this batch.",
}

export function buildGenerationPrompt(opts: BuildPromptOptions): { system: string; user: string } {
  const { keywords, industry, brandVibe, maxLength, batchSize, outputFormat, alreadySeen = [], strategy, takenNames = [] } = opts

  const resolved = resolveIndustry(industry)
  const examples = brandExamples[resolved] ?? brandExamples.default

  // Pick 30 random names from the list — varies results between generations
  const selectedExamples = pickRandom(examples.names, 30)
  const anchorExamples = selectedExamples.slice(0, 5).join(", ")

  const seenClause =
    alreadySeen.length > 0
      ? `\nDo NOT suggest any of these already-generated names: ${alreadySeen.slice(0, 50).join(", ")}`
      : ""

  const strategyNote = strategy ? `\n\n${STRATEGY_INSTRUCTIONS[strategy]}` : ""
  const vibeNote = brandVibe && VIBE_GUIDANCE[brandVibe]
    ? `\n\n${VIBE_GUIDANCE[brandVibe]}`
    : ""

  const takenNote =
    takenNames.length > 0
      ? `\n\nPATTERN FEEDBACK — these names were already checked and are TAKEN (avoid similar patterns): ${takenNames.slice(0, 20).join(", ")}`
      : ""

  const deepSearchNote =
    outputFormat === "names-only"
      ? "\nIMPORTANT: These names will be checked for .com availability. Common real English words are almost always taken as .com domains — lean toward invented words and less common combinations. Names must still sound like real brands."
      : ""

  const outputInstruction =
    outputFormat === "names-only"
      ? `Return ONLY a JSON array of lowercase name strings. No explanations, no markdown, no backticks.
Example: ["nimbus", "synqo", "hubflow", "vaultly", "zentro"]`
      : `Return ONLY a JSON array where each item has:
- name: the domain name (lowercase, no extension, no hyphens)
- reasoning: which approach was used and why it works
- meaning: 1-2 sentences: (a) linguistic root/inspiration, (b) brand/industry fit, (c) emotional tone. Max 40 words.
Format: [{"name": "...", "reasoning": "...", "meaning": "..."}, ...]`

  const system = `You are an elite startup naming consultant. You have named companies that went on to raise millions in funding.

STUDY THESE REAL SUCCESSFUL COMPANIES IN THE ${resolved.toUpperCase()} SPACE:
${selectedExamples.join(", ")}

NAMING PATTERNS THAT WORK IN THIS INDUSTRY:
${examples.patterns}

YOUR JOB: Generate names that feel like they belong alongside the examples above. Study the patterns — the length, the rhythm, the sound, the feeling. Your names should feel like natural additions to that list.

NAMING APPROACHES (mix all of these across your batch):

1. REAL WORDS IN NEW CONTEXTS (at least 3 names):
Real English words that take on fresh meaning for this industry.
Like "Notion" = concept, "Slack" = ease, "Plaid" = pattern.
Find words that feel evocative and relevant but aren't literally describing the product.

2. RECOGNIZABLE ROOTS WITH CLEAN ENDINGS (at least 3 names):
Familiar word root + a natural English ending: -er, -en, -le, -al, -ly, -fy, -ry.
Like Render = render, Timber = timber, Figma = figure + form.
The root must be a real, recognizable word. The ending must sound like it belongs on a real English word.
NEVER use fake-Latin endings: -ora, -ova, -ara, -ava, -ium, -yx, -ix. These are AI generator clichés.

3. SHORT COMPOUND WORDS (at least 2 names):
Two short real words combined into one name.
Like Dropbox, Webflow, Mailchimp, Hubspot, Basecamp.
Both words should be common English. Together they hint at the product.

4. CLEAN INVENTED WORDS (at least 2 names):
New words following natural English pronunciation.
Pattern: CVCV, CVCCV, or CVCVC. Every syllable instantly readable.
Like Figma, Canva, Vercel, Zillow, Brex, Pendo.

ABSOLUTE RULES:
- Every name pronounceable on the FIRST try by any English speaker
- Every name has natural vowel-consonant rhythm — say it out loud before including it
- Never generate names that look like typos, misspellings, or keyboard accidents
- Never drop vowels from real words — "cloud" never becomes "cld"
- Never stack 3+ consonants without a vowel (natural clusters like "str", "nch" are fine)
- Never end a name with an awkward cluster like "bsy", "ync", "bnx", "lkz"
- Do not add random letters to real words — "cloudo" is lazy, find something better
- Do not repeat suffix patterns — if one name ends in "-ly", no other name in this batch should
- Each name must feel distinct — no minor variations of each other
- Names must be between 4 and ${maxLength} characters
- Names must be lowercase, single word, no spaces, hyphens, or numbers${seenClause}

REJECT THESE AI-GENERATED NAME PATTERNS — they feel machine-made and will be rejected:
- Fake-Latin: random consonants + -ora, -ova, -era, -ara, -ava (Vexora, Nexova, Zentara, Quantera) ✗
- Sci-fi endings on invented roots: -ix, -rix, -trix, -nix, -vix (Quantrix, Vextrix, Zentrix) ✗
- Meaningless tech-prefixes glued to anything: Nexo-, Zyro-, Axio-, Synq-, Velo-, Zeno- ✗
- Generic tech compounds: DataSync, FlowPulse, SmartHub, TechNest, CodeFlow, CloudX ✗
- Stacking uncommon letters without purpose: z, x, q used just to look unique (Zyxo, Qvelo, Xentra) ✗

THE MEANING ANCHOR — apply to every name before including it:
Every great brand name can complete this sentence: "[Name] comes from [word/concept] and signals [quality/feeling]."
If you cannot complete the sentence, the name is not good enough. Replace it.
✓ Stripe = stripe pattern → precision + clean lines
✓ Notion = a notion/idea → intellectual + flexible
✓ Figma = figure + figment → visual + creative
✓ Loom = a weaving loom → crafting + connection
✗ Zentro — no origin, no meaning → REJECTED
✗ Vexora — fake Latin, no story → REJECTED
✗ Nexio — random syllables → REJECTED

QUALITY TEST — before including any name:
1. Does it feel like it belongs alongside ${anchorExamples}?
2. Would a founder proudly put this on their business card?
3. Can someone hear it once and spell it correctly?
4. Does it have an origin story — a real word, root, or concept behind it?
5. Is it genuinely different from every other name in this batch? (different root, different ending, different feel)

If any answer is no, discard and replace.

BATCH DIVERSITY — critical:
- No two names in the batch may share the same ending pattern (e.g. if one ends "-er", no other name ends "-er")
- No two names may be derived from the same root concept
- The batch must feel like it came from five different creative directions, not one template
- Aim for a MIX: one real word, one compound, one invented, one metaphorical — variety is the signal of quality${vibeNote}${deepSearchNote}${strategyNote}${takenNote}`

  const user = `Generate ${batchSize} unique, brandable startup names.

Keywords: ${keywords}
Industry: ${resolved}
Brand vibe: ${brandVibe || "modern"}
Max length: ${maxLength} characters

${outputInstruction}`

  return { system, user }
}
