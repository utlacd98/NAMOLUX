const LOCAL_CURATOR_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

export function getCuratorHostname(hostHeader: string | null | undefined): string | null {
  const value = hostHeader?.trim()
  if (!value) return null

  try {
    return new URL(`http://${value}`).hostname.replace(/^\[|\]$/g, "").toLowerCase()
  } catch {
    return null
  }
}

export function isLocalCuratorRequest(
  hostHeader: string | null | undefined,
  enabled = process.env.NAMOLUX_LOCAL_CURATOR === "1",
): boolean {
  if (!enabled) return false
  const hostname = getCuratorHostname(hostHeader)
  return hostname ? LOCAL_CURATOR_HOSTS.has(hostname) : false
}

export function isProtectedPreviewCuratorEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return environment.VERCEL_ENV === "preview"
    && environment.NAMOLUX_ENABLE_PREVIEW_CURATOR === "1"
}
