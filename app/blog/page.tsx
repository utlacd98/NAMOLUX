import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BlogFilter } from "@/components/blog"
import { getAllCategories, getPublicPosts, type BlogCategory, type BlogPost } from "@/lib/blog"
import { ArrowLeft, ArrowRight, ArrowUpRight, Search } from "lucide-react"
import styles from "@/components/blog/journal.module.css"

export const metadata: Metadata = {
  title: "Journal | Naming Strategy & Domain Due Diligence | NamoLux",
  description:
    "Practical guidance on naming strategy, Founder Signal, domain due diligence, and launching a brand founders can stand behind.",
  openGraph: {
    title: "NamoLux Journal | Naming Strategy & Domain Due Diligence",
    description:
      "Considered guidance for founders choosing a name, checking domains, and preparing a brand for launch.",
    type: "website",
    url: "https://www.namolux.com/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "NamoLux Journal | Naming Strategy & Domain Due Diligence",
    description: "Naming strategy, Founder Signal, domain due diligence, and brand launch guidance.",
  },
  alternates: { canonical: "/blog" },
}

const PAGE_SIZE = 7
const topicHubs = [
  { id: "naming-strategy", label: "Naming Strategy", description: "Frameworks for producing and narrowing credible candidates." },
  { id: "founder-signal", label: "Founder Signal & Decision Science", description: "How to evaluate a shortlist without outsourcing judgment to a number." },
  { id: "domain-due-diligence", label: "Domain Due Diligence", description: "Availability, extensions, conflicts, and what still needs manual verification." },
  { id: "brand-launch", label: "Brand Launch", description: "Turn a chosen name into a clear, durable public identity." },
] as const

const essentialGuides = [
  {
    href: "/blog/business-name-vs-legal-company-name-vs-dba",
    title: "Business name vs legal company name vs DBA",
    description: "Understand which name belongs on contracts, registrations and customer-facing materials.",
  },
  {
    href: "/blog/best-domain-extensions-2026",
    title: "How to choose the right domain extension",
    description: "Compare .com, .io, .ai and .co without treating the extension as an afterthought.",
  },
  {
    href: "/blog/how-to-name-saas-product",
    title: "How to name a SaaS product",
    description: "Use a practical framework for clarity, memorability and room to grow.",
  },
  {
    href: "/blog/seo-friendly-startup-name",
    title: "Choose an SEO-friendly business name",
    description: "Balance brand distinctiveness with the way customers search and remember names.",
  },
  {
    href: "/blog/domain-name-after-pivot",
    title: "Domain strategy after a startup pivot",
    description: "Protect traffic, trust and brand continuity when the business changes direction.",
  },
] as const

