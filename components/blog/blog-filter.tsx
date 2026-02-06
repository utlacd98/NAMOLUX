"use client"

import { useState } from "react"
import { BlogCard } from "./blog-card"
import type { BlogPost, BlogCategory } from "@/lib/blog"

interface BlogFilterProps {
  posts: BlogPost[]
  categories: BlogCategory[]
  featuredPost?: BlogPost
}

export function BlogFilter({ posts, categories, featuredPost }: BlogFilterProps) {
  const [activeCategory, setActiveCategory] = useState<BlogCategory | "all">("all")

  const filteredPosts = activeCategory === "all"
    ? posts
    : posts.filter((post) => post.category === activeCategory)

  const regularPosts = filteredPosts.filter((p) => p.slug !== featuredPost?.slug)
  const showFeatured = activeCategory === "all" && featuredPost

  return (
    <>
      {/* Category Filter */}
      <section className="border-b border-border/20 px-4 py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-primary/10 text-primary"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All Posts
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === category
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Post */}
      {showFeatured && (
        <section className="px-4 pt-10 sm:pt-12">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Featured
            </h2>
            <BlogCard post={featuredPost} featured />
          </div>
        </section>
      )}

      {/* All Posts Grid */}
      <section className="px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {activeCategory === "all" ? "All Articles" : activeCategory}
          </h2>
          {regularPosts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {regularPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No articles found in this category.
            </p>
          )}
        </div>
      </section>
    </>
  )
}

