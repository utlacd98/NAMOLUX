import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  AtSign,
  Building2,
  CalendarDays,
  CircleHelp,
  Database,
  Info,
  Scale,
  Search,
  Shield,
} from "lucide-react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { scoreName } from "@/lib/founderSignal/scoreName"
import {
  FOUNDER_SIGNAL_BANDS,
  FOUNDER_SIGNAL_DIMENSIONS,
  FOUNDER_SIGNAL_SPEC,
} from "@/lib/founderSignal/spec"
import styles from "./page.module.css"

export const metadata: Metadata = {
  title: "Founder Signal methodology | NamoLux",
  description:
    "See how Founder Signal compares a naming shortlist against a chosen primary domain extension using clarity, memorability, pronunciation, extension strength, character quality, and brand risk.",
  alternates: { canonical: "/founder-signal" },
}

const SAMPLE_NAME = "Vaulten"
const sample = scoreName({ name: SAMPLE_NAME, tld: "com" })

const sampleDomains = [".com", ".io", ".co", ".ai"] as const

const bandDescriptions = {
  Elite: "Outstanding across most dimensions with minimal heuristic risk.",
  Strong: "Strong overall with minor trade-offs.",
  Viable: "Usable with some notable weaknesses or risks.",
  Reconsider: "Material weaknesses, collision risk, or both.",
} as const

function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

function ArrowIcon() {
  return <ArrowRight aria-hidden="true" size={19} strokeWidth={1.7} />
}

export default function FounderSignalPage() {
  const evaluatedOn = formatAuditDate(sample.evaluatedOn)
  const dataFreshness = formatAuditDate(sample.confidence.dataFreshness)

  return (
    <div className={styles.page}>
      <Navbar />

      <main id="main-content" className={styles.main}>
        <div className={styles.rail}>
          <section className={styles.hero} aria-labelledby="founder-signal-title">
            <div className={styles.heroCopy}>
              <h1 id="founder-signal-title">Choose the name worth building on.</h1>
              <p>
                Choose a primary domain extension, then use Founder Signal to compare the strengths, risks, and
                decision evidence behind every submitted candidate.
              </p>

              <div className={styles.heroActions}>
                <Link className={styles.primaryAction} href="#shortlist-form">
                  Score a shortlist
                  <ArrowIcon />
                </Link>
                <Link className={styles.secondaryAction} href="/bulk-domain-check">
                  Open Bulk Check
                </Link>
              </div>
            </div>

            <article className={styles.sampleCard} aria-labelledby="sample-name">
              <div className={styles.sampleHeading}>
                <div>
                  <h2 id="sample-name">{SAMPLE_NAME}</h2>
                  <p className={styles.sampleQualifier}>Illustrative score preview — not a live result</p>
                </div>
                <div className={styles.sampleScore} aria-label={`${sample.score} out of 100, ${sample.band}`}>
                  <span>{sample.score}</span>
                  <strong>· {sample.band}</strong>
                </div>
              </div>

              <div className={styles.domainLedger} aria-label={`Example domain checks for ${SAMPLE_NAME}`}>
                {sampleDomains.map((domain) => (
                  <div className={styles.domainRow} key={domain}>
                    <CircleHelp aria-hidden="true" size={21} strokeWidth={1.6} />
                    <span className={styles.domainExtension}>{domain}</span>
                    <span className={styles.domainStatus}>Verification required</span>
                  </div>
                ))}
              </div>

              <p className={styles.sampleNote}>
                No domain, company, social, or trademark status is inferred from this example.
              </p>
            </article>
          </section>

          <section className={styles.dimensionSection} aria-labelledby="dimensions-title">
            <h2 id="dimensions-title">How Founder Signal scores</h2>
            <ol className={styles.dimensionLedger}>
              {FOUNDER_SIGNAL_DIMENSIONS.map((dimension) => (
                <li key={dimension.key}>
                  <strong>{dimension.weight}%</strong>
                  <span>{dimension.label}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className={styles.metaLedger} aria-label="Founder Signal specification details">
            <span>
              <Info aria-hidden="true" size={17} />
              Founder Signal v{sample.version}
            </span>
            <span>
              <CalendarDays aria-hidden="true" size={17} />
              Evaluated {evaluatedOn}
            </span>
            <span>
              <Shield aria-hidden="true" size={17} />
              {sample.confidence.level} confidence
            </span>
            <span>
              <Database aria-hidden="true" size={17} />
              Data freshness {dataFreshness}
            </span>
          </div>

          <section className={styles.methodologyLedger} aria-label="Founder Signal methodology">
            <div className={styles.bandsPanel}>
              <h2>Score bands</h2>
              <div className={styles.bandRows}>
                {FOUNDER_SIGNAL_BANDS.map((band) => (
                  <div className={styles.bandRow} key={band.label}>
                    <span className={styles.bandDot} data-band={band.label.toLowerCase()} aria-hidden="true" />
                    <strong>
                      {band.min}–{band.max}
                    </strong>
                    <span className={styles.bandLabel}>{band.label}</span>
                    <span className={styles.bandDescription}>{bandDescriptions[band.label]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.collisionPanel}>
              <h2>Collision rules</h2>
              <div className={styles.collisionBody}>
                <Shield aria-hidden="true" size={68} strokeWidth={1.3} />
                <dl>
                  <div>
                    <dt>Exact active-brand match</dt>
                    <dd>
                      Disqualified · score {FOUNDER_SIGNAL_SPEC.collisionPolicy.exact.score}
                    </dd>
                  </div>
                  <div>
                    <dt>Close active-brand match</dt>
                    <dd>
                      Severe cap · maximum {FOUNDER_SIGNAL_SPEC.collisionPolicy.closeMatch.scoreCap}
                    </dd>
                  </div>
                </dl>
              </div>
              <p>{sample.confidence.basis}. Registry coverage is not legal clearance.</p>
            </div>

            <div className={styles.dueDiligencePanel}>
              <h2>Four separate checks</h2>
              <dl className={styles.checkRows}>
                <div>
                  <Search aria-hidden="true" size={18} />
                  <dt>Domain</dt>
                  <dd>Live registrar availability</dd>
                </div>
                <div>
                  <Building2 aria-hidden="true" size={18} />
                  <dt>Company</dt>
                  <dd>Registers and known products</dd>
                </div>
                <div>
                  <AtSign aria-hidden="true" size={18} />
                  <dt>Social</dt>
                  <dd>Per-network handle availability</dd>
                </div>
                <div>
                  <Scale aria-hidden="true" size={18} />
                  <dt>Trademark</dt>
                  <dd>Independent legal clearance</dd>
                </div>
              </dl>
              <p className={styles.disclaimer}>
                Founder Signal supports judgment. It is not legal or trademark advice. Do your own due diligence before
                committing to a name.
              </p>
            </div>
          </section>

          <form id="shortlist-form" className={styles.shortlistForm} action="/bulk-domain-check/workspace" method="get">
            <div className={styles.formLabelBlock}>
              <label htmlFor="founder-signal-shortlist">Paste your shortlist</label>
              <span id="shortlist-help">One name per line; choose your primary TLD in the workspace</span>
            </div>
            <textarea
              id="founder-signal-shortlist"
              name="names"
              rows={3}
              required
              aria-describedby="shortlist-help"
              placeholder={"e.g. Vaulten\nAurevo\nNorthline"}
            />
            <button type="submit">
              Open scoring workspace
              <ArrowIcon />
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}
