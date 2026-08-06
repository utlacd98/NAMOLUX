export const QUICK_GENERATE_TLDS = ["com", "io", "ai", "app", "co", "dev"] as const

export type QuickGenerateTld = (typeof QUICK_GENERATE_TLDS)[number]

export function buildQuickGenerateDomains(names: string[]): Array<{ name: string; tld: QuickGenerateTld; fullDomain: string }> {
  const uniqueNames = Array.from(
    new Set(
      names
        .map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ""))
        .filter(Boolean),
    ),
  )

  return uniqueNames.flatMap((name) =>
    QUICK_GENERATE_TLDS.map((tld) => ({
      name,
      tld,
      fullDomain: `${name}.${tld}`,
    })),
  )
}
