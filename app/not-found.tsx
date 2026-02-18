import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Home, Search } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"

const helpfulLinks = [
  { href: "/", label: "Back to homepage" },
  { href: "/generate", label: "Generate domain names" },
  { href: "/blog", label: "Read the blog" },
  { href: "/contact", label: "Contact support" },
]

export const metadata: Metadata = {
  title: "Page Not Found | NamoLux",
  description: "The page you requested could not be found.",
  robots: {
    index: false,
    follow: true,
  },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 pt-28 pb-16 sm:pt-32">
        <div className="w-full max-w-2xl rounded-2xl border border-border/50 bg-card/60 p-6 text-center shadow-sm sm:p-10">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">404</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Page not found</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            The page you tried to open does not exist, may have moved, or the URL may be incorrect.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/" className="gap-2">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/generate" className="gap-2">
                <Search className="h-4 w-4" />
                Find domains
              </Link>
            </Button>
          </div>

          <div className="mt-8 border-t border-border/50 pt-6 text-left">
            <p className="text-sm font-medium text-foreground">Helpful links</p>
            <ul className="mt-3 space-y-2">
              {helpfulLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
