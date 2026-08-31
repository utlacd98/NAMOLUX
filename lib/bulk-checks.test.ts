import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { BULK_CHECK_TLDS, BulkCheckInputError, isBulkCheckClaimDeferred, parseBulkCheckInput } from "@/lib/bulk-checks"
import { SYSTEM_RESERVED_NAME_MESSAGE } from "@/lib/reserved-names"

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

  it.each(["NamoLux", "namo lux", "namo-lux", "namolux.com"])("rejects the reserved platform identity %s", (name) => {
    try {
      parseBulkCheckInput({ names: [name] })
      throw new Error("Expected the reserved name to be rejected")
    } catch (error) {
      expect(error).toBeInstanceOf(BulkCheckInputError)
      expect(error).toMatchObject({ code: "system_reserved_name", message: SYSTEM_RESERVED_NAME_MESSAGE })
    }
  })

  it("keeps a duplicate queue delivery alive until a leased job can be reclaimed", () => {
    expect(isBulkCheckClaimDeferred("global_capacity")).toBe(true)
    expect(isBulkCheckClaimDeferred("account_capacity")).toBe(true)
    expect(isBulkCheckClaimDeferred("already_processing")).toBe(true)
    expect(isBulkCheckClaimDeferred("terminal")).toBe(false)
    expect(isBulkCheckClaimDeferred("not_found")).toBe(false)
  })
})
