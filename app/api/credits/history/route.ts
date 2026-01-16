import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { getUserUsageHistory, getUserTransactionHistory } from "@/lib/credits"

export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "usage" // "usage" or "transactions"
    const limit = parseInt(searchParams.get("limit") || "50")

    if (type === "transactions") {
      const transactions = await getUserTransactionHistory(userId, limit)
      return NextResponse.json({ transactions })
    } else {
      const usage = await getUserUsageHistory(userId, limit)
      return NextResponse.json({ usage })
    }
  } catch (error) {
    console.error("Error fetching history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

