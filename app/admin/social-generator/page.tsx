import type { Metadata } from "next"
import { SocialGenerator } from "@/components/admin/social-generator"

export const metadata: Metadata = {
  title: "Social Post Generator — NamoLux Admin",
  robots: { index: false, follow: false },
}

export default function SocialGeneratorPage() {
  return <SocialGenerator />
}
