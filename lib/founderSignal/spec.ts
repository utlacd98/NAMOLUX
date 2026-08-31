export const FOUNDER_SIGNAL_VERSION = "2.0" as const
export const FOUNDER_SIGNAL_EVALUATED_ON = "2026-08-30" as const

export const FOUNDER_SIGNAL_DIMENSIONS = [
  { key: "strategicFit", label: "Strategic fit & meaning depth", weight: 20 },
  { key: "distinctiveness", label: "Distinctiveness & search uniqueness", weight: 20 },
  { key: "memorability", label: "Memorability", weight: 15 },
  { key: "pronunciation", label: "Pronunciation", weight: 10 },
  { key: "spellingCharacter", label: "Spelling & character quality", weight: 10 },
  { key: "brandRisk", label: "Brand & collision risk", weight: 20 },
  { key: "extensionStrength", label: "Domain & extension strength", weight: 5 },
] as const

export type FounderSignalDimensionKey = (typeof FOUNDER_SIGNAL_DIMENSIONS)[number]["key"]

export const FOUNDER_SIGNAL_BANDS = [
  { label: "Elite", min: 90, max: 100 },
  { label: "Strong", min: 75, max: 89 },
  { label: "Viable", min: 60, max: 74 },
  { label: "Reconsider", min: 0, max: 59 },
] as const

export type FounderSignalBand = (typeof FOUNDER_SIGNAL_BANDS)[number]["label"]

export const EXACT_COLLISION_SCORE = 0 as const
export const CLOSE_MATCH_SCORE_CAP = 59 as const

export const FOUNDER_SIGNAL_CONFIDENCE = {
  level: "moderate",
  basis: "Founder Signal v2 heuristic scoring with a versioned active-brand registry; evidence confidence is reported separately in Name Sprint",
  dataFreshness: FOUNDER_SIGNAL_EVALUATED_ON,
} as const

/**
 * Curated active brands used by the deterministic collision gate.
 * Entries are normalised because candidate comparison is case-insensitive.
 */
export const ACTIVE_BRAND_REGISTRY = [
  "anker",
  "actura",
  "ballast",
  "cadence",
  "tidal",
  "mosaic",
  "parallax",
  "accord",
  "warden",
  "zenith",
  "nucleus",
  "google",
  "apple",
  "amazon",
  "microsoft",
  "facebook",
  "meta",
  "netflix",
  "spotify",
  "stripe",
  "slack",
  "notion",
  "figma",
  "linear",
  "vercel",
  "supabase",
  "prisma",
  "twilio",
  "sendgrid",
  "mailchimp",
  "hubspot",
  "zendesk",
  "asana",
  "trello",
  "dropbox",
  "zoom",
  "shopify",
  "square",
  "paypal",
  "venmo",
  "uber",
  "lyft",
  "airbnb",
  "gofundme",
  "tiktok",
  "snapchat",
  "twitter",
  "instagram",
  "whatsapp",
  "telegram",
  "discord",
  "reddit",
  "pinterest",
  "linkedin",
  "youtube",
  "twitch",
  "mycloud",
  "icloud",
  "onedrive",
  "gdrive",
  "pornhub",
  "redtube",
  "xvideos",
  "vantiq",
  "axoniq",
  "corteva",
  "farline",
  "holden",
  "lumen",
  "meridian",
  "orbis",
  "waypoint",
  "hintline",
  "telltide",
  "granary",
  "mapstone",
  "tracespan",
  "clearroute",
  "setcourse",
  "telltale",
  "setguard",
  "planharbor",
  "keelward",
  "handrail",
  "readout",
  "coursemark",
] as const

export type ActiveBrand = (typeof ACTIVE_BRAND_REGISTRY)[number]
export type BrandCollisionType = "none" | "exact" | "close-match"
export type BrandCollisionAction = "none" | "disqualify" | "severe-cap"

export interface BrandCollisionAssessment {
  type: BrandCollisionType
  action: BrandCollisionAction
  matchedBrand: ActiveBrand | null
  scoreCap: number | null
  confidence: "high" | "moderate"
}

export const FOUNDER_SIGNAL_SPEC = {
  version: FOUNDER_SIGNAL_VERSION,
  evaluatedOn: FOUNDER_SIGNAL_EVALUATED_ON,
  confidence: FOUNDER_SIGNAL_CONFIDENCE,
  dimensions: FOUNDER_SIGNAL_DIMENSIONS,
  bands: FOUNDER_SIGNAL_BANDS,
  collisionPolicy: {
    exact: { action: "disqualify", score: EXACT_COLLISION_SCORE },
    closeMatch: { action: "severe-cap", scoreCap: CLOSE_MATCH_SCORE_CAP },
  },
} as const

export function getFounderSignalDimensionWeight(key: FounderSignalDimensionKey): number {
  return FOUNDER_SIGNAL_DIMENSIONS.find((dimension) => dimension.key === key)?.weight ?? 0
}

export function getFounderSignalBand(score: number): FounderSignalBand {
  const boundedScore = Math.max(0, Math.min(100, score))
  return FOUNDER_SIGNAL_BANDS.find((band) => boundedScore >= band.min)?.label ?? "Reconsider"
}

function normaliseBrandName(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

/** Damerau-Levenshtein distance, including a single adjacent transposition. */
function editDistance(left: string, right: string): number {
  const rows = left.length + 1
  const columns = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0))

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      )

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + 1)
      }
    }
  }

  return matrix[left.length][right.length]
}

function isCloseBrandMatch(name: string, brand: ActiveBrand): boolean {
  const shorterLength = Math.min(name.length, brand.length)
  if (shorterLength < 4) return false

  // Preserve the established prefix and containment safeguards.
  if (name.slice(0, Math.min(4, shorterLength)) === brand.slice(0, Math.min(4, shorterLength))) {
    return true
  }
  if (name.length >= 4 && brand.includes(name)) return true
  if (brand.length >= 4 && name.includes(brand)) return true

  // Catch a typo, phonetic letter swap, or adjacent transposition in a brand-sized name.
  const distance = editDistance(name, brand)
  if (shorterLength >= 8 && distance <= 2) return true
  if (shorterLength >= 5 && distance <= 1) return true

  // Retain the existing adult-content phonetic safeguard for short *hub names.
  if (name.endsWith("hub") && brand.endsWith("hub")) {
    const nameRoot = name.slice(0, -3)
    const brandRoot = brand.slice(0, -3)
    return nameRoot.length >= 2 && brandRoot.length >= 2 && nameRoot[0] === brandRoot[0]
  }

  return false
}

export function assessBrandCollision(value: string): BrandCollisionAssessment {
  const name = normaliseBrandName(value)
  const exactBrand = ACTIVE_BRAND_REGISTRY.find((brand) => brand === name)

  if (exactBrand) {
    return {
      type: "exact",
      action: "disqualify",
      matchedBrand: exactBrand,
      scoreCap: EXACT_COLLISION_SCORE,
      confidence: "high",
    }
  }

  const closeBrand = name ? ACTIVE_BRAND_REGISTRY.find((brand) => isCloseBrandMatch(name, brand)) : undefined
  if (closeBrand) {
    return {
      type: "close-match",
      action: "severe-cap",
      matchedBrand: closeBrand,
      scoreCap: CLOSE_MATCH_SCORE_CAP,
      confidence: "moderate",
    }
  }

  return {
    type: "none",
    action: "none",
    matchedBrand: null,
    scoreCap: null,
    confidence: "moderate",
  }
}
