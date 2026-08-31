import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const component = readFileSync("components/lab-name-generator.tsx", "utf8")

describe("Name Sprint Namecheap CTA", () => {
  it("is created only from a verified available domain", () => {
    expect(component).toContain('find((domain) => domain.status === "available")')
    expect(component).toContain("availableDomain ? `${candidate.normalizedName}.${availableDomain.tld}` : null")
    expect(component).toContain("{fullDomain &&")
  })

  it("uses the tracked partner link with safe external-link semantics", () => {
    expect(component).toContain('namecheapLink(fullDomain, { source: "name_sprint"')
    expect(component).toContain('rel="sponsored noopener noreferrer"')
    expect(component).toContain('aria-label={`Buy ${fullDomain} on Namecheap`}')
  })
})

describe("Name Sprint trade-mark evidence", () => {
  it("shows the automated collision result separately from legal clearance", () => {
    expect(component).toContain("Brand &amp; trade-mark evidence")
    expect(component).toContain("Official register check required")
    expect(component).toContain("NamoLux internal screen")
    expect(component).toContain("This is not official trade-mark clearance")
    expect(component).toContain("Current web brand screen")
    expect(component).toContain("Official registers")
    expect(component).toContain("Not checked")
    expect(component).not.toContain("Collision-risk score")
  })

  it("links finalists to official UK, US, and EU search services", () => {
    expect(component).toContain("https://www.gov.uk/search-for-trademark")
    expect(component).toContain("https://www.uspto.gov/trademarks/search/search")
    expect(component).toContain("https://www.euipo.europa.eu/en/search-ip")
    expect(component).toContain("Verify before using the name")
    expect(component).toContain("Search the exact name and close spelling, sound and meaning variants")
  })
})
