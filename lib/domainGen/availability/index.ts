import { getCachedAvailability, setCachedAvailability } from "@/lib/domainGen/availability/cache"
import { dnsGoogleProvider } from "@/lib/domainGen/availability/providers/currentProvider"
import { rdapProvider } from "@/lib/domainGen/availability/providers/rdapProvider"
import type { AvailabilityCheckResult, AvailabilityProvider } from "@/lib/domainGen/types"

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function checkWithBackoff(
  provider: AvailabilityProvider,
  domain: string,
  signal: AbortSignal | undefined,
  maxRetries: number,
  baseBackoffMs: number,
): Promise<AvailabilityCheckResult | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const result = await provider.check(domain, signal)
    if (!result) return null

    if (!result.error) {
      return result
    }

    if (attempt < maxRetries) {
      const jitter = Math.floor(Math.random() * 35)
      await delay(baseBackoffMs * 2 ** attempt + jitter)
    }
  }

  return null
}

export async function checkAvailability(
  domain: string,
  options?: {
    signal?: AbortSignal
    providers?: AvailabilityProvider[]
    ttlMs?: number
    maxRetries?: number
    backoffMs?: number
  },
): Promise<AvailabilityCheckResult> {
  const cached = getCachedAvailability(domain)
  if (cached) {
    return cached
  }

  const providers = options?.providers || [dnsGoogleProvider, rdapProvider]
  const maxRetries = options?.maxRetries ?? 1
  const backoffMs = options?.backoffMs ?? 120

  let fallback: AvailabilityCheckResult | null = null

  for (const provider of providers) {
    const result = await checkWithBackoff(provider, domain, options?.signal, maxRetries, backoffMs)
    if (!result) continue

    if (!result.error) {
      setCachedAvailability(domain, result, options?.ttlMs ?? DEFAULT_TTL_MS)
      return result
    }

    fallback = fallback || result
  }

  const degraded: AvailabilityCheckResult =
    fallback || {
      domain,
      available: false,
      provider: "none",
      latencyMs: 0,
      confidence: "low",
      error: "availability_unknown",
    }

  setCachedAvailability(domain, degraded, Math.min(options?.ttlMs ?? DEFAULT_TTL_MS, 60_000))
  return degraded
}

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
      if (current >= items.length) {
        return
      }
      results[current] = await mapper(items[current], current)
    }
  })

  await Promise.all(workers)
  return results
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
  },
): Promise<AvailabilityCheckResult[]> {
  const uniqueDomains = Array.from(new Set(domains.map((domain) => domain.toLowerCase())))
  const concurrency = options?.concurrency ?? 6

  return mapWithConcurrency(uniqueDomains, concurrency, async (domain) =>
    checkAvailability(domain, {
      signal: options?.signal,
      providers: options?.providers,
      ttlMs: options?.ttlMs,
      maxRetries: options?.maxRetries,
      backoffMs: options?.backoffMs,
    }),
  )
}

export const availabilityProviders = {
  dnsGoogleProvider,
  rdapProvider,
}
