"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Check, X, Search, TrendingUp, Star, ArrowRight, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const domainResults = [
  { name: "luminova.com", available: true, score: 92, label: "Elite" },
  { name: "velvetcraft.io", available: true, score: 84, label: "Strong" },
  { name: "darkforge.com", available: false, score: 52, label: "Risky" },
  { name: "eclipsebrand.co", available: true, score: 71, label: "Viable" },
  { name: "obsidianlab.com", available: true, score: 78, label: "Strong" },
]

const searchPhrases = [
  "luxury web agency",
  "fintech startup",
  "fitness app",
  "AI SaaS tool",
  "creative studio",
]

const avatarSeeds = [
  { initials: "AK", bg: "#1a1a1a" },
  { initials: "MJ", bg: "#1e1a14" },
  { initials: "SR", bg: "#141a1a" },
  { initials: "TW", bg: "#1a141e" },
  { initials: "OP", bg: "#1a1e14" },
]

function getSignalColor(label: string): string {
  switch (label) {
    case "Elite":
    case "Strong":
      return "text-emerald-400"
    case "Viable":
      return "text-amber-400"
    case "Risky":
      return "text-orange-400"
    default:
      return "text-muted-foreground"
  }
}

function useCountUp(target: number, duration: number = 1000, delay: number = 0, start: boolean = true) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number>()

  useEffect(() => {
    if (!start) return
    const startTime = performance.now() + delay
    const animate = (currentTime: number) => {
      if (currentTime < startTime) {
        frameRef.current = requestAnimationFrame(animate)
        return
      }
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(easeOut * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, duration, delay, start])

  return count
}

function AnimatedScore({ score, label, delay }: { score: number; label: string; delay: number }) {
  const count = useCountUp(score, 1000, delay, true)
  return (
    <span className={`flex items-center gap-1 text-xs font-bold tabular-nums ${getSignalColor(label)}`}>
      <TrendingUp className="h-3 w-3" />
      {count}
    </span>
  )
}

function TypewriterSearch() {
  const [displayText, setDisplayText] = useState("")
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const phrase = searchPhrases[phraseIndex]
    const typingSpeed = isDeleting ? 40 : 80
    const pauseAtEnd = 2000
    const pauseAtStart = 400

    const timeout = setTimeout(() => {
      if (!isDeleting && displayText === phrase) {
        setTimeout(() => setIsDeleting(true), pauseAtEnd)
        return
      }
      if (isDeleting && displayText === "") {
        setIsDeleting(false)
        setPhraseIndex((i) => (i + 1) % searchPhrases.length)
        setTimeout(() => {}, pauseAtStart)
        return
      }
      setDisplayText(isDeleting
        ? phrase.slice(0, displayText.length - 1)
        : phrase.slice(0, displayText.length + 1)
      )
    }, typingSpeed)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, phraseIndex])

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/40 px-4 py-2.5">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-sm text-foreground/80 min-w-0">
        {displayText}
        <span className="animate-cursor-blink ml-0.5 inline-block w-px h-3.5 bg-[#D4A843] align-middle" />
      </span>
    </div>
  )
}

