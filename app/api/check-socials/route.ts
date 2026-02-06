import { NextRequest, NextResponse } from "next/server"

// Social platforms to check
const PLATFORMS = [
  { id: "twitter", name: "Twitter/X", urlTemplate: "https://twitter.com/{handle}", color: "#1DA1F2" },
  { id: "instagram", name: "Instagram", urlTemplate: "https://instagram.com/{handle}", color: "#E4405F" },
  { id: "tiktok", name: "TikTok", urlTemplate: "https://tiktok.com/@{handle}", color: "#000000" },
  { id: "github", name: "GitHub", urlTemplate: "https://github.com/{handle}", color: "#181717" },
  { id: "youtube", name: "YouTube", urlTemplate: "https://youtube.com/@{handle}", color: "#FF0000" },
]

// Check if a social handle is available by checking HTTP status
async function checkHandleAvailability(
  platform: typeof PLATFORMS[number],
  handle: string
): Promise<{ platform: string; platformId: string; handle: string; available: boolean; url: string; color: string }> {
  const url = platform.urlTemplate.replace("{handle}", handle)
  
  try {
    // Use HEAD request for efficiency
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual", // Don't follow redirects
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    // 404 usually means available, 200 means taken
    // Some platforms redirect to a "user not found" page instead of 404
    const available = response.status === 404 || response.status === 410

    return {
      platform: platform.name,
      platformId: platform.id,
      handle,
      available,
      url,
      color: platform.color,
    }
  } catch (error) {
    // On error, assume not available (conservative approach)
    console.error(`Error checking ${platform.name}/${handle}:`, error)
    return {
      platform: platform.name,
      platformId: platform.id,
      handle,
      available: false, // Conservative: assume taken on error
      url,
      color: platform.color,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { handle } = await request.json()

    if (!handle || typeof handle !== "string") {
      return NextResponse.json({ error: "Handle is required" }, { status: 400 })
    }

    // Clean handle - remove @ and special characters
    const cleanHandle = handle.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()

    if (cleanHandle.length < 1 || cleanHandle.length > 30) {
      return NextResponse.json({ error: "Handle must be 1-30 characters" }, { status: 400 })
    }

    // Check all platforms in parallel
    const results = await Promise.all(
      PLATFORMS.map((platform) => checkHandleAvailability(platform, cleanHandle))
    )

    // Count available
    const availableCount = results.filter((r) => r.available).length

    return NextResponse.json({
      success: true,
      handle: cleanHandle,
      results,
      summary: {
        total: PLATFORMS.length,
        available: availableCount,
        taken: PLATFORMS.length - availableCount,
      },
    })
  } catch (error: any) {
    console.error("Error checking social handles:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check social handles" },
      { status: 500 }
    )
  }
}

