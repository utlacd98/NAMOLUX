import type { PageSpeedProvider, SeoPerformanceMeasurements } from "./types"
import { boundedText, uniqueStrings } from "./utils"

type UnknownRecord = Record<string, unknown>

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {}
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function nestedNumber(value: unknown, path: readonly string[]): number | null {
  let current: unknown = value
  for (const key of path) current = record(current)[key]
  return finiteNumber(current)
}

function fieldMetric(payload: unknown, metric: string): number | null {
  return nestedNumber(payload, ["loadingExperience", "metrics", metric, "percentile"])
}

function auditMetric(payload: unknown, audit: string): number | null {
  return nestedNumber(payload, ["lighthouseResult", "audits", audit, "numericValue"])
}

function parseMeasurements(payload: unknown): SeoPerformanceMeasurements {
  const categoryScore = nestedNumber(payload, ["lighthouseResult", "categories", "performance", "score"])
  if (categoryScore === null) throw new Error("PageSpeed did not return a performance score.")

  const audits = record(record(record(payload).lighthouseResult).audits)
  const opportunities = uniqueStrings(
    Object.values(audits)
      .map(record)
      .filter((audit) => record(audit.details).type === "opportunity" && (finiteNumber(audit.score) ?? 1) < 0.9)
      .sort((left, right) => (finiteNumber(right.numericValue) || 0) - (finiteNumber(left.numericValue) || 0))
      .map((audit) => boundedText(audit.title, 180)),
    5,
  )

  const fieldCls = fieldMetric(payload, "CUMULATIVE_LAYOUT_SHIFT_SCORE")
  return {
    score: Math.max(0, Math.min(100, Math.round(categoryScore * 100))),
    largestContentfulPaintMs: fieldMetric(payload, "LARGEST_CONTENTFUL_PAINT_MS") ?? auditMetric(payload, "largest-contentful-paint"),
    interactionToNextPaintMs: fieldMetric(payload, "INTERACTION_TO_NEXT_PAINT") ?? auditMetric(payload, "interaction-to-next-paint"),
    cumulativeLayoutShift: fieldCls === null
      ? auditMetric(payload, "cumulative-layout-shift")
      : fieldCls / 100,
    firstContentfulPaintMs: fieldMetric(payload, "FIRST_CONTENTFUL_PAINT_MS") ?? auditMetric(payload, "first-contentful-paint"),
    opportunities,
  }
}

export function createGooglePageSpeedProvider(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): PageSpeedProvider {
  const key = apiKey.trim()
  if (!key) throw new Error("A PageSpeed API key is required.")

  const measureStrategy = async (url: string, strategy: "mobile" | "desktop") => {
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed")
    endpoint.searchParams.set("url", url)
    endpoint.searchParams.set("strategy", strategy)
    endpoint.searchParams.set("category", "performance")
    endpoint.searchParams.set("key", key)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    try {
      const response = await fetchImpl(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`PageSpeed request failed with status ${response.status}.`)
      return parseMeasurements(await response.json())
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    name: "google_pagespeed_v5",
    async measure(url) {
      const measuredAt = new Date().toISOString()
      const [mobile, desktop] = await Promise.all([
        measureStrategy(url, "mobile"),
        measureStrategy(url, "desktop"),
      ])
      return { provider: "google_pagespeed_v5", measuredAt, mobile, desktop }
    },
  }
}
