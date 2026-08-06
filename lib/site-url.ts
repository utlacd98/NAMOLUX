/** Production is the only canonical public origin, including on Vercel previews. */
export const PRODUCTION_ORIGIN = "https://www.namolux.com"

export function isVercelHostname(hostname: string | null | undefined): boolean {
  const host = hostname?.trim().toLowerCase().split(":")[0] || ""
  return host.endsWith(".vercel.app")
}

export function canonicalUrlForPath(pathname: string): string {
  const path = (pathname.startsWith("/") ? pathname : `/${pathname}`).replace(/\/{2,}/g, "/")
  return `${PRODUCTION_ORIGIN}${path}`
}
