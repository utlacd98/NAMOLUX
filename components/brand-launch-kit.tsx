"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Check, Code2, Download, ImageIcon, Loader2, Palette, Sparkles } from "lucide-react"
import { BrandLaunchSandbox } from "@/components/brand-launch-sandbox"
import { trackEvent } from "@/lib/analytics"

type Direction = { name: string; feel: string; role: "core" | "dark" | "expressive"; palette: { background: string; primary: string; accent: string; surface: string; text: string }; usageInsight: string }
type Logo = { id: string; label: string; pathname: string }
type Kit = { id: string; entryId: string | null; domainName: string; brandName: string; businessDescription: string; mvpDescription: string; audience: string | null; visualStyle: string | null; paletteVariants: Direction[]; selectedPaletteIndex: number | null; logoConcepts: Logo[]; selectedLogoId: string | null; createdAt: string; updatedAt: string }
type Overview = { kits: Kit[]; isPro: boolean }

const STYLES = ["Modern", "Trustworthy", "Premium", "Playful", "Minimal", "Technical"]

function idempotencyKey() {
  return `brandkit-${crypto.randomUUID()}`
}

function download(url: string) {
  const link = document.createElement("a")
  link.href = url
  link.click()
}

async function downloadResizedLogo(kit: Kit, logo: Logo, size: number, label: string) {
  const response = await fetch(`/api/brand-launch/kits/${kit.id}/logos/${logo.id}`)
  if (!response.ok) throw new Error("The logo file is unavailable.")
  const source = URL.createObjectURL(await response.blob())
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("The logo could not be resized.")); image.src = source })
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Your browser cannot prepare this asset.")
    context.drawImage(image, 0, 0, size, size)
    const link = document.createElement("a")
    link.download = `${kit.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${label}-${size}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  } finally { URL.revokeObjectURL(source) }
}

export function BrandLaunchKit({ initialDomain = "", initialVisualStyle = "Modern" }: { initialDomain?: string; initialVisualStyle?: string }) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [kit, setKit] = useState<Kit | null>(null)
  const [domainName, setDomainName] = useState(initialDomain)
  const [businessDescription, setBusinessDescription] = useState("")
  const [mvpDescription, setMvpDescription] = useState("")
  const [audience, setAudience] = useState("")
  const [visualStyle, setVisualStyle] = useState(initialVisualStyle)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generatingLogos, setGeneratingLogos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const trackedView = useRef(false)

  const selectedDirection = useMemo(() => kit?.paletteVariants[kit.selectedPaletteIndex ?? 0] || null, [kit])
  const selectedLogo = kit?.logoConcepts.find((logo) => logo.id === kit.selectedLogoId) || null

  async function load() {
    setLoading(true)
    try {
      const response = await fetch("/api/brand-launch/kits", { cache: "no-store" })
      const data = await response.json()
      if (response.status === 401) {
        setAuthRequired(true)
        return
      }
      if (!response.ok) throw new Error(data.message || "Brand Launch is unavailable.")
      setAuthRequired(false)
      setOverview(data)
      setKit((current) => current || data.kits[0] || null)
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Brand Launch is unavailable.") } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!trackedView.current) {
      trackedView.current = true
      void trackEvent({ action: "launch_kit_viewed", metadata: { source: "brand-launch" } })
    }
    void load()
  }, [])

  async function createKit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const response = await fetch("/api/brand-launch/kits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domainName, businessDescription, mvpDescription, audience, visualStyle, idempotencyKey: idempotencyKey() }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Could not create a kit.")
      setKit(data.kit)
      setOverview((current) => current ? { ...current, kits: [data.kit, ...current.kits] } : current)
      void trackEvent({ action: "launch_kit_started", metadata: { source: "brand-launch", mode: overview?.isPro ? "pro" : "free" } })
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create a kit.") } finally { setSubmitting(false) }
  }

  async function patchKit(payload: Record<string, unknown>) {
    if (!kit) return
    setError(null)
    const response = await fetch(`/api/brand-launch/kits/${kit.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Could not update this kit.")
    setKit(data)
  }

  async function generateLogos() {
    if (!kit) return
    setGeneratingLogos(true); setError(null)
    try {
      const response = await fetch(`/api/brand-launch/kits/${kit.id}/logos`, { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Could not generate logo concepts.")
      setKit(data)
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not generate logo concepts.") } finally { setGeneratingLogos(false) }
  }

  if (loading) return <div className="flex min-h-80 items-center justify-center text-white/55"><Loader2 className="mr-3 h-5 w-5 animate-spin text-[#D4AF37]" />Loading Brand Launch…</div>

  const returnPath = `/brand-launch${domainName ? `?domain=${encodeURIComponent(domainName)}` : ""}`
  const authDestination = encodeURIComponent(returnPath)

  return <section className="text-white">
    <div className="mb-8 max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#D4AF37]">Brand Launch Kit · Pro</p><h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Turn your domain into a launch-ready brand.</h1><p className="mt-4 text-base leading-7 text-white/55">Enter the domain you want to build around, choose a visual style, and describe the product. Pro includes three palette directions, a professional landing-page preview, usable code, and matching logo concepts.</p></div>
    {error && <p role="alert" className="mb-5 rounded-xl border border-red-300/25 bg-red-300/10 px-4 py-3 text-sm text-red-100">{error}</p>}
    {authRequired && <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[.05] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#D4AF37]">Pro access required</p><h2 className="mt-3 text-2xl font-bold">Sign in to continue your Brand Launch Kit.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Brand Launch is available to active Pro accounts, with ten kits each month.</p><div className="mt-6 flex flex-wrap gap-3"><Link href={`/sign-in?redirect=${authDestination}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#D4AF37] px-5 text-sm font-bold text-black">Sign in</Link><Link href="/pricing?source=brand-launch" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-white">View Pro</Link></div></div>}
    {overview ? <>
      <form onSubmit={createKit} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:grid-cols-2 sm:p-6">
        <div><label htmlFor="brand-launch-domain" className="mb-2 block text-sm font-semibold">Domain</label><input id="brand-launch-domain" required maxLength={253} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={domainName} onChange={(event) => setDomainName(event.target.value)} placeholder="e.g. cuelark.com" className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" /><p className="mt-2 text-xs text-white/40">Paste a full domain, without a path.</p></div>
        <div><label className="mb-2 block text-sm font-semibold">Visual style</label><select value={visualStyle} onChange={(event) => setVisualStyle(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm">{STYLES.map((style) => <option key={style}>{style}</option>)}</select></div>
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">What is the business?</span><textarea required minLength={20} maxLength={1500} value={businessDescription} onChange={(event) => setBusinessDescription(event.target.value)} placeholder="Describe the customer problem and your business." className="min-h-24 w-full rounded-xl border border-white/10 bg-black p-3 text-sm" /></label>
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">What does the MVP do?</span><textarea required minLength={20} maxLength={1500} value={mvpDescription} onChange={(event) => setMvpDescription(event.target.value)} placeholder="Describe the first useful product experience." className="min-h-24 w-full rounded-xl border border-white/10 bg-black p-3 text-sm" /></label>
        <label><span className="mb-2 block text-sm font-semibold">Audience <span className="font-normal text-white/40">(optional)</span></span><input maxLength={280} value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="e.g. independent founders" className="w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" /></label>
        <div className="flex items-end"><button disabled={submitting || !domainName.trim()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3 text-sm font-bold text-black disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{submitting ? "Building kit…" : "Build brand kit"}</button></div>
        <p className="sm:col-span-2 text-xs text-white/42">Brand Launch Kit is a Pro feature. Pro includes ten kits each month, three palette directions, code exports, and matching logo concepts.</p>
      </form>
      {kit && <div className="mt-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.2em] text-[#D4AF37]">Current kit</p><h2 className="mt-1 text-3xl font-bold">{kit.brandName}</h2><p className="mt-1 text-sm text-white/42">{kit.domainName}</p></div>{overview.kits.length > 1 && <select value={kit.id} onChange={(event) => setKit(overview.kits.find((item) => item.id === event.target.value) || null)} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm"><option value={kit.id}>This kit</option>{overview.kits.filter((item) => item.id !== kit.id).map((item) => <option key={item.id} value={item.id}>{item.domainName}</option>)}</select>}</div>
        <div className="grid gap-4 lg:grid-cols-3">{kit.paletteVariants.map((direction, index) => { const selected = kit.selectedPaletteIndex === index; return <button key={direction.role} onClick={() => void patchKit({ selectedPaletteIndex: index }).catch((caught) => setError(caught.message))} className="overflow-hidden rounded-2xl border p-4 text-left" style={{ background: direction.palette.background, color: direction.palette.text, borderColor: selected ? direction.palette.accent : direction.palette.surface }}><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest">{direction.role}</span>{selected && <Check className="h-4 w-4" />}</div><h3 className="mt-8 text-xl font-bold">{direction.name}</h3><p className="mt-1 text-sm opacity-70">{direction.feel}</p><div className="mt-5 flex gap-2">{Object.values(direction.palette).map((colour) => <span key={colour} className="h-7 w-7 rounded-full border border-black/10" style={{ background: colour }} />)}</div><p className="mt-4 text-xs leading-5 opacity-75">{direction.usageInsight}</p></button> })}</div>
        {selectedDirection && <BrandLaunchSandbox brandName={kit.brandName} keywords={`${kit.businessDescription} ${kit.audience || ""}`} vibe={kit.visualStyle || "modern"} brandType={kit.visualStyle || ""} variantName={selectedDirection.name} palette={{ background: { hex: selectedDirection.palette.background }, primary: { hex: selectedDirection.palette.primary }, accent: { hex: selectedDirection.palette.accent }, secondary: { hex: selectedDirection.palette.surface }, text: { hex: selectedDirection.palette.text } }} />}
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Website code</h3><p className="mt-1 text-sm text-white/52">Download the three files together and open <code>index.html</code> in your editor.</p></div><div className="flex flex-wrap gap-2">{["html", "css", "js"].map((file) => <button key={file} onClick={() => { void trackEvent({ action: "brand_export_clicked", metadata: { source: "brand-launch", mode: file } }); download(`/api/brand-launch/kits/${kit.id}/site?file=${file}`) }} className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/35 px-3 py-2 text-sm font-semibold text-[#F4D779]"><Code2 className="h-4 w-4" />{file === "html" ? "index.html" : file === "css" ? "styles.css" : "script.js"}</button>)}</div></div></div>
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[.04] p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-lg font-bold">Logo concepts</h3><p className="mt-1 max-w-2xl text-sm text-white/55">Select a palette, then generate three matching transparent PNG logo concepts.</p></div><button disabled={generatingLogos || kit.selectedPaletteIndex === null || Boolean(kit.logoConcepts.length)} onClick={() => void generateLogos()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D4AF37] px-4 text-sm font-bold text-black disabled:opacity-50">{generatingLogos ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}{kit.logoConcepts.length ? "Logo concepts ready" : "Generate 3 logos"}</button></div>
          {kit.logoConcepts.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-3">{kit.logoConcepts.map((logo) => <div key={logo.id} className={`rounded-xl border p-3 ${kit.selectedLogoId === logo.id ? "border-[#D4AF37]" : "border-white/10"}`}><button onClick={() => void patchKit({ selectedLogoId: logo.id }).catch((caught) => setError(caught.message))} className="block w-full"><img src={`/api/brand-launch/kits/${kit.id}/logos/${logo.id}`} alt={`${logo.label} for ${kit.brandName}`} className="aspect-square w-full rounded-lg bg-white/5 object-contain" /><span className="mt-3 flex justify-between text-sm font-semibold">{logo.label}{kit.selectedLogoId === logo.id && <Check className="h-4 w-4 text-[#D4AF37]" />}</span></button></div>)}</div>}
          {selectedLogo && <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-5"><button onClick={() => { void trackEvent({ action: "brand_export_clicked", metadata: { source: "brand-launch", mode: "logo-master" } }); download(`/api/brand-launch/kits/${kit.id}/logos/${selectedLogo.id}`) }} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm"><Download className="h-4 w-4" />Master 1024 PNG</button>{[[16,"favicon"],[32,"favicon"],[48,"favicon"],[180,"apple-touch-icon"],[192,"app-icon"],[512,"social-icon"]].map(([size, label]) => <button key={`${size}-${label}`} onClick={() => { void trackEvent({ action: "brand_export_clicked", metadata: { source: "brand-launch", mode: "logo-size" } }); void downloadResizedLogo(kit, selectedLogo, Number(size), String(label)).catch((caught) => setError(caught.message)) }} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/75">{size}px</button>)}</div>}
        </div>
      </div>}
    </> : null}
  </section>
}
