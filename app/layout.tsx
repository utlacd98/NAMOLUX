import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono, Fraunces } from "next/font/google"
import Script from "next/script"
import { LazyAnalytics } from "@/components/lazy-analytics"
import { EngagementTracker } from "@/components/engagement-tracker"
import { AdProviderGate } from "@/components/ad-provider-gate"
import { implicitRecoveryRedirectScript } from "@/lib/supabase/recovery-redirect"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", preload: false })
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "optional",
  weight: ["400", "500", "600", "700"],
})

const defaultDescription =
  "Discover focused business names, verify launch-ready domains, evaluate chosen finalists with Founder Signal, and build the winning brand with NamoLux."

export const metadata: Metadata = {
  title: "NamoLux | Business Name Generator & Domain Checker",
  description: defaultDescription,
  keywords: [
    "bulk domain checker",
    "bulk domain availability checker",
    "domain availability checker",
    "brandable domain names",
    "founder signal scoring",
    "free domain search",
    ".com domain search",
    "name shortlist scoring",
    "startup name evaluation",
    "business name generator",
    "AI business name generator",
    "startup name generator",
    "brand name generator",
    "brand launch kit",
    "logo concept generator",
    "Name Sprint",
    "namolux",
  ],
  authors: [{ name: "NamoLux", url: "https://www.namolux.com" }],
  creator: "NamoLux",
  publisher: "NamoLux",
  metadataBase: new URL("https://www.namolux.com"),
  openGraph: {
    title: "NamoLux | Business Name Generator & Domain Checker",
    description: defaultDescription,
    url: "https://www.namolux.com/",
    siteName: "NamoLux",
    locale: "en_US",
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
    title: "NamoLux | Business Name Generator & Domain Checker",
    description: defaultDescription,
    images: ["/opengraph-image"],
    site: "@namolux",
    creator: "@namolux",
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
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  verification: {
    google: "uVmOSk70-MXXHfGoKOBYS7d5qzW3bxRlVzj-I91Gv_A",
  },
  other: {
    "impact-site-verification": "e84ff675-1176-4ecf-a95f-37c5a6d05a69",
  },
  category: "technology",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0B10" },
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`dark ${inter.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <head>
        <Script
          id="supabase-implicit-recovery-redirect"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: implicitRecoveryRedirectScript }}
        />
      </head>
      <body className="font-sans antialiased">
        <AdProviderGate>
          {children}
          <EngagementTracker />
          <LazyAnalytics />
        </AdProviderGate>
      </body>
    </html>
  )
}
