import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "NamoLux – AI Chat Brand Name Generator & Credit-Based Domain Availability Checker",
  description:
    "Chat with AI to brainstorm brand names and instantly check .com domain availability. Credit-based pricing with no subscriptions—pay once, use anytime.",
  keywords: [
    "AI chat brand name generator",
    "domain availability checker",
    "credit-based domain checks",
    ".com domain search",
    "business name generator",
    "domain finder",
    "startup name ideas",
    "AI naming assistant",
  ],
  authors: [{ name: "NamoLux" }],
  creator: "NamoLux",
  publisher: "NamoLux",
  metadataBase: new URL("https://namolux.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NamoLux – AI Chat Brand Name Generator & Domain Availability Checker",
    description:
      "Chat with AI to brainstorm brand names and instantly check .com availability. Credit-based pricing, no subscriptions.",
    url: "https://namolux.com",
    siteName: "NamoLux",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NamoLux - AI Chat Brand Name Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NamoLux – AI Chat Brand Name Generator",
    description: "Chat with AI to brainstorm brand names and instantly check .com availability. Credit-based pricing.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
    generator: 'v0.app'
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0B10" },
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "NamoLux",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                description:
                  "AI chat brainstorming assistant for brand names with real-time domain availability checks. Credit-based one-time purchase model—no subscriptions.",
                offers: {
                  "@type": "AggregateOffer",
                  lowPrice: "0",
                  highPrice: "29",
                  priceCurrency: "GBP",
                  offerCount: "4",
                },
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: "4.9",
                  ratingCount: "1200",
                },
              }),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "NamoLux",
                url: "https://namolux.com",
                logo: "https://namolux.com/logo.png",
                sameAs: [],
              }),
            }}
          />
        </head>
        <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
