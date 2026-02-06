import { NextRequest, NextResponse } from "next/server"
import { getSubscriptionByEmail } from "@/lib/subscription"

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const subscription = await getSubscriptionByEmail(email)

    return NextResponse.json(subscription)
  } catch (error: any) {
    console.error("Error checking subscription:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check subscription" },
      { status: 500 }
    )
  }
}

