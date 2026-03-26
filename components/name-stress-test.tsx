"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react"
import { runStressTest } from "@/lib/nameCreativity"

interface NameStressTestProps {
  name: string
  founderScore?: number
}

export function NameStressTest({ name, founderScore }: NameStressTestProps) {
  const [open, setOpen] = useState(false)
  const result = runStressTest(name, founderScore)

  const pct = Math.round((result.passCount / result.scenarios.length) * 100)
  const barColor = pct >= 80 ? "#34d399" : pct >= 60 ? "#60a5fa" : pct >= 40 ? "#f59e0b" : "#f87171"

  return (
    <div
      className="mt-2 overflow-hidden rounded-xl transition-all"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
    >
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 transition-all hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: barColor }} />
          <span className="text-[11px] font-semibold text-white/70">Stress Test</span>
          <span className="text-[10px]" style={{ color: barColor }}>
            {result.passCount}/{result.scenarios.length}
          </span>
          {/* Mini progress bar */}
          <div
            className="h-1 w-14 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: barColor }}
            />
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-white/30" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-white/30" />
        )}
      </button>

      {/* Expanded scenarios */}
      {open && (
        <div className="border-t px-3 pb-3 pt-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="space-y-1.5">
            {result.scenarios.map((s) => (
              <div key={s.id} className="flex items-start gap-2">
                <span className="mt-0.5 text-sm leading-none">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: s.passed ? "#34d399" : "#f87171" }}
                    >
                      {s.passed ? "✓" : "✗"}
                    </span>
                    <span className="text-[10px] font-medium text-white/70">{s.label}</span>
                  </div>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-white/35">{s.reason}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Verdict */}
          <div
            className="mt-2.5 rounded-lg px-3 py-2"
            style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-[10px] leading-relaxed text-white/50">{result.verdict}</p>
          </div>
        </div>
      )}
    </div>
  )
}
