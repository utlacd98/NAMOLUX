"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"

const editorialSerif =
  '"Iowan Old Style", "Palatino Linotype", "URW Palladio L", "Book Antiqua", Georgia, serif'
const founderSignalMark = "Founder Signal\u2122"

const supportingPoints = [
  "No account required",
  "Live availability across 6 TLDs",
  `${founderSignalMark} score on every name`,
]

const ambientParticles = [
  { left: "7%", top: "18%", size: 2, duration: 13, delay: 0 },
  { left: "14%", top: "63%", size: 1.5, duration: 15, delay: 4 },
  { left: "22%", top: "28%", size: 2, duration: 16, delay: 2 },
  { left: "33%", top: "72%", size: 1.5, duration: 14, delay: 5 },
  { left: "47%", top: "14%", size: 2.5, duration: 18, delay: 1 },
  { left: "58%", top: "56%", size: 1.5, duration: 15, delay: 6 },
  { left: "66%", top: "24%", size: 2, duration: 17, delay: 3 },
  { left: "74%", top: "68%", size: 1.5, duration: 16, delay: 7 },
  { left: "81%", top: "31%", size: 2, duration: 14, delay: 2 },
  { left: "90%", top: "60%", size: 1.5, duration: 18, delay: 8 },
]

type RevealProps = {
  delay: number
  reducedMotion: boolean
}

function getReveal({ delay, reducedMotion }: RevealProps) {
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
      className="relative isolate overflow-hidden bg-[#050505] text-white"
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
        className="absolute inset-0 opacity-[0.18]"
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
                opacity: [0.2, 0.32, 0.2],
                scale: [1, 1.05, 1],
              }
        }
        transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute left-1/2 top-[20rem] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-[#d6aa52]/20 blur-[120px] sm:top-[17rem] sm:h-[22rem] sm:w-[22rem]"
      />

      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        {ambientParticles.map((particle, index) => (
          <span
            key={`${particle.left}-${particle.top}-${index}`}
            className="absolute rounded-full bg-[radial-gradient(circle,rgba(241,220,170,0.75)_0%,rgba(241,220,170,0)_72%)]"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              opacity: reducedMotion ? 0.16 : 0.34,
              animation: reducedMotion
                ? "none"
                : `heroDust ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="hero-noise absolute inset-0 opacity-[0.16]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pb-20 lg:pt-20 xl:pt-24">
        <div className="lg:min-h-[calc(100svh-6.5rem)]">
          <div className="relative z-10 min-w-0 max-w-4xl lg:flex lg:min-h-[calc(100svh-10rem)] lg:flex-col">
            <motion.div
              {...getReveal({ delay: 0.05, reducedMotion })}
              className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#876628]/45 bg-[linear-gradient(180deg,rgba(20,16,11,0.92),rgba(10,8,6,0.9))] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.28em] text-[#d7be84] shadow-[0_14px_40px_rgba(0,0,0,0.35)] sm:text-[11px]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#d8b15b] shadow-[0_0_12px_rgba(216,177,91,0.85)]" />
              <span>Brand Consultancy</span>
              <span className="text-[#6a5330]">/</span>
              <span>{founderSignalMark} Scoring</span>
            </motion.div>

            <div className="lg:flex lg:flex-1 lg:items-center lg:py-8 xl:py-10">
              <motion.h1
                {...getReveal({ delay: 0.14, reducedMotion })}
                id="hero-heading"
                className="mt-6 max-w-[11ch] text-[clamp(2.85rem,10vw,6.6rem)] font-medium leading-[0.94] tracking-[-0.06em] text-white sm:max-w-none lg:mt-0"
                style={{ fontFamily: editorialSerif }}
              >
                <span className="block">A brand consultant</span>
                <motion.span
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                        }
                  }
                  transition={{
                    duration: 8,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="mt-1 block bg-[linear-gradient(102deg,#8f6a28_0%,#dcbf86_26%,#f8ebcb_48%,#c3923b_70%,#74501c_100%)] bg-[length:180%_180%] bg-clip-text text-transparent"
                >
                  for your shortlist.
                </motion.span>
              </motion.h1>
            </div>

            <motion.div
              {...getReveal({ delay: 0.25, reducedMotion })}
              className="relative mt-8 flex flex-col items-start gap-5 lg:mt-0 lg:pb-3"
            >
              <p className="max-w-2xl text-[15px] leading-7 text-[#ddd6c5]/76 sm:text-lg">
                NamoLux is a domain naming consultancy powered by {founderSignalMark}. Paste
                your candidate names and we score each one on{" "}
                <span className="text-[#f5ead0]">brand strength, availability, and founder fit</span>{" "}
                so you choose the name with the evidence to back it.
              </p>

              <motion.div
                aria-hidden="true"
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: [0.18, 0.3, 0.18],
                        scale: [0.98, 1.04, 0.98],
                      }
                }
                transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="absolute -left-3 top-0 h-24 w-56 rounded-full bg-[#d8a74b]/20 blur-[48px]"
              />

              <motion.div
                whileHover={reducedMotion ? undefined : { y: -2, scale: 1.01 }}
                whileTap={reducedMotion ? undefined : { scale: 0.995 }}
                className="relative z-10 w-full sm:w-auto"
              >
                <Link
                  href="/generate"
                  className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-full border border-[#f0daaa]/55 bg-[linear-gradient(180deg,#f4dfb3_0%,#ddbe7a_42%,#b98838_100%)] px-7 py-4 text-[15px] font-semibold text-[#090705] shadow-[0_18px_60px_rgba(0,0,0,0.55),0_10px_24px_rgba(212,175,55,0.14)] transition-all duration-300 hover:border-[#f7e7c3] hover:shadow-[0_24px_70px_rgba(0,0,0,0.62),0_12px_32px_rgba(212,175,55,0.18)] sm:w-auto sm:px-8"
                >
                  <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0)_22%,rgba(255,255,255,0.34)_50%,rgba(255,255,255,0)_78%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="absolute inset-y-1 left-0 w-20 -translate-x-[180%] rotate-12 bg-gradient-to-r from-transparent via-white/45 to-transparent blur-md transition-transform duration-1000 ease-out group-hover:translate-x-[360%]" />
                  <span className="relative">Score your shortlist free</span>
                  <ArrowRight className="relative ml-3 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </motion.div>

              <div className="flex w-full flex-wrap gap-2.5">
                {supportingPoints.map((point, index) => (
                  <motion.div
                    key={point}
                    {...getReveal({ delay: 0.46 + index * 0.08, reducedMotion })}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-sm text-[#e1d8c4]/75 backdrop-blur-sm"
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
