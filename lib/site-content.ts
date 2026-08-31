import {
  FREE_FOUNDER_SIGNAL_BATCH_LIMIT,
  FREE_MONTHLY_BULK_CHECK_LIMIT,
  FREE_NAME_SPRINT_DAILY_LIMIT,
  PRO_FOUNDER_SIGNAL_BATCH_LIMIT,
  PRO_MONTHLY_BULK_CHECK_LIMIT,
  PRO_NAME_SPRINT_MONTHLY_LIMIT,
} from "@/lib/plans"

export type SiteLink = {
  readonly href: string
  readonly label: string
}

export const SITE_NAVIGATION = [
  { href: "/generate", label: "Name Sprint" },
  { href: "/bulk-domain-check", label: "Bulk Check" },
  { href: "/founder-signal", label: "Founder Signal" },
  { href: "/brand-launch", label: "Launch Kit" },
  { href: "/blog", label: "Journal" },
  { href: "/pricing", label: "Pricing" },
] as const satisfies readonly SiteLink[]

export const CTA_LABELS = {
  primary: "Start a Name Sprint",
  secondaryProduct: "Check a shortlist",
  editorial: "Open Bulk Check",
  paid: "Start 7-day free trial",
} as const

// This is deliberately presentation copy rather than an entitlement source of
// truth. The billing and quota layers enforce the actual limits; public
// surfaces use these strings so the published offer stays consistent.
export const PUBLIC_PRODUCT_COPY = {
  positioning: "A selective name intelligence and brand launch workspace for founders.",
  freePlanSummary: `${FREE_MONTHLY_BULK_CHECK_LIMIT} Bulk Check runs and ${FREE_FOUNDER_SIGNAL_BATCH_LIMIT} Founder Signal run per UTC calendar month, plus ${FREE_NAME_SPRINT_DAILY_LIMIT} Name Sprint per UTC day.`,
  proPlanSummary: `${PRO_MONTHLY_BULK_CHECK_LIMIT} Bulk Check runs, ${PRO_FOUNDER_SIGNAL_BATCH_LIMIT} Founder Signal runs, and ${PRO_NAME_SPRINT_MONTHLY_LIMIT} Name Sprints per UTC calendar month.`,
  proPlanFeatures: [
    `${PRO_MONTHLY_BULK_CHECK_LIMIT} Bulk Check runs per UTC calendar month`,
    `${PRO_FOUNDER_SIGNAL_BATCH_LIMIT} Founder Signal runs per UTC calendar month`,
    `${PRO_NAME_SPRINT_MONTHLY_LIMIT} curated Name Sprints per UTC calendar month`,
    "Saved projects and shortlist history",
    "CSV exports and shareable decision reports",
    "Live checks across six domain extensions",
    "Direct social-profile, company and official trade-mark verification links",
    "Ad-free workspace",
    "Brand Launch Kit: 10 kits, three palettes, and logo concepts each month",
    "7-day free trial for first-time customers; card required",
    "Cancel through the billing portal",
  ],
  renewalNote: "Usage resets at the start of each UTC calendar month.",
} as const

export const SITE_ACTIONS = {
  signIn: { href: "/sign-in", label: "Sign in" },
  dashboard: { href: "/dashboard", label: "Dashboard" },
  startNaming: { href: "/generate", label: CTA_LABELS.primary },
} as const satisfies Record<string, SiteLink>

export const DOMAIN_EXTENSIONS = [".com", ".io", ".co", ".ai", ".app", ".dev"] as const

export const PRODUCT_CAPABILITIES = {
  supportsNameGeneration: true,
  supportsDomainAvailability: true,
  supportsFounderSignal: true,
  supportsShortlistComparison: true,
  supportsSocialHandleCheck: false,
  supportsTrademarkClearance: false,
} as const

export const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/founder-story", label: "Founder story" },
  { href: "/generate", label: "Name Sprint" },
  { href: "/bulk-domain-check", label: "Bulk Check" },
  { href: "/founder-signal", label: "Founder Signal" },
  { href: "/brand-launch", label: "Brand Launch Kit" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Journal" },
  { href: "/journal/andrew-barrett", label: "Founder profile" },
  { href: "/editorial-standards", label: "Editorial standards" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
] as const satisfies readonly SiteLink[]

export const LEGAL_CAVEATS = {
  domainAvailability:
    "Domain availability is checked live on a best-effort basis and should be confirmed with your registrar before purchase.",
  separateChecks:
    "NamoLux provides verification links for social profiles, company names and official trade-mark searches; these remain separate from domain availability and legal clearance.",
  founderSignal:
    "Founder Signal supports judgment. It is not legal or trademark advice.",
  affiliate:
    "NamoLux may earn a commission if you register through our partner.",
} as const

export const SITE_CONTENT = {
  brandName: "NamoLux",
  navigation: SITE_NAVIGATION,
  actions: SITE_ACTIONS,
  ctaLabels: CTA_LABELS,
  productCopy: PUBLIC_PRODUCT_COPY,
  domainExtensions: DOMAIN_EXTENSIONS,
  capabilities: PRODUCT_CAPABILITIES,
  footerLinks: FOOTER_LINKS,
  legalCaveats: LEGAL_CAVEATS,
} as const
