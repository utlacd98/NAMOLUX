import { Reveal, SectionHeader } from "@/components/landing/reveal"
import { cn } from "@/lib/utils"

const steps = [
  {
    number: "01",
    title: "Paste your shortlist",
    description:
      "Drop up to 50 candidate names into NamoLux. Your ideas, your AI output, names from a consultant — all welcome.",
  },
  {
    number: "02",
    title: "We score & verify each one",
    description:
      "Every name gets a Founder Signal™ score out of 100 and live availability checks across .com, .io, .co, .ai, .app and .dev — with reasoning you can defend.",
  },
  {
    number: "03",
    title: "Pick the winner with evidence",
    description:
      "Rank by score, filter by availability, export the report. Walk into your next meeting with a decision, not a guess.",
  },
]

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-clip py-16 sm:py-24 lg:py-32"
      aria-labelledby="how-it-works-heading"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 55% 40% at 80% 15%, rgba(212,175,55,0.05), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="The Process"
          headingId="how-it-works-heading"
          heading="How it works"
          sub="From a list of candidate names to a scored, verified shortlist — the work of a brand consultant, done in seconds."
        />

        <div className="relative mt-14 sm:mt-20">
          {/* Desktop timeline — centred gold thread */}
          <div
            className="absolute top-8 hidden h-[calc(100%-4rem)] w-px lg:left-1/2 lg:block lg:-translate-x-1/2"
            style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.55), rgba(143,122,85,0.3), transparent)" }}
            aria-hidden="true"
          />
          {/* Mobile timeline */}
          <div
            className="absolute left-7 top-7 h-[calc(100%-1.75rem)] w-px lg:hidden"
            style={{ background: "linear-gradient(180deg, rgba(212,175,55,0.55), rgba(143,122,85,0.3), transparent)" }}
            aria-hidden="true"
          />

          <div className="space-y-10 lg:space-y-24">
            {steps.map((step, index) => (
              <Reveal
                key={step.number}
                delay={index * 0.12}
                className={cn(
                  "relative flex items-start gap-5 lg:flex-row lg:items-center lg:gap-12",
                  index % 2 === 1 && "lg:flex-row-reverse",
                )}
              >
                {/* Number circle */}
                <div className="relative z-10 shrink-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full font-display text-xl font-semibold text-primary shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_24px_rgba(212,175,55,0.12)]"
                    style={{
                      border: "1px solid rgba(212,175,55,0.4)",
                      background: "linear-gradient(180deg, rgba(26,22,14,0.95), rgba(12,10,7,0.95))",
                    }}
                  >
                    {step.number}
                  </div>
                </div>

                {/* Content card */}
                <div
                  className={cn(
                    "flex-1 rounded-2xl border border-border/60 bg-card/40 p-6 transition-colors hover:border-primary/25 sm:p-7 lg:w-[calc(50%-4rem)] lg:flex-none",
                    index % 2 === 0 ? "lg:pr-8 lg:text-right" : "lg:pl-8",
                  )}
                >
                  <h3 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{step.description}</p>
                </div>

                {/* Spacer for desktop alternating layout */}
                <div className="hidden lg:block lg:w-[calc(50%-4rem)]" />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
