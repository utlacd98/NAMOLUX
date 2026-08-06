import { NextRequest, NextResponse } from "next/server"
import { hasValidCronSecret } from "@/lib/seo-monitoring-access"
import { runSeoCronBatch } from "@/lib/seo-monitoring-service"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json(await runSeoCronBatch("daily"))
  } catch (error) {
    console.error("[seo-monitoring] daily_cron_failed", error)
    return NextResponse.json({ error: "job_failed" }, { status: 500 })
  }
}
