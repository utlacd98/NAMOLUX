import type { Metadata } from "next"
import { Suspense } from "react"
import { GenerateNames } from "@/components/generate-names"

export const metadata: Metadata = {
  title: "Advanced Generator | NamoLux",
  description:
    "Full NamoLux generator with deep search, AutoFind V2, name styles, brand palette, and Founder Signal scoring.",
  robots: { index: false, follow: false },
}

export default function GenerateAdvancedPage() {
  return (
    <Suspense fallback={null}>
      <GenerateNames />
    </Suspense>
  )
}
