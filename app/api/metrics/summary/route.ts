import { NextRequest, NextResponse } from "next/server"
import { getDashboardMetrics, getDecisionWorkspaceMetrics, getEnhancedTrends, getFeedbackAnalytics, getFunnelData } from "@/lib/metrics"
import { requireAdminRequest } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminRequest(request)
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7")

    const [dashboard, decisionWorkspace, trends, funnel, feedback] = await Promise.all([
      getDashboardMetrics(days),
      getDecisionWorkspaceMetrics(days),
      getEnhancedTrends(days),
      getFunnelData(days),
      getFeedbackAnalytics(days),
    ])

    // Set cache header (60s)
    const response = NextResponse.json({
      ...dashboard,
      decisionWorkspace,
      trends,
      funnel: funnel.funnel,
      dropOffs: funnel.dropOffs,
      funnelSegments: funnel.segments,
      feedback,
    })
    response.headers.set("Cache-Control", "private, max-age=60")

    return response
  } catch (error: any) {
    console.error("Error getting metrics summary:", error)
    return NextResponse.json({ error: error.message || "Failed to get metrics" }, { status: 500 })
  }
}
