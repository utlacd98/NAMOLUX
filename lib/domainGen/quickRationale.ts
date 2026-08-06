/**
 * Reviewed, deterministic rationale rendering for Quick Generate.
 *
 * This module deliberately has no `brief`, `prompt`, or model-authored prose
 * input. A caller may select reviewed registry IDs and provide only the
 * visible pieces needed to replay a candidate's construction. Unknown fields,
 * IDs, or constructions fail closed to a neutral explanation.
 */

export const QUICK_RATIONALE_VERSION = "v2" as const

export const QUICK_RATIONALE_TONES = ["friendly", "playful", "premium", "tech", "clean", "bold"] as const
export type RationaleTone = (typeof QUICK_RATIONALE_TONES)[number]

type Sensitivity = "none" | "health" | "financial" | "legal" | "memorial" | "security"

interface ConceptDefinition {
  cue: string
  fit: string
  audience: string
  sensitivity: Sensitivity
}

/**
 * A compact set of reviewed commercial profiles. The cue-alias registry below
 * maps the more granular cues currently emitted by Quick Generate onto these
 * profiles, avoiding a second copy of the generator's large matching corpus.
 */
const LEGACY_RATIONALE_CONCEPTS = {
  generic: {
    cue: "the stated category",
    fit: "a clear and memorable first impression",
    audience: "the intended customer",
    sensitivity: "none",
  },
  scheduling: {
    cue: "time coordination",
    fit: "a capable impression around simpler scheduling",
    audience: "people coordinating busy calendars",
    sensitivity: "none",
  },
  celebration: {
    cue: "memorable occasions",
    fit: "an upbeat impression without losing practical clarity",
    audience: "people planning important occasions",
    sensitivity: "none",
  },
  security: {
    cue: "risk awareness and control",
    fit: "a measured, dependable impression",
    audience: "teams evaluating security tools",
    sensitivity: "security",
  },
  insight: {
    cue: "clearer signals and evidence",
    fit: "a focused impression around finding the next useful action",
    audience: "people working with complex information",
    sensitivity: "none",
  },
  finance: {
    cue: "financial clarity",
    fit: "an orderly and transparent impression",
    audience: "people making money decisions",
    sensitivity: "financial",
  },
  legal: {
    cue: "document clarity",
    fit: "a precise and considered impression",
    audience: "people reviewing consequential documents",
    sensitivity: "legal",
  },
  health: {
    cue: "reassuring care",
    fit: "a calm and credible first impression",
    audience: "people considering sensitive care options",
    sensitivity: "health",
  },
  wellbeing: {
    cue: "personal wellbeing",
    fit: "a respectful and approachable impression",
    audience: "people exploring personal support",
    sensitivity: "health",
  },
  family: {
    cue: "family support",
    fit: "a warm and dependable impression",
    audience: "families comparing important services",
    sensitivity: "none",
  },
  beauty: {
    cue: "care, ritual and renewal",
    fit: "a considered and sensorial impression",
    audience: "customers comparing personal-care brands",
    sensitivity: "none",
  },
  craft: {
    cue: "materials and craft",
    fit: "a distinctive impression with room for a strong visual identity",
    audience: "design-conscious customers",
    sensitivity: "none",
  },
  food: {
    cue: "food and shared enjoyment",
    fit: "an inviting and easy-to-recall impression",
    audience: "people choosing what to eat or drink",
    sensitivity: "none",
  },
  pet_care: {
    cue: "trusted pet care",
    fit: "a friendly but practical impression",
    audience: "pet owners comparing care options",
    sensitivity: "none",
  },
  learning: {
    cue: "learning and progress",
    fit: "an encouraging impression without unnecessary pressure",
    audience: "learners and the people supporting them",
    sensitivity: "none",
  },
  travel: {
    cue: "discovery and movement",
    fit: "an inviting impression that still feels useful",
    audience: "travellers comparing experiences",
    sensitivity: "none",
  },
  climate: {
    cue: "environmental progress",
    fit: "a practical and forward-looking impression",
    audience: "people evaluating environmental choices",
    sensitivity: "none",
  },
  property: {
    cue: "place and considered design",
    fit: "a grounded and visually distinctive impression",
    audience: "people making decisions about spaces and property",
    sensitivity: "financial",
  },
  commerce: {
    cue: "discovery and exchange",
    fit: "a straightforward impression around finding and choosing",
    audience: "buyers and sellers",
    sensitivity: "none",
  },
  logistics: {
    cue: "reliable movement",
    fit: "a capable impression around visibility and coordination",
    audience: "operations teams moving goods or services",
    sensitivity: "none",
  },
  industry: {
    cue: "precise operations",
    fit: "a practical and capable impression",
    audience: "industrial and manufacturing teams",
    sensitivity: "none",
  },
  technology: {
    cue: "technical fluency",
    fit: "a modern impression without forced jargon",
    audience: "people evaluating technical products",
    sensitivity: "none",
  },
  creativity: {
    cue: "creative expression",
    fit: "an expressive impression with room for visual character",
    audience: "creative teams and their audiences",
    sensitivity: "none",
  },
  agriculture: {
    cue: "cultivation and visible progress",
    fit: "a grounded and practical impression",
    audience: "growers and agricultural partners",
    sensitivity: "none",
  },
  community: {
    cue: "human connection",
    fit: "an inclusive and useful impression",
    audience: "people building or joining a community",
    sensitivity: "none",
  },
  mobility: {
    cue: "confident movement",
    fit: "a capable and contemporary impression",
    audience: "people choosing mobility services",
    sensitivity: "none",
  },
  research: {
    cue: "evidence and collaboration",
    fit: "a rigorous but accessible impression",
    audience: "researchers and their partners",
    sensitivity: "none",
  },
  civic: {
    cue: "public accountability",
    fit: "a transparent and dependable impression",
    audience: "public teams, suppliers and communities",
    sensitivity: "legal",
  },
  fitness: {
    cue: "physical progress and recovery",
    fit: "an encouraging and capable impression",
    audience: "people comparing training and recovery support",
    sensitivity: "health",
  },
  nonprofit: {
    cue: "generosity and visible impact",
    fit: "a purposeful and trustworthy impression",
    audience: "supporters and community organisations",
    sensitivity: "financial",
  },
  workplace: {
    cue: "a smoother start at work",
    fit: "a clear and welcoming impression",
    audience: "new hires and distributed teams",
    sensitivity: "none",
  },
  insurance: {
    cue: "reassurance and dependable cover",
    fit: "a calm and navigable impression",
    audience: "people comparing cover or managing a claim",
    sensitivity: "financial",
  },
  heritage: {
    cue: "continuity and stewardship",
    fit: "a considered and forward-looking impression",
    audience: "families and organisations planning for continuity",
    sensitivity: "financial",
  },
  memorial: {
    cue: "dignity and remembrance",
    fit: "a calm and respectful impression",
    audience: "families making a sensitive decision",
    sensitivity: "memorial",
  },
  water: {
    cue: "water access and field evidence",
    fit: "a clear and practical impression",
    audience: "communities and field teams making water decisions",
    sensitivity: "health",
  },
  nutrition: {
    cue: "food and active nutrition",
    fit: "an energetic but credible impression",
    audience: "people choosing practical nutrition products",
    sensitivity: "health",
  },
} as const satisfies Record<string, ConceptDefinition>

interface ReviewedCueProfile {
  fit: string
  audience: string
  sensitivity: Sensitivity
}

/**
 * One reviewed profile per cue emitted by Quick Generate. Keeping these cues
 * distinct prevents a household-budgeting rationale from collapsing into a
 * generic finance explanation, or a ryokan rationale into generic travel.
 */
