import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  CircleX,
  Globe2,
  Palette,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { PremiumNav } from "./premium-nav"
import { PremiumFaq } from "./premium-faq"
import { HomeBriefForm } from "./home-brief-form"
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
      <p>How Name Sprint earns a place</p>
      <div className={styles.heroScoreRows}>
        {[
          ["Naming brief", "Confirm"],
          ["Quality gate", "Reject"],
          ["Domain screen", "3 TLDs"],
          ["Founder Signal", "Rank"],
        ].map(([name, status]) => (
          <Link href="/generate" key={name} className={styles.heroScoreRow}>
            <strong>{name}</strong><span>{status}</span><ArrowRight size={20} strokeWidth={1.5} />
          </Link>
        ))}
      </div>
      <Link href="/generate" className={styles.heroPanelLink}>Start a curated Name Sprint <ArrowRight size={20} strokeWidth={1.5} /></Link>
    </aside>
  )
}

function HeroContext() {
  return (
    <div className={styles.heroContext}>
      <p>Built for solo founders and indie hackers naming their next product.</p>
    </div>
  )
}

function ShortlistTransform() {
  return (
    <div className={styles.sprintPreview} aria-label="Current Name Sprint results interface">
      <div className={styles.sprintPreviewHeader}>
        <div><span>03</span><strong>Curated results</strong></div>
        <span className={styles.interfaceNote}>Current product interface</span>
      </div>
      <div className={styles.sprintSummary}>
        <div>
          <span>Quality gate complete</span>
          <h3>5 names passed the quality bar</h3>
          <p>Generated 48 candidates · 33 rejection decisions · no filler added.</p>
        </div>
        <strong>5</strong>
      </div>
      <div className={styles.sprintResultList}>
        {[
          { name: "Vessent", domain: "vessent.co", tld: ".co", score: 92 },
          { name: "Tonealcove", domain: "tonealcove.com", tld: ".com", score: 84 },
          { name: "Perenn", domain: "perenn.co", tld: ".co", score: 74 },
        ].map((result) => (
          <div className={styles.sprintResultRow} key={result.name}>
            <div><strong>{result.name}</strong><span>Pass</span></div>
            <p><span>{result.tld} available</span>{result.domain}</p>
            <b>{result.score}<small>Founder Signal</small></b>
          </div>
        ))}
      </div>
      <p className={styles.sprintFootnote}>Interface data from a live QA run. Domain availability is time-sensitive and must be confirmed before purchase.</p>
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
  ["Strategic fit", "89"],
  ["Distinctiveness", "84"],
  ["Memorability", "82"],
  ["Pronunciation", "86"],
  ["Spelling + character", "77"],
  ["Brand collision risk", "84"],
  ["Domain strength", "80"],
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
        <h3>Two domain checks, each with a clear job.</h3>
        <p>Name Sprint uses three launch TLDs as an admission rule. Bulk Check gives an existing shortlist the wider six-extension evidence view.</p>
      </div>
      <div className={styles.domainProductViews}>
        <div className={styles.domainProductView}>
          <div className={styles.domainViewHeader}><strong>Name Sprint</strong><span>Admission filter</span></div>
          <div className={styles.launchTlds}>
            {[".com", ".co", ".ai"].map((extension) => <span key={extension}><i className={styles.extensionOn} aria-hidden="true" />{extension}</span>)}
          </div>
          <p>At least one must be verified available before a name can appear.</p>
        </div>
        <div className={styles.domainProductView}>
          <div className={styles.domainViewHeader}><strong>Bulk Check</strong><span>Full evidence view</span></div>
          <div className={styles.bulkTlds}>
            {extensions.map((extension) => <span key={extension}>{extension}</span>)}
          </div>
          <p>Six DNS and RDAP results, plus direct company, social and official register links.</p>
        </div>
      </div>
      <Link href="/bulk-domain-check" className={styles.inlineCta}>Open Bulk Check <ArrowRight size={16} strokeWidth={1.5} /></Link>
    </div>
  )
}

