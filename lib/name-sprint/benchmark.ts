import { normalizeName } from "./collision-registry"
import type {
  EligibilityFailureCode,
  NameConstitution,
  RawNameCandidate,
} from "./types"

export interface GoldenNamingTrap {
  candidate: RawNameCandidate
  expectedFailure: EligibilityFailureCode
}

export interface GoldenNamingCase {
  id: string
  constitution: NameConstitution
  knownGood: RawNameCandidate[]
  traps: GoldenNamingTrap[]
}

const categories = [
  { key: "ai", label: "AI workflow software", audience: "operations teams", active: "Notion", generic: ["neural", "labs"] },
  { key: "fintech", label: "financial technology", audience: "small businesses", active: "Stripe", generic: ["pay", "vault"] },
  { key: "health", label: "health and wellness", audience: "busy professionals", active: "Apple", generic: ["zen", "wellness"] },
  { key: "property", label: "property technology", audience: "independent landlords", active: "Airbnb", generic: ["smart", "nest"] },
  { key: "consumer", label: "consumer electronics", audience: "remote workers", active: "Anker", generic: ["smart", "tech"] },
  { key: "hospitality", label: "food and hospitality", audience: "local diners", active: "Square", generic: ["prime", "hub"] },
  { key: "services", label: "professional services", audience: "growing companies", active: "HubSpot", generic: ["global", "solutions"] },
  { key: "education", label: "education technology", audience: "adult learners", active: "Linear", generic: ["smart", "labs"] },
  { key: "nonprofit", label: "non-profit fundraising", audience: "community organisers", active: "GoFundMe", generic: ["bright", "group"] },
  { key: "developer", label: "developer tools", audience: "software engineers", active: "Vercel", generic: ["code", "forge"] },
] as const

const scenarios = [
  "early-stage product",
  "specialist marketplace",
  "calm collaboration tool",
  "premium subscription service",
  "technical analytics platform",
  "friendly consumer app",
  "international software product",
  "local service network",
  "creator-led product",
  "regulated business workflow",
] as const

const goodRoots = [
  ["harbor", "thread"],
  ["cedar", "lane"],
  ["north", "rill"],
  ["quiet", "bearing"],
  ["amber", "field"],
  ["clear", "morrow"],
  ["wren", "course"],
  ["granite", "arc"],
  ["willow", "mark"],
  ["tide", "frame"],
] as const

function candidate(
  id: string,
  name: string,
  roots: string[],
  options: Partial<RawNameCandidate> = {},
): RawNameCandidate {
  return {
    id,
    name,
    normalizedName: normalizeName(name),
    strategy: "meaningful_compound",
    territoryId: "benchmark",
    roots,
    association: "A grounded metaphor chosen to express confident progress and durable value.",
    pronunciation: name.toLowerCase().replace(/([aeiouy]+)/g, "$1-").replace(/-$/, ""),
    claimedOrigin: null,
    originVerified: true,
    ...options,
  }
}

function constitution(category: (typeof categories)[number], scenario: string, index: number): NameConstitution {
  return {
    description: `A ${scenario} in ${category.label} that helps ${category.audience} make calmer, better-informed decisions without adding operational complexity.`,
    category: category.label,
    audience: [category.audience],
    problem: "Important work is fragmented, uncertain, and difficult to act on.",
    promise: ["clearer decisions", "calmer progress", "less wasted effort"],
    personality: ["credible", "clear", index % 2 ? "warm" : "forward-looking"],
    geographicMarkets: [index % 3 ? "United Kingdom" : "Global"],
    languages: ["English"],
    futureExpansion: ["adjacent workflows", "international markets"],
    competitors: [category.active],
    likedNames: [],
    namingMode: category.key === "services" && index % 10 === 7 ? "local_service" : "distinctive_startup",
    preferredLength: { min: 5, max: 12 },
    include: [],
    avoid: ["quantum", "solutions", "smart"],
    preferredTlds: ["com", "co"],
  }
}

export const GOLDEN_NAMING_SET: readonly GoldenNamingCase[] = categories.flatMap((category, categoryIndex) =>
  scenarios.map((scenario, scenarioIndex) => {
    const index = categoryIndex * scenarios.length + scenarioIndex
    const roots = goodRoots[(categoryIndex + scenarioIndex) % goodRoots.length]
    const goodName = roots.map((root) => root[0].toUpperCase() + root.slice(1)).join("")
    const genericName = category.generic.map((root) => root[0].toUpperCase() + root.slice(1)).join("")
    return {
      id: `${category.key}-${String(scenarioIndex + 1).padStart(2, "0")}`,
      constitution: constitution(category, scenario, index),
      knownGood: [candidate(`good-${index}`, goodName, [...roots])],
      traps: [
        {
          candidate: candidate(`active-${index}`, category.active, [normalizeName(category.active)], { strategy: "arbitrary_real_word" }),
          expectedFailure: "ACTIVE_BRAND_EXACT" as const,
        },
        {
          candidate: candidate(`generic-${index}`, genericName, [...category.generic]),
          expectedFailure: category.key === "services" && scenarioIndex === 7
            ? "SEMANTIC_MISMATCH" as const
            : "GENERIC_COMPOUND" as const,
        },
        {
          candidate: candidate(`cluster-${index}`, `Fgr${category.key}`, ["fgr", category.key], { strategy: "invented" }),
          expectedFailure: "PRONUNCIATION_CLUSTER" as const,
        },
        {
          candidate: candidate(`origin-${index}`, `Morrow${category.key}`, ["morrow", category.key], {
            strategy: "verified_root",
            claimedOrigin: "Ancient Latin for perfect future",
            originVerified: false,
          }),
          expectedFailure: "FABRICATED_ETYMOLOGY" as const,
        },
      ],
    }
  }),
)

export function getGoldenNamingSetSummary() {
  return {
    briefs: GOLDEN_NAMING_SET.length,
    knownGoodCandidates: GOLDEN_NAMING_SET.reduce((total, item) => total + item.knownGood.length, 0),
    trapCandidates: GOLDEN_NAMING_SET.reduce((total, item) => total + item.traps.length, 0),
    categories: categories.length,
  }
}
