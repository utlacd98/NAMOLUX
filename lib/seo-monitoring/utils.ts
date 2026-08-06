import { createHash } from "node:crypto"
import type { SeoSeverity } from "./types"

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export function uniqueStrings(values: readonly string[], limit = Number.POSITIVE_INFINITY): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
    if (result.length >= limit) break
  }
  return result
}

export function severityRank(severity: SeoSeverity): number {
  if (severity === "critical") return 4
  if (severity === "high") return 3
  if (severity === "medium") return 2
  return 1
}

export function normaliseEvidenceUrl(value: string): string {
  try {
    const url = new URL(value)
    url.hash = ""
    url.search = ""
    url.hostname = url.hostname.toLowerCase().replace(/\.$/, "")
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "") || "/"
    return url.toString()
  } catch {
    return value.trim().toLowerCase().slice(0, 2_048)
  }
}

export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let cursor = 0
  const workerCount = Math.min(values.length, Math.max(1, Math.floor(concurrency)))
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(values[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

export function boundedText(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength)
}
