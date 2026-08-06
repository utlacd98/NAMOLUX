import type { QuickGenerateVibe } from "@/lib/domainGen/quickGenerate"

export type PremiumGeneratorVibe = "luxury" | "futuristic" | "playful" | "trustworthy" | "minimal"
export type GeneratorPromptExpectation = "generate" | "reject"

export interface GeneratorQualityPrompt {
  id: string
  segment:
    | "b2b"
    | "consumer"
    | "health"
    | "finance"
    | "local"
    | "geographic"
    | "technical"
    | "social-impact"
    | "creative"
    | "edge"
  description: string
  industry: string
  quickVibe: QuickGenerateVibe
  premiumVibe: PremiumGeneratorVibe
  maxLength: number
  rhymeWith?: string
  expectation?: GeneratorPromptExpectation
  relevanceTerms?: readonly string[]
}

/**
 * Regression corpus for the two public naming paths. Prompts are intentionally
 * concrete and varied: the set spans commercial sectors, buyer types, tones,
 * regions, sensitive categories, malformed copy, and hostile/noisy strings.
 */
export const GENERATOR_QUALITY_CORPUS: readonly GeneratorQualityPrompt[] = [
  { id: "ai-scheduling-founders", segment: "b2b", description: "AI scheduling assistant for busy startup founders", industry: "AI & Machine Learning", quickVibe: "tech", premiumVibe: "futuristic", maxLength: 11, relevanceTerms: ["sched", "time", "cal", "meet", "slot"] },
  { id: "cyber-threat-analytics", segment: "technical", description: "cybersecurity analytics platform for enterprise threat detection teams", industry: "Technology", quickVibe: "bold", premiumVibe: "futuristic", maxLength: 11, relevanceTerms: ["cyber", "secure", "threat", "data", "signal"] },
  { id: "family-budgeting", segment: "finance", description: "simple household budgeting and savings app for young families", industry: "Finance", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["budget", "save", "fund", "cash", "family"] },
  { id: "freelance-accounting", segment: "finance", description: "invoice and tax accounting software for independent freelancers", industry: "Finance", quickVibe: "clean", premiumVibe: "minimal", maxLength: 11, relevanceTerms: ["invoice", "tax", "ledger", "cash", "book"] },
  { id: "contract-review-smb", segment: "b2b", description: "contract review workspace for small business legal teams", industry: "Legal & Professional", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["contract", "legal", "law", "brief", "counsel"] },
  { id: "teen-therapy", segment: "health", description: "private online therapy and emotional support for teenagers", industry: "Health & Wellness", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["care", "mind", "calm", "support", "well"] },
  { id: "rural-telehealth", segment: "health", description: "telehealth access for rural patients and community clinics", industry: "Health & Wellness", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["health", "care", "clinic", "vital", "rural"] },
  { id: "biotech-diagnostics", segment: "technical", description: "clinical diagnostics biotech for earlier disease detection", industry: "Health & Wellness", quickVibe: "tech", premiumVibe: "futuristic", maxLength: 12, relevanceTerms: ["clinic", "health", "vital", "detect", "bio"] },
  { id: "shift-worker-meditation", segment: "health", description: "guided meditation and sleep support for night shift workers", industry: "Health & Wellness", quickVibe: "friendly", premiumVibe: "minimal", maxLength: 11, relevanceTerms: ["sleep", "calm", "mind", "rest", "night"] },
  { id: "alpine-skincare", segment: "consumer", description: "premium skincare made with alpine botanicals and mineral water", industry: "Fashion & Beauty", quickVibe: "premium", premiumVibe: "luxury", maxLength: 12, relevanceTerms: ["skin", "alpine", "botan", "flora", "bloom"] },
  { id: "circular-fashion", segment: "consumer", description: "circular fashion label using recycled textiles for city commuters", industry: "Fashion & Beauty", quickVibe: "premium", premiumVibe: "luxury", maxLength: 12, relevanceTerms: ["fashion", "textile", "wear", "thread", "cloth"] },
  { id: "coastal-coffee", segment: "local", description: "neighbourhood coffee roaster and bakery in a coastal town", industry: "Food & Beverage", quickVibe: "friendly", premiumVibe: "minimal", maxLength: 11, relevanceTerms: ["coffee", "roast", "bean", "coast", "brew"] },
  { id: "student-meal-delivery", segment: "consumer", description: "affordable late night meal delivery membership for university students", industry: "Food & Beverage", quickVibe: "playful", premiumVibe: "playful", maxLength: 11, rhymeWith: "munch", relevanceTerms: ["meal", "food", "bite", "dish", "deliver"] },
  { id: "working-dog-treats", segment: "consumer", description: "high protein dog treats for active working breeds", industry: "Pet Care", quickVibe: "bold", premiumVibe: "trustworthy", maxLength: 11, rhymeWith: "bark", relevanceTerms: ["dog", "paw", "pet", "treat", "active"] },
  { id: "urban-cat-sitting", segment: "local", description: "trusted cat sitting service for apartment owners in big cities", industry: "Pet Care", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 11, rhymeWith: "meow", relevanceTerms: ["cat", "pet", "care", "purr", "home"] },
  { id: "postpartum-fitness", segment: "health", description: "gentle postpartum fitness coaching for new mothers", industry: "Sports & Fitness", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["fit", "train", "move", "strength", "care"] },
  { id: "athlete-recovery", segment: "health", description: "sports recovery platform for endurance athletes and physiotherapists", industry: "Sports & Fitness", quickVibe: "bold", premiumVibe: "futuristic", maxLength: 12, relevanceTerms: ["sport", "fit", "train", "recover", "active"] },
  { id: "exam-prep", segment: "consumer", description: "adaptive exam preparation for secondary school students", industry: "Education", quickVibe: "clean", premiumVibe: "minimal", maxLength: 11, relevanceTerms: ["exam", "study", "learn", "class", "skill"] },
  { id: "language-learning", segment: "consumer", description: "practical language learning for recent immigrants and their families", industry: "Education", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["language", "learn", "speak", "class", "skill"] },
  { id: "creator-invoicing", segment: "finance", description: "global invoicing and payment collection for independent creators", industry: "Finance", quickVibe: "clean", premiumVibe: "minimal", maxLength: 11, relevanceTerms: ["invoice", "pay", "cash", "fund", "ledger"] },
  { id: "climate-marketing-agency", segment: "b2b", description: "bold marketing agency focused on climate technology startups", industry: "Marketing & Advertising", quickVibe: "bold", premiumVibe: "futuristic", maxLength: 12, relevanceTerms: ["market", "brand", "climate", "green", "signal"] },
  { id: "family-business-consulting", segment: "b2b", description: "strategy consultancy helping family businesses plan succession", industry: "Consulting & Services", quickVibe: "premium", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["strategy", "guide", "advis", "family", "clarity"] },
  { id: "lisbon-real-estate", segment: "geographic", description: "luxury residential real estate advisory for international buyers in Lisbon", industry: "Real Estate", quickVibe: "premium", premiumVibe: "luxury", maxLength: 12, relevanceTerms: ["estate", "home", "property", "lisbon", "key"] },
  { id: "berlin-renter-proptech", segment: "geographic", description: "transparent rental application platform for tenants in Berlin", industry: "Real Estate", quickVibe: "clean", premiumVibe: "minimal", maxLength: 11, relevanceTerms: ["rent", "home", "tenant", "property", "berlin"] },
  { id: "solo-women-travel", segment: "consumer", description: "safe small group travel for solo women exploring Europe", industry: "Travel & Tourism", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["travel", "trip", "roam", "journey", "safe"] },
  { id: "kenya-eco-safari", segment: "geographic", description: "premium conservation safari company owned by local guides in Kenya", industry: "Travel & Tourism", quickVibe: "premium", premiumVibe: "luxury", maxLength: 12, relevanceTerms: ["safari", "travel", "wild", "guide", "kenya"] },
  { id: "japan-ryokan", segment: "geographic", description: "quiet modern ryokan booking service for design travellers in Japan", industry: "Travel & Tourism", quickVibe: "premium", premiumVibe: "luxury", maxLength: 12, relevanceTerms: ["stay", "travel", "journey", "japan", "quiet"] },
  { id: "artisan-gift-market", segment: "consumer", description: "online marketplace for handmade gifts from independent artisans", industry: "E-commerce", quickVibe: "friendly", premiumVibe: "playful", maxLength: 12, relevanceTerms: ["gift", "craft", "shop", "market", "maker"] },
  { id: "cold-chain-logistics", segment: "b2b", description: "temperature controlled delivery and cold chain logistics for pharmacies", industry: "E-commerce", quickVibe: "bold", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["cold", "chain", "route", "fleet", "ship"] },
  { id: "construction-safety", segment: "b2b", description: "mobile construction safety checks for site managers", industry: "Manufacturing", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["build", "site", "safe", "forge", "craft"] },
  { id: "carbon-accounting", segment: "b2b", description: "auditable carbon accounting for mid market manufacturers", industry: "Sustainability & Green Tech", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["carbon", "climate", "green", "ledger", "audit"] },
  { id: "india-solar-marketplace", segment: "geographic", description: "solar equipment marketplace for installers across India", industry: "Sustainability & Green Tech", quickVibe: "tech", premiumVibe: "futuristic", maxLength: 11, relevanceTerms: ["solar", "sun", "energy", "grid", "india"] },
  { id: "kenya-irrigation", segment: "geographic", description: "low cost smart irrigation tools for small farms in Kenya", industry: "Sustainability & Green Tech", quickVibe: "clean", premiumVibe: "minimal", maxLength: 11, relevanceTerms: ["water", "farm", "grow", "green", "kenya"] },
  { id: "ngo-water-quality", segment: "social-impact", description: "field water quality monitoring for humanitarian organisations", industry: "Nonprofit & Social Impact", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["water", "field", "care", "impact", "aid"] },
  { id: "nonprofit-donor-crm", segment: "social-impact", description: "donor relationship and fundraising platform for small nonprofits", industry: "Nonprofit & Social Impact", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["donor", "fund", "give", "impact", "cause"] },
  { id: "community-volunteers", segment: "social-impact", description: "friendly volunteer coordination app for neighbourhood community groups", industry: "Nonprofit & Social Impact", quickVibe: "friendly", premiumVibe: "playful", maxLength: 12, relevanceTerms: ["volunteer", "community", "join", "help", "neighbour"] },
  { id: "cozy-puzzle-studio", segment: "creative", description: "cozy puzzle game studio making thoughtful games for adults", industry: "Gaming & Esports", quickVibe: "playful", premiumVibe: "playful", maxLength: 11, relevanceTerms: ["game", "play", "puzzle", "quest", "cozy"] },
  { id: "esports-analytics", segment: "technical", description: "real time esports performance analytics for professional teams", industry: "Gaming & Esports", quickVibe: "bold", premiumVibe: "futuristic", maxLength: 11, relevanceTerms: ["game", "score", "arena", "team", "data"] },
  { id: "investigative-podcast", segment: "creative", description: "independent investigative journalism podcast about corporate power", industry: "Entertainment & Media", quickVibe: "bold", premiumVibe: "minimal", maxLength: 12, relevanceTerms: ["story", "press", "voice", "media", "signal"] },
  { id: "finance-newsletter", segment: "finance", description: "plain English finance newsletter for first time investors", industry: "Entertainment & Media", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["finance", "fund", "money", "press", "brief"] },
  { id: "remote-onboarding", segment: "b2b", description: "employee onboarding software for distributed remote teams", industry: "SaaS & Software", quickVibe: "tech", premiumVibe: "futuristic", maxLength: 11, relevanceTerms: ["team", "work", "join", "flow", "remote"] },
  { id: "nurse-recruitment", segment: "health", description: "ethical recruitment marketplace connecting nurses with local hospitals", industry: "Consulting & Services", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["nurse", "care", "health", "talent", "join"] },
  { id: "insurance-claims", segment: "finance", description: "faster transparent insurance claims support for homeowners", industry: "Finance", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["claim", "cover", "safe", "fund", "home"] },
  { id: "mortgage-comparison", segment: "finance", description: "friendly mortgage comparison service for first time home buyers", industry: "Finance", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 12, rhymeWith: "rate", relevanceTerms: ["mortgage", "home", "rate", "fund", "compare"] },
  { id: "rural-auto-repair", segment: "local", description: "honest mobile auto repair service for rural drivers", industry: "Automotive", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["auto", "car", "drive", "motor", "repair"] },
  { id: "ev-charging", segment: "technical", description: "electric vehicle charging network for apartment buildings", industry: "Automotive", quickVibe: "tech", premiumVibe: "futuristic", maxLength: 11, rhymeWith: "volt", relevanceTerms: ["electric", "charge", "volt", "drive", "grid"] },
  { id: "warehouse-robotics", segment: "technical", description: "warehouse robotics that helps small factories move inventory", industry: "Manufacturing", quickVibe: "bold", premiumVibe: "futuristic", maxLength: 12, relevanceTerms: ["robot", "factory", "move", "stock", "forge"] },
  { id: "developer-observability", segment: "technical", description: "developer observability tool for debugging distributed systems", industry: "SaaS & Software", quickVibe: "tech", premiumVibe: "futuristic", maxLength: 11, relevanceTerms: ["debug", "code", "stack", "trace", "signal"] },
  { id: "privacy-saas", segment: "technical", description: "privacy compliance SaaS for European ecommerce teams", industry: "SaaS & Software", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["privacy", "secure", "trust", "guard", "data"] },
  { id: "research-data-collab", segment: "b2b", description: "secure data collaboration workspace for university researchers", industry: "Technology", quickVibe: "tech", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["data", "research", "secure", "share", "grid"] },
  { id: "wedding-planner", segment: "consumer", description: "joyful wedding planning app for multicultural couples", industry: "Creative", quickVibe: "playful", premiumVibe: "playful", maxLength: 11, relevanceTerms: ["wedding", "joy", "plan", "love", "event"] },
  { id: "childcare-network", segment: "local", description: "trusted childcare network for parents and vetted local carers", industry: "Consulting & Services", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["child", "care", "parent", "home", "trust"] },
  { id: "eldercare-family", segment: "health", description: "family coordination and medication support for older adults", industry: "Health & Wellness", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["care", "family", "health", "support", "well"] },
  { id: "restaurant-booking", segment: "local", description: "last minute restaurant booking app for food lovers", industry: "Food & Beverage", quickVibe: "playful", premiumVibe: "playful", maxLength: 11, relevanceTerms: ["food", "table", "dish", "bite", "book"] },
  { id: "indie-music-discovery", segment: "creative", description: "music discovery app for independent artists and curious listeners", industry: "Entertainment & Media", quickVibe: "playful", premiumVibe: "playful", maxLength: 11, rhymeWith: "spotify", relevanceTerms: ["music", "sound", "listen", "artist", "play"] },
  { id: "culture-tickets", segment: "creative", description: "event ticket marketplace for independent theatres and cultural venues", industry: "Entertainment & Media", quickVibe: "friendly", premiumVibe: "playful", maxLength: 12, relevanceTerms: ["event", "ticket", "stage", "show", "venue"] },
  { id: "interior-design", segment: "creative", description: "restrained interior design studio for warm modern homes", industry: "Home & Garden", quickVibe: "premium", premiumVibe: "luxury", maxLength: 12, relevanceTerms: ["home", "interior", "room", "design", "warm"] },
  { id: "adaptive-architecture", segment: "creative", description: "architecture practice specialising in adaptive reuse of old buildings", industry: "Home & Garden", quickVibe: "premium", premiumVibe: "luxury", maxLength: 12, relevanceTerms: ["arch", "build", "home", "frame", "reuse"] },
  { id: "recycled-gold-jewellery", segment: "consumer", description: "fine jewellery made from recycled gold for modern heirlooms", industry: "Fashion & Beauty", quickVibe: "premium", premiumVibe: "luxury", maxLength: 12, relevanceTerms: ["gold", "jewel", "fine", "heir", "gilt"] },
  { id: "curly-hair-beauty", segment: "consumer", description: "inclusive hair care brand for curls coils and textured hair", industry: "Fashion & Beauty", quickVibe: "friendly", premiumVibe: "playful", maxLength: 11, relevanceTerms: ["hair", "curl", "care", "beauty", "coil"] },
  { id: "self-custody-wallet", segment: "finance", description: "simple self custody crypto wallet for cautious beginners", industry: "Blockchain & Crypto", quickVibe: "tech", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["wallet", "crypto", "chain", "vault", "secure"] },
  { id: "factory-quality", segment: "b2b", description: "quality inspection workflow for precision manufacturing teams", industry: "Manufacturing", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["quality", "inspect", "factory", "craft", "forge"] },
  { id: "balcony-gardening", segment: "consumer", description: "small space gardening kits for apartment balconies", industry: "Home & Garden", quickVibe: "friendly", premiumVibe: "playful", maxLength: 11, relevanceTerms: ["garden", "grow", "plant", "leaf", "home"] },
  { id: "public-procurement", segment: "b2b", description: "public procurement workflow for local councils and suppliers", industry: "Legal & Professional", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["public", "council", "contract", "supply", "brief"] },

  // Edge and abuse-shaped inputs. Only truly absent briefs should be rejected;
  // other noisy values must still produce syntactically safe, non-placeholder names.
  { id: "emoji-punctuation-noise", segment: "edge", description: "!!! 🌱 eco $$$ refill ???", industry: "Sustainability & Green Tech", quickVibe: "friendly", premiumVibe: "minimal", maxLength: 10 },
  { id: "keyword-stuffing", segment: "edge", description: "AI AI AI automation software SaaS tool startup platform platform", industry: "AI & Machine Learning", quickVibe: "tech", premiumVibe: "futuristic", maxLength: 10, relevanceTerms: ["ai", "auto", "tech", "logic", "data"] },
  { id: "empty", segment: "edge", description: "", industry: "Other", quickVibe: "friendly", premiumVibe: "minimal", maxLength: 10, expectation: "reject" },
  { id: "whitespace", segment: "edge", description: "      ", industry: "Other", quickVibe: "friendly", premiumVibe: "minimal", maxLength: 10, expectation: "reject" },
  { id: "single-character", segment: "edge", description: "x", industry: "Technology", quickVibe: "tech", premiumVibe: "futuristic", maxLength: 10, expectation: "reject" },
  { id: "numeric-noise", segment: "edge", description: "123 456 789 2026", industry: "Other", quickVibe: "clean", premiumVibe: "minimal", maxLength: 10 },
  { id: "multilingual-french", segment: "geographic", description: "plateforme de santé pour familles rurales au Québec", industry: "Health & Wellness", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["sant", "health", "care", "fam", "rural"] },
  { id: "html-injection-shaped", segment: "edge", description: "<script>alert('x')</script> premium pet care", industry: "Pet Care", quickVibe: "premium", premiumVibe: "luxury", maxLength: 11, relevanceTerms: ["pet", "paw", "care"] },
  { id: "domain-spam", segment: "edge", description: "best-accounting-app.com CHEAP FREE official online 2026", industry: "Finance", quickVibe: "clean", premiumVibe: "trustworthy", maxLength: 11, relevanceTerms: ["account", "ledger", "tax", "cash"] },
  { id: "contradictory-tone", segment: "edge", description: "serious playful luxury budget funeral clown planning app", industry: "Consulting & Services", quickVibe: "bold", premiumVibe: "minimal", maxLength: 12 },
  { id: "repeated-long-brief", segment: "edge", description: `${"sustainable refill delivery for independent neighbourhood shops ".repeat(25)}without plastic`, industry: "Sustainability & Green Tech", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["sustain", "refill", "deliver", "green", "shop"] },
  { id: "welsh-farm-market", segment: "geographic", description: "Welsh language marketplace connecting family farms with local schools", industry: "E-commerce", quickVibe: "friendly", premiumVibe: "trustworthy", maxLength: 12, relevanceTerms: ["welsh", "farm", "market", "school", "local"] },
]

export const GENERATABLE_QUALITY_PROMPTS = GENERATOR_QUALITY_CORPUS.filter(
  (prompt) => (prompt.expectation || "generate") === "generate",
)

export const REJECTED_QUALITY_PROMPTS = GENERATOR_QUALITY_CORPUS.filter(
  (prompt) => prompt.expectation === "reject",
)
