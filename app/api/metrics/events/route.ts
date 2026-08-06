import { NextRequest, NextResponse } from "next/server"
import { getEvents } from "@/lib/metrics"
import { requireAdminRequest } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdminRequest(request)
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(request.url)
    
    const days = parseInt(searchParams.get("days") || "7")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const action = searchParams.get("action") || undefined
    const country = searchParams.get("country") || undefined
    const device = searchParams.get("device") || undefined
    const search = searchParams.get("search") || undefined

    const result = await getEvents({
      days,
      page,
      limit,
      action,
      country,
      device,
      search,
    })

    const response = NextResponse.json(result)
    response.headers.set("Cache-Control", "private, max-age=30")
    
    return response
  } catch (error: any) {
    console.error("Error getting events:", error)
    return NextResponse.json({ error: error.message || "Failed to get events" }, { status: 500 })
  }
}
