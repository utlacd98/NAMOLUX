import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Why NamoLux Exists | Built for Founders Who Ship",
  description: "Why NamoLux gives solo founders a focused workspace to check, compare, and choose a name with evidence.",
}

const annoyances = [
  {
    problem: "Forced account creation",
    take: "You should be able to start a Bulk Check before you commit. Accounts are for saving a decision and returning to it, not for creating friction at the first click.",
  },
  {
    problem: "Hidden availability",
    take: "Other tools show you names, then make you click each one to check availability. We check everything upfront.",
  },
  {
    problem: "Affiliate-first results",
    take: "Some domain tools push expensive premium inventory because they get a cut. We show the status returned by live checks.",
  },
  {
    problem: "Overwhelming options",
    take: "A shortlist spread across dozens of tabs is hard to compare. We put up to 50 names into one consistent view.",
  },
  {
    problem: "No signal, just noise",
    take: "Available doesn't mean good. Founder Signal™ tells you if a name is worth buying, not just if you can.",
  },
]

const beliefs = [
  "Founders don't need more options. They need better filters.",
  "A name should be available, pronounceable, and memorable. In that order.",
  "Tools should work instantly. Loading spinners are a failure.",
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
              Every feature we did not add is intentional. We keep the workspace focused on the evidence a solo founder needs to choose a name, rather than expanding into a general brand suite.
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
              You can start a Bulk Check without an account. Sign in only when you want to save a project, export the evidence, share a report, or use the higher Pro allowance.
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
            <Link href="/bulk-domain-check">
              <Button size="lg" className="gap-2">
                Check your shortlist
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
