import Link from "next/link"
import Image from "next/image"
import type { ReactNode } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  CircleX,
  Globe2,
  ListFilter,
  Play,
  Search,
  ShieldCheck,
} from "lucide-react"
import { PremiumNav } from "./premium-nav"
import { PremiumFaq } from "./premium-faq"
import { HomeShortlistForm } from "./home-shortlist-form"
import { SiteFooter } from "@/components/site-footer"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { DOMAIN_EXTENSIONS, PUBLIC_PRODUCT_COPY } from "@/lib/site-content"
import styles from "./premium-home.module.css"

// A visual example only. Live Founder Signal scores are calculated on the
// server after a founder submits a shortlist; the marketing page never
// calculates or presents a user score locally.
const sampleRows = [
  { name: "Vaulten", note: "Recognisable root with a compact, pronounceable form.", signal: { score: 83, band: "Strong" } },
  { name: "Paynest", note: "A clear compound with a familiar verbal rhythm.", signal: { score: 79, band: "Strong" } },
  { name: "Countis", note: "A familiar root paired with a concise ending.", signal: { score: 75, band: "Viable" } },
  { name: "Ledgerly", note: "Clear meaning, with a common suffix to weigh.", signal: { score: 68, band: "Viable" } },
] as const

const vaultenSignal = sampleRows[0].signal

const extensions = DOMAIN_EXTENSIONS

function PageMarker({ number }: { number: string }) {
  return <div className={styles.pageMarker}><span>{number}</span><div /></div>
}

