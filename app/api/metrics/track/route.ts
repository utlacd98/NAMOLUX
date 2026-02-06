import { NextRequest, NextResponse } from "next/server"
import { trackMetric, MetricAction } from "@/lib/metrics"

const VALID_ACTIONS = ["name_generation", "bulk_check", "seo_audit", "affiliate_click", "page_view", "blog_view"]

export async function POST(request: NextRequest) {
  try {
    const { action, metadata, sessionId, device, referrer, route } = await request.json()

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get user agent and country from headers
    const userAgent = request.headers.get("user-agent") || undefined
    const country = request.headers.get("x-vercel-ip-country") ||
                   request.headers.get("cf-ipcountry") ||
                   undefined

    await trackMetric({
      action: action as MetricAction,
      metadata,
      userAgent,
      country,
      sessionId,
      device,
      referrer,
      route,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error tracking metric:", error)
    return NextResponse.json({ error: "Failed to track metric" }, { status: 500 })
  }
}

