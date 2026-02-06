"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Check, X, Sparkles, Search, BarChart3, TrendingUp, Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Domain preview data for the visual with Founder Signal scores
const domainResults = [
  { name: "luminova.com", available: true, score: 92, label: "Elite" },
  { name: "velvetcraft.io", available: true, score: 84, label: "Strong" },
  { name: "darkforge.com", available: false, score: 52, label: "Risky" },
  { name: "eclipsebrand.co", available: true, score: 71, label: "Viable" },
  { name: "obsidianlab.com", available: true, score: 78, label: "Strong" },
]

// Get color class for Founder Signal label
function getSignalColor(label: string): string {
  switch (label) {
    case "Elite":
      return "text-emerald-400"
    case "Strong":
      return "text-emerald-400"
    case "Viable":
      return "text-amber-400"
    case "Risky":
      return "text-orange-400"
    case "Avoid":
      return "text-red-400"
    default:
      return "text-muted-foreground"
  }
}

// Animated counter hook for score animation
function useScoreCounter(end: number, duration: number = 1500, delay: number = 0) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const delayTimer = setTimeout(() => setHasStarted(true), delay)
    return () => clearTimeout(delayTimer)
  }, [delay])

  useEffect(() => {
    if (!hasStarted) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [hasStarted, end, duration])

  return count
}

