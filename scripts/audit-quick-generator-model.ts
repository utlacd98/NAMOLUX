import { mkdir, writeFile } from "node:fs/promises"
import { generateGroqQuickCandidates } from "../lib/domainGen/quickGenerateGroq"
import {
  BALANCED_60_PROMPTS,
  type BalancedGeneratorQualityPrompt,
} from "../tests/generator-quality/balanced-60"
import {
  evaluateGeneratorBatch,
  getGeneratorMechanicalQuality,
} from "../tests/generator-quality/harness"
import {
  assessPublicAutoBatch,
  buildProviderAuditManifest,
  isMateriallyContributingEditorialAttempt,
  MATERIAL_MODEL_CONTRIBUTION_DEFINITION,
  MIN_GLOBAL_MODEL_CANDIDATE_SHARE,
  MIN_MODEL_CONTRIBUTED_BRIEF_RATE,
  type ProviderAttemptForManifest,
  type SuccessfulModelForManifest,
} from "./lib/generator-audit-provenance"

function normaliseName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

function wait(ms: number) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

const TARGETED_RISK_PROMPTS: readonly BalancedGeneratorQualityPrompt[] = [
  {
    id: "risk-privacy-accounting",
    segment: "finance",
    description: "Privacy-first bookkeeping software for independent freelancers",
    industry: "Finance",
    quickVibe: "clean",
    auditVibe: "clean",
    premiumVibe: "minimal",
    maxLength: 12,
    relevanceTerms: ["privacy", "secure", "tax", "ledger", "book"],
  },
  {
    id: "risk-circular-textiles",
    segment: "consumer",
    description: "Circular fashion label using recycled textiles for city commuters",
    industry: "Fashion & Beauty",
    quickVibe: "premium",
    auditVibe: "premium",
    premiumVibe: "luxury",
    maxLength: 12,
    relevanceTerms: ["circular", "recycled", "textile", "thread", "wear"],
  },
  {
    id: "risk-tight-cat-care",
    segment: "local",
    description: "Urban cat sitting service for busy apartment owners",
    industry: "Pet Care",
    quickVibe: "friendly",
    auditVibe: "friendly",
    premiumVibe: "trustworthy",
    maxLength: 6,
    relevanceTerms: ["cat", "pet", "purr", "paw", "home"],
  },
  {
    id: "risk-tight-climate-marketing",
    segment: "b2b",
    description: "Climate technology marketing agency for early stage founders",
    industry: "Marketing & Advertising",
    quickVibe: "bold",
    auditVibe: "bold",
    premiumVibe: "futuristic",
    maxLength: 8,
    relevanceTerms: ["climate", "eco", "brand", "market", "signal"],
  },
  {
    id: "risk-tight-legal-review",
    segment: "b2b",
    description: "Contract review software for small business legal teams",
    industry: "Legal & Professional",
    quickVibe: "clean",
    auditVibe: "clean",
    premiumVibe: "trustworthy",
    maxLength: 10,
    relevanceTerms: ["contract", "terms", "clause", "legal", "brief"],
  },
  {
    id: "risk-rural-telehealth",
    segment: "health",
    description: "Rural telehealth platform for community clinics and patients",
    industry: "Health & Wellness",
    quickVibe: "friendly",
    auditVibe: "friendly",
    premiumVibe: "trustworthy",
    maxLength: 15,
    relevanceTerms: ["health", "care", "clinic", "access", "rural"],
  },
]

const AUDIT_PROMPTS = [...BALANCED_60_PROMPTS, ...TARGETED_RISK_PROMPTS]

