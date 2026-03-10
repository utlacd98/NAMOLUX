"use client"

import { useState } from "react"
import { RefreshCw, X, Plus, Sparkles, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const vibeOptions = [
  { id: "luxury", label: "Luxury" },
  { id: "futuristic", label: "Futuristic" },
  { id: "playful", label: "Playful" },
  { id: "trustworthy", label: "Trustworthy" },
  { id: "minimal", label: "Minimal" },
]

const industryOptions = [
  "SaaS & Software", "E-Commerce", "Fintech & Finance", "Health & Wellness",
  "AI & Machine Learning", "Marketing & Advertising", "Education & EdTech",
  "Real Estate & PropTech", "Food & Beverage", "Logistics & Supply Chain",
  "Cybersecurity", "Media & Entertainment", "Developer Tools",
  "Technology", "Finance", "Education", "Creative", "Fashion & Beauty",
  "Travel & Tourism", "Sports & Fitness", "Entertainment & Media",
  "Consulting & Services", "Legal & Professional", "Automotive",
  "Home & Garden", "Pet Care", "Gaming & Esports", "Sustainability & Green Tech",
  "Blockchain & Crypto", "Manufacturing", "Nonprofit & Social Impact", "Other",
]

interface Analysis {
  summary: string
  keywords: string[]
  industry: string
  brandVibe: string
  maxLength: number
  vibeReasoning: string
}

interface StartupDescriptionProps {
  onGenerate: (params: { keyword: string; industry: string; vibe: string; maxLength: number }) => void
  onDeepSearch: (params: { keyword: string; industry: string; vibe: string; maxLength: number }) => void
  isGenerating: boolean
}

export function StartupDescription({ onGenerate, onDeepSearch, isGenerating }: StartupDescriptionProps) {
  const [description, setDescription] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Editable state derived from analysis
  const [keywords, setKeywords] = useState<string[]>([])
  const [industry, setIndustry] = useState("")
  const [vibe, setVibe] = useState("playful")
  const [maxLength, setMaxLength] = useState(7)
  const [newKeyword, setNewKeyword] = useState("")

  const handleAnalyze = async () => {
    const text = description.trim()
    if (text.length < 20 || isAnalyzing) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch("/api/analyze-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Analysis failed")

      const a: Analysis = data.analysis
      setAnalysis(a)
      setKeywords(a.keywords)
      setIndustry(a.industry)
      setVibe(a.brandVibe)
      setMaxLength(a.maxLength)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const removeKeyword = (kw: string) => setKeywords((prev) => prev.filter((k) => k !== kw))

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    if (kw && !keywords.includes(kw) && keywords.length < 6) {
      setKeywords((prev) => [...prev, kw])
      setNewKeyword("")
    }
  }

  const buildParams = () => ({
    keyword: keywords.join(" "),
    industry,
    vibe,
    maxLength,
  })

  const canGenerate = keywords.length > 0 && !isGenerating && !isAnalyzing

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Description textarea */}
      <div>
        <label className="mb-2 block text-xs font-medium text-white/70 sm:text-sm">
          Describe your startup
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAnalyze()
          }}
          placeholder="Tell us what your startup does, who it's for, and what makes it unique. The more detail you give, the better the names will be.

