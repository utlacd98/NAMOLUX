import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import {
  NAMING_SPECIALIST_AUTO_BRIEFS,
  NAMING_SPECIALIST_BRIEFS,
} from "@/lib/naming-specialist/briefs"
import { resolveCurationDraft } from "@/lib/naming-specialist/curation"
import { buildTrainingExport, stableSha256 } from "@/lib/naming-specialist/export"
import {
  isLocalCuratorRequest,
  isProtectedPreviewCuratorEnabled,
} from "@/lib/naming-specialist/local-access"
import {
  isValidPreviewCuratorToken,
  PREVIEW_CURATOR_COOKIE,
} from "@/lib/naming-specialist/preview-access"
import {
  PILOT_EXCLUDED_MATERIAL,
  PILOT_EXCLUDED_MATERIAL_LEDGER_SHA256,
} from "@/lib/naming-specialist/pilot-excluded-material.generated"
import type { DatasetSplit, PassReadyCuration } from "@/lib/naming-specialist/types"
import { validateSplitIsolation } from "@/lib/naming-specialist/validation"
import { parseCuratorProgress, parseSourceBlindWorkspace } from "@/lib/naming-specialist/workspace"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ExportRequestBody {
  workspace?: unknown
  progress?: unknown
}

const EXPECTED_SPLIT_COUNTS: Record<DatasetSplit, number> = {
  train: 60,
  validation: 10,
  test: 10,
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return stableSha256(left) === stableSha256(right)
}

function assertEditorialBriefsOnly(
  packs: ReturnType<typeof parseSourceBlindWorkspace>["packs"],
) {
  if (packs.length !== NAMING_SPECIALIST_BRIEFS.length) {
    throw new Error(`Portable export requires all ${NAMING_SPECIALIST_BRIEFS.length} source-blind brief packs`)
  }
  const expectedById = new Map(NAMING_SPECIALIST_AUTO_BRIEFS.map((brief) => [brief.id, brief]))
  for (const pack of packs) {
    const expected = expectedById.get(pack.brief.id)
    if (!expected) throw new Error(`Unknown editorial brief ${pack.brief.id}`)
    const actualContractInput = {
      id: pack.brief.id,
      split: pack.brief.split,
      description: pack.brief.redactedDescription,
      vibe: pack.brief.vibe,
      style: pack.brief.style,
      creativity: pack.brief.creativity,
      maxChars: pack.brief.maxLength,
      maxLength: pack.brief.maxLength,
      rhymeWith: pack.brief.rhymeWith,
      blacklist: pack.brief.blacklist,
      preferences: pack.brief.preferences,
      locale: pack.brief.locale,
      semanticClusterId: pack.brief.semanticClusterId,
    }
    if (!jsonEqual(actualContractInput, expected)) {
      throw new Error(`Brief ${pack.brief.id} differs from the frozen synthetic editorial corpus`)
    }
  }
}

export async function POST(request: Request) {
  const requestHeaders = await headers()
  const local = isLocalCuratorRequest(requestHeaders.get("host"))
  if (!local) {
    if (!isProtectedPreviewCuratorEnabled()) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    const cookieStore = await cookies()
    if (!isValidPreviewCuratorToken(cookieStore.get(PREVIEW_CURATOR_COOKIE)?.value)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  try {
    const body = await request.json() as ExportRequestBody
    const workspace = parseSourceBlindWorkspace(body.workspace)
    const progress = parseCuratorProgress(JSON.stringify(body.progress))
    if (progress.datasetId !== workspace.datasetId) throw new Error("Workspace and progress dataset ids do not match")
    assertEditorialBriefsOnly(workspace.packs)

    const packByBrief = new Map(workspace.packs.map((pack) => [pack.brief.id, pack]))
    const curations: PassReadyCuration[] = []
    for (const brief of NAMING_SPECIALIST_BRIEFS) {
      const pack = packByBrief.get(brief.id)!
      const draft = progress.drafts[brief.id]
      if (!draft) throw new Error(`Missing founder review for ${brief.id}`)
      if (draft.status !== "pass_ready") throw new Error(`${brief.id} is not pass-ready`)
      if (draft.packId !== pack.packId) throw new Error(`${brief.id} review belongs to another source-blind pack`)
      curations.push(resolveCurationDraft(pack, draft))
    }

    const isolation = validateSplitIsolation(curations, PILOT_EXCLUDED_MATERIAL)
    if (!isolation.valid) {
      throw new Error(`Dataset isolation failed: ${isolation.issues.map((issue) => issue.message).join("; ")}`)
    }

    const splitExports = Object.fromEntries((Object.keys(EXPECTED_SPLIT_COUNTS) as DatasetSplit[]).map((split) => {
      const splitCurations = curations.filter((curation) => curation.brief.split === split)
      if (splitCurations.length !== EXPECTED_SPLIT_COUNTS[split]) {
        throw new Error(`${split} requires ${EXPECTED_SPLIT_COUNTS[split]} reviewed briefs, found ${splitCurations.length}`)
      }
      return [split, buildTrainingExport({
        curations: splitCurations,
        split,
        passNumber: 1,
        excludedMaterial: PILOT_EXCLUDED_MATERIAL,
      })]
    })) as Record<DatasetSplit, ReturnType<typeof buildTrainingExport>>

    const manifestBase = {
      schemaVersion: 1 as const,
      datasetId: workspace.datasetId,
      reviewPass: 1 as const,
      counts: EXPECTED_SPLIT_COUNTS,
      corpusSha256: stableSha256(NAMING_SPECIALIST_AUTO_BRIEFS),
      excludedMaterialLedgerSha256: PILOT_EXCLUDED_MATERIAL_LEDGER_SHA256,
      splitManifestSha256: {
        train: splitExports.train.manifest.manifestSha256,
        validation: splitExports.validation.manifest.manifestSha256,
        test: splitExports.test.manifest.manifestSha256,
      },
      uploadPolicy: {
        train: "approval_required_before_upload" as const,
        validation: "approval_required_before_upload" as const,
        test: "internal_only_never_upload" as const,
      },
      provenancePolicy: "private_source_provenance_remains_separate" as const,
    }

    return NextResponse.json({
      ...manifestBase,
      aggregateManifestSha256: stableSha256(manifestBase),
      exports: splitExports,
    }, {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: "invalid_curator_export",
      message: error instanceof Error ? error.message : "The local export could not be validated",
    }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }
}
