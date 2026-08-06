import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { getAllNicheSlugs, getNicheBySlug, pseoNiches } from "@/lib/pseo-niches"
import {
  FOUNDER_SIGNAL_BANDS,
  getFounderSignalBand,
  type FounderSignalBand,
} from "@/lib/founderSignal/spec"
import { Sparkles, ExternalLink, Star, ChevronRight, ArrowRight } from "lucide-react"
import { CTA_LABELS } from "@/lib/site-content"
import { AdBanner } from "@/components/ad-banner"
import { ContextualMiniGenerator } from "@/components/contextual-mini-generator"

interface NichePageProps {
  params: Promise<{ niche: string }>
}

export async function generateStaticParams() {
  return getAllNicheSlugs().map((slug) => ({ niche: slug }))
}

export async function generateMetadata({ params }: NichePageProps): Promise<Metadata> {
  const { niche } = await params
  const data = getNicheBySlug(niche)
  if (!data) return { title: "Not Found | NamoLux" }

  const url = `https://www.namolux.com/startup-name-ideas/${data.slug}`
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      type: "article",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: data.metaTitle,
      description: data.metaDescription,
    },
    alternates: { canonical: `/startup-name-ideas/${data.slug}` },
  }
}

const SCORE_BAND_STYLES: Record<FounderSignalBand, string> = {
  Elite: "bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843]",
  Strong: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400",
  Viable: "bg-sky-500/10 border border-sky-500/30 text-sky-300",
  Reconsider: "bg-red-500/10 border border-red-500/30 text-red-300",
}

const SCORE_BAND_TEXT_STYLES: Record<FounderSignalBand, string> = {
  Elite: "text-[#D4A843]",
  Strong: "text-emerald-400",
  Viable: "text-sky-300",
  Reconsider: "text-red-300",
}

const SCORE_BAND_DESCRIPTIONS: Record<FounderSignalBand, string> = {
  Elite: "Exceptional potential",
  Strong: "High brand potential",
  Viable: "Worth further review",
  Reconsider: "Material concerns",
}

function scoreBadge(score: number): string {
  return SCORE_BAND_STYLES[getFounderSignalBand(score)]
}

