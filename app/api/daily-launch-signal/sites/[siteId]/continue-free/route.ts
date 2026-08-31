import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { continueDailyLaunchSiteOnFree } from "@/lib/daily-launch-signal"
import { getSeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"
import { SeoMonitoringError } from "@/lib/seo-monitoring-service"

export async function POST(_request: NextRequest, context: { params: Promise<{ siteId: string }> }) {
  try {
    const principal = await getSeoMonitoringPrincipal()
    if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
    const { siteId } = await context.params
    if (!z.string().uuid().safeParse(siteId).success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    return NextResponse.json(await continueDailyLaunchSiteOnFree(principal, siteId), { status: 202 })
  } catch (error) {
    if (error instanceof SeoMonitoringError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    return NextResponse.json({ error: "selection_failed" }, { status: 500 })
  }
}
