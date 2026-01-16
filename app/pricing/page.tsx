import type { Metadata } from "next"
import { PricingSection } from "@/components/pricing-section"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Pricing | NamoLux",
  description: "Simple credit-based pricing. Pay once, use anytime. No subscriptions.",
  openGraph: {
    title: "Pricing | NamoLux",
    description: "Simple credit-based pricing. Pay once, use anytime.",
  },
}

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <PricingSection />
      </main>
      <Footer />
    </div>
  )
}

