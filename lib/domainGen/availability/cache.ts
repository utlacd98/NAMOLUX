import type { AvailabilityCheckResult } from "@/lib/domainGen/types"

interface CacheEntry {
  result: AvailabilityCheckResult
  expiresAt: number
}

const availabilityCache = new Map<string, CacheEntry>()

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
  availabilityCache.set(domain, {
    result,
    expiresAt: Date.now() + ttlMs,
  })
}

export function clearAvailabilityCache(): void {
  availabilityCache.clear()
}
