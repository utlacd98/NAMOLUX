import type { Metadata } from "next"
import { PremiumHome } from "@/components/landing/premium-home"

const siteUrl = "https://www.namolux.com"
const homeTitle = "NamoLux | Business Name Generator & Domain Checker"
const homeDescription =
  "NamoLux discovers focused business names, checks launch-ready domains, evaluates chosen finalists with Founder Signal, and turns winning names into brand launch kits."

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  keywords: [
    "NamoLux",
    "business name generator",
    "AI business name generator",
    "startup name generator",
    "brand name generator",
    "bulk domain checker",
    "domain availability checker",
    "Founder Signal",
    "brand launch kit",
  ],
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
        alt: "NamoLux business name generator, domain checker and Brand Launch Kit",
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
          "A selective name intelligence and brand launch platform. Generate and reject candidates with Name Sprint, check domain evidence, compare finalists with Founder Signal, and create a paid Brand Launch Kit for the winner.",
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
          "https://x.com/NamoLux",
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: `${siteUrl}/`,
        name: homeTitle,
        description:
          "Generate curated business names or bring a shortlist. Check domain evidence, compare finalists with Founder Signal, verify the brand footprint, and take the winning name into a Brand Launch Kit.",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-GB",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "NamoLux",
        url: `${siteUrl}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: homeDescription,
        featureList: [
          "Curated AI business name generation with a hard rejection layer",
          "Verified exact .com, .co or .ai launch domains",
          "Bulk domain checks for up to 50 candidate names across six extensions",
          "Founder Signal v2 name scoring and shortlist comparison",
          "Official UK IPO, USPTO and EUIPO verification links",
          "Paid Brand Launch Kits with palettes, landing-page previews and logo concepts",
        ],
        offers: [
          { "@type": "Offer", price: "0", priceCurrency: "GBP", description: "Signed-in free plan with one curated Name Sprint per UTC day" },
          { "@type": "Offer", price: "9.99", priceCurrency: "GBP", description: "NamoLux Pro monthly plan" },
          { "@type": "Offer", price: "69", priceCurrency: "GBP", description: "NamoLux Pro annual plan" },
        ],
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <PremiumHome />
    </>
  )
}
