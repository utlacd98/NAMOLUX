import { describe, expect, it } from "vitest"
import { createGooglePageSpeedProvider } from "./performance"

describe("optional PageSpeed provider", () => {
  it("maps measured provider data and opportunities without inventing missing metrics", async () => {
    const requested: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      requested.push(String(input))
      return new Response(JSON.stringify({
        lighthouseResult: {
          categories: { performance: { score: 0.87 } },
          audits: {
            "largest-contentful-paint": { numericValue: 2_800, score: 0.7, title: "Largest Contentful Paint" },
            "first-contentful-paint": { numericValue: 1_200, score: 0.9, title: "First Contentful Paint" },
            "cumulative-layout-shift": { numericValue: 0.08, score: 0.95, title: "Cumulative Layout Shift" },
            "unused-javascript": {
              numericValue: 600,
              score: 0.4,
              title: "Reduce unused JavaScript",
              details: { type: "opportunity" },
            },
          },
        },
        loadingExperience: {
          metrics: {
            LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2_600 },
            CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 7 },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } })
    }

    const result = await createGooglePageSpeedProvider("test-key", fetchImpl).measure("https://measured-site.com/")
    expect(requested).toHaveLength(2)
    expect(requested.some((url) => url.includes("strategy=mobile"))).toBe(true)
    expect(requested.some((url) => url.includes("strategy=desktop"))).toBe(true)
    expect(result.mobile).toMatchObject({
      score: 87,
      largestContentfulPaintMs: 2_600,
      cumulativeLayoutShift: 0.07,
      interactionToNextPaintMs: null,
      opportunities: ["Reduce unused JavaScript"],
    })
  })
})
