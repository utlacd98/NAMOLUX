import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"

export type FeatureType = "domain" | "bulk" | "seo"

export interface RateLimitResult {
  allowed: boolean
  isPro: boolean
  userId: string | null
  remaining: number
  resetAt: Date | null
  plan: "free" | "pro"
  subscriptionStatus: "active" | "inactive" | "cancelled" | "past_due" | null
  featureType?: FeatureType
}

/**
 * Extract the client IP address from request headers.
 * On Vercel, x-forwarded-for contains the client IP as the first entry.
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    // Take the first IP in the chain (original client)
    const firstIP = forwarded.split(",")[0].trim()
    return firstIP
  }
  
  // Fallback headers
  const realIP = request.headers.get("x-real-ip")
  if (realIP) return realIP.trim()
  
  // Final fallback
  return "127.0.0.1"
}

/**
 * Check if a user has Pro access by querying Supabase profile directly.
 */
async function checkProAccess(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single()
    return profile?.plan === "pro"
  } catch (error) {
    console.error("Error checking pro access:", error)
    return false
  }
}

/**
 * Check rate limit for a generation request.
 *
 * Logic:
 * 1. Get user's IP address
 * 2. Check if user is authenticated
 * 3. If authenticated, check Stripe for active subscription
 * 4. If has active subscription -> ALLOW unlimited
 * 5. If no subscription OR not authenticated:
 *    a. Query generation_logs for this IP in the last 24 hours, filtered by feature type
 *    b. Also query by user_id if authenticated
 *    c. If count >= 2 -> BLOCK
 *    d. If count < 2 -> ALLOW
 *
 * @param request - The incoming request
 * @param featureType - The type of feature being used (domain, bulk, seo). Each feature has its own 2/day limit.
 */
export async function checkRateLimit(
  request: NextRequest,
  featureType: FeatureType = "domain"
): Promise<RateLimitResult> {
  const ip = getClientIP(request)
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  let isPro = false

  if (user) {
    isPro = await checkProAccess(user.id)
  }

  // Pro users with active subscription get unlimited access
  if (isPro) {
    return {
      allowed: true,
      isPro: true,
      userId: user?.id || null,
      remaining: -1, // Unlimited
      resetAt: null,
      plan: "pro",
      subscriptionStatus: "active",
      featureType,
    }
  }

  // For free users or unauthenticated users, check rate limit PER FEATURE
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Check IP-based rate limit for this specific feature
  const { count: ipCount } = await supabase
    .from("generation_logs")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("generation_type", featureType)
    .gte("created_at", twentyFourHoursAgo)

  // Also check user-based rate limit if authenticated (prevents IP rotation abuse)
  let userCount = 0
  if (user) {
    const { count } = await supabase
      .from("generation_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("generation_type", featureType)
      .gte("created_at", twentyFourHoursAgo)
    userCount = count || 0
  }

  // Use the higher count (IP or user-based)
  const totalCount = Math.max(ipCount || 0, userCount)

  // Free users get 2 uses per feature per 24 hours
  const FREE_LIMIT = 2
  const allowed = totalCount < FREE_LIMIT
  const remaining = Math.max(0, FREE_LIMIT - totalCount)

  // Get the reset time (when the oldest generation in the window expires)
  let resetAt: Date | null = null
  if (!allowed) {
    const { data: oldestLog } = await supabase
      .from("generation_logs")
      .select("created_at")
      .eq("generation_type", featureType)
      .or(`ip_address.eq.${ip}${user ? `,user_id.eq.${user.id}` : ""}`)
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: true })
      .limit(1)
      .single()

    if (oldestLog) {
      resetAt = new Date(new Date(oldestLog.created_at).getTime() + 24 * 60 * 60 * 1000)
    }
  }

  return {
    allowed,
    isPro: false,
    userId: user?.id || null,
    remaining,
    resetAt,
    plan: "free",
    subscriptionStatus: null,
    featureType,
  }
}

/**
 * Log a generation request for rate limiting purposes.
 */
export async function logGeneration(
  request: NextRequest,
  userId: string | null,
  generationType: "domain" | "bulk" | "seo" = "domain",
  keyword?: string,
  resultsCount: number = 0
): Promise<void> {
  const ip = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || null
  const supabase = await createClient()
  
  await supabase.from("generation_logs").insert({
    user_id: userId,
    ip_address: ip,
    user_agent: userAgent,
    generation_type: generationType,
    keyword_used: keyword,
    results_count: resultsCount,
  })
}

