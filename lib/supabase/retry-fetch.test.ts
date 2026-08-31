import { describe, expect, it, vi } from "vitest"
import { createSupabaseRetryFetch } from "@/lib/supabase/retry-fetch"

describe("createSupabaseRetryFetch", () => {
  it("retries one exact PostgREST clock-skew rejection", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ code: "PGRST303", message: "JWT issued at future" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
    const delay = vi.fn(async () => undefined)
    const retryFetch = createSupabaseRetryFetch({ fetchImpl, delay, retryDelayMs: 25 })

    const response = await retryFetch("https://example.supabase.co/rest/v1/items")

    expect(response.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(delay).toHaveBeenCalledWith(25)
  })

  it("does not retry unrelated authentication failures", async () => {
    const response = Response.json({ code: "PGRST301", message: "Invalid JWT" }, { status: 401 })
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response)
    const retryFetch = createSupabaseRetryFetch({ fetchImpl, delay: vi.fn(async () => undefined) })

    expect(await retryFetch("https://example.supabase.co/rest/v1/items")).toBe(response)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("stops after one retry when the skew persists", async () => {
    const first = Response.json({ code: "PGRST303", message: "JWT issued at future" }, { status: 401 })
    const second = Response.json({ code: "PGRST303", message: "JWT issued at future" }, { status: 401 })
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const retryFetch = createSupabaseRetryFetch({ fetchImpl, delay: vi.fn(async () => undefined) })

    expect(await retryFetch("https://example.supabase.co/rest/v1/items")).toBe(second)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
