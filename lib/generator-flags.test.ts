import { afterEach, describe, expect, it } from "vitest"

import { isGeneratorRedesignEnabled, isQuickAutoEmergencyHoldEnabled } from "@/lib/generator-flags"

const originalValue = process.env.GENERATOR_REDESIGN_V2
const originalEmergencyHold = process.env.QUICK_GENERATE_EMERGENCY_HOLD

afterEach(() => {
  if (originalValue === undefined) delete process.env.GENERATOR_REDESIGN_V2
  else process.env.GENERATOR_REDESIGN_V2 = originalValue
  if (originalEmergencyHold === undefined) delete process.env.QUICK_GENERATE_EMERGENCY_HOLD
  else process.env.QUICK_GENERATE_EMERGENCY_HOLD = originalEmergencyHold
})

describe("generator redesign feature flag", () => {
  it("is disabled when the deployment has not opted in", () => {
    delete process.env.GENERATOR_REDESIGN_V2
    expect(isGeneratorRedesignEnabled()).toBe(false)
  })

  it("accepts an explicit, case-insensitive true value", () => {
    process.env.GENERATOR_REDESIGN_V2 = " TRUE "
    expect(isGeneratorRedesignEnabled()).toBe(true)
  })

  it("does not treat other truthy-looking values as enabled", () => {
    process.env.GENERATOR_REDESIGN_V2 = "1"
    expect(isGeneratorRedesignEnabled()).toBe(false)
  })

  it("keeps the emergency quality hold off unless explicitly enabled", () => {
    delete process.env.QUICK_GENERATE_EMERGENCY_HOLD
    expect(isQuickAutoEmergencyHoldEnabled()).toBe(false)

    process.env.QUICK_GENERATE_EMERGENCY_HOLD = "true"
    expect(isQuickAutoEmergencyHoldEnabled()).toBe(true)
  })
})