type TopicId = (typeof topicHubs)[number]["id"]
type BlogPageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function matchesTopic(post: BlogPost, topic: TopicId) {
  const text = `${post.title} ${post.description}`.toLowerCase()
  if (topic === "founder-signal") return text.includes("founder signal") || text.includes("decision")
  if (topic === "domain-due-diligence") return post.category === "Domain Strategy" || text.includes("domain")
  if (topic === "brand-launch") return post.category === "Builder Insights" || text.includes("brand launch")
  return post.category === "Tool Comparisons" || post.category === "Builder Insights" || text.includes("naming")
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const requestedTopic = firstParam(params?.topic)
  const activeTopic = topicHubs.some((topic) => topic.id === requestedTopic) ? requestedTopic as TopicId : undefined
  const requestedCategory = firstParam(params?.category)
  const allCategories = getAllCategories()
  const activeCategory = allCategories.includes(requestedCategory as BlogCategory)
    ? requestedCategory as BlogCategory
    : undefined
  const query = (firstParam(params?.q) || "").trim()
  const allPosts = getPublicPosts()
  const filteredPosts = allPosts.filter((post) => {
    if (activeTopic && !matchesTopic(post, activeTopic)) return false
    if (activeCategory && post.category !== activeCategory) return false
    if (!query) return true
    const haystack = `${post.title} ${post.description} ${post.category}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })
  const featuredPost = !activeTopic && !activeCategory && !query
    ? allPosts.find((post) => post.featured)
    : undefined
  const orderedPosts = featuredPost
    ? [featuredPost, ...filteredPosts.filter((post) => post.slug !== featuredPost.slug)]
    : filteredPosts
  const totalPages = Math.max(1, Math.ceil(orderedPosts.length / PAGE_SIZE))
  const parsedPage = Number.parseInt(firstParam(params?.page) || "1", 10)
  const page = Math.min(totalPages, Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1))
  const posts = orderedPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageHref = (targetPage: number) => {
    const next = new URLSearchParams()
    if (activeTopic) next.set("topic", activeTopic)
    if (activeCategory) next.set("category", activeCategory)
    if (query) next.set("q", query)
    if (targetPage > 1) next.set("page", String(targetPage))
    const suffix = next.toString()
    return suffix ? `/blog?${suffix}` : "/blog"
  }

  return (
    <div className={styles.journalPage}>
      <Navbar />
      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <h1 className={styles.heroTitle}>
              The NamoLux <span>Journal</span>
            </h1>
            <div className={styles.heroSupport}>
              <p>
                Naming strategy, Founder Signal, domain due diligence, and brand launch guidance for founders making a decision they can defend.
              </p>
              <Link href="/editorial-standards">Editorial standards and corrections</Link>
            </div>
            <form action="/blog" className={styles.searchForm}>
              <label htmlFor="journal-search" className="sr-only">Search the Journal</label>
              <div className={styles.searchField}>
                <Search className={styles.searchIcon} aria-hidden="true" />
                <input id="journal-search" name="q" defaultValue={query} placeholder="Search naming and domain guidance" className={styles.searchInput} />
              </div>
              <button className={styles.searchButton}>Search</button>
            </form>
          </div>
        </section>

        <section aria-labelledby="topic-hubs" className={styles.topicsSection}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionIndex}>01 / Explore</span>
                <h2 id="topic-hubs">Browse by topic</h2>
              </div>
              <p>Move from generating possibilities to choosing a name with evidence and clear trade-offs.</p>
            </div>
            <nav className={styles.topicGrid} aria-label="Journal topics">
              {topicHubs.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/blog?topic=${topic.id}`}
                  className={`${styles.topicLink} ${activeTopic === topic.id ? styles.topicLinkActive : ""}`}
                  aria-current={activeTopic === topic.id ? "page" : undefined}
                >
                  <div>
                    <h3>{topic.label}</h3>
                    <p>{topic.description}</p>
                  </div>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            {(activeTopic || activeCategory || query) && (
              <div className={styles.filterStatus}>
                <span>{filteredPosts.length} article{filteredPosts.length === 1 ? "" : "s"} found</span>
                <Link href="/blog">Clear filters</Link>
              </div>
            )}
          </div>
        </section>

        <BlogFilter
          posts={posts}
          categories={allCategories}
          activeCategory={activeCategory}
          activeTopic={activeTopic}
          query={query}
          featuredPost={page === 1 ? featuredPost : undefined}
        />

        {totalPages > 1 && (
          <nav aria-label="Journal pagination" className={styles.pagination}>
            {page > 1 ? <Link rel="prev" href={pageHref(page - 1)} className={styles.paginationLink}><ArrowLeft /> Newer articles</Link> : <span />}
            <span className={styles.paginationStatus}>Page {page} of {totalPages}</span>
            {page < totalPages ? <Link rel="next" href={pageHref(page + 1)} className={styles.paginationLink}>Older articles <ArrowRight /></Link> : <span />}
          </nav>
        )}

        {!activeTopic && !activeCategory && !query && page === 1 ? (
          <section aria-labelledby="essential-guides" className={styles.guidesSection}>
            <div className={styles.sectionInner}>
              <div className={styles.guidesIntro}>
                <span className={styles.paperLabel}>04 / Start here</span>
                <h2 id="essential-guides">Essential guides</h2>
                <p>
                  Practical starting points for the naming and domain decisions that most often delay a launch.
                </p>
              </div>
              <div className={styles.guideList}>
                {essentialGuides.map((guide, index) => (
                  <Link key={guide.href} href={guide.href} className={styles.guideLink}>
                    <span className={styles.guideNumber}>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{guide.title}</h3>
                      <p>{guide.description}</p>
                    </div>
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className={styles.ctaSection}>
          <div className={styles.ctaInner}>
            <div>
              <h2>Put the thinking to work.</h2>
              <p>
                Bring your candidate names, check six domain extensions, and compare the strongest options in one view.
              </p>
            </div>
            <Link href="/bulk-domain-check" className={styles.ctaButton}>Check a shortlist <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
