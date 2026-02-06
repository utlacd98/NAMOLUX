import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "7 Startup Naming Mistakes Founders Regret | NamoLux",
  description: "Avoid the naming mistakes that cost startups credibility, memorability, and growth potential.",
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

          {/* Mistakes List */}
          <div className="space-y-8">
            {mistakes.map((mistake, idx) => (
              <section
                key={idx}
                className="rounded-xl border border-border/50 bg-card/30 p-6"
              >
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
            ))}
          </div>

          {/* Closing */}
          <section className="mt-16 rounded-xl border border-border/50 bg-card/50 p-6 text-center">
            <p className="mb-6 text-lg text-muted-foreground">
              Most naming mistakes aren't obvious on day one.
              <br />
              They show up when you try to grow.
            </p>
            <Link href="/generate">
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

