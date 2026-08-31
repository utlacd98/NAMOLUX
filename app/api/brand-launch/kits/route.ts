import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { BrandLaunchError, createBrandLaunchKit, getBrandLaunchOverview } from "@/lib/brand-launch"
import { rejectCrossOrigin } from "@/lib/naming-workspace-http"

const createSchema = z.object({
  domainName: z.string().trim().min(3).max(253),
  businessDescription: z.string().trim().min(20).max(1500),
  mvpDescription: z.string().trim().min(20).max(1500),
  audience: z.string().trim().max(280).optional(),
  visualStyle: z.string().trim().max(80).optional(),
  idempotencyKey: z.string().min(16).max(200),
}).strict()

function failure(error: unknown) {
  if (error instanceof BrandLaunchError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
  console.error("brand_launch_kits_failed", error)
  return NextResponse.json({ error: "brand_launch_unavailable", message: "Brand Launch is temporarily unavailable." }, { status: 503 })
}

export async function GET() {
  try {
    return NextResponse.json(await getBrandLaunchOverview(), { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: NextRequest) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError
  try {
    const input = createSchema.parse(await request.json())
    return NextResponse.json(await createBrandLaunchKit(input), { status: 201, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } })
  } catch (error) {
    return failure(error)
  }
}
