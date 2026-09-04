import { expect, test } from "@playwright/test"

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "phone", width: 390, height: 844 },
] as const

function collectBrowserErrors(page: import("@playwright/test").Page) {
  const browserErrors: string[] = []
  const isLocalBuild = /(?:127\.0\.0\.1|localhost)/.test(process.env.PLAYWRIGHT_BASE_URL ?? "")

  page.on("pageerror", (error) => browserErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() !== "error") return

    const text = message.text()
    const isExpectedLocalInfrastructureNoise = isLocalBuild && (
      text.startsWith("Failed to load resource:") ||
      text.includes("/_vercel/insights/script.js") ||
      text.includes("https://localhost:") ||
      text.includes("net::ERR_SSL_PROTOCOL_ERROR")
    )

    if (!isExpectedLocalInfrastructureNoise) browserErrors.push(text)
  })

  return browserErrors
}

test("Name Sprint landing page stays accurate and responsive", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "One browser can cover all three viewport sizes")

  const browserErrors = collectBrowserErrors(page)

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto("/", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: /Find a name worth building on/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /Start a free Name Sprint/i }).first()).toBeVisible()
    await expect(page.getByText(/\.com · \.co · \.ai/).first()).toBeVisible()
    await expect(page.getByText(/Brand Launch Kit/).first()).toBeVisible()
    await expect(page).toHaveTitle(/Business Name Generator & Domain Checker/)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /discovers focused business names/i)

    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(horizontalOverflow, `${viewport.name} has horizontal overflow`).toBeLessThanOrEqual(1)

    if (viewport.name === "desktop") {
      await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Name Sprint" })).toBeVisible()
    } else {
      await expect(page.getByRole("button", { name: /Open navigation menu/i })).toBeVisible()
    }

    await page.screenshot({ path: testInfo.outputPath(`landing-${viewport.name}-hero.png`) })

    for (const heading of [
      /The useful result is a decision/i,
      /A disciplined read on the names you choose/i,
      /A name intelligence platform/i,
      /From brief to launch/i,
      /Start free\. Go deeper when a name earns it/i,
      /Questions worth answering/i,
      /Your company deserves a name worth building on/i,
    ]) {
      const sectionHeading = page.getByRole("heading", { name: heading })
      await sectionHeading.scrollIntoViewIfNeeded()
      await expect(sectionHeading).toBeVisible()
    }

    await page.getByRole("heading", { name: /From brief to launch/i }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`landing-${viewport.name}-process.png`) })
    await page.getByRole("heading", { name: /Start free\. Go deeper when a name earns it/i }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`landing-${viewport.name}-pricing.png`) })
  }

  expect(browserErrors).toEqual([])
})

test("indexable generator page presents the real comparison without overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "One browser can cover all three viewport sizes")

  const browserErrors = collectBrowserErrors(page)

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto("/business-name-generator", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: /Find a business name worth building on/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Same brief\. Two names\. Two honest verdicts/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Daylatch" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Trellivo" })).toBeVisible()
    await expect(page.getByText(/Founder Signal · Strong/i)).toBeVisible()
    await expect(page.getByText(/Founder Signal · Reconsider/i)).toBeVisible()
    await expect(page).toHaveTitle(/Business Name Generator With Domain Checks/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.namolux.com/business-name-generator")

    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(horizontalOverflow, `${viewport.name} generator page has horizontal overflow`).toBeLessThanOrEqual(1)
  }

  expect(browserErrors).toEqual([])
})
