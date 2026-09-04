import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Breadcrumbs, generateBreadcrumbSchema, BlogCard, Callout, BlogTracker } from "@/components/blog"
import { Button } from "@/components/ui/button"
import { getPostBySlug, getPostReadTime, getPublicPosts, getRelatedPosts, isMonetizableBlogPost, isPublicBlogPost, isValidBlogSlug, type BlogPost } from "@/lib/blog"
import { planArticleAds } from "@/lib/article-ad-plan"
import { Clock, Calendar, ArrowRight, ArrowLeft, ArrowUpRight } from "lucide-react"
import { Fragment } from "react"
import { AdBanner } from "@/components/ad-banner"
import { ContextualMiniGenerator } from "@/components/contextual-mini-generator"
import { buildGeneratorHref } from "@/lib/generator-attribution"

interface BlogPostPageProps {
  params: Promise<{ slug?: string }>
}

// Every published article is generated at build time. Unknown paths (including
// /blog/null) must 404 before any fallback document can be rendered or cached.
export const dynamicParams = false

function contextualGeneratorFor(post: BlogPost) {
  const topic = post.primaryKeyword || post.title

  switch (post.category) {
    case "Domain Strategy":
      return {
        topic,
        heading: "Check a shortlist for this idea",
        defaultBrief: `I need to compare a credible, memorable shortlist for a startup related to ${topic}. The candidates should be easy to pronounce, work internationally, and suit a strong domain.`,
      }
    case "Tool Comparisons":
      return {
        topic,
        heading: "Test the same shortlist in NamoLux",
        defaultBrief: `I am naming a startup related to ${topic}. I want to compare distinctive, professional candidates for memorability, pronunciation, and domain fit.`,
      }
    case "SEO Foundations":
      return {
        topic,
        heading: "Create a name built for brand and search",
        defaultBrief: `I need a brandable business name related to ${topic}. It should be memorable, search-distinctive, easy to spell, and suitable for a clean domain.`,
      }
    default:
      return {
        topic,
        heading: "Turn this business concept into a shortlist",
        defaultBrief: `I am building a business related to ${topic}. I want a professional, scalable name that feels credible to customers and investors.`,
      }
  }
}

function findActivationIndexes(post: BlogPost, adIndexes: Set<number>) {
  const majorHeadings = post.content.flatMap((section, index) =>
    section.type === "heading" && section.level === 2 ? [index] : [],
  )
  const firstSectionEnd = majorHeadings[1] !== undefined
    ? majorHeadings[1] - 1
    : Math.min((majorHeadings[0] ?? 0) + 2, post.content.length - 1)
  const miniGeneratorIndex = adIndexes.has(firstSectionEnd)
    ? Math.min(firstSectionEnd + 1, post.content.length - 1)
    : firstSectionEnd
  const internalLinksIndex = majorHeadings[2] !== undefined
    ? majorHeadings[2] - 1
    : post.content.length - 1

  return { miniGeneratorIndex, internalLinksIndex }
}

// Only reviewed public Journal entries are routable. The larger working archive
// stays in source control while it is edited, but is not published as a crawlable
// noindex page. This keeps the live site focused on content we actively stand behind.
export async function generateStaticParams() {
  const posts = getPublicPosts().filter((post) => isValidBlogSlug(post.slug))
  return posts.map((post) => ({ slug: post.slug }))
}

