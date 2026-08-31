import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { explainDailyLaunchReport } from "@/lib/daily-launch-signal"
import { getSeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"
import { SeoMonitoringError } from "@/lib/seo-monitoring-service"

export const maxDuration = 30
export async function POST(_request: NextRequest, context: { params: Promise<{ reportId: string }> }) {
  try {
    const principal = await getSeoMonitoringPrincipal()
    if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
    const { reportId } = await context.params
    if (!z.string().uuid().safeParse(reportId).success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    return NextResponse.json(await explainDailyLaunchReport(principal, reportId))
  } catch (error) {
    if (error instanceof SeoMonitoringError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    console.error("[daily-launch-signal] explanation_failed", error)
    return NextResponse.json({ error: "explanation_failed", message: "The report could not be explained right now." }, { status: 500 })
  }
}
