import { Globe, Palette, Download, MessageSquare, Zap, Lightbulb, Star } from "lucide-react"

const features = [
  {
    icon: Star,
    title: "Founder Signal™ scoring",
    description: "Every name graded 0–100 on brand strength, memorability, phonetic punch, and realness. Elite-tier scoring so you can tell a 95 from a 75 at a glance.",
    highlight: true,
  },
  {
    icon: Zap,
    title: "Live availability across 6 TLDs",
    description: "Every name on your shortlist is verified against .com, .io, .co, .ai, .app and .dev via multi-source DNS and RDAP. No wasted cycles on taken domains.",
    highlight: false,
  },
  {
    icon: Lightbulb,
    title: "Brand-consultant reasoning",
    description: "Each score comes with a breakdown — why the name works or doesn't, its best use case, and a clear verdict so you can defend the decision.",
    highlight: false,
  },
  {
    icon: MessageSquare,
    title: "Stress-test panel",
    description: "Run each candidate through pronunciation, trademark conflict, category fit, and longevity checks. See how a name holds up under pressure.",
    highlight: false,
  },
  {
    icon: Download,
    title: "Shortlist & export",
    description: "Save your shortlist and export the full Founder Signal report as CSV for team sign-off.",
    highlight: false,
  },
  {
    icon: Globe,
    title: "Bulk check up to 50",
    description: "Paste your whole shortlist in one go. Score, rank, and compare 50 candidates side by side in seconds.",
    highlight: false,
  },
]

export function Features() {
  return (
    <section id="features" className="overflow-clip py-10 sm:py-16 lg:py-24" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A brand consultant&apos;s toolkit,
            <br />
            <span className="text-primary">built into the product</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            NamoLux scores, verifies, and stress-tests every name on your shortlist — the analysis a consultancy would run, delivered in seconds.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group relative rounded-xl border border-border bg-card p-4 sm:p-6 transition-all duration-200 hover:border-primary/20 hover:shadow-md hover:shadow-black/10 animate-fade-up"
                style={{
                  animationDelay: `${index * 0.08}s`,
                  animationFillMode: "forwards",
                }}
              >
                {feature.highlight && (
                  <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-1 text-xs font-medium text-primary">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    New
                  </div>
                )}
                <div className="mb-3 inline-flex rounded-lg bg-muted p-2 sm:p-3 text-primary transition-colors group-hover:bg-primary/10">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-foreground sm:mb-2 sm:text-lg">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
