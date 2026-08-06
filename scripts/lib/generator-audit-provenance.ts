import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export const GENERATOR_IMPLEMENTATION_FILES = [
  "lib/domainGen/filters.ts",
  "lib/domainGen/generatedName.ts",
  "lib/domainGen/quickAutoContract.ts",
  "lib/domainGen/quickGenerate.ts",
  "lib/domainGen/quickGenerateGroq.ts",
  "lib/domainGen/quickRationale.ts",
  "lib/domainGen/quickRationaleAdapter.ts",
  "lib/domainGen/realness.ts",
] as const

export const PUBLIC_AUTO_CANDIDATE_COUNT = 16
export const MIN_MODEL_CANDIDATES_PER_BRIEF = PUBLIC_AUTO_CANDIDATE_COUNT
export const MIN_MODEL_CANDIDATE_SHARE_PER_BRIEF = 1
export const MIN_MODEL_CONTRIBUTED_BRIEF_RATE = 1
export const MIN_GLOBAL_MODEL_CANDIDATE_SHARE = 1
export const MIN_EDITORIAL_SELECTION_POOL_CANDIDATE_COUNT = 24
export const MATERIAL_MODEL_CONTRIBUTION_DEFINITION =
  "provider_authored_edited_or_selected_from_genuine_surplus" as const

export interface ModelContributionAssessment {
  /**
   * Historical runtime field name. A counted candidate may be authored or
   * edited by a provider, or selected verbatim from a genuine private surplus.
   */
  modelCandidateCount: number
  totalCandidateCount: number
  modelCandidateShare: number
  requiredModelCandidateCount: number
  qualifies: boolean
}

export type PublicAutoBatchContractFailure =
  | "candidate_count_not_16"
  | "model_candidate_count_not_16"
  | "fallback_candidates_present"
  | "editorial_review_unconfirmed"
  | "editorial_candidate_count_not_16"
  | "material_editorial_attempt_unconfirmed"
  | "candidate_accounting_inconsistent"

export interface PublicAutoBatchAssessmentInput {
  candidateCount: number
  modelCandidateCount: number
  fallbackCandidateCount: number
  editoriallyReviewed: boolean
  editorialCandidateCount: number
  materialEditorialAttemptConfirmed: boolean
}

export interface PublicAutoBatchAssessment {
  candidateCount: number
  modelCandidateCount: number
  fallbackCandidateCount: number
  editoriallyReviewed: boolean
  editorialCandidateCount: number
  materialEditorialAttemptConfirmed: boolean
  modelContribution: ModelContributionAssessment
  failures: PublicAutoBatchContractFailure[]
  qualifies: boolean
}

export interface ProviderAttemptForManifest {
  provider: string
  model: string
  stage?: "generation" | "editorial"
  outcome: string
  /** Count only; private choice-set contents must never enter audit artifacts. */
  selectionPoolCandidateCount?: number
}

export interface SuccessfulModelForManifest {
  provider: string
  model: string | null
}

export interface ProviderAuditManifestOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  startedAt: string
  completedAt: string
  auditConfig: {
    requestedBriefs: number
    batchSize: number
    delayMs: number
    quiet: boolean
    seedPrefix?: string
  }
  attempts: ProviderAttemptForManifest[]
  successfulModels: SuccessfulModelForManifest[]
}

function sha256BufferParts(parts: Array<string | Buffer>): string {
  const hash = createHash("sha256")
  for (const part of parts) hash.update(part)
  return hash.digest("hex")
}

export function hashGeneratorImplementation(
  cwd = process.cwd(),
  files: readonly string[] = GENERATOR_IMPLEMENTATION_FILES,
): string {
  const parts: Array<string | Buffer> = []
  for (const file of files) {
    parts.push(`${file}\0`, readFileSync(resolve(cwd, file)), "\0")
  }
  return sha256BufferParts(parts)
}

