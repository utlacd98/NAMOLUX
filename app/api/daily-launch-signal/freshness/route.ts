import { NextResponse } from "next/server"
import { enqueueStaleDailyLaunchReports } from "@/lib/daily-launch-signal"
import { getSeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"
import { SeoMonitoringError } from "@/lib/seo-monitoring-service"

export async function POST() {
  try {
    const principal = await getSeoMonitoringPrincipal()
    if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
    return NextResponse.json(await enqueueStaleDailyLaunchReports(principal), { status: 202 })
  } catch (error) {
    if (error instanceof SeoMonitoringError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    console.error("[daily-launch-signal] freshness_enqueue_failed", error)
    return NextResponse.json({ error: "enqueue_failed", message: "Freshness work could not be queued." }, { status: 500 })
  }
}
