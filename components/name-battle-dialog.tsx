"use client"

import { useState, useEffect } from "react"
import { X, Swords, Trophy, TrendingUp } from "lucide-react"
import { scoreName } from "@/lib/founderSignal/scoreName"
import { getTrendAge } from "@/lib/nameCreativity"

interface BattleEntry {
  name: string
  tld?: string
}

interface NameBattleDialogProps {
  names: BattleEntry[]          // names queued for battle (up to 2)
  onClose: () => void
}

function ScoreBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/50">{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

interface NameCard {
  name: string
  score: number
  raw: Record<string, number>
  trendAge: ReturnType<typeof getTrendAge>
}

function buildCard(name: string, tld = "com"): NameCard {
  const result = scoreName({ name, tld })
  return {
    name,
    score: result.score,
    raw: result.rawScores as unknown as Record<string, number>,
    trendAge: getTrendAge(name),
  }
}

export function NameBattleDialog({ names, onClose }: NameBattleDialogProps) {
  const [cards, setCards] = useState<NameCard[]>([])

  useEffect(() => {
    setCards(names.slice(0, 2).map((n) => buildCard(n.name, n.tld)))
  }, [names])

  if (cards.length < 2) return null

  const [a, b] = cards
  const winner = a.score >= b.score ? a : b
  const loser = a.score >= b.score ? b : a
  const margin = Math.abs(a.score - b.score)

  const FACTORS = [
    { key: "length",          label: "Length",          weight: 15 },
    { key: "pronounceability",label: "Pronounceability",weight: 20 },
    { key: "memorability",    label: "Memorability",    weight: 20 },
    { key: "extension",       label: "Extension",       weight: 15 },
    { key: "characterQuality",label: "Characters",      weight: 15 },
    { key: "brandRisk",       label: "Brand Risk",      weight: 15 },
  ]

  const GOLD = "#D4AF37"
  const BLUE = "#60a5fa"

  function scoreColor(s: number) {
    if (s >= 85) return GOLD
    if (s >= 70) return "#34d399"
    if (s >= 55) return BLUE
    return "#f87171"
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #0d0d0d 0%, #111111 100%)",
          border: "1px solid rgba(212,175,55,0.2)",
          boxShadow: "0 0 60px rgba(212,175,55,0.1), 0 24px 48px rgba(0,0,0,0.6)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4" style={{ color: GOLD }} />
            <span className="text-sm font-bold text-white">Name Battle</span>
          </div>
          <button onClick={onClose} className="text-white/30 transition-colors hover:text-white/70">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Winner banner */}
        <div
          className="flex items-center justify-center gap-2 px-5 py-3"
          style={{ background: "rgba(212,175,55,0.06)", borderBottom: "1px solid rgba(212,175,55,0.12)" }}
        >
          <Trophy className="h-4 w-4" style={{ color: GOLD }} />
          <span className="text-sm font-bold" style={{ color: GOLD }}>
            {winner.name} wins
          </span>
          {margin === 0 ? (
            <span className="text-[11px] text-white/35">— it's a draw</span>
          ) : (
            <span className="text-[11px] text-white/35">— by {margin} points</span>
          )}
        </div>

        {/* Score comparison */}
        <div className="grid grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.05)" }}>
          {[a, b].map((card, i) => {
            const isWinner = card.name === winner.name
            return (
              <div
                key={card.name}
                className="p-5"
                style={{
                  background: isWinner ? "rgba(212,175,55,0.04)" : "#0d0d0d",
                }}
              >
                {/* Name + score */}
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
                      {i === 0 ? "Challenger A" : "Challenger B"}
                    </p>
                    <p className="text-xl font-bold text-white">{card.name}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-3xl font-black tabular-nums"
                      style={{ color: scoreColor(card.score) }}
                    >
                      {card.score}
                    </p>
                    <p className="text-[10px] text-white/30">/ 100</p>
                  </div>
                </div>

                {/* Factor breakdown */}
                <div className="space-y-2.5">
                  {FACTORS.map(({ key, label, weight }) => {
                    const raw = card.raw[key] ?? 0
                    const weighted = Math.round((raw / 100) * weight)
                    const opponent = (i === 0 ? b : a).raw[key] ?? 0
                    const better = raw > opponent
                    return (
                      <ScoreBar
                        key={key}
                        label={`${label} ×${weight}%`}
                        value={weighted}
                        max={weight}
                        color={better ? (isWinner ? GOLD : "#34d399") : "rgba(255,255,255,0.2)"}
                      />
                    )
                  })}
                  {/* Trend age */}
                  <ScoreBar
                    label="Trend Age"
                    value={card.trendAge.score}
                    max={100}
                    color={card.trendAge.score >= 60 ? "#34d399" : "#f59e0b"}
                  />
                </div>

                {/* Winner badge */}
                {isWinner && margin > 0 && (
                  <div
                    className="mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                    style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)" }}
                  >
                    <TrendingUp className="h-3 w-3" style={{ color: GOLD }} />
                    <span className="text-[10px] font-semibold" style={{ color: GOLD }}>
                      Stronger candidate
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Verdict */}
        <div className="px-5 py-4">
          <p className="text-[11px] leading-relaxed text-white/40">
            {margin === 0
              ? `${a.name} and ${b.name} score identically. Dig into pronounceability and trend age to decide.`
              : margin <= 5
              ? `It's close. ${winner.name} edges out ${loser.name} by ${margin} points — consider other factors like availability and personal preference.`
              : margin <= 15
              ? `${winner.name} is the clearer choice. ${loser.name} has weaknesses in the factors above that could matter at scale.`
              : `${winner.name} significantly outperforms ${loser.name}. The gap is wide enough that ${loser.name} would need redesigning to compete.`}
          </p>
        </div>
      </div>
    </div>
  )
}
