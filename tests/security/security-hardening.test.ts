import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import nextConfig, { buildContentSecurityPolicy } from "../../next.config.mjs"

describe("Content Security Policy", () => {
  it("keeps production eval-free and enables compatible hardening directives", () => {
    const policy = buildContentSecurityPolicy(true)

    expect(policy).not.toContain("'unsafe-eval'")
    expect(policy).toContain("script-src-attr 'none'")
    expect(policy).toContain("worker-src 'self' blob:")
    expect(policy).toContain("manifest-src 'self'")
    expect(policy).toContain("media-src 'self' data: blob:")
    expect(policy).toContain("upgrade-insecure-requests")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'self'")
    expect(policy).toContain("form-action 'self'")
    expect(policy).toContain("frame-ancestors 'none'")
  })

  it("keeps development tooling local to non-production policy", () => {
    const policy = buildContentSecurityPolicy(false)

    expect(policy).toContain("'unsafe-eval'")
    expect(policy).not.toContain("upgrade-insecure-requests")
  })

  it("publishes the generated policy through the global Next.js header", async () => {
    const headerGroups = await nextConfig.headers()
    const policyHeader = headerGroups
      .flatMap((group) => group.headers)
      .find((header) => header.key === "Content-Security-Policy")

    expect(policyHeader?.value).toBe(
      buildContentSecurityPolicy(process.env.NODE_ENV === "production"),
    )
  })
})

describe("public API failures", () => {
  const stableFailures = {
    "app/api/quick-generate/route.ts": "Failed to quick generate names",
    "app/api/generate-domains/route.ts": "Failed to generate domain names",
    "app/api/check-domain/route.ts": "Failed to check domain availability",
    "app/api/check-socials/route.ts": "Failed to check social handles",
    "app/api/seo-audit/route.ts": "Failed to perform SEO audit",
    "app/api/seo-potential/route.ts": "Failed to calculate SEO potential",
  }

  it.each(Object.entries(stableFailures))(
    "%s does not expose exception messages in its catch-all 500 response",
    (file, publicMessage) => {
      const source = readFileSync(resolve(process.cwd(), file), "utf8")

      expect(source).toContain(`{ error: "${publicMessage}" }`)
      expect(source).not.toContain(`error.message || "${publicMessage}"`)
    },
  )
})
