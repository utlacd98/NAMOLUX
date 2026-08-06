import { describe, expect, it } from "vitest"
import { parseLabBrief } from "@/lib/lab-name-generator"

describe("lab name-generator brief validation", () => {
  const valid = { what: "A bookkeeping platform for independent studios", audience: "UK freelancers", tone: "trustworthy", direction: "evocative", include: ["calm"], exclude: ["tax"], maxLength: 10 }
  it("accepts the complete five-step brief", () => expect(parseLabBrief(valid)).toMatchObject({ tone: "trustworthy", direction: "evocative", maxLength: 10 }))
  it("rejects an incomplete, oversized, or invalid brief", () => {
    expect(parseLabBrief({ ...valid, what: "short" })).toBeNull()
    expect(parseLabBrief({ ...valid, tone: "loud" })).toBeNull()
    expect(parseLabBrief({ ...valid, maxLength: 20 })).toBeNull()
  })
  it("normalizes local-only constraint terms", () => expect(parseLabBrief({ ...valid, include: ["Calm!", 3], exclude: ["Tax advice"] })?.include).toEqual(["calm"]))
})
