"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ArrowDownUp,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Copy,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  WandSparkles,
  XCircle,
} from "lucide-react"
import { namecheapLink } from "@/lib/affiliateLink"
import { cn } from "@/lib/utils"
import {
  CREATIVITY_OPTIONS,
  NAME_STYLE_OPTIONS,
  selectVerifiedAvailableDomain,
  sortCandidatesByFounderSignal,
  type AvailabilityState,
  type CreativityLevel,
  type GeneratedName,
  type GenerationModeV2,
  type GenerationPhase,
  type NameStyle,
  type NamingPreferenceProfile,
} from "@/components/generator-exploration-model"
import styles from "@/components/generator-exploration.module.css"
import type { DislikeReason } from "@/lib/name-feedback"

const DISLIKE_REASON_OPTIONS = [
  { id: "too_generic", label: "Too generic" },
  { id: "hard_to_pronounce", label: "Hard to pronounce" },
  { id: "does_not_fit_business", label: "Does not fit the business" },
  { id: "feels_ai_generated", label: "Feels AI-generated" },
  { id: "too_long", label: "Too long" },
  { id: "wrong_tone", label: "Wrong tone" },
  { id: "similar_to_another_brand", label: "Similar to another brand" },
  { id: "domain_problem", label: "Domain problem" },
  { id: "other", label: "Other" },
  { id: "skip", label: "Skip" },
] as const satisfies readonly { id: DislikeReason; label: string }[]

interface GenerationSplashProps {
  mode: GenerationModeV2
  phase: GenerationPhase
  brief: string
  style: NameStyle
  creativity: CreativityLevel
  maxLength: number
  previousBatchCount?: number
  onCancel: () => void
}

export function GenerationSplash({
  mode,
  phase,
  brief,
  style,
  creativity,
  maxLength,
  previousBatchCount = 0,
  onCancel,
}: GenerationSplashProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const splashRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    setPortalRoot(document.body)
  }, [])

  useEffect(() => {
    if (!portalRoot) return
    const body = document.body
    const previousOverflow = body.style.overflow
    body.style.overflow = "hidden"
    return () => {
      body.style.overflow = previousOverflow
    }
  }, [portalRoot])

  useEffect(() => {
    if (!portalRoot) return
    headingRef.current?.focus({ preventScroll: true })
    const splash = splashRef.current
    if (!splash) return
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCancelRef.current()
      } else if (event.key === "Tab") {
        event.preventDefault()
        cancelRef.current?.focus()
      }
    }
    splash.addEventListener("keydown", keepFocusInside)
    return () => splash.removeEventListener("keydown", keepFocusInside)
  }, [portalRoot])

  const heading = mode === "quick" ? "Finding names worth a second look" : "Building a sharper shortlist"
  const status = phase === "scoring_founder_signal" ? "Scoring names across five signals" : "Generating creative directions"
  const selectedStyle = NAME_STYLE_OPTIONS.find((option) => option.id === style)?.label ?? "Auto"
  const selectedCreativity = CREATIVITY_OPTIONS.find((option) => option.id === creativity)?.label ?? "Balanced"

  if (!portalRoot) return null

  return createPortal(
    <section
      ref={splashRef}
      className={cn(
        "fixed inset-0 z-[130] flex h-dvh min-h-0 items-center justify-center overflow-hidden overscroll-contain p-5 sm:p-8",
        styles.splash,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="generation-splash-heading"
      aria-describedby="generation-splash-status"
      aria-busy="true"
    >
      <div className={cn("pointer-events-none absolute inset-0", styles.splashGrid)} aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
        <div className="relative mx-auto mb-6 h-20 w-20" aria-hidden="true">
          <div className={cn("absolute inset-0 rounded-full border border-[#D4AF37]/20", styles.pulse)} />
          <div className={cn("absolute inset-2 rounded-full border border-dashed border-[#F6E27A]/45", styles.orbit)} />
          <div className="absolute inset-5 flex items-center justify-center rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#F6E27A] shadow-[0_0_42px_rgba(212,175,55,0.22)]">
            <WandSparkles className="h-6 w-6" />
          </div>
        </div>

        <h2 id="generation-splash-heading" ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold tracking-tight text-white outline-none sm:text-3xl">
          {heading}
        </h2>
        <p id="generation-splash-status" role="status" aria-live="polite" className="mt-2 text-sm text-white/48">
          {status}. The names will appear before domain checks finish.
        </p>

        <div className="mx-auto mt-6 max-w-xl rounded-xl border border-white/8 bg-black/25 p-4 text-left">
          <p className="line-clamp-2 text-sm leading-6 text-white/72">{brief}</p>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/8 pt-4 text-center">
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/28">Style</dt>
              <dd className="mt-1 text-xs font-semibold text-[#F6E27A]">{selectedStyle}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/28">Creativity</dt>
              <dd className="mt-1 text-xs font-semibold text-white/70">{selectedCreativity}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/28">Length</dt>
              <dd className="mt-1 text-xs font-semibold text-white/70">Up to {maxLength}</dd>
            </div>
          </dl>
        </div>

        {previousBatchCount > 0 ? (
          <p className="mt-3 text-[11px] text-white/30">Your previous {previousBatchCount}-name batch is retained locally.</p>
        ) : null}

        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.035] px-5 text-sm font-semibold text-white/68 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
        >
          <XCircle className="h-4 w-4" />
          Cancel generation
        </button>
      </div>
    </section>,
    portalRoot,
  )
}

