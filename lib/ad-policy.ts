export type AdPlacement =
  | "generator-after-results"
  | "founder-result-after-primary"
  | "article-after-intro"
  | "article-mid"
  | "article-before-related"
  | "comparison-after-summary"
  | "comparison-before-conclusion"
  | "journal-after-first-section"
  | "guide-after-intro"
  | "guide-mid"
  | "guide-before-conclusion"
  | "article-sidebar"

export type AdSlotGroup = "generator" | "results" | "article" | "journal" | "sidebar"
export type AdSenseFormat = "auto" | "vertical"

export interface AdPlacementConfig {
  readonly slotGroup: AdSlotGroup
  readonly format: AdSenseFormat
  readonly responsive: boolean
  readonly fullWidth: boolean
  readonly desktopOnly: boolean
  readonly rootMargin: "700px 0px"
  readonly reserveClassName: string
  readonly adClassName: string
}

export const AD_PLACEMENTS = [
  "generator-after-results",
  "founder-result-after-primary",
  "article-after-intro",
  "article-mid",
  "article-before-related",
  "comparison-after-summary",
  "comparison-before-conclusion",
  "journal-after-first-section",
  "guide-after-intro",
  "guide-mid",
  "guide-before-conclusion",
  "article-sidebar",
] as const satisfies readonly AdPlacement[]

const ROOT_MARGIN = "700px 0px" as const
const COMPACT_RESERVE_CLASS_NAME = "min-h-[180px] sm:min-h-[250px]"
const COMPACT_AD_CLASS_NAME = "min-h-[180px] sm:min-h-[250px]"
const INLINE_RESERVE_CLASS_NAME = "min-h-[250px]"
const INLINE_AD_CLASS_NAME = "min-h-[250px]"
const SIDEBAR_RESERVE_CLASS_NAME = "min-h-[600px]"
const SIDEBAR_AD_CLASS_NAME = "min-h-[600px]"

function inlineConfig(
  slotGroup: Exclude<AdSlotGroup, "sidebar">,
  compact = false,
): Readonly<AdPlacementConfig> {
  return Object.freeze({
    slotGroup,
    format: "auto",
    responsive: true,
    fullWidth: true,
    desktopOnly: false,
    rootMargin: ROOT_MARGIN,
    reserveClassName: compact ? COMPACT_RESERVE_CLASS_NAME : INLINE_RESERVE_CLASS_NAME,
    adClassName: compact ? COMPACT_AD_CLASS_NAME : INLINE_AD_CLASS_NAME,
  })
}

export const AD_PLACEMENT_CONFIG: Readonly<Record<AdPlacement, Readonly<AdPlacementConfig>>> =
  Object.freeze({
    "generator-after-results": inlineConfig("generator", true),
    "founder-result-after-primary": inlineConfig("results", true),
    "article-after-intro": inlineConfig("article"),
    "article-mid": inlineConfig("article"),
    "article-before-related": inlineConfig("article"),
    "comparison-after-summary": inlineConfig("article"),
    "comparison-before-conclusion": inlineConfig("article"),
    "journal-after-first-section": inlineConfig("journal"),
    "guide-after-intro": inlineConfig("article"),
    "guide-mid": inlineConfig("article"),
    "guide-before-conclusion": inlineConfig("article"),
    "article-sidebar": Object.freeze({
      slotGroup: "sidebar",
      format: "vertical",
      responsive: true,
      fullWidth: false,
      desktopOnly: true,
      rootMargin: ROOT_MARGIN,
      reserveClassName: SIDEBAR_RESERVE_CLASS_NAME,
      adClassName: SIDEBAR_AD_CLASS_NAME,
    }),
  })

export function getAdPlacementConfig(placement: AdPlacement): Readonly<AdPlacementConfig> {
  return AD_PLACEMENT_CONFIG[placement]
}

function normalizePathname(pathname: string | null | undefined): string | null {
  if (typeof pathname !== "string") return null

  const raw = pathname.trim()
  if (!raw.startsWith("/") || raw.startsWith("//")) return null

  const suffixIndex = raw.search(/[?#]/)
  const pathOnly = suffixIndex === -1 ? raw : raw.slice(0, suffixIndex)

  // Browsers may reinterpret backslashes and encoded separators as path delimiters.
  // Reject them instead of allowing a policy check to disagree with the routed URL.
  if (
    pathOnly.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(pathOnly)
    || /%(?:00|2f|5c)/i.test(pathOnly)
  ) {
    return null
  }

  try {
    const normalized = new URL(pathOnly, "https://policy.namolux.invalid").pathname
    if (normalized.includes("//")) return null
    return normalized === "/" ? normalized : normalized.replace(/\/+$/, "")
  } catch {
    return null
  }
}

function isIndividualRoute(pathname: string, root: string): boolean {
  if (!pathname.startsWith(`${root}/`)) return false
  const slug = pathname.slice(root.length + 1)
  return slug.length > 0 && !slug.includes("/")
}

export function isMonetizedPathname(pathname: string | null | undefined): boolean {
  const normalized = normalizePathname(pathname)
  if (!normalized) return false

  // AdSense is intentionally limited to individual editorial articles. Tool,
  // result, index, guide and templated niche pages stay ad-free.
  return isIndividualRoute(normalized, "/blog")
}
