import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Check, Layers3, SearchCheck, ShieldCheck } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"

const title = "Business Name Generator With Domain Checks | NamoLux"
const description = "Turn a business brief into a focused shortlist with verified .com, .co or .ai domains, then use Founder Signal to compare the names worth keeping."

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "business name generator",
    "AI business name generator",
    "startup name generator",
    "company name generator",
    "brand name generator",
    "business name ideas",
    "available domain name generator",
    "Founder Signal",
  ],
  alternates: { canonical: "/business-name-generator" },
  openGraph: {
    title,
    description,
    url: "https://www.namolux.com/business-name-generator",
    siteName: "NamoLux",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "NamoLux Name Sprint business name generator" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
}

const checks = [
  { icon: Layers3, title: "Focused name discovery", text: "Multiple naming strategies create the private candidate pool. Obvious failures and related-name families are removed before results appear." },
  { icon: SearchCheck, title: "Verified launch domains", text: "Every displayed name has a verified exact .com, .co or .ai launch domain. Bulk Check supports six extensions when you want a wider view." },
  { icon: ShieldCheck, title: "Evaluate when ready", text: "Displayed names receive a bounded current-brand screen. Run Founder Signal only on names you want to assess more deeply; official trade-mark registers still need your own review." },
] as const

const productExamples = [
  {
    name: "Daylatch",
    score: 85,
    band: "Strong",
    strategy: "Suggestive",
    pronunciation: "DAY-latch",
    association: "Draws from changing conditions and acting on a timely opening—a strong fit for a travel product built around deciding when to go.",
    domains: [[".com", "available"], [".co", "available"], [".ai", "available"]],
  },
  {
    name: "Trellivo",
    score: 59,
    band: "Reconsider",
    strategy: "Controlled coined",
    pronunciation: "Trel-EE-voh",
    association: "Easy to pronounce and a workable length, but the strategic meaning is less immediate and the preferred .com was unavailable.",
    domains: [[".com", "unavailable"], [".co", "available"], [".ai", "available"]],
  },
] as const

