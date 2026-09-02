import "server-only"

import { randomUUID } from "node:crypto"
import OpenAI from "openai"
import { get, put } from "@vercel/blob"
import { NextRequest } from "next/server"
import type { Json } from "@/lib/supabase/database.types"
import { getUserEntitlements } from "@/lib/entitlements"
import {
  checkPlanFeatureQuotaIdempotentForSubject,
  getQuotaSubject,
  refundPlanFeatureQuotaIdempotentForSubject,
} from "@/lib/rate-limit"
import { PRO_BRAND_LAUNCH_KIT_LIMIT } from "@/lib/plans"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// Free callers are rejected before quota consumption. Keeping a positive
// defensive value satisfies the shared quota contract if that ordering ever
// changes, without granting a free Brand Launch entitlement.
const KIT_LIMITS = { free: 1, pro: PRO_BRAND_LAUNCH_KIT_LIMIT }
const KIT_FEATURE = "brand-launch-kit"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class BrandLaunchError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message)
    this.name = "BrandLaunchError"
  }
}

export type PaletteDirection = {
  name: string
  feel: string
  role: "core" | "dark" | "expressive"
  palette: { background: string; primary: string; accent: string; surface: string; text: string }
  usageInsight: string
}

export type LogoConcept = { id: string; label: string; pathname: string }

export type BrandLaunchKit = {
  id: string
  entryId: string | null
  domainName: string
  brandName: string
  businessDescription: string
  mvpDescription: string
  audience: string | null
  visualStyle: string | null
  paletteVariants: PaletteDirection[]
  selectedPaletteIndex: number | null
  logoConcepts: LogoConcept[]
  selectedLogoId: string | null
  createdAt: string
  updatedAt: string
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function text(value: unknown, fallback: string) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim()
  return cleaned || fallback
}

function hex(value: unknown, fallback: string) {
  const candidate = String(value || "").trim().toUpperCase()
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : fallback
}

