import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { PUBLIC_PRODUCT_COPY } from "@/lib/site-content"

export const metadata: Metadata = {
  title: "Terms of Service | NamoLux",
  description: "Terms for NamoLux Bulk Check, Founder Signal, and the paid decision workspace.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 px-4 pb-16 pt-24">
        <article className="mx-auto max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold text-foreground">Terms of Service</h1>
          <div className="prose prose-invert max-w-none space-y-7 text-muted-foreground">
            <p className="text-lg">Last updated: 10 July 2026</p>
            <p>By using NamoLux, you agree to these terms. If you do not agree, do not use the service.</p>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">The service</h2>
              <p>
                NamoLux provides Bulk Check, domain availability, Founder Signal, and related shortlist-decision tools.
                Outputs are suggestions, not professional, legal, trademark, investment, or business advice. You are
                responsible for reviewing a name before relying on, registering, or publishing it.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Free and paid access</h2>
              <ul className="list-disc space-y-2 pl-6">
                <li>The free plan currently includes {PRODUCT_OFFER.freeUsageLabel} and may display advertising.</li>
                <li>{PRODUCT_OFFER.paidPlanName} currently costs {PRODUCT_OFFER.paidPriceLabel}, renews automatically, includes {PUBLIC_PRODUCT_COPY.proPlanSummary.toLowerCase()}, and is ad-free.</li>
                <li>Prices, taxes, features, and limits shown at checkout form part of your purchase and may change for future billing periods with appropriate notice.</li>
                <li>{PRODUCT_OFFER.cancellationLabel} Cancellation normally takes effect at the end of the paid billing period.</li>
                <li>Except where law requires otherwise, charges for a period already started are not refundable. Mandatory consumer cancellation and refund rights are unaffected.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Domain and scoring responsibilities</h2>
              <p>
                Availability checks are best-effort snapshots and can be delayed, incomplete, or change before purchase.
                Registrations are completed by third-party registrars under their terms and prices. NamoLux does not grant
                rights in submitted names or guarantee uniqueness, availability, search ranking, commercial success, or
                freedom from trademark, company-name, passing-off, or other third-party claims.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Acceptable use</h2>
              <p>You must not misuse the service, including by:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>breaking law, infringing rights, or generating abusive, deceptive, or harmful material;</li>
                <li>evading quotas, sharing paid access, automating excessive requests, scraping, probing, or disrupting systems;</li>
                <li>attempting to access another account, administrator service, source credential, or restricted data; or</li>
                <li>reselling or reproducing substantial parts of NamoLux without written permission.</li>
              </ul>
              <p>We may limit or suspend access where reasonably necessary to protect the service or enforce these terms.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Intellectual property and feedback</h2>
              <p>
                NamoLux software, branding, interfaces, and original content remain protected by applicable intellectual
                property law. You retain rights in material you submit and permit us and our providers to process it only
                as needed to operate and improve the service. Feedback may be used without restriction or compensation.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Availability, warranties, and liability</h2>
              <p>
                The service is provided on an “as available” basis. We do not promise uninterrupted or error-free operation.
                To the maximum extent permitted by law, implied warranties are excluded and NamoLux is not liable for
                indirect, incidental, special, or consequential loss, lost profit, lost opportunity, or a third party&apos;s
                registration or use of a name. Nothing excludes liability that cannot lawfully be excluded, including
                applicable consumer rights.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Changes, disputes, and contact</h2>
              <p>
                We may update the service or these terms. Material changes apply prospectively after reasonable notice.
                Mandatory law and consumer protections in your country continue to apply. Contact{" "}
                <a href="mailto:support@namolux.com" className="text-primary hover:underline">support@namolux.com</a>{" "}
                first so we can try to resolve a concern.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
