import { NextResponse } from "next/server"
import { z } from "zod"
import { getSeoMonitoringPrincipal, monitoringAccessError } from "@/lib/seo-monitoring-access"
import { runManualSeoAudit, SeoMonitoringError } from "@/lib/seo-monitoring-service"

export const maxDuration = 300

function cooldownResetAt(error: SeoMonitoringError): string | null {
  const explicitResetAt = (error as SeoMonitoringError & { resetAt?: unknown }).resetAt
  if (typeof explicitResetAt === "string" && Number.isFinite(Date.parse(explicitResetAt))) {
    return explicitResetAt
  }
  if (error.code !== "manual_audit_cooldown") return null
  const timestamp = error.message.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/)?.[0]
  return timestamp && Number.isFinite(Date.parse(timestamp)) ? timestamp : null
}

export async function POST(_: Request, context: { params: Promise<{ siteId: string }> }) {
  try {
    const principal = await getSeoMonitoringPrincipal()
    const accessError = monitoringAccessError(principal)
    if (accessError) return NextResponse.json(accessError.body, { status: accessError.status })

    const { siteId } = await context.params
    if (!z.string().uuid().safeParse(siteId).success) {
      return NextResponse.json({ error: "invalid_site", message: "The website reference is invalid." }, { status: 400 })
    }

    return NextResponse.json(await runManualSeoAudit(principal!, siteId))
  } catch (error) {
    if (error instanceof SeoMonitoringError) {
      const resetAt = cooldownResetAt(error)
      return NextResponse.json({
        error: error.code,
        message: error.message,
        ...(resetAt ? { resetAt } : {}),
      }, { status: error.status })
    }
    console.error("[seo-monitoring] manual_audit_failed", error)
    return NextResponse.json({ error: "audit_failed", message: "The audit could not be completed." }, { status: 500 })
  }
}
