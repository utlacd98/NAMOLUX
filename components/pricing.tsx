import Link from "next/link"
import { Check, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Pricing() {
  const features = [
    "Unlimited domain generation",
    "All brand vibes & industries",
    "Founder Signal™ scoring",
    "SEO Potential checks",
    "Multi-TLD support (.com, .io, .ai, .co)",
    "Social handle checking",
    "Export to CSV",
    "Priority support",
  ]

  return (
    <section id="pricing" className="py-24" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn("text-center animate-fade-up")}
          style={{ animationFillMode: "forwards" }}
        >
          <h2
            id="pricing-heading"
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Simple pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            One plan, everything included. Cancel anytime.
          </p>
        </div>

        {/* Single Pricing Card */}
        <div
          className={cn("mt-12 animate-fade-up")}
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-card p-8 shadow-xl sm:p-10">
            {/* Popular badge */}
            <div className="absolute -right-12 top-6 rotate-45 bg-primary px-12 py-1 text-xs font-semibold text-primary-foreground">
              Best Value
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-foreground">Pro</h3>
              <p className="mt-2 text-muted-foreground">
                Everything you need to find the perfect domain
              </p>

              <div className="mt-6 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-foreground">£9.99</span>
                <span className="text-lg text-muted-foreground">/month</span>
              </div>

              <Button asChild size="lg" className="mt-8 w-full max-w-sm px-8 py-6 text-lg font-semibold">
                <Link href="/api/stripe/checkout">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Get Started
                </Link>
              </Button>

              <p className="mt-4 text-sm text-muted-foreground">
                Cancel anytime • No hidden fees
              </p>
            </div>

            {/* Features */}
            <div className="mt-10 border-t border-border pt-8">
              <h4 className="text-sm font-semibold text-foreground mb-4">
                Everything included:
              </h4>
              <ul className="grid gap-3 sm:grid-cols-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Free tier note */}
        <div
          className={cn("mt-8 text-center animate-fade-up")}
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          <p className="text-sm text-muted-foreground">
            <Zap className="inline h-4 w-4 mr-1 text-primary" />
            Try 1 free generation per day before subscribing •{" "}
            <Link href="/generate" className="text-primary hover:underline">
              Start free →
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
