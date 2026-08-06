import type { Metadata } from "next"
import Link from "next/link"
import { Check, ExternalLink, Search, Shield, Sparkles, Zap } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { RestorePurchase } from "@/components/restore-purchase"
import { PricingViewed, TrackedCheckoutLink } from "@/components/pricing-tracking"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { parsePricingAttribution, withPricingAttribution } from "@/lib/pricing-attribution"
import { PUBLIC_PRODUCT_COPY } from "@/lib/site-content"

export const metadata: Metadata = {
  title: "Pricing | NamoLux",
  description: `Start with ${PRODUCT_OFFER.freeUsageLabel} on the ad-supported free plan, or upgrade to ${PRODUCT_OFFER.paidPlanName} for ${PRODUCT_OFFER.paidPriceLabel} with 120 Bulk Check and 120 Founder Signal runs each UTC calendar month.`,
  alternates: {
    canonical: "/pricing",
  },
}

type PricingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams
  const redirectReason = getParamValue(params?.reason)
  const redirectSource = getParamValue(params?.from)
  const checkoutStatus = getParamValue(params?.checkout)
  const attribution = parsePricingAttribution({
    source: params?.source,
    content: params?.content,
    return: params?.return,
  })
  const checkoutHref = withPricingAttribution(PRODUCT_OFFER.paidCheckoutHref, attribution)
  const isLimitRedirect = redirectReason === "monthly-limit"
  const sourceLabel = redirectSource === "bulk-check"
    ? "bulk domain checks"
    : redirectSource === "founder-signal"
      ? "Founder Signal scoring"
      : "NamoLux tools"
  const checkoutNotice = checkoutStatus === "cancelled"
    ? "Checkout was cancelled. Your plan has not changed."
    : checkoutStatus === "unavailable"
      ? "Checkout is temporarily unavailable. Please try again later or contact support."
      : checkoutStatus === "failed"
        ? "We could not start checkout. Please try again or contact support."
        : null

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <PricingViewed attribution={attribution} />
      <Navbar />
      <main id="main-content" className="flex-1 px-4 pb-12 pt-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.26em] text-[#D4A843]">
              Pricing
            </p>
            <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
              Start free. Upgrade when the decision deserves more.
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-[#999]">
              The ad-supported free tier includes {PRODUCT_OFFER.freeUsageLabel}. {PRODUCT_OFFER.paidPlanName} is a £7.99 decision workspace with {PUBLIC_PRODUCT_COPY.proPlanSummary.toLowerCase()} Saved decisions, CSV exports, shareable reports, and an ad-free workspace are included.
            </p>
          </div>

          {isLimitRedirect && (
            <div className="mx-auto mb-8 max-w-4xl rounded-2xl border border-[#D4A843]/35 bg-[#D4A843]/10 p-5 text-center">
              <p className="text-sm font-semibold text-[#F3D98B]">
                You have reached the free monthly limit for {sourceLabel}.
              </p>
              <p className="mt-1 text-sm text-[#b9a878]">
                Upgrade to continue with the full 120-run decision workspace, saved decisions, and exports.
              </p>
            </div>
          )}

          {checkoutNotice && (
            <div role="status" className="mx-auto mb-8 max-w-4xl rounded-xl border border-[#D4A843]/35 bg-[#D4A843]/10 p-5 text-center">
              <p className="text-sm font-semibold text-[#F3D98B]">{checkoutNotice}</p>
              <p className="mt-1 text-sm text-[#b9a878]">
                Pro remains {PRODUCT_OFFER.paidPriceLabel}. {PRODUCT_OFFER.cancellationLabel}
              </p>
            </div>
          )}

          <div id="plans" className="mx-auto grid max-w-4xl scroll-mt-28 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#244231] bg-[#101714] p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
                <Search className="h-6 w-6 text-emerald-300" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold text-white">{PRODUCT_OFFER.freePlanName}</h2>
              <p className="mb-6 text-sm text-[#9aa59f]">
                Bring a shortlist and make a focused decision with a useful monthly allowance.
              </p>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">{PRODUCT_OFFER.tiers[0].price}</span>
                <span className="text-[#777]">{PRODUCT_OFFER.tiers[0].billingLabel}</span>
              </div>
              <Link
                href="/bulk-domain-check"
                className="mb-8 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                <Sparkles className="h-4 w-4" />
                {PRODUCT_OFFER.freeCtaLabel}
              </Link>
              <ul className="space-y-3">
                {PRODUCT_OFFER.freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-[#b7c0ba]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative rounded-2xl border border-[#D4A843]/40 bg-gradient-to-b from-[#1a1815] to-[#141414] p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4A843] px-4 py-1 text-xs font-bold text-black">
                DECISION WORKSPACE
              </div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[#D4A843]/25 bg-[#D4A843]/10">
                <Zap className="h-6 w-6 text-[#D4A843]" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold text-white">{PRODUCT_OFFER.paidPlanName}</h2>
              <p className="mb-6 text-sm text-[#999]">
                {PRODUCT_OFFER.tiers[1].description}
              </p>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">{PRODUCT_OFFER.paidPrice}</span>
                <span className="text-[#777]">{PRODUCT_OFFER.paidBillingLabel}</span>
              </div>
              <TrackedCheckoutLink
                href={checkoutHref}
                attribution={attribution}
                ctaId="pricing_pro_primary"
                className="mb-8 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#D4A843] px-6 py-3 font-semibold text-black transition hover:bg-[#c49a3d]"
              >
                <Zap className="h-4 w-4" />
                {PRODUCT_OFFER.proCtaLabel}
              </TrackedCheckoutLink>
              <p className="-mt-5 mb-7 text-center text-xs leading-relaxed text-[#8f887c]">
                Already signed in? You will continue securely to Stripe. Otherwise, sign in or create an account first, then checkout resumes automatically.
              </p>
              <ul className="space-y-3">
                {PUBLIC_PRODUCT_COPY.proPlanFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-white">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A843]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <RestorePurchase />

          <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">How do the free allowances work?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#999]">
                  Free includes {PRODUCT_OFFER.freeMonthlyUses} Bulk Check runs and {PRODUCT_OFFER.freeFounderSignalBatches} Founder Signal run each month. Pro includes {PUBLIC_PRODUCT_COPY.proPlanSummary.toLowerCase()} It adds saved projects, CSV exports, and shareable decision reports. {PUBLIC_PRODUCT_COPY.renewalNote}
                </p>
              </div>
              <Link
                href="/bulk-domain-check"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#D4A843]/25 px-4 text-sm font-semibold text-[#D4A843] transition hover:bg-[#D4A843]/10"
              >
                {PRODUCT_OFFER.freeCtaLabel}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-2xl text-center">
            <p className="text-sm text-[#666]">
              <Shield className="mr-1 inline h-4 w-4" />
              {PRODUCT_OFFER.caveats.join(" ")}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-[#777]">
              Pro is built for a founder&apos;s shortlist decision, with saved evidence and clear comparisons instead of an oversized suite.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
