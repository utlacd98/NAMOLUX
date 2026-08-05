import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const llmsText = readFileSync(resolve(process.cwd(), "public", "llms.txt"), "utf8")

describe("public llms.txt", () => {
  it("follows the core llms.txt document structure", () => {
    expect(llmsText).toMatch(/^# NamoLux\r?\n\r?\n> /)
    expect(llmsText.match(/^# /gm)).toHaveLength(1)
    expect(llmsText).toContain("## Product")
    expect(llmsText).toContain("## Optional")
  })

  it("uses only canonical production URLs without duplicates", () => {
    const urls = [...llmsText.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((match) => match[1])

    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every((url) => url.startsWith("https://www.namolux.com/"))).toBe(true)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it("includes the live decision workspace and excludes private or retired surfaces", () => {
    expect(llmsText).toContain("https://www.namolux.com/bulk-domain-check")
    expect(llmsText).toContain("https://www.namolux.com/founder-signal")
    expect(llmsText).not.toMatch(/lab\.namolux\.com|\/generate|\/api\/|\/dashboard|\/admin/i)
  })
})
