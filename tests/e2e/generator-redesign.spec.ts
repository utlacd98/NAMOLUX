import { expect, test, type Page } from "@playwright/test"
import { GENERATOR_HISTORY_STORAGE_KEY } from "@/components/generator-exploration-model"
import { createGeneratedNameId } from "@/lib/domainGen/generatedName"

const QUICK_NAMES = [
  "avenlo", "brightarc", "caremint", "driftwell", "everkind", "fieldnote", "goodharbor", "hushline",
  "kindreday", "lumenpath", "mendora", "northkind", "openmeadow", "quietlyst", "truehaven", "wellframe",
] as const

const ADVANCED_NAMES = [
  "altivane", "bravemoor", "clearbloom", "driftatlas", "emberfield", "fablecrest",
  "goldenward", "hinterland", "ivorypath", "juniperbay", "kindlewood", "lucentmark",
] as const

const STYLES = [
  "brandable", "evocative", "compound", "alternate_spelling", "real_word", "short_phrase", "non_english",
] as const

function candidate(name: string, index: number) {
  return {
    id: createGeneratedNameId(name, index + 1),
    name,
    rationale: `${name} combines a clear construction with a category-specific cue, giving the intended audience a credible, memorable and professionally positioned brand direction.`,
    style: STYLES[index % STYLES.length],
    generationRank: index + 1,
    availability: {},
    founderSignal: null,
  }
}

async function mockAvailability(page: Page, delayMs = 150) {
  await page.route("**/api/check-domain", async (route) => {
    const body = route.request().postDataJSON() as { domains: string[]; tlds: string[] }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        workflowContinuation: true,
        candidateFirstContinuation: true,
        results: body.domains.flatMap((name, nameIndex) => body.tlds.map((tld, tldIndex) => ({
          name,
          tld,
          fullDomain: `${name}.${tld}`,
          available: (nameIndex + tldIndex) % 3 === 0,
          checkStatus: (nameIndex + tldIndex) % 3 === 0 ? "available" : "taken",
          availabilityConfidence: "high",
          registerUrl: `https://www.namecheap.com/domains/registration/results/?domain=${name}.${tld}`,
        }))),
      }),
    })
  })
}

