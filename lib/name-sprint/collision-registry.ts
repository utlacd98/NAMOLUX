import { ACTIVE_BRAND_REGISTRY } from "@/lib/founderSignal/spec"

export const COLLISION_REGISTRY_VERSION = "2026.08.31.1" as const
export const COLLISION_REGISTRY_EVALUATED_ON = "2026-08-31" as const

export type CollisionFame = "global" | "national" | "sector" | "limited"

export interface CollisionRegistryEntry {
  normalizedName: string
  displayName: string
  aliases: string[]
  phoneticForms: string[]
  entityType: "brand" | "company" | "product"
  industries: string[]
  geographies: string[]
  fame: CollisionFame
  active: boolean
  verificationSource: string
  lastChecked: string
}

const VERIFIED_OVERRIDES: Record<string, Partial<CollisionRegistryEntry>> = {
  cadence: {
    displayName: "Cadence",
    industries: ["software", "semiconductors", "electronic design automation"],
    fame: "global",
    verificationSource: "https://www.cadence.com/en_US/home.html",
  },
  tidal: {
    displayName: "TIDAL",
    industries: ["music streaming", "media", "consumer software"],
    fame: "global",
    verificationSource: "https://tidal.com/about",
  },
  mosaic: {
    displayName: "Mosaic",
    industries: ["software", "finance", "analytics"],
    fame: "sector",
    verificationSource: "https://www.mosaic.tech/",
  },
  parallax: {
    displayName: "Parallax",
    industries: ["software", "electronics", "creative tools"],
    fame: "sector",
    verificationSource: "https://www.parallax.com/about-parallax/",
  },
  accord: {
    displayName: "Accord",
    industries: ["software", "business services", "financial services"],
    fame: "sector",
    verificationSource: "internal-curated-registry",
  },
  warden: {
    displayName: "Warden",
    industries: ["software", "security", "technology"],
    fame: "sector",
    verificationSource: "internal-curated-registry",
  },
  zenith: {
    displayName: "Zenith",
    industries: ["consumer electronics", "financial services", "technology"],
    fame: "global",
    verificationSource: "internal-curated-registry",
  },
  actura: {
    displayName: "Actura",
    industries: ["software", "supply chain management", "business automation", "industrial technology"],
    fame: "sector",
    verificationSource: "https://www.uspto.gov/web/trademarks/tmog/20141014_OG.pdf",
  },
  anker: {
    displayName: "Anker",
    industries: ["consumer electronics", "technology", "hardware"],
    fame: "global",
    verificationSource: "https://www.anker.com/",
  },
  nucleus: {
    displayName: "Nucleus",
    industries: ["branding", "marketing", "business naming", "digital agency"],
    fame: "sector",
    verificationSource: "https://www.nucleus.co.uk/",
  },
  stripe: {
    displayName: "Stripe",
    industries: ["payments", "fintech", "software"],
    fame: "global",
    verificationSource: "https://stripe.com/",
  },
  notion: {
    displayName: "Notion",
    industries: ["productivity", "software", "collaboration"],
    fame: "global",
    verificationSource: "https://www.notion.so/",
  },
  figma: {
    displayName: "Figma",
    industries: ["design", "software", "collaboration"],
    fame: "global",
    verificationSource: "https://www.figma.com/",
  },
  gofundme: {
    displayName: "GoFundMe",
    industries: ["fundraising", "non-profit", "payments"],
    fame: "global",
    verificationSource: "https://www.gofundme.com/",
  },
  linear: {
    displayName: "Linear",
    industries: ["developer tools", "software", "project management"],
    fame: "sector",
    verificationSource: "https://linear.app/",
  },
  farline: {
    displayName: "Farline",
    industries: ["software", "forecasting", "scenario planning", "project management"],
    fame: "sector",
    verificationSource: "https://www.farline.ai/",
  },
  ballast: {
    displayName: "Ballast",
    industries: ["software", "market intelligence", "rail technology"],
    fame: "sector",
    verificationSource: "https://ballastos.com/",
  },
  holden: {
    displayName: "Holden",
    industries: ["automotive", "consumer brand"],
    fame: "national",
    verificationSource: "https://www.holden.com.au/",
  },
  lumen: {
    displayName: "Lumen",
    industries: ["technology", "networking", "cloud", "cybersecurity"],
    fame: "global",
    verificationSource: "https://www.lumen.com/en-us/about.html",
  },
  meridian: {
    displayName: "Meridian",
    industries: ["software", "forecasting", "decision intelligence", "supply chain"],
    fame: "sector",
    verificationSource: "https://meridianbusiness.com/solutions/netsuite-extensions/demand-planning-forecasting/",
  },
  orbis: {
    displayName: "ORBIS",
    industries: ["software", "business consulting", "supply chain management", "manufacturing"],
    fame: "sector",
    verificationSource: "https://www.orbis-group.com/en-de/company/about-us/",
  },
  waypoint: {
    displayName: "Waypoint",
    industries: ["software", "data operations", "lead management"],
    fame: "sector",
    verificationSource: "https://www.waypointsoftware.com/",
  },
  hintline: {
    displayName: "Hintline",
    industries: ["construction", "interior design", "business services"],
    fame: "limited",
    verificationSource: "https://hintline.in/",
  },
  telltide: {
    displayName: "Telltide",
    industries: ["software", "monitoring", "customer email", "feedback management"],
    fame: "sector",
    verificationSource: "https://telltide.io/terms/",
  },
  granary: {
    displayName: "Granary",
    industries: ["food", "consumer goods", "retail"],
    fame: "national",
    verificationSource: "https://www.hovis.co.uk/products?cat=granary-bread",
  },
  mapstone: {
    displayName: "Mapstone",
    industries: ["software", "blockchain", "digital identity", "data infrastructure"],
    fame: "sector",
    verificationSource: "https://mapstone.io/about/",
  },
  tracespan: {
    displayName: "TraceSpan",
    industries: ["software", "networking", "telecommunications", "analytics"],
    fame: "sector",
    verificationSource: "https://www.tracespan.com/",
  },
  clearroute: {
    displayName: "ClearRoute",
    industries: ["software", "technology consulting", "platform engineering", "transportation"],
    fame: "sector",
    verificationSource: "https://www.clearroute.io/",
  },
  setcourse: {
    displayName: "SetCourse",
    industries: ["software", "forecasting", "planning", "analytics"],
    fame: "sector",
    verificationSource: "https://setcourse.com/about/",
  },
  telltale: {
    displayName: "Telltale",
    industries: ["software", "video games", "entertainment"],
    fame: "global",
    verificationSource: "https://www.telltale.com/about-us/",
  },
  setguard: {
    displayName: "SetGuard",
    industries: ["security", "film production", "medical devices"],
    fame: "limited",
    verificationSource: "https://www.setguard.net/",
  },
  planharbor: {
    displayName: "PlanHarbor",
    industries: ["business services", "project management", "planning"],
    fame: "limited",
    verificationSource: "https://www.perezcian.shop/",
  },
  keelward: {
    displayName: "Keelward",
    industries: ["marine services", "logistics", "ship supply"],
    fame: "limited",
    verificationSource: "https://www.keelward.com/about-us",
  },
  handrail: {
    displayName: "Handrail",
    industries: ["software", "user research", "business applications"],
    fame: "sector",
    verificationSource: "https://handrailsoftware.com/",
  },
  readout: {
    displayName: "Readout",
    industries: ["software", "clinical trials", "data analytics", "consumer applications"],
    fame: "sector",
    verificationSource: "https://readout.ai/",
  },
  coursemark: {
    displayName: "CourseMark",
    industries: ["financial services", "business services", "education"],
    fame: "sector",
    verificationSource: "https://coursemark.com/about-us/why-coursemark/",
  },
}

