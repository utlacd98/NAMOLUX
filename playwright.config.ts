import { defineConfig, devices } from "@playwright/test"

const sandboxPort = process.env.NAMOLUX_SANDBOX_PORT || "3107"
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${sandboxPort}`
const candidateJwt = process.env.VERCEL_CANDIDATE_JWT?.trim()
const candidateOrigin = new URL(baseURL)

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    channel: "chrome",
    colorScheme: "dark",
    locale: "en-GB",
    trace: candidateJwt ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    storageState: candidateJwt
      ? {
          cookies: [{
            name: "_vercel_jwt",
            value: candidateJwt,
            domain: candidateOrigin.hostname,
            path: "/",
            expires: -1,
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
          }],
          origins: [],
        }
      : undefined,
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run sandbox:start",
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: true,
        stdout: "pipe",
        stderr: "pipe",
      },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
  ],
})
