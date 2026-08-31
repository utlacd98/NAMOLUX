import { describe, expect, it } from "vitest"

import { namecheapLink } from "./affiliateLink"

describe("Namecheap partner links", () => {
  it("prefills the exact verified domain and preserves Name Sprint attribution", () => {
    const link = new URL(namecheapLink("ebbmark.co", {
      source: "name_sprint",
      content: "co",
    }))

    expect(link.origin).toBe("https://namecheap.pxf.io")
    expect(link.pathname).toBe("/2RK07Q")
    expect(link.searchParams.get("subId1")).toBe("name_sprint")
    expect(link.searchParams.get("subId3")).toBe("co")

    const destination = new URL(link.searchParams.get("u") || "")
    expect(destination.origin).toBe("https://www.namecheap.com")
    expect(destination.pathname).toBe("/domains/registration/results/")
    expect(destination.searchParams.get("domain")).toBe("ebbmark.co")
    expect(destination.searchParams.get("utm_campaign")).toBe("name_sprint")
  })
})