function CurrentResultPreview() {
  return (
    <div className={styles.currentResultPreview} aria-label="Current Name Sprint candidate result">
      <div className={styles.currentResultTop}>
        <div><span>Suggestive</span><h3>Perenn <em>Pass</em></h3></div>
        <strong>74<small>Founder Signal</small></strong>
      </div>
      <div className={styles.currentResultFacts}>
        <div><span>Evidence confidence</span><strong>High</strong></div>
        <div><span>Pronunciation</span><strong>PEH-ren</strong></div>
        <div><span>Main risk</span><p>The strategic association may need supporting brand context.</p></div>
      </div>
      <div className={styles.tradeMarkPreview}>
        <span>Brand &amp; trade-mark evidence</span>
        <h4>Official register check required</h4>
        <p>NamoLux found no obvious issue in the checks completed below. This is not official trade-mark clearance.</p>
        <dl>
          <div><dt>NamoLux internal screen</dt><dd>Passed · 100/100</dd></div>
          <div><dt>Current web brand screen</dt><dd>Not run</dd></div>
          <div><dt>Official registers</dt><dd>Not checked</dd></div>
        </dl>
      </div>
      <div className={styles.currentDomains}>
        <span className={styles.domainUnavailable}>.com · unavailable</span>
        <span className={styles.domainAvailable}>.co · available</span>
        <span className={styles.domainUnavailable}>.ai · unavailable</span>
      </div>
      <p className={styles.previewDisclosure}>Real QA result and current interface copy. Availability changes; official searches are still required.</p>
    </div>
  )
}

