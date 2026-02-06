import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Will Your Startup Name Age Well? | NamoLux",
  description: "Learn about name decay and how to choose a startup name that stays relevant as your company grows.",
}

const decayCauses = [
  {
    title: "Trend-based words",
    desc: "Names built on buzzwords feel current today but become dated fast. \"CryptoFlow\" made sense in 2021.",
  },
  {
    title: "Buzzword stacking",
    desc: "Combining multiple trend words amplifies the problem. \"AI-Powered-Cloud-Hub\" won't age gracefully.",
  },
  {
    title: "Over-descriptive names",
    desc: "Names that describe exactly what you do today limit what you can become tomorrow.",
  },
]

const comparisons = [
  { timeless: "Stripe", trend: "PaymentsPro" },
  { timeless: "Notion", trend: "ProductivityHub" },
  { timeless: "Linear", trend: "AgileTracker" },
  { timeless: "Figma", trend: "DesignCloud" },
  { timeless: "Vercel", trend: "DeployFast" },
]

export default function BrandLongevityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pt-32 pb-20">
        <article className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Will Your Startup Name Age Well?
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            Some names sound perfect today but feel dated in three years. Understanding name decay helps you choose something that lasts.
          </p>

          {/* Intro */}
          <section className="mb-12">
            <p className="mb-4 text-muted-foreground">
              Many startup names are built for the moment. They reference current trends, describe the first product, or chase SEO keywords.
            </p>
            <p className="text-muted-foreground">
              These names work initially. But as the company evolves — and the industry moves on — they start to feel like relics.
            </p>
          </section>

          {/* What causes decay */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              What causes name decay
            </h2>
            <div className="space-y-4">
              {decayCauses.map((cause) => (
                <div
                  key={cause.title}
                  className="rounded-xl border border-border/50 bg-card/30 p-5"
                >
                  <h3 className="mb-2 font-semibold text-foreground">{cause.title}</h3>
                  <p className="text-sm text-muted-foreground">{cause.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Timeless vs Trend */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Timeless vs trend names
            </h2>
            <div className="overflow-hidden rounded-xl border border-border/50">
              <div className="grid grid-cols-2 bg-card/50 text-sm font-medium text-muted-foreground">
                <div className="border-r border-border/50 px-4 py-3">Timeless</div>
                <div className="px-4 py-3">Trend-dependent</div>
              </div>
              {comparisons.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2 border-t border-border/50"
                >
                  <div className="border-r border-border/50 px-4 py-3 font-medium text-green-400">
                    {row.timeless}
                  </div>
                  <div className="px-4 py-3 text-muted-foreground">
                    {row.trend}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The names on the left don't describe what the company does. That's why they still work.
            </p>
          </section>

          {/* How NamoLux evaluates */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              How NamoLux evaluates longevity
            </h2>
            <p className="mb-4 text-muted-foreground">
              Founder Signal™ includes a brand risk assessment that penalizes names likely to decay. It looks for trend words, generic patterns, and over-descriptive structures.
            </p>
            <p className="text-muted-foreground">
              The goal isn't to predict the future. It's to flag names that are built on temporary foundations.
            </p>
            <p className="mt-4">
              <Link href="/founder-signal" className="text-primary hover:underline">
                Learn more about Founder Signal™ →
              </Link>
            </p>
          </section>

          {/* Quote */}
          <section className="mb-12 rounded-xl border border-border/50 bg-card/50 p-6">
            <p className="text-xl font-medium italic text-foreground">
              "A good name survives pivots."
            </p>
          </section>

          {/* CTA */}
          <div className="text-center">
            <Link href="/generate">
              <Button size="lg" className="gap-2">
                Test name longevity
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

