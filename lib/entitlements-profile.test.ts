import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
    }),
  }),
}))

import { getUserEntitlements } from "@/lib/entitlements"

describe("getUserEntitlements advertising safety", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    mocks.maybeSingle.mockReset()
  })

  it("treats an authenticated account with no profile as ad-ineligible", async () => {
    vi.stubEnv("ADS_ENABLED", "true")
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(getUserEntitlements("user_without_profile")).resolves.toMatchObject({
      plan: "free",
      isPro: false,
      showAds: false,
    })
  })
})
