import { describe, expect, it } from "vitest"

import {
  auditQuickRationaleRegistries,
  containsDeniedRationaleClaim,
  QUICK_RATIONALE_ASSOCIATIONS,
  QUICK_RATIONALE_CONCEPTS,
  renderRationaleV2,
  resolveRationaleAssociationId,
  resolveRationaleConceptId,
  resolveReviewedRationaleLocaleForm,
  validateRationalePlan,
  type RationalePlan,
} from "./quickRationale"

/** Frozen copy of the cues emitted by Quick Generate; intentionally no import
 * from quickGenerate so the rationale registry remains cycle-free. */
const REVIEWED_GENERATOR_CUES = [
  "a coastal sense of place",
  "a smoother start at work",
  "a strong sense of place",
  "active progress",
  "adaptive architectural reuse",
  "adaptive cycling progress",
  "allergy-aware dining confidence",
  "auditable carbon accounting",
  "balcony gardening kits",
  "calm and emotional support",
  "career credential recognition",
  "circular packaging reuse",
  "clear mortgage comparison",
  "clearer signals and insight",
  "climate-technology marketing",
  "coastal coffee ritual",
  "coffee craft",
  "community workshop safety",
  "confident electric mobility",
  "confident vehicle service",
  "confidential workplace wellbeing",
  "craft and personal style",
  "creative craft",
  "creative discovery",
  "credible storytelling",
  "dependable ev charging access",
  "dignity and remembrance",
  "direction and confidence",
  "discovery and movement",
  "discreet safety and agency",
  "donor relationship stewardship",
  "easy commerce",
  "ethical nurse recruitment",
  "evidence and collaboration",
  "family support",
  "family-business continuity",
  "fast audio editing",
  "faster scheduling",
  "financial clarity",
  "food and performance nutrition",
  "food and shared enjoyment",
  "forward movement",
  "generosity and measurable impact",
  "healthy growth",
  "household financial clarity",
  "human connection",
  "independent investigative journalism",
  "indie music discovery",
  "intelligent assistance",
  "learning and progress",
  "legal clarity",
  "lisbon buyer advisory",
  "locally guided conservation travel",
  "marine conservation impact",
  "marine monitoring and maintenance",
  "measurable environmental progress",
  "memorable occasions",
  "mobile rural auto repair",
  "neighbourhood repair and reuse",
  "open, respectful wellbeing",
  "orchestra touring coordination",
  "orderly financial work",
  "pharmacy cold-chain delivery",
  "physical progress and recovery",
  "place and considered design",
  "play and discovery",
  "playful puzzle games",
  "positive momentum",
  "practical language learning",
  "precise operations",
  "precision quality inspection",
  "protection and trust",
  "public accountability",
  "quiet ryokan hospitality",
  "real-time esports performance",
  "reassurance and dependable cover",
  "reassuring care",
  "recycled-gold jewellery craft",
  "reliable movement",
  "remote employee onboarding",
  "resilient irrigation and water access",
  "rural quebec healthcare access",
  "rural reach",
  "secure ownership",
  "secure research collaboration",
  "simplicity",
  "slow luxury rail travel",
  "solo women group travel",
  "specialist therapy and everyday progress",
  "student meal delivery",
  "technical fluency",
  "transparent member lending",
  "transparent public procurement",
  "trusted cat care",
  "trusted pet care",
  "trusted water safety",
  "vineyard disease detection",
  "vetted childcare choices",
  "visible hair care and renewal",
  "visible skin care and renewal",
  "warehouse robotic movement",
  "warm restrained interiors",
  "welcoming restaurant reservations",
  "welsh farm-to-school trade",
  "welsh identity",
  // Balanced-60 rows 31-59: job-specific primary cues must never fall back to
  // a broad category profile. Row 60 already uses mobile rural auto repair.
  "founder scheduling assistance",
  "early biotech diagnostics",
  "india solar installer trade",
  "distributed employee onboarding",
  "shared-building ev charging",
  "developer observability",
  "european retail privacy compliance",
  "university research collaboration",
  "beginner self-custody",
  "berlin rental application transparency",
  "freelancer accounting",
  "small-business contract review",
  "rural telehealth reach",
  "adaptive secondary exam readiness",
  "manufacturer carbon accounting",
  "kenya small-farm irrigation",
  "humanitarian field water safety testing",
  "first-investor finance briefing",
  "homeowner claim guidance",
  "council supplier procurement",
  "endpoint threat analytics",
  "working-dog nutrition",
  "endurance athlete recovery",
  "climate startup marketing",
  "pharma cold-chain monitoring",
  "competitive esports analytics",
  "investigative corporate-power podcast",
  "small-factory robotics",
  "factory visual inspection",
  // Balanced-60 rows 1-30 supply-context refinements.
  "private teen emotional support",
  "gentle postpartum fitness",
  "independent artisan gift marketplace",
  "neighbourhood volunteer coordination",
  "inclusive curls-and-coils care",
  "alpine botanical skincare",
  "multicultural wedding planning",
  "late-night student meal membership",
  "last-minute restaurant booking",
] as const

const BANNED_USER_FACING_RATIONALE = /curated naming cue|declared provenance|reviewed evidence|reviewed category|reviewed cue selected|concrete and readable naming element|ordinary literal word used visibly|ph-to-f|ic-to-ik|terminal ic|terminal spelling/i

const ROWS_1_30_PROFILE_CASES = [
  { row: 1, cue: "household financial clarity", word: "prudence", audience: "young families", banned: /general finances|intended customer/i },
  { row: 2, cue: "private teen emotional support", word: "listening", audience: "teenagers", banned: /public voice|public audience|performance|people looking for calm/i },
  { row: 3, cue: "trusted cat care", word: "whisker", audience: "urban apartment owners", banned: /dog|kennel|boarding/i },
  { row: 4, cue: "gentle postpartum fitness", word: "gradual", audience: "new mothers", banned: /sport|athlete|training support/i },
  { row: 5, cue: "ethical nurse recruitment", word: "vocation", audience: "nurses and hiring hospitals", banned: /patients and families|intended customer/i },
  { row: 6, cue: "clear mortgage comparison", word: "deposit", audience: "home buyers", banned: /interior|rental|tenant/i },
  { row: 7, cue: "vetted childcare choices", word: "guardian", audience: "families comparing trustworthy and vetted childcare", banned: /elder|companionship/i },
  { row: 8, cue: "donor relationship stewardship", word: "engagement", audience: "small nonprofit teams", banned: /bequest|endowment|grant|intended customer/i },
  { row: 9, cue: "rural quebec healthcare access", word: "wellbeing", audience: "rural quebec families", banned: /urban|public voice/i },
  { row: 10, cue: "welsh farm-to-school trade", word: "orchard", audience: "welsh farms and local schools", banned: /generic marketplace|intended customer/i },
  { row: 11, cue: "late-night student meal membership", word: "canteen", audience: "university students", banned: /operations teams|intended customer/i },
  { row: 12, cue: "playful puzzle games", word: "riddle", audience: "adult players", banned: /children|makers|design service/i },
  { row: 13, cue: "multicultural wedding planning", word: "betrothal", audience: "multicultural couples", banned: /intended customer|stated category/i },
  { row: 14, cue: "last-minute restaurant booking", word: "brasserie", audience: "food lovers", banned: /general food and shared enjoyment|intended customer/i },
  { row: 15, cue: "indie music discovery", word: "refrain", audience: "independent artists and curious listeners", banned: /generic creative teams|intended customer/i },
  { row: 16, cue: "practical language learning", word: "dialogue", audience: "recent immigrants", banned: /public voice|performance|intended customer/i },
  { row: 17, cue: "independent artisan gift marketplace", word: "keepsake", audience: "shoppers and independent artisans", banned: /buyers and sellers|easy commerce/i },
  { row: 18, cue: "neighbourhood volunteer coordination", word: "belonging", audience: "volunteers and neighbourhood community groups", banned: /intended customer|stated category/i },
  { row: 19, cue: "inclusive curls-and-coils care", word: "ringlet", audience: "curls, coils and textured hair", banned: /renewal|restoration|skin care/i },
  { row: 20, cue: "balcony gardening kits", word: "seedling", audience: "balcony growers", banned: /large farm|intended customer/i },
  { row: 21, cue: "alpine botanical skincare", word: "edelweiss", audience: "skincare customers", banned: /travel|property|interior|hotel|stay/i },
  { row: 22, cue: "coastal coffee ritual", word: "driftwood", audience: "neighbourhood coffee and bakery customers", banned: /travel|property|interior|home buyers/i },
  { row: 23, cue: "family-business continuity", word: "lineage", audience: "family-business owners", banned: /memorial|bereaved/i },
  { row: 24, cue: "lisbon buyer advisory", word: "miradouro", audience: "international home buyers", banned: /tenant|rental|interior design/i },
  { row: 25, cue: "solo women group travel", word: "voyage", audience: "solo women", banned: /property|interior|home buyers/i },
  { row: 26, cue: "locally guided conservation travel", word: "conservancy", audience: "locally owned kenyan guides", banned: /property|interior|generic tour/i },
  { row: 27, cue: "quiet ryokan hospitality", word: "ceremony", audience: "design-conscious travellers", banned: /property|interior service|home buyers/i },
  { row: 28, cue: "warm restrained interiors", word: "joinery", audience: "homeowners seeking restrained modern interiors", banned: /travel|hotel|ryokan|rental application/i },
  { row: 29, cue: "adaptive architectural reuse", word: "palimpsest", audience: "clients restoring existing buildings", banned: /skincare|travel|hotel/i },
  { row: 30, cue: "recycled-gold jewellery craft", word: "goldsmith", audience: "modern jewellery customers", banned: /plated|intended customer/i },
] as const

