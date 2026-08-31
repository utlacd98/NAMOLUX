import { createServiceClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"
import { phoneticKey } from "./collision-registry"
import { getGenericityIndex } from "./eligibility"
import type { NameConstitution, NameSprintRunResult, SemanticTerritory } from "./types"
import { FOUNDER_SIGNAL_V2_VERSION, NAME_SPRINT_VERSION } from "./types"
import { COLLISION_REGISTRY_VERSION } from "./collision-registry"

const PROMPT_VERSION = "name-sprint-multistrategy-v2"

function errorCode(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const source = error as Record<string, unknown>
    const code = typeof source.code === "string" ? source.code : "database_error"
    const message = typeof source.message === "string" ? source.message : "Unknown database error"
    return `${code}:${message}`.slice(0, 240)
  }
  return "unknown"
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

function uuid(value: string | null | undefined) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function persistNameConstitution({
  userId,
  constitution,
  territories,
}: {
  userId: string
  constitution: NameConstitution
  territories: readonly SemanticTerritory[]
}): Promise<string | null> {
  try {
    const service = createServiceClient()
    const { data, error } = await service.from("naming_briefs").insert({
      user_id: userId,
      original_description: constitution.description,
      compiled_brief: asJson({ constitution, territories }),
      naming_mode: constitution.namingMode,
      markets: constitution.geographicMarkets,
      languages: constitution.languages,
      include_terms: constitution.include,
      exclude_terms: constitution.avoid,
      name_sprint_version: NAME_SPRINT_VERSION,
      founder_signal_version: FOUNDER_SIGNAL_V2_VERSION,
      collision_registry_version: COLLISION_REGISTRY_VERSION,
    }).select("id").single()
    if (error) throw error
    return data.id
  } catch (error) {
    console.error("name-sprint-brief-persistence-failed", { code: errorCode(error) })
    return null
  }
}

export async function loadRecentNameSprintFatigue(userId: string): Promise<{
  previouslySeen: string[]
  recentRootFrequency: Record<string, number>
}> {
  try {
    const service = createServiceClient()
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000).toISOString()
    const { data, error } = await service
      .from("candidates")
      .select("normalized_name,roots")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2_000)
    if (error) throw error

    const recentRootFrequency: Record<string, number> = {}
    const previouslySeen = new Set<string>()
    for (const candidate of data || []) {
      if (candidate.normalized_name) previouslySeen.add(candidate.normalized_name)
      for (const root of new Set(candidate.roots || [])) {
        const normalized = root.toLowerCase().replace(/[^a-z0-9]/g, "")
        if (normalized.length >= 2) recentRootFrequency[normalized] = (recentRootFrequency[normalized] || 0) + 1
      }
    }
    return { previouslySeen: Array.from(previouslySeen).slice(0, 120), recentRootFrequency }
  } catch (error) {
    console.error("name-sprint-fatigue-load-failed", { code: errorCode(error) })
    return { previouslySeen: [], recentRootFrequency: {} }
  }
}

export async function startNameSprintRun({
  userId,
  briefId,
  model,
}: {
  userId: string
  briefId: string | null
  model: string
}): Promise<string | null> {
  if (!uuid(briefId)) return null
  try {
    const service = createServiceClient()
    const { data, error } = await service.from("generation_runs").insert({
      user_id: userId,
      brief_id: briefId!,
      model,
      prompt_version: PROMPT_VERSION,
      founder_signal_version: FOUNDER_SIGNAL_V2_VERSION,
      collision_registry_version: COLLISION_REGISTRY_VERSION,
      status: "running",
    }).select("id").single()
    if (error) throw error
    return data.id
  } catch (error) {
    console.error("name-sprint-run-persistence-failed", { code: errorCode(error) })
    return null
  }
}

