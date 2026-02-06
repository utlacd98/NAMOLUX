import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "NamoLux - Domain Name Finder & SEO Audit",
  description:
    "Check domain availability instantly and evaluate every name with Founder Signal scoring. NamoLux helps founders find domains worth building on.",
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
      "Check domain availability instantly and evaluate every name with Founder Signal scoring.",
    url: "https://www.namolux.com/",
    siteName: "NamoLux",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NamoLux - Domain Name Finder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NamoLux - Domain Name Finder & SEO Audit",
    description: "Check domain availability instantly and evaluate every name with Founder Signal scoring.",
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
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icon.png",
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
      <head>
        {/* Force dark mode always */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
                (function() {
                  try {
                    localStorage.removeItem('theme');
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                  } catch (e) {}
                })();
              `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
