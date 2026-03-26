/**
 * Client-side domain availability cache
 *
 * Caches RDAP/DNS results in localStorage to avoid re-checking domains the user
 * has already seen. Prevents wasted API calls on identical re-searches.
 *
 * TTL strategy:
 *   - "taken" domains: 48h  (ownership rarely changes that fast)
 *   - "available" domains: 2h (short-window — domains get registered quickly)
 *   - "likely_available" domains: 1h (less certain, expire faster)
 */

const CACHE_KEY = "namolux_domain_cache"

// TTL in milliseconds
const TTL = {
  available: 2 * 60 * 60 * 1000,         // 2h
  likely_available: 1 * 60 * 60 * 1000,  // 1h
  taken: 48 * 60 * 60 * 1000,            // 48h
  needs_verification: 30 * 60 * 1000,    // 30min
  error: 10 * 60 * 1000,                 // 10min — retry errors quickly
} as const

type CacheStatus = keyof typeof TTL

interface CacheEntry {
  status: CacheStatus
  available: boolean
  checkedAt: number
}

type CacheStore = Record<string, CacheEntry>

// ── Read / Write ─────────────────────────────────────────────────────────────

function readStore(): CacheStore {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as CacheStore
  } catch {
    return {}
  }
}

function writeStore(store: CacheStore): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store))
  } catch {
    // Storage quota exceeded — clear old entries and retry
    clearExpired()
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up a domain in the cache.
 * Returns null if not cached or if the entry has expired.
 */
export function getCached(domain: string): CacheEntry | null {
  const store = readStore()
  const entry = store[domain.toLowerCase()]
  if (!entry) return null

  const ttl = TTL[entry.status] ?? TTL.error
  if (Date.now() - entry.checkedAt > ttl) {
    // Expired — remove it
    delete store[domain.toLowerCase()]
    writeStore(store)
    return null
  }

  return entry
}

/**
 * Store the result of an availability check.
 */
export function setCached(
  domain: string,
  status: CacheStatus,
  available: boolean,
): void {
  const store = readStore()
  store[domain.toLowerCase()] = { status, available, checkedAt: Date.now() }
  writeStore(store)
}

/**
 * Batch set — write multiple results at once (one localStorage write).
 */
export function setCachedBatch(
  entries: Array<{ domain: string; status: CacheStatus; available: boolean }>,
): void {
  const store = readStore()
  const now = Date.now()
  for (const e of entries) {
    store[e.domain.toLowerCase()] = { status: e.status, available: e.available, checkedAt: now }
  }
  writeStore(store)
}

/**
 * Remove all expired entries. Call periodically to keep storage lean.
 */
export function clearExpired(): void {
  if (typeof window === "undefined") return
  try {
    const store = readStore()
    const now = Date.now()
    let changed = false
    for (const [domain, entry] of Object.entries(store)) {
      const ttl = TTL[entry.status] ?? TTL.error
      if (now - entry.checkedAt > ttl) {
        delete store[domain]
        changed = true
      }
    }
    if (changed) writeStore(store)
  } catch {
    // Silently ignore — cache is best-effort
  }
}

/**
 * Get cache stats for debugging / transparency UI.
 */
export function getCacheStats(): { total: number; available: number; taken: number; expired: number } {
  const store = readStore()
  const now = Date.now()
  let available = 0, taken = 0, expired = 0

  for (const entry of Object.values(store)) {
    const ttl = TTL[entry.status] ?? TTL.error
    if (now - entry.checkedAt > ttl) { expired++; continue }
    if (entry.available) available++
    else taken++
  }

  return { total: Object.keys(store).length, available, taken, expired }
}