export function Hero() {
  const [showResults, setShowResults] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [showShimmer, setShowShimmer] = useState(false)
  const [ctaPulse, setCtaPulse] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  // Score counters for each domain result
  const score1 = useScoreCounter(domainResults[0].score, 1500, 800)
  const score2 = useScoreCounter(domainResults[1].score, 1500, 900)
  const score3 = useScoreCounter(domainResults[2].score, 1500, 1000)
  const score4 = useScoreCounter(domainResults[3].score, 1500, 1100)
  const score5 = useScoreCounter(domainResults[4].score, 1500, 1200)
  const animatedScores = [score1, score2, score3, score4, score5]

  // Handle cursor-influenced gradient
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
  }, [])

  useEffect(() => {
    // Trigger load animations
    const loadTimer = setTimeout(() => setIsLoaded(true), 100)
    const resultsTimer = setTimeout(() => setShowResults(true), 600)
    const shimmerTimer = setTimeout(() => setShowShimmer(true), 800)

    // CTA pulse every 8 seconds
    const pulseInterval = setInterval(() => {
      setCtaPulse(true)
      setTimeout(() => setCtaPulse(false), 1000)
    }, 8000)

    return () => {
      clearTimeout(loadTimer)
      clearTimeout(resultsTimer)
      clearTimeout(shimmerTimer)
      clearInterval(pulseInterval)
    }
  }, [])

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[100svh] overflow-clip pt-24 pb-8 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-28"
      aria-labelledby="hero-heading"
    >
      {/* Premium dark gradient background with cursor influence */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700 ease-out"
        style={{
          background: `radial-gradient(ellipse 80% 60% at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(183, 135, 38, 0.08) 0%, transparent 50%),
                       linear-gradient(to bottom, hsl(0 0% 4%) 0%, hsl(0 0% 8%) 50%, hsl(0 0% 6%) 100%)`
        }}
        aria-hidden="true"
      />

      {/* Dark overlay for better text contrast on mobile */}
      <div
        className="pointer-events-none absolute inset-0 bg-black/30 sm:bg-transparent"
        aria-hidden="true"
      />

      {/* Subtle gold grain/noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Refined aurora effects - Hidden on mobile for cleaner look */}
      <div className="pointer-events-none absolute inset-0 overflow-clip hidden sm:block" aria-hidden="true">
        <div
          className="animate-luxury-aura absolute top-[20%] left-[15%] h-[50vh] w-[50vh] max-h-[500px] max-w-[500px] rounded-full bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent blur-[150px]"
          style={{ animationDuration: "20s" }}
        />
        <div
          className="animate-luxury-aura absolute bottom-[20%] right-[10%] h-[40vh] w-[40vh] max-h-[400px] max-w-[400px] rounded-full bg-gradient-to-bl from-secondary/15 via-primary/10 to-transparent blur-[120px]"
          style={{ animationDelay: "-10s", animationDuration: "25s" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left Column - Messaging + CTA */}
          <div className="flex flex-col items-start text-left">
            {/* Headline with fade-up animation - Responsive typography */}
            <h1 className="sr-only">NamoLux</h1>

            <h2
              id="hero-heading"
              className={cn(
                "font-bold tracking-tight text-foreground transition-all duration-1000",
                "text-[1.75rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-6xl",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
            >
              {/* Line 1: "Find an available domain" */}
              <span className="block">
                Find an{" "}
                <span className={cn(
                  "bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent bg-[length:200%_100%]",
                  showShimmer && "animate-shimmer-once"
                )}>
                  available domain
                </span>
              </span>
              {/* Line 2: "worth building a company on." */}
              <span className="mt-1 block sm:mt-2">
                worth building a company on.
              </span>
            </h2>

            {/* Subheadline explaining Founder Signal - Better mobile readability */}
            <p
              className={cn(
                "mt-5 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground/90 transition-all duration-1000 delay-200",
                "sm:mt-8 sm:max-w-xl sm:text-lg lg:text-xl sm:text-muted-foreground",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
            >
              Generate brand-ready domain ideas, check availability instantly, and score each name with{" "}
              <span className="font-semibold text-foreground">Founder Signal™</span> — a 0–100 measure of brand strength, risk, and scalability.
            </p>

            {/* CTAs with microcopy */}
            <div
              className={cn(
                "mt-7 flex w-full flex-col gap-3 transition-all duration-1000 delay-300 sm:mt-10 sm:w-auto sm:gap-4",
                isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
            >
              {/* Primary CTA - Premium mobile styling */}
              <Button
                asChild
                size="lg"
                className={cn(
                  "group relative h-[50px] w-full overflow-hidden rounded-xl px-6 text-[0.9375rem] font-semibold transition-all duration-300",
                  "sm:h-14 sm:w-auto sm:rounded-lg sm:px-10 sm:text-base",
                  "shadow-lg shadow-primary/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30",
                  ctaPulse && "animate-cta-pulse"
                )}
              >
                <Link href="/generate">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Generate names free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                  {/* Shine sweep effect */}
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
              </Button>

              {/* Secondary CTA - Text link on mobile */}
              <Link
                href="/founder-signal"
                className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:hidden"
              >
                <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
                See how Founder Signal™ works
              </Link>

              {/* Secondary CTA - Button on desktop */}
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="group hidden h-14 w-auto px-6 text-base text-muted-foreground transition-all duration-300 hover:text-foreground sm:inline-flex"
              >
                <Link href="/founder-signal">
                  <BarChart3 className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
                  See how Founder Signal™ works
                </Link>
              </Button>

              {/* Microcopy */}
              <p className="text-center text-xs text-muted-foreground/60 sm:text-left sm:text-sm sm:text-muted-foreground/70">
                No signup • Instant results • 100% free
              </p>
            </div>
          </div>

          {/* Right Column - Interactive Domain Results with subtle parallax */}
          <div
            className={cn(
              "relative hidden lg:block transition-all duration-1000 delay-500",
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            {/* Subtle glow behind card */}
            <div
              className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent blur-[80px]"
              aria-hidden="true"
            />

            {/* Results card with refined border */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur-lg transition-transform duration-500 hover:scale-[1.01]">
              {/* Subtle gradient border overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 pointer-events-none" />

              {/* Header with soft-blinking Live badge */}
              <div className="relative border-b border-border/30 bg-gradient-to-r from-muted/30 to-transparent px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                    </div>
                    <span className="text-sm font-medium text-foreground/80">Domain Results</span>
                  </div>
                  {/* Soft-blinking Live badge */}
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 animate-soft-blink">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </div>
                </div>
              </div>

              {/* Search input mock */}
              <div className="relative border-b border-border/20 px-6 py-4">
                <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/40 px-4 py-2.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground/80">luxury web agency</span>
                  <span className="h-4 w-0.5 animate-pulse bg-primary/60" />
                </div>
              </div>

              {/* Results list with animated scores */}
              <div className="relative p-4 space-y-1.5">
                {domainResults.map((result, index) => (
                  <div
                    key={result.name}
                    className={cn(
                      "group/item flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all duration-300",
                      result.available
                        ? "bg-muted/20 hover:bg-muted/30"
                        : "bg-muted/10 opacity-50",
                      "opacity-0",
                      showResults && "animate-fade-up",
                    )}
                    style={{
                      animationDelay: `${0.3 + index * 0.08}s`,
                      animationFillMode: "forwards",
                    }}
                  >
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <span className="text-sm font-semibold text-foreground">{result.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "flex items-center gap-1 text-xs font-bold tabular-nums",
                          getSignalColor(result.label)
                        )}>
                          <TrendingUp className="h-3 w-3" />
                          {animatedScores[index]}
                        </span>
                        <span className="text-xs text-muted-foreground/60">•</span>
                        <span className={cn("text-xs font-medium", getSignalColor(result.label))}>
                          {result.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0",
                        result.available
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/10 text-red-400/80",
                      )}
                    >
                      {result.available ? (
                        <>
                          <Check className="h-3 w-3" /> Available
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3" /> Taken
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="relative border-t border-border/20 bg-muted/10 px-6 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    <Star className="mr-1 inline-block h-3 w-3 text-primary/80" />
                    Founder Signal™ scores included
                  </span>
                  <Link href="/generate" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                    Try it free →
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile swipeable card placeholder - shown only on mobile */}
          </div>

        </div>

        {/* Mobile Results Card - Only shown on mobile, with clear separation */}
        <div className="relative mt-10 lg:hidden">
          {/* Fade divider */}
          <div className="absolute -top-5 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

          <div
            className={cn(
              "overflow-hidden rounded-xl border border-border/20 bg-card/60 shadow-lg backdrop-blur-sm transition-all duration-1000 delay-700",
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="border-b border-border/20 bg-muted/10 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/80">Sample Results</span>
              <span className="text-[10px] text-muted-foreground/70">Swipe →</span>
            </div>
            <div className="p-3 flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-0.5 px-0.5">
              {domainResults.slice(0, 3).map((result, index) => (
                <div
                  key={result.name}
                  className={cn(
                    "flex-shrink-0 w-[160px] snap-start rounded-lg p-3 border border-border/10",
                    result.available ? "bg-muted/20" : "bg-muted/10 opacity-50"
                  )}
                >
                  <div className="text-[13px] font-semibold text-foreground truncate">{result.name}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={cn("text-xs font-bold tabular-nums", getSignalColor(result.label))}>
                      {animatedScores[index]}
                    </span>
                    <span className={cn("text-[11px]", result.available ? "text-emerald-400" : "text-red-400/80")}>
                      {result.available ? "Available" : "Taken"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
