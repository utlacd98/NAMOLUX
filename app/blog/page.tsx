import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BlogFilter } from "@/components/blog"
import { getAllCategories, getPublicPosts, type BlogCategory, type BlogPost } from "@/lib/blog"
import { ArrowLeft, ArrowRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <section className="border-b border-border/30 px-4 pb-12 pt-28 sm:pb-16 sm:pt-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              The NamoLux Journal
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              Naming strategy, Founder Signal, domain due diligence, and brand launch guidance for founders making a decision they can defend.
            </p>
            <form action="/blog" className="mx-auto mt-8 flex max-w-xl gap-2">
              <label htmlFor="journal-search" className="sr-only">Search the Journal</label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="journal-search" name="q" defaultValue={query} placeholder="Search naming and domain guidance" className="min-h-12 w-full rounded-lg border border-border bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </div>
              <button className="min-h-12 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Search</button>
            </form>
          </div>
        </section>

        <section aria-labelledby="topic-hubs" className="border-b border-border/20 px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <h2 id="topic-hubs" className="mb-6 font-display text-2xl font-semibold">Browse by topic</h2>
            <div className="grid border border-border/60 sm:grid-cols-2 lg:grid-cols-4">
              {topicHubs.map((topic) => (
                <Link key={topic.id} href={`/blog?topic=${topic.id}`} className="min-h-44 border-b border-border/60 p-5 transition hover:bg-muted/40 sm:border-r lg:border-b-0">
                  <h3 className="font-semibold text-foreground">{topic.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{topic.description}</p>
                </Link>
              ))}
            </div>
            {(activeTopic || activeCategory || query) && (
              <div className="mt-5 flex items-center justify-between gap-4 text-sm text-muted-foreground">
                <span>{filteredPosts.length} article{filteredPosts.length === 1 ? "" : "s"} found</span>
                <Link href="/blog" className="text-primary underline underline-offset-4">Clear filters</Link>
              </div>
            )}
          </div>
        </section>

        {!activeTopic && !activeCategory && !query && page === 1 ? (
          <section aria-labelledby="essential-guides" className="border-b border-border/20 px-4 py-10">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 max-w-2xl">
                <h2 id="essential-guides" className="font-display text-2xl font-semibold">
                  Essential naming and domain guides
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Start with the decisions that most often delay a launch: legal naming layers, domain fit, search clarity and what to do when the business changes direction.
                </p>
              </div>
              <div className="grid border border-border/60 md:grid-cols-2">
                {essentialGuides.map((guide) => (
                  <Link
                    key={guide.href}
                    href={guide.href}
                    className="group border-b border-border/60 p-5 transition last:border-b-0 hover:bg-muted/40 md:odd:border-r"
                  >
                    <h3 className="font-semibold text-foreground transition group-hover:text-primary">
                      {guide.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{guide.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <BlogFilter
          posts={posts}
          categories={allCategories}
          activeCategory={activeCategory}
          activeTopic={activeTopic}
          query={query}
          featuredPost={page === 1 ? featuredPost : undefined}
        />

        {totalPages > 1 && (
          <nav aria-label="Journal pagination" className="mx-auto flex max-w-4xl items-center justify-between px-4 pb-16">
            {page > 1 ? <Link rel="prev" href={pageHref(page - 1)} className="inline-flex min-h-11 items-center gap-2 text-sm text-primary"><ArrowLeft className="h-4 w-4" /> Newer articles</Link> : <span />}
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            {page < totalPages ? <Link rel="next" href={pageHref(page + 1)} className="inline-flex min-h-11 items-center gap-2 text-sm text-primary">Older articles <ArrowRight className="h-4 w-4" /></Link> : <span />}
          </nav>
        )}

        <section className="border-t border-border/30 px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 text-2xl font-bold text-foreground">Ready to put the thinking to work?</h2>
            <p className="mb-6 text-muted-foreground">
              Bring your candidate names, check six domain extensions, and compare the strongest options in one view.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/bulk-domain-check">Check a shortlist <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
