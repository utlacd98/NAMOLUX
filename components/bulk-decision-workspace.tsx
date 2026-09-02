"use client"

import Link from "next/link"
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDashed,
  Copy,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  LoaderCircle,
  Save,
  Sparkles,
  Trophy,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { trackEvent } from "@/lib/analytics"
import { isSystemReservedName } from "@/lib/reserved-names"

const ALL_TLDS = ["com", "io", "co", "ai", "app", "dev"] as const
const DRAFT_KEY = "namolux:bulk-decision-draft:v1"
const DRAFT_VERSION = 1
const CANDIDATE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const TLD_SUFFIX_PATTERN = /\.(com|io|co|ai|app|dev)$/i

type Tld = (typeof ALL_TLDS)[number]
type AvailabilityStatus = "available" | "taken" | "needs_verification"
type JobStatus = "queued" | "processing" | "completed" | "partial" | "failed"
type Tier = "top" | "consider" | "reject"

type BrandCheckLink = {
  label: string
  href: (name: string) => string
}

type AvailabilityResult = {
  name: string
  tld: Tld
  fullDomain: string
  status: AvailabilityStatus
  available: boolean | null
  confidence: "high" | "medium" | "low"
  provider: string
  checkedAt: string
  fromCache: boolean
  verificationRequired: boolean
}

type BulkJob = {
  id: string
  status: JobStatus
  names: string[]
  tlds: Tld[]
  totalChecks: number
  providerChecks: number
  cachedChecks: number
  providerFailures: number
  quotaCharged: boolean
  quotaRefunded: boolean
  queuedAt: string
  startedAt: string | null
  completedAt: string | null
  errorCode: string | null
  errorMessage: string | null
  results: AvailabilityResult[]
}

type FounderSignal = {
  score: number
  band: string
  rawScores?: Record<string, number>
  reasons?: string[]
  version?: string
}

type ServerScore = {
  score: number
  band: string
  fullDomain: string
  founderSignal: FounderSignal
}

type UsageCounter = {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  resetAt: string | null
}

type WorkspaceUsage = {
  plan: "free" | "pro"
  isPro: boolean
  bulkChecks: UsageCounter
  founderSignal: UsageCounter
}

type Draft = {
  version: number
  candidateText: string
  selectedTlds: Tld[]
  primaryTld: Tld
  tiers: Record<string, Tier>
  notes: Record<string, string>
  compareNames: string[]
  winnerName: string | null
}

type SavedProject = {
  id: string
  name: string
  updatedAt: string
}

type SavedShortlist = {
  id: string
  projectId: string
  title: string
  primaryTld: Tld
  createdAt: string
  updatedAt: string
}

type SavedEntry = {
  id: string
  shortlistId: string
  candidateName: string
  primaryDomain: string
  availabilitySnapshot: Record<string, unknown>
  founderSignalSnapshot: Record<string, unknown> | null
  tier: Tier | null
  notes: string | null
  position: number
  isWinner: boolean
  createdAt: string
  updatedAt: string
}

type SavedReport = {
  id: string
  shortlistId: string
  title: string
  createdAt: string
}

type SavedReportShare = {
  id: string
  reportId: string
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

type NamingWorkspaceDashboard = {
  principal: {
    email: string | null
    isPro: boolean
    accessState: "free" | "active" | "grace" | "expired"
  }
  projects: SavedProject[]
  shortlists: SavedShortlist[]
  entries: SavedEntry[]
  reports: SavedReport[]
  reportShares: SavedReportShare[]
}

type SavedWorkspaceState = "loading" | "ready" | "signed_out" | "unavailable"

type SavedWorkspaceError = ApiError & { status?: number }

type ApiError = {
  error?: string
  message?: string
  upgradeUrl?: string
}

type BulkDecisionWorkspaceProps = {
  initialNames?: string
}

const TIER_OPTIONS: Array<{ value: Tier; label: string }> = [
  { value: "top", label: "Top" },
  { value: "consider", label: "Consider" },
  { value: "reject", label: "Reject" },
]

const SOCIAL_PROFILE_CHECKS: BrandCheckLink[] = [
  { label: "X", href: (name) => `https://x.com/${encodeURIComponent(name)}` },
  { label: "Instagram", href: (name) => `https://www.instagram.com/${encodeURIComponent(name)}/` },
  { label: "TikTok", href: (name) => `https://www.tiktok.com/@${encodeURIComponent(name)}` },
  { label: "YouTube", href: (name) => `https://www.youtube.com/@${encodeURIComponent(name)}` },
  { label: "LinkedIn", href: (name) => `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(name)}` },
  { label: "Facebook", href: (name) => `https://www.facebook.com/${encodeURIComponent(name)}` },
]

const REGISTRY_CHECKS: BrandCheckLink[] = [
  { label: "UK IPO", href: () => "https://trademarks.ipo.gov.uk/ipo-tmtext/start" },
  { label: "USPTO", href: (name) => `https://tmsearch.uspto.gov/search/search-information?query=${encodeURIComponent(name)}` },
  { label: "EUIPO", href: () => "https://euipo.europa.eu/eSearch/" },
  { label: "Companies House", href: (name) => `https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(name)}` },
]

export function getBrandFootprintLinks(name: string) {
  const build = (checks: BrandCheckLink[]) => checks.map((check) => ({ label: check.label, href: check.href(name) }))
  return { social: build(SOCIAL_PROFILE_CHECKS), registries: build(REGISTRY_CHECKS) }
}

function normaliseCandidate(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(TLD_SUFFIX_PATTERN, "")
}

function parseCandidateText(value: string): { names: string[]; invalid: string[] } {
  const names: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()

  for (const raw of value.split(/[\n,]+/)) {
    if (isSystemReservedName(raw)) {
      if (!seen.has("namolux")) {
        seen.add("namolux")
        names.push(raw.trim())
      }
      continue
    }
    const name = normaliseCandidate(raw)
    if (!name) continue
    if (!CANDIDATE_PATTERN.test(name)) {
      invalid.push(raw.trim())
      continue
    }
    if (!seen.has(name)) {
      seen.add(name)
      names.push(name)
    }
  }

  return { names, invalid }
}

function createBulkRunKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `bulk-run-${crypto.randomUUID()}`
  }
  return `bulk-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

function bulkRequestFingerprint(names: string[], tlds: Tld[]): string {
  return JSON.stringify({ names, tlds })
}

function parseApiError(payload: unknown, fallback: string): ApiError {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { message: fallback }
  const value = payload as ApiError
  return {
    error: typeof value.error === "string" ? value.error : undefined,
    message: typeof value.message === "string" ? value.message : fallback,
    upgradeUrl: typeof value.upgradeUrl === "string" ? value.upgradeUrl : undefined,
  }
}

class WorkspaceRequestError extends Error {
  constructor(public readonly detail: SavedWorkspaceError) {
    super(detail.message || "Saved workspace request failed.")
    this.name = "WorkspaceRequestError"
  }
}

async function workspaceJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new WorkspaceRequestError({ ...parseApiError(payload, "Saved workspace request failed."), status: response.status })
  }
  return payload as T
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isTld(value: unknown): value is Tld {
  return typeof value === "string" && ALL_TLDS.includes(value as Tld)
}

function isTier(value: unknown): value is Tier {
  return value === "top" || value === "consider" || value === "reject"
}

function coerceTier(value: unknown): Tier {
  if (isTier(value)) return value
  if (value === "top_choice") return "top"
  if (value === "drop") return "reject"
  return "consider"
}

function savedAvailabilityResult(snapshot: Record<string, unknown>, name: string, tld: Tld): AvailabilityResult | null {
  const evidence = snapshot[tld]
  if (!isObject(evidence)) return null
  const status = evidence.status
  if (status !== "available" && status !== "taken" && status !== "needs_verification") return null
  const available = typeof evidence.available === "boolean" || evidence.available === null ? evidence.available : null
  const confidence = evidence.confidence === "high" || evidence.confidence === "medium" || evidence.confidence === "low"
    ? evidence.confidence
    : "low"

  return {
    name,
    tld,
    fullDomain: typeof evidence.fullDomain === "string" ? evidence.fullDomain : `${name}.${tld}`,
    status,
    available,
    confidence,
    provider: typeof evidence.provider === "string" ? evidence.provider : "saved snapshot",
    checkedAt: typeof evidence.checkedAt === "string" ? evidence.checkedAt : new Date(0).toISOString(),
    fromCache: evidence.fromCache === true,
    verificationRequired: evidence.verificationRequired === true || status === "needs_verification",
  }
}

function savedServerScore(snapshot: Record<string, unknown> | null, name: string, primaryTld: Tld): ServerScore | null {
  if (!snapshot || typeof snapshot.score !== "number" || !Number.isFinite(snapshot.score)) return null
  const founderSignal = isObject(snapshot.founderSignal) ? snapshot.founderSignal : {}
  return {
    score: snapshot.score,
    band: typeof snapshot.band === "string" ? snapshot.band : "Scored",
    fullDomain: typeof snapshot.fullDomain === "string" ? snapshot.fullDomain : `${name}.${primaryTld}`,
    founderSignal: {
      score: typeof founderSignal.score === "number" ? founderSignal.score : snapshot.score,
      band: typeof founderSignal.band === "string" ? founderSignal.band : typeof snapshot.band === "string" ? snapshot.band : "Scored",
      rawScores: isObject(founderSignal.rawScores) ? founderSignal.rawScores as Record<string, number> : undefined,
      reasons: Array.isArray(founderSignal.reasons) ? founderSignal.reasons.filter((reason): reason is string => typeof reason === "string") : undefined,
      version: typeof founderSignal.version === "string" ? founderSignal.version : undefined,
    },
  }
}

function resultKey(name: string, tld: Tld): string {
  return `${name}.${tld}`
}

function hasAvailableDomain(name: string, results: Map<string, AvailabilityResult>): boolean {
  return ALL_TLDS.some((tld) => results.get(resultKey(name, tld))?.status === "available")
}

function statusLabel(result: AvailabilityResult | undefined, inProgress: boolean): string {
  if (!result) return inProgress ? "Checking" : "Not checked"
  if (result.status === "available") return "Available"
  if (result.status === "taken") return "Taken"
  return "Verify"
}

function jobStatusLabel(status: JobStatus): string {
  if (status === "queued") return "Queued"
  if (status === "processing") return "Checking"
  if (status === "completed") return "Complete"
  if (status === "partial") return "Partial result"
  return "Could not complete"
}

function formatCheckedAt(value: string | null | undefined): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function csvValue(value: string | number | null | undefined): string {
  const string = value === null || value === undefined ? "" : String(value)
  return /[",\n]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string
}

function UsageMeter({ label, usage }: { label: string; usage: UsageCounter | undefined }) {
  if (!usage) {
      return <span className="text-xs text-white/40">Loading allowance...</span>
  }

  const limit = Math.max(usage.limit, 1)
  const progress = Math.min(100, Math.max(0, (usage.used / limit) * 100))

  return (
    <div className="min-w-[148px]">
      <div className="flex items-center justify-between gap-3 text-[11px] font-medium tracking-[0.01em] text-white/58">
        <span>{label}</span>
        <span className="font-mono text-white/82">{usage.remaining}/{usage.limit}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full bg-[#c4a15b] transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function AvailabilityCell({ result, inProgress }: { result: AvailabilityResult | undefined; inProgress: boolean }) {
  const label = statusLabel(result, inProgress)
  const colour = result?.status === "available"
    ? "bg-emerald-400"
    : result?.status === "taken"
      ? "bg-rose-400"
      : result?.status === "needs_verification"
        ? "bg-[#d8ba7c]"
        : inProgress
          ? "bg-white/35"
          : "bg-white/20"

  return (
    <span className="inline-flex min-w-[78px] items-center justify-center gap-1.5 text-[11px] font-medium text-white/68" title={result?.checkedAt ? `${label}; checked ${formatCheckedAt(result.checkedAt)}` : label}>
      <span className={`h-1.5 w-1.5 rounded-full ${colour}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

