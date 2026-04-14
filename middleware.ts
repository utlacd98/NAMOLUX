import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

/**
 * NamoLux Edge Security Middleware
 *
 * Responsibilities (in order):
 *  1. Drop requests to sensitive file patterns and known attack paths (hard 404).
 *  2. Gate /admin/* and /api/admin/* behind ADMIN_SECRET (fail closed).
 *  3. Refresh Supabase auth session.
 *  4. Enforce auth on user-protected routes.
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

function isAdminPath(path: string): boolean {
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/api/admin" ||
    path.startsWith("/api/admin/")
  )
}

function hasValidAdminToken(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false // fail closed — no env, no access
  const token =
    request.headers.get("x-admin-token") ||
    request.cookies.get("admin_token")?.value ||
    request.nextUrl.searchParams.get("token")
  return token === secret
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

function unauthorizedJson(): NextResponse {
  return NextResponse.json(
    { error: "unauthorized" },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  )
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )
  response.headers.set("X-DNS-Prefetch-Control", "on")

  // Keep preview deployments out of search indexes
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
  }

  return response
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Middleware entry point
// ─────────────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const path = normalisePath(request.nextUrl.pathname)

  // (1) Kill probe traffic immediately — no session, no DB, nothing else runs
  if (isBlockedPath(path)) {
    return hardNotFound()
  }

  // (2) Admin gate (before Supabase session work to short-circuit scanners)
  if (isAdminPath(path)) {
    if (!hasValidAdminToken(request)) {
      return path.startsWith("/api/")
        ? unauthorizedJson()
        : hardNotFound({ "X-Robots-Tag": "noindex, nofollow" })
    }
  }

  // (3) Refresh Supabase auth session and get user
  const { user, supabaseResponse } = await updateSession(request)

  // (4) User-auth gate on protected routes
  if (PROTECTED_USER_ROUTES.has(path)) {
    if (!user) {
      const redirectUrl = new URL("/sign-in", request.url)
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // (5) Signed-in users shouldn't see auth pages
  if (user && (path === "/sign-in" || path === "/sign-up")) {
    return NextResponse.redirect(new URL("/generate", request.url))
  }

  // (6) Apply baseline security headers and return
  return applySecurityHeaders(supabaseResponse)
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Matcher — skip genuinely static files so middleware runs only where it matters
// ─────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|mp4|webm)$).*)",
  ],
}
