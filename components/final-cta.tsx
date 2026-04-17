import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function FinalCTA() {
  return (
    <section className="relative overflow-clip py-10 sm:py-16 lg:py-24" aria-labelledby="final-cta-heading">
      {/* Background Aura - contained within viewport */}
      <div className="pointer-events-none absolute inset-0 overflow-clip">
        <div
          className="animate-luxury-aura absolute top-1/2 left-1/2 h-[50vw] w-[50vw] max-h-[350px] max-w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary/10 via-secondary/8 to-transparent blur-3xl sm:max-h-[400px] sm:max-w-[400px]"
          aria-hidden="true"
        />
      </div>

      <div
        className={cn("relative mx-auto max-w-3xl px-4 text-center animate-fade-up sm:px-6 lg:px-8")}
        style={{ animationFillMode: "forwards" }}
      >
        <h2
          id="final-cta-heading"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          Make the name decision
          <br />
          <span className="text-primary">with evidence.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Paste your shortlist. Get Founder Signal™ scores, live availability across 6 TLDs, and a clear verdict on every candidate. Start free, no credit card required.
        </p>
        <div className="mt-10">
          <Button
            asChild
            size="lg"
            className="px-8 py-6 text-lg font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          >
            <Link href="/generate">
              <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
              Score my shortlist free
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
