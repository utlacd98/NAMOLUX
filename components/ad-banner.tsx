"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useAds } from "@/components/ad-provider"
import { getAdPlacementConfig, type AdPlacement } from "@/lib/ad-policy"

type NamedSlot = "generator" | "blog" | "horizontal" | "sidebar"

const legacyPlacements: Record<NamedSlot, AdPlacement> = {
  generator: "generator-after-results",
  blog: "article-after-intro",
  horizontal: "founder-result-after-primary",
  sidebar: "article-sidebar",
}

const slotIds = {
  generator: process.env.NEXT_PUBLIC_ADSENSE_GENERATOR_SLOT,
  results: process.env.NEXT_PUBLIC_ADSENSE_RESULTS_SLOT || process.env.NEXT_PUBLIC_ADSENSE_HORIZONTAL_SLOT,
  article: process.env.NEXT_PUBLIC_ADSENSE_BLOG_SLOT,
  journal: process.env.NEXT_PUBLIC_ADSENSE_JOURNAL_SLOT || process.env.NEXT_PUBLIC_ADSENSE_BLOG_SLOT,
  sidebar: process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT,
}

export interface AdBannerProps {
  placement?: AdPlacement
  /** @deprecated Prefer the semantic `placement` prop. */
  slot?: NamedSlot
  className?: string
  label?: string
}

export function AdBanner({
  placement,
  slot = "horizontal",
  className = "",
  label = "Advertisement",
}: AdBannerProps) {
  const resolvedPlacement = placement || legacyPlacements[slot]
  const config = getAdPlacementConfig(resolvedPlacement)
  const { eligible, eligibilityResolved, routeEligible, networkReady, publisherId, requestNetwork, testMode } = useAds()
  const shellRef = useRef<HTMLElement>(null)
  const initialized = useRef(false)
  const labelId = useId()
  const [nearViewport, setNearViewport] = useState(false)
  const [desktopAllowed, setDesktopAllowed] = useState(!config.desktopOnly)
  const slotId = slotIds[config.slotGroup]?.trim()

  useEffect(() => {
    if (!config.desktopOnly) return

    const media = window.matchMedia("(min-width: 1536px)")
    const update = () => setDesktopAllowed(media.matches)
    const initialFrame = window.requestAnimationFrame(update)
    media.addEventListener("change", update)
    return () => {
      window.cancelAnimationFrame(initialFrame)
      media.removeEventListener("change", update)
    }
  }, [config.desktopOnly])

  useEffect(() => {
    initialized.current = false
  }, [resolvedPlacement, slotId])

  useEffect(() => {
    if (!eligible || !routeEligible || !desktopAllowed) {
      initialized.current = false
    }
  }, [desktopAllowed, eligible, routeEligible])

  useEffect(() => {
    const shell = shellRef.current
    if (
      !shell ||
      !routeEligible ||
      !eligibilityResolved ||
      !eligible ||
      !desktopAllowed ||
      (!testMode && (!publisherId || !slotId))
    ) return

    const Observer = globalThis.IntersectionObserver
    if (typeof Observer === "undefined") {
      const fallbackFrame = window.requestAnimationFrame(() => setNearViewport(true))
      return () => window.cancelAnimationFrame(fallbackFrame)
    }

    const observer = new Observer((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setNearViewport(true)
      observer.disconnect()
    }, { rootMargin: config.rootMargin })

    observer.observe(shell)
    return () => observer.disconnect()
  }, [
    config.rootMargin,
    desktopAllowed,
    eligibilityResolved,
    eligible,
    publisherId,
    routeEligible,
    slotId,
    testMode,
  ])

  useEffect(() => {
    if (!nearViewport || testMode) return
    requestNetwork()
  }, [nearViewport, requestNetwork, testMode])

  useEffect(() => {
    if (
      !nearViewport ||
      !eligible ||
      !networkReady ||
      !publisherId ||
      !slotId ||
      testMode ||
      initialized.current
    ) return

    initialized.current = true
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch (error) {
      initialized.current = false
      console.error("AdSense slot initialization failed:", error)
    }
  }, [eligible, nearViewport, networkReady, publisherId, slotId, testMode])

  const configured = testMode || Boolean(publisherId && slotId)
  if (!routeEligible || !eligibilityResolved || !eligible || !desktopAllowed || !configured) return null

  const shellClassName = [
    "relative mx-auto flex w-full flex-col justify-center overflow-hidden border-y border-white/[0.05] bg-white/[0.012]",
    config.reserveClassName,
    className,
  ].filter(Boolean).join(" ")

  return (
    <aside ref={shellRef} aria-labelledby={labelId} className={shellClassName} data-ad-placement={resolvedPlacement}>
      <span id={labelId} className="mb-2 block text-center text-[10px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>

      {testMode ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">
          Test slot · {resolvedPlacement}
        </div>
      ) : nearViewport && networkReady ? (
        <ins
          className={`adsbygoogle block w-full ${config.adClassName}`}
          style={{ display: "block", width: "100%" }}
          data-ad-client={publisherId || undefined}
          data-ad-slot={slotId}
          data-ad-format={config.format}
          data-full-width-responsive={config.fullWidth ? "true" : "false"}
        />
      ) : (
        <div aria-hidden="true" className={config.adClassName} />
      )}
    </aside>
  )
}

export function AdBannerHorizontal() {
  return <AdBanner placement="founder-result-after-primary" className="my-6 max-w-5xl" />
}

export function AdBannerSidebar() {
  return <AdBanner placement="article-sidebar" className="w-full" />
}

export type { AdPlacement }
