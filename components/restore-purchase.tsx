"use client"

import { useState } from "react"
import { Loader2, RotateCcw, CheckCircle, AlertCircle } from "lucide-react"

export function RestorePurchase() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus("idle")
    setMessage("")

    try {
      const res = await fetch("/api/stripe/restore-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus("success")
        setMessage("Purchase restored! Redirecting to your dashboard…")
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1500)
      } else if (res.status === 401) {
        setStatus("error")
        setMessage("You need to be signed in first. Sign in then try again.")
      } else {
        setStatus("error")
        setMessage(data.error || "No purchase found for that email.")
      }
    } catch {
      setStatus("error")
      setMessage("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 text-center">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm text-[#555] hover:text-[#888] transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Already paid? Restore your purchase
        </button>
      ) : (
        <div className="mx-auto max-w-sm bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 text-left">
          <h3 className="text-white font-medium mb-1">Restore Purchase</h3>
          <p className="text-[#666] text-sm mb-4">
            Enter the email address you used when you paid and we'll restore your Pro access.
          </p>

          {status === "success" ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {message}
            </div>
          ) : (
            <form onSubmit={handleRestore} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white placeholder:text-[#555] text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843] focus:border-transparent transition"
              />

              {status === "error" && (
                <div className="flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {message}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#D4A843] hover:bg-[#c49a3d] disabled:opacity-50 text-black font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Checking…" : "Restore Access"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setStatus("idle"); setMessage("") }}
                  className="px-4 py-2.5 text-sm text-[#555] hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
