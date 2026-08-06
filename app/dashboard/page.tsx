"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { PUBLIC_PRODUCT_COPY } from "@/lib/site-content"
import { User } from "@supabase/supabase-js"
import {
  Loader2,
  Crown,
  Zap,
  Settings,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Search,
  FileText,
  ListChecks,
  Check,
} from "lucide-react"

interface SubscriptionInfo {
  isPro: boolean
  plan: "free" | "pro"
  planName: string
  canUseBrandPalette: boolean
  subscriptionEnd: string | null
  customerId: string | null
}

type SavedWorkspaceProject = {
  id: string
  name: string
}

type SavedWorkspaceShortlist = {
  id: string
  projectId: string
  title: string
  primaryTld: string
  updatedAt: string
}

type SavedWorkspaceEntry = {
  shortlistId: string
  candidateName: string
  isWinner: boolean
}

type SavedWorkspaceReport = {
  shortlistId: string
}

type DecisionWorkspaceSummary = {
  principal: {
    isPro: boolean
  }
  projects: SavedWorkspaceProject[]
  shortlists: SavedWorkspaceShortlist[]
  entries: SavedWorkspaceEntry[]
  reports: SavedWorkspaceReport[]
}

type DecisionRecordState = "loading" | "ready" | "unavailable"

