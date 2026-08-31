import { afterEach, describe, expect, it } from "vitest"
import { getAgentReleaseFlags, getScoutReleaseState, isAutonomousScoutEnabled } from "./agent-release-flags"

const original = { ...process.env }
afterEach(() => { process.env = { ...original } })

describe("agent release flags", () => {
  it("keeps Scout fail-closed when only the product flag is enabled", () => {
    process.env.NAMOLUX_AUTONOMOUS_SCOUT_ENABLED = "true"
    delete process.env.NAMOLUX_SCOUT_QUALITY_GATE_PASSED
    expect(isAutonomousScoutEnabled()).toBe(false)
    expect(getAgentReleaseFlags().scoutConfigured).toBe(true)
  })

  it("requires both Scout flags", () => {
    process.env.NAMOLUX_AUTONOMOUS_SCOUT_ENABLED = "true"
    process.env.NAMOLUX_SCOUT_QUALITY_GATE_PASSED = "true"
    expect(isAutonomousScoutEnabled()).toBe(true)
  })

  it("allows only an explicit internal tester in Vercel Preview while the quality gate is closed", () => {
    process.env.NAMOLUX_AUTONOMOUS_SCOUT_ENABLED = "true"
    process.env.VERCEL_ENV = "preview"
    process.env.NAMOLUX_SCOUT_INTERNAL_TESTER_EMAILS = "founder@example.com"
    delete process.env.NAMOLUX_SCOUT_QUALITY_GATE_PASSED

    expect(getScoutReleaseState("founder@example.com").enabled).toBe(true)
    expect(getScoutReleaseState("other@example.com").enabled).toBe(false)
    expect(getScoutReleaseState("founder@example.com").qualityGatePassed).toBe(false)
  })

  it("never permits the internal tester bypass outside Preview", () => {
    process.env.NAMOLUX_AUTONOMOUS_SCOUT_ENABLED = "true"
    process.env.VERCEL_ENV = "production"
    process.env.NAMOLUX_SCOUT_INTERNAL_TESTER_EMAILS = "founder@example.com"

    expect(getScoutReleaseState("founder@example.com").enabled).toBe(false)
  })

  it("keeps Scout unavailable in production even if both old flags are present", () => {
    process.env.NAMOLUX_AUTONOMOUS_SCOUT_ENABLED = "true"
    process.env.NAMOLUX_SCOUT_QUALITY_GATE_PASSED = "true"
    process.env.VERCEL_ENV = "production"

    expect(isAutonomousScoutEnabled()).toBe(false)
    expect(getScoutReleaseState().enabled).toBe(false)
  })
})
