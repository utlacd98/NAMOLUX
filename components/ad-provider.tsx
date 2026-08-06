"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { isMonetizedPathname } from "@/lib/ad-policy"

type AdsContextValue = {
  eligible: boolean
  eligibilityResolved: boolean
  routeEligible: boolean
  networkReady: boolean
  testMode: boolean
  publisherId: string | null
  requestNetwork: () => void
  refreshEligibility: () => void
  openPrivacySettings: () => void
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
    googlefc?: {
      callbackQueue: Array<() => void>
      showRevocationMessage: () => void
    }
  }
}

const AdsContext = createContext<AdsContextValue>({
  eligible: false,
  eligibilityResolved: false,
  routeEligible: false,
  networkReady: false,
  testMode: false,
  publisherId: null,
  requestNetwork: () => undefined,
  refreshEligibility: () => undefined,
  openPrivacySettings: () => {
    if (typeof window !== "undefined") window.location.assign("/cookies#manage-ads")
  },
})

const configuredPublisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || null
const validPublisherId = configuredPublisherId && /^ca-pub-\d+$/.test(configuredPublisherId)
  ? configuredPublisherId
  : null
const configuredTestMode = process.env.NEXT_PUBLIC_ADS_TEST_MODE === "true"

export function AdProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const routeEligible = isMonetizedPathname(pathname)
  const [eligible, setEligible] = useState(false)
  const [eligibilityResolved, setEligibilityResolved] = useState(false)
  const [networkRequested, setNetworkRequested] = useState(false)
  const [networkReady, setNetworkReady] = useState(false)
  const activeEligibilityRequest = useRef<AbortController | null>(null)
  const eligibilityRequestId = useRef(0)

  const refreshEligibility = useCallback(() => {
    activeEligibilityRequest.current?.abort()
    const requestId = ++eligibilityRequestId.current

    // Always revoke the client-side advertising grant before checking again.
    setEligible(false)
    setEligibilityResolved(false)
    setNetworkRequested(false)

    if (!routeEligible) {
      setEligibilityResolved(true)
      return
    }

    const controller = new AbortController()
    activeEligibilityRequest.current = controller

    void fetch("/api/subscription", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() as Promise<{ showAds?: boolean }> : null)
      .then((entitlements) => {
        if (requestId !== eligibilityRequestId.current) return
        setEligible(entitlements?.showAds === true)
      })
      .catch((error: unknown) => {
        if (requestId !== eligibilityRequestId.current) return
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // Fail closed: an uncertain subscription state must never show ads.
          setEligible(false)
        }
      })
      .finally(() => {
        if (requestId === eligibilityRequestId.current) {
          setEligibilityResolved(true)
          activeEligibilityRequest.current = null
        }
      })
  }, [routeEligible])

  useEffect(() => {
    // A pathname change starts a new demand cycle. The network is requested
    // only after an eligible slot approaches the viewport on that route.
    const eligibilityFrame = window.requestAnimationFrame(refreshEligibility)
    return () => {
      window.cancelAnimationFrame(eligibilityFrame)
      activeEligibilityRequest.current?.abort()
    }
  }, [pathname, refreshEligibility])

  const requestNetwork = useCallback(() => {
    if (
      !routeEligible ||
      !eligibilityResolved ||
      !eligible ||
      configuredTestMode ||
      !validPublisherId
    ) return
    setNetworkRequested(true)
  }, [eligibilityResolved, eligible, routeEligible])

  const openPrivacySettings = useCallback(() => {
    const googlefc = window.googlefc
    if (googlefc?.showRevocationMessage) {
      googlefc.callbackQueue = googlefc.callbackQueue || []
      googlefc.callbackQueue.push(googlefc.showRevocationMessage)
      return
    }
    window.location.assign("/cookies#manage-ads")
  }, [])

  const value = useMemo(() => ({
    eligible,
    eligibilityResolved,
    routeEligible,
    networkReady: configuredTestMode ? eligible : networkReady,
    testMode: configuredTestMode,
    publisherId: validPublisherId,
    requestNetwork,
    refreshEligibility,
    openPrivacySettings,
  }), [
    eligible,
    eligibilityResolved,
    networkReady,
    openPrivacySettings,
    refreshEligibility,
    requestNetwork,
    routeEligible,
  ])

  const shouldLoadNetwork = (
    routeEligible &&
    eligibilityResolved &&
    eligible &&
    networkRequested &&
    Boolean(validPublisherId) &&
    !configuredTestMode
  )

  return (
    <AdsContext.Provider value={value}>
      {children}
      {shouldLoadNetwork ? (
        <Script
          id="namolux-adsense"
          async
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${validPublisherId}`}
          onLoad={() => setNetworkReady(true)}
          onReady={() => setNetworkReady(true)}
          onError={() => setNetworkReady(false)}
        />
      ) : null}
    </AdsContext.Provider>
  )
}

export function useAds() {
  return useContext(AdsContext)
}

export function PrivacyChoicesButton({ className = "" }: { className?: string }) {
  const { openPrivacySettings } = useAds()
  return (
    <button type="button" onClick={openPrivacySettings} className={className}>
      Privacy &amp; cookie settings
    </button>
  )
}
