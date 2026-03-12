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
    /** @deprecated providers override is ignored — tiered checker is always used */
    providers?: AvailabilityProvider[]
    ttlMs?: number
    maxRetries?: number
    backoffMs?: number
    dnsTimeoutMs?: number
    rdapTimeoutMs?: number
  },
): Promise<AvailabilityCheckResult> {
  const cached = getCachedAvailability(domain)
  if (cached) return cached

  const started = Date.now()

  try {
    const result = await tieredCheck(domain, {
      signal: options?.signal,
      dnsTimeoutMs: options?.dnsTimeoutMs,
      rdapTimeoutMs: options?.rdapTimeoutMs,
    })

    const mapped = mapToAvailabilityResult(result, Date.now() - started)
    const ttl = result.status === "error" ? Math.min(options?.ttlMs ?? DEFAULT_TTL_MS, 60_000) : (options?.ttlMs ?? DEFAULT_TTL_MS)
    setCachedAvailability(domain, mapped, ttl)
    return mapped
  } catch (err: any) {
    const degraded: AvailabilityCheckResult = {
      domain,
      available: false,
      provider: "none",
      latencyMs: Date.now() - started,
      confidence: "low",
      error: err?.message || "availability_unknown",
    }
    setCachedAvailability(domain, degraded, 60_000)
    return degraded
  }
}

export async function checkAvailabilityBatch(
  domains: string[],
  options?: {
    signal?: AbortSignal
    /** @deprecated providers override is ignored — tiered checker is always used */
    providers?: AvailabilityProvider[]
    ttlMs?: number
    maxRetries?: number
    backoffMs?: number
    concurrency?: number
    dnsTimeoutMs?: number
    rdapTimeoutMs?: number
  },
): Promise<AvailabilityCheckResult[]> {
  const uniqueDomains = Array.from(new Set(domains.map((d) => d.toLowerCase())))
  const concurrency = options?.concurrency ?? 5

  return mapWithConcurrency(uniqueDomains, concurrency, (domain) =>
    checkAvailability(domain, {
      signal: options?.signal,
      ttlMs: options?.ttlMs,
      dnsTimeoutMs: options?.dnsTimeoutMs,
      rdapTimeoutMs: options?.rdapTimeoutMs,
    }),
  )
}

export const availabilityProviders = {
  dnsGoogleProvider,
  dnsCloudflareProvider,
  rdapProvider,
}
