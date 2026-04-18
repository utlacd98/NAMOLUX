"use client"

import { useState, useCallback } from "react"
import { RefreshCw, Copy, CheckCircle, Palette, ChevronDown, Sparkles } from "lucide-react"
import { LandingPreview } from "@/components/landing-preview"
import { StitchPrompt } from "@/components/stitch-prompt"

interface PaletteColour {
  hex: string
  name: string
  usage: string
}

interface PaletteVariant {
  name: string
  feel: string
  role: "core" | "dark" | "expressive"
  subStyle: string
  palette: {
    background: PaletteColour
    primary: PaletteColour
    accent: PaletteColour
    surface: PaletteColour
    text: PaletteColour
  }
  usageInsight: string
}

interface PaletteResult {
  palette: {
    primary: PaletteColour
    secondary: PaletteColour
    accent: PaletteColour
    background: PaletteColour
    text: PaletteColour
  }
  variants?: PaletteVariant[]
  rationale: string
}

// Map a variant (new shape: background/primary/accent/surface/text) to the
// legacy shape the rest of the app consumes (primary/secondary/accent/background/text).
function variantToLegacy(v: PaletteVariant): PaletteResult["palette"] {
  return {
    primary: v.palette.primary,
    secondary: v.palette.surface,
    accent: v.palette.accent,
    background: v.palette.background,
    text: v.palette.text,
  }
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

// Brand-type categories that map to the palette sub-styles in the API prompt.
// Labels must match the list the API expects (see app/api/brand-palette/route.ts).
const BRAND_TYPES = [
  { value: "SaaS / AI Tool",     label: "SaaS / AI",   hint: "Dashboards, tools, AI products" },
  { value: "Fintech / Trust",    label: "Fintech",     hint: "Banking, money, trust" },
  { value: "Luxury Brand",       label: "Luxury",      hint: "Premium, editorial, prestige" },
  { value: "Consumer App",       label: "Consumer",    hint: "Mass-market, friendly" },
  { value: "Creative / Playful", label: "Creative",    hint: "Studios, media, playful" },
  { value: "Wellness / Calm",    label: "Wellness",    hint: "Health, spa, calm" },
  { value: "Developer Tool",     label: "Dev Tool",    hint: "CLIs, IDEs, infra" },
]

function swatchTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)"
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex)
}

