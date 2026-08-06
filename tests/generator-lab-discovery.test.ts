import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockHeaders = vi.hoisted(() => vi.fn())
vi.mock("next/headers", () => ({ headers: mockHeaders }))

import robots from "@/app/robots"
import sitemap from "@/app/sitemap"

const originalVercelEnv = process.env.VERCEL_ENV
const originalLabEnabled = process.env.NAMOLUX_ENABLE_GENERATOR_LAB

afterEach(() => {
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV
  else process.env.VERCEL_ENV = originalVercelEnv
  if (originalLabEnabled === undefined) delete process.env.NAMOLUX_ENABLE_GENERATOR_LAB
  else process.env.NAMOLUX_ENABLE_GENERATOR_LAB = originalLabEnabled
})

beforeEach(() => {
  mockHeaders.mockResolvedValue(new Headers({ host: "www.namolux.com" }))
})

describe("generator lab discovery controls", () => {
  it("keeps a production-like lab deployment noindex and sitemap-free", async () => {
    process.env.VERCEL_ENV = "production"
    process.env.NAMOLUX_ENABLE_GENERATOR_LAB = "true"
    mockHeaders.mockResolvedValue(new Headers({ host: "lab.namolux.com" }))

    await expect(robots()).resolves.toEqual({
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    })
    await expect(sitemap()).resolves.toEqual([])
  })

  it("keeps the production custom domain crawlable even when lab configuration exists", async () => {
    process.env.VERCEL_ENV = "production"
    process.env.NAMOLUX_ENABLE_GENERATOR_LAB = "true"
    mockHeaders.mockResolvedValue(new Headers({ host: "www.namolux.com" }))

    await expect(robots()).resolves.toMatchObject({ sitemap: "https://www.namolux.com/sitemap.xml" })
    await expect(sitemap()).resolves.not.toEqual([])
  })
})
