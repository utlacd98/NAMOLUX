import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Why NamoLux Exists | Built for Founders Who Ship",
  description: "No accounts, no upsells, no friction. Here's why we built NamoLux differently — and what we believe founders actually need.",
}

const annoyances = [
  {
    problem: "Forced account creation",
    take: "You want to check a domain. They want your email. We don't. Use the tool, get your answer, leave.",
  },
  {
    problem: "Hidden availability",
    take: "Other tools show you names, then make you click each one to check availability. We check everything upfront.",
  },
  {
    problem: "Affiliate-first results",
    take: "Many generators push expensive premium domains because they get a cut. We show what's actually available.",
  },
  {
    problem: "Overwhelming options",
    take: "100 mediocre suggestions aren't helpful. We generate fewer names, but each one is actually usable.",
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
  "No signup means no friction. Friction kills momentum.",
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
              You're naming a company, not learning a new tool. The interface should disappear. Type, generate, decide.
            </p>
            <p className="mb-4 text-muted-foreground">
              Every feature we didn't add is intentional. Dashboards, saved searches, team collaboration — these add complexity without adding value for the core use case.
            </p>
            <p className="text-muted-foreground">
              You'll use this tool once or twice. It should work perfectly those times, then get out of your way.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Why no sign-up
            </h2>
            <p className="mb-4 text-muted-foreground">
              Sign-up forms exist to capture emails. We don't need your email. We need you to find a good name and go build your company.
            </p>
            <p className="text-muted-foreground">
              If the tool is good, you'll remember it. If it's not, no amount of email nurturing will fix that.
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
                Try it yourself
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

