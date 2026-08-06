import type { Metadata } from "next"
import { SeoAudit } from "@/components/seo-audit"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "SEO Audit Tool | NamoLux",
  description:
    "Analyse any website's SEO performance instantly with actionable checks for meta tags, Core Web Vitals, accessibility, and technical issues that impact rankings.",
  openGraph: {
    title: "SEO Audit Tool | NamoLux",
    description:
      "Analyse any website's SEO performance instantly with actionable checks for meta tags, Core Web Vitals, accessibility, and technical issues that impact rankings.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SEO Audit Tool | NamoLux",
    description:
      "Analyse any website's SEO performance instantly with actionable checks for meta tags, Core Web Vitals, accessibility, and technical issues that impact rankings.",
  },
}

export default function SeoAuditPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1 pt-[78px]">
        <SeoAudit />
      </div>
      <Footer />
    </div>
  )
}
