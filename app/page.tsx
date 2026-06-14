import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { SocialProof } from "@/components/social-proof"
import { ProductShowcase } from "@/components/landing/product-showcase"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { Comparison } from "@/components/landing/comparison"
import { FAQ } from "@/components/faq"
import { FinalCTA } from "@/components/final-cta"
import { Footer } from "@/components/footer"

const siteUrl = "https://www.namolux.com"

export const metadata: Metadata = {
  title: "NamoLux - AI Domain Name Generator & Bulk Domain Checker",
  description:
    "Choose a brand name with evidence. Generate or paste a shortlist, check live availability across six TLDs, and rank every name with Founder Signal scoring.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NamoLux - AI Domain Name Generator & Bulk Domain Checker",
    description:
      "Choose a brand name with evidence. Generate or paste a shortlist, check live availability across six TLDs, and rank every name with Founder Signal scoring.",
    url: siteUrl,
    siteName: "NamoLux",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NamoLux - AI Domain Name Generator & Bulk Domain Checker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NamoLux - AI Domain Name Generator & Bulk Domain Checker",
    description:
      "Choose a brand name with evidence. Generate or paste a shortlist, check live availability across six TLDs, and rank every name with Founder Signal scoring.",
    images: ["/opengraph-image"],
  },
}

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "NamoLux",
        url: `${siteUrl}/`,
        inLanguage: "en-US",
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/generate?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "NamoLux",
        description:
          "A domain naming platform powered by Founder Signal scoring. Generate or paste a shortlist, get live availability checks across six TLDs, and rank every candidate with clear reasoning.",
        url: `${siteUrl}/`,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/icon.png`,
          width: 563,
          height: 563,
        },
        sameAs: [
          "https://www.facebook.com/profile.php?id=61587014966281",
          "https://www.instagram.com/namoluxapp/",
          "https://www.linkedin.com/in/andrew-barrett-587a21390/",
          "https://x.com/NamoLux",
          "https://ko-fi.com/C0C61SP3NU",
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: `${siteUrl}/`,
        name: "NamoLux - AI Domain Name Generator & Bulk Domain Checker",
        description:
          "Generate or paste your domain name shortlist. Get Founder Signal scoring, live availability across six TLDs, and a clear verdict on every candidate.",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
      },
    ],
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <Navbar />
      <main className="overflow-x-clip">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Hero />
        <SocialProof />
        <ProductShowcase />
        <Features />
        <HowItWorks />
        <Comparison />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
