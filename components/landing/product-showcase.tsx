import { Reveal, SectionHeader } from "@/components/landing/reveal"
import { ScorecardDemo } from "@/components/landing/scorecard-demo"

const proofPoints = [
  { value: "0–100", label: "Founder Signal™ score with reasoning on every name" },
  { value: "6 TLDs", label: "RDAP + DNS verified availability in the same pass" },
  { value: "50", label: "Names scored side by side in a single batch" },
]

export function ProductShowcase() {
  return (
    <section
      id="product"
      aria-labelledby="product-heading"
      className="relative overflow-clip py-16 sm:py-24 lg:py-32"
    >
      {/* Ambient backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(212,175,55,0.07), transparent 70%), radial-gradient(ellipse 50% 40% at 85% 90%, rgba(143,122,85,0.05), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="The Scorecard"
          headingId="product-heading"
          heading={
            <>
              Your shortlist, scored like a<br className="hidden sm:block" />
              <span className="bg-[linear-gradient(102deg,#8f6a28_0%,#dcbf86_30%,#f8ebcb_50%,#c3923b_75%)] bg-clip-text text-transparent">
                {" "}consultant would score it
              </span>
            </>
          }
          sub="Paste candidate names from any source. Each one comes back with a Founder Signal™ verdict, live availability, and the reasoning behind the number — in seconds, not a two-week engagement."
        />

        <Reveal delay={0.15} className="mt-12 sm:mt-16">
          <ScorecardDemo />
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:mt-16 sm:grid-cols-3">
          {proofPoints.map((point, index) => (
            <Reveal
              key={point.value}
              delay={0.1 + index * 0.1}
              className="rounded-2xl border border-primary/10 bg-card/40 px-6 py-5 text-center backdrop-blur-sm transition-colors hover:border-primary/25"
            >
              <p className="font-display text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{point.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
