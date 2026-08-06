"use client"

import { Analytics } from "@vercel/analytics/react"
import { usePathname } from "next/navigation"

export function LazyAnalytics() {
  const pathname = usePathname()
  if (pathname.startsWith("/namo-curator-local")) return null
  return <Analytics />
}
