import type { Metadata } from "next"
import { GenerateNames } from "@/components/generate-names-premium"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { parseContentSlug, parseGeneratorSource } from "@/lib/generator-attribution"
import { isGeneratorRedesignEnabled } from "@/lib/generator-flags"
import { isGeneratorLabV3Enabled } from "@/lib/generator-flags"
import { isGeneratorLabRequestAllowed, isPublicNameSprintEnabled } from "@/lib/generator-lab"
import { LabNameGenerator } from "@/components/lab-name-generator"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isNameSprintPreviewUser } from "@/lib/name-sprint/preview-access"
import Link from "next/link"
import { ArrowRight, LockKeyhole, SearchCheck, ShieldCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "NamoLux Name Sprint | Curated Business Name Generator",
  description:
    "Describe your business, discover focused names with verified .com, .co or .ai domains, then run Founder Signal on the names you choose.",
  keywords: [
    "curated business name generator",
    "AI business name generator",
    "business name generator",
    "startup name generator",
    "domain availability checker",
    "brand name ideas",
    "Founder Signal scoring",
  ],
  robots: { index: false, follow: false },
  openGraph: {
    title: "NamoLux Name Sprint | Curated Business Name Generator",
    description:
      "Discover focused names with verified launch domains, then evaluate your favourites with Founder Signal on demand.",
    url: "https://www.namolux.com/generate",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NamoLux Name Sprint curated business name generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NamoLux Name Sprint | Curated Business Name Generator",
    description:
      "Discover focused names with verified launch domains, then evaluate your favourites with Founder Signal on demand.",
    images: ["/opengraph-image"],
  },
}

type GeneratePageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

function NameSprintComingSoon() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#090a0b] px-5 pb-20 pt-32 text-stone-100 sm:px-8 sm:pt-40">
        <section className="mx-auto max-w-6xl overflow-hidden border border-[#d6b15e]/25 bg-[#0d0f10]">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-white/10 p-7 sm:p-12 lg:border-b-0 lg:border-r lg:p-16">
              <div className="mb-8 inline-flex items-center gap-2 border border-[#d6b15e]/30 bg-[#d6b15e]/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#e9ca82]">
                <LockKeyhole size={15} /> Private quality testing
              </div>
              <h1 className="max-w-3xl font-serif text-5xl leading-[0.98] tracking-[-0.035em] text-stone-50 sm:text-6xl lg:text-7xl">
                Name Sprint is coming soon.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-400 sm:text-xl">
                We are testing a simpler discovery-first flow before opening generation publicly. Names must have verified launch domains and clear preliminary screening; Founder Signal is then available when you choose a favourite.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/bulk-domain-check" className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#d6b15e] px-6 font-semibold text-[#090a0b] transition hover:bg-[#e4c576]">
                  Check names you already have <ArrowRight size={17} />
                </Link>
                <Link href="/founder-signal" className="inline-flex min-h-12 items-center justify-center border border-white/15 px-6 font-semibold text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04]">
                  Explore Founder Signal
                </Link>
              </div>
            </div>
            <aside className="bg-[#0a0c0d] p-7 sm:p-12 lg:p-14">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b15e]">Available now</p>
              <div className="mt-8 space-y-8">
                <div className="flex gap-4">
                  <SearchCheck className="mt-1 shrink-0 text-emerald-300" size={22} />
                  <div><h2 className="text-lg font-semibold">Bulk Domain Check</h2><p className="mt-2 leading-7 text-stone-500">Compare your existing shortlist across six extensions with one consistent evidence view.</p></div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex gap-4">
                  <ShieldCheck className="mt-1 shrink-0 text-[#e9ca82]" size={22} />
                  <div><h2 className="text-lg font-semibold">Founder Signal</h2><p className="mt-2 leading-7 text-stone-500">Evaluate memorability, pronunciation, strategic fit, domain strength and collision risk.</p></div>
                </div>
              </div>
              <p className="mt-12 border-l-2 border-[#d6b15e]/60 pl-4 text-sm leading-6 text-stone-500">No waiting list or payment is required. The rest of the NamoLux workspace remains available while Name Sprint is calibrated.</p>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const requestHeaders = await headers()
  const labRequest = isGeneratorLabRequestAllowed(requestHeaders.get("host"))
  const publicSprint = isPublicNameSprintEnabled()
  if (!labRequest && !publicSprint) {
    redirect("/bulk-domain-check")
  }
  if (publicSprint || (labRequest && isGeneratorLabV3Enabled())) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!isNameSprintPreviewUser(user)) return <NameSprintComingSoon />
    return <LabNameGenerator internalTools={labRequest} />
  }
  const params = await searchParams
  const rawBrief = params?.q ?? params?.keyword
  const initialBrief = (Array.isArray(rawBrief) ? rawBrief[0] : rawBrief || "").slice(0, 1000)
  const rawMode = Array.isArray(params?.mode) ? params.mode[0] : params?.mode
  const initialMode: "quick" | "advanced" | "bulk" = rawMode === "advanced" || rawMode === "bulk" ? rawMode : "quick"
  const rawNames = Array.isArray(params?.names) ? params.names[0] : params?.names
  const initialNames = (rawNames || "").slice(0, 5000)
  const initialSource = parseGeneratorSource(params?.source)
  const initialContentSlug = parseContentSlug(params?.content)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": "https://www.namolux.com/generate#app",
    name: "NamoLux Domain Name Generator",
    url: "https://www.namolux.com/generate",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Explore names free in Quick, use three Advanced batches and one complete Founder Signal batch each month, then check domains without interrupting ideation.",
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "GBP", description: PRODUCT_OFFER.freeUsageLabel },
      { "@type": "Offer", price: PRODUCT_OFFER.proMonthlyPrice, priceCurrency: "GBP", description: "NamoLux Pro monthly plan" },
      { "@type": "Offer", price: PRODUCT_OFFER.proAnnualPrice, priceCurrency: "GBP", description: "NamoLux Pro annual plan" },
    ],
    publisher: { "@id": "https://www.namolux.com/#organization" },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Navbar />
      <div className="pt-[78px]">
        <GenerateNames
          initialBrief={initialBrief}
          initialMode={initialMode}
          initialNames={initialNames}
          hasInitialMode={Boolean(rawMode)}
          initialSource={initialSource}
          initialContentSlug={initialContentSlug}
          redesignEnabled={isGeneratorRedesignEnabled()}
        />
        <noscript>
          <section className="mx-auto my-8 max-w-3xl border border-amber-300/30 bg-amber-300/10 p-5 text-amber-50">
            <h2 className="text-lg font-semibold">JavaScript is required for live generation and domain checks.</h2>
            <p className="mt-2 text-sm leading-6 text-amber-50/75">You can keep your brief in this page URL, then retry when scripts are enabled.</p>
            <form action="/generate" method="get" className="mt-4">
              <label htmlFor="no-script-brief" className="mb-2 block text-sm font-medium">Naming brief</label>
              <textarea id="no-script-brief" name="q" defaultValue={initialBrief} rows={4} className="w-full border border-amber-100/30 bg-black/20 p-3" />
              <button type="submit" className="mt-3 min-h-11 border border-amber-100/40 px-4 font-semibold">Keep brief and retry</button>
            </form>
          </section>
        </noscript>
      </div>
      <Footer />
    </>
  )
}