export function Hero() {
  return (
    <section
      className="relative min-h-[100svh] overflow-clip pb-8 pt-24 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-40"
      aria-labelledby="hero-heading"
    >
      {/* Base gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, hsl(0 0% 4%) 0%, hsl(0 0% 8%) 50%, hsl(0 0% 6%) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Dot grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(212,168,67,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 70%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 bg-black/30 sm:bg-transparent" aria-hidden="true" />

      {/* Aura glows */}
      <div className="pointer-events-none absolute inset-0 hidden overflow-clip sm:block" aria-hidden="true">
        <div className="animate-luxury-aura absolute left-[15%] top-[20%] h-[50vh] w-[50vh] max-h-[500px] max-w-[500px] rounded-full bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent blur-[150px]" />
        <div
          className="animate-luxury-aura absolute bottom-[20%] right-[10%] h-[40vh] w-[40vh] max-h-[400px] max-w-[400px] rounded-full bg-gradient-to-bl from-secondary/15 via-primary/10 to-transparent blur-[120px]"
          style={{ animationDelay: "-10s", animationDuration: "25s" }}
        />
      </div>

      {/* Subtle gold radial glow behind headline */}
      <div
        className="pointer-events-none absolute left-[10%] top-[25%] hidden h-[600px] w-[600px] rounded-full lg:block"
        style={{ background: "radial-gradient(circle, rgba(212, 168, 67, 0.03) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-[1280px] px-6 md:px-12 lg:px-20">
        <div className="grid min-h-[calc(100vh-10rem)] items-center gap-8 sm:gap-12 lg:grid-cols-[55%_45%] lg:gap-16">

          {/* Left Column */}
          <div className="flex flex-col items-start text-left">

            {/* Headline — h1 for SEO */}
            <h1
              id="hero-heading"
              className="animate-hero-fade-up hero-delay-1 font-bold tracking-tight text-foreground text-[1.9rem] leading-[1.1] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
            >
              <span className="block">
                Find an{" "}
                <span
                  className="text-[#D4A843] animate-shimmer-once"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #D4A843 0%, #f0ca6e 40%, #D4A843 60%, #b8902a 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundSize: "200% 100%",
                  }}
                >
                  available domain
                </span>
              </span>
              <span className="mt-1 block sm:mt-2">worth building a company on.</span>
            </h1>

            {/* Subtext */}
            <p className="animate-hero-fade-up hero-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-[#a0a0a0] md:text-xl">
              Generate brandable domain names with AI, check availability in real time, and score every name with{" "}
              <span className="font-semibold text-white">Founder Signal™</span> — so you know it&apos;s worth building on, not just available.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex w-full flex-col sm:w-auto">
              <Button
                asChild
                size="lg"
                className="animate-hero-fade-up hero-delay-2 group h-14 w-full bg-[#D4A843] px-8 text-lg font-semibold text-black transition-all duration-200 hover:bg-[#e0b84d] hover:scale-[1.02] sm:w-auto"
              >
                <Link href="/generate">
                  <span className="flex items-center justify-center gap-2">
                    Generate names free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </Button>

              <Link
                href="#pricing"
                className="animate-hero-fade-up hero-delay-3 mt-3 text-center text-sm font-medium text-[#a0a0a0] underline-offset-4 transition-colors hover:text-white hover:underline sm:text-left"
              >
                See what Pro includes →
              </Link>
            </div>

            {/* Social Proof — avatar stack + stats */}
            <div className="animate-hero-fade-up hero-delay-4 mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#D4A843]" aria-hidden="true" />
                <span className="text-sm text-[#666666]">
                  <span className="font-semibold text-white">10,000+</span> names generated
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {/* Stacked avatar circles */}
                <div className="flex -space-x-2">
                  {avatarSeeds.map((a) => (
                    <div
                      key={a.initials}
                      className="h-6 w-6 rounded-full border border-[#D4A843]/30 flex items-center justify-center text-[8px] font-bold text-[#D4A843]"
                      style={{ background: a.bg }}
                      aria-hidden="true"
                    >
                      {a.initials}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-[#666666]">
                  Trusted by <span className="font-semibold text-white">founders & agencies</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Column - Domain Results Card */}
          <div className="relative hidden lg:block">
            <div
              className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent blur-[80px]"
              aria-hidden="true"
            />

            <div
              className="animate-hero-fade-up hero-delay-card group relative overflow-hidden rounded-2xl border border-border/30 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur-lg transition-transform duration-500 hover:scale-[1.01]"
              style={{ animationDuration: "0.6s" }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 pointer-events-none" />

              {/* Card Header */}
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
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-soft-blink" />
                    Live
                  </div>
                </div>
              </div>

              {/* Typewriter Search Input */}
              <div className="relative border-b border-border/20 px-6 py-4">
                <TypewriterSearch />
              </div>

              {/* Domain Results */}
              <div className="relative space-y-1.5 p-4">
                {domainResults.map((result, index) => {
                  const rowDelay = 600 + (index * 150)
                  const scoreDelay = rowDelay + 300
                  const badgeDelay = scoreDelay + 1000

                  return (
                    <div
                      key={result.name}
                      className={`animate-hero-fade-up flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
                        result.available ? "bg-muted/20" : "bg-muted/10 opacity-50"
                      }`}
                      style={{ animationDelay: `${rowDelay}ms` }}
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{result.name}</span>
                        <div className="flex items-center gap-2">
                          <AnimatedScore score={result.score} label={result.label} delay={scoreDelay} />
                          <span className="text-xs text-muted-foreground/60">|</span>
                          <span className={`text-xs font-medium ${getSignalColor(result.label)}`}>{result.label}</span>
                        </div>
                      </div>
                      <span
                        className={`animate-badge-pop flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          result.available ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400/80"
                        }`}
                        style={{ animationDelay: `${badgeDelay}ms` }}
                      >
                        {result.available ? (
                          <><Check className="h-3 w-3" /> Available</>
                        ) : (
                          <><X className="h-3 w-3" /> Taken</>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Card Footer */}
              <div className="relative border-t border-border/20 bg-muted/10 px-6 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#888888]">
                    <Star className="mr-1 inline-block h-3 w-3 text-[#D4A843]" />
                    Founder Signal™ scores included
                  </span>
                  <Link
                    href="/generate"
                    className="text-xs font-medium text-[#D4A843] transition-colors hover:underline"
                  >
                    Try it free →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile card */}
        <div className="relative mt-10 lg:hidden">
          <div className="absolute -top-5 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          <div className="overflow-hidden rounded-xl border border-border/20 bg-card/60 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-border/20 bg-muted/10 px-4 py-3">
              <span className="text-sm font-medium text-foreground/80">Sample Results</span>
              <span className="text-xs text-muted-foreground/70">Swipe</span>
            </div>
            <div className="scrollbar-hide -mx-0.5 flex gap-3 overflow-x-auto p-3 px-0.5">
              {domainResults.slice(0, 3).map((result) => (
                <div
                  key={result.name}
                  className={
                    result.available
                      ? "w-[170px] flex-shrink-0 rounded-lg border border-border/10 bg-muted/20 p-3"
                      : "w-[170px] flex-shrink-0 rounded-lg border border-border/10 bg-muted/10 p-3 opacity-50"
                  }
                >
                  <div className="truncate text-sm font-semibold text-foreground">{result.name}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`text-xs font-bold tabular-nums ${getSignalColor(result.label)}`}>{result.score}</span>
                    <span className={result.available ? "text-xs text-emerald-400" : "text-xs text-red-400/80"}>
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
