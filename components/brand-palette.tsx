"use client"

import { useState, useCallback } from "react"
import { RefreshCw, Copy, CheckCircle, Palette, ChevronDown } from "lucide-react"

interface PaletteColour {
  hex: string
  name: string
  usage: string
}

interface PaletteResult {
  palette: {
    primary: PaletteColour
    secondary: PaletteColour
    accent: PaletteColour
    background: PaletteColour
    text: PaletteColour
  }
  rationale: string
}

const COLOUR_ROLES = [
  { key: "primary",    label: "Primary" },
  { key: "secondary",  label: "Secondary" },
  { key: "accent",     label: "Accent" },
  { key: "background", label: "Background" },
  { key: "text",       label: "Text" },
] as const

const VIBES = [
  { value: "luxury",      label: "Luxury" },
  { value: "futuristic",  label: "Futuristic" },
  { value: "playful",     label: "Playful" },
  { value: "trustworthy", label: "Trustworthy" },
  { value: "minimal",     label: "Minimal" },
]

// Perceived brightness — used to decide whether to show dark or light label text on the swatch
function swatchTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)"
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

function ColourSwatch({
  colour,
  role,
}: {
  colour: PaletteColour
  role: string
}) {
  const [copied, setCopied] = useState(false)
  const safe = isValidHex(colour.hex) ? colour.hex : "#888888"
  const labelColor = swatchTextColor(safe)

  function copy() {
    navigator.clipboard.writeText(safe).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Swatch block */}
      <div
        className="relative flex flex-col justify-end p-3 transition-all"
        style={{ background: safe, minHeight: 96 }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: labelColor }}>
          {role}
        </span>
      </div>

      {/* Info block */}
      <div
        className="flex flex-col gap-1 p-3"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <span className="text-xs font-semibold text-white">{colour.name}</span>
        <span
          className="font-mono text-[11px] font-medium tracking-wider"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          {safe.toUpperCase()}
        </span>
        <span className="mt-0.5 text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.28)" }}>
          {colour.usage}
        </span>

        {/* Copy button */}
        <button
          onClick={copy}
          className="mt-2 flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all hover:-translate-y-0.5"
          style={{
            background: copied ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
            border: copied ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.08)",
            color: copied ? "#34d399" : "rgba(255,255,255,0.5)",
          }}
        >
          {copied ? (
            <><CheckCircle className="h-3 w-3" /> Copied</>
          ) : (
            <><Copy className="h-3 w-3" /> Copy hex</>
          )}
        </button>
      </div>
    </div>
  )
}

interface BrandPaletteProps {
  /** Pre-fill the brand name input (e.g. from generate results) */
  initialName?: string
  /** Pre-fill keywords */
  initialKeywords?: string
  /** Pre-fill vibe */
  initialVibe?: string
}

export function BrandPalette({ initialName = "", initialKeywords = "", initialVibe = "modern" }: BrandPaletteProps) {
  const [brandName, setBrandName] = useState(initialName)
  const [keywords, setKeywords] = useState(initialKeywords)
  const [vibe, setVibe] = useState(initialVibe)
  const [palette, setPalette] = useState<PaletteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInputs, setShowInputs] = useState(!initialName)

  const generate = useCallback(async () => {
    if (!brandName.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/brand-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, keywords, vibe }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Error ${res.status}`)
      }
      const data: PaletteResult = await res.json()
      setPalette(data)
      setShowInputs(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setLoading(false)
    }
  }, [brandName, keywords, vibe])

  const hasPalette = palette !== null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(212,175,55,0.2)", background: "rgba(255,255,255,0.03)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(212,175,55,0.04)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.22)" }}
          >
            <Palette className="h-4 w-4" style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <span className="text-sm font-bold text-white">Brand Colour Palette</span>
            {hasPalette && (
              <span className="ml-2 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                for <span style={{ color: "#D4AF37" }}>{brandName}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasPalette && (
            <button
              onClick={generate}
              disabled={loading}
              title="Regenerate palette"
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.2)",
                color: "#D4AF37",
              }}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          )}
          <button
            onClick={() => setShowInputs((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            title={showInputs ? "Collapse" : "Change inputs"}
          >
            <ChevronDown
              className="h-4 w-4 transition-transform"
              style={{ transform: showInputs ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
        </div>
      </div>

      {/* Input form */}
      {showInputs && (
        <div className="px-5 py-4 space-y-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(212,175,55,0.6)" }}>
              Brand name
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. indulgo, vexora, bloom"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-white/20"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
              Context <span className="font-normal normal-case" style={{ color: "rgba(255,255,255,0.2)" }}>— optional</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. premium skincare, wellness app, B2B SaaS"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-white/20"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
              Brand vibe
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VIBES.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setVibe(v.value)}
                  className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                  style={
                    vibe === v.value
                      ? { background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.35)", color: "#D4AF37" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
                  }
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !brandName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-black transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
          >
            {loading ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Generating palette…</>
            ) : (
              <><Palette className="h-4 w-4" /> Generate Palette</>
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-5 py-3 text-sm" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Idle state — no palette yet, inputs collapsed */}
      {!hasPalette && !showInputs && !loading && (
        <div
          className="flex flex-col items-center justify-center px-6 py-10 text-center"
          style={{ border: "1px dashed rgba(212,175,55,0.1)" }}
        >
          <Palette className="mb-3 h-7 w-7" style={{ color: "rgba(212,175,55,0.3)" }} />
          <p className="text-sm font-semibold text-white">Generate your brand palette</p>
          <p className="mt-1.5 max-w-xs text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            AI builds a distinctive 5-colour identity based on your brand name, context, and vibe.
          </p>
          <button
            onClick={() => setShowInputs(true)}
            className="mt-4 rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5"
            style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", color: "#D4AF37" }}
          >
            Get started
          </button>
        </div>
      )}

      {/* Palette display */}
      {hasPalette && palette && (
        <div className="p-5">
          {/* 5-swatch grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {COLOUR_ROLES.map(({ key, label }) => {
              const colour = palette.palette[key]
              return colour ? (
                <ColourSwatch key={key} colour={colour} role={label} />
              ) : null
            })}
          </div>

          {/* Rationale */}
          {palette.rationale && (
            <div
              className="mt-4 rounded-xl px-4 py-3 text-xs leading-relaxed"
              style={{
                background: "rgba(212,175,55,0.04)",
                border: "1px solid rgba(212,175,55,0.1)",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              <span className="font-semibold" style={{ color: "rgba(212,175,55,0.6)" }}>Why this palette: </span>
              {palette.rationale}
            </div>
          )}

          {/* Combined hex strip — useful for quickly copying all */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {COLOUR_ROLES.map(({ key, label }) => {
              const c = palette.palette[key]
              if (!c) return null
              const safe = isValidHex(c.hex) ? c.hex : "#888888"
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-4 w-4 rounded-full border"
                    style={{ background: safe, borderColor: "rgba(255,255,255,0.12)" }}
                  />
                  <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {safe.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
