import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  permanentRedirect: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("next/headers", () => ({ headers: mocks.headers }))
vi.mock("next/navigation", () => ({
  permanentRedirect: mocks.permanentRedirect,
  redirect: mocks.redirect,
}))

import GenerateAdvancedPage from "@/app/generate/advanced/page"

const originalLabEnabled = process.env.NAMOLUX_ENABLE_GENERATOR_LAB
const originalLabHost = process.env.NAMOLUX_GENERATOR_LAB_HOST

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NAMOLUX_ENABLE_GENERATOR_LAB = "true"
  process.env.NAMOLUX_GENERATOR_LAB_HOST = "lab.namolux.com"
  mocks.headers.mockResolvedValue(new Headers({ host: "lab.namolux.com" }))
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT")
  })
  mocks.permanentRedirect.mockImplementation(() => {
    throw new Error("NEXT_PERMANENT_REDIRECT")
  })
})

afterEach(() => {
  if (originalLabEnabled === undefined) delete process.env.NAMOLUX_ENABLE_GENERATOR_LAB
  else process.env.NAMOLUX_ENABLE_GENERATOR_LAB = originalLabEnabled
  if (originalLabHost === undefined) delete process.env.NAMOLUX_GENERATOR_LAB_HOST
  else process.env.NAMOLUX_GENERATOR_LAB_HOST = originalLabHost
})

describe("legacy Advanced generator redirect", () => {
  it("preserves the safe brief and attributed journey in Advanced mode", async () => {
    await expect(GenerateAdvancedPage({
      searchParams: Promise.resolve({
        q: "Private healthcare for rural communities",
        source: "guide",
        content: "healthcare-naming-guide",
      }),
    })).rejects.toThrow("NEXT_REDIRECT")

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/generate?mode=advanced&q=Private+healthcare+for+rural+communities&source=guide&content=healthcare-naming-guide",
    )
  })

  it("drops invalid attribution values instead of reflecting them", async () => {
    await expect(GenerateAdvancedPage({
      searchParams: Promise.resolve({
        q: "  A useful brief  ",
        source: "unknown",
        content: "../unsafe",
      }),
    })).rejects.toThrow("NEXT_REDIRECT")

    expect(mocks.redirect).toHaveBeenCalledWith("/generate?mode=advanced&q=A+useful+brief")
  })

  it("permanently returns public-host requests to Bulk Check before reading the brief", async () => {
    mocks.headers.mockResolvedValue(new Headers({ host: "www.namolux.com" }))

    await expect(GenerateAdvancedPage({
      searchParams: Promise.resolve({ q: "Private healthcare for rural communities" }),
    })).rejects.toThrow("NEXT_PERMANENT_REDIRECT")

    expect(mocks.permanentRedirect).toHaveBeenCalledWith("/bulk-domain-check")
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
