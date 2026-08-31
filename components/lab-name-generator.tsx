"use client"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  FlaskConical,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { namecheapLink } from "@/lib/affiliateLink"
import type { NameFeedbackType } from "@/lib/name-feedback"
import {
  NAMING_MODES,
  NAME_SPRINT_TLDS,
  type EligibilityFailureCode,
  type NameConstitution,
  type NameSprintCandidate,
  type NameSprintRunResult,
  type NamingMode,
  type SemanticTerritory,
} from "@/lib/name-sprint/types"

type Stage = "brief" | "constitution" | "results" | "compare" | "audit"
type Compiled = { constitution: NameConstitution; territories: SemanticTerritory[]; briefId: string | null }
type Run = NameSprintRunResult & { briefId?: string | null; runId?: string | null; emptyResultRefunded?: boolean; retryAllowed?: boolean }
type Quota = {
  allowed: boolean
  plan: "free" | "pro"
  used: number
  limit: number
  remaining: number
  resetAt: string | null
}

type Draft = {
  description: string
  category: string
  audience: string
  market: string
  language: string
  namingMode: NamingMode
  tone: string
  include: string
  avoid: string
  competitors: string
  minLength: number
  maxLength: number
}

const DRAFT_KEY = "namolux.name-sprint.lab.v1"
const SESSION_KEY = "namolux.feedback.session.v1"
const EMPTY_DRAFT: Draft = {
  description: "",
  category: "",
  audience: "",
  market: "United Kingdom",
  language: "English",
  namingMode: "distinctive_startup",
  tone: "credible, clear, forward-looking",
  include: "",
  avoid: "AI, quantum, smart, solutions",
  competitors: "",
  minLength: 5,
  maxLength: 12,
}

const MODE_LABELS: Record<NamingMode, string> = {
  distinctive_startup: "Distinctive startup",
  local_service: "Local service",
  product_feature: "Product or feature",
  premium_luxury: "Premium or luxury",
  technical_credible: "Technical and credible",
  consumer_friendly: "Consumer and friendly",
  invented_global: "Invented global brand",
}

const REJECT_REASONS = [
  ["too_generic", "Too generic"],
  ["hard_to_pronounce", "Hard to pronounce"],
  ["hard_to_spell", "Hard to spell"],
  ["feels_copied", "Feels copied"],
  ["wrong_industry", "Wrong industry"],
  ["wrong_tone", "Wrong tone"],
  ["meaning_is_weak", "Meaning is weak"],
  ["sounds_cheap", "Sounds cheap"],
  ["too_artificial", "Too artificial"],
  ["existing_company_or_brand", "Existing company or brand"],
] as const

const OFFICIAL_TRADEMARK_CHECKS = [
  { label: "UK IPO", href: "https://www.gov.uk/search-for-trademark" },
  { label: "USPTO", href: "https://www.uspto.gov/trademarks/search/search" },
  { label: "EUIPO", href: "https://www.euipo.europa.eu/en/search-ip" },
] as const

const field = "w-full border border-white/15 bg-[#0b0c0d] px-4 py-3 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-[#d6b15e]"
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 border border-white/15 px-4 text-sm text-stone-200 transition hover:border-[#d6b15e]/60 hover:text-[#f1d38e] disabled:cursor-not-allowed disabled:opacity-40"
const primary = "inline-flex min-h-11 items-center justify-center gap-2 bg-[#d6b15e] px-5 text-sm font-semibold text-[#0a0a0a] transition hover:bg-[#e2c274] disabled:cursor-not-allowed disabled:opacity-45"

function splitTerms(value: string, max = 20) {
  return Array.from(new Set(value.split(/[,;\n]+/).map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean))).slice(0, max)
}

function getFeedbackSession() {
  try {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing && existing.length >= 8) return existing
    const value = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, value)
    return value
  } catch {
    return `session-${Date.now()}-fallback`
  }
}

function generationRequestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `name_sprint_${crypto.randomUUID()}`
    : `name_sprint_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function LabNameGenerator({ internalTools = false }: { internalTools?: boolean }) {
  const [stage, setStage] = useState<Stage>("brief")
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [compiled, setCompiled] = useState<Compiled | null>(null)
  const [run, setRun] = useState<Run | null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const [rejectedNames, setRejectedNames] = useState<string[]>([])
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [busy, setBusy] = useState<"compile" | "generate" | "">("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [auditCode, setAuditCode] = useState("all")
  const [auditStrategy, setAuditStrategy] = useState("all")
  const [quota, setQuota] = useState<Quota | null>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null")
        if (stored && typeof stored === "object") setDraft({ ...EMPTY_DRAFT, ...stored })
      } catch {}
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch {}
  }, [draft])

  useEffect(() => {
    let cancelled = false
    void fetch("/api/lab/name-constitution", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!cancelled && response.ok && data.quota) setQuota(data.quota)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const savedCandidates = useMemo(
    () => (run?.candidates || []).filter((candidate) => saved.includes(candidate.id)),
    [run, saved],
  )

  const grouped = useMemo(() => {
    if (!run) return []
    return run.territories.map((territory) => ({
      territory,
      candidates: run.candidates.filter((candidate) => candidate.territoryId === territory.id),
    })).filter((group) => group.candidates.length)
  }, [run])

  const auditCodes = useMemo(() => Array.from(new Set((run?.rejected || []).flatMap((candidate) => candidate.eligibility.failureCodes))).sort(), [run])
  const auditStrategies = useMemo(() => Array.from(new Set((run?.rejected || []).map((candidate) => candidate.strategy))).sort(), [run])
  const filteredAudit = useMemo(() => (run?.rejected || []).filter((candidate) =>
    (auditCode === "all" || candidate.eligibility.failureCodes.includes(auditCode as EligibilityFailureCode))
    && (auditStrategy === "all" || candidate.strategy === auditStrategy),
  ), [run, auditCode, auditStrategy])

  function updateDraft(value: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...value }))
  }

  async function compileBrief() {
    if (draft.description.trim().length < 30) {
      setError("Describe what you are building, who it helps, and what makes it different in at least 30 characters.")
      return
    }
    setBusy("compile")
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/lab/name-constitution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: `name_brief_${generationRequestKey()}`,
          description: draft.description,
          category: draft.category,
          audience: draft.audience,
          markets: splitTerms(draft.market, 6),
          languages: splitTerms(draft.language, 6),
          namingMode: draft.namingMode,
          tone: splitTerms(draft.tone, 6),
          include: splitTerms(draft.include, 10),
          avoid: splitTerms(draft.avoid, 20),
          competitors: splitTerms(draft.competitors, 12),
          preferredTlds: [...NAME_SPRINT_TLDS],
          preferredLength: { min: draft.minLength, max: draft.maxLength },
        }),
      })
      const data = await response.json()
      if (data.quota) setQuota(data.quota)
      if (!response.ok) throw new Error(data.error || "The Name Constitution could not be compiled.")
      setCompiled({ constitution: data.constitution, territories: data.territories, briefId: data.briefId || null })
      setStage("constitution")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Name Constitution could not be compiled.")
    } finally {
      setBusy("")
    }
  }

  async function generateNames() {
    if (!compiled) return
    setBusy("generate")
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/lab/name-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...compiled, previouslyRejected: rejectedNames, idempotencyKey: generationRequestKey() }),
      })
      const data = await response.json()
      if (data.quota) setQuota(data.quota)
      if (!response.ok) throw new Error(data.error || "The quality pass could not complete.")
      setRun(data)
      setSaved([])
      setRejecting(null)
      setStage("results")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The quality pass could not complete.")
    } finally {
      setBusy("")
    }
  }

  function updateConstitution<K extends keyof NameConstitution>(key: K, value: NameConstitution[K]) {
    setCompiled((current) => current ? { ...current, constitution: { ...current.constitution, [key]: value } } : current)
  }

  function toggleSave(candidate: NameSprintCandidate) {
    const willSave = !saved.includes(candidate.id)
    setSaved((current) => willSave ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))
    void sendFeedback(candidate, willSave ? "save" : "unsave")
  }

  function rejectCandidate(candidate: NameSprintCandidate, reason: string) {
    setSaved((current) => current.filter((id) => id !== candidate.id))
    setRejectedNames((current) => Array.from(new Set([...current, candidate.name])))
    setRejecting(null)
    setNotice(`${candidate.name} will be excluded from the next refinement wave.`)
    void sendFeedback(candidate, "reject", reason)
  }

  function preference(candidate: NameSprintCandidate, type: NameFeedbackType, message: string) {
    setNotice(message)
    void sendFeedback(candidate, type)
  }

  async function sendFeedback(candidate: NameSprintCandidate, feedbackType: NameFeedbackType, feedbackReason?: string) {
    if (!run) return
    try {
      await fetch("/api/name-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousSessionId: getFeedbackSession(),
          briefId: run.briefId || compiled?.briefId,
          briefTextSnapshot: compiled?.constitution.description,
          candidateId: candidate.id,
          candidateName: candidate.name,
          candidateDescription: candidate.association,
          candidatePosition: run.candidates.findIndex((item) => item.id === candidate.id),
          generationId: run.runId || `name-sprint-${run.version}`,
          nameSprintRunId: run.runId,
          modelProvider: "openai",
          modelName: run.usage.model,
          promptVersion: run.version,
          namingStyle: candidate.strategy,
          vibe: compiled?.constitution.personality.join(", "),
          displayedScores: candidate.founderSignal,
          domainAvailabilitySnapshot: { domains: candidate.domainStatuses },
          feedbackType,
          feedbackReason: feedbackReason || null,
          isFounderFeedback: true,
          eventMetadata: { territoryId: candidate.territoryId, roots: candidate.roots },
        }),
      })
    } catch {
      // Preference actions remain usable even when telemetry is temporarily unavailable.
    }
  }

  function startOver() {
    setStage("brief")
    setCompiled(null)
    setRun(null)
    setSaved([])
    setRejectedNames([])
    setRejecting(null)
    setError("")
    setNotice("")
  }

  return (
    <main className="min-h-screen bg-[#08090a] px-4 pb-20 pt-28 text-stone-100 sm:px-6">
      <section className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-8">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b15e]"><FlaskConical size={15} /> NamoLux Name Sprint</p>
            <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">A shortlist worth building on. Not 100 names to delete.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-400">NamoLux creates the broad list privately, rejects weak applicants before scoring, and shows only names that clear the quality bar.</p>
          </div>
          {stage !== "brief" && <button type="button" onClick={startOver} className={secondary}><RotateCcw size={16} /> New brief</button>}
        </header>

        {quota && <div className={`mb-8 flex flex-wrap items-center justify-between gap-3 border p-4 ${quota.allowed ? "border-[#d6b15e]/25 bg-[#d6b15e]/[0.06]" : "border-amber-400/30 bg-amber-400/[0.08]"}`}><div><p className="text-sm font-semibold text-stone-100">{quota.plan === "pro" ? "Pro allowance" : "Free daily allowance"}</p><p className="mt-1 text-sm text-stone-400">{quota.remaining} of {quota.limit} Name {quota.limit === 1 ? "Sprint" : "Sprints"} remaining{quota.plan === "free" ? " today" : " this UTC month"}.</p></div>{!quota.allowed && <a href="/pricing?source=name-sprint-limit" className={primary}>View Pro</a>}</div>}

        <Progress stage={stage} />
        {stage === "brief" && <BriefScreen draft={draft} update={updateDraft} busy={busy === "compile"} onSubmit={compileBrief} />}
        {stage === "constitution" && compiled && <ConstitutionScreen compiled={compiled} busy={busy === "generate"} canGenerate={quota?.allowed !== false} update={updateConstitution} onBack={() => setStage("brief")} onGenerate={generateNames} />}
        {stage === "results" && run && <ResultsScreen run={run} grouped={grouped} saved={saved} rejecting={rejecting} onSave={toggleSave} onRejecting={setRejecting} onReject={rejectCandidate} onPreference={preference} onCompare={() => setStage("compare")} onAudit={internalTools ? () => setStage("audit") : null} onRefine={generateNames} refining={busy === "generate"} notice={notice} />}
        {stage === "compare" && run && <CompareScreen candidates={savedCandidates} onBack={() => setStage("results")} />}
        {stage === "audit" && run && <AuditScreen run={run} codes={auditCodes} strategies={auditStrategies} candidates={filteredAudit} code={auditCode} strategy={auditStrategy} setCode={setAuditCode} setStrategy={setAuditStrategy} onBack={() => setStage("results")} />}
        {error && <p role="alert" className="mt-6 border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      </section>
    </main>
  )
}

function Progress({ stage }: { stage: Stage }) {
  const current = stage === "brief" ? 1 : stage === "constitution" ? 2 : stage === "results" || stage === "audit" ? 3 : 4
  return <ol className="mb-8 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label="Name Sprint progress">{["Brief", "Constitution", "Curated results", "Compare"].map((label, index) => <li key={label} className={`border-t-2 pt-3 ${index + 1 <= current ? "border-[#d6b15e] text-[#e9ca82]" : "border-white/10 text-stone-600"}`}><span className="mr-2 font-mono">0{index + 1}</span>{label}</li>)}</ol>
}

function BriefScreen({ draft, update, busy, onSubmit }: { draft: Draft; update: (value: Partial<Draft>) => void; busy: boolean; onSubmit: () => void }) {
  return <section className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
    <div className="border border-[#d6b15e]/25 bg-[#0d0e0f] p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15e]">Start with meaning</p><h2 className="mt-3 font-serif text-3xl">Describe the business</h2><p className="mt-3 max-w-2xl leading-7 text-stone-400">Explain what you are building, who it helps, the problem, and what should make it different. We will show our interpretation before spending a generation run.</p>
      <label className="mt-7 block text-sm font-medium text-stone-200">Business brief<textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} rows={10} className={`${field} mt-2 resize-y text-base leading-7`} placeholder="We are building supply-chain forecasting software for small manufacturers. It gives operations managers earlier warning of disruptions so they can make calmer decisions with less waste..." /></label>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><TextField label="Industry or category" value={draft.category} placeholder="Supply-chain forecasting software" onChange={(value) => update({ category: value })} /><TextField label="Primary audience" value={draft.audience} placeholder="Small manufacturers and operations managers" onChange={(value) => update({ audience: value })} /></div>
    </div>
    <aside className="border border-white/10 bg-[#0d0e0f] p-5 sm:p-7">
      <div className="flex items-center gap-2"><SlidersHorizontal size={17} className="text-[#d6b15e]" /><h2 className="font-serif text-2xl">Useful constraints</h2></div>
      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-stone-200">Naming mode<select value={draft.namingMode} onChange={(event) => update({ namingMode: event.target.value as NamingMode })} className={`${field} mt-2`}>{NAMING_MODES.map((mode) => <option key={mode} value={mode}>{MODE_LABELS[mode]}</option>)}</select></label>
        <TextField label="Desired character" value={draft.tone} placeholder="credible, clear, forward-looking" onChange={(value) => update({ tone: value })} /><TextField label="Market" value={draft.market} placeholder="United Kingdom, Global" onChange={(value) => update({ market: value })} /><TextField label="Languages" value={draft.language} placeholder="English" onChange={(value) => update({ language: value })} /><TextField label="Include cues" value={draft.include} placeholder="signals, horizons" onChange={(value) => update({ include: value })} /><TextField label="Avoid terms" value={draft.avoid} placeholder="AI, quantum, smart" onChange={(value) => update({ avoid: value })} /><TextField label="Competitors or names to avoid" value={draft.competitors} placeholder="Competitor One, Competitor Two" onChange={(value) => update({ competitors: value })} /><div><p className="text-sm font-medium text-stone-200">Domain checks</p><div className="mt-2 flex min-h-12 flex-wrap items-center gap-2 border border-white/15 bg-[#0b0c0d] px-4 py-3">{NAME_SPRINT_TLDS.map((tld) => <span key={tld} className="border border-[#d6b15e]/25 px-2 py-1 text-xs text-[#ead5a3]">.{tld}</span>)}<span className="text-xs text-stone-500">checked for every candidate</span></div></div>
        <div><p className="text-sm font-medium text-stone-200">Preferred length: {draft.minLength}–{draft.maxLength} letters</p><div className="mt-3 grid grid-cols-2 gap-3"><input aria-label="Minimum name length" type="range" min="4" max="10" value={draft.minLength} onChange={(event) => update({ minLength: Math.min(Number(event.target.value), draft.maxLength - 1) })} className="accent-[#d6b15e]" /><input aria-label="Maximum name length" type="range" min="6" max="15" value={draft.maxLength} onChange={(event) => update({ maxLength: Math.max(Number(event.target.value), draft.minLength + 1) })} className="accent-[#d6b15e]" /></div></div>
      </div>
      <button type="button" disabled={busy || draft.description.trim().length < 30} onClick={onSubmit} className={`${primary} mt-7 w-full`}>{busy ? <><LoaderCircle className="animate-spin" size={17} /> Compiling the brief</> : <>Build the Name Constitution <ArrowRight size={17} /></>}</button>
    </aside>
  </section>
}

function ConstitutionScreen({ compiled, busy, canGenerate, update, onBack, onGenerate }: { compiled: Compiled; busy: boolean; canGenerate: boolean; update: <K extends keyof NameConstitution>(key: K, value: NameConstitution[K]) => void; onBack: () => void; onGenerate: () => void }) {
  const c = compiled.constitution
  return <section className="border border-[#d6b15e]/25 bg-[#0d0e0f] p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15e]">Confirm before generation</p><h2 className="mt-3 font-serif text-3xl">Build the Name Constitution</h2><p className="mt-3 max-w-3xl leading-7 text-stone-400">Correct anything we misunderstood. This becomes the admissions policy for every generated candidate.</p></div><div className="flex gap-2"><VersionBadge label="Founder Signal v2.0" /><VersionBadge label="Registry 2026.08.30.1" /></div></div>
    <div className="mt-8 grid gap-5 md:grid-cols-2"><TextField label="Category" value={c.category} onChange={(value) => update("category", value)} /><label className="block text-sm font-medium text-stone-200">Naming mode<select value={c.namingMode} onChange={(event) => update("namingMode", event.target.value as NamingMode)} className={`${field} mt-2`}>{NAMING_MODES.map((mode) => <option key={mode} value={mode}>{MODE_LABELS[mode]}</option>)}</select></label><label className="block text-sm font-medium text-stone-200 md:col-span-2">Problem being solved<textarea value={c.problem} onChange={(event) => update("problem", event.target.value)} rows={3} className={`${field} mt-2`} /></label><ChipEditor label="Audience" value={c.audience} onChange={(value) => update("audience", value)} /><ChipEditor label="Promise" value={c.promise} onChange={(value) => update("promise", value)} /><ChipEditor label="Personality" value={c.personality} onChange={(value) => update("personality", value)} /><ChipEditor label="Markets" value={c.geographicMarkets} onChange={(value) => update("geographicMarkets", value)} /><ChipEditor label="Languages" value={c.languages} onChange={(value) => update("languages", value)} /><ChipEditor label="Future expansion" value={c.futureExpansion} onChange={(value) => update("futureExpansion", value)} /><ChipEditor label="Include" value={c.include} onChange={(value) => update("include", value)} /><ChipEditor label="Avoid" value={c.avoid} onChange={(value) => update("avoid", value)} /></div>
    <div className="mt-10"><h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15e]">Semantic territories</h3><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{compiled.territories.map((territory) => <article key={territory.id} className="border border-white/12 bg-black/20 p-5"><p className="font-serif text-xl">{territory.label}</p><p className="mt-2 text-sm leading-6 text-stone-400">{territory.meaning}</p><p className="mt-4 text-xs uppercase tracking-wide text-stone-500">Roots</p><p className="mt-1 text-sm text-stone-300">{territory.roots.join(" · ") || "No literal roots required"}</p><p className="mt-3 text-xs text-[#d6b15e]">{territory.phoneticCharacter}</p></article>)}</div></div>
    <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6"><button type="button" onClick={onBack} disabled={busy} className={secondary}><ArrowLeft size={16} /> Edit original brief</button><button type="button" onClick={onGenerate} disabled={busy || !canGenerate} className={primary}>{busy ? <><LoaderCircle className="animate-spin" size={17} /> Generating, rejecting and judging</> : canGenerate ? <><Sparkles size={17} /> Generate names from this brief</> : <>Name Sprint allowance used</>}</button></div>
  </section>
}

function ResultsScreen({ run, grouped, saved, rejecting, onSave, onRejecting, onReject, onPreference, onCompare, onAudit, onRefine, refining, notice }: { run: Run; grouped: Array<{ territory: SemanticTerritory; candidates: NameSprintCandidate[] }>; saved: string[]; rejecting: string | null; onSave: (candidate: NameSprintCandidate) => void; onRejecting: (id: string | null) => void; onReject: (candidate: NameSprintCandidate, reason: string) => void; onPreference: (candidate: NameSprintCandidate, type: NameFeedbackType, message: string) => void; onCompare: () => void; onAudit: (() => void) | null; onRefine: () => void; refining: boolean; notice: string }) {
  return <section>
    <div className="border border-[#d6b15e]/25 bg-[#0d0e0f] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15e]">Curated results</p><h2 className="mt-2 font-serif text-3xl sm:text-4xl">{run.survivorCount} {run.survivorCount === 1 ? "name passed" : "names passed"} the quality bar</h2><p className="mt-3 text-stone-400">Generated {run.generatedCount} candidates · recorded {run.rejected.length} rejection decisions · {run.attempts} curation {run.attempts === 1 ? "pass" : "passes"}. We did not lower the standard to fill the screen.</p><p className="mt-2 text-sm text-emerald-300">Every displayed name has a verified exact .com, .co or .ai, or a clearly labelled clean .com launch domain.</p></div><div className="flex flex-wrap gap-2"><VersionBadge label={`Founder Signal v${run.founderSignalVersion}`} /><VersionBadge label={`Registry ${run.registryVersion}`} /><VersionBadge label={`AI $${run.usage.estimatedUsd.toFixed(4)}`} /></div></div>{run.survivorCount === 0 && <p className="mt-5 border-l-2 border-[#d6b15e] pl-4 text-sm leading-6 text-[#ead5a3]">No candidate cleared both the naming-quality and launch-domain requirements. {run.emptyResultRefunded ? "Your allowance was refunded once for today, so you can adjust the brief and retry." : "Refine the brief or exclusions; NamoLux will not return taken or unverified fallback domains."}</p>}{notice && <p className="mt-5 border-l-2 border-[#d6b15e] pl-4 text-sm text-[#ead5a3]">{notice}</p>}</div>
    <div className="mt-8 space-y-10">{grouped.map(({ territory, candidates }) => <section key={territory.id}><div className="mb-4"><p className="font-serif text-2xl">{territory.label}</p><p className="mt-1 text-sm text-stone-500">{territory.meaning}</p></div><div className="grid gap-4 lg:grid-cols-2">{candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} saved={saved.includes(candidate.id)} rejecting={rejecting === candidate.id} onSave={() => onSave(candidate)} onRejecting={() => onRejecting(rejecting === candidate.id ? null : candidate.id)} onReject={(reason) => onReject(candidate, reason)} onPreference={(type, message) => onPreference(candidate, type, message)} />)}</div></section>)}</div>
    <div className="sticky bottom-3 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 border border-[#d6b15e]/30 bg-[#101112]/95 p-4 shadow-2xl backdrop-blur"><div><p className="font-medium">{saved.length} saved for comparison</p><p className="text-sm text-stone-500">Save at least three names for a head-to-head view.</p></div><div className="flex flex-wrap gap-2">{onAudit && <button type="button" onClick={onAudit} className={secondary}><FlaskConical size={16} /> Rejection audit ({run.rejected.length})</button>}<button type="button" onClick={onRefine} disabled={refining} className={secondary}>{refining ? <LoaderCircle className="animate-spin" size={16} /> : <RotateCcw size={16} />} Refine from feedback</button><button type="button" onClick={onCompare} disabled={saved.length < 3} className={primary}><Scale size={16} /> Compare shortlist ({saved.length})</button></div></div>
  </section>
}

function CandidateCard({ candidate, saved, rejecting, onSave, onRejecting, onReject, onPreference }: { candidate: NameSprintCandidate; saved: boolean; rejecting: boolean; onSave: () => void; onRejecting: () => void; onReject: (reason: string) => void; onPreference: (type: NameFeedbackType, message: string) => void }) {
  const fullDomain = candidate.launchDomain.domain
  const domainKindLabel = candidate.launchDomain.kind === "exact" ? "Exact-match domain" : "Clean launch domain"

  return <article className="border border-white/12 bg-[#0d0e0f] p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-3xl">{candidate.name}</h3><span className="border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-emerald-300">PASS</span></div><p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-500">{candidate.strategy.replace(/_/g, " ")}</p></div><div className="text-right"><p className="font-serif text-3xl text-[#e3c67f]">{candidate.founderSignal.score}</p><p className="text-[11px] uppercase tracking-wide text-stone-500">Founder Signal</p></div></div>
    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><Fact label="Evidence confidence" value={candidate.evidenceConfidence} /><Fact label="Pronunciation" value={candidate.pronunciation || "Confirm with a speaker"} /><Fact label="Intended meaning" value={candidate.association} /><Fact label="Main risk" value={candidate.mainRisk} /></dl>
    <div className="mt-5 border border-white/8 bg-black/20 p-3"><p className="text-[11px] uppercase tracking-wide text-stone-500">Strongest reason</p><p className="mt-1 text-sm leading-6 text-stone-300">{candidate.strongestReason}</p></div>
    <TrademarkEvidence candidate={candidate} />
    <div className="mt-4 flex flex-wrap gap-2">{candidate.domainStatuses.map((domain) => <span key={domain.tld} className={`border px-2 py-1 text-xs ${domain.status === "available" ? "border-emerald-400/30 text-emerald-300" : domain.status === "unavailable" ? "border-red-400/25 text-red-300" : "border-white/12 text-stone-500"}`}>.{domain.tld} · {domain.status}</span>)}</div>
    <div className="mt-4 flex flex-wrap items-center gap-3 border border-emerald-400/20 bg-emerald-500/[0.05] p-3"><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">{domainKindLabel}</p><p className="mt-1 text-sm font-medium text-emerald-200">{fullDomain} is available</p><p className="mt-0.5 text-xs leading-5 text-stone-500">{candidate.launchDomain.kind === "modified" ? `A clean .com route for ${candidate.name}; the exact-match domains are not being presented as available.` : "The domain exactly matches the candidate name."} Confirm the final price and availability at Namecheap.</p></div><a href={namecheapLink(fullDomain, { source: "name_sprint", content: candidate.launchDomain.kind })} target="_blank" rel="sponsored noopener noreferrer" className={primary} aria-label={`Buy ${fullDomain} on Namecheap`}>Buy on Namecheap <ExternalLink size={15} /></a></div>
    <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={onSave} className={saved ? primary : secondary}>{saved ? <Check size={15} /> : <Save size={15} />}{saved ? "Saved" : "Save"}</button><button type="button" onClick={onRejecting} className={secondary}><X size={15} /> Reject</button><button type="button" onClick={() => onPreference("more_like_this", `Preference saved: more names in the ${candidate.name} direction.`)} className={secondary}>More like this</button></div>
    {rejecting && <div className="mt-4 border border-red-400/20 bg-red-500/[0.06] p-4"><p className="text-sm font-medium text-red-100">Why reject {candidate.name}?</p><div className="mt-3 flex flex-wrap gap-2">{REJECT_REASONS.map(([value, label]) => <button key={value} type="button" onClick={() => onReject(value)} className="border border-red-300/20 px-3 py-2 text-xs text-red-100 hover:border-red-300/50">{label}</button>)}</div></div>}
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500"><button type="button" onClick={() => onPreference("less_literal", "Preference saved: the next wave will be less literal.")} className="hover:text-[#d6b15e]">Less literal</button><button type="button" onClick={() => onPreference("more_distinctive", "Preference saved: the next wave will push distinctiveness.")} className="hover:text-[#d6b15e]">More distinctive</button><button type="button" onClick={() => onPreference("shorter", "Preference saved: the next wave will favour shorter names.")} className="hover:text-[#d6b15e]">Shorter</button><button type="button" onClick={() => onPreference("more_premium", "Preference saved: the next wave will favour a more premium tone.")} className="hover:text-[#d6b15e]">More premium</button></div>
  </article>
}

function TrademarkEvidence({ candidate }: { candidate: NameSprintCandidate }) {
  const screen = candidate.collisionScreen
  const webScreenRan = screen?.status === "clear"
  const scope = [screen?.category, ...(screen?.markets || [])].filter(Boolean).join(" · ")
  const collisionScore = candidate.founderSignal.dimensions.brandCollisionRisk

  return <section className="mt-5 border border-[#d6b15e]/20 bg-[#d6b15e]/[0.035] p-4 sm:p-5" aria-label={`Brand and trade-mark evidence for ${candidate.name}`}>
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d6b15e]"><ShieldCheck size={14} /> Brand &amp; trade-mark evidence</p>
    <h4 className="mt-3 text-lg font-medium text-stone-100">Official register check required</h4>
    <p className="mt-2 text-sm leading-6 text-stone-400">NamoLux found no obvious issue in the checks completed below. This is not official trade-mark clearance.</p>
    <dl className="mt-4 divide-y divide-white/10 border-y border-white/10 text-xs">
      <EvidenceStatus label="NamoLux internal screen" value={`Passed · ${collisionScore}/100`} complete />
      <EvidenceStatus label="Current web brand screen" value={webScreenRan ? "Checked" : "Not run"} complete={webScreenRan} />
      <EvidenceStatus label="Official registers" value="Not checked" complete={false} />
    </dl>
    {scope && <p className="mt-3 text-[11px] leading-5 text-stone-500">Scope: {scope}{screen?.checkedAt ? ` · ${screen.checkedAt.slice(0, 10)}` : ""}</p>}
    {screen?.sourceUrls.length ? <div className="mt-3 flex flex-wrap gap-2">{screen.sourceUrls.map((href, index) => <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 border border-white/12 px-2.5 py-1.5 text-xs text-stone-300 hover:border-[#d6b15e]/60 hover:text-[#f1d38e]">Screening evidence {index + 1} <ExternalLink size={12} /></a>)}</div> : null}
    <div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#d6b15e]">Verify before using the name</p><p className="mt-2 text-xs leading-5 text-stone-300">Search the exact name and close spelling, sound and meaning variants. Review live and pending marks for related goods or services.</p><div className="mt-3 grid grid-cols-3 gap-2">{OFFICIAL_TRADEMARK_CHECKS.map((check) => <a key={check.label} href={check.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-1 border border-white/15 px-2 text-center text-xs text-stone-200 transition hover:border-[#d6b15e] hover:text-[#f1d38e]" aria-label={`Search ${candidate.name} on ${check.label}`}>{check.label} <ExternalLink size={12} /></a>)}</div></div>
    <p className="mt-3 text-[11px] leading-5 text-stone-500">These are preliminary searches, not legal clearance. Check every market where you plan to trade and seek professional advice for close matches.</p>
  </section>
}

function EvidenceStatus({ label, value, complete }: { label: string; value: string; complete: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-2.5"><dt className="text-stone-400">{label}</dt><dd className={`shrink-0 text-right ${complete ? "text-emerald-300" : "text-amber-200"}`}>{value}</dd></div>
}

function CompareScreen({ candidates, onBack }: { candidates: NameSprintCandidate[]; onBack: () => void }) {
  return <section><button type="button" onClick={onBack} className={secondary}><ArrowLeft size={16} /> Back to results</button><div className="mt-6 border border-[#d6b15e]/25 bg-[#0d0e0f] p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15e]">Head-to-head</p><h2 className="mt-2 font-serif text-3xl">Compare the shortlist</h2><p className="mt-3 text-stone-400">Founder Signal is comparative decision support. The “kill question” keeps each candidate’s main risk visible.</p></div>{candidates.length < 3 ? <p className="mt-6 border border-white/10 p-5 text-stone-400">Save at least three names to compare them.</p> : <div className="mt-6 overflow-x-auto border border-white/10"><table className="min-w-[920px] w-full border-collapse text-left text-sm"><thead className="bg-[#111213]"><tr><th className="p-4 text-stone-500">Evidence</th>{candidates.map((candidate) => <th key={candidate.id} className="p-4 font-serif text-2xl text-stone-100">{candidate.name}</th>)}</tr></thead><tbody><ComparisonRow label="Founder Signal" candidates={candidates} value={(candidate) => String(candidate.founderSignal.score)} /><ComparisonRow label="Strategic fit" candidates={candidates} value={(candidate) => String(candidate.founderSignal.dimensions.strategicFit)} /><ComparisonRow label="Distinctiveness" candidates={candidates} value={(candidate) => String(candidate.founderSignal.dimensions.distinctiveness)} /><ComparisonRow label="Memorability" candidates={candidates} value={(candidate) => String(candidate.founderSignal.dimensions.memorability)} /><ComparisonRow label="Pronunciation" candidates={candidates} value={(candidate) => candidate.pronunciation} /><ComparisonRow label="Brand/collision screen" candidates={candidates} value={(candidate) => candidate.collisionScreen?.status === "clear" ? "Automated checks passed; official registers not scanned" : "Internal check passed; official registers not scanned"} /><ComparisonRow label="Recommended launch domain" candidates={candidates} value={(candidate) => `${candidate.launchDomain.domain} · ${candidate.launchDomain.kind === "exact" ? "exact match" : "clean modified .com"}`} /><ComparisonRow label="Exact-match checks" candidates={candidates} value={(candidate) => candidate.domainStatuses.map((domain) => `.${domain.tld} ${domain.status}`).join(" · ")} /><ComparisonRow label="What could kill this name?" candidates={candidates} value={(candidate) => candidate.mainRisk} /><ComparisonRow label="Long-term fit" candidates={candidates} value={(candidate) => candidate.association} /></tbody></table></div>}<p className="mt-5 text-sm leading-6 text-stone-500">Automated conflict screening, not legal clearance. Confirm finalists through the relevant official registers or a qualified professional.</p></section>
}

function AuditScreen({ run, codes, strategies, candidates, code, strategy, setCode, setStrategy, onBack }: { run: Run; codes: string[]; strategies: string[]; candidates: Run["rejected"]; code: string; strategy: string; setCode: (value: string) => void; setStrategy: (value: string) => void; onBack: () => void }) {
  return <section><button type="button" onClick={onBack} className={secondary}><ArrowLeft size={16} /> Back to curated results</button><div className="mt-6 border border-[#d6b15e]/25 bg-[#0d0e0f] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15e]">Private quality control</p><h2 className="mt-2 font-serif text-3xl">Internal rejection audit</h2><p className="mt-3 text-stone-400">These candidates are visible only in the internal lab. The public result never uses a high score to rescue a fatal flaw.</p></div><div className="flex gap-2"><VersionBadge label={`Founder Signal v${run.founderSignalVersion}`} /><VersionBadge label={`Registry ${run.registryVersion}`} /></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><label className="text-sm text-stone-400">Failure code<select value={code} onChange={(event) => setCode(event.target.value)} className={`${field} mt-2`}><option value="all">All failure codes</option>{codes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="text-sm text-stone-400">Strategy<select value={strategy} onChange={(event) => setStrategy(event.target.value)} className={`${field} mt-2`}><option value="all">All strategies</option>{strategies.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></label></div></div><div className="mt-5 overflow-hidden border border-white/10"><div className="hidden grid-cols-[1fr_.8fr_1.2fr_2fr] gap-3 border-b border-white/10 bg-[#111213] p-4 text-xs uppercase tracking-wide text-stone-500 md:grid"><span>Rejected candidate</span><span>Strategy</span><span>Fatal flaw</span><span>Reason</span></div>{candidates.length ? candidates.map((candidate) => <div key={candidate.id} className="grid gap-2 border-b border-white/8 p-4 text-sm last:border-b-0 md:grid-cols-[1fr_.8fr_1.2fr_2fr] md:gap-3"><strong className="font-serif text-lg text-stone-200">{candidate.name}</strong><span className="text-stone-500">{candidate.strategy.replace(/_/g, " ")}</span><span className="font-mono text-xs text-[#e3c67f]">{candidate.eligibility.failureCodes.join(", ")}</span><span className="leading-6 text-stone-400">{candidate.eligibility.reasons.join(" ")}</span></div>) : <p className="p-6 text-stone-500">No rejected candidates match these filters.</p>}</div></section>
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-stone-200">{label}<input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`${field} mt-2`} /></label>
}

function ChipEditor({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  const [next, setNext] = useState("")
  function add() { const item = next.replace(/\s+/g, " ").trim(); if (!item) return; onChange(Array.from(new Set([...value, item])).slice(0, 20)); setNext("") }
  return <div><p className="text-sm font-medium text-stone-200">{label}</p><div className="mt-2 flex min-h-12 flex-wrap items-center gap-2 border border-white/15 bg-[#0b0c0d] p-2">{value.map((item) => <span key={item} className="inline-flex items-center gap-1 border border-[#d6b15e]/25 bg-[#d6b15e]/[0.07] px-2 py-1 text-xs text-[#ead5a3]">{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((current) => current !== item))}><X size={12} /></button></span>)}<input value={next} onChange={(event) => setNext(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add() } }} placeholder="Add" className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-stone-600" /><button type="button" aria-label={`Add ${label}`} onClick={add} className="grid h-7 w-7 place-items-center border border-white/15 text-stone-400 hover:border-[#d6b15e]"><Plus size={14} /></button></div></div>
}

function VersionBadge({ label }: { label: string }) {
  const displayLabel = label.startsWith("AI $") ? `Est. ${label}` : label
  return <span className="inline-flex items-center gap-1 border border-[#d6b15e]/25 px-2.5 py-1 text-[11px] uppercase tracking-wide text-[#d6b15e]"><ShieldCheck size={12} />{displayLabel}</span>
}
function Fact({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 leading-6 text-stone-300 first-letter:uppercase">{value}</dd></div> }
function ComparisonRow({ label, candidates, value }: { label: string; candidates: NameSprintCandidate[]; value: (candidate: NameSprintCandidate) => string }) { return <tr className="border-t border-white/10"><th className="p-4 align-top font-medium text-stone-500">{label}</th>{candidates.map((candidate) => <td key={candidate.id} className="p-4 align-top leading-6 text-stone-300">{value(candidate)}</td>)}</tr> }
