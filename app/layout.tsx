import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { LazyAnalytics } from "@/components/lazy-analytics"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })

export const metadata: Metadata = {
  title: "NamoLux - Domain Name Finder & SEO Audit",
  description:
    "Find available domain names in seconds, check live .com availability, and score each option with Founder Signal so you can choose a brand worth building on.",
  keywords: [
    "domain name finder",
    "domain availability checker",
    "founder signal scoring",
    "free domain search",
    ".com domain search",
    "brand name ideas",
    "startup naming",
    "seo audit tool",
  ],
  authors: [{ name: "NamoLux" }],
  creator: "NamoLux",
  publisher: "NamoLux",
  metadataBase: new URL("https://www.namolux.com"),
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: "NamoLux - Domain Name Finder & SEO Audit",
    description:
      "Find available domain names in seconds, check live .com availability, and score each option with Founder Signal so you can choose a brand worth building on.",
    url: "https://www.namolux.com/",
    siteName: "NamoLux",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/namnewlogo.png",
        width: 400,
        height: 400,
        alt: "NamoLux - Domain Name Finder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NamoLux - Domain Name Finder & SEO Audit",
    description:
      "Find available domain names in seconds, check live .com availability, and score each option with Founder Signal so you can choose a brand worth building on.",
    images: ["/namnewlogo.png"],
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
    icon: [{ url: "/namnewlogo.png", type: "image/png" }],
    apple: [{ url: "/namnewlogo.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/namnewlogo.png",
  },
  verification: {
    google: "uVmOSk70-MXXHfGoKOBYS7d5qzW3bxRlVzj-I91Gv_A",
  },
  generator: "v0.app",
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
