"use client"

import { CreditCard, MessageSquare, Globe } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { cn } from "@/lib/utils"

const steps = [
  {
    icon: CreditCard,
    title: "Buy a pack",
    description: "One-time purchase, no recurring fees. Pick the pack that fits your project.",
  },
  {
    icon: MessageSquare,
    title: "Chat & generate names",
    description: "Brainstorm with AI to explore brand directions and get creative suggestions.",
  },
  {
    icon: Globe,
    title: "We auto-check domains",
    description: "Credits deduct only when we verify availability—chatting is on us.",
  },
]

export function HowCreditsWork() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="credits" className="bg-muted/30 py-24" aria-labelledby="credits-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 id="credits-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple credits.{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              No subscriptions.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Pay once, use when you need. No monthly fees, no commitment.
          </p>
        </div>

        <div ref={ref} className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className={cn(
                  "group relative flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card",
                  "opacity-0",
                  isVisible && "animate-fade-up",
                )}
                style={{
                  animationDelay: `${index * 0.15}s`,
                  animationFillMode: "forwards",
                }}
              >
                {/* Step number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>

                <div className="mb-5 inline-flex rounded-xl bg-primary/10 p-4 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="h-8 w-8" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            )
          })}
        </div>

        {/* Note */}
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Only availability checks consume credits. Brainstorming stays focused and efficient.
        </p>
      </div>
    </section>
  )
}
