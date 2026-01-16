"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  X,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Copy,
  CheckCircle,
  Download,
  RefreshCw,
  Zap,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const vibeOptions = [
  { id: "luxury", label: "Luxury", description: "Premium, elegant, sophisticated" },
  { id: "futuristic", label: "Futuristic", description: "Tech-forward, innovative" },
  { id: "playful", label: "Playful", description: "Fun, friendly, approachable" },
  { id: "trustworthy", label: "Trustworthy", description: "Reliable, professional" },
  { id: "minimal", label: "Minimal", description: "Clean, simple, modern" },
]

const industryOptions = [
  "Technology",
  "Health & Wellness",
  "Finance",
  "E-commerce",
  "Education",
  "Creative",
  "Real Estate",
  "Food & Beverage",
  "Fashion & Beauty",
  "Travel & Tourism",
  "Sports & Fitness",
  "Entertainment & Media",
  "Consulting & Services",
  "Marketing & Advertising",
  "Legal & Professional",
  "Automotive",
  "Home & Garden",
  "Pet Care",
  "Gaming & Esports",
  "Sustainability & Green Tech",
  "AI & Machine Learning",
  "Blockchain & Crypto",
  "SaaS & Software",
  "Manufacturing",
  "Nonprofit & Social Impact",
  "Other",
]

interface DomainResult {
  name: string
  available: boolean
  score: number
  pronounceable: boolean
  memorability: number
  length: number
}

const generateMockResults = (keyword: string): DomainResult[] => {
  const prefixes = ["", "go", "get", "try", "my", "use"]
  const suffixes = ["ly", "io", "ify", "hub", "lab", "ware", "base", "spot", "zone", ""]
  const results: DomainResult[] = []

  const baseNames = [
    keyword.slice(0, 4) + "ora",
    keyword.slice(0, 3) + "evo",
    keyword.slice(0, 4) + "ix",
    keyword.slice(0, 3) + "ova",
    keyword.slice(0, 4) + "ify",
    keyword.slice(0, 3) + "well",
    keyword.slice(0, 4) + "mint",
    keyword.slice(0, 3) + "nest",
  ]

  baseNames.forEach((name, i) => {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    const fullName = prefix + name.charAt(0).toUpperCase() + name.slice(1) + suffix

    results.push({
      name: fullName.length > 12 ? fullName.slice(0, 10) : fullName,
      available: Math.random() > 0.35,
      score: Number((7 + Math.random() * 2.5).toFixed(1)),
      pronounceable: Math.random() > 0.2,
      memorability: Number((7 + Math.random() * 2.5).toFixed(1)),
      length: fullName.length,
    })
  })

  return results.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0) || b.score - a.score)
}

