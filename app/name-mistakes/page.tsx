import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { ArrowRight } from "lucide-react"
import { Fragment } from "react"
import { ContextualMiniGenerator } from "@/components/contextual-mini-generator"

export const metadata: Metadata = {
  title: "7 Startup Naming Mistakes Founders Regret | NamoLux",
  description: "Avoid the naming mistakes that cost startups credibility, memorability, and growth potential.",
  robots: { index: false, follow: true, noarchive: true },
}

const mistakes = [
  {
    title: "Choosing names that are already crowded",
    explanation: "When your name sounds like ten other companies, you're fighting for attention before you've even started.",
    consequence: "You'll spend more on marketing just to be remembered.",
  },
  {
    title: "Overusing trends",
    explanation: "AI, Meta, Crypto, Web3 — trend words feel relevant today but date your brand tomorrow.",
    consequence: "Your name becomes a timestamp instead of a foundation.",
  },
  {
    title: "Hard-to-spell names",
    explanation: "Creative spellings feel unique until someone tries to find you. Every misspelling is a lost customer.",
    consequence: "Word-of-mouth breaks down. Referrals get lost.",
  },
  {
    title: "Names that lock you into one product",
    explanation: "\"InvoiceBot\" works until you add payments. Descriptive names limit where you can grow.",
    consequence: "You'll rebrand later — and rebranding is expensive.",
  },
  {
    title: "Ignoring how it sounds out loud",
    explanation: "Names live in conversations, not just on screens. If it's awkward to say, people won't say it.",
    consequence: "You lose the most powerful marketing channel: people talking about you.",
  },
  {
    title: "Settling for weak extensions",
    explanation: "Not every TLD carries the same weight. Some alternatives work. Most signal \"we couldn't get the .com.\"",
    consequence: "Credibility takes a hit before anyone sees your product.",
  },
  {
    title: "Rushing the decision",
    explanation: "Naming feels like a checkbox. But it's one of the few decisions that follows you everywhere.",
    consequence: "You live with a mediocre name for years — or pay to change it.",
  },
]

const GUIDE_BRIEF = "I am naming a new startup and want to avoid a crowded, trendy, hard-to-spell, or overly narrow name. I need candidates that are memorable, easy to say, scalable, and suitable for a credible domain."
const SHORTLIST_HREF = "/bulk-domain-check"

export default function NameMistakesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pt-32 pb-20">
        <article className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            7 Startup Naming Mistakes Founders Regret
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            These aren't obvious on day one. They show up when you try to grow.
          </p>

          <AdBanner placement="guide-after-intro" />

          {/* Mistakes List */}
          <div className="space-y-8">
            {mistakes.map((mistake, idx) => (
              <Fragment key={mistake.title}>
                <section className="rounded-xl border border-border/50 bg-card/30 p-6">
                  <div className="mb-1 text-sm font-medium text-primary">
                    Mistake #{idx + 1}
                  </div>
                  <h2 className="mb-3 text-xl font-semibold text-foreground">
                    {mistake.title}
                  </h2>
                  <p className="mb-3 text-muted-foreground">
                    {mistake.explanation}
                  </p>
                  <p className="text-sm text-orange-400">
                    Why this hurts later: {mistake.consequence}
                  </p>
                </section>

                {idx === 0 ? (
                  <ContextualMiniGenerator
                    source="guide"
                    contentSlug="name-mistakes"
                    topic="startup naming mistakes"
                    defaultBrief={GUIDE_BRIEF}
                    heading="Check names against these warning signs"
                    ctaId="guide-name-mistakes"
                  />
                ) : null}

                {idx === 1 ? (
                  <aside aria-label="Related naming guidance" className="border-y border-border/40 py-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Build a stronger shortlist</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Link href="/how-to-name-a-startup" className="inline-flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/40 hover:text-primary">
                        Follow the startup naming framework
                        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                      </Link>
                      <Link href="/founder-signal" className="inline-flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/40 hover:text-primary">
                        Evaluate names with Founder Signal
                        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                      </Link>
                    </div>
                  </aside>
                ) : null}
              </Fragment>
            ))}
          </div>

          {/* Closing */}
          <section className="mt-16 rounded-xl border border-border/50 bg-card/50 p-6 text-center">
            <p className="mb-6 text-lg text-muted-foreground">
              Most naming mistakes aren't obvious on day one.
              <br />
              They show up when you try to grow.
            </p>
            <Link href={SHORTLIST_HREF}>
              <Button size="lg" className="gap-2">
                Check your name with Founder Signal™
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  )
}
