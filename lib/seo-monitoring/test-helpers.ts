import type { HttpRequester, SafeNetworkAdapters } from "./types"

export interface FixtureResponse {
  statusCode: number
  headers?: Record<string, string>
  body?: string
  delayMs?: number
}

export function createFixtureNetwork(
  fixtures: Readonly<Record<string, FixtureResponse>>,
  dns: Readonly<Record<string, string[]>> = {},
): {
  network: SafeNetworkAdapters
  requests: Array<{ url: string; address: string; headers: Readonly<Record<string, string>> }>
  maxActive: () => number
} {
  const requests: Array<{ url: string; address: string; headers: Readonly<Record<string, string>> }> = []
  let active = 0
  let peak = 0

  const requester: HttpRequester = async (input) => {
    requests.push({ url: input.url.toString(), address: input.resolvedAddress.address, headers: input.headers })
    const fixture = fixtures[input.url.toString()] || { statusCode: 404, body: "Not found", headers: { "content-type": "text/plain" } }
    active += 1
    peak = Math.max(peak, active)
    try {
      if (fixture.delayMs) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, fixture.delayMs)
          input.signal.addEventListener("abort", () => {
            clearTimeout(timer)
            reject(new Error("aborted"))
          }, { once: true })
        })
      }
      const body = new TextEncoder().encode(fixture.body || "")
      return {
        statusCode: fixture.statusCode,
        headers: Object.fromEntries(Object.entries(fixture.headers || {}).map(([key, value]) => [key.toLowerCase(), value])),
        body,
        durationMs: fixture.delayMs || 1,
      }
    } finally {
      active -= 1
    }
  }

  return {
    requests,
    maxActive: () => peak,
    network: {
      resolver: async (hostname) => (dns[hostname] || ["93.184.216.34"]).map((address) => ({
        address,
        family: address.includes(":") ? 6 as const : 4 as const,
      })),
      requester,
    },
  }
}
