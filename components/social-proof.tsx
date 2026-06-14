"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "framer-motion"
import { Reveal } from "@/components/landing/reveal"

const stats = [
  { target: 10000, suffix: "+", display: "10,000+", label: "Names scored" },
  { target: 6, suffix: " TLDs", display: "6 TLDs", label: "Verified per name" },
  { target: 60, prefix: "<", suffix: "s", display: "<60s", label: "Full shortlist analysis" },
]

const userSegments = [
  "Venture studios",
  "Indie founders",
  "Naming consultants",
  "Product teams",
  "Agency strategists",
  "Solo builders",
  "SEO operators",
  "Portfolio teams",
]

function CountUpStat({
  target,
  prefix = "",
  suffix = "",
  display,
  started,
  delay,
}: {
  target: number
  prefix?: string
  suffix?: string
  display: string
  started: boolean
  delay: number
}) {
  // null = not animating → show the real display string. The SSR HTML (and
  // any crawler) always contains the final value, never a zero.
  const [value, setValue] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!started || reducedMotion) return
    let frame = 0
    const timer = setTimeout(() => {
      const startedAt = performance.now()
      const duration = 1400
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(progress < 1 ? Math.round(eased * target) : null)
        if (progress < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, delay * 1000)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [started, target, delay, reducedMotion])

  if (value === null) return <>{display}</>
  return (
    <>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </>
  )
}

export function SocialProof() {
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: "-20% 0px" })

  return (
    <section
      ref={sectionRef}
      className="relative overflow-clip border-y border-primary/10 py-14 sm:py-20"
      aria-label="Social proof"
      style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.025) 0%, rgba(0,0,0,0) 60%)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground/70">
            Used by founders to pick names with confidence
          </p>
        </Reveal>

        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-y-4 sm:flex-nowrap">
          {stats.map((stat, index) => (
            <div key={stat.label} className="flex items-center">
              <Reveal delay={0.1 + index * 0.12} className="px-4 py-2 text-center sm:px-6 md:px-8 lg:px-12">
                <div className="font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl lg:text-5xl">
                  <CountUpStat
                    target={stat.target}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    display={stat.display}
                    started={inView}
                    delay={0.2 + index * 0.15}
                  />
                </div>
                <div className="mt-2 text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</div>
              </Reveal>
              {index < stats.length - 1 && (
                <div
                  className="hidden h-12 w-px sm:block"
                  style={{ background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.25), transparent)" }}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 overflow-clip sm:mt-16">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
            Built for high-stakes naming decisions
          </p>
          <div className="relative w-full overflow-clip [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <div className="animate-marquee flex w-max gap-8 sm:gap-16">
              {[...userSegments, ...userSegments].map((segment, index) => (
                <div
                  key={`${segment}-${index}`}
                  className="flex shrink-0 items-center gap-2 font-display text-sm font-medium tracking-wide text-muted-foreground/40 transition-colors hover:text-primary/60 sm:text-base"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-md border border-primary/10 bg-muted/50 sm:h-6 sm:w-6">
                    <div className="h-2.5 w-2.5 rounded-sm bg-primary/25 sm:h-3 sm:w-3" />
                  </div>
                  {segment}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
