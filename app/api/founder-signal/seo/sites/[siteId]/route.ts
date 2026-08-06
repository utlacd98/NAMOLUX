import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSeoMonitoringPrincipal, monitoringAccessError } from "@/lib/seo-monitoring-access"
import { SeoMonitoringError, updateSeoSite } from "@/lib/seo-monitoring-service"

const settingsSchema = z.object({
  monitoringEnabled: z.boolean().optional(),
  dailyEnabled: z.boolean().optional(),
  weeklyEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "Choose at least one setting to update.",
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ siteId: string }> }) {
  try {
    const principal = await getSeoMonitoringPrincipal()
    const accessError = monitoringAccessError(principal)
    if (accessError) return NextResponse.json(accessError.body, { status: accessError.status })

    const { siteId } = await context.params
    if (!z.string().uuid().safeParse(siteId).success) {
      return NextResponse.json({ error: "invalid_site", message: "The website reference is invalid." }, { status: 400 })
    }

    const parsed = settingsSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: parsed.error.issues[0]?.message || "Check the settings." },
        { status: 400 },
      )
    }

    return NextResponse.json(await updateSeoSite(principal!, siteId, parsed.data))
  } catch (error) {
    if (error instanceof SeoMonitoringError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    }
    console.error("[seo-monitoring] site_update_failed", error)
    return NextResponse.json({ error: "update_failed", message: "The monitoring settings could not be saved." }, { status: 500 })
  }
}
