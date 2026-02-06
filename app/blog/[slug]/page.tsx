import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Breadcrumbs, generateBreadcrumbSchema, BlogCard, Callout, BlogTracker } from "@/components/blog"
import { Button } from "@/components/ui/button"
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog"
import { Clock, Calendar, ArrowRight, ArrowLeft } from "lucide-react"

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

// Generate metadata for each post
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: "Post Not Found | NamoLux" }

  const url = `https://www.namolux.com/blog/${post.slug}`
  const metaTitle = post.seoTitle || `${post.title} | NamoLux`
  const metaDescription = post.metaDescription || post.description

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
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle || post.title,
      description: metaDescription,
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const relatedPosts = getRelatedPosts(slug, 2)
  const articleUrl = `https://www.namolux.com/blog/${post.slug}`
  const breadcrumbItems = [
    { label: "Blog", href: "/blog" },
    { label: post.title },
  ]

  // Generate schema markup
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${articleUrl}#article`,
    url: articleUrl,
    headline: post.title,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    description: post.description,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "NamoLux",
      url: "https://www.namolux.com",
      logo: {
        "@type": "ImageObject",
        url: "https://www.namolux.com/logo.png",
        width: 1200,
        height: 337,
      },
    },
    image: ["https://www.namolux.com/og-image.png"],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    inLanguage: "en-US",
  }

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

      <main className="flex-1">
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
                  {post.readTime} min read
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.5rem] leading-tight">
                {post.title}
              </h1>

              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                {post.description}
              </p>
            </header>

            {/* Content */}
            <div className="prose prose-invert prose-lg max-w-none">
              {post.content.map((section, index) => (
                <BlogSection key={index} section={section} />
              ))}
            </div>

            {/* Author & Share */}
            <footer className="mt-12 border-t border-border/30 pt-8">
              <p className="text-sm text-muted-foreground">
                Written by{" "}
                <a
                  href="https://www.facebook.com/profile.php?id=61553948283148"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  Andrew Barrett
                </a>
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

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <section className="mt-16">
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
                Ready to find your perfect domain?
              </h2>
              <p className="mb-6 text-muted-foreground">
                Generate brandable names with Founder Signal™ scoring.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button asChild className="gap-2">
                  <Link href="/generate">
                    Generate Names Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/seo-audit">
                    Run SEO Audit
                  </Link>
                </Button>
              </div>
            </section>

            {/* Back to Blog */}
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

    case "paragraph":
      return (
        <p className="mb-4 text-base leading-relaxed text-muted-foreground">
          {section.content}
        </p>
      )

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
        <div className="my-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/60">
                {section.headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-semibold text-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, rowIndex) => (
                <tr key={`${row[0]}-${rowIndex}`} className="border-b border-border/30 align-top">
                  {row.map((cell, cellIndex) => (
                    <td key={`${row[0]}-${cellIndex}`} className="px-3 py-2 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case "buttonCta":
      if (!section.ctaLink || !section.ctaText) return null
      return (
        <div className="my-8">
          {section.content ? (
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{section.content}</p>
          ) : null}
          <Button asChild className="gap-2">
            <Link href={section.ctaLink}>
              {section.ctaText}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )

    case "callout":
      return (
        <Callout
          type={section.calloutType || "tip"}
          ctaLink={section.ctaLink}
          ctaText={section.ctaText}
        >
          {section.content}
        </Callout>
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

    default:
      return null
  }
}


