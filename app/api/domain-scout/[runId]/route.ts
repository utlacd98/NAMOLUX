import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { DomainScoutError, getDomainScoutRun, updateDomainScoutRun } from "@/lib/autonomous-domain-scout"
import { getSeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"

const actionSchema = z.object({ action: z.enum(["pause", "resume", "cancel"]) })
async function principalAndId(context: { params: Promise<{ runId: string }> }) {
  const principal = await getSeoMonitoringPrincipal()
  const { runId } = await context.params
  return { principal, runId }
}
function failure(error: unknown) {
  if (error instanceof DomainScoutError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
  console.error("[domain-scout] run_request_failed", error)
  return NextResponse.json({ error: "scout_failed" }, { status: 500 })
}
export async function GET(_request: NextRequest, context: { params: Promise<{ runId: string }> }) {
  try {
    const { principal, runId } = await principalAndId(context)
    if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
    if (!z.string().uuid().safeParse(runId).success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    return NextResponse.json(await getDomainScoutRun(principal, runId))
  } catch (error) { return failure(error) }
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ runId: string }> }) {
  try {
    const { principal, runId } = await principalAndId(context)
    if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
    const parsed = actionSchema.safeParse(await request.json())
    if (!parsed.success || !z.string().uuid().safeParse(runId).success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })
    return NextResponse.json(await updateDomainScoutRun(principal, runId, parsed.data.action))
  } catch (error) { return failure(error) }
}
