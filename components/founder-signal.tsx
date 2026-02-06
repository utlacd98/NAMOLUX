"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import { cn } from "@/lib/utils"

// Common dictionary words (exact match penalty)
const DICTIONARY_WORDS = [
  "cloud", "tech", "data", "code", "sync", "flow", "link", "node", "core", "wave",
  "spark", "pulse", "shift", "stack", "swift", "smart", "prime", "pixel", "logic"
]

// Very common industry keywords
const INDUSTRY_KEYWORDS = [
  "app", "hub", "lab", "base", "zone", "spot", "nest", "dock", "port", "desk",
  "box", "kit", "pad", "tap", "bot", "api", "crm", "saas", "ai", "ml"
]

// Known brand patterns to avoid similarity
const KNOWN_BRANDS = [
  "stripe", "slack", "notion", "figma", "linear", "vercel", "supabase", "prisma",
  "twilio", "sendgrid", "mailchimp", "hubspot", "zendesk", "asana", "trello"
]

// TLD strength weights (0-20 scale)
const TLD_STRENGTH: Record<string, number> = {
  com: 20,
  io: 16,
  ai: 15,
  app: 13,
  dev: 12,
  co: 11,
}

// Hard consonant clusters that hurt pronunciation
const HARD_CLUSTERS = ["xtr", "qz", "zx", "xz", "kx", "qk", "bz", "zb", "pz", "zp", "ckx", "xck"]

interface FounderSignalResult {
  score: number
  breakdown: {
    lengthScore: number
    pronounceScore: number
    memorabilityScore: number
    extensionScore: number
    characterScore: number
    brandRiskPenalty: number
  }
  insights: {
    type: "positive" | "warning" | "negative"
    text: string
  }[]
  brutalVerdict: string
}

// Calculate Founder Signal score with new formula
export function calculateFounderSignal(
  name: string,
  tld: string,
  pronounceable: boolean,
  memorability: number
): FounderSignalResult {
  const insights: FounderSignalResult["insights"] = []
  const lowerName = name.toLowerCase()
  const len = name.length

  // 1️⃣ Name Length Score (0-20)
  let lengthScore = 2
  if (len <= 5) lengthScore = 20
  else if (len <= 7) lengthScore = 18
  else if (len <= 9) lengthScore = 15
  else if (len <= 11) lengthScore = 10
  else if (len <= 13) lengthScore = 6

  if (lengthScore >= 18) {
    insights.push({ type: "positive", text: "Short & brandable" })
  } else if (lengthScore >= 15) {
    insights.push({ type: "positive", text: "Good brand length" })
  } else if (lengthScore <= 10) {
    insights.push({ type: "warning", text: "Name is getting long" })
  }

  // 2️⃣ Pronounceability Score (0-15)
  // Convert boolean to 0-10 scale, then multiply by 1.5
  const pronounceRaw = pronounceable ? 10 : 4
  const pronounceScore = Math.min(15, pronounceRaw * 1.5)

  if (pronounceable) {
    insights.push({ type: "positive", text: "Easy to pronounce" })
  } else {
    insights.push({ type: "warning", text: "May be hard to say aloud" })
  }

  // 3️⃣ Memorability Score (0-15)
  const memorabilityScore = Math.min(15, memorability * 1.5)

  if (memorability >= 8) {
    insights.push({ type: "positive", text: "Highly memorable" })
  }

  // 4️⃣ Extension Strength Score (0-20)
  const extensionScore = TLD_STRENGTH[tld] || 8

  if (tld === "com") {
    insights.push({ type: "positive", text: "Premium extension (.com)" })
  } else if (extensionScore >= 15) {
    insights.push({ type: "positive", text: `Strong tech extension (.${tld})` })
  } else if (extensionScore <= 11) {
    insights.push({ type: "warning", text: `Weaker extension (.${tld})` })
  }

  // 5️⃣ Character Quality Score (0-15)
  let characterScore = 15

  if (name.includes("-")) {
    characterScore -= 5
    insights.push({ type: "warning", text: "Hyphens hurt word-of-mouth" })
  }
  if (/\d/.test(name)) {
    characterScore -= 5
    insights.push({ type: "warning", text: "Numbers cause confusion" })
  }
  if (/(.)\1/.test(lowerName)) {
    characterScore -= 3
    insights.push({ type: "warning", text: "Double letters can trip people up" })
  }
  if (HARD_CLUSTERS.some(cluster => lowerName.includes(cluster))) {
    characterScore -= 3
    insights.push({ type: "warning", text: "Hard consonant cluster" })
  }
  characterScore = Math.max(0, characterScore)

  if (characterScore === 15) {
    insights.push({ type: "positive", text: "Clean characters" })
  }

  // 6️⃣ Brand Risk Penalty (-15 to 0)
  let brandRiskPenalty = 0

  // Exact dictionary word: -8
  if (DICTIONARY_WORDS.includes(lowerName)) {
    brandRiskPenalty -= 8
    insights.push({ type: "negative", text: "Exact dictionary word — hard to own" })
  }

  // Very common industry keyword: -5
  if (INDUSTRY_KEYWORDS.some(kw => lowerName === kw || lowerName.startsWith(kw) || lowerName.endsWith(kw))) {
    brandRiskPenalty -= 5
    insights.push({ type: "negative", text: "Generic industry keyword" })
  }

  // Looks like plural/generic (ends in 's', 'ly', 'ify', 'er'): -4
  if (/s$|ly$|ify$|er$|tion$/.test(lowerName) && len > 5) {
    brandRiskPenalty -= 4
    insights.push({ type: "warning", text: "Looks like a generic/plural" })
  }

  // High similarity to known brand: -6
  const similarBrand = KNOWN_BRANDS.find(brand => {
    const similarity = lowerName.includes(brand.slice(0, 4)) || brand.includes(lowerName.slice(0, 4))
    return similarity && lowerName !== brand
  })
  if (similarBrand) {
    brandRiskPenalty -= 6
    insights.push({ type: "negative", text: `Similar to existing brand (${similarBrand})` })
  }

  // Looks like verb/tool only (ends in 'ify', 'ly', 'er'): -3
  if (/ify$|ize$/.test(lowerName)) {
    brandRiskPenalty -= 3
    insights.push({ type: "warning", text: "Sounds like a tool, not a brand" })
  }

  // Cap penalty at -15
  brandRiskPenalty = Math.max(-15, brandRiskPenalty)

  // 🧠 Final Formula
  const totalScore = Math.max(0, Math.min(100,
    lengthScore + pronounceScore + memorabilityScore + extensionScore + characterScore + brandRiskPenalty
  ))

  // Generate brutal verdict based on score
  let brutalVerdict = ""
  if (totalScore >= 80) {
    brutalVerdict = "Strong foundation for a lasting brand. Move fast."
  } else if (totalScore >= 65) {
    brutalVerdict = "Solid choice with minor trade-offs. Could work well."
  } else if (totalScore >= 50) {
    brutalVerdict = "This name works technically, but it's forgettable and competes with dozens of similar brands."
  } else if (totalScore >= 35) {
    brutalVerdict = "Weak long-term brandability. You'll fight for recognition."
  } else {
    brutalVerdict = "This name will hold you back. Consider alternatives."
  }

  return {
    score: Math.round(totalScore),
    breakdown: {
      lengthScore,
      pronounceScore,
      memorabilityScore,
      extensionScore,
      characterScore,
      brandRiskPenalty,
    },
    insights: insights.slice(0, 6),
    brutalVerdict,
  }
}

