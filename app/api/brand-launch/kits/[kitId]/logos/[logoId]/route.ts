import { NextRequest, NextResponse } from "next/server"
import { BrandLaunchError, getBrandLaunchLogoBlob } from "@/lib/brand-launch"

type Context = { params: Promise<{ kitId: string; logoId: string }> }

export async function GET(_: NextRequest, context: Context) {
  try {
    const { kitId, logoId } = await context.params
    const blob = await getBrandLaunchLogoBlob(kitId, logoId)
    return new NextResponse(blob.stream, { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } })
  } catch (error) {
    if (error instanceof BrandLaunchError) return new NextResponse(error.message, { status: error.status, headers: { "Cache-Control": "no-store" } })
    console.error("brand_launch_logo_read_failed", error)
    return new NextResponse("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
