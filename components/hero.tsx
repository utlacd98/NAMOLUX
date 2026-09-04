"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"
import { ScorecardDemo } from "@/components/landing/scorecard-demo"

const editorialSerif =
  'var(--font-fraunces), "Iowan Old Style", "Palatino Linotype", "URW Palladio L", "Book Antiqua", Georgia, serif'

const supportingPoints = [
  "No account required",
  "Live availability across 6 TLDs",
  "Founder Signal scoring with Pro",
]

const heroProof = [
  { value: "10,000+", label: "names scored" },
  { value: "6", label: "TLDs checked" },
  { value: "<60s", label: "shortlist verdict" },
]

const ambientParticles = [
  { left: "22%", top: "28%", size: 2, duration: 16, delay: 2 },
  { left: "47%", top: "14%", size: 2.5, duration: 18, delay: 1 },
  { left: "66%", top: "24%", size: 2, duration: 17, delay: 3 },
  { left: "81%", top: "62%", size: 2, duration: 14, delay: 2 },
  { left: "7%", top: "18%", size: 2, duration: 13, delay: 0 },
  { left: "14%", top: "63%", size: 1.5, duration: 15, delay: 4 },
  { left: "33%", top: "72%", size: 1.5, duration: 14, delay: 5 },
  { left: "58%", top: "56%", size: 1.5, duration: 15, delay: 6 },
  { left: "74%", top: "68%", size: 1.5, duration: 16, delay: 7 },
  { left: "90%", top: "60%", size: 1.5, duration: 18, delay: 8 },
]

function getReveal(delay: number, reducedMotion: boolean) {
  return {
    initial: {
      opacity: 0,
      y: reducedMotion ? 0 : 24,
      filter: reducedMotion ? "none" : "blur(10px)",
    },
    animate: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: reducedMotion ? 0.01 : 0.85,
        delay: reducedMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  }
}

