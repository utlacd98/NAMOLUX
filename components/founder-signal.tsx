"use client"

import { useId, useState } from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import { getFounderSignalBand, type FounderSignalBand } from "@/lib/founderSignal/spec"

type FounderSignalRawScores = Partial<{
  strategicFit: number
  distinctiveness: number
  spellingCharacter: number
  domainExtension: number
  clarity: number
  length: number
  pronounceability: number
  memorability: number
  extension: number
  characterQuality: number
  brandRisk: number
}>

/**
 * Presentation-only payload returned by an authorised server-side scoring
 * request. This component deliberately does not accept a name or calculate a
 * score in the browser, so entitlement and free-plan quota checks remain
 * server-authoritative.
 */
export type ServerFounderSignal = {
  score: number
  band?: FounderSignalBand
  rawScores?: FounderSignalRawScores
  reasons?: readonly string[]
  version?: string
}

function normaliseScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)))
}

function scoreColor(score: number): string {
  if (score >= 90) return "#D4AF37"
  if (score >= 75) return "#34d399"
  if (score >= 60) return "#60a5fa"
  return "#f87171"
}

function verdictFor(band: FounderSignalBand): string {
  if (band === "Elite") return "Elite signal across the scored dimensions. Confirm separate company, social, and trademark checks before committing."
  if (band === "Strong") return "Strong overall signal with manageable trade-offs. Review the weakest dimension before deciding."
  if (band === "Viable") return "Viable with notable trade-offs. Keep stronger alternatives in the shortlist."
  return "Material weaknesses or collision risk. Reconsider this candidate before committing."
}

function detailRows(rawScores: FounderSignalRawScores | undefined) {
  if (!rawScores) return []

  return [
    { label: "Strategic fit & meaning", value: rawScores.strategicFit ?? rawScores.clarity ?? rawScores.length },
    { label: "Distinctiveness", value: rawScores.distinctiveness ?? rawScores.memorability },
    { label: "Pronunciation", value: rawScores.pronounceability },
    { label: "Memorability", value: rawScores.memorability },
    { label: "Spelling & character", value: rawScores.spellingCharacter ?? rawScores.characterQuality },
    { label: "Brand & collision risk", value: rawScores.brandRisk },
    { label: "Domain & extension", value: rawScores.domainExtension ?? rawScores.extension },
  ].filter((row): row is { label: string; value: number } => typeof row.value === "number" && Number.isFinite(row.value))
}

function detailsFor(signal: ServerFounderSignal): string[] {
  if (signal.reasons && signal.reasons.length > 0) return [...signal.reasons].slice(0, 6)

  return detailRows(signal.rawScores)
    .map((row) => `${row.label}: ${Math.round(row.value)}/100`)
    .slice(0, 6)
}

function resolveBand(signal: ServerFounderSignal, score: number): FounderSignalBand {
  return signal.band || getFounderSignalBand(score)
}

export function FounderSignalBadge({ signal }: { signal: ServerFounderSignal }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = useId()
  const score = normaliseScore(signal.score)
  const band = resolveBand(signal, score)
  const color = scoreColor(score)
  const details = detailsFor(signal)

  return (
    <div className="mt-2" data-founder-signal-source="server">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all hover:opacity-80 sm:px-2.5 sm:py-1.5 sm:text-xs"
        style={{ color, background: `${color}1f`, borderColor: `${color}55` }}
      >
        <span className="font-semibold">Founder Signal</span>
        <span className="font-bold">{score} · {band}</span>
        {isExpanded ? <ChevronUp className="h-3 w-3 opacity-60" /> : <ChevronDown className="h-3 w-3 opacity-60" />}
      </button>

      {isExpanded ? (
        <div id={detailsId} className="mt-2 rounded-lg border border-border/50 bg-background/80 p-3 text-xs">
          <p className="mb-3 text-[11px] font-medium text-foreground/90 sm:text-xs">{verdictFor(band)}</p>
          {details.length > 0 ? (
            <div className="space-y-1.5">
              {details.map((detail) => <p key={detail} className="text-[11px] text-muted-foreground sm:text-xs">{detail}</p>)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function FounderSignalPanel({ signal }: { signal: ServerFounderSignal }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = useId()
  const score = normaliseScore(signal.score)
  const band = resolveBand(signal, score)
  const color = scoreColor(score)
  const details = detailsFor(signal)

  return (
    <section className="mt-2.5" data-founder-signal-source="server" aria-label={`Founder Signal ${score} out of 100, ${band}`}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black tabular-nums"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}40`, color, boxShadow: `0 0 16px ${color}20` }}
        >
          {score}
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-white/50">Founder Signal™</span>
            <span className="text-[10px] text-white/25">/ 100</span>
          </div>
          <div className="text-[11px] font-bold" style={{ color }}>{band}</div>
          <div className="mt-0.5 text-[10px] text-white/25">Server-scored for this authorised shortlist</div>
        </div>
      </div>

      <p className="mt-1.5 text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{verdictFor(band)}</p>

      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        className="mt-1 flex min-h-11 items-center gap-1 text-[10px] text-white/40 transition-colors hover:text-white/70"
      >
        View breakdown
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isExpanded ? (
        <div id={detailsId} className="mt-2 rounded-xl p-3 text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {details.length > 0 ? (
            <div className="space-y-1.5">
              {details.map((detail) => <p key={detail} className="text-[11px] text-white/60">{detail}</p>)}
            </div>
          ) : (
            <p className="text-[11px] text-white/45">This score was approved by the Founder Signal service for the current shortlist.</p>
          )}
          <div className="mt-3 flex items-start gap-1.5 border-t border-white/10 pt-2 text-[10px] text-white/25">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>Founder Signal™ supports judgment. It is not legal or trademark advice.</span>
          </div>
        </div>
      ) : null}
    </section>
  )
}
