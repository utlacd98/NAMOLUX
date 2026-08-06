import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AdBanner } from "@/components/ad-banner"
import { ArrowRight } from "lucide-react"
import { ContextualMiniGenerator } from "@/components/contextual-mini-generator"

export const metadata: Metadata = {
  title: "How to Name a Startup | NamoLux",
  description: "A practical guide to choosing a strong startup name. Learn what makes names brandable, scalable, and memorable.",
}

const GUIDE_BRIEF = "I am naming a new startup and want a professional, memorable name that is easy to pronounce, can scale beyond the first product, and has a strong domain."
const SHORTLIST_HREF = "/bulk-domain-check"

export default function HowToNameStartupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pt-32 pb-20">
        <article className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How to Name a Startup
          </h1>

          {/* Intro */}
          <section className="mb-12">
            <p className="mb-4 text-lg text-muted-foreground">
              Naming feels simple. You brainstorm for an afternoon, check if the domain is available, and move on.
            </p>
            <p className="text-lg text-muted-foreground">
              But names have long-term consequences. They affect how people perceive you, whether they remember you, and how easily you can grow beyond your first product.
            </p>
          </section>

          <AdBanner placement="guide-after-intro" />

          {/* What makes a strong name */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              What makes a strong startup name
            </h2>
            
            <div className="space-y-6 text-muted-foreground">
              <div>
                <h3 className="mb-2 font-semibold text-foreground">Brandable beats descriptive</h3>
                <p>
                  "Stripe" tells you nothing about payments. "Notion" doesn't scream productivity. That's the point. Brandable names create space for meaning. Descriptive names box you in.
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-foreground">Short beats keyword-heavy</h3>
                <p>
                  Every extra character is friction. People misspell long names. They forget them. They don't type them into browsers. Aim for under 8 characters if you can.
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-foreground">Scalability matters</h3>
                <p>
                  Your first product isn't your last. Names like "Amazon" and "Apple" work because they don't describe a single thing. They can grow with the company.
                </p>
              </div>
            </div>
          </section>

          <ContextualMiniGenerator
            source="guide"
            contentSlug="how-to-name-a-startup"
            topic="startup naming strategy"
            defaultBrief={GUIDE_BRIEF}
            heading="Turn your startup idea into a professional shortlist"
            ctaId="guide-how-to-name"
          />

          {/* Common mistakes */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Common mistakes founders make
            </h2>
            
            <div className="space-y-6 text-muted-foreground">
              <div>
                <h3 className="mb-2 font-semibold text-foreground">Chasing exact-match keywords</h3>
                <p>
                  "BestCRMSoftware.com" might rank for a week. It won't build a brand. SEO changes. Brands endure.
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-foreground">Ignoring pronunciation</h3>
                <p>
                  If someone can't say your name after hearing it once, you've created a word-of-mouth barrier. Every referral becomes harder.
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-foreground">Choosing names that don't age well</h3>
                <p>
                  Trend words fade. "CryptoHub" made sense in 2021. "AI-Everything" will feel dated by 2027. Pick names that survive pivots.
                </p>
                <p className="mt-2">
                  <Link href="/name-mistakes" className="text-primary hover:underline">
                    See the 7 naming mistakes founders regret →
                  </Link>
                </p>
              </div>
            </div>
          </section>

          <aside aria-label="Related naming guidance" className="mb-12 border-y border-border/40 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Keep refining your decision</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link href="/name-mistakes" className="inline-flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/40 hover:text-primary">
                Avoid the seven common naming mistakes
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
              <Link href="/founder-signal" className="inline-flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/40 hover:text-primary">
                Learn how to evaluate a shortlist
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </aside>

          {/* How to evaluate */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              How to evaluate a name properly
            </h2>
            
            <p className="mb-4 text-muted-foreground">
              Most founders evaluate names on gut feeling. That works sometimes. But there are patterns that predict long-term brand strength.
            </p>
            <p className="mb-4 text-muted-foreground">
              Length, pronounceability, memorability, extension quality, character cleanliness, and brand risk all matter. Each one affects how your name performs in the real world.
            </p>
            <p className="text-muted-foreground">
              <Link href="/founder-signal" className="text-primary hover:underline">
                Learn how Founder Signal™ measures these factors →
              </Link>
            </p>
          </section>

          <AdBanner placement="guide-before-conclusion" />

          {/* Closing */}
          <section className="mb-12 rounded-xl border border-border/50 bg-card/30 p-6">
            <p className="text-lg font-medium text-foreground">
              "The best startup names don't explain — they position."
            </p>
          </section>

          {/* CTA */}
          <div className="text-center">
            <Link href={SHORTLIST_HREF}>
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
