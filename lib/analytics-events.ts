export const ANALYTICS_EVENTS = [
  "name_generation", "bulk_check", "seo_audit", "affiliate_click", "page_view", "blog_view",
  "generate_started", "quick_generate", "quick_generate_started", "quick_generate_results", "results_seen",
  "upgrade_offer_seen", "upgrade_clicked", "checkout_started", "checkout_success", "rate_limit_seen",
  "partner_cta_seen", "shortlist_created", "launch_kit_viewed", "launch_kit_started", "domain_register_clicked", "brand_export_clicked",
  "engaged_10s", "engaged_30s", "scroll_50", "scroll_90", "content_cta_seen", "content_cta_clicked",
  "brief_submitted", "pricing_viewed", "checkout_intent", "decision_action", "names_visible", "save", "dislike",
  "more_like_this", "advanced_started", "founder_signal_clicked", "founder_signal_scored", "batch_scored",
  "decision_saved", "decision_report_created", "report_share_created", "score_sort_used", "pricing_clicked",
  // Canonical acquisition-to-revenue funnel. Legacy events above remain for dashboard continuity.
  "seo_landing_view", "generator_opened", "generator_started", "generation_completed", "domain_checked",
  "result_expanded", "founder_signal_viewed", "result_saved", "signup_started", "signup_completed",
  "checkout_auth_required", "checkout_auth_completed", "checkout_failed",
  "trial_started", "purchase_completed",
] as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]

const analyticsEventSet = new Set<string>(ANALYTICS_EVENTS)

export function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return typeof value === "string" && analyticsEventSet.has(value)
}
