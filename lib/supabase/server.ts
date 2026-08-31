import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseEnvironment, getSupabaseServiceEnvironment } from "@/lib/env"
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"
import { createSupabaseRetryFetch } from "@/lib/supabase/retry-fetch"
import type { Database } from "@/lib/supabase/database.types"

export async function createClient() {
  const cookieStore = await cookies()
  const environment = getSupabaseEnvironment()

  return createServerClient<Database>(
    environment.url,
    environment.publishableKey,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      global: {
        fetch: createSupabaseRetryFetch(),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

let serviceClient: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createServiceClient() {
  if (!serviceClient) {
    const environment = getSupabaseServiceEnvironment()
    serviceClient = createSupabaseClient<Database>(environment.url, environment.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: createSupabaseRetryFetch(),
      },
    })
  }

  return serviceClient
}