export const QUICK_RATIONALE_CUE_PROFILES = {
  "a coastal sense of place": { fit: "a refined impression rooted in coastal character", audience: "travellers and buyers drawn to a distinctive coastal setting", sensitivity: "none" },
  "a smoother start at work": { fit: "a welcoming impression around a clear first day", audience: "new employees starting with an unfamiliar team", sensitivity: "none" },
  "a strong sense of place": { fit: "a grounded impression tied to a memorable location", audience: "people choosing a place-led product, service or experience", sensitivity: "none" },
  "active progress": { fit: "an energetic impression around steady physical momentum", audience: "people building an active routine or training habit", sensitivity: "health" },
  "adaptive architectural reuse": { fit: "a considered balance of retained heritage and purposeful renewal", audience: "clients restoring existing buildings", sensitivity: "none" },
  "adaptive cycling progress": { fit: "an encouraging impression around sustainable riding progress", audience: "amateur and adaptive riders preparing for a demanding distance", sensitivity: "health" },
  "adaptive secondary exam readiness": { fit: "an encouraging impression around practice that responds to visible progress", audience: "secondary-school students preparing for exams and the educators supporting them", sensitivity: "none" },
  "allergy-aware dining confidence": { fit: "a careful impression around informed restaurant choice", audience: "adults navigating serious food allergies when dining out", sensitivity: "health" },
  "alpine botanical skincare": { fit: "a refined impression around alpine botanicals, mineral freshness and considered skin ritual", audience: "skincare customers choosing a premium botanical formula", sensitivity: "none" },
  "auditable carbon accounting": { fit: "a rigorous impression around measurable environmental records", audience: "manufacturing sustainability teams", sensitivity: "none" },
  "balcony gardening kits": { fit: "a practical impression around growing well in limited space", audience: "urban and small-space balcony growers using practical kits", sensitivity: "none" },
  "berlin rental application transparency": { fit: "a clear impression around an accountable rental-application process", audience: "Berlin tenants navigating rental applications", sensitivity: "financial" },
  "calm and emotional support": { fit: "a private, respectful impression around seeking emotional support", audience: "people looking for calm and credible emotional support", sensitivity: "health" },
  "career credential recognition": { fit: "a credible impression around restoring professional standing", audience: "displaced professionals rebuilding recognised careers", sensitivity: "none" },
  "circular packaging reuse": { fit: "a practical impression around an easy return-and-reuse loop", audience: "restaurants and customers using returnable takeaway packaging", sensitivity: "none" },
  "clear mortgage comparison": { fit: "a transparent impression around comparing rates and borrowing choices", audience: "home buyers comparing mortgage and borrowing options", sensitivity: "financial" },
  "clearer signals and insight": { fit: "a focused impression around turning complex data into useful action", audience: "teams interpreting analytics, diagnostics or operational signals", sensitivity: "none" },
  "climate startup marketing": { fit: "a confident impression around communicating credible climate-technology momentum", audience: "climate-technology founders choosing a specialist marketing partner", sensitivity: "none" },
  "climate-technology marketing": { fit: "a credible impression around communicating climate progress", audience: "climate-technology founders explaining their work to buyers and investors", sensitivity: "none" },
  "coastal coffee ritual": { fit: "a warm impression around roasting, baking and distinctive coastal character", audience: "neighbourhood coffee and bakery customers in a coastal town", sensitivity: "none" },
  "coffee craft": { fit: "a sensorial impression around roasting skill and origin", audience: "coffee drinkers choosing a considered roaster or cafe", sensitivity: "none" },
  "community workshop safety": { fit: "an approachable impression around practical maker-space safety", audience: "makers, volunteers and tutors sharing community workshops", sensitivity: "none" },
  "confident electric mobility": { fit: "a capable impression around accessible electric travel", audience: "drivers and fleets choosing electric-mobility services", sensitivity: "none" },
  "confident vehicle service": { fit: "a dependable impression around clear and capable vehicle care", audience: "drivers comparing repair and maintenance services", sensitivity: "none" },
  "confidential workplace wellbeing": { fit: "a private and informed impression around practical workplace support", audience: "shift workers and managers navigating menopause at work", sensitivity: "health" },
  "craft and personal style": { fit: "a distinctive impression around considered materials and lasting design", audience: "customers choosing fashion, textiles or jewellery with a point of view", sensitivity: "none" },
  "creative craft": { fit: "a hands-on impression around expressive and skilful making", audience: "makers and customers seeking characterful crafted work", sensitivity: "none" },
  "creative discovery": { fit: "a curious impression around finding and shaping new ideas", audience: "creative teams exploring concepts, media or design directions", sensitivity: "none" },
  "competitive esports analytics": { fit: "a responsive impression around turning live play into useful competitive insight", audience: "professional esports teams reviewing performance", sensitivity: "none" },
  "credible storytelling": { fit: "an editorial impression around clear and trustworthy narrative", audience: "audiences choosing journalism, publishing or story-led media", sensitivity: "none" },
  "council supplier procurement": { fit: "a transparent impression around tender workflows that withstand public scrutiny", audience: "local councils and suppliers working through procurement", sensitivity: "legal" },
  "dependable ev charging access": { fit: "a reliable impression around finding and using charging infrastructure", audience: "electric-vehicle drivers looking for dependable charging access", sensitivity: "none" },
  "developer observability": { fit: "a technically credible impression around tracing failures across distributed systems", audience: "developers and platform teams debugging distributed software", sensitivity: "none" },
  "dignity and remembrance": { fit: "a calm and respectful impression around memory and practical care", audience: "bereaved families making funeral or memorial decisions", sensitivity: "memorial" },
  "direction and confidence": { fit: "a decisive impression that helps an unfamiliar offer feel navigable", audience: "people encountering a new brand and deciding where it can take them", sensitivity: "none" },
  "discovery and movement": { fit: "an inviting impression around considered exploration", audience: "travellers choosing a guided or socially supportive journey", sensitivity: "none" },
  "discreet safety and agency": { fit: "a private impression that respects self-directed safety planning", audience: "people seeking support while leaving coercive relationships", sensitivity: "health" },
  "distributed employee onboarding": { fit: "a welcoming impression around a clear and coordinated first day", audience: "new employees joining distributed teams", sensitivity: "none" },
  "donor relationship stewardship": { fit: "a credible impression around sustaining donor relationships and organised follow-up", audience: "small nonprofit teams using a donor and fundraising CRM", sensitivity: "financial" },
  "easy commerce": { fit: "a straightforward impression around finding, choosing and exchanging", audience: "buyers and sellers using a focused marketplace", sensitivity: "none" },
  "ethical nurse recruitment": { fit: "a credible impression around fair and transparent clinical hiring", audience: "nurses and hiring hospitals", sensitivity: "health" },
  "early biotech diagnostics": { fit: "a precise impression around earlier signals and interpretable diagnostic evidence", audience: "clinical and biotech teams evaluating diagnostic tools", sensitivity: "health" },
  "endpoint threat analytics": { fit: "a vigilant impression around turning endpoint telemetry into security decisions", audience: "enterprise threat-detection and security operations teams", sensitivity: "security" },
  "endurance athlete recovery": { fit: "a capable impression around measurable recovery, mobility and return to training", audience: "endurance athletes and physiotherapists", sensitivity: "health" },
  "european retail privacy compliance": { fit: "a measured impression around consent, customer data and accountable retail practice", audience: "European ecommerce teams managing privacy compliance", sensitivity: "security" },
  "evidence and collaboration": { fit: "a rigorous impression around sharing work and reaching a defensible conclusion", audience: "researchers and specialist teams collaborating on evidence", sensitivity: "none" },
  "family support": { fit: "a warm and dependable impression around an important care decision", audience: "families comparing childcare, elder support or companionship services", sensitivity: "none" },
  "family-business continuity": { fit: "a structured impression around stewardship and a sensitive transition", audience: "family-business owners planning succession across generations", sensitivity: "financial" },
  "factory visual inspection": { fit: "an exacting impression around careful, precise, visible and repeatable manufacturing checks", audience: "precision-manufacturing quality teams", sensitivity: "none" },
  "fast audio editing": { fit: "a precise impression around quick, mobile-ready production", audience: "independent podcasters editing interviews on mobile devices", sensitivity: "none" },
  "faster scheduling": { fit: "a capable impression around simpler calendar coordination", audience: "people coordinating busy calendars and appointments", sensitivity: "none" },
  "financial clarity": { fit: "an orderly impression around informed everyday money decisions", audience: "people seeking a clearer view of general finances", sensitivity: "financial" },
  "first-investor finance briefing": { fit: "a plain-spoken impression around learning how markets and money work", audience: "first-time investors looking for an understandable financial briefing", sensitivity: "financial" },
  "food and performance nutrition": { fit: "an energetic impression around rewarding, protein-led fuel", audience: "owners choosing nutrition products for active working dogs", sensitivity: "health" },
  "food and shared enjoyment": { fit: "an inviting impression around taste, hospitality and sociability", audience: "people choosing food, drink or a shared dining experience", sensitivity: "none" },
  "forward movement": { fit: "an optimistic impression around taking a practical next step", audience: "people evaluating a new service that promises easier progress", sensitivity: "none" },
  "founder scheduling assistance": { fit: "a focused, capable impression around delegated calendar coordination", audience: "busy startup founders protecting time across shifting calendars", sensitivity: "none" },
  "freelancer accounting": { fit: "an orderly impression around making invoices, tax and bookkeeping easier to manage", audience: "independent freelancers handling their own financial administration", sensitivity: "financial" },
  "generosity and measurable impact": { fit: "a trustworthy impression around giving and visible outcomes", audience: "supporters and nonprofit teams tracking community impact", sensitivity: "financial" },
  "healthy growth": { fit: "a grounded impression around cultivation and resilient progress", audience: "growers and agricultural partners improving land or crops", sensitivity: "none" },
  "homeowner claim guidance": { fit: "a calm impression around understanding and progressing an insurance claim", audience: "homeowners seeking transparent claims support", sensitivity: "financial" },
  "household financial clarity": { fit: "a simple and supportive impression around household budgeting, planned spending and saving", audience: "young families managing household money", sensitivity: "financial" },
  "human connection": { fit: "an inclusive impression around belonging and useful participation", audience: "people building or joining a community", sensitivity: "none" },
  "humanitarian field water safety testing": { fit: "a rigorous impression around clear, field-ready water evidence", audience: "humanitarian teams assessing drinking-water quality in demanding conditions", sensitivity: "health" },
  "india solar installer trade": { fit: "a practical impression around dependable solar-equipment sourcing and exchange", audience: "solar installers and equipment suppliers operating across India", sensitivity: "none" },
  "independent investigative journalism": { fit: "a rigorous impression around scrutiny and editorial independence", audience: "editorial teams and public-interest audiences", sensitivity: "legal" },
  "indie music discovery": { fit: "an expressive impression around finding independent music and helping emerging work feel discoverable", audience: "independent artists and curious listeners", sensitivity: "none" },
  "independent artisan gift marketplace": { fit: "a crafted impression around discovering handmade gifts", audience: "shoppers and independent artisans using a specialist marketplace", sensitivity: "none" },
  "inclusive curls-and-coils care": { fit: "a considered impression around texture, definition and attentive hair care", audience: "customers choosing products for curls, coils and textured hair", sensitivity: "none" },
  "intelligent assistance": { fit: "a capable impression around useful automation without forced jargon", audience: "people evaluating an AI-assisted product or workflow", sensitivity: "none" },
  "investigative corporate-power podcast": { fit: "a rigorous editorial impression around independent scrutiny of corporate power", audience: "listeners choosing public-interest investigative journalism", sensitivity: "legal" },
  "learning and progress": { fit: "an encouraging impression around building knowledge without pressure", audience: "learners and the people supporting their development", sensitivity: "none" },
  "last-minute restaurant booking": { fit: "an inviting impression around finding a suitable table when plans are immediate", audience: "food lovers making a last-minute restaurant reservation", sensitivity: "none" },
  "late-night student meal membership": { fit: "an accessible impression around affordable food when campus options are limited", audience: "university students choosing a late-night meal membership", sensitivity: "none" },
  "kenya small-farm irrigation": { fit: "a practical impression around affordable, dependable field-water decisions", audience: "Kenyan smallholders choosing irrigation tools", sensitivity: "none" },
  "legal clarity": { fit: "a precise impression around reviewing consequential documents", audience: "people comparing contract, clause or legal-review tools", sensitivity: "legal" },
  "lisbon buyer advisory": { fit: "a trusted impression around informed local purchase guidance", audience: "international home buyers seeking local guidance in Lisbon", sensitivity: "financial" },
  "locally guided conservation travel": { fit: "an inviting impression around conservation, local ownership and expert guidance", audience: "travellers seeking locally guided safaris with locally owned Kenyan guides", sensitivity: "none" },
  "manufacturer carbon accounting": { fit: "a rigorous impression around carbon records that can be measured and audited", audience: "mid-market manufacturing teams responsible for carbon accounting", sensitivity: "none" },
  "marine conservation impact": { fit: "a credible impression around visible local conservation work", audience: "supporters deciding whether to back marine projects", sensitivity: "financial" },
  "marine monitoring and maintenance": { fit: "a capable impression around anticipating equipment needs at sea", audience: "research crews servicing sensors and buoys in demanding waters", sensitivity: "none" },
  "measurable environmental progress": { fit: "a practical impression around verifiable environmental improvement", audience: "teams and customers evaluating climate or sustainability work", sensitivity: "none" },
  "memorable occasions": { fit: "an upbeat impression around organising an important event", audience: "couples and hosts planning a wedding, venue or celebration", sensitivity: "none" },
  "multicultural wedding planning": { fit: "a joyful impression around coordinating a celebration with room for different traditions", audience: "multicultural couples planning a wedding together", sensitivity: "none" },
  "mobile rural auto repair": { fit: "an accessible impression around honest help where drivers need it", audience: "rural drivers seeking mobile vehicle repair", sensitivity: "none" },
  "neighbourhood repair and reuse": { fit: "a useful impression around borrowing tools and extending product life", audience: "neighbours sharing equipment to repair household belongings", sensitivity: "none" },
  "neighbourhood volunteer coordination": { fit: "a welcoming impression around organising local help and shared action", audience: "volunteers and neighbourhood community groups coordinating activities", sensitivity: "none" },
  "open, respectful wellbeing": { fit: "a judgement-free impression around peer support and personal agency", audience: "people maintaining recovery or seeking respectful wellbeing support", sensitivity: "health" },
  "orchestra touring coordination": { fit: "a lively but organised impression around keeping a tour in sync", audience: "youth orchestras coordinating rehearsals, instruments and travel", sensitivity: "none" },
  "orderly financial work": { fit: "a simple impression around routine accounting administration", audience: "freelancers and small teams managing invoices, tax or bookkeeping", sensitivity: "financial" },
  "pharma cold-chain monitoring": { fit: "a controlled impression around visible temperature-sensitive delivery", audience: "pharmacy and logistics teams monitoring cold-chain deliveries", sensitivity: "health" },
  "pharmacy cold-chain delivery": { fit: "a controlled impression around visible temperature-sensitive delivery", audience: "pharmacy operations teams", sensitivity: "health" },
  "physical progress and recovery": { fit: "an encouraging impression around gradual strength, mobility and recovery", audience: "people returning to movement or comparing training and recovery support", sensitivity: "health" },
  "gentle postpartum fitness": { fit: "an encouraging impression around gradual strength and comfortable movement after birth", audience: "new mothers considering gentle postpartum fitness coaching", sensitivity: "health" },
  "place and considered design": { fit: "a grounded impression around thoughtful spaces and property", audience: "people choosing a designed home, interior or property service", sensitivity: "financial" },
  "play and discovery": { fit: "a curious impression around exploration through play", audience: "children, families and educators choosing an engaging learning experience", sensitivity: "none" },
  "playful puzzle games": { fit: "a warm, curious impression around thoughtful puzzles and considered game craft", audience: "adult players choosing games from a cosy puzzle studio", sensitivity: "none" },
  "positive momentum": { fit: "an encouraging impression around visible, achievable progress", audience: "people looking for a constructive next step from a new service", sensitivity: "none" },
  "practical language learning": { fit: "an approachable impression around useful conversation and everyday speaking confidence", audience: "recent immigrants and their families", sensitivity: "none" },
  "private teen emotional support": { fit: "a private, judgement-free impression around listening, agency and credible online support", audience: "teenagers considering therapy or emotional support", sensitivity: "health" },
  "precise operations": { fit: "a practical impression around controlled industrial work", audience: "manufacturing and operations teams evaluating a specialist system", sensitivity: "none" },
  "precision quality inspection": { fit: "an exacting impression around dependable manufacturing checks", audience: "manufacturing quality teams", sensitivity: "none" },
  "protection and trust": { fit: "a measured impression around risk awareness and control", audience: "teams evaluating cybersecurity, privacy or compliance tools", sensitivity: "security" },
  "public accountability": { fit: "a transparent impression around decisions that withstand scrutiny", audience: "public bodies, suppliers and communities reviewing civic work", sensitivity: "legal" },
  "quiet ryokan hospitality": { fit: "a calm, refined impression around booking a distinctive modern Japanese stay", audience: "design-conscious travellers choosing a ryokan in Japan", sensitivity: "none" },
  "real-time esports performance": { fit: "a responsive impression around live competitive insight", audience: "professional esports teams", sensitivity: "none" },
  "reassurance and dependable cover": { fit: "a calm impression around understanding cover and navigating a claim", audience: "people comparing insurance or managing a claim", sensitivity: "financial" },
  "reassuring care": { fit: "a calm and credible impression around attentive care", audience: "patients and families comparing sensitive healthcare services", sensitivity: "health" },
  "recycled-gold jewellery craft": { fit: "a precious impression around material renewal and modern heirloom value", audience: "modern jewellery customers", sensitivity: "none" },
  "reliable movement": { fit: "a capable impression around visible routing and coordination", audience: "operations teams moving goods, equipment or services", sensitivity: "none" },
  "remote employee onboarding": { fit: "a clear and welcoming impression around distributed first days", audience: "new hires and distributed teams", sensitivity: "none" },
  "resilient irrigation and water access": { fit: "a practical impression around dependable field-water decisions", audience: "Kenyan growers planning irrigation and water access", sensitivity: "none" },
  "rural telehealth reach": { fit: "a credible impression around bringing clinical access closer across distance", audience: "rural patients and community clinics using telehealth", sensitivity: "health" },
  "rural quebec healthcare access": { fit: "a reassuring impression around reachable, coordinated rural care", audience: "rural Quebec families and caregivers arranging healthcare", sensitivity: "health" },
  "rural reach": { fit: "an accessible impression around bringing a useful service closer", audience: "rural communities choosing services with limited local access", sensitivity: "none" },
  "secure ownership": { fit: "a controlled impression around private custody and user agency", audience: "people evaluating wallets or tools for self-directed digital ownership", sensitivity: "security" },
  "beginner self-custody": { fit: "a controlled but understandable impression around personal key ownership", audience: "cautious beginners evaluating a self-custody wallet", sensitivity: "security" },
  "secure research collaboration": { fit: "a rigorous impression around sharing sensitive evidence with confidence", audience: "university researchers working across trusted teams", sensitivity: "security" },
  "shared-building ev charging": { fit: "a dependable impression around charging that works in shared residential settings", audience: "apartment residents and property teams arranging electric-vehicle charging", sensitivity: "none" },
  "simplicity": { fit: "a clear impression that lowers the effort of understanding a new offer", audience: "people seeing an unfamiliar product or service for the first time", sensitivity: "none" },
  "slow luxury rail travel": { fit: "a refined impression around unhurried overnight rail journeys", audience: "travellers choosing considered mountain and sleeper-train experiences", sensitivity: "none" },
  "solo women group travel": { fit: "a confident impression around supportive small-group exploration", audience: "solo women seeking safe and supportive group travel", sensitivity: "none" },
  "specialist therapy and everyday progress": { fit: "an approachable impression around specialist support in daily life", audience: "children and families comparing speech, swallowing or paediatric therapy", sensitivity: "health" },
  "small-business contract review": { fit: "a precise impression around making contract wording easier to review", audience: "small-business legal and operations teams", sensitivity: "legal" },
  "small-factory robotics": { fit: "a practical impression around accessible automation and controlled inventory movement", audience: "small-factory operations teams adopting warehouse robotics", sensitivity: "none" },
  "student meal delivery": { fit: "an energetic impression around affordable late-night access", audience: "university students choosing convenient meal delivery", sensitivity: "none" },
  "technical fluency": { fit: "a modern impression around capable digital infrastructure", audience: "technical teams evaluating software, data or platform products", sensitivity: "none" },
  "transparent member lending": { fit: "an accountable impression around cooperative borrowing decisions", audience: "credit-union members and teams comparing community lending software", sensitivity: "financial" },
  "transparent public procurement": { fit: "a clear impression around accountable council and supplier workflows", audience: "councils and suppliers", sensitivity: "legal" },
  "trusted cat care": { fit: "a warm and reassuring impression around attentive in-home feline care", audience: "urban apartment owners choosing a trusted cat sitter", sensitivity: "none" },
  "trusted pet care": { fit: "a friendly but practical impression around animal companionship", audience: "pet owners choosing walking, grooming or care services", sensitivity: "none" },
  "trusted water safety": { fit: "a clear impression around dependable field evidence", audience: "communities and humanitarian teams making drinking-water decisions", sensitivity: "health" },
  "university research collaboration": { fit: "a rigorous impression around sharing evidence securely with peers", audience: "university researchers collaborating on data and evidence", sensitivity: "security" },
  "vineyard disease detection": { fit: "a precise impression around spotting crop-health risk early", audience: "family vineyards using phone-based vine monitoring", sensitivity: "none" },
  "vetted childcare choices": { fit: "a dependable impression around comparing trusted care options", audience: "families comparing trustworthy and vetted childcare", sensitivity: "none" },
  "visible hair care and renewal": { fit: "a sensorial impression around texture, definition and attentive care", audience: "customers choosing products for curls, coils or specialist hair care", sensitivity: "none" },
  "visible skin care and renewal": { fit: "a considered impression around skin ritual and visible renewal", audience: "customers comparing skincare, botanical or beauty products", sensitivity: "none" },
  "warehouse robotic movement": { fit: "a controlled impression around visible inventory flow", audience: "small-factory operations teams", sensitivity: "none" },
  "working-dog nutrition": { fit: "an energetic impression around protein-led food for sustained activity", audience: "owners choosing nutrition for active working dogs", sensitivity: "none" },
  "warm restrained interiors": { fit: "a calm, refined impression around thoughtful spatial design", audience: "homeowners seeking restrained modern interiors", sensitivity: "none" },
  "welcoming restaurant reservations": { fit: "an inviting impression around finding and securing the right table", audience: "diners choosing a restaurant and making a reservation", sensitivity: "none" },
  "welsh farm-to-school trade": { fit: "a local, trustworthy impression around seasonal, traceable farm-to-school exchange", audience: "Welsh farms and local schools", sensitivity: "none" },
  "welsh identity": { fit: "a recognisably local impression rooted in language and place", audience: "Welsh schools, groups and communities choosing local services", sensitivity: "none" },
} as const satisfies Record<string, ReviewedCueProfile>

export type ReviewedRationaleCue = keyof typeof QUICK_RATIONALE_CUE_PROFILES
type CueRationaleConceptId = `cue:${ReviewedRationaleCue}`
type LegacyRationaleConceptId = keyof typeof LEGACY_RATIONALE_CONCEPTS
export type RationaleConceptId = LegacyRationaleConceptId | CueRationaleConceptId

