"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Check, X, Copy, CheckCircle, Search, RefreshCw, ExternalLink, Zap, ChevronDown, ChevronUp } from "lucide-react"
import { FounderSignalPanel } from "@/components/founder-signal"
import { namecheapLink } from "@/lib/affiliateLink"

const OTHER_TLDS = ["io", "co", "ai", "app", "dev"] as const
type OtherTld = typeof OTHER_TLDS[number]

type SocialPlatformId = "twitter" | "instagram" | "tiktok"
type SocialStatus = "available" | "taken" | "unknown"

interface SocialHandleResult {
  platform: SocialPlatformId
  status: SocialStatus
  url: string
}

interface DeepResult {
  name: string
  tld: string
  fullDomain: string
  available: boolean
  score: number
  label: string
  reasons: string[]
  breakdown: Record<string, number>
  otherTlds?: Partial<Record<OtherTld, boolean | null>>
  socials?: SocialHandleResult[]
}

interface ProgressState {
  batch: number
  totalBatches: number
  found: number
  message: string
}

interface DeepSearchProps {
  keyword: string
  vibe?: string
  industry?: string
  maxLength?: number
}

const scoreColor = (score: number) => {
  if (score >= 80) return "#22c55e"
  if (score >= 60) return "#D4AF37"
  if (score >= 40) return "#f97316"
  return "rgba(255,255,255,0.4)"
}

const scoreBand = (score: number) => {
  if (score >= 80) return "Elite"
  if (score >= 65) return "Strong"
  if (score >= 50) return "Good"
  return "Fair"
}

// Minimal inline SVG icons for social platforms
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.256 5.628 5.908-5.628Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z" />
    </svg>
  )
}

const SOCIAL_ICONS: Record<SocialPlatformId, React.ComponentType<{ className?: string }>> = {
  twitter: XIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
}

const SOCIAL_LABELS: Record<SocialPlatformId, string> = {
  twitter: "X",
  instagram: "IG",
  tiktok: "TT",
}

function TldDot({ available }: { available: boolean | null | undefined }) {
  if (available === true)
    return <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" title="Available" />
  if (available === false)
    return <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500/70" title="Taken" />
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/20" title="Not checked" />
}

function ResultCard({
  result,
  index,
  copiedName,
  onCopy,
}: {
  result: DeepResult
  index: number
  copiedName: string | null
  onCopy: (domain: string) => void
}) {
  const color = scoreColor(result.score)

  return (
    <div
      className="animate-fade-up opacity-0 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(212,175,55,0.2)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        animationDelay: `${index * 0.07}s`,
        animationFillMode: "forwards",
      }}
    >
      {/* Deep Search label */}
      <div
        className="flex items-center gap-2 rounded-t-2xl px-4 py-2"
        style={{ borderBottom: "1px solid rgba(212,175,55,0.1)", background: "rgba(212,175,55,0.05)" }}
      >
        <Zap className="h-3 w-3" style={{ color: "#D4AF37" }} />
        <span className="text-[10px] font-bold tracking-wider" style={{ color: "#D4AF37" }}>
          DEEP SEARCH
        </span>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          — .com confirmed available
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "rgba(52,211,153,0.12)",
                border: "1px solid rgba(52,211,153,0.2)",
                color: "#34d399",
              }}
            >
              <Check className="h-4 w-4" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-white sm:text-lg">{result.name}</span>
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold sm:text-xs"
                style={{
                  background: "rgba(52,211,153,0.12)",
                  color: "#34d399",
                  border: "1px solid rgba(52,211,153,0.2)",
                }}
              >
                .com ✓
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => onCopy(result.fullDomain)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              title="Copy domain"
            >
              {copiedName === result.fullDomain ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-white/50" />
              )}
            </button>
            <a
              href={namecheapLink(result.fullDomain)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-black transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Register
            </a>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${result.score}%`, background: color }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color }}>
            {result.score} — {scoreBand(result.score)}
          </span>
        </div>

        {/* Other TLD availability row */}
        {result.otherTlds && (
          <div className="mt-3 flex flex-wrap gap-2">
            {OTHER_TLDS.map((tld) => {
              const av = result.otherTlds?.[tld]
              const isAvail = av === true
              const isTaken = av === false
              return (
                <div key={tld} className="flex items-center gap-1">
                  <TldDot available={av} />
                  {isAvail ? (
                    <a
                      href={namecheapLink(`${result.name}.${tld}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-medium transition-colors hover:text-green-400"
                      style={{ color: "rgba(52,211,153,0.8)" }}
                    >
                      .{tld}
                    </a>
                  ) : (
                    <span
                      className="text-[10px]"
                      style={{ color: isTaken ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.3)" }}
                    >
                      .{tld}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Social handle availability */}
        {result.socials && result.socials.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>
              @{result.name}
            </span>
            {result.socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.platform]
              const isAvail = s.status === "available"
              const isTaken = s.status === "taken"
              const color = isAvail
                ? "#34d399"
                : isTaken
                ? "rgba(255,255,255,0.18)"
                : "rgba(255,255,255,0.25)"
              return (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`@${result.name} on ${SOCIAL_LABELS[s.platform]} — ${s.status}`}
                  className="flex items-center gap-1 transition-opacity hover:opacity-80"
                  style={{ color, textDecoration: "none" }}
                >
                  <Icon className="h-3 w-3" />
                  <span className="text-[10px] font-medium">{SOCIAL_LABELS[s.platform]}</span>
                  {isAvail && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                  )}
                  {isTaken && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "rgba(255,80,80,0.6)" }} />
                  )}
                </a>
              )
            })}
          </div>
        )}

        {/* Founder Signal */}
        <div className="mt-3">
          <FounderSignalPanel name={result.name} tld="com" />
        </div>
      </div>
    </div>
  )
}

