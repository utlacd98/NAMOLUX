/**
 * Offline-only source adapter for the naming-specialist pilot.
 *
 * Existing audit fixtures are read in memory and immediately reduced to a
 * hashes-only ledger. No provider, network, database, or generated output is
 * consulted. Consumers should export the ledger or `PILOT_EXCLUDED_MATERIAL`,
 * never the private source array below.
 */
import lunaSixRc1 from "@/tests/generator-quality/artifacts/luna-six-2026-07-15-rc1/names-pack.json"
import solSixRc2 from "@/tests/generator-quality/artifacts/sol-six-2026-07-15-rc2/names-pack.json"
import solSixRc3 from "@/tests/generator-quality/artifacts/sol-six-2026-07-15-rc3/names-pack.json"
import solSixRc4 from "@/tests/generator-quality/artifacts/sol-six-2026-07-15-rc4/names-pack.json"
import solSixRc5 from "@/tests/generator-quality/artifacts/sol-six-2026-07-15-rc5-novelty/names-pack.json"
import solSixRc6 from "@/tests/generator-quality/artifacts/sol-six-2026-07-15-rc6-grounding/names-pack.json"
import { BALANCED_60_PROMPTS } from "@/tests/generator-quality/balanced-60"
import namelixEvaluatorPack from "@/tests/generator-quality/benchmarks/namelix-2026-07-14/evaluator-pack.json"
import { GENERATOR_QUALITY_CORPUS } from "@/tests/generator-quality/corpus"
import { QUICK_HELDOUT_CORPUS } from "@/tests/generator-quality/quick-heldout-corpus"

import {
  buildExcludedMaterialLedger,
  excludedMaterialFromLedger,
  type ExcludedMaterialLedger,
  type ExcludedMaterialSource,
} from "./excluded-material"

interface HistoricalNamesPack {
  cases: readonly {
    brief: string
    names: readonly string[]
  }[]
}

function historicalSource(
  sourceId: string,
  pack: HistoricalNamesPack,
): ExcludedMaterialSource {
  return {
    sourceId,
    descriptions: pack.cases.map((entry) => entry.brief),
    names: pack.cases.flatMap((entry) => entry.names),
  }
}

const PILOT_SOURCES: readonly ExcludedMaterialSource[] = [
  {
    sourceId: "fixed-generator-quality-corpus",
    descriptions: GENERATOR_QUALITY_CORPUS.map((entry) => entry.description),
  },
  {
    sourceId: "balanced-60",
    descriptions: BALANCED_60_PROMPTS.map((entry) => entry.description),
  },
  {
    sourceId: "quick-heldout",
    descriptions: QUICK_HELDOUT_CORPUS.map((entry) => entry.description),
  },
  {
    sourceId: "frozen-namelix-evaluator-2026-07-14",
    descriptions: namelixEvaluatorPack.cases.map((entry) => entry.brief),
    names: namelixEvaluatorPack.cases.flatMap((entry) => [...entry.batchA, ...entry.batchB]),
  },
  historicalSource("historical-luna-six-2026-07-15-rc1", lunaSixRc1),
  historicalSource("historical-sol-six-2026-07-15-rc2", solSixRc2),
  historicalSource("historical-sol-six-2026-07-15-rc3", solSixRc3),
  historicalSource("historical-sol-six-2026-07-15-rc4", solSixRc4),
  historicalSource("historical-sol-six-2026-07-15-rc5-novelty", solSixRc5),
  historicalSource("historical-sol-six-2026-07-15-rc6-grounding", solSixRc6),
]

export function buildPilotExcludedMaterialLedger(): ExcludedMaterialLedger {
  return buildExcludedMaterialLedger(PILOT_SOURCES)
}

export const PILOT_EXCLUDED_MATERIAL_LEDGER = buildPilotExcludedMaterialLedger()

/** Hashes-only compatibility input for `buildTrainingExport`. */
export const PILOT_EXCLUDED_MATERIAL = excludedMaterialFromLedger(PILOT_EXCLUDED_MATERIAL_LEDGER)
