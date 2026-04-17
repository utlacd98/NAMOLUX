"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Check, Dot } from "lucide-react"

const editorialSerif =
  '"Iowan Old Style", "Palatino Linotype", "URW Palladio L", "Book Antiqua", Georgia, serif'

const supportingPoints = [
  "No account required",
  "Live availability across 6 TLDs",
  "Founder Signal™ score on every name",
]

const shortlistRows = [
  {
    name: "Aurelium",
    availability: "Open on .com, .io, and .ai",
    brandStrength: 96,
    founderFit: 93,
    spotlight: true,
  },
  {
    name: "Northvale",
    availability: "Open on .io and .co",
    brandStrength: 82,
    founderFit: 79,
  },
  {
    name: "Verden",
    availability: ".com taken, .ai open",
    brandStrength: 74,
    founderFit: 72,
  },
]

const evidenceNotes = [
  "Brand strength weighs memorability, distinctiveness, and premium fit.",
  "Availability is checked live so shortlist decisions are grounded in market reality.",
  "Founder fit rewards names that sound credible when attached to the person building it.",
]

const availabilityPills = [
  { label: ".com", state: "open" },
  { label: ".io", state: "open" },
  { label: ".ai", state: "open" },
  { label: ".co", state: "watch" },
  { label: ".vc", state: "watch" },
  { label: ".studio", state: "open" },
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

function MetricBar({
  label,
  value,
  delay,
  reducedMotion,
}: {
  label: string
  value: number
  delay: number
  reducedMotion: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-[#c3b081]/72">
        <span>{label}</span>
        <span className="font-medium text-[#f0dfb5]">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ scaleX: 0, opacity: 0.7 }}
          animate={{ scaleX: value / 100, opacity: 1 }}
          transition={{
            duration: reducedMotion ? 0.01 : 0.9,
            delay: reducedMotion ? 0 : delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="h-full origin-left rounded-full bg-[linear-gradient(90deg,#7f5b1f_0%,#cfa24d_48%,#f2ddb0_100%)] shadow-[0_0_14px_rgba(212,175,55,0.2)]"
        />
      </div>
    </div>
  )
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

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:px-8 lg:pb-28 lg:pt-36">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-14">
          <div className="relative z-10 max-w-2xl">
            <motion.div
              {...getReveal({ delay: 0.05, reducedMotion })}
              className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#876628]/45 bg-[linear-gradient(180deg,rgba(20,16,11,0.92),rgba(10,8,6,0.9))] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.28em] text-[#d7be84] shadow-[0_14px_40px_rgba(0,0,0,0.35)] sm:text-[11px]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#d8b15b] shadow-[0_0_12px_rgba(216,177,91,0.85)]" />
              <span>Brand Consultancy</span>
              <span className="text-[#6a5330]">/</span>
              <span>Founder Signal™ Scoring</span>
            </motion.div>

            <motion.h1
              {...getReveal({ delay: 0.14, reducedMotion })}
              id="hero-heading"
              className="mt-6 text-[clamp(2.85rem,10vw,6.1rem)] font-medium leading-[0.94] tracking-[-0.06em] text-white"
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

            <motion.p
              {...getReveal({ delay: 0.25, reducedMotion })}
              className="mt-6 max-w-xl text-[15px] leading-7 text-[#ddd6c5]/76 sm:text-lg"
            >
              NamoLux is a domain naming consultancy powered by Founder Signal™. Paste
              your candidate names and we score each one on{" "}
              <span className="text-[#f5ead0]">brand strength, availability, and founder fit</span>{" "}
              so you choose the name with the evidence to back it.
            </motion.p>

            <motion.div
              {...getReveal({ delay: 0.36, reducedMotion })}
              className="relative mt-9 flex flex-col items-start gap-5"
            >
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

              <div className="flex flex-wrap gap-2.5">
                {supportingPoints.map((point, index) => (
                  <motion.div
                    key={point}
                    {...getReveal({ delay: 0.46 + index * 0.08, reducedMotion })}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-sm text-[#e1d8c4]/75 backdrop-blur-sm"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#7e622f]/45 bg-[#120f0a]">
                      <Check className="h-3 w-3 text-[#d3b06b]" />
                    </span>
                    <span>{point}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            {...getReveal({ delay: 0.24, reducedMotion })}
            className="relative mx-auto w-full max-w-[38rem] lg:ml-auto"
          >
            <motion.div
              aria-hidden="true"
              animate={
                reducedMotion
                  ? undefined
                  : {
                      opacity: [0.22, 0.38, 0.22],
                      scale: [1, 1.03, 1],
                    }
              }
              transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="absolute -inset-x-3 top-10 h-72 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.18)_0%,rgba(212,175,55,0.04)_38%,transparent_72%)] blur-3xl"
            />

            <div className="absolute -top-5 left-5 z-20 rounded-full border border-[#7e622b]/45 bg-black/70 px-4 py-2 text-[10px] uppercase tracking-[0.26em] text-[#d4b26c] shadow-[0_16px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">
              Founder Signal dossier
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-[#7a5d2e]/32 bg-[linear-gradient(180deg,rgba(14,11,8,0.96),rgba(8,8,8,0.94))] p-4 shadow-[0_32px_120px_rgba(0,0,0,0.72)] backdrop-blur-xl sm:p-5">
              <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#e1c383]/50 to-transparent" />

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,15,12,0.94),rgba(8,8,8,0.9))] p-4 sm:p-5">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-[#baa473]/72">
                    <span>Shortlist brief</span>
                    <span>Consultancy review</span>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-white/8 bg-black/35 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                      Paste candidate names
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {shortlistRows.map((row) => (
                        <span
                          key={row.name}
                          className="rounded-full border border-[#6e5426]/45 bg-[#130f09] px-3 py-1.5 text-sm text-[#efe3c4]"
                        >
                          {row.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {shortlistRows.map((row, index) => (
                      <motion.div
                        key={row.name}
                        initial={{
                          opacity: 0,
                          x: reducedMotion ? 0 : 16,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          transition: {
                            duration: reducedMotion ? 0.01 : 0.8,
                            delay: reducedMotion ? 0 : 0.38 + index * 0.12,
                            ease: [0.16, 1, 0.3, 1],
                          },
                        }}
                        className={`rounded-[22px] border p-4 ${
                          row.spotlight
                            ? "border-[#9b7330]/50 bg-[linear-gradient(180deg,rgba(44,31,10,0.55),rgba(17,12,7,0.88))]"
                            : "border-white/8 bg-white/[0.025]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-medium text-white" style={{ fontFamily: editorialSerif }}>
                                {row.name}
                              </h2>
                              {row.spotlight ? (
                                <span className="rounded-full border border-[#a57d34]/45 bg-[#1a1308] px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-[#dcbc77]">
                                  Recommended
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-[#d9cfbb]/66">{row.availability}</p>
                          </div>

                          <div className="rounded-full border border-[#83652c]/35 bg-[#120e09] px-3 py-1.5 text-sm text-[#f2e0b6]">
                            {row.brandStrength}
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <MetricBar
                            label="Brand Strength"
                            value={row.brandStrength}
                            delay={0.54 + index * 0.1}
                            reducedMotion={reducedMotion}
                          />
                          <MetricBar
                            label="Founder Fit"
                            value={row.founderFit}
                            delay={0.62 + index * 0.1}
                            reducedMotion={reducedMotion}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#c9b07b]/74">
                      Decision signal
                    </p>
                    <div className="mt-3 space-y-3">
                      {evidenceNotes.map((note) => (
                        <div key={note} className="flex gap-2.5 text-sm leading-6 text-[#ddd2bc]/72">
                          <Dot className="mt-1 h-4 w-4 shrink-0 text-[#d3af67]" />
                          <p>{note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[#c9b07b]/74">
                        Live availability
                      </p>
                      <span className="rounded-full border border-[#446d4e]/50 bg-[#0d1510] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-[#9ac7a0]">
                        6 TLDs
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {availabilityPills.map((pill) => (
                        <span
                          key={pill.label}
                          className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] ${
                            pill.state === "open"
                              ? "border-[#4f7656]/45 bg-[#101711] text-[#a7cbad]"
                              : "border-[#6f5f3d]/45 bg-[#15120d] text-[#d2c08d]"
                          }`}
                        >
                          {pill.label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 rounded-[18px] border border-white/8 bg-black/25 p-3.5">
                      <p className="text-sm leading-6 text-[#ddd2bc]/68">
                        A shortlist that looks elegant is not enough. The name needs evidence.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
