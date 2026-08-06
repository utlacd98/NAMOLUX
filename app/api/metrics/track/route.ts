import { NextRequest, NextResponse } from "next/server"
import { sanitizeAnalyticsPath, sanitizeAnalyticsReferrer, sanitizeMetricMetadata, trackMetric, MetricAction } from "@/lib/metrics"
import { checkBurstLimit } from "@/lib/rate-limit"

const VALID_ACTIONS = [
  "name_generation",
  "bulk_check",
  "seo_audit",
  "affiliate_click",
  "page_view",
  "blog_view",
  "generate_started",
  "quick_generate_started",
  "quick_generate_results",
  "results_seen",
  "upgrade_offer_seen",
  "upgrade_clicked",
  "checkout_started",
  "checkout_success",
  "rate_limit_seen",
  "partner_cta_seen",
  "shortlist_created",
  "launch_kit_started",
  "domain_register_clicked",
  "brand_export_clicked",
  "engaged_10s",
  "engaged_30s",
  "scroll_50",
  "scroll_90",
  "content_cta_seen",
  "content_cta_clicked",
  "brief_submitted",
  "pricing_viewed",
  "checkout_intent",
  "decision_action",
  "names_visible",
  "save",
  "dislike",
  "more_like_this",
  "advanced_started",
  "founder_signal_clicked",
  "founder_signal_scored",
  "batch_scored",
  "decision_saved",
  "decision_report_created",
  "report_share_created",
  "score_sort_used",
  "pricing_clicked",
]

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
