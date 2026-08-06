"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics"

interface BlogTrackerProps {
  slug: string
  title: string
  category: string
}

export function BlogTracker({ slug, title, category }: BlogTrackerProps) {
  useEffect(() => {
    trackEvent({
      action: "blog_view",
      metadata: { source: "article", contentSlug: slug, topic: category },
      route: `/blog/${slug}`,
    })
  }, [slug, title, category])

  return null
}
