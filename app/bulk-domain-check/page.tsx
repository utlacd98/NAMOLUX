import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Building2, Hammer, TrendingUp, Lightbulb } from "lucide-react"

export const metadata: Metadata = {
  title: "Bulk Domain Availability Check: Who It's For & How to Use It | NamoLux",
  description: "Learn who benefits from bulk domain checking — agencies, builders, investors — and how to efficiently check multiple domain names at once.",
}

const useCases = [
  {
    icon: Building2,
    title: "Agencies & Studios",
    desc: "Naming clients need options. Generate 20 candidates, check them all at once, present only the available ones. Saves hours per project.",
  },
  {
    icon: Hammer,
    title: "Indie Hackers & Builders",
    desc: "Building multiple products? Side projects? You need names fast. Bulk check lets you validate ideas without context-switching.",
  },
  {
    icon: TrendingUp,
    title: "Domain Investors",
    desc: "Spotting trends means checking lots of names quickly. Filter by availability across extensions, find the gaps others missed.",
  },
  {
    icon: Lightbulb,
    title: "Startup Founders",
    desc: "Brainstorming with your team? Dump all the ideas in, see what's actually available, then debate only the real options.",
  },
]

const tips = [
  {
    title: "Start with variations",
    desc: "Don't just check one name. Check the singular, plural, with/without prefix. NamoLux generates these automatically.",
  },
  {
    title: "Check multiple extensions",
    desc: "Your .com might be taken, but .io or .co could be available. We check all major extensions in one pass.",
  },
  {
    title: "Filter by Founder Signal™",
    desc: "Availability isn't everything. Use the signal score to prioritize names that are actually worth buying.",
  },
  {
    title: "Export your shortlist",
    desc: "Found 5 good options? Export them to share with co-founders or clients. No screenshots needed.",
  },
]

export default function BulkDomainCheckPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pt-32 pb-20">
        <article className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Bulk Domain Availability Check
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            Checking domains one at a time is slow. Here's who uses bulk checking — and how to do it efficiently.
          </p>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Who bulk checking is for
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {useCases.map((useCase) => (
                <div key={useCase.title} className="rounded-xl border border-border/50 bg-card/30 p-5">
                  <useCase.icon className="mb-3 h-6 w-6 text-primary" />
                  <h3 className="mb-2 font-semibold text-foreground">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              How NamoLux handles bulk checks
            </h2>
            <p className="mb-4 text-muted-foreground">
              Enter a keyword or business description. We generate multiple name candidates and check availability across .com, .io, .co, .ai, and more — all in parallel.
            </p>
            <p className="mb-4 text-muted-foreground">
              Results show instantly. Green means available. You see the full picture in seconds, not minutes.
            </p>
            <p className="text-muted-foreground">
              No account required. No rate limits. Just fast, accurate availability data.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Tips for naming in batches
            </h2>
            <div className="space-y-4">
              {tips.map((tip) => (
                <div key={tip.title} className="rounded-xl border border-border/50 bg-card/30 p-5">
                  <h3 className="mb-2 font-semibold text-foreground">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground">{tip.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12 rounded-xl border border-border/50 bg-card/50 p-6">
            <p className="text-xl font-medium italic text-foreground">
              "The best name is the one that's available and you actually like."
            </p>
          </section>

          <div className="text-center">
            <Link href="/generate">
              <Button size="lg" className="gap-2">
                Try bulk domain check
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