export function assessModelContribution(
  modelCandidateCount: number,
  totalCandidateCount: number,
): ModelContributionAssessment {
  const safeTotal = Math.max(0, Math.trunc(totalCandidateCount))
  const safeModel = Math.min(safeTotal, Math.max(0, Math.trunc(modelCandidateCount)))
  const requiredModelCandidateCount = Math.max(
    MIN_MODEL_CANDIDATES_PER_BRIEF,
    Math.ceil(safeTotal * MIN_MODEL_CANDIDATE_SHARE_PER_BRIEF),
  )
  const modelCandidateShare = safeTotal > 0 ? safeModel / safeTotal : 0
  return {
    modelCandidateCount: safeModel,
    totalCandidateCount: safeTotal,
    modelCandidateShare,
    requiredModelCandidateCount,
    qualifies: safeTotal > 0
      && safeModel >= requiredModelCandidateCount
      && modelCandidateShare >= MIN_MODEL_CANDIDATE_SHARE_PER_BRIEF,
  }
}

function safeCandidateCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

/**
 * A normal creative editor materially contributes by authoring or editing the
 * returned shortlist, so it has no selection-pool field. A selector-style
 * reviewer contributes only when it makes a real choice from a private surplus;
 * forcing it to echo the same sixteen public slots is not editorial review.
 */
export function isMateriallyContributingEditorialAttempt(
  attempt: Pick<
    ProviderAttemptForManifest,
    "stage" | "outcome" | "selectionPoolCandidateCount"
  >,
): boolean {
  if (attempt.stage !== "editorial" || attempt.outcome !== "ready") return false
  if (attempt.selectionPoolCandidateCount === undefined) return true
  return safeCandidateCount(attempt.selectionPoolCandidateCount)
    >= MIN_EDITORIAL_SELECTION_POOL_CANDIDATE_COUNT
}

/**
 * Mirrors the public Quick Auto publication contract. This is intentionally
 * stricter than "some provider contribution": every displayed candidate must
 * be materially model-contributed (authored, edited, or selected from a genuine
 * private surplus) and must have passed the bounded editorial review.
 */
export function assessPublicAutoBatch(
  input: PublicAutoBatchAssessmentInput,
): PublicAutoBatchAssessment {
  const candidateCount = safeCandidateCount(input.candidateCount)
  const modelCandidateCount = safeCandidateCount(input.modelCandidateCount)
  const fallbackCandidateCount = safeCandidateCount(input.fallbackCandidateCount)
  const editorialCandidateCount = safeCandidateCount(input.editorialCandidateCount)
  const editoriallyReviewed = input.editoriallyReviewed === true
  const materialEditorialAttemptConfirmed = input.materialEditorialAttemptConfirmed === true
  const modelContribution = assessModelContribution(modelCandidateCount, candidateCount)
  const failures: PublicAutoBatchContractFailure[] = []

  if (candidateCount !== PUBLIC_AUTO_CANDIDATE_COUNT) failures.push("candidate_count_not_16")
  if (modelCandidateCount !== PUBLIC_AUTO_CANDIDATE_COUNT) failures.push("model_candidate_count_not_16")
  if (fallbackCandidateCount !== 0) failures.push("fallback_candidates_present")
  if (!editoriallyReviewed) failures.push("editorial_review_unconfirmed")
  if (editorialCandidateCount !== PUBLIC_AUTO_CANDIDATE_COUNT) {
    failures.push("editorial_candidate_count_not_16")
  }
  if (!materialEditorialAttemptConfirmed) failures.push("material_editorial_attempt_unconfirmed")
  if (modelCandidateCount + fallbackCandidateCount !== candidateCount) {
    failures.push("candidate_accounting_inconsistent")
  }

  return {
    candidateCount,
    modelCandidateCount,
    fallbackCandidateCount,
    editoriallyReviewed,
    editorialCandidateCount,
    materialEditorialAttemptConfirmed,
    modelContribution,
    failures,
    qualifies: failures.length === 0 && modelContribution.qualifies,
  }
}

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null
  }
}