export const COLLISION_REGISTRY: readonly CollisionRegistryEntry[] = ACTIVE_BRAND_REGISTRY.map((normalizedName) => {
  const override = VERIFIED_OVERRIDES[normalizedName] || {}
  return {
    normalizedName,
    displayName: override.displayName || normalizedName,
    aliases: override.aliases || [],
    phoneticForms: override.phoneticForms || [],
    entityType: override.entityType || "brand",
    industries: override.industries || [],
    geographies: override.geographies || ["global"],
    fame: override.fame || "sector",
    active: true,
    verificationSource: override.verificationSource || "internal-curated-registry",
    lastChecked: COLLISION_REGISTRY_EVALUATED_ON,
  }
})

export interface CollisionContext {
  category?: string
  competitors?: string[]
  markets?: string[]
}

export interface CollisionV2Assessment {
  type: "none" | "exact" | "close"
  matched: CollisionRegistryEntry | null
  action: "none" | "review" | "reject"
  scoreCap: number | null
  confidence: "high" | "moderate"
  registryVersion: typeof COLLISION_REGISTRY_VERSION
}

export function normalizeName(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
}

/** Small deterministic phonetic key for duplicate/collision screening. */
export function phoneticKey(value: string): string {
  const name = normalizeName(value)
  if (!name) return ""
  return name
    .replace(/^kn/, "n")
    .replace(/^wr/, "r")
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/[cq]/g, "k")
    .replace(/x/g, "ks")
    .replace(/[aeiouy]/g, "")
    .replace(/(.)\1+/g, "$1")
}

