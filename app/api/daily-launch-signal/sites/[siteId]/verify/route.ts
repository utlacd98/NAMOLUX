import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyDailyLaunchSite } from "@/lib/daily-launch-signal"
import { getSeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"
import { SeoMonitoringError } from "@/lib/seo-monitoring-service"

const schema = z.object({ token: z.string().trim().min(20).max(200) })

export async function POST(request: NextRequest, context: { params: Promise<{ siteId: string }> }) {
  try {
    const principal = await getSeoMonitoringPrincipal()
    if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
    const { siteId } = await context.params
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success || !z.string().uuid().safeParse(siteId).success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    return NextResponse.json(await verifyDailyLaunchSite(principal, siteId, parsed.data.token))
  } catch (error) {
    if (error instanceof SeoMonitoringError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    console.error("[daily-launch-signal] verification_failed", error)
    return NextResponse.json({ error: "verification_failed", message: "Ownership could not be verified." }, { status: 500 })
  }
}