function ProductProof() {
  return (
    <section className={styles.productProofSection} aria-labelledby="proof-heading">
      <div className={styles.sectionInner}>
        <PageMarker number="04" />
        <div className={styles.productProofGrid}>
          <div className={styles.productProofCopy}>
              <span className={styles.proofEyebrow}>From generation to a defensible decision</span>
              <h2 id="proof-heading">A name intelligence platform, not another suggestion grid.</h2>
              <p>Generate selectively or bring a shortlist, see exactly which checks ran, and keep domain evidence beside Founder Signal. The current interface separates an internal collision screen from official register checks so a score never pretends to be legal clearance.</p>
            <div className={styles.proofPoints}>
              <span>Ranked shortlist</span>
              <span>Plain-English rationale</span>
              <span>Domain evidence</span>
            </div>
            <SolidButton href="/generate" tone="ink">Explore Name Sprint</SolidButton>
          </div>
          <div className={styles.productPreview}>
            <CurrentResultPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

const processSteps = [
  ["01", "Describe what you are building", "Confirm the audience, promise, tone, market, naming direction, words to include, and exclusions before generation starts."],
  ["02", "Let the weak names disappear", "NamoLux privately generates a broad working set, rejects generic or risky candidates, and verifies an exact or clean launch domain before a name reaches you."],
  ["03", "Compare the survivors", "Founder Signal ranks the eligible names and keeps pronunciation, domain evidence, collision-screen status, and official verification links visible."],
  ["04", "Launch the winner", "Pro turns a selected name into three palette-led landing-page directions with matching logo concepts and exportable brand assets."],
]

function ProcessSteps() {
  return <div className={styles.processSteps}>{processSteps.map(([number, title, body]) => <div className={styles.processStep} key={number}><span className={styles.stepNumber}>{number}</span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div>
}

function LaunchKitPreview() {
  return (
    <div className={styles.launchKitPreview} aria-label="Current Brand Launch Kit interface">
      <div className={styles.launchKitHeader}>
        <div><span>Selected winner</span><strong>perenn.co</strong></div>
        <span>Brand Launch Kit · Pro</span>
      </div>
      <div className={styles.paletteDirections}>
        {[
          { label: "Core", colours: ["#13271f", "#e9e0ce", "#b98752"] },
          { label: "Dark", colours: ["#171511", "#d9c9aa", "#786a55"] },
          { label: "Expressive", colours: ["#f1eadf", "#374f43", "#d17850"] },
        ].map((palette) => (
          <div key={palette.label}>
            <span>{palette.label}</span>
            <div>{palette.colours.map((colour) => <i key={colour} style={{ background: colour }} />)}</div>
          </div>
        ))}
      </div>
      <div className={styles.launchAssetRow}>
        <span>Landing-page preview</span>
        <span>index.html</span>
        <span>styles.css</span>
        <span>script.js</span>
        <span>3 logo concepts</span>
      </div>
    </div>
  )
}

const comparisonRows = [
  ["Dozens of unfiltered suggestions", "Only candidates that clear the quality gate"],
  ["Taken domains mixed into the results", "A verified exact domain or clearly labelled clean .com launch route"],
  ["A polished logo before the name is proven", "Founder Signal and evidence before the Launch Kit"],
]

function ComparisonLedger() {
  return <div className={styles.comparisonLedger}><div className={styles.comparisonHeaders}><span>Typical generator</span><span>NamoLux</span></div>{comparisonRows.map(([left, right]) => <div className={styles.comparisonRow} key={left}><span><CircleX size={17} strokeWidth={1.4} />{left}</span><span><CircleCheck size={17} strokeWidth={1.4} />{right}</span></div>)}</div>
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
              <span className={styles.heroEyebrow}>Selective name intelligence for founders</span>
              <h1 id="hero-heading">The name generator<br />with a <span>quality bar.</span></h1>
              <p>NamoLux generates, rejects and ranks business names. Exact .com, .co and .ai domains rank first; up to two strong names may use a clearly labelled clean .com launch domain.</p>
              <div className={styles.referenceHeroActions}>
                <Link href="/generate" className={styles.heroPrimaryButton}>Start a Name Sprint <ArrowRight size={22} strokeWidth={1.5} /></Link>
                <Link href="/bulk-domain-check" className={styles.heroSecondaryButton}>Check a shortlist <span><ArrowRight size={11} strokeWidth={1.5} /></span></Link>
              </div>
              <HeroContext />
            </div>
            <HeroShortlistPanel />
          </div>
          <div className={styles.capabilityRail}>
            <div><span className={styles.capabilityIcon}><Sparkles size={25} strokeWidth={1.45} /></span><p>Curated Name Sprint<small>weak names rejected</small></p></div>
            <div><span className={styles.capabilityIcon}><Globe2 size={25} strokeWidth={1.45} /></span><p>.com · .co · .ai<small>verified survivor rule</small></p></div>
            <div><span className={styles.capabilityIcon}><ShieldCheck size={25} strokeWidth={1.45} /></span><p>Founder Signal<small>ranking with evidence</small></p></div>
            <div><span className={styles.capabilityIcon}><Palette size={25} strokeWidth={1.45} /></span><p>Brand Launch Kit<small>palettes, mockups + logos</small></p></div>
          </div>
        </section>

        <section className={styles.paperSection} aria-labelledby="decision-heading">
          <div className={styles.sectionInner}><PageMarker number="02" /><div className={styles.decisionGrid}><div className={styles.decisionCopy}><h2 id="decision-heading">Generate selectively—or bring the names you already have.</h2><p>Name Sprint starts from a proper business brief and refuses to fill the screen with weak or unavailable candidates. If you already have ideas, Bulk Check puts up to 50 names into one consistent evidence view.</p><div className={styles.subRule} /><h3>A shortlist should reveal a winner.</h3><p>Either route leads to the same decision layer: live domain evidence, verification links and Founder Signal side by side.</p><SolidButton href="/generate" tone="ink">Start with a business brief</SolidButton></div><ShortlistTransform /></div></div>
        </section>

        <section className={`${styles.signalSection} ${styles.darkSection}`} id="features" aria-labelledby="signal-heading">
          <div className={styles.sectionInner}><PageMarker number="03" /><div className={styles.signalGrid}><SignalGauge /><div className={styles.signalText}><h2 id="signal-heading">A disciplined read on brand potential.</h2><p>Founder Signal v2 compares strategic fit, distinctiveness, memorability, pronunciation, spelling and character, collision risk, and domain strength.</p><SignalLedger /><p className={styles.caveat}>Founder Signal supports judgment. It is not legal or trademark advice.</p></div></div><AvailabilityLedger /></div>
        </section>

        <ProductProof />

        <section className={styles.paperSection} id="process" aria-labelledby="process-heading">
          <div className={styles.sectionInner}><PageMarker number="05" /><div className={styles.processGrid}><div><h2 id="process-heading">From brief to launch.</h2><p className={styles.lead}>Create the naming constitution, admit only serious candidates, compare the survivors, then turn the winner into a coherent visual direction.</p><ProcessSteps /></div><div className={styles.compareCopy}><h3>Most generators stop when the list appears. NamoLux carries the decision into the brand.</h3><p>Availability matters, but the strongest available name still needs a clear brand footprint, a reason to win, and a credible way to launch.</p><LaunchKitPreview /><ComparisonLedger /><SolidButton href="/brand-launch" tone="ink">Explore the Launch Kit</SolidButton></div></div></div>
        </section>

        <section className={`${styles.pricingSection} ${styles.darkSection}`} id="pricing" aria-labelledby="pricing-heading">
          <div className={styles.sectionInner}><PageMarker number="06" /><div className={styles.pricingIntro}><h2 id="pricing-heading">Start free. Keep the decision moving with NamoLux Pro.</h2><p>Every Bulk Check includes direct social-profile, company and official UK, US and EU trade-mark verification links for available candidates. Signed-in Free users receive one curated Name Sprint per UTC day alongside the existing shortlist allowances. Pro includes 40 Name Sprints and the Brand Launch Kit, with three palette directions, matching logo concepts, saved decisions, exports, and an ad-free workspace.</p></div><div className={styles.pricingLedger}><div className={styles.planColumn}><h3>{PRODUCT_OFFER.freePlanName}</h3><div className={styles.price}>{PRODUCT_OFFER.tiers[0].price}</div><p className={styles.priceDetail}>{PRODUCT_OFFER.freeUsageLabel}</p><ul>{PRODUCT_OFFER.freeFeatures.slice(0, 4).map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><SolidButton href="/generate" tone="outline">Open Name Sprint</SolidButton></div><div className={`${styles.planColumn} ${styles.planPaid}`}><h3>{PRODUCT_OFFER.paidPlanName}</h3><div className={styles.price}>{PRODUCT_OFFER.paidPrice}</div><p className={styles.priceDetail}>{PUBLIC_PRODUCT_COPY.proPlanSummary}</p><ul>{PUBLIC_PRODUCT_COPY.proPlanFeatures.filter((feature, index) => index < 6 || feature.startsWith("Brand Launch Kit")).map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><SolidButton href={PRODUCT_OFFER.paidCheckoutHref}>{PRODUCT_OFFER.proCtaLabel}</SolidButton></div></div><p className={styles.legalNote}>{PRODUCT_OFFER.caveats.join(" ")} {PUBLIC_PRODUCT_COPY.renewalNote}</p></div>
        </section>

        <section className={styles.faqSection} id="faq" aria-labelledby="faq-heading">
          <div className={styles.sectionInner}><PageMarker number="07" /><div className={styles.faqGrid}><div><h2 id="faq-heading">Questions worth answering before you commit.</h2><div className={styles.subRule} /><p>Clear answers for a considered naming decision.</p></div><PremiumFaq /></div></div>
        </section>

        <section className={styles.finalSection} aria-labelledby="final-heading"><div className={styles.finalInner}><h2 id="final-heading">Your company deserves a name worth building on.</h2><div className={styles.finalRule} /><p>Describe the business. NamoLux will generate broadly, reject privately, and show only the candidates that earn a place.</p><HomeBriefForm compact /></div></section>
      </main>
      <SiteFooter />
    </div>
  )
}