Example: &quot;We're building an AI-powered platform for independent restaurant owners to forecast demand, reduce food waste, and automatically adjust their menu pricing. Our customers are small restaurant owners who struggle with cash flow and inventory management.&quot;"
          rows={5}
          className="w-full rounded-xl p-4 text-sm text-white/90 placeholder:text-white/25 focus:outline-none resize-none leading-relaxed"
          style={{
            background: "rgba(255,255,255,0.09)",
            border: "1px solid rgba(255,255,255,0.1)",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(212,175,55,0.55)"
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.2)"
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
            e.currentTarget.style.boxShadow = "none"
          }}
        />
        <p className="mt-1.5 text-[11px] text-white/30">
          {description.length}/1000 · minimum 20 characters · {description.length >= 20 ? "⌘↵ to analyze" : `${20 - description.length} more to go`}
        </p>
      </div>

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={description.trim().length < 20 || isAnalyzing}
        className={cn(
          "w-full rounded-xl py-3 text-sm font-semibold tracking-wide transition-all duration-200",
          "flex items-center justify-center gap-2",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          !isAnalyzing && description.trim().length >= 20 && "hover:-translate-y-0.5",
        )}
        style={{
          background: "rgba(212,175,55,0.12)",
          border: "1px solid rgba(212,175,55,0.3)",
          color: "#D4AF37",
        }}
      >
        {isAnalyzing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Analyzing your startup…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {analysis ? "Re-analyze" : "Analyze Startup"}
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <p className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          {error}
        </p>
      )}

      {/* Analysis panel */}
      {analysis && !isAnalyzing && (
        <div
          className="rounded-xl p-4 sm:p-5 space-y-4"
          style={{
            background: "rgba(212,175,55,0.05)",
            border: "1px solid rgba(212,175,55,0.2)",
          }}
        >
          {/* AI summary */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 sm:text-xs">AI understood</p>
            <p className="mt-1.5 text-sm text-white/75 leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Keywords */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30 sm:text-xs">
              Keywords <span className="normal-case font-normal text-white/25">(click × to remove, up to 6)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => removeKeyword(kw)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all hover:opacity-70"
                  style={{
                    background: "rgba(212,175,55,0.15)",
                    border: "1px solid rgba(212,175,55,0.35)",
                    color: "#D4AF37",
                  }}
                >
                  {kw}
                  <X className="h-3 w-3" />
                </button>
              ))}
              {keywords.length < 6 && (
                <div className="flex items-center gap-1">
                  <input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    placeholder="add keyword"
                    maxLength={20}
                    className="w-28 rounded-full px-3 py-1 text-xs text-white/70 placeholder:text-white/20 focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!newKeyword.trim()}
                    className="rounded-full p-1 text-white/40 transition-colors hover:text-white/80 disabled:opacity-30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Industry + Vibe row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30 sm:text-xs">Industry</p>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="h-10 w-full rounded-xl px-3 text-sm text-white/80 focus:outline-none [&>option]:bg-[#0d0b07] [&>option]:text-white"
                style={{
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {industryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30 sm:text-xs">
                Max name length <span className="text-[#D4AF37]">{maxLength}</span>
              </p>
              <div className="flex h-10 items-center gap-3">
                <input
                  type="range"
                  min={4}
                  max={12}
                  value={maxLength}
                  onChange={(e) => setMaxLength(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#D4AF37]"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
              </div>
            </div>
          </div>

          {/* Vibe */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30 sm:text-xs">Brand vibe</p>
            <div className="flex flex-wrap gap-2">
              {vibeOptions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVibe(v.id)}
                  className={cn(
                    "min-h-[34px] rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200",
                    vibe === v.id ? "text-black" : "text-white/50 hover:text-white/80",
                  )}
                  style={
                    vibe === v.id
                      ? { background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)" }
                      : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {v.label}
                </button>
              ))}
            </div>
            {analysis.vibeReasoning && (
              <p className="mt-2 text-[11px] text-white/35 italic">{analysis.vibeReasoning}</p>
            )}
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => onGenerate(buildParams())}
              disabled={!canGenerate}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold tracking-wide transition-all duration-200",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                canGenerate && "hover:-translate-y-0.5",
              )}
              style={{
                background: "linear-gradient(135deg, #D4AF37 0%, #F6E27A 50%, #D4AF37 100%)",
                color: "#0a0800",
                boxShadow: canGenerate ? "0 6px 28px rgba(212,175,55,0.4)" : "none",
              }}
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? "Generating…" : "Generate Names"}
            </button>
            <button
              onClick={() => onDeepSearch(buildParams())}
              disabled={!canGenerate}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                canGenerate && "hover:-translate-y-0.5",
              )}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              <Search className="h-4 w-4" />
              Deep Search .com
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
