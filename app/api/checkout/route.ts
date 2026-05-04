import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Initialize Stripe lazily
let stripe: Stripe | null = null

function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured")
    }
    stripe = new Stripe(key, {
      apiVersion: "2024-12-18.acacia",
    })
  }
  return stripe
}

export async function GET(request: NextRequest) {
  // TEMPORARY: payments disabled while API keys are rotated
  return NextResponse.redirect(new URL("/dashboard", request.url))
}
