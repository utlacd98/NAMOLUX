import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Check, Sparkles, Crown, Zap, Shield, Clock } from "lucide-react"

export const metadata: Metadata = {
  title: "Pricing | NamoLux Pro",
  description: "Upgrade to NamoLux Pro for unlimited domain generation, Founder Signal™ scoring, and more. One-time payment of £15.",
}

export default function PricingPage() {
  const proFeatures = [
    { text: "Unlimited domain generation", icon: Sparkles },
    { text: "Founder Signal™ scoring", icon: Zap },
    { text: "All brand vibes & industries", icon: Crown },
    { text: "SEO Potential checks", icon: Shield },
    { text: "Multi-TLD support (.com, .io, .ai, .co)", icon: Check },
    { text: "Social handle checking", icon: Check },
    { text: "Bulk domain checking", icon: Check },
    { text: "Export to CSV", icon: Check },
    { text: "Priority support", icon: Check },
    { text: "Lifetime access — pay once", icon: Clock },
  ]

  const freeFeatures = [
    "1 domain generation per 24 hours",
    "Basic Founder Signal™ preview",
    "Limited to .com TLD",
    "No social handle checking",
    "No bulk domain checking",
    "Community support",
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <Navbar />
      <main className="flex-1 px-4 pt-24 pb-12">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4 sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-[#888] max-w-2xl mx-auto">
              One plan, everything included. Pay once, use forever. No subscriptions.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
              <p className="text-[#888] mb-6">Try NamoLux before upgrading</p>
              
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">£0</span>
                <span className="text-[#555]">/forever</span>
              </div>

              <Link
                href="/generate"
                className="block w-full py-3 px-6 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white font-medium rounded-lg text-center transition mb-8"
              >
                Get Started Free
              </Link>

              <ul className="space-y-3">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-[#888]">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#555]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="relative bg-gradient-to-b from-[#1a1815] to-[#141414] border-2 border-[#D4A843]/40 rounded-2xl p-8 shadow-xl">
              {/* Best Value Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4A843] text-black text-xs font-bold px-4 py-1 rounded-full">
                BEST VALUE
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-[#D4A843]" />
                <h3 className="text-xl font-semibold text-white">Pro</h3>
              </div>
              <p className="text-[#888] mb-6">Unlimited access to everything</p>
              
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-[#D4A843]">£15</span>
                <span className="text-[#888]">one-time</span>
              </div>

              <a
                href="/api/stripe/checkout"
                className="block w-full py-3 px-6 bg-[#D4A843] hover:bg-[#c49a3d] text-black font-semibold rounded-lg text-center transition mb-8 flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </a>

              <ul className="space-y-3">
                {proFeatures.map(({ text, icon: Icon }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-white">
                    <Icon className="h-4 w-4 shrink-0 mt-0.5 text-[#D4A843]" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                { q: "Is this really a one-time payment?", a: "Yes! Pay £15 once and you have Pro access forever. No recurring charges, no surprises." },
                { q: "What payment methods do you accept?", a: "We accept all major credit cards, debit cards, and Apple Pay via Stripe." },
                { q: "Is there a free trial?", a: "Yes! All users get 2 free uses per day per feature to try NamoLux before upgrading." },
                { q: "Do I get future updates?", a: "Yes — your £15 covers all future features and improvements. Pay once, benefit forever." },
              ].map(({ q, a }) => (
                <div key={q} className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
                  <h3 className="text-white font-medium mb-2">{q}</h3>
                  <p className="text-[#888] text-sm">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Money-back guarantee */}
          <div className="mt-12 text-center">
            <p className="text-[#555] text-sm">
              <Shield className="inline h-4 w-4 mr-1" />
              Secure payments powered by Stripe
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

