import type { AvailabilityCheckResult } from "@/lib/domainGen/types"

interface CacheEntry {
  result: AvailabilityCheckResult
  expiresAt: number
}

const availabilityCache = new Map<string, CacheEntry>()
const MAX_CACHE_ENTRIES = 5000

export function getCachedAvailability(domain: string): AvailabilityCheckResult | null {
  const entry = availabilityCache.get(domain)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    availabilityCache.delete(domain)
    return null
  }

  return {
    ...entry.result,
    cached: true,
  }
}

export function setCachedAvailability(domain: string, result: AvailabilityCheckResult, ttlMs: number): void {
  if (availabilityCache.size >= MAX_CACHE_ENTRIES && !availabilityCache.has(domain)) {
    const oldestKey = availabilityCache.keys().next().value
    if (oldestKey) availabilityCache.delete(oldestKey)
  }

  availabilityCache.set(domain, {
    result,
    expiresAt: Date.now() + ttlMs,
  })
}

export function clearAvailabilityCache(): void {
  availabilityCache.clear()
}
