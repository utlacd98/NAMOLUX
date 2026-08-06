"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseEnvironment } from "@/lib/env"
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"
import type { Database } from "@/lib/supabase/database.types"

export function createClient() {
  const environment = getSupabaseEnvironment()
  return createBrowserClient<Database>(environment.url, environment.publishableKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
  })
}
