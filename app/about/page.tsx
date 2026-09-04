import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { CTA_LABELS } from "@/lib/site-content"
import styles from "./about.module.css"

export const metadata: Metadata = {
  title: "About Us | NamoLux",
  description:
    "Learn why Andrew Barrett built NamoLux to generate, reject, rank and launch business names with evidence.",
  openGraph: {
    title: "About NamoLux",
    description:
      "NamoLux helps founders move from a business brief to a defensible name and launch-ready brand.",
    type: "website",
    url: "https://www.namolux.com/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About NamoLux",
    description:
      "NamoLux helps founders move from a business brief to a defensible name and launch-ready brand.",
  },
  alternates: {
    canonical: "/about",
  },
}

const principles = [
  {
    title: "Quality over quantity",
    copy: "Better to have 10 great options than 1,000 mediocre ones.",
  },
  {
    title: "Founder-first",
    copy: "Built for people who ship, not just people who dream.",
  },
  {
    title: "Transparent by default",
    copy: "Clear limits, versioned scores, explicit caveats, and no invented certainty.",
  },
] as const

function SectionMarker({ number }: { number: string }) {
  return (
    <div className={styles.sectionMarker} aria-hidden="true">
      <span>{number}</span>
      <div />
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className={styles.aboutPage}>
      <SiteHeader />

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="about-heading">
          <div className={styles.heroInner}>
            <h1 id="about-heading">
              Built for the moment a name <span>becomes a decision.</span>
            </h1>

            <div className={styles.heroSummary}>
              <p>
                We help founders generate, reject and compare business names worth building companies on.
              </p>
              <Link href="/founder-signal" className={styles.textLink}>
                Explore the methodology
                <ArrowRight aria-hidden="true" size={17} strokeWidth={1.6} />
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.mission} aria-labelledby="mission-heading">
          <div className={styles.sectionInner}>
            <SectionMarker number="01" />

            <div className={styles.missionGrid}>
              <div className={styles.missionIntro}>
                <h2 id="mission-heading">
                  The work is not generating more names. It is deciding which ones deserve to survive.
                </h2>
                <p>
                  Name Sprint creates the broad list privately, rejects weak or unavailable options,
                  and brings the survivors into one calm evidence-led workspace.
                </p>
                <Link href="/founder-signal" className={styles.paperLink}>
                  Read the Founder Signal methodology
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={1.6} />
                </Link>
              </div>

              <ol className={styles.missionLedger}>
                <li>
                  <span>01</span>
                  <div>
                    <h3>Generation with an admissions policy</h3>
                    <p>
                      NamoLux rejects generic, risky or unusable candidates before they reach the founder.
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>A consistent review</h3>
                    <p>
                      Founder Signal v2.0 compares every eligible candidate across seven dimensions.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>A path into the brand</h3>
                    <p>
                      The paid Launch Kit turns the selected name into palette directions,
                      landing-page previews, logo concepts, and exportable assets.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className={styles.principles} aria-labelledby="principles-heading">
          <div className={styles.sectionInner}>
            <SectionMarker number="02" />

            <div className={styles.storyGrid}>
              <article className={styles.founderStory} aria-labelledby="founder-heading">
                <div className={styles.founderIdentity}>
                  <span>Founder, NamoLux</span>
                  <h2 id="founder-heading">Andrew Barrett</h2>
                </div>
                <p>
                  Andrew built NamoLux after experiencing firsthand how difficult it is to find
                  the perfect domain name. After spending countless hours on domain research for
                  various projects, he decided to create a tool that makes the process faster,
                  smarter, and more reliable for everyone.
                </p>
                <Link href="/founder-story" className={styles.paperLink}>
                  Read the founder story
                  <ArrowRight aria-hidden="true" size={17} strokeWidth={1.6} />
                </Link>
                <a
                  href="https://x.com/NamoLux"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.paperLink}
                >
                  Follow NamoLux on X
                  <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.6} />
                </a>
              </article>

              <div className={styles.principlesBlock}>
                <div className={styles.principlesIntro}>
                  <h2 id="principles-heading">What we believe.</h2>
                  <p>
                    A naming tool should make the trade-offs clearer, without pretending the
                    final judgment can be automated away.
                  </p>
                </div>

                <ol className={styles.principleList}>
                  {principles.map((principle, index) => (
                    <li key={principle.title}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{principle.title}</h3>
                        <p>{principle.copy}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.cta} aria-labelledby="cta-heading">
          <div className={styles.ctaInner}>
            <div>
              <h2 id="cta-heading">Choose the name worth building on.</h2>
              <p>
                Start from a business brief, admit only serious candidates, and compare the survivors with evidence.
              </p>
            </div>
            <Link href="/generate" className={styles.primaryButton}>
              {CTA_LABELS.primary}
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
