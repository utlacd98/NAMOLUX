import Link from "next/link"
import { Check, ExternalLink, Lock, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { PUBLIC_PRODUCT_COPY } from "@/lib/site-content"
import { cn } from "@/lib/utils"

export function Pricing() {
  return (
    <section id="pricing" className="py-10 sm:py-16 lg:py-24" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className={cn("text-center animate-fade-up")} style={{ animationFillMode: "forwards" }}>
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple pricing for naming work
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Start with one curated Name Sprint per UTC day, plus focused shortlist allowances. Pro adds 40 Name Sprints, 120 Bulk Checks, 120 Founder Signal runs, and 10 Brand Launch Kits each month.
          </p>
        </div>

        <div
          className={cn("mt-12 grid gap-5 md:grid-cols-2 animate-fade-up")}
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{PRODUCT_OFFER.freePlanName}</h3>
            <p className="mt-2 text-muted-foreground">Generate a curated set or bring a shortlist and make a focused decision before spending anything.</p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-foreground">{PRODUCT_OFFER.tiers[0].price}</span>
              <span className="text-muted-foreground">{PRODUCT_OFFER.tiers[0].billingLabel}</span>
            </div>
            <Button asChild size="lg" variant="outline" className="mt-8 w-full px-8 py-6 text-base font-semibold">
              <Link href="/generate">
                <Sparkles className="mr-2 h-5 w-5" />
                Start a Name Sprint
              </Link>
            </Button>
            <ul className="mt-8 space-y-3">
              {PRODUCT_OFFER.freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-2xl border border-primary/40 bg-card p-8 shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
              BEST VALUE
            </div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{PRODUCT_OFFER.paidPlanName}</h3>
            <p className="mt-2 text-muted-foreground">Generate more often, compare and save decisions, then turn the winner into a Brand Launch Kit.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <div className="rounded-xl border border-border p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly</p><p className="mt-2 text-3xl font-bold text-foreground">{PRODUCT_OFFER.paidPrice}<span className="ml-1 text-sm font-normal text-muted-foreground">/month</span></p></div>
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-primary">Annual · best value</p><p className="mt-2 text-3xl font-bold text-foreground">{PRODUCT_OFFER.paidAnnualPrice}<span className="ml-1 text-sm font-normal text-muted-foreground">/year</span></p><p className="mt-1 text-xs text-primary">£8.25/month equivalent</p></div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <Button asChild size="lg" variant="outline" className="px-4 py-6 text-base font-semibold"><Link href={`${PRODUCT_OFFER.paidCheckoutHref}?billing=monthly`}>Choose monthly</Link></Button>
              <Button asChild size="lg" className="px-4 py-6 text-base font-semibold"><Link href={`${PRODUCT_OFFER.paidCheckoutHref}?billing=annual`}><Zap className="mr-2 h-5 w-5" />Choose annual</Link></Button>
            </div>
            <ul className="mt-8 space-y-3">
              {PUBLIC_PRODUCT_COPY.proPlanFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={cn("mt-8 flex flex-col items-center justify-center gap-2 text-center animate-fade-up")}
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 text-primary" />
            No free trial. Billing starts at checkout. Cancel any time through the billing portal.
          </p>
          <p className="text-sm text-muted-foreground">
            Domain registration links may use our Namecheap partner link.{" "}
            <Link href="/pricing" className="inline-flex items-center gap-1 text-primary hover:underline">
              Learn more <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
