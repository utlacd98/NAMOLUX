import { cn } from "@/lib/utils"

const steps = [
  {
    number: "01",
    title: "Pick vibe + keywords",
    description: "Choose your brand personality and enter a few keywords that describe your business or product.",
  },
  {
    number: "02",
    title: "Generate & verify .com",
    description:
      "Our AI generates dozens of unique names and live-checks availability across .com, .io, .ai, .co and more — usually ready in under a minute.",
  },
  {
    number: "03",
    title: "Save, export, buy",
    description: "Add favorites to your shortlist, export to your tools, and purchase your domain directly.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="overflow-clip bg-muted/30 py-10 sm:py-16 lg:py-24" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            From idea to available .com domain in under a minute.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Desktop timeline — centred */}
          <div
            className="absolute top-8 hidden h-[calc(100%-4rem)] w-px bg-gradient-to-b from-primary/60 via-secondary/40 to-muted lg:block lg:left-1/2 lg:-translate-x-1/2"
            aria-hidden="true"
          />
          {/* Mobile timeline — left aligned behind number circles */}
          <div
            className="absolute left-7 top-7 h-[calc(100%-1.75rem)] w-px bg-gradient-to-b from-primary/60 via-secondary/40 to-muted lg:hidden"
            aria-hidden="true"
          />

          <div className="space-y-10 lg:space-y-24">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  "relative flex items-start gap-5 lg:flex-row lg:items-center lg:gap-12 animate-fade-up",
                  index % 2 === 1 && "lg:flex-row-reverse",
                )}
                style={{
                  animationDelay: `${index * 0.2}s`,
                  animationFillMode: "forwards",
                }}
              >
                {/* Number Circle */}
                <div className="relative z-10 shrink-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-card text-xl font-bold text-primary shadow-md shadow-black/10">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className={cn("flex-1 lg:w-[calc(50%-4rem)] lg:flex-none", index % 2 === 0 ? "lg:pr-8 lg:text-right" : "lg:pl-8")}>
                  <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground">{step.description}</p>
                </div>

                {/* Empty div for desktop layout */}
                <div className="hidden lg:block lg:w-[calc(50%-4rem)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
