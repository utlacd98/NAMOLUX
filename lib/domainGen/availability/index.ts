import { getCachedAvailability, setCachedAvailability } from "@/lib/domainGen/availability/cache"
import { tieredCheck, mapToAvailabilityResult } from "@/lib/domainGen/availability/tieredChecker"
import { dnsGoogleProvider } from "@/lib/domainGen/availability/providers/currentProvider"
import { dnsCloudflareProvider } from "@/lib/domainGen/availability/providers/cloudflareProvider"
import { rdapProvider } from "@/lib/domainGen/availability/providers/rdapProvider"
import type { AvailabilityCheckResult, AvailabilityProvider } from "@/lib/domainGen/types"

export { tieredCheck } from "@/lib/domainGen/availability/tieredChecker"

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let index = 0

  const workers = new Array(Math.max(1, concurrency)).fill(null).map(async () => {
    while (true) {
      const current = index
      index += 1
      if (current >= items.length) return
      results[current] = await mapper(items[current], current)
    }
  })

  await Promise.all(workers)
  return results
}

export async function checkAvailability(
  domain: string,
  options?: {
    signal?: AbortSignal
    providers?: AvailabilityProvider[]
    ttlMs?: number
    maxRetries?: number
    backoffMs?: number
    dnsTimeoutMs?: number
    rdapTimeoutMs?: number
    /** Set false when a durable caller owns the cache lifetime itself. */
    cache?: boolean
  },
): Promise<AvailabilityCheckResult> {
  const normalizedDomain = domain.toLowerCase()
  const cacheEnabled = options?.cache !== false
  if (cacheEnabled) {
    const cached = getCachedAvailability(normalizedDomain)
    if (cached) return cached
  }

  const started = Date.now()
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS

  if (options?.providers?.length) {
    for (const provider of options.providers) {
      const maxRetries = Math.max(0, options.maxRetries ?? 1)

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        if (options.signal?.aborted) {
          throw new Error("aborted")
        }

        try {
          const result = await provider.check(normalizedDomain, options.signal)
          if (!result || result.error) {
            break
          }

          const mapped = {
            ...result,
            domain: normalizedDomain,
            latencyMs: Date.now() - started,
          }
          if (cacheEnabled) setCachedAvailability(normalizedDomain, mapped, ttlMs)
          return mapped
        } catch {
          if (attempt >= maxRetries) break
          if (options.backoffMs) {
            await new Promise((resolve) => setTimeout(resolve, options.backoffMs))
          }
        }
      }
    }

    const degraded: AvailabilityCheckResult = {
      domain: normalizedDomain,
      available: false,
      provider: "none",
      latencyMs: Date.now() - started,
      confidence: "low",
      error: "all_providers_failed",
    }
    if (cacheEnabled) setCachedAvailability(normalizedDomain, degraded, Math.min(ttlMs, 60_000))
    return degraded
  }

  try {
    const result = await tieredCheck(normalizedDomain, {
      signal: options?.signal,
      dnsTimeoutMs: options?.dnsTimeoutMs,
      rdapTimeoutMs: options?.rdapTimeoutMs,
    })

    const mapped = mapToAvailabilityResult(result, Date.now() - started)
    const ttl = result.status === "error" ? Math.min(ttlMs, 60_000) : ttlMs
    if (cacheEnabled) setCachedAvailability(normalizedDomain, mapped, ttl)
    return mapped
  } catch (err: any) {
    const degraded: AvailabilityCheckResult = {
      domain: normalizedDomain,
      available: false,
      provider: "none",
      latencyMs: Date.now() - started,
      confidence: "low",
      error: err?.message || "availability_unknown",
    }
    if (cacheEnabled) setCachedAvailability(normalizedDomain, degraded, 60_000)
    return degraded
  }
}

export async function checkAvailabilityBatch(
  domains: string[],
  options?: {
    signal?: AbortSignal
    providers?: AvailabilityProvider[]
    ttlMs?: number
    maxRetries?: number
    backoffMs?: number
    concurrency?: number
    dnsTimeoutMs?: number
    rdapTimeoutMs?: number
    cache?: boolean
    /** Called after each finished check so durable callers can stream progress. */
    onResult?: (result: AvailabilityCheckResult) => void | Promise<void>
  },
): Promise<AvailabilityCheckResult[]> {
  const uniqueDomains = Array.from(new Set(domains.map((d) => d.toLowerCase())))
  const concurrency = options?.concurrency ?? 5

  return mapWithConcurrency(uniqueDomains, concurrency, async (domain) => {
    const result = await checkAvailability(domain, {
      signal: options?.signal,
      ttlMs: options?.ttlMs,
      providers: options?.providers,
      maxRetries: options?.maxRetries,
      backoffMs: options?.backoffMs,
      dnsTimeoutMs: options?.dnsTimeoutMs,
      rdapTimeoutMs: options?.rdapTimeoutMs,
      cache: options?.cache,
    })
    await options?.onResult?.(result)
    return result
  })
}

export const availabilityProviders = {
  dnsGoogleProvider,
  dnsCloudflareProvider,
  rdapProvider,
}
