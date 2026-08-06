import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Target, Heart } from "lucide-react"
import { CTA_LABELS } from "@/lib/site-content"

export const metadata: Metadata = {
  title: "About Us | NamoLux",
  description:
    "Learn why Andrew Barrett built NamoLux as a decision toolkit for founders choosing a company name.",
  openGraph: {
    title: "About NamoLux",
    description:
      "NamoLux helps founders move from name ideas to a defensible shortlist.",
    type: "website",
    url: "https://www.namolux.com/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About NamoLux",
    description:
      "NamoLux helps founders move from name ideas to a defensible shortlist.",
  },
  alternates: {
    canonical: "/about",
  },
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border/30 px-4 pt-28 pb-16 sm:pt-32 sm:pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              About NamoLux
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We help founders and builders find domain names worth building companies on.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mb-4 text-2xl font-bold text-foreground">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                Generating options is easy. Choosing one name that can carry a company for years is the harder decision.
                NamoLux puts the shortlist, domain evidence, scoring rationale, and trade-offs in one calm workspace.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Founder Signal v1.0 gives every candidate the same six-dimension heuristic review. Domain availability,
                company-name collisions, social handles, and legal trademark clearance remain separate checks.
                <Link href="/founder-signal" className="ml-1 text-primary underline underline-offset-4">Read the methodology.</Link>
              </p>
            </div>

            {/* Founder Section */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-2xl font-bold text-primary">AB</span>
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">Andrew Barrett</h3>
              <p className="mb-4 text-sm text-primary">Founder</p>
              <p className="text-muted-foreground leading-relaxed">
                Andrew built NamoLux after experiencing firsthand how difficult it is to find 
                the perfect domain name. After spending countless hours on domain research for 
                various projects, he decided to create a tool that makes the process faster, 
                smarter, and more reliable for everyone.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="border-t border-border/30 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-10 text-center text-2xl font-bold text-foreground">What We Believe</h2>
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">Quality Over Quantity</h3>
                <p className="text-sm text-muted-foreground">
                  Better to have 10 great options than 1,000 mediocre ones.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">Founder-First</h3>
                <p className="text-sm text-muted-foreground">
                  Built for people who ship, not just people who dream.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">Transparent by Default</h3>
                <p className="text-sm text-muted-foreground">
                  Clear limits, versioned scores, explicit caveats, and no invented certainty.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border/30 px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 text-2xl font-bold text-foreground">
              Ready to choose the name worth building on?
            </h2>
            <p className="mb-6 text-muted-foreground">
              Check a full shortlist, compare domain availability, and add Founder Signal when you want a ranked decision view.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/bulk-domain-check">
                {CTA_LABELS.primary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
