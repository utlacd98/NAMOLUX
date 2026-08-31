import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createDailyLaunchSite } from "@/lib/daily-launch-signal"
import { getSeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"
import { SeoMonitoringError } from "@/lib/seo-monitoring-service"

const schema = z.object({ winnerEntryId: z.string().uuid(), url: z.string().trim().url().max(2048), method: z.enum(["dns_txt", "meta_tag"]) })

export async function POST(request: NextRequest) {
  try {
    const principal = await getSeoMonitoringPrincipal()
    if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", message: parsed.error.issues[0]?.message }, { status: 400 })
    return NextResponse.json(await createDailyLaunchSite(principal, parsed.data), { status: 201 })
  } catch (error) {
    if (error instanceof SeoMonitoringError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    console.error("[daily-launch-signal] site_create_failed", error)
    return NextResponse.json({ error: "site_create_failed", message: "The verified website setup could not be started." }, { status: 500 })
  }
}
