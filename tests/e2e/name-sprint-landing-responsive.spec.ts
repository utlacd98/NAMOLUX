import { expect, test } from "@playwright/test"

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "phone", width: 390, height: 844 },
] as const

test("Name Sprint landing page stays accurate and responsive", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "One browser can cover all three viewport sizes")

  const browserErrors: string[] = []
  page.on("pageerror", (error) => browserErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text())
  })

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto("/", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: /The name generator with a quality bar/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /Start a Name Sprint/i }).first()).toBeVisible()
    await expect(page.getByText(/\.com · \.co · \.ai/).first()).toBeVisible()
    await expect(page.getByText(/Brand Launch Kit/).first()).toBeVisible()
    await expect(page).toHaveTitle(/Business Name Generator & Domain Checker/)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /generates, rejects and ranks business names/i)

    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(horizontalOverflow, `${viewport.name} has horizontal overflow`).toBeLessThanOrEqual(1)

    if (viewport.name === "desktop") {
      await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Name Sprint" })).toBeVisible()
    } else {
      await expect(page.getByRole("button", { name: /Open navigation menu/i })).toBeVisible()
    }

    await page.screenshot({ path: testInfo.outputPath(`landing-${viewport.name}-hero.png`) })

    for (const heading of [
      /Generate selectively/i,
      /A disciplined read on brand potential/i,
      /A name intelligence platform/i,
      /From brief to launch/i,
      /Start free\. Keep the decision moving/i,
      /Questions worth answering/i,
      /Your company deserves a name worth building on/i,
    ]) {
      const sectionHeading = page.getByRole("heading", { name: heading })
      await sectionHeading.scrollIntoViewIfNeeded()
      await expect(sectionHeading).toBeVisible()
    }

    await page.getByRole("heading", { name: /From brief to launch/i }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`landing-${viewport.name}-process.png`) })
    await page.getByRole("heading", { name: /Start free\. Keep the decision moving/i }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`landing-${viewport.name}-pricing.png`) })
  }

  expect(browserErrors).toEqual([])
})