function selectedPrompts(limit: number) {
  const requestedIds = (process.env.QUICK_AUDIT_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  if (requestedIds.length === 0) return BALANCED_60_PROMPTS.slice(0, limit)

  const promptsById = new Map(AUDIT_PROMPTS.map((prompt) => [prompt.id, prompt]))
  const unknownIds = requestedIds.filter((id) => !promptsById.has(id))
  if (unknownIds.length > 0) {
    throw new Error(`Unknown QUICK_AUDIT_IDS: ${unknownIds.join(", ")}`)
  }

  return Array.from(new Set(requestedIds))
    .slice(0, limit)
    .map((id) => promptsById.get(id)!)
}

async function run() {
  const startedAt = new Date().toISOString()
  const auditLimit = boundedInteger(process.env.QUICK_AUDIT_LIMIT, BALANCED_60_PROMPTS.length, 1, AUDIT_PROMPTS.length)
  const batchSize = boundedInteger(process.env.QUICK_AUDIT_BATCH_SIZE, 2, 1, 4)
  const delayMs = boundedInteger(process.env.QUICK_AUDIT_DELAY_MS, 0, 0, 60_000)
  const quiet = process.env.QUICK_AUDIT_QUIET === "1"
  const compact = process.env.QUICK_AUDIT_COMPACT === "1"
  const seedPrefix = process.env.QUICK_AUDIT_SEED_PREFIX?.trim() || "model-audit"
  const prompts = selectedPrompts(auditLimit)
  const failures: string[] = []
  let modelCandidates = 0
  let fallbackCandidates = 0
  let modelBackedBriefs = 0
  let modelContributedBriefs = 0
  let publicAutoContractBriefs = 0
  let editoriallyReviewedBriefs = 0
  let materialEditorialAttemptBackedBriefs = 0
  let editorialCandidates = 0
  let totalCandidates = 0
  let perBriefMechanicalFailureCount = 0
  let publicAutoContractFailureCount = 0
  const durationsMs: number[] = []
  const nameBriefs = new Map<string, Set<string>>()
  const providerCounts = new Map<string, number>()
  const fallbackReasonCounts = new Map<string, number>()
  const providerAttempts: ProviderAttemptForManifest[] = []
  const successfulModels: SuccessfulModelForManifest[] = []
  const sealedCaptureRows: Array<Record<string, unknown>> = []
  const namesPackCases: Array<Record<string, unknown>> = []

  // Small batches avoid turning the audit itself into a burst-load test.
  for (let offset = 0; offset < prompts.length; offset += batchSize) {
    const batch = prompts.slice(offset, offset + batchSize)
    const results = await Promise.all(batch.map(async (prompt) => {
      const generated = await generateGroqQuickCandidates({
        description: prompt.description,
        rhymeWith: prompt.rhymeWith,
        vibe: prompt.quickVibe,
        maxChars: prompt.maxLength,
        count: 16,
        seed: `${seedPrefix}:${prompt.id}`,
        requireEditorialReview: true,
      })
      const report = evaluateGeneratorBatch(
        generated.candidates.map((candidate) => ({
          name: candidate.name,
          narrative: candidate.personality,
          roots: candidate.fitRoots,
        })),
        {
          minUniqueCandidates: 16,
          maxLength: prompt.maxLength,
          relevanceTerms: prompt.relevanceTerms,
          minNarrativeCharacters: 70,
          minNarrativeWords: 12,
        },
      )
      return { prompt, generated, report }
    }))

    for (const { prompt, generated, report } of results) {
      modelCandidates += generated.modelCandidateCount
      fallbackCandidates += generated.fallbackCandidateCount
      totalCandidates += generated.candidates.length
      durationsMs.push(generated.durationMs)
      providerCounts.set(generated.provider, (providerCounts.get(generated.provider) || 0) + 1)
      if (generated.fallbackReason) {
        fallbackReasonCounts.set(generated.fallbackReason, (fallbackReasonCounts.get(generated.fallbackReason) || 0) + 1)
      }
      if (generated.modelBacked && generated.modelCandidateCount === 16 && generated.fallbackCandidateCount === 0) {
        modelBackedBriefs += 1
      }
      const hasMateriallyContributingEditorialAttempt = generated.providerAttempts.some(
        isMateriallyContributingEditorialAttempt,
      )
      const publicAutoAssessment = assessPublicAutoBatch({
        candidateCount: generated.candidates.length,
        modelCandidateCount: generated.modelCandidateCount,
        fallbackCandidateCount: generated.fallbackCandidateCount,
        editoriallyReviewed: generated.editoriallyReviewed,
        editorialCandidateCount: generated.editorialCandidateCount,
        materialEditorialAttemptConfirmed: hasMateriallyContributingEditorialAttempt,
      })
      if (hasMateriallyContributingEditorialAttempt) materialEditorialAttemptBackedBriefs += 1
      if (publicAutoAssessment.editoriallyReviewed) editoriallyReviewedBriefs += 1
      editorialCandidates += publicAutoAssessment.editorialCandidateCount
      const modelContribution = publicAutoAssessment.modelContribution
      if (modelContribution.qualifies) modelContributedBriefs += 1
      if (publicAutoAssessment.qualifies) publicAutoContractBriefs += 1
      providerAttempts.push(...generated.providerAttempts.map((attempt) => ({
        provider: attempt.provider,
        model: attempt.model,
        stage: attempt.stage || "generation",
        outcome: attempt.outcome,
        ...(attempt.selectionPoolCandidateCount === undefined
          ? {}
          : { selectionPoolCandidateCount: attempt.selectionPoolCandidateCount }),
      })))
      successfulModels.push({ provider: generated.provider, model: generated.model })
      for (const candidate of generated.candidates) {
        const normalised = normaliseName(candidate.name)
        if (!normalised) continue
        const briefs = nameBriefs.get(normalised) || new Set<string>()
        briefs.add(prompt.id)
        nameBriefs.set(normalised, briefs)
      }

      // Surface relevance and shortlist depth are creative judgments. A model
      // name can be relevant through an honest non-literal metaphor, while a
      // visible category root can still be a weak name. Preserve the relevance
      // metric as diagnostic evidence, but never turn it into a mechanical
      // quality pass or fail. Blind scorecards own that release decision.
      const mechanicalReport = getGeneratorMechanicalQuality(report)
      const promptIssues = [...mechanicalReport.issues]
      if (!hasMateriallyContributingEditorialAttempt) {
        promptIssues.push("public Auto batch has no materially contributing editorial provider attempt")
      }
      const constructionTruthIssues = generated.candidates.filter((candidate) => {
        const parts = candidate.constructionParts || []
        const joined = parts.join("")
        if (parts.length > 0 && (parts.length !== 2 || joined !== normaliseName(candidate.name))) return true
        if (parts.length === 2 && (candidate.style === "evocative" || candidate.style === "real_word")) return true
        if (parts.length === 2 && /sound-led abstract/i.test(candidate.personality)) return true
        if (candidate.style === "compound" && parts.length !== 2) return true
        return false
      })
      if (constructionTruthIssues.length > 0) {
        promptIssues.push(`construction/style/rationale truth failures: ${constructionTruthIssues.map((candidate) => candidate.name).join(", ")}`)
      }
      if (promptIssues.length > 0) {
        perBriefMechanicalFailureCount += 1
      }
      if (!publicAutoAssessment.qualifies) {
        publicAutoContractFailureCount += 1
        promptIssues.push(`public Auto production contract failures: ${publicAutoAssessment.failures.join(", ")}`)
      }
      if (promptIssues.length > 0) {
        failures.push(`${prompt.id}: ${promptIssues.join("; ")}`)
      }
      const captureRow = {
        id: prompt.id,
        brief: prompt.description,
        vibe: prompt.auditVibe,
        maxLength: prompt.maxLength,
        requestedStyle: "auto",
        requestedCreativity: "balanced",
        mechanicalScore: mechanicalReport.score,
        creativeReviewStatus: "pending_blind_review",
        shortlistWorthy: null,
        model: generated.modelCandidateCount,
        materialModelContribution: generated.modelCandidateCount,
        fallback: generated.fallbackCandidateCount,
        modelContributionDefinition: MATERIAL_MODEL_CONTRIBUTION_DEFINITION,
        modelCandidateShare: Number((modelContribution.modelCandidateShare * 100).toFixed(1)),
        requiredModelCandidates: modelContribution.requiredModelCandidateCount,
        modelContributionQualified: modelContribution.qualifies,
        materialEditorialAttemptQualified: hasMateriallyContributingEditorialAttempt,
        publicAutoContractQualified: publicAutoAssessment.qualifies,
        publicAutoContractFailures: publicAutoAssessment.failures,
        reason: generated.fallbackReason || null,
        provider: generated.provider,
        attempts: generated.providerAttempts,
        durationMs: generated.durationMs,
        editoriallyReviewed: generated.editoriallyReviewed,
        editorialCandidateCount: generated.editorialCandidateCount,
        styleFulfilled: generated.styleFulfilled,
        styleShortfallReason: generated.styleShortfallReason || null,
        names: generated.candidates.map((candidate) => candidate.name),
        candidates: generated.candidates.map((candidate, index) => ({
          name: candidate.name,
          source: index < generated.modelCandidateCount ? "model_contributed" : "fallback",
          rationale: candidate.personality,
          style: candidate.style,
          fitRoots: [...(candidate.fitRoots || [])],
          fitCues: [...(candidate.fitCues || [])],
          constructionParts: [...(candidate.constructionParts || [])],
        })),
      }
      sealedCaptureRows.push(captureRow)
      namesPackCases.push({
        id: prompt.id,
        brief: prompt.description,
        vibe: prompt.auditVibe,
        controls: { style: "auto", creativity: "balanced", maxLength: prompt.maxLength },
        names: generated.candidates.map((candidate) => candidate.name),
      })
      if (!quiet) {
        const printableRow = compact
          ? Object.fromEntries(Object.entries(captureRow).filter(([key]) => key !== "candidates"))
          : captureRow
        console.log(JSON.stringify(printableRow))
      }
    }
    if (offset + batchSize < prompts.length) await wait(delayMs)
  }

  const crossNicheDuplicateOccurrences = [...nameBriefs.values()]
    .reduce((total, briefs) => total + Math.max(0, briefs.size - 1), 0)
  const topCrossNicheDuplicates = [...nameBriefs.entries()]
    .filter(([, briefs]) => briefs.size > 1)
    .map(([name, briefs]) => ({ name, occurrences: briefs.size, briefs: [...briefs].sort() }))
    .sort((a, b) => b.occurrences - a.occurrences || a.name.localeCompare(b.name))
    .slice(0, 30)
  const crossNicheDuplicateRate = totalCandidates > 0 ? crossNicheDuplicateOccurrences / totalCandidates : 0
  const modelBackedRate = prompts.length > 0 ? modelBackedBriefs / prompts.length : 0
  const modelContributedBriefRate = prompts.length > 0 ? modelContributedBriefs / prompts.length : 0
  const modelCandidateRate = totalCandidates > 0 ? modelCandidates / totalCandidates : 0
  const fallbackCandidateRate = totalCandidates > 0 ? fallbackCandidates / totalCandidates : 0
  const sortedDurations = [...durationsMs].sort((a, b) => a - b)
  const p95DurationMs = sortedDurations.length > 0
    ? sortedDurations[Math.min(sortedDurations.length - 1, Math.ceil(sortedDurations.length * 0.95) - 1)]
    : 0
  if (crossNicheDuplicateRate > 0.01) {
    failures.push(`cross-niche exact duplication ${(crossNicheDuplicateRate * 100).toFixed(2)}% exceeds 1%`)
  }
  const perBriefMechanicalPassed = perBriefMechanicalFailureCount === 0
  if (modelContributedBriefRate !== MIN_MODEL_CONTRIBUTED_BRIEF_RATE) {
    failures.push(
      `fully model-contributed briefs ${(modelContributedBriefRate * 100).toFixed(1)}% must be ${(MIN_MODEL_CONTRIBUTED_BRIEF_RATE * 100).toFixed(0)}%`,
    )
  }
  if (modelCandidateRate !== MIN_GLOBAL_MODEL_CANDIDATE_SHARE) {
    failures.push(
      `materially model-contributed candidates ${(modelCandidateRate * 100).toFixed(1)}% of the audit output must be ${(MIN_GLOBAL_MODEL_CANDIDATE_SHARE * 100).toFixed(0)}%`,
    )
  }
  if (p95DurationMs > 7_000) {
    failures.push(`direct generator p95 ${p95DurationMs}ms leaves insufficient headroom for the 8-second names-visible gate`)
  }

  const completedAt = new Date().toISOString()
  const auditManifest = buildProviderAuditManifest({
    startedAt,
    completedAt,
    auditConfig: {
      requestedBriefs: prompts.length,
      batchSize,
      delayMs,
      quiet,
      seedPrefix,
    },
    attempts: providerAttempts,
    successfulModels,
  })
  const summaryArtifact = {
    schemaVersion: 3,
    artifactType: "quick-generator-live-provider-audit-summary",
    auditManifest,
    summary: {
      briefs: prompts.length,
      modelBackedBriefs,
      modelBackedRate: Number((modelBackedRate * 100).toFixed(1)),
      modelContributedBriefs,
      modelContributedBriefRate: Number((modelContributedBriefRate * 100).toFixed(1)),
      publicAutoContractBriefs,
      editoriallyReviewedBriefs,
      // Retained for artifact-reader compatibility; qualification now requires
      // either a creative editor or a selector choosing from a genuine surplus.
      editorialAttemptBackedBriefs: materialEditorialAttemptBackedBriefs,
      materialEditorialAttemptBackedBriefs,
      editorialCandidates,
      modelCandidates,
      materiallyModelContributedCandidates: modelCandidates,
      modelContributionDefinition: MATERIAL_MODEL_CONTRIBUTION_DEFINITION,
      fallbackCandidates,
      modelCandidateRate: Number((modelCandidateRate * 100).toFixed(1)),
      fallbackCandidateRate: Number((fallbackCandidateRate * 100).toFixed(1)),
      crossNicheDuplicateRate: Number((crossNicheDuplicateRate * 100).toFixed(2)),
      p95DurationMs,
      maxDurationMs: sortedDurations.at(-1) || 0,
      providers: Object.fromEntries([...providerCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
      fallbackReasons: Object.fromEntries([...fallbackReasonCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
      topCrossNicheDuplicates,
      gates: {
        perBriefMechanicalPassed,
        publicAutoContractPassedForEveryBrief: publicAutoContractFailureCount === 0,
        readyEditorialAttemptForEveryBrief: materialEditorialAttemptBackedBriefs === prompts.length,
        materialEditorialAttemptForEveryBrief:
          materialEditorialAttemptBackedBriefs === prompts.length,
        creativeQualityRequiresBlindReview: true,
        crossNicheExactDuplicationAtMost1Percent: crossNicheDuplicateRate <= 0.01,
        modelContributionAt100Percent:
          modelContributedBriefRate === MIN_MODEL_CONTRIBUTED_BRIEF_RATE,
        materialModelContributionAt100Percent:
          modelContributedBriefRate === MIN_MODEL_CONTRIBUTED_BRIEF_RATE,
        modelCandidateShareAt100Percent:
          modelCandidateRate === MIN_GLOBAL_MODEL_CANDIDATE_SHARE,
        directGeneratorP95AtMost7Seconds: p95DurationMs <= 7_000,
      },
      failures: failures.length,
    },
  }
  console.log(JSON.stringify(summaryArtifact))

  const outputDir = process.env.QUICK_AUDIT_OUTPUT_DIR?.trim()
  if (outputDir) {
    await mkdir(outputDir, { recursive: true })
    await Promise.all([
      writeFile(`${outputDir}/sealed-capture.jsonl`, `${sealedCaptureRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8"),
      writeFile(`${outputDir}/names-pack.json`, `${JSON.stringify({
        schemaVersion: 1,
        artifactType: "quick-generator-blind-names-pack",
        cases: namesPackCases,
      }, null, 2)}\n`, "utf8"),
      writeFile(`${outputDir}/summary.json`, `${JSON.stringify(summaryArtifact, null, 2)}\n`, "utf8"),
    ])
  }

  if (failures.length > 0) {
    throw new Error(`Model audit failed:\n${failures.join("\n")}`)
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
