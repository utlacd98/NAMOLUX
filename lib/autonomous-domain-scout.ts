import { randomUUID } from "node:crypto"
import { send } from "@vercel/queue"
import { getScoutReleaseState } from "@/lib/agent-release-flags"
import { checkAvailabilityBatch } from "@/lib/domainGen/availability"
import { scoreName } from "@/lib/founderSignal/scoreName"
import { generateLabCandidates, getLabNamingModel, parseLabBrief, type LabBrief, type LabTld } from "@/lib/lab-name-generator"
import { getPlanConfig } from "@/lib/plans"
import type { SeoMonitoringPrincipal } from "@/lib/seo-monitoring-access"
import { createServiceClient } from "@/lib/supabase/server"

export const DOMAIN_SCOUT_TOPIC = "domain-scout-v1"
const TLDS = ["com", "io", "co", "ai", "app", "dev"] as const
export const SCOUT_FOUNDER_SIGNAL_FLOOR = 65
export const SCOUT_STRONG_SIGNAL_FLOOR = 75
export const SCOUT_MODE_BUDGETS = {
  15: { creditCost: 1, maxWaves: 2, maxCandidates: 32, maxAvailabilityChecks: 192 },
  30: { creditCost: 2, maxWaves: 4, maxCandidates: 64, maxAvailabilityChecks: 384 },
  60: { creditCost: 4, maxWaves: 8, maxCandidates: 128, maxAvailabilityChecks: 768 },
} as const

export type ScoutMode = keyof typeof SCOUT_MODE_BUDGETS
export type DomainScoutMessage = { runId: string; userId: string }

export class DomainScoutError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message) }
}

function monthStart() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

function assertScoutEnabled(principal: SeoMonitoringPrincipal) {
  const release = getScoutReleaseState(principal.email)
  if (!release.configured) throw new DomainScoutError("feature_disabled", "Autonomous Domain Scout is not enabled.", 404)
  if (!release.enabled) throw new DomainScoutError("quality_gate_closed", "Scout remains private until the generator quality gate passes.", 503)
}

async function addEvent(service: any, run: any, phase: string, eventType: string, message: string, details: Record<string, unknown> = {}) {
  await service.from("domain_scout_events").insert({ run_id: run.id, user_id: run.user_id, phase, event_type: eventType, message, details })
}

export async function createDomainScoutRun(principal: SeoMonitoringPrincipal, input: { brief: unknown; preferredTld: LabTld; modeMinutes: ScoutMode }) {
  assertScoutEnabled(principal)
  if (!principal.entitlements.isPro) throw new DomainScoutError("upgrade_required", "Autonomous Scout is a metered Pro beta feature.", 403)
  const brief = parseLabBrief(input.brief)
  if (!brief) throw new DomainScoutError("invalid_brief", "Complete the five-question naming brief before starting Scout.")
  const budget = SCOUT_MODE_BUDGETS[input.modeMinutes]
  if (!budget || !TLDS.includes(input.preferredTld)) throw new DomainScoutError("invalid_budget", "Choose a supported Scout budget and primary extension.")
  const service = createServiceClient() as any
  const included = getPlanConfig("pro").scoutIncludedMonthlyCredits
  const { data: usedRows, error: usageError } = await service.from("domain_scout_runs").select("credit_cost")
    .eq("user_id", principal.userId).gte("created_at", monthStart()).in("status", ["queued", "running", "paused", "completed", "partial", "cancelled"])
  if (usageError) throw usageError
  const used = (usedRows || []).reduce((sum: number, row: any) => sum + Number(row.credit_cost || 0), 0)
  if (used + budget.creditCost > included) {
    throw new DomainScoutError("credits_exhausted", `This beta includes ${included} 15-minute Scout credit per UTC month.`, 403)
  }
  const { data: run, error } = await service.from("domain_scout_runs").insert({
    user_id: principal.userId, brief, preferred_tld: input.preferredTld, mode_minutes: input.modeMinutes,
    credit_cost: budget.creditCost, max_waves: budget.maxWaves, max_candidates: budget.maxCandidates,
    max_availability_checks: budget.maxAvailabilityChecks,
  }).select("*").single()
  if (error?.code === "23505") throw new DomainScoutError("run_active", "Pause, finish, or cancel the active Scout run first.", 409)
  if (error) throw error
  await addEvent(service, run, "normalise", "run_created", "Brief accepted and exploration budget reserved.", { modeMinutes: input.modeMinutes })
  await enqueueDomainScoutRun(run.id, principal.userId)
  return getDomainScoutRun(principal, run.id)
}