export function Hero() {
  const reducedMotion = useReducedMotion()

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-[#050505] text-white [contain:paint]"
      style={{ transform: "translateZ(0)" }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 18%, rgba(212, 175, 55, 0.18), transparent 28%),
            radial-gradient(circle at 78% 28%, rgba(191, 145, 58, 0.1), transparent 24%),
            radial-gradient(circle at 52% 78%, rgba(255, 255, 255, 0.04), transparent 28%),
            linear-gradient(180deg, #090909 0%, #040404 48%, #020202 100%)
          `,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,175,55,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.06) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          maskImage:
            "radial-gradient(circle at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 58%, transparent 100%)",
        }}
      />

      <motion.div
        aria-hidden="true"
        animate={
          reducedMotion
            ? undefined
            : {
                opacity: [0.18, 0.32, 0.18],
                scale: [1, 1.05, 1],
              }
        }
        transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        style={{ willChange: "transform, opacity" }}
        className="absolute left-1/2 top-[20rem] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-[#d6aa52]/20 blur-[60px] sm:top-[17rem] sm:h-[24rem] sm:w-[24rem] sm:blur-[120px]"
      />

      <motion.div
        aria-hidden="true"
        animate={
          reducedMotion
            ? undefined
            : {
                x: ["-30%", "30%", "-30%"],
                opacity: [0.1, 0.18, 0.1],
              }
        }
        transition={{ duration: 22, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        style={{ willChange: "transform, opacity" }}
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[120%] bg-[linear-gradient(115deg,transparent_38%,rgba(240,212,147,0.15)_50%,transparent_62%)] blur-2xl sm:block"
      />

      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {ambientParticles.map((particle, index) => (
          <span
            key={`${particle.left}-${particle.top}-${index}`}
            className={`absolute rounded-full bg-[radial-gradient(circle,rgba(241,220,170,0.75)_0%,rgba(241,220,170,0)_72%)] ${
              index < 4 ? "" : "hidden sm:block"
            }`}
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              opacity: reducedMotion ? 0.16 : 0.34,
              willChange: reducedMotion ? "auto" : "transform, opacity",
              animation: reducedMotion
                ? "none"
                : `heroDust ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="hero-noise absolute inset-0 hidden opacity-[0.14] sm:block" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-20 sm:px-6 sm:pb-[4.5rem] sm:pt-24 lg:px-8 lg:pb-14 lg:pt-20 xl:pt-[5.5rem]">
        <div className="grid min-h-[calc(100svh-5rem)] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:gap-12">
          <div className="relative z-10 min-w-0">
            <motion.h1
              {...getReveal(0.1, Boolean(reducedMotion))}
              id="hero-heading"
              className="max-w-[12ch] text-5xl font-medium leading-[0.95] text-white sm:max-w-[12ch] sm:text-6xl lg:max-w-[11.5ch] lg:text-6xl xl:text-7xl"
              style={{ fontFamily: editorialSerif }}
            >
              Choose a brand name{" "}
              <span className="bg-[linear-gradient(102deg,#8f6a28_0%,#dcbf86_28%,#f8ebcb_50%,#c3923b_75%,#74501c_100%)] bg-clip-text text-transparent">
                with evidence.
              </span>
            </motion.h1>

            <motion.div {...getReveal(0.22, Boolean(reducedMotion))} className="relative mt-6 flex flex-col items-start gap-4 lg:mt-7">
              <p className="max-w-xl text-[15px] leading-7 text-[#ddd6c5]/78 sm:text-[17px]">
                Sign in for one curated Name Sprint each UTC day or bring a shortlist into Bulk Check. Live domain checks
                update without blocking your shortlist; upgrade to Pro when you are ready to run Founder Signal and
                you are ready to compare the evidence.
              </p>

              <motion.div
                aria-hidden="true"
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: [0.16, 0.28, 0.16],
                        scale: [0.98, 1.04, 0.98],
                      }
                }
                transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="absolute -left-3 top-0 h-24 w-56 rounded-full bg-[#d8a74b]/20 blur-[48px]"
              />

              <div className="relative z-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <motion.div
                  whileHover={reducedMotion ? undefined : { y: -2, scale: 1.015 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.99 }}
                  className="relative w-full sm:w-auto"
                >
                  <motion.div
                    aria-hidden="true"
                    animate={
                      reducedMotion
                        ? undefined
                        : {
                            opacity: [0.35, 0.55, 0.35],
                            scale: [0.98, 1.04, 0.98],
                          }
                    }
                    transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    style={{ willChange: "transform, opacity" }}
                    className="pointer-events-none absolute inset-0 -m-2 hidden rounded-full bg-[radial-gradient(ellipse_at_center,rgba(240,212,147,0.45)_0%,rgba(212,175,55,0.18)_40%,transparent_72%)] blur-2xl sm:block"
                  />
                  <Link
                    href="/generate"
                    className="group relative inline-flex h-[52px] w-full items-center justify-center overflow-hidden rounded-full border border-[#f0daaa]/60 bg-[linear-gradient(180deg,#f4dfb3_0%,#ddbe7a_42%,#b98838_100%)] px-7 text-[15px] font-semibold text-[#090705] shadow-[0_18px_60px_rgba(0,0,0,0.55),0_10px_24px_rgba(212,175,55,0.18)] transition-all duration-300 hover:border-[#f7e7c3] hover:shadow-[0_28px_80px_rgba(0,0,0,0.65),0_14px_40px_rgba(240,212,147,0.35)] sm:w-auto sm:px-8"
                  >
                    <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0)_42%)] opacity-70" />
                    <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0)_22%,rgba(255,255,255,0.34)_50%,rgba(255,255,255,0)_78%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <span className="absolute inset-y-1 left-0 w-24 -translate-x-[180%] rotate-12 bg-gradient-to-r from-transparent via-white/55 to-transparent blur-md transition-transform duration-[1100ms] ease-out group-hover:translate-x-[360%]" />
                    <span className="relative">Generate names free</span>
                    <ArrowRight className="relative ml-3 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </motion.div>

                <Link
                  href="#product"
                  className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#e6d7b7]/70 transition-colors hover:text-[#f8ebcb]"
                >
                  See the scorecard
                </Link>
              </div>

              <div className="flex w-full flex-wrap gap-2.5">
                {supportingPoints.map((point, index) => (
                  <motion.div
                    key={point}
                    {...getReveal(0.38 + index * 0.08, Boolean(reducedMotion))}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-sm text-[#e1d8c4]/75 sm:backdrop-blur-sm"
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#7e622f]/45 bg-[#120f0a]">
                      <Check className="h-3 w-3 text-[#d3b06b]" />
                    </span>
                    <span className="min-w-0 break-words">{point}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div {...getReveal(0.3, Boolean(reducedMotion))} className="relative z-10 mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-none">
            <div className="absolute -inset-6 rounded-[2rem] border border-[#d6aa52]/10 bg-[#d6aa52]/[0.025] blur-2xl" aria-hidden="true" />
            <ScorecardDemo />
            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-[#d6aa52]/14 bg-black/28 backdrop-blur-sm">
              {heroProof.map((item, index) => (
                <div
                  key={item.label}
                  className="px-3 py-4 text-center"
                  style={index > 0 ? { borderLeft: "1px solid rgba(214,170,82,0.12)" } : undefined}
                >
                  <p className="font-display text-xl font-semibold text-[#f4dfb3] sm:text-2xl">{item.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .hero-noise::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          mix-blend-mode: soft-light;
          opacity: 0.18;
        }

        @keyframes heroDust {
          0% {
            transform: translate3d(0, 0, 0) scale(0.9);
            opacity: 0;
          }
          18% {
            opacity: 0.34;
          }
          55% {
            transform: translate3d(16px, -22px, 0) scale(1.12);
            opacity: 0.24;
          }
          100% {
            transform: translate3d(-10px, -56px, 0) scale(0.94);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  )
}
