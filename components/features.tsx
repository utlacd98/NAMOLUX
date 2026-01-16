"use client"

import { Globe, Palette, Download, MessageSquare, Zap, Lightbulb, Star } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Brainstorming",
    description: "Describe your brand vision in natural language and let AI generate creative, relevant name ideas.",
    highlight: true,
  },
  {
    icon: Zap,
    title: "Auto domain verification",
    description: "Every suggested name is instantly checked against live registrar data—no manual lookups needed.",
    highlight: false,
  },
  {
    icon: Globe,
    title: "Availability-first suggestions",
    description: "We prioritize names with available .com domains so you never fall in love with a taken name.",
    highlight: false,
  },
  {
    icon: Download,
    title: "Shortlist & export",
    description: "Save your favorites and export to CSV, Notion, or Airtable in a single click.",
    highlight: false,
  },
  {
    icon: Palette,
    title: "Vibe modes",
    description: "Choose from Luxury, Futuristic, Playful, or Trustworthy to match your brand personality.",
    highlight: false,
  },
  {
    icon: Lightbulb,
    title: "SEO-friendly naming guidance",
    description: "Get tips on creating memorable, brandable names that work well for online discovery.",
    highlight: false,
  },
]

export function Features() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="features" className="py-24" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to find
            <br />
            <span className="text-primary">the perfect domain</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            A powerful AI chat assistant and domain availability checker built for speed, creativity, and results.
          </p>
        </div>

        <div ref={ref} className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={cn(
                  "group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                  "opacity-0",
                  isVisible && "animate-fade-up",
                )}
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: "forwards",
                }}
              >
                {feature.highlight && (
                  <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    New
                  </div>
                )}
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