function aggregateModelAttempts(attempts: ProviderAttemptForManifest[]) {
  const entries = new Map<string, {
    provider: string
    model: string
    stage: "generation" | "editorial"
    selectionPoolCandidateCount?: number
    attempts: number
    outcomes: Record<string, number>
  }>()
  for (const attempt of attempts) {
    const stage = attempt.stage || "generation"
    const selectionPoolCandidateCount = attempt.selectionPoolCandidateCount === undefined
      ? undefined
      : safeCandidateCount(attempt.selectionPoolCandidateCount)
    const key = `${attempt.provider}\0${attempt.model}\0${stage}\0${selectionPoolCandidateCount ?? ""}`
    const current = entries.get(key) || {
      provider: attempt.provider,
      model: attempt.model,
      stage,
      ...(selectionPoolCandidateCount === undefined ? {} : { selectionPoolCandidateCount }),
      attempts: 0,
      outcomes: {},
    }
    current.attempts += 1
    current.outcomes[attempt.outcome] = (current.outcomes[attempt.outcome] || 0) + 1
    entries.set(key, current)
  }
  return [...entries.values()]
    .map((entry) => ({
      ...entry,
      outcomes: Object.fromEntries(
        Object.entries(entry.outcomes).sort(([left], [right]) => left.localeCompare(right)),
      ),
    }))
    .sort((left, right) => left.provider.localeCompare(right.provider)
      || left.model.localeCompare(right.model)
      || left.stage.localeCompare(right.stage)
      || (left.selectionPoolCandidateCount ?? -1) - (right.selectionPoolCandidateCount ?? -1))
}

function aggregateSuccessfulModels(models: SuccessfulModelForManifest[]) {
  const counts = new Map<string, { provider: string; model: string | null; briefs: number }>()
  for (const entry of models) {
    const key = `${entry.provider}\0${entry.model || ""}`
    const current = counts.get(key) || { ...entry, briefs: 0 }
    current.briefs += 1
    counts.set(key, current)
  }
  return [...counts.values()]
    .sort((left, right) => left.provider.localeCompare(right.provider)
      || (left.model || "").localeCompare(right.model || ""))
}

export function buildProviderAuditManifest(options: ProviderAuditManifestOptions) {
  const cwd = options.cwd || process.cwd()
  const env = options.env || process.env
  const status = git(cwd, ["status", "--porcelain=v1"])
  return {
    schemaVersion: 1 as const,
    artifactType: "quick-generator-live-provider-audit" as const,
    startedAt: options.startedAt,
    completedAt: options.completedAt,
    implementation: {
      files: [...GENERATOR_IMPLEMENTATION_FILES],
      sha256: hashGeneratorImplementation(cwd),
    },
    git: {
      head: git(cwd, ["rev-parse", "HEAD"]),
      branch: git(cwd, ["branch", "--show-current"]),
      workingTreeDirty: status === null ? null : status.length > 0,
      statusSha256: status === null ? null : sha256BufferParts([status]),
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    environment: {
      providerCredentialsPresent: {
        groq: Boolean(env.GROQ_API_KEY?.trim()),
        openai: Boolean(env.OPENAI_API_KEY?.trim()),
        vercelGateway: Boolean(env.AI_GATEWAY_API_KEY?.trim() || env.VERCEL_OIDC_TOKEN?.trim()),
      },
      modelOverridePresent: {
        groqSingle: Boolean(env.GROQ_QUICK_MODEL?.trim()),
        groqList: Boolean(env.GROQ_QUICK_MODELS?.trim()),
        openai: Boolean(env.OPENAI_QUICK_MODEL?.trim()),
        vercelGateway: Boolean(env.AI_GATEWAY_QUICK_MODEL?.trim()),
      },
      auditConfig: options.auditConfig,
    },
    models: {
      attempted: aggregateModelAttempts(options.attempts),
      successful: aggregateSuccessfulModels(options.successfulModels),
    },
    contributionGate: {
      definition: MATERIAL_MODEL_CONTRIBUTION_DEFINITION,
      minimumCandidatesPerBrief: MIN_MODEL_CANDIDATES_PER_BRIEF,
      minimumCandidateSharePerBrief: MIN_MODEL_CANDIDATE_SHARE_PER_BRIEF,
      minimumContributedBriefRate: MIN_MODEL_CONTRIBUTED_BRIEF_RATE,
      minimumGlobalCandidateShare: MIN_GLOBAL_MODEL_CANDIDATE_SHARE,
      minimumEditorialSelectionPoolCandidateCount: MIN_EDITORIAL_SELECTION_POOL_CANDIDATE_COUNT,
    },
  }
}