export async function enqueueDomainScoutRun(runId: string, userId: string) {
  const result = await send(DOMAIN_SCOUT_TOPIC, { runId, userId } satisfies DomainScoutMessage, {
    idempotencyKey: `domain-scout:${runId}:${randomUUID()}`,
    retentionSeconds: 86_400,
  })
  return result.messageId
}

export async function getDomainScoutRun(principal: SeoMonitoringPrincipal, runId?: string) {
  const release = getScoutReleaseState(principal.email)
  const service = createServiceClient() as any
  let query = service.from("domain_scout_runs").select("*").eq("user_id", principal.userId).order("created_at", { ascending: false }).limit(1)
  if (runId) query = query.eq("id", runId)
  const { data: rows, error } = await query
  if (error) throw error
  const run = rows?.[0] || null
  if (!run) return { run: null, events: [], candidates: [], flags: release }
  const [{ data: events }, { data: candidates }] = await Promise.all([
    service.from("domain_scout_events").select("*").eq("run_id", run.id).eq("user_id", principal.userId).order("id", { ascending: true }),
    service.from("domain_scout_candidates").select("*").eq("run_id", run.id).eq("user_id", principal.userId).in("state", ["survived", "partial"]).order("rank", { ascending: true, nullsFirst: false }),
  ])
  return { run, events: events || [], candidates: candidates || [], flags: release }
}

export async function updateDomainScoutRun(principal: SeoMonitoringPrincipal, runId: string, action: "pause" | "resume" | "cancel") {
  const service = createServiceClient() as any
  const { data: run } = await service.from("domain_scout_runs").select("*").eq("id", runId).eq("user_id", principal.userId).maybeSingle()
  if (!run) throw new DomainScoutError("run_not_found", "Scout run not found.", 404)
  if (["completed", "partial", "failed", "cancelled"].includes(run.status)) throw new DomainScoutError("run_finished", "This Scout run has already finished.", 409)
  if (action === "resume" && run.status === "paused" && run.worker_token) {
    throw new DomainScoutError("checkpoint_pending", "Scout is finishing the current checkpoint before it can resume.", 409)
  }
  const status = action === "pause" ? "paused" : action === "cancel" ? "cancelled" : "queued"
  const now = new Date().toISOString()
  const keepWorkerLease = Boolean(run.worker_token) && (action === "pause" || action === "cancel")
  await service.from("domain_scout_runs").update({ status, completed_at: action === "cancel" ? now : null, ...(keepWorkerLease ? {} : { worker_token: null, lease_expires_at: null }), updated_at: now }).eq("id", run.id).eq("user_id", principal.userId)
  await addEvent(service, run, run.current_phase, action, action === "pause" ? "Scout paused after its current checkpoint." : action === "cancel" ? "Scout cancelled; completed evidence remains available." : "Scout resumed from its last checkpoint.")
  if (action === "resume") await enqueueDomainScoutRun(run.id, principal.userId)
  return getDomainScoutRun(principal, run.id)
}

function cleanName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 63)
}

type ScoutRankableRow = {
  candidate_name: string
  state: string
  founder_signal?: { score?: number } | null
  availability?: Record<string, { available?: boolean; confidence?: string }> | null
}

function confirmedAvailableCount(row: ScoutRankableRow) {
  return Object.values(row.availability || {}).filter((entry) => entry?.available === true).length
}

/** Founder quality leads; extension breadth breaks ties deterministically. */
export function rankScoutCandidateRows<T extends ScoutRankableRow>(rows: readonly T[]): T[] {
  return [...rows]
    .filter((row) => row.state === "survived" || row.state === "partial")
    .sort((left, right) => {
      const signalDifference = Number(right.founder_signal?.score || 0) - Number(left.founder_signal?.score || 0)
      if (signalDifference) return signalDifference
      const availabilityDifference = confirmedAvailableCount(right) - confirmedAvailableCount(left)
      if (availabilityDifference) return availabilityDifference
      if (left.state !== right.state) return left.state === "survived" ? -1 : 1
      return left.candidate_name.localeCompare(right.candidate_name)
    })
}

