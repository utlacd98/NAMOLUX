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
  ChevronRight,
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
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}

// Brand journey steps — Name is always complete once you're on the dashboard
const JOURNEY_STEPS = [
  {
    step: 1,
    icon: Sparkles,
    label: "Name",
    description: "Generate & shortlist brand names",
    href: "/generate",
    done: true,
  },
  {
    step: 2,
    icon: Palette,
    label: "Colour",
    description: "Build your brand colour identity",
    href: "#palette",
    done: false, // user must generate a palette
  },
  {
    step: 3,
    icon: Lock,
    label: "Logo",
    description: "Visual mark — coming soon",
    href: null,
    done: false,
    locked: true,
  },
]

function JourneyStep({
  step,
  icon: Icon,
  label,
  description,
  href,
  done,
  locked,
  isLast,
}: (typeof JOURNEY_STEPS)[number] & { isLast: boolean }) {
  const inner = (
    <div
      className="flex items-center gap-4 rounded-2xl px-4 py-4 transition-all"
      style={{
        background: done
          ? "rgba(212,175,55,0.06)"
          : locked
          ? "rgba(255,255,255,0.02)"
          : "rgba(255,255,255,0.04)",
        border: done
          ? "1px solid rgba(212,175,55,0.2)"
          : locked
          ? "1px solid rgba(255,255,255,0.04)"
          : "1px solid rgba(255,255,255,0.08)",
        opacity: locked ? 0.5 : 1,
        cursor: locked ? "default" : href ? "pointer" : "default",
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: done ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.06)",
          border: done ? "1px solid rgba(212,175,55,0.25)" : "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: done ? "#D4AF37" : locked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)" }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: done ? "#D4AF37" : locked ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.85)" }}
          >
            {step}. {label}
          </span>
          {done && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
            >
              Ready
            </span>
          )}
          {locked && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.2)" }}
            >
              Soon
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          {description}
        </p>
      </div>

      {!locked && href && (
        <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
      )}
    </div>
  )

  if (locked || !href) return inner

  if (href.startsWith("#")) {
    return (
      <a href={href} className="block no-underline hover:-translate-y-0.5 transition-transform">
        {inner}
      </a>
    )
  }

  return (
    <Link href={href} className="block no-underline hover:-translate-y-0.5 transition-transform">
      {inner}
    </Link>
  )
}

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

  // Pre-fill palette from query params (e.g. /dashboard?palette=indulgo&vibe=luxury)
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
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ background: "#050505" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        {verifying && <p className="text-white/40 text-sm">Activating your Pro access…</p>}
      </div>
    )
  }

  const isPro = subscription.isPro
  const username = user?.email?.split("@")[0] || "User"
  const initial = (user?.email || "U").charAt(0).toUpperCase()

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "#050505" }}>

      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(circle at 12% 18%, rgba(212,175,55,0.14) 0%, transparent 40%)",
            "radial-gradient(circle at 88% 70%, rgba(212,175,55,0.08) 0%, transparent 42%)",
          ].join(","),
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(212,175,55,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <Navbar />

      <main className="relative flex-1 px-4 pt-28 pb-20 sm:pt-32">
        <div className="mx-auto max-w-2xl space-y-5">

          {/* ── Page header ── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-3xl font-bold text-white sm:text-4xl">Brand Studio</h1>
                {isPro && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-black"
                    style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
                  >
                    <Crown className="h-2.5 w-2.5" />
                    Pro
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                Your workspace for building brand identity
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold"
                style={{
                  background: "radial-gradient(circle, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.04) 70%)",
                  border: "1px solid rgba(212,175,55,0.25)",
                  color: "#D4AF37",
                }}
              >
                {initial}
              </div>
              <Link
                href="/account"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white/30 transition-all hover:text-white/70"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                title="Account settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* ── Upgrade success banner ── */}
          {justUpgraded && (
            <div
              className="flex items-center gap-3 rounded-2xl px-5 py-4"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)" }}
            >
              <CheckCircle className="h-5 w-5 shrink-0 text-[#D4AF37]" />
              <p className="text-sm font-medium text-[#D4AF37]">Payment confirmed — Pro access is now active.</p>
            </div>
          )}

          {/* ── Brand Journey ── */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
              Brand Journey
            </p>
            <div className="space-y-2">
              {JOURNEY_STEPS.map((s, i) => (
                <JourneyStep key={s.step} {...s} isLast={i === JOURNEY_STEPS.length - 1} />
              ))}
            </div>
          </div>

          {/* ── Quick launch ── */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/generate"
              className="flex items-center gap-3 rounded-2xl px-4 py-4 transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))",
                border: "1px solid rgba(212,175,55,0.22)",
              }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.2)" }}
              >
                <Sparkles className="h-4 w-4" style={{ color: "#D4AF37" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Generate Names</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  AI name + availability
                </p>
              </div>
            </Link>

            <Link
              href="/generate"
              className="flex items-center gap-3 rounded-2xl px-4 py-4 transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.15)" }}
              >
                <Search className="h-4 w-4" style={{ color: "#60a5fa" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Deep Search</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Find .com gems
                </p>
              </div>
            </Link>
          </div>

          {/* ── Brand Colour Palette ── */}
          <div id="palette">
            <BrandPalette
              initialName={paletteNameParam}
              initialVibe={paletteVibeParam}
            />
          </div>

          {/* ── Account & plan ── */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
              Account
            </p>

            <div className="flex items-center gap-3 mb-4">
              <div>
                <p className="text-sm font-semibold text-white">{username}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{user?.email}</p>
              </div>
            </div>

            {isPro ? (
              <div
                className="rounded-xl p-4"
                style={{
                  background: "linear-gradient(135deg, rgba(212,175,55,0.09) 0%, rgba(212,175,55,0.04) 100%)",
                  border: "1px solid rgba(212,175,55,0.2)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-4 w-4 text-[#D4AF37]" />
                  <span className="text-sm font-semibold text-white">NamoLux Pro — Lifetime</span>
                </div>
                <div className="flex items-center gap-1">
                  <Infinity className="h-3.5 w-3.5 text-white/50" strokeWidth={2.5} />
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Unlimited generations · All features</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-white/25" />
                    <span className="text-sm font-medium text-white">Free Plan</span>
                  </div>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>3 generations / day</span>
                </div>
                <a
                  href="/api/stripe/checkout"
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-black transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                    boxShadow: "0 6px 24px rgba(212,175,55,0.28)",
                  }}
                >
                  Upgrade to Pro — £15 one-time
                  <ArrowRight className="h-4 w-4" />
                </a>
                <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <RestorePurchase />
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
