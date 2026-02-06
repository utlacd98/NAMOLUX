import Link from "next/link"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Welcome to NamoLux Pro! | NamoLux",
  description: "Your subscription is active. Start generating domain names now.",
}

export default function SuccessPage() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex items-center justify-center px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-lg text-center">
            {/* Success Icon */}
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Welcome to NamoLux Pro!
            </h1>

            {/* Message */}
            <p className="mt-4 text-lg text-muted-foreground">
              Your subscription is now active. You have unlimited access to all features.
            </p>

            {/* What's included */}
            <div className="mt-8 rounded-xl border border-border bg-card/50 p-6 text-left">
              <h2 className="font-semibold text-foreground mb-4">What you get:</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  Unlimited domain generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  Founder Signal™ scoring
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  SEO Potential analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  All TLDs (.com, .io, .ai, .co, .app, .dev)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  Social handle checking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  Export to CSV
                </li>
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="px-8">
                <Link href="/generate">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start generating
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">
                  Back to home
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Support note */}
            <p className="mt-8 text-sm text-muted-foreground">
              Questions? Contact us at{" "}
              <a href="mailto:hello@namolux.com" className="text-primary hover:underline">
                hello@namolux.com
              </a>
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}

