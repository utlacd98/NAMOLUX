import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { SocialProof } from "@/components/social-proof"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { Pricing } from "@/components/pricing"
import { FAQ } from "@/components/faq"
import { FinalCTA } from "@/components/final-cta"
import { Footer } from "@/components/footer"

const siteUrl = "https://www.namolux.com"

export const metadata: Metadata = {
  title: "NamoLux - Domain Name Finder & SEO Audit",
  description:
    "Find available domain names in seconds, check live .com availability, and score each option with Founder Signal so you can choose a brand worth building on.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NamoLux - Domain Name Finder & SEO Audit",
    description:
      "Find available domain names in seconds, check live .com availability, and score each option with Founder Signal so you can choose a brand worth building on.",
    url: siteUrl,
    siteName: "NamoLux",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NamoLux - Domain Name Finder & SEO Audit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NamoLux - Domain Name Finder & SEO Audit",
    description:
      "Find available domain names in seconds, check live .com availability, and score each option with Founder Signal so you can choose a brand worth building on.",
    images: ["/og-image.png"],
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
        url: `${siteUrl}/`,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/logo.png`,
          width: 1200,
          height: 337,
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
        name: "NamoLux - Domain Name Finder & SEO Audit",
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
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

