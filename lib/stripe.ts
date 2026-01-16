import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
})

export const CREDIT_PACKAGES = [
  {
    id: "free",
    name: "Free Trial",
    credits: 5,
    price: 0,
    priceId: null, // Free trial, no payment needed
    popular: false,
    description: "Try it out, no card required",
    features: [
      "5 credits",
      "5 domain checks",
      "AI chat brainstorming",
      "Basic shortlist",
    ],
    buttonText: "Get started",
    isFree: true,
  },
  {
    id: "starter",
    name: "Starter Pack",
    credits: 25,
    price: 5,
    priceId: process.env.STRIPE_PRICE_STARTER,
    popular: false,
    description: "For indie hackers and side projects",
    features: [
      "25 credits",
      "25 domain checks",
      "All vibe modes",
      "Export to CSV",
      "Email support",
    ],
    buttonText: "Get Starter",
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 100,
    price: 15,
    priceId: process.env.STRIPE_PRICE_PRO,
    popular: true,
    description: "For serious founders building brands",
    features: [
      "100 credits",
      "100 domain checks",
      "Priority generation speed",
      "Export to Notion & Airtable",
      "Priority support",
    ],
    buttonText: "Get Pro",
  },
]

export function getCreditPackage(packageId: string) {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === packageId)
}