function ScoreCell({ score }: { score: ServerScore | undefined }) {
  if (!score) return <span className="text-sm text-white/32">-</span>
  return (
    <span className="inline-flex items-baseline gap-1.5" title={score.founderSignal.reasons?.join(" / ") || "Founder Signal result"}>
      <strong className="font-display text-xl font-semibold tracking-tight text-[#e1c27f]">{score.score}</strong>
      <span className="text-[11px] font-medium text-white/46">{score.band}</span>
    </span>
  )
}

function BrandFootprintChecks({ name, results, compact = false }: { name: string; results: Map<string, AvailabilityResult>; compact?: boolean }) {
  if (!hasAvailableDomain(name, results)) return null
  const links = getBrandFootprintLinks(name)

  return (
    <section className={compact ? "min-w-[220px]" : "mt-4 border border-[#c4a15b]/30 bg-[#c4a15b]/[0.055] p-3"} aria-label={`Brand footprint checks for ${name}`}>
      <div className={compact ? "" : "flex items-start justify-between gap-3"}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e1c27f]">Brand footprint</p>
          {!compact ? <p className="mt-1 text-xs leading-5 text-white/55">An available domain is a useful start. Verify matching profiles and possible company or trade-mark conflicts before committing.</p> : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {links.social.map((check) => (
          <a key={check.label} href={check.href} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 border border-white/15 px-2 text-[11px] font-semibold text-white/68 transition hover:border-[#c4a15b]/60 hover:text-[#e1c27f]">
            {check.label}<ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
        {links.registries.map((check) => (
          <a key={check.label} href={check.href} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 border border-[#c4a15b]/30 px-2 text-[11px] font-semibold text-[#e1c27f] transition hover:border-[#c4a15b]/70 hover:bg-[#c4a15b]/10">
            {check.label}<ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ))}
      </div>
      {!compact ? <p className="mt-2 text-[11px] leading-4 text-white/42">These links support verification; they do not confirm a handle, company name or trade mark is available, or provide legal clearance.</p> : null}
    </section>
  )
}

function MobileCandidateCard({
  name,
  index,
  results,
  score,
  tier,
  compared,
  inProgress,
  onTierChange,
  onNote,
  onCompare,
  hasNote,
  primaryDomain,
}: {
  name: string
  index: number
  results: Map<string, AvailabilityResult>
  score: ServerScore | undefined
  tier: Tier
  compared: boolean
  inProgress: boolean
  onTierChange: (tier: Tier) => void
  onNote: () => void
  onCompare: () => void
  hasNote: boolean
  primaryDomain: string
}) {
  return (
    <article className="border border-[#c4a15b]/35 bg-black/15 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/38">Candidate {index + 1}</p>
          <h3 className="mt-1 break-words font-display text-2xl font-semibold tracking-tight text-[#f4efe5]">{name}</h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/38">Founder Signal</p>
          <ScoreCell score={score} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 border-l border-t border-white/10">
        {ALL_TLDS.map((tld) => {
          const result = results.get(resultKey(name, tld))
          return (
            <div key={tld} className="min-w-0 border-b border-r border-white/10 px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">.{tld}</dt>
              <dd className="mt-1"><AvailabilityCell result={result} inProgress={inProgress} /></dd>
            </div>
          )
        })}
      </dl>

      <BrandFootprintChecks name={name} results={results} />

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
        <label className="min-w-0">
          <span className="sr-only">Tier for {name}</span>
          <select value={tier} onChange={(event) => onTierChange(event.target.value as Tier)} aria-label={`Tier for ${name}`} className="h-10 w-full border border-white/15 bg-black/25 px-2 text-xs text-white/78 outline-none focus:border-[#c4a15b]">
            {TIER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={onNote} className={`inline-flex min-h-10 items-center gap-1.5 border border-white/15 px-3 text-xs font-semibold transition ${hasNote ? "border-[#c4a15b]/55 text-[#e1c27f]" : "text-white/60 hover:border-[#c4a15b]/55 hover:text-[#e1c27f]"}`} aria-label={`${hasNote ? "Edit" : "Add"} note for ${name}`}>
          <FileText className="h-4 w-4" /> Note
        </button>
        <button type="button" onClick={onCompare} aria-pressed={compared} className={`inline-flex min-h-10 items-center gap-1.5 border px-3 text-xs font-semibold transition ${compared ? "border-[#c4a15b]/70 bg-[#c4a15b]/10 text-[#e1c27f]" : "border-white/15 text-white/60 hover:border-[#c4a15b]/55 hover:text-[#e1c27f]"}`}>
          {compared ? <CheckCircle2 className="h-4 w-4" /> : null} Compare
        </button>
      </div>
      {score ? <Link href={`/brand-launch?domain=${encodeURIComponent(primaryDomain)}`} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 border border-[#c4a15b]/55 bg-[#c4a15b]/10 px-3 text-xs font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/18"><Sparkles className="h-4 w-4" /> Take {primaryDomain} to Launch Kit</Link> : null}
    </article>
  )
}

function CompareCandidate({
  name,
  score,
  primaryResult,
  tier,
  isWinner,
  onSetWinner,
}: {
  name: string
  score: ServerScore | undefined
  primaryResult: AvailabilityResult | undefined
  tier: Tier
  isWinner: boolean
  onSetWinner: () => void
}) {
  return (
    <article className={`min-w-0 border p-4 ${isWinner ? "border-[#c4a15b]/75 bg-[#c4a15b]/10" : "border-white/10 bg-black/15"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-semibold tracking-tight text-[#f4efe5]">{name}</p>
          <p className="mt-1 text-xs text-white/46">{primaryResult?.fullDomain || "Primary domain pending"}</p>
        </div>
        {isWinner ? (
          <span className="inline-flex shrink-0 items-center gap-1 border border-[#c4a15b]/55 px-2 py-1 text-[11px] font-semibold text-[#e1c27f]"><Trophy className="h-3.5 w-3.5" /> Winner</span>
        ) : null}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/38">Founder Signal</p>
          <p className="mt-1 font-display text-4xl font-semibold tracking-tight text-[#e1c27f]">{score?.score ?? "-"}</p>
          <p className="mt-1 text-xs text-white/50">{score?.band || "Not scored yet"}</p>
        </div>
        <div className="text-right text-xs text-white/48">
          <p>{statusLabel(primaryResult, false)}</p>
          <p className="mt-1">{TIER_OPTIONS.find((option) => option.value === tier)?.label}</p>
        </div>
      </div>
      <button type="button" onClick={onSetWinner} className="mt-5 inline-flex min-h-10 items-center border border-white/18 px-3 text-xs font-semibold text-white/72 transition hover:border-[#c4a15b]/60 hover:text-[#e1c27f]">
        {isWinner ? "Chosen winner" : "Set as winner"}
      </button>
      {score && primaryResult?.fullDomain ? <Link href={`/brand-launch?domain=${encodeURIComponent(primaryResult.fullDomain)}`} className="ml-2 mt-5 inline-flex min-h-10 items-center gap-2 border border-[#c4a15b]/55 bg-[#c4a15b]/10 px-3 text-xs font-semibold text-[#e1c27f]"><Sparkles className="h-4 w-4" /> Launch Kit</Link> : null}
    </article>
  )
}

export function BulkDecisionWorkspace({ initialNames = "" }: BulkDecisionWorkspaceProps) {
  const [candidateText, setCandidateText] = useState(initialNames)
  const [selectedTlds, setSelectedTlds] = useState<Tld[]>([...ALL_TLDS])
  const [primaryTld, setPrimaryTld] = useState<Tld>("com")
  const [job, setJob] = useState<BulkJob | null>(null)
  const [jobToken, setJobToken] = useState<string | null>(null)
  const [bulkRetry, setBulkRetry] = useState<{ fingerprint: string; idempotencyKey: string } | null>(null)
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null)
  const [scores, setScores] = useState<Record<string, ServerScore>>({})
  const [tiers, setTiers] = useState<Record<string, Tier>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [compareNames, setCompareNames] = useState<string[]>([])
  const [winnerName, setWinnerName] = useState<string | null>(null)
  const [activeNoteName, setActiveNoteName] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [usageError, setUsageError] = useState(false)
  const [savedWorkspace, setSavedWorkspace] = useState<NamingWorkspaceDashboard | null>(null)
  const [savedWorkspaceState, setSavedWorkspaceState] = useState<SavedWorkspaceState>("loading")
  const [workspaceTitle, setWorkspaceTitle] = useState("Untitled decision")
  const [activeSavedShortlistId, setActiveSavedShortlistId] = useState<string | null>(null)
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [activeShareId, setActiveShareId] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null)
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false)
  const [isCreatingReport, setIsCreatingReport] = useState(false)
  const [isCreatingShare, setIsCreatingShare] = useState(false)
  const [isDeletingSavedWork, setIsDeletingSavedWork] = useState(false)
  const draftHydrated = useRef(false)

  const parsedCandidates = useMemo(() => parseCandidateText(candidateText), [candidateText])
  const candidateNames = parsedCandidates.names
  const activeJob = job?.status === "queued" || job?.status === "processing"

  const resultMap = useMemo(() => {
    const next = new Map<string, AvailabilityResult>()
    for (const result of job?.results || []) next.set(resultKey(result.name, result.tld), result)
    return next
  }, [job?.results])

  const displayNames = useMemo(() => {
    const names = [...(job?.names || [])]
    return names.sort((left, right) => {
      const scoreDifference = (scores[right]?.score ?? -1) - (scores[left]?.score ?? -1)
      return scoreDifference || left.localeCompare(right)
    })
  }, [job?.names, scores])

  const selectedCompareNames = useMemo(
    () => compareNames.filter((name) => displayNames.includes(name)).slice(0, 2),
    [compareNames, displayNames],
  )
  const checkedResultCount = job?.results.length || 0
  const checkProgress = job?.totalChecks ? Math.min(100, Math.round((checkedResultCount / job.totalChecks) * 100)) : 0
  const pollingJobId = activeJob ? job?.id || null : null
  const activeSavedShortlist = useMemo(
    () => savedWorkspace?.shortlists.find((shortlist) => shortlist.id === activeSavedShortlistId) || null,
    [activeSavedShortlistId, savedWorkspace?.shortlists],
  )
  const activeSavedProject = useMemo(
    () => savedWorkspace?.projects.find((project) => project.id === activeSavedShortlist?.projectId) || null,
    [activeSavedShortlist?.projectId, savedWorkspace?.projects],
  )
  const activeSavedEntries = useMemo(
    () => (savedWorkspace?.entries || []).filter((entry) => entry.shortlistId === activeSavedShortlistId),
    [activeSavedShortlistId, savedWorkspace?.entries],
  )
  const activeReports = useMemo(
    () => (savedWorkspace?.reports || []).filter((report) => report.shortlistId === activeSavedShortlistId),
    [activeSavedShortlistId, savedWorkspace?.reports],
  )
  const activeReport = useMemo(
    () => activeReports.find((report) => report.id === activeReportId) || activeReports[0] || null,
    [activeReportId, activeReports],
  )
  const activePersistedShares = useMemo(
    () => (savedWorkspace?.reportShares || []).filter((share) => share.reportId === activeReport?.id && !share.revokedAt),
    [activeReport?.id, savedWorkspace?.reportShares],
  )
  const canWriteSavedWork = savedWorkspace?.principal.isPro === true
  const canRunFounderSignal = usage?.isPro === true

  const refreshUsage = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace/usage", { cache: "no-store", credentials: "same-origin" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error("usage unavailable")
      setUsage(payload as WorkspaceUsage)
      setUsageError(false)
    } catch {
      setUsageError(true)
    }
  }, [])

  const refreshSavedWorkspace = useCallback(async (showLoading = false): Promise<NamingWorkspaceDashboard | null> => {
    if (showLoading) setSavedWorkspaceState("loading")
    try {
      const dashboard = await workspaceJson<NamingWorkspaceDashboard>("/api/naming-workspace")
      setSavedWorkspace(dashboard)
      setSavedWorkspaceState("ready")
      return dashboard
    } catch (requestError) {
      const detail = requestError instanceof WorkspaceRequestError ? requestError.detail : null
      setSavedWorkspace(null)
      setSavedWorkspaceState(detail?.status === 401 ? "signed_out" : "unavailable")
      return null
    }
  }, [])

  useEffect(() => {
    void refreshUsage()
  }, [refreshUsage])

  useEffect(() => {
    void refreshSavedWorkspace(true)
  }, [refreshSavedWorkspace])

  useEffect(() => {
    if (initialNames.trim()) {
      draftHydrated.current = true
      return
    }

    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<Draft>
      if (saved.version !== DRAFT_VERSION) return
      if (typeof saved.candidateText === "string") setCandidateText(saved.candidateText.slice(0, 5_000))
      if (Array.isArray(saved.selectedTlds)) {
        const validTlds = saved.selectedTlds.filter((tld): tld is Tld => ALL_TLDS.includes(tld as Tld))
        if (validTlds.length) setSelectedTlds(Array.from(new Set(validTlds)))
      }
      if (typeof saved.primaryTld === "string" && ALL_TLDS.includes(saved.primaryTld as Tld)) {
        setPrimaryTld(saved.primaryTld as Tld)
      }
      if (saved.tiers && typeof saved.tiers === "object") {
        const restoredTiers: Record<string, Tier> = {}
        for (const [name, tier] of Object.entries(saved.tiers)) restoredTiers[name] = coerceTier(tier)
        setTiers(restoredTiers)
      }
      if (saved.notes && typeof saved.notes === "object") setNotes(saved.notes as Record<string, string>)
      if (Array.isArray(saved.compareNames)) setCompareNames(saved.compareNames.filter((name): name is string => typeof name === "string").slice(0, 2))
      if (typeof saved.winnerName === "string") setWinnerName(saved.winnerName)
    } catch {
      window.localStorage.removeItem(DRAFT_KEY)
    } finally {
      draftHydrated.current = true
    }
  }, [initialNames])

  useEffect(() => {
    if (!draftHydrated.current) return
    const draft: Draft = {
      version: DRAFT_VERSION,
      candidateText,
      selectedTlds,
      primaryTld,
      tiers,
      notes,
      compareNames: selectedCompareNames,
      winnerName,
    }
    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    }, 180)
    return () => window.clearTimeout(timeoutId)
  }, [candidateText, compareNames, notes, primaryTld, selectedCompareNames, selectedTlds, tiers, winnerName])

  useEffect(() => {
    if (!pollingJobId) return
    let cancelled = false
    let timeoutId: number | undefined

    const poll = async () => {
      const params = new URLSearchParams({ id: pollingJobId })
      if (jobToken) params.set("token", jobToken)
      try {
        const response = await fetch(`/api/bulk-checks?${params.toString()}`, { cache: "no-store", credentials: "same-origin" })
        const payload = await response.json().catch(() => null)
        if (cancelled || !response.ok || !payload?.job) return
        const nextJob = payload.job as BulkJob
        setJob(nextJob)
        if (nextJob.status !== "queued" && nextJob.status !== "processing") void refreshUsage()
      } catch {
        // Keep the in-progress state visible and let the next interval retry.
      }
      if (!cancelled) timeoutId = window.setTimeout(poll, 1_100)
    }

    timeoutId = window.setTimeout(poll, 900)
    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [jobToken, pollingJobId, refreshUsage])

  const toggleTld = (tld: Tld) => {
    setSelectedTlds((current) => {
      if (current.includes(tld)) return current.length === 1 ? current : current.filter((value) => value !== tld)
      return ALL_TLDS.filter((value) => current.includes(value) || value === tld)
    })
  }

  const startBulkCheck = async () => {
    if (activeJob || isChecking) return
    if (!candidateNames.length) {
      setError({ message: "Add at least one valid candidate name before checking availability." })
      return
    }
    if (candidateNames.length > 50) {
      setError({ message: "A Bulk Check can include up to 50 unique names." })
      return
    }
    if (parsedCandidates.invalid.length) {
      setError({ message: "Remove or correct the invalid names before starting the check." })
      return
    }
    if (!selectedTlds.length) {
      setError({ message: "Choose at least one domain extension to check." })
      return
    }

    const fingerprint = bulkRequestFingerprint(candidateNames, selectedTlds)
    const idempotencyKey = bulkRetry?.fingerprint === fingerprint ? bulkRetry.idempotencyKey : createBulkRunKey()
    if (!bulkRetry || bulkRetry.fingerprint !== fingerprint) {
      setBulkRetry({ fingerprint, idempotencyKey })
    }
    setIsChecking(true)
    setError(null)

    try {
      const response = await fetch("/api/bulk-checks", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ names: candidateNames, tlds: selectedTlds, idempotencyKey }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.job) {
        const requestError = parseApiError(payload, "Bulk Check could not be started. Please try again.")
        const retryable = response.status >= 500 && requestError.error !== "decision_workspace_paused"
        if (!retryable) setBulkRetry(null)
        setError(requestError)
        return
      }
      setBulkRetry(null)
      setScores({})
      setCompareNames([])
      setWinnerName(null)
      setJob(payload.job as BulkJob)
      setJobToken(typeof payload.jobToken === "string" ? payload.jobToken : null)
      if (!payload.replayed) {
        void trackEvent({ action: "bulk_check", metadata: { source: "decision_workspace" } })
      }
      void refreshUsage()
    } catch {
      setError({ message: "Bulk Check could not be reached. Please check your connection and retry." })
    } finally {
      setIsChecking(false)
    }
  }

  const requestFounderSignal = async () => {
    if (!canRunFounderSignal) {
      setError({
        error: "founder_signal_pro_required",
        message: "Founder Signal is available with NamoLux Pro.",
        upgradeUrl: "/pricing?reason=founder-signal-pro&from=bulk-check",
      })
      return
    }
    if (!job || activeJob || !job.results.length) {
      setError({ message: "Wait for at least one availability result before scoring this shortlist." })
      return
    }

    setIsScoring(true)
    setError(null)
    try {
      const response = await fetch("/api/founder-signal/shortlist", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: job.names, primaryTld }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.results)) {
        setError(parseApiError(payload, "Founder Signal could not score this shortlist. Please try again."))
        return
      }

      const nextScores: Record<string, ServerScore> = {}
      for (const result of payload.results) {
        if (!result || typeof result.name !== "string" || typeof result.score !== "number") continue
        nextScores[result.name] = {
          score: result.score,
          band: typeof result.founderSignal?.band === "string" ? result.founderSignal.band : "Scored",
          fullDomain: typeof result.fullDomain === "string" ? result.fullDomain : `${result.name}.${primaryTld}`,
          founderSignal: result.founderSignal as FounderSignal,
        }
      }
      setScores(nextScores)
      if (!payload.replayed) {
        void trackEvent({ action: "founder_signal_scored", metadata: { source: "decision_workspace" } })
      }
      void refreshUsage()
    } catch {
      setError({ message: "Founder Signal could not be reached. Please check your connection and retry." })
    } finally {
      setIsScoring(false)
    }
  }

  const availabilitySnapshotFor = (name: string): Record<string, unknown> => {
    const snapshot: Record<string, unknown> = {
      schemaVersion: 1,
      selectedTlds: job?.tlds || [],
      check: job ? {
        id: job.id,
        status: job.status,
        checkedAt: job.completedAt || job.startedAt || job.queuedAt,
        providerFailures: job.providerFailures,
        quotaRefunded: job.quotaRefunded,
      } : null,
    }
    for (const tld of ALL_TLDS) {
      const result = resultMap.get(resultKey(name, tld))
      if (result) snapshot[tld] = result
    }
    return snapshot
  }

  const founderSignalSnapshotFor = (name: string): Record<string, unknown> | null => {
    const score = scores[name]
    if (!score) return null
    return {
      schemaVersion: 1,
      primaryTld,
      score: score.score,
      band: score.band,
      fullDomain: score.fullDomain,
      founderSignal: score.founderSignal,
    }
  }

  const loadSavedShortlist = (shortlistId: string) => {
    if (activeJob || isChecking) {
      setWorkspaceNotice("Wait for the active Bulk Check before loading saved work.")
      return
    }
    const shortlist = savedWorkspace?.shortlists.find((candidate) => candidate.id === shortlistId)
    if (!shortlist || !savedWorkspace) return

    const entries = savedWorkspace.entries
      .filter((entry) => entry.shortlistId === shortlistId)
      .sort((left, right) => left.position - right.position || left.createdAt.localeCompare(right.createdAt))
    if (!entries.length) {
      setWorkspaceNotice("This saved shortlist has no candidates yet.")
      return
    }

    const names = entries.map((entry) => entry.candidateName)
    const restoredTlds = Array.from(new Set(entries.flatMap((entry) => {
      const selected = entry.availabilitySnapshot.selectedTlds
      return Array.isArray(selected) ? selected.filter(isTld) : []
    })))
    const nextTlds = restoredTlds.length ? ALL_TLDS.filter((tld) => restoredTlds.includes(tld)) : [...ALL_TLDS]
    const nextResults: AvailabilityResult[] = []
    const nextScores: Record<string, ServerScore> = {}
    const nextTiers: Record<string, Tier> = {}
    const nextNotes: Record<string, string> = {}

    for (const entry of entries) {
      for (const tld of ALL_TLDS) {
        const result = savedAvailabilityResult(entry.availabilitySnapshot, entry.candidateName, tld)
        if (result) nextResults.push(result)
      }
      const score = savedServerScore(entry.founderSignalSnapshot, entry.candidateName, shortlist.primaryTld)
      if (score) nextScores[entry.candidateName] = score
      if (entry.tier) nextTiers[entry.candidateName] = coerceTier(entry.tier)
      if (entry.notes) nextNotes[entry.candidateName] = entry.notes
    }

    const firstCheck = isObject(entries[0]?.availabilitySnapshot.check) ? entries[0].availabilitySnapshot.check : null
    const savedStatus = firstCheck?.status
    const status: JobStatus = savedStatus === "partial" || savedStatus === "failed" || savedStatus === "completed"
      ? savedStatus
      : "completed"
    const timestamp = typeof firstCheck?.checkedAt === "string" ? firstCheck.checkedAt : entries[0].updatedAt
    const matchingReports = savedWorkspace.reports.filter((report) => report.shortlistId === shortlistId)

    setCandidateText(names.join("\n"))
    setSelectedTlds(nextTlds)
    setPrimaryTld(shortlist.primaryTld)
    setJob({
      id: `saved-${shortlist.id}`,
      status,
      names,
      tlds: nextTlds,
      totalChecks: names.length * nextTlds.length,
      providerChecks: 0,
      cachedChecks: 0,
      providerFailures: typeof firstCheck?.providerFailures === "number" ? firstCheck.providerFailures : 0,
      quotaCharged: false,
      quotaRefunded: firstCheck?.quotaRefunded === true,
      queuedAt: timestamp,
      startedAt: timestamp,
      completedAt: timestamp,
      errorCode: status === "failed" ? "saved_failed_check" : null,
      errorMessage: status === "partial" ? "This saved snapshot includes partial availability evidence." : null,
      results: nextResults,
    })
    setJobToken(null)
    setBulkRetry(null)
    setScores(nextScores)
    setTiers(nextTiers)
    setNotes(nextNotes)
    setCompareNames([])
    setWinnerName(entries.find((entry) => entry.isWinner)?.candidateName || null)
    setActiveNoteName(null)
    setActiveSavedShortlistId(shortlist.id)
    setActiveReportId(matchingReports[0]?.id || null)
    setActiveShareId(null)
    setShareUrl(null)
    setWorkspaceTitle(shortlist.title)
    setError(null)
    setWorkspaceNotice(`Loaded "${shortlist.title}". Changes remain local until you save them.`)
  }

  const saveWorkspace = async () => {
    if (!job || !displayNames.length) {
      setWorkspaceNotice("Run a Bulk Check before saving a decision workspace.")
      return
    }
    if (!canWriteSavedWork) {
      setWorkspaceNotice("Saving projects, reports, and share links is available with Pro.")
      return
    }

    const title = workspaceTitle.trim().replace(/\s+/g, " ").slice(0, 120) || "Untitled decision"
    setIsSavingWorkspace(true)
    setWorkspaceNotice(null)
    setError(null)

    try {
      let project = activeSavedProject
      let shortlist = activeSavedShortlist
      if (!project || !shortlist) {
        project = await workspaceJson<SavedProject>("/api/naming-workspace/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: title }),
        })
        shortlist = await workspaceJson<SavedShortlist>("/api/naming-workspace/shortlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, title, primaryTld }),
        })
      } else {
        await Promise.all([
          workspaceJson<SavedProject>(`/api/naming-workspace/projects/${project.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: title }),
          }),
          workspaceJson<SavedShortlist>(`/api/naming-workspace/shortlists/${shortlist.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, primaryTld }),
          }),
        ])
      }

      const targetEntries = activeSavedShortlist?.id === shortlist.id ? activeSavedEntries : []
      const existingEntries = new Map(targetEntries.map((entry) => [entry.candidateName, entry]))
      const savedEntries = await Promise.all(displayNames.map(async (name, position) => {
        const payload = {
          availabilitySnapshot: availabilitySnapshotFor(name),
          founderSignalSnapshot: founderSignalSnapshotFor(name),
          tier: tiers[name] || "consider",
          notes: notes[name]?.trim() || null,
          position,
        }
        const existing = existingEntries.get(name)
        if (existing) {
          return workspaceJson<SavedEntry>(`/api/naming-workspace/shortlists/${shortlist.id}/entries/${existing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        }
        return workspaceJson<SavedEntry>(`/api/naming-workspace/shortlists/${shortlist.id}/entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateName: name, ...payload }),
        })
      }))

      const savedNames = new Set(displayNames)
      await Promise.all(targetEntries
        .filter((entry) => !savedNames.has(entry.candidateName))
        .map((entry) => workspaceJson<void>(`/api/naming-workspace/shortlists/${shortlist.id}/entries/${entry.id}`, { method: "DELETE" })))

      const winner = winnerName ? savedEntries.find((entry) => entry.candidateName === winnerName) : null
      if (winner) {
        await workspaceJson<SavedEntry>(`/api/naming-workspace/shortlists/${shortlist.id}/entries/${winner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setWinner: true }),
        })
      }

      setActiveSavedShortlistId(shortlist.id)
      setWorkspaceTitle(title)
      await refreshSavedWorkspace()
      void trackEvent({ action: "decision_saved", metadata: { source: "decision_workspace" } })
      setWorkspaceNotice(`Saved "${title}". Reports remain immutable after you generate them.`)
    } catch (requestError) {
      const detail = requestError instanceof WorkspaceRequestError ? requestError.detail : null
      setWorkspaceNotice(detail?.message || "Your workspace could not be saved. Your local draft is still intact.")
    } finally {
      setIsSavingWorkspace(false)
    }
  }

  const createDecisionReport = async () => {
    if (!activeSavedShortlistId) {
      setWorkspaceNotice("Save this decision workspace before creating an immutable report.")
      return
    }
    if (!canWriteSavedWork) {
      setWorkspaceNotice("Decision reports are available with Pro.")
      return
    }

    setIsCreatingReport(true)
    setWorkspaceNotice(null)
    try {
      const reportTitle = `${workspaceTitle.trim() || "Untitled decision"} decision report`.slice(0, 160)
      const report = await workspaceJson<SavedReport>("/api/naming-workspace/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlistId: activeSavedShortlistId, title: reportTitle }),
      })
      setActiveReportId(report.id)
      setShareUrl(null)
      setActiveShareId(null)
      await refreshSavedWorkspace()
      void trackEvent({ action: "decision_report_created", metadata: { source: "decision_workspace" } })
      setWorkspaceNotice("Immutable decision report created. You can now make a view-only link.")
    } catch (requestError) {
      const detail = requestError instanceof WorkspaceRequestError ? requestError.detail : null
      setWorkspaceNotice(detail?.message || "The decision report could not be created.")
    } finally {
      setIsCreatingReport(false)
    }
  }

  const createReportShare = async () => {
    if (!activeReport) {
      setWorkspaceNotice("Create or select a decision report before making a share link.")
      return
    }
    if (!canWriteSavedWork) {
      setWorkspaceNotice("View-only report links are available with Pro.")
      return
    }

    setIsCreatingShare(true)
    setWorkspaceNotice(null)
    try {
      const share = await workspaceJson<SavedReportShare & { token: string }>(`/api/naming-workspace/reports/${activeReport.id}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const url = `${window.location.origin}/shared-report/${share.token}`
      setActiveShareId(share.id)
      setShareUrl(url)
      await refreshSavedWorkspace()
      void trackEvent({ action: "report_share_created", metadata: { source: "decision_workspace" } })
      try {
        await navigator.clipboard.writeText(url)
        setWorkspaceNotice("View-only link created and copied. Keep it private; it can be revoked below.")
      } catch {
        setWorkspaceNotice("View-only link created. Copy it below; it can be revoked below.")
      }
    } catch (requestError) {
      const detail = requestError instanceof WorkspaceRequestError ? requestError.detail : null
      setWorkspaceNotice(detail?.message || "The report link could not be created.")
    } finally {
      setIsCreatingShare(false)
    }
  }

  const copyShareUrl = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setWorkspaceNotice("View-only link copied.")
    } catch {
      setWorkspaceNotice("Select and copy the link manually.")
    }
  }

  const revokeReportShare = async () => {
    const shareId = activeShareId || activePersistedShares[0]?.id
    if (!shareId) return
    setWorkspaceNotice(null)
    try {
      await workspaceJson<void>(`/api/naming-workspace/shares/${shareId}`, { method: "DELETE" })
      setActiveShareId(null)
      setShareUrl(null)
      await refreshSavedWorkspace()
      setWorkspaceNotice("The view-only link has been revoked.")
    } catch (requestError) {
      const detail = requestError instanceof WorkspaceRequestError ? requestError.detail : null
      setWorkspaceNotice(detail?.message || "The report link could not be revoked.")
    }
  }

  const deleteSavedShortlist = async () => {
    if (!activeSavedShortlist || isDeletingSavedWork) return
    if (!window.confirm(`Delete "${activeSavedShortlist.title}" and its saved candidate entries? This cannot be undone.`)) return

    setIsDeletingSavedWork(true)
    setWorkspaceNotice(null)
    try {
      await workspaceJson<void>(`/api/naming-workspace/shortlists/${activeSavedShortlist.id}`, { method: "DELETE" })
      setActiveSavedShortlistId(null)
      setActiveReportId(null)
      setActiveShareId(null)
      setShareUrl(null)
      await refreshSavedWorkspace()
      setWorkspaceNotice("Saved decision deleted. Your local draft remains available in this browser.")
    } catch (requestError) {
      const detail = requestError instanceof WorkspaceRequestError ? requestError.detail : null
      setWorkspaceNotice(detail?.message || "The saved decision could not be deleted.")
    } finally {
      setIsDeletingSavedWork(false)
    }
  }

  const deleteDecisionReport = async () => {
    if (!activeReport || isDeletingSavedWork) return
    if (!window.confirm(`Delete the immutable report "${activeReport.title}"? This cannot be undone.`)) return

    setIsDeletingSavedWork(true)
    setWorkspaceNotice(null)
    try {
      await workspaceJson<void>(`/api/naming-workspace/reports/${activeReport.id}`, { method: "DELETE" })
      setActiveReportId(null)
      setActiveShareId(null)
      setShareUrl(null)
      await refreshSavedWorkspace()
      setWorkspaceNotice("Decision report deleted.")
    } catch (requestError) {
      const detail = requestError instanceof WorkspaceRequestError ? requestError.detail : null
      setWorkspaceNotice(detail?.message || "The decision report could not be deleted.")
    } finally {
      setIsDeletingSavedWork(false)
    }
  }

  const toggleCompare = (name: string) => {
    setCompareNames((current) => {
      if (current.includes(name)) return current.filter((value) => value !== name)
      if (current.length >= 2) return [current[1], name]
      return [...current, name]
    })
  }

  const exportCsv = () => {
    if (!job) return
    const header = ["Candidate", ...ALL_TLDS.map((tld) => `.${tld}`), "Founder Signal", "Band", "Tier", "Notes", "Winner"]
    const rows = displayNames.map((name) => [
      name,
      ...ALL_TLDS.map((tld) => statusLabel(resultMap.get(resultKey(name, tld)), false)),
      scores[name]?.score ?? "",
      scores[name]?.band ?? "",
      TIER_OPTIONS.find((option) => option.value === (tiers[name] || "consider"))?.label ?? "Consider",
      notes[name] || "",
      winnerName === name ? "Yes" : "",
    ])
    const csv = [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "namolux-bulk-decision.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const clearDraft = () => {
    window.localStorage.removeItem(DRAFT_KEY)
    setCandidateText("")
    setSelectedTlds([...ALL_TLDS])
    setPrimaryTld("com")
    setJob(null)
    setJobToken(null)
    setBulkRetry(null)
    setScores({})
    setTiers({})
    setNotes({})
    setCompareNames([])
    setWinnerName(null)
    setActiveNoteName(null)
    setError(null)
  }

  const primaryAvailability = (name: string) => resultMap.get(resultKey(name, primaryTld))

  return (
    <main id="main-content" className="min-h-[calc(100vh-78px)] bg-[#0b0b0a] px-4 py-8 text-[#f4efe5] sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="border-b border-[#c4a15b]/35 pb-6 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c4a15b]">Bulk Check + Founder Signal</p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#f4efe5] sm:text-5xl">Bulk Decision Workspace</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58 sm:text-base">Bring your shortlist, verify the extensions that matter, then score every name against one primary TLD.</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-4 sm:mt-0 sm:justify-end">
            <UsageMeter label="Bulk Checks" usage={usage?.bulkChecks} />
            <UsageMeter label="Founder Signal" usage={usage?.founderSignal} />
            {savedWorkspaceState === "loading" ? <span className="text-xs text-white/42">Checking saved work...</span> : null}
            {savedWorkspaceState === "signed_out" ? (
              <Link href={`/sign-in?redirect=${encodeURIComponent("/bulk-domain-check/workspace")}`} className="inline-flex min-h-11 items-center gap-2 border border-[#c4a15b]/55 px-4 text-xs font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/10">
                <FolderOpen className="h-4 w-4" /> Sign in to save
              </Link>
            ) : null}
            {savedWorkspaceState === "ready" && !canWriteSavedWork ? (
              <Link href="/pricing?reason=saved-decision-workspace" className="inline-flex min-h-11 items-center gap-2 border border-[#c4a15b]/55 px-4 text-xs font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/10">
                <Save className="h-4 w-4" /> Save with Pro
              </Link>
            ) : null}
            {savedWorkspaceState === "ready" && canWriteSavedWork ? (
              <button type="button" onClick={saveWorkspace} disabled={!job || activeJob || isSavingWorkspace} aria-describedby="save-workspace-status" className="inline-flex min-h-11 items-center gap-2 border border-[#c4a15b]/60 bg-[#c4a15b]/10 px-4 text-xs font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/18 disabled:cursor-not-allowed disabled:opacity-45">
                {isSavingWorkspace ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSavingWorkspace ? "Saving workspace..." : activeSavedShortlistId ? "Save changes" : "Save workspace"}
              </button>
            ) : null}
            {savedWorkspaceState === "unavailable" ? <span className="text-xs text-rose-200/75">Saved work is unavailable right now.</span> : null}
          </div>
          <p id="save-workspace-status" className="sr-only">Pro accounts can save a workspace, create an immutable report, and generate a revocable view-only link.</p>
        </header>

        <section className="grid gap-0 border-b border-[#c4a15b]/25 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.5fr)]">
          <section className="border-r-0 border-[#c4a15b]/35 py-7 lg:border-r lg:pr-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-semibold tracking-tight">Candidate list</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">One name per line. Full domains are simplified to the name automatically.</p>
              </div>
              <span className={`shrink-0 border px-2.5 py-1 font-mono text-xs ${candidateNames.length > 50 ? "border-rose-400/45 text-rose-200" : "border-white/15 text-white/50"}`}>{candidateNames.length}/50</span>
            </div>

            <label htmlFor="bulk-candidate-list" className="sr-only">Candidate names</label>
            <textarea
              id="bulk-candidate-list"
              value={candidateText}
              onChange={(event) => setCandidateText(event.target.value)}
              placeholder={"northstar\nfieldnote\nbrightforge"}
              rows={12}
              className="mt-6 min-h-[276px] w-full resize-y border border-[#c4a15b]/45 bg-black/25 px-4 py-4 font-mono text-[15px] leading-7 text-[#f4efe5] outline-none transition placeholder:text-white/22 focus:border-[#e1c27f] focus:ring-2 focus:ring-[#c4a15b]/20"
            />
            {parsedCandidates.invalid.length ? (
              <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-rose-200"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />Correct {parsedCandidates.invalid.length} invalid {parsedCandidates.invalid.length === 1 ? "entry" : "entries"} before checking.</p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-white/45">Duplicate names are checked once. Results are time-sensitive - verify again before buying.</p>
            )}

            <fieldset className="mt-8">
              <legend className="text-sm font-semibold text-white/78">Extensions to check</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_TLDS.map((tld) => {
                  const checked = selectedTlds.includes(tld)
                  return (
                    <label key={tld} className={`flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm transition ${checked ? "border-[#c4a15b]/65 bg-[#c4a15b]/10 text-[#f4efe5]" : "border-white/12 text-white/48 hover:border-white/28"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleTld(tld)} className="h-4 w-4 accent-[#c4a15b]" />
                      .{tld}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={startBulkCheck}
              disabled={isChecking || activeJob || !candidateNames.length || candidateNames.length > 50 || Boolean(parsedCandidates.invalid.length)}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#c4a15b] px-5 text-sm font-bold text-[#0b0b0a] transition hover:bg-[#e1c27f] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isChecking || activeJob ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isChecking ? "Starting Bulk Check..." : activeJob ? "Bulk Check in progress" : job ? "Check availability again" : "Check availability"}
            </button>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/42">
              <span>{selectedTlds.length} extensions - up to {selectedTlds.length * candidateNames.length} checks</span>
              <button type="button" onClick={clearDraft} className="inline-flex min-h-9 items-center gap-1.5 text-white/56 transition hover:text-[#e1c27f]"><X className="h-3.5 w-3.5" /> Clear draft</button>
            </div>
          </section>

          <section className="min-w-0 py-7 lg:pl-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h2 className="font-display text-3xl font-semibold tracking-tight">Decision board</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">Founder Signal compares every candidate against the same primary extension.</p>
              </div>
              <label className="min-w-[155px] text-xs font-semibold uppercase tracking-[0.14em] text-white/52">
                Primary TLD
                <span className="relative mt-2 block">
                  <select
                    value={primaryTld}
                    onChange={(event) => {
                      const nextTld = event.target.value as Tld
                      if (activeSavedShortlist && nextTld !== activeSavedShortlist.primaryTld) {
                        setActiveSavedShortlistId(null)
                        setActiveReportId(null)
                        setActiveShareId(null)
                        setShareUrl(null)
                        setWorkspaceNotice("Primary TLD changed. Save this as a new decision workspace to keep saved comparisons consistent.")
                      }
                      setPrimaryTld(nextTld)
                      setScores({})
                      setWinnerName(null)
                    }}
                    className="h-11 w-full appearance-none border border-[#c4a15b]/45 bg-black/30 px-3 pr-9 text-sm font-semibold normal-case tracking-normal text-[#f4efe5] outline-none transition focus:border-[#e1c27f]"
                  >
                    {ALL_TLDS.map((tld) => <option key={tld} value={tld}>.{tld}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e1c27f]" />
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-3">
              <div className="flex min-w-0 items-center gap-2 text-sm text-white/66" aria-live="polite">
                {activeJob || isChecking ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#c4a15b]" /> : job?.status === "failed" ? <CircleAlert className="h-4 w-4 shrink-0 text-rose-300" /> : job?.status === "partial" ? <CircleAlert className="h-4 w-4 shrink-0 text-[#e1c27f]" /> : job ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /> : <CircleDashed className="h-4 w-4 shrink-0 text-white/32" />}
                <span>{job ? `${jobStatusLabel(job.status)} - ${checkedResultCount}/${job.totalChecks} returned results` : "Paste a shortlist to begin"}</span>
              </div>
              {job ? <span className="text-xs text-white/42">Last update {formatCheckedAt(job.completedAt || job.startedAt || job.queuedAt)}</span> : null}
            </div>

            {activeJob ? (
              <div className="mt-3 h-1.5 overflow-hidden bg-white/10" aria-label={`${checkProgress}% complete`}>
                <div className="h-full bg-[#c4a15b] transition-[width] duration-500" style={{ width: `${Math.max(checkProgress, 4)}%` }} />
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm text-rose-100" role="alert">
                <span className="flex items-center gap-2"><CircleAlert className="h-4 w-4 shrink-0" />{error.message}</span>
                {error.upgradeUrl ? <Link href={error.upgradeUrl} className="font-semibold text-[#e1c27f] underline underline-offset-4">View Pro</Link> : null}
              </div>
            ) : null}

            {job?.status === "partial" || job?.status === "failed" ? (
              <div className="mt-5 border border-[#c4a15b]/25 bg-[#c4a15b]/[0.06] px-4 py-3 text-sm leading-6 text-white/68">
                <span className="font-semibold text-[#e1c27f]">{job.status === "partial" ? "Some results need verification." : "This check could not complete."}</span>{" "}
                {job.status === "partial" && job.providerFailures > 0
                  ? `${job.providerFailures} ${job.providerFailures === 1 ? "provider check was" : "provider checks were"} inconclusive. Confirmed available and taken results remain usable; retry only the marked domains before registering.`
                  : job.errorMessage || "Review the visible results and retry the same shortlist when you are ready."}
              </div>
            ) : null}

            {job ? (
              <>
                <div className="mt-6 space-y-3 lg:hidden" aria-label="Availability results by candidate">
                  {displayNames.map((name, index) => (
                    <MobileCandidateCard
                      key={name}
                      name={name}
                      index={index}
                      results={resultMap}
                      score={scores[name]}
                      tier={tiers[name] || "consider"}
                      compared={selectedCompareNames.includes(name)}
                      inProgress={activeJob}
                      onTierChange={(tier) => setTiers((current) => ({ ...current, [name]: tier }))}
                      onNote={() => setActiveNoteName(name)}
                      onCompare={() => toggleCompare(name)}
                      hasNote={Boolean(notes[name])}
                      primaryDomain={resultMap.get(resultKey(name, primaryTld))?.fullDomain || `${name}.${primaryTld}`}
                    />
                  ))}
                </div>

                <div className="mt-6 hidden overflow-x-auto border border-[#c4a15b]/35 lg:block">
                  <table className="min-w-[1390px] w-full border-collapse text-left">
                    <thead className="border-b border-[#c4a15b]/35 bg-white/[0.025] text-[11px] font-semibold uppercase tracking-[0.12em] text-white/48">
                      <tr>
                        <th scope="col" className="w-12 px-3 py-3 text-center">#</th>
                        <th scope="col" className="min-w-[150px] border-l border-white/10 px-4 py-3">Candidate</th>
                        {ALL_TLDS.map((tld) => <th key={tld} scope="col" className="min-w-[88px] border-l border-white/10 px-2 py-3 text-center">.{tld}</th>)}
                        <th scope="col" className="min-w-[228px] border-l border-white/10 px-3 py-3">Brand checks</th>
                        <th scope="col" className="min-w-[150px] border-l border-white/10 px-4 py-3">Founder Signal</th>
                        <th scope="col" className="min-w-[132px] border-l border-white/10 px-3 py-3">Tier</th>
                        <th scope="col" className="min-w-[94px] border-l border-white/10 px-3 py-3 text-center">Notes</th>
                        <th scope="col" className="min-w-[88px] border-l border-white/10 px-3 py-3 text-center">Compare</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayNames.map((name, index) => {
                        const tier = tiers[name] || "consider"
                        const compared = selectedCompareNames.includes(name)
                        return (
                          <tr key={name} className="border-b border-white/10 last:border-b-0 hover:bg-white/[0.018]">
                            <td className="px-3 py-3 text-center font-mono text-xs text-white/38">{index + 1}</td>
                            <th scope="row" className="border-l border-white/10 px-4 py-3 font-medium text-[#f4efe5]">{name}</th>
                            {ALL_TLDS.map((tld) => <td key={tld} className="border-l border-white/10 px-1 py-3 text-center"><AvailabilityCell result={resultMap.get(resultKey(name, tld))} inProgress={activeJob} /></td>)}
                            <td className="border-l border-white/10 px-3 py-3"><BrandFootprintChecks name={name} results={resultMap} compact /></td>
                            <td className="border-l border-white/10 px-4 py-3"><ScoreCell score={scores[name]} />{scores[name] ? <Link href={`/brand-launch?domain=${encodeURIComponent(resultMap.get(resultKey(name, primaryTld))?.fullDomain || `${name}.${primaryTld}`)}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#e1c27f] hover:underline"><Sparkles className="h-3 w-3" /> Launch Kit</Link> : null}</td>
                            <td className="border-l border-white/10 px-3 py-3">
                              <select value={tier} onChange={(event) => setTiers((current) => ({ ...current, [name]: event.target.value as Tier }))} aria-label={`Tier for ${name}`} className="h-9 w-full border border-white/15 bg-black/25 px-2 text-xs text-white/78 outline-none focus:border-[#c4a15b]">
                                {TIER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                            </td>
                            <td className="border-l border-white/10 px-3 py-3 text-center">
                              <button type="button" onClick={() => setActiveNoteName(name)} className={`min-h-9 px-2 text-xs font-semibold transition ${notes[name] ? "text-[#e1c27f]" : "text-white/50 hover:text-white"}`} aria-label={`${notes[name] ? "Edit" : "Add"} note for ${name}`}>
                                <FileText className="mx-auto h-4 w-4" />
                              </button>
                            </td>
                            <td className="border-l border-white/10 px-3 py-3 text-center">
                              <label className="inline-flex min-h-9 cursor-pointer items-center justify-center px-2" title={compared ? `Remove ${name} from comparison` : `Compare ${name}`}>
                                <input type="checkbox" checked={compared} onChange={() => toggleCompare(name)} className="h-4 w-4 accent-[#c4a15b]" aria-label={`Compare ${name}`} />
                              </label>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/48">
                  <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Available</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Taken</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#d8ba7c]" /> Verification required</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Availability can change after this check</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-white/45">For a candidate with an available domain, Brand Footprint opens direct social-profile checks and official UK, US and EU trade-mark searches. Results must be verified before registering, incorporating or using a name commercially.</p>

                <section className="mt-5 flex flex-col gap-4 border border-[#c4a15b]/35 bg-[#c4a15b]/[0.055] p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Founder Signal action">
                  <div>
                    <p className="font-semibold text-[#f4efe5]">Ready to score this shortlist?</p>
                    <p className="mt-1 text-sm leading-5 text-white/55">Founder Signal will compare every candidate against .{primaryTld}.</p>
                  </div>
                  {usage && !canRunFounderSignal ? (
                    <Link href="/pricing?reason=founder-signal-pro&from=bulk-check" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-[#c4a15b]/60 bg-[#c4a15b]/10 px-4 text-sm font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/18">
                      <Sparkles className="h-4 w-4" /> Unlock Founder Signal
                    </Link>
                  ) : (
                    <button type="button" onClick={requestFounderSignal} disabled={!canRunFounderSignal || !job || activeJob || !job.results.length || isScoring} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-[#c4a15b]/60 bg-[#c4a15b]/10 px-4 text-sm font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/18 disabled:cursor-not-allowed disabled:opacity-40">
                      {isScoring ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {isScoring ? "Scoring shortlist..." : usage ? `Run Founder Signal for .${primaryTld}` : "Checking Pro access..."}
                    </button>
                  )}
                </section>

                {activeNoteName ? (
                  <section className="mt-6 border border-[#c4a15b]/35 bg-black/20 p-4" aria-label={`Notes for ${activeNoteName}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-display text-xl font-semibold">Notes for {activeNoteName}</h3>
                        <p className="mt-1 text-sm text-white/48">Your local draft stays on this device. Save the workspace to include notes in your secure decision record.</p>
                      </div>
                      <button type="button" onClick={() => setActiveNoteName(null)} className="inline-flex min-h-10 items-center gap-1.5 px-2 text-xs font-semibold text-white/56 hover:text-[#e1c27f]"><X className="h-4 w-4" /> Done</button>
                    </div>
                    <textarea value={notes[activeNoteName] || ""} onChange={(event) => setNotes((current) => ({ ...current, [activeNoteName]: event.target.value.slice(0, 1_000) }))} placeholder="Why this name feels strong, what still needs checking, or what to discuss with your co-founder..." rows={4} className="mt-4 w-full resize-y border border-white/15 bg-black/25 px-3 py-3 text-sm leading-6 text-white/82 outline-none placeholder:text-white/25 focus:border-[#c4a15b]" />
                  </section>
                ) : null}

                <section className="mt-8 border border-[#c4a15b]/45 bg-[#121210] p-4 sm:p-5" aria-labelledby="compare-heading">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 id="compare-heading" className="font-display text-2xl font-semibold tracking-tight">Compare finalists</h3>
                      <p className="mt-1 text-sm text-white/50">Select up to two names above and record the winner locally.</p>
                    </div>
                    <button type="button" onClick={exportCsv} disabled={!displayNames.length} className="inline-flex min-h-11 items-center gap-2 border border-[#c4a15b]/55 px-4 text-sm font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/10 disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-4 w-4" /> Export CSV</button>
                  </div>
                  {selectedCompareNames.length === 2 ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {selectedCompareNames.map((name) => <CompareCandidate key={name} name={name} score={scores[name]} primaryResult={primaryAvailability(name)} tier={tiers[name] || "consider"} isWinner={winnerName === name} onSetWinner={() => setWinnerName(name)} />)}
                    </div>
                  ) : (
                    <div className="mt-5 flex min-h-32 items-center justify-center border border-dashed border-white/16 px-5 text-center text-sm leading-6 text-white/45">
                      <span><Sparkles className="mx-auto mb-3 h-5 w-5 text-[#c4a15b]" />Choose two candidates above to compare their availability, Founder Signal result, tier, and decision notes.</span>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="mt-6 flex min-h-[410px] items-center justify-center border border-dashed border-[#c4a15b]/30 bg-white/[0.018] p-8 text-center">
                <div className="max-w-sm">
                  <CircleDashed className="mx-auto h-8 w-8 text-[#c4a15b]" />
                  <h3 className="mt-5 font-display text-2xl font-semibold">Your decision board will appear here.</h3>
                  <p className="mt-3 text-sm leading-6 text-white/50">Bulk Check returns a clear state for every requested extension. When the shortlist is ready, choose the primary TLD and run Founder Signal.</p>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-white/42">
              <span>{usageError ? "Usage meter is temporarily unavailable." : usage?.isPro ? "Pro workspace allowance resets on the first UTC day of each month." : "Free allowance resets on the first UTC day of each month."}</span>
              <button type="button" onClick={requestFounderSignal} disabled={!canRunFounderSignal || !job || activeJob || !job.results.length || isScoring} className="hidden">
                {isScoring ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isScoring ? "Scoring shortlist..." : `Run Founder Signal for .${primaryTld}`}
              </button>
            </div>
          </section>
        </section>

        <section id="decision-record" className="mt-8 border border-[#c4a15b]/35 bg-[#121210] p-5 sm:p-6" aria-labelledby="saved-workspace-heading">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c4a15b]">Pro decision record</p>
              <h2 id="saved-workspace-heading" className="mt-2 font-display text-3xl font-semibold tracking-tight">Save, report, share</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">Saved work remains available to load and export after a subscription lapses. Creating or changing it always stays behind Pro access.</p>
            </div>
            {savedWorkspaceState === "ready" && savedWorkspace?.principal.email ? <span className="border border-white/12 px-3 py-1.5 text-xs text-white/52">{savedWorkspace.principal.email}</span> : null}
          </div>

          {savedWorkspaceState === "loading" ? <p className="mt-6 text-sm text-white/50">Checking your saved work...</p> : null}

          {savedWorkspaceState === "signed_out" ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-white/12 bg-black/15 p-4">
              <p className="max-w-xl text-sm leading-6 text-white/58">Sign in to load a prior decision or save this local draft as a secure Pro workspace.</p>
              <Link href={`/sign-in?redirect=${encodeURIComponent("/bulk-domain-check/workspace")}`} className="inline-flex min-h-11 items-center gap-2 border border-[#c4a15b]/55 px-4 text-sm font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/10"><FolderOpen className="h-4 w-4" /> Sign in</Link>
            </div>
          ) : null}

          {savedWorkspaceState === "unavailable" ? <p className="mt-6 text-sm leading-6 text-rose-200/80">Saved work cannot be reached at the moment. Your current local draft and CSV export still work.</p> : null}

          {savedWorkspaceState === "ready" && !canWriteSavedWork ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-[#c4a15b]/25 bg-[#c4a15b]/[0.06] p-4">
              <p className="max-w-xl text-sm leading-6 text-white/64">Your account can still load saved work and export it. Upgrade to Pro to save changes, create an immutable report, or make a view-only link.</p>
              <Link href="/pricing?reason=saved-decision-workspace" className="inline-flex min-h-11 items-center gap-2 bg-[#c4a15b] px-4 text-sm font-bold text-[#0b0b0a] transition hover:bg-[#e1c27f]"><Save className="h-4 w-4" /> View Pro</Link>
            </div>
          ) : null}

          {savedWorkspaceState === "ready" ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-4 border border-white/10 bg-black/15 p-4">
                <div>
                  <label htmlFor="workspace-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Workspace name</label>
                  <input id="workspace-title" value={workspaceTitle} onChange={(event) => setWorkspaceTitle(event.target.value.slice(0, 120))} disabled={!canWriteSavedWork} maxLength={120} className="mt-2 h-11 w-full border border-white/15 bg-black/25 px-3 text-sm text-[#f4efe5] outline-none placeholder:text-white/25 focus:border-[#c4a15b] disabled:cursor-not-allowed disabled:opacity-55" />
                </div>

                {savedWorkspace?.shortlists.length ? (
                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
                    Load saved workspace
                    <span className="relative mt-2 block">
                      <select value={activeSavedShortlistId || ""} onChange={(event) => { if (event.target.value) loadSavedShortlist(event.target.value) }} disabled={activeJob || isChecking} aria-label="Load saved workspace" className="h-11 w-full appearance-none border border-white/15 bg-black/25 px-3 pr-9 text-sm font-medium normal-case tracking-normal text-[#f4efe5] outline-none focus:border-[#c4a15b] disabled:cursor-not-allowed disabled:opacity-55">
                        <option value="">Choose a saved decision</option>
                        {savedWorkspace.shortlists.map((shortlist) => {
                          const project = savedWorkspace.projects.find((candidate) => candidate.id === shortlist.projectId)
                          return <option key={shortlist.id} value={shortlist.id}>{project?.name || "Decision"} - {shortlist.title}</option>
                        })}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e1c27f]" />
                    </span>
                  </label>
                ) : <p className="text-sm leading-6 text-white/46">No saved decisions yet. Run a Bulk Check, then save the working shortlist here.</p>}

                {canWriteSavedWork ? <button type="button" onClick={saveWorkspace} disabled={!job || activeJob || isSavingWorkspace} className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#c4a15b] px-4 text-sm font-bold text-[#0b0b0a] transition hover:bg-[#e1c27f] disabled:cursor-not-allowed disabled:opacity-45">{isSavingWorkspace ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSavingWorkspace ? "Saving decision..." : activeSavedShortlistId ? "Save decision changes" : "Save this decision"}</button> : null}
                {activeSavedShortlist ? <button type="button" onClick={deleteSavedShortlist} disabled={isDeletingSavedWork} className="inline-flex min-h-10 items-center justify-center border border-rose-300/25 px-3 text-xs font-semibold text-rose-200/80 transition hover:border-rose-200/55 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-45">{isDeletingSavedWork ? "Deleting..." : "Delete saved decision"}</button> : null}
              </div>

              <div className="border border-white/10 bg-black/15 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Immutable report</p>
                    <p className="mt-2 text-sm leading-6 text-white/54">Reports freeze the current saved entries, scores, availability snapshots, notes, and winner.</p>
                  </div>
                  {activeReports.length ? <span className="text-xs text-white/40">{activeReports.length} saved</span> : null}
                </div>

                {activeReports.length ? (
                  <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
                    Report
                    <select value={activeReport?.id || ""} onChange={(event) => { setActiveReportId(event.target.value || null); setActiveShareId(null); setShareUrl(null) }} aria-label="Decision report" className="mt-2 h-11 w-full border border-white/15 bg-black/25 px-3 text-sm font-medium normal-case tracking-normal text-[#f4efe5] outline-none focus:border-[#c4a15b]">
                      {activeReports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
                    </select>
                  </label>
                ) : <p className="mt-4 text-sm text-white/42">Save the decision first, then create its first report.</p>}

                <div className="mt-4 flex flex-wrap gap-3">
                  {canWriteSavedWork ? <button type="button" onClick={createDecisionReport} disabled={!activeSavedShortlistId || isCreatingReport} className="inline-flex min-h-11 items-center gap-2 border border-[#c4a15b]/55 px-4 text-sm font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/10 disabled:cursor-not-allowed disabled:opacity-45">{isCreatingReport ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}{isCreatingReport ? "Creating report..." : "Create report"}</button> : null}
                  {canWriteSavedWork ? <button type="button" onClick={createReportShare} disabled={!activeReport || isCreatingShare} className="inline-flex min-h-11 items-center gap-2 border border-white/18 px-4 text-sm font-semibold text-white/75 transition hover:border-[#c4a15b]/60 hover:text-[#e1c27f] disabled:cursor-not-allowed disabled:opacity-45">{isCreatingShare ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}{isCreatingShare ? "Making link..." : "Create view-only link"}</button> : null}
                  {activeReport ? <button type="button" onClick={deleteDecisionReport} disabled={isDeletingSavedWork} className="inline-flex min-h-11 items-center gap-2 border border-rose-300/25 px-4 text-sm font-semibold text-rose-200/80 transition hover:border-rose-200/55 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-45">{isDeletingSavedWork ? "Deleting..." : "Delete report"}</button> : null}
                </div>

                {shareUrl ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input value={shareUrl} readOnly aria-label="View-only report link" className="h-11 min-w-0 flex-1 border border-[#c4a15b]/40 bg-black/25 px-3 font-mono text-xs text-white/78 outline-none" />
                    <button type="button" onClick={copyShareUrl} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#c4a15b]/55 px-4 text-sm font-semibold text-[#e1c27f] transition hover:bg-[#c4a15b]/10"><Copy className="h-4 w-4" /> Copy</button>
                  </div>
                ) : null}
                {activePersistedShares.length ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs leading-5 text-white/45"><span>{activePersistedShares.length} active view-only {activePersistedShares.length === 1 ? "link" : "links"}. Link secrets are only shown when created.</span><button type="button" onClick={revokeReportShare} className="font-semibold text-[#e1c27f] hover:text-[#f4efe5]">Revoke latest link</button></div> : null}
              </div>
            </div>
          ) : null}

          {workspaceNotice ? <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-white/62" role="status">{workspaceNotice}</p> : null}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 py-5 text-xs leading-5 text-white/38">
          <span>Founder Signal is decision support, not legal, trademark, or registrar confirmation.</span>
          {job ? <span>{job.quotaRefunded ? "No allowance was used for this fully failed provider run." : "Network and queue retries preserve the server-side check identity."}</span> : null}
        </footer>
      </div>
    </main>
  )
}
