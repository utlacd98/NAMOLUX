import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"

const siteUrl = "https://www.namolux.com"
const authorUrl = `${siteUrl}/journal/andrew-barrett`
const personId = `${authorUrl}#person`

export const metadata: Metadata = {
  title: "Andrew Barrett | NamoLux Journal",
  description: "Andrew Barrett is the founder and editor of NamoLux, writing about naming strategy, domain due diligence, and practical brand decisions.",
  alternates: { canonical: "/journal/andrew-barrett" },
}

export default function AndrewBarrettPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${authorUrl}#profilepage`,
        url: authorUrl,
        mainEntity: { "@id": personId },
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
      {
        "@type": "Person",
        "@id": personId,
        name: "Andrew Barrett",
        url: authorUrl,
        sameAs: [
          "https://andrewbarrett.dev/",
          "https://www.linkedin.com/in/andrew-barrett-587a21390/",
          "https://x.com/AndrewBuilds98",
        ],
        jobTitle: "Founder and Developer",
        worksFor: { "@id": `${siteUrl}/#organization` },
        homeLocation: { "@type": "Place", name: "Rhyl, North Wales, United Kingdom" },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "NamoLux",
        url: `${siteUrl}/`,
        logo: { "@type": "ImageObject", url: `${siteUrl}/icon.png` },
        founder: { "@id": personId },
      },
    ],
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0a] text-[#f5f1ea]">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <main id="main-content" className="flex-1 px-4 pb-20 pt-32">
        <article className="mx-auto max-w-3xl">
          <Link href="/blog" className="inline-flex min-h-11 items-center gap-2 text-sm text-[#bcb5aa] transition hover:text-[#e1c27f]">
            <ArrowLeft className="h-4 w-4" />
            Back to the Journal
          </Link>
          <div className="mt-10 border-y border-[#e2cba0]/20 py-12">
            <p className="font-mono text-xs text-[#c4a15b]">Founder and editor</p>
            <h1 className="mt-4 font-display text-5xl font-medium tracking-[-0.04em] sm:text-7xl">Andrew Barrett</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#bcb5aa]">
              Andrew founded NamoLux and edits its Journal. His work focuses on the point where a candidate list becomes a real business decision: naming strategy, domain due diligence, and the evidence founders need before committing.
            </p>
          </div>
          <section className="grid gap-8 py-12 sm:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-medium">Editorial principles</h2>
              <p className="mt-4 leading-7 text-[#bcb5aa]">
                NamoLux articles separate domain availability, company-name collisions, social handles, and legal trademark clearance. Examples are decision support, not legal advice or guarantees.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl font-medium">External profile</h2>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                <a
                  href="https://andrewbarrett.dev/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-[#e1c27f] underline decoration-[#c4a15b]/50 underline-offset-4"
                >
                  Andrew Barrett&apos;s portfolio
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href="https://www.linkedin.com/in/andrew-barrett-587a21390/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-[#e1c27f] underline decoration-[#c4a15b]/50 underline-offset-4"
                >
                  LinkedIn
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href="https://x.com/AndrewBuilds98"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-[#e1c27f] underline decoration-[#c4a15b]/50 underline-offset-4"
                >
                  Follow Andrew on X
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  )
}
