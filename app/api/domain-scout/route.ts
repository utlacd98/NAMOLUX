import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createDomainScoutRun, DomainScoutError, getDomainScoutRun } from "@/lib/autonomous-domain-scout"
import { getSeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"

const schema = z.object({ brief: z.record(z.string(), z.unknown()), preferredTld: z.enum(["com", "io", "co", "ai", "app", "dev"]), modeMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]) })

function failure(error: unknown) {
  if (error instanceof DomainScoutError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
  console.error("[domain-scout] request_failed", error)
  return NextResponse.json({ error: "scout_failed", message: "Scout could not complete the request." }, { status: 500 })
}

export async function GET() {
  try {
    const principal = await getSeoMonitoringPrincipal()
    if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
    return NextResponse.json(await getDomainScoutRun(principal))
  } catch (error) { return failure(error) }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await getSeoMonitoringPrincipal()
    if (!principal) return NextResponse.json({ error: "authentication_required" }, { status: 401 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", message: parsed.error.issues[0]?.message }, { status: 400 })
    return NextResponse.json(await createDomainScoutRun(principal, parsed.data), { status: 202 })
  } catch (error) { return failure(error) }
}