const RELEASE_PROFILE_CASES = [
  { row: 31, cue: "founder scheduling assistance", word: "timekeeper", audience: "busy startup founders", banned: /generic ai hype|intended customer|stated category/i },
  { row: 32, cue: "early biotech diagnostics", word: "biomarker", audience: "clinical and biotech teams", banned: /patients and families|reassuring care|after birth/i },
  { row: 33, cue: "india solar installer trade", word: "marketplace", audience: "solar installers and equipment suppliers", banned: /buyers and sellers|environmental choices/i },
  { row: 34, cue: "distributed employee onboarding", word: "arrival", audience: "new employees joining distributed teams", banned: /intended customer|stated category/i },
  { row: 35, cue: "shared-building ev charging", word: "kilowatt", audience: "apartment residents and property teams", banned: /drivers looking for dependable charging access/i },
  { row: 36, cue: "developer observability", word: "telemetry", audience: "developers and platform teams", banned: /patients|clinical teams/i },
  { row: 37, cue: "european retail privacy compliance", word: "consent", audience: "european ecommerce teams", banned: /buyers and sellers|easy commerce/i },
  { row: 38, cue: "university research collaboration", word: "evidence", audience: "university researchers", banned: /intended customer|stated category/i },
  { row: 39, cue: "beginner self-custody", word: "keystore", audience: "cautious beginners", banned: /exclusive ownership|intended customer/i },
  { row: 40, cue: "berlin rental application transparency", word: "tenancy", audience: "berlin tenants", banned: /interior|designed home|place and considered design/i },
  { row: 41, cue: "freelancer accounting", word: "bookkeep", audience: "independent freelancers", banned: /technical teams|technical products|technical fluency/i },
  { row: 42, cue: "small-business contract review", word: "redline", audience: "small-business legal and operations teams", banned: /intended customer|stated category/i },
  { row: 43, cue: "rural telehealth reach", word: "reachable", audience: "rural patients and community clinics", banned: /building or joining a community|human connection/i },
  { row: 44, cue: "adaptive secondary exam readiness", word: "mastery", audience: "secondary-school students", banned: /intended customer|stated category/i },
  { row: 45, cue: "manufacturer carbon accounting", word: "inventory", audience: "mid-market manufacturing teams", banned: /intended customer|stated category/i },
  { row: 46, cue: "kenya small-farm irrigation", word: "furrow", audience: "kenyan smallholders", banned: /intended customer|stated category/i },
  { row: 47, cue: "humanitarian field water safety testing", word: "potable", audience: "humanitarian teams", banned: /intended customer|stated category/i },
  { row: 48, cue: "first-investor finance briefing", word: "briefing", audience: "first-time investors", banned: /general finances|intended customer/i },
  { row: 49, cue: "homeowner claim guidance", word: "remedy", audience: "homeowners", banned: /people comparing insurance|intended customer/i },
  { row: 50, cue: "council supplier procurement", word: "tendering", audience: "local councils and suppliers", banned: /intended customer|stated category/i },
  { row: 51, cue: "endpoint threat analytics", word: "firewall", audience: "enterprise threat-detection", banned: /patients|clinical|intended customer/i },
  { row: 52, cue: "working-dog nutrition", word: "nourish", audience: "active working dogs", banned: /people choosing practical nutrition|intended customer/i },
  { row: 53, cue: "endurance athlete recovery", word: "stamina", audience: "endurance athletes and physiotherapists", banned: /after birth|postpartum|mothers?|pregnan/i },
  { row: 54, cue: "climate startup marketing", word: "momentum", audience: "climate-technology founders", banned: /environmental choices|intended customer/i },
  { row: 55, cue: "pharma cold-chain monitoring", word: "thermostat", audience: "pharmacy and logistics teams", banned: /intended customer|stated category/i },
  { row: 56, cue: "competitive esports analytics", word: "scoreboard", audience: "professional esports teams", banned: /intended customer|stated category/i },
  { row: 57, cue: "investigative corporate-power podcast", word: "scrutiny", audience: "public-interest investigative journalism", banned: /intended customer|stated category/i },
  { row: 58, cue: "small-factory robotics", word: "automaton", audience: "small-factory operations teams", banned: /intended customer|stated category/i },
  { row: 59, cue: "factory visual inspection", word: "calibre", audience: "precision-manufacturing quality teams", banned: /intended customer|stated category/i },
  { row: 60, cue: "mobile rural auto repair", word: "roadside", audience: "rural drivers", banned: /intended customer|stated category/i },
] as const

