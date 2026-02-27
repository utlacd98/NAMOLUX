"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import {
  Loader2,
  Crown,
  Zap,
  Settings,
  Sparkles,
  ArrowRight,
  CheckCircle
} from "lucide-react"

interface SubscriptionInfo {
  isPro: boolean
  subscriptionEnd: string | null
  customerId: string | null
}

export default function DashboardPage() {
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
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/sign-in")
        return
      }
      setUser(user)

      // If returning from Stripe checkout, verify the payment and grant Pro
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

      // Check subscription status
      try {
        const response = await fetch("/api/subscription")
        if (response.ok) {
          const data = await response.json()
          setSubscription({
            isPro: data.isPro || false,
            subscriptionEnd: data.subscriptionEnd || null,
            customerId: data.customerId || null
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4A843]" />
        {verifying && <p className="text-[#888] text-sm">Activating your Pro access...</p>}
      </div>
    )
  }

  const isPro = subscription.isPro

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <Navbar />
      <main className="flex-1 px-4 pt-24 pb-12">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-[#888]">Welcome back, {user?.email}</p>
          </div>

          {/* Success banner */}
          {justUpgraded && (
            <div className="mb-6 flex items-center gap-3 bg-[#D4A843]/10 border border-[#D4A843]/30 rounded-xl px-5 py-4">
              <CheckCircle className="h-5 w-5 text-[#D4A843] shrink-0" />
              <p className="text-[#D4A843] font-medium">Payment confirmed — you now have Pro access!</p>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#2a2a2a]">
                  <span className="text-2xl font-bold text-[#D4A843]">
                    {(user?.email || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{user?.email?.split("@")[0] || "NamoLux User"}</h2>
                  <p className="text-[#888] text-sm">{user?.email}</p>
                  {/* Plan Badge */}
                  <div className="mt-2">
                    {isPro ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30">
                        <Crown className="h-3.5 w-3.5" />
                        Pro
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-[#333]/50 text-[#888] border border-[#444]">
                        Free
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link href="/account" className="text-[#888] hover:text-white transition p-2 hover:bg-[#1a1a1a] rounded-lg">
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4A843]/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-[#D4A843]" />
              </div>
              <span className="text-[#888] text-sm">Generation Limit</span>
            </div>
            <p className="text-3xl font-bold text-white">{isPro ? "Unlimited" : "1 per day"}</p>
            <p className="text-xs text-[#555] mt-1">
              {isPro ? "Pro members have unlimited generations" : "Upgrade to Pro for unlimited access"}
            </p>
          </div>

          {/* Subscription Section */}
          {isPro ? (
            <div className="bg-gradient-to-r from-[#D4A843]/10 to-[#D4A843]/5 border border-[#D4A843]/20 rounded-xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-5 w-5 text-[#D4A843]" />
                    <h3 className="text-lg font-semibold text-white">NamoLux Pro</h3>
                  </div>
                  <p className="text-[#888] text-sm">Lifetime access — one-time payment</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Upgrade to Pro</h3>
                  <p className="text-[#888] text-sm">
                    Get unlimited domain generation, Founder Signal™ scoring, and more.
                  </p>
                </div>
                <Link
                  href="/api/stripe/checkout"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-medium rounded-lg transition"
                >
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
                <p className="text-[#D4A843] text-lg font-semibold">£15 one-time</p>
                <p className="text-xs text-[#555]">Pay once, use forever</p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-medium rounded-lg transition"
            >
              <Sparkles className="h-4 w-4" />
              Generate Names
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white font-medium rounded-lg transition"
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
