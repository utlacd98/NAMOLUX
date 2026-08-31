export interface GeneratorLabEnvironment {
  NODE_ENV?: string
  VERCEL_ENV?: string
  NAMOLUX_ENABLE_GENERATOR_LAB?: string
  NAMOLUX_GENERATOR_LAB_HOST?: string
  NAMOLUX_NAME_SPRINT_ENABLED?: string
}

/**
 * Generator work runs only from this explicit host. The value can be
 * overridden for a dedicated lab deployment, but it must never be inferred
 * from a preview URL or the public production hostname.
 */
export const DEFAULT_GENERATOR_LAB_HOST = "lab.namolux.com"

function getRuntimeGeneratorLabEnvironment(): GeneratorLabEnvironment {
  // Next.js replaces direct process.env.KEY reads when it compiles Proxy code.
  // Passing process.env around as an object prevents that replacement and left
  // the lab permanently disabled in the deployed Proxy runtime.
  return {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NAMOLUX_ENABLE_GENERATOR_LAB: process.env.NAMOLUX_ENABLE_GENERATOR_LAB,
    NAMOLUX_GENERATOR_LAB_HOST: process.env.NAMOLUX_GENERATOR_LAB_HOST,
    NAMOLUX_NAME_SPRINT_ENABLED: process.env.NAMOLUX_NAME_SPRINT_ENABLED,
  }
}

const GENERATOR_LAB_PAGES = ["/generate", "/preview-gen"] as const

const PUBLIC_NAME_SPRINT_APIS = new Set([
  "/api/lab/name-generation",
  "/api/lab/name-constitution",
])

const GENERATOR_LAB_APIS = new Set([
  "/api/ai-name-chat",
  "/api/analyze-description",
  "/api/brand-palette",
  "/api/check-domain",
  "/api/founder-signal/batch",
  "/api/check-socials",
  "/api/deep-search",
  "/api/generate-domains",
  "/api/name-tools",
  "/api/quick-generate",
  "/api/lab/name-generation",
  "/api/lab/name-constitution",
  "/api/lab/founder-signal",
  "/api/private-download/video",
])

function normaliseHost(value: string | null | undefined): string {
  const raw = value?.trim().toLowerCase().replace(/\.$/, "")
  if (!raw) return ""

  // Host headers carry a port in local development. Keep the parser strict so
  // a malformed Host value cannot accidentally match the lab configuration.
  const match = raw.match(/^([a-z0-9.-]+)(?::\d{1,5})?$/)
  return match?.[1] || ""
}

/** Returns the exact hostname allowed to expose generator-only surfaces. */
export function getGeneratorLabHost(
  environment: GeneratorLabEnvironment = getRuntimeGeneratorLabEnvironment(),
): string {
  return normaliseHost(environment.NAMOLUX_GENERATOR_LAB_HOST) || DEFAULT_GENERATOR_LAB_HOST
}

/**
 * The lab is opt-in. Preview deployments and local development do not expose
 * generator routes merely because they are non-production environments.
 */
export function isGeneratorLabEnabled(
  environment: GeneratorLabEnvironment = getRuntimeGeneratorLabEnvironment(),
): boolean {
  return environment.NAMOLUX_ENABLE_GENERATOR_LAB?.trim().toLowerCase() === "true"
}

/** Emergency production switch for the signed-in Name Sprint surface. */
export function isPublicNameSprintEnabled(
  environment: GeneratorLabEnvironment = getRuntimeGeneratorLabEnvironment(),
): boolean {
  return environment.NAMOLUX_NAME_SPRINT_ENABLED?.trim().toLowerCase() === "true"
}

export function isPublicNameSprintPagePath(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/$/, "") || "/"
  return path === "/generate" || path.startsWith("/generate/")
}

export function isPublicNameSprintApiPath(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/$/, "") || "/"
  return PUBLIC_NAME_SPRINT_APIS.has(path)
}

/**
 * A generator request is valid only when both the feature flag and the exact
 * lab hostname agree. This keeps an accidentally enabled public deployment
 * fail-closed.
 */
export function isGeneratorLabRequestAllowed(
  hostname: string | null | undefined,
  environment: GeneratorLabEnvironment = getRuntimeGeneratorLabEnvironment(),
): boolean {
  return isGeneratorLabEnabled(environment)
    && normaliseHost(hostname) === getGeneratorLabHost(environment)
}

/** The lab must never publish an indexable surface, including when deployed as production. */
export function isGeneratorLabNoIndex(
  environment: GeneratorLabEnvironment = getRuntimeGeneratorLabEnvironment(),
): boolean {
  return isGeneratorLabEnabled(environment)
}

/**
 * Route handlers use this as defence in depth. The edge proxy is the primary
 * gate, while this prevents an API handler from doing expensive work if it is
 * invoked without the proxy layer. A preview must not become an accidental
 * public generator environment either: only the explicitly configured lab
 * hostname with its flag enabled may reach these handlers.
 */
export function getGeneratorLabApiBlockResponse(
  request: Pick<Request, "headers" | "url">,
  environment: GeneratorLabEnvironment = getRuntimeGeneratorLabEnvironment(),
): Response | null {
  // Unit tests call handlers directly without running the edge proxy. This
  // branch cannot occur in a deployed Vercel runtime and keeps those isolated
  // handler contracts testable without weakening any real environment.
  if (environment.NODE_ENV?.trim().toLowerCase() === "test") return null
  if (isGeneratorLabRequestAllowed(request.headers.get("host"), environment)) return null
  const pathname = new URL(request.url).pathname
  if (isPublicNameSprintEnabled(environment) && isPublicNameSprintApiPath(pathname)) return null

  return new Response("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "X-NamoLux-Surface": "generator-lab-disabled",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  })
}

export function isGeneratorLabPagePath(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/$/, "") || "/"
  return GENERATOR_LAB_PAGES.some((root) => path === root || path.startsWith(`${root}/`))
}

export function isGeneratorLabApiPath(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/$/, "") || "/"
  return GENERATOR_LAB_APIS.has(path)
}