export function DeepSearch({ keyword, vibe, industry, maxLength = 10 }: DeepSearchProps) {
  const [expanded, setExpanded] = useState(false)
  const [results, setResults] = useState<DeepResult[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasPartial, setHasPartial] = useState(false)
  const [copiedName, setCopiedName] = useState<string | null>(null)
  const [lastFoundName, setLastFoundName] = useState<string | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  const cancel = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {})
      readerRef.current = null
    }
    setRunning(false)
  }, [])

  const startSearch = useCallback(async () => {
    if (!keyword.trim()) return
    cancel()

    setExpanded(true)
    setResults([])
    setDone(false)
    setError(null)
    setHasPartial(false)
    setProgress(null)
    setLastFoundName(null)
    setRunning(true)

    setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)

    const params = new URLSearchParams({
      keyword,
      vibe: vibe || "luxury",
      industry: industry || "",
      maxLength: String(maxLength),
    })

    let response: Response
    try {
      response = await fetch(`/api/deep-search?${params.toString()}`)
      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start search")
      setRunning(false)
      return
    }

    const reader = response.body.getReader()
    readerRef.current = reader
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let event: Record<string, unknown>
          try {
            event = JSON.parse(raw)
          } catch {
            continue
          }

          if (event.type === "result") {
            const r = event.result as DeepResult
            setResults((prev) => [...prev, r])
            setLastFoundName(r.name)
          } else if (event.type === "progress") {
            setProgress({
              batch: event.batch as number,
              totalBatches: event.totalBatches as number,
              found: event.found as number,
              message: event.message as string,
            })
          } else if (event.type === "complete") {
            setDone(true)
            setRunning(false)
            setProgress(null)
          } else if (event.type === "error") {
            setError(event.message as string)
            setHasPartial(event.partial as boolean)
            setRunning(false)
            setProgress(null)
          }
        }
      }
    } catch (err) {
      if (!done) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!msg.includes("cancel") && !msg.includes("abort")) {
          setError(msg)
        }
      }
      setRunning(false)
      setProgress(null)
    } finally {
      readerRef.current = null
    }
  }, [keyword, vibe, industry, maxLength, cancel, done])

  useEffect(() => () => cancel(), [cancel])

  function copyToClipboard(domain: string) {
    navigator.clipboard.writeText(domain).then(() => {
      setCopiedName(domain)
      setTimeout(() => setCopiedName(null), 2000)
    })
  }

  const hasResults = results.length > 0

  return (
    <>
      {/* ── Sticky progress bar (shown while search runs, fixed at bottom of viewport) ── */}
      {running && progress && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
          style={{
            background: "rgba(10,10,15,0.95)",
            borderTop: "1px solid rgba(212,175,55,0.2)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex gap-1 shrink-0">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: "#D4AF37", animationDelay: `${i * 0.2}s`, opacity: 0.8 }}
                />
              ))}
            </div>
            <span className="truncate text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              {lastFoundName
                ? <><span style={{ color: "#D4AF37" }}>{lastFoundName}.com</span> found</>
                : <span style={{ color: "rgba(212,175,55,0.7)" }}>Searching…</span>}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs tabular-nums font-semibold" style={{ color: "#D4AF37" }}>
              {progress.found}/{MAX_FOUND}
            </span>
            <button
              onClick={cancel}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <X className="h-3 w-3" />
              Stop
            </button>
          </div>
        </div>
      )}

      <div ref={sectionRef} className="mb-4">
        {/* ── Trigger strip ── */}
        <div
          className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-all"
          style={{
            background: expanded ? "rgba(212,175,55,0.08)" : "rgba(212,175,55,0.04)",
            border: expanded ? "1px solid rgba(212,175,55,0.25)" : "1px solid rgba(212,175,55,0.14)",
          }}
          onClick={() => !running && setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)" }}
            >
              <Zap className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} />
            </div>
            <div>
              <span className="text-xs font-bold text-white">Deep Search for .com</span>
              <span className="ml-2 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {running
                  ? `Searching… ${results.length} found`
                  : done
                  ? `${results.length} available .com name${results.length !== 1 ? "s" : ""} found`
                  : "AI tests 4 naming strategies · pre-scored for quality · up to 80 combos"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {running && (
              <button
                onClick={(e) => { e.stopPropagation(); cancel() }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                <X className="h-3 w-3" />
                Stop
              </button>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); startSearch() }}
              disabled={running || !keyword.trim()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-black transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
            >
              {running ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Searching…
                </>
              ) : hasResults || done ? (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Search Again
                </>
              ) : (
                <>
                  <Search className="h-3 w-3" />
                  Start Deep Search
                </>
              )}
            </button>

            {!running && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* ── Expanded body ── */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Live progress (in-panel) */}
            {running && progress && (
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 animate-pulse rounded-full"
                        style={{ background: "#D4AF37", animationDelay: `${i * 0.2}s`, opacity: 0.7 }}
                      />
                    ))}
                    <span className="text-xs font-medium" style={{ color: "rgba(212,175,55,0.8)" }}>
                      {progress.message}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {progress.found}/10 · batch {progress.batch}/{progress.totalBatches}
                  </span>
                </div>
                <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(progress.found * 10, progress.batch * 20)}%`,
                      background: "linear-gradient(90deg, #D4AF37, #F6E27A)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Idle (expanded but not started) */}
            {!running && !done && !hasResults && !error && (
              <div
                className="flex flex-col items-center justify-center rounded-2xl px-6 py-8 text-center"
                style={{ border: "1px dashed rgba(212,175,55,0.12)", background: "rgba(212,175,55,0.02)" }}
              >
                <Zap className="mb-3 h-6 w-6" style={{ color: "rgba(212,175,55,0.4)" }} />
                <p className="text-sm font-semibold text-white">Find .com gems hiding in plain sight</p>
                <p className="mt-1.5 max-w-xs text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Rotates 4 naming strategies — invented words, compounds, root+suffix, metaphors. Pre-scores
                  every candidate before checking availability. Also shows .io .co .ai .app .dev status for
                  each name found. Streams live results as they&apos;re confirmed.
                </p>
              </div>
            )}

            {/* Results */}
            {hasResults && (
              <div className="space-y-3">
                {results.map((result, i) => (
                  <ResultCard
                    key={result.fullDomain}
                    result={result}
                    index={i}
                    copiedName={copiedName}
                    onCopy={copyToClipboard}
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 rounded-2xl p-4"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-400">Search error</p>
                  <p className="mt-0.5 text-xs text-red-300/60">{error}</p>
                  {(hasPartial || hasResults) && (
                    <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Showing {results.length} result{results.length !== 1 ? "s" : ""} found before the error.
                    </p>
                  )}
                </div>
                <button
                  onClick={startSearch}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#f87171",
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              </div>
            )}

            {/* Completion */}
            {done && !error && (
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)" }}
              >
                <Check className="h-4 w-4 shrink-0 text-green-400" />
                <p className="text-xs text-green-300/70">
                  {results.length === 0
                    ? "No available .com names found. Try 'Search Again' with a different keyword."
                    : `Search complete — ${results.length} available .com name${results.length !== 1 ? "s" : ""} confirmed. Green dots show other available TLDs.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

const MAX_FOUND = 10
