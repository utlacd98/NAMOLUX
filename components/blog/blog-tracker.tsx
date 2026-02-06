"use client"

import { useEffect } from "react"

interface BlogTrackerProps {
  slug: string
  title: string
  category: string
}

export function BlogTracker({ slug, title, category }: BlogTrackerProps) {
  useEffect(() => {
    // Track blog view
    const trackView = async () => {
      try {
        // Get or create session ID
        let sessionId = sessionStorage.getItem("namo_session")
        if (!sessionId) {
          sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
          sessionStorage.setItem("namo_session", sessionId)
        }

        // Detect device
        const width = window.innerWidth
        const device = width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop"

        await fetch("/api/metrics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "blog_view",
            metadata: {
              slug,
              title,
              category,
            },
            sessionId,
            device,
            referrer: document.referrer || undefined,
            route: `/blog/${slug}`,
          }),
        })
      } catch (error) {
        // Silently fail - don't block the page
        console.error("Failed to track blog view:", error)
      }
    }

    trackView()
  }, [slug, title, category])

  // This component doesn't render anything
  return null
}