function SolidButton({ href, children, tone = "brass" }: { href: string; children: ReactNode; tone?: "brass" | "ink" | "outline" }) {
  return (
    <Link href={href} className={`${styles.solidButton} ${styles[`button${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>
      <span>{children}</span>
      <ArrowUpRight size={16} strokeWidth={1.6} />
    </Link>
  )
}

function HeroShortlistPanel() {
  return (
    <aside className={styles.heroShortlistPanel} aria-label="Example shortlist analysis">
      <p>Your decision board</p>
      <div className={styles.heroScoreRows}>
        {[
          ["Vaulten", "83"],
          ["Paynest", "79"],
          ["Ledgerly", "68"],
          ["Novata", "64"],
        ].map(([name, score]) => (
          <Link href="/bulk-domain-check" key={name} className={styles.heroScoreRow}>
            <strong>{name}</strong><span>{score}</span><ArrowRight size={20} strokeWidth={1.5} />
          </Link>
        ))}
      </div>
      <Link href="/bulk-domain-check" className={styles.heroPanelLink}>Check domains, social and trade marks <ArrowRight size={20} strokeWidth={1.5} /></Link>
    </aside>
  )
}

function HeroTrust() {
  return (
    <div className={styles.heroTrust}>
      <Image
        src="/blog/andrew-barrett-namolux-founder.jpg"
        alt="Andrew Barrett, founder of NamoLux"
        width={42}
        height={42}
        sizes="42px"
        className={styles.founderAvatar}
      />
      <div><div className={styles.starRow}>{"\u2605".repeat(5)}</div><p>Trusted by founders worldwide</p></div>
    </div>
  )
}

function ShortlistTransform() {
  return (
    <div className={styles.transformPanel}>
      <div className={styles.transformInput}>
        <p className={styles.transformLabel}>Paste up to 50 names</p>
        <div className={styles.inputNames}>
          {["Vaulten", "Paynest", "Countis", "Ledgerly", "Finavo", "Novara", "Stacken", "Quotient"].map((name) => <span key={name}>{name}</span>)}
        </div>
      </div>
      <div className={styles.transformArrow}><ArrowRight size={24} strokeWidth={1.3} /></div>
      <div className={styles.transformResult}>
        <p className={styles.transformLabel}>Your shortlist</p>
        <div className={styles.resultHeader}><span>Candidate</span><span>Domain status</span><span>Founder Signal</span><span>Why it works</span></div>
        {sampleRows.map((row, index) => (
          <div className={styles.resultRow} key={row.name}>
            <span className={styles.resultRank}>{index + 1}</span><strong>{row.name}</strong>
            <span className={styles.resultDomains}><b>.com / Available</b><b>.io / Available</b><b>.ai / Available</b></span>
            <span className={styles.resultScore}>{row.signal.score}</span><span className={styles.resultNote}>{row.note}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SignalGauge() {
  const circumference = 515
  const scoredArc = Math.round((vaultenSignal.score / 100) * circumference)

  return (
    <div className={styles.gaugeWrap}>
      <svg className={styles.gauge} viewBox="0 0 220 220" aria-label={`Vaulten Founder Signal score ${vaultenSignal.score}, ${vaultenSignal.band}`}>
        <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx="110" cy="110" r="82" fill="none" stroke="rgba(196,161,91,0.18)" strokeWidth="1" />
        <circle cx="110" cy="110" r="82" fill="none" stroke="#c4a15b" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${scoredArc} ${circumference}`} transform="rotate(-90 110 110)" />
        <circle cx="110" cy="110" r="7" fill="#c4a15b" />
      </svg>
      <div className={styles.gaugeCopy}><span>Vaulten</span><strong>{vaultenSignal.score}</strong><em>{vaultenSignal.band}</em></div>
    </div>
  )
}

const dimensions = [
  ["Clarity", "89"],
  ["Memorability", "82"],
  ["Pronunciation", "86"],
  ["Extension strength", "80"],
  ["Character quality", "77"],
  ["Brand risk", "84"],
] as const

function SignalLedger() {
  return (
    <div className={styles.signalLedger}>
      {dimensions.map(([label, value]) => (
        <div className={styles.dimension} key={label}>
          <span>{label}</span>
          <div className={styles.dimensionBars} aria-hidden="true">{Array.from({ length: 18 }).map((_, index) => <i key={index} className={index < Math.round(Number(value) / 6) ? styles.barOn : ""} />)}</div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function AvailabilityLedger() {
  return (
    <div className={styles.availabilityLedger}>
      <div className={styles.availabilityIntro}>
        <h3>Check the name beyond the domain.</h3>
        <p>Check six extensions through DNS and RDAP, then open direct social-profile, company and official UK, US and EU trade-mark searches for available candidates. Results need verification before you act.</p>
      </div>
      <div className={styles.extensionList}>
        {extensions.map((extension) => <div key={extension} className={styles.extensionItem}><span>{extension}</span><i className={styles.extensionOn} aria-hidden="true" /><em>Live check supported</em></div>)}
      </div>
      <Link href="/bulk-domain-check" className={styles.inlineCta}>Open Bulk Check <ArrowRight size={16} strokeWidth={1.5} /></Link>
    </div>
  )
}

const processSteps = [
  ["01", "Bring your shortlist", "Paste up to 50 candidate names from your team, agency, or any brainstorming source."],
  ["02", "Check the brand footprint", "See six domain results, then open social-profile, company and official UK, US and EU trade-mark searches for available candidates."],
  ["03", "Make the call", "Save the strongest candidates, export the evidence, and move forward with confidence."],
]

function ProcessSteps() {
  return <div className={styles.processSteps}>{processSteps.map(([number, title, body]) => <div className={styles.processStep} key={number}><span className={styles.stepNumber}>{number}</span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div>
}

const comparisonRows = [
  ["Names checked one at a time", "Up to 50 names in one batch"],
  ["Verification spread across separate tabs", "Six domains plus direct verification links"],
  ["A green dot with no next step", "Founder Signal and a clear verification checklist"],
]

function ComparisonLedger() {
  return <div className={styles.comparisonLedger}><div className={styles.comparisonHeaders}><span>Ideas only</span><span>NamoLux</span></div>{comparisonRows.map(([left, right]) => <div className={styles.comparisonRow} key={left}><span><CircleX size={17} strokeWidth={1.4} />{left}</span><span><CircleCheck size={17} strokeWidth={1.4} />{right}</span></div>)}</div>
}

export function PremiumHome() {
  return (
    <div className={styles.premiumPage}>
      <PremiumNav />
      <main id="main-content">
        <section className={`${styles.heroSection} ${styles.darkSection}`} id="product" aria-labelledby="hero-heading">
          <div className={styles.contourField} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.heroEyebrow}>Domain intelligence for founders</span>
              <h1 id="hero-heading">The right name<br />{" "}changes <span>everything.</span></h1>
              <p>Paste your shortlist. Check six domains, then verify social profiles, company names and official UK, US and EU trade-mark records in one workspace.</p>
              <div className={styles.referenceHeroActions}>
                <Link href="/bulk-domain-check" className={styles.heroPrimaryButton}>Check a shortlist <ArrowRight size={22} strokeWidth={1.5} /></Link>
                <Link href="#process" className={styles.heroSecondaryButton}>See how it works <span><Play size={11} fill="currentColor" strokeWidth={1.5} /></span></Link>
              </div>
              <HeroTrust />
            </div>
            <HeroShortlistPanel />
          </div>
          <div className={styles.capabilityRail}>
            <div><span className={styles.capabilityIcon}><ListFilter size={25} strokeWidth={1.45} /></span><p>Up to 50 names<small>in one batch</small></p></div>
            <div><span className={styles.capabilityIcon}><Globe2 size={25} strokeWidth={1.45} /></span><p>Six extensions<small>in one view</small></p></div>
            <div><span className={styles.capabilityIcon}><Search size={25} strokeWidth={1.45} /></span><p>Social + company<small>verification links</small></p></div>
            <div><span className={styles.capabilityIcon}><ShieldCheck size={25} strokeWidth={1.45} /></span><p>UK, US + EU<small>trade-mark search</small></p></div>
          </div>
        </section>

        <section className={styles.paperSection} aria-labelledby="decision-heading">
          <div className={styles.sectionInner}><PageMarker number="02" /><div className={styles.decisionGrid}><div className={styles.decisionCopy}><h2 id="decision-heading">Generating names is easy. Choosing one is the real work.</h2><p>A long list creates motion, not conviction. NamoLux brings every candidate into one clear view so domain evidence, brand-footprint checks and Founder Signal can guide the decision.</p><div className={styles.subRule} /><h3>A shortlist should reveal a winner.</h3><p>Paste names from anywhere. NamoLux puts availability, verification links and Founder Signal side by side so the trade-offs become clear.</p><SolidButton href="/bulk-domain-check" tone="ink">Check my shortlist</SolidButton></div><ShortlistTransform /></div></div>
        </section>

        <section className={`${styles.signalSection} ${styles.darkSection}`} id="features" aria-labelledby="signal-heading">
          <div className={styles.sectionInner}><PageMarker number="03" /><div className={styles.signalGrid}><SignalGauge /><div className={styles.signalText}><h2 id="signal-heading">A disciplined read on brand potential.</h2><p>Founder Signal evaluates the qualities that help a name travel: clarity, memorability, pronunciation, extension strength, character quality, and brand risk.</p><SignalLedger /><p className={styles.caveat}>Founder Signal supports judgment. It is not legal or trademark advice.</p></div></div><AvailabilityLedger /></div>
        </section>

        <section className={styles.paperSection} id="process" aria-labelledby="process-heading">
          <div className={styles.sectionInner}><PageMarker number="04" /><div className={styles.processGrid}><div><h2 id="process-heading">From shortlist to decision.</h2><p className={styles.lead}>Bring every candidate into one consistent framework, verify what is available, and leave with a name you can explain.</p><ProcessSteps /></div><div className={styles.compareCopy}><h3>Most domain checkers stop at availability. NamoLux gives you the next checks.</h3><p>Availability matters, but the strongest available name still needs a clear brand footprint and a reason to win.</p><ComparisonLedger /><SolidButton href="#pricing" tone="ink">See plans</SolidButton></div></div></div>
        </section>

        <section className={`${styles.pricingSection} ${styles.darkSection}`} id="pricing" aria-labelledby="pricing-heading">
          <div className={styles.sectionInner}><PageMarker number="05" /><div className={styles.pricingIntro}><h2 id="pricing-heading">Start free. Keep the decision moving with NamoLux Pro.</h2><p>Every Bulk Check includes direct social-profile, company and official UK, US and EU trade-mark verification links for available candidates. Free includes three Bulk Check runs and one Founder Signal run each UTC calendar month. Pro adds a defined 120-run workspace for each, saved decisions, CSV exports, shareable reports, and an ad-free experience.</p></div><div className={styles.pricingLedger}><div className={styles.planColumn}><h3>{PRODUCT_OFFER.freePlanName}</h3><div className={styles.price}>{PRODUCT_OFFER.tiers[0].price}</div><p className={styles.priceDetail}>{PRODUCT_OFFER.freeUsageLabel}</p><ul>{PRODUCT_OFFER.freeFeatures.slice(0, 3).map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><SolidButton href="/bulk-domain-check" tone="outline">Check a shortlist</SolidButton></div><div className={`${styles.planColumn} ${styles.planPaid}`}><h3>{PRODUCT_OFFER.paidPlanName}</h3><div className={styles.price}>{PRODUCT_OFFER.paidPrice}</div><p className={styles.priceDetail}>{PUBLIC_PRODUCT_COPY.proPlanSummary}</p><ul>{PUBLIC_PRODUCT_COPY.proPlanFeatures.slice(0, 6).map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><SolidButton href={PRODUCT_OFFER.paidCheckoutHref}>{PRODUCT_OFFER.proCtaLabel}</SolidButton></div></div><p className={styles.legalNote}>{PRODUCT_OFFER.caveats.join(" ")} {PUBLIC_PRODUCT_COPY.renewalNote}</p></div>
        </section>

        <section className={styles.faqSection} id="faq" aria-labelledby="faq-heading">
          <div className={styles.sectionInner}><PageMarker number="06" /><div className={styles.faqGrid}><div><h2 id="faq-heading">Questions worth answering before you commit.</h2><div className={styles.subRule} /><p>Clear answers for a considered naming decision.</p></div><PremiumFaq /></div></div>
        </section>

        <section className={styles.finalSection} aria-labelledby="final-heading"><div className={styles.finalInner}><h2 id="final-heading">Your company deserves a name you can stand behind.</h2><div className={styles.finalRule} /><p>Bring the shortlist, check the domains, verify the brand footprint, and make the decision with evidence.</p><HomeShortlistForm compact /></div></section>
      </main>
      <SiteFooter />
    </div>
  )
}
