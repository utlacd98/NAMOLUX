import { NextRequest, NextResponse } from "next/server"
import { getDashboardMetrics, getEnhancedTrends, getFunnelData } from "@/lib/metrics"
import { requireAdminRequest } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  try {
    const unauthorized = requireAdminRequest(request)
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7")

    const [dashboard, trends, funnel] = await Promise.all([
      getDashboardMetrics(days),
      getEnhancedTrends(days),
      getFunnelData(days),
    ])

    // Set cache header (60s)
    const response = NextResponse.json({
      ...dashboard,
      trends,
      funnel: funnel.funnel,
      dropOffs: funnel.dropOffs,
    })
    response.headers.set("Cache-Control", "private, max-age=60")

    return response
  } catch (error: any) {
    console.error("Error getting metrics summary:", error)
    return NextResponse.json({ error: error.message || "Failed to get metrics" }, { status: 500 })
  }
}