function editDistance(left: string, right: string): number {
  const rows = left.length + 1
  const columns = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0))
  for (let row = 0; row < rows; row += 1) matrix[row][0] = row
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitution = left[row - 1] === right[column - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitution,
      )
      if (row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1]) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + 1)
      }
    }
  }
  return matrix[left.length][right.length]
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3))
}

function isAdjacentIndustry(entry: CollisionRegistryEntry, context: CollisionContext): boolean {
  if (entry.fame === "global") return true
  const target = tokens([context.category, ...(context.competitors || []), ...(context.markets || [])].filter(Boolean).join(" "))
  if (!target.size || !entry.industries.length) return false
  return entry.industries.some((industry) => Array.from(tokens(industry)).some((token) => target.has(token)))
}

function closeEnough(name: string, entry: CollisionRegistryEntry): boolean {
  const forms = [entry.normalizedName, ...entry.aliases.map(normalizeName)]
  return forms.some((form) => {
    const shorter = Math.min(name.length, form.length)
    if (shorter < 5 || Math.abs(name.length - form.length) > 2) return false
    const distance = editDistance(name, form)
    if (shorter >= 8 && distance <= 2) return true
    if (distance <= 1) return true
    const namePhonetic = phoneticKey(name)
    const brandPhonetic = phoneticKey(form)
    return namePhonetic.length >= 4 && namePhonetic === brandPhonetic
  })
}

export function assessCollisionV2(value: string, context: CollisionContext = {}): CollisionV2Assessment {
  const name = normalizeName(value)
  const exact = COLLISION_REGISTRY.find((entry) => entry.active && [entry.normalizedName, ...entry.aliases.map(normalizeName)].includes(name))
  if (exact) {
    return {
      type: "exact",
      matched: exact,
      action: "reject",
      scoreCap: 0,
      confidence: "high",
      registryVersion: COLLISION_REGISTRY_VERSION,
    }
  }

  const close = name ? COLLISION_REGISTRY.find((entry) => entry.active && closeEnough(name, entry)) : undefined
  if (close) {
    const reject = isAdjacentIndustry(close, context)
    return {
      type: "close",
      matched: close,
      action: reject ? "reject" : "review",
      scoreCap: 59,
      confidence: reject ? "high" : "moderate",
      registryVersion: COLLISION_REGISTRY_VERSION,
    }
  }

  return {
    type: "none",
    matched: null,
    action: "none",
    scoreCap: null,
    confidence: "moderate",
    registryVersion: COLLISION_REGISTRY_VERSION,
  }
}