// ── Brand Preview Bar ──────────────────────────────────────────────────────────
// Shows a mini composition of how the colours work together
function BrandPreviewBar({ palette }: { palette: PaletteResult["palette"] }) {
  const bg = isValidHex(palette.background.hex) ? palette.background.hex : "#111"
  const primary = isValidHex(palette.primary.hex) ? palette.primary.hex : "#D4AF37"
  const accent = isValidHex(palette.accent.hex) ? palette.accent.hex : "#888"
  const text = isValidHex(palette.text.hex) ? palette.text.hex : "#fff"
  const secondary = isValidHex(palette.secondary.hex) ? palette.secondary.hex : "#555"

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ background: bg, border: `1px solid ${secondary}30` }}
    >
      {/* Top accent line */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }} />

      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        {/* Mock brand name */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-6 w-6 rounded-md"
            style={{ background: primary }}
          />
          <span className="text-sm font-bold" style={{ color: text }}>
            YourBrand
          </span>
        </div>

        {/* Mock nav dots */}
        <div className="hidden items-center gap-3 sm:flex">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1 rounded-full"
              style={{ width: 24 + i * 8, background: `${text}28` }}
            />
          ))}
        </div>

        {/* Mock CTA button */}
        <span
          className="rounded-lg px-3 py-1.5 text-[11px] font-bold"
          style={{ background: primary, color: swatchTextColor(primary) }}
        >
          Get Started
        </span>
      </div>

      {/* Body preview */}
      <div className="px-4 pb-4 pt-2">
        <div className="mb-2 h-2 w-2/3 rounded-full" style={{ background: `${text}18` }} />
        <div className="mb-3 h-1.5 w-1/2 rounded-full" style={{ background: `${text}10` }} />
        <div className="flex gap-2">
          <span
            className="rounded-lg px-3 py-1.5 text-[10px] font-semibold"
            style={{ background: accent, color: swatchTextColor(accent) }}
          >
            Accent
          </span>
          <span
            className="rounded-lg px-3 py-1.5 text-[10px]"
            style={{ background: `${text}10`, color: `${text}60` }}
          >
            Secondary
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Colour Swatch Card ──────────────────────────────────────────────────────────
function ColourSwatch({ colour, role }: { colour: PaletteColour; role: string }) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  const safe = isValidHex(colour.hex) ? colour.hex : "#888888"
  const labelColor = swatchTextColor(safe)

  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(safe).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl"
      style={{
        border: hovered ? `1px solid ${safe}50` : "1px solid rgba(255,255,255,0.07)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? `0 16px 40px ${safe}35, 0 4px 12px rgba(0,0,0,0.4)` : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={copy}
      title={`Copy ${safe.toUpperCase()}`}
    >
      {/* Swatch colour block */}
      <div
        className="relative flex flex-col justify-between p-3"
        style={{ background: safe, minHeight: 120 }}
      >
        {/* Role label top-left */}
        <span
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: `${labelColor}` }}
        >
          {role}
        </span>

        {/* Copy overlay on hover */}
        {hovered && (
          <div
            className="absolute inset-0 flex items-center justify-center transition-all"
            style={{ background: "rgba(0,0,0,0.22)" }}
          >
            <span
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm"
              style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.95)" }}
            >
              {copied ? (
                <><CheckCircle className="h-3 w-3 text-green-400" /> Copied!</>
              ) : (
                <><Copy className="h-3 w-3" /> {safe.toUpperCase()}</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Info block */}
      <div
        className="flex flex-col gap-0.5 p-3"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <span className="text-xs font-semibold text-white leading-tight">{colour.name}</span>
        <span
          className="font-mono text-[10px] font-medium tracking-wider"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {safe.toUpperCase()}
        </span>
        <span
          className="mt-1 text-[10px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          {colour.usage}
        </span>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────────
interface BrandPaletteProps {
  initialName?: string
  initialKeywords?: string
  initialVibe?: string
  initialBrandType?: string
  /** When true, hide the name/keywords inputs — used when this is embedded in
   *  a result card where the name is already fixed. User only picks brand type. */
  lockName?: boolean
}

export function BrandPalette({
  initialName = "",
  initialKeywords = "",
  initialVibe = "modern",
  initialBrandType = "",
  lockName = false,
}: BrandPaletteProps) {
  const [brandName, setBrandName] = useState(initialName)
  const [keywords, setKeywords] = useState(initialKeywords)
  const [vibe, setVibe] = useState(initialVibe)
  const [brandType, setBrandType] = useState(initialBrandType)
  const [palette, setPalette] = useState<PaletteResult | null>(null)
  const [activeVariantIndex, setActiveVariantIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Default open when there's no name, OR when embedded in lockName mode
  // (user still needs to pick a brand type to generate).
  const [showInputs, setShowInputs] = useState(!initialName || lockName)

  const generate = useCallback(async () => {
    if (!brandName.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/brand-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, keywords, vibe, brandType }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Error ${res.status}`)
      }
      const data: PaletteResult = await res.json()
      setPalette(data)
      setActiveVariantIndex(0)
      setShowInputs(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setLoading(false)
    }
  }, [brandName, keywords, vibe])

  const hasPalette = palette !== null
  const variants = palette?.variants ?? []
  const hasVariants = variants.length > 0
  // The "active" palette for all downstream consumers (swatches, landing preview,
  // stitch export). If variants exist, switch based on activeVariantIndex. Otherwise
  // fall back to the legacy top-level palette.
  const activePalette: PaletteResult["palette"] | null = hasVariants && variants[activeVariantIndex]
    ? variantToLegacy(variants[activeVariantIndex])
    : palette?.palette ?? null
  const activeVariant = hasVariants ? variants[activeVariantIndex] : null

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        border: "1px solid rgba(212,175,55,0.22)",
        background: "rgba(255,255,255,0.025)",
        boxShadow: "0 0 60px rgba(212,175,55,0.04) inset",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)",
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-3.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
            style={{
              background: "rgba(212,175,55,0.14)",
              border: "1px solid rgba(212,175,55,0.28)",
              boxShadow: "0 0 20px rgba(212,175,55,0.12)",
            }}
          >
            <Palette className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: "#D4AF37" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-white sm:text-base">Your Brand Identity</span>
            </div>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              {hasPalette ? (
                <>
                  Colour identity for{" "}
                  <span style={{ color: "#D4AF37" }}>{brandName}</span>
                </>
              ) : lockName ? (
                <>
                  Pick a brand type to generate 3 palettes for{" "}
                  <span style={{ color: "#D4AF37" }}>{brandName}</span>
                </>
              ) : (
                "AI-crafted colour palette for your brand"
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasPalette && (
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 sm:px-3.5 sm:py-2"
              style={{
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.25)",
                color: "#D4AF37",
                boxShadow: "0 0 0 rgba(212,175,55,0)",
              }}
              title="Generate a new palette"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">New palette</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
          <button
            onClick={() => setShowInputs((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.3)" }}
            title={showInputs ? "Collapse" : "Edit inputs"}
          >
            <ChevronDown
              className="h-4 w-4 transition-transform duration-200"
              style={{ transform: showInputs ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
        </div>
      </div>

      {/* ── Input form ── */}
      {showInputs && (
        <div
          className="space-y-4 px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* Name & context — hidden in lockName mode (inline in a result card) */}
          {!lockName && (
            <div>
              <label
                className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(212,175,55,0.65)" }}
              >
                Your brand name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. indulgo, vexora, bloom"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onKeyDown={(e) => e.key === "Enter" && generate()}
              />
            </div>
          )}

          {!lockName && (
            <div>
              <label
                className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                Context{" "}
                <span className="font-normal normal-case tracking-normal" style={{ color: "rgba(255,255,255,0.18)" }}>
                  — optional
                </span>
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. premium skincare, wellness app, B2B SaaS"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onKeyDown={(e) => e.key === "Enter" && generate()}
              />
            </div>
          )}

          {/* Brand Type — drives the palette sub-style */}
          <div>
            <label
              className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(212,175,55,0.65)" }}
            >
              Brand type
              <span className="ml-1 font-normal normal-case tracking-normal" style={{ color: "rgba(255,255,255,0.25)" }}>
                — what kind of business is this?
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {BRAND_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setBrandType(t.value)}
                  title={t.hint}
                  className="rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all hover:-translate-y-0.5"
                  style={
                    brandType === t.value
                      ? {
                          background: "rgba(212,175,55,0.16)",
                          border: "1px solid rgba(212,175,55,0.45)",
                          color: "#D4AF37",
                          boxShadow: "0 0 14px rgba(212,175,55,0.16)",
                        }
                      : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.45)",
                        }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vibe — optional refinement, collapsed under a disclosure in lockName mode */}
          {!lockName && (
            <div>
              <label
                className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                Brand vibe
                <span className="ml-1 font-normal normal-case tracking-normal" style={{ color: "rgba(255,255,255,0.18)" }}>
                  — optional
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {VIBES.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setVibe(v.value)}
                    className="rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all hover:-translate-y-0.5"
                    style={
                      vibe === v.value
                        ? {
                            background: "rgba(212,175,55,0.16)",
                            border: "1px solid rgba(212,175,55,0.38)",
                            color: "#D4AF37",
                            boxShadow: "0 0 12px rgba(212,175,55,0.12)",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.4)",
                          }
                    }
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generate CTA */}
          <button
            onClick={generate}
            disabled={loading || !brandName.trim() || (lockName && !brandType.trim())}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-bold text-black transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
              backgroundSize: "200% 100%",
              boxShadow: loading ? "none" : "0 6px 28px rgba(212,175,55,0.35)",
            }}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating your palette…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Create Brand Colours
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="px-6 py-3 text-sm" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* ── Idle state ── */}
      {!hasPalette && !showInputs && !loading && (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          {/* Decorative colour preview blobs */}
          <div className="mb-6 flex items-center gap-1.5">
            {["#C9A227", "#8B4513", "#2D6A4F", "#1A1A2E", "#F8F0E3"].map((c, i) => (
              <span
                key={i}
                className="rounded-full"
                style={{
                  background: c,
                  width: 12 + i * 4,
                  height: 12 + i * 4,
                  opacity: 0.7 + i * 0.06,
                }}
              />
            ))}
          </div>
          <p className="text-base font-bold text-white">Create your colour identity</p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
            AI builds a distinctive 5-colour palette tailored to your brand name, context, and vibe.
            No generic results — every palette is unique.
          </p>
          <button
            onClick={() => setShowInputs(true)}
            className="mt-6 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{
              background: "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.25)",
              color: "#D4AF37",
              boxShadow: "0 4px 16px rgba(212,175,55,0.1)",
            }}
          >
            <Palette className="h-4 w-4" />
            Start building
          </button>
        </div>
      )}

      {/* ── Palette results ── */}
      {hasPalette && palette && activePalette && (
        <div className="p-6 space-y-5">
          {/* Variant selector — only shown when the API returned multiple */}
          {hasVariants && variants.length > 1 && (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  {activeVariant?.subStyle ? `Direction — ${activeVariant.subStyle}` : "Palette variants"}
                </p>
                {activeVariant?.feel && (
                  <p className="text-[10px] italic" style={{ color: "rgba(212,175,55,0.55)" }}>
                    {activeVariant.feel}
                  </p>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {variants.map((variant, idx) => {
                  const isActive = idx === activeVariantIndex
                  const bg = isValidHex(variant.palette.background.hex) ? variant.palette.background.hex : "#111"
                  const primary = isValidHex(variant.palette.primary.hex) ? variant.palette.primary.hex : "#D4AF37"
                  const accent = isValidHex(variant.palette.accent.hex) ? variant.palette.accent.hex : "#888"
                  const surface = isValidHex(variant.palette.surface.hex) ? variant.palette.surface.hex : "#333"
                  const text = isValidHex(variant.palette.text.hex) ? variant.palette.text.hex : "#fff"
                  const roleLabel = variant.role === "core" ? "Core" : variant.role === "dark" ? "Dark" : "Expressive"
                  return (
                    <button
                      key={`${variant.name}-${idx}`}
                      onClick={() => setActiveVariantIndex(idx)}
                      className="group relative overflow-hidden rounded-xl text-left transition-all hover:-translate-y-0.5"
                      style={{
                        border: isActive
                          ? "1px solid rgba(212,175,55,0.55)"
                          : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: isActive
                          ? "0 0 0 1px rgba(212,175,55,0.25) inset, 0 10px 30px rgba(0,0,0,0.35)"
                          : "0 2px 10px rgba(0,0,0,0.2)",
                      }}
                    >
                      {/* Colour strip */}
                      <div className="flex h-14 w-full">
                        <span className="flex-1" style={{ background: bg }} />
                        <span className="flex-1" style={{ background: surface }} />
                        <span className="flex-1" style={{ background: primary }} />
                        <span className="flex-1" style={{ background: accent }} />
                        <span className="flex-1" style={{ background: text }} />
                      </div>
                      {/* Info */}
                      <div className="px-3 py-2.5" style={{ background: "rgba(255,255,255,0.025)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{variant.name}</span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                            style={{
                              background: isActive ? "rgba(212,175,55,0.16)" : "rgba(255,255,255,0.04)",
                              color: isActive ? "#D4AF37" : "rgba(255,255,255,0.4)",
                              border: isActive ? "1px solid rgba(212,175,55,0.32)" : "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Brand Preview */}
          <div>
            <p
              className="mb-2.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Brand Preview
            </p>
            <BrandPreviewBar palette={activePalette} />
          </div>

          {/* Swatch grid */}
          <div>
            <p
              className="mb-2.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Colour Palette — click any swatch to copy
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {COLOUR_ROLES.map(({ key, label }) => {
                const colour = activePalette[key]
                return colour ? (
                  <ColourSwatch key={key} colour={colour} role={label} />
                ) : null
              })}
            </div>
          </div>

          {/* Designer's note — variant-specific insight when available */}
          {(activeVariant?.usageInsight || palette.rationale) && (
            <div
              className="rounded-xl px-5 py-4 text-xs leading-relaxed"
              style={{
                background: "rgba(212,175,55,0.04)",
                border: "1px solid rgba(212,175,55,0.12)",
              }}
            >
              <span
                className="mr-1.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(212,175,55,0.55)" }}
              >
                Designer&apos;s note
              </span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>
                {activeVariant?.usageInsight || palette.rationale}
              </span>
            </div>
          )}

          {/* Hex quick-copy strip */}
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            {COLOUR_ROLES.map(({ key }) => {
              const c = activePalette[key]
              if (!c) return null
              const safe = isValidHex(c.hex) ? c.hex : "#888888"
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-full"
                    style={{ background: safe, border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: "rgba(255,255,255,0.28)" }}
                  >
                    {safe.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Live landing page mockup */}
          <LandingPreview
            brandName={brandName}
            keywords={keywords}
            vibe={vibe}
            palette={activePalette}
          />

          {/* Stitch export — collapsible secondary option */}
          <StitchPrompt
            brandName={brandName}
            keywords={keywords}
            vibe={vibe}
            palette={activePalette}
          />
        </div>
      )}
    </div>
  )
}
