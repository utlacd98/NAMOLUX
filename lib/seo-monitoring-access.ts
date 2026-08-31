import { timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"
import { getUserEntitlements, type EntitlementResponse } from "@/lib/entitlements"
import { createClient } from "@/lib/supabase/server"

export type SeoMonitoringPrincipal = {
  userId: string
  email: string | null
  entitlements: EntitlementResponse
}

export async function getSeoMonitoringPrincipal(): Promise<SeoMonitoringPrincipal | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) return null

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    entitlements: await getUserEntitlements(data.user.id),
  }
}

export function hasValidCronSecret(request: NextRequest): boolean {
  const configured = process.env.CRON_SECRET
  const supplied = request.headers.get("authorization")
  if (!configured || !supplied) return false

  const expected = Buffer.from(`Bearer ${configured}`)
  const actual = Buffer.from(supplied)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function monitoringAccessError(principal: SeoMonitoringPrincipal | null) {
  if (!principal) {
    return {
      status: 401,
      body: { error: "authentication_required", message: "Sign in to manage SEO monitoring." },
    }
  }

  return null
}
