import type { AvailabilityCheckResult, AvailabilityProvider } from "@/lib/domainGen/types"

export const dnsGoogleProvider: AvailabilityProvider = {
  name: "dns_google_ns",
  async check(domain: string, signal?: AbortSignal): Promise<AvailabilityCheckResult | null> {
    const started = Date.now()

    try {
      const response = await fetch(`https://dns.google/resolve?name=${domain}&type=NS`, {
        headers: { Accept: "application/dns-json" },
        signal,
      })

      if (!response.ok) {
        return {
          domain,
          available: false,
          provider: "dns_google_ns",
          latencyMs: Date.now() - started,
          confidence: "low",
          error: `dns_status_${response.status}`,
        }
      }

      const data = await response.json()

      if (data.Status === 3) {
        return {
          domain,
          available: true,
          provider: "dns_google_ns",
          latencyMs: Date.now() - started,
          confidence: "high",
        }
      }

      if (data.Status === 0) {
        const hasNsAnswer = Array.isArray(data.Answer) && data.Answer.length > 0
        const hasAuthority = Array.isArray(data.Authority) && data.Authority.length > 0

        return {
          domain,
          available: !hasNsAnswer && !hasAuthority,
          provider: "dns_google_ns",
          latencyMs: Date.now() - started,
          confidence: hasNsAnswer || hasAuthority ? "high" : "medium",
        }
      }

      return {
        domain,
        available: false,
        provider: "dns_google_ns",
        latencyMs: Date.now() - started,
        confidence: "low",
        error: `dns_unknown_status_${data.Status}`,
      }
    } catch (error: any) {
      return {
        domain,
        available: false,
        provider: "dns_google_ns",
        latencyMs: Date.now() - started,
        confidence: "low",
        error: error?.message || "dns_error",
      }
    }
  },
}
