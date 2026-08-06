import { isSafeRedirectPath } from "@/lib/safe-redirect"

export const PRICING_SOURCES = ["home", "article", "niche", "guide", "generator", "results", "pricing"] as const
export type PricingSource = (typeof PRICING_SOURCES)[number]

const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const RETURN_PATH_PATTERN = /^\/(?:generate|dashboard|pricing|account|blog(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|startup-name-ideas(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|how-to-name-a-startup|name-mistakes)$/

export interface PricingAttribution {
  source: PricingSource
  content?: string
  returnPath?: string
}

function first(value: string | string[] | null | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

export function parsePricingAttribution(params: {
  source?: string | string[] | null
  content?: string | string[] | null
  return?: string | string[] | null
}): PricingAttribution {
  const requestedSource = first(params.source)
  const source = PRICING_SOURCES.includes(requestedSource as PricingSource) ? requestedSource as PricingSource : "pricing"
  const requestedContent = first(params.content)
  const content = requestedContent && requestedContent.length <= 120 && CONTENT_SLUG_PATTERN.test(requestedContent) ? requestedContent : undefined
  const requestedReturn = first(params.return)
  const returnPath = requestedReturn
    && !requestedReturn.includes("?")
    && !requestedReturn.includes("#")
    && isSafeRedirectPath(requestedReturn)
    && RETURN_PATH_PATTERN.test(requestedReturn)
      ? requestedReturn
      : undefined

  return { source, content, returnPath }
}

export function withPricingAttribution(path: string, attribution: PricingAttribution): string {
  const url = new URL(path, "https://www.namolux.com")
  url.searchParams.set("source", attribution.source)
  if (attribution.content) url.searchParams.set("content", attribution.content)
  if (attribution.returnPath) url.searchParams.set("return", attribution.returnPath)
  return `${url.pathname}${url.search}`
}
