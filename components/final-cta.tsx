import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Reveal } from "@/components/landing/reveal"

const assurances = ["3 free Bulk Check runs", "Founder Signal with Pro", "Up to 50 names per batch"]

export function FinalCTA() {
  return (
    <section className="relative overflow-clip py-20 sm:py-28 lg:py-36" aria-labelledby="final-cta-heading">
      <div className="pointer-events-none absolute inset-0 overflow-clip" aria-hidden="true">
        <div
          className="animate-luxury-aura absolute left-1/2 top-1/2 h-[60vw] max-h-[480px] w-[60vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.14) 0%, rgba(143,122,85,0.06) 45%, transparent 70%)" }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)" }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80">Start Free</p>
          <h2
            id="final-cta-heading"
            className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Make the name decision
            <br />
            <span className="bg-[linear-gradient(102deg,#8f6a28_0%,#dcbf86_30%,#f8ebcb_50%,#c3923b_75%)] bg-clip-text text-transparent">
              with evidence.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Bring a shortlist from anywhere, check six domain extensions, and use Founder Signal when you are ready to decide.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-10">
          <Link
            href="/bulk-domain-check"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[#f0daaa]/60 bg-[linear-gradient(180deg,#f4dfb3_0%,#ddbe7a_42%,#b98838_100%)] px-9 py-4 text-base font-semibold text-[#090705] shadow-[0_18px_60px_rgba(0,0,0,0.55),0_10px_24px_rgba(212,175,55,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f7e7c3] hover:shadow-[0_28px_80px_rgba(0,0,0,0.65),0_14px_40px_rgba(240,212,147,0.35)]"
          >
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0)_42%)] opacity-70" />
            <span className="absolute inset-y-1 left-0 w-24 -translate-x-[180%] rotate-12 bg-gradient-to-r from-transparent via-white/55 to-transparent blur-md transition-transform duration-[1100ms] ease-out group-hover:translate-x-[420%]" />
            <span className="relative">Start free</span>
            <ArrowRight className="relative ml-3 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </Reveal>

        <Reveal delay={0.25} className="mt-8">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            {assurances.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary/60" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
