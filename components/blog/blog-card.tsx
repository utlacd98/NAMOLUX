import Link from "next/link"
import Image from "next/image"
import { Clock, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { isValidBlogSlug, type BlogPost } from "@/lib/blog"
import styles from "./journal.module.css"

interface BlogCardProps {
  post: BlogPost
  featured?: boolean
  journal?: boolean
}

const categoryColors: Record<string, string> = {
  "Domain Strategy": "bg-primary/10 text-primary",
  "SEO Foundations": "bg-emerald-500/10 text-emerald-400",
  "Builder Insights": "bg-blue-500/10 text-blue-400",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`))
}

export function BlogCard({ post, featured = false, journal = false }: BlogCardProps) {
  const href = isValidBlogSlug(post.slug) ? `/blog/${post.slug}` : null

  if (!journal) {
    return (
      <article
        className={cn(
          "group relative flex flex-col rounded-xl border border-border/40 bg-card/50 p-6 transition-all duration-300",
          "hover:border-border/60 hover:bg-card/80 hover:shadow-lg hover:shadow-black/10",
          featured && "md:col-span-2 md:flex-row md:gap-8"
        )}
      >
        <div className="flex flex-1 flex-col">
          <div className="mb-3 flex items-center gap-3">
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", categoryColors[post.category] || "bg-muted text-muted-foreground")}>{post.category}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{post.readTime} min read</span>
          </div>
          <h2 className={cn("mb-2 font-bold tracking-tight text-foreground transition-colors group-hover:text-primary", featured ? "text-xl md:text-2xl" : "text-lg")}>
            {href ? <Link href={href} className="after:absolute after:inset-0">{post.title}</Link> : post.title}
          </h2>
          <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">{post.description}</p>
          <div className="flex items-center gap-1 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
            Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </article>
    )
  }

  if (featured) {
    return (
      <article className={`${styles.articleCard} ${styles.featuredCard}`}>
        <div className={styles.featuredVisual}>
          <Image
            src="/social/namolux-scorecard-square.png"
            alt="NamoLux shortlist scorecard with domain evidence"
            fill
            sizes="(max-width: 640px) calc(100vw - 74px), 390px"
          />
        </div>
        <div className={styles.featuredBody}>
          <div className={styles.cardMeta}>
            <span className={styles.cardCategory}>{post.category}</span>
            <span className={styles.cardReadTime}><Clock aria-hidden="true" />{post.readTime} min read</span>
            <time className={styles.cardDate} dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          </div>
          <h2 className={styles.cardTitle}>
            {href ? <Link href={href} className={styles.cardLink}>{post.title}</Link> : post.title}
          </h2>
          <p className={styles.cardDescription}>{post.description}</p>
          <div className={styles.readLink} aria-hidden="true">Read the full story <ArrowRight /></div>
        </div>
      </article>
    )
  }

  return (
    <article className={styles.articleCard}>
      <h2 className={styles.cardTitle}>
        {href ? <Link href={href} className={styles.cardLink}>{post.title}</Link> : post.title}
      </h2>
      <span className={styles.cardCategory}>{post.category}</span>
      <span className={styles.rowMeta}>
        <time className={styles.cardDate} dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        <span className={styles.cardReadTime}>{post.readTime} min</span>
      </span>
      <ArrowRight className={styles.rowArrow} aria-hidden="true" />
    </article>
  )
}
