"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { scoreName, type BrandVibe } from "@/lib/founderSignal/scoreName"

interface FounderSignalResult {
  score: number
  breakdown: {
    lengthScore: number
    pronounceScore: number
    memorabilityScore: number
    extensionScore: number
    characterScore: number
    brandRiskScore: number
    vibeModifier: number
  }
  rawScores: {
    length: number
    pronounceability: number
    memorability: number
    extension: number
    characterQuality: number
    brandRisk: number
  }
  insights: {
    type: "positive" | "warning" | "negative"
    text: string
  }[]
  brutalVerdict: string
}

// Calculate Founder Signal score using the centralized scoring function
export function calculateFounderSignal(
  name: string,
  tld: string,
  vibe?: BrandVibe
): FounderSignalResult {
  const result = scoreName({ name, tld, vibe })
  const insights: FounderSignalResult["insights"] = []

  // Generate insights based on raw scores
  const { rawScores } = result

  // Length insights
  if (rawScores.length >= 90) {
    insights.push({ type: "positive", text: "Short & brandable (≤6 chars)" })
  } else if (rawScores.length >= 60) {
    insights.push({ type: "positive", text: "Good brand length" })
  } else if (rawScores.length < 45) {
    insights.push({ type: "warning", text: "Name is getting long" })
  }

  // Pronounceability insights
  if (rawScores.pronounceability >= 80) {
    insights.push({ type: "positive", text: "Easy to pronounce" })
  } else if (rawScores.pronounceability < 50) {
    insights.push({ type: "negative", text: "Hard to pronounce" })
  } else if (rawScores.pronounceability < 70) {
    insights.push({ type: "warning", text: "May be hard to say aloud" })
  }

  // Memorability insights
  if (rawScores.memorability >= 80) {
    insights.push({ type: "positive", text: "Highly memorable" })
  } else if (rawScores.memorability < 50) {
    insights.push({ type: "negative", text: "Low memorability — generic patterns" })
  }

  // Extension insights
  if (rawScores.extension >= 100) {
    insights.push({ type: "positive", text: "Premium extension (.com)" })
  } else if (rawScores.extension >= 75) {
    insights.push({ type: "positive", text: `Strong tech extension (.${tld})` })
  } else if (rawScores.extension < 55) {
    insights.push({ type: "warning", text: `Weaker extension (.${tld})` })
  }

  // Character quality insights
  if (rawScores.characterQuality < 70) {
    if (name.includes("-")) {
      insights.push({ type: "warning", text: "Hyphens hurt word-of-mouth" })
    }
    if (/\d/.test(name)) {
      insights.push({ type: "warning", text: "Numbers cause confusion" })
    }
  } else if (rawScores.characterQuality >= 95) {
    insights.push({ type: "positive", text: "Clean characters" })
  }

  // Brand risk insights
  if (rawScores.brandRisk < 50) {
    insights.push({ type: "negative", text: "High brand risk — generic/conflict patterns" })
  } else if (rawScores.brandRisk < 70) {
    insights.push({ type: "warning", text: "Some brand risk concerns" })
  } else if (rawScores.brandRisk >= 90) {
    insights.push({ type: "positive", text: "Low brand risk — unique positioning" })
  }

  // Vibe modifier insight
  if (result.breakdown.vibeModifier > 0) {
    insights.push({ type: "positive", text: `Matches ${vibe} vibe (+${result.breakdown.vibeModifier})` })
  } else if (result.breakdown.vibeModifier < 0) {
    insights.push({ type: "warning", text: `Clashes with ${vibe} vibe (${result.breakdown.vibeModifier})` })
  }

  // Generate brutal verdict based on score
  let brutalVerdict = ""
  if (result.score >= 90) {
    brutalVerdict = "Elite brand potential. This name can scale globally. Move fast."
  } else if (result.score >= 80) {
    brutalVerdict = "Strong foundation for a lasting brand. Minor optimizations possible."
  } else if (result.score >= 65) {
    brutalVerdict = "Solid choice with trade-offs. Could work well in the right niche."
  } else if (result.score >= 50) {
    brutalVerdict = "Forgettable and competes with dozens of similar brands. Consider alternatives."
  } else if (result.score >= 35) {
    brutalVerdict = "Weak long-term brandability. You'll fight for recognition."
  } else {
    brutalVerdict = "This name will hold you back. Generic patterns, brand conflicts, or unpronounceable. Start over."
  }

  return {
    score: result.score,
    breakdown: result.breakdown,
    rawScores: result.rawScores,
    insights: insights.slice(0, 6),
    brutalVerdict,
  }
}

interface FounderSignalBadgeProps {
  name: string
  tld: string
  vibe?: BrandVibe
  /** @deprecated - no longer used, scoring calculates internally */
  pronounceable?: boolean
  /** @deprecated - no longer used, scoring calculates internally */
  memorability?: number
}

export function FounderSignalBadge({ name, tld, vibe }: FounderSignalBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const signal = calculateFounderSignal(name, tld, vibe)

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

