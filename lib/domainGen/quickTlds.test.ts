import { describe, expect, it } from "vitest"
import { buildQuickGenerateDomains, QUICK_GENERATE_TLDS } from "@/lib/domainGen/quickTlds"

describe("quickTlds", () => {
  it("checks more than just .com for Quick Generate", () => {
    expect(QUICK_GENERATE_TLDS).toContain("com")
    expect(QUICK_GENERATE_TLDS.length).toBeGreaterThan(1)
    expect(QUICK_GENERATE_TLDS).toEqual(["com", "io", "ai", "app", "co", "dev"])
  })

  it("builds one domain per supported TLD for each unique name", () => {
    const domains = buildQuickGenerateDomains(["BrandOne", "brandone", "clean-app"])

    expect(domains).toHaveLength(QUICK_GENERATE_TLDS.length * 2)
    expect(domains.map((item) => item.fullDomain)).toEqual([
      "brandone.com",
      "brandone.io",
      "brandone.ai",
      "brandone.app",
      "brandone.co",
      "brandone.dev",
      "cleanapp.com",
      "cleanapp.io",
      "cleanapp.ai",
      "cleanapp.app",
      "cleanapp.co",
      "cleanapp.dev",
    ])
  })
})
