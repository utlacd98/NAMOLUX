import { NextRequest, NextResponse } from "next/server"
import { BrandLaunchError, generateBrandLaunchLogos } from "@/lib/brand-launch"
import { rejectCrossOrigin } from "@/lib/naming-workspace-http"

type Context = { params: Promise<{ kitId: string }> }

export async function POST(request: NextRequest, context: Context) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError
  try {
    return NextResponse.json(await generateBrandLaunchLogos((await context.params).kitId), { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } })
  } catch (error) {
    if (error instanceof BrandLaunchError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    console.error("brand_launch_logos_failed", error)
    return NextResponse.json({ error: "logo_generation_failed", message: "Logo generation is temporarily unavailable. Please try again." }, { status: 503 })
  }
}
