import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpenCheck, CircleCheck, Scale, UserRound } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Editorial Standards & Corrections | NamoLux",
  description:
    "How NamoLux researches, reviews, updates and corrects its naming and domain guidance.",
  alternates: { canonical: "/editorial-standards" },
  openGraph: {
    title: "NamoLux Editorial Standards & Corrections",
    description: "Our approach to sources, first-hand experience, product claims, updates and corrections.",
    type: "website",
    url: "https://www.namolux.com/editorial-standards",
  },
}

const standards = [
  {
    icon: BookOpenCheck,
    title: "Start with a decision founders actually face",
    body: "Every public guide must help with a concrete naming, domain or brand decision. We do not publish pages simply to target a keyword or repeat advice already available elsewhere.",
  },
  {
    icon: Scale,
    title: "Separate evidence from judgment",
    body: "Official rules, registry procedures and factual claims are checked against primary or authoritative sources where those sources exist. Heuristics, opinions and founder experience are labelled as guidance rather than certainty.",
  },
  {
    icon: UserRound,
    title: "Keep a human accountable",
    body: "Andrew Barrett founded and develops NamoLux and owns final publication decisions. The NamoLux Team byline identifies product-led editorial work; it is not presented as an independent newsroom or professional legal authority.",
  },
] as const

const reviewSteps = [
  "Define the reader’s decision and remove sections that do not help it.",
  "Check time-sensitive claims against the linked official source.",
  "Test product descriptions against the live NamoLux experience.",
  "Add practical limitations, especially around domains, company names and trade marks.",
  "Review links, dates, examples and internal recommendations before publication.",
] as const

export default function EditorialStandardsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "NamoLux Editorial Standards & Corrections",
    url: "https://www.namolux.com/editorial-standards",
    description: "How NamoLux researches, reviews, updates and corrects its public guidance.",
    isPartOf: { "@id": "https://www.namolux.com/#website" },
    about: { "@id": "https://www.namolux.com/#organization" },
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="main-content">
        <header className="border-b border-white/10 px-4 pb-16 pt-32 sm:pb-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8ba7c]">Editorial policy</p>
            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
              <div>
                <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">
                  Useful guidance needs an accountable point of view.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/58">
                  This page explains how NamoLux chooses what to publish, checks factual claims, distinguishes product guidance from legal advice, and handles corrections.
                </p>
              </div>
              <div className="border-l border-[#d8ba7c]/45 pl-5 text-sm leading-6 text-white/52">
                <p>Policy owner</p>
                <p className="mt-1 font-semibold text-white">Andrew Barrett, Founder</p>
                <p className="mt-4">Last reviewed</p>
                <time className="mt-1 block font-semibold text-white" dateTime="2026-08-25">25 August 2026</time>
              </div>
            </div>
          </div>
        </header>

        <section className="px-4 py-16 sm:py-20" aria-labelledby="standards-heading">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8ba7c]">01 / Publication standard</p>
              <h2 id="standards-heading" className="mt-4 font-display text-3xl font-semibold sm:text-4xl">What earns a place in the public Journal.</h2>
            </div>
            <div className="mt-10 grid border-l border-t border-white/10 md:grid-cols-3">
              {standards.map(({ icon: Icon, title, body }) => (
                <article key={title} className="border-b border-r border-white/10 p-6 sm:p-8">
                  <Icon className="h-5 w-5 text-[#d8ba7c]" aria-hidden="true" />
                  <h3 className="mt-8 text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/52">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025] px-4 py-16 sm:py-20" aria-labelledby="review-heading">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8ba7c]">02 / Review process</p>
              <h2 id="review-heading" className="mt-4 font-display text-3xl font-semibold sm:text-4xl">Before an article goes live.</h2>
              <p className="mt-5 text-sm leading-7 text-white/52">
                Source links are shown at the end of articles that rely on official rules, databases or market evidence. A verification date shows when a time-sensitive source was last checked.
              </p>
            </div>
            <ol className="divide-y divide-white/10 border-y border-white/10">
              {reviewSteps.map((step, index) => (
                <li key={step} className="grid grid-cols-[2.5rem_1fr] gap-4 py-5 text-sm leading-6 text-white/65">
                  <span className="font-mono text-xs text-[#d8ba7c]">{String(index + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 py-16 sm:py-20" aria-labelledby="boundaries-heading">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8ba7c]">03 / Boundaries</p>
              <h2 id="boundaries-heading" className="mt-4 font-display text-3xl font-semibold sm:text-4xl">What our content does not claim.</h2>
              <div className="mt-7 space-y-4 text-sm leading-7 text-white/55">
                <p>Founder Signal is a documented decision-support heuristic. It is not a trade mark search, legal clearance opinion, registrar guarantee or prediction of commercial success.</p>
                <p>Domain states can change after a check. Company-name, social-profile and trade-mark links are separate verification steps and must be confirmed with the relevant provider or professional.</p>
                <p>Commercial relationships do not determine editorial conclusions. Where NamoLux may earn a partner commission, the site discloses that relationship.</p>
              </div>
            </div>
            <aside className="border border-[#d8ba7c]/30 bg-[#d8ba7c]/[0.05] p-7 sm:p-8" aria-labelledby="corrections-heading">
              <CircleCheck className="h-6 w-6 text-[#d8ba7c]" aria-hidden="true" />
              <h2 id="corrections-heading" className="mt-7 text-2xl font-semibold">Corrections and updates</h2>
              <p className="mt-4 text-sm leading-7 text-white/58">
                If a source has changed, a link is broken, or a statement is unclear, send the page URL and the issue. Material corrections are made in the article and its review date is updated.
              </p>
              <Link href="/contact" className="mt-7 inline-flex min-h-11 items-center gap-2 border border-[#d8ba7c]/55 px-4 text-sm font-semibold text-[#efd79d] transition hover:bg-[#d8ba7c]/10">
                Report an editorial issue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
