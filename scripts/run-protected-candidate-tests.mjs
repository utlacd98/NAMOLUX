import { spawn, spawnSync } from "node:child_process"
import path from "node:path"

const candidateUrl = process.env.NAMOLUX_CANDIDATE_URL?.trim()

if (!candidateUrl) {
  throw new Error("Set NAMOLUX_CANDIDATE_URL to the protected Vercel candidate URL.")
}
if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(candidateUrl)) {
  throw new Error("NAMOLUX_CANDIDATE_URL must be an HTTPS vercel.app origin without a path.")
}

// Vercel CLI already knows the current authenticated team and selects the
// existing automation token for `vercel curl`. Capture its debug stream in
// memory so the secret never enters source, a shell command, or console output.
const vercelCommand = process.platform === "win32" ? "vercel.cmd" : "vercel"
const probe = process.platform === "win32"
  ? spawnSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", `vercel curl /api/auth/status --deployment ${candidateUrl} --debug`],
      { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
    )
  : spawnSync(
      vercelCommand,
      ["curl", "/api/auth/status", "--deployment", candidateUrl, "--debug"],
      { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
    )
const probeOutput = `${probe.stdout || ""}\n${probe.stderr || ""}`
const bypassSecret =
  probeOutput.match(/--header\s+["']x-vercel-protection-bypass:\s*([^"']+)["']/i)?.[1]?.trim()
  || probeOutput.match(/Using existing protection bypass token from project settings:\s*(\S+)/)?.[1]
if (!bypassSecret) {
  const probeState = probe.error ? ` (${probe.error.message})` : ` (exit ${probe.status ?? "unknown"})`
  throw new Error(`The authenticated Vercel CLI could not supply the existing automation-bypass token${probeState}.`)
}

// Exchange the project-wide automation secret for a candidate-origin JWT,
// then discard the secret before Playwright starts. The browser receives only
// the HttpOnly, origin-scoped cookie and never sends the bypass header to
// analytics, advertising, fonts, or any other third-party origin.
const bootstrap = await fetch(`${candidateUrl}/api/auth/status`, {
  redirect: "manual",
  headers: {
    "x-vercel-protection-bypass": bypassSecret,
    "x-vercel-set-bypass-cookie": "true",
  },
})
const setCookie = bootstrap.headers.get("set-cookie") || ""
const candidateJwt = setCookie.match(/(?:^|[,;]\s*)_vercel_jwt=([^;,]+)/)?.[1]
if (!candidateJwt) {
  throw new Error(`Vercel did not issue a candidate-scoped JWT (${bootstrap.status}).`)
}

const passthrough = process.argv.slice(2)
const playwrightCli = path.join(process.cwd(), "node_modules", "@playwright", "test", "cli.js")
const childEnvironment = { ...process.env }
delete childEnvironment.VERCEL_AUTOMATION_BYPASS_SECRET
const child = spawn(process.execPath, [playwrightCli, "test", ...passthrough], {
  cwd: process.cwd(),
  env: {
    ...childEnvironment,
    PLAYWRIGHT_BASE_URL: candidateUrl,
    PLAYWRIGHT_SKIP_WEBSERVER: "1",
    VERCEL_CANDIDATE_JWT: candidateJwt,
  },
  stdio: "inherit",
})

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
