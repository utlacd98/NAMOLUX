import type { Metadata } from "next"
import { GenerateNames } from "@/components/generate-names"

export const metadata: Metadata = {
  title: "Generate Domain Names | NamoLux",
  description:
    "Generate short, memorable brand names with instant .com availability checks. Powered by AI to match your brand vibe.",
  openGraph: {
    title: "Generate Domain Names | NamoLux",
    description: "AI-powered domain name generator with instant availability checks.",
  },
}

export default function GeneratePage() {
  return <GenerateNames />
}