export async function processDomainScoutMessage(message: DomainScoutMessage) {
  if (!message?.runId || !message?.userId) throw new Error("Invalid Scout message")
  const service = createServiceClient() as any
  const { data: run, error } = await service.from("domain_scout_runs").select("*").eq("id", message.runId).eq("user_id", message.userId).maybeSingle()
  if (error) throw error
  if (!run || !["queued", "running"].includes(run.status)) return "skipped" as const
  const { count: activeCount } = await service.from("domain_scout_runs").select("id", { count: "exact", head: true }).eq("status", "running")
  if ((activeCount || 0) >= 2 && run.status !== "running") return "deferred" as const
  const waveNumber = Number(run.waves_completed) + 1
  if (waveNumber > run.max_waves) return "skipped" as const
  const { data: wave, error: waveError } = await service.from("domain_scout_waves").insert({ run_id: run.id, user_id: run.user_id, wave_number: waveNumber, status: "running", provider: "openai", model_name: getLabNamingModel() }).select("*").single()
  if (waveError?.code === "23505") return "skipped" as const
  if (waveError) throw waveError
  const workerToken = randomUUID()
  const now = new Date().toISOString()
  await service.from("domain_scout_runs").update({ status: "running", current_phase: "generate", worker_token: workerToken, lease_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(), started_at: run.started_at || now, updated_at: now }).eq("id", run.id)
  await addEvent(service, run, "generate", "wave_started", `Wave ${waveNumber} is generating a bounded candidate set.`)
  try {
    const { data: previousCandidateRows, error: previousCandidateError } = await service
      .from("domain_scout_candidates")
      .select("candidate_name")
      .eq("run_id", run.id)
      .eq("user_id", run.user_id)
    if (previousCandidateError) throw previousCandidateError
    const excludedNames = (previousCandidateRows || []).map((row: { candidate_name?: string }) => row.candidate_name || "").filter(Boolean)
    const candidates = await generateLabCandidates(run.brief as LabBrief, AbortSignal.timeout(45_000), { waveNumber, excludedNames })
    const remainingCandidates = Math.max(0, run.max_candidates - run.candidates_considered)
    const bounded = candidates.slice(0, remainingCandidates)
    await addEvent(service, run, "filter", "generation_complete", `${bounded.length} distinct model-backed candidates reached the quality filters.`, { priorNamesExcluded: excludedNames.length })
    const scored = bounded.map((candidate) => {
      const name = cleanName(candidate.name)
      return { ...candidate, name, founder: scoreName({ name, tld: run.preferred_tld, vibe: run.brief.tone }) }
    }).filter((candidate) => candidate.name.length >= 3)
      .sort((left, right) => right.founder.score - left.founder.score || left.name.localeCompare(right.name))
    const remainingChecks = Math.max(0, run.max_availability_checks - run.availability_checks_used)
    const namesForChecks = scored.slice(0, Math.floor(remainingChecks / TLDS.length))
    const domains = namesForChecks.flatMap((candidate) => TLDS.map((tld) => `${candidate.name}.${tld}`))
    await addEvent(service, run, "availability", "checks_started", `${domains.length} shared availability checks started across six extensions.`)
    const checks = await checkAvailabilityBatch(domains, { concurrency: 8, ttlMs: 15 * 60_000 })
    const availabilityByName = new Map<string, Record<string, unknown>>()
    for (const result of checks) {
      const dot = result.domain.lastIndexOf(".")
      const name = result.domain.slice(0, dot)
      const tld = result.domain.slice(dot + 1)
      availabilityByName.set(name, { ...(availabilityByName.get(name) || {}), [tld]: { available: result.available, confidence: result.confidence, checkedAt: new Date().toISOString(), error: result.error || null } })
    }
    const rows = namesForChecks.map((candidate) => {
      const availability = availabilityByName.get(candidate.name) || {}
      const primary = availability[run.preferred_tld] as { available?: boolean; confidence?: string } | undefined
      const survived = candidate.founder.score >= SCOUT_FOUNDER_SIGNAL_FLOOR && (primary?.available || primary?.confidence === "low")
      return { run_id: run.id, wave_id: wave.id, user_id: run.user_id, candidate_name: candidate.name, rationale: candidate.rationale, state: survived ? (primary?.available ? "survived" : "partial") : "rejected", rejection_reason: survived ? null : candidate.founder.score < SCOUT_FOUNDER_SIGNAL_FLOOR ? "Founder Signal quality floor not met" : `.${run.preferred_tld} is unavailable`, founder_signal: candidate.founder, availability, rank: null }
    })
    if (rows.length) await service.from("domain_scout_candidates").upsert(rows, { onConflict: "run_id,candidate_name", ignoreDuplicates: true })
    const survivedCount = rows.filter((row) => row.state !== "rejected").length
    const { data: rankableRows, error: rankableError } = await service.from("domain_scout_candidates")
      .select("id,candidate_name,state,founder_signal,availability")
      .eq("run_id", run.id)
      .eq("user_id", run.user_id)
      .in("state", ["survived", "partial"])
    if (rankableError) throw rankableError
    const rankedRows = rankScoutCandidateRows((rankableRows || []) as Array<ScoutRankableRow & { id: string }>)
    const rankUpdates = await Promise.all(rankedRows.map((candidate, index) => service.from("domain_scout_candidates").update({ rank: index + 1 }).eq("id", candidate.id).eq("run_id", run.id).eq("user_id", run.user_id)))
    const rankUpdateError = rankUpdates.find((result: { error?: unknown }) => result.error)?.error
    if (rankUpdateError) throw rankUpdateError
    const qualityTargetMet = rankedRows.length >= 8 && rankedRows.some((row) => row.state === "survived" && Number(row.founder_signal?.score || 0) >= SCOUT_STRONG_SIGNAL_FLOOR)
    const budgetReached = waveNumber >= run.max_waves
    const complete = qualityTargetMet || budgetReached
    const completedAt = new Date().toISOString()
    await service.from("domain_scout_waves").update({ status: "completed", generated_count: bounded.length, survived_count: survivedCount, rejected_count: rows.length - survivedCount, completed_at: completedAt }).eq("id", wave.id)
    const { data: latest } = await service.from("domain_scout_runs").select("status,worker_token").eq("id", run.id).eq("user_id", run.user_id).maybeSingle()
    const interrupted = latest?.worker_token === workerToken && ["paused", "cancelled"].includes(latest.status)
    const nextStatus = interrupted ? latest.status : qualityTargetMet ? "completed" : budgetReached ? "partial" : "queued"
    const { data: checkpoint } = await service.from("domain_scout_runs").update({ status: nextStatus, current_phase: complete && !interrupted ? "complete" : "refine", waves_completed: waveNumber, candidates_considered: run.candidates_considered + bounded.length, availability_checks_used: run.availability_checks_used + checks.length, worker_token: null, lease_expires_at: null, completed_at: ["completed", "partial", "cancelled"].includes(nextStatus) ? completedAt : null, updated_at: completedAt }).eq("id", run.id).eq("worker_token", workerToken).select("id").maybeSingle()
    if (!checkpoint) return "skipped" as const
    const terminal = nextStatus === "completed" || nextStatus === "partial"
    await addEvent(service, run, terminal ? "complete" : "refine", nextStatus === "completed" ? "run_completed" : nextStatus === "partial" ? "run_partial" : interrupted ? "checkpoint_saved" : "wave_completed", nextStatus === "completed" ? `Scout found ${rankedRows.length} evidence-bearing candidates and stopped within budget.` : nextStatus === "partial" ? `Scout reached its work budget with ${rankedRows.length} candidates that cleared the evidence gates.` : interrupted ? `Wave ${waveNumber} evidence was saved before Scout stopped.` : `Wave ${waveNumber} completed; Scout will refine the direction.`)
    if (nextStatus === "queued") await enqueueDomainScoutRun(run.id, run.user_id)
    return "processed" as const
  } catch (error) {
    const failedAt = new Date().toISOString()
    await Promise.all([
      service.from("domain_scout_waves").update({ status: "failed", completed_at: failedAt }).eq("id", wave.id),
      service.from("domain_scout_runs").update({ status: "failed", failure_code: error instanceof Error ? error.name : "scout_failed", failure_message: error instanceof Error ? error.message.slice(0, 500) : "Scout failed", worker_token: null, lease_expires_at: null, completed_at: failedAt, updated_at: failedAt }).eq("id", run.id).eq("worker_token", workerToken).in("status", ["queued", "running"]),
    ])
    await addEvent(service, run, run.current_phase, "run_failed", "Scout stopped safely. No unfinished work was presented as complete.")
    throw error
  }
}