const ROW_31_60_SEMANTIC_VOCABULARY = {
  "founder scheduling assistance": ["timekeeper", "daybook", "timetable", "clockwise", "routine", "sequence", "cadence", "scheduler", "appointment", "calendar"],
  "early biotech diagnostics": ["forerunner", "precursor", "sentinel", "prognosis", "screening", "biomarker", "indicator", "foresight", "vigilance", "forewarning"],
  "india solar installer trade": ["sunbelt", "panel", "installer", "exchange", "marketplace", "sourcing", "wholesale", "network", "sunward", "junction", "catalogue", "inventory", "merchant", "stockist", "distributor", "procure", "equipment", "supplier", "trading", "commerce"],
  "distributed employee onboarding": ["arrival", "orientation", "induction", "reception", "readiness", "welcome", "foyer", "doorway", "onramp", "wayfinding", "threshold", "kickoff"],
  "shared-building ev charging": ["kilowatt", "recharge", "junction", "conduit", "waypoint", "parkade", "carport", "resident", "socket", "outlet", "current"],
  "developer observability": ["telemetry", "visibility", "heartbeat", "aperture", "instrument", "diagnostic", "tracer", "stacktrace", "logbook", "runtime", "console"],
  "european retail privacy compliance": ["consent", "discretion", "boundary", "permission", "compliance", "safeguard", "governance", "trustworthy", "assurance", "confidential", "accountable"],
  "university research collaboration": ["peerwork", "inquiry", "evidence", "synthesis", "consensus", "scholarly", "colloquium", "fellowship", "commons", "archive", "discovery", "dialogue"],
  "beginner self-custody": ["keystore", "lockbox", "sovereign", "autonomy", "control", "masterkey", "stronghold", "ownership", "safekeeping", "keyring"],
  "berlin rental application transparency": ["tenancy", "leasehold", "applicant", "dossier", "paperwork", "doorway", "threshold", "residence", "address", "occupancy", "disclosure", "openness"],
  "freelancer accounting": ["bookkeep", "accrual", "worksheet", "receipt", "journal", "reckoning", "balance", "bookwork", "cashbook", "daybook", "ledger", "filing"],
  "small-business contract review": ["redline", "proviso", "covenant", "accord", "verdict", "legible", "plainspoken", "wording", "termsheet", "fineprint", "clarifier", "readable"],
  "rural telehealth reach": ["reachable", "lifeline", "outreach", "nearness", "connection", "presence", "distance", "coverage", "waypoint", "locality", "reassurance"],
  "adaptive secondary exam readiness": ["mastery", "revision", "readiness", "aptitude", "milestone", "practice", "rehearsal", "coursework", "progress", "workbook", "question"],
  "manufacturer carbon accounting": ["inventory", "baseline", "footprint", "abatement", "veracity", "traceable", "reduction", "accounting", "measure", "ledger", "audittrail", "reckoning"],
  "kenya small-farm irrigation": ["furrow", "reservoir", "aqueduct", "headwater", "catchment", "watercourse", "irrigation", "dripline", "smallholder", "acreage", "harvest", "rainfall"],
  "humanitarian field water safety testing": ["potable", "wellhead", "aquifer", "watershed", "indicator", "fieldwork", "sample", "assay", "testing", "purity", "hygiene", "lucidity"],
  "first-investor finance briefing": ["briefing", "bulletin", "digest", "outlook", "dispatch", "readout", "primer", "explainer", "firstlook", "chronicle", "newsletter"],
  "homeowner claim guidance": ["recourse", "remedy", "settlement", "recovery", "assurance", "safeguard", "indemnity", "adjuster", "guidance", "roadmap", "resolution"],
  "council supplier procurement": ["tendering", "probity", "oversight", "openness", "governance", "compliance", "accountable", "bidding", "sourcing", "supplier", "stewardship", "integrity"],
  "endpoint threat analytics": ["telemetry", "sentinel", "vigilance", "hardening", "firewall", "watchful", "detector", "defender", "tripwire", "forensics", "spectrum"],
  "working-dog nutrition": ["nourish", "vigour", "stamina", "heartiness", "hardiness", "athletic", "muscle", "reward", "rations", "protein", "provisions"],
  "endurance athlete recovery": ["recovery", "restoration", "resilience", "comeback", "stamina", "endurance", "rebound", "mobility", "tenacity", "conditioning", "physiology"],
  "climate startup marketing": ["momentum", "clarion", "mission", "purpose", "traction", "campaign", "advocacy", "resonance", "positioning", "storytelling", "launchpad"],
  "pharma cold-chain monitoring": ["coldstore", "thermostat", "waybill", "refrigerant", "coolant", "preserve", "preservation", "thermic", "temperature", "coldchain", "monitoring", "thermometer"],
  "competitive esports analytics": ["scoreboard", "reflex", "tactical", "ranking", "reaction", "teamplay", "gamecraft", "matchcraft", "prowess", "playbook", "leaderboard", "bracket"],
  "investigative corporate-power podcast": ["scrutiny", "disclosure", "witness", "exposure", "testimony", "watchdog", "reportage", "revelation", "sourcebook", "deepdive", "spotlight"],
  "small-factory robotics": ["automaton", "kinematic", "assembly", "mechanism", "actuator", "machinery", "kinetic", "workcell", "material", "handling", "motion", "automation"],
  "factory visual inspection": ["calibre", "tolerance", "standard", "metric", "benchmark", "exactitude", "metrology", "accuracy", "visual", "eyesight", "inspection", "focus", "aperture"],
  "mobile rural auto repair": ["roadside", "roadworthy", "wrench", "mechanic", "toolbox", "garage", "ignition", "servicing", "callout", "workshop", "breakdown"],
} as const

const ROW_1_30_SEMANTIC_VOCABULARY = {
  "household financial clarity": ["headroom", "nestegg", "provision", "prudence", "margin", "reserve", "allowance", "thrift", "cushion", "steward"],
  "private teen emotional support": ["rapport", "candour", "latitude", "steadfast", "listening", "confidence", "authentic", "breathing", "solace", "agency"],
  "trusted cat care": ["whisker", "fireside", "pounce", "tabby", "pawprint", "hearthside", "whiskered", "purring", "feline", "housecat"],
  "gentle postpartum fitness": ["steadiness", "renewal", "rebalance", "grounded", "gradual", "mobility", "poise", "resurgence", "flourish", "capacity"],
  "ethical nurse recruitment": ["vocation", "calling", "roster", "placement", "profession", "credential", "workforce", "career", "clinician", "opportunity"],
  "clear mortgage comparison": ["foothold", "keystone", "homestead", "doorstep", "deposit", "guidance", "overview", "ratecard", "pathway", "bearings"],
  "vetted childcare choices": ["guardian", "playroom", "daylight", "nurturing", "kinfolk", "shelter", "sanctuary", "caregiving", "trustworthy", "neighbourhood"],
  "donor relationship stewardship": ["stewardship", "engagement", "cultivation", "loyalty", "constancy", "retention", "gratitude", "commitment", "donorship", "supportership"],
  "rural quebec healthcare access": ["proximite", "voisinage", "accessible", "entraide", "bienetre", "familial", "ruralite", "vitalite"],
  "welsh farm-to-school trade": ["harvest", "exchange", "stewardship", "seasonal", "provenance", "schoolyard", "localism", "produce"],
  "late-night student meal membership": ["afterhours", "nightowl", "midnight", "canteen", "takeaway", "platter", "savoury", "snackable", "bitesize", "pantry"],
  "playful puzzle games": ["riddle", "jigsaw", "enigma", "rebus", "mosaic", "conundrum", "brainwave", "tessera"],
  "multicultural wedding planning": ["mosaic", "union", "garland", "jubilee", "promise", "celebrate", "confetti", "harmony", "gathering", "together"],
  "last-minute restaurant booking": ["tonight", "opening", "seating", "supper", "brasserie", "savour", "appetite", "tableware", "dining", "convivial", "bistro", "aperitif", "walkin", "availability", "spontaneous"],
  "indie music discovery": ["chorus", "encore", "refrain", "melody", "sonic", "harmony", "timbre", "rhythm", "sonorous", "soundscape"],
  "practical language learning": ["fluency", "dialogue", "lexicon", "parlance", "vocabulary", "eloquence", "expression", "conversation"],
  "independent artisan gift marketplace": ["keepsake", "curio", "handiwork", "curation", "parcel", "treasure", "showcase", "boutique", "artistry", "atelier"],
  "neighbourhood volunteer coordination": ["neighbourly", "solidarity", "camaraderie", "fellowship", "commons", "coalition", "participation", "goodwill", "together", "alliance", "helpfulness", "civicminded", "voluntary", "service"],
  "inclusive curls-and-coils care": ["ringlet", "tendril", "spiral", "definition", "radiance", "porosity", "lustrous", "textured", "coiled", "crowned"],
  "balcony gardening kits": ["verdant", "seedling", "terrace", "flourish", "greenery", "blossom", "sprouting", "cultivate"],
  "alpine botanical skincare": ["edelweiss", "alpenglow", "glacial", "dewdrop", "serenity", "velvety", "silken", "luminosity", "purity", "softness"],
  "coastal coffee ritual": ["roastery", "crema", "arabica", "espresso", "barista", "cafetiere", "tidewater", "shoreline", "crumb", "seabird"],
  "family-business continuity": ["lineage", "posterity", "continuum", "dynasty", "inheritance", "heritage", "continuance", "stewardship", "progeny", "generational", "forebear", "transition", "successor"],
  "lisbon buyer advisory": ["azulejo", "portico", "quarter", "miradouro", "terracotta", "riverside", "calcada", "estuary", "hillside"],
  "solo women group travel": ["voyage", "roaming", "compass", "odyssey", "passage", "sojourn", "itinerary", "escapade", "coterie", "circle", "cohort", "gather", "kinship"],
  "locally guided conservation travel": ["savanna", "trackway", "horizon", "wildlife", "ecosystem", "migration", "wilderness", "wildlands", "stewardship", "conservancy", "ranger", "wayfinder"],
  "quiet ryokan hospitality": ["tatami", "engawa", "stillness", "lantern", "tranquil", "ceremony", "omotenashi", "kokoro", "washitsu", "welcome", "gracious", "repose"],
  "warm restrained interiors": ["proportion", "palette", "dwelling", "joinery", "ambience", "material", "textural", "spatial", "tonality", "tactile", "harmonious", "composure", "layering", "livability"],
  "adaptive architectural reuse": ["conserve", "continuity", "fabric", "palimpsest", "patina", "reclaim", "renaissance", "revival"],
  "recycled-gold jewellery craft": ["filigree", "precious", "heirloom", "carat", "luminous", "goldsmith", "burnished", "auriferous", "renewal", "recast", "reforged", "enduring", "treasured"],
} as const

