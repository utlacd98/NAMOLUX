"use client"

import type { CSSProperties, ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"

type RevealProps = {
  children: ReactNode
  /** Seconds to wait before the element animates in */
  delay?: number
  /** Initial vertical offset in px */
  y?: number
  className?: string
  style?: CSSProperties
  /** Render as a different motion element (default div) */
  as?: "div" | "section" | "li" | "span"
}

/**
 * Scroll-triggered reveal used across landing sections.
 * Animates opacity/transform only (GPU-cheap) and fires once.
 * Server components can pass server-rendered children straight through,
 * so all copy stays in the SSR HTML for crawlers.
 */
export function Reveal({ children, delay = 0, y = 28, className, style, as = "div" }: RevealProps) {
  const reducedMotion = useReducedMotion()
  const Component = motion[as]

  return (
    <Component
      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: reducedMotion ? 0.01 : 0.8, delay: reducedMotion ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      {children}
    </Component>
  )
}

/** Shared section header: gold kicker + serif headline + muted sub. */
export function SectionHeader({
  kicker,
  heading,
  headingId,
  sub,
  align = "center",
}: {
  kicker: string
  heading: ReactNode
  headingId?: string
  sub?: ReactNode
  align?: "center" | "left"
}) {
  return (
    <Reveal className={align === "center" ? "text-center" : "text-left"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80">{kicker}</p>
      <h2
        id={headingId}
        className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
      >
        {heading}
      </h2>
      {sub && (
        <p className={`mt-4 text-lg text-muted-foreground ${align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>
          {sub}
        </p>
      )}
    </Reveal>
  )
}
