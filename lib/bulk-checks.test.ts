import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { BULK_CHECK_TLDS, isBulkCheckClaimDeferred, parseBulkCheckInput } from "@/lib/bulk-checks"

describe("bulk check input contract", () => {
  it("accepts the advertised 50 names across all six extensions (300 checks)", () => {
    const names = Array.from({ length: 50 }, (_, index) => `candidate-${index + 1}`)
    const input = parseBulkCheckInput({ names, tlds: [...BULK_CHECK_TLDS] })

    expect(input.names).toHaveLength(50)
    expect(input.tlds).toEqual(BULK_CHECK_TLDS)
    expect(input.names.length * input.tlds.length).toBe(300)
  })

  it("rejects batches above 50 names and invalid labels or extensions", () => {
    expect(() => parseBulkCheckInput({
      names: Array.from({ length: 51 }, (_, index) => `candidate-${index}`),
    })).toThrow(/between 1 and 50/i)
    expect(() => parseBulkCheckInput({ names: ["not a domain"] })).toThrow(/domain label/i)
    expect(() => parseBulkCheckInput({ names: ["valid"], tlds: ["xyz"] })).toThrow(/only \.com/i)
  })

  it("keeps the supported extension order deterministic for cache and job fingerprints", () => {
    const input = parseBulkCheckInput({ names: ["vaulten"], tlds: ["dev", "com", "ai"] })
    expect(input.tlds).toEqual(["com", "ai", "dev"])
  })

  it("keeps a duplicate queue delivery alive until a leased job can be reclaimed", () => {
    expect(isBulkCheckClaimDeferred("global_capacity")).toBe(true)
    expect(isBulkCheckClaimDeferred("account_capacity")).toBe(true)
    expect(isBulkCheckClaimDeferred("already_processing")).toBe(true)
    expect(isBulkCheckClaimDeferred("terminal")).toBe(false)
    expect(isBulkCheckClaimDeferred("not_found")).toBe(false)
  })
})