type DecisionRecordSummary = {
  id: string
  projectName: string
  title: string
  primaryTld: string
  entryCount: number
  reportCount: number
  winnerName: string | null
  updatedAt: string
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

function DecisionJourney({ hasSavedDecision }: { hasSavedDecision: boolean }) {
  const journeySteps = [
    {
      step: 1,
      icon: ListChecks,
      label: "Bulk Check",
      description: "Check up to 50 candidates across six domain extensions",
      href: "/bulk-domain-check",
      done: true,
    },
    {
      step: 2,
      icon: Search,
      label: "Founder Signal",
      description: "Compare the strongest names against one primary TLD",
      href: "/founder-signal",
      done: false,
    },
    {
      step: 3,
      icon: FileText,
      label: "Decision record",
      description: "Save a shortlist, freeze an immutable report, and make a revocable view-only link.",
      href: "/bulk-domain-check/workspace#decision-record",
      done: hasSavedDecision,
    },
  ] as const

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
          Your decision path
        </p>
      </div>

      {/* On desktop, show steps horizontally */}
      <div className="px-6 py-2 lg:flex lg:divide-x lg:py-0" style={{ "--tw-divide-opacity": "1" } as React.CSSProperties}>
        {journeySteps.map((s, i) => {
          const Icon = s.icon
          const isLast = i === journeySteps.length - 1

          const content = (
            <div className="flex items-start gap-4 py-4 lg:flex-col lg:items-center lg:gap-3 lg:px-6 lg:py-5 lg:text-center lg:first:pl-0 lg:last:pr-0">
              {/* Icon */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full lg:h-11 lg:w-11"
                style={{
                  background: s.done
                    ? "rgba(212,175,55,0.15)"
                    : "rgba(255,255,255,0.07)",
                  border: s.done
                    ? "1px solid rgba(212,175,55,0.35)"
                    : "1px solid rgba(255,255,255,0.12)",
                  boxShadow: s.done ? "0 0 18px rgba(212,175,55,0.15)" : "none",
                }}
              >
                {s.done ? (
                  <Check className="h-4 w-4" style={{ color: "#D4AF37" }} />
                ) : (
                  <Icon
                    className="h-4 w-4"
                    style={{ color: "rgba(255,255,255,0.55)" }}
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
              <div className="flex-1 min-w-0 lg:flex-none">
                <div className="flex flex-wrap items-center gap-2 lg:justify-center">
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: s.done
                        ? "#D4AF37"
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
                </div>
                <p
                  className="mt-0.5 text-xs leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.32)" }}
                >
                  {s.description}
                </p>
              </div>
            </div>
          )

          const wrapper = (children: React.ReactNode) => {
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

function formatDecisionRecordDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Updated recently"
  return "Updated " + new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function DecisionRecordPanel({
  isPro,
  state,
  records,
  totalDecisionCount,
  totalReportCount,
}: {
  isPro: boolean
  state: DecisionRecordState
  records: DecisionRecordSummary[]
  totalDecisionCount: number
  totalReportCount: number
}) {
  const workspaceHref = "/bulk-domain-check/workspace#decision-record"

  return (
    <section
      aria-labelledby="decision-record-heading"
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(212,175,55,0.22)",
        boxShadow: "0 0 44px rgba(212,175,55,0.035) inset",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10">
            <FileText className="h-4 w-4" style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.72)" }}>Decision record</p>
            <h2 id="decision-record-heading" className="mt-1 text-lg font-bold text-white">Saved shortlists, reports and links</h2>
          </div>
        </div>
        {state === "ready" ? (
          <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] font-semibold text-white/45">
            {totalDecisionCount} {totalDecisionCount === 1 ? "decision" : "decisions"} · {totalReportCount} {totalReportCount === 1 ? "report" : "reports"}
          </span>
        ) : null}
      </div>

      {state === "loading" ? (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-white/42 sm:px-6">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#D4AF37" }} />
          Loading saved decision records...
        </div>
      ) : null}

      {state === "unavailable" ? (
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-6">
          <p className="max-w-2xl text-sm leading-6 text-white/48">Saved records could not be loaded right now. Your workspace remains the place to save, report and share a decision.</p>
          <Link href={workspaceHref} className="inline-flex min-h-11 items-center gap-2 border border-[#D4AF37]/45 px-4 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/10">
            Open workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {state === "ready" && records.length === 0 ? (
        <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-2xl text-sm leading-6 text-white/52">
            {isPro
              ? "Your first record begins with a Bulk Check. Save the shortlist when you are ready, then create an immutable report and a revocable view-only link."
              : "Run a Bulk Check now. Pro unlocks saved decisions, immutable reports and revocable view-only links when you are ready to keep the evidence."}
          </p>
          <Link href={isPro ? "/bulk-domain-check" : "/pricing?reason=saved-decision-workspace"} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-[#D4AF37] px-4 text-sm font-bold text-black transition hover:bg-[#F4D779]">
            {isPro ? "Start a decision" : "View Pro"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {state === "ready" && records.length > 0 ? (
        <div className="divide-y divide-white/[0.06]">
          {records.map((record) => (
            <Link key={record.id} href={workspaceHref} className="group flex min-h-20 flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.025] sm:px-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white group-hover:text-[#F4D779]">{record.title}</p>
                <p className="mt-1 truncate text-xs text-white/38">{record.projectName} · .{record.primaryTld} · {record.entryCount} {record.entryCount === 1 ? "candidate" : "candidates"}{record.winnerName ? " · Winner: " + record.winnerName : ""}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right">
                <span className="text-[11px] text-white/35">{record.reportCount} {record.reportCount === 1 ? "report" : "reports"}<br />{formatDecisionRecordDate(record.updatedAt)}</span>
                <ArrowRight className="h-4 w-4 text-[#D4AF37]/65 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

function DecisionWorkspaceCard({ isPro }: { isPro: boolean }) {
  return (
    <div
      className="min-w-0 overflow-hidden rounded-2xl p-6"
      style={{
        border: "1px solid rgba(212,175,55,0.22)",
        background: "rgba(255,255,255,0.025)",
        boxShadow: "0 0 60px rgba(212,175,55,0.04) inset",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "rgba(212,175,55,0.14)",
            border: "1px solid rgba(212,175,55,0.28)",
          }}
        >
          <ListChecks className="h-5 w-5" style={{ color: "#D4AF37" }} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-white">Decision workspace</p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
            Start with Bulk Check, choose a primary TLD, then use Founder Signal to compare the names that remain.
          </p>
        </div>
      </div>
      <Link
        href="/bulk-domain-check"
        className="mt-6 flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-bold text-black transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
          boxShadow: "0 4px 20px rgba(212,175,55,0.28)",
        }}
      >
        Open Bulk Check
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-4 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
        {isPro
          ? `${PUBLIC_PRODUCT_COPY.proPlanSummary} ${PUBLIC_PRODUCT_COPY.renewalNote}`
          : `Free includes ${PRODUCT_OFFER.freeUsageLabel}. Upgrade when you need more decision capacity, saved work, and exports.`}
      </p>
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    isPro: false,
    plan: "free",
    planName: PRODUCT_OFFER.freePlanName,
    canUseBrandPalette: false,
    subscriptionEnd: null,
    customerId: null,
  })
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [justUpgraded, setJustUpgraded] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [decisionWorkspace, setDecisionWorkspace] = useState<DecisionWorkspaceSummary | null>(null)
  const [decisionRecordState, setDecisionRecordState] = useState<DecisionRecordState>("loading")

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        // The proxy already admitted this request as authenticated. A browser
        // and server session can briefly disagree after a refresh, so do not
        // bounce through /sign-in and lose the intended dashboard destination.
        setSessionError("We could not verify this browser session. Refresh the page and try again.")
        setLoading(false)
        return
      }
      setUser(user)

      void fetch("/api/naming-workspace", { cache: "no-store", credentials: "same-origin" })
        .then(async (response) => {
          if (!response.ok) throw new Error("saved work unavailable")
          return response.json() as Promise<DecisionWorkspaceSummary>
        })
        .then((workspace) => {
          setDecisionWorkspace(workspace)
          setDecisionRecordState("ready")
        })
        .catch(() => {
          setDecisionRecordState("unavailable")
        })

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
            setSubscription({
              isPro: true,
              plan: "pro",
              planName: PRODUCT_OFFER.paidPlanName,
              canUseBrandPalette: true,
              subscriptionEnd: null,
              customerId: null,
            })
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
            plan: data.plan || "free",
            planName: data.planName || PRODUCT_OFFER.freePlanName,
            canUseBrandPalette: data.canUseBrandPalette || false,
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
  }, [supabase, searchParams])

  // Hooks must run in the same order while the dashboard moves from its
  // loading state to the signed-in workspace. Keep this derived summary above
  // every conditional return so an authenticated dashboard cannot trip the
  // route error boundary after its first data response.
  const decisionRecords = useMemo<DecisionRecordSummary[]>(() => {
    if (!decisionWorkspace) return []
    const projectsById = new Map(decisionWorkspace.projects.map((project) => [project.id, project]))
    return [...decisionWorkspace.shortlists]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 3)
      .map((shortlist) => {
        const entries = decisionWorkspace.entries.filter((entry) => entry.shortlistId === shortlist.id)
        return {
          id: shortlist.id,
          projectName: projectsById.get(shortlist.projectId)?.name || "Decision",
          title: shortlist.title,
          primaryTld: shortlist.primaryTld,
          entryCount: entries.length,
          reportCount: decisionWorkspace.reports.filter((report) => report.shortlistId === shortlist.id).length,
          winnerName: entries.find((entry) => entry.isWinner)?.candidateName || null,
          updatedAt: shortlist.updatedAt,
        }
      })
  }, [decisionWorkspace])

  if (loading || verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: "#050505" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#D4AF37" }} />
        {verifying && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Confirming your access...
          </p>
        )}
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="min-h-screen" style={{ background: "#050505" }}>
        <Navbar />
        <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 pt-24 text-center">
          <div className="w-full rounded-2xl border border-[#D4AF37]/20 bg-white/[0.035] p-7">
            <h1 className="text-xl font-semibold text-white">Session check needed</h1>
            <p className="mt-3 text-sm leading-6 text-white/55">{sessionError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 min-h-11 rounded-lg bg-[#D4AF37] px-5 text-sm font-semibold text-black transition hover:bg-[#F4D779]"
            >
              Refresh dashboard
            </button>
          </div>
        </main>
        <Footer />
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
                Decision Workspace
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1
                  className="text-4xl font-bold leading-tight text-white sm:text-5xl"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Choose your name,
                  <br />
                  <span style={{ color: "#D4AF37" }}>with evidence.</span>
                </h1>
                <p
                  className="mt-3 max-w-sm text-sm leading-relaxed lg:max-w-md"
                  style={{ color: "rgba(255,255,255,0.38)" }}
                >
                  Bring a shortlist, check six domain extensions, and compare the names worth pursuing.
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
                    Paid
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Access success banner */}
          {justUpgraded && (
            <div
              className="mb-8 flex items-center gap-3 rounded-2xl px-5 py-4"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)" }}
            >
              <CheckCircle className="h-5 w-5 shrink-0" style={{ color: "#D4AF37" }} />
              <p className="text-sm font-medium" style={{ color: "#D4AF37" }}>
                Payment confirmed - account access is active.
              </p>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              MAIN GRID
              Mobile:  single column, stacked
              Desktop: left (actions) | right (decision workspace)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] lg:items-start">

            {/* ── LEFT COLUMN — primary actions ── */}
            <div className="min-w-0 space-y-4">

              {/* Bulk Check — primary CTA */}
              <Link
                href="/bulk-domain-check"
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
                    <p className="text-base font-bold text-white">Check a Shortlist</p>
                    <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Up to 50 names · six extensions · optional Founder Signal™
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
                href="/founder-signal"
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
                    <p className="text-sm font-semibold text-white">Founder Signal</p>
                    <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Review the score dimensions, evidence, and decision bands
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
                        <span className="text-sm font-semibold text-white">Paid plan</span>
                        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                          120 Bulk Check and Founder Signal runs each month
                        </p>
                      </div>
                    </div>
                    <ListChecks className="h-4 w-4" style={{ color: "rgba(212,175,55,0.5)" }} strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} />
                        <span className="text-sm font-medium text-white">{PRODUCT_OFFER.freePlanName}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "rgba(212,175,55,0.75)" }}>
                        Active
                      </span>
                    </div>
                    <Link
                      href={PRODUCT_OFFER.pricingHref}
                      className="group flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition-all hover:-translate-y-0.5"
                      style={{
                        background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                        boxShadow: "0 4px 20px rgba(212,175,55,0.28)",
                      }}
                    >
                      Upgrade to paid
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.32)" }}>
                      {PRODUCT_OFFER.freeUsageLabel}. Start a shortlist now and upgrade when you need more decision capacity.
                    </p>
                    <div className="rounded-xl px-4 py-3" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}>
                      <p className="text-sm font-semibold text-white">{PRODUCT_OFFER.paidPrice}/month paid plan</p>
                      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Upgrade for 120 Bulk Check runs and 120 Founder Signal runs each UTC calendar month.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
            {/* END left column */}

            {/* ── RIGHT COLUMN — decision workspace ── */}
            <div id="workspace" className="min-w-0 lg:sticky lg:top-28">
              <DecisionWorkspaceCard isPro={isPro} />
            </div>

          </div>
          {/* END main grid */}

          {/* ═══════════════════════════════════════════════════════════════════
              FULL-WIDTH SECTIONS (below the grid on all breakpoints)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="mt-6 space-y-6">
            <DecisionJourney hasSavedDecision={decisionRecords.length > 0} />
            <DecisionRecordPanel
              isPro={isPro}
              state={decisionRecordState}
              records={decisionRecords}
              totalDecisionCount={decisionWorkspace?.shortlists.length || 0}
              totalReportCount={decisionWorkspace?.reports.length || 0}
            />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
