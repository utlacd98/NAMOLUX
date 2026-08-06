"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { trackEvent, type AnalyticsMetadata } from "@/lib/analytics"

function contentContext(pathname: string): AnalyticsMetadata {
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/)
  if (blogMatch) return { source: "article", contentSlug: blogMatch[1] }
  const nicheMatch = pathname.match(/^\/startup-name-ideas\/([^/]+)$/)
  if (nicheMatch) return { source: "niche", contentSlug: nicheMatch[1] }
  if (["/how-to-name-a-startup", "/name-mistakes", "/brand-longevity", "/domain-vs-brand", "/seo-domain-check"].includes(pathname)) {
    return { source: "guide", contentSlug: pathname.slice(1) }
  }
  if (pathname === "/") return { source: "home" }
  if (pathname === "/generate") return { source: "generator" }
  return { source: "site" }
}

export function EngagementTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith("/namo-curator-local")) return

    const metadata = contentContext(pathname)
    trackEvent({ action: "page_view", metadata, route: pathname })
    const timers = ([
      { duration: 10_000, action: "engaged_10s" as const },
      { duration: 30_000, action: "engaged_30s" as const },
    ]).map(({ duration, action }) => {
      let remaining = duration
      let startedAt = 0
      let timeout: number | undefined
      let complete = false
      const pause = () => {
        if (timeout === undefined) return
        window.clearTimeout(timeout)
        timeout = undefined
        remaining = Math.max(0, remaining - (performance.now() - startedAt))
      }
      const resume = () => {
        if (complete || timeout !== undefined || document.visibilityState !== "visible") return
        startedAt = performance.now()
        timeout = window.setTimeout(() => {
          complete = true
          timeout = undefined
          trackEvent({ action, metadata, route: pathname })
        }, remaining)
      }
      const onVisibility = () => document.visibilityState === "visible" ? resume() : pause()
      document.addEventListener("visibilitychange", onVisibility)
      resume()
      return () => {
        if (timeout !== undefined) window.clearTimeout(timeout)
        document.removeEventListener("visibilitychange", onVisibility)
      }
    })
    const reached = new Set<number>()
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const depth = (window.scrollY / scrollable) * 100
      for (const threshold of [50, 90] as const) {
        if (depth < threshold || reached.has(threshold)) continue
        reached.add(threshold)
        trackEvent({ action: threshold === 50 ? "scroll_50" : "scroll_90", metadata, route: pathname })
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => {
      timers.forEach((cleanup) => cleanup())
      window.removeEventListener("scroll", onScroll)
    }
  }, [pathname])

  return null
}
