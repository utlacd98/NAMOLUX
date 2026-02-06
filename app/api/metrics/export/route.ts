import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7")
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)
    
    const events = await db.metrics.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
    })
    
    // Build CSV
    const headers = ["id", "action", "sessionId", "device", "country", "route", "createdAt", "metadata"]
    const rows = events.map(e => [
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
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
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

