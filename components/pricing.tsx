"use client"

import Link from "next/link"
import { Check, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Free Trial",
    price: "£0",
    credits: "5 credits",
    description: "Try it out, no card required",
    features: ["5 domain checks", "AI chat brainstorming", "Basic shortlist"],
    cta: "Get started",
    href: "/generate",
    popular: false,
  },
  {
    name: "Starter Pack",
    price: "£5",
    credits: "25 credits",
    description: "For indie hackers and side projects",
    features: ["25 domain checks", "All vibe modes", "Export to CSV", "Email support"],
    cta: "Get Starter",
    href: "/checkout/starter",
    popular: false,
  },
  {
    name: "Pro Pack",
    price: "£15",
    credits: "100 credits",
    description: "For serious founders building brands",
    features: ["100 domain checks", "Priority generation speed", "Export to Notion & Airtable", "Priority support"],
    cta: "Get Pro",
    href: "/checkout/pro",
    popular: true,
  },
  {
    name: "Agency Pack",
    price: "£29",
    credits: "250 credits",
    description: "For agencies and high-volume users",
    features: [
      "250 domain checks",
      "Fastest generation speed",
      "Team workspaces",
      "All export options",
      "Dedicated support",
    ],
    cta: "Get Agency",
    href: "/checkout/agency",
    popular: false,
    bestValue: true,
  },
]

export function Pricing() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="pricing" className="py-24" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, one-time pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Buy credits when you need them. No subscriptions, no recurring fees.
          </p>
        </div>

        <div ref={ref} className="mt-16 grid gap-6 lg:grid-cols-4">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 opacity-0",
                plan.popular ? "gradient-border border-transparent shadow-2xl shadow-primary/10" : "border-border",
                isVisible && "animate-fade-up",
              )}
              style={{
                animationDelay: `${index * 0.1}s`,
                animationFillMode: "forwards",
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </div>
              )}
              {plan.bestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                  Best Value
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-2">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="ml-1 text-sm text-muted-foreground">one-time</span>
              </div>

              {/* Credits badge */}
              <div className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
                <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                {plan.credits}
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  "w-full",
                  plan.popular
                    ? "animate-breathing-glow bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-foreground hover:bg-muted/80",
                )}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            <Coins className="mr-1 inline-block h-4 w-4 text-accent" />1 credit = 1 domain availability check · No
            subscriptions · Credits never expire
          </p>
        </div>

        {/* Compare packs mini row */}
        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-xl border border-border/50 bg-card/50">
          <div className="grid grid-cols-4 gap-px bg-border/30 text-center text-sm">
            <div className="bg-card p-3 font-medium text-foreground">Feature</div>
            <div className="bg-card p-3 text-muted-foreground">Starter</div>
            <div className="bg-card p-3 text-muted-foreground">Pro</div>
            <div className="bg-card p-3 text-muted-foreground">Agency</div>
          </div>
          <div className="grid grid-cols-4 gap-px bg-border/30 text-center text-sm">
            <div className="bg-card/80 p-3 text-muted-foreground">Checks</div>
            <div className="bg-card/80 p-3 text-foreground">25</div>
            <div className="bg-card/80 p-3 text-foreground">100</div>
            <div className="bg-card/80 p-3 text-foreground">250</div>
          </div>
          <div className="grid grid-cols-4 gap-px bg-border/30 text-center text-sm">
            <div className="bg-card/80 p-3 text-muted-foreground">Shortlist export</div>
            <div className="bg-card/80 p-3 text-foreground">CSV</div>
            <div className="bg-card/80 p-3 text-foreground">All formats</div>
            <div className="bg-card/80 p-3 text-foreground">All formats</div>
          </div>
          <div className="grid grid-cols-4 gap-px bg-border/30 text-center text-sm">
            <div className="bg-card/80 p-3 text-muted-foreground">Priority speed</div>
            <div className="bg-card/80 p-3 text-muted-foreground">—</div>
            <div className="bg-card/80 p-3 text-primary">Yes</div>
            <div className="bg-card/80 p-3 text-primary">Fastest</div>
          </div>
        </div>
      </div>
    </section>
  )
}
