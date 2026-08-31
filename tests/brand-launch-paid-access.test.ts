import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const plans = readFileSync("lib/plans.ts", "utf8")
const service = readFileSync("lib/brand-launch.ts", "utf8")
const page = readFileSync("app/brand-launch/page.tsx", "utf8")

describe("Brand Launch paid boundary", () => {
  it("does not advertise Brand Launch entitlement to Free", () => {
    expect(plans).toMatch(/free:[\s\S]*?canUseBrandPalette: false/)
  })

  it("fails closed in the server service and page", () => {
    expect(service).toContain('throw new BrandLaunchError("upgrade_required"')
    expect(service).toContain('if (subject.plan !== "pro")')
    expect(page).toContain('if (!entitlements.isPro) redirect("/pricing?source=brand-launch")')
  })
})
