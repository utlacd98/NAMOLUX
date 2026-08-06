import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { activateSeoMonitoring, SeoMonitoringError } from "@/lib/seo-monitoring-service"
import { getSeoMonitoringPrincipal, monitoringAccessError } from "@/lib/seo-monitoring-access"

export const maxDuration = 300

const activationSchema = z.object({
  projectId: z.string().uuid().optional(),
  projectName: z.string().trim().min(2).max(120).optional(),
  businessDescription: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(120).optional(),
  url: z.string().trim().min(4).max(2048),
}).refine((value) => Boolean(value.projectId || value.projectName), {
  message: "Choose a project or give this project a name.",
  path: ["projectName"],
})

export async function POST(request: NextRequest) {
  try {
    const principal = await getSeoMonitoringPrincipal()
    const accessError = monitoringAccessError(principal)
    if (accessError) return NextResponse.json(accessError.body, { status: accessError.status })

    const parsed = activationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", message: parsed.error.issues[0]?.message || "Check the website details." },
        { status: 400 },
      )
    }

    const dashboard = await activateSeoMonitoring({ principal: principal!, ...parsed.data })
    return NextResponse.json(dashboard, { status: 201 })
  } catch (error) {
    if (error instanceof SeoMonitoringError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    }
    console.error("[seo-monitoring] activation_failed", error)
    return NextResponse.json(
      { error: "activation_failed", message: "The website could not be connected. Check the URL and try again." },
      { status: 500 },
    )
  }
}
