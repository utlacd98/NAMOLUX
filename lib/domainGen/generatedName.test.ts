import { describe, expect, it } from "vitest"
import { createGeneratedNameId } from "@/lib/domainGen/generatedName"

describe("createGeneratedNameId", () => {
  it("is stable for the same spelling and generation rank", () => {
    expect(createGeneratedNameId("Mosaic", 1)).toBe(createGeneratedNameId("mosaic", 1))
    expect(createGeneratedNameId("mosaic", 1)).toMatch(/^name_[a-z0-9]+$/)
  })

  it("binds the id to its original generation rank", () => {
    expect(createGeneratedNameId("mosaic", 1)).not.toBe(createGeneratedNameId("mosaic", 2))
  })
})
