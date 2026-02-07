import type { AvailabilityCheckResult, AvailabilityProvider } from "@/lib/domainGen/types"

export const rdapProvider: AvailabilityProvider = {
  name: "rdap_verisign",
  async check(domain: string, signal?: AbortSignal): Promise<AvailabilityCheckResult | null> {
    const started = Date.now()

    if (!domain.endsWith(".com")) {
      return null
    }

    try {
      const response = await fetch(`https://rdap.verisign.com/com/v1/domain/${domain}`, {
        headers: { Accept: "application/rdap+json,application/json" },
        signal,
      })

      if (response.status === 404) {
        return {
          domain,
          available: true,
          provider: "rdap_verisign",
          latencyMs: Date.now() - started,
          confidence: "medium",
        }
      }

      if (response.ok) {
        return {
          domain,
          available: false,
          provider: "rdap_verisign",
          latencyMs: Date.now() - started,
          confidence: "medium",
        }
      }

      return {
        domain,
        available: false,
        provider: "rdap_verisign",
        latencyMs: Date.now() - started,
        confidence: "low",
        error: `rdap_status_${response.status}`,
      }
    } catch (error: any) {
      return {
        domain,
        available: false,
        provider: "rdap_verisign",
        latencyMs: Date.now() - started,
        confidence: "low",
        error: error?.message || "rdap_error",
      }
    }
  },
}
