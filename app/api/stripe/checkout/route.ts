import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  // TEMPORARY: payments disabled while API keys are rotated
  return NextResponse.redirect(new URL("/dashboard", request.url))
}

