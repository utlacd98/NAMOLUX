/**
 * Marketing Agent API Route
 * 
 * Admin-only endpoint for generating social media content drafts.
 * This is internal-facing and not exposed to regular users.
 */

import { NextRequest, NextResponse } from "next/server"
import { 
  getMarketingAgentEngine, 
  type Platform, 
  type PostType,
  type GenerateContentRequest 
} from "@/lib/marketing-agent-engine"

// Admin authentication check
function isAdmin(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_SECRET || "namolux-admin-2026"
  const token = request.headers.get("x-admin-token") ||
                request.nextUrl.searchParams.get("token")
  return token === adminToken
}

// Content log storage (in-memory for now, can be extended to database)
interface ContentLogEntry {
  id: string
  content: any
  createdAt: string
}

const contentLog: ContentLogEntry[] = []

export async function POST(request: NextRequest) {
  try {
    // Admin check (optional during development)
    // if (!isAdmin(request)) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const body = await request.json()
    const { action, platform, postType, context, commentToReply } = body

    // Handle different actions
    if (action === "generate") {
      // Validate required fields
      if (!platform || !postType) {
        return NextResponse.json(
          { error: "Platform and postType are required" },
          { status: 400 }
        )
      }

      // Validate platform
      if (!["linkedin", "facebook"].includes(platform)) {
        return NextResponse.json(
          { error: "Invalid platform. Must be 'linkedin' or 'facebook'" },
          { status: 400 }
        )
      }

      // Validate post type
      const validPostTypes = ["insight", "product_update", "build_in_public", "comment_reply"]
      if (!validPostTypes.includes(postType)) {
        return NextResponse.json(
          { error: `Invalid postType. Must be one of: ${validPostTypes.join(", ")}` },
          { status: 400 }
        )
      }

      // Comment reply requires a comment
      if (postType === "comment_reply" && !commentToReply) {
        return NextResponse.json(
          { error: "commentToReply is required for comment_reply post type" },
          { status: 400 }
        )
      }

      const engine = getMarketingAgentEngine()
      
      const contentRequest: GenerateContentRequest = {
        platform: platform as Platform,
        postType: postType as PostType,
        context,
        commentToReply
      }

      const result = await engine.generateContent(contentRequest)

      // Log the generated content
      const logEntry: ContentLogEntry = {
        id: crypto.randomUUID(),
        content: result,
        createdAt: new Date().toISOString()
      }
      contentLog.unshift(logEntry)
      
      // Keep only last 50 entries
      if (contentLog.length > 50) {
        contentLog.pop()
      }

      return NextResponse.json({
        success: true,
        data: result
      })
    }

    if (action === "weekly-plan") {
      const engine = getMarketingAgentEngine()
      const plan = await engine.generateWeeklyPlan(context)
      
      return NextResponse.json({
        success: true,
        data: plan
      })
    }

    if (action === "get-log") {
      return NextResponse.json({
        success: true,
        data: contentLog.slice(0, 20)  // Return last 20 entries
      })
    }

    return NextResponse.json(
      { error: "Invalid action. Must be 'generate', 'weekly-plan', or 'get-log'" },
      { status: 400 }
    )

  } catch (error: any) {
    console.error("Marketing Agent Error:", error)

    if (error.status === 401) {
      return NextResponse.json(
        { error: "OpenAI API key invalid" },
        { status: 500 }
      )
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: "Rate limited. Please try again in a moment." },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    )
  }
}

// GET endpoint for fetching content log
export async function GET(request: NextRequest) {
  // Optional admin check
  // if (!isAdmin(request)) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // }

  return NextResponse.json({
    success: true,
    data: contentLog.slice(0, 20)
  })
}

