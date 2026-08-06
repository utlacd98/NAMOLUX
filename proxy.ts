import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  preserveSupabaseSessionResponse,
  updateSession,
} from "@/lib/supabase/middleware"
import {
  isGeneratorLabApiPath,
  isGeneratorLabNoIndex,
  isGeneratorLabPagePath,
  isGeneratorLabRequestAllowed,
} from "@/lib/generator-lab"
import { canonicalUrlForPath, isVercelHostname } from "@/lib/site-url"

/**
 * NamoLux request proxy
 *
 * Responsibilities (in order):
 *  1. Drop requests to sensitive file patterns and known attack paths (hard 404).
 *  2. Refresh and validate the Supabase auth session.
 *  3. Enforce authentication on protected routes.
 *  5. Apply baseline security headers to every successful response.
 *
 * Designed to run on the Vercel Edge runtime — no async I/O in the hot path,
 * regexes compiled once at module load, early returns on probe traffic.
 */

// ─────────────────────────────────────────────────────────────────────────
// 1. Blocked path patterns — compiled once, evaluated in order
// ─────────────────────────────────────────────────────────────────────────

const BLOCKED_PATH_PATTERNS: RegExp[] = [
  // Sensitive file extensions anywhere in the URL
  /\.(env|sql|log|bak|backup|old|swp|swo|orig|save|dist|cache)(\.|$|\?)/i,
  /\.(yml|yaml|ini|conf|config|cfg|htaccess|htpasswd)(\.|$|\?)/i,
  /\.(pem|key|crt|cert|p12|pfx|asc|gpg)(\.|$|\?)/i,
  /\.(sqlite|sqlite3|db|mdb|accdb)(\.|$|\?)/i,
  /\.(tar|tgz|gz|zip|rar|7z|iso|dmg)(\.|$|\?)/i,
  /\.(php|phtml|php3|php4|php5|asp|aspx|jsp|jspx|cgi|pl|sh|bash|py|rb)(\.|$|\?)/i,

  // Hidden/dot files and directories
  /^\/\.(env|git|aws|ssh|docker|vscode|idea|npmrc|htaccess|DS_Store)/i,

  // WordPress / CMS probes
  /^\/wp[-_](admin|content|includes|login|config|json)/i,
  /^\/xmlrpc/i,
  /^\/wordpress(\/|$)/i,
  /^\/(joomla|magento|drupal|typo3|prestashop)(\/|$)/i,

  // DB admin tools
  /^\/(phpmyadmin|pma|myadmin|adminer|dbadmin|mysql|mssql|pgadmin)(\/|$)/i,

  // Shell / backdoor probes
  /^\/(shell|c99|r57|webshell|eval|cmdshell|filemanager)\./i,

  // Setup / installer probes
  /^\/(install|setup|upgrade|migrate)(\/|\.php|\.html?)/i,

  // Common backup/staging prefixes bots enumerate
  /^\/(old|new|tmp|temp|test|beta|dev|staging|backup|backups|archive|\.well-known\/acme-challenge\/wp)(\/|$)/i,

  // Sensitive filename probes (no extension constraint)
  /^\/(users?|customers?|members?|database|db|dump|export|data|sendgrid|smtp|credentials?|secrets?|config|passwords?)(\.|$)/i,
]

// Exact path blocklist — highest priority, O(1) lookup
const BLOCKED_EXACT_PATHS = new Set<string>([
  "/xmlrpc.php",
  "/wp-login.php",
  "/wp-admin",
  "/wordpress",
  "/administrator",
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.env.development",
  "/sendgrid.env",
  "/users.sql",
  "/sql.sql",
  "/dump.sql",
  "/backup.sql",
  "/.git/config",
  "/.git/HEAD",
  "/.aws/credentials",
  "/.ssh/id_rsa",
  "/composer.json",
  "/composer.lock",
  "/config.php",
  "/config.json",
  "/credentials.json",
  "/robots.php",
  "/shell.php",
  "/wso.php",
  "/index.php",
])

// ─────────────────────────────────────────────────────────────────────────
// 2. App routing config
// ─────────────────────────────────────────────────────────────────────────

