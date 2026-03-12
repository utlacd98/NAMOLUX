import type { DomainCheckResult, DomainStatus, AvailabilityCheckResult } from "@/lib/domainGen/types"

const DNS_TIMEOUT_MS = 3_000
const RDAP_TIMEOUT_MS = 5_000

/**
 * Authoritative RDAP endpoints per TLD.
 * Source: IANA RDAP bootstrap + registry documentation.
 * A 404 response = unregistered (available).
 * A 200 response = registered (taken).
 * Any other status = error (fall back to DNS result).
 */
const RDAP_ENDPOINTS: Record<string, string> = {
  com: "https://rdap.verisign.com/com/v1/domain",
  net: "https://rdap.verisign.com/net/v1/domain",
  co:  "https://rdap.nic.co/domain",
  app: "https://rdap.registry.google/app/domain",
  dev: "https://rdap.registry.google/dev/domain",
  ai:  "https://rdap.nic.ai/domain",
  io:  "https://rdap.nic.io/domain",
}

function createTimeoutSignal(ms: number, parent?: AbortSignal): AbortSignal {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)

  if (parent) {
    if (parent.aborted) {
      clearTimeout(timer)
      controller.abort()
    } else {
      parent.addEventListener("abort", () => {
        clearTimeout(timer)
        controller.abort()
      })
    }
  }

  // Clear timer if the signal itself is already being cleaned up
  controller.signal.addEventListener("abort", () => clearTimeout(timer))

  return controller.signal
}

type DnsResult = "available" | "taken" | "error"

async function queryGoogleDns(domain: string, signal: AbortSignal): Promise<DnsResult> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=NS`, {
      headers: { Accept: "application/dns-json" },
      signal,
    })
    if (!res.ok) return "error"
    const data = await res.json()
    if (data.Status === 3) return "available"
    if (data.Status === 0) {
      const hasRecords =
        (Array.isArray(data.Answer) && data.Answer.length > 0) ||
        (Array.isArray(data.Authority) && data.Authority.length > 0)
      return hasRecords ? "taken" : "available"
    }
    return "error"
  } catch {
    return "error"
  }
}

async function queryCloudflareDns(domain: string, signal: AbortSignal): Promise<DnsResult> {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`, {
      headers: { Accept: "application/dns-json" },
      signal,
    })
    if (!res.ok) return "error"
    const data = await res.json()
    if (data.Status === 3) return "available"
    if (data.Status === 0) {
      const hasRecords =
        (Array.isArray(data.Answer) && data.Answer.length > 0) ||
        (Array.isArray(data.Authority) && data.Authority.length > 0)
      return hasRecords ? "taken" : "available"
    }
    return "error"
  } catch {
    return "error"
  }
}

function determineTier1Status(google: DnsResult, cloudflare: DnsResult): DomainStatus {
  // Both error
  if (google === "error" && cloudflare === "error") return "error"

  // Either definitively taken
  if (google === "taken" || cloudflare === "taken") {
    // If one is taken and the other disagrees (not error), it's a conflict
    if (
      (google === "taken" && cloudflare === "available") ||
      (google === "available" && cloudflare === "taken")
    ) {
      return "needs_verification"
    }
    return "taken"
  }

  // Both available (or one errored but the other says available)
  if (google === "available" && cloudflare === "available") return "likely_available"
  if (google === "available" || cloudflare === "available") return "likely_available"

  return "error"
}

function getRdapEndpoint(domain: string): string | null {
  const tld = domain.split(".").pop() ?? ""
  return RDAP_ENDPOINTS[tld] ?? null
}

async function queryRdap(domain: string, signal: AbortSignal): Promise<"registered" | "unregistered" | "error"> {
  const baseUrl = getRdapEndpoint(domain)
  if (!baseUrl) return "error"

  try {
    const res = await fetch(`${baseUrl}/${domain}`, {
      headers: { Accept: "application/rdap+json,application/json" },
      signal,
    })
    if (res.status === 404) return "unregistered"
    if (res.ok) return "registered"
    return "error"
  } catch {
    return "error"
  }
}

/** Tier 3 stub — reserved for future registrar pricing integration */
function getRegistrarPricing(_domain: string): { price: number | null; registrar: string | null } {
  return { price: null, registrar: null }
}

/**
 * Performs a 3-tier domain availability check:
 *  - Tier 1: Google DNS + Cloudflare DNS in parallel
 *  - Tier 2: RDAP verification (for all TLDs with a known endpoint, when Tier 1 is likely_available or needs_verification)
 *  - Tier 3: Registrar pricing stub
 */
export async function tieredCheck(
  domain: string,
  options?: {
    signal?: AbortSignal
    dnsTimeoutMs?: number
    rdapTimeoutMs?: number
  },
): Promise<DomainCheckResult> {
  const dnsMs = options?.dnsTimeoutMs ?? DNS_TIMEOUT_MS
  const rdapMs = options?.rdapTimeoutMs ?? RDAP_TIMEOUT_MS
  const parent = options?.signal

  const dnsSignal = createTimeoutSignal(dnsMs, parent)

  // Tier 1 — parallel DNS
  const [google, cloudflare] = await Promise.all([
    queryGoogleDns(domain, dnsSignal),
    queryCloudflareDns(domain, dnsSignal),
  ])

  const tier1Status = determineTier1Status(google, cloudflare)

  let tier2: DomainCheckResult["tier2"] | undefined
  let finalStatus = tier1Status

  // Tier 2 — RDAP verification for all TLDs with a known endpoint
  if (getRdapEndpoint(domain) && (tier1Status === "likely_available" || tier1Status === "needs_verification")) {
    const rdapSignal = createTimeoutSignal(rdapMs, parent)
    const rdapResult = await queryRdap(domain, rdapSignal)
    tier2 = { rdap: rdapResult }

    if (rdapResult === "unregistered") {
      finalStatus = "available"
    } else if (rdapResult === "registered") {
      finalStatus = "taken"
    }
    // rdap error: leave finalStatus as tier1Status (likely_available or needs_verification)
  }

  // Tier 3 — pricing stub
  const tier3 = getRegistrarPricing(domain)

  return {
    domain,
    status: finalStatus,
    checkedAt: new Date(),
    tier1: { google, cloudflare },
    tier2,
    tier3,
  }
}

/**
 * Maps a DomainCheckResult to the existing AvailabilityCheckResult interface
 * for backward compatibility with all callers.
 */
export function mapToAvailabilityResult(
  result: DomainCheckResult,
  latencyMs: number,
): AvailabilityCheckResult {
  const { status } = result

  let available = false
  let confidence: "high" | "medium" | "low" = "low"
  let provider = "tiered_dns"
  let error: string | undefined

  switch (status) {
    case "available":
      available = true
      confidence = "high"
      provider = result.tier2 ? "tiered_dns+rdap" : "tiered_dns"
      break
    case "taken":
      available = false
      confidence = result.tier2 ? "high" : "high"
      provider = result.tier2 ? "tiered_dns+rdap" : "tiered_dns"
      break
    case "likely_available":
      available = true
      confidence = "medium"
      provider = "tiered_dns"
      break
    case "needs_verification":
      available = false
      confidence = "low"
      provider = "tiered_dns"
      break
    case "error":
      available = false
      confidence = "low"
      provider = "tiered_dns"
      error = "availability_unknown"
      break
  }

  return {
    domain: result.domain,
    available,
    provider,
    latencyMs,
    confidence,
    error,
    tieredDetails: result,
  }
}
