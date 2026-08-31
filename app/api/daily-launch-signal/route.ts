import { NextResponse } from "next/server"
import { getDailyLaunchSnapshot } from "@/lib/daily-launch-signal"
import { getSeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"

export async function GET() {
  const principal = await getSeoMonitoringPrincipal()
  if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
  try {
    return NextResponse.json(await getDailyLaunchSnapshot(principal))
  } catch (error) {
    console.error("[daily-launch-signal] snapshot_failed", error)
    return NextResponse.json({ error: "snapshot_failed" }, { status: 500 })
  }
}
