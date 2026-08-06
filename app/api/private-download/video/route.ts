import { get } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { getGeneratorLabApiBlockResponse } from "@/lib/generator-lab"
import { getPrivateVideoPathname, verifiesPrivateVideoDownload } from "@/lib/private-video-download"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const blocked = getGeneratorLabApiBlockResponse(request)
  if (blocked) return blocked
  if (!verifiesPrivateVideoDownload(request.nextUrl.searchParams.get("expires"), request.nextUrl.searchParams.get("signature"))) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } })
  try {
    const blob = await get(getPrivateVideoPathname(), { access: "private" })
    if (!blob?.stream) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } })
    return new NextResponse(blob.stream, { headers: { "Content-Type": blob.blob.contentType || "video/mp4", "Content-Length": String(blob.blob.size || ""), "Content-Disposition": 'attachment; filename="namolux-social-ad.mp4"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" } })
  } catch (error) { console.error("private-video-download-failed", error); return new NextResponse("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } }) }
}
