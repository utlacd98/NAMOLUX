import Link from "next/link"
import { Clock, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BlogPost } from "@/lib/blog"

interface BlogCardProps {
  post: BlogPost
  featured?: boolean
}

const categoryColors: Record<string, string> = {
  "Domain Strategy": "bg-primary/10 text-primary",
  "SEO Foundations": "bg-emerald-500/10 text-emerald-400",
  "Builder Insights": "bg-blue-500/10 text-blue-400",
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border border-border/40 bg-card/50 p-6 transition-all duration-300",
        "hover:border-border/60 hover:bg-card/80 hover:shadow-lg hover:shadow-black/10",
        featured && "md:col-span-2 md:flex-row md:gap-8"
      )}
    >
      <div className="flex flex-1 flex-col">
        {/* Category & Read Time */}
        <div className="mb-3 flex items-center gap-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              categoryColors[post.category] || "bg-muted text-muted-foreground"
            )}
          >
            {post.category}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {post.readTime} min read
          </span>
        </div>

        {/* Title */}
        <h2
          className={cn(
            "mb-2 font-bold tracking-tight text-foreground transition-colors group-hover:text-primary",
            featured ? "text-xl md:text-2xl" : "text-lg"
          )}
        >
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>

        {/* Description */}
        <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
          {post.description}
        </p>

        {/* Read More */}
        <div className="flex items-center gap-1 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
          Read article
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </article>
  )
}

