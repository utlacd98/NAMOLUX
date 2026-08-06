import { spawn } from "node:child_process"
import { resolve } from "node:path"

const port = process.env.NAMOLUX_CURATOR_PORT || "3112"
const nextBin = resolve("node_modules", "next", "dist", "bin", "next")
const child = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", port], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NAMOLUX_LOCAL_CURATOR: "1",
  },
  stdio: "inherit",
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal))
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exitCode = code ?? 1
})
