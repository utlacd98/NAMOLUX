import type { Metadata } from "next"
import { Suspense } from "react"
import { GenerateNames } from "@/components/generate-names"

export const metadata: Metadata = {
  title: "Generate Domain Names | NamoLux",
  description:
    "Generate short, memorable domain names with live .com availability checks, brand vibe controls, and Founder Signal scoring to shortlist stronger options faster.",
  openGraph: {
    title: "Generate Domain Names | NamoLux",
    description:
      "Generate short, memorable domain names with live .com availability checks, brand vibe controls, and Founder Signal scoring to shortlist stronger options faster.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Generate Domain Names | NamoLux",
    description:
      "Generate short, memorable domain names with live .com availability checks, brand vibe controls, and Founder Signal scoring to shortlist stronger options faster.",
  },
}

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GenerateNames />
    </Suspense>
  )
}
