import { NextResponse } from "next/server"

// Billing portal is not used with one-time payments — redirect to dashboard
export async function GET() {
  return NextResponse.redirect("https://www.namolux.com/dashboard")
}

