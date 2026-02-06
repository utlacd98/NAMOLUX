import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { SocialProof } from "@/components/social-proof"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { Pricing } from "@/components/pricing"
import { FAQ } from "@/components/faq"
import { FinalCTA } from "@/components/final-cta"
import { Footer } from "@/components/footer"

const siteUrl = "https://www.namolux.com/"

export const metadata: Metadata = {
  title: "NamoLux - Domain Name Finder & SEO Audit",
  description:
    "Find available domains in seconds and score each option with Founder Signal scoring so you can choose a name worth building on.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NamoLux - Domain Name Finder & SEO Audit",
    description:
      "Find available domains in seconds and score each option with Founder Signal scoring.",
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
      "Find available domains in seconds and score each option with Founder Signal scoring.",
    images: ["/og-image.png"],
  },
}

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: "NamoLux",
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}generate?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: "NamoLux",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}logo.png`,
        },
        sameAs: [
          "https://www.instagram.com/namoluxapp/",
          "https://www.linkedin.com/in/andrew-barrett-587a21390/",
          "https://x.com/NamoLux",
          "https://ko-fi.com/C0C61SP3NU",
        ],
      },
    ],
  }

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  )
}