const ROW_31_60_CONSTRUCTION_VOCABULARY = [
  "slot", "agenda", "assist", "founder", "time", "early", "marker", "screen", "detect", "bio",
  "solar", "panel", "install", "trade", "india", "welcome", "firstday", "join", "remote", "team",
  "charge", "resident", "garage", "park", "volt", "trace", "debug", "stack", "runtime", "log",
  "privacy", "consent", "retail", "euro", "data", "research", "peer", "share", "proof", "vault",
  "key", "own", "simple", "wallet", "renter", "apply", "berlin", "lease", "clear", "invoice",
  "tax", "solo", "books", "ledger", "clause", "review", "plain", "brief", "terms", "reach",
  "clinic", "rural", "access", "care", "exam", "adapt", "study", "ready", "school", "carbon",
  "audit", "measure", "factory", "drip", "water", "acre", "kenya", "grower", "field", "test",
  "aid", "invest", "news", "market", "first", "claim", "home", "guide", "cover", "help",
  "tender", "council", "supply", "bid", "public", "endpoint", "threat", "signal", "cyber", "canine",
  "protein", "fuel", "active", "paw", "stamina", "recover", "physio", "endure", "mobility", "climate",
  "launch", "brand", "green", "cold", "pharma", "temperature", "track", "route", "esport", "score",
  "arena", "play", "probe", "press", "source", "power", "story", "robot", "stock", "move",
  "small", "inspect", "vision", "gauge", "quality", "repair", "motor", "road", "mobile", "local",
  "open", "sharp", "easy", "shared", "live", "deep", "safe", "fair", "near", "smart", "steady",
  "exact", "true", "guided", "secure", "strong", "fit", "bold", "brave", "honest", "clean",
] as const

const ROW_1_30_COMPOUND_PARTS_BY_CUE = {
  "household financial clarity": [["nest", "wise"], ["pocket", "plan"], ["home", "buffer"], ["family", "fund"]],
  "private teen emotional support": [["voice", "haven"], ["brave", "space"], ["talk", "steady"], ["mind", "harbour"]],
  "trusted cat care": [["purr", "nest"], ["city", "whisker"], ["home", "purr"], ["cat", "kin"]],
  "gentle postpartum fitness": [["gentle", "rise"], ["mama", "stride"], ["steady", "bloom"], ["move", "again"]],
  "ethical nurse recruitment": [["ward", "link"], ["nurse", "match"], ["ward", "match"], ["nurse", "link"]],
  "clear mortgage comparison": [["loan", "lens"], ["rate", "wise"], ["buyer", "view"], ["home", "compare"]],
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
  "lisbon buyer advisory": [["tejo", "home"], ["lisbon", "key"], ["terra", "buyer"], ["tejo", "estate"]],
  "solo women group travel": [["roam", "circle"], ["compass", "crew"], ["roam", "cohort"], ["compass", "roam"]],
  "locally guided conservation travel": [["ranger", "trail"], ["guide", "savanna"], ["kenya", "guide"], ["safari", "trail"]],
  "quiet ryokan hospitality": [["engawa", "stay"], ["tatami", "guest"], ["ryokan", "calm"], ["quiet", "lantern"]],
  "warm restrained interiors": [["warm", "form"], ["quiet", "room"], ["calm", "joinery"], ["material", "home"]],
  "adaptive architectural reuse": [["adapt", "stone"], ["reuse", "atelier"], ["renew", "arch"], ["reuse", "form"]],
  "recycled-gold jewellery craft": [["renew", "carat"], ["gold", "again"], ["heirloom", "gold"], ["carat", "loom"]],
} as const

const ROW_1_30_PHRASE_LEADS_BY_CUE = {
  "household financial clarity": ["steady", "simple", "wise"],
  "private teen emotional support": ["private", "safe", "steady"],
  "trusted cat care": ["trusted", "urban", "attentive"],
  "gentle postpartum fitness": ["gentle", "steady", "ready"],
  "ethical nurse recruitment": ["fair", "local", "trusted"],
  "clear mortgage comparison": ["clear", "first", "fair"],
  "vetted childcare choices": ["trusted", "local", "safe"],
  "donor relationship stewardship": ["lasting", "steady", "true"],
  "rural quebec healthcare access": ["local", "near", "trusted"],
  "welsh farm-to-school trade": ["local", "fair", "shared"],
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
  "lisbon buyer advisory": ["local", "guided", "trusted"],
  "solo women group travel": ["guided", "brave", "shared"],
  "locally guided conservation travel": ["guided", "local", "wild"],
  "quiet ryokan hospitality": ["quiet", "modern", "calm"],
  "warm restrained interiors": ["warm", "quiet", "refined"],
  "adaptive architectural reuse": ["renewed", "adaptive", "lasting"],
  "recycled-gold jewellery craft": ["renewed", "lasting", "precious"],
} as const

const ROW_1_30_ROOTS_BY_CUE = {
  "household financial clarity": ["budget", "save", "pocket", "nest", "plan"],
  "private teen emotional support": ["voice", "listen", "mind", "private", "support"],
  "trusted cat care": ["purr", "city", "home", "whisker", "nest"],
  "gentle postpartum fitness": ["gentle", "move", "mama", "steady", "rise"],
  "ethical nurse recruitment": ["nurse", "ward", "career", "local", "match"],
  "clear mortgage comparison": ["rate", "home", "buyer", "loan", "compare"],
  "vetted childcare choices": ["child", "carer", "local", "vetted", "care"],
  "donor relationship stewardship": ["donor", "steward", "cause", "relation", "supporter"],
  "rural quebec healthcare access": ["soin", "sante", "proche", "village", "famille"],
  "welsh farm-to-school trade": ["fferm", "marchnad", "leol", "cymru", "ysgol"],
  "late-night student meal membership": ["meal", "night", "campus", "pass", "bite"],
  "playful puzzle games": ["puzzle", "logic", "mosaic", "riddle", "cozy"],
  "multicultural wedding planning": ["vow", "weave", "mosaic", "joy", "union"],
  "last-minute restaurant booking": ["table", "seat", "tonight", "dine", "reserve"],
  "indie music discovery": ["indie", "artist", "track", "sound", "listen"],
  "practical language learning": ["speak", "daily", "word", "learn", "family"],
  "independent artisan gift marketplace": ["maker", "gift", "hand", "parcel", "curio"],
  "neighbourhood volunteer coordination": ["help", "local", "hands", "civic", "neighbour"],
  "inclusive curls-and-coils care": ["curl", "coil", "texture", "crown", "care"],
  "balcony gardening kits": ["balcony", "grow", "terrace", "kit", "harvest"],
  "alpine botanical skincare": ["alpine", "mineral", "dew", "flora", "ritual"],
  "coastal coffee ritual": ["roast", "brew", "tide", "shore", "coffee"],
  "family-business continuity": ["legacy", "heir", "future", "kin", "continuity"],
  "lisbon buyer advisory": ["lisbon", "tejo", "home", "key", "guide"],
  "solo women group travel": ["roam", "compass", "journey", "cohort", "passage"],
  "locally guided conservation travel": ["safari", "ranger", "guide", "savanna", "steward"],
  "quiet ryokan hospitality": ["ryokan", "engawa", "tatami", "stay", "quiet"],
  "warm restrained interiors": ["warm", "form", "room", "joinery", "material"],
  "adaptive architectural reuse": ["adapt", "reuse", "heritage", "frame", "renew"],
  "recycled-gold jewellery craft": ["gold", "carat", "renew", "heir", "loom"],
} as const

