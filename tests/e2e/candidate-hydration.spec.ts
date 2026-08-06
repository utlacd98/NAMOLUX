import { expect, test } from "@playwright/test"

test("protected candidate hydrates the generator workspace", async ({ page }) => {
  const diagnostics: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.push(`console: ${message.text()}`)
  })
  page.on("pageerror", (error) => diagnostics.push(`pageerror: ${error.message}`))
  page.on("requestfailed", (request) => {
    const url = new URL(request.url())
    diagnostics.push(`requestfailed: ${url.pathname} (${request.failure()?.errorText || "unknown"})`)
  })

  await page.goto("/generate", { waitUntil: "networkidle" })
  await page.getByLabel("Keywords or description").fill("A calm privacy platform for independent online retailers")
  const generate = page.getByRole("button", { name: "Generate candidates" })

  if (await generate.isDisabled()) {
    console.log(JSON.stringify({ diagnostics }, null, 2))
  }
  await expect(generate).toBeEnabled({ timeout: 5_000 })
})