const PROTECTED_USER_ROUTES = new Set<string>(["/dashboard", "/account"])

// ─────────────────────────────────────────────────────────────────────────
// 3. Helpers
// ─────────────────────────────────────────────────────────────────────────

function normalisePath(pathname: string): string {
  const lowered = pathname.toLowerCase()
  if (lowered.length > 1 && lowered.endsWith("/")) return lowered.slice(0, -1)
  return lowered
}

function isBlockedPath(path: string): boolean {
  if (BLOCKED_EXACT_PATHS.has(path)) return true
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (pattern.test(path)) return true
  }
  return false
}

function isProtectedUserPath(path: string): boolean {
  return (
    PROTECTED_USER_ROUTES.has(path) ||
    path.startsWith("/dashboard/") ||
    path.startsWith("/account/") ||
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/namo-metrics-x7k9" ||
    path.startsWith("/namo-metrics-x7k9/")
  )
}

/**
 * Hard 404 — terminates the request in middleware so Vercel never reaches
 * any asset handler that could return 206 (partial content) or 304.
 * `Accept-Ranges: none` + `Cache-Control: no-store` prevents range / caching.
 */
function hardNotFound(extraHeaders: Record<string, string> = {}): NextResponse {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Accept-Ranges": "none",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      ...extraHeaders,
    },
  })
}

function applySecurityHeaders(response: NextResponse, hostname?: string): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )
  response.headers.set("X-DNS-Prefetch-Control", "on")

  // Keep preview deployments out of search indexes
  if (
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
    || isVercelHostname(hostname)
    || (isGeneratorLabNoIndex() && isGeneratorLabRequestAllowed(hostname))
  ) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
  }

  return response
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Middleware entry point
// ─────────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const path = normalisePath(request.nextUrl.pathname)

  // (1) Kill probe traffic immediately — no session, no DB, nothing else runs
  if (isBlockedPath(path)) {
    return hardNotFound()
  }

  // Placeholder values are never article slugs. Return a real 404 at the
  // edge so bot, broken-client, and stale-link traffic cannot cache a fake
  // article response.
  if (/^\/blog\/(?:null|undefined)(?:\/|$)/.test(path)) {
    return hardNotFound()
  }

  // Generator surfaces are available only from the explicitly configured lab
  // hostname. The public product always stays focused on Bulk Check + Founder
  // Signal, even if the lab flag is accidentally enabled there.
  if (!isGeneratorLabRequestAllowed(request.nextUrl.hostname)) {
    if (isGeneratorLabPagePath(path)) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/bulk-domain-check", request.url), 308),
        request.nextUrl.hostname,
      )
    }
    if (isGeneratorLabApiPath(path)) {
      return hardNotFound({ "X-NamoLux-Surface": "generator-lab-disabled" })
    }
  }

  // (2) Refresh Supabase auth session and validate signed claims.
  const { claims, supabaseResponse } = await updateSession(request)
  const isSignedIn = Boolean(claims?.sub)

  // (3) Authentication gate. Owners re-check authorization server-side.
  if (isProtectedUserPath(path)) {
    if (!isSignedIn) {
      const redirectUrl = new URL("/sign-in", request.url)
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return applySecurityHeaders(
        preserveSupabaseSessionResponse(
          supabaseResponse,
          NextResponse.redirect(redirectUrl),
          true,
        ),
        request.nextUrl.hostname,
      )
    }
  }

  // (4) Signed-in users shouldn't see auth pages
  if (isSignedIn && (path === "/sign-in" || path === "/sign-up")) {
    return applySecurityHeaders(
      preserveSupabaseSessionResponse(
        supabaseResponse,
        NextResponse.redirect(new URL("/dashboard", request.url)),
        true,
      ),
      request.nextUrl.hostname,
    )
  }

  // (5) Apply baseline security headers and return
  const response = applySecurityHeaders(supabaseResponse, request.nextUrl.hostname)
  if (!path.startsWith("/api/") && request.method !== "POST") {
    response.headers.set("Link", `<${canonicalUrlForPath(path)}>; rel="canonical"`)
  }
  return response
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Matcher — skip genuinely static files so middleware runs only where it matters
// ─────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|mp4|webm)$).*)",
  ],
}
