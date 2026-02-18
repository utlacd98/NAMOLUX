"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/react"

export function LazyAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let timeoutId: number | undefined

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
        () => setEnabled(true),
      )

      return () => {
        if ("cancelIdleCallback" in window) {
          ;(window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId)
        }
      }
    }

    timeoutId = window.setTimeout(() => setEnabled(true), 1200)
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  if (!enabled) return null

  return <Analytics />
}
