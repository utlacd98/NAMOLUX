import { NextRequest, NextResponse } from "next/server"
import { sanitizeAnalyticsPath, sanitizeAnalyticsReferrer, sanitizeMetricMetadata, trackMetric } from "@/lib/metrics"
import { isAnalyticsEvent } from "@/lib/analytics-events"
import { checkBurstLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const throttle = await checkBurstLimit(request, "metrics", 60)
    if (!throttle.allowed) {
      return NextResponse.json(
        { error: throttle.unavailable ? "Metrics are temporarily unavailable" : "Too many events" },
        { status: throttle.unavailable ? 503 : 429 },
      )
    }

    const { action, metadata, sessionId, device, referrer, route } = await request.json()

    if (!isAnalyticsEvent(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get user agent and country from headers
    const userAgent = request.headers.get("user-agent") || undefined
    const country = request.headers.get("x-vercel-ip-country") ||
                   request.headers.get("cf-ipcountry") ||
                   undefined

    await trackMetric({
      action,
      metadata: sanitizeMetricMetadata(metadata),
      userAgent,
      country,
      sessionId: typeof sessionId === "string" && /^s_[a-z0-9_]{8,128}$/i.test(sessionId) ? sessionId : undefined,
      device: ["desktop", "mobile", "tablet"].includes(device) ? device : undefined,
      referrer: sanitizeAnalyticsReferrer(referrer),
      route: sanitizeAnalyticsPath(route),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error tracking metric:", error)
    return NextResponse.json({ error: "Failed to track metric" }, { status: 500 })
  }
}
