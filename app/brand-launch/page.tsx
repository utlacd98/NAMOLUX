import type { Metadata } from "next"
import { BrandLaunchKit } from "@/components/brand-launch-kit"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { createClient } from "@/lib/supabase/server"
import { getUserEntitlements } from "@/lib/entitlements"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Brand Launch Kit | NamoLux", robots: { index: false, follow: false } }

const STYLES = ["Modern", "Trustworthy", "Premium", "Playful", "Minimal", "Technical"]

export default async function BrandLaunchPage({ searchParams }: { searchParams: Promise<{ domain?: string; name?: string; vibe?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/sign-in?redirect=%2Fbrand-launch")
  const entitlements = await getUserEntitlements(user.id)
  if (!entitlements.isPro) redirect("/pricing?source=brand-launch")
  const params = await searchParams
  const initialDomain = (params.domain || params.name || "").slice(0, 253)
  const requestedStyle = params.vibe ? params.vibe.charAt(0).toUpperCase() + params.vibe.slice(1).toLowerCase() : "Modern"
  const initialVisualStyle = STYLES.includes(requestedStyle) ? requestedStyle : "Modern"
  return <div className="min-h-screen bg-[#050505]"><Navbar /><main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6"><BrandLaunchKit initialDomain={initialDomain} initialVisualStyle={initialVisualStyle} /></main><Footer /></div>
}