const ROW_1_30_CONSTRUCTION_VOCABULARY = Array.from(new Set([
  ...Object.values(ROW_1_30_ROOTS_BY_CUE).flat(),
  ...Object.values(ROW_1_30_COMPOUND_PARTS_BY_CUE).flat(2),
  ...Object.values(ROW_1_30_PHRASE_LEADS_BY_CUE).flat(),
]))

function wordCount(value: string): number {
  return value.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0
}

function sentenceCount(value: string): number {
  return value.match(/[^.!?]+[.!?](?:\s|$)/g)?.length ?? 0
}

const timePilotPlan = {
  version: "v2",
  name: "Timepilot",
  conceptId: "scheduling",
  tone: "friendly",
  relevance: "category_evidence",
  construction: { kind: "literal_compound", leftEvidenceId: "left", rightEvidenceId: "right" },
  evidence: [
    { id: "left", surface: "time", associationId: "timing", kind: "visible_part", provenance: "literal" },
    { id: "right", surface: "pilot", associationId: "guidance", kind: "visible_part", provenance: "literal" },
  ],
} satisfies RationalePlan

describe("Quick rationale V2 plans", () => {
  it("covers every reviewed generator cue with a distinct specific profile", () => {
    expect(auditQuickRationaleRegistries(REVIEWED_GENERATOR_CUES)).toEqual([])

    const frozenAudiences = [
      ["household financial clarity", "families managing household money"],
      ["ethical nurse recruitment", "nurses and hiring hospitals"],
      ["rural quebec healthcare access", "rural Quebec families"],
      ["welsh farm-to-school trade", "Welsh farms and local schools"],
      ["student meal delivery", "university students"],
      ["practical language learning", "recent immigrants and their families"],
      ["locally guided conservation travel", "travellers seeking locally guided safaris"],
      ["recycled-gold jewellery craft", "modern jewellery customers"],
      ["warm restrained interiors", "homeowners seeking restrained modern interiors"],
      ["adaptive architectural reuse", "clients restoring existing buildings"],
      ["remote employee onboarding", "new hires and distributed teams"],
      ["secure research collaboration", "university researchers"],
      ["auditable carbon accounting", "manufacturing sustainability teams"],
      ["transparent public procurement", "councils and suppliers"],
      ["climate-technology marketing", "climate-technology founders"],
      ["pharmacy cold-chain delivery", "pharmacy operations teams"],
      ["real-time esports performance", "professional esports teams"],
      ["independent investigative journalism", "editorial teams and public-interest audiences"],
      ["warehouse robotic movement", "small-factory operations teams"],
      ["precision quality inspection", "manufacturing quality teams"],
      ["mobile rural auto repair", "rural drivers"],
      ["clear mortgage comparison", "home buyers comparing mortgage and borrowing options"],
      ["quiet ryokan hospitality", "design-conscious travellers choosing a ryokan in Japan"],
      ["vetted childcare choices", "families comparing trustworthy and vetted childcare"],
      ["playful puzzle games", "adult players choosing games from a cosy puzzle studio"],
      ["indie music discovery", "independent artists and curious listeners"],
      ["balcony gardening kits", "urban and small-space balcony growers using practical kits"],
      ["coastal coffee ritual", "neighbourhood coffee and bakery customers in a coastal town"],
      ["lisbon buyer advisory", "international home buyers seeking local guidance in Lisbon"],
      ["solo women group travel", "solo women seeking safe and supportive group travel"],
      ["donor relationship stewardship", "small nonprofit teams using a donor and fundraising CRM"],
    ] as const

    for (const [cue, audience] of frozenAudiences) {
      const conceptId = resolveRationaleConceptId(cue)
      expect(conceptId, cue).not.toBe("generic")
      expect(QUICK_RATIONALE_CONCEPTS[conceptId].audience, cue).toContain(audience)
    }
  })

  it("routes every balanced-60 row 1-30 cue to its intended reviewed profile", () => {
    for (const item of ROWS_1_30_PROFILE_CASES) {
      const conceptId = resolveRationaleConceptId(item.cue)
      expect(conceptId, `row ${item.row}: ${item.cue}`).not.toBe("generic")
      expect(QUICK_RATIONALE_CONCEPTS[conceptId].audience.toLowerCase(), `row ${item.row}: ${item.cue}`).toContain(item.audience)

      const associationId = resolveRationaleAssociationId(item.word, "generic_curated")
      expect(associationId, `row ${item.row}: ${item.word}`).not.toMatch(/^generic_/)
      const rendered = renderRationaleV2({
        version: "v2",
        name: item.word,
        conceptId,
        tone: "friendly",
        relevance: "category_evidence",
        construction: { kind: "semantic_word", evidenceId: "word" },
        evidence: [{ id: "word", surface: item.word, associationId, kind: "whole_word", provenance: "curated" }],
      })

      expect(rendered.fallback, `row ${item.row}: ${item.word}`).toBe(false)
      expect(rendered.text.toLowerCase(), `row ${item.row}: ${item.word}`).toContain(item.audience)
      expect(rendered.text, `row ${item.row}: ${item.word}`).not.toMatch(item.banned)
      expect(rendered.text, `row ${item.row}: ${item.word}`).not.toMatch(BANNED_USER_FACING_RATIONALE)
      expect(wordCount(rendered.text), `row ${item.row}: ${item.word}`).toBeGreaterThanOrEqual(35)
      expect(wordCount(rendered.text), `row ${item.row}: ${item.word}`).toBeLessThanOrEqual(65)
      expect(sentenceCount(rendered.text), `row ${item.row}: ${item.word}`).toBeGreaterThanOrEqual(2)
      expect(sentenceCount(rendered.text), `row ${item.row}: ${item.word}`).toBeLessThanOrEqual(3)
    }
  })

  it("gives every audited row 1-30 semantic word a reviewed ordinary association", () => {
    const expectedCues = ROWS_1_30_PROFILE_CASES.map((item) => item.cue).sort()
    expect(Object.keys(ROW_1_30_SEMANTIC_VOCABULARY).sort()).toEqual(expectedCues)
    expect(new Set(Object.values(ROW_1_30_SEMANTIC_VOCABULARY).flat()).size).toBe(305)
    const missing: string[] = []
    for (const [cue, words] of Object.entries(ROW_1_30_SEMANTIC_VOCABULARY)) {
      const profileCase = ROWS_1_30_PROFILE_CASES.find((item) => item.cue === cue)
      const conceptId = resolveRationaleConceptId(cue)
      expect(profileCase, cue).toBeDefined()
      expect(conceptId, cue).not.toBe("generic")
      for (const word of words) {
        const associationId = resolveRationaleAssociationId(word, "generic_curated")
        if (associationId.startsWith("generic_")) missing.push(`${cue}: ${word}`)
        else {
          const association = QUICK_RATIONALE_ASSOCIATIONS[associationId].association
          expect(association, `${cue}: ${word}`).not.toMatch(BANNED_USER_FACING_RATIONALE)
          const rendered = renderRationaleV2({
            version: "v2",
            name: word,
            conceptId,
            tone: "friendly",
            relevance: "category_evidence",
            construction: { kind: "semantic_word", evidenceId: "word" },
            evidence: [{ id: "word", surface: word, associationId, kind: "whole_word", provenance: "curated" }],
          })
          expect(rendered.fallback, `${cue}: ${word}`).toBe(false)
          expect(rendered.text, `${cue}: ${word}`).toContain(association)
          expect(rendered.text.toLowerCase(), `${cue}: ${word}`).toContain(profileCase!.audience)
          expect(rendered.text, `${cue}: ${word}`).not.toMatch(profileCase!.banned)
          expect(wordCount(rendered.text), `${cue}: ${word}`).toBeGreaterThanOrEqual(35)
          expect(wordCount(rendered.text), `${cue}: ${word}`).toBeLessThanOrEqual(65)
          expect(sentenceCount(rendered.text), `${cue}: ${word}`).toBeGreaterThanOrEqual(2)
          expect(sentenceCount(rendered.text), `${cue}: ${word}`).toBeLessThanOrEqual(3)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it("gives audited row 1-30 construction parts reviewed ordinary associations", () => {
    const expectedCues = ROWS_1_30_PROFILE_CASES.map((item) => item.cue).sort()
    expect(Object.keys(ROW_1_30_ROOTS_BY_CUE).sort()).toEqual(expectedCues)
    expect(Object.keys(ROW_1_30_PHRASE_LEADS_BY_CUE).sort()).toEqual(expectedCues)
    expect(ROW_1_30_CONSTRUCTION_VOCABULARY).toHaveLength(231)
    const missing: string[] = []
    for (const part of ROW_1_30_CONSTRUCTION_VOCABULARY) {
      const associationId = resolveRationaleAssociationId(part, "generic_literal")
      if (associationId.startsWith("generic_")) missing.push(part)
      else expect(QUICK_RATIONALE_ASSOCIATIONS[associationId].association, part).not.toMatch(BANNED_USER_FACING_RATIONALE)
    }
    expect(missing).toEqual([])
    expect(QUICK_RATIONALE_ASSOCIATIONS[resolveRationaleAssociationId("voice")].association).not.toMatch(/public|performance/i)
  })

  it("keeps shared row 1-30 surfaces on ordinary meanings without niche contamination", () => {
    const cases = [
      ["mind", /thought|reflection|inner life/i, /founder/i],
      ["move", /bodily movement|change of position/i, /routing|operational/i],
      ["flourish", /flourish|renewed momentum/i, /garden|plant/i],
      ["guidance", /advice|direction/i, /claim/i],
      ["stewardship", /responsible care|custodianship/i, /procurement|supplier/i],
      ["gathering", /coming together|shared occasion/i, /restaurant|table/i],
      ["harmony", /balance|accord/i, /musical passage/i],
      ["play", /enjoyable activity|discovery/i, /public voice|performance/i],
      ["care", /attention|responsible care/i, /human care/i],
      ["purity", /clean|unadulterated/i, /field sampling|water-quality/i],
      ["renewal", /new life|restoration/i, /postpartum|balance and steadiness/i],
      ["kenya", /place|local identity/i, /irrigation|acreage/i],
      ["guest", /visitor|hosted/i, /restaurant|prepared table/i],
      ["adapt", /adjusting|repurposing/i, /exam/i],
      ["plan", /preparation|coordination/i, /household budget|spending/i],
      ["reserve", /booked|held|set aside/i, /financial buffer|household/i],
      ["track", /path|piece of music|recorded sequence/i, /operational flow/i],
      ["logic", /reasoning|solving a problem/i, /infrastructure|systems/i],
      ["harbour", /refuge|shelter/i, /property|interior/i],
      ["practice", /exercise|method|custom/i, /qualification|credential/i],
    ] as const

    for (const [surface, expected, banned] of cases) {
      const associationId = resolveRationaleAssociationId(surface, "generic_literal")
      expect(associationId, surface).not.toMatch(/^generic_/)
      const association = QUICK_RATIONALE_ASSOCIATIONS[associationId].association
      expect(association, surface).toMatch(expected)
      expect(association, surface).not.toMatch(banned)
    }
  })

  it("routes every balanced-60 row 31-60 cue to its intended reviewed profile", () => {
    for (const item of RELEASE_PROFILE_CASES) {
      const conceptId = resolveRationaleConceptId(item.cue)
      expect(conceptId, `row ${item.row}: ${item.cue}`).not.toBe("generic")
      expect(QUICK_RATIONALE_CONCEPTS[conceptId].audience.toLowerCase(), `row ${item.row}: ${item.cue}`).toContain(item.audience)

      const associationId = resolveRationaleAssociationId(item.word, "generic_curated")
      expect(associationId, `row ${item.row}: ${item.word}`).not.toMatch(/^generic_/)
      const rendered = renderRationaleV2({
        version: "v2",
        name: item.word,
        conceptId,
        tone: "clean",
        relevance: "category_evidence",
        construction: { kind: "semantic_word", evidenceId: "word" },
        evidence: [{ id: "word", surface: item.word, associationId, kind: "whole_word", provenance: "curated" }],
      })

      expect(rendered.fallback, `row ${item.row}: ${item.word}`).toBe(false)
      expect(rendered.text.toLowerCase(), `row ${item.row}: ${item.word}`).toContain(item.audience)
      expect(rendered.text, `row ${item.row}: ${item.word}`).not.toMatch(item.banned)
      expect(rendered.text, `row ${item.row}: ${item.word}`).not.toMatch(BANNED_USER_FACING_RATIONALE)
      expect(wordCount(rendered.text), `row ${item.row}: ${item.word}`).toBeGreaterThanOrEqual(35)
      expect(wordCount(rendered.text), `row ${item.row}: ${item.word}`).toBeLessThanOrEqual(65)
      expect(sentenceCount(rendered.text), `row ${item.row}: ${item.word}`).toBeGreaterThanOrEqual(2)
      expect(sentenceCount(rendered.text), `row ${item.row}: ${item.word}`).toBeLessThanOrEqual(3)
    }
  })

  it("gives every current row 31-60 semantic word a reviewed ordinary association", () => {
    for (const [cue, words] of Object.entries(ROW_31_60_SEMANTIC_VOCABULARY)) {
      expect(resolveRationaleConceptId(cue), cue).not.toBe("generic")
      for (const word of words) {
        const associationId = resolveRationaleAssociationId(word, "generic_curated")
        expect(associationId, `${cue}: ${word}`).not.toMatch(/^generic_/)
        expect(QUICK_RATIONALE_ASSOCIATIONS[associationId].association, `${cue}: ${word}`).not.toMatch(BANNED_USER_FACING_RATIONALE)
      }
    }
  })

  it("keeps every factory visual-inspection semantic rationale within the release copy gate", () => {
    const cue = "factory visual inspection"
    const conceptId = resolveRationaleConceptId(cue)
    for (const word of ROW_31_60_SEMANTIC_VOCABULARY[cue]) {
      const associationId = resolveRationaleAssociationId(word, "generic_curated")
      const association = QUICK_RATIONALE_ASSOCIATIONS[associationId].association
      const rendered = renderRationaleV2({
        version: "v2",
        name: word,
        conceptId,
        tone: "bold",
        relevance: "category_evidence",
        construction: { kind: "semantic_word", evidenceId: "word" },
        evidence: [{ id: "word", surface: word, associationId, kind: "whole_word", provenance: "curated" }],
      })

      expect(rendered.fallback, word).toBe(false)
      expect(rendered.text, word).toContain(association)
      expect(rendered.text.toLowerCase(), word).toContain("precision-manufacturing quality teams")
      expect(wordCount(rendered.text), word).toBeGreaterThanOrEqual(35)
      expect(wordCount(rendered.text), word).toBeLessThanOrEqual(65)
      expect(sentenceCount(rendered.text), word).toBeGreaterThanOrEqual(2)
      expect(sentenceCount(rendered.text), word).toBeLessThanOrEqual(3)
    }
  })

  it("gives current row 31-60 construction parts reviewed ordinary associations", () => {
    for (const part of ROW_31_60_CONSTRUCTION_VOCABULARY) {
      const associationId = resolveRationaleAssociationId(part, "generic_literal")
      expect(associationId, part).not.toMatch(/^generic_/)
      expect(QUICK_RATIONALE_ASSOCIATIONS[associationId].association, part).not.toMatch(BANNED_USER_FACING_RATIONALE)
    }
    expect(resolveRationaleAssociationId("canine")).toBe("canine_species")
    expect(QUICK_RATIONALE_ASSOCIATIONS.canine_species.association).not.toMatch(/food|reward|nutrition/i)
  })

  it("describes alternate spellings in customer language without exposing mechanics", () => {
    const plans = [
      {
        version: "v2",
        name: "Grafic",
        conceptId: "creativity",
        tone: "bold",
        relevance: "context_only",
        construction: { kind: "alternate_spelling", sourceEvidenceId: "source", rule: "ph_to_f" },
        evidence: [{ id: "source", surface: "graphic", associationId: "generic_sound", kind: "source_word", provenance: "sound" }],
      },
      {
        version: "v2",
        name: "Synchronik",
        conceptId: resolveRationaleConceptId("founder scheduling assistance"),
        tone: "tech",
        relevance: "category_evidence",
        construction: { kind: "alternate_spelling", sourceEvidenceId: "source", rule: "terminal_ic_to_ik" },
        evidence: [{ id: "source", surface: "synchronic", associationId: "time_order", kind: "source_word", provenance: "curated" }],
      },
    ] as const

    for (const plan of plans) {
      const rendered = renderRationaleV2(plan)
      expect(rendered.fallback, plan.name).toBe(false)
      expect(rendered.text, plan.name).toMatch(/spelling|visual form|visual finish/i)
      expect(rendered.text, plan.name).toMatch(/sound|pronunciation/i)
      expect(rendered.text, plan.name).not.toMatch(/ph-to-f|ic-to-ik|terminal|controlled change|mechanic/i)
      expect(wordCount(rendered.text), plan.name).toBeGreaterThanOrEqual(35)
      expect(wordCount(rendered.text), plan.name).toBeLessThanOrEqual(65)
    }
  })

  it("keeps every reviewed niche concise, specific, and free of provenance boilerplate", () => {
    for (const cue of REVIEWED_GENERATOR_CUES) {
      const conceptId = resolveRationaleConceptId(cue)
      const rendered = renderRationaleV2({
        version: "v2",
        name: "Velora",
        conceptId,
        tone: "clean",
        relevance: "context_only",
        construction: { kind: "abstract" },
        evidence: [],
      })

      expect(rendered.fallback, cue).toBe(false)
      expect(wordCount(rendered.text), cue).toBeGreaterThanOrEqual(35)
      expect(wordCount(rendered.text), cue).toBeLessThanOrEqual(65)
      expect(sentenceCount(rendered.text), cue).toBe(3)
      expect(rendered.text.toLowerCase(), cue).toContain(cue.toLowerCase())
      expect(rendered.text.toLowerCase(), cue).toContain(QUICK_RATIONALE_CONCEPTS[conceptId].audience.toLowerCase())
      expect(rendered.text, cue).not.toMatch(BANNED_USER_FACING_RATIONALE)
    }
  })

  it("replays every supported construction from reviewed evidence", () => {
    const plans: RationalePlan[] = [
      timePilotPlan,
      {
        version: "v2",
        name: "Clearpath",
        conceptId: "generic",
        tone: "clean",
        relevance: "context_only",
        construction: { kind: "short_phrase", leftEvidenceId: "left", rightEvidenceId: "right" },
        evidence: [
          { id: "left", surface: "clear", associationId: "generic_literal", kind: "visible_part", provenance: "literal" },
          { id: "right", surface: "path", associationId: "generic_curated", kind: "visible_part", provenance: "curated" },
        ],
      },
      {
        version: "v2",
        name: "Mosaicon",
        conceptId: "creativity",
        tone: "premium",
        relevance: "context_only",
        construction: { kind: "orthographic_fusion", leftEvidenceId: "left", rightEvidenceId: "right", overlap: "ic" },
        evidence: [
          { id: "left", surface: "mosaic", associationId: "mosaic", kind: "source_word", provenance: "literal" },
          { id: "right", surface: "icon", associationId: "generic_sound", kind: "source_word", provenance: "sound" },
        ],
      },
      {
        version: "v2",
        name: "Mosaic",
        conceptId: "insight",
        tone: "premium",
        relevance: "category_evidence",
        construction: { kind: "semantic_word", evidenceId: "word" },
        evidence: [{ id: "word", surface: "mosaic", associationId: "mosaic", kind: "whole_word", provenance: "curated" }],
      },
      {
        version: "v2",
        name: "Grafic",
        conceptId: "creativity",
        tone: "bold",
        relevance: "context_only",
        construction: { kind: "alternate_spelling", sourceEvidenceId: "source", rule: "ph_to_f" },
        evidence: [{ id: "source", surface: "graphic", associationId: "generic_sound", kind: "source_word", provenance: "sound" }],
      },
      {
        version: "v2",
        name: "Liensante",
        conceptId: "health",
        tone: "friendly",
        relevance: "category_evidence",
        construction: { kind: "locale_form", localeId: "fr-CA", formId: "liensante" },
        evidence: [],
      },
      {
        version: "v2",
        name: "Velora",
        conceptId: "generic",
        tone: "clean",
        relevance: "context_only",
        construction: { kind: "abstract" },
        evidence: [],
      },
    ]

    for (const plan of plans) {
      expect(validateRationalePlan(plan), plan.name).toMatchObject({ ok: true })
      const rendered = renderRationaleV2(plan)
      expect(rendered.fallback, plan.name).toBe(false)
      expect(rendered.frames, plan.name).toHaveLength(4)
      expect(wordCount(rendered.text), plan.name).toBeGreaterThanOrEqual(35)
      expect(wordCount(rendered.text), plan.name).toBeLessThanOrEqual(65)
      expect(sentenceCount(rendered.text), plan.name).toBeGreaterThanOrEqual(2)
      expect(sentenceCount(rendered.text), plan.name).toBeLessThanOrEqual(3)
      expect(rendered.text, plan.name).not.toMatch(BANNED_USER_FACING_RATIONALE)
    }
  })

  it("fails closed when visible construction cannot be replayed", () => {
    const invalidCompound = { ...timePilotPlan, name: "Timeharbor" }
    const result = validateRationalePlan(invalidCompound)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues).toContainEqual({ code: "construction_mismatch", path: "plan.name" })

    const invalidFusion = {
      version: "v2",
      name: "Mosaicore",
      conceptId: "creativity",
      tone: "premium",
      relevance: "context_only",
      construction: { kind: "orthographic_fusion", leftEvidenceId: "left", rightEvidenceId: "right", overlap: "ic" },
      evidence: [
        { id: "left", surface: "mosaic", associationId: "mosaic", kind: "source_word", provenance: "literal" },
        { id: "right", surface: "core", associationId: "generic_sound", kind: "source_word", provenance: "sound" },
      ],
    }
    const fusionResult = validateRationalePlan(invalidFusion)
    expect(fusionResult.ok).toBe(false)
    if (!fusionResult.ok) expect(fusionResult.issues.some((issue) => issue.code === "construction_mismatch")).toBe(true)
  })

  it("rejects unknown registry IDs, references, and association-to-surface inventions", () => {
    const unknownConcept = validateRationalePlan({ ...timePilotPlan, conceptId: "magic_growth" })
    expect(unknownConcept.ok).toBe(false)
    if (!unknownConcept.ok) expect(unknownConcept.issues.some((issue) => issue.code === "invalid_concept_id")).toBe(true)

    const unknownAssociation = structuredClone(timePilotPlan) as unknown as Record<string, unknown>
    ;(unknownAssociation.evidence as Array<Record<string, unknown>>)[0].associationId = "invented_etymology"
    const associationResult = validateRationalePlan(unknownAssociation)
    expect(associationResult.ok).toBe(false)
    if (!associationResult.ok) expect(associationResult.issues.some((issue) => issue.code === "unknown_association_id")).toBe(true)

    const wrongSurface = structuredClone(timePilotPlan) as unknown as Record<string, unknown>
    ;(wrongSurface.evidence as Array<Record<string, unknown>>)[0].surface = "miracle"
    const surfaceResult = validateRationalePlan(wrongSurface)
    expect(surfaceResult.ok).toBe(false)
    if (!surfaceResult.ok) expect(surfaceResult.issues.some((issue) => issue.code === "association_surface_mismatch")).toBe(true)

    const missingReference = structuredClone(timePilotPlan) as unknown as Record<string, unknown>
    ;(missingReference.construction as Record<string, unknown>).leftEvidenceId = "missing"
    const referenceResult = validateRationalePlan(missingReference)
    expect(referenceResult.ok).toBe(false)
    if (!referenceResult.ok) expect(referenceResult.issues.some((issue) => issue.code === "unknown_evidence_reference")).toBe(true)
  })

  it("never accepts or reflects a raw brief, PII canary, or model-authored rationale", () => {
    const first = {
      ...timePilotPlan,
      rawBrief: "Alice Canary alice@example.com 07123456789 needs debt help",
      modelRationale: "Guaranteed returns and a unique trademark.",
    }
    const second = {
      ...timePilotPlan,
      rawBrief: "Bob Canary bob@example.net has a private diagnosis",
      modelRationale: "This name means perfect health.",
    }
    const firstRendered = renderRationaleV2(first)
    const secondRendered = renderRationaleV2(second)

    expect(firstRendered.fallback).toBe(true)
    expect(secondRendered.fallback).toBe(true)
    expect(firstRendered.text).toBe(secondRendered.text)
    expect(firstRendered.text).not.toMatch(/Alice|Bob|example|07123456789|diagnosis|debt/i)
    expect(firstRendered.validationIssues.some((issue) => issue.path === "plan.rawBrief")).toBe(true)
    expect(firstRendered.validationIssues.some((issue) => issue.path === "plan.modelRationale")).toBe(true)
  })

  it("denies free-form claims instead of laundering them through a rationale", () => {
    const injected = {
      ...timePilotPlan,
      claim: "Guaranteed to be trademarkable with an available domain",
    }
    const rendered = renderRationaleV2(injected)
    expect(rendered.fallback).toBe(true)
    expect(rendered.text).not.toMatch(/guarantee|trademark|available domain/i)
    expect(containsDeniedRationaleClaim("Guaranteed returns")).toBe(true)
    expect(containsDeniedRationaleClaim("This cures anxiety")).toBe(true)
    expect(containsDeniedRationaleClaim("A considered naming direction")).toBe(false)
    expect(auditQuickRationaleRegistries()).toEqual([])
  })

  it("admits only exact reviewed locale forms and compatible concept profiles", () => {
    const reviewed = {
      version: "v2",
      name: "Liensante",
      conceptId: "health",
      tone: "friendly",
      relevance: "category_evidence",
      construction: { kind: "locale_form", localeId: "fr-CA", formId: "liensante" },
      evidence: [],
    } satisfies RationalePlan
    const rendered = renderRationaleV2(reviewed)
    expect(rendered.fallback).toBe(false)
    expect(rendered.text).toMatch(/French \(Quebec\)/)
    expect(rendered.text).toMatch(/“lien”/)
    expect(rendered.text).toMatch(/“sante”/)

    const fabricated = validateRationalePlan({
      ...reviewed,
      name: "Santesoleil",
      construction: { kind: "locale_form", localeId: "fr-CA", formId: "santesoleil" },
    })
    expect(fabricated.ok).toBe(false)
    if (!fabricated.ok) expect(fabricated.issues.some((issue) => issue.code === "unknown_locale_form")).toBe(true)

    const wrongCategory = validateRationalePlan({ ...reviewed, conceptId: "technology" })
    expect(wrongCategory.ok).toBe(false)
    if (!wrongCategory.ok) expect(wrongCategory.issues.some((issue) => issue.code === "locale_concept_mismatch")).toBe(true)
  })

  it("keeps health and financial rationales away from outcome claims", () => {
    const carePlan = {
      version: "v2",
      name: "Carepulse",
      conceptId: "health",
      tone: "friendly",
      relevance: "category_evidence",
      construction: { kind: "literal_compound", leftEvidenceId: "left", rightEvidenceId: "right" },
      evidence: [
        { id: "left", surface: "care", associationId: "care", kind: "visible_part", provenance: "literal" },
        { id: "right", surface: "pulse", associationId: "health", kind: "visible_part", provenance: "literal" },
      ],
    } satisfies RationalePlan
    const health = renderRationaleV2(carePlan)
    const finance = renderRationaleV2({
      version: "v2",
      name: "Ledgerpath",
      conceptId: "finance",
      tone: "clean",
      relevance: "category_evidence",
      construction: { kind: "literal_compound", leftEvidenceId: "left", rightEvidenceId: "right" },
      evidence: [
        { id: "left", surface: "ledger", associationId: "finance", kind: "visible_part", provenance: "literal" },
        { id: "right", surface: "path", associationId: "generic_curated", kind: "visible_part", provenance: "curated" },
      ],
    })

    expect(health.fallback).toBe(false)
    expect(finance.fallback).toBe(false)
    expect(`${health.text} ${finance.text}`).not.toMatch(/guarantee|cure|treat|diagnos|clinically|returns?|risk[- ]free/i)
    expect(health.text).toMatch(/sensitive category/i)
  })

  it("is specific about construction, ordinary association, audience, and category", () => {
    const rendered = renderRationaleV2(timePilotPlan)
    expect(rendered.fallback).toBe(false)
    expect(rendered.text).toMatch(/“time”/i)
    expect(rendered.text).toMatch(/“pilot”/i)
    expect(rendered.text).toMatch(/coordination|timing/i)
    expect(rendered.text).toMatch(/advice|direction|practical next step/i)
    expect(rendered.text).toMatch(/busy calendars/i)
    expect(rendered.text).toMatch(/time coordination|scheduling/i)
    expect(rendered.frames).toHaveLength(4)
    expect(new Set(rendered.frames).size).toBe(4)
    expect(resolveRationaleConceptId("Faster scheduling")).toBe("cue:faster scheduling")
    expect(resolveRationaleConceptId("untrusted raw prose from a model")).toBe("generic")
    expect(resolveRationaleAssociationId("time")).toBe("timing")
    expect(resolveRationaleAssociationId("unreviewedword", "generic_sound")).toBe("generic_sound")
    expect(resolveReviewedRationaleLocaleForm("Liensante", "fr-CA")).toEqual({ localeId: "fr-CA", formId: "liensante" })
    expect(resolveReviewedRationaleLocaleForm("inventedlocaleform")).toBeNull()
  })

  it("selects frame variants deterministically while avoiding one repeated template", () => {
    const names = ["Velora", "Quivra", "Novara", "Lumero", "Soreva", "Talivo", "Rinova", "Elvaro"]
    const renders = names.map((name) => renderRationaleV2({
      version: "v2",
      name,
      conceptId: "technology",
      tone: "tech",
      relevance: "context_only",
      construction: { kind: "abstract" },
      evidence: [],
    }))
    const repeat = renderRationaleV2({
      version: "v2",
      name: names[0],
      conceptId: "technology",
      tone: "tech",
      relevance: "context_only",
      construction: { kind: "abstract" },
      evidence: [],
    })

    expect(renders.every((rendered) => !rendered.fallback && rendered.frames.length === 4)).toBe(true)
    expect(repeat).toEqual(renders[0])
    expect(new Set(renders.map((rendered) => rendered.variantIds.join("-"))).size).toBeGreaterThanOrEqual(4)
    expect(new Set(renders.map((rendered) => rendered.text)).size).toBe(names.length)
    expect(new Set(renders.map((rendered) => rendered.text.split(".")[0])).size).toBeGreaterThanOrEqual(2)
    expect(renders.every((rendered) => !BANNED_USER_FACING_RATIONALE.test(rendered.text))).toBe(true)
  })
})
