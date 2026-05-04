import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"

export type FeatureType =
  | "domain"
  | "bulk"
  | "seo"
  | "palette"
  | "deep-search"
  | "analyze"
  | "name-tools"
  | "ai-chat"

const FREE_TOKEN_LIMIT = 3

export interface RateLimitResult {
  allowed: boolean
  isPro: boolean
  userId: string | null
  tokensUsed: number
  tokensTotal: number
  remaining: number
  plan: "free" | "pro"
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIP = request.headers.get("x-real-ip")
  if (realIP) return realIP.trim()
  return "127.0.0.1"
}

async function checkProAccess(userId: string): Promise<boolean> {
  try {
    const serviceClient = createServiceClient()
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single()
    return profile?.plan === "pro"
  } catch {
    return false
  }
}

/**
 * Check if the user/visitor has tokens remaining.
 *
 * - Pro users → unlimited
 * - Signed-in free users → 10 total, tracked by user_id AND IP (max of both to prevent abuse)
 * - Anonymous visitors → 10 total, tracked by IP
 *
 * Uses the service client to bypass RLS so anonymous token tracking works.
 */
export async function checkRateLimit(
  request: NextRequest,
  _featureType: FeatureType = "domain"
): Promise<RateLimitResult> {
  // TEMPORARY: paywall disabled while API keys are rotated — all users get pro access
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return {
    allowed: true,
    isPro: true,
    userId: user?.id || null,
    tokensUsed: 0,
    tokensTotal: -1,
    remaining: -1,
    plan: "pro",
  }
}

/**
 * Log a token spend for rate limiting purposes.
 * Uses the service client to bypass RLS so anonymous logging works.
 */
export async function logGeneration(
  request: NextRequest,
  userId: string | null,
  generationType: FeatureType = "domain",
  keyword?: string,
  resultsCount: number = 0
): Promise<void> {
  const ip = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || null
  const service = createServiceClient()

  await service.from("generation_logs").insert({
    user_id: userId,
    ip_address: ip,
    user_agent: userAgent,
    generation_type: generationType,
    keyword_used: keyword,
    results_count: resultsCount,
  })
}
