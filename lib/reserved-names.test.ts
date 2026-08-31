import { describe, expect, it } from "vitest"

import {
  getSystemReservedNameKey,
  isSystemReservedName,
  SYSTEM_RESERVED_NAME_CODE,
  SYSTEM_RESERVED_NAME_MESSAGE,
} from "@/lib/reserved-names"

describe("system-reserved names", () => {
  it.each([
    "NamoLux",
    "namo lux",
    "NAMOLUX",
    "namo-lux",
    "namo_lux",
    "namolux.com",
    "Namo-Lux.COM",
    "https://www.namolux.com/path?source=test",
    "namolux.co.uk",
    "namo.lux",
  ])("normalises %s to the NamoLux reservation", (value) => {
    expect(isSystemReservedName(value)).toBe(true)
    expect(getSystemReservedNameKey(value)).toBe("namolux")
  })

  it.each(["namoluxe", "namoluxury", "namo", "lux", "example.com", "namolux.example.com"])(
    "does not over-match %s",
    (value) => expect(isSystemReservedName(value)).toBe(false),
  )

  it("uses an internal product-rule response without making a legal claim", () => {
    expect(SYSTEM_RESERVED_NAME_CODE).toBe("system_reserved_name")
    expect(SYSTEM_RESERVED_NAME_MESSAGE).toBe("NamoLux is a reserved platform name and can't be analysed as a candidate.")
    expect(SYSTEM_RESERVED_NAME_MESSAGE).not.toMatch(/trademark|owned by|protected/i)
  })
})
