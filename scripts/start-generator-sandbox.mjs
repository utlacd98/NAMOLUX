import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { config as loadDotenv } from "dotenv"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const port = process.env.NAMOLUX_SANDBOX_PORT || "3107"
const host = process.env.NAMOLUX_SANDBOX_HOST || "127.0.0.1"
const nextBin = path.join(repositoryRoot, "node_modules", "next", "dist", "bin", "next")

// Production-mode Next.js gives `.env.production.local` precedence. That file
// can intentionally point at a separate legacy project, so load the current
// local integration environment explicitly before `next start`. Existing
// values are replaced without printing any secrets.
loadDotenv({ path: path.join(repositoryRoot, ".env.local"), override: true, quiet: true })

const child = spawn(process.execPath, [nextBin, "start", "--hostname", host, "--port", port], {
  cwd: repositoryRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    GENERATOR_REDESIGN_V2: "true",
    NEXT_PUBLIC_APP_URL: `http://${host}:${port}`,
  },
  stdio: "inherit",
})

const stop = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.on("SIGINT", () => stop("SIGINT"))
process.on("SIGTERM", () => stop("SIGTERM"))
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
