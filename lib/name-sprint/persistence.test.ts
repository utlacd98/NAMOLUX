import { describe, expect, it } from "vitest"

import { summarizeRecentNameSprintFatigue } from "./persistence"

describe("Name Sprint history fatigue", () => {
  it("remembers every recent name but counts roots only from displayed candidates", () => {
    const result = summarizeRecentNameSprintFatigue([
      { normalized_name: "hiddenone", roots: ["grain", "signal"], was_displayed: false },
      { normalized_name: "shownone", roots: ["grain", "folio"], was_displayed: true },
      { normalized_name: "showntwo", roots: ["Grain", "grain", "mark"], was_displayed: true },
    ])

    expect(result.previouslySeen).toEqual(["hiddenone", "shownone", "showntwo"])
    expect(result.recentRootFrequency).toEqual({ grain: 2, folio: 1, mark: 1 })
    expect(result.recentRootFrequency.signal).toBeUndefined()
  })
})
