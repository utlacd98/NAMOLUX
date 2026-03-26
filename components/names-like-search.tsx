"use client"

import { useState } from "react"
import { Sparkles, Search, X, Loader2, ExternalLink } from "lucide-react"
import { namecheapLink } from "@/lib/affiliateLink"

interface NamesLikeSearchProps {
  /** Pre-fill the inspiration field from a result card name */
  defaultInspiration?: string
  onClose: () => void
  /** Called when user wants to run full checks on a generated name */
  onCheckName?: (name: string) => void
}

interface GeneratedName {
  name: string
  checked: boolean
}

export function NamesLikeSearch({ defaultInspiration = "", onClose, onCheckName }: NamesLikeSearchProps) {
  const [inspiration, setInspiration] = useState(defaultInspiration)
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [names, setNames] = useState<GeneratedName[]>([])
  const [error, setError] = useState("")

  async function generate() {
    if (!inspiration.trim()) return
    setLoading(true)
    setError("")
    setNames([])

    try {
      const res = await fetch("/api/name-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "names-like", name: inspiration.trim(), keyword: keyword.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setNames((data.names as string[]).map((n) => ({ name: n, checked: false })))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl"
        style={{
          background: "#0d0d0d",
          border: "1px solid rgba(212,175,55,0.2)",
          boxShadow: "0 0 60px rgba(212,175,55,0.08), 0 24px 48px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "#D4AF37" }} />
            <span className="text-sm font-bold text-white">Names Like...</span>
          </div>
          <button onClick={onClose} className="text-white/30 transition-colors hover:text-white/70">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Brand you love
            </label>
            <input
              value={inspiration}
              onChange={(e) => setInspiration(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="e.g. Notion, Linear, Stripe, Figma"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/40">
              What your product does (optional)
            </label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="e.g. project management, payments, design"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </div>
          <button
            onClick={generate}
            disabled={loading || !inspiration.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
              color: "#0a0800",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing DNA...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Generate Names Like {inspiration || "..."}
              </>
            )}
          </button>

          {error && <p className="text-center text-[11px] text-red-400">{error}</p>}
        </div>

        {/* Results */}
        {names.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="px-5 py-3">
              <p className="text-[10px] text-white/30">
                8 names with the same structural DNA as <strong className="text-white/50">{inspiration}</strong>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px pb-1" style={{ background: "rgba(255,255,255,0.04)" }}>
              {names.map(({ name }) => (
                <div
                  key={name}
                  className="group flex items-center justify-between px-4 py-3"
                  style={{ background: "#0d0d0d" }}
                >
                  <span className="text-sm font-semibold text-white">{name}</span>
                  <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {onCheckName && (
                      <button
                        onClick={() => { onCheckName(name); onClose() }}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold transition-all hover:-translate-y-0.5"
                        style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37" }}
                        title="Check availability & score"
                      >
                        Check
                      </button>
                    )}
                    <a
                      href={namecheapLink(`${name}.com`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/20 transition-colors hover:text-emerald-400"
                      title={`Register ${name}.com`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
