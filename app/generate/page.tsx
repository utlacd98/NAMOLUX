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
import { permanentRedirect, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "NamoLux Name Sprint | Curated Business Name Generator",
  description:
    "Describe your business and let NamoLux generate broadly, reject weak or unavailable candidates, and rank the survivors with Founder Signal.",
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
      "Generate broadly, reject weak or unavailable candidates, and rank the survivors with Founder Signal.",
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
      "Generate broadly, reject weak or unavailable candidates, and rank the survivors with Founder Signal.",
    images: ["/opengraph-image"],
  },
}

type GeneratePageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const requestHeaders = await headers()
  const labRequest = isGeneratorLabRequestAllowed(requestHeaders.get("host"))
  const publicSprint = isPublicNameSprintEnabled()
  if (!labRequest && !publicSprint) {
    permanentRedirect("/bulk-domain-check")
  }
  if (publicSprint || (labRequest && isGeneratorLabV3Enabled())) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/sign-in?redirect=%2Fgenerate")
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