interface QuickExplorationControlsProps {
  style: NameStyle
  creativity: CreativityLevel
  blacklist: string
  preferences: NamingPreferenceProfile
  onStyleChange: (style: NameStyle) => void
  onCreativityChange: (creativity: CreativityLevel) => void
  onBlacklistChange: (value: string) => void
  onResetPreferences: () => void
}

export function QuickExplorationControls({
  style,
  creativity,
  blacklist,
  preferences,
  onStyleChange,
  onCreativityChange,
  onBlacklistChange,
  onResetPreferences,
}: QuickExplorationControlsProps) {
  const hasPreferences =
    preferences.likedStyles.length > 0 ||
    preferences.dislikedStyles.length > 0 ||
    preferences.preferredSounds.length > 0 ||
    preferences.avoidedSounds.length > 0

  return (
    <details className="group rounded-lg border border-white/8 bg-black/18">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#D4AF37]" />
          Shape the creative direction
          <span className="hidden text-xs font-normal text-white/30 sm:inline">
            {NAME_STYLE_OPTIONS.find((option) => option.id === style)?.label} · {CREATIVITY_OPTIONS.find((option) => option.id === creativity)?.label}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-white/30 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>

      <div className="space-y-5 border-t border-white/8 p-4">
        <fieldset>
          <legend className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">Naming style</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {NAME_STYLE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={style === option.id}
                onClick={() => onStyleChange(option.id)}
                className={cn(
                  "min-h-[58px] rounded-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
                  style === option.id
                    ? "border-[#D4AF37]/45 bg-[#D4AF37]/10 text-white"
                    : "border-white/8 bg-white/[0.025] text-white/50 hover:border-white/16 hover:text-white/75",
                )}
              >
                <span className="block text-xs font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-[10px] leading-4 text-white/32">{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">Creativity</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {CREATIVITY_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={creativity === option.id}
                onClick={() => onCreativityChange(option.id)}
                className={cn(
                  "min-h-[48px] rounded-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
                  creativity === option.id
                    ? "border-[#D4AF37]/45 bg-[#D4AF37]/10 text-white"
                    : "border-white/8 bg-white/[0.025] text-white/50 hover:text-white/75",
                )}
              >
                <span className="block text-xs font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-[10px] text-white/32">{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="quick-blacklist" className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">
            Words to avoid
          </label>
          <input
            id="quick-blacklist"
            value={blacklist}
            onChange={(event) => onBlacklistChange(event.target.value.slice(0, 240))}
            placeholder="Optional, comma-separated: hub, labs, nova"
            className="mt-2 h-11 w-full rounded-lg border border-white/9 bg-white/[0.035] px-3 text-sm text-white/80 placeholder:text-white/22 focus:border-[#D4AF37]/45 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/15"
          />
        </div>

        {hasPreferences ? (
          <div className="flex flex-col gap-3 rounded-lg border border-[#D4AF37]/15 bg-[#D4AF37]/[0.055] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-[#F6E27A]">Learning from your choices</p>
              <p className="mt-1 text-[11px] leading-4 text-white/38">
                Preferences stay in this browser. No briefs or generated names are stored in the profile.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetPreferences}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/55 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset preferences
            </button>
          </div>
        ) : null}
      </div>
    </details>
  )
}

interface GeneratorExplorationResultsProps {
  mode: GenerationModeV2
  candidates: GeneratedName[]
  phase: GenerationPhase
  isPro: boolean
  shortlist: string[]
  dislikedIds: Set<string>
  likedIds: Set<string>
  copiedValue: string | null
  selectedCandidateId: string | null
  scoreAllowanceExhausted: boolean
  scoringError: string | null
  availabilityError: string | null
  sortByScore: boolean
  onSave: (candidate: GeneratedName) => void
  onLike: (candidate: GeneratedName) => void
  onDislike: (candidate: GeneratedName, reason?: DislikeReason | null) => void
  onMoreLikeThis: (candidate: GeneratedName) => void
  onCopy: (candidate: GeneratedName) => void
  onSelectCandidate: (candidate: GeneratedName) => void
  onRegistrarClick: (candidate: GeneratedName, tld: string, state: AvailabilityState) => void
  onRetryAvailability: () => void
  onRunFounderSignal: () => void
  onToggleSort: () => void
  onUpgradeScoring: () => void
}

function preferredDomain(candidate: GeneratedName): string {
  const entries = Object.entries(candidate.availability)
  const preferred = entries.find(([, state]) => state.status === "available") ??
    entries.find(([, state]) => state.status === "likely_available" || state.status === "needs_verification") ??
    entries.find(([tld]) => tld === "com") ??
    entries[0]
  return preferred?.[1].fullDomain ?? `${candidate.name.toLowerCase()}.com`
}

function wordmarkClass(style: NameStyle): string {
  if (style === "evocative") return styles.wordmarkEvocative
  if (style === "compound") return styles.wordmarkCompound
  if (style === "alternate_spelling") return styles.wordmarkAlternateSpelling
  if (style === "real_word") return styles.wordmarkRealWord
  if (style === "short_phrase") return styles.wordmarkShortPhrase
  if (style === "non_english") return styles.wordmarkNonEnglish
  return styles.wordmarkBrandable
}

function AvailabilityBadge({
  candidate,
  tld,
  state,
  onRegistrarClick,
}: {
  candidate: GeneratedName
  tld: string
  state: AvailabilityState
  onRegistrarClick: (candidate: GeneratedName, tld: string, state: AvailabilityState) => void
}) {
  const checking = state.status === "checking"
  const available = state.status === "available"
  const verification = state.status === "likely_available" || state.status === "needs_verification"
  const taken = state.status === "taken"
  const Icon = checking ? RefreshCw : available ? CheckCircle2 : verification ? ShieldAlert : taken ? XCircle : CircleHelp
  const label = checking
    ? "Checking"
    : available
      ? "Available"
      : verification
        ? "Verify"
        : taken
          ? "Taken"
          : "Unknown"
  const className = cn(
    "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold sm:text-xs",
    checking && "border-white/9 bg-white/[0.025] text-white/35",
    available && "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    verification && "border-amber-300/25 bg-amber-300/[0.08] text-amber-200",
    taken && "border-white/8 bg-white/[0.02] text-white/30",
    state.status === "error" && "border-slate-300/15 bg-slate-300/[0.04] text-slate-200/55",
  )

  const content = (
    <>
      <Icon className={cn("h-3 w-3", checking && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
      .{tld} {label}
    </>
  )

  if (available || verification) {
    const fullDomain = state.fullDomain ?? `${candidate.name.toLowerCase()}.${tld}`
    return (
      <a
        href={state.registerUrl || namecheapLink(fullDomain, { source: "generator_v2_tld", content: tld })}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onRegistrarClick(candidate, tld, state)}
        className={cn(className, "transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]")}
        aria-label={`${fullDomain}: ${label}. Verify with registrar.`}
      >
        {content}
      </a>
    )
  }

  return <span className={className} aria-label={`.${tld}: ${label}`}>{content}</span>
}

export function GeneratorExplorationResults({
  mode,
  candidates,
  phase,
  isPro,
  shortlist,
  dislikedIds,
  likedIds,
  copiedValue,
  selectedCandidateId,
  scoreAllowanceExhausted,
  scoringError,
  availabilityError,
  sortByScore,
  onSave,
  onLike,
  onDislike,
  onMoreLikeThis,
  onCopy,
  onSelectCandidate,
  onRegistrarClick,
  onRetryAvailability,
  onRunFounderSignal,
  onToggleSort,
  onUpgradeScoring,
}: GeneratorExplorationResultsProps) {
  const [reasonTargetId, setReasonTargetId] = useState<string | null>(null)
  const hasScores = candidates.some((candidate) => candidate.founderSignal?.status === "ready")
  const sortedCandidates = useMemo(
    () => sortCandidatesByFounderSignal(candidates, mode === "advanced" && sortByScore),
    [candidates, mode, sortByScore],
  )
  const availabilityChecking = candidates.some((candidate) =>
    Object.values(candidate.availability).some((state) => state.status === "checking"),
  )

  return (
    <div className="min-w-0">
      <section className="mb-5 overflow-hidden rounded-xl border border-[#D4AF37]/18 bg-[#D4AF37]/[0.045] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]/70">
              {mode === "quick" ? "Creative exploration" : "Advanced shortlist"}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl">
              {candidates.length} names, {mode === "advanced" && sortByScore ? "sorted by Founder Signal" : "kept in creative order"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-white/42 sm:text-sm">
              {availabilityChecking
                ? "Names are ready. Domain checks are continuing without changing this order."
                : "Domain checks are complete. Registrar status can change, so verify before purchasing."}
            </p>
            {availabilityError ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p role="alert" className="text-xs text-amber-200/75">{availabilityError}</p>
                <button
                  type="button"
                  onClick={onRetryAvailability}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-amber-200/20 bg-amber-200/[0.07] px-3 text-xs font-semibold text-amber-100 transition hover:bg-amber-200/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry domain checks
                </button>
              </div>
            ) : null}
          </div>

          {mode === "advanced" ? (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              {hasScores ? (
                <button
                  type="button"
                  aria-pressed={sortByScore}
                  onClick={onToggleSort}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 text-sm font-semibold text-[#F6E27A] transition hover:bg-[#D4AF37]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                >
                  <ArrowDownUp className="h-4 w-4" />
                  {sortByScore ? "Restore creative order" : "Sort by Founder Signal"}
                </button>
              ) : scoreAllowanceExhausted ? (
                <button
                  type="button"
                  onClick={onUpgradeScoring}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#D4AF37,#F6E27A,#D4AF37)] px-4 text-sm font-bold text-[#0a0800]"
                >
                  <ShieldCheck className="h-4 w-4" /> Unlock unlimited scoring
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRunFounderSignal}
                  disabled={phase === "scoring_founder_signal"}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#D4AF37,#F6E27A,#D4AF37)] px-4 text-sm font-bold text-[#0a0800] shadow-[0_12px_28px_rgba(212,175,55,0.18)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6E27A]"
                >
                  {phase === "scoring_founder_signal" ? <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ShieldCheck className="h-4 w-4" />}
                  {phase === "scoring_founder_signal" ? `Scoring ${candidates.length} names` : "Run Founder Signal on all names"}
                </button>
              )}
              {!hasScores && !scoreAllowanceExhausted ? (
                <p className="text-[10px] text-white/30">
                  {isPro ? "Included with Pro fair use." : "One complete scored batch is included each month."}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="max-w-xs text-xs leading-5 text-white/36">Save, dislike or choose More like this to teach the next batch what you prefer.</p>
          )}
        </div>

        {phase === "scoring_founder_signal" ? (
          <div className={cn("mt-4 rounded-lg border border-[#D4AF37]/18 bg-black/20 px-4 py-3", styles.scoringSweep)} role="status" aria-live="polite">
            <div className="relative z-10 flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-[#F6E27A]" />
              <div>
                <p className="text-xs font-semibold text-white/75">Scoring {candidates.length} names across five signals</p>
                <p className="mt-0.5 text-[10px] text-white/30">Creative order will stay unchanged unless you choose to sort.</p>
              </div>
            </div>
          </div>
        ) : null}

        {scoringError ? <p role="alert" className="mt-3 text-xs text-red-300">{scoringError}</p> : null}
      </section>

      <div className="grid gap-3 xl:grid-cols-2" aria-label={`${mode === "quick" ? "Quick" : "Advanced"} generated names`}>
        {sortedCandidates.map((candidate) => {
          const domain = preferredDomain(candidate)
          const verifiedAvailableDomain = selectVerifiedAvailableDomain(candidate)
          const saved = Object.values(candidate.availability).some((state) =>
            Boolean(state.fullDomain && shortlist.includes(state.fullDomain)),
          )
          const availabilityPending = Object.values(candidate.availability).some((state) => state.status === "checking")
          const saveDisabled = !saved && !verifiedAvailableDomain
          const saveLabel = saved
            ? "Saved"
            : availabilityPending
              ? "Checking…"
              : verifiedAvailableDomain
                ? "Save"
                : "No verified domain"
          const disliked = dislikedIds.has(candidate.id)
          const liked = likedIds.has(candidate.id)
          const selected = selectedCandidateId === candidate.id
          const signal = candidate.founderSignal
          return (
            <article
              key={candidate.id}
              className={cn(
                "w-full min-w-0 max-w-full rounded-xl border border-white/8 p-4 transition sm:p-5",
                styles.resultCard,
                selected && "border-[#D4AF37]/38 shadow-[0_0_0_1px_rgba(212,175,55,0.12)]",
                disliked ? "opacity-55" : "hover:-translate-y-0.5 hover:border-[#D4AF37]/24 hover:shadow-[0_18px_44px_rgba(0,0,0,0.32)]",
              )}
              data-selected={selected ? "true" : undefined}
            >
              <div className={cn("rounded-lg border border-[#D4AF37]/12 px-4 py-5", styles.wordmark)} aria-hidden="true">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]/42">Wordmark preview</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                    {NAME_STYLE_OPTIONS.find((option) => option.id === candidate.style)?.label ?? "Brandable"}
                  </span>
                </div>
                <p className={cn("mt-4 truncate text-3xl text-white sm:text-4xl", wordmarkClass(candidate.style))}>{candidate.name}</p>
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/28">Direction {candidate.generationRank}</p>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelectCandidate(candidate)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
                        selected
                          ? "border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#F6E27A]"
                          : "border-white/8 text-white/32 hover:text-white/65",
                      )}
                    >
                      {selected ? "Selected" : "Select"}
                    </button>
                  </div>
                  <h3 className="mt-1 truncate font-display text-xl font-semibold text-white">{candidate.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onCopy(candidate)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/[0.035] text-white/48 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                  aria-label={`Copy ${domain}`}
                >
                  {copiedValue === domain ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <p className="mt-3 min-h-[3.75rem] text-sm leading-5 text-white/52">{candidate.rationale}</p>

              <div className="mt-4 flex flex-wrap gap-1.5" aria-label={`Domain status for ${candidate.name}`}>
                {Object.entries(candidate.availability).map(([tld, state]) => (
                  <AvailabilityBadge
                    key={tld}
                    candidate={candidate}
                    tld={tld}
                    state={state}
                    onRegistrarClick={onRegistrarClick}
                  />
                ))}
              </div>

              {mode === "advanced" && signal?.status === "ready" ? (
                <section className="mt-4 rounded-lg border border-[#D4AF37]/16 bg-[#D4AF37]/[0.055] p-3" aria-label={`Founder Signal for ${candidate.name}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#F6E27A]">
                      <ShieldCheck className="h-4 w-4" /> Founder Signal
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold tabular-nums text-white">{signal.score ?? "-"}</span>
                      <span className="text-xs text-white/35"> / 100</span>
                      {signal.band ? <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[#F6E27A]">{signal.band}</span> : null}
                    </div>
                  </div>
                  {signal.breakdown && Object.keys(signal.breakdown).length > 0 ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 sm:grid-cols-5">
                      {Object.entries(signal.breakdown).map(([label, value]) => (
                        <div key={label}>
                          <dt className="truncate text-[9px] capitalize text-white/28">{label.replace(/_/g, " ")}</dt>
                          <dd className="mt-0.5 text-xs font-semibold tabular-nums text-white/65">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {signal.reasons?.[0] ? <p className="mt-3 text-[11px] leading-4 text-white/40">{signal.reasons[0]}</p> : null}
                </section>
              ) : null}

              <div className={cn("mt-4 grid gap-2 border-t border-white/8 pt-4", mode === "quick" ? "grid-cols-4" : "grid-cols-3")}>
                <button
                  type="button"
                  disabled={saveDisabled}
                  onClick={() => onSave(candidate)}
                  title={saveDisabled
                    ? availabilityPending
                      ? "Save unlocks when a domain is verified available"
                      : "No verified available domain can be saved from this result"
                    : saved
                      ? "Remove the saved domain"
                      : `Save ${verifiedAvailableDomain}`}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
                    saved
                      ? "border-[#D4AF37]/35 bg-[#D4AF37]/12 text-[#F6E27A]"
                      : saveDisabled
                        ? "cursor-not-allowed border-white/6 bg-white/[0.015] text-white/24"
                        : "border-white/9 bg-white/[0.03] text-white/52 hover:text-white",
                  )}
                >
                  {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {saveLabel}
                </button>
                <button
                  type="button"
                  aria-pressed={liked}
                  onClick={() => onLike(candidate)}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
                    liked
                      ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200"
                      : "border-white/9 bg-white/[0.03] text-white/52 hover:text-white",
                  )}
                >
                  {liked ? <Check className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                  {liked ? "Liked" : "Good fit"}
                </button>
                <button
                  type="button"
                  aria-pressed={disliked}
                  onClick={() => {
                    if (disliked) {
                      onDislike(candidate)
                      setReasonTargetId(null)
                      return
                    }
                    onDislike(candidate, "skip")
                    setReasonTargetId(candidate.id)
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
                    disliked
                      ? "border-red-300/20 bg-red-300/[0.07] text-red-200/75"
                      : "border-white/9 bg-white/[0.03] text-white/52 hover:text-white",
                  )}
                >
                  {disliked ? <RotateCcw className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                  {disliked ? "Undo" : "Not right"}
                </button>
                {mode === "quick" ? (
                  <button
                    type="button"
                    onClick={() => onMoreLikeThis(candidate)}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-2 text-xs font-semibold text-[#F6E27A]/80 transition hover:bg-[#D4AF37]/10 hover:text-[#F6E27A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                  >
                    <WandSparkles className="h-3.5 w-3.5" /> More like this
                  </button>
                ) : null}
              </div>

              {reasonTargetId === candidate.id && disliked ? (
                <div className="mt-2 rounded-lg border border-red-300/14 bg-red-300/[0.04] p-2" role="group" aria-label={`Optional dislike reason for ${candidate.name}`}>
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-100/55">Optional reason</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {DISLIKE_REASON_OPTIONS.map((reason) => (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => {
                          onDislike(candidate, reason.id)
                          setReasonTargetId(null)
                        }}
                        className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium text-white/48 transition hover:border-red-200/25 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : disliked ? (
                <p className="mt-2 text-center text-[10px] text-white/30">
                  {mode === "quick"
                    ? "This direction will count less in future Quick batches."
                    : "Marked as a weaker direction in this shortlist."}
                </p>
              ) : null}

              {Object.entries(candidate.availability).some(([, state]) => state.status === "available" || state.status === "likely_available" || state.status === "needs_verification" || state.status === "error") ? (
                <a
                  href={namecheapLink(domain, { source: "generator_v2_result", content: candidate.style })}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    const [tld, state] = Object.entries(candidate.availability).find(([, item]) => item.fullDomain === domain) ?? ["com", candidate.availability.com]
                    if (state) onRegistrarClick(candidate, tld, state)
                  }}
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 text-xs font-semibold text-white/46 transition hover:border-[#D4AF37]/24 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Verify {domain} at registrar
                </a>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}
