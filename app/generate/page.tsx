import type { Metadata } from "next"
import { Suspense } from "react"
import { GenerateNames } from "@/components/generate-names"

export const metadata: Metadata = {
  title: "Bulk Domain Name Checker with Founder Signal™ Scoring | NamoLux",
  description:
    "Paste up to 50 domain names and get live availability checks across 6 TLDs plus Founder Signal™ brand scoring. Rank your shortlist by elite-tier brand quality in seconds.",
  openGraph: {
    title: "Bulk Domain Name Checker with Founder Signal™ Scoring | NamoLux",
    description:
      "Check domain availability in bulk and rank names by Founder Signal™ brand score. 6 TLDs, 50 names per batch, instant results.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bulk Domain Name Checker with Founder Signal™ Scoring | NamoLux",
    description:
      "Check domain availability in bulk and rank names by Founder Signal™ brand score. 6 TLDs, 50 names per batch, instant results.",
  },
}

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GenerateNames />
    </Suspense>
  )
}
