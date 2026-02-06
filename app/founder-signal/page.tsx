import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, AlertTriangle, Info } from "lucide-react"

export const metadata: Metadata = {
  title: "Founder Signal™ | NamoLux",
  description: "Not just availability. Brand viability. Founder Signal™ scores domain names from 0–100 based on brand strength, risk, and scalability.",
}

const scoreTiers = [
  { range: "90–100", label: "Elite brand", color: "text-green-400", bg: "bg-green-500/10" },
  { range: "75–89", label: "Strong brand", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { range: "60–74", label: "Viable", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { range: "40–59", label: "Risky", color: "text-orange-400", bg: "bg-orange-500/10" },
  { range: "Below 40", label: "Avoid", color: "text-red-400", bg: "bg-red-500/10" },
]

const measures = [
  { title: "Brand length", desc: "Shorter names scale better. Under 7 characters is ideal." },
  { title: "Pronounceability", desc: "Can someone say it after hearing it once?" },
  { title: "Memorability", desc: "Will people remember it tomorrow without writing it down?" },
  { title: "Extension strength", desc: ".com carries weight. Some alternatives work. Most don't." },
  { title: "Character quality", desc: "No hyphens. No numbers. No awkward letter clusters." },
  { title: "Brand risk", desc: "Generic words, industry clichés, and similarity to existing brands." },
]

const exampleInsights = [
  { type: "positive", text: "Short & brandable" },
  { type: "positive", text: "Easy to pronounce" },
  { type: "positive", text: "Clean characters" },
  { type: "warning", text: "Generic industry keyword" },
  { type: "warning", text: "Weaker extension (.dev)" },
]

export default function FounderSignalPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 pt-32 pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Not just availability.
              <br />
              <span className="text-primary">Brand viability.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Founder Signal™ scores domain names from 0–100 based on brand strength, risk, and scalability.
            </p>
          </div>
        </section>

        {/* What it measures */}
        <section className="border-t border-border/50 px-4 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-12 text-2xl font-semibold text-foreground sm:text-3xl">
              What Founder Signal™ measures
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {measures.map((item) => (
                <div key={item.title} className="rounded-xl border border-border/50 bg-card/30 p-5">
                  <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Score Tiers */}
        <section className="border-t border-border/50 px-4 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-12 text-2xl font-semibold text-foreground sm:text-3xl">
              What the score means
            </h2>
            <div className="space-y-3">
              {scoreTiers.map((tier) => (
                <div
                  key={tier.range}
                  className={`flex items-center justify-between rounded-lg ${tier.bg} px-5 py-4`}
                >
                  <span className={`font-mono font-semibold ${tier.color}`}>{tier.range}</span>
                  <span className="text-foreground">{tier.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Example Breakdown */}
        <section className="border-t border-border/50 px-4 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-12 text-2xl font-semibold text-foreground sm:text-3xl">
              Example breakdown
            </h2>
            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-foreground">gadgethub</span>
                  <span className="ml-2 rounded-md bg-cyan-500/20 px-2 py-1 text-sm font-medium text-cyan-400">.dev</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-yellow-400">60</span>
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
              </div>
              
              <div className="mb-6 space-y-2">
                {exampleInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 text-sm ${
                      insight.type === "positive" ? "text-green-400" : "text-yellow-400"
                    }`}
                  >
                    {insight.type === "positive" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span>{insight.text}</span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                "This name works technically, but it's forgettable and competes with dozens of similar brands."
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/50 px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Link href="/generate">
              <Button size="lg" className="gap-2">
                Generate names
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-3xl">
            <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              Founder Signal™ estimates brand strength. Not legal or trademark advice.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

