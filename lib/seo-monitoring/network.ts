import { lookup } from "node:dns/promises"
import http from "node:http"
import https from "node:https"
import net from "node:net"
import type {
  DnsAddress,
  DnsResolver,
  HttpRequester,
  HttpResponseData,
  ResolvedPublicUrl,
  SafeFetchResult,
  SafeNetworkAdapters,
} from "./types"

export const NAMOLUX_CRAWLER_USER_AGENT =
  "NamoLuxFounderSignalBot/1.0 (+https://www.namolux.com/founder-signal)"

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".home",
  ".home.arpa",
  ".lan",
  ".test",
  ".invalid",
  ".example",
  ".onion",
] as const

const DEFAULT_MAX_BYTES = 1_048_576
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000
const DEFAULT_TOTAL_TIMEOUT_MS = 30_000
const DEFAULT_MAX_REDIRECTS = 4

export type SafeFetchErrorCode =
  | "invalid_url"
  | "unsupported_protocol"
  | "embedded_credentials"
  | "blocked_hostname"
  | "blocked_port"
  | "dns_failed"
  | "blocked_address"
  | "too_many_addresses"
  | "request_timeout"
  | "response_too_large"
  | "redirect_missing_location"
  | "redirect_limit"
  | "redirect_loop"
  | "request_failed"

export class SafeFetchError extends Error {
  constructor(
    readonly code: SafeFetchErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "SafeFetchError"
  }
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.floor(value as number)))
}

function parseIpv4(address: string): [number, number, number, number] | null {
  const parts = address.split(".")
  if (parts.length !== 4) return null
  const values = parts.map((part) => Number(part))
  if (values.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null
  return values as [number, number, number, number]
}

function isBlockedIpv4(address: string): boolean {
  const parsed = parseIpv4(address)
  if (!parsed) return true
  const [a, b, c, d] = parsed

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 ||
    (a === 255 && b === 255 && c === 255 && d === 255)
  )
}

function expandIpv6(address: string): number[] | null {
  const withoutZone = address.toLowerCase().split("%")[0]
  if (withoutZone.includes(".")) return null
  const halves = withoutZone.split("::")
  if (halves.length > 2) return null

  const left = halves[0] ? halves[0].split(":") : []
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : []
  const missing = 8 - left.length - right.length
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null

  const groups = [...left, ...new Array(halves.length === 2 ? missing : 0).fill("0"), ...right]
  if (groups.length !== 8) return null
  const values = groups.map((group) => Number.parseInt(group || "0", 16))
  if (values.some((group) => !Number.isInteger(group) || group < 0 || group > 0xffff)) return null
  return values
}

function isBlockedIpv6(address: string): boolean {
  // Embedded IPv4 forms are deliberately rejected. They create unnecessary
  // ambiguity for an auditing crawler and are a common filter-bypass surface.
  if (address.includes(".")) return true
  const groups = expandIpv6(address)
  if (!groups) return true
  const [first, second, third, fourth, fifth, sixth, seventh, eighth] = groups

  const unspecifiedOrLoopback =
    first === 0 && second === 0 && third === 0 && fourth === 0 && fifth === 0 && sixth === 0 && seventh === 0
  if (unspecifiedOrLoopback && (eighth === 0 || eighth === 1)) return true

  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 link local
  if ((first & 0xffc0) === 0xfec0) return true // fec0::/10 deprecated site local
  if ((first & 0xff00) === 0xff00) return true // ff00::/8 multicast
  if (first === 0) return true // unspecified, mapped, compatible and other special forms
  if (first === 0x100 && second === 0 && third === 0 && fourth === 0) return true // discard-only
  if (first === 0x2001 && second === 0) return true // Teredo and special-purpose 2001::/32
  if (first === 0x2001 && second === 0x0002) return true // benchmarking
  if (first === 0x2001 && second === 0x0db8) return true // documentation
  if (first === 0x2001 && (second & 0xfff0) === 0x0010) return true // ORCHIDv1
  if (first === 0x2001 && (second & 0xfff0) === 0x0020) return true // ORCHIDv2
  if (first === 0x2002) return true // 6to4 embeds an IPv4 target
  if ((first & 0xfff0) === 0x3ff0) return true // documentation 3fff::/20

  // Accept normal global-unicast space only. Blocking unknown future/special
  // ranges is safer than letting an audit become a network pivot.
  return (first & 0xe000) !== 0x2000
}

export function isBlockedIpAddress(address: string): boolean {
  const version = net.isIP(address)
  if (version === 4) return isBlockedIpv4(address)
  if (version === 6) return isBlockedIpv6(address)
  return true
}

