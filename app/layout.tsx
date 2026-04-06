import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { LazyAnalytics } from "@/components/lazy-analytics"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })

export const metadata: Metadata = {
  title: "NamoLux — AI Domain Name Generator",
  description:
    "Generate brandable startup names with AI. Live .com availability checking, Founder Signal™ scoring, and multi-TLD results. Find a name worth building on.",
  keywords: [
    "AI domain name generator",
    "domain name finder",
    "domain availability checker",
    "brandable domain names",
    "founder signal scoring",
    "free domain search",
    ".com domain search",
    "brand name ideas",
    "startup naming tool",
    "business name generator",
    "seo audit tool",
    "namolux",
  ],
  authors: [{ name: "NamoLux", url: "https://www.namolux.com" }],
  creator: "NamoLux",
  publisher: "NamoLux",
  metadataBase: new URL("https://www.namolux.com"),
  alternates: {
    canonical: "https://www.namolux.com/",
  },
  openGraph: {
    title: "NamoLux — AI Domain Name Generator",
    description:
      "Generate brandable startup names with AI. Live .com availability checking, Founder Signal™ scoring, and multi-TLD results. Find a name worth building on.",
    url: "https://www.namolux.com/",
    siteName: "NamoLux",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NamoLux — AI Domain Name Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NamoLux — AI Domain Name Generator",
    description:
      "Generate brandable startup names with AI. Live .com availability checking, Founder Signal™ scoring, and multi-TLD results. Find a name worth building on.",
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
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
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <LazyAnalytics />
      </body>
    </html>
  )
}