async function fillQuickBrief(page: Page, brief: string) {
  await page.waitForLoadState("networkidle")
  const input = page.getByLabel("Keywords or description")
  const generate = page.getByRole("button", { name: "Generate candidates" })
  await expect(async () => {
    await input.fill(brief)
    await expect(generate).toBeEnabled({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
  return generate
}

test.describe("generator redesign sandbox", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies()
    await page.route("**/api/metrics/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
    })
    await page.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test("Quick shows a truthful splash, 16 actionable names and no Founder Signal", async ({ page }) => {
    let submittedBody: Record<string, unknown> = {}
    await mockAvailability(page, 1_000)
    await page.route("**/api/quick-generate", async (route) => {
      submittedBody = route.request().postDataJSON() as Record<string, unknown>
      await new Promise((resolve) => setTimeout(resolve, 1_500))
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          isPro: false,
          generation: "sandbox",
          state: "names_ready",
          availabilityState: "checking_domains",
          availabilityToken: "sandbox-availability-token",
          workflowToken: "sandbox-availability-token",
          generationMeta: { modelBacked: true, model: "sandbox", durationMs: 1_500, providerAttempts: [] },
          quality: { modelCandidateCount: 12, fallbackCandidateCount: 4 },
          candidates: QUICK_NAMES.map(candidate),
        }),
      })
    })

    await page.goto("/generate")
    const generate = await fillQuickBrief(page, "A calm privacy platform for independent online retailers")
    await page.getByText("Shape the creative direction").click()
    const friendlyVibe = page.getByRole("button", { name: "Friendly", exact: true })
    const boldVibe = page.getByRole("button", { name: "Bold", exact: true })
    await expect(friendlyVibe).toHaveAttribute("aria-pressed", "true")
    await boldVibe.click()
    await expect(boldVibe).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("button", { name: /^Evocative/ }).click()
    await page.getByRole("button", { name: /^Exploratory/ }).click()
    await page.getByLabel("Words to avoid").fill("hub, labs")

    await generate.click()

    const splash = page.getByRole("dialog")
    await expect(splash.getByRole("heading", { name: "Finding names worth a second look" })).toBeVisible()
    await expect(splash).toHaveAttribute("aria-busy", "true")
    await expect(splash.locator("[data-ad-placement], ins.adsbygoogle")).toHaveCount(0)
    await expect(splash.getByText("A calm privacy platform for independent online retailers")).toBeVisible()
    await expect(page.getByText("Generating candidates.", { exact: true })).toBeAttached()

    const results = page.getByLabel("Quick generated names")
    await expect(results).toBeVisible()
    await expect(page.getByText("16 candidates are ready. Checking domain availability.", { exact: true })).toBeAttached()
    await expect(results.locator("article")).toHaveCount(16)
    await expect(page.getByRole("button", { name: "Run Founder Signal on all names" })).toHaveCount(0)
    await expect(results.getByText("Founder Signal", { exact: true })).toHaveCount(0)
    await expect(results.getByRole("button", { name: "Save", exact: true })).toHaveCount(16)
    await expect(results.getByRole("button", { name: "Not right", exact: true })).toHaveCount(16)
    await expect(results.getByRole("button", { name: /More like this/ })).toHaveCount(16)
    const decisionRail = page.getByLabel("Shortlist decision actions")
    await expect(decisionRail).toBeVisible()
    await expect(decisionRail.getByRole("button", { name: "Compare two · Pro" })).toBeVisible()

    await results.getByRole("button", { name: "Save", exact: true }).first().click()
    await expect(results.getByRole("button", { name: "Saved", exact: true }).first()).toBeVisible()
    await results.getByRole("button", { name: "Not right", exact: true }).first().click()
    await expect(results.getByRole("button", { name: "Undo", exact: true }).first()).toBeVisible()
    await results.getByRole("button", { name: /More like this/ }).nth(6).click()
    await expect(page.getByLabel("Maximum quick-generate name length")).toHaveAttribute("min", "12")
    await expect(page.getByLabel("Maximum quick-generate name length")).toHaveValue("12")

    const storedProfile = await page.evaluate(() => localStorage.getItem("namolux_naming_preferences_v1") || "")
    expect(storedProfile).not.toContain("privacy platform")
    expect(storedProfile).not.toContain(QUICK_NAMES[0])
    expect(submittedBody).toMatchObject({ vibe: "bold", style: "evocative", creativity: "exploratory", count: 16 })
    expect(submittedBody.blacklist).toEqual(["hub", "labs"])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  })

  test("initialises Pro entitlement and keeps Quick brand tools on the Quick vibe", async ({ page }) => {
    await page.route("**/api/subscription", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ isPro: true, plan: "pro", canUseBrandPalette: true }),
      })
    })
    await mockAvailability(page)
    await page.route("**/api/quick-generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          isPro: true,
          state: "names_ready",
          availabilityState: "checking_domains",
          availabilityToken: "pro-sandbox-availability-token",
          workflowToken: "pro-sandbox-availability-token",
          candidates: QUICK_NAMES.map(candidate),
        }),
      })
    })

    await page.goto("/generate")
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: "Advanced Generate" }).click()
    await expect(page.getByText("Pro fair use", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Quick Generate" }).click()

    const generate = await fillQuickBrief(page, "A bold security workspace for small agencies")
    await page.getByText("Shape the creative direction").click()
    await page.getByRole("button", { name: "Bold", exact: true }).click()
    await generate.click()

    const rail = page.getByLabel("Shortlist decision actions")
    await expect(rail.getByRole("button", { name: "Compare two", exact: true })).toBeVisible()
    const brandTools = rail.getByRole("link", { name: "Brand tools" })
    await expect(brandTools).toHaveAttribute("href", /[?&]vibe=bold(?:&|$)/)
  })

  test("Quick labels an explicit-style partial batch and clears the notice on a full rerun", async ({ page }) => {
    let attempt = 0
    await mockAvailability(page)
    await page.route("**/api/quick-generate", async (route) => {
      attempt += 1
      const names = attempt === 1 ? QUICK_NAMES.slice(0, 6) : QUICK_NAMES
      const partial = names.length < 16
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          isPro: false,
          state: "names_ready",
          availabilityState: "checking_domains",
          availabilityToken: `sandbox-availability-token-${attempt}`,
          workflowToken: `sandbox-availability-token-${attempt}`,
          generationMeta: {
            requestedCount: 16,
            resultCount: names.length,
            isPartial: partial,
            styleFulfilled: !partial,
            styleShortfallReason: partial
              ? "Only 6 safe Evocative names met this brief; other styles were not substituted."
              : null,
          },
          candidates: names.map(candidate),
        }),
      })
    })

    await page.goto("/generate")
    const generate = await fillQuickBrief(page, "A calm naming tool for independent consultants")
    await page.getByText("Shape the creative direction").click()
    await page.getByRole("button", { name: /^Non-English/ }).click()
    await expect(page.getByLabel("Maximum quick-generate name length")).toHaveAttribute("min", "12")
    await expect(page.getByLabel("Maximum quick-generate name length")).toHaveValue("12")
    await expect(page.getByText("Reviewed French (Québec) and Welsh forms need 12–15 characters.")).toBeVisible()
    await page.getByRole("button", { name: /^Evocative/ }).click()
    await generate.click()

    await expect(page.getByText("Partial style batch · 6 of 16 names")).toBeVisible()
    await expect(page.getByText("Only 6 safe Evocative names met this brief; other styles were not substituted.")).toBeVisible()
    await expect(page.getByLabel("Quick generated names").locator("article")).toHaveCount(6)

    await generate.click()
    await expect(page.getByText(/Partial style batch/)).toHaveCount(0)
    await expect(page.getByLabel("Quick generated names").locator("article")).toHaveCount(16)
    await expect(page.getByText(/Partial style batch/)).toHaveCount(0)
  })

  test("Quick cancellation restores the primary action and leaves no stale results", async ({ page }) => {
    await page.route("**/api/quick-generate", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5_000))
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          state: "names_ready",
          availabilityState: "checking_domains",
          availabilityToken: "stale-cancelled-token",
          candidates: QUICK_NAMES.map(candidate),
        }),
      }).catch(() => undefined)
    })

    await page.goto("/generate")
    const generate = await fillQuickBrief(page, "A premium tea company for design-conscious travellers")
    await generate.click()
    await expect(page.getByRole("heading", { name: "Finding names worth a second look" })).toBeFocused()
    await page.getByRole("button", { name: "Cancel generation" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.getByLabel("Quick generated names")).toHaveCount(0)
    await expect(generate).toBeFocused()
    await page.waitForTimeout(5_200)
    await expect(page.getByLabel("Quick generated names")).toHaveCount(0)
  })

  test("Quick rejects a degraded provider batch without publishing filler and can retry", async ({ page }) => {
    let attempt = 0
    await mockAvailability(page)
    await page.route("**/api/quick-generate", async (route) => {
      attempt += 1
      if (attempt === 2) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "quick_generation_temporarily_limited",
            message: "High-quality generation is temporarily unavailable. Please retry in a moment; no monthly allowance was used.",
            retryable: true,
            generationMeta: {
              requestedCount: 16,
              resultCount: 0,
              isPartial: true,
              qualityState: "degraded",
            },
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          isPro: false,
          state: "names_ready",
          availabilityState: "checking_domains",
          availabilityToken: `sandbox-availability-token-${attempt}`,
          workflowToken: `sandbox-availability-token-${attempt}`,
          generationMeta: { modelBacked: true, modelCandidateCount: 16 },
          candidates: QUICK_NAMES.map(candidate),
        }),
      })
    })

    await page.goto("/generate")
    const generate = await fillQuickBrief(page, "A welcoming budgeting app for young families")
    await generate.click()
    await expect(page.getByLabel("Quick generated names").locator("article")).toHaveCount(16)

    await generate.click()
    const alert = page.getByRole("alert").filter({ hasText: "High-quality generation is temporarily unavailable" })
    await expect(alert).toContainText("High-quality generation is temporarily unavailable")
    await expect(alert).toContainText("no monthly allowance was used")
    await expect(alert.getByRole("button", { name: "Retry" })).toBeVisible()
    await expect(page.getByLabel("Quick generated names")).toHaveCount(0)
    await expect(generate).toBeFocused()

    const retainedBatch = await page.evaluate((storageKey) => localStorage.getItem(storageKey), GENERATOR_HISTORY_STORAGE_KEY)
    expect(retainedBatch).not.toContain("budgeting app")
    expect(JSON.parse(retainedBatch || "{}").candidates).toHaveLength(16)

    await alert.getByRole("button", { name: "Retry" }).click()
    await expect(page.getByLabel("Quick generated names").locator("article")).toHaveCount(16)
    expect(attempt).toBe(3)
  })

  test("Advanced separates creative admission from optional Founder Signal scoring", async ({ page }) => {
    let scoringCandidates: Array<{ id: string; name: string }> = []
    let scoringAttempts = 0
    await mockAvailability(page)
    await page.route("**/api/generate-domains", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000))
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          generatorV2: true,
          isPro: false,
          workflowToken: "sandbox-founder-token",
          availabilityToken: "sandbox-availability-token",
          advancedGenerationAllowance: { used: 1, limit: 3, remaining: 2, resetAt: "2026-08-01T00:00:00.000Z" },
          domains: ADVANCED_NAMES.map(candidate),
        }),
      })
    })
    await page.route("**/api/founder-signal/batch", async (route) => {
      const body = route.request().postDataJSON() as { candidates: Array<{ id: string; name: string }> }
      scoringCandidates = body.candidates
      scoringAttempts += 1
      if (scoringAttempts === 1) {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            error: "founder_signal_rate_limited",
            message: "Please wait a moment before scoring another shortlist.",
          }),
        })
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000))
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          allowance: { used: 1, limit: 1, remaining: 0, resetAt: "2026-08-01T00:00:00.000Z" },
          results: body.candidates.map((item, index) => ({
            ...item,
            founderSignal: {
              status: "ready",
              score: 72 + (index % 8),
              band: "Strong",
              breakdown: { clarity: 78, resonance: 75, trust: 76, stretch: 73, recall: 77 },
              reasons: [`${item.name} has a clear construction and credible category fit.`],
              version: "sandbox-v1",
            },
          })),
        }),
      })
    })

    await page.goto("/generate")
    await page.waitForLoadState("networkidle")
    const advancedMode = page.getByRole("button", { name: "Advanced Generate" })
    await expect(async () => {
      await advancedMode.click()
      await expect(advancedMode).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 })
    }).toPass({ timeout: 15_000 })
    const luxuryVibe = page.getByRole("button", { name: "Luxury", exact: true })
    const trustworthyVibe = page.getByRole("button", { name: "Trustworthy", exact: true })
    await expect(luxuryVibe).toHaveAttribute("aria-pressed", "true")
    await trustworthyVibe.click()
    await expect(trustworthyVibe).toHaveAttribute("aria-pressed", "true")
    await page.getByLabel("Startup Description & Keywords").fill("A traceable cold-chain platform for independent pharmacies")
    await page.getByRole("button", { name: "Discover Names" }).click()
    await expect(page.getByRole("heading", { name: "Building a sharper shortlist" })).toBeVisible()

    const results = page.getByLabel("Advanced generated names")
    await expect(results.locator("article")).toHaveCount(12)
    await expect(results.getByText("Founder Signal", { exact: true })).toHaveCount(0)
    const scoreBatch = page.getByRole("button", { name: "Run Founder Signal on all names" })
    await expect(scoreBatch).toBeVisible()
    await scoreBatch.click()
    await expect(page.getByText("Please wait a moment before scoring another shortlist.")).toBeVisible()
    await expect(scoreBatch).toBeVisible()
    await expect(page.getByRole("button", { name: "Unlock unlimited scoring" })).toHaveCount(0)
    await scoreBatch.click()
    await expect(page.getByText("Scoring 12 names across five signals")).toBeVisible()
    await expect(results.getByText("Founder Signal", { exact: true })).toHaveCount(12)
    expect(scoringCandidates).toEqual(ADVANCED_NAMES.map((name, index) => ({
      id: createGeneratedNameId(name, index + 1),
      name,
    })))
    await expect(page.getByRole("button", { name: "Sort by Founder Signal" })).toBeVisible()
    await expect(results.locator("article").first().getByText("altivane", { exact: true }).first()).toBeVisible()
    const rail = page.getByLabel("Shortlist decision actions")
    await expect(rail).toContainText("Next actions for altivane")
    await page.getByRole("button", { name: "Sort by Founder Signal" }).click()
    await expect(rail).toContainText("Next actions for hinterland")
    await expect(rail.getByRole("button", { name: "Save hinterland" })).toBeVisible()
  })
})

test("real Quick API returns the candidate-first contract within the release budget", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "One provider-backed smoke request is sufficient")
  const startedAt = Date.now()
  const response = await request.post("/api/quick-generate", {
    data: {
      description: "A repair coordination platform for independent bicycle workshops",
      vibe: "friendly",
      style: "auto",
      creativity: "balanced",
      maxChars: 12,
      count: 16,
    },
  })
  const elapsedMs = Date.now() - startedAt
  const responseText = await response.text()
  expect(response.ok(), responseText).toBeTruthy()
  const payload = JSON.parse(responseText)
  expect(payload.state).toBe("names_ready")
  expect(payload.availabilityState).toBe("checking_domains")
  expect(payload.availabilityToken).toEqual(expect.any(String))
  expect(payload.candidates).toHaveLength(16)
  expect(new Set(payload.candidates.map((item: { id: string }) => item.id)).size).toBe(16)
  expect(payload.candidates.every((item: { founderSignal: unknown }) => item.founderSignal === null)).toBe(true)
  expect(elapsedMs).toBeLessThan(8_000)
})
