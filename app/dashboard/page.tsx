"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { RestorePurchase } from "@/components/restore-purchase"
import { BrandPalette } from "@/components/brand-palette"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import {
  Loader2,
  Crown,
  Zap,
  Settings,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Infinity,
  Search,
  Palette,
  Lock,
  Check,
} from "lucide-react"

interface SubscriptionInfo {
  isPro: boolean
  subscriptionEnd: string | null
  customerId: string | null
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#050505" }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#D4AF37" }} />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}

// ── Brand Journey tracker ──────────────────────────────────────────────────────

const JOURNEY_STEPS = [
  {
    step: 1,
    icon: Sparkles,
    label: "Brand Name",
    description: "Generate & shortlist names with domain availability confirmed",
    href: "/generate",
    done: true,
    locked: false,
  },
  {
    step: 2,
    icon: Palette,
    label: "Colour Identity",
    description: "Build the visual foundation of your brand",
    href: "#palette",
    done: false,
    locked: false,
  },
  {
    step: 3,
    icon: Lock,
    label: "Logo Mark",
    description: "Coming soon — visual identity design",
    href: null,
    done: false,
    locked: true,
  },
] as const

function BrandJourney() {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.22)" }}
        >
          Your Brand Journey
        </p>
      </div>

      {/* On desktop, show steps horizontally */}
      <div className="px-6 py-2 lg:flex lg:divide-x lg:py-0" style={{ "--tw-divide-opacity": "1" } as React.CSSProperties}>
        {JOURNEY_STEPS.map((s, i) => {
          const Icon = s.icon
          const isLast = i === JOURNEY_STEPS.length - 1

          const content = (
            <div className="flex items-start gap-4 py-4 lg:flex-col lg:gap-3 lg:px-6 lg:py-5 lg:first:pl-0 lg:last:pr-0">
              {/* Icon */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full lg:h-11 lg:w-11"
                style={{
                  background: s.done
                    ? "rgba(212,175,55,0.15)"
                    : s.locked
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.07)",
                  border: s.done
                    ? "1px solid rgba(212,175,55,0.35)"
                    : s.locked
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "1px solid rgba(255,255,255,0.12)",
                  boxShadow: s.done ? "0 0 18px rgba(212,175,55,0.15)" : "none",
                }}
              >
                {s.done ? (
                  <Check className="h-4 w-4" style={{ color: "#D4AF37" }} />
                ) : (
                  <Icon
                    className="h-4 w-4"
                    style={{ color: s.locked ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.55)" }}
                  />
                )}
              </div>

              {/* Mobile: vertical connector between steps */}
              {!isLast && (
                <div
                  className="mt-1 w-px lg:hidden"
                  style={{
                    minHeight: 20,
                    background: s.done
                      ? "linear-gradient(to bottom, rgba(212,175,55,0.3), rgba(255,255,255,0.06))"
                      : "rgba(255,255,255,0.05)",
                    alignSelf: "stretch",
                    position: "absolute",
                    left: 43,
                  }}
                />
              )}

              {/* Step text */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: s.done
                        ? "#D4AF37"
                        : s.locked
                        ? "rgba(255,255,255,0.22)"
                        : "rgba(255,255,255,0.88)",
                    }}
                  >
                    {s.label}
                  </span>
                  {s.done && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: "rgba(212,175,55,0.14)", color: "#D4AF37" }}
                    >
                      Complete
                    </span>
                  )}
                  {s.locked && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}
                    >
                      Coming soon
                    </span>
                  )}
                </div>
                <p
                  className="mt-0.5 text-xs leading-relaxed"
                  style={{ color: s.locked ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.32)" }}
                >
                  {s.description}
                </p>
              </div>
            </div>
          )

          const wrapper = (children: React.ReactNode) => {
            if (s.locked || !s.href) return <div key={s.step} className="relative lg:flex-1">{children}</div>
            if (s.href.startsWith("#")) {
              return (
                <a key={s.step} href={s.href} className="relative block transition-opacity hover:opacity-90 lg:flex-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {children}
                </a>
              )
            }
            return (
              <Link key={s.step} href={s.href} className="relative block transition-opacity hover:opacity-90 lg:flex-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {children}
              </Link>
            )
          }

          return wrapper(content)
        })}
      </div>
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    isPro: false,
    subscriptionEnd: null,
    customerId: null,
  })
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [justUpgraded, setJustUpgraded] = useState(false)

  const paletteNameParam = searchParams.get("palette") || ""
  const paletteVibeParam = searchParams.get("vibe") || "modern"

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/sign-in")
        return
      }
      setUser(user)

      const sessionId = searchParams.get("session_id")
      if (sessionId) {
        setVerifying(true)
        try {
          const res = await fetch("/api/stripe/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          })
          if (res.ok) {
            setSubscription({ isPro: true, subscriptionEnd: null, customerId: null })
            setJustUpgraded(true)
            setVerifying(false)
            setLoading(false)
            return
          }
        } catch (err) {
          console.error("Error verifying payment:", err)
        }
        setVerifying(false)
      }

      try {
        const response = await fetch("/api/subscription")
        if (response.ok) {
          const data = await response.json()
          setSubscription({
            isPro: data.isPro || false,
            subscriptionEnd: data.subscriptionEnd || null,
            customerId: data.customerId || null,
          })
        }
      } catch (error) {
        console.error("Error fetching subscription:", error)
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase, router, searchParams])

  if (loading || verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: "#050505" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#D4AF37" }} />
        {verifying && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Activating your Pro access…
          </p>
        )}
      </div>
    )
  }

  const isPro = subscription.isPro
  const username = user?.email?.split("@")[0] || "User"
  const initial = (user?.email || "U").charAt(0).toUpperCase()

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "#050505" }}>

      {/* ── Background ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 60% 50% at 5% 8%, rgba(212,175,55,0.12) 0%, transparent 55%)",
            "radial-gradient(ellipse 40% 35% at 95% 85%, rgba(212,175,55,0.07) 0%, transparent 55%)",
          ].join(","),
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(212,175,55,0.04) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 82%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 82%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <Navbar />

      <main className="relative flex-1 px-4 pb-24 pt-28 sm:pt-36 lg:px-8">
        {/* ── Widened container — max-w-6xl on desktop ── */}
        <div className="mx-auto max-w-2xl lg:max-w-6xl">

          {/* ── Hero header — full width ── */}
          <div className="mb-10 lg:mb-12">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="inline-block h-px w-8"
                style={{ background: "linear-gradient(90deg, #D4AF37, transparent)" }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(212,175,55,0.6)" }}
              >
                Brand Studio
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1
                  className="text-4xl font-bold leading-tight text-white sm:text-5xl"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Build your brand,
                  <br />
                  <span style={{ color: "#D4AF37" }}>layer by layer.</span>
                </h1>
                <p
                  className="mt-3 max-w-sm text-sm leading-relaxed lg:max-w-md"
                  style={{ color: "rgba(255,255,255,0.38)" }}
                >
                  Start with the name. Build the colours. Own the identity.
                </p>
              </div>

              {/* Avatar + settings */}
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 70%)",
                      border: "1px solid rgba(212,175,55,0.28)",
                      color: "#D4AF37",
                    }}
                  >
                    {initial}
                  </div>
                  <Link
                    href="/account"
                    className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:bg-white/5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.3)",
                    }}
                    title="Account settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                </div>
                {isPro && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-black"
                    style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
                  >
                    <Crown className="h-2.5 w-2.5" />
                    Pro
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Upgrade success banner — full width ── */}
          {justUpgraded && (
            <div
              className="mb-8 flex items-center gap-3 rounded-2xl px-5 py-4"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)" }}
            >
              <CheckCircle className="h-5 w-5 shrink-0" style={{ color: "#D4AF37" }} />
              <p className="text-sm font-medium" style={{ color: "#D4AF37" }}>
                Payment confirmed — Pro access is now active.
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MAIN GRID
              Mobile:  single column, stacked
              Desktop: left (actions) | right (brand palette)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">

            {/* ── LEFT COLUMN — primary actions ── */}
            <div className="space-y-4">

              {/* Generate Brand Names — primary CTA */}
              <Link
                href="/generate"
                className="group flex items-center justify-between gap-4 overflow-hidden rounded-2xl px-6 py-5 transition-all hover:-translate-y-1"
                style={{
                  background: "linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.06) 60%, rgba(212,175,55,0.10) 100%)",
                  border: "1px solid rgba(212,175,55,0.28)",
                  boxShadow: "0 8px 32px rgba(212,175,55,0.08)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "rgba(212,175,55,0.18)",
                      border: "1px solid rgba(212,175,55,0.3)",
                      boxShadow: "0 0 20px rgba(212,175,55,0.15)",
                    }}
                  >
                    <Sparkles className="h-5 w-5" style={{ color: "#D4AF37" }} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">Generate Brand Names</p>
                    <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      AI naming · live domain availability · Founder Signal™ scoring
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                  style={{ color: "rgba(212,175,55,0.6)" }}
                />
              </Link>

              {/* Deep Search — secondary CTA */}
              <Link
                href="/generate"
                className="group flex items-center justify-between gap-4 rounded-2xl px-6 py-4 transition-all hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.15)" }}
                  >
                    <Search className="h-4 w-4" style={{ color: "#60a5fa" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Deep Search</p>
                    <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Find available .com names — 80+ candidates tested per search
                    </p>
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
                  style={{ color: "rgba(255,255,255,0.18)" }}
                />
              </Link>

              {/* ── Account & plan — stays in left col on desktop ── */}
              <div
                className="rounded-2xl px-6 py-5"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    Account
                  </p>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {username}
                  </span>
                </div>

                {isPro ? (
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{
                      background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)",
                      border: "1px solid rgba(212,175,55,0.18)",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Crown className="h-4 w-4" style={{ color: "#D4AF37" }} />
                      <div>
                        <span className="text-sm font-semibold text-white">NamoLux Pro</span>
                        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                          Lifetime access · unlimited generations
                        </p>
                      </div>
                    </div>
                    <Infinity className="h-4 w-4" style={{ color: "rgba(212,175,55,0.5)" }} strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />
                        <span className="text-sm font-medium text-white">Free Plan</span>
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
                        3 generations / day
                      </span>
                    </div>
                    <a
                      href="/api/stripe/checkout"
                      className="group flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition-all hover:-translate-y-0.5"
                      style={{
                        background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                        boxShadow: "0 4px 20px rgba(212,175,55,0.28)",
                      }}
                    >
                      Unlock Pro — £15 one-time
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                    <div className="pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <RestorePurchase />
                    </div>
                  </div>
                )}
              </div>

            </div>
            {/* END left column */}

            {/* ── RIGHT COLUMN — brand identity ── */}
            <div id="palette" className="lg:sticky lg:top-28">
              <BrandPalette initialName={paletteNameParam} initialVibe={paletteVibeParam} />
            </div>

          </div>
          {/* END main grid */}

          {/* ═══════════════════════════════════════════════════════════════════
              FULL-WIDTH SECTIONS (below the grid on all breakpoints)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="mt-6 space-y-6">
            <BrandJourney />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
