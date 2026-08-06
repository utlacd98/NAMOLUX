import type { Metadata } from "next"
import { PremiumHome } from "@/components/landing/premium-home"

const siteUrl = "https://www.namolux.com"
const homeTitle = "Bulk Domain Checker & Founder Signal | NamoLux"
const homeDescription =
  "NamoLux helps founders check up to 50 candidate names across six domain extensions, verify their brand footprint, and use Founder Signal to compare finalists."

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: siteUrl,
    siteName: "NamoLux",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NamoLux bulk domain checker and Founder Signal workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
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
        inLanguage: "en-GB",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "NamoLux",
        description:
          "A shortlist decision platform powered by Founder Signal. Check six domain extensions, open social-profile, company and official UK, US and EU trade-mark verification links, then compare the strongest options with clear reasoning.",
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
        name: homeTitle,
        description:
          "Paste a name shortlist. Get live availability across six TLDs, brand-footprint verification links, optional Founder Signal scoring, and a clear next step for every candidate.",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-GB",
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PremiumHome />
    </>
  )
}
