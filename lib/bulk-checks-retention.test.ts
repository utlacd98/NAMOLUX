import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: mocks.from }),
}))

import { BULK_CHECK_ANONYMOUS_RETENTION_MS, pruneExpiredBulkCheckStorage } from "@/lib/bulk-checks"

function deleteQuery(result: { error: { message: string } | null }) {
  const lt = vi.fn().mockResolvedValue(result)
  const eq = vi.fn().mockReturnValue({ lt })
  const remove = vi.fn().mockReturnValue({ eq, lt })
  return { remove, eq, lt }
}

describe("bulk check transient retention", () => {
  it("keeps anonymous capability results bounded to a normal browser session", () => {
    expect(BULK_CHECK_ANONYMOUS_RETENTION_MS).toBe(2 * 60 * 60 * 1_000)
  })

  it("prunes expired anonymous jobs and cache rows without letting cleanup failures block access expiry", async () => {
    const jobQuery = deleteQuery({ error: null })
    const cacheQuery = deleteQuery({ error: { message: "temporary cache cleanup failure" } })
    mocks.from.mockImplementation((table: string) => {
      if (table === "bulk_check_jobs") return { delete: jobQuery.remove }
      if (table === "domain_availability_cache") return { delete: cacheQuery.remove }
      throw new Error("Unexpected table: " + table)
    })

    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const now = new Date("2026-08-01T10:00:00.000Z")

    await expect(pruneExpiredBulkCheckStorage(now)).resolves.toBeUndefined()

    expect(jobQuery.eq).toHaveBeenCalledWith("subject_type", "anonymous")
    expect(jobQuery.lt).toHaveBeenCalledWith("expires_at", now.toISOString())
    expect(cacheQuery.lt).toHaveBeenCalledWith("expires_at", now.toISOString())
    expect(warning).toHaveBeenCalledOnce()
    warning.mockRestore()
  })
})
