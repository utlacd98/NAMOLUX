import { NextRequest, NextResponse } from "next/server"
import { getEvents } from "@/lib/metrics"
import { requireAdminRequest } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminRequest(request)
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7")
    
    const { events: rawEvents } = await getEvents({ days, page: 1, limit: 50000 })
    const events = rawEvents as Array<{
      id: string
      action: string
      sessionId?: string | null
      device?: string | null
      country?: string | null
      route?: string | null
      createdAt: Date
      metadata?: unknown
    }>
    
    // Build CSV
    const headers = ["id", "action", "sessionId", "device", "country", "route", "createdAt", "metadata"]
    const rows = events.map((e) => [
      e.id,
      e.action,
      e.sessionId || "",
      e.device || "",
      e.country || "",
      e.route || "",
      e.createdAt.toISOString(),
      JSON.stringify(e.metadata || {}),
    ])
    
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n")
    
    const response = new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=namolux-events-${days}d-${new Date().toISOString().split("T")[0]}.csv`,
      },
    })
    
    return response
  } catch (error: any) {
    console.error("Error exporting events:", error)
    return NextResponse.json({ error: error.message || "Failed to export" }, { status: 500 })
  }
}