const cueConceptEntries = Object.entries(QUICK_RATIONALE_CUE_PROFILES).map(([cue, profile]) => [
  `cue:${cue}`,
  { cue, ...profile },
])

export const QUICK_RATIONALE_CONCEPTS = {
  ...LEGACY_RATIONALE_CONCEPTS,
  ...Object.fromEntries(cueConceptEntries),
} as Readonly<Record<RationaleConceptId, ConceptDefinition>>

/** Every generator cue resolves to its own reviewed commercial profile. */
export const QUICK_RATIONALE_CONCEPT_ALIASES = Object.fromEntries(
  Object.keys(QUICK_RATIONALE_CUE_PROFILES).map((cue) => [cue, `cue:${cue}`]),
) as Readonly<Record<ReviewedRationaleCue, CueRationaleConceptId>>

interface AssociationDefinition {
  association: string
  /** When present, this association may only describe one of these surfaces. */
  surfaces?: readonly string[]
  /** Context-only meanings must never be selected or validated for another cue. */
  allowedConceptIds?: readonly RationaleConceptId[]
}

/**
 * Reviewed ordinary associations. Generic IDs remain deliberately neutral and
 * are the integration escape hatch for a visible part not yet in this list.
 */
export const QUICK_RATIONALE_ASSOCIATIONS = {
  generic_literal: { association: "a concrete and readable naming element" },
  generic_curated: { association: "a reviewed cue selected for category fit" },
  generic_sound: { association: "a sound-and-shape source rather than a literal category claim" },
  timing: { association: "coordination, rhythm and timing", surfaces: ["time", "slot", "tempo", "calendar", "meet"] },
  guidance: { association: "advice, direction and a practical next step", surfaces: ["pilot", "guide", "guidance", "trail"] },
  clarity: { association: "clarity and easier understanding", surfaces: ["clear", "claire"] },
  protection: { association: "guarding, boundaries and control", surfaces: ["guard", "shield", "vault"] },
  insight: { association: "visibility, evidence and a clearer signal", surfaces: ["signal", "trace", "scope", "data", "detect", "proof"] },
  finance: { association: "records, value and financial order", surfaces: ["ledger", "fund", "save", "mint", "rate", "loan", "pay", "books"] },
  care: { association: "attention, support and responsible care", surfaces: ["care", "mend", "vital", "clinic", "pulse", "soin"] },
  calm: { association: "calm, rest and a sense of shelter", surfaces: ["calm", "rest", "haven"] },
  family: { association: "family connection and continuity", surfaces: ["family", "famille", "kin"] },
  craft: { association: "making, structure and considered form", surfaces: ["craft", "forge", "frame", "form", "weave", "thread"] },
  food: { association: "taste, hospitality and shared enjoyment", surfaces: ["table", "bite", "brew", "roast", "bwyd"] },
  pet: { association: "recognisable pet companionship", surfaces: ["paw", "purr", "tail", "leash", "cat"] },
  learning: { association: "learning, mentorship and progress", surfaces: ["learn", "mentor", "study", "spark", "ysgol"] },
  travel: { association: "discovery, place and movement", surfaces: ["stay", "wild", "travel", "journey"] },
  environment: { association: "renewal and environmental progress", surfaces: ["green", "solar", "leaf"] },
  place: { association: "place, shelter and a grounded setting", surfaces: ["home", "rent", "tenant", "terra"] },
  commerce: { association: "discovery, exchange and choice", surfaces: ["cart", "market", "trade", "shelf", "marchnad"] },
  movement: { association: "routing and operational flow", surfaces: ["route", "fleet", "cargo", "drive"] },
  technology: { association: "systems and modern infrastructure", surfaces: ["code", "stack", "grid", "volt", "charge"] },
  media: { association: "expression, performance and a public voice", surfaces: ["sound", "stage", "story", "press"] },
  personal_voice: { association: "being heard, personal expression and agency", surfaces: ["voice"] },
  growth: { association: "fieldwork, resources and visible progress", surfaces: ["water", "field", "grow", "soil", "acre", "drip", "cnwd", "cynhaeaf"] },
  connection: { association: "connection, joining and proximity", surfaces: ["join", "bond", "circle", "near", "lien", "pont"] },
  heritage: { association: "continuity, heritage and the future", surfaces: ["legacy", "honour", "ever", "heir", "future"] },
  wellbeing: { association: "balance and an open, measured tone", surfaces: ["well", "open", "balance"] },
  community: { association: "participation, teamwork and shared purpose", surfaces: ["civic", "team", "give", "impact"] },
  recovery: { association: "movement, training and recovery", surfaces: ["fit", "train", "recover", "active"] },
  insurance: { association: "cover, claims and a navigable process", surfaces: ["claim", "cover"] },
  nutrition: { association: "food and practical nourishment", surfaces: ["treat", "protein"] },
  canine_species: { association: "dogs as the intended species", surfaces: ["canine"] },
  locality: { association: "a recognisable local or regional setting", surfaces: ["rural", "village", "proche", "proxi", "cymru", "leol", "lleol", "quebec"] },
  solidarity: { association: "solidarity and shared support", surfaces: ["solidaire"] },
  pathway: { association: "a path and onward direction", surfaces: ["path", "lane", "llwybr"] },
  outdoors: { association: "open air, nature and outdoor discovery", surfaces: ["awyr", "agored", "antur", "natur"] },
  health: { association: "health and attentive care", surfaces: ["sante", "health", "care", "clinic", "pulse"] },
  farming: { association: "farming, crops and cultivation", surfaces: ["fferm", "ffermwyr", "field", "cnwd", "cynhaeaf", "cynnyrch"] },
  school: { association: "school, learning and exchange", surfaces: ["ysgol", "study", "learn"] },
  mosaic: { association: "distinct pieces forming a coherent whole", surfaces: ["mosaic"] },
  time_order: { association: "timing, sequence and dependable coordination", surfaces: ["timekeeper", "daybook", "timetable", "clockwise", "routine", "sequence", "cadence", "scheduler", "appointment", "timely", "interval", "punctual", "synchronic", "clockwork", "promptness"] },
  advance_notice: { association: "watchfulness and useful advance notice", surfaces: ["forerunner", "precursor", "sentinel", "foresight", "vigilance", "forewarning"] },
  clinical_outlook: { association: "structured clinical review and an evidence-informed outlook", surfaces: ["prognosis", "screening"] },
  evidence_marker: { association: "an observable marker used to interpret evidence", surfaces: ["biomarker", "indicator"] },
  solar_equipment: { association: "solar equipment and usable energy infrastructure", surfaces: ["sunbelt", "panel", "installer", "sunward", "solar"] },
  commercial_exchange: { association: "sourcing, supply and commercial exchange", surfaces: ["exchange", "marketplace", "sourcing", "wholesale", "catalogue", "merchant", "stockist", "distributor", "procure", "equipment", "supplier", "trading", "commerce"] },
  arrival_welcome: { association: "arrival, welcome and a structured beginning", surfaces: ["arrival", "orientation", "induction", "reception", "welcome", "onramp", "wayfinding", "kickoff"] },
  threshold_entry: { association: "entry, access and crossing a threshold", surfaces: ["foyer", "doorway", "threshold", "entryway"] },
  preparedness: { association: "preparation and readiness for what comes next", surfaces: ["readiness", "ready"] },
  electrical_power: { association: "electrical power, connection and replenishment", surfaces: ["kilowatt", "recharge", "socket", "outlet", "current", "voltage", "wattage"] },
  shared_parking: { association: "a physical setting for parking and vehicle access", surfaces: ["parkade", "carport", "garage", "park"] },
  resident_context: { association: "people living in a shared residential setting", surfaces: ["resident"] },
  infrastructure_link: { association: "a practical connection point within a wider network", surfaces: ["junction", "conduit", "waypoint", "node", "network"] },
  live_measurement: { association: "live measurement and an operating-status signal", surfaces: ["telemetry", "heartbeat", "instrument", "diagnostic", "tracer"] },
  system_visibility: { association: "visibility into behaviour that might otherwise stay hidden", surfaces: ["visibility", "aperture", "monitoring", "watchtower", "observant", "diagnosis"] },
  software_runtime: { association: "software execution, logs and technical investigation", surfaces: ["stacktrace", "logbook", "runtime", "console", "debug", "stack", "code", "dev", "log"] },
  consent_boundary: { association: "consent, discretion and clear boundaries", surfaces: ["consent", "discretion", "boundary", "permission", "confidential", "discreet", "sanctity", "seclusion", "guardrail", "redaction", "anonymity"] },
  accountable_practice: { association: "accountability, careful governance and earned trust", surfaces: ["compliance", "safeguard", "governance", "trustworthy", "assurance", "accountable", "integrity", "probity", "oversight", "openness", "custodian", "lawful", "diligence", "verifiable"] },
  research_inquiry: { association: "inquiry, evidence and collaborative scholarship", surfaces: ["peerwork", "inquiry", "evidence", "synthesis", "scholarly", "colloquium", "discovery"] },
  shared_agreement: { association: "ideas or contributions coming together around agreement", surfaces: ["consensus", "concord", "confluence", "commons"] },
  knowledge_record: { association: "an organised record that can be revisited", surfaces: ["archive", "sourcebook"] },
  protected_storage: { association: "protected storage and controlled access", surfaces: ["keystore", "lockbox", "masterkey", "stronghold", "safekeeping", "keyring"] },
  self_direction: { association: "personal control and self-directed ownership", surfaces: ["sovereign", "autonomy", "control", "ownership", "possession", "dominion"] },
  rental_process: { association: "tenancy, housing access and rental paperwork", surfaces: ["tenancy", "leasehold", "applicant", "dossier", "paperwork", "residence", "address", "occupancy"] },
  financial_records: { association: "bookkeeping, records and routine financial administration", surfaces: ["bookkeep", "accrual", "worksheet", "receipt", "journal", "reckoning", "balance", "bookwork", "cashbook", "ledger", "filing", "tally", "dividend", "squared", "column", "reckon", "reconcile", "settled", "credits", "debits", "postings", "daybook"] },
  contract_language: { association: "contract wording and deliberate document review", surfaces: ["redline", "proviso", "covenant", "accord", "verdict", "legible", "plainspoken", "wording", "termsheet", "fineprint", "clarifier", "readable", "statute", "docket"] },
  service_reach: { association: "reach, proximity and continued access across distance", surfaces: ["reachable", "lifeline", "outreach", "nearness", "connection", "presence", "distance", "coverage", "locality", "reassurance"] },
  study_progress: { association: "practice, learning and visible academic progress", surfaces: ["mastery", "revision", "aptitude", "milestone", "rehearsal", "coursework", "progress", "workbook", "question", "acumen", "literacy", "scholar"] },
  environmental_measure: { association: "measurement, reduction and traceable environmental records", surfaces: ["inventory", "baseline", "footprint", "abatement", "veracity", "traceable", "reduction", "accounting", "measure", "audittrail", "climatic"] },
  irrigation_water: { association: "water capture, irrigation and cultivated land", surfaces: ["furrow", "reservoir", "aqueduct", "headwater", "catchment", "watercourse", "irrigation", "dripline", "smallholder", "acreage", "rainfall", "rainfed"] },
  field_testing: { association: "field sampling and observable water-quality evidence", surfaces: ["potable", "wellhead", "aquifer", "watershed", "fieldwork", "sample", "assay", "testing", "hygiene", "lucidity"] },
  editorial_briefing: { association: "an organised explanation or recurring editorial update", surfaces: ["briefing", "bulletin", "digest", "outlook", "dispatch", "readout", "primer", "explainer", "firstlook", "chronicle", "newsletter"] },
  restored_state: { association: "restoration and a return to a workable state", surfaces: ["recovery"] },
  claim_resolution: { association: "support, recourse and progress toward resolving a claim", surfaces: ["recourse", "remedy", "settlement", "indemnity", "adjuster", "roadmap", "resolution", "fairness"] },
  procurement_process: { association: "tendering, supplier choice and public purchasing", surfaces: ["tendering", "bidding", "supplier"] },
  cyber_defence: { association: "defence, detection and watchfulness against threats", surfaces: ["hardening", "firewall", "watchful", "detector", "defender", "tripwire", "forensics", "spectrum", "bastion", "fortress", "hardpoint", "redoubt"] },
  active_vitality: { association: "strength, stamina and sustained physical effort", surfaces: ["vigour", "stamina", "heartiness", "hardiness", "athletic", "muscle", "capacity", "fortitude"] },
  nourishment_supply: { association: "food, nourishment and practical provisions", surfaces: ["nourish", "rations", "provisions"] },
  earned_reward: { association: "a reward associated with effort or good work", surfaces: ["reward"] },
  physical_recovery: { association: "recovery, restored movement and a return to activity", surfaces: ["recovery", "restoration", "resilience", "comeback", "endurance", "rebound", "mobility", "tenacity", "conditioning", "physiology", "physio"] },
  campaign_momentum: { association: "campaign direction, public advocacy and forward momentum", surfaces: ["momentum", "clarion", "mission", "purpose", "traction", "campaign", "advocacy", "resonance", "positioning", "storytelling", "launchpad"] },
  cold_chain: { association: "temperature control and monitored cold-chain movement", surfaces: ["coldstore", "thermostat", "waybill", "refrigerant", "coolant", "preserve", "preservation", "thermic", "temperature", "coldchain", "thermometer"] },
  competitive_play: { association: "competitive play, ranking and performance feedback", surfaces: ["scoreboard", "reflex", "tactical", "ranking", "reaction", "teamplay", "gamecraft", "matchcraft", "prowess", "playbook", "leaderboard", "bracket", "tactic"] },
  investigation: { association: "scrutiny, testimony and evidence brought into public view", surfaces: ["scrutiny", "disclosure", "witness", "exposure", "testimony", "watchdog", "reportage", "revelation", "deepdive", "spotlight"] },
  machinery_motion: { association: "mechanical movement, automation and material handling", surfaces: ["automaton", "kinematic", "assembly", "mechanism", "actuator", "machinery", "kinetic", "workcell", "handling", "motion", "automation"] },
  quality_measure: { association: "precision, measurement and repeatable inspection", surfaces: ["calibre", "tolerance", "standard", "metric", "benchmark", "exactitude", "metrology", "accuracy", "visual", "eyesight", "inspection", "focus"] },
  vehicle_service: { association: "practical vehicle repair and roadside service", surfaces: ["roadside", "roadworthy", "wrench", "mechanic", "toolbox", "ignition", "servicing", "callout", "workshop", "breakdown"] },
  confidence: { association: "confidence and visible conviction", surfaces: ["bold", "brave", "strong", "noble"] },
  openness: { association: "openness and accessible participation", surfaces: ["open", "shared"] },
  integrity: { association: "fairness, honesty and directness", surfaces: ["true", "honest", "fair"] },
  simplicity: { association: "simplicity and easier understanding", surfaces: ["simple", "plain", "easy"] },
  precision: { association: "precision and a sharply defined focus", surfaces: ["sharp", "exact"] },
  steadiness: { association: "steadiness and dependable continuity", surfaces: ["steady"] },
  live_action: { association: "live activity and immediate feedback", surfaces: ["live"] },
  depth: { association: "depth and closer examination", surfaces: ["deep"] },
  locality_context: { association: "a local setting and nearby relevance", surfaces: ["local"] },
  scale_focus: { association: "a deliberately focused scale", surfaces: ["small", "first", "one"] },
  guided_support: { association: "guidance through a practical next step", surfaces: ["guided", "guide", "help"] },
  safety: { association: "careful protection and reduced uncertainty", surfaces: ["safe", "secure"] },
  brightness: { association: "visibility and an optimistic tone", surfaces: ["bright"] },
  centrality: { association: "a central point or operating foundation", surfaces: ["core"] },
  focused_light: { association: "a focused beam or visible signal", surfaces: ["beam"] },
  practical_work: { association: "making, practical work and operational capability", surfaces: ["works"] },
  onward_line: { association: "a direct line and continued movement", surfaces: ["line", "rise", "front"] },
  purposeful_search: { association: "a purposeful search or challenge", surfaces: ["quest"] },
  rapid_fastening: { association: "speed, energy and a firm connection", surfaces: ["bolt"] },
  founder_assistance: { association: "practical assistance for a founder's working day", surfaces: ["assist", "founder", "agenda"] },
  early_detection: { association: "earlier attention to a detectable signal", surfaces: ["early", "marker", "screen", "detect", "bio"] },
  solar_trade_context: { association: "solar installation and equipment trade", surfaces: ["install", "trade", "india", "sun"] },
  onboarding_team: { association: "joining a remote team and beginning work", surfaces: ["firstday", "join", "remote", "team"] },
  charge_network: { association: "electric charging and usable power infrastructure", surfaces: ["charge", "volt"] },
  privacy_retail: { association: "privacy responsibilities in digital retail", surfaces: ["privacy", "retail", "euro"] },
  research_sharing: { association: "research evidence shared with peers", surfaces: ["research", "peer", "share", "proof"] },
  custody_keys: { association: "personal keys and self-directed custody", surfaces: ["key", "own", "wallet"] },
  tenant_application: { association: "rental applications and tenant access", surfaces: ["renter", "apply", "berlin", "lease", "tenant", "rent"] },
  freelance_admin: { association: "independent work, invoices and tax administration", surfaces: ["invoice", "tax", "solo"] },
  review_parts: { association: "document clauses and careful review", surfaces: ["clause", "review", "brief", "terms", "counsel"] },
  healthcare_access: { association: "clinical access and reachable care", surfaces: ["reach", "clinic", "access"] },
  exam_learning: { association: "exam practice and adaptive study", surfaces: ["exam", "school"] },
  carbon_audit: { association: "carbon measurement and an auditable record", surfaces: ["carbon", "audit"] },
  farm_water: { association: "field irrigation for cultivated acreage", surfaces: ["drip", "water", "acre", "grower"] },
  humanitarian_test: { association: "field testing in a humanitarian setting", surfaces: ["field", "test", "aid"] },
  finance_media: { association: "markets explained for people learning to invest", surfaces: ["invest", "news", "market"] },
  claims_cover: { association: "an insurance claim and the cover behind it", surfaces: ["claim", "home", "cover"] },
  public_tender: { association: "council tenders and supplier participation", surfaces: ["tender", "council", "supply", "bid", "public"] },
  threat_detection: { association: "endpoint threats and their detection", surfaces: ["endpoint", "threat", "cyber"] },
  working_dog_energy: { association: "active energy in a working-dog context", surfaces: ["fuel", "active"] },
  endurance_support: { association: "endurance and a supported return to activity", surfaces: ["recover", "endure"] },
  climate_positioning: { association: "climate positioning and brand launch", surfaces: ["climate", "launch", "brand"] },
  climate_marketing_audience: {
    association: "a climate-technology founder shaping how progress is communicated",
    surfaces: ["founder"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_environment: {
    association: "environmental positioning for climate-technology communication",
    surfaces: ["eco"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_evidence: {
    association: "evidence-aware climate claims and credible proof points",
    surfaces: ["claim", "proof"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_credibility: {
    association: "credibility in climate-technology messaging",
    surfaces: ["credence", "verity", "credible", "honest"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_narrative: {
    association: "climate storytelling, narrative direction and a clear market voice",
    surfaces: ["story", "voice", "arc", "narrate"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_campaign: {
    association: "a focused climate-marketing brief and campaign direction",
    surfaces: ["brief", "map", "ink", "mark", "pitch"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_carbon_context: {
    association: "climate-sector subject matter framed for market communication",
    surfaces: ["carbon"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_impact_frame: {
    association: "the intended role a climate venture presents to its market audience",
    surfaces: ["impact"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_communication_cadence: {
    association: "the pacing and rhythm of climate-technology communication",
    surfaces: ["cadence"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_market_signal: {
    association: "a clear market-positioning cue for a climate-technology venture",
    surfaces: ["signal", "cue"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_clear_voice: {
    association: "a clear, distinctive climate-marketing voice",
    surfaces: ["clarion"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_message_clarity: {
    association: "clear, relevant climate-technology messaging",
    surfaces: ["salience", "cogent", "cohere"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_message_delivery: {
    association: "how a climate-technology message is conveyed",
    surfaces: ["resound", "convey"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_distinctiveness: {
    association: "distinctive climate-technology messaging",
    surfaces: ["cutthrough"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_demand_context: {
    association: "market demand as a communication focus",
    surfaces: ["demand"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_message_craft: {
    association: "careful shaping of climate-technology messaging",
    surfaces: ["craft"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_market_context: {
    association: "the audience for climate-technology positioning",
    surfaces: ["market"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_market_shift: {
    association: "a change in market framing or position",
    surfaces: ["shift", "reframe"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_positioning: {
    association: "a stated position in climate-technology messaging",
    surfaces: ["stance"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_announcement: {
    association: "announcing a climate-technology message to its market",
    surfaces: ["herald"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_message_idea: {
    association: "an initial idea for climate-technology messaging",
    surfaces: ["spark"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_message_echo: {
    association: "a climate-technology message carried to an audience",
    surfaces: ["echo"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_audience_reception: {
    association: "how an audience receives a message",
    surfaces: ["uptake"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  climate_marketing_message_workshop: {
    association: "a place for testing and shaping messages",
    surfaces: ["lab"],
    allowedConceptIds: ["cue:climate startup marketing"],
  },
  privacy_customer_data: {
    association: "customer data and consent responsibilities",
    surfaces: ["data"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_data_rights: {
    association: "individual rights over how personal data is handled",
    surfaces: ["erasure", "portability"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_erasure_right: {
    association: "the deletion of personal data",
    surfaces: ["erasure"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_portability_right: {
    association: "moving a copy of personal data between services",
    surfaces: ["portability"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_access_permission: {
    association: "permission to access customer data",
    surfaces: ["key"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_boundary_marker: {
    association: "a boundary around private information",
    surfaces: ["seal", "boundary"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_data_custody: {
    association: "responsible handling of customer data",
    surfaces: ["custody", "custodian"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_policy_framework: {
    association: "an organised privacy and consent policy",
    surfaces: ["policy"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_request_workspace: {
    association: "a workspace for privacy requests",
    surfaces: ["desk"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_notice_basis: {
    association: "the stated reason for handling personal data",
    surfaces: ["basis"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_notice: {
    association: "a privacy notice presented to customers",
    surfaces: ["notice"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_compliance_record: {
    association: "a record trail for privacy activity",
    surfaces: ["ledger", "log", "trace"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_consent_choice: {
    association: "consent choices and agreed data boundaries",
    surfaces: ["consent", "pact"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_redaction: {
    association: "personal information removed or obscured",
    surfaces: ["redaction"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_data_dignity: {
    association: "respectful handling of personal information",
    surfaces: ["dignity"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_discreet_handling: {
    association: "quiet, discreet handling of personal information",
    surfaces: ["quiet", "discretion", "restraint", "circumspect"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_anonymity: {
    association: "identity kept separate from exposed personal information",
    surfaces: ["anonymity"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_entrusted_information: {
    association: "personal information entrusted to careful handling",
    surfaces: ["privity", "confidant", "confide", "fiduciary"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  privacy_careful_practice: {
    association: "care and responsibility in data-handling practice",
    surfaces: ["due", "care", "good", "faith"],
    allowedConceptIds: ["cue:european retail privacy compliance"],
  },
  freelancer_accounting_records: {
    association: "bookkeeping records and routine entries",
    surfaces: ["balance", "daybook", "tabulate", "filing", "ledger", "tally", "books"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_calculation: {
    association: "counting and calculation in bookkeeping",
    surfaces: ["reckoner", "abacus", "numerate", "tallier", "reckoning"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_timing: {
    association: "amounts building or becoming due over time",
    surfaces: ["accrue"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_order: {
    association: "an organised rhythm for bookkeeping work",
    surfaces: ["orderly", "steady"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_provision: {
    association: "an amount provided for a future expense or liability",
    surfaces: ["provision"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_headroom: {
    association: "financial room or resources available for obligations",
    surfaces: ["headroom", "wherewithal"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_tax: {
    association: "tax-related bookkeeping tasks",
    surfaces: ["tax"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_solo: {
    association: "an independent worker managing their own records",
    surfaces: ["solo"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_figures: {
    association: "figures and cash-flow information",
    surfaces: ["figure", "cash"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_invoice: {
    association: "invoices in freelance bookkeeping",
    surfaces: ["invoice"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_independence: {
    association: "independent control of bookkeeping records",
    surfaces: ["own", "sole"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_billable: {
    association: "billable work prepared for invoicing",
    surfaces: ["billable"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_reserve: {
    association: "money set aside for tax or expenses",
    surfaces: ["setaside"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_line_item: {
    association: "an individual account or invoice entry",
    surfaces: ["lineitem"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_folio: {
    association: "a collected folio of bookkeeping records",
    surfaces: ["folio"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_receivable: {
    association: "invoice amounts awaiting payment",
    surfaces: ["receivable"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_remittance: {
    association: "sending payment for work",
    surfaces: ["remit"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_navigation: {
    association: "direction through tax and bookkeeping tasks",
    surfaces: ["compass", "way"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_workspace: {
    association: "a workspace for filing and invoicing",
    surfaces: ["desk"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_sundry_entries: {
    association: "miscellaneous bookkeeping entries",
    surfaces: ["sundry"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_footing_total: {
    association: "the total of an accounting column",
    surfaces: ["footing"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_netting: {
    association: "amounts offset to produce a net figure",
    surfaces: ["netting"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_carryover: {
    association: "a balance carried into the next accounting period",
    surfaces: ["carryover"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_outlay: {
    association: "money spent as a business expense",
    surfaces: ["outlay"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  freelancer_accounting_turnover: {
    association: "business revenue recorded over a period",
    surfaces: ["turnover"],
    allowedConceptIds: ["cue:freelancer accounting"],
  },
  contract_review_check: {
    association: "a systematic check of contract wording",
    surfaces: ["audit", "scan"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_history: {
    association: "wording changes followed through review",
    surfaces: ["trace", "trail"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_support: {
    association: "supporting material considered during review",
    surfaces: ["proof"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_structure: {
    association: "a structured view of review coverage",
    surfaces: ["grid", "scope"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_view: {
    association: "a focused view of contract wording",
    surfaces: ["lens", "view"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_attention: {
    association: "wording that merits closer attention",
    surfaces: ["signal", "risk", "flag"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_markup: {
    association: "visible document-review annotations and edits",
    surfaces: ["markup", "redline"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_fineprint: {
    association: "detailed wording for close review",
    surfaces: ["fineprint"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_clause_language: {
    association: "formal wording within a contract clause",
    surfaces: ["provision", "recital", "terms", "clause"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_condition: {
    association: "a stated condition, requirement or qualification",
    surfaces: ["stipulate", "proviso", "caveat"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_preamble: {
    association: "opening or preamble wording in an agreement",
    surfaces: ["whereas", "preamble"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_clarity: {
    association: "contract wording brought into a clearer view",
    surfaces: ["legible", "plainspoken", "plain", "light"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_exact_wording: {
    association: "attention to wording exactly as written",
    surfaces: ["verbatim"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_revision: {
    association: "a revision to contract wording",
    surfaces: ["amend", "redraft", "addendum"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_annex: {
    association: "a supplementary contract section",
    surfaces: ["annex"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_reading: {
    association: "careful or repeated reading of wording",
    surfaces: ["close", "read", "second"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_annotation: {
    association: "a note beside contract wording",
    surfaces: ["margin", "note"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_workspace: {
    association: "a workspace for document review",
    surfaces: ["room", "desk"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_agreement: {
    association: "an agreement whose wording is under review",
    surfaces: ["pact", "covenant", "accord"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_version: {
    association: "contract versions prepared for comparison",
    surfaces: ["draft", "version", "pair"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  contract_review_change: {
    association: "a change between contract versions",
    surfaces: ["delta"],
    allowedConceptIds: ["cue:small-business contract review"],
  },
  rural_telehealth_distance: {
    association: "closeness or clinical access across distance",
    surfaces: ["route", "remote", "outpost", "span", "post", "crossing", "proximity", "vicinity", "adjacency", "wider"],
    allowedConceptIds: ["cue:rural telehealth reach"],
  },
  rural_telehealth_connection: {
    association: "a link between rural patients and clinics",
    surfaces: ["signal", "wave", "channel", "relay", "conduit", "node", "bridge", "mesh", "linkage", "rendezvous", "confluence"],
    allowedConceptIds: ["cue:rural telehealth reach"],
  },
  rural_telehealth_presence: {
    association: "a sense of care brought nearer across distance",
    surfaces: ["presence", "nearness"],
    allowedConceptIds: ["cue:rural telehealth reach"],
  },
  rural_telehealth_beacon: {
    association: "a cue toward remote clinical support",
    surfaces: ["beacon"],
    allowedConceptIds: ["cue:rural telehealth reach"],
  },
  mortgage_comparison_reference: {
    association: "a reference for comparing mortgage terms",
    surfaces: ["benchmark", "yardstick", "equate", "parity", "calibrate"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_comparison_structure: {
    association: "a structured comparison of borrowing options",
    surfaces: ["grid", "scope", "collate", "board", "range"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_comparison_navigation: {
    association: "orientation across mortgage choices",
    surfaces: ["compass", "atlas", "map", "navigate", "guide", "bearings", "landmark", "headway", "guided"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_comparison_distinction: {
    association: "distinguishing between borrowing choices",
    surfaces: ["discern"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_first_buyer: {
    association: "a first-time home buyer comparing options",
    surfaces: ["first", "buyer"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_comparison_factor: {
    association: "a factor in comparing borrowing choices",
    surfaces: ["key", "choice"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_offer_comparison: {
    association: "buyer needs compared with mortgage options",
    surfaces: ["match"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_loan_subject: {
    association: "a mortgage loan under comparison",
    surfaces: ["loan", "borrow"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_comparison_view: {
    association: "a clearer view across borrowing options",
    surfaces: ["view", "lens"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_payment_terms: {
    association: "payment, term and APR comparison inputs",
    surfaces: ["payment", "term", "apr"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_detail_check: {
    association: "a check of mortgage comparison details",
    surfaces: ["check"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_term_sift: {
    association: "borrowing terms sorted for comparison",
    surfaces: ["sift"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_offer_subject: {
    association: "a mortgage offer under comparison",
    surfaces: ["offer"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_borrowing_summary: {
    association: "a concise summary of borrowing options",
    surfaces: ["brief"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_cost_factor: {
    association: "cost as an input to mortgage comparison",
    surfaces: ["cost"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  mortgage_buyer_context: {
    association: "a home buyer comparing mortgage options",
    surfaces: ["buyer"],
    allowedConceptIds: ["cue:clear mortgage comparison"],
  },
  temperature_route: { association: "temperature-sensitive goods moving along a monitored route", surfaces: ["cold", "pharma"] },
  esports_context: { association: "competitive esports play and scoring", surfaces: ["esport", "score", "arena"] },
  editorial_probe: { association: "journalistic inquiry and a public story", surfaces: ["probe", "press", "source", "story"] },
  industrial_robotics: { association: "factory automation and inventory movement", surfaces: ["robot", "factory", "stock"] },
  visual_inspection: { association: "visual inspection and a quality gauge", surfaces: ["inspect", "vision", "gauge", "quality"] },
  mobile_repair: { association: "vehicle repair brought to the road or customer", surfaces: ["repair", "motor", "road", "mobile"] },
  practical_intelligence: { association: "practical intelligence and informed automation", surfaces: ["smart"] },
  usable_power: { association: "energy and usable operating power", surfaces: ["power"] },
  cleanliness: { association: "cleanliness and reduced visual or practical clutter", surfaces: ["clean"] },
  household_budgeting: { association: "setting a household budget and planning everyday spending", surfaces: ["allowance", "budget", "saver", "thrift"] },
  financial_buffer: { association: "money held back as a buffer for future household needs", surfaces: ["bankroll", "headroom", "margin", "nestegg", "provision"] },
  considered_judgement: { association: "careful judgement and a considered choice", surfaces: ["prudence", "wise"] },
  kindness: { association: "kindness and a considerate human tone", surfaces: ["kind"] },
  honest_self_expression: { association: "honesty, candour and being true to oneself", surfaces: ["authentic", "candour"] },
  supportive_conversation: { association: "space to listen, build rapport and speak without pressure", surfaces: ["breathing", "latitude", "listening", "rapport"] },
  personal_confidence: { association: "confidence, resolve and dependable inner support", surfaces: ["confidence", "steadfast"] },
  adolescence: { association: "the teenage stage and its changing needs", surfaces: ["teen"] },
  feline_identity: { association: "recognisable feline character and domestic-cat companionship", surfaces: ["feline", "mouser", "whisker", "whiskered"] },
  feline_movement: { association: "a cat's light movement and familiar physical cues", surfaces: ["pawprint", "pounce", "purring"] },
  fireside_warmth: { association: "domestic warmth and a comfortable place to settle", surfaces: ["fireside", "hearth"] },
  companionship: { association: "companionship and a trusted counterpart", surfaces: ["mate"] },
  sheltered_nest: { association: "shelter, comfort and something carefully looked after", surfaces: ["nest"] },
  measured_return: { association: "a gradual, grounded return to balance and steadiness", surfaces: ["gradual", "grounded", "measured", "rebalance", "steadiness", "gentle", "restore", "stride"] },
  maternal_reference: { association: "motherhood and a warm, familiar form of address", surfaces: ["mama"] },
  renewed_bloom: { association: "a fresh bloom and a sense of beginning again", surfaces: ["rebloom"] },
  care_vocation: { association: "a professional calling centred on skilled care", surfaces: ["calling", "nurse", "profession", "vocation"] },
  professional_qualification: { association: "recognised professional preparation and credentials", surfaces: ["credential"] },
  recruitment_match: { association: "matching qualified people with suitable roles", surfaces: ["hire", "match", "placement", "roster", "talent", "workforce"] },
  home_purchase: { association: "a first foothold in buying and establishing a home", surfaces: ["deposit", "doorstep", "foothold", "homestead", "keystone", "buyer"] },
  comparison_view: { association: "a clear overview for comparing available choices", surfaces: ["compare", "overview"] },
  childcare_nurture: { association: "nurturing attention and dependable care for a child", surfaces: ["caregiving", "kinfolk", "nurturing", "child"] },
  childcare_safety: { association: "guardianship, shelter and a protected place for children", surfaces: ["guardian", "sanctuary", "shelter"] },
  childhood_play: { association: "daylight, play and an inviting child-centred space", surfaces: ["daylight", "playroom"] },
  donor_commitment: { association: "lasting donor commitment, loyalty and careful stewardship", surfaces: ["commitment", "constancy", "fidelity", "loyalty", "donor"] },
  donor_engagement: { association: "cultivating donor relationships through engagement and gratitude", surfaces: ["cultivation", "donorship", "engagement", "gratitude"] },
  charitable_cause: { association: "a cause supported through purposeful giving", surfaces: ["cause"] },
  earned_trust: { association: "trust built through dependable actions", surfaces: ["trust"] },
  mutual_wellbeing: { association: "mutual help, family wellbeing and support close to home", surfaces: ["bienetre", "entraide", "familial", "wellbeing"] },
  farm_setting: { association: "a working farm and the land it cultivates", surfaces: ["croft", "farm", "pasture"] },
  farm_produce: { association: "crops, orchard produce and the stores that hold them", surfaces: ["granary", "orchard", "produce"] },
  compact_meal: { association: "a compact, convenient portion of food", surfaces: ["bitesize", "snackable"] },
  campus_food: { association: "canteen food and practical meals for campus life", surfaces: ["canteen", "campus", "takeaway"] },
  late_night_meal: { association: "food made available around late-night routines", surfaces: ["midnight", "night", "platter", "savoury"] },
  quick_energy: { association: "speed, momentum and an energetic finish", surfaces: ["dash", "rally"] },
  puzzle_idea: { association: "a playful mental challenge that invites a satisfying insight", surfaces: ["brainwave", "conundrum", "enigma", "riddle", "puzzle"] },
  puzzle_piecework: { association: "pieces, patterns and clues assembled into a whole", surfaces: ["jigsaw", "rebus", "tessera"] },
  cosy_warmth: { association: "a cosy, welcoming and unhurried mood", surfaces: ["cozy"] },
  woven_structure: { association: "threads brought together into a visible structure", surfaces: ["loom"] },
  wedding_commitment: { association: "a couple's promise and the commitment behind a wedding", surfaces: ["betrothal", "everafter", "promise", "couple", "vow"] },
  wedding_celebration: { association: "celebration, colour and the shared joy of an occasion", surfaces: ["celebrate", "confetti", "festivity", "garland", "jubilee", "joy"] },
  floral_bloom: { association: "flowering, freshness and visible growth", surfaces: ["bloom", "blossom"] },
  dining_appetite: { association: "appetite, flavour and the anticipation of a meal", surfaces: ["appetite", "feasting", "savour", "dine", "supper"] },
  restaurant_hospitality: { association: "restaurant hospitality and a table prepared for guests", surfaces: ["banquet", "brasserie", "hospitality", "hostelry"] },
  playful_wink: { association: "a light, knowing touch of personality", surfaces: ["wink"] },
  musical_structure: { association: "a recognisable musical passage, pattern or return", surfaces: ["chorus", "melody", "refrain"] },
  musical_presence: { association: "live musical presence and the invitation to listen again", surfaces: ["encore", "indie"] },
  sound_character: { association: "the texture, tone and wider landscape of sound", surfaces: ["sonic", "sonorous", "soundscape", "timbre"] },
  verb_like_finish: { association: "a compact, action-oriented ending", surfaces: ["ify"] },
  language_exchange: { association: "conversation, expression and mutual understanding", surfaces: ["conversation", "dialogue", "expression", "speak"] },
  spoken_fluency: { association: "fluency and confidence in practical spoken language", surfaces: ["eloquence", "fluency", "parlance", "lingo"] },
  language_vocabulary: { association: "words and vocabulary available for everyday communication", surfaces: ["lexicon", "vocabulary"] },
  cultural_bridge: { association: "a bridge between people, places or ways of understanding", surfaces: ["bridge"] },
  curated_shop: { association: "a small, carefully selected place to browse distinctive goods", surfaces: ["boutique", "curation", "emporium", "showcase"] },
  meaningful_gift: { association: "a gift or keepsake chosen for personal meaning", surfaces: ["gift", "keepsake", "treasure"] },
  artisan_delivery: { association: "a carefully made item prepared and sent to its recipient", surfaces: ["parcel"] },
  handmade_craft: { association: "the visible hand and skill of an independent maker", surfaces: ["hand", "maker"] },
  community_alliance: { association: "people joining in mutual support around a shared purpose", surfaces: ["alliance", "coalition", "solidarity", "together"] },
  community_belonging: { association: "belonging, camaraderie and a supportive group connection", surfaces: ["belonging", "camaraderie", "fellowship"] },
  curl_definition: { association: "the natural pattern and definition of curls, coils and ringlets", surfaces: ["definition", "pattern", "ringlet", "spiral", "tendril", "coil", "curl", "texture"] },
  hair_condition: { association: "lustre, porosity and attentive care for textured hair", surfaces: ["lustrous", "porosity", "hair"] },
  healthy_radiance: { association: "a healthy-looking glow and visible radiance", surfaces: ["radiance", "glow"] },
  garden_growth: { association: "cultivation and the visible growth of small-space plants", surfaces: ["cultivate", "greenery", "seedling", "sprouting", "verdant", "plant"] },
  balcony_terrace: { association: "a compact outdoor terrace used as growing space", surfaces: ["terrace"] },
  practical_kit: { association: "a practical set of parts gathered for one task", surfaces: ["kit"] },
  alpine_light: { association: "mountain light, cool air and an alpine sense of clarity", surfaces: ["alpenglow", "glacial", "alpine"] },
  botanical_dew: { association: "fresh dew and a softly hydrated appearance", surfaces: ["dewdrop", "dewiness"] },
  alpine_botanical: { association: "a hardy alpine flower associated with mountain botanicals", surfaces: ["edelweiss"] },
  botanical_flora: { association: "plant life and botanical character", surfaces: ["flora"] },
  soft_finish: { association: "softness and a smooth, velvety finish", surfaces: ["softness", "velvety"] },
  quiet_serenity: { association: "serenity and a composed, quiet mood", surfaces: ["serenity", "quiet"] },
  mineral_matter: { association: "natural mineral matter and a grounded material quality", surfaces: ["mineral", "stone"] },
  skin_care: { association: "skin and a considered daily care ritual", surfaces: ["skin"] },
  coastal_geography: { association: "a recognisable shoreline and coastal sense of place", surfaces: ["coast", "headland", "maritime", "shore", "shoreline", "tidewater"] },
  harbour_landscape: { association: "familiar details from a harbour and the water's edge", surfaces: ["driftwood", "saltwater", "seabird"] },
  coffee_craft: { association: "coffee, roasting and a familiar neighbourhood ritual", surfaces: ["coffee"] },
  family_lineage: { association: "family lineage and what is carried between generations", surfaces: ["ancestry", "dynasty", "heritage", "inheritance", "lineage", "posterity"] },
  lasting_continuity: { association: "continuity and what endures through change", surfaces: ["continuance", "continuity", "continuum"] },
  lisbon_streetscape: { association: "recognisable details of Lisbon's streets, hills and viewpoints", surfaces: ["calcada", "hillside", "miradouro", "quarter", "terracotta", "alfama", "lisbon"] },
  riverside_portico: { association: "a riverside setting shaped by an estuary and sheltered architecture", surfaces: ["estuary", "portico", "riverside", "tejo"] },
  small_grove: { association: "a sheltered group of trees and a grounded natural setting", surfaces: ["grove"] },
  travel_companions: { association: "a small group brought together for a shared journey", surfaces: ["cohort", "coterie", "gather"] },
  planned_journey: { association: "a planned passage through new places", surfaces: ["escapade", "itinerary", "odyssey", "passage", "sojourn", "voyage"] },
  independent_roaming: { association: "independent roaming and freedom to choose the route", surfaces: ["roaming", "roam", "compass"] },
  valley_landscape: { association: "a valley landscape and a route through open terrain", surfaces: ["vale"] },
  conservation_land: { association: "protected landscapes and the ecosystems they sustain", surfaces: ["conservancy", "ecosystem", "wildlands"] },
  safari_wildlife: { association: "wildlife, migration and the open savanna", surfaces: ["migration", "savanna", "wildlife", "safari"] },
  local_wayfinder: { association: "a knowledgeable guide who can read the land and its routes", surfaces: ["ranger", "wayfarer", "wayfinder"] },
  open_horizon: { association: "an open horizon and a sense of distance", surfaces: ["horizon"] },
  ryokan_welcome: { association: "gracious Japanese hospitality and the ritual of welcome", surfaces: ["ceremony", "gracious", "omotenashi", "japan", "ryokan"] },
  quiet_repose: { association: "stillness, repose and a tranquil pace", surfaces: ["repose", "stillness", "tranquil"] },
  courtyard_space: { association: "a sheltered courtyard and an inward-looking sense of place", surfaces: ["courtyard"] },
  room_atmosphere: { association: "the ambience, palette and proportions that shape a room", surfaces: ["ambience", "palette", "proportion", "room", "interior"] },
  interior_joinery: { association: "joinery and the crafted details of an interior", surfaces: ["joinery"] },
  interior_material: { association: "physical material, surface quality and considered finish", surfaces: ["material", "textural"] },
  spatial_design: { association: "the arrangement and experience of interior space", surfaces: ["dwelling", "spatial"] },
  building_conservation: { association: "retaining useful building fabric while adapting it for a new life", surfaces: ["conserve", "fabric", "reclaim", "reuse"] },
  layered_building: { association: "layers of history that remain visible in an existing building", surfaces: ["palimpsest", "patina"] },
  architectural_revival: { association: "renewal and revival through architectural change", surfaces: ["renaissance", "revival", "arch"] },
  gold_material: { association: "gold as a precious material with a warm, luminous finish", surfaces: ["auriferous", "burnished", "luminous", "gold", "carat"] },
  jewellery_craft: { association: "fine jewellery craft, metalwork and identifying marks", surfaces: ["filigree", "goldsmith", "hallmark"] },
  lasting_heirloom: { association: "an heirloom made to retain personal meaning over time", surfaces: ["heirloom", "precious"] },
  restorative_rise: { association: "an upward movement and a renewed sense of momentum", surfaces: ["rise"] },
  established_house: { association: "an established creative or commercial house", surfaces: ["house"] },
  maker_guild: { association: "a guild or collective defined by shared craft", surfaces: ["guild"] },
  distinctive_mark: { association: "a memorable identifying mark", surfaces: ["mark", "crest"] },
  protective_cushion: { association: "a cushion or buffer that leaves room for the unexpected", surfaces: ["cushion", "buffer"] },
  responsible_stewardship: { association: "responsible care, oversight and custodianship over time", surfaces: ["steward", "stewardship"] },
  emotional_solace: { association: "solace, reassurance and a sense of emotional shelter", surfaces: ["solace"] },
  personal_agency: { association: "personal agency and the ability to make one's own choices", surfaces: ["agency"] },
  domestic_cat: { association: "a familiar domestic cat and its individual character", surfaces: ["tabby", "housecat"] },
  hearthside_comfort: { association: "warmth and comfort beside a familiar hearth", surfaces: ["hearthside"] },
  poised_progress: { association: "poise, renewed momentum and the capacity to flourish", surfaces: ["poise", "resurgence", "flourish"] },
  clinical_career: { association: "a clinical career and the opportunity to serve in a care setting", surfaces: ["career", "clinician", "opportunity", "ward", "wardship"] },
  comparison_bearings: { association: "bearings, a useful point of view and a clearer comparison", surfaces: ["bearings", "lens", "view"] },
  rate_summary: { association: "a concise view of rates and comparable terms", surfaces: ["ratecard"] },
  practical_pathway: { association: "a pathway through a decision or next step", surfaces: ["pathway"] },
  neighbourhood_context: { association: "a recognisable neighbourhood and nearby community setting", surfaces: ["neighbourhood", "neighbourly", "neighbour"] },
  relationship_retention: { association: "keeping a relationship active through dependable follow-up", surfaces: ["retention", "supportership", "relation", "supporter", "keep"] },
  nearby_access_french: { association: "closeness, neighbourhood access and help within reach", surfaces: ["proximite", "voisinage", "accessible"] },
  rural_vitality_french: { association: "rural life, wellbeing and local vitality", surfaces: ["ruralite", "vitalite"] },
  seasonal_produce: { association: "seasonal timing and produce at the point of harvest", surfaces: ["seasonal"] },
  harvest_yield: { association: "seasonal gathering and the yield of cultivated produce", surfaces: ["harvest"] },
  traceable_origin: { association: "a traceable origin and a clear account of where something came from", surfaces: ["provenance"] },
  school_localism: { association: "local exchange centred on a school and its surrounding community", surfaces: ["schoolyard", "localism"] },
  after_hours_food: { association: "food available after hours and around late-night routines", surfaces: ["afterhours", "nightowl", "pantry"] },
  shared_union: { association: "a union that brings people or traditions together", surfaces: ["union"] },
  shared_gathering: { association: "people coming together around a shared occasion", surfaces: ["gathering"] },
  balanced_harmony: { association: "balance, accord and different parts working well together", surfaces: ["harmony", "harmonious"] },
  immediate_booking: { association: "an opening that can be booked for the immediate occasion", surfaces: ["tonight", "opening", "seating", "availability", "walkin", "spontaneous"] },
  dining_details: { association: "the practical and social details of dining at a table", surfaces: ["tableware", "dining", "bistro", "aperitif"] },
  convivial_tone: { association: "a convivial, sociable and welcoming atmosphere", surfaces: ["convivial"] },
  musical_rhythm: { association: "rhythm, pulse and a pattern that carries sound forward", surfaces: ["rhythm"] },
  artisan_object: { association: "a distinctive object selected for character and craft", surfaces: ["curio"] },
  artisan_skill: { association: "handiwork, artistry and the skill behind a made object", surfaces: ["handiwork", "artistry"] },
  artisan_studio: { association: "an atelier where skilled, independent work is made", surfaces: ["atelier"] },
  community_participation: { association: "participation, goodwill and practical service within a community", surfaces: ["participation", "goodwill", "helpfulness", "civicminded", "voluntary", "service"] },
  textured_curl: { association: "the visible texture and shape of coils or a crowned curl pattern", surfaces: ["textured", "coiled", "crowned"] },
  silk_finish: { association: "a silken feel and a smooth, refined finish", surfaces: ["silken", "silk"] },
  visible_luminosity: { association: "luminosity and a softly visible glow", surfaces: ["luminosity"] },
  clean_purity: { association: "purity and a clean, unadulterated quality", surfaces: ["purity", "pure"] },
  coffee_roastery: { association: "a roastery and the craft of preparing coffee beans", surfaces: ["roastery", "barista"] },
  coffee_cup: { association: "recognisable coffee character in the cup", surfaces: ["crema", "arabica", "espresso", "cafetiere", "cup"] },
  bakery_crumb: { association: "a warm bakery crumb and something freshly made", surfaces: ["crumb"] },
  family_successor: { association: "the next generation and a planned family-business transition", surfaces: ["progeny", "generational", "forebear", "transition", "successor"] },
  lisbon_tile: { association: "the patterned azulejo tiles associated with Lisbon", surfaces: ["azulejo"] },
  group_kinship: { association: "kinship and trust within a small travelling group", surfaces: ["kinship"] },
  wilderness_route: { association: "a trackway through open wilderness", surfaces: ["trackway", "wilderness"] },
  ryokan_space: { association: "recognisable details of a traditional Japanese guest room", surfaces: ["tatami", "engawa", "washitsu"] },
  japanese_heart: { association: "kokoro, the Japanese idea of heart, mind and spirit", surfaces: ["kokoro"] },
  welcoming_lantern: { association: "a lantern's warm light and a sense of welcome", surfaces: ["lantern"] },
  interior_tone: { association: "tonality, tactile detail and a composed interior atmosphere", surfaces: ["tonality", "tactile", "composure", "layering", "livability"] },
  recast_metal: { association: "precious metal recast or reforged for a new life", surfaces: ["recast", "reforged"] },
  enduring_value: { association: "enduring value and something made to be treasured", surfaces: ["enduring", "treasured", "lasting"] },
  general_motion: { association: "bodily movement, progress and a change of position", surfaces: ["move"] },
  personal_thought: { association: "thought, reflection and the inner life of the mind", surfaces: ["mind"] },
  play_activity: { association: "play, enjoyable activity and a light sense of discovery", surfaces: ["play", "playful"] },
  renewal_new_life: { association: "renewal, restoration and a useful new life", surfaces: ["renew", "renewal", "renewed"] },
  kenya_place: { association: "Kenya as a place and source of local identity", surfaces: ["kenya"] },
  hosted_guest: { association: "a welcomed guest or visitor being hosted for a stay", surfaces: ["guest"] },
  practical_adaptation: { association: "adjusting or repurposing something for a new use", surfaces: ["adapt", "adaptive"] },
  purposeful_plan: { association: "preparation, coordination and an intended course of action", surfaces: ["plan"] },
  held_in_reserve: { association: "something booked, held or set aside for later", surfaces: ["reserve"] },
  track_record: { association: "a path or recorded sequence that can be followed over time", surfaces: ["track"] },
  reasoning_logic: { association: "logic, structured reasoning and solving a problem", surfaces: ["logic"] },
  harbour_refuge: { association: "a harbour as a place of refuge, shelter and safe anchorage", surfaces: ["harbour"] },
  repeated_practice: { association: "repeated exercise, an established method or a working custom", surfaces: ["practice"] },
  pocket_space: { association: "a small, practical space kept close at hand", surfaces: ["pocket"] },
  attentive_listening: { association: "listening carefully and giving someone room to speak", surfaces: ["listen", "talk", "space"] },
  private_support: { association: "privacy, support and a protected personal setting", surfaces: ["private", "support"] },
  urban_setting: { association: "a city or urban neighbourhood setting", surfaces: ["city", "urban"] },
  attentive_quality: { association: "an attentive and observant quality", surfaces: ["attentive"] },
  beginning_again: { association: "beginning again with a sense of onward progress", surfaces: ["again"] },
  connecting_link: { association: "a link that connects two people, places or choices", surfaces: ["link"] },
  childcare_professional: { association: "a carer and their responsibility for dependable childcare", surfaces: ["carer"] },
  verified_choice: { association: "a vetted choice that has been checked with care", surfaces: ["vetted", "trusted"] },
  practical_meal: { association: "a practical meal and the plate it is served on", surfaces: ["meal", "plate"] },
  access_pass: { association: "a pass that provides simple, repeat access", surfaces: ["pass"] },
  late_timing: { association: "late or nightly timing", surfaces: ["late", "nightly"] },
  clever_thinking: { association: "clever thinking and a satisfying mental turn", surfaces: ["clever"] },
  guiding_atlas: { association: "an atlas as a guide across places and traditions", surfaces: ["atlas"] },
  joyful_energy: { association: "joyful energy and an optimistic emotional tone", surfaces: ["joyful"] },
  woven_together: { association: "different strands woven into a coherent whole", surfaces: ["woven"] },
  open_seat: { association: "an available seat ready for a guest", surfaces: ["seat"] },
  immediate_time: { association: "immediacy and action in the present moment", surfaces: ["last", "now", "instant"] },
  quick_flash: { association: "a quick flash of visibility and energy", surfaces: ["flash"] },
  independent_artist: { association: "an independent artist and their distinct creative identity", surfaces: ["artist", "independent"] },
  echoing_sound: { association: "an echo or wave that carries sound outward", surfaces: ["echo", "wave"] },
  discovery_find: { association: "finding something worth discovering", surfaces: ["find"] },
  fresh_quality: { association: "freshness and a sense of something newly encountered", surfaces: ["fresh"] },
  everyday_language: { association: "words used fluently in everyday conversation", surfaces: ["daily", "word", "fluent", "everyday"] },
  handmade_origin: { association: "something handmade and visibly shaped by craft", surfaces: ["handmade", "crafted"] },
  discovered_object: { association: "an object found and brought into view", surfaces: ["found"] },
  craft_foundry: { association: "a foundry as a place where material is shaped", surfaces: ["foundry"] },
  helping_hands: { association: "willing hands ready to help", surfaces: ["hands", "willing"] },
  curl_crown: { association: "a crown of curls worn with confidence", surfaces: ["crown", "proud"] },
  considered_ritual: { association: "a repeated ritual carried out with care", surfaces: ["ritual"] },
  inclusive_welcome: { association: "an inclusive welcome that leaves room for difference", surfaces: ["inclusive"] },
  balcony_space: { association: "a balcony or rail used as compact growing space", surfaces: ["balcony", "rail"] },
  garden_setting: { association: "a garden and the practical work of growing", surfaces: ["garden"] },
  fresh_dew: { association: "fresh dew and a light veil of moisture", surfaces: ["dew", "veil"] },
  refined_quality: { association: "a refined and carefully finished quality", surfaces: ["refined"] },
  coastal_tide: { association: "a coastal tide and the rhythm of the shoreline", surfaces: ["tide", "coastal"] },
  property_estate: { association: "an estate or property considered as a whole", surfaces: ["estate"] },
  travelling_crew: { association: "a small crew travelling or working together", surfaces: ["crew"] },
  modern_quality: { association: "a modern, current and considered quality", surfaces: ["modern"] },
  warm_tone: { association: "warmth and an inviting emotional tone", surfaces: ["warm"] },
} as const satisfies Record<string, AssociationDefinition>

export type RationaleAssociationId = keyof typeof QUICK_RATIONALE_ASSOCIATIONS

interface LocalePartDefinition {
  surface: string
  associationId: RationaleAssociationId
}

interface LocaleFormDefinition {
  label: string
  parts: readonly LocalePartDefinition[]
  allowedConceptIds: readonly RationaleConceptId[]
}

interface LocaleDefinition {
  label: string
  forms: Readonly<Record<string, LocaleFormDefinition>>
}

/** Only these exact reviewed ASCII label forms can receive locale wording. */
export const QUICK_RATIONALE_LOCALES = {
  "fr-CA": {
    label: "French (Quebec)",
    forms: {
      liensante: { label: "liensante", parts: [{ surface: "lien", associationId: "connection" }, { surface: "sante", associationId: "health" }], allowedConceptIds: ["health", "community", "cue:rural quebec healthcare access", "cue:reassuring care"] },
      soinproche: { label: "soinproche", parts: [{ surface: "soin", associationId: "care" }, { surface: "proche", associationId: "locality" }], allowedConceptIds: ["health", "community", "cue:rural quebec healthcare access", "cue:rural reach"] },
      proxisante: { label: "proxisante", parts: [{ surface: "proxi", associationId: "locality" }, { surface: "sante", associationId: "health" }], allowedConceptIds: ["health", "community", "cue:rural quebec healthcare access", "cue:rural reach"] },
      santefamille: { label: "santefamille", parts: [{ surface: "sante", associationId: "health" }, { surface: "famille", associationId: "family" }], allowedConceptIds: ["health", "family", "cue:rural quebec healthcare access", "cue:family support"] },
      soinvillage: { label: "soinvillage", parts: [{ surface: "soin", associationId: "care" }, { surface: "village", associationId: "locality" }], allowedConceptIds: ["health", "community", "cue:rural quebec healthcare access", "cue:rural reach"] },
      accesrural: { label: "accesrural", parts: [{ surface: "acces", associationId: "generic_literal" }, { surface: "rural", associationId: "locality" }], allowedConceptIds: ["health", "community", "cue:rural quebec healthcare access", "cue:rural reach"] },
      santevillage: { label: "santevillage", parts: [{ surface: "sante", associationId: "health" }, { surface: "village", associationId: "locality" }], allowedConceptIds: ["health", "community", "cue:rural quebec healthcare access", "cue:rural reach"] },
      santeproche: { label: "santeproche", parts: [{ surface: "sante", associationId: "health" }, { surface: "proche", associationId: "locality" }], allowedConceptIds: ["health", "community", "cue:rural quebec healthcare access", "cue:rural reach"] },
    },
  },
  cy: {
    label: "Welsh",
    forms: {
      marchnadleol: { label: "marchnadleol", parts: [{ surface: "marchnad", associationId: "commerce" }, { surface: "leol", associationId: "locality" }], allowedConceptIds: ["agriculture", "commerce", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
      cynhyrchulleol: { label: "cynhyrchulleol", parts: [{ surface: "cynnyrch", associationId: "farming" }, { surface: "lleol", associationId: "locality" }], allowedConceptIds: ["agriculture", "commerce", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
      ffermcymru: { label: "ffermcymru", parts: [{ surface: "fferm", associationId: "farming" }, { surface: "cymru", associationId: "locality" }], allowedConceptIds: ["agriculture", "commerce", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
      ffermwyrcymru: { label: "ffermwyrcymru", parts: [{ surface: "ffermwyr", associationId: "farming" }, { surface: "cymru", associationId: "locality" }], allowedConceptIds: ["agriculture", "commerce", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
      bwydlleol: { label: "bwydlleol", parts: [{ surface: "bwyd", associationId: "food" }, { surface: "lleol", associationId: "locality" }], allowedConceptIds: ["agriculture", "commerce", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
      ffermleol: { label: "ffermleol", parts: [{ surface: "fferm", associationId: "farming" }, { surface: "leol", associationId: "locality" }], allowedConceptIds: ["agriculture", "commerce", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
      bwydcymru: { label: "bwydcymru", parts: [{ surface: "bwyd", associationId: "food" }, { surface: "cymru", associationId: "locality" }], allowedConceptIds: ["agriculture", "commerce", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
      ysgolfferm: { label: "ysgolfferm", parts: [{ surface: "ysgol", associationId: "school" }, { surface: "fferm", associationId: "farming" }], allowedConceptIds: ["agriculture", "learning", "commerce", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
      cnwdcymru: { label: "cnwdcymru", parts: [{ surface: "cnwd", associationId: "farming" }, { surface: "cymru", associationId: "locality" }], allowedConceptIds: ["agriculture", "commerce", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
      cynhaeaf: { label: "cynhaeaf", parts: [{ surface: "cynhaeaf", associationId: "farming" }], allowedConceptIds: ["agriculture", "cue:welsh farm-to-school trade", "cue:welsh identity"] },
    },
  },
} as const satisfies Record<string, LocaleDefinition>

export type RationaleLocaleId = keyof typeof QUICK_RATIONALE_LOCALES

export const RATIONALE_EVIDENCE_KINDS = ["visible_part", "source_word", "whole_word"] as const
export type EvidencePartKind = (typeof RATIONALE_EVIDENCE_KINDS)[number]

export const RATIONALE_EVIDENCE_PROVENANCE = ["literal", "curated", "sound"] as const
export type EvidenceProvenance = (typeof RATIONALE_EVIDENCE_PROVENANCE)[number]

export const RATIONALE_RELEVANCE_STATES = ["category_evidence", "context_only"] as const
export type RationaleRelevance = (typeof RATIONALE_RELEVANCE_STATES)[number]

export interface EvidencePart {
  id: string
  surface: string
  associationId: RationaleAssociationId
  kind: EvidencePartKind
  provenance: EvidenceProvenance
}

export type RationaleConstruction =
  | { kind: "literal_compound"; leftEvidenceId: string; rightEvidenceId: string }
  | { kind: "short_phrase"; leftEvidenceId: string; rightEvidenceId: string }
  | { kind: "orthographic_fusion"; leftEvidenceId: string; rightEvidenceId: string; overlap: string }
  | { kind: "semantic_word"; evidenceId: string }
  | { kind: "alternate_spelling"; sourceEvidenceId: string; rule: "ph_to_f" | "terminal_ic_to_ik" }
  | { kind: "locale_form"; localeId: RationaleLocaleId; formId: string }
  | { kind: "abstract" }

export interface RationalePlan {
  version: typeof QUICK_RATIONALE_VERSION
  name: string
  conceptId: RationaleConceptId
  tone: RationaleTone
  relevance: RationaleRelevance
  construction: RationaleConstruction
  evidence: readonly EvidencePart[]
}

export type RationaleValidationCode =
  | "invalid_shape"
  | "unknown_field"
  | "invalid_version"
  | "invalid_name"
  | "invalid_concept_id"
  | "invalid_tone"
  | "invalid_relevance"
  | "invalid_construction"
  | "invalid_evidence"
  | "duplicate_evidence_id"
  | "unknown_association_id"
  | "association_surface_mismatch"
  | "association_concept_mismatch"
  | "unknown_evidence_reference"
  | "unused_evidence"
  | "evidence_kind_mismatch"
  | "construction_mismatch"
  | "unknown_locale_id"
  | "unknown_locale_form"
  | "locale_concept_mismatch"

export interface RationaleValidationIssue {
  code: RationaleValidationCode
  path: string
}

export type RationaleValidationResult =
  | { ok: true; plan: RationalePlan }
  | { ok: false; issues: readonly RationaleValidationIssue[] }

export interface RenderedRationaleV2 {
  frames: readonly [string, string, string, string]
  text: string
  fallback: boolean
  variantIds: readonly [number, number, number, number]
  validationIssues: readonly RationaleValidationIssue[]
}

const FALLBACK_FRAMES = [
  "This candidate remains an unverified naming direction rather than a factual product claim.",
  "Its construction could not be confirmed from the permitted evidence.",
  "Review pronunciation, memorability, distinctiveness and audience fit before shortlisting it for any customer-facing use.",
  "No unverified category meaning has been added.",
] as const

const TONE_COPY: Record<RationaleTone, string> = {
  friendly: "warm and approachable",
  playful: "lively and light-footed",
  premium: "restrained and considered",
  tech: "modern and technically fluent",
  clean: "clear and uncluttered",
  bold: "confident and energetic",
}

const DENIED_CLAIM_PATTERNS = [
  /\bguarantee(?:d|s)?\b/i,
  /\btrademark(?:able|ed)?\b/i,
  /\bdomain (?:is )?available\b/i,
  /\blegally safe\b/i,
  /\bclinically proven\b/i,
  /\b(?:cure|cures|cured|treats|treated|prevents|prevented|diagnoses|diagnosed)\b/i,
  /\brisk[- ]free\b/i,
  /\bguaranteed returns?\b/i,
  /\bexclusive ownership\b/i,
  /\b(?:means|translates) (?:as|to)\b/i,
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[], path: string, issues: RationaleValidationIssue[]): boolean {
  const allowed = new Set(keys)
  let valid = true
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push({ code: "unknown_field", path: `${path}.${key}` })
      valid = false
    }
  }
  for (const key of keys) {
    if (!(key in value)) {
      issues.push({ code: "invalid_shape", path: `${path}.${key}` })
      valid = false
    }
  }
  return valid
}

function toLabel(value: string): string {
  return value.toLowerCase()
}

function isName(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{4,24}$/.test(value)
}

function isSurface(value: unknown): value is string {
  return typeof value === "string" && /^[a-z]{2,20}$/.test(value)
}

function isEvidenceId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9_]{0,31}$/.test(value)
}

function isConceptId(value: unknown): value is RationaleConceptId {
  return typeof value === "string" && value in QUICK_RATIONALE_CONCEPTS
}

function isAssociationId(value: unknown): value is RationaleAssociationId {
  return typeof value === "string" && value in QUICK_RATIONALE_ASSOCIATIONS
}

function isTone(value: unknown): value is RationaleTone {
  return typeof value === "string" && (QUICK_RATIONALE_TONES as readonly string[]).includes(value)
}

function isRelevance(value: unknown): value is RationaleRelevance {
  return typeof value === "string" && (RATIONALE_RELEVANCE_STATES as readonly string[]).includes(value)
}

function validateEvidence(rawEvidence: unknown, issues: RationaleValidationIssue[]): EvidencePart[] {
  if (!Array.isArray(rawEvidence) || rawEvidence.length > 2) {
    issues.push({ code: "invalid_evidence", path: "plan.evidence" })
    return []
  }

  const evidence: EvidencePart[] = []
  const ids = new Set<string>()
  rawEvidence.forEach((rawPart, index) => {
    const path = `plan.evidence[${index}]`
    if (!isRecord(rawPart)) {
      issues.push({ code: "invalid_evidence", path })
      return
    }
    hasExactKeys(rawPart, ["id", "surface", "associationId", "kind", "provenance"], path, issues)
    if (!isEvidenceId(rawPart.id) || !isSurface(rawPart.surface) || !isAssociationId(rawPart.associationId)
      || typeof rawPart.kind !== "string" || !(RATIONALE_EVIDENCE_KINDS as readonly string[]).includes(rawPart.kind)
      || typeof rawPart.provenance !== "string" || !(RATIONALE_EVIDENCE_PROVENANCE as readonly string[]).includes(rawPart.provenance)) {
      if (!isAssociationId(rawPart.associationId)) issues.push({ code: "unknown_association_id", path: `${path}.associationId` })
      else issues.push({ code: "invalid_evidence", path })
      return
    }
    if (ids.has(rawPart.id)) {
      issues.push({ code: "duplicate_evidence_id", path: `${path}.id` })
      return
    }
    ids.add(rawPart.id)
    const definition = QUICK_RATIONALE_ASSOCIATIONS[rawPart.associationId] as AssociationDefinition
    if (definition.surfaces && !(definition.surfaces as readonly string[]).includes(rawPart.surface)) {
      issues.push({ code: "association_surface_mismatch", path: `${path}.associationId` })
      return
    }
    evidence.push(rawPart as unknown as EvidencePart)
  })
  return evidence
}

function parseConstruction(rawConstruction: unknown, issues: RationaleValidationIssue[]): RationaleConstruction | null {
  const path = "plan.construction"
  if (!isRecord(rawConstruction) || typeof rawConstruction.kind !== "string") {
    issues.push({ code: "invalid_construction", path })
    return null
  }

  switch (rawConstruction.kind) {
    case "literal_compound":
    case "short_phrase":
      hasExactKeys(rawConstruction, ["kind", "leftEvidenceId", "rightEvidenceId"], path, issues)
      if (!isEvidenceId(rawConstruction.leftEvidenceId) || !isEvidenceId(rawConstruction.rightEvidenceId)) break
      return rawConstruction as unknown as RationaleConstruction
    case "orthographic_fusion":
      hasExactKeys(rawConstruction, ["kind", "leftEvidenceId", "rightEvidenceId", "overlap"], path, issues)
      if (!isEvidenceId(rawConstruction.leftEvidenceId) || !isEvidenceId(rawConstruction.rightEvidenceId)
        || typeof rawConstruction.overlap !== "string" || !/^[a-z]{1,4}$/.test(rawConstruction.overlap)) break
      return rawConstruction as unknown as RationaleConstruction
    case "semantic_word":
      hasExactKeys(rawConstruction, ["kind", "evidenceId"], path, issues)
      if (!isEvidenceId(rawConstruction.evidenceId)) break
      return rawConstruction as unknown as RationaleConstruction
    case "alternate_spelling":
      hasExactKeys(rawConstruction, ["kind", "sourceEvidenceId", "rule"], path, issues)
      if (!isEvidenceId(rawConstruction.sourceEvidenceId)
        || (rawConstruction.rule !== "ph_to_f" && rawConstruction.rule !== "terminal_ic_to_ik")) break
      return rawConstruction as unknown as RationaleConstruction
    case "locale_form":
      hasExactKeys(rawConstruction, ["kind", "localeId", "formId"], path, issues)
      if (typeof rawConstruction.localeId !== "string" || typeof rawConstruction.formId !== "string") break
      return rawConstruction as unknown as RationaleConstruction
    case "abstract":
      hasExactKeys(rawConstruction, ["kind"], path, issues)
      return { kind: "abstract" }
    default:
      break
  }
  issues.push({ code: "invalid_construction", path })
  return null
}

function evidenceById(evidence: readonly EvidencePart[], id: string): EvidencePart | undefined {
  return evidence.find((part) => part.id === id)
}

function validateEvidenceReference(
  evidence: readonly EvidencePart[],
  id: string,
  expectedKind: EvidencePartKind,
  path: string,
  issues: RationaleValidationIssue[],
): EvidencePart | null {
  const part = evidenceById(evidence, id)
  if (!part) {
    issues.push({ code: "unknown_evidence_reference", path })
    return null
  }
  if (part.kind !== expectedKind) {
    issues.push({ code: "evidence_kind_mismatch", path })
    return null
  }
  return part
}

function validateConstructionReplay(plan: RationalePlan, issues: RationaleValidationIssue[]): void {
  const name = toLabel(plan.name)
  const used = new Set<string>()
  for (const part of plan.evidence) {
    const definition = QUICK_RATIONALE_ASSOCIATIONS[part.associationId] as AssociationDefinition
    if (definition.allowedConceptIds && !definition.allowedConceptIds.includes(plan.conceptId)) {
      issues.push({ code: "association_concept_mismatch", path: `plan.evidence.${part.id}.associationId` })
    }
  }
  const requireEvidence = (id: string, kind: EvidencePartKind, path: string): EvidencePart | null => {
    used.add(id)
    return validateEvidenceReference(plan.evidence, id, kind, path, issues)
  }

  switch (plan.construction.kind) {
    case "literal_compound":
    case "short_phrase": {
      const left = requireEvidence(plan.construction.leftEvidenceId, "visible_part", "plan.construction.leftEvidenceId")
      const right = requireEvidence(plan.construction.rightEvidenceId, "visible_part", "plan.construction.rightEvidenceId")
      if (left && right && (left.surface === right.surface || `${left.surface}${right.surface}` !== name)) {
        issues.push({ code: "construction_mismatch", path: "plan.name" })
      }
      break
    }
    case "orthographic_fusion": {
      const left = requireEvidence(plan.construction.leftEvidenceId, "source_word", "plan.construction.leftEvidenceId")
      const right = requireEvidence(plan.construction.rightEvidenceId, "source_word", "plan.construction.rightEvidenceId")
      const overlap = plan.construction.overlap
      if (left && right) {
        const validSeam = left.surface !== right.surface && left.surface.endsWith(overlap) && right.surface.startsWith(overlap)
        const replay = validSeam ? `${left.surface}${right.surface.slice(overlap.length)}` : ""
        if (!validSeam || replay !== name) issues.push({ code: "construction_mismatch", path: "plan.name" })
      }
      break
    }
    case "semantic_word": {
      const part = requireEvidence(plan.construction.evidenceId, "whole_word", "plan.construction.evidenceId")
      if (part && part.surface !== name) issues.push({ code: "construction_mismatch", path: "plan.name" })
      break
    }
    case "alternate_spelling": {
      const part = requireEvidence(plan.construction.sourceEvidenceId, "source_word", "plan.construction.sourceEvidenceId")
      if (part) {
        const replay = plan.construction.rule === "ph_to_f"
          ? (part.surface.includes("ph") ? part.surface.replaceAll("ph", "f") : "")
          : (part.surface.endsWith("ic") ? `${part.surface.slice(0, -2)}ik` : "")
        if (!replay || replay !== name) issues.push({ code: "construction_mismatch", path: "plan.name" })
      }
      break
    }
    case "locale_form": {
      const locale = QUICK_RATIONALE_LOCALES[plan.construction.localeId]
      if (!locale) {
        issues.push({ code: "unknown_locale_id", path: "plan.construction.localeId" })
        break
      }
      const form = locale.forms[plan.construction.formId as keyof typeof locale.forms] as LocaleFormDefinition | undefined
      if (!form) {
        issues.push({ code: "unknown_locale_form", path: "plan.construction.formId" })
        break
      }
      if (form.label !== name) issues.push({ code: "construction_mismatch", path: "plan.name" })
      if (!form.allowedConceptIds.includes(plan.conceptId)) {
        issues.push({ code: "locale_concept_mismatch", path: "plan.conceptId" })
      }
      break
    }
    case "abstract":
      if (plan.relevance !== "context_only") {
        // A coined sound has no category evidence of its own. Keeping this as
        // a validation invariant prevents callers from turning positioning
        // context into an invented definition, etymology or translation.
        issues.push({ code: "invalid_relevance", path: "plan.relevance" })
      }
      break
  }

  for (const part of plan.evidence) {
    if (!used.has(part.id)) issues.push({ code: "unused_evidence", path: `plan.evidence.${part.id}` })
  }
}

/** Validates both the strict data shape and the visible construction replay. */
export function validateRationalePlan(value: unknown): RationaleValidationResult {
  const issues: RationaleValidationIssue[] = []
  if (!isRecord(value)) return { ok: false, issues: [{ code: "invalid_shape", path: "plan" }] }
  hasExactKeys(value, ["version", "name", "conceptId", "tone", "relevance", "construction", "evidence"], "plan", issues)

  if (value.version !== QUICK_RATIONALE_VERSION) issues.push({ code: "invalid_version", path: "plan.version" })
  if (!isName(value.name)) issues.push({ code: "invalid_name", path: "plan.name" })
  if (!isConceptId(value.conceptId)) issues.push({ code: "invalid_concept_id", path: "plan.conceptId" })
  if (!isTone(value.tone)) issues.push({ code: "invalid_tone", path: "plan.tone" })
  if (!isRelevance(value.relevance)) issues.push({ code: "invalid_relevance", path: "plan.relevance" })

  const evidence = validateEvidence(value.evidence, issues)
  const construction = parseConstruction(value.construction, issues)
  if (issues.length > 0 || !construction || !isName(value.name) || !isConceptId(value.conceptId) || !isTone(value.tone) || !isRelevance(value.relevance)) {
    return { ok: false, issues }
  }

  const plan: RationalePlan = {
    version: QUICK_RATIONALE_VERSION,
    name: value.name,
    conceptId: value.conceptId,
    tone: value.tone,
    relevance: value.relevance,
    construction,
    evidence,
  }
  validateConstructionReplay(plan, issues)
  return issues.length > 0 ? { ok: false, issues } : { ok: true, plan }
}

export function resolveRationaleConceptId(cue: string | null | undefined): RationaleConceptId {
  if (!cue) return "generic"
  return QUICK_RATIONALE_CONCEPT_ALIASES[cue.trim().toLowerCase() as keyof typeof QUICK_RATIONALE_CONCEPT_ALIASES] || "generic"
}

export type GenericRationaleAssociationId = "generic_literal" | "generic_curated" | "generic_sound"

/** Resolves only exact reviewed surface bindings; arbitrary text gets neutral evidence. */
export function resolveRationaleAssociationId(
  surface: string,
  fallback: GenericRationaleAssociationId = "generic_literal",
): RationaleAssociationId {
  const label = surface.trim().toLowerCase()
  if (!/^[a-z]{2,20}$/.test(label)) return fallback
  for (const [associationId, rawDefinition] of Object.entries(QUICK_RATIONALE_ASSOCIATIONS)) {
    const definition = rawDefinition as AssociationDefinition
    if (!definition.allowedConceptIds && definition.surfaces?.includes(label)) {
      return associationId as RationaleAssociationId
    }
  }
  return fallback
}

export interface ReviewedLocaleFormReference {
  localeId: RationaleLocaleId
  formId: string
}

/** Finds an exact reviewed locale label without deriving language claims. */
export function resolveReviewedRationaleLocaleForm(
  name: string,
  preferredLocale?: RationaleLocaleId,
): ReviewedLocaleFormReference | null {
  const label = name.trim().toLowerCase()
  if (!/^[a-z]{4,24}$/.test(label)) return null
  const locales = Object.entries(QUICK_RATIONALE_LOCALES) as Array<[RationaleLocaleId, LocaleDefinition]>
  for (const [localeId, locale] of locales) {
    if (preferredLocale && localeId !== preferredLocale) continue
    if (locale.forms[label]?.label === label) return { localeId, formId: label }
  }
  return null
}

export function containsDeniedRationaleClaim(value: string): boolean {
  return DENIED_CLAIM_PATTERNS.some((pattern) => pattern.test(value))
}

function capitalise(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value
}

function quote(value: string): string {
  return `“${value}”`
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function variant(seed: string, frame: number, count: number): number {
  return stableHash(`${seed}|frame:${frame}`) % count
}

interface AssociationSource {
  surface: string
  associationId: RationaleAssociationId
}

const GENERIC_ASSOCIATION_IDS = new Set<RationaleAssociationId>([
  "generic_literal",
  "generic_curated",
  "generic_sound",
])

/** Generic evidence remains useful for validation but is never user-facing. */
function displayAssociation(source: AssociationSource): string | null {
  if (GENERIC_ASSOCIATION_IDS.has(source.associationId)) return null
  return QUICK_RATIONALE_ASSOCIATIONS[source.associationId].association
}

function associationSources(plan: RationalePlan): readonly AssociationSource[] {
  const evidence = (id: string) => evidenceById(plan.evidence, id) as EvidencePart
  switch (plan.construction.kind) {
    case "literal_compound":
    case "short_phrase":
    case "orthographic_fusion":
      return [evidence(plan.construction.leftEvidenceId), evidence(plan.construction.rightEvidenceId)]
    case "semantic_word":
      return [evidence(plan.construction.evidenceId)]
    case "alternate_spelling":
      return [evidence(plan.construction.sourceEvidenceId)]
    case "locale_form": {
      const locale = QUICK_RATIONALE_LOCALES[plan.construction.localeId]
      const form = locale.forms[plan.construction.formId as keyof typeof locale.forms] as LocaleFormDefinition
      return form.parts
    }
    case "abstract":
      return []
  }
}

function associationClause(sources: readonly AssociationSource[], selected: number): string {
  const known = sources
    .map((source) => ({ source, association: displayAssociation(source) }))
    .filter((item): item is { source: AssociationSource; association: string } => Boolean(item.association))

  if (known.length === 0) return ""
  if (known.length === 1) {
    const [{ source, association }] = known
    return selected % 2 === 0
      ? `; ${quote(source.surface)} suggests ${association}`
      : `; ${quote(source.surface)} evokes ${association}`
  }

  const [left, right] = known
  if (left.association === right.association) {
    return `; together, ${quote(left.source.surface)} and ${quote(right.source.surface)} suggest ${left.association}`
  }
  return selected % 2 === 0
    ? `; ${quote(left.source.surface)} suggests ${left.association}, while ${quote(right.source.surface)} suggests ${right.association}`
    : `; ${quote(left.source.surface)} evokes ${left.association}, and ${quote(right.source.surface)} adds ${right.association}`
}

function renderConstructionFrame(plan: RationalePlan, selected: number, includeAssociations = true): string {
  const name = capitalise(toLabel(plan.name))
  const evidence = (id: string) => evidenceById(plan.evidence, id) as EvidencePart
  const sources = associationSources(plan)
  const associations = includeAssociations ? associationClause(sources, selected) : ""
  switch (plan.construction.kind) {
    case "literal_compound":
    case "short_phrase": {
      const left = evidence(plan.construction.leftEvidenceId).surface
      const right = evidence(plan.construction.rightEvidenceId).surface
      const form = plan.construction.kind === "short_phrase" ? "compact phrase" : "compound"
      return selected % 2 === 0
        ? `${name} combines "${left}" and "${right}" as literal construction parts in a ${form}${associations}.`
        : `${name} combines "${left}" and "${right}" as literal construction parts to form a ${form}${associations}.`
    }
    case "orthographic_fusion": {
      const left = evidence(plan.construction.leftEvidenceId).surface
      const right = evidence(plan.construction.rightEvidenceId).surface
      return selected % 2 === 0
        ? `${name} blends ${quote(left)} and ${quote(right)} at their shared ${quote(plan.construction.overlap)} seam${associations}.`
        : `${name} joins ${quote(left)} to ${quote(right)} through the shared ${quote(plan.construction.overlap)} seam${associations}.`
    }
    case "semantic_word": {
      const surface = evidence(plan.construction.evidenceId).surface
      return selected % 2 === 0
        ? `${name} uses ${quote(surface)} as a complete word${associations}.`
        : `${name} keeps the whole word ${quote(surface)} intact${associations}.`
    }
    case "alternate_spelling": {
      const source = evidence(plan.construction.sourceEvidenceId).surface
      if (plan.construction.rule === "ph_to_f") {
        return selected % 2 === 0
          ? `${name} is a streamlined spelling of ${quote(source)}, keeping the familiar source sound recognisable${associations}.`
          : `${name} gives ${quote(source)} a cleaner visual form while keeping its familiar pronunciation recognisable${associations}.`
      }
      return selected % 2 === 0
        ? `${name} gives ${quote(source)} a sharper contemporary ending while keeping the source pronunciation broadly recognisable${associations}.`
        : `${name} is a modernised spelling of ${quote(source)}, retaining its intended sound with a more distinctive visual finish${associations}.`
    }
    case "locale_form": {
      const locale = QUICK_RATIONALE_LOCALES[plan.construction.localeId]
      const form = locale.forms[plan.construction.formId as keyof typeof locale.forms] as LocaleFormDefinition
      const visible = form.parts.map((part) => quote(part.surface))
      const construction = visible.length === 1
        ? `uses the reviewed ${locale.label} form ${visible[0]}`
        : `is a reviewed ${locale.label} construction joining ${visible.join(" and ")}`
      return `${name} ${construction}${associations}.`
    }
    case "abstract":
      return selected % 2 === 0
        ? `${name} is sound-led: it does not carry a literal brief cue or hidden split; judge its rhythm.`
        : `${name} is abstract: judge its cadence, pronunciation and visual shape, not a claimed hidden split.`
  }
}

/**
 * Keeps reviewed word meanings visible when the full construction wording
 * would otherwise push a rationale over the release copy limit.
 */
function renderCompactConstructionFrame(plan: RationalePlan, selected: number): string {
  const name = capitalise(toLabel(plan.name))
  const evidence = (id: string) => evidenceById(plan.evidence, id) as EvidencePart
  const associations = associationClause(associationSources(plan), selected)
  switch (plan.construction.kind) {
    case "literal_compound":
    case "short_phrase": {
      const left = evidence(plan.construction.leftEvidenceId).surface
      const right = evidence(plan.construction.rightEvidenceId).surface
      const form = plan.construction.kind === "short_phrase" ? "short phrase" : "compound"
      return `${name} combines "${left}" and "${right}" as a ${form}${associations}.`
    }
    case "orthographic_fusion": {
      const left = evidence(plan.construction.leftEvidenceId).surface
      const right = evidence(plan.construction.rightEvidenceId).surface
      return `${name} blends ${quote(left)} and ${quote(right)} at ${quote(plan.construction.overlap)}${associations}.`
    }
    case "semantic_word": {
      const surface = evidence(plan.construction.evidenceId).surface
      return `${name} uses ${quote(surface)} whole${associations}.`
    }
    case "alternate_spelling": {
      const source = evidence(plan.construction.sourceEvidenceId).surface
      return `${name} respells ${quote(source)} while retaining its intended sound${associations}.`
    }
    case "locale_form": {
      const locale = QUICK_RATIONALE_LOCALES[plan.construction.localeId]
      const form = locale.forms[plan.construction.formId as keyof typeof locale.forms] as LocaleFormDefinition
      const visible = form.parts.map((part) => quote(part.surface)).join(" and ")
      return `${name} uses the reviewed ${locale.label} form ${visible}${associations}.`
    }
    case "abstract":
      return renderConstructionFrame(plan, selected, false)
  }
}

function renderEvidenceFrame(plan: RationalePlan, selected: number): string {
  const known = associationSources(plan).filter((source) => displayAssociation(source))
  if (known.length === 0) return "No additional category meaning is asserted beyond the visible construction."
  return selected % 2 === 0
    ? "Only the visible sources and their ordinary associations are used."
    : "The explanation stays with the name's visible words and ordinary associations."
}

function renderConceptFrame(plan: RationalePlan, selected: number): string {
  const concept = QUICK_RATIONALE_CONCEPTS[plan.conceptId]
  const frames = [
    `For ${concept.audience}, it targets ${concept.cue} with ${concept.fit}.`,
    `The niche is ${concept.cue}; for ${concept.audience}, the name aims for ${concept.fit}.`,
    `${capitalise(concept.cue)} is the intended niche, aiming for ${concept.fit} with ${concept.audience}.`,
    `For ${concept.audience}, the intended fit is ${concept.cue} with ${concept.fit}.`,
  ] as const
  return frames[selected % frames.length]
}

function renderCompactConceptFrame(plan: RationalePlan): string {
  const concept = QUICK_RATIONALE_CONCEPTS[plan.conceptId]
  return `${capitalise(concept.cue)} targets ${concept.audience} with ${concept.fit}.`
}

function renderDecisionFrame(plan: RationalePlan): string {
  const concept = QUICK_RATIONALE_CONCEPTS[plan.conceptId]
  const hasKnownAssociation = associationSources(plan).some((source) => displayAssociation(source))
  const ambiguous = plan.construction.kind === "abstract" || !hasKnownAssociation

  if (plan.relevance === "context_only") {
    return concept.sensitivity === "none"
      ? "The wording stands not as evidence of a category meaning; test fit rather than assuming one."
      : "It is not evidence of a category meaning; test comprehension before shortlisting."
  }
  if (concept.sensitivity !== "none") {
    return "Because this is a sensitive category, test comprehension and tone before shortlisting."
  }
  if (ambiguous) {
    return "The construction is clear, but its niche signal may need supporting context."
  }
  return ""
}

function fallbackResult(issues: readonly RationaleValidationIssue[]): RenderedRationaleV2 {
  return {
    frames: FALLBACK_FRAMES,
    text: FALLBACK_FRAMES.slice(0, 3).join(" "),
    fallback: true,
    variantIds: [0, 0, 0, 0],
    validationIssues: issues,
  }
}

/**
 * Renders concise user-facing copy from strict reviewed data. Invalid input is
 * never interpolated into output; it receives the fixed neutral fallback.
 */
export function renderRationaleV2(value: unknown): RenderedRationaleV2 {
  const validation = validateRationalePlan(value)
  if (!validation.ok) return fallbackResult(validation.issues)

  const plan = validation.plan
  const seed = `${toLabel(plan.name)}|${plan.conceptId}|${plan.tone}|${plan.relevance}|${plan.construction.kind}`
  const variantIds = [variant(seed, 0, 6), variant(seed, 1, 6), variant(seed, 2, 8), variant(seed, 3, 8)] as const
  let construction = renderConstructionFrame(plan, variantIds[0])
  const evidence = renderEvidenceFrame(plan, variantIds[1])
  let concept = renderConceptFrame(plan, variantIds[2])
  const tradeoff = renderDecisionFrame(plan)
  let text = [construction, concept, tradeoff].filter(Boolean).join(" ")
  if ((text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0) > 65) {
    construction = renderCompactConstructionFrame(plan, variantIds[0])
    text = [construction, concept, tradeoff].filter(Boolean).join(" ")
  }
  if ((text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0) > 65) {
    concept = renderCompactConceptFrame(plan)
    text = [construction, concept, tradeoff].filter(Boolean).join(" ")
  }
  if ((text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0) > 65) {
    construction = renderConstructionFrame(plan, variantIds[0], false)
    text = [construction, concept, tradeoff].filter(Boolean).join(" ")
  }
  const frames = [
    construction,
    evidence,
    concept,
    tradeoff || `The intended tone is ${TONE_COPY[plan.tone]}.`,
  ] as const
  if (containsDeniedRationaleClaim(text)) {
    return fallbackResult([{ code: "invalid_shape", path: "registry.denied_claim" }])
  }
  return { frames, text, fallback: false, variantIds, validationIssues: [] }
}

/** Read-only integrity audit for CI and future registry additions. */
export function auditQuickRationaleRegistries(expectedGeneratorCues: readonly string[] = []): readonly string[] {
  const issues: string[] = []
  for (const [id, concept] of Object.entries(QUICK_RATIONALE_CONCEPTS)) {
    for (const [field, value] of Object.entries(concept)) {
      if (typeof value === "string" && containsDeniedRationaleClaim(value)) issues.push(`concept.${id}.${field}`)
    }
  }
  for (const [id, association] of Object.entries(QUICK_RATIONALE_ASSOCIATIONS)) {
    if (containsDeniedRationaleClaim(association.association)) issues.push(`association.${id}`)
    const definition = association as AssociationDefinition
    for (const conceptId of definition.allowedConceptIds || []) {
      if (!(conceptId in QUICK_RATIONALE_CONCEPTS)) issues.push(`association.${id}.${conceptId}`)
    }
  }
  for (const [cue, conceptId] of Object.entries(QUICK_RATIONALE_CONCEPT_ALIASES)) {
    if (!(conceptId in QUICK_RATIONALE_CONCEPTS)) issues.push(`alias.${cue}`)
  }
  const assignedConcepts = new Set<string>()
  for (const [cue, conceptId] of Object.entries(QUICK_RATIONALE_CONCEPT_ALIASES)) {
    if (assignedConcepts.has(conceptId)) issues.push(`alias.shared.${conceptId}`)
    assignedConcepts.add(conceptId)
    const concept = QUICK_RATIONALE_CONCEPTS[conceptId as RationaleConceptId]
    if (!concept || concept.cue !== cue || concept.audience === "the intended customer") {
      issues.push(`alias.profile.${cue}`)
    }
  }
  for (const rawCue of expectedGeneratorCues) {
    const cue = rawCue.trim().toLowerCase()
    if (!(cue in QUICK_RATIONALE_CONCEPT_ALIASES)) issues.push(`coverage.${cue}`)
  }
  for (const [localeId, rawLocale] of Object.entries(QUICK_RATIONALE_LOCALES)) {
    const locale = rawLocale as LocaleDefinition
    for (const [formId, form] of Object.entries(locale.forms)) {
      if (form.label !== formId) issues.push(`locale.${localeId}.${formId}.label`)
      for (const part of form.parts) {
        const association = QUICK_RATIONALE_ASSOCIATIONS[part.associationId] as AssociationDefinition | undefined
        if (!association) issues.push(`locale.${localeId}.${formId}.${part.associationId}`)
        else if (association.surfaces && !(association.surfaces as readonly string[]).includes(part.surface)) {
          issues.push(`locale.${localeId}.${formId}.${part.surface}`)
        }
      }
      for (const conceptId of form.allowedConceptIds) {
        if (!(conceptId in QUICK_RATIONALE_CONCEPTS)) issues.push(`locale.${localeId}.${formId}.${conceptId}`)
      }
    }
  }
  return issues
}
