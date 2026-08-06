import { describe, expect, it, vi } from "vitest"
import { signPrivateVideoDownload, verifiesPrivateVideoDownload } from "@/lib/private-video-download"

describe("private video download signing", () => {
  it("accepts a current 7-day link and rejects a tampered or expired one", () => {
    vi.stubEnv("VIDEO_DOWNLOAD_SIGNING_SECRET", "test-signing-secret")
    const now = Date.UTC(2026, 7, 2)
    const url = new URL(signPrivateVideoDownload("https://lab.namolux.com", now)!)
    expect(verifiesPrivateVideoDownload(url.searchParams.get("expires"), url.searchParams.get("signature"), now)).toBe(true)
    expect(verifiesPrivateVideoDownload(url.searchParams.get("expires"), "wrong", now)).toBe(false)
    expect(verifiesPrivateVideoDownload(String(Math.floor(now / 1000) - 1), url.searchParams.get("signature"), now)).toBe(false)
  })
})
