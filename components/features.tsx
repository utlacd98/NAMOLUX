import { Globe, Palette, Download, MessageSquare, Zap, Lightbulb, Star } from "lucide-react"

const features = [
  {
    icon: MessageSquare,
    title: "AI Domain Generator",
    description: "Enter a keyword, pick a brand vibe, and let AI generate creative, available domain names tailored to your vision.",
    highlight: false,
  },
  {
    icon: Zap,
    title: "Auto domain verification",
    description: "Every suggested name is instantly checked via real-time DNS lookups—no manual verification needed.",
    highlight: false,
  },
  {
    icon: Globe,
    title: "Availability-first suggestions",
    description: "We prioritize names with available .com, .io, .co, .ai, and .net domains so you never fall in love with a taken name.",
    highlight: false,
  },
  {
    icon: Download,
    title: "Shortlist & export",
    description: "Save your favorites to a shortlist and export to CSV in a single click.",
    highlight: false,
  },
  {
    icon: Palette,
    title: "Vibe modes",
    description: "Choose from Luxury, Futuristic, Playful, Trustworthy, or Minimal to match your brand personality.",
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
  return (
    <section id="features" className="overflow-clip py-10 sm:py-16 lg:py-24" aria-labelledby="features-heading">
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
