import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Why NamoLux Exists | A Name Generator With a Quality Bar",
  description: "Why NamoLux generates broadly, rejects weak names, verifies launch domains, and helps founders choose and launch a serious finalist.",
}

const annoyances = [
  {
    problem: "Forced account creation",
    take: "Bulk Check remains easy to start. Name Sprint requires sign-in because its daily allowance, saved feedback, and cross-run quality controls belong to a real founder workspace.",
  },
  {
    problem: "Hidden availability",
    take: "Other tools mix taken domains into the suggestion grid. Name Sprint requires a verified exact .com, .co or .ai launch domain.",
  },
  {
    problem: "Affiliate-first results",
    take: "Some domain tools push expensive premium inventory because they get a cut. We show the status returned by live checks.",
  },
  {
    problem: "Overwhelming options",
    take: "A long AI list is not a decision. NamoLux rejects weak candidates first, then puts the survivors into one consistent evidence view.",
  },
  {
    problem: "No signal, just noise",
    take: "Available doesn't mean good. Founder Signal™ tells you if a name is worth buying, not just if you can.",
  },
]

const beliefs = [
  "Founders don't need more options. They need better filters.",
  "A displayed Name Sprint candidate should have an available launch domain, be pronounceable, and earn its place.",
  "A slower curated result is better than an instant page of names to delete.",
  "Saving a serious decision should be optional, clear, and worth the account.",
  "Simplicity isn't laziness. It's respect for your time.",
]

export default function WhyNamoluxPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pt-32 pb-20">
        <article className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Why NamoLux
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            Most naming tools are built for the tool maker, not the founder. We built this one differently.
          </p>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              What annoyed us about other tools
            </h2>
            <div className="space-y-4">
              {annoyances.map((item) => (
                <div key={item.problem} className="rounded-xl border border-border/50 bg-card/30 p-5">
                  <h3 className="mb-2 font-semibold text-red-400">{item.problem}</h3>
                  <p className="text-sm text-muted-foreground">{item.take}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Why simplicity matters
            </h2>
            <p className="mb-4 text-muted-foreground">
              You're naming a company, not learning a new tool. The interface should disappear. Paste, check, decide.
            </p>
            <p className="mb-4 text-muted-foreground">
              The product stays focused on one continuous decision: generate or import the candidates, reject the weak options, compare the survivors, and build the selected identity without restarting elsewhere.
            </p>
            <p className="text-muted-foreground">
              You may return to a serious shortlist more than once. The workspace should preserve the evidence without turning a simple decision into a bloated suite.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Why an account is optional at the start
            </h2>
            <p className="mb-4 text-muted-foreground">
              You can start a Bulk Check without an account. Name Sprint requires sign-in so the daily allowance, rejection history, and refinement feedback can be applied consistently.
            </p>
            <p className="text-muted-foreground">
              The value is in a clearer decision, not in trapping you in another workflow.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              What we believe founders need
            </h2>
            <ul className="space-y-3">
              {beliefs.map((belief, idx) => (
                <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{belief}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-12 rounded-xl border border-border/50 bg-card/50 p-6">
            <p className="text-xl font-medium italic text-foreground">
              "Build tools you'd actually use. Skip everything else."
            </p>
          </section>

          <div className="text-center">
            <Link href="/generate">
              <Button size="lg" className="gap-2">
                Start a Name Sprint
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
