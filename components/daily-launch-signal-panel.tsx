"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, CheckCircle2, Clock3, ShieldCheck } from "lucide-react"

type Snapshot = { enabled: boolean; isPro: boolean; siteLimit: number; historyDays: number; winners: any[]; sites: any[]; reports: any[]; assessments: any[] }

export function DailyLaunchSignalPanel() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [winnerEntryId, setWinnerEntryId] = useState("")
  const [url, setUrl] = useState("")
  const [method, setMethod] = useState<"dns_txt" | "meta_tag">("dns_txt")
  const [challenge, setChallenge] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [explanations, setExplanations] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const response = await fetch("/api/daily-launch-signal", { cache: "no-store" })
    if (response.ok) setSnapshot(await response.json())
  }, [])

  useEffect(() => {
    void load().then(async () => {
      await fetch("/api/daily-launch-signal/freshness", { method: "POST" }).catch(() => undefined)
      window.setTimeout(() => void load(), 1200)
    })
  }, [load])

  const latestBySite = useMemo(() => new Map((snapshot?.reports || []).map((report) => [report.site_id, report])), [snapshot])
  if (!snapshot?.enabled) return null

  async function connect() {
    setBusy(true); setMessage("")
    const response = await fetch("/api/daily-launch-signal/sites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ winnerEntryId, url, method }) })
    const payload = await response.json()
    if (response.ok) { setChallenge(payload); setMessage("Add the verification record, then verify ownership."); await load() }
    else setMessage(payload.message || "Setup could not be started.")
    setBusy(false)
  }

  async function verify() {
    if (!challenge) return
    setBusy(true); setMessage("")
    const response = await fetch(`/api/daily-launch-signal/sites/${challenge.site.id}/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: challenge.token }) })
    const payload = await response.json()
    setMessage(response.ok ? "Ownership verified. The first bounded report is queued." : payload.message || "Verification is not visible yet.")
    if (response.ok) { setChallenge(null); await load() }
    setBusy(false)
  }

  async function continueFree(siteId: string) {
    setBusy(true)
    const response = await fetch(`/api/daily-launch-signal/sites/${siteId}/continue-free`, { method: "POST" })
    const body = await response.json()
    setMessage(response.ok ? "This verified site will continue on your Free allowance." : body.message || "The site could not be selected.")
    await load(); setBusy(false)
  }

  async function explain(reportId: string) {
    setBusy(true); setMessage("")
    const response = await fetch(`/api/daily-launch-signal/reports/${reportId}/explain`, { method: "POST" })
    const body = await response.json()
    if (response.ok) setExplanations((current) => ({ ...current, [reportId]: body.explanation }))
    else setMessage(body.message || "The report could not be explained.")
    setBusy(false)
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d4af3738] bg-[#0c0d10]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/7 px-5 py-5 sm:px-6">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af3740] bg-[#d4af3714]"><Activity className="h-5 w-5 text-[#e6c86e]" /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#d4af37]">Daily Launch Signal</p><h2 className="mt-1 text-xl font-semibold text-white">Fresh SEO evidence when you return</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-white/45">Once-per-UTC-day checks for verified winning domains. Fresh reports load immediately; stale work is queued without slowing sign-in.</p></div>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">{snapshot.sites.length}/{snapshot.siteLimit} live URLs · {snapshot.historyDays}-day history</span>
      </div>

      {snapshot.sites.length > 0 && <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
        {snapshot.sites.map((site) => {
          const report: any = latestBySite.get(site.id)
          const assessment = snapshot.assessments.find((item) => item.site_id === site.id)
          return <article key={site.id} className="rounded-xl border border-white/8 bg-white/[.025] p-4">
            <div className="flex items-center justify-between gap-3"><p className="truncate font-medium text-white">{site.hostname}</p><span className={`text-xs ${site.verification_status === "verified" ? "text-emerald-400" : "text-amber-300"}`}>{site.verification_status}</span></div>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40">{report ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Clock3 className="h-4 w-4 text-amber-300" />}{report ? `Latest report ${new Date(report.created_at).toLocaleDateString()}` : "First report waiting"}</div>
            {assessment && <div className="mt-3 rounded-lg border border-white/7 bg-black/20 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-[#d4af37]">{assessment.change_state.replaceAll("_", " ")}</p><p className="mt-1 text-xs leading-5 text-white/45">{assessment.priorities?.[0]?.action || "No material change detected. Keep monitoring."}</p></div>}
            {report && <button disabled={busy} onClick={() => explain(report.id)} className="mt-3 text-xs font-semibold text-[#e8c96c] hover:text-[#f4d779]">Explain this report</button>}
            {report && explanations[report.id] && <p className="mt-3 whitespace-pre-wrap rounded-lg border border-white/7 bg-black/25 p-3 text-xs leading-5 text-white/55">{explanations[report.id]}</p>}
            {!snapshot.isPro && site.pause_reason === "subscription_inactive" && <button disabled={busy} onClick={() => continueFree(site.id)} className="mt-3 rounded-lg border border-[#d4af3750] px-3 py-2 text-xs font-semibold text-[#f4d779]">Continue this site on Free</button>}
          </article>
        })}
      </div>}

      {snapshot.sites.length < snapshot.siteLimit && <div className="border-t border-white/7 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#d4af37]" /><p className="text-sm font-semibold text-white">Connect a saved winning domain</p></div>
        {snapshot.winners.length === 0 ? <p className="text-sm text-white/45">Set a winner in your decision record first. Monitoring cannot be attached to an arbitrary external site.</p> : <div className="grid gap-3 md:grid-cols-[1fr_1.3fr_auto_auto]">
          <select value={winnerEntryId} onChange={(event) => setWinnerEntryId(event.target.value)} className="rounded-xl border border-white/10 bg-[#111216] px-3 py-3 text-sm text-white"><option value="">Choose winner</option>{snapshot.winners.map((winner) => <option key={winner.id} value={winner.id}>{winner.primary_domain}</option>)}</select>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.yourdomain.com" className="rounded-xl border border-white/10 bg-[#111216] px-3 py-3 text-sm text-white placeholder:text-white/25" />
          <select value={method} onChange={(event) => setMethod(event.target.value as any)} className="rounded-xl border border-white/10 bg-[#111216] px-3 py-3 text-sm text-white"><option value="dns_txt">DNS TXT</option><option value="meta_tag">Meta tag</option></select>
          <button onClick={connect} disabled={busy || !winnerEntryId || !url} className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f4d779] px-5 py-3 text-sm font-bold text-black disabled:opacity-40">Verify site</button>
        </div>}
        {challenge && <div className="mt-4 rounded-xl border border-[#d4af3730] bg-[#d4af3709] p-4"><p className="text-xs font-semibold text-[#f4d779]">{method === "dns_txt" ? `TXT host: ${challenge.dnsHost}` : "Add this tag inside <head>"}</p><code className="mt-2 block break-all text-xs leading-5 text-white/65">{method === "dns_txt" ? challenge.token : challenge.metaTag}</code><button onClick={verify} disabled={busy} className="mt-3 rounded-lg border border-[#d4af3750] px-4 py-2 text-sm font-semibold text-[#f4d779]">Check verification</button></div>}
        {message && <p className="mt-3 text-sm text-white/55">{message}</p>}
      </div>}
    </section>
  )
}
