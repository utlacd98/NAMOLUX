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

// Product previews below use a production QA run completed on 2 September
// 2026. They mirror the current discovery-first interface: domains and the
// current-brand screen come first, while Founder Signal is run on demand.
const verifiedQaResults = [
  {
    name: "Daylatch",
    score: 85,
    band: "Strong",
    strategy: "Suggestive",
    pronunciation: "DAY-latch",
    domain: "daylatch.com",
    tld: ".com",
    domains: [[".com", "available"], [".co", "available"], [".ai", "available"]],
    association: "A timely opening: practical conditions become a clear reason to go.",
  },
  {
    name: "Trellivo",
    score: 59,
    band: "Reconsider",
    strategy: "Controlled coined",
    pronunciation: "Trel-EE-voh",
    domain: "trellivo.co",
    tld: ".co",
    domains: [[".com", "unavailable"], [".co", "available"], [".ai", "available"]],
    association: "Easy to say, but the name needs more strategic distinction before commitment.",
  },
] as const

const featuredSignal = verifiedQaResults[0]

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
    <aside className={`${styles.heroShortlistPanel} ${styles.heroVerdictPanel}`} aria-label="Two names from one NamoLux naming brief">
      <p>Same brief. Different verdicts.</p>
      <div className={styles.heroVerdictList}>
        {verifiedQaResults.map((result) => (
          <div className={styles.heroVerdictCard} key={result.name}>
            <div className={styles.heroVerdictHeading}>
              <div><strong>{result.name}</strong><span>{result.strategy}</span></div>
              <div><b>{result.score}</b><em>{result.band}</em></div>
            </div>
            <div className={styles.heroVerdictDomains}>
              {result.domains.map(([tld, status]) => <span key={tld} data-status={status}>{tld} {status}</span>)}
            </div>
          </div>
        ))}
      </div>
      <Link href="/generate" className={styles.heroPanelLink}>Start with your own brief <ArrowRight size={20} strokeWidth={1.5} /></Link>
    </aside>
  )
}

function HeroContext() {
  return (
    <div className={styles.heroContext}>
      <p>Sign in free for one Name Sprint each UTC day. Pro includes 40 per month.</p>
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
          <span>One brief, two honest outcomes</span>
          <h3>A score should help you choose—not flatter every name.</h3>
          <p>Real Name Sprint results · Founder Signal run on demand · official registers still require manual review.</p>
        </div>
        <strong>2</strong>
      </div>
      <div className={styles.sprintResultList}>
        {verifiedQaResults.map((result) => (
          <div className={styles.sprintResultRow} key={result.name}>
            <div><strong>{result.name}</strong><span>Domain verified</span></div>
            <p><span>{result.tld} available</span>{result.domain}</p>
            <b>{result.score}<small>Founder Signal · {result.band}</small></b>
          </div>
        ))}
      </div>
      <p className={styles.sprintFootnote}>Product examples from 2 September 2026. Domain availability is time-sensitive and must be confirmed before purchase.</p>
    </div>
  )
}

