import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, X } from "lucide-react"

export const metadata: Metadata = {
  title: "Domain Extension vs Brand Strength: What Actually Matters | NamoLux",
  description: "When does .com matter? When is .io fine? Learn when your domain extension helps or hurts trust — and why brand strength beats exact match every time.",
}

const extensionRules = [
  {
    ext: ".com",
    verdict: "Still the default",
    note: "Consumer brands, B2B enterprise, anything targeting non-technical audiences. If you can get it, get it.",
  },
  {
    ext: ".io",
    verdict: "Fine for dev tools",
    note: "Developer tools, APIs, technical products. Your audience expects it. Outside tech? It signals 'couldn't get .com'.",
  },
  {
    ext: ".ai",
    verdict: "Trending but risky",
    note: "Works if AI is core to your product. But trends fade — will .ai feel dated in 5 years like .ly does now?",
  },
  {
    ext: ".co",
    verdict: "Acceptable fallback",
    note: "Better than a bad .com. But some users will accidentally type .com and land on a competitor.",
  },
  {
    ext: ".xyz / .app",
    verdict: "Niche use only",
    note: "Fine for side projects or if the brand is strong enough to overcome it. Google uses .app — you're not Google.",
  },
]

const trustKillers = [
  "Hyphens in the domain (looks-like-spam.com)",
  "Numbers that aren't part of the brand (startup123.io)",
  "Misspellings that require explanation (flickr worked, most don't)",
  "Country codes for non-local businesses (.de for a US company)",
  "Obscure extensions nobody recognizes (.biz, .info, .club)",
]

const brandBeatsExact = [
  { brand: "Stripe", exact: "OnlinePayments.com" },
  { brand: "Notion", exact: "ProductivityApp.com" },
  { brand: "Figma", exact: "DesignTool.com" },
  { brand: "Linear", exact: "IssueTracker.com" },
  { brand: "Vercel", exact: "WebHosting.com" },
]

export default function DomainVsBrandPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pt-32 pb-20">
        <article className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Domain Extension vs Brand Strength
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            Founders obsess over .com. But the extension matters less than you think — and brand strength matters more than you realize.
          </p>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              When .com actually matters
            </h2>
            <p className="mb-4 text-muted-foreground">
              .com is the default. When someone hears your company name, they'll type yourname.com first. That's just how it works.
            </p>
            <p className="text-muted-foreground">
              But "default" doesn't mean "required." The question is: who's your audience, and what do they expect?
            </p>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Extension quick guide
            </h2>
            <div className="space-y-4">
              {extensionRules.map((rule) => (
                <div key={rule.ext} className="rounded-xl border border-border/50 bg-card/30 p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-lg font-semibold text-primary">{rule.ext}</span>
                    <span className="text-sm text-muted-foreground">{rule.verdict}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{rule.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              What actually hurts trust
            </h2>
            <p className="mb-4 text-muted-foreground">
              The extension rarely kills trust. These things do:
            </p>
            <ul className="space-y-3">
              {trustKillers.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Brand strength beats exact match
            </h2>
            <p className="mb-6 text-muted-foreground">
              Exact-match domains (keywords in the URL) used to help SEO. They don't anymore. And they make your brand forgettable.
            </p>
            <div className="overflow-hidden rounded-xl border border-border/50">
              <div className="grid grid-cols-2 bg-card/50 text-sm font-medium text-muted-foreground">
                <div className="border-r border-border/50 px-4 py-3">Strong brand</div>
                <div className="px-4 py-3">Exact match</div>
              </div>
              {brandBeatsExact.map((row, idx) => (
                <div key={idx} className="grid grid-cols-2 border-t border-border/50">
                  <div className="flex items-center gap-2 border-r border-border/50 px-4 py-3 font-medium text-green-400">
                    <Check className="h-4 w-4" /> {row.brand}
                  </div>
                  <div className="px-4 py-3 text-muted-foreground">{row.exact}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Which column has billion-dollar companies? The one with memorable, brandable names.
            </p>
          </section>

          <section className="mb-12 rounded-xl border border-border/50 bg-card/50 p-6">
            <p className="text-xl font-medium italic text-foreground">
              "A strong brand on .io beats a weak brand on .com."
            </p>
          </section>

          <div className="text-center">
            <Link href="/generate">
              <Button size="lg" className="gap-2">
                Find a brandable domain
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

