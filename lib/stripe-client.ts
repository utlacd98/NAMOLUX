import Stripe from "stripe"
import { getStripeEnvironment } from "@/lib/env"

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeEnvironment().secretKey, {
      apiVersion: "2026-06-24.dahlia",
    })
  }

  return stripeClient
}