function SignalGauge() {
  const circumference = 515
  const scoredArc = Math.round((featuredSignal.score / 100) * circumference)

  return (
    <div className={styles.gaugeWrap} data-testid="founder-signal-gauge">
      <svg className={styles.gauge} viewBox="0 0 220 220" aria-label={`${featuredSignal.name} Founder Signal score ${featuredSignal.score}, ${featuredSignal.band}`}>
        <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx="110" cy="110" r="82" fill="none" stroke="rgba(196,161,91,0.18)" strokeWidth="1" />
        <circle cx="110" cy="110" r="82" fill="none" stroke="#c4a15b" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${scoredArc} ${circumference}`} transform="rotate(-90 110 110)" />
        <circle cx="110" cy="110" r="7" fill="#c4a15b" />
      </svg>
      <div className={styles.gaugeCopy}><span>{featuredSignal.name}</span><strong>{featuredSignal.score}</strong><em>{featuredSignal.band} · run on demand</em></div>
    </div>
  )
}

const signalEvidence = [
  ["Discovery status", "Passed"],
  ["Exact launch domain", "Verified"],
  ["Current-brand screen", "Checked"],
  ["Founder Signal", "85 · Strong"],
] as const

function SignalLedger() {
  return (
    <div className={styles.signalLedger}>
      {signalEvidence.map(([label, value]) => (
        <div className={styles.dimension} data-testid="founder-signal-dimension" key={label}>
          <span>{label}</span>
          <div className={styles.dimensionBars} aria-hidden="true">{Array.from({ length: 18 }).map((_, index) => <i key={index} className={styles.barOn} />)}</div>
          <strong data-testid="founder-signal-dimension-value">{value}</strong>
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
        <div><span>{featuredSignal.strategy}</span><h3>{featuredSignal.name} <em>Domain verified</em></h3></div>
        <strong>{featuredSignal.score}<small>Founder Signal · {featuredSignal.band}</small></strong>
      </div>
      <div className={styles.currentResultFacts}>
        <div><span>Pronunciation</span><strong>{featuredSignal.pronunciation}</strong></div>
        <div><span>Discovery status</span><strong>Domain and brand screen passed</strong></div>
        <div><span>Intended association</span><p>{featuredSignal.association}</p></div>
      </div>
      <div className={styles.tradeMarkPreview}>
        <span>Brand &amp; trade-mark evidence</span>
        <h4>Official register check required</h4>
        <p>NamoLux found no obvious issue in the checks completed below. This is not official trade-mark clearance.</p>
        <dl>
          <div><dt>NamoLux internal screen</dt><dd>Passed</dd></div>
          <div><dt>Current web brand screen</dt><dd>Checked</dd></div>
          <div><dt>Official registers</dt><dd>Not checked</dd></div>
        </dl>
      </div>
      <div className={styles.currentDomains}>
        <span className={styles.domainAvailable}>.com · available</span>
        <span className={styles.domainAvailable}>.co · available</span>
        <span className={styles.domainAvailable}>.ai · available</span>
      </div>
      <div className={styles.previewAction}>Strong candidate for the shortlist</div>
      <p className={styles.previewDisclosure}>Product example from 2 September 2026. Availability changes; official searches are still required.</p>
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
              <p>Generate selectively or bring a shortlist, see exactly which checks ran, and keep domain evidence beside an optional Founder Signal review. The interface separates the current-brand screen from official register checks so preliminary evidence never pretends to be legal clearance.</p>
            <div className={styles.proofPoints}>
              <span>Verified discoveries</span>
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
  ["03", "Score the names you want to keep", "Run Founder Signal on demand for a chosen finalist, then compare pronunciation, domain evidence, collision-screen status, and official verification links."],
  ["04", "Launch the winner", "Pro turns a selected name into three palette-led landing-page directions with matching logo concepts and exportable brand assets."],
]

function ProcessSteps() {
  return <div className={styles.processSteps}>{processSteps.map(([number, title, body]) => <div className={styles.processStep} key={number}><span className={styles.stepNumber}>{number}</span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div>
}

function LaunchKitPreview() {
  return (
    <div className={styles.launchKitPreview} aria-label="Current Brand Launch Kit interface">
      <div className={styles.launchKitHeader}>
        <div><span>Current kit</span><strong>culark.com</strong></div>
        <span>Brand Launch Kit · Pro</span>
      </div>
      <div className={styles.paletteDirections}>
        {[
          { label: "Signal Olive", colours: ["#13271f", "#e9e0ce", "#b98752"] },
          { label: "Midnight Ledger", colours: ["#171511", "#d9c9aa", "#786a55"] },
          { label: "Copper Current", colours: ["#f1eadf", "#374f43", "#d17850"] },
        ].map((palette) => (
          <div key={palette.label}>
            <span>{palette.label}</span>
            <div>{palette.colours.map((colour) => <i key={colour} style={{ background: colour }} />)}</div>
          </div>
        ))}
      </div>
      <div className={styles.launchAssetRow}>
        <span>Landing + dashboard previews</span>
        <span>Mobile + desktop</span>
        <span>index.html</span>
        <span>styles.css</span>
        <span>script.js</span>
        <span>3 transparent PNG logos</span>
      </div>
    </div>
  )
}

const comparisonRows = [
  ["Dozens of unfiltered suggestions", "Only candidates that clear the quality gate"],
  ["Taken domains mixed into the results", "A verified exact .com, .co or .ai launch domain"],
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
              <span className={styles.heroEyebrow}>Name intelligence for founders</span>
              <h1 id="hero-heading">Find a name<br /><span>worth building on.</span></h1>
              <p>Describe the business. NamoLux discovers focused names, verifies an exact .com, .co or .ai launch domain, and helps you judge the finalists instead of sorting through a wall of filler.</p>
              <div className={styles.referenceHeroActions}>
                <Link href="/generate" className={styles.heroPrimaryButton}>Start a free Name Sprint <ArrowRight size={22} strokeWidth={1.5} /></Link>
                <Link href="/bulk-domain-check" className={styles.heroSecondaryButton}>Check names I already have <span><ArrowRight size={11} strokeWidth={1.5} /></span></Link>
              </div>
              <HeroContext />
            </div>
            <HeroShortlistPanel />
          </div>
          <div className={styles.capabilityRail}>
            <div><span className={styles.capabilityIcon}><Sparkles size={25} strokeWidth={1.45} /></span><p>Name Sprint<small>Free daily · Pro monthly</small></p></div>
            <div><span className={styles.capabilityIcon}><Globe2 size={25} strokeWidth={1.45} /></span><p>.com · .co · .ai<small>verified survivor rule</small></p></div>
            <div><span className={styles.capabilityIcon}><ShieldCheck size={25} strokeWidth={1.45} /></span><p>Founder Signal<small>run on chosen names</small></p></div>
            <div><span className={styles.capabilityIcon}><Palette size={25} strokeWidth={1.45} /></span><p>Brand Launch Kit<small>palettes, mockups + logos</small></p></div>
          </div>
        </section>

        <section className={styles.paperSection} aria-labelledby="decision-heading">
          <div className={styles.sectionInner}><PageMarker number="02" /><div className={styles.decisionGrid}><div className={styles.decisionCopy}><h2 id="decision-heading">The useful result is a decision—not a longer list.</h2><p>Name Sprint starts from a proper business brief, searches across distinct naming directions, and removes obvious failures before the shortlist appears. Bring up to 50 existing ideas into Bulk Check when you already have names to compare.</p><div className={styles.subRule} /><h3>Good evidence can still produce different verdicts.</h3><p>Daylatch and Trellivo came from the same brief. Both had an available launch domain; Founder Signal separated the Strong candidate from the one worth reconsidering.</p><SolidButton href="/generate" tone="ink">Start Name Sprint</SolidButton></div><ShortlistTransform /></div></div>
        </section>

        <section className={`${styles.signalSection} ${styles.darkSection}`} id="features" aria-labelledby="signal-heading">
          <div className={styles.sectionInner}><PageMarker number="03" /><div className={styles.signalGrid}><SignalGauge /><div className={styles.signalText}><h2 id="signal-heading">A disciplined read on the names you choose.</h2><p>Founder Signal is a paid decision layer, run only when a candidate earns your attention. It compares strategic fit, distinctiveness, memorability, pronunciation, spelling, collision risk, and domain strength.</p><SignalLedger /><p className={styles.caveat}>This 85/100 result is the Daylatch product example shown above. Founder Signal supports judgment; it is not legal or trade-mark advice.</p></div></div><AvailabilityLedger /></div>
        </section>

        <ProductProof />

        <section className={styles.paperSection} id="process" aria-labelledby="process-heading">
          <div className={styles.sectionInner}><PageMarker number="05" /><div className={styles.processGrid}><div><h2 id="process-heading">From brief to launch.</h2><p className={styles.lead}>Create the naming constitution, admit only serious candidates, compare the survivors, then turn the winner into a coherent visual direction.</p><ProcessSteps /></div><div className={styles.compareCopy}><h3>Most generators stop when the list appears. NamoLux carries the decision into the brand.</h3><p>Availability matters, but the strongest available name still needs a clear brand footprint, a reason to win, and a credible way to launch.</p><LaunchKitPreview /><ComparisonLedger /><SolidButton href="/brand-launch" tone="ink">Explore the Launch Kit</SolidButton></div></div></div>
        </section>

        <section className={`${styles.pricingSection} ${styles.darkSection}`} id="pricing" aria-labelledby="pricing-heading">
          <div className={styles.sectionInner}><PageMarker number="06" /><div className={styles.pricingIntro}><h2 id="pricing-heading">Start free. Go deeper when a name earns it.</h2><p>Signed-in Free users get one Name Sprint each UTC day. Pro adds 40 Name Sprints monthly, Founder Signal, saved decisions, reports, exports, an ad-free workspace, and ten paid Brand Launch Kits per month.</p></div><div className={styles.pricingLedger}><div className={styles.planColumn}><h3>{PRODUCT_OFFER.freePlanName}</h3><div className={styles.price}>{PRODUCT_OFFER.tiers[0].price}</div><p className={styles.priceDetail}>{PRODUCT_OFFER.freeUsageLabel}</p><ul>{PRODUCT_OFFER.freeFeatures.slice(0, 4).map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><SolidButton href="/generate" tone="outline">Start free</SolidButton></div><div className={`${styles.planColumn} ${styles.planPaid}`}><h3>{PRODUCT_OFFER.paidPlanName}</h3><div className={styles.price}>{PRODUCT_OFFER.paidPrice}</div><p className={styles.priceDetail}>{PUBLIC_PRODUCT_COPY.proPlanSummary}</p><ul>{PUBLIC_PRODUCT_COPY.proPlanFeatures.filter((feature, index) => index < 6 || feature.startsWith("Brand Launch Kit")).map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><SolidButton href={PRODUCT_OFFER.paidCheckoutHref}>{PRODUCT_OFFER.proCtaLabel}</SolidButton></div></div><p className={styles.legalNote}>{PRODUCT_OFFER.caveats.join(" ")} {PUBLIC_PRODUCT_COPY.renewalNote}</p></div>
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
