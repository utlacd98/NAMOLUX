import { NextRequest, NextResponse } from "next/server"
import { BrandLaunchError, getOwnedBrandLaunchKit, siteFiles } from "@/lib/brand-launch"

type Context = { params: Promise<{ kitId: string }> }

export async function GET(request: NextRequest, context: Context) {
  try {
    const kit = await getOwnedBrandLaunchKit((await context.params).kitId)
    const files = siteFiles(kit)
    const file = request.nextUrl.searchParams.get("file")
    const selected = file === "css" ? { name: "styles.css", content: files.css, type: "text/css" } : file === "js" ? { name: "script.js", content: files.script, type: "text/javascript" } : { name: "index.html", content: files.html, type: "text/html" }
    return new NextResponse(selected.content, { headers: { "Content-Type": `${selected.type}; charset=utf-8`, "Content-Disposition": `attachment; filename=\"${files.slug}-${selected.name}\"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } })
  } catch (error) {
    if (error instanceof BrandLaunchError) return new NextResponse(error.message, { status: error.status, headers: { "Cache-Control": "no-store" } })
    console.error("brand_launch_site_export_failed", error)
    return new NextResponse("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