export default async function NichePage({ params }: NichePageProps) {
  const { niche } = await params
  const data = getNicheBySlug(niche)
  if (!data) notFound()

  const relatedNiches = pseoNiches.filter((n) => n.slug !== niche).slice(0, 6)
  const availableExtensions = data.availableExtensions.join(", ")
  const defaultBrief = `I am building ${data.industryArticle} ${data.industryName} business. I want a professional, memorable name that feels credible in this market, is easy to pronounce, and has a strong domain.`
  const shortlistHref = "/bulk-domain-check"

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `https://www.namolux.com/startup-name-ideas/${data.slug}`,
        url: `https://www.namolux.com/startup-name-ideas/${data.slug}`,
        name: data.metaTitle,
        description: data.metaDescription,
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://www.namolux.com" },
            { "@type": "ListItem", position: 2, name: "Startup Name Ideas", item: "https://www.namolux.com/startup-name-ideas" },
            { "@type": "ListItem", position: 3, name: `${data.industryName} Names`, item: `https://www.namolux.com/startup-name-ideas/${data.slug}` },
          ],
        },
      },
      {
        "@type": "ItemList",
        name: data.h1,
        description: data.metaDescription,
        numberOfItems: data.publishedNameCount,
        itemListElement: data.names.slice(0, 10).map((name, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: name.name,
          description: name.meaning,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: data.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
        <Navbar />
        <main id="main-content" className="flex-1 pt-20">
          {/* Breadcrumb */}
          <div className="border-b border-[#1a1a1a]">
            <div className="mx-auto max-w-5xl px-4 py-3">
              <nav className="flex items-center gap-1.5 text-sm text-[#555]">
                <Link href="/" className="hover:text-[#888] transition-colors">Home</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href="/startup-name-ideas" className="hover:text-[#888] transition-colors">Startup Name Ideas</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-[#888]">{data.industryName}</span>
              </nav>
            </div>
          </div>

          {/* Hero */}
          <section className="border-b border-[#1a1a1a] py-14 px-4">
            <div className="mx-auto max-w-5xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 px-3 py-1 text-xs text-[#D4A843] mb-6">
                <Sparkles className="h-3 w-3" />
                {data.displayedNameCount} name ideas
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5 max-w-3xl">
                {data.h1}
              </h1>
              <p className="text-[#888] text-lg max-w-2xl leading-relaxed mb-8">
                {data.intro}
              </p>
              <Link
                href={shortlistHref}
                className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold px-6 py-3 rounded-lg transition"
              >
                <Sparkles className="h-4 w-4" />
                {CTA_LABELS.primary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <div className="mx-auto max-w-5xl px-4 py-12">
            <div className="grid lg:grid-cols-[1fr_300px] gap-10">
              {/* Main content */}
              <div>
                <AdBanner placement="guide-after-intro" />

                {/* Naming Tips */}
                <section className="mt-10 mb-10">
                  <h2 className="text-xl font-bold text-white mb-4">
                    How to Name Your {data.industryName} Business
                  </h2>
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 space-y-2">
                    {data.namingTips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-[#aaa]">
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#D4A843] text-xs flex items-center justify-center font-medium">
                          {i + 1}
                        </span>
                        {tip}
                      </div>
                    ))}
                  </div>
                </section>

                <ContextualMiniGenerator
                  source="niche"
                  contentSlug={data.slug}
                  topic={data.niche}
                  defaultBrief={defaultBrief}
                  heading={`Check a personalised ${data.industryName} shortlist`}
                  ctaId={`niche-${data.slug}`}
                />

                {/* Name list */}
                <section>
                  <h2 className="text-xl font-bold text-white mb-6">
                    {data.displayedNameCount} {data.industryName} Name Ideas
                  </h2>

                  <div className="space-y-3">
                    {data.names.map((item, i) => (
                      <div
                        key={item.name}
                        className="group bg-[#111] hover:bg-[#141414] border border-[#1f1f1f] hover:border-[#2a2a2a] rounded-xl p-4 transition"
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="text-[#333] text-xs mt-1 w-6 flex-shrink-0 text-right">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <h3 className="text-white font-semibold text-base leading-snug">
                                {item.name}
                              </h3>
                              <p className="text-[#666] text-sm mt-1 leading-relaxed">
                                {item.meaning}
                              </p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-xs text-[#555]">
                                  <ExternalLink className="h-3 w-3" />
                                  Suggested domain: {item.domain}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${scoreBadge(item.score)}`}>
                              <Star className="h-3 w-3" />
                              {item.score} · {getFounderSignalBand(item.score)}
                            </div>
                            <p className="text-[#444] text-xs mt-1">Founder Signal™ v{data.scoreVersion}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mid-list CTA */}
                  <div className="my-8 bg-gradient-to-r from-[#1a1710] to-[#141414] border border-[#D4A843]/20 rounded-xl p-6 text-center">
                    <p className="text-white font-semibold mb-2">
                      Have your own candidates to compare?
                    </p>
                    <p className="text-[#888] text-sm mb-4">
                      Paste up to 50 names and check domain status across {availableExtensions} in one focused workspace.
                    </p>
                    <Link
                      href={shortlistHref}
                      className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold px-5 py-2.5 rounded-lg transition text-sm"
                    >
                      <Sparkles className="h-4 w-4" />
                      {CTA_LABELS.editorial} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </section>

                <AdBanner placement="founder-result-after-primary" />

                {/* Real-world brand examples */}
                <section className="mt-10">
                  <h2 className="text-xl font-bold text-white mb-4">
                    Real-World {data.industryName} Brand Names — and Why They Work
                  </h2>
                  <div className="space-y-3">
                    {data.realWorldExamples.map((ex) => (
                      <div key={ex.brand} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                        <p className="text-white font-semibold text-sm mb-1">{ex.brand}</p>
                        <p className="text-[#777] text-sm leading-relaxed">{ex.why}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Common mistakes */}
                <section className="mt-10">
                  <h2 className="text-xl font-bold text-white mb-4">
                    Common {data.industryName} Naming Mistakes to Avoid
                  </h2>
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 space-y-3">
                    {data.commonMistakes.map((mistake, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-[#aaa]">
                        <span className="mt-0.5 flex-shrink-0 text-red-400 font-bold text-base leading-none">✕</span>
                        {mistake}
                      </div>
                    ))}
                  </div>
                </section>

                {/* FAQ */}
                <section className="mt-10">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {data.industryName} Naming FAQs
                  </h2>
                  <div className="space-y-4">
                    {data.faqs.map((faq, i) => (
                      <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                        <p className="text-white font-semibold text-sm mb-2">{faq.q}</p>
                        <p className="text-[#777] text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <AdBanner placement="guide-before-conclusion" />

                {/* Domain tips */}
                <section className="mt-10 bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-3">
                    Getting the Domain for Your {data.industryName} Brand
                  </h2>
                  <p className="text-[#888] text-sm leading-relaxed mb-4">
                    Once you have a shortlist, check the supported extensions ({availableExtensions}) and confirm the result with your registrar before purchasing. Domain availability is separate from company-name, social-handle, and legal trademark checks.
                  </p>
                  <Link
                    href="/bulk-domain-check"
                    className="inline-flex items-center gap-2 text-[#D4A843] hover:text-[#c49a3d] text-sm font-medium transition"
                  >
                    {CTA_LABELS.secondaryProduct}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </section>
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* CTA Card */}
                <div className="sticky top-24 space-y-6">
                  <div className="bg-gradient-to-b from-[#1a1710] to-[#111] border border-[#D4A843]/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-[#D4A843]" />
                      <span className="text-white font-semibold text-sm">Bulk Domain Check</span>
                    </div>
                    <p className="text-[#888] text-xs leading-relaxed mb-4">
                      Compare your {data.industryName} shortlist with best-effort domain checks across {availableExtensions}. Social-handle checks are separate.
                    </p>
                    <Link
                      href={shortlistHref}
                      className="block w-full text-center bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold py-2.5 rounded-lg transition text-sm"
                    >
                      {CTA_LABELS.primary} <ArrowRight className="inline h-4 w-4" />
                    </Link>
                  </div>

                  {/* Score legend */}
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                    <h3 className="text-white font-semibold text-sm mb-1">Founder Signal™ Score</h3>
                    <p className="text-[#555] text-xs mb-3">
                      Version {data.scoreVersion} · evaluated <time dateTime={data.lastVerified}>{data.lastVerified}</time>
                    </p>
                    <div className="space-y-2 text-xs">
                      {FOUNDER_SIGNAL_BANDS.map((band) => (
                        <div key={band.label} className="flex items-center justify-between gap-3">
                          <span className={SCORE_BAND_TEXT_STYLES[band.label]}>
                            {band.min}–{band.max} · {band.label}
                          </span>
                          <span className="text-[#555] text-right">{SCORE_BAND_DESCRIPTIONS[band.label]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Related niches */}
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                    <h3 className="text-white font-semibold text-sm mb-3">Explore Other Niches</h3>
                    <div className="space-y-1">
                      {relatedNiches.map((n) => (
                        <Link
                          key={n.slug}
                          href={`/startup-name-ideas/${n.slug}`}
                          className="flex items-center justify-between py-1.5 text-[#666] hover:text-white text-xs transition group"
                        >
                          <span>{n.industryName}</span>
                          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/startup-name-ideas"
                      className="mt-3 block text-center text-xs text-[#D4A843] hover:text-[#c49a3d] transition"
                    >
                      View all niches →
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          {/* Bottom CTA */}
          <section className="border-t border-[#1a1a1a] py-14 px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-white mb-3">
                Ready to Compare Your {data.industryName} Shortlist?
              </h2>
              <p className="text-[#888] mb-6">
                NamoLux checks up to 50 candidate names across {availableExtensions} and adds Founder Signal when you want a ranked decision view.
              </p>
              <a
                href={shortlistHref}
                className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold px-8 py-3.5 rounded-lg transition"
              >
                <Sparkles className="h-4 w-4" />
                Check My Shortlist →
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
