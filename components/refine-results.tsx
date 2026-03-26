"use client"

import { Sparkles } from "lucide-react"

export type RefinementMode =
  | "more-brandable"
  | "more-literal"
  | "shorter"
  | "more-playful"
  | "more-com-likely"

interface RefinementOption {
  id: RefinementMode
  label: string
  icon: string
  desc: string
  color: string
}

const OPTIONS: RefinementOption[] = [
  {
    id: "more-brandable",
    label: "More Brandable",
    icon: "✨",
    desc: "Invented words, clean phonetics",
    color: "#D4AF37",
  },
  {
    id: "more-literal",
    label: "More Literal",
    icon: "🎯",
    desc: "Names that describe what you do",
    color: "#60a5fa",
  },
  {
    id: "shorter",
    label: "Shorter",
    icon: "⚡",
    desc: "4–7 character names only",
    color: "#34d399",
  },
  {
    id: "more-playful",
    label: "More Playful",
    icon: "🎉",
    desc: "Fun, warm, emotionally engaging",
    color: "#f472b6",
  },
  {
    id: "more-com-likely",
    label: ".com Likely",
    icon: "🎯",
    desc: "Rare phonetics, higher hit rate",
    color: "#a78bfa",
  },
]

interface RefineResultsProps {
  onRefine: (mode: RefinementMode) => void
  isRefining: boolean
  activeMode: RefinementMode | null
}

export function RefineResults({ onRefine, isRefining, activeMode }: RefineResultsProps) {
  return (
    <div
      className="mt-4 rounded-2xl p-4"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
          Refine Results
        </span>
        <span className="text-[10px] text-white/25">— regenerate with a different focus</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const isActive = activeMode === opt.id
          const isLoading = isRefining && isActive
          return (
            <button
              key={opt.id}
              onClick={() => !isRefining && onRefine(opt.id)}
              disabled={isRefining}
              title={opt.desc}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
              style={{
                background: isActive
                  ? `${opt.color}18`
                  : "rgba(255,255,255,0.04)",
                color: isActive ? opt.color : "rgba(255,255,255,0.5)",
                border: isActive
                  ? `1px solid ${opt.color}35`
                  : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span>{isLoading ? "⏳" : opt.icon}</span>
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Refinement → prompt modifier ─────────────────────────────────────────────

export interface RefinementOverrides {
  maxLength?: number
  vibe?: string
  extraInstruction?: string
}

export function getRefinementOverrides(mode: RefinementMode, currentMaxLength: number): RefinementOverrides {
  switch (mode) {
    case "more-brandable":
      return {
        extraInstruction: "THIS BATCH: Focus exclusively on invented CVCV/CVCCV words (Approach 4). Pure coined words only — no real English words, no compounds. Think Figma, Canva, Vercel, Zillow, Brex. All ≤7 characters.",
      }
    case "more-literal":
      return {
        extraInstruction: "THIS BATCH: Focus on compound words that clearly describe the product (Approach 3). Both parts must be common English words that together hint strongly at what the product does. Think Dropbox, Mailchimp, Basecamp, Webflow. No invented words.",
      }
    case "shorter":
      return {
        maxLength: Math.min(currentMaxLength, 7),
        extraInstruction: "THIS BATCH: All names must be 4–7 characters maximum. Short, punchy, memorable. Think Arc, Brex, Loom, Notion, Figma, Pitch, Plain.",
      }
    case "more-playful":
      return {
        vibe: "playful",
        extraInstruction: "THIS BATCH: Maximum playfulness. Pull from sensory vocabulary — textures, sounds, movement, warmth. Names should make someone smile. Think Mailchimp, Hootsuite, Popsy, ButterStack, FluffyFlip. Every name must have a clear sensory or emotional hook.",
      }
    case "more-com-likely":
      return {
        extraInstruction: "THIS BATCH: Optimise for .com availability. Avoid common English words (almost always taken), avoid popular suffixes (-ly, -ify, -hub, -io). Use uncommon phoneme combinations that still sound natural. Invented CVCV words with rare starting consonants have the highest hit rate. Think Brex, Figma, Vercel, Canva — invented but pronounceable.",
      }
  }
}
