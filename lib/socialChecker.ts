/**
 * Server-side social media handle availability checker.
 *
 * Strategy: HTTP HEAD/GET to public profile URLs.
 * - 404 → handle is available
 * - 200 / 3xx → handle is taken
 * - Error / 403 / timeout → unknown (degrade gracefully)
 *
 * No API keys required. Runs server-side only.
 */

export type SocialStatus = "available" | "taken" | "unknown"

export interface SocialPlatform {
  id: "twitter" | "instagram" | "tiktok"
  label: string
  profileUrl: (handle: string) => string
}

export interface SocialHandleResult {
  platform: SocialPlatform["id"]
  status: SocialStatus
  url: string
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "twitter",
    label: "X",
    profileUrl: (h) => `https://x.com/${h}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    profileUrl: (h) => `https://www.instagram.com/${h}/`,
  },
  {
    id: "tiktok",
    label: "TikTok",
    profileUrl: (h) => `https://www.tiktok.com/@${h}`,
  },
]

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async function checkProfileUrl(url: string, timeoutMs = 6000): Promise<SocialStatus> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let status: number
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        redirect: "manual", // don't follow redirects — inspect status directly
        signal: controller.signal,
      })
      status = res.status
    } finally {
      clearTimeout(timer)
    }

    // 404 = profile doesn't exist = handle available
    if (status === 404) return "available"

    // 200 = profile page loaded = handle taken
    // 301/302 = redirect (e.g. to login) = handle likely taken or platform-protected
    if (status === 200 || status === 301 || status === 302) return "taken"

    // 403, 429, 5xx, or anything unexpected = can't determine
    return "unknown"
  } catch {
    return "unknown"
  }
}

/**
 * Check whether a handle is available on all configured social platforms.
 * Runs all checks in parallel. Safe to call from server-side API routes.
 */
export async function checkSocialHandles(handle: string): Promise<SocialHandleResult[]> {
  // Sanitise handle: lowercase, letters/digits/underscores only
  const clean = handle.toLowerCase().replace(/[^a-z0-9_]/g, "")
  if (!clean || clean.length < 2) {
    return SOCIAL_PLATFORMS.map((p) => ({ platform: p.id, status: "unknown", url: p.profileUrl(clean) }))
  }

  const results = await Promise.all(
    SOCIAL_PLATFORMS.map(async (platform) => {
      const url = platform.profileUrl(clean)
      const status = await checkProfileUrl(url)
      return { platform: platform.id, status, url } satisfies SocialHandleResult
    }),
  )

  return results
}
