"use client"

import { useState, useEffect } from "react"
import { X, Download, ChevronDown, ChevronUp, Star, Clock, Archive } from "lucide-react"
import { namecheapLink } from "@/lib/affiliateLink"

export type NameTier = "love" | "maybe" | "backup"

export interface SavedName {
  domain: string       // e.g. "flux.com"
  tier: NameTier
  addedAt: number
}

const STORAGE_KEY = "namolux_saved_board"

const TIERS: { id: NameTier; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  {
    id: "love",
    label: "Love It",
    icon: <Star className="h-3.5 w-3.5" />,
    color: "#D4AF37",
    desc: "Top candidates",
  },
  {
    id: "maybe",
    label: "Maybe",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "#60a5fa",
    desc: "Still considering",
  },
  {
    id: "backup",
    label: "Backup",
    icon: <Archive className="h-3.5 w-3.5" />,
    color: "rgba(255,255,255,0.3)",
    desc: "Just in case",
  },
]

function loadBoard(): SavedName[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedName[]
  } catch {
    return []
  }
}

function saveBoard(board: SavedName[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
}

interface SavedNamesBoardProps {
  /** Domains to pre-populate from the legacy shortlist */
  legacyShortlist?: string[]
  onClose: () => void
}

export function SavedNamesBoard({ legacyShortlist = [], onClose }: SavedNamesBoardProps) {
  const [board, setBoard] = useState<SavedName[]>([])
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => {
    const stored = loadBoard()
    // Merge legacy shortlist items as "maybe" if not already tracked
    const existing = new Set(stored.map((s) => s.domain))
    const merged = [
      ...stored,
      ...legacyShortlist
        .filter((d) => !existing.has(d))
        .map((d) => ({ domain: d, tier: "maybe" as NameTier, addedAt: Date.now() })),
    ]
    setBoard(merged)
  }, [legacyShortlist])

  function update(next: SavedName[]) {
    setBoard(next)
    saveBoard(next)
  }

  function moveTier(domain: string, tier: NameTier) {
    update(board.map((s) => (s.domain === domain ? { ...s, tier } : s)))
  }

  function remove(domain: string) {
    update(board.filter((s) => s.domain !== domain))
  }

  function handleDragStart(domain: string) {
    setDragging(domain)
  }

  function handleDrop(tier: NameTier) {
    if (!dragging) return
    moveTier(dragging, tier)
    setDragging(null)
  }

  function exportTxt() {
    const lines = TIERS.flatMap(({ id, label }) => {
      const names = board.filter((s) => s.tier === id).map((s) => s.domain)
      if (!names.length) return []
      return [`— ${label} —`, ...names, ""]
    })
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "namolux-saved-names.txt"
    a.click()
  }

  const total = board.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl"
        style={{
          background: "#0d0d0d",
          border: "1px solid rgba(212,175,55,0.2)",
          boxShadow: "0 0 60px rgba(212,175,55,0.08), 0 24px 48px rgba(0,0,0,0.6)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-sm font-bold text-white">Saved Names Board</p>
            <p className="text-[10px] text-white/30">{total} name{total !== 1 ? "s" : ""} saved — drag to tier, click to register</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportTxt}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
            >
              <Download className="h-3 w-3" />
              Export
            </button>
            <button onClick={onClose} className="text-white/30 transition-colors hover:text-white/70">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="flex flex-1 overflow-auto">
          {total === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
              <p className="text-sm text-white/25">No saved names yet</p>
              <p className="text-[11px] text-white/15">Bookmark names from the results to add them here</p>
            </div>
          ) : (
            <div className="grid flex-1 grid-cols-1 gap-px sm:grid-cols-3" style={{ background: "rgba(255,255,255,0.04)" }}>
              {TIERS.map(({ id, label, icon, color, desc }) => {
                const items = board
                  .filter((s) => s.tier === id)
                  .sort((a, b) => b.addedAt - a.addedAt)
                return (
                  <div
                    key={id}
                    className="flex flex-col"
                    style={{ background: "#0d0d0d", minHeight: 120 }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(id)}
                  >
                    {/* Tier header */}
                    <div
                      className="flex items-center gap-2 px-4 py-3"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span style={{ color }}>{icon}</span>
                      <div>
                        <p className="text-[11px] font-bold" style={{ color }}>{label}</p>
                        <p className="text-[9px] text-white/25">{desc}</p>
                      </div>
                      <span
                        className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                        style={{ background: `${color}18`, color }}
                      >
                        {items.length}
                      </span>
                    </div>

                    {/* Name chips */}
                    <div className="flex flex-1 flex-col gap-1.5 p-3">
                      {items.map((saved) => (
                        <div
                          key={saved.domain}
                          draggable
                          onDragStart={() => handleDragStart(saved.domain)}
                          className="group flex cursor-grab items-center justify-between rounded-xl px-3 py-2 active:cursor-grabbing"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <a
                            href={namecheapLink(saved.domain)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-white/70 transition-colors hover:text-white"
                            title={`Register ${saved.domain}`}
                          >
                            {saved.domain}
                          </a>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {/* Quick move buttons */}
                            {TIERS.filter((t) => t.id !== id).map((t) => (
                              <button
                                key={t.id}
                                onClick={() => moveTier(saved.domain, t.id)}
                                className="rounded px-1 py-0.5 text-[8px] font-bold transition-all hover:opacity-80"
                                style={{ background: `${t.color}18`, color: t.color }}
                                title={`Move to ${t.label}`}
                              >
                                {t.label}
                              </button>
                            ))}
                            <button
                              onClick={() => remove(saved.domain)}
                              className="ml-1 text-white/20 transition-colors hover:text-red-400"
                              title="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div
                          className="flex flex-1 items-center justify-center rounded-xl p-4"
                          style={{ border: "1px dashed rgba(255,255,255,0.06)" }}
                        >
                          <p className="text-[9px] text-white/15">Drop names here</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