function normaliseUrlObject(input: URL, stripQuery: boolean): URL {
  const url = new URL(input.toString())
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new SafeFetchError("unsupported_protocol", "Only public HTTP and HTTPS websites can be monitored.")
  }
  if (url.username || url.password) {
    throw new SafeFetchError("embedded_credentials", "Website URLs cannot include usernames or passwords.")
  }

  const hostname = url.hostname.replace(/\.$/, "").toLowerCase()
  if (!hostname || hostname.length > 253) {
    throw new SafeFetchError("invalid_url", "Enter a valid public website URL.")
  }

  const unbracketedHostname = hostname.replace(/^\[|\]$/g, "")
  const ipVersion = net.isIP(unbracketedHostname)
  if (
    hostname === "localhost" ||
    (!ipVersion && !hostname.includes(".")) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new SafeFetchError("blocked_hostname", "Private or internal websites cannot be monitored.")
  }
  if (ipVersion && isBlockedIpAddress(unbracketedHostname)) {
    throw new SafeFetchError("blocked_address", "Private, reserved, or internal network addresses cannot be monitored.")
  }

  const port = url.port || (url.protocol === "https:" ? "443" : "80")
  if (port !== "80" && port !== "443") {
    throw new SafeFetchError("blocked_port", "Only standard website ports 80 and 443 can be monitored.")
  }

  url.hostname = hostname
  url.hash = ""
  if (stripQuery) url.search = ""
  if (!url.pathname) url.pathname = "/"
  return url
}

