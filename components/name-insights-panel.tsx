"use client"

import { useState } from "react"
import { Loader2, Wand2, MessageSquareQuote, ChevronDown, ChevronUp } from "lucide-react"

interface NameInsightsPanelProps {
  name: string
  vibe?: string
}

export function NameInsightsPanel({ name, vibe }: NameInsightsPanelProps) {
  const [open, setOpen] = useState(false)
  const [narrative, setNarrative] = useState("")
  const [taglines, setTaglines] = useState<string[]>([])
  const [loadingNarrative, setLoadingNarrative] = useState(false)
  const [loadingTaglines, setLoadingTaglines] = useState(false)

  async function fetchNarrative() {
    if (narrative || loadingNarrative) return
    setLoadingNarrative(true)
    try {
      const res = await fetch("/api/name-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "narrative", name }),
      })
      const data = await res.json()
      setNarrative(data.narrative ?? "")
    } finally {
      setLoadingNarrative(false)
    }
  }

  async function fetchTaglines() {
    if (taglines.length || loadingTaglines) return
    setLoadingTaglines(true)
    try {
      const res = await fetch("/api/name-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "taglines", name, vibe }),
      })
      const data = await res.json()
      setTaglines(data.taglines ?? [])
    } finally {
      setLoadingTaglines(false)
    }
  }

  function handleOpen() {
    const next = !open
    setOpen(next)
    if (next) {
      fetchNarrative()
      fetchTaglines()
    }
  }

  return (
    <div
      className="mt-2 overflow-hidden rounded-xl transition-all"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
    >
      <button
        onClick={handleOpen}
        className="flex w-full items-center justify-between px-3 py-2.5 transition-all hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} />
          <span className="text-[11px] font-semibold text-white/70">Brand Story & Taglines</span>
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-white/30" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-white/30" />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t px-3 pb-3 pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {/* Brand Narrative */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <MessageSquareQuote className="h-3 w-3" style={{ color: "#D4AF37" }} />
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#D4AF37" }}>
                Brand Origin
              </span>
            </div>
            {loadingNarrative ? (
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-white/30" />
                <span className="text-[10px] text-white/30">Writing origin story...</span>
              </div>
            ) : narrative ? (
              <p className="text-[11px] leading-relaxed text-white/55">{narrative}</p>
            ) : null}
          </div>

          {/* Taglines */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#60a5fa" }}>
                Tagline Ideas
              </span>
            </div>
            {loadingTaglines ? (
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-white/30" />
                <span className="text-[10px] text-white/30">Generating taglines...</span>
              </div>
            ) : taglines.length > 0 ? (
              <div className="space-y-1">
                {taglines.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg px-2.5 py-1.5"
                    style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.1)" }}
                  >
                    <span className="mt-0.5 text-[9px] font-bold text-blue-400/50">{i + 1}</span>
                    <p className="text-[11px] leading-relaxed text-white/60">&ldquo;{t}&rdquo;</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
