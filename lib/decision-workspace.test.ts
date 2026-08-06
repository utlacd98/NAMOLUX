import { describe, expect, it } from "vitest"

import { isDecisionWorkspaceEnabled } from "@/lib/decision-workspace"

describe("decision workspace rollout flag", () => {
  it("defaults to enabled and only pauses on an explicit false value", () => {
    expect(isDecisionWorkspaceEnabled({})).toBe(true)
    expect(isDecisionWorkspaceEnabled({ NAMOLUX_DECISION_WORKSPACE_ENABLED: "true" })).toBe(true)
    expect(isDecisionWorkspaceEnabled({ NAMOLUX_DECISION_WORKSPACE_ENABLED: " FALSE " })).toBe(false)
  })
})
