import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  assessModelContribution,
  assessPublicAutoBatch,
  buildProviderAuditManifest,
  GENERATOR_IMPLEMENTATION_FILES,
  hashGeneratorImplementation,
  isMateriallyContributingEditorialAttempt,
  MATERIAL_MODEL_CONTRIBUTION_DEFINITION,
  MIN_EDITORIAL_SELECTION_POOL_CANDIDATE_COUNT,
  MIN_GLOBAL_MODEL_CANDIDATE_SHARE,
  MIN_MODEL_CANDIDATES_PER_BRIEF,
  MIN_MODEL_CANDIDATE_SHARE_PER_BRIEF,
  MIN_MODEL_CONTRIBUTED_BRIEF_RATE,
} from "../../scripts/lib/generator-audit-provenance"

describe("provider audit integrity", () => {
  it("binds generation and rationale implementation files into one hash", () => {
    expect(GENERATOR_IMPLEMENTATION_FILES).toContain("lib/domainGen/quickAutoContract.ts")
    expect(GENERATOR_IMPLEMENTATION_FILES).toContain("lib/domainGen/quickRationale.ts")
    expect(GENERATOR_IMPLEMENTATION_FILES).toContain("lib/domainGen/quickRationaleAdapter.ts")
    expect(hashGeneratorImplementation()).toMatch(/^[a-f0-9]{64}$/)
  })

  it("requires every public Auto candidate to be materially model-contributed", () => {
    expect(assessModelContribution(15, 16)).toMatchObject({
      modelCandidateShare: 15 / 16,
      requiredModelCandidateCount: 16,
      qualifies: false,
    })
    expect(assessModelContribution(16, 16)).toMatchObject({
      modelCandidateShare: 1,
      requiredModelCandidateCount: 16,
      qualifies: true,
    })
    expect(assessModelContribution(16, 17).qualifies).toBe(false)
    expect(MIN_MODEL_CANDIDATES_PER_BRIEF).toBe(16)
    expect(MIN_MODEL_CANDIDATE_SHARE_PER_BRIEF).toBe(1)
    expect(MIN_MODEL_CONTRIBUTED_BRIEF_RATE).toBe(1)
    expect(MIN_GLOBAL_MODEL_CANDIDATE_SHARE).toBe(1)
  })

  it("accepts creative editors but requires selector review to choose from a genuine surplus", () => {
    expect(isMateriallyContributingEditorialAttempt({
      stage: "editorial",
      outcome: "ready",
    })).toBe(true)
    expect(isMateriallyContributingEditorialAttempt({
      stage: "generation",
      outcome: "ready",
    })).toBe(false)
    expect(isMateriallyContributingEditorialAttempt({
      stage: "editorial",
      outcome: "ready",
      selectionPoolCandidateCount: 16,
    })).toBe(false)
    expect(isMateriallyContributingEditorialAttempt({
      stage: "editorial",
      outcome: "ready",
      selectionPoolCandidateCount: 23,
    })).toBe(false)
    expect(isMateriallyContributingEditorialAttempt({
      stage: "editorial",
      outcome: "ready",
      selectionPoolCandidateCount: 24,
    })).toBe(true)
    expect(MIN_EDITORIAL_SELECTION_POOL_CANDIDATE_COUNT).toBeGreaterThan(16)
    expect(MIN_EDITORIAL_SELECTION_POOL_CANDIDATE_COUNT).toBe(24)
  })

  it("requires a complete editorially reviewed Auto batch with no fallback", () => {
    expect(assessPublicAutoBatch({
      candidateCount: 16,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
      materialEditorialAttemptConfirmed: true,
    })).toMatchObject({
      failures: [],
      qualifies: true,
    })

    expect(assessPublicAutoBatch({
      candidateCount: 16,
      modelCandidateCount: 15,
      fallbackCandidateCount: 1,
      editoriallyReviewed: false,
      editorialCandidateCount: 15,
      materialEditorialAttemptConfirmed: false,
    })).toMatchObject({
      failures: [
        "model_candidate_count_not_16",
        "fallback_candidates_present",
        "editorial_review_unconfirmed",
        "editorial_candidate_count_not_16",
        "material_editorial_attempt_unconfirmed",
      ],
      qualifies: false,
    })

    expect(assessPublicAutoBatch({
      candidateCount: 16,
      modelCandidateCount: 16,
      fallbackCandidateCount: 0,
      editoriallyReviewed: true,
      editorialCandidateCount: 16,
      materialEditorialAttemptConfirmed: isMateriallyContributingEditorialAttempt({
        stage: "editorial",
        outcome: "ready",
        selectionPoolCandidateCount: 16,
      }),
    })).toMatchObject({
      failures: ["material_editorial_attempt_unconfirmed"],
      qualifies: false,
    })
  })

  it("wires the production Auto contract and unchanged operational ceilings into the live audit", () => {
    const source = readFileSync(
      new URL("../../scripts/audit-quick-generator-model.ts", import.meta.url),
      "utf8",
    )

    expect(source).toContain("assessPublicAutoBatch({")
    expect(source).toContain("requireEditorialReview: true")
    expect(source).toContain("process.env.QUICK_AUDIT_SEED_PREFIX")
    expect(source).toContain("seed: `${seedPrefix}:${prompt.id}`")
    expect(source).toContain("seedPrefix,")
    expect(source).toContain('"risk-privacy-accounting"')
    expect(source).toContain('"risk-tight-cat-care"')
    expect(source).toContain('"risk-tight-climate-marketing"')
    expect(source).toContain("minUniqueCandidates: 16")
    expect(source).toContain("isMateriallyContributingEditorialAttempt")
    expect(source).toContain("materialEditorialAttemptConfirmed: hasMateriallyContributingEditorialAttempt")
    expect(source).toContain('promptIssues.push("public Auto batch has no materially contributing editorial provider attempt")')
    expect(source).toContain('stage: attempt.stage || "generation"')
    expect(source).toContain("selectionPoolCandidateCount: attempt.selectionPoolCandidateCount")
    expect(source).toContain('"model_contributed"')
    expect(source).toContain("publicAutoContractPassedForEveryBrief")
    expect(source).toContain("materialEditorialAttemptForEveryBrief:")
    expect(source).toContain("modelContributionAt100Percent")
    expect(source).toContain("materialModelContributionAt100Percent")
    expect(source).toContain("modelCandidateShareAt100Percent")
    expect(source).toContain("crossNicheDuplicateRate > 0.01")
    expect(source).toContain("p95DurationMs > 7_000")
    expect(source).not.toContain("meaningfulModelContributionAtLeast90Percent")
    expect(source).not.toContain("modelCandidateShareAtLeast25Percent")
  })

  it("records reproducible provenance without serialising credential values", () => {
    const manifest = buildProviderAuditManifest({
      startedAt: "2026-07-15T00:00:00.000Z",
      completedAt: "2026-07-15T00:01:00.000Z",
      env: {
        NODE_ENV: "test",
        GROQ_API_KEY: "do-not-record-groq",
        OPENAI_API_KEY: "do-not-record-openai",
        GROQ_QUICK_MODE: "ignored",
      },
      auditConfig: {
        requestedBriefs: 12,
        batchSize: 1,
        delayMs: 20_000,
        quiet: false,
        seedPrefix: "release-live-a",
      },
      attempts: [
        { provider: "groq", model: "model-a", stage: "generation", outcome: "ready" },
        { provider: "groq", model: "model-a", stage: "generation", outcome: "http_error" },
        { provider: "groq", model: "model-a", stage: "editorial", outcome: "ready" },
        { provider: "openai", model: "model-b", stage: "editorial", outcome: "ready" },
        {
          provider: "groq",
          model: "model-selector",
          stage: "editorial",
          outcome: "ready",
          selectionPoolCandidateCount: 24,
        },
        {
          provider: "groq",
          model: "model-selector",
          stage: "editorial",
          outcome: "no_valid_names",
          selectionPoolCandidateCount: 16,
        },
      ],
      successfulModels: [
        { provider: "groq", model: "model-a" },
        { provider: "groq", model: "model-a" },
        { provider: "deterministic", model: null },
      ],
    })

    expect(manifest.implementation.files).toEqual([...GENERATOR_IMPLEMENTATION_FILES])
    expect(manifest.environment.auditConfig.seedPrefix).toBe("release-live-a")
    expect(manifest.implementation.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(manifest.environment.providerCredentialsPresent).toEqual({
      groq: true,
      openai: true,
      vercelGateway: false,
    })
    expect(manifest.models.attempted).toContainEqual({
      provider: "groq",
      model: "model-a",
      stage: "generation",
      attempts: 2,
      outcomes: { http_error: 1, ready: 1 },
    })
    expect(manifest.models.attempted).toContainEqual({
      provider: "groq",
      model: "model-a",
      stage: "editorial",
      attempts: 1,
      outcomes: { ready: 1 },
    })
    expect(
      manifest.models.attempted.filter((attempt) => attempt.provider === "groq" && attempt.model === "model-a"),
    ).toHaveLength(2)
    expect(manifest.models.attempted).toContainEqual({
      provider: "groq",
      model: "model-selector",
      stage: "editorial",
      selectionPoolCandidateCount: 24,
      attempts: 1,
      outcomes: { ready: 1 },
    })
    expect(manifest.models.attempted).toContainEqual({
      provider: "groq",
      model: "model-selector",
      stage: "editorial",
      selectionPoolCandidateCount: 16,
      attempts: 1,
      outcomes: { no_valid_names: 1 },
    })
    expect(manifest.models.successful).toContainEqual({
      provider: "groq",
      model: "model-a",
      briefs: 2,
    })
    expect(manifest.contributionGate).toEqual({
      definition: MATERIAL_MODEL_CONTRIBUTION_DEFINITION,
      minimumCandidatesPerBrief: 16,
      minimumCandidateSharePerBrief: 1,
      minimumContributedBriefRate: 1,
      minimumGlobalCandidateShare: 1,
      minimumEditorialSelectionPoolCandidateCount: 24,
    })
    expect(JSON.stringify(manifest)).not.toContain("do-not-record")
  })
})
