import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import styles from "./founder-story.module.css"

const SITE_URL = "https://www.namolux.com"
const PAGE_URL = `${SITE_URL}/founder-story`

export const metadata: Metadata = {
  title: "The NamoLux Story | From a £7.99 Domain to a Naming Platform",
  description:
    "How a £7.99 domain became NamoLux: the founder story behind Founder Signal, Name Sprint and a more selective way to discover business names.",
  alternates: {
    canonical: "/founder-story",
  },
  openGraph: {
    title: "The NamoLux Story",
    description:
      "NamoLux began with a £7.99 domain and became a selective name intelligence and brand discovery platform for founders.",
    type: "website",
    url: PAGE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "The NamoLux Story",
    description:
      "How a £7.99 domain became a selective naming platform built around quality over quantity.",
  },
}

function ChapterNumber({ children }: { children: string }) {
  return <span className={styles.chapterNumber}>{children}</span>
}

export default function FounderStoryPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${PAGE_URL}#webpage`,
    url: PAGE_URL,
    name: "The NamoLux Story",
    description:
      "The story of how NamoLux grew from a £7.99 domain into a name intelligence and brand discovery platform for founders.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "NamoLux",
      url: `${SITE_URL}/`,
      founder: {
        "@type": "Person",
        "@id": `${SITE_URL}/journal/andrew-barrett#person`,
        name: "Andrew Barrett",
        sameAs: ["https://x.com/AndrewBuilds98"],
      },
    },
  }

  return (
    <div className={styles.storyPage}>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <main id="main-content">
        <article>
          <header className={styles.hero}>
            <div className={styles.heroInner}>
              <div className={styles.heroCopy}>
                <h1>The NamoLux Story</h1>
                <p className={styles.heroLead}>It started with a £7.99 domain.</p>
              </div>

              <div className={styles.originLedger} aria-label="NamoLux origin">
                <span>Original domain cost</span>
                <strong>£7.99</strong>
                <p>namolux.com</p>
              </div>
            </div>
          </header>

          <div className={styles.articleShell}>
            <aside className={styles.storyRail} aria-label="Story chapters">
              <p>The story in five chapters</p>
              <ol>
                <li><a href="#the-first-name">The first name</a></li>
                <li><a href="#the-real-problem">The real problem</a></li>
                <li><a href="#the-turning-point">The turning point</a></li>
                <li><a href="#the-return">The return</a></li>
                <li><a href="#still-building">Still building</a></li>
              </ol>
            </aside>

            <div className={styles.storyBody}>
              <section id="the-first-name" className={styles.chapter}>
                <ChapterNumber>01</ChapterNumber>
                <div>
                  <h2>The first name NamoLux helped us find was its own.</h2>
                  <p>
                    NamoLux began with a simple idea: make it easier to discover a name for
                    something you&apos;re building.
                  </p>
                  <p>In fact, NamoLux was one of those names.</p>
                  <p>
                    The name came out of the very kind of naming process we were building. It
                    stood out, felt distinctive, and NamoLux.com was available for £7.99.
                  </p>
                  <p>So we bought it and started building.</p>
                  <p>
                    At first, the goal seemed straightforward: help founders describe an idea
                    and discover names they could build around.
                  </p>
                </div>
              </section>

              <section id="the-real-problem" className={styles.chapter}>
                <ChapterNumber>02</ChapterNumber>
                <div>
                  <h2>Generating names isn&apos;t the difficult part. Choosing a good one is.</h2>
                  <p>
                    But the more we worked on naming, the more we realised something. So we
                    became obsessed with the decision.
                  </p>
                  <p>A name can look brilliant at first glance and still have problems.</p>
                  <ul className={styles.problemList}>
                    <li>It might be forgettable.</li>
                    <li>It might be difficult to pronounce.</li>
                    <li>It might sound too similar to something already out there.</li>
                    <li>The domain situation might be terrible.</li>
                    <li>
                      Or it might simply be another perfectly acceptable name that nobody
                      remembers five minutes later.
                    </li>
                  </ul>
                  <p>
                    We spent months rebuilding, testing, rejecting ideas and questioning what
                    NamoLux should actually help founders accomplish.
                  </p>
                </div>
              </section>

              <section id="the-turning-point" className={styles.chapter}>
                <ChapterNumber>03</ChapterNumber>
                <div>
                  <h2>We removed our own name generator.</h2>
                  <p>Eventually, we even removed our own name generator.</p>
                  <p>
                    Not because we&apos;d stopped believing in AI naming, but because we weren&apos;t
                    prepared to show founders names we wouldn&apos;t seriously consider ourselves.
                  </p>
                  <p>That changed NamoLux.</p>
                  <p>
                    Instead of concentrating on generating more names, we started building tools
                    to help founders make better naming decisions.
                  </p>
                  <p>
                    That work became Founder Signal™, alongside domain intelligence, brand
                    evidence, comparison tools and deeper ways of evaluating potential names.
                  </p>
                  <p>NamoLux gradually stopped feeling like another business-name generator.</p>
                  <blockquote>
                    <p>A brand discovery platform for founders.</p>
                  </blockquote>
                </div>
              </section>

              <section id="the-return" className={styles.chapter}>
                <ChapterNumber>04</ChapterNumber>
                <div>
                  <h2>Then we returned to where NamoLux started.</h2>
                  <p>
                    And then something unexpected happened. After months of building the
                    intelligence around naming, we realised we were finally ready to return to
                    where NamoLux started.
                  </p>
                  <p>The name generator could come back.</p>
                  <p>But this time, generation wouldn&apos;t be the whole product.</p>
                  <p>NamoLux could be selective.</p>
                  <p>
                    Instead of throwing hundreds of AI suggestions onto a screen and leaving you
                    to find the handful worth considering, the new experience is designed around
                    quality over quantity.
                  </p>
                  <blockquote>
                    <p>
                      Because founders don&apos;t need another 100 names. They need a few names worth
                      thinking about.
                    </p>
                  </blockquote>
                  <p>And NamoLux itself became part of the proof.</p>
                  <p>That £7.99 name became a real product.</p>
                  <p>
                    Over time, NamoLux began establishing its own identity in search, attracting
                    founders through Google and becoming something far larger than the little
                    naming experiment that started it.
                  </p>
                  <p>There&apos;s something fitting about that.</p>
                  <p>
                    NamoLux began by helping us find a name. Now we&apos;re building NamoLux to help
                    other founders find theirs.
                  </p>
                </div>
              </section>

              <section id="still-building" className={styles.chapter}>
                <ChapterNumber>05</ChapterNumber>
                <div>
                  <h2>Built through iteration, not overnight.</h2>
                  <p>
                    NamoLux isn&apos;t the result of one perfect prompt or one afternoon building an
                    AI tool.
                  </p>
                  <p>
                    It has been rebuilt, questioned, simplified, expanded and occasionally taken
                    apart entirely.
                  </p>
                  <p>Some ideas worked.</p>
                  <p>Some absolutely didn&apos;t.</p>
                  <p>But every iteration pushed us towards the same principle:</p>
                  <blockquote className={styles.finalPrinciple}>
                    <p>
                      A name shouldn&apos;t be recommended simply because AI can generate it. It
                      should earn its place.
                    </p>
                  </blockquote>
                  <p>And we&apos;re still building.</p>
                </div>
              </section>
            </div>
          </div>

          <footer className={styles.storyCta}>
            <div className={styles.storyCtaInner}>
              <div>
                <h2>Find the name your story starts with.</h2>
                <p>
                  Describe what you&apos;re building and let NamoLux generate, reject and rank the
                  candidates worth considering.
                </p>
              </div>
              <div className={styles.ctaActions}>
                <Link href="/generate" className={styles.primaryAction}>
                  Start a Name Sprint
                  <ArrowRight aria-hidden="true" size={18} strokeWidth={1.7} />
                </Link>
                <Link href="/journal/andrew-barrett" className={styles.secondaryAction}>
                  Meet the founder
                </Link>
                <a
                  href="https://x.com/AndrewBuilds98"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.secondaryAction}
                >
                  Follow Andrew on X
                  <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.7} />
                </a>
              </div>
            </div>
          </footer>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
