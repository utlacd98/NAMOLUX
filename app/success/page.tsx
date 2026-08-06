import Link from "next/link"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CheckCircle, ListChecks, ArrowRight } from "lucide-react"
import { PUBLIC_PRODUCT_COPY } from "@/lib/site-content"

export const metadata = {
  title: "Access Confirmed | NamoLux",
  description: "Your NamoLux access is active. Check and score your shortlist now.",
}

export default function SuccessPage() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex items-center justify-center px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Access confirmed
            </h1>

            <p className="mt-4 text-lg text-muted-foreground">
              Your paid decision workspace is active. You can run Bulk Check and Founder Signal up to 120 times each per UTC calendar month.
            </p>

            <div className="mt-8 rounded-xl border border-border bg-card/50 p-6 text-left">
              <h2 className="mb-4 font-semibold text-foreground">What you can use:</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  ...PUBLIC_PRODUCT_COPY.proPlanFeatures.slice(0, 6),
                  "Six domain extensions (.com, .io, .co, .ai, .app, .dev)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="px-8">
                <Link href="/bulk-domain-check">
                  <ListChecks className="mr-2 h-5 w-5" />
                  Check a shortlist
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">
                  Back to home
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

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
