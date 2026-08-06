import { NextResponse } from "next/server"
import { getSeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"
import { getSeoMonitoringDashboard } from "@/lib/seo-monitoring-service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const principal = await getSeoMonitoringPrincipal()
    if (!principal) {
      return NextResponse.json({
        authenticated: false,
        isPro: false,
        accessState: "free",
        projects: [],
        sites: [],
        audits: [],
        reports: [],
        issues: [],
        performanceAvailable: false,
        notificationDeliveryAvailable: false,
      })
    }

    return NextResponse.json(await getSeoMonitoringDashboard(principal))
  } catch (error) {
    console.error("[seo-monitoring] dashboard_failed", error)
    return NextResponse.json(
      { error: "dashboard_unavailable", message: "SEO monitoring is temporarily unavailable." },
      { status: 503 },
    )
  }
}
