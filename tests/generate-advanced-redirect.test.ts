import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

import GenerateAdvancedPage from "@/app/generate/advanced/page"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT")
  })
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

  it("keeps public legacy links inside the signed-in Name Sprint journey", async () => {
    await expect(GenerateAdvancedPage({
      searchParams: Promise.resolve({ q: "Private healthcare for rural communities" }),
    })).rejects.toThrow("NEXT_REDIRECT")

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/generate?mode=advanced&q=Private+healthcare+for+rural+communities",
    )
  })
})
