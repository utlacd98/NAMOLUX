import type { Metadata } from "next"
import { SeoAudit } from "@/components/seo-audit"

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
  return <SeoAudit />
}
