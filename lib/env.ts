import { z } from "zod"

const requiredValue = z.string().trim().min(1)

function requireValue(name: string, value: string | undefined): string {
  const parsed = requiredValue.safeParse(value)
  if (!parsed.success) throw new Error(`${name} is not configured`)
  return parsed.data
}

export function getSupabaseEnvironment() {
  return {
    url: requireValue("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: requireValue(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  }
}

export function getSupabaseServiceEnvironment() {
  return {
    ...getSupabaseEnvironment(),
    serviceRoleKey: requireValue("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  }
}

export function getStripeEnvironment() {
  return {
    secretKey: requireValue("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || null,
  }
}

export function getAppUrl(fallback: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return configured && URL.canParse(configured) ? configured.replace(/\/$/, "") : fallback.replace(/\/$/, "")
}

export function adsAreEnabled(): boolean {
  return process.env.ADS_ENABLED?.trim().toLowerCase() === "true"
}
