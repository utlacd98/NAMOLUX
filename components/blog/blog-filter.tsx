import Link from "next/link"
import { BlogCard } from "./blog-card"
import type { BlogPost, BlogCategory } from "@/lib/blog"
import styles from "./journal.module.css"

interface BlogFilterProps {
  posts: BlogPost[]
  categories: BlogCategory[]
  activeCategory?: BlogCategory
  activeTopic?: string
  query?: string
  featuredPost?: BlogPost
}

export function BlogFilter({ posts, categories, activeCategory, activeTopic, query, featuredPost }: BlogFilterProps) {
  const regularPosts = posts.filter((post) => post.slug !== featuredPost?.slug)
  const showFeatured = !activeCategory && featuredPost
  const categoryHref = (category?: BlogCategory) => {
    const params = new URLSearchParams()
    if (activeTopic) params.set("topic", activeTopic)
    if (query) params.set("q", query)
    if (category) params.set("category", category)
    const suffix = params.toString()
    return suffix ? `/blog?${suffix}` : "/blog"
  }

  return (
    <div className={styles.archive}>
      <section className={styles.categorySection}>
        <div className={styles.archiveInner}>
          <div className={styles.archiveHeader}>
            <div>
              <span className={styles.archiveLabel}>03 / Journal archive</span>
              <h2 className={styles.archiveHeading}>Latest thinking</h2>
            </div>
            <nav className={styles.categoryNav} aria-label="Filter articles by category">
              <Link
                href={categoryHref()}
                className={`${styles.categoryLink} ${!activeCategory ? styles.categoryLinkActive : ""}`}
                aria-current={!activeCategory ? "page" : undefined}
              >
                All articles
              </Link>
              {categories.map((category) => (
                <Link
                  key={category}
                  href={categoryHref(category)}
                  className={`${styles.categoryLink} ${activeCategory === category ? styles.categoryLinkActive : ""}`}
                  aria-current={activeCategory === category ? "page" : undefined}
                >
                  {category}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {showFeatured && (
        <section className={styles.featuredSection}>
          <div className={styles.archiveInner}>
            <h2 className={styles.featuredLabel}>Featured essay</h2>
            <BlogCard post={featuredPost} featured journal />
          </div>
        </section>
      )}

      <section className={styles.articlesSection}>
        <div className={styles.archiveInner}>
          <h2 className={styles.articleListTitle}>
            {activeCategory || (activeTopic ? "Selected topic" : query ? "Search results" : "All articles")}
          </h2>
          {regularPosts.length > 0 ? (
            <div className={styles.articleGrid}>
              {regularPosts.map((post) => (
                <BlogCard key={post.slug} post={post} journal />
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>
              No articles found for these filters.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
