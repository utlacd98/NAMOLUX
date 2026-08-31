import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { BrandLaunchError, getOwnedBrandLaunchKit, selectBrandLaunchLogo, selectBrandLaunchPalette } from "@/lib/brand-launch"
import { rejectCrossOrigin } from "@/lib/naming-workspace-http"

type Context = { params: Promise<{ kitId: string }> }
const patchSchema = z.object({ selectedPaletteIndex: z.number().int().min(0).max(2).optional(), selectedLogoId: z.string().uuid().optional() }).strict()

function failure(error: unknown) {
  if (error instanceof BrandLaunchError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
  console.error("brand_launch_kit_failed", error)
  return NextResponse.json({ error: "brand_launch_unavailable", message: "Brand Launch is temporarily unavailable." }, { status: 503 })
}

export async function GET(_: NextRequest, context: Context) {
  try { return NextResponse.json(await getOwnedBrandLaunchKit((await context.params).kitId), { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } }) } catch (error) { return failure(error) }
}

export async function PATCH(request: NextRequest, context: Context) {
  const originError = rejectCrossOrigin(request)
  if (originError) return originError
  try {
    const input = patchSchema.parse(await request.json())
    const kitId = (await context.params).kitId
    if (input.selectedPaletteIndex !== undefined) return NextResponse.json(await selectBrandLaunchPalette(kitId, input.selectedPaletteIndex))
    if (input.selectedLogoId) return NextResponse.json(await selectBrandLaunchLogo(kitId, input.selectedLogoId))
    return NextResponse.json({ error: "invalid_update", message: "Choose a palette or logo." }, { status: 400 })
  } catch (error) { return failure(error) }
}