interface FounderSignalBadgeProps {
  name: string
  tld: string
  pronounceable: boolean
  memorability: number
}

export function FounderSignalBadge({ name, tld, pronounceable, memorability }: FounderSignalBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const signal = calculateFounderSignal(name, tld, pronounceable, memorability)

  // Color based on score
  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-400 bg-green-500/15 border-green-500/30"
    if (score >= 50) return "text-yellow-400 bg-yellow-500/15 border-yellow-500/30"
    return "text-orange-400 bg-orange-500/15 border-orange-500/30"
  }

  const scoreColor = getScoreColor(signal.score)

  return (
    <div className="mt-2">
      {/* Compact Badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all hover:opacity-80 sm:px-2.5 sm:py-1.5 sm:text-xs",
          scoreColor
        )}
      >
        <span className="font-semibold">Founder Signal™</span>
        <span className="font-bold">{signal.score}</span>
        <span className="opacity-60">/100</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 opacity-60" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-60" />
        )}
      </button>

      {/* Expanded Explanation */}
      {isExpanded && (
        <div className="mt-2 animate-fade-up rounded-lg border border-border/50 bg-background/80 p-3 text-xs sm:p-4">
          {/* Brutal Verdict */}
          <p className="mb-3 text-[11px] font-medium text-foreground/90 sm:text-xs">
            {signal.brutalVerdict}
          </p>

          <div className="space-y-1.5">
            {signal.insights.map((insight, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] sm:text-xs",
                  insight.type === "positive" && "text-green-400",
                  insight.type === "warning" && "text-yellow-400",
                  insight.type === "negative" && "text-red-400"
                )}
              >
                <span>
                  {insight.type === "positive" ? "✔" : insight.type === "negative" ? "✖" : "⚠"}
                </span>
                <span>{insight.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-1.5 border-t border-border/30 pt-2 text-[10px] text-muted-foreground sm:text-xs">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>Founder Signal™ estimates long-term brand strength. Not legal advice.</span>
          </div>
        </div>
      )}
    </div>
  )
}

