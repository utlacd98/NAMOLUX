"use client"

import { lazy, Suspense } from "react"
import { usePathname } from "next/navigation"
import { isMonetizedPathname } from "@/lib/ad-policy"

const LazyAdProvider = lazy(() => import("@/components/ad-provider").then((module) => ({
  default: module.AdProvider,
})))

export function AdProviderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (!isMonetizedPathname(pathname)) return children

  return (
    <Suspense fallback={children}>
      <LazyAdProvider>{children}</LazyAdProvider>
    </Suspense>
  )
}
