import { NextRequest, NextResponse } from "next/server"
import { getRateLimitState } from "@/lib/rate-limit"
import { FREE_MONTHLY_USAGE_LIMIT } from "@/lib/plans"

export async function GET(request: NextRequest) {
  try {
    const state = await getRateLimitState(request)
    return NextResponse.json({
      used: state.tokensUsed,
      total: state.tokensTotal,
      remaining: state.remaining,
      resetAt: state.resetAt,
      isPro: state.isPro,
      plan: state.plan,
      canUseBrandPalette: state.canUseBrandPalette,
      freeCore: false,
    })
  } catch (error: unknown) {
    console.error("Error fetching token status:", error)
    return NextResponse.json({
      used: 0,
      total: FREE_MONTHLY_USAGE_LIMIT,
      remaining: FREE_MONTHLY_USAGE_LIMIT,
      resetAt: null,
      isPro: false,
      plan: "free",
      canUseBrandPalette: false,
      freeCore: false,
    })
  }
}
