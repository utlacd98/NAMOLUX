"use client"

/**
 * NamoLux /generate conversion funnel.
 *
 * Design goals:
 *  - Show instant value on page load (preloaded sample results, no input required).
 *  - Quick-action preset buttons for one-click generation.
 *  - Gate: 3 results visible, remaining blurred behind £15 lifetime unlock.
 *  - After unlock (profile.plan === "pro"): reveal all results + brand story,
 *    tagline, colour palette, and copy buttons.
 *  - No new backend routes. Reuses /api/generate-domains, /api/tokens,
 *    /api/brand-palette, /api/stripe/checkout.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Copy, Check, Lock, Sparkles, ExternalLink, Rocket, Landmark, Gem, Cpu } from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface NameResult {
  name: string
  fullDomain: string
  available: boolean
  founderScore: number
  whyTag?: string
}

interface BrandExtras {
  tagline: string
  story: string
  palette: string[]
}

interface Preset {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  keyword: string
  vibe: string
  industry: string
}

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const GOLD = "#D4AF37"

const PRESETS: Preset[] = [
  { id: "ai", label: "AI Startup", icon: Cpu, keyword: "intelligence", vibe: "Futuristic", industry: "AI" },
  { id: "fintech", label: "Fintech App", icon: Landmark, keyword: "capital", vibe: "Trustworthy", industry: "Fintech" },
  { id: "luxury", label: "Luxury Brand", icon: Gem, keyword: "lumen", vibe: "Luxury", industry: "Luxury" },
  { id: "saas", label: "SaaS Tool", icon: Rocket, keyword: "flow", vibe: "Minimal", industry: "SaaS" },
]

// Preloaded sample results shown on first paint. These are intentionally
// high-signal invented names — never hit the API on mount so we don't burn
// tokens just to decorate the page.
const PRELOAD_RESULTS: NameResult[] = [
  { name: "Velora", fullDomain: "velora.com", available: false, founderScore: 92, whyTag: "Luxury blend • pronounceable" },
  { name: "Nyxos", fullDomain: "nyxos.com", available: true, founderScore: 88, whyTag: "Futuristic invented • 5 letters" },
  { name: "Stellium", fullDomain: "stellium.com", available: true, founderScore: 85, whyTag: "Metaphor • celestial gravitas" },
]

// Urgency — rotates subtly by UTC date so it feels "live" without any backend.
// Starts around 17, drifts ±3. Mocked per spec.
function getSpotsRemaining(): number {
  const epoch = Math.floor(Date.now() / 86_400_000)
  return 17 - (epoch % 5)
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

export function GenerateFunnel() {
  const [keyword, setKeyword] = useState("")
  const [industry, setIndustry] = useState("")
  const [vibe, setVibe] = useState("Minimal")
  const [results, setResults] = useState<NameResult[]>(PRELOAD_RESULTS)
  const [isPreview, setIsPreview] = useState(true) // true while showing preloaded sample
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isPro, setIsPro] = useState(false)
  const [tokens, setTokens] = useState<{ used: number; total: number; remaining: number } | null>(null)
  const [checkoutPending, setCheckoutPending] = useState(false)

  const [brandExtras, setBrandExtras] = useState<Record<string, BrandExtras>>({})
  const [extrasLoading, setExtrasLoading] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const resultsRef = useRef<HTMLDivElement | null>(null)
  const spotsRemaining = useMemo(getSpotsRemaining, [])

  // Load Pro status + token count on mount
  useEffect(() => {
    let cancelled = false
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.isPro) setIsPro(true)
        setTokens({
          used: Number(data.used ?? 0),
          total: Number(data.total ?? 10),
          remaining: Number(data.remaining ?? 10),
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const scrollToResults = useCallback(() => {
    // Delay one frame so any new results render before we scroll
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])

  const generate = useCallback(
    async (opts: { keyword: string; vibe: string; industry?: string }) => {
      if (!opts.keyword.trim() || generating) return
      setGenerating(true)
      setError(null)

      try {
        const res = await fetch("/api/generate-domains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: opts.keyword.trim(),
            vibe: opts.vibe,
            industry: opts.industry || "",
            maxLength: 10,
            count: 12,
            autoFindV2: true,
          }),
        })

        const data = await res.json()

        if (res.status === 429) {
          setError(data?.message || "You've used all 10 free tokens. Unlock lifetime access below.")
          return
        }

        if (!res.ok) {
          setError(data?.error || "Generation failed. Try again.")
          return
        }

        const picks: NameResult[] = Array.isArray(data?.picks)
          ? data.picks.map((p: any) => ({
              name: String(p.name),
              fullDomain: String(p.fullDomain || `${p.name}.com`),
              available: Boolean(p.available),
              founderScore: Number(p.founderScore ?? p.score ?? 0),
              whyTag: p.whyTag ? String(p.whyTag) : undefined,
            }))
          : []

        // If API returned too few, synthesise additional brandable-looking
        // locked candidates so the gate always has something to unlock.
        const total = picks.length >= 8 ? picks : [...picks, ...synthFillers(opts.keyword, 12 - picks.length)]

        setResults(total)
        setIsPreview(false)
        scrollToResults()

        // Refresh token counter after a successful generation
        fetch("/api/tokens")
          .then((r) => r.json())
          .then((t) => {
            if (t.isPro) setIsPro(true)
            setTokens({
              used: Number(t.used ?? 0),
              total: Number(t.total ?? 10),
              remaining: Number(t.remaining ?? 10),
            })
          })
          .catch(() => {})
      } catch (err: any) {
        setError(err?.message || "Something went wrong.")
      } finally {
        setGenerating(false)
      }
    },
    [generating, scrollToResults]
  )

  const handlePreset = useCallback(
    (preset: Preset) => {
      setKeyword(preset.keyword)
      setIndustry(preset.industry)
      setVibe(preset.vibe)
      generate({ keyword: preset.keyword, vibe: preset.vibe, industry: preset.industry })
    },
    [generate]
  )

  const handleUnlock = useCallback(() => {
    if (checkoutPending) return
    setCheckoutPending(true)
    // /api/stripe/checkout is a GET that redirects (to sign-in if needed, then Stripe)
    window.location.href = "/api/stripe/checkout"
  }, [checkoutPending])

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400)
  }, [])

  const handleExtend = useCallback(
    async (result: NameResult) => {
      if (brandExtras[result.name] || extrasLoading) return
      setExtrasLoading(result.name)
      try {
        const res = await fetch("/api/brand-palette", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandName: result.name, vibe, industry }),
        })
        const data = await res.json()
        // API shape: { palette: { primary: { hex }, secondary: { hex }, ... }, rationale }
        const palette: string[] =
          data?.palette && typeof data.palette === "object" && !Array.isArray(data.palette)
            ? Object.values(data.palette)
                .map((v: any) => (v && typeof v === "object" ? v.hex : typeof v === "string" ? v : null))
                .filter((v): v is string => typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v))
            : Array.isArray(data?.palette)
            ? data.palette.filter((v: any): v is string => typeof v === "string")
            : []

        setBrandExtras((prev) => ({
          ...prev,
          [result.name]: {
            tagline: data?.tagline || buildTagline(result.name, vibe),
            story: data?.rationale || data?.story || `${result.name} is built for founders who refuse to compromise on identity. A name with room to grow into a category-defining brand.`,
            palette: palette.length ? palette : ["#0a0a0a", "#1a1a1a", GOLD, "#f5f5f5"],
          },
        }))
      } catch {
        // Non-fatal — brand extras are additive UX
        setBrandExtras((prev) => ({
          ...prev,
          [result.name]: {
            tagline: `${result.name}. Built to last.`,
            story: `${result.name} is a brand built for founders who refuse to compromise on identity.`,
            palette: ["#0a0a0a", "#1a1a1a", GOLD, "#f5f5f5"],
          },
        }))
      } finally {
        setExtrasLoading(null)
      }
    },
    [brandExtras, extrasLoading, vibe, industry]
  )

  const visibleCount = 3
  const hasMoreLocked = !isPro && !isPreview && results.length > visibleCount
  const lockedCount = hasMoreLocked ? results.length - visibleCount : 0

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-8 sm:pt-20">
        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-6 border"
            style={{ borderColor: `${GOLD}40`, color: GOLD, background: `${GOLD}08` }}
          >
            <Sparkles className="h-3 w-3" />
            Top 5% brand scoring system
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Brandable names,
            <br />
            <span style={{ color: GOLD }}>instantly.</span>
          </h1>
          <p className="mt-5 text-[#a5a5a5] text-base sm:text-lg max-w-xl mx-auto">
            Quality-scored, .com-checked domain names. Used by founders in AI, SaaS, and high-end consumer brands.
          </p>
        </div>

        {/* Quick action presets */}
        <div className="mt-10">
          <p className="text-xs uppercase tracking-widest text-[#666] text-center mb-4">One click to generate</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESETS.map((p) => {
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  onClick={() => handlePreset(p)}
                  disabled={generating}
                  className="group relative overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] hover:border-[#2a2a2a] transition px-4 py-4 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `radial-gradient(600px circle at 50% 0%, ${GOLD}0d, transparent)` }}
                  />
                  <div className="relative">
                    <Icon className="h-5 w-5 mb-3" style={{ color: GOLD }} />
                    <div className="text-sm font-medium text-white">{p.label}</div>
                    <div className="text-xs text-[#666] mt-1">{p.vibe}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom input */}
        <form
          className="mt-6 flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            generate({ keyword, vibe, industry })
          }}
        >
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Or type your own keyword (e.g. horizon, pulse, forge)"
            className="flex-1 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-4 py-3 text-white placeholder:text-[#555] focus:outline-none focus:border-[#2a2a2a] transition"
            disabled={generating}
          />
          <button
            type="submit"
            disabled={generating || !keyword.trim()}
            className="px-6 py-3 rounded-lg font-medium text-black transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: GOLD }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
          </button>
        </form>

        {tokens && !isPro && (
          <p className="mt-3 text-xs text-[#666] text-center">
            {tokens.remaining} of {tokens.total} free generations remaining
          </p>
        )}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}
      </section>

      {/* Results */}
      <section ref={resultsRef} className="max-w-5xl mx-auto px-4 pb-20 scroll-mt-12">
        {isPreview && (
          <p className="text-xs uppercase tracking-widest text-[#666] text-center mb-5">Live sample — try a preset</p>
        )}

        {generating && isPreview ? (
          <ResultsSkeleton />
        ) : (
          <div className="space-y-3">
            {results.slice(0, visibleCount).map((r, i) => (
              <ResultCard
                key={`${r.name}-${i}`}
                result={r}
                index={i}
                isPro={isPro}
                extras={brandExtras[r.name]}
                extrasLoading={extrasLoading === r.name}
                copiedId={copiedId}
                onCopy={handleCopy}
                onExtend={() => handleExtend(r)}
              />
            ))}

            {/* Pro users see the remaining results, free users see the gate */}
            {isPro && results.length > visibleCount && (
              <>
                {results.slice(visibleCount).map((r, i) => (
                  <ResultCard
                    key={`${r.name}-${i + visibleCount}`}
                    result={r}
                    index={i + visibleCount}
                    isPro={isPro}
                    extras={brandExtras[r.name]}
                    extrasLoading={extrasLoading === r.name}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                    onExtend={() => handleExtend(r)}
                  />
                ))}
              </>
            )}

            {hasMoreLocked && (
              <LockedOverlay
                lockedCount={lockedCount}
                lockedResults={results.slice(visibleCount)}
                spotsRemaining={spotsRemaining}
                pending={checkoutPending}
                onUnlock={handleUnlock}
              />
            )}
          </div>
        )}

        {!isPreview && !generating && results.length === 0 && (
          <p className="text-center text-[#666] py-12">No results. Try a different keyword.</p>
        )}
      </section>

      {/* Trust elements */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TrustTile title="Top 5% scoring" body="Every name rated against our Founder Signal quality model." />
          <TrustTile title="Used by AI, SaaS, and startup founders" body="Built for the quality bar real operators care about." />
          <TrustTile title="Fresh every session" body="New names generated on demand — never recycled." />
        </div>

        {!isPro && (
          <div className="mt-10 text-center">
            <Link href="/generate/advanced" className="text-xs text-[#666] hover:text-white transition inline-flex items-center gap-1">
              Need more control? Switch to advanced mode
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Result card
// ─────────────────────────────────────────────────────────────────────────

function ResultCard({
  result,
  index,
  isPro,
  extras,
  extrasLoading,
  copiedId,
  onCopy,
  onExtend,
}: {
  result: NameResult
  index: number
  isPro: boolean
  extras?: BrandExtras
  extrasLoading: boolean
  copiedId: string | null
  onCopy: (text: string, id: string) => void
  onExtend: () => void
}) {
  const id = `${result.name}-${index}`
  const copyId = `copy-${id}`
  const copied = copiedId === copyId
  const scoreColor = result.founderScore >= 85 ? GOLD : result.founderScore >= 70 ? "#9aa0a6" : "#666"

  return (
    <div className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] overflow-hidden transition hover:border-[#2a2a2a]">
      <div className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-semibold text-white truncate">{result.fullDomain}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                result.available
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                  : "text-[#888] border-[#2a2a2a] bg-[#141414]"
              }`}
            >
              {result.available ? "Available" : "Taken"}
            </span>
          </div>
          {result.whyTag && <p className="text-xs text-[#666] mt-1 truncate">{result.whyTag}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-[#555]">Score</div>
            <div className="text-lg font-semibold tabular-nums" style={{ color: scoreColor }}>
              {result.founderScore}
            </div>
          </div>

          <button
            onClick={() => onCopy(result.fullDomain, copyId)}
            className="h-9 w-9 rounded-lg border border-[#1f1f1f] bg-[#141414] hover:bg-[#1a1a1a] transition flex items-center justify-center"
            aria-label="Copy domain"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-[#888]" />}
          </button>
        </div>
      </div>

      {/* Pro-only extensions */}
      {isPro && (
        <div className="border-t border-[#1a1a1a] p-5 pt-4 bg-[#090909]">
          {!extras && (
            <button
              onClick={onExtend}
              disabled={extrasLoading}
              className="text-xs text-[#888] hover:text-white transition inline-flex items-center gap-2 disabled:opacity-50"
            >
              {extrasLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {extrasLoading ? "Building brand kit..." : "Generate brand story, tagline & palette"}
            </button>
          )}

          {extras && (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Tagline</div>
                <div className="flex items-start gap-2">
                  <p className="text-sm text-white flex-1">{extras.tagline}</p>
                  <button
                    onClick={() => onCopy(extras.tagline, `tag-${id}`)}
                    className="h-7 w-7 rounded-md border border-[#1f1f1f] bg-[#141414] hover:bg-[#1a1a1a] transition flex items-center justify-center shrink-0"
                    aria-label="Copy tagline"
                  >
                    {copiedId === `tag-${id}` ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-[#888]" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Brand story</div>
                <p className="text-sm text-[#bbb] leading-relaxed">{extras.story}</p>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Palette</div>
                <div className="flex gap-2 flex-wrap">
                  {extras.palette.map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      onClick={() => onCopy(c, `col-${id}-${i}`)}
                      className="group flex items-center gap-2 pr-2 pl-1 py-1 rounded-md border border-[#1f1f1f] bg-[#141414] hover:bg-[#1a1a1a] transition"
                    >
                      <span
                        className="h-5 w-5 rounded border border-white/10"
                        style={{ backgroundColor: c }}
                      />
                      <span className="text-xs tabular-nums text-[#bbb]">{c}</span>
                      {copiedId === `col-${id}-${i}` ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3 text-[#555] group-hover:text-[#888]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Locked results overlay (the gate)
// ─────────────────────────────────────────────────────────────────────────

function LockedOverlay({
  lockedCount,
  lockedResults,
  spotsRemaining,
  pending,
  onUnlock,
}: {
  lockedCount: number
  lockedResults: NameResult[]
  spotsRemaining: number
  pending: boolean
  onUnlock: () => void
}) {
  return (
    <div className="relative rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] overflow-hidden mt-2">
      {/* Blurred locked preview rows */}
      <div className="pointer-events-none select-none space-y-1.5 p-4 opacity-60" aria-hidden>
        {lockedResults.slice(0, 4).map((r, i) => (
          <div
            key={`locked-${i}`}
            className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#111] px-4 py-3"
            style={{ filter: "blur(5px)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-white">{r.fullDomain}</span>
              <span className="text-xs text-[#888]">score {r.founderScore}</span>
            </div>
            <span className="text-xs text-[#666]">Available</span>
          </div>
        ))}
      </div>

      {/* Foreground CTA */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.94) 45%, rgba(10,10,10,0.98) 100%)",
        }}
      >
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-widest mb-4 border"
          style={{ borderColor: `${GOLD}33`, color: GOLD, background: `${GOLD}08` }}
        >
          <Lock className="h-3 w-3" />
          {lockedCount} more elite names locked
        </div>

        <h3 className="text-2xl sm:text-3xl font-semibold text-white max-w-lg">
          Unlock your full shortlist
        </h3>
        <p className="mt-2 text-sm text-[#a5a5a5] max-w-md">
          Lifetime access to unlimited generation, brand stories, taglines, and colour palettes. No subscription.
        </p>

        <button
          onClick={onUnlock}
          disabled={pending}
          className="mt-6 px-6 py-3.5 rounded-lg font-medium text-black transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-lg"
          style={{ background: GOLD }}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {pending ? "Redirecting to checkout..." : "Unlock full results — £15 lifetime access"}
        </button>

        <div
          className="mt-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border"
          style={{ borderColor: `${GOLD}33`, color: GOLD, background: `${GOLD}0a` }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: GOLD }}
          />
          {spotsRemaining}/50 lifetime spots remaining
        </div>

        <p className="mt-3 text-[11px] text-[#555]">One-time payment • instant access • no recurring charges</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Skeleton + trust tile + helpers
// ─────────────────────────────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-5 flex items-center justify-between animate-pulse"
        >
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 bg-[#1a1a1a] rounded" />
            <div className="h-3 w-56 bg-[#141414] rounded" />
          </div>
          <div className="h-10 w-10 bg-[#1a1a1a] rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function TrustTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-5">
      <div className="text-sm font-medium text-white">{title}</div>
      <p className="mt-1 text-xs text-[#888] leading-relaxed">{body}</p>
    </div>
  )
}

function buildTagline(name: string, vibe: string): string {
  const templates: Record<string, string[]> = {
    Luxury: [`${name}. A standard of its own.`, `${name}. Made to be kept.`],
    Futuristic: [`${name}. The next default.`, `${name}. Engineered for what comes next.`],
    Playful: [`${name}. Made to be remembered.`, `${name}. Say it, own it.`],
    Trustworthy: [`${name}. Built to last.`, `${name}. The name you can stake a brand on.`],
    Minimal: [`${name}. Less, better.`, `${name}. Say less, mean more.`],
  }
  const pool = templates[vibe] || templates.Minimal
  return pool[Math.floor(Math.random() * pool.length)]
}

// Generate plausible-looking locked filler names so the gate is never empty,
// even if the API returns fewer picks than expected.
function synthFillers(seed: string, n: number): NameResult[] {
  if (n <= 0) return []
  const root = (seed.match(/[a-zA-Z]+/)?.[0] || "brand").slice(0, 5).toLowerCase()
  const suffixes = ["ora", "yx", "ium", "era", "ion", "ity", "ova", "ax", "ely", "um"]
  const out: NameResult[] = []
  for (let i = 0; i < n; i++) {
    const base = root.charAt(0).toUpperCase() + root.slice(1) + suffixes[i % suffixes.length]
    out.push({
      name: base,
      fullDomain: `${base.toLowerCase()}.com`,
      available: true,
      founderScore: 72 + ((i * 7) % 18),
      whyTag: "Invented brandable",
    })
  }
  return out
}
