import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function componentSource(): string {
  return readFileSync(
    new URL("../components/generate-names-premium.tsx", import.meta.url),
    "utf8",
  )
}

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(0)
  expect(end, `missing source marker: ${endMarker}`).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe("generator redesign source contract", () => {
  it("keeps redesigned Advanced request-id admission unconditional when AutoFind is enabled", () => {
    const source = componentSource()
    const handleGenerate = sourceBetween(
      source,
      "const handleGenerate = async () => {",
      "const toggleShortlist =",
    )

    expect(handleGenerate).toMatch(
      /if \(redesignEnabled\) \{\s*await handleRedesignedAdvancedGenerate\(\)\s*return\s*\}/,
    )
    expect(handleGenerate).not.toContain("redesignEnabled && !autoFindComMode")
  })

  it("launches AutoFind only after the request-id-bound Advanced candidate-first batch", () => {
    const source = componentSource()
    const advancedHandler = sourceBetween(
      source,
      "const handleRedesignedAdvancedGenerate = async () => {",
      "const handleQuickGenerate = async () => {",
    )
    const quickHandler = sourceBetween(
      source,
      "const handleRedesignedQuickGenerate = async () => {",
      "const handleRedesignedAdvancedGenerate = async () => {",
    )

    const requestIdIndex = advancedHandler.indexOf("requestId: workflowRequestId")
    const candidateBatchIndex = advancedHandler.indexOf("completeCandidateGeneration(candidates, requestId")
    const autoFindIndex = advancedHandler.indexOf("await requestAutoFindV2(resolvedKeyword, abortController.signal)")

    expect(requestIdIndex, "Advanced candidate-first request must include its workflow request id").toBeGreaterThanOrEqual(0)
    expect(candidateBatchIndex, "Advanced candidate-first batch completion is missing").toBeGreaterThan(requestIdIndex)
    expect(autoFindIndex, "Advanced AutoFind continuation is missing").toBeGreaterThan(candidateBatchIndex)
    expect(advancedHandler).toContain("if (autoFindComMode)")
    expect(quickHandler).not.toContain("requestAutoFindV2(")
  })
})