// Generate metadata for each post
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isValidBlogSlug(slug)) notFound()
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const url = `https://www.namolux.com/blog/${post.slug}`
  const metaTitle = post.seoTitle || `${post.title} | NamoLux`
  const metaDescription = post.metaDescription || post.description
  const socialImage = post.heroImage || "/opengraph-image"

  return {
    title: metaTitle,
    description: metaDescription,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.seoTitle || post.title,
      description: metaDescription,
      type: "article",
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
      section: post.category,
      images: [{ url: socialImage, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle || post.title,
      description: metaDescription,
      images: [socialImage],
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    robots: isPublicBlogPost(post)
      ? { index: true, follow: true }
      : { index: false, follow: true, noarchive: true },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  if (!isValidBlogSlug(slug)) notFound()
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const relatedPosts = getRelatedPosts(slug, 2)
  const readTime = getPostReadTime(post)
  const adPlan = planArticleAds(post, isMonetizableBlogPost(post))
  const inlineAdsBySection = new Map(
    adPlan.inline.map((ad) => [ad.afterSectionIndex, ad.placement]),
  )
  const showBeforeRelatedAd = adPlan.beforeRelated && relatedPosts.length > 0
  const activation = contextualGeneratorFor(post)
  const { miniGeneratorIndex, internalLinksIndex } = findActivationIndexes(
    post,
    new Set(adPlan.inline.map((ad) => ad.afterSectionIndex)),
  )
  const articleUrl = `https://www.namolux.com/blog/${post.slug}`
  const breadcrumbItems = [
    { label: "Journal", href: "/blog" },
    { label: post.title },
  ]
  const articleCta = post.category === "Domain Strategy"
    ? { href: "/bulk-domain-check", label: "Check a shortlist", heading: "Bring your shortlist into one view.", body: "Compare domain states and the trade-offs behind each candidate." }
      : post.category === "Tool Comparisons"
        ? {
            href: buildGeneratorHref({ brief: activation.defaultBrief, source: "article", contentSlug: post.slug }),
            label: "Generate my shortlist",
            heading: "Test the same naming problem in NamoLux.",
            body: "Start with a tailored brief, generate candidates, then check domains and compare the strongest options.",
          }
        : { href: "/bulk-domain-check", label: "Check a shortlist", heading: "Bring the candidates into one view.", body: "Check domains and compare the strongest options together." }

  // Generate schema markup
  const isAndrewBarrett = post.author === "Andrew Barrett"
  const authorUrl = isAndrewBarrett
    ? "https://www.namolux.com/journal/andrew-barrett"
    : "https://www.namolux.com/about"
  const organizationSchema = {
    "@type": "Organization",
    "@id": "https://www.namolux.com/#organization",
    name: "NamoLux",
    url: "https://www.namolux.com",
    logo: {
      "@type": "ImageObject",
      url: "https://www.namolux.com/icon.png",
    },
    ...(isAndrewBarrett ? { founder: { "@id": "https://www.namolux.com/journal/andrew-barrett#person" } } : {}),
  }
  const authorSchema = isAndrewBarrett
    ? {
        "@type": "Person",
        "@id": "https://www.namolux.com/journal/andrew-barrett#person",
        name: "Andrew Barrett",
        url: authorUrl,
        sameAs: [
          "https://andrewbarrett.dev/",
          "https://www.linkedin.com/in/andrew-barrett-587a21390/",
          "https://x.com/AndrewBuilds98",
        ],
        jobTitle: "Founder and Developer",
        worksFor: { "@id": "https://www.namolux.com/#organization" },
        homeLocation: { "@type": "Place", name: "Rhyl, North Wales, United Kingdom" },
      }
    : {
        "@type": "Organization",
        name: post.author,
        url: authorUrl,
      }
  const articleNode = {
    "@type": "BlogPosting",
    "@id": `${articleUrl}#article`,
    url: articleUrl,
    headline: post.title,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    description: post.description,
    author: isAndrewBarrett ? { "@id": "https://www.namolux.com/journal/andrew-barrett#person" } : authorSchema,
    publisher: { "@id": "https://www.namolux.com/#organization" },
    image: [`https://www.namolux.com${post.heroImage || "/opengraph-image"}`],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    inLanguage: isAndrewBarrett ? "en-GB" : "en-US",
    ...(post.sources?.length ? { citation: post.sources.map((source) => source.url) } : {}),
  }
  const articleSchema = isAndrewBarrett
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": "https://www.namolux.com/#website",
            name: "NamoLux",
            url: "https://www.namolux.com/",
            publisher: { "@id": "https://www.namolux.com/#organization" },
          },
          organizationSchema,
          authorSchema,
          { ...articleNode, isPartOf: { "@id": "https://www.namolux.com/#website" } },
        ],
      }
    : { "@context": "https://schema.org", ...articleNode }

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems)
  const faqSchema = post.faqs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }
    : null

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Blog View Tracker */}
      <BlogTracker slug={post.slug} title={post.title} category={post.category} />

      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <main id="main-content" className="flex-1">
        <article className="px-4 pt-24 pb-16 sm:pt-28">
          <div className="mx-auto max-w-3xl">
            {/* Breadcrumbs */}
            <Breadcrumbs items={breadcrumbItems} />

            {/* Header */}
            <header className="mb-10">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {post.category}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {readTime} min read
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.5rem] leading-tight">
                {post.title}
              </h1>

              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                {post.description}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border/30 py-3 text-xs text-muted-foreground">
                <span>{post.sources?.length ? `${post.sources.length} primary or authoritative sources` : "NamoLux editorial guide"}</span>
                <span aria-hidden="true">·</span>
                <Link href="/editorial-standards" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary">
                  How we prepare our guides
                </Link>
              </div>
            </header>
          </div>

          <div className="relative mx-auto max-w-3xl">
            {/* Content column */}
            <div className="prose prose-invert prose-lg max-w-none">
              {post.content.map((section, index) => {
                const placement = inlineAdsBySection.get(index)
                return (
                  <Fragment key={`${section.type}-${index}`}>
                    <BlogSection section={section} />
                    {placement ? (
                      <AdBanner placement={placement} className="not-prose my-10" />
                    ) : null}
                    {index === miniGeneratorIndex ? (
                      <ContextualMiniGenerator
                        source="article"
                        contentSlug={post.slug}
                        topic={activation.topic}
                        defaultBrief={activation.defaultBrief}
                        heading={activation.heading}
                        ctaId={`article-${post.slug}`}
                      />
                    ) : null}
                    {index === internalLinksIndex && relatedPosts.length > 0 ? (
                      <aside aria-label="Continue exploring" className="not-prose my-10 border-y border-border/40 py-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Continue exploring
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {relatedPosts.slice(0, 2).map((relatedPost) => (
                            <Link
                              key={`context-${relatedPost.slug}`}
                              href={`/blog/${relatedPost.slug}`}
                              className="group inline-flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted/40 hover:text-primary"
                            >
                              <span>{relatedPost.title}</span>
                              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          ))}
                        </div>
                      </aside>
                    ) : null}
                  </Fragment>
                )
              })}
            </div>

            {adPlan.sidebar ? (
              <div className="absolute inset-y-0 left-full ml-12 hidden w-[18.75rem] 2xl:block">
                <div className="sticky top-28">
                  <AdBanner
                    placement="article-sidebar"
                    className="min-h-[600px] w-full"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mx-auto max-w-3xl">

            {/* Author & Share */}
            <footer className="mt-12 border-t border-border/30 pt-8">
              <p className="text-sm text-muted-foreground">
                Written by{" "}
                <Link
                  href={post.author === "Andrew Barrett" ? "/journal/andrew-barrett" : "/about"}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {post.author}
                </Link>
              </p>
              <a
                href="https://x.com/AndrewBuilds98"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary"
              >
                Follow Andrew on X
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
              {post.updatedAt && post.updatedAt !== post.publishedAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last reviewed {new Date(post.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                NamoLux separates editorial guidance from product claims and advertising. Read our{" "}
                <Link href="/editorial-standards" className="text-foreground underline underline-offset-2 hover:text-primary">
                  editorial standards and corrections process
                </Link>.
              </p>
            </footer>

            {post.faqs?.length ? (
              <section className="mt-16">
                <h2 className="mb-6 text-xl font-bold text-foreground">Frequently Asked Questions</h2>
                <div className="space-y-6">
                  {post.faqs.map((faq) => (
                    <div key={faq.question}>
                      <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {post.sources?.length ? (
              <section className="mt-12 border-t border-border/30 pt-8" aria-labelledby="article-sources">
                <h2 id="article-sources" className="mb-4 text-lg font-bold text-foreground">Sources and further reading</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {post.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                        {source.title}
                      </a>
                      {source.authority ? <span> — {source.authority}</span> : null}
                      {source.lastVerified ? <span className="text-xs"> (verified {source.lastVerified})</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {showBeforeRelatedAd ? (
              <AdBanner placement="article-before-related" className="mt-16" />
            ) : null}

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <section className={showBeforeRelatedAd ? "mt-12" : "mt-16"}>
                <h2 className="mb-6 text-xl font-bold text-foreground">Related Articles</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedPosts.map((relatedPost) => (
                    <BlogCard key={relatedPost.slug} post={relatedPost} />
                  ))}
                </div>
              </section>
            )}

            {/* CTA */}
            <section className="mt-16 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center">
              <h2 className="mb-2 text-xl font-bold text-foreground">
                {articleCta.heading}
              </h2>
              <p className="mb-6 text-muted-foreground">
                {articleCta.body}
              </p>
              <Button asChild className="gap-2">
                <Link href={articleCta.href}>
                  {articleCta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </section>

            {/* Back to Journal */}
            <div className="mt-12">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all articles
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}

// Blog Section Renderer
import type { BlogSection as BlogSectionType } from "@/lib/blog"

const DECISION_WORKSPACE_CTA = {
  content: "Bring your shortlist to NamoLux. Check six domain extensions, then use Founder Signal to compare the finalists on a consistent primary TLD.",
  href: "/bulk-domain-check",
  label: "Check your shortlist",
} as const

function isRetiredProductHref(href?: string) {
  if (!href) return false
  const pathname = href.split("?")[0]?.split("#")[0]?.replace(/\/+$/, "") || "/"
  return pathname === "/generate" || pathname.startsWith("/generate/") || pathname === "/preview-gen" || pathname === "/seo-audit"
}

function visibleProductHref(href: string) {
  return isRetiredProductHref(href) ? DECISION_WORKSPACE_CTA.href : href
}

function visibleProductLinkText(href: string, text: string) {
  return isRetiredProductHref(href) ? "Use Bulk Check" : text
}

function visibleBlogCta(section: BlogSectionType) {
  if (!isRetiredProductHref(section.ctaLink) && !isRetiredProductHref(section.ctaLink2)) return section

  return {
    ...section,
    content: DECISION_WORKSPACE_CTA.content,
    ctaLink: isRetiredProductHref(section.ctaLink) ? DECISION_WORKSPACE_CTA.href : section.ctaLink,
    ctaText: isRetiredProductHref(section.ctaLink) ? DECISION_WORKSPACE_CTA.label : section.ctaText,
    ctaLink2: isRetiredProductHref(section.ctaLink2) ? DECISION_WORKSPACE_CTA.href : section.ctaLink2,
    ctaText2: isRetiredProductHref(section.ctaLink2) ? DECISION_WORKSPACE_CTA.label : section.ctaText2,
  }
}

function BlogSection({ section }: { section: BlogSectionType }) {
  switch (section.type) {
    case "heading":
      if (section.level === 2) {
        return (
          <h2 className="mt-10 mb-4 text-2xl font-bold text-foreground">
            {section.content}
          </h2>
        )
      }
      return (
        <h3 className="mt-8 mb-3 text-xl font-semibold text-foreground">
          {section.content}
        </h3>
      )

    case "paragraph": {
      // Parse inline markdown links: [text](url)
      const parts = section.content.split(/(\[[^\]]+\]\([^)]+\))/g)
      const rendered = parts.map((part, i) => {
        const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (match) {
          const [, text, href] = match
          const isInternal = href.startsWith("/")
          return isInternal ? (
            <Link key={i} href={visibleProductHref(href)} className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
              {visibleProductLinkText(href, text)}
            </Link>
          ) : (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
              {text}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })
      return (
        <p className="mb-4 text-base leading-relaxed text-muted-foreground">
          {rendered}
        </p>
      )
    }

    case "list":
      return (
        <ul className="mb-6 ml-4 list-disc space-y-2 text-muted-foreground">
          {section.items?.map((item, i) => (
            <li key={i} className="text-base leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )

    case "table":
      if (!section.headers?.length || !section.rows?.length) return null
      return (
        <div className="my-6">
          <div className="space-y-3 md:hidden">
            {section.rows.map((row, rowIndex) => (
              <dl key={`${row[0]}-mobile-${rowIndex}`} className="border border-border/50 bg-muted/20 p-4">
                {row.map((cell, cellIndex) => (
                  <div key={`${row[0]}-mobile-${cellIndex}`} className="grid grid-cols-[minmax(7rem,0.7fr)_1fr] gap-3 border-b border-border/30 py-2 last:border-0">
                    <dt className="text-xs font-semibold text-foreground">{section.headers?.[cellIndex]}</dt>
                    <dd className="text-sm text-muted-foreground">{cell}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block" role="region" aria-label="Article comparison table" tabIndex={0}>
          <table className="min-w-full border-collapse text-left text-sm">
            <caption className="sr-only">Comparison data for this section</caption>
            <thead>
              <tr className="border-b border-border/60">
                {section.headers.map((header) => (
                  <th key={header} scope="col" className="px-3 py-2 font-semibold text-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, rowIndex) => (
                <tr key={`${row[0]}-${rowIndex}`} className="border-b border-border/30 align-top">
                  {row.map((cell, cellIndex) => cellIndex === 0 ? (
                    <th key={`${row[0]}-${cellIndex}`} scope="row" className="px-3 py-2 font-medium text-foreground">{cell}</th>
                  ) : (
                    <td key={`${row[0]}-${cellIndex}`} className="px-3 py-2 text-muted-foreground">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )

    case "buttonCta":
      if (!section.ctaLink || !section.ctaText) return null
      {
        const cta = visibleBlogCta(section)
      return (
        <div className="my-8">
          {cta.content ? (
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{cta.content}</p>
          ) : null}
          <Button asChild className="gap-2">
            <Link href={cta.ctaLink!}>
              {cta.ctaText}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )
      }

    case "dualCta": {
      const cta = visibleBlogCta(section)
      return (
        <div className="my-8 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 text-center">
          {cta.content ? (
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{cta.content}</p>
          ) : null}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {cta.ctaLink && cta.ctaText && (
              <Button asChild className="gap-2">
                <Link href={cta.ctaLink}>
                  {cta.ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {cta.ctaLink2 && cta.ctaText2 && (
              <Button asChild variant="outline" className="gap-2">
                <Link href={cta.ctaLink2}>
                  {cta.ctaText2}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )
    }

    case "callout": {
      const cta = visibleBlogCta(section)
      return (
        <Callout
          type={cta.calloutType || "tip"}
          ctaLink={cta.ctaLink}
          ctaText={cta.ctaText}
        >
          {cta.content}
        </Callout>
      )
    }

    case "links":
      if (!section.links?.length) return null
      return (
        <div className="my-8 rounded-lg border border-border/40 bg-muted/20 p-5">
          {section.content && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {section.content || "Further Reading"}
            </p>
          )}
          <ul className="space-y-2">
            {section.links.map((link) => (
              <li key={link.href} className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <Link href={visibleProductHref(link.href)} className="text-sm text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline">
                  {visibleProductLinkText(link.href, link.text)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )

    case "quote":
      return (
        <blockquote className="my-6 border-l-4 border-primary/50 pl-4 italic text-muted-foreground">
          {section.content}
        </blockquote>
      )

    case "code":
      return (
        <pre className="my-6 overflow-x-auto rounded-lg bg-muted/50 p-4 text-sm">
          <code>{section.content}</code>
        </pre>
      )

    case "image":
      if (!section.src) return null
      return (
        <figure className="my-8">
          <div className="overflow-hidden rounded-2xl border border-border/30">
            <Image
              src={section.src}
              alt={section.alt || section.caption || ""}
              width={800}
              height={500}
              className="w-full object-cover"
            />
          </div>
          {section.caption && (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              {section.caption}
            </figcaption>
          )}
        </figure>
      )

    default:
      return null
  }
}
