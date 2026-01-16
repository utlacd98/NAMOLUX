import type { Metadata } from "next"
import { SeoAudit } from "@/components/seo-audit"

export const metadata: Metadata = {
  title: "SEO Audit Tool | NamoLux",
  description:
    "Analyze any website's SEO performance instantly. Get actionable insights on meta tags, performance, accessibility, and more.",
  openGraph: {
    title: "SEO Audit Tool | NamoLux",
    description: "Free SEO audit tool with instant website analysis.",
  },
}

export default function SeoAuditPage() {
  return <SeoAudit />
}
