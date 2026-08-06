import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSeoMonitoringPrincipal, monitoringAccessError } from "@/lib/seo-monitoring-access"
import { SeoMonitoringError, updateSeoIssueStatus } from "@/lib/seo-monitoring-service"

const issueSchema = z.object({ status: z.enum(["ignored", "active"]) })

export async function PATCH(request: NextRequest, context: { params: Promise<{ issueId: string }> }) {
  try {
    const principal = await getSeoMonitoringPrincipal()
    const accessError = monitoringAccessError(principal)
    if (accessError) return NextResponse.json(accessError.body, { status: accessError.status })

    const { issueId } = await context.params
    if (!z.string().uuid().safeParse(issueId).success) {
      return NextResponse.json({ error: "invalid_issue", message: "The issue reference is invalid." }, { status: 400 })
    }
    const parsed = issueSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_status", message: "Choose a valid issue status." }, { status: 400 })
    }

    return NextResponse.json(await updateSeoIssueStatus(principal!, issueId, parsed.data.status))
  } catch (error) {
    if (error instanceof SeoMonitoringError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    }
    console.error("[seo-monitoring] issue_update_failed", error)
    return NextResponse.json({ error: "update_failed", message: "The issue could not be updated." }, { status: 500 })
  }
}
