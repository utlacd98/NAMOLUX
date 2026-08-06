export const GENERATOR_SOURCES = ["home", "article", "niche", "guide"] as const

export type GeneratorSource = (typeof GENERATOR_SOURCES)[number]

const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function parseGeneratorSource(value: string | string[] | undefined): GeneratorSource | null {
  const candidate = Array.isArray(value) ? value[0] : value
  return GENERATOR_SOURCES.includes(candidate as GeneratorSource)
    ? candidate as GeneratorSource
    : null
}

export function parseContentSlug(value: string | string[] | undefined): string | null {
  const candidate = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase()
  if (!candidate || candidate.length > 120 || !CONTENT_SLUG_PATTERN.test(candidate)) return null
  return candidate
}

export function formatContentLabel(source: GeneratorSource, contentSlug: string | null): string {
  if (source === "home") return "Continuing from the NamoLux homepage"

  const subject = contentSlug
    ? contentSlug
      .split("-")
      .filter(Boolean)
      .map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`)
      .join(" ")
    : source === "niche"
      ? "Niche Naming Guide"
      : source === "article"
        ? "NamoLux Journal"
        : "Naming Guide"

  return `Continuing from ${subject}`
}

export function buildGeneratorHref({
  brief,
  source,
  contentSlug,
}: {
  brief: string
  source: GeneratorSource
  contentSlug?: string | null
}): string {
  const params = new URLSearchParams()
  const safeBrief = brief.trim().slice(0, 1000)
  const safeContent = parseContentSlug(contentSlug || undefined)
  if (safeBrief) params.set("q", safeBrief)
  params.set("source", source)
  if (safeContent) params.set("content", safeContent)
  return `/generate?${params.toString()}`
}
