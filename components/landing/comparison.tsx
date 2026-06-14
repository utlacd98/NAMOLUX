import { Check, X } from "lucide-react"
import { Reveal, SectionHeader } from "@/components/landing/reveal"

const genericPoints = [
  "Random syllables glued to -ify, -ora, and -hub",
  "No scoring — every suggestion looks equally good",
  "Availability checked one name at a time, if at all",
  "No reasoning, so the decision is still a guess",
  "Output you'd be embarrassed to show a co-founder",
]

const namoluxPoints = [
  "Founder Signal™ 0–100 with elite-tier caps — a 95 has earned it",
  "Live RDAP + DNS verification across 6 TLDs in one pass",
  "Consultant-grade reasoning attached to every verdict",
  "Slop filters reject typo-bait, fake Latin, and suffix spam",
  "CSV export for team sign-off — evidence, not vibes",
]

export function Comparison() {
  return (
    <section
      id="why-namolux"
      aria-labelledby="comparison-heading"
      className="relative overflow-clip bg-muted/20 py-16 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="The Difference"
          headingId="comparison-heading"
          heading={
            <>
              Most name generators hand you noise.
              <br />
              <span className="text-primary">NamoLux hands you a verdict.</span>
            </>
          }
          sub="Anyone can produce a hundred names. The hard part is knowing which one is worth building a company on — that's the part we engineered."
        />

        <div className="mt-12 grid gap-5 sm:mt-16 lg:grid-cols-2">
          {/* Generic generators */}
          <Reveal delay={0.1} className="relative rounded-2xl border border-border bg-card/40 p-7 sm:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/60">
              Generic name generators
            </p>
            <ul className="mt-6 space-y-4">
              {genericPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground/80">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                    <X className="h-3 w-3 text-white/30" aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* NamoLux */}
          <Reveal
            delay={0.2}
            className="relative overflow-hidden rounded-2xl border p-7 shadow-[0_30px_90px_rgba(0,0,0,0.5),0_0_40px_rgba(212,175,55,0.06)] sm:p-9"
            style={{
              borderColor: "rgba(212,175,55,0.35)",
              background: "linear-gradient(155deg, rgba(212,175,55,0.1) 0%, rgba(20,18,12,0.7) 55%, rgba(9,8,6,0.9) 100%)",
            }}
          >
            <div
              aria-hidden="true"
              className="animate-orb-drift pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(212,175,55,0.2), transparent 70%)" }}
            />
            <div className="relative">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                NamoLux
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.14em]"
                  style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.35)", color: "#F2DCA0" }}
                >
                  Founder Signal™
                </span>
              </p>
              <ul className="mt-6 space-y-4">
                {namoluxPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90">
                    <span
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)" }}
                    >
                      <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
