"use client"

// Lightweight analytics for NamoLux
// Tracks anonymous sessions and events for business insights

const SESSION_KEY = "namo_session_id"
const SESSION_CREATED_KEY = "namo_session_created"
const SESSION_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

type AnalyticsStorage = Pick<Storage, "getItem" | "setItem">

function generateSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function getOrCreateSessionId(storage: AnalyticsStorage, now = Date.now()): string {
  let sessionId = storage.getItem(SESSION_KEY)
  const sessionCreated = storage.getItem(SESSION_CREATED_KEY)
  
  // Check if session is expired (30 min of inactivity)
  if (sessionId && sessionCreated) {
    const lastActivity = Number.parseInt(sessionCreated, 10)
    if (!Number.isFinite(lastActivity) || now - lastActivity > SESSION_EXPIRY_MS || lastActivity > now + 60_000) {
      // Session expired, create new one
      sessionId = null
    }
  }
  
  if (!sessionId) {
    sessionId = generateSessionId()
    storage.setItem(SESSION_KEY, sessionId)
  }
  
  // Update session activity timestamp
  storage.setItem(SESSION_CREATED_KEY, now.toString())
  
  return sessionId
}

export function getSessionId(): string {
  if (typeof window === "undefined") return ""

  try {
    return getOrCreateSessionId(window.localStorage)
  } catch {
    // Privacy modes can disable localStorage. Keep analytics non-blocking.
    return ""
  }
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
  | "blog_view"
  | "generate_started"
  | "quick_generate_started"
  | "quick_generate_results"
  | "results_seen"
  | "upgrade_clicked"
  | "upgrade_offer_seen"
  | "checkout_started"
  | "checkout_success"
  | "rate_limit_seen"
  | "partner_cta_seen"
  | "shortlist_created"
  | "launch_kit_started"
  | "domain_register_clicked"
  | "brand_export_clicked"
  | "engaged_10s"
  | "engaged_30s"
  | "scroll_50"
  | "scroll_90"
  | "content_cta_seen"
  | "content_cta_clicked"
  | "brief_submitted"
  | "pricing_viewed"
  | "checkout_intent"
  | "decision_action"
  | "names_visible"
  | "save"
  | "dislike"
  | "more_like_this"
  | "advanced_started"
  | "founder_signal_clicked"
  | "founder_signal_scored"
  | "batch_scored"
  | "decision_saved"
  | "decision_report_created"
  | "report_share_created"
  | "score_sort_used"
  | "pricing_clicked"

export type AnalyticsMetadata = Partial<{
  source: string
  contentSlug: string
  topic: string
  ctaId: string
  device: "desktop" | "mobile" | "tablet"
  experiment: string
  decisionAction: "shortlist" | "compare" | "register" | "pricing" | "brand_kit"
}>

const CLIENT_METADATA_KEYS = new Set<keyof AnalyticsMetadata>([
  "source", "contentSlug", "topic", "ctaId", "device", "experiment", "decisionAction",
])

export function sanitizeAnalyticsMetadata(metadata: Record<string, unknown> | undefined): AnalyticsMetadata | undefined {
  if (!metadata) return undefined
  const sanitized: Record<string, string> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!CLIENT_METADATA_KEYS.has(key as keyof AnalyticsMetadata) || typeof value !== "string") continue
    sanitized[key] = value
  }
  return Object.keys(sanitized).length > 0 ? sanitized as AnalyticsMetadata : undefined
}

interface TrackEventOptions {
  action: AnalyticsEvent
  metadata?: Record<string, unknown>
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
      keepalive: true,
      body: JSON.stringify({
        action: options.action,
        metadata: sanitizeAnalyticsMetadata(options.metadata),
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
export function trackAffiliateClick(domain: string, metadata: Record<string, unknown> = {}): void {
  trackEvent({
    action: "affiliate_click",
    // Domains and generated names are intentionally excluded from analytics.
    metadata: { source: typeof metadata.source === "string" ? metadata.source : "affiliate" },
  })
}

// Track page views
export function trackPageView(route?: string): void {
  trackEvent({
    action: "page_view",
    route,
  })
}