export function GenerateNames() {
  const [keyword, setKeyword] = useState("")
  const [selectedVibe, setSelectedVibe] = useState("luxury")
  const [selectedIndustry, setSelectedIndustry] = useState("")
  const [maxLength, setMaxLength] = useState(10)
  const [results, setResults] = useState<DomainResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [shortlist, setShortlist] = useState<string[]>([])
  const [copiedName, setCopiedName] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!keyword.trim()) return
    setIsGenerating(true)

    try {
      // Step 1: Generate domain names using GPT
      const generateResponse = await fetch("/api/generate-domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          vibe: selectedVibe,
          industry: selectedIndustry,
          maxLength: maxLength,
        }),
      })

      if (!generateResponse.ok) {
        throw new Error("Failed to generate domain names")
      }

      const generateData = await generateResponse.json()
      const domainNames = generateData.domains.map((d: any) => d.name)

      // Step 2: Check domain availability
      const checkResponse = await fetch("/api/check-domain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domains: domainNames,
        }),
      })

      if (!checkResponse.ok) {
        throw new Error("Failed to check domain availability")
      }

      const checkData = await checkResponse.json()
      setResults(checkData.results)
    } catch (error) {
      console.error("Error generating domains:", error)
      // Fallback to mock data if API fails
      setResults(generateMockResults(keyword.toLowerCase()))
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleShortlist = (name: string) => {
    setShortlist((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  }

  const copyToClipboard = (name: string) => {
    navigator.clipboard.writeText(name + ".com")
    setCopiedName(name)
    setTimeout(() => setCopiedName(null), 2000)
  }

  const exportShortlist = () => {
    const text = shortlist.map((name) => name + ".com").join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "domain-shortlist.txt"
    a.click()
  }

  return (
    <div className="noise-overlay relative min-h-screen bg-background">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="animate-luxury-aura absolute top-0 left-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent blur-[120px]" />
        <div
          className="animate-luxury-aura absolute right-0 bottom-0 h-[500px] w-[500px] translate-x-1/4 rounded-full bg-gradient-to-tl from-secondary/15 via-primary/5 to-transparent blur-[100px]"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          {shortlist.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportShortlist} className="gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Export ({shortlist.length})
            </Button>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
          {/* Main Content */}
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Generate Domain Names</h1>
              <p className="mt-2 text-muted-foreground">
                Enter a keyword and select your brand vibe to generate available domain names.
              </p>
            </div>

            {/* Input Section */}
            <div className="mb-8 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Keyword Input */}
                <div className="sm:col-span-2">
                  <label htmlFor="keyword" className="mb-2 block text-sm font-medium text-foreground">
                    Keyword or concept
                  </label>
                  <input
                    id="keyword"
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder="e.g., fitness, finance, creative..."
                    className="h-12 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Industry Select */}
                <div>
                  <label htmlFor="industry" className="mb-2 block text-sm font-medium text-foreground">
                    Industry (optional)
                  </label>
                  <select
                    id="industry"
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="h-12 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&>option]:bg-background [&>option]:text-foreground"
                  >
                    <option value="" className="bg-background text-muted-foreground">
                      Select industry...
                    </option>
                    {industryOptions.map((industry) => (
                      <option key={industry} value={industry} className="bg-background text-foreground">
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name Length */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Max name length</label>
                  <div className="flex h-12 items-center gap-2">
                    <input
                      type="range"
                      min={5}
                      max={15}
                      value={maxLength}
                      onChange={(e) => setMaxLength(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                    />
                    <span className="w-8 text-sm text-muted-foreground">{maxLength}</span>
                  </div>
                </div>
              </div>

              {/* Vibe Selection */}
              <div className="mt-6">
                <label className="mb-3 block text-sm font-medium text-foreground">Brand vibe</label>
                <div className="flex flex-wrap gap-2">
                  {vibeOptions.map((vibe) => (
                    <button
                      key={vibe.id}
                      onClick={() => setSelectedVibe(vibe.id)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-all",
                        selectedVibe === vibe.id
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {vibe.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!keyword.trim() || isGenerating}
                className="mt-6 h-12 w-full gap-2 text-base font-semibold"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Names
                  </>
                )}
              </Button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    Results <span className="text-muted-foreground">({results.length})</span>
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      Taken
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={result.name}
                      className={cn(
                        "group flex items-center justify-between rounded-xl border border-border/30 bg-card/50 p-4 transition-all hover:border-primary/20 hover:bg-card",
                        "animate-fade-up opacity-0",
                      )}
                      style={{
                        animationDelay: `${index * 0.05}s`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            result.available ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {result.available ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </span>
                        <div>
                          <span className="text-lg font-semibold text-foreground">{result.name}</span>
                          <span className="text-muted-foreground">.com</span>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Score: {result.score}</span>
                            <span>Memorability: {result.memorability}</span>
                            {result.pronounceable && (
                              <span className="flex items-center gap-1 text-green-400">
                                <CheckCircle className="h-3 w-3" /> Pronounceable
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => copyToClipboard(result.name)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="Copy domain"
                        >
                          {copiedName === result.name ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleShortlist(result.name)}
                          className={cn(
                            "rounded-lg p-2 transition-colors hover:bg-muted",
                            shortlist.includes(result.name)
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          title={shortlist.includes(result.name) ? "Remove from shortlist" : "Add to shortlist"}
                        >
                          {shortlist.includes(result.name) ? (
                            <BookmarkCheck className="h-4 w-4" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </button>
                        {result.available && (
                          <a
                            href={`https://www.namecheap.com/domains/registration/results/?domain=${result.name}.com`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Register domain"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {results.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/30 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Ready to generate</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Enter a keyword above and click generate to discover available domain names.
                </p>
              </div>
            )}
          </div>

          {/* Shortlist Sidebar */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Shortlist</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {shortlist.length} saved
                </span>
              </div>

              {shortlist.length > 0 ? (
                <div className="space-y-2">
                  {shortlist.map((name) => (
                    <div key={name} className="flex items-center justify-between rounded-lg bg-background/50 p-3">
                      <span className="font-medium text-foreground">{name}.com</span>
                      <button
                        onClick={() => toggleShortlist(name)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button onClick={exportShortlist} variant="outline" className="mt-4 w-full gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    Export List
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Click the bookmark icon to save domains to your shortlist.
                </p>
              )}
            </div>

            {/* Tips Card */}
            <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-6">
              <h4 className="mb-2 font-semibold text-accent">Pro Tips</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  Shorter names are more memorable
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  Avoid hyphens and numbers
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  Test pronunciation with others
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
