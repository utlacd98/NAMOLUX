import { Globe, Download, MessageSquare, Zap, Lightbulb, Star } from "lucide-react"
import { Reveal, SectionHeader } from "@/components/landing/reveal"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: Star,
    title: "Founder Signal™ scoring",
    description:
      "Every name graded 0–100 on brand strength, memorability, phonetic punch, and realness. Elite-tier scoring so you can tell a 95 from a 75 at a glance.",
    highlight: true,
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    icon: Zap,
    title: "Live availability across 6 TLDs",
    description:
      "Every name on your shortlist is verified against .com, .io, .co, .ai, .app and .dev via multi-source DNS and RDAP. No wasted cycles on taken domains.",
    highlight: false,
    span: "lg:col-span-1",
  },
  {
    icon: Lightbulb,
    title: "Brand-consultant reasoning",
    description:
      "Each score comes with a breakdown — why the name works or doesn't, its best use case, and a clear verdict so you can defend the decision.",
    highlight: false,
    span: "lg:col-span-1",
  },
  {
    icon: MessageSquare,
    title: "Stress-test panel",
    description:
      "Run each candidate through pronunciation, trademark conflict, category fit, and longevity checks. See how a name holds up under pressure.",
    highlight: false,
    span: "lg:col-span-1",
  },
  {
    icon: Download,
    title: "Shortlist & export",
    description: "Save your shortlist and export the full Founder Signal report as CSV for team sign-off.",
    highlight: false,
    span: "lg:col-span-1",
  },
  {
    icon: Globe,
    title: "Bulk check up to 50",
    description: "Paste your whole shortlist in one go. Score, rank, and compare 50 candidates side by side in seconds.",
    highlight: false,
    span: "sm:col-span-2 lg:col-span-4",
  },
]

export function Features() {
  return (
    <section id="features" className="relative overflow-clip py-16 sm:py-24 lg:py-32" aria-labelledby="features-heading">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 15% 20%, rgba(212,175,55,0.05), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="The Toolkit"
          headingId="features-heading"
          heading={
            <>
              A brand consultant&apos;s toolkit,
              <br />
              <span className="text-primary">built into the product</span>
            </>
          }
          sub="NamoLux scores, verifies, and stress-tests every name on your shortlist — the analysis a consultancy would run, delivered in seconds."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4 lg:[grid-auto-rows:minmax(160px,auto)]">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Reveal
                key={feature.title}
                delay={0.08 * index}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 sm:p-7",
                  "hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.4)]",
                  feature.highlight
                    ? "border-primary/30 bg-[linear-gradient(155deg,rgba(212,175,55,0.1)_0%,rgba(212,175,55,0.03)_45%,rgba(20,23,32,0.6)_100%)] hover:border-primary/50"
                    : "border-border bg-card/60 hover:border-primary/25",
                  feature.span,
                )}
              >
                {/* Hover glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle, rgba(212,175,55,0.18), transparent 70%)" }}
                />

                {feature.highlight && (
                  <div className="absolute right-5 top-5 flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    Flagship
                  </div>
                )}

                <div
                  className={cn(
                    "mb-4 inline-flex rounded-xl border p-3 text-primary transition-colors",
                    feature.highlight
                      ? "border-primary/30 bg-primary/10"
                      : "border-border bg-muted group-hover:border-primary/20 group-hover:bg-primary/10",
                  )}
                >
                  <Icon className={cn("h-5 w-5", feature.highlight && "h-6 w-6")} aria-hidden="true" />
                </div>

                <h3
                  className={cn(
                    "mb-2 font-semibold text-foreground",
                    feature.highlight ? "font-display text-xl tracking-tight sm:text-2xl" : "text-base sm:text-lg",
                  )}
                >
                  {feature.title}
                </h3>
                <p className={cn("leading-relaxed text-muted-foreground", feature.highlight ? "text-sm sm:text-base" : "text-sm")}>
                  {feature.description}
                </p>

                {feature.highlight && (
                  <div className="mt-6 hidden gap-2 lg:flex" aria-hidden="true">
                    {[94, 88, 81, 73].map((score) => (
                      <div key={score} className="flex-1">
                        <div className="h-1 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${score}%`,
                              background:
                                score >= 90
                                  ? "linear-gradient(90deg,#8f6a28,#F6E27A)"
                                  : score >= 80
                                    ? "linear-gradient(90deg,#6f5520,#BD9B47)"
                                    : "rgba(255,255,255,0.18)",
                            }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] font-semibold tabular-nums text-white/30">{score}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
