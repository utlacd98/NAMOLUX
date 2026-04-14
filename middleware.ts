import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const BLOCKED_EXACT_PATHS = new Set([
  "/wp-login.php",
  "/wp-admin/setup-config.php",
  "/wordpress",
  "/xmlrpc.php",
  "/index.php",
  "/administrator",
  "/administrator/index.php",
  "/joomla",
  "/magento",
  "/phpmyadmin",
  "/pma",
  "/myadmin",
  "/.env",
  "/.git/config",
  "/.aws/credentials",
  "/config.php",
  "/shell.php",
  "/wso.php",
  "/.vscode/sftp.json",
])

// Path prefixes that should always 404 (bot probes)
const BLOCKED_PREFIXES = [
  "/wp-admin",
  "/wp-content",
  "/wp-includes",
  "/phpmyadmin",
  "/wordpress",
  "/old",
  "/backup",
  "/test",
  "/tmp",
  "/.well-known/acme-challenge/wp",
]

// Routes that require user authentication
const PROTECTED_ROUTES = new Set([
  "/dashboard",
  "/account",
])

// API routes that require authentication
const PROTECTED_API_ROUTES: string[] = []

function normalisePath(pathname: string): string {
  const lowered = pathname.toLowerCase()
  if (lowered.length > 1 && lowered.endsWith("/")) return lowered.slice(0, -1)
  return lowered
}

function isProtectedRoute(path: string): boolean {
  if (PROTECTED_ROUTES.has(path)) return true
  for (const apiRoute of PROTECTED_API_ROUTES) {
    if (path.startsWith(apiRoute)) return true
  }
  return false
}

// Admin routes (both page and API) require ADMIN_SECRET token
function isAdminPath(path: string): boolean {
  return path === "/admin" ||
         path.startsWith("/admin/") ||
         path === "/api/admin" ||
         path.startsWith("/api/admin/")
}

function hasValidAdminToken(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  // Fail closed: if ADMIN_SECRET is not set, deny all admin access
  if (!adminSecret) return false

  const token =
    request.headers.get("x-admin-token") ||
    request.cookies.get("admin_token")?.value ||
    request.nextUrl.searchParams.get("token")

  return token === adminSecret
}

export async function middleware(request: NextRequest) {
  const path = normalisePath(request.nextUrl.pathname)

  // Block common WordPress/CMS probe traffic (prefixes)
  for (const prefix of BLOCKED_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      return new NextResponse("Not Found", { status: 404 })
    }
  }

  // Block exact-match probes
  if (BLOCKED_EXACT_PATHS.has(path)) {
    return new NextResponse("Not Found", { status: 404 })
  }

  // Block .php, .asp, .jsp, .cgi requests entirely — we're Next.js, nothing legitimate ends in these
  if (/\.(php|asp|aspx|jsp|cgi)$/i.test(path)) {
    return new NextResponse("Not Found", { status: 404 })
  }

  // Admin gate — runs before auth-session update to short-circuit bots
  if (isAdminPath(path)) {
    if (!hasValidAdminToken(request)) {
      // For API routes, return 401 JSON
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { error: "unauthorized" },
          { status: 401, headers: { "X-Robots-Tag": "noindex, nofollow" } }
        )
      }
      // For page routes, return 404 to hide the existence of the admin panel
      return new NextResponse("Not Found", {
        status: 404,
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      })
    }
  }

  // Update Supabase session (refreshes tokens if needed)
  const { user, supabaseResponse } = await updateSession(request)

  // Check if route requires user authentication
  if (isProtectedRoute(path)) {
    if (!user) {
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { error: "unauthorized", message: "Please sign in to continue" },
          { status: 401 }
        )
      }
      const redirectUrl = new URL("/sign-in", request.url)
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If user is signed in and trying to access auth pages, redirect to generate
  if (user && (path === "/sign-in" || path === "/sign-up")) {
    return NextResponse.redirect(new URL("/generate", request.url))
  }

  // On Vercel preview deployments, tell search engines not to index anything.
  // This prevents bots from crawling preview URLs like *-vercel.app.
  if (process.env.VERCEL_ENV === "preview") {
    supabaseResponse.headers.set("X-Robots-Tag", "noindex, nofollow")
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (SEO files)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