function normaliseDomainName(value: string) {
  let candidate = value.trim().toLowerCase()
  candidate = candidate.replace(/^https?:\/\//, "").replace(/^www\./, "")
  candidate = candidate.split(/[/?#]/, 1)[0].replace(/\.$/, "")
  const labels = candidate.split(".")
  const valid = candidate.length >= 3
    && candidate.length <= 253
    && labels.length >= 2
    && labels.every((label) => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
  if (!valid) throw new BrandLaunchError("invalid_domain", "Enter a complete domain such as cuelark.com, without a path.")
  return candidate
}

function fallbackDirections(style?: string | null): PaletteDirection[] {
  const directions: PaletteDirection[] = [
    { name: "Signal Olive", feel: "Grounded, capable", role: "core", palette: { background: "#F8F7F1", primary: "#315B4A", accent: "#C99A3E", surface: "#E6E7DD", text: "#17201C" }, usageInsight: "A calm, credible direction for a product founders need to trust." },
    { name: "Midnight Ledger", feel: "Confident, premium", role: "dark", palette: { background: "#101714", primary: "#D6B46B", accent: "#71B8A1", surface: "#1C2923", text: "#F4F2EA" }, usageInsight: "A dark, focused direction that gives product work a premium edge." },
    { name: "Copper Current", feel: "Distinct, energetic", role: "expressive", palette: { background: "#FFF9F2", primary: "#8A4E2A", accent: "#157C72", surface: "#F1E0CB", text: "#251811" }, usageInsight: "A warmer, more memorable direction for a launch that needs character." },
  ]
  return directions.map((direction) => ({ ...direction, name: style ? `${direction.name} · ${style}` : direction.name }))
}

function normaliseDirections(value: unknown, style?: string | null): PaletteDirection[] {
  const fallback = fallbackDirections(style)
  const raw = Array.isArray(value) ? value : []
  return fallback.map((base, index) => {
    const item = asObject(raw[index])
    const palette = asObject(item.palette)
    return {
      name: text(item.name, base.name),
      feel: text(item.feel, base.feel),
      role: index === 0 ? "core" : index === 1 ? "dark" : "expressive",
      palette: {
        background: hex(palette.background, base.palette.background),
        primary: hex(palette.primary, base.palette.primary),
        accent: hex(palette.accent, base.palette.accent),
        surface: hex(palette.surface, base.palette.surface),
        text: hex(palette.text, base.palette.text),
      },
      usageInsight: text(item.usageInsight, base.usageInsight),
    }
  })
}

function mapKit(row: Record<string, any>): BrandLaunchKit {
  return {
    id: row.id,
    entryId: row.shortlist_entry_id,
    domainName: row.domain_name || row.brand_name,
    brandName: row.brand_name,
    businessDescription: row.business_description,
    mvpDescription: row.mvp_description,
    audience: row.audience,
    visualStyle: row.visual_style,
    paletteVariants: normaliseDirections(row.palette_variants, row.visual_style),
    selectedPaletteIndex: row.selected_palette_index,
    logoConcepts: Array.isArray(row.logo_concepts) ? row.logo_concepts.filter((item: unknown): item is LogoConcept => Boolean(asObject(item).id && asObject(item).pathname)) : [],
    selectedLogoId: row.selected_logo_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function openAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new BrandLaunchError("ai_unavailable", "Brand generation is temporarily unavailable.", 503)
  return new OpenAI({ apiKey })
}

async function createDirections(input: Pick<BrandLaunchKit, "brandName" | "businessDescription" | "mvpDescription" | "audience" | "visualStyle">) {
  const fallback = fallbackDirections(input.visualStyle)
  const prompt = `Return JSON only: {"variants":[{"name":"","feel":"","palette":{"background":"#RRGGBB","primary":"#RRGGBB","accent":"#RRGGBB","surface":"#RRGGBB","text":"#RRGGBB"},"usageInsight":""}]}. Create exactly three cohesive, accessible directions: core, dark premium, expressive. Brand name: ${input.brandName}. Business: ${input.businessDescription}. MVP: ${input.mvpDescription}. Audience: ${input.audience || "not specified"}. Preferred style: ${input.visualStyle || "modern"}. Avoid generic purple unless the brief clearly needs it.`
  try {
    const completion = await openAI().chat.completions.create({
      model: "gpt-5.6-luna",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1100,
      response_format: { type: "json_object" },
    })
    const raw = completion.choices[0]?.message?.content
    if (!raw) return fallback
    return normaliseDirections(JSON.parse(raw).variants, input.visualStyle)
  } catch (error) {
    console.error("brand_launch_palette_generation_failed", error)
    return fallback
  }
}

async function ownerAndService() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) throw new BrandLaunchError("authentication_required", "Sign in to build a brand launch kit.", 401)
  const entitlements = await getUserEntitlements(user.id)
  if (!entitlements.isPro) {
    throw new BrandLaunchError("upgrade_required", "Brand Launch is included with an active Pro subscription.", 403)
  }
  return { userId: user.id, service: createServiceClient(), entitlements }
}

export async function getBrandLaunchOverview() {
  const { userId, service } = await ownerAndService()
  const kitsResult = await service.from("brand_launch_kits").select("*").eq("user_id", userId).order("updated_at", { ascending: false })
  if (kitsResult.error) throw kitsResult.error
  return {
    kits: (kitsResult.data || []).map((kit) => mapKit(kit)),
    isPro: true,
  }
}

export async function createBrandLaunchKit(input: {
  domainName: string
  businessDescription: string
  mvpDescription: string
  audience?: string
  visualStyle?: string
  idempotencyKey: string
}) {
  const domainName = normaliseDomainName(input.domainName)
  const brandName = domainName.split(".")[0]
  const businessDescription = input.businessDescription.trim()
  const mvpDescription = input.mvpDescription.trim()
  if (businessDescription.length < 20 || businessDescription.length > 1500 || mvpDescription.length < 20 || mvpDescription.length > 1500) {
    throw new BrandLaunchError("invalid_brief", "Business and MVP descriptions must each be between 20 and 1,500 characters.")
  }
  // This quota helper resolves the authenticated cookie context internally;
  // the request value is only used for anonymous callers, which this route
  // rejects before consuming an allowance.
  const subject = await getQuotaSubject(new NextRequest("https://www.namolux.com/api/brand-launch/kits"))
  if (!subject.userId) throw new BrandLaunchError("authentication_required", "Sign in to build a brand launch kit.", 401)
  if (subject.plan !== "pro") throw new BrandLaunchError("upgrade_required", "Brand Launch is included with an active Pro subscription.", 403)
  const service = createServiceClient()

  const allowance = await checkPlanFeatureQuotaIdempotentForSubject(subject, KIT_FEATURE, KIT_LIMITS, input.idempotencyKey)
  if (!allowance.allowed) throw new BrandLaunchError("kit_limit_reached", allowance.message || "This month’s Brand Launch Kit allowance has been used.", allowance.statusCode)

  try {
    const brief = { brandName, businessDescription, mvpDescription, audience: input.audience?.trim() || null, visualStyle: input.visualStyle?.trim() || null }
    const paletteVariants = await createDirections(brief)
    const { data, error } = await service.from("brand_launch_kits").insert({
      user_id: subject.userId,
      shortlist_entry_id: null,
      domain_name: domainName,
      brand_name: brief.brandName,
      business_description: brief.businessDescription,
      mvp_description: brief.mvpDescription,
      audience: brief.audience,
      visual_style: brief.visualStyle,
      palette_variants: paletteVariants as unknown as Json,
      updated_at: new Date().toISOString(),
    }).select("*").single()
    if (error) throw error
    return { kit: mapKit(data), quota: allowance }
  } catch (error) {
    await refundPlanFeatureQuotaIdempotentForSubject(subject, KIT_FEATURE, input.idempotencyKey)
    throw error
  }
}

async function getOwnedKit(kitId: string) {
  if (!UUID.test(kitId)) throw new BrandLaunchError("invalid_kit", "The kit reference is invalid.")
  const { userId, service } = await ownerAndService()
  const { data, error } = await service.from("brand_launch_kits").select("*").eq("id", kitId).eq("user_id", userId).maybeSingle()
  if (error) throw error
  if (!data) throw new BrandLaunchError("kit_not_found", "This Brand Launch Kit could not be found.", 404)
  return { userId, service, kit: mapKit(data) }
}

export async function selectBrandLaunchPalette(kitId: string, index: number) {
  if (!Number.isInteger(index) || index < 0 || index > 2) throw new BrandLaunchError("invalid_palette", "Choose one of the three palette directions.")
  const { userId, service, kit } = await getOwnedKit(kitId)
  const { data, error } = await service.from("brand_launch_kits").update({ selected_palette_index: index, updated_at: new Date().toISOString() }).eq("id", kit.id).eq("user_id", userId).select("*").single()
  if (error) throw error
  return mapKit(data)
}

export async function selectBrandLaunchLogo(kitId: string, logoId: string) {
  const { userId, service, kit } = await getOwnedKit(kitId)
  if (!kit.logoConcepts.some((logo) => logo.id === logoId)) throw new BrandLaunchError("invalid_logo", "Choose one of this kit’s logo concepts.")
  const { data, error } = await service.from("brand_launch_kits").update({ selected_logo_id: logoId, updated_at: new Date().toISOString() }).eq("id", kit.id).eq("user_id", userId).select("*").single()
  if (error) throw error
  return mapKit(data)
}

export async function generateBrandLaunchLogos(kitId: string) {
  const { userId, service, kit } = await getOwnedKit(kitId)
  if (kit.selectedPaletteIndex === null) throw new BrandLaunchError("palette_required", "Select a palette before generating logo concepts.")
  if (kit.logoConcepts.length) return kit
  const palette = kit.paletteVariants[kit.selectedPaletteIndex]
  const imageResponse = await openAI().images.generate({
    model: "gpt-image-2",
    size: "1024x1024",
    quality: "medium",
    n: 3,
    background: "transparent",
    prompt: `Create a premium, minimal logo symbol for ${kit.brandName}. Business: ${kit.businessDescription}. MVP: ${kit.mvpDescription}. Visual direction: ${palette.name}, ${palette.feel}. Main colours: ${palette.palette.primary}, ${palette.palette.accent}. Produce a clean standalone mark with no words, no letters, no mockup, no background, and no trademarked imagery.`,
  } as any)
  const imageData = imageResponse.data
  if (!imageData?.length) throw new BrandLaunchError("logo_generation_failed", "Logo generation did not return image data.", 502)
  const concepts: LogoConcept[] = []
  for (const [index, image] of imageData.entries()) {
    if (!image.b64_json) throw new BrandLaunchError("logo_generation_failed", "Logo generation did not return image data.", 502)
    const id = randomUUID()
    const pathname = `brand-launch/${userId}/${kit.id}/${id}.png`
    await put(pathname, Buffer.from(image.b64_json, "base64"), { access: "private", addRandomSuffix: false, contentType: "image/png" })
    concepts.push({ id, label: `Concept ${index + 1}`, pathname })
  }
  const { data, error } = await service.from("brand_launch_kits").update({ logo_concepts: concepts as unknown as Json, updated_at: new Date().toISOString() }).eq("id", kit.id).eq("user_id", userId).select("*").single()
  if (error) throw error
  return mapKit(data)
}

export async function getBrandLaunchLogoBlob(kitId: string, logoId: string) {
  const { kit } = await getOwnedKit(kitId)
  const logo = kit.logoConcepts.find((item) => item.id === logoId)
  if (!logo) throw new BrandLaunchError("logo_not_found", "This logo concept could not be found.", 404)
  const blob = await get(logo.pathname, { access: "private" })
  if (!blob?.stream) throw new BrandLaunchError("logo_not_found", "This logo file is unavailable.", 404)
  return blob
}

export async function getOwnedBrandLaunchKit(kitId: string) {
  return (await getOwnedKit(kitId)).kit
}

export function siteFiles(kit: BrandLaunchKit) {
  const direction = kit.paletteVariants[kit.selectedPaletteIndex ?? 0]
  const slug = kit.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "brand"
  const css = `:root{--bg:${direction.palette.background};--primary:${direction.palette.primary};--accent:${direction.palette.accent};--surface:${direction.palette.surface};--text:${direction.palette.text}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,sans-serif}.wrap{max-width:1100px;margin:auto;padding:24px}nav{display:flex;justify-content:space-between;align-items:center;padding:16px 0}.brand{font-weight:800;font-size:21px}.hero{padding:100px 0 64px;max-width:720px}h1{font-size:clamp(42px,8vw,88px);line-height:1;margin:0 0 24px}p{font-size:18px;line-height:1.6}.button{display:inline-block;margin-top:18px;background:var(--primary);color:white;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:700}.card{background:var(--surface);padding:28px;border-radius:18px;margin:32px 0}.eyebrow{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:12px}`
  const script = `document.querySelectorAll('[data-scroll]').forEach((link)=>link.addEventListener('click',(event)=>{event.preventDefault();document.querySelector(link.getAttribute('href'))?.scrollIntoView({behavior:'smooth'})}))`
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${kit.brandName}</title><link rel="stylesheet" href="styles.css"></head><body><main class="wrap"><nav><span class="brand">${kit.brandName}</span><a data-scroll href="#start">Get started</a></nav><section class="hero"><p class="eyebrow">${direction.name}</p><h1>${kit.brandName} makes the next move clearer.</h1><p>${kit.mvpDescription}</p><a class="button" id="start" href="#start">Get started</a></section><section class="card"><strong>Built for ${kit.audience || "people who need a clearer path"}.</strong><p>${kit.businessDescription}</p></section></main><script src="script.js"></script></body></html>`
  return { slug, html, css, script }
}
