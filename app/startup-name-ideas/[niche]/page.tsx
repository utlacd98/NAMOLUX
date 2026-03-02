import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { getAllNicheSlugs, getNicheBySlug, pseoNiches } from "@/lib/pseo-niches"
import { Sparkles, ExternalLink, Star, ChevronRight, ArrowRight } from "lucide-react"

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

function scoreColor(score: number): string {
  if (score >= 88) return "text-[#D4A843]"
  if (score >= 80) return "text-emerald-400"
  return "text-[#888]"
}

function scoreBadge(score: number): string {
  if (score >= 88) return "bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843]"
  if (score >= 80) return "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
  return "bg-[#1f1f1f] border border-[#2a2a2a] text-[#888]"
}

export default async function NichePage({ params }: NichePageProps) {
  const { niche } = await params
  const data = getNicheBySlug(niche)
  if (!data) notFound()

  const relatedNiches = pseoNiches.filter((n) => n.slug !== niche).slice(0, 6)

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
            { "@type": "ListItem", position: 3, name: `${data.niche} Names`, item: `https://www.namolux.com/startup-name-ideas/${data.slug}` },
          ],
        },
      },
      {
        "@type": "ItemList",
        name: data.h1,
        description: data.metaDescription,
        numberOfItems: data.names.length,
        itemListElement: data.names.slice(0, 10).map((name, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: name.name,
          description: name.meaning,
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
        <main className="flex-1 pt-20">
          {/* Breadcrumb */}
          <div className="border-b border-[#1a1a1a]">
            <div className="mx-auto max-w-5xl px-4 py-3">
              <nav className="flex items-center gap-1.5 text-sm text-[#555]">
                <Link href="/" className="hover:text-[#888] transition-colors">Home</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href="/startup-name-ideas" className="hover:text-[#888] transition-colors">Startup Name Ideas</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-[#888]">{data.niche}</span>
              </nav>
            </div>
          </div>

          {/* Hero */}
          <section className="border-b border-[#1a1a1a] py-14 px-4">
            <div className="mx-auto max-w-5xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 px-3 py-1 text-xs text-[#D4A843] mb-6">
                <Sparkles className="h-3 w-3" />
                {data.names.length} name ideas
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5 max-w-3xl">
                {data.h1}
              </h1>
              <p className="text-[#888] text-lg max-w-2xl leading-relaxed mb-8">
                {data.intro}
              </p>
              <a
                href="/generate"
                className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold px-6 py-3 rounded-lg transition"
              >
                <Sparkles className="h-4 w-4" />
                Generate Personalised Names with AI
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </section>

          <div className="mx-auto max-w-5xl px-4 py-12">
            <div className="grid lg:grid-cols-[1fr_300px] gap-10">
              {/* Main content */}
              <div>
                {/* Naming Tips */}
                <section className="mb-10">
                  <h2 className="text-xl font-bold text-white mb-4">
                    How to Name a {data.niche} Business
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

                {/* Name list */}
                <section>
                  <h2 className="text-xl font-bold text-white mb-6">
                    {data.names.length} {data.niche} Name Ideas
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
                                  {item.domain}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${scoreBadge(item.score)}`}>
                              <Star className="h-3 w-3" />
                              {item.score}
                            </div>
                            <p className="text-[#444] text-xs mt-1">Founder Signal™</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mid-list CTA */}
                  <div className="my-8 bg-gradient-to-r from-[#1a1710] to-[#141414] border border-[#D4A843]/20 rounded-xl p-6 text-center">
                    <p className="text-white font-semibold mb-2">
                      None of these quite right?
                    </p>
                    <p className="text-[#888] text-sm mb-4">
                      NamoLux generates personalised {data.niche} name ideas based on your exact brand vision — with real-time domain availability checks.
                    </p>
                    <a
                      href="/generate"
                      className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold px-5 py-2.5 rounded-lg transition text-sm"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Names for My {data.niche} Brand →
                    </a>
                  </div>
                </section>

                {/* What makes a good name — SEO section */}
                <section className="mt-10">
                  <h2 className="text-xl font-bold text-white mb-4">
                    What Makes a Great {data.niche} Business Name?
                  </h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-[#888] leading-relaxed mb-4">
                      The best {data.niche.toLowerCase()} business names share several characteristics: they are short enough to remember and type easily, they are distinctive enough to trademark, and they convey the right feeling without being too literal or too generic.
                    </p>
                    <p className="text-[#888] leading-relaxed mb-4">
                      When evaluating a name, apply the "radio test" — if someone heard your name spoken on the radio, could they spell it and find it? If not, you're losing customers before they even reach your website. For {data.niche.toLowerCase()} companies specifically, also consider whether the name will still make sense as you grow and potentially expand your offering.
                    </p>
                    <p className="text-[#888] leading-relaxed">
                      NamoLux's Founder Signal™ score rates each name from 0–100 based on brandability, clarity, domain viability, and scalability. Names scoring above 85 represent the strongest candidates for building a lasting brand.
                    </p>
                  </div>
                </section>

                {/* Domain tips */}
                <section className="mt-10 bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-3">
                    Getting the Domain for Your {data.niche} Brand
                  </h2>
                  <p className="text-[#888] text-sm leading-relaxed mb-4">
                    Once you have a shortlist of names, check domain availability immediately — good names get taken fast. Always try to secure the .com first, then .io or .co as alternatives. If the .com is taken, consider adding a short prefix ('get', 'try', 'use') or suffix before settling for a less recognised TLD.
                  </p>
                  <a
                    href="/generate"
                    className="inline-flex items-center gap-2 text-[#D4A843] hover:text-[#c49a3d] text-sm font-medium transition"
                  >
                    Check domain availability with NamoLux
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </section>
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* CTA Card */}
                <div className="sticky top-24 space-y-6">
                  <div className="bg-gradient-to-b from-[#1a1710] to-[#111] border border-[#D4A843]/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-[#D4A843]" />
                      <span className="text-white font-semibold text-sm">AI Name Generator</span>
                    </div>
                    <p className="text-[#888] text-xs leading-relaxed mb-4">
                      Generate hundreds of personalised {data.niche} name ideas in seconds, with real-time domain and social handle availability.
                    </p>
                    <a
                      href="/generate"
                      className="block w-full text-center bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold py-2.5 rounded-lg transition text-sm"
                    >
                      Generate Names Free →
                    </a>
                  </div>

                  {/* Score legend */}
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                    <h3 className="text-white font-semibold text-sm mb-3">Founder Signal™ Score</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#D4A843]">88–100 · Elite</span>
                        <span className="text-[#555]">Exceptional brand potential</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400">80–87 · Strong</span>
                        <span className="text-[#555]">Highly viable name</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#888]">70–79 · Good</span>
                        <span className="text-[#555]">Solid starting point</span>
                      </div>
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
                          <span>{n.niche}</span>
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
                Ready to Find Your Perfect {data.niche} Name?
              </h2>
              <p className="text-[#888] mb-6">
                NamoLux generates AI-powered name ideas tailored to your niche, brand vibe, and industry — with instant domain availability across .com, .io, .ai, and .co.
              </p>
              <a
                href="/generate"
                className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold px-8 py-3.5 rounded-lg transition"
              >
                <Sparkles className="h-4 w-4" />
                Generate More {data.niche} Names →
              </a>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
