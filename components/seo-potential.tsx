"use client"

import { useState } from "react"
import { X, Search, TrendingUp, Fingerprint, Target, Layout, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface SeoPotentialResult {
  score: number
  breakdown: {
    keywordCompetition: number
    brandUniqueness: number
    searchIntentClarity: number
    domainStructure: number
  }
  signals: {
    type: "positive" | "warning" | "neutral"
    text: string
    icon: string
  }[]
  recommendation: string
}

interface SeoPotentialCheckProps {
  domainName: string
  tld: string
  industry?: string
  onClose: () => void
}

// Inline score calculator (same logic as API, no network call needed)
function calculateSeoPotentialInline(domainName: string, tld: string, industry: string): SeoPotentialResult {
  const lowerName = domainName.toLowerCase()
  const signals: SeoPotentialResult["signals"] = []
  
  const HIGH_COMPETITION = ["app", "software", "tech", "cloud", "digital", "online", "web", "smart", "pro", "shop", "store", "buy", "health", "fit", "learn", "home"]
  const NICHE_PATTERNS = [/^[a-z]{2,4}ly$/i, /^[a-z]{3,5}ify$/i, /^[a-z]{2,4}io$/i, /^[a-z]{4,8}hub$/i, /^[a-z]{4,8}lab$/i]
  const TLD_WEIGHT: Record<string, number> = { com: 25, io: 20, co: 18, ai: 19, app: 17, dev: 16 }

  // 1. Keyword Competition
  let keywordCompetition = 25
  const matchedHigh = HIGH_COMPETITION.filter(kw => lowerName.includes(kw))
  if (matchedHigh.length >= 2) { keywordCompetition -= 15; signals.push({ type: "warning", text: "High competition keywords", icon: "⚠️" }) }
  else if (matchedHigh.length === 1) { keywordCompetition -= 8; signals.push({ type: "neutral", text: "Contains common keyword", icon: "📊" }) }
  else { signals.push({ type: "positive", text: "Niche-friendly name", icon: "✅" }) }
  
  if (NICHE_PATTERNS.some(p => p.test(lowerName))) {
    keywordCompetition = Math.min(25, keywordCompetition + 5)
    signals.push({ type: "positive", text: "Strong SEO pattern", icon: "🔥" })
  }

  // 2. Brand Uniqueness
  let brandUniqueness = 25
  if (HIGH_COMPETITION.some(kw => lowerName === kw)) { brandUniqueness -= 10 }
  if (lowerName.length >= 5 && lowerName.length <= 10) {
    brandUniqueness = Math.min(25, brandUniqueness + 3)
    signals.push({ type: "positive", text: "Unique brand name", icon: "💎" })
  }

  // 3. Search Intent Clarity
  let searchIntentClarity = 18
  if (industry && lowerName.includes(industry.toLowerCase().slice(0, 4))) {
    searchIntentClarity = Math.min(25, searchIntentClarity + 5)
    signals.push({ type: "positive", text: "Clear product signal", icon: "🎯" })
  }
  if (/^(the|my|our|go|get|try)/i.test(lowerName)) {
    searchIntentClarity -= 5
    signals.push({ type: "warning", text: "Vague brand prefix", icon: "🌫️" })
  }

  // 4. Domain Structure
  let domainStructure = TLD_WEIGHT[tld] || 15
  if (domainName.length >= 4 && domainName.length <= 8) domainStructure = Math.min(25, domainStructure + 3)
  else if (domainName.length > 12) { domainStructure -= 5; signals.push({ type: "warning", text: "Name too long for SEO", icon: "📏" }) }
  if (/-/.test(domainName)) { domainStructure -= 4; signals.push({ type: "warning", text: "Hyphens hurt rankings", icon: "➖" }) }
  if (/\d/.test(domainName)) { domainStructure -= 3; signals.push({ type: "warning", text: "Numbers reduce trust", icon: "🔢" }) }

  const totalScore = Math.max(0, Math.min(100, keywordCompetition + brandUniqueness + searchIntentClarity + domainStructure))
  
  return {
    score: Math.round(totalScore),
    breakdown: {
      keywordCompetition: Math.max(0, Math.min(25, Math.round(keywordCompetition))),
      brandUniqueness: Math.max(0, Math.min(25, Math.round(brandUniqueness))),
      searchIntentClarity: Math.max(0, Math.min(25, Math.round(searchIntentClarity))),
      domainStructure: Math.max(0, Math.min(25, Math.round(domainStructure))),
    },
    signals: signals.slice(0, 4),
    recommendation: totalScore >= 75 ? "Strong SEO potential. This name has room to rank." 
      : totalScore >= 50 ? "Moderate SEO potential. Consider niche targeting." 
      : "SEO risk zone. This name may struggle to rank.",
  }
}

const BREAKDOWN_LABELS = [
  { key: "keywordCompetition", label: "Keyword Competition", icon: TrendingUp, tooltip: "Lower competition = easier to rank" },
  { key: "brandUniqueness", label: "Brand Uniqueness", icon: Fingerprint, tooltip: "Unique names stand out in search" },
  { key: "searchIntentClarity", label: "Search Intent", icon: Target, tooltip: "Clear intent = better SEO targeting" },
  { key: "domainStructure", label: "Domain Structure", icon: Layout, tooltip: "Length, TLD, readability" },
]

export function SeoPotentialCheck({ domainName, tld, industry = "", onClose }: SeoPotentialCheckProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const result = calculateSeoPotentialInline(domainName, tld, industry)

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-400"
    if (score >= 50) return "text-yellow-400"
    return "text-orange-400"
  }

  const getScoreBg = (score: number) => {
    if (score >= 75) return "from-green-500/20 to-green-500/5"
    if (score >= 50) return "from-yellow-500/20 to-yellow-500/5"
    return "from-orange-500/20 to-orange-500/5"
  }

  const getBarColor = (value: number) => {
    if (value >= 20) return "bg-green-500"
    if (value >= 15) return "bg-yellow-500"
    return "bg-orange-500"
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-4 shadow-2xl sm:p-6">
        {/* Close button */}
        <button onClick={onClose} className="absolute right-3 top-3 p-2 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">SEO Potential Check</h3>
        </div>

        {/* Domain */}
        <div className="mb-4 rounded-lg bg-muted/30 px-3 py-2 text-center">
          <span className="text-lg font-bold text-foreground">{domainName}</span>
          <span className="text-muted-foreground">.{tld}</span>
        </div>

        {/* Score Circle */}
        <div className="mb-4 flex justify-center">
          <div className={cn("flex h-24 w-24 flex-col items-center justify-center rounded-full bg-gradient-to-b", getScoreBg(result.score))}>
            <span className={cn("text-3xl font-bold", getScoreColor(result.score))}>{result.score}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Recommendation */}
        <p className="mb-4 text-center text-sm text-muted-foreground">{result.recommendation}</p>

        {/* Signals (Badges) */}
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {result.signals.map((signal, i) => (
            <span key={i} className={cn("rounded-full px-2.5 py-1 text-xs font-medium",
              signal.type === "positive" ? "bg-green-500/15 text-green-400" :
              signal.type === "warning" ? "bg-orange-500/15 text-orange-400" : "bg-muted text-muted-foreground"
            )}>
              {signal.icon} {signal.text}
            </span>
          ))}
        </div>

        {/* Breakdown Toggle */}
        <button onClick={() => setShowBreakdown(!showBreakdown)} className="flex w-full items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">
          <span>Score Breakdown</span>
          {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Breakdown Bars */}
        {showBreakdown && (
          <div className="mt-3 space-y-3">
            {BREAKDOWN_LABELS.map(({ key, label, icon: Icon }) => {
              const value = result.breakdown[key as keyof typeof result.breakdown]
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3 w-3" />{label}</span>
                    <span className="font-medium text-foreground">{value}/25</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                    <div className={cn("h-full rounded-full transition-all", getBarColor(value))} style={{ width: `${(value / 25) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer Note */}
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Founder Signal™ measures brand strength. SEO Potential measures search viability.
        </p>
      </div>
    </div>
  )
}

