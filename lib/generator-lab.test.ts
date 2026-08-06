import { describe, expect, it } from "vitest"

import {
  getGeneratorLabApiBlockResponse,
  getGeneratorLabHost,
  isGeneratorLabApiPath,
  isGeneratorLabEnabled,
  isGeneratorLabNoIndex,
  isGeneratorLabPagePath,
  isGeneratorLabRequestAllowed,
} from "@/lib/generator-lab"

describe("generator lab isolation", () => {
  it("requires an explicit lab flag instead of opening local or preview deployments by default", () => {
    expect(isGeneratorLabEnabled({})).toBe(false)
    expect(isGeneratorLabEnabled({ VERCEL_ENV: "development" })).toBe(false)
    expect(isGeneratorLabEnabled({ VERCEL_ENV: "preview" })).toBe(false)
    expect(isGeneratorLabEnabled({ NAMOLUX_ENABLE_GENERATOR_LAB: "true" })).toBe(true)
  })

  it("requires the configured lab host even when the flag is enabled", () => {
    const environment = {
      VERCEL_ENV: "production",
      NAMOLUX_ENABLE_GENERATOR_LAB: "true",
    }

    expect(getGeneratorLabHost(environment)).toBe("lab.namolux.com")
    expect(isGeneratorLabRequestAllowed("lab.namolux.com", environment)).toBe(true)
    expect(isGeneratorLabRequestAllowed("lab.namolux.com:443", environment)).toBe(true)
    expect(isGeneratorLabRequestAllowed("www.namolux.com", environment)).toBe(false)
    expect(isGeneratorLabRequestAllowed("domainsnipe-test.vercel.app", environment)).toBe(false)
    expect(isGeneratorLabNoIndex(environment)).toBe(true)
  })

  it("fails closed inside route handlers unless the request is the enabled lab host", () => {
    const blocked = getGeneratorLabApiBlockResponse(
      new Request("https://www.namolux.com/api/quick-generate", {
        headers: { host: "www.namolux.com" },
      }),
      { VERCEL_ENV: "preview" },
    )
    expect(blocked?.status).toBe(404)
    expect(blocked?.headers.get("x-namolux-surface")).toBe("generator-lab-disabled")

    const allowed = getGeneratorLabApiBlockResponse(
      new Request("https://lab.namolux.com/api/quick-generate", {
        headers: { host: "lab.namolux.com" },
      }),
      {
        VERCEL_ENV: "production",
        NAMOLUX_ENABLE_GENERATOR_LAB: "true",
      },
    )
    expect(allowed).toBeNull()
  })

  it("classifies only generator pages and APIs as lab surfaces", () => {
    expect(isGeneratorLabPagePath("/generate")).toBe(true)
    expect(isGeneratorLabPagePath("/generate/advanced/")).toBe(true)
    expect(isGeneratorLabPagePath("/preview-gen")).toBe(true)
    expect(isGeneratorLabPagePath("/bulk-domain-check/workspace")).toBe(false)

    expect(isGeneratorLabApiPath("/api/quick-generate")).toBe(true)
    expect(isGeneratorLabApiPath("/api/generate-domains/")).toBe(true)
    expect(isGeneratorLabApiPath("/api/brand-palette")).toBe(true)
    expect(isGeneratorLabApiPath("/api/check-socials")).toBe(true)
    expect(isGeneratorLabApiPath("/api/check-domain")).toBe(true)
    expect(isGeneratorLabApiPath("/api/founder-signal/batch")).toBe(true)
    expect(isGeneratorLabApiPath("/api/founder-signal/shortlist")).toBe(false)
  })
})
