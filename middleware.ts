import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const BLOCKED_EXACT_PATHS = new Set([
  "/wp-login.php",
  "/wp-admin/setup-config.php",
  "/wordpress",
  "/xmlrpc.php",
  "/admin",
  "/index.php",
])

// Routes that require authentication
const PROTECTED_ROUTES = new Set([
  "/generate",
  "/dashboard",
  "/account",
])

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  "/api/generate-domains",
]

// Public routes (no auth check needed)
const PUBLIC_ROUTES = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/blog",
  "/founder-signal",
  "/faq",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/pricing",
  "/seo-audit",
  "/bulk-domain-check",
  "/seo-domain-check",
])

function normalisePath(pathname: string): string {
  const lowered = pathname.toLowerCase()
  if (lowered.length > 1 && lowered.endsWith("/")) return lowered.slice(0, -1)
  return lowered
}

function isProtectedRoute(path: string): boolean {
  // Check exact matches
  if (PROTECTED_ROUTES.has(path)) return true

  // Check API routes
  for (const apiRoute of PROTECTED_API_ROUTES) {
    if (path.startsWith(apiRoute)) return true
  }

  return false
}

export async function middleware(request: NextRequest) {
  const path = normalisePath(request.nextUrl.pathname)

  // Block common WordPress/CMS probe traffic.
  if (path === "/wp-admin" || path.startsWith("/wp-admin/")) {
    return new NextResponse("Not Found", { status: 404 })
  }

  if (BLOCKED_EXACT_PATHS.has(path)) {
    return new NextResponse("Not Found", { status: 404 })
  }

  // Update Supabase session (refreshes tokens if needed)
  const { user, supabaseResponse } = await updateSession(request)

  // Check if route requires authentication
  if (isProtectedRoute(path)) {
    if (!user) {
      // For API routes, return 401
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { error: "unauthorized", message: "Please sign in to continue" },
          { status: 401 }
        )
      }

      // For page routes, redirect to sign-in
      const redirectUrl = new URL("/sign-in", request.url)
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If user is signed in and trying to access auth pages, redirect to generate
  if (user && (path === "/sign-in" || path === "/sign-up")) {
    return NextResponse.redirect(new URL("/generate", request.url))
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

