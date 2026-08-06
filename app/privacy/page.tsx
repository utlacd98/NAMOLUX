import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Privacy Policy | NamoLux",
  description: "How NamoLux handles account, billing, shortlist, domain-check, scoring, analytics, and advertising data.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 px-4 pb-16 pt-24">
        <article className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold text-foreground">Privacy Policy</h1>
          <div className="prose prose-invert max-w-none space-y-7 text-muted-foreground">
            <p className="text-lg">Last updated: 10 July 2026</p>
            <p>
              This policy explains how NamoLux processes information when you use our shortlist decision,
              domain-checking, account, and subscription services. Contact us at{" "}
              <a href="mailto:support@namolux.com" className="text-primary hover:underline">support@namolux.com</a>.
            </p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Information we process</h2>
              <ul className="list-disc space-y-2 pl-6">
                <li>Account data such as your email address, display name, authentication identifiers, and profile settings.</li>
                <li>Billing records such as your Stripe customer, subscription, status, and renewal dates. NamoLux does not store full card details.</li>
                <li>Shortlist names, domain-check results, Founder Signal scores, saved decision records, and support requests.</li>
                <li>Service telemetry such as feature events, approximate country, device class, route, referrer, and session identifier.</li>
                <li>Pseudonymous quota and abuse-prevention identifiers. Anonymous IP addresses are converted to a keyed hash before storage.</li>
                <li>Cookie and advertising consent signals for ad-supported free access.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Why we use it</h2>
              <p>
                We process data to provide and secure the service, authenticate users, enforce usage limits, fulfil
                subscriptions, answer support requests, measure reliability, improve features, prevent fraud, and comply
                with legal obligations. Where required, advertising storage and personalised advertising rely on consent.
                Contract performance, legitimate interests, and legal obligations apply to other processing as appropriate.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Service providers and disclosures</h2>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Supabase</strong> provides authentication and database services.</li>
                <li><strong>Stripe</strong> processes subscriptions, payments, and the customer billing portal.</li>
                <li><strong>OpenAI and Groq</strong> may process data needed to provide Founder Signal and related decision-support features.</li>
                <li><strong>Vercel</strong> provides hosting, delivery, and service analytics.</li>
                <li><strong>Google AdSense</strong> may process advertising and consent data for eligible free users. Paid users do not load NamoLux ad slots.</li>
                <li>Domain, DNS, RDAP, registrar, and affiliate providers receive the domain information necessary to check or register a name.</li>
              </ul>
              <p>We may also disclose information where legally required or to protect users, NamoLux, and the public.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Advertising and cookies</h2>
              <p>
                Free access may be supported by Google AdSense. NamoLux checks account entitlements before loading the ad
                network, and paid users are ad-free. Google&apos;s certified Privacy &amp; messaging consent system is used
                where its European regulations message applies. See our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link> for controls and details.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Retention and security</h2>
              <p>
                We retain information only for as long as needed for the purposes above, including account operation,
                billing and tax records, security investigations, dispute handling, and legal requirements. Retention
                periods vary by record. We use access controls, encrypted transport, row-level database security, and
                restricted service credentials, but no online service can promise absolute security.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">International processing and your rights</h2>
              <p>
                Providers may process data outside your country using contractual and other lawful safeguards. Depending
                on where you live, you may have rights to access, correct, delete, restrict, object to, or export personal
                data, withdraw consent, and complain to a data-protection authority. Email us to exercise a right. We may
                need to verify your identity and may retain records that law requires us to keep.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Children and changes</h2>
              <p>
                NamoLux is not directed to children under 13, or the higher minimum age required where they live. We may
                update this policy as the product or law changes and will post the revised date on this page.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
