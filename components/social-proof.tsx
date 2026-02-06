"use client"

import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { cn } from "@/lib/utils"

const stats = [
  { value: "10,000+", label: "Names generated" },
  { value: "1,200+", label: "Shortlists created" },
  { value: "<3s", label: "To verify domains" },
]

const fictionalLogos = [
  "Northstar Studio",
  "Velvet Works",
  "Nova & Co",
  "Aurum Labs",
  "Kairo Systems",
  "Ember Creative",
  "Apex Ventures",
  "Lunar Digital",
]

export function SocialProof() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section className="overflow-clip border-y border-border/30 bg-muted/20 py-12 sm:py-20" aria-label="Social proof">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className={cn("text-center opacity-0", isVisible && "animate-fade-up")}
          style={{ animationFillMode: "forwards" }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">Loved by builders</p>

          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-y-4 sm:flex-nowrap">
            {stats.map((stat, index) => (
              <div key={stat.label} className="flex items-center">
                <div
                  className={cn("px-4 py-2 text-center opacity-0 sm:px-6 md:px-8 lg:px-12", isVisible && "animate-fade-up")}
                  style={{
                    animationDelay: `${0.1 + index * 0.1}s`,
                    animationFillMode: "forwards",
                  }}
                >
                  <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs font-medium text-muted-foreground sm:mt-2 sm:text-sm">{stat.label}</div>
                </div>
                {/* Divider line */}
                {index < stats.length - 1 && <div className="hidden h-10 w-px bg-border/50 sm:block sm:h-12" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 overflow-clip">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
            Trusted by teams at
          </p>
          <div className="relative w-full overflow-clip">
            <div className="animate-marquee flex w-max gap-8 sm:gap-16">
              {[...fictionalLogos, ...fictionalLogos].map((logo, index) => (
                <div
                  key={`${logo}-${index}`}
                  className="flex shrink-0 items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground/40 transition-colors hover:text-muted-foreground/60 sm:text-base"
                >
                  {/* Simple geometric icon placeholder */}
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted/50 sm:h-6 sm:w-6">
                    <div className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30 sm:h-3 sm:w-3" />
                  </div>
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
