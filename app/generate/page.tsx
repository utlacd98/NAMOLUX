import type { Metadata } from "next"
import { Suspense } from "react"
import { GenerateNames } from "@/components/generate-names-premium"

export const metadata: Metadata = {
  title: "AI Domain Name Generator with Founder Signal Scoring | NamoLux",
  description:
    "Generate high-quality brandable domain names from your keywords, verify availability across 6 TLDs, and rank every result with Founder Signal scoring.",
  keywords: [
    "AI domain name generator",
    "business name generator",
    "startup name generator",
    "domain availability checker",
    "brand name ideas",
    "Founder Signal scoring",
  ],
  alternates: {
    canonical: "/generate",
  },
  openGraph: {
    title: "AI Domain Name Generator with Founder Signal Scoring | NamoLux",
    description:
      "Generate brandable names, check availability across .com, .io, .co, .ai, .app, and .dev, and buy available domains through Namecheap.",
    url: "https://www.namolux.com/generate",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NamoLux AI domain name generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Domain Name Generator with Founder Signal Scoring | NamoLux",
    description:
      "Generate brandable names, verify availability, and rank every result with Founder Signal scoring.",
    images: ["/opengraph-image"],
  },
}

export default function GeneratePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": "https://www.namolux.com/generate#app",
    name: "NamoLux Domain Name Generator",
    url: "https://www.namolux.com/generate",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Generate brandable startup names, verify live availability across 6 TLDs, and rank every result with Founder Signal scoring.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: { "@id": "https://www.namolux.com/#organization" },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Suspense fallback={null}>
        <GenerateNames />
      </Suspense>
    </>
  )
}
