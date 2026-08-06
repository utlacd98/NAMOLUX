/** The public decision-workspace allowances reset on the first UTC day. */
export const FREE_MONTHLY_BULK_CHECK_LIMIT = 3
export const PRO_MONTHLY_BULK_CHECK_LIMIT = 120
export const FREE_ADVANCED_GENERATION_LIMIT = 3
export const FREE_FOUNDER_SIGNAL_BATCH_LIMIT = 1
export const PRO_FOUNDER_SIGNAL_BATCH_LIMIT = 120

/** @deprecated Use FREE_MONTHLY_BULK_CHECK_LIMIT for new decision-workspace code. */
export const FREE_MONTHLY_USAGE_LIMIT = FREE_MONTHLY_BULK_CHECK_LIMIT

export const PLAN_IDS = ["free", "pro"] as const
export type PlanId = (typeof PLAN_IDS)[number]

export const ENTITLEMENT_SOURCES = ["free", "legacy_lifetime", "subscription"] as const
export type EntitlementSource = (typeof ENTITLEMENT_SOURCES)[number]

export type PlanConfig = {
  id: PlanId
  name: string
  shortName: string
  price: string
  billingLabel: string
  description: string
  isPaid: boolean
  adFree: boolean
  unlimitedUsage: boolean
  monthlyUsageLimit: number
  bulkCheckMonthlyLimit: number
  quickGenerationUnlimited: boolean
  advancedGenerationMonthlyLimit: number
  founderSignalBatchMonthlyLimit: number
  canUseBrandPalette: boolean
  features: string[]
}

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    shortName: "Free",
    price: "\u00a30",
    billingLabel: "free",
    description: "Three bulk shortlist checks and one complete Founder Signal batch each month.",
    isPaid: false,
    adFree: false,
    unlimitedUsage: false,
    monthlyUsageLimit: FREE_MONTHLY_BULK_CHECK_LIMIT,
    bulkCheckMonthlyLimit: FREE_MONTHLY_BULK_CHECK_LIMIT,
    quickGenerationUnlimited: true,
    advancedGenerationMonthlyLimit: FREE_ADVANCED_GENERATION_LIMIT,
    founderSignalBatchMonthlyLimit: FREE_FOUNDER_SIGNAL_BATCH_LIMIT,
    canUseBrandPalette: false,
    features: [
      "3 bulk shortlist checks per month",
      "Up to 50 candidate names per batch",
      "1 complete Founder Signal batch per month",
      "Live checks across six domain extensions",
      "Clear available, unavailable, or verify states",
      "Advertising-supported",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    shortName: "Pro",
    price: "\u00a37.99",
    billingLabel: "per month",
    description: "A focused decision workspace for choosing a name with confidence.",
    isPaid: true,
    adFree: true,
    unlimitedUsage: false,
    monthlyUsageLimit: PRO_MONTHLY_BULK_CHECK_LIMIT,
    bulkCheckMonthlyLimit: PRO_MONTHLY_BULK_CHECK_LIMIT,
    quickGenerationUnlimited: true,
    advancedGenerationMonthlyLimit: -1,
    founderSignalBatchMonthlyLimit: PRO_FOUNDER_SIGNAL_BATCH_LIMIT,
    canUseBrandPalette: false,
    features: [
      "120 bulk shortlist checks per month",
      "120 Founder Signal runs per month",
      "Saved projects, notes, tiering, and CSV exports",
      "Immutable decision reports with revocable view-only links",
      "Live checks across six domain extensions",
      "Ad-free experience",
      "Cancel through the billing portal",
    ],
  },
}

export const TOKEN_METERED_FEATURES = [
  "quick",
  "domain",
  "bulk",
  "seo",
  "deep-search",
  "analyze",
  "name-tools",
  "ai-chat",
] as const

export function normalizePlan(plan: string | null | undefined): PlanId {
  const normalized = typeof plan === "string" ? plan.trim().toLowerCase() : ""
  return normalized === "pro" || normalized === "paid" || normalized === "starter" || normalized === "founder"
    ? "pro"
    : "free"
}

export function getPlanConfig(plan: string | null | undefined): PlanConfig {
  return PLAN_CONFIG[normalizePlan(plan)]
}

export function isPaidPlan(plan: string | null | undefined): boolean {
  return getPlanConfig(plan).isPaid
}

export function canUseBrandPalette(plan: string | null | undefined): boolean {
  return getPlanConfig(plan).canUseBrandPalette
}
