import { expect, test } from "@playwright/test"

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "phone", width: 390, height: 844 },
] as const

test("Search Console opportunity pages expose accurate snippets and responsive paths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chrome", "One browser covers the release viewports")

  const cases = [
    {
      path: "/blog/best-namelix-alternatives-2026",
      title: /9 Best Namelix Alternatives in 2026 \(Tested & Compared\)/,
      description: /Compare 9 Namelix alternatives/,
      heading: /9 Best Namelix Alternatives in 2026/i,
    },
    {
      path: "/blog/godaddy-domain-generator-vs-namolux",
      title: /GoDaddy Name Generator vs NamoLux \(2026 Comparison\)/,
      description: /Compare the GoDaddy name generator with NamoLux/,
      heading: /GoDaddy Name Generator vs NamoLux/i,
    },
    {
      path: "/blog/best-domain-registrars-for-startups",
      title: /Best Domain Registrars for Small Startups \(2026 Guide\)/,
      description: /Compare 5 domain registrars for small startups/,
      heading: /Best Domain Registrars for Small Startups in 2026/i,
    },
  ] as const

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const entry of cases) {
      await page.goto(entry.path, { waitUntil: "domcontentloaded" })
      await expect(page).toHaveTitle(entry.title)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", entry.description)
      await expect(page.getByRole("heading", { name: entry.heading }).first()).toBeVisible()
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.namolux.com${entry.path}`)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${entry.path} overflows at ${viewport.name}`).toBeLessThanOrEqual(1)
    }
  }

  await page.goto("/blog/best-namelix-alternatives-2026", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("link", { name: /See the NamoLux business name generator/i })).toHaveAttribute("href", "/business-name-generator")
})
