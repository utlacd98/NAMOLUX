import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { pseoNiches, nicheCategories } from "@/lib/pseo-niches"
import { Sparkles, ArrowRight, ChevronRight } from "lucide-react"
import { CTA_LABELS } from "@/lib/site-content"

const totalPublishedNameCount = pseoNiches.reduce(
  (total, niche) => total + niche.publishedNameCount,
  0,
)
const totalDisplayedNameCount = pseoNiches.reduce(
  (total, niche) => total + niche.displayedNameCount,
  0,
)
const industryCount = pseoNiches.length
const publishedNameCountLabel = totalPublishedNameCount.toLocaleString("en-GB")
const availableExtensionsLabel = pseoNiches[0]?.availableExtensions.join(", ") ?? ""

export const metadata: Metadata = {
  title: `Startup Name Ideas by Niche: ${publishedNameCountLabel} Brandable Names | NamoLux`,
  description: `Browse ${publishedNameCountLabel} startup name ideas across ${industryCount} industries — AI, fintech, crypto, fitness, SaaS, and more. Each idea includes a Founder Signal™ score and domain suggestion.`,
  openGraph: {
    title: `Startup Name Ideas by Niche: ${publishedNameCountLabel} Brandable Names | NamoLux`,
    description: `Browse ${publishedNameCountLabel} startup name ideas across ${industryCount} industries with Founder Signal™ scores and domain suggestions.`,
    type: "website",
    url: "https://www.namolux.com/startup-name-ideas",
  },
  alternates: { canonical: "/startup-name-ideas" },
}

const nicheIcons: Record<string, string> = {
  ai: "🤖", fintech: "💳", crypto: "⛓️", marketing: "📣", fitness: "💪",
  saas: "🖥️", ecommerce: "🛍️", "real-estate": "🏠", health: "🏥",
  podcast: "🎙️", "coffee-shop": "☕", gaming: "🎮", travel: "✈️",
  consulting: "📊", sustainability: "🌱",
}

export default function StartupNameIdeasPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Startup Name Ideas by Niche",
    description: `${publishedNameCountLabel} curated startup name ideas across ${industryCount} industries with Founder Signal™ scores and domain suggestions.`,
    url: "https://www.namolux.com/startup-name-ideas",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.namolux.com" },
        { "@type": "ListItem", position: 2, name: "Startup Name Ideas", item: "https://www.namolux.com/startup-name-ideas" },
      ],
    },
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
          {/* Hero */}
          <section className="border-b border-[#1a1a1a] py-16 px-4 text-center">
            <div className="mx-auto max-w-3xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 px-3 py-1 text-xs text-[#D4A843] mb-6">
                <Sparkles className="h-3 w-3" />
                {totalDisplayedNameCount.toLocaleString("en-GB")} curated name ideas
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
                Startup Name Ideas<br />
                <span className="text-[#D4A843]">for Every Niche</span>
              </h1>
              <p className="text-[#888] text-lg mb-8 max-w-xl mx-auto">
                Browse curated name ideas across {industryCount} industries. Every name includes a Founder Signal™ score, a domain suggestion, and the story behind the name.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/bulk-domain-check"
                  className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold px-6 py-3 rounded-lg transition"
                >
                  <Sparkles className="h-4 w-4" />
                  {CTA_LABELS.primary}
                </Link>
                <Link
                  href="#niches"
                  className="inline-flex items-center gap-2 bg-[#141414] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-white font-medium px-6 py-3 rounded-lg transition"
                >
                  Browse All Niches
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Niche grid by category */}
          <section id="niches" className="py-14 px-4">
            <div className="mx-auto max-w-5xl space-y-12">
              {nicheCategories.map((cat) => {
                const niches = pseoNiches.filter((n) => cat.slugs.includes(n.slug))
                return (
                  <div key={cat.label}>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="w-6 h-px bg-[#D4A843]" />
                      {cat.label}
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {niches.map((n) => (
                        <Link
                          key={n.slug}
                          href={`/startup-name-ideas/${n.slug}`}
                          className="group bg-[#111] hover:bg-[#141414] border border-[#1f1f1f] hover:border-[#D4A843]/20 rounded-xl p-5 transition"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className="text-2xl">{nicheIcons[n.slug] ?? "💡"}</span>
                            <span className="text-xs text-[#555] group-hover:text-[#888] transition">
                              {n.displayedNameCount} names
                            </span>
                          </div>
                          <h3 className="text-white font-semibold mb-1 group-hover:text-[#D4A843] transition">
                            {n.niche}
                          </h3>
                          <p className="text-[#555] text-xs leading-relaxed line-clamp-2 mb-3">
                            {n.intro.slice(0, 100)}…
                          </p>
                          <div className="flex items-center gap-1 text-xs text-[#D4A843] opacity-0 group-hover:opacity-100 transition">
                            Browse names
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* How it works */}
          <section className="border-t border-[#1a1a1a] py-14 px-4">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-white text-center mb-10">
                How to Use These Name Ideas
              </h2>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { step: "1", title: "Browse for inspiration", desc: "Find your industry and use the examples as a starting point for your own candidate list." },
                  { step: "2", title: "Shortlist candidates", desc: "Pick 5-10 names that feel right and bring them into one decision workspace." },
                  { step: "3", title: "Check and compare", desc: "Check six domain extensions, then use Founder Signal when you need a ranked view." },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#D4A843] font-bold flex items-center justify-center mx-auto mb-3">
                      {item.step}
                    </div>
                    <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                    <p className="text-[#666] text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="border-t border-[#1a1a1a] py-14 px-4 text-center">
            <div className="mx-auto max-w-xl">
              <h2 className="text-2xl font-bold text-white mb-3">
                Ready to check your own shortlist?
              </h2>
              <p className="text-[#888] mb-6">
                Bring candidate names from any source. NamoLux checks best-effort availability across {availableExtensionsLabel} and helps you compare the names worth pursuing.
              </p>
              <Link
                href="/bulk-domain-check"
                className="inline-flex items-center gap-2 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold px-8 py-3.5 rounded-lg transition"
              >
                <Sparkles className="h-4 w-4" />
                {CTA_LABELS.editorial} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}
