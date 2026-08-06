"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { ArrowRight, ListChecks } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import type { GeneratorSource } from "@/lib/generator-attribution"

export interface ContextualMiniGeneratorProps {
  source: Extract<GeneratorSource, "article" | "niche" | "guide">
  contentSlug: string
  topic: string
  defaultBrief: string
  heading: string
  ctaId: string
}

export function ContextualMiniGenerator({
  source,
  contentSlug,
  topic,
  ctaId,
}: ContextualMiniGeneratorProps) {
  const containerRef = useRef<HTMLElement>(null)
  const hasTrackedView = useRef(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element || hasTrackedView.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || hasTrackedView.current) return
        hasTrackedView.current = true
        void trackEvent({
          action: "content_cta_seen",
          metadata: { source, contentSlug, topic, ctaId },
        })
        observer.disconnect()
      },
      { threshold: 0.35 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [contentSlug, ctaId, source, topic])

  return (
    <section
      ref={containerRef}
      aria-labelledby={`${ctaId}-heading`}
      className="not-prose my-10 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.09] via-card/80 to-card p-5 shadow-sm sm:p-7"
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <ListChecks aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Make the shortlist decision
          </p>
          <h2 id={`${ctaId}-heading`} className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            Ready to compare your own candidate names?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Paste up to 50 names into Bulk Check, verify six domain extensions, and add Founder Signal when you want a ranked view.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Availability is best effort and should be confirmed with your registrar before purchase.
        </p>
        <Link
          href="/bulk-domain-check"
          onClick={() => void trackEvent({ action: "content_cta_clicked", metadata: { source, contentSlug, topic, ctaId } })}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Check my shortlist
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