export async function completeNameSprintRun({
  userId,
  runId,
  constitution,
  result,
  latencyMs,
}: {
  userId: string
  runId: string | null
  constitution: NameConstitution
  result: NameSprintRunResult
  latencyMs: number
}) {
  if (!uuid(runId)) return
  const service = createServiceClient()
  try {
    const displayedById = new Map(result.candidates.map((candidate, index) => [candidate.id, { candidate, index }]))
    const all = [...result.candidates, ...result.rejected]
    const unique = Array.from(new Map(all.map((candidate) => [candidate.normalizedName, candidate])).values())
    const { data: savedCandidates, error: candidateError } = await service.from("candidates").insert(unique.map((candidate) => {
      const displayed = displayedById.get(candidate.id)
      const final = displayed?.candidate
      return {
        user_id: userId,
        generation_run_id: runId!,
        display_name: candidate.name,
        normalized_name: candidate.normalizedName,
        phonetic_key: phoneticKey(candidate.name) || candidate.normalizedName,
        strategy: candidate.strategy,
        semantic_territory: candidate.territoryId,
        roots: candidate.roots,
        pronunciation: candidate.pronunciation || candidate.name.toLowerCase(),
        association: candidate.association || "No generated explanation was retained.",
        claimed_origin: candidate.claimedOrigin,
        origin_verified: candidate.originVerified,
        internal_genericity_score: getGenericityIndex(candidate, constitution),
        eligibility_status: candidate.eligibility.status,
        hard_failure_codes: candidate.eligibility.failureCodes,
        eligibility_reasons: candidate.eligibility.reasons,
        final_dimensions: final ? asJson(final.founderSignal.dimensions) : null,
        final_founder_signal: final?.founderSignal.score ?? null,
        evidence_confidence: final?.founderSignal.confidence ?? null,
        was_displayed: Boolean(displayed),
        display_position: displayed?.index ?? null,
      }
    })).select("id, normalized_name")
    if (candidateError) throw candidateError

    const candidateIds = new Map((savedCandidates || []).map((candidate) => [candidate.normalized_name, candidate.id]))
    const checks = result.candidates.flatMap((candidate) => {
      const candidateId = candidateIds.get(candidate.normalizedName)
      if (!candidateId) return []
      const domainChecks = candidate.domainStatuses.map((domain) => ({
          user_id: userId,
          candidate_id: candidateId,
          check_type: "domain",
          source: "namolux-tiered-domain-check",
          status: domain.status,
          result: asJson({ domain: `${candidate.normalizedName}.${domain.tld}`, tld: domain.tld }),
          checked_at: domain.checkedAt || new Date().toISOString(),
          expires_at: domain.checkedAt ? new Date(new Date(domain.checkedAt).getTime() + 12 * 60 * 60 * 1_000).toISOString() : null,
        }))
      const collisionCheck = candidate.collisionScreen ? [{
        user_id: userId,
        candidate_id: candidateId,
        check_type: "known_brand",
        source: candidate.collisionScreen.status === "not_run" ? "namolux-static-collision-registry" : "namolux-current-web-screen",
        status: candidate.collisionScreen.status === "clear" ? "clear" : "unknown",
        result: asJson(candidate.collisionScreen),
        checked_at: candidate.collisionScreen.checkedAt || new Date().toISOString(),
        expires_at: candidate.collisionScreen.checkedAt
          ? new Date(new Date(candidate.collisionScreen.checkedAt).getTime() + 24 * 60 * 60 * 1_000).toISOString()
          : null,
      }] : []
      return [...domainChecks, ...collisionCheck]
    })
    if (checks.length) {
      const { error: checksError } = await service.from("candidate_checks").insert(checks)
      if (checksError) throw checksError
    }

    const { error: runError } = await service.from("generation_runs").update({
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      estimated_cost_usd: result.usage.estimatedUsd,
      latency_ms: latencyMs,
      retry_count: result.attempts - 1,
      generated_count: result.generatedCount,
      survivor_count: result.survivorCount,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", runId!).eq("user_id", userId)
    if (runError) throw runError
  } catch (error) {
    console.error("name-sprint-result-persistence-failed", { code: errorCode(error) })
    await service.from("generation_runs").update({
      status: "failed",
      failure_code: "persistence_failed",
      completed_at: new Date().toISOString(),
    }).eq("id", runId!).eq("user_id", userId)
  }
}

export async function failNameSprintRun(userId: string, runId: string | null, code: string) {
  if (!uuid(runId)) return
  try {
    const service = createServiceClient()
    await service.from("generation_runs").update({
      status: "failed",
      failure_code: code.slice(0, 160),
      completed_at: new Date().toISOString(),
    }).eq("id", runId!).eq("user_id", userId)
  } catch {
    // The primary generation error is more useful than a secondary persistence error.
  }
}
