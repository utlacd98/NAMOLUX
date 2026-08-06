import { describe, expect, it } from "vitest"

import { NAMING_SPECIALIST_BRIEFS } from "./briefs"
import {
  assertNoExactExcludedDescriptions,
  buildExcludedMaterialLedger,
  excludedMaterialFromLedger,
  findExactExcludedDescriptionOverlaps,
  hashExcludedDescription,
  hashExcludedName,
} from "./excluded-material"
import {
  buildPilotExcludedMaterialLedger,
  PILOT_EXCLUDED_MATERIAL,
  PILOT_EXCLUDED_MATERIAL_LEDGER,
} from "./pilot-excluded-material"
import {
  PILOT_EXCLUDED_MATERIAL as GENERATED_PILOT_EXCLUDED_MATERIAL,
  PILOT_EXCLUDED_MATERIAL_LEDGER_SHA256,
} from "./pilot-excluded-material.generated"

describe("excluded-material ledger", () => {
  it("normalizes, deduplicates and emits only deterministic hashes", () => {
    const ledger = buildExcludedMaterialLedger([
      {
        sourceId: "example-source",
        descriptions: ["  Calm   caf\u00e9 finance  ", "Calm caf\u00e9 finance"],
        names: ["Caf\u00e9 Flow", "CafeFlow"],
      },
    ])

    expect(ledger.descriptionHashes).toEqual([hashExcludedDescription("calm caf\u00e9 finance")])
    expect(ledger.nameHashes).toEqual([hashExcludedName("CafeFlow")])
    expect(ledger.ledgerSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(buildExcludedMaterialLedger([
      {
        sourceId: "example-source",
        descriptions: ["Calm caf\u00e9 finance", "  Calm   caf\u00e9 finance  "],
        names: ["CafeFlow", "Caf\u00e9 Flow"],
      },
    ])).toEqual(ledger)

    const serialized = JSON.stringify(ledger)
    expect(serialized).not.toContain("Calm")
    expect(serialized).not.toContain("CafeFlow")
    expect(Object.isFrozen(ledger)).toBe(true)
    expect(Object.isFrozen(ledger.sources[0].descriptionHashes)).toBe(true)
  })

  it("builds the complete pilot ledger from fixed, held-out, benchmark and historical material", () => {
    const rebuilt = buildPilotExcludedMaterialLedger()
    expect(rebuilt).toEqual(PILOT_EXCLUDED_MATERIAL_LEDGER)
    expect(rebuilt.sources.map((source) => source.sourceId)).toEqual([
      "balanced-60",
      "fixed-generator-quality-corpus",
      "frozen-namelix-evaluator-2026-07-14",
      "historical-luna-six-2026-07-15-rc1",
      "historical-sol-six-2026-07-15-rc2",
      "historical-sol-six-2026-07-15-rc3",
      "historical-sol-six-2026-07-15-rc4",
      "historical-sol-six-2026-07-15-rc5-novelty",
      "historical-sol-six-2026-07-15-rc6-grounding",
      "quick-heldout",
    ])

    expect(
      rebuilt.sources.reduce((total, source) => total + source.inputCounts.descriptionValues, 0),
    ).toBe(220)
    expect(rebuilt.sources.reduce((total, source) => total + source.inputCounts.nameValues, 0)).toBe(960)
    expect(rebuilt.descriptionHashes).toHaveLength(111)
    expect(rebuilt.nameHashes).toHaveLength(791)
    expect(rebuilt.descriptionHashes).toContain(
      hashExcludedDescription("simple household budgeting and savings app for young families"),
    )
    expect(rebuilt.descriptionHashes).toContain(
      hashExcludedDescription("Predictive servicing for ocean buoys used by North Sea research crews"),
    )
    expect(rebuilt.descriptionHashes).toContain(
      hashExcludedDescription("independent investigative journalism podcast about corporate power"),
    )
    expect(rebuilt.nameHashes).toContain(hashExcludedName("nestwise"))
    expect(rebuilt.nameHashes).toContain(hashExcludedName("Power Minutes"))

    const exportInput = excludedMaterialFromLedger(rebuilt)
    expect(exportInput).toEqual(PILOT_EXCLUDED_MATERIAL)
    expect(GENERATED_PILOT_EXCLUDED_MATERIAL).toEqual(PILOT_EXCLUDED_MATERIAL)
    expect(PILOT_EXCLUDED_MATERIAL_LEDGER_SHA256).toBe(PILOT_EXCLUDED_MATERIAL_LEDGER.ledgerSha256)
    expect(exportInput.descriptions).toBeUndefined()
    expect(exportInput.names).toBeUndefined()
    expect(Object.keys(exportInput).sort()).toEqual(["descriptionHashes", "nameHashes"])
  })

  it("proves all 80 new pilot briefs have no exact excluded-description overlap", () => {
    expect(NAMING_SPECIALIST_BRIEFS).toHaveLength(80)

    const overlaps = findExactExcludedDescriptionOverlaps(
      NAMING_SPECIALIST_BRIEFS,
      PILOT_EXCLUDED_MATERIAL_LEDGER,
    )
    expect(overlaps).toEqual([])
    expect(() =>
      assertNoExactExcludedDescriptions(NAMING_SPECIALIST_BRIEFS, PILOT_EXCLUDED_MATERIAL_LEDGER),
    ).not.toThrow()
  })

  it("reports overlap identifiers and hashes without echoing raw descriptions", () => {
    const known = {
      id: "known-fixed-brief",
      description: "simple household budgeting and savings app for young families",
    }
    const overlaps = findExactExcludedDescriptionOverlaps([known], PILOT_EXCLUDED_MATERIAL_LEDGER)

    expect(overlaps).toEqual([
      {
        id: known.id,
        descriptionHash: hashExcludedDescription(known.description),
      },
    ])
    expect(JSON.stringify(overlaps)).not.toContain(known.description)
  })
})