export default function BusinessNameGeneratorPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NamoLux Name Sprint",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.namolux.com/business-name-generator",
    description,
    offers: [
      { "@type": "Offer", price: "0", priceCurrency: "GBP", description: "One signed-in Name Sprint per UTC day" },
      { "@type": "Offer", price: "12.99", priceCurrency: "GBP", description: "NamoLux Pro monthly with 40 Name Sprints" },
      { "@type": "Offer", price: "99", priceCurrency: "GBP", description: "NamoLux Pro annual with 40 Name Sprints monthly" },
    ],
  }

  return (
    <div className="min-h-screen bg-[#08090a] text-stone-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Navbar />
      <main className="px-4 pb-24 pt-32 sm:px-6">
        <section className="mx-auto max-w-6xl border-b border-white/10 pb-16 sm:pb-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b15e]">AI business name generator · Domain-first shortlist</p>
              <h1 className="max-w-4xl font-serif text-5xl leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">Find a business name worth building on.</h1>
              <p className="mt-7 max-w-3xl text-lg leading-8 text-stone-400">NamoLux turns your business brief into focused possibilities, removes obvious failures, verifies exact launch domains and leaves the final judgment with you—not a wall of AI suggestions.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/generate" className="inline-flex min-h-12 items-center gap-2 bg-[#d6b15e] px-6 font-semibold text-black transition hover:bg-[#e2c274]">Start a free Name Sprint <ArrowRight size={17} /></Link>
                <Link href="/bulk-domain-check" className="inline-flex min-h-12 items-center border border-white/15 px-6 font-medium text-stone-200 transition hover:border-[#d6b15e]/60">Already have names? Bulk Check</Link>
              </div>
              <p className="mt-4 text-sm text-stone-500">Sign-in required. Free: one Name Sprint daily. Pro: 40 monthly.</p>
            </div>
            <aside className="border border-[#d6b15e]/25 bg-[#0d0e0f] p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15e]">What earns a place</p>
              <ul className="mt-5 space-y-4 text-sm leading-6 text-stone-300">
                {["Fits the confirmed naming brief", "Avoids obvious linguistic failures", "Is distinct from the other results", "Has a verified exact launch domain", "Clears preliminary current-brand screening"].map((item) => <li key={item} className="flex gap-3"><Check className="mt-1 shrink-0 text-emerald-300" size={16} /><span>{item}</span></li>)}
              </ul>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-6xl py-16 sm:py-20" aria-labelledby="comparison-heading">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15e]">Real product example</p>
              <h2 id="comparison-heading" className="mt-4 font-serif text-4xl leading-[1.04] tracking-[-0.03em] sm:text-5xl">Same brief. Two names. Two honest verdicts.</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-stone-400">Daylatch and Trellivo were generated for the same travel-product brief. Both cleared Name Sprint with an available exact launch domain. Founder Signal then separated a Strong candidate from one worth reconsidering.</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {productExamples.map((example) => (
              <article key={example.name} className="border border-[#d6b15e]/25 bg-[#0d0e0f] p-6 shadow-2xl shadow-black/20 sm:p-8">
                <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-6">
                  <div><h3 className="font-serif text-4xl tracking-[-0.03em] sm:text-5xl">{example.name}</h3><p className="mt-3 text-xs uppercase tracking-[0.18em] text-stone-500">{example.strategy}</p></div>
                  <div className="text-right"><strong className="font-serif text-5xl font-normal text-[#e4c678]">{example.score}</strong><p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-stone-500">Founder Signal · {example.band}</p></div>
                </div>
                <dl className="mt-6 space-y-5">
                  <div><dt className="text-[11px] uppercase tracking-[0.14em] text-stone-500">Pronunciation</dt><dd className="mt-2 text-lg text-stone-200">{example.pronunciation}</dd></div>
                  <div><dt className="text-[11px] uppercase tracking-[0.14em] text-stone-500">Why it scored this way</dt><dd className="mt-2 text-sm leading-7 text-stone-300">{example.association}</dd></div>
                </dl>
                <div className="mt-6 flex flex-wrap gap-2">{example.domains.map(([tld, status]) => <span key={tld} className={`border px-3 py-2 text-xs ${status === "available" ? "border-emerald-400/30 text-emerald-300" : "border-red-400/30 text-red-300"}`}>{tld} · {status}</span>)}</div>
                <div className="mt-6 border-l-2 border-[#d6b15e] pl-4 text-xs leading-6 text-stone-500">Automated current-brand screening passed. Official trade-mark registers were not checked and still require manual review.</div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-stone-600">Examples captured on 2 September 2026. Domain availability changes quickly; always confirm before purchase.</p>
        </section>

        <section className="mx-auto max-w-6xl border-t border-white/10 py-16 sm:py-20">
          <div className="max-w-3xl"><h2 className="font-serif text-4xl sm:text-5xl">From business brief to names worth exploring.</h2><p className="mt-5 text-base leading-7 text-stone-400">Confirm the Name Constitution before a run begins. That brief controls strategy, exclusions, market, language and tone. Domain and collision checks narrow the results; Founder Signal is a separate decision step.</p></div>
          <div className="mt-10 grid border border-white/10 lg:grid-cols-3">{checks.map(({ icon: Icon, title: itemTitle, text }) => <article key={itemTitle} className="border-b border-white/10 p-6 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 sm:p-8"><Icon className="text-[#d6b15e]" size={22} /><h3 className="mt-6 font-serif text-2xl">{itemTitle}</h3><p className="mt-3 text-sm leading-7 text-stone-400">{text}</p></article>)}</div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 border border-[#d6b15e]/25 bg-[#0d0e0f] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><h2 className="font-serif text-3xl sm:text-4xl">Discovery first. Scoring when you choose.</h2><p className="mt-4 max-w-3xl leading-7 text-stone-400">Name Sprint finds and verifies possibilities without pretending every result is already a winner. Use Founder Signal on the names you genuinely want to compare. If current evidence cannot be completed, the run fails safely instead of showing unscreened names.</p></div>
          <Link href="/generate" className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#d6b15e] px-6 font-semibold text-black">Build my shortlist <ArrowRight size={17} /></Link>
        </section>

        <section className="mx-auto max-w-4xl py-16 text-center sm:py-24">
          <h2 className="font-serif text-4xl leading-tight sm:text-6xl">A shortlist worth thinking about. Not 100 names to delete.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-stone-400">Start with one clear brief. Free users get one Name Sprint each UTC day; Pro users get 40 monthly and can run Founder Signal on the candidates they choose.</p>
          <Link href="/generate" className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#d6b15e] px-7 font-semibold text-black transition hover:bg-[#e2c274]">Start Name Sprint <ArrowRight size={17} /></Link>
        </section>
      </main>
      <Footer />
    </div>
  )
}
