"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Check, X, TrendingUp, ArrowRight, Zap, ShieldCheck, Star } from "lucide-react"

const domainResults = [
  { name: "luminova", tld: ".com", available: true, score: 92, label: "Elite", top: true },
  { name: "velvetcraft", tld: ".io", available: true, score: 84, label: "Strong", top: false },
  { name: "darkforge", tld: ".com", available: false, score: 52, label: "Risky", top: false },
  { name: "eclipsebrand", tld: ".co", available: true, score: 71, label: "Good", top: false },
  { name: "obsidianlab", tld: ".com", available: true, score: 78, label: "Strong", top: false },
]

const searchPhrases = ["luxury web agency", "fintech startup", "fitness app", "AI SaaS tool", "creative studio"]
const avatarSeeds = [
  { initials: "AK", bg: "#1a1a1a" }, { initials: "MJ", bg: "#1e1a14" },
  { initials: "SR", bg: "#141a1a" }, { initials: "TW", bg: "#1a141e" }, { initials: "OP", bg: "#1a1e14" },
]

function getScoreColor(label: string): string {
  if (label === "Elite") return "#D4AF37"
  if (label === "Strong") return "#34d399"
  if (label === "Good") return "#60a5fa"
  return "#f87171"
}

function useCountUp(target: number, duration = 900, delay = 0) {
  const [count, setCount] = useState(0)
  const frame = useRef<number>()
  useEffect(() => {
    const startTime = performance.now() + delay
    const animate = (now: number) => {
      if (now < startTime) { frame.current = requestAnimationFrame(animate); return }
      const p = Math.min((now - startTime) / duration, 1)
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) frame.current = requestAnimationFrame(animate)
    }
    frame.current = requestAnimationFrame(animate)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [target, duration, delay])
  return count
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const [w, setW] = useState(0)
  const color = getScoreColor(label)
  useEffect(() => { const t = setTimeout(() => setW(score), 80); return () => clearTimeout(t) }, [score])
  return (
    <div className="h-1 w-14 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
      <div className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${w}%`, background: color, boxShadow: `0 0 6px ${color}50` }} />
    </div>
  )
}

function AnimatedScore({ score, delay }: { score: number; delay: number }) {
  const count = useCountUp(score, 900, delay)
  return <span className="tabular-nums font-black">{count}</span>
}

function TypewriterSearch() {
  const [text, setText] = useState("")
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const phrase = searchPhrases[phraseIdx]
    let id: ReturnType<typeof setTimeout>
    if (!deleting && text === phrase) { id = setTimeout(() => setDeleting(true), 2000) }
    else if (deleting && text === "") { setDeleting(false); setPhraseIdx(i => (i + 1) % searchPhrases.length) }
    else { id = setTimeout(() => setText(deleting ? phrase.slice(0, text.length - 1) : phrase.slice(0, text.length + 1)), deleting ? 40 : 75) }
    return () => clearTimeout(id)
  }, [text, deleting, phraseIdx])
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="h-4 w-4 shrink-0 rounded-full flex items-center justify-center" style={{ background: "rgba(212,175,55,0.2)" }}>
        <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#D4AF37" }} />
      </div>
      <span className="text-sm text-white/70 min-w-0">
        {text}<span className="animate-cursor-blink ml-0.5 inline-block w-px h-3.5 bg-[#D4AF37] align-middle" />
      </span>
    </div>
  )
}

export function Hero() {
  const cardScrollRef = useRef<HTMLDivElement>(null)
  const [activeCard, setActiveCard] = useState(0)
  const handleCardScroll = () => {
    if (!cardScrollRef.current) return
    setActiveCard(Math.min(Math.round(cardScrollRef.current.scrollLeft / 165), 2))
  }

  return (
    <section className="relative min-h-[100svh] overflow-hidden pb-8 pt-24 sm:pb-20 sm:pt-32 lg:pb-28 lg:pt-40"
      aria-labelledby="hero-heading">

      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true"
        style={{ background: "linear-gradient(160deg, #060606 0%, #080808 50%, #050505 100%)" }} />

      {/* Dot grid */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden="true"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(212,175,55,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 75%, transparent 100%)",
        }} />

      {/* Gold aura left */}
      <div className="pointer-events-none absolute hidden lg:block" aria-hidden="true"
        style={{
          top: "10%", left: "-5%", width: "55vw", height: "55vw", maxWidth: 760, maxHeight: 760,
          background: "radial-gradient(ellipse at center, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.02) 45%, transparent 70%)",
          filter: "blur(40px)",
        }} />

      {/* Gold aura right */}
      <div className="pointer-events-none absolute hidden lg:block" aria-hidden="true"
        style={{
          top: "20%", right: "0%", width: "40vw", height: "60vw", maxWidth: 640, maxHeight: 820,
          background: "radial-gradient(ellipse at center, rgba(212,175,55,0.09) 0%, rgba(212,175,55,0.02) 50%, transparent 72%)",
          filter: "blur(60px)",
        }} />

      <div className="relative mx-auto max-w-[1280px] px-5 md:px-12 lg:px-20">
        <div className="grid items-center gap-10 sm:gap-14 sm:min-h-[calc(100vh-10rem)] lg:grid-cols-[54%_46%] lg:gap-16">

          {/* LEFT */}
          <div className="flex flex-col items-start text-left">

            {/* Intro pill */}
            <div className="animate-hero-fade-up hero-delay-1 mb-5 inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest sm:px-4 sm:text-[11px]"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37" }}>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4AF37] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
              </span>
              Founder Signal™ Powered · AI Naming
            </div>

            {/* Headline */}
            <h1 id="hero-heading"
              className="animate-hero-fade-up hero-delay-1 w-full font-black tracking-tight text-white"
              style={{ fontSize: "clamp(1.75rem, 6vw, 4.5rem)", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
              <span className="block">Find a domain</span>
              <span style={{
                backgroundImage: "linear-gradient(135deg, #D4AF37 0%, #F6E27A 40%, #E8C84A 60%, #B8922E 100%)",
                backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>worth building</span>
              <span className="text-white/90"> a company on.</span>
            </h1>

            {/* Sub */}
            <p className="animate-hero-fade-up hero-delay-2 mt-5 max-w-lg text-sm leading-relaxed text-white/50 sm:text-base">
              AI-generated brandable names, live availability checking, and every result scored with{" "}
              <span className="font-semibold text-white/80">Founder Signal™</span> — so you know it&apos;s worth building on, not just available.
            </p>

            {/* CTA */}
            <div className="animate-hero-fade-up hero-delay-2 mt-8 flex w-full flex-col gap-3 sm:w-auto">
              <Link href="/generate"
                className="group flex w-full items-center justify-center gap-2.5 rounded-xl px-8 py-4 text-base font-bold text-black transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #F6E27A 50%, #D4AF37 100%)",
                  boxShadow: "0 6px 30px rgba(212,175,55,0.4), 0 1px 0 rgba(255,255,255,0.15) inset",
                }}>
                Generate names free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/30">
                {["No account required", "1 free generation/day", "Instant results"].map(t => (
                  <span key={t} className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-500/70" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Social proof marquee */}
            <div className="animate-hero-fade-up hero-delay-4 mt-10 relative w-full overflow-hidden">
              {/* Left fade */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-14 z-10"
                style={{ background: "linear-gradient(to right, #060606 0%, transparent 100%)" }} />
              {/* Right fade */}
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 z-10"
                style={{ background: "linear-gradient(to left, #060606 0%, transparent 100%)" }} />

              {/* Track — items duplicated for seamless loop */}
              <div className="flex w-max animate-marquee hover:[animation-play-state:paused] [&:active]:[animation-play-state:paused] gap-3 py-1">
                {[
                  {
                    icon: <Zap className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />,
                    num: "10,000+", sub: "Names generated",
                  },
                  {
                    icon: (
                      <div className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                        {avatarSeeds.slice(0, 3).map(a => (
                          <div key={a.initials} className="h-5 w-5 rounded-full flex items-center justify-center text-[7px] font-bold"
                            style={{ background: a.bg, border: "1.5px solid rgba(212,175,55,0.3)", color: "#D4AF37" }}>
                            {a.initials}
                          </div>
                        ))}
                      </div>
                    ),
                    num: "Founders", sub: "& agencies",
                  },
                  {
                    icon: <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400/70" />,
                    num: "One-time", sub: "No subscription",
                  },
                  {
                    icon: <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />,
                    num: "Instant", sub: "Results",
                  },
                  {
                    icon: <Zap className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />,
                    num: ".com .io .ai", sub: "Checked live",
                  },
                  {
                    icon: <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]/70" />,
                    num: "No account", sub: "Required",
                  },
                  // Duplicated for seamless loop
                  {
                    icon: <Zap className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />,
                    num: "10,000+", sub: "Names generated",
                  },
                  {
                    icon: (
                      <div className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                        {avatarSeeds.slice(0, 3).map(a => (
                          <div key={a.initials + "2"} className="h-5 w-5 rounded-full flex items-center justify-center text-[7px] font-bold"
                            style={{ background: a.bg, border: "1.5px solid rgba(212,175,55,0.3)", color: "#D4AF37" }}>
                            {a.initials}
                          </div>
                        ))}
                      </div>
                    ),
                    num: "Founders", sub: "& agencies",
                  },
                  {
                    icon: <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400/70" />,
                    num: "One-time", sub: "No subscription",
                  },
                  {
                    icon: <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />,
                    num: "Instant", sub: "Results",
                  },
                  {
                    icon: <Zap className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />,
                    num: ".com .io .ai", sub: "Checked live",
                  },
                  {
                    icon: <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]/70" />,
                    num: "No account", sub: "Required",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-full px-3.5 py-2 shrink-0"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {item.icon}
                    <span className="text-xs font-bold text-white">{item.num}</span>
                    <span className="text-[10px] text-white/30 uppercase tracking-wide">{item.sub}</span>
                    {/* separator dot */}
                    <span className="ml-1 h-1 w-1 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — results card */}
          <div className="relative hidden lg:block">

            {/* Floating FS badge */}
            <div className="animate-hero-fade-up hero-delay-card absolute -top-5 -right-4 z-10 flex items-center gap-1.5 rounded-xl px-3 py-2"
              style={{ background: "rgba(8,8,8,0.95)", border: "1px solid rgba(212,175,55,0.35)", boxShadow: "0 0 20px rgba(212,175,55,0.15)" }}>
              <Star className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span className="text-xs font-bold text-[#D4AF37]">Founder Signal™</span>
            </div>


            {/* Card glow */}
            <div className="absolute -inset-6 -z-10 rounded-3xl" aria-hidden="true"
              style={{ background: "radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 70%)", filter: "blur(20px)" }} />

            {/* Card */}
            <div className="animate-hero-fade-up hero-delay-card relative overflow-hidden rounded-2xl transition-transform duration-500 hover:scale-[1.01]"
              style={{
                background: "rgba(10,10,10,0.95)",
                border: "1px solid rgba(212,175,55,0.2)",
                boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
                backdropFilter: "blur(20px)",
              }}>

              {/* Gold top line */}
              <div className="absolute top-0 left-0 right-0 h-px" aria-hidden="true"
                style={{ background: "linear-gradient(to right, transparent 10%, rgba(212,175,55,0.6) 50%, transparent 90%)" }} />

              {/* Header */}
              <div className="relative flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(239,68,68,0.6)" }} />
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(234,179,8,0.6)" }} />
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(34,197,94,0.6)" }} />
                  </div>
                  <span className="text-sm font-semibold text-white/70">Domain Results</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-emerald-400"
                  style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-soft-blink" />
                  Live
                </div>
              </div>

              {/* Typewriter */}
              <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <TypewriterSearch />
              </div>

              {/* Results */}
              <div className="p-3 space-y-1.5">
                {domainResults.map((result, i) => {
                  const rowDelay = 500 + i * 130
                  const sc = getScoreColor(result.label)
                  return (
                    <div key={result.name}
                      className={`animate-hero-fade-up relative overflow-hidden rounded-xl px-4 py-3.5 transition-all duration-200 ${!result.available ? "opacity-45" : ""}`}
                      style={{
                        animationDelay: `${rowDelay}ms`,
                        background: result.top ? "rgba(212,175,55,0.06)" : result.available ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
                        border: result.top ? "1px solid rgba(212,175,55,0.25)" : "1px solid rgba(255,255,255,0.04)",
                      }}>
                      {result.top && (
                        <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-4 py-1"
                          style={{ background: "rgba(212,175,55,0.12)", borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
                          <span className="text-[10px]">⭐</span>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-[#D4AF37]">Founder Favourite</span>
                        </div>
                      )}
                      <div className={`flex items-center justify-between gap-3 ${result.top ? "mt-5" : ""}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-sm font-bold text-white">{result.name}</span>
                            <span className="text-xs font-medium text-white/35">{result.tld}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2.5">
                            <TrendingUp className="h-3 w-3 shrink-0" style={{ color: sc }} />
                            <span className="text-xs" style={{ color: sc }}>
                              <AnimatedScore score={result.score} delay={rowDelay + 300} />
                            </span>
                            <ScoreBar score={result.score} label={result.label} />
                            <span className="text-[10px] font-semibold" style={{ color: `${sc}99` }}>{result.label}</span>
                          </div>
                        </div>
                        <div className="animate-badge-pop flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{
                            animationDelay: `${rowDelay + 500}ms`,
                            background: result.available ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.08)",
                            border: result.available ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(239,68,68,0.15)",
                            color: result.available ? "#34d399" : "#f87171",
                          }}>
                          {result.available ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {result.available ? "Available" : "Taken"}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)" }}>
                      <Star className="h-2.5 w-2.5 text-[#D4AF37]" />
                    </div>
                    <span className="text-[11px] text-white/30">Scored by Founder Signal™</span>
                  </div>
                  <div className="h-3 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-soft-blink" />
                    <span className="text-[11px] font-semibold text-emerald-400">Live availability</span>
                  </div>
                </div>
                <Link href="/generate" className="text-xs font-semibold transition-opacity hover:opacity-70" style={{ color: "#D4AF37" }}>
                  Try free →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE CARD */}
        <div className="mt-10 lg:hidden">
          <div className="overflow-hidden rounded-2xl"
            style={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span className="text-sm font-semibold text-white/70">Sample Results</span>
              </div>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: i === activeCard ? 12 : 6, background: i === activeCard ? "#D4AF37" : "rgba(255,255,255,0.2)" }} />
                ))}
              </div>
            </div>
            <div ref={cardScrollRef} onScroll={handleCardScroll}
              className="scrollbar-hide flex gap-2.5 overflow-x-auto p-3 snap-x snap-mandatory">
              {domainResults.slice(0, 3).map(result => {
                const sc = getScoreColor(result.label)
                return (
                  <div key={result.name} className="w-[158px] flex-shrink-0 snap-start rounded-xl p-3"
                    style={{
                      background: result.top ? "rgba(212,175,55,0.06)" : result.available ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                      border: result.top ? "1px solid rgba(212,175,55,0.3)" : result.available ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(255,255,255,0.06)",
                      opacity: result.available ? 1 : 0.5,
                    }}>
                    {result.top && <div className="mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: "#D4AF37" }}>⭐ Founder Favourite</div>}
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="text-xs font-bold text-white">{result.name}</span>
                        <span className="text-[10px] text-white/35">{result.tld}</span>
                      </div>
                      <div className="h-1.5 w-1.5 shrink-0 mt-1 rounded-full" style={{ background: result.available ? "#34d399" : "#f87171" }} />
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 shrink-0" style={{ color: sc }} />
                      <span className="text-xs font-black" style={{ color: sc }}>{result.score}</span>
                      <ScoreBar score={result.score} label={result.label} />
                    </div>
                    <div className="mt-1 text-[10px] font-semibold" style={{ color: `${sc}90` }}>{result.label}</div>
                    <div className="mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{
                        background: result.available ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.08)",
                        color: result.available ? "#34d399" : "#f87171",
                        border: result.available ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(239,68,68,0.15)",
                      }}>
                      {result.available ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                      {result.available ? "Available" : "Taken"}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
