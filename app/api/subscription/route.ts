import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  // TEMPORARY: paywall disabled while API keys are rotated — all users reported as pro
  return NextResponse.json({
    isPro: true,
    subscriptionEnd: null,
    customerId: null,
  })
}

