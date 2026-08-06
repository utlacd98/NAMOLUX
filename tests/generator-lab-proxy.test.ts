import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

import { proxy } from "@/proxy"
import { updateSession } from "@/lib/supabase/middleware"

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async () => ({ claims: null, supabaseResponse: NextResponse.next() })),
  preserveSupabaseSessionResponse: vi.fn((_source, response) => response),
}))

const mockUpdateSession = vi.mocked(updateSession)
const originalVercelEnv = process.env.VERCEL_ENV
const originalLabEnabled = process.env.NAMOLUX_ENABLE_GENERATOR_LAB
const originalLabHost = process.env.NAMOLUX_GENERATOR_LAB_HOST

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.NAMOLUX_ENABLE_GENERATOR_LAB
  delete process.env.NAMOLUX_GENERATOR_LAB_HOST
})

afterEach(() => {
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV
  else process.env.VERCEL_ENV = originalVercelEnv
  if (originalLabEnabled === undefined) delete process.env.NAMOLUX_ENABLE_GENERATOR_LAB
  else process.env.NAMOLUX_ENABLE_GENERATOR_LAB = originalLabEnabled
  if (originalLabHost === undefined) delete process.env.NAMOLUX_GENERATOR_LAB_HOST
  else process.env.NAMOLUX_GENERATOR_LAB_HOST = originalLabHost
})

describe("production generator lab routing", () => {
  it("returns a non-cacheable 404 for placeholder article slugs before auth work", async () => {
    process.env.VERCEL_ENV = "production"
    const response = await proxy(new NextRequest("https://www.namolux.com/blog/null"))

    expect(response.status).toBe(404)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(mockUpdateSession).not.toHaveBeenCalled()
  })

  it("marks Vercel-hosted production URLs noindex without redirecting them", async () => {
    process.env.VERCEL_ENV = "production"
    const response = await proxy(new NextRequest("https://namolux-preview.vercel.app/blog"))

    expect(response.status).toBe(200)
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(response.headers.get("link")).toBe('<https://www.namolux.com/blog>; rel="canonical"')
  })

  it.each(["/generate", "/generate/advanced", "/preview-gen"])(
    "redirects %s to the public bulk product",
    async (pathname) => {
      process.env.VERCEL_ENV = "production"
      const response = await proxy(new NextRequest(`https://www.namolux.com${pathname}`))

      expect(response.status).toBe(308)
      expect(response.headers.get("location")).toBe("https://www.namolux.com/bulk-domain-check")
      expect(mockUpdateSession).not.toHaveBeenCalled()
    },
  )

  it.each([
    "/api/ai-name-chat",
    "/api/analyze-description",
    "/api/brand-palette",
    "/api/check-socials",
    "/api/deep-search",
    "/api/generate-domains",
    "/api/name-tools",
    "/api/quick-generate",
  ])(
    "returns a hard 404 for %s in production",
    async (pathname) => {
      process.env.VERCEL_ENV = "production"
      const response = await proxy(new NextRequest(`https://www.namolux.com${pathname}`, { method: "POST" }))

      expect(response.status).toBe(404)
      expect(response.headers.get("x-namolux-surface")).toBe("generator-lab-disabled")
      expect(response.headers.get("cache-control")).toContain("no-store")
      expect(mockUpdateSession).not.toHaveBeenCalled()
    },
  )

  it("keeps the enabled generator lab available only on its exact configured host", async () => {
    process.env.VERCEL_ENV = "production"
    process.env.NAMOLUX_ENABLE_GENERATOR_LAB = "true"
    process.env.NAMOLUX_GENERATOR_LAB_HOST = "lab.namolux.com"
    const response = await proxy(new NextRequest("https://lab.namolux.com/generate"))

    expect(response.status).toBe(200)
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(mockUpdateSession).toHaveBeenCalledOnce()
  })

  it.each([
    { environment: "production", hostname: "www.namolux.com" },
    { environment: "preview", hostname: "domainsnipe-test.vercel.app" },
  ])("keeps $hostname closed even if the lab flag is enabled", async ({ environment, hostname }) => {
    process.env.VERCEL_ENV = environment
    process.env.NAMOLUX_ENABLE_GENERATOR_LAB = "true"
    process.env.NAMOLUX_GENERATOR_LAB_HOST = "lab.namolux.com"
    const response = await proxy(new NextRequest(`https://${hostname}/generate`))

    expect(response.status).toBe(308)
    expect(mockUpdateSession).not.toHaveBeenCalled()
  })
})
