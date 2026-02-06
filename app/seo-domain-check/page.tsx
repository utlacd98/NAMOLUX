import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Search, Shield, Zap, AlertTriangle } from "lucide-react"

export const metadata: Metadata = {
  title: "SEO Domain Check: How Domains Affect Search Rankings | NamoLux",
  description: "Learn why your domain choice affects SEO, what our audit checks, and how to interpret your domain's SEO score.",
}

const seoFactors = [
  {
    icon: Search,
    title: "Domain age & history",
    desc: "New domains start with zero authority. Previously penalized domains carry baggage. We check for red flags.",
  },
  {
    icon: Shield,
    title: "Trust signals",
    desc: "HTTPS, clean WHOIS, no spam associations. These basics affect how search engines perceive your domain.",
  },
  {
    icon: Zap,
    title: "Technical setup",
    desc: "Proper DNS configuration, fast resolution, no redirect chains. Technical issues hurt rankings before you write a word.",
  },
  {
    icon: AlertTriangle,
    title: "Spam indicators",
    desc: "Hyphens, numbers, keyword stuffing in the domain. These patterns trigger spam filters and hurt trust.",
  },
]

const auditChecks = [
  "Domain age and registration history",
  "Previous content (via Wayback Machine)",
  "Spam blacklist status",
  "SSL certificate validity",
  "DNS configuration health",
  "Redirect chain analysis",
  "WHOIS privacy and completeness",
  "Extension trust score",
]

const misconceptions = [
  {
    myth: "Exact-match domains rank better",
    reality: "Google devalued exact-match domains years ago. 'BestPizzaNYC.com' won't outrank a strong brand.",
  },
  {
    myth: "Older domains always win",
    reality: "Age helps, but a 10-year-old domain with no content loses to a 1-year-old domain with great content.",
  },
  {
    myth: ".com is required for SEO",
    reality: "Extension doesn't directly affect rankings. User trust and click-through rates matter more.",
  },
  {
    myth: "Buying expired domains is a shortcut",
    reality: "Most expired domains are expired for a reason. Penalties, spam history, or zero value.",
  },
]

export default function SeoDomainCheckPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pt-32 pb-20">
        <article className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How Domains Affect SEO
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            Your domain is your foundation. A bad choice creates problems that content can't fix. Here's what actually matters.
          </p>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Why domains matter for SEO
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {seoFactors.map((factor) => (
                <div key={factor.title} className="rounded-xl border border-border/50 bg-card/30 p-5">
                  <factor.icon className="mb-3 h-6 w-6 text-primary" />
                  <h3 className="mb-2 font-semibold text-foreground">{factor.title}</h3>
                  <p className="text-sm text-muted-foreground">{factor.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              What our SEO audit checks
            </h2>
            <div className="rounded-xl border border-border/50 bg-card/30 p-5">
              <ul className="grid gap-2 sm:grid-cols-2">
                {auditChecks.map((check, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              We run these checks instantly and give you a clear score. No waiting, no account required.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Common misconceptions
            </h2>
            <div className="space-y-4">
              {misconceptions.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-border/50 bg-card/30 p-5">
                  <p className="mb-2 font-semibold text-red-400 line-through">{item.myth}</p>
                  <p className="text-sm text-muted-foreground">{item.reality}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12 rounded-xl border border-border/50 bg-card/50 p-6">
            <p className="text-xl font-medium italic text-foreground">
              "SEO starts with the domain. Everything else builds on that foundation."
            </p>
          </section>

          <div className="text-center">
            <Link href="/seo-audit">
              <Button size="lg" className="gap-2">
                Run SEO domain audit
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

