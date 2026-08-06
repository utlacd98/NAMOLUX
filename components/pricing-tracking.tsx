"use client"

import type { ComponentProps, ReactNode } from "react"
import { useEffect } from "react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"
import type { PricingAttribution } from "@/lib/pricing-attribution"

export function PricingViewed({ attribution }: { attribution: PricingAttribution }) {
  useEffect(() => {
    void trackEvent({
      action: "pricing_viewed",
      metadata: { source: attribution.source, ...(attribution.content ? { contentSlug: attribution.content } : {}) },
    })
  }, [attribution.content, attribution.source])
  return null
}

type TrackedCheckoutLinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  children: ReactNode
  attribution: PricingAttribution
  ctaId: string
}

export function TrackedCheckoutLink({ attribution, ctaId, children, ...props }: TrackedCheckoutLinkProps) {
  return (
    <Link
      {...props}
      onClick={() => {
        void trackEvent({
          action: "checkout_intent",
          metadata: { source: attribution.source, ctaId, ...(attribution.content ? { contentSlug: attribution.content } : {}) },
        })
      }}
    >
      {children}
    </Link>
  )
}
