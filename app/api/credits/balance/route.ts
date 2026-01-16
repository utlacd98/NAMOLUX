import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { getOrCreateUser } from "@/lib/credits"

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user email from Clerk
    const { sessionClaims } = await auth()
    const email = sessionClaims?.email as string

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 })
    }

    // Get or create user in database
    const user = await getOrCreateUser(userId, email)

    return NextResponse.json({
      credits: user.credits,
      userId: user.id,
    })
  } catch (error) {
    console.error("Error fetching credits:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

