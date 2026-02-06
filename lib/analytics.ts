"use client"

// Lightweight analytics for NamoLux
// Tracks anonymous sessions and events for business insights

const SESSION_KEY = "namo_session_id"
const SESSION_CREATED_KEY = "namo_session_created"
const SESSION_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

function generateSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function getSessionId(): string {
  if (typeof window === "undefined") return ""
  
  let sessionId = localStorage.getItem(SESSION_KEY)
  const sessionCreated = localStorage.getItem(SESSION_CREATED_KEY)
  const now = Date.now()
  
  // Check if session is expired (30 min of inactivity)
  if (sessionId && sessionCreated) {
    const created = parseInt(sessionCreated, 10)
    if (now - created > SESSION_EXPIRY_MS) {
      // Session expired, create new one
      sessionId = null
    }
  }
  
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  
  // Update session activity timestamp
  localStorage.setItem(SESSION_CREATED_KEY, now.toString())
  
  return sessionId
}

export function getDeviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop"
  
  const ua = navigator.userAgent.toLowerCase()
  
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return "tablet"
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return "mobile"
  }
  return "desktop"
}

export function getReferrer(): string {
  if (typeof window === "undefined") return ""
  return document.referrer || ""
}

export function getCurrentRoute(): string {
  if (typeof window === "undefined") return ""
  return window.location.pathname
}

export type AnalyticsEvent = 
  | "name_generation" 
  | "bulk_check" 
  | "seo_audit" 
  | "affiliate_click"
  | "page_view"

interface TrackEventOptions {
  action: AnalyticsEvent
  metadata?: Record<string, any>
  route?: string
}

export async function trackEvent(options: TrackEventOptions): Promise<void> {
  try {
    const sessionId = getSessionId()
    const device = getDeviceType()
    const referrer = getReferrer()
    const route = options.route || getCurrentRoute()
    
    await fetch("/api/metrics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: options.action,
        metadata: options.metadata,
        sessionId,
        device,
        referrer,
        route,
      }),
    }).catch(() => {
      // Silently fail - don't block user experience
    })
  } catch {
    // Silently fail
  }
}

// Track affiliate clicks specifically
export function trackAffiliateClick(domain: string): void {
  trackEvent({
    action: "affiliate_click",
    metadata: { domain },
  })
}

// Track page views
export function trackPageView(route?: string): void {
  trackEvent({
    action: "page_view",
    route,
  })
}

