import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BlogFilter } from "@/components/blog"
import { getAllPosts, getAllCategories } from "@/lib/blog"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Blog | Domain Strategy, SEO & Startup Insights | NamoLux",
  description:
    "Learn how to choose the right domain name, improve your SEO, and build a stronger brand. Expert insights for founders and builders.",
  openGraph: {
    title: "NamoLux Blog | Domain Strategy & SEO Insights",
    description:
      "Expert insights on domain names, SEO, and building brands that last. Free resources for founders.",
    type: "website",
    url: "https://www.namolux.com/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "NamoLux Blog | Domain Strategy & SEO Insights",
    description:
      "Expert insights on domain names, SEO, and building brands that last.",
  },
  alternates: {
    canonical: "/blog",
  },
}

export default function BlogPage() {
  const posts = getAllPosts()
  const categories = getAllCategories()
  const featuredPost = posts.find((p) => p.featured)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border/30 px-4 pt-28 pb-12 sm:pt-32 sm:pb-16">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Domain Strategy &amp; SEO Insights
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              Learn how to choose domain names that build brands, improve your
              SEO, and avoid costly mistakes. Written for founders who ship.
            </p>
          </div>
        </section>

        {/* Blog Filter with Posts */}
        <BlogFilter
          posts={posts}
          categories={categories}
          featuredPost={featuredPost}
        />

        {/* CTA Section */}
        <section className="border-t border-border/30 px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 text-2xl font-bold text-foreground">
              Ready to find your perfect domain?
            </h2>
            <p className="mb-6 text-muted-foreground">
              Generate brandable domain ideas with instant availability checks
              and Founder Signal™ scoring.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/generate">
                Try NamoLux Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}