export function normalizePublicWebsiteUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed.length > 2_048) {
    throw new SafeFetchError("invalid_url", "Enter a valid public website URL.")
  }

  const candidate = trimmed.startsWith("//")
    ? `https:${trimmed}`
    : /^[a-z][a-z\d+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`

  try {
    return normaliseUrlObject(new URL(candidate), true)
  } catch (error) {
    if (error instanceof SafeFetchError) throw error
    throw new SafeFetchError("invalid_url", "Enter a valid public website URL.")
  }
}

export const defaultDnsResolver: DnsResolver = async (hostname) => {
  try {
    const results = await lookup(hostname, { all: true, verbatim: true })
    return results
      .filter((entry): entry is { address: string; family: 4 | 6 } => entry.family === 4 || entry.family === 6)
      .map((entry) => ({ address: entry.address, family: entry.family }))
  } catch {
    throw new SafeFetchError("dns_failed", "The website domain could not be resolved.")
  }
}

export async function validatePublicUrl(rawUrl: string | URL, resolver: DnsResolver = defaultDnsResolver): Promise<ResolvedPublicUrl> {
  const url = typeof rawUrl === "string"
    ? normalizePublicWebsiteUrl(rawUrl)
    : normaliseUrlObject(rawUrl, false)
  const hostname = url.hostname.replace(/^\[|\]$/g, "")

  if (net.isIP(hostname)) {
    const family = net.isIP(hostname) as 4 | 6
    if (isBlockedIpAddress(hostname)) {
      throw new SafeFetchError("blocked_address", "Private, reserved, or internal network addresses cannot be monitored.")
    }
    return { url, addresses: [{ address: hostname, family }] }
  }

  let addresses: DnsAddress[]
  try {
    addresses = await resolver(hostname)
  } catch (error) {
    if (error instanceof SafeFetchError) throw error
    throw new SafeFetchError("dns_failed", "The website domain could not be resolved.")
  }
  if (addresses.length === 0) {
    throw new SafeFetchError("dns_failed", "The website domain did not return a public address.")
  }
  if (addresses.length > 16) {
    throw new SafeFetchError("too_many_addresses", "The website returned too many network addresses to validate safely.")
  }
  if (addresses.some((entry) => (entry.family !== 4 && entry.family !== 6) || isBlockedIpAddress(entry.address))) {
    throw new SafeFetchError("blocked_address", "The website resolves to a private, reserved, or internal network address.")
  }

  return { url, addresses }
}

function nodeHeaders(headers: http.IncomingHttpHeaders): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") result[key.toLowerCase()] = value
    else if (Array.isArray(value)) result[key.toLowerCase()] = value.join(", ")
  }
  return result
}

export const defaultHttpRequester: HttpRequester = (input) => {
  return new Promise<HttpResponseData>((resolve, reject) => {
    const started = Date.now()
    const transport = input.url.protocol === "https:" ? https : http
    let settled = false

    const finishReject = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    const request = transport.request(
      input.url,
      {
        method: "GET",
        headers: input.headers,
        agent: false,
        lookup: (_hostname, _options, callback) => {
          callback(null, input.resolvedAddress.address, input.resolvedAddress.family)
        },
        ...(input.url.protocol === "https:" ? { servername: input.url.hostname } : {}),
      },
      (response) => {
        const declaredLength = Number(response.headers["content-length"] || 0)
        if (Number.isFinite(declaredLength) && declaredLength > input.maxBytes) {
          response.resume()
          request.destroy()
          finishReject(new SafeFetchError("response_too_large", "The website response is too large to inspect safely."))
          return
        }

        const chunks: Buffer[] = []
        let received = 0
        response.on("data", (chunk: Buffer | string) => {
          if (settled) return
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          received += buffer.length
          if (received > input.maxBytes) {
            request.destroy()
            finishReject(new SafeFetchError("response_too_large", "The website response is too large to inspect safely."))
            return
          }
          chunks.push(buffer)
        })
        response.on("end", () => {
          if (settled) return
          settled = true
          resolve({
            statusCode: response.statusCode || 0,
            headers: nodeHeaders(response.headers),
            body: Buffer.concat(chunks),
            durationMs: Date.now() - started,
          })
        })
        response.on("error", finishReject)
      },
    )

    const onAbort = () => {
      request.destroy()
      finishReject(new SafeFetchError("request_timeout", "The website did not respond within the safe time limit."))
    }
    input.signal.addEventListener("abort", onAbort, { once: true })
    request.on("error", (error) => {
      if (input.signal.aborted) {
        finishReject(new SafeFetchError("request_timeout", "The website did not respond within the safe time limit."))
      } else {
        finishReject(new SafeFetchError("request_failed", `The website request failed (${error.name}).`))
      }
    })
    request.on("close", () => input.signal.removeEventListener("abort", onAbort))
    request.end()
  })
}

function getHeader(headers: Readonly<Record<string, string>>, name: string): string | undefined {
  return headers[name.toLowerCase()] ?? headers[name]
}

function isRedirect(statusCode: number): boolean {
  return statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308
}

export async function safeFetchUrl(
  rawUrl: string | URL,
  adapters: SafeNetworkAdapters = {},
  options: {
    maxBytes?: number
    requestTimeoutMs?: number
    totalTimeoutMs?: number
    maxRedirects?: number
    accept?: string
  } = {},
): Promise<SafeFetchResult> {
  const resolver = adapters.resolver || defaultDnsResolver
  const requester = adapters.requester || defaultHttpRequester
  const now = adapters.now || Date.now
  const maxBytes = clampInteger(options.maxBytes, DEFAULT_MAX_BYTES, 1_024, 2_097_152)
  const requestTimeoutMs = clampInteger(options.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS, 500, 15_000)
  const totalTimeoutMs = clampInteger(options.totalTimeoutMs, DEFAULT_TOTAL_TIMEOUT_MS, 1_000, 45_000)
  const maxRedirects = clampInteger(options.maxRedirects, DEFAULT_MAX_REDIRECTS, 0, 5)
  const startedAt = now()

  let current = typeof rawUrl === "string"
    ? normalizePublicWebsiteUrl(rawUrl)
    : normaliseUrlObject(rawUrl, false)
  const requestedUrl = current.toString()
  const visited = new Set<string>()
  const redirectChain: SafeFetchResult["redirectChain"] = []

  while (true) {
    if (visited.has(current.toString())) {
      throw new SafeFetchError("redirect_loop", "The website redirects in a loop.")
    }
    visited.add(current.toString())

    const elapsed = now() - startedAt
    const remaining = totalTimeoutMs - elapsed
    if (remaining <= 0) {
      throw new SafeFetchError("request_timeout", "The website did not respond within the safe time limit.")
    }

    const resolved = await validatePublicUrl(current, resolver)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.min(requestTimeoutMs, remaining))
    let response: HttpResponseData
    try {
      response = await requester({
        url: resolved.url,
        resolvedAddress: resolved.addresses[0],
        headers: {
          "User-Agent": NAMOLUX_CRAWLER_USER_AGENT,
          Accept: options.accept || "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5",
          "Accept-Encoding": "identity",
          "Accept-Language": "en;q=0.8,*;q=0.2",
          Connection: "close",
        },
        signal: controller.signal,
        maxBytes,
      })
    } catch (error) {
      if (controller.signal.aborted && !(error instanceof SafeFetchError)) {
        throw new SafeFetchError("request_timeout", "The website did not respond within the safe time limit.")
      }
      throw error
    } finally {
      clearTimeout(timer)
    }

    if (response.body.byteLength > maxBytes) {
      throw new SafeFetchError("response_too_large", "The website response is too large to inspect safely.")
    }

    if (!isRedirect(response.statusCode)) {
      const body = response.body instanceof Uint8Array ? response.body : new Uint8Array(response.body)
      return {
        requestedUrl,
        finalUrl: current.toString(),
        statusCode: response.statusCode,
        headers: response.headers,
        body,
        text: new TextDecoder("utf-8", { fatal: false }).decode(body),
        durationMs: now() - startedAt,
        redirectChain,
      }
    }

    const location = getHeader(response.headers, "location")
    if (!location) {
      throw new SafeFetchError("redirect_missing_location", "The website returned a redirect without a destination.")
    }
    if (redirectChain.length >= maxRedirects) {
      throw new SafeFetchError("redirect_limit", "The website uses too many redirects.")
    }

    let next: URL
    try {
      next = normaliseUrlObject(new URL(location, current), false)
    } catch (error) {
      if (error instanceof SafeFetchError) throw error
      throw new SafeFetchError("invalid_url", "The website redirected to an invalid URL.")
    }
    redirectChain.push({ from: current.toString(), to: next.toString(), statusCode: response.statusCode })
    current = next
  }
}
