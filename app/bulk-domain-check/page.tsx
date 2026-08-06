import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CheckCircle2, CircleUserRound, Hammer, Lightbulb, ShieldCheck, UsersRound } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { PUBLIC_PRODUCT_COPY } from "@/lib/site-content"

export const metadata: Metadata = {
  title: "Bulk domain availability checker | NamoLux",
  description:
    "Paste a shortlist and check each name across key domain extensions. Start with three free monthly uses, then upgrade to NamoLux Pro.",
  alternates: { canonical: "/bulk-domain-check" },
  openGraph: {
    title: "Bulk domain availability checker | NamoLux",
    description: "Check a naming shortlist across key domain extensions in one focused workspace.",
    url: "https://www.namolux.com/bulk-domain-check",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NamoLux bulk domain checker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bulk domain availability checker | NamoLux",
    description: "Check a naming shortlist across key domain extensions in one focused workspace.",
    images: ["/opengraph-image"],
  },
}

const useCases = [
  { icon: CircleUserRound, title: "Solo founders", desc: "Turn a personal brainstorm into a shortlist grounded in evidence." },
  { icon: UsersRound, title: "Co-founders", desc: "Put competing candidates into one shared decision frame." },
  { icon: Hammer, title: "Builders", desc: "Compare working names without opening a stack of registrar tabs." },
  { icon: Lightbulb, title: "Early ideas", desc: "Bring names from any workshop, agency, or AI tool to one place." },
]

export default function BulkDomainCheckPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "NamoLux bulk domain availability checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.namolux.com/bulk-domain-check",
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "GBP", description: `${PRODUCT_OFFER.freeMonthlyUses} free monthly uses` },
      { "@type": "Offer", price: PRODUCT_OFFER.proMonthlyPrice, priceCurrency: "GBP", description: `NamoLux Pro: ${PUBLIC_PRODUCT_COPY.proPlanSummary}` },
    ],
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0a] text-[#f4efe5]">
      <Navbar />
      <main id="main-content" className="flex-1 px-4 pb-24 pt-32 sm:px-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

        <section className="mx-auto grid max-w-6xl gap-10 border-b border-white/10 pb-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="pt-3">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#c4a15b]">Bulk domain check</p>
            <h1 className="font-display text-5xl font-semibold leading-[0.96] tracking-[-0.045em] sm:text-6xl">
              Check the shortlist, not one tab at a time.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/62">
              Paste up to 50 candidate names. NamoLux checks key extensions and returns explicit available,
              unavailable, or verification-required states.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/55">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#c4a15b]" />{PRODUCT_OFFER.freeMonthlyUses} free uses each month</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#c4a15b]" />No purchase without your confirmation</span>
            </div>
          </div>

          <form action="/bulk-domain-check/workspace" method="get" className="border border-[#c4a15b]/30 bg-[#121210] p-5 shadow-2xl sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c4a15b]">Live workspace</p>
                <h2 className="mt-1 text-xl font-semibold">Paste one name per line</h2>
              </div>
              <span className="border border-white/12 px-3 py-1 text-xs text-white/48">Max 50</span>
            </div>
            <label htmlFor="names" className="mb-2 block text-sm font-medium text-white/72">Candidate names</label>
            <textarea
              id="names"
              name="names"
              rows={8}
              required
              placeholder={"northstar\nfieldnote\nbrightforge"}
              className="min-h-48 w-full resize-y border border-white/14 bg-black/25 px-4 py-3 font-mono text-base leading-7 text-white outline-none transition placeholder:text-white/25 focus:border-[#c4a15b] focus:ring-2 focus:ring-[#c4a15b]/25"
            />
            <p className="mt-3 text-sm leading-6 text-white/44">
              Availability is checked when you submit. Treat results as time-sensitive and confirm again before purchase.
            </p>
            <Button type="submit" size="lg" className="mt-6 min-h-12 w-full rounded-none bg-[#c4a15b] text-[#0b0b0a] hover:bg-[#d8ba7c]">
              Check this shortlist <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </section>

        <section className="mx-auto max-w-6xl border-b border-white/10 py-20">
          <div className="mb-10 grid gap-5 md:grid-cols-[0.7fr_1.3fr]">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Who it is for</h2>
            <p className="max-w-2xl text-base leading-7 text-white/55">
              Bulk Check is for founders who already have candidates and need a clear way to decide.
              The goal is a defensible shortlist—not a misleading green dot.
            </p>
          </div>
          <div className="grid border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map(({ icon: Icon, title, desc }) => (
              <article key={title} className="border-b border-r border-white/10 p-6">
                <Icon className="h-5 w-5 text-[#c4a15b]" aria-hidden="true" />
                <h3 className="mt-8 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/48">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 py-20 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c4a15b]">Reading the result</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">Three states, written in words.</h2>
            <p className="mt-5 max-w-xl leading-7 text-white/55">
              Every result includes a text label as well as colour: available, unavailable, or verification required.
              Domain availability can change, so NamoLux never presents a past check as a guarantee.
            </p>
          </div>
          <div className="border border-white/10 bg-white/[0.025] p-6">
            <h3 className="text-lg font-semibold">Where Founder Signal fits</h3>
            <p className="mt-3 leading-7 text-white/55">
              Choose a primary TLD, then use Founder Signal to compare clarity, memorability, pronunciation,
              extension strength, character quality, and brand risk on the same basis. Free includes one scored
              batch each month; Pro includes {PUBLIC_PRODUCT_COPY.proPlanSummary.toLowerCase()} It is decision support, not legal or trademark advice.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/founder-signal" className="inline-flex min-h-11 items-center border border-[#c4a15b]/45 px-4 text-sm font-semibold text-[#d8ba7c] hover:bg-[#c4a15b]/10">Read the methodology</Link>
              <Link href="/pricing" className="inline-flex min-h-11 items-center px-4 text-sm font-semibold text-white/68 hover:text-white">See Pro pricing</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
