import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { createServer } from "vite"

const server = await createServer({
  appType: "custom",
  resolve: { alias: { "@": resolve(".") } },
  server: { middlewareMode: true },
})

try {
  const loadedModule = await server.ssrLoadModule("/lib/naming-specialist/pilot-excluded-material.ts")
  const ledger = loadedModule.PILOT_EXCLUDED_MATERIAL_LEDGER
  const content = `/**
 * Generated hashes-only runtime ledger. Rebuild with:
 *   node scripts/generate-pilot-excluded-ledger.mjs
 *
 * Historical briefs and names remain in local test artifacts and are never
 * bundled into the application or exported as training content.
 */
import type { ExcludedMaterial } from "./types"

export const PILOT_EXCLUDED_MATERIAL: ExcludedMaterial = ${JSON.stringify({
    descriptionHashes: ledger.descriptionHashes,
    nameHashes: ledger.nameHashes,
  }, null, 2)}

export const PILOT_EXCLUDED_MATERIAL_LEDGER_SHA256 = ${JSON.stringify(ledger.ledgerSha256)}
`
  await writeFile(
    resolve("lib", "naming-specialist", "pilot-excluded-material.generated.ts"),
    content,
    "utf8",
  )
  console.log(`Generated hashes-only ledger: ${ledger.descriptionHashes.length} descriptions, ${ledger.nameHashes.length} names`)
} finally {
  await server.close()
}
