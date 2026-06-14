"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { Check, X } from "lucide-react"

type DemoRow = {
  name: string
  score: number
  verdict: string
  verdictTone: "elite" | "strong" | "solid"
  tlds: Array<{ tld: string; available: boolean }>
  note: string
}

const DEMO_ROWS: DemoRow[] = [
  {
    name: "vaulten",
    score: 94,
    verdict: "Elite tier",
    verdictTone: "elite",
    tlds: [
      { tld: "com", available: true },
      { tld: "io", available: true },
      { tld: "ai", available: false },
    ],
    note: "Vault root signals trust · clean two-syllable close",
  },
  {
    name: "paynest",
    score: 92,
    verdict: "Elite tier",
    verdictTone: "elite",
    tlds: [
      { tld: "com", available: true },
      { tld: "io", available: false },
      { tld: "ai", available: true },
    ],
    note: "Real-word compound · instantly spellable",
  },
  {
    name: "countis",
    score: 88,
    verdict: "Strong",
    verdictTone: "strong",
    tlds: [
      { tld: "com", available: true },
      { tld: "io", available: true },
      { tld: "ai", available: true },
    ],
    note: "Recognisable root · natural Latin-free ending",
  },
  {
    name: "ledgerly",
    score: 81,
    verdict: "Solid",
    verdictTone: "solid",
    tlds: [
      { tld: "com", available: false },
      { tld: "io", available: true },
      { tld: "ai", available: true },
    ],
    note: "Clear meaning · suffix slightly common",
  },
]

const VERDICT_STYLES: Record<DemoRow["verdictTone"], { background: string; border: string; color: string }> = {
  elite: {
    background: "linear-gradient(180deg, rgba(212,175,55,0.22), rgba(212,175,55,0.1))",
    border: "1px solid rgba(212,175,55,0.45)",
    color: "#F2DCA0",
  },
  strong: {
    background: "rgba(212,175,55,0.1)",
    border: "1px solid rgba(212,175,55,0.25)",
    color: "rgba(228,200,138,0.9)",
  },
  solid: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.55)",
  },
}

/** Count a number up from 0 once the element scrolls into view. */
function ScoreCounter({ target, started, delay }: { target: number; started: boolean; delay: number }) {
  // null = idle → render the real score. SSR HTML always shows final values.
  const [value, setValue] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!started || reducedMotion) return
    let frame = 0
    const timer = setTimeout(() => {
      const startedAt = performance.now()
      const duration = 1100
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(progress < 1 ? Math.round(eased * target) : null)
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, delay * 1000)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [started, target, delay, reducedMotion])

  return <>{value === null ? target : value}</>
}

/**
 * Animated mock of the Founder Signal scorecard — the product, shown working.
 * Pure presentation: rows stagger in, score bars fill, scores count up,
 * a scan beam sweeps once. All copy is in the SSR HTML.
 */
export function ScorecardDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const inView = useInView(containerRef, { once: true, margin: "-15% 0px" })
  const reducedMotion = useReducedMotion()

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-3xl">
      {/* Rotating halo behind the card — desktop only, expensive blur */}
      <div
        aria-hidden="true"
        className="animate-halo-spin absolute left-1/2 top-1/2 hidden h-[120%] w-[110%] rounded-[40%] opacity-30 blur-3xl sm:block"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(212,175,55,0.0) 0%, rgba(212,175,55,0.35) 18%, rgba(212,175,55,0.0) 40%, rgba(143,122,85,0.25) 65%, rgba(212,175,55,0.0) 100%)",
        }}
      />

      <div
        className="relative overflow-hidden rounded-2xl border shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_0_1px_rgba(212,175,55,0.06)]"
        style={{
          borderColor: "rgba(212,175,55,0.22)",
          background: "linear-gradient(180deg, rgba(20,18,12,0.96) 0%, rgba(9,8,6,0.98) 100%)",
        }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: "rgba(212,175,55,0.12)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
          <div
            className="mx-auto flex items-center gap-2 rounded-full px-4 py-1 text-[11px] tracking-wide text-white/40"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            namolux.com/generate
          </div>
          <span
            className="hidden rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] sm:block"
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: "#E4C88A" }}
          >
            Live scoring
          </span>
        </div>

        {/* Scan beam */}
        {inView && !reducedMotion && (
          <div
            aria-hidden="true"
            className="animate-scan-sweep pointer-events-none absolute inset-x-0 z-10 h-16 opacity-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(212,175,55,0.08) 45%, rgba(246,226,122,0.16) 50%, rgba(212,175,55,0.08) 55%, transparent 100%)",
            }}
          />
        )}

        {/* Rows */}
        <div className="relative px-3 py-3 sm:px-5 sm:py-4">
          {DEMO_ROWS.map((row, index) => {
            const verdictStyle = VERDICT_STYLES[row.verdictTone]
            const rowDelay = 0.35 + index * 0.22
            return (
              <motion.div
                key={row.name}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.55, delay: reducedMotion ? 0 : rowDelay, ease: [0.16, 1, 0.3, 1] }}
                className="group/row flex flex-col gap-2 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.025] sm:px-4"
                style={index < DEMO_ROWS.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.05)" } : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="min-w-0 truncate font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {row.name}
                  </span>
                  <span className="flex gap-1" aria-label={`TLD availability for ${row.name}`}>
                    {row.tlds.map((entry) => (
                      <span
                        key={entry.tld}
                        className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                        style={
                          entry.available
                            ? { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }
                            : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }
                        }
                      >
                        .{entry.tld}
                        {entry.available ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                      </span>
                    ))}
                  </span>
                  <span
                    className="ml-auto hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:inline-block"
                    style={verdictStyle}
                  >
                    {row.verdict}
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono text-lg font-bold tabular-nums" style={{ color: "#E9CE8F" }}>
                    <ScoreCounter target={row.score} started={inView} delay={rowDelay} />
                  </span>
                </div>

                {/* Score bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {inView && (
                    <div
                      className="animate-score-fill h-full rounded-full"
                      style={{
                        width: `${row.score}%`,
                        animationDelay: `${reducedMotion ? 0 : rowDelay}s`,
                        background:
                          row.verdictTone === "elite"
                            ? "linear-gradient(90deg, #8f6a28 0%, #D4AF37 55%, #F6E27A 100%)"
                            : row.verdictTone === "strong"
                              ? "linear-gradient(90deg, #6f5520 0%, #BD9B47 100%)"
                              : "linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.32))",
                      }}
                    />
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-white/35">{row.note}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Footer strip */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-[11px] text-white/35"
          style={{ borderColor: "rgba(212,175,55,0.1)", background: "rgba(255,255,255,0.015)" }}
        >
          <span>4 names scored · 12 TLD checks · 1.8s</span>
          <span className="font-semibold" style={{ color: "rgba(228,200,138,0.85)" }}>
            Founder Signal™ verdicts you can defend
          </span>
        </div>
      </div>
    </div>
  )
}
