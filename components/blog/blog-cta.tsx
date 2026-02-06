import Link from "next/link"
import { ArrowRight, Sparkles, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BlogCTAProps {
  variant?: "inline" | "box" | "banner"
  title?: string
  description?: string
  ctaText?: string
  ctaLink?: string
}

export function BlogCTA({
  variant = "box",
  title = "Ready to find your perfect domain?",
  description = "Generate brandable domain ideas with instant availability checks and Founder Signal™ scoring.",
  ctaText = "Try NamoLux Free",
  ctaLink = "/generate",
}: BlogCTAProps) {
  if (variant === "inline") {
    return (
      <Link
        href={ctaLink}
        className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
      >
        {ctaText}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    )
  }

  if (variant === "banner") {
    return (
      <div className="my-8 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button asChild className="shrink-0 gap-2">
            <Link href={ctaLink}>
              {ctaText}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Default: box variant
  return (
    <div className="my-8 rounded-xl border border-border/50 bg-muted/30 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Search className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="mb-3 text-sm text-muted-foreground">{description}</p>
          <Link
            href={ctaLink}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            {ctaText}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// Callout component for inline tips and warnings
interface CalloutProps {
  type: "tip" | "warning" | "cta"
  children: React.ReactNode
  ctaLink?: string
  ctaText?: string
}

export function Callout({ type, children, ctaLink, ctaText }: CalloutProps) {
  const styles = {
    tip: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    warning: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    cta: "border-primary/20 bg-primary/5 text-primary",
  }

  const icons = {
    tip: "💡",
    warning: "⚠️",
    cta: "✨",
  }

  return (
    <div className={cn("my-6 rounded-lg border p-4", styles[type])}>
      <div className="flex gap-3">
        <span className="text-lg">{icons[type]}</span>
        <div className="flex-1">
          <p className="text-sm text-foreground/90">{children}</p>
          {type === "cta" && ctaLink && ctaText && (
            <Link
              href={ctaLink}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
            >
              {ctaText}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

