"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { RestorePurchase } from "@/components/restore-purchase"
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
} from "lucide-react"

interface SubscriptionInfo {
  isPro: boolean
  subscriptionEnd: string | null
  customerId: string | null
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050505" }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo>({ isPro: false, subscriptionEnd: null, customerId: null })
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [justUpgraded, setJustUpgraded] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
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

      {/* Luxury background glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(circle at 15% 20%, rgba(212,175,55,0.16) 0%, transparent 40%)",
            "radial-gradient(circle at 85% 75%, rgba(212,175,55,0.10) 0%, transparent 45%)",
          ].join(","),
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(212,175,55,0.055) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 85%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <Navbar />

      <main className="relative flex-1 px-4 pt-28 pb-16 sm:pt-32">
        <div className="mx-auto max-w-2xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Dashboard</h1>
            <p className="mt-1.5 text-sm text-white/40">Welcome back, {user?.email}</p>
          </div>

          {/* Success banner */}
          {justUpgraded && (
            <div
              className="mb-6 flex items-center gap-3 rounded-2xl px-5 py-4"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)" }}
            >
              <CheckCircle className="h-5 w-5 text-[#D4AF37] shrink-0" />
              <p className="text-[#D4AF37] font-medium text-sm">Payment confirmed — Pro access is now active.</p>
            </div>
          )}

          {/* Profile Card */}
          <div
            className="rounded-2xl p-6 mb-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-[#D4AF37]"
                  style={{
                    background: "radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 70%)",
                    border: "1px solid rgba(212,175,55,0.3)",
                    boxShadow: "0 0 28px rgba(212,175,55,0.12)",
                  }}
                >
                  {initial}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{username}</h2>
                  <p className="text-sm text-white/40">{user?.email}</p>
                  <div className="mt-2">
                    {isPro ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-black"
                        style={{ background: "linear-gradient(135deg, #D4AF37, #F6E27A)" }}
                      >
                        <Crown className="h-3 w-3" />
                        Pro
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white/40"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        Free
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href="/account"
                className="rounded-xl p-2.5 text-white/30 transition-all hover:text-white/80 hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Settings className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              </Link>
            </div>
          </div>

          {/* Generation Limit Card */}
          <div
            className="rounded-2xl p-5 mb-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)" }}
              >
                <Zap className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <span className="text-xs font-medium uppercase tracking-widest text-white/35">Generation Limit</span>
            </div>
            <div className="flex items-baseline gap-2">
              {isPro ? (
                <>
                  <Infinity className="h-8 w-8 text-white font-bold" strokeWidth={2.5} />
                  <span className="text-3xl font-bold text-white">Unlimited</span>
                </>
              ) : (
                <span className="text-3xl font-bold text-white">1 per day</span>
              )}
            </div>
            <p className="mt-1 text-xs text-white/25">
              {isPro ? "Pro members have unlimited generations" : "Upgrade to Pro for unlimited access"}
            </p>
          </div>

          {/* Subscription Section */}
          {isPro ? (
            <div
              className="rounded-2xl p-6 mb-4"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.04) 100%)",
                border: "1px solid rgba(212,175,55,0.22)",
                boxShadow: "0 0 60px rgba(212,175,55,0.06) inset",
              }}
            >
              <div className="flex items-center gap-3 mb-1">
                <Crown className="h-5 w-5 text-[#D4AF37]" />
                <h3 className="text-base font-semibold text-white">NamoLux Pro</h3>
              </div>
              <p className="text-sm text-white/40">Lifetime access — one-time payment</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/50">
                {["Unlimited generations", "Founder Signal™ scoring", "All future updates"].map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-[#D4AF37]/70" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-6 mb-4"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h3 className="text-base font-semibold text-white mb-1">Upgrade to Pro</h3>
              <p className="text-sm text-white/40 mb-4">
                Unlimited domain generation, Founder Signal™ scoring, and all future updates.
              </p>
              <div className="mb-4">
                <span className="text-2xl font-bold text-[#D4AF37]">£15</span>
                <span className="ml-2 text-xs text-white/30">one-time · no subscription</span>
              </div>
              <a
                href="/api/stripe/checkout"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition-all hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                  boxShadow: "0 6px 24px rgba(212,175,55,0.35)",
                }}
              >
                Upgrade to Pro
                <ArrowRight className="h-4 w-4" />
              </a>
              <div
                className="mt-4 pt-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <RestorePurchase />
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-black transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
              }}
            >
              <Sparkles className="h-4 w-4" />
              Generate Names
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white/70 transition-all hover:text-white hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
