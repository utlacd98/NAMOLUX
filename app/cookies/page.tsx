import type { Metadata } from "next"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { PrivacyChoicesButton } from "@/components/privacy-choices-button"

export const metadata: Metadata = {
  title: "Cookie Policy | NamoLux",
  description: "Cookies, local storage, analytics, advertising, and privacy controls used by NamoLux.",
  alternates: { canonical: "/cookies" },
}

export default function CookiePolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 px-4 pb-16 pt-24">
        <article className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold text-foreground">Cookie Policy</h1>
          <div className="prose prose-invert max-w-none space-y-7 text-muted-foreground">
            <p className="text-lg">Last updated: 10 July 2026</p>
            <p>This page explains how NamoLux uses cookies, browser storage, and similar technologies.</p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Essential storage</h2>
              <p>
                Supabase authentication cookies keep you signed in and protect account requests. Security, checkout,
                subscription, and load-balancing technologies are also necessary to deliver the service. The app may use
                local storage for preferences, cached results, and saved-name features. These cannot all be disabled without
                affecting functionality.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
              <p>
                NamoLux records limited product events to understand reliability and feature use. Vercel also provides
                hosting analytics. These records can include a pseudonymous session identifier, route, device class,
                referrer, approximate country, and event details; they are not used to store raw anonymous IP addresses in
                NamoLux quota logs.
              </p>
            </section>

            <section id="manage-ads" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Advertising</h2>
              <p>
                Eligible free users may see Google AdSense ads. Paid users do not load the NamoLux advertising script or
                slots. Where required, Google&apos;s certified Privacy &amp; messaging CMP collects and communicates consent
                choices through the IAB Transparency and Consent Framework. Google and its advertising partners may use
                cookies or local storage to deliver, limit, measure, and—only where permitted—personalise ads.
              </p>
              <PrivacyChoicesButton className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10" />
              <p className="text-sm">
                If the settings dialog is unavailable, advertising is not currently active for this browser or the site has
                not yet been approved/configured in AdSense. You can also change browser cookie settings; blocking essential
                storage may sign you out.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">More information</h2>
              <p>
                See the <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for data
                rights and contact details. Google explains its advertising data practices in its{" "}
                <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Advertising Policies</a>.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
