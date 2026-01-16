"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Check, X, Sparkles, Coins, Send, User, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const chatResults = [
  { name: "Obsidian Studio", available: true },
  { name: "Velvet Digital", available: true },
  { name: "Noir Agency", available: false },
  { name: "Eclipse Works", available: true },
  { name: "Onyx Creative", available: false },
]

export function Hero() {
  const [shimmerComplete, setShimmerComplete] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    const shimmerTimer = setTimeout(() => setShimmerComplete(true), 2000)
    const resultsTimer = setTimeout(() => setShowResults(true), 800)
    return () => {
      clearTimeout(shimmerTimer)
      clearTimeout(resultsTimer)
    }
  }, [])

  return (
    <section
      className="noise-overlay relative min-h-screen overflow-hidden pt-28 pb-20 lg:pt-36"
      aria-labelledby="hero-heading"
    >
      {/* Background aurora effects */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="animate-luxury-aura absolute top-1/4 left-1/4 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary/25 via-secondary/15 to-transparent blur-[150px]" />
        <div
          className="animate-luxury-aura absolute top-1/2 right-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/4 rounded-full bg-gradient-to-bl from-secondary/20 via-primary/10 to-transparent blur-[120px]"
          style={{ animationDelay: "-5s" }}
        />
        <div
          className="animate-luxury-aura absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-t from-accent/10 via-transparent to-transparent blur-[100px]"
          style={{ animationDelay: "-10s" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column - Content */}
          <div className="flex flex-col items-start text-left">
            {/* Trust Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-muted-foreground">AI-powered domain discovery</span>
            </div>

            <h1
              id="hero-heading"
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl"
            >
              <span className="block text-balance">Chat your way to an</span>
              <span
                className={cn(
                  "mt-2 block bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent",
                  !shimmerComplete && "animate-shimmer",
                )}
              >
                available .com.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:text-xl">
              Brainstorm with AI, then instantly verify availability. Every suggestion gets checked in real time—no more
              falling in love with taken names.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="animate-breathing-glow group h-14 px-8 text-base font-semibold transition-transform hover:-translate-y-0.5"
              >
                <Link href="/generate">
                  <Sparkles className="mr-2 h-5 w-5 transition-transform group-hover:rotate-12" aria-hidden="true" />
                  Start brainstorming
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 border-border/50 bg-transparent px-8 text-base transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5"
              >
                <Link href="#pricing">
                  <Coins className="mr-2 h-4 w-4" aria-hidden="true" />
                  View pricing
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-6">
              {["Real-time checks", "Credit-based pricing", "No subscriptions"].map((bullet) => (
                <div key={bullet} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                  </div>
                  {bullet}
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary/80 to-secondary/80 text-xs font-medium text-white"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">1,000+</span> builders used this month
              </p>
            </div>
          </div>

          {/* Right Column - Chat Preview Mock */}
          <div className="relative lg:pl-8">
            {/* Glow behind card */}
            <div
              className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent blur-3xl"
              aria-hidden="true"
            />

            <div className="group overflow-hidden rounded-2xl border border-border/50 bg-card/90 shadow-2xl shadow-primary/10 backdrop-blur-md transition-all duration-500 hover:border-primary/30 hover:shadow-primary/20">
              <div className="border-b border-border/50 bg-muted/30 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500/80" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                      <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Chat Preview</span>
                  </div>
                  {/* Credits indicator */}
                  <div className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                    <Coins className="h-3 w-3" aria-hidden="true" />
                    Credits: 25
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-6">
                {/* User message */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted/50 px-4 py-3">
                    <p className="text-sm text-foreground">I want a dark luxury web agency name</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 rounded-2xl rounded-tl-sm border border-border/30 bg-background/50 px-4 py-3">
                    <p className="mb-3 text-sm text-muted-foreground">
                      Here are 5 dark luxury agency names with availability:
                    </p>
                    {/* Results list */}
                    <div className="space-y-2">
                      {chatResults.map((result, index) => (
                        <div
                          key={result.name}
                          className={cn(
                            "flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 transition-all",
                            "opacity-0",
                            showResults && "animate-fade-up",
                          )}
                          style={{
                            animationDelay: `${0.3 + index * 0.1}s`,
                            animationFillMode: "forwards",
                          }}
                        >
                          <span className="text-sm font-medium text-foreground">{result.name}</span>
                          <span
                            className={cn(
                              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                              result.available ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400/80",
                            )}
                          >
                            {result.available ? (
                              <>
                                <Check className="h-3 w-3" /> Available
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3" /> Taken
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input field mock */}
                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-3">
                  <input
                    type="text"
                    placeholder="Describe your brand..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    disabled
                    aria-label="Chat input"
                  />
                  <Button size="sm" className="h-8 w-8 rounded-lg p-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border-t border-border/50 bg-muted/20 px-6 py-3">
                <p className="text-center text-xs text-muted-foreground">
                  <Coins className="mr-1 inline-block h-3 w-3 text-accent" />1 credit = 1 availability check
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
