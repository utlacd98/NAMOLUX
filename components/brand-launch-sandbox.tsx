"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  Code2,
  Download,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  Monitor,
  PackageOpen,
  Smartphone,
  Sparkles,
  Tags,
} from "lucide-react"
import { StitchPrompt } from "@/components/stitch-prompt"
import { trackEvent } from "@/lib/analytics"

type TemplateId =
  | "saas"
  | "fintech"
  | "luxury"
  | "consumer"
  | "wellness"
  | "devtool"
  | "creative"
  | "mobile"
type DeviceId = "mobile" | "desktop"
type ViewId = "landing" | "dashboard" | "product" | "pricing"

const MOBILE_VIEWPORT_WIDTH = 390
const MOBILE_IFRAME_HEIGHT = 720
const MOBILE_FRAME_BORDER = 5
const MOBILE_CHROME_HEIGHT = 37
const MOBILE_FRAME_WIDTH = MOBILE_VIEWPORT_WIDTH + MOBILE_FRAME_BORDER * 2
const MOBILE_FRAME_HEIGHT = MOBILE_IFRAME_HEIGHT + MOBILE_CHROME_HEIGHT + MOBILE_FRAME_BORDER * 2

interface PaletteColour {
  hex: string
}

interface BrandLaunchSandboxProps {
  brandName: string
  keywords: string
  vibe: string
  brandType?: string
  variantName?: string
  palette: {
    primary: PaletteColour
    secondary: PaletteColour
    accent: PaletteColour
    background: PaletteColour
    text: PaletteColour
  }
}

interface Metric {
  label: string
  value: string
  detail: string
}

interface TemplateConfig {
  id: TemplateId
  label: string
  shortLabel: string
  hint: string
  matchTerms: string[]
  badge: string
  nav: string[]
  cta: string
  secondaryCta: string
  serif: boolean
  radius: "soft" | "crisp" | "editorial" | "app"
  headline: (brandName: string, description: string) => string
  subline: (brandName: string, description: string) => string
  metrics: Metric[]
  featureTitle: string
  featureIntro: string
  features: Array<{ title: string; body: string }>
  proofQuote: string
  proofSource: string
  dashboardTitle: string
  dashboardSubtitle: string
  dashboardPrimary: string
  productTitle: string
  productSubtitle: string
  productSteps: string[]
  pricingTitle: string
  pricingSubtitle: string
  planNames: [string, string]
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: "saas",
    label: "SaaS / AI",
    shortLabel: "SaaS",
    hint: "Automation, analytics, AI workflows",
    matchTerms: ["saas", "ai", "automation", "analytics", "b2b", "workflow", "productivity"],
    badge: "AI operating layer",
    nav: ["Platform", "Workflow", "Customers"],
    cta: "Start trial",
    secondaryCta: "View demo",
    serif: false,
    radius: "soft",
    headline: (name) => `${name} turns scattered work into a launch-ready operating system.`,
    subline: (_name, description) =>
      `A focused product experience for ${description}, built to show value quickly and convert early teams with confidence.`,
    metrics: [
      { value: "34%", label: "Faster cycles", detail: "from brief to launch" },
      { value: "8.9", label: "Signal score", detail: "qualified product intent" },
      { value: "4.2k", label: "Tasks routed", detail: "monthly automation volume" },
    ],
    featureTitle: "A sharper workspace for every high-intent lead.",
    featureIntro: "The system balances a premium brand surface with the credibility of a real product dashboard.",
    features: [
      { title: "Workflow scoring", body: "Rank opportunities by urgency, fit, and commercial upside." },
      { title: "Live product pulse", body: "Show activation, usage, and retention signals in one calm command center." },
      { title: "Founder-ready handoff", body: "Turn the landing page, dashboard, and pricing story into one launch system." },
    ],
    proofQuote: "The product felt credible before our first sales call. That changed the tone of every demo.",
    proofSource: "Pilot founder, AI ops platform",
    dashboardTitle: "Revenue command center",
    dashboardSubtitle: "Live pipeline quality, activation, and launch tasks in one view.",
    dashboardPrimary: "Pipeline quality",
    productTitle: "Automate the path from demand to delivery.",
    productSubtitle: "A product surface that makes the workflow feel useful before users sign in.",
    productSteps: ["Capture intent", "Score demand", "Route work", "Report outcomes"],
    pricingTitle: "Launch with the full product story.",
    pricingSubtitle: "One plan that gives early customers a complete operating layer.",
    planNames: ["Starter", "Scale"],
  },
  {
    id: "fintech",
    label: "Fintech",
    shortLabel: "Fintech",
    hint: "Trust, money movement, financial dashboards",
    matchTerms: ["fintech", "finance", "bank", "payment", "payments", "money", "wealth", "invoice", "secure"],
    badge: "Bank-grade trust layer",
    nav: ["Accounts", "Security", "Rates"],
    cta: "Open account",
    secondaryCta: "See security",
    serif: false,
    radius: "crisp",
    headline: (name) => `${name} gives modern teams a calmer way to move money.`,
    subline: (_name, description) =>
      `A secure finance experience for ${description}, designed around clarity, confidence, and high-trust action.`,
    metrics: [
      { value: "99.98%", label: "Uptime", detail: "live account access" },
      { value: "12m", label: "Settled", detail: "monthly payment volume" },
      { value: "4.8/5", label: "Trust", detail: "customer security rating" },
    ],
    featureTitle: "Financial UI that feels secure without feeling slow.",
    featureIntro: "The preview uses balance cards, verification states, and calm transaction patterns.",
    features: [
      { title: "Protected movement", body: "Clear confirmations and risk checks keep payment decisions readable." },
      { title: "Transparent balances", body: "Account totals, holds, and upcoming transfers are visible at a glance." },
      { title: "Team controls", body: "Approval states and permissions make the product feel ready for business users." },
    ],
    proofQuote: "Customers understood the value immediately because the interface looked secure and operational.",
    proofSource: "Finance product lead",
    dashboardTitle: "Treasury overview",
    dashboardSubtitle: "Balances, approvals, and risk signals in one high-trust workspace.",
    dashboardPrimary: "Available balance",
    productTitle: "A finance product that earns trust in seconds.",
    productSubtitle: "Every screen uses the palette to separate action, proof, and risk clearly.",
    productSteps: ["Verify identity", "Review balance", "Approve transfer", "Track settlement"],
    pricingTitle: "Simple pricing for serious finance teams.",
    pricingSubtitle: "Clear commercial packaging with security and support included.",
    planNames: ["Essential", "Business"],
  },
  {
    id: "luxury",
    label: "Luxury",
    shortLabel: "Luxury",
    hint: "Editorial, refined, premium goods",
    matchTerms: ["luxury", "premium", "fashion", "jewelry", "beauty", "fragrance", "hotel", "concierge", "atelier"],
    badge: "Private release",
    nav: ["Collection", "Craft", "Access"],
    cta: "Request access",
    secondaryCta: "View collection",
    serif: true,
    radius: "editorial",
    headline: (name) => `${name} brings restraint, craft, and presence into one refined system.`,
    subline: (_name, description) =>
      `An editorial brand experience for ${description}, composed for premium positioning and quiet confidence.`,
    metrics: [
      { value: "72%", label: "Higher recall", detail: "premium first impression" },
      { value: "48h", label: "Private drop", detail: "curated release window" },
      { value: "1:1", label: "Concierge", detail: "guided customer journey" },
    ],
    featureTitle: "Premium does not need to shout.",
    featureIntro: "The sandbox leans into editorial rhythm, tactile product cards, and measured contrast.",
    features: [
      { title: "Editorial hierarchy", body: "Serif-led headlines, careful spacing, and restrained colour moments." },
      { title: "Collection modules", body: "Product cards feel curated instead of generic or marketplace-like." },
      { title: "Invitation flow", body: "CTAs feel considered, exclusive, and commercially useful." },
    ],
    proofQuote: "It looked like a complete luxury house rather than a startup testing a colour palette.",
    proofSource: "Brand consultant",
    dashboardTitle: "Private client desk",
    dashboardSubtitle: "Waitlist, collection interest, and concierge moments for a premium release.",
    dashboardPrimary: "Members waiting",
    productTitle: "A composed product story with commercial intent.",
    productSubtitle: "Each module gives the brand a polished retail and editorial context.",
    productSteps: ["Set the mood", "Reveal the collection", "Create desire", "Invite purchase"],
    pricingTitle: "Present the offer with restraint.",
    pricingSubtitle: "Premium packaging that makes access feel considered and valuable.",
    planNames: ["Essentials", "Private"],
  },
  {
    id: "consumer",
    label: "Consumer",
    shortLabel: "Consumer",
    hint: "Friendly storefronts, products, lifestyle brands",
    matchTerms: ["consumer", "shop", "store", "clothing", "apparel", "product", "food", "eco", "sustainable", "biodegradable"],
    badge: "Ready for first customers",
    nav: ["Shop", "Story", "Reviews"],
    cta: "Shop the drop",
    secondaryCta: "See the story",
    serif: false,
    radius: "app",
    headline: (name) => `${name} makes better everyday choices feel easy to start.`,
    subline: (_name, description) =>
      `A clean consumer launch page for ${description}, built to feel fresh, trustworthy, and ready for real customers.`,
    metrics: [
      { value: "2.8k", label: "Launch list", detail: "qualified early shoppers" },
      { value: "42%", label: "Repeat intent", detail: "surveyed buyer interest" },
      { value: "3.4x", label: "Share rate", detail: "organic product saves" },
    ],
    featureTitle: "A storefront that feels simple, modern, and commercially real.",
    featureIntro: "The preview balances sustainability signals, product benefits, and a friendly purchase path.",
    features: [
      { title: "Clear product promise", body: "Turn the core benefit into plain language customers understand quickly." },
      { title: "Trust without clutter", body: "Use proof, materials, and reviews without making the page feel heavy." },
      { title: "Mobile purchase path", body: "Buttons, cards, and product moments stay tappable on smaller screens." },
    ],
    proofQuote: "The brand instantly felt cleaner and more trustworthy, not like another generic template.",
    proofSource: "Consumer launch advisor",
    dashboardTitle: "Storefront pulse",
    dashboardSubtitle: "Demand, product saves, and customer intent for the first release.",
    dashboardPrimary: "Launch demand",
    productTitle: "Make the product benefit visible before the first click.",
    productSubtitle: "A storefront system that gives shoppers a reason to trust and act.",
    productSteps: ["Discover product", "Compare benefits", "Read proof", "Buy with confidence"],
    pricingTitle: "Turn interest into a clear first purchase.",
    pricingSubtitle: "Offer structure that feels friendly, transparent, and launch-ready.",
    planNames: ["Single", "Bundle"],
  },
  {
    id: "wellness",
    label: "Wellness",
    shortLabel: "Wellness",
    hint: "Health, wellbeing, calm routines",
    matchTerms: ["wellness", "health", "fitness", "therapy", "mindful", "calm", "nutrition", "sleep", "spa"],
    badge: "Calm daily progress",
    nav: ["Routines", "Coaches", "Progress"],
    cta: "Begin today",
    secondaryCta: "Explore plans",
    serif: false,
    radius: "app",
    headline: (name) => `${name} helps people build better rituals without pressure.`,
    subline: (_name, description) =>
      `A softer product experience for ${description}, with calm progress cues and a trustworthy path to action.`,
    metrics: [
      { value: "21d", label: "Habit streak", detail: "average guided routine" },
      { value: "86%", label: "Check-ins", detail: "weekly member completion" },
      { value: "4.9", label: "Calm score", detail: "member experience rating" },
    ],
    featureTitle: "A wellness brand should feel supportive before it asks for action.",
    featureIntro: "The UI uses soft structure, guided cards, and clear progress to avoid visual noise.",
    features: [
      { title: "Gentle onboarding", body: "Invite users into a routine with low-friction steps and calm language." },
      { title: "Progress cues", body: "Use the palette for streaks, goals, and reassuring states." },
      { title: "Human proof", body: "Member stories and coach notes create trust without hard selling." },
    ],
    proofQuote: "The experience felt calm, premium, and genuinely supportive from the first screen.",
    proofSource: "Wellness studio founder",
    dashboardTitle: "Member wellbeing",
    dashboardSubtitle: "Progress, streaks, and care prompts for a daily wellness product.",
    dashboardPrimary: "Routine health",
    productTitle: "Design the first habit loop before the product exists.",
    productSubtitle: "A guided product preview built around confidence, calm, and repeat use.",
    productSteps: ["Choose routine", "Track progress", "Receive support", "Build momentum"],
    pricingTitle: "Package support clearly.",
    pricingSubtitle: "Plans that make ongoing care feel accessible and premium.",
    planNames: ["Guided", "Plus"],
  },
  {
    id: "devtool",
    label: "Dev Tool",
    shortLabel: "Dev",
    hint: "APIs, infrastructure, CLIs, technical teams",
    matchTerms: ["developer", "dev", "api", "sdk", "cli", "infra", "database", "deploy", "code", "security"],
    badge: "Ship-grade developer experience",
    nav: ["Docs", "API", "Status"],
    cta: "Get API key",
    secondaryCta: "Read docs",
    serif: false,
    radius: "crisp",
    headline: (name) => `${name} gives builders the shortest path from idea to production.`,
    subline: (_name, description) =>
      `A technical launch system for ${description}, with docs, usage, and proof that feel credible to developers.`,
    metrics: [
      { value: "82ms", label: "P95 latency", detail: "edge request median" },
      { value: "12k", label: "API calls", detail: "sandbox traffic this week" },
      { value: "99.9%", label: "Status", detail: "production availability" },
    ],
    featureTitle: "Developers trust products that show the real system.",
    featureIntro: "The preview includes API copy, terminal-like blocks, status cards, and low-friction calls to action.",
    features: [
      { title: "Copy-ready quickstart", body: "Show the first successful request without forcing users to read everything." },
      { title: "Operational proof", body: "Latency, status, and usage metrics make the product feel production-ready." },
      { title: "Sharp docs path", body: "Docs, examples, and API key actions are treated as first-class conversion moments." },
    ],
    proofQuote: "It passed the developer smell test because it looked like there was a real product behind it.",
    proofSource: "Founding engineer",
    dashboardTitle: "API operations",
    dashboardSubtitle: "Latency, request quality, and incidents in one technical cockpit.",
    dashboardPrimary: "P95 latency",
    productTitle: "A developer product preview that shows the working path.",
    productSubtitle: "Code, docs, status, and adoption signals share one coherent brand system.",
    productSteps: ["Create key", "Install SDK", "Send request", "Monitor usage"],
    pricingTitle: "Pricing developers can understand quickly.",
    pricingSubtitle: "Usage-based packaging with clear limits and production trust signals.",
    planNames: ["Build", "Launch"],
  },
  {
    id: "creative",
    label: "Creative",
    shortLabel: "Creative",
    hint: "Studios, campaigns, creators, portfolios",
    matchTerms: ["creative", "studio", "design", "campaign", "creator", "media", "brand", "portfolio", "content"],
    badge: "Campaign-ready studio",
    nav: ["Work", "Services", "Studio"],
    cta: "Book a brief",
    secondaryCta: "View work",
    serif: false,
    radius: "soft",
    headline: (name) => `${name} turns ideas into campaign systems people remember.`,
    subline: (_name, description) =>
      `A visual brand preview for ${description}, with showcase modules, proof, and a clear creative offer.`,
    metrics: [
      { value: "18", label: "Launch assets", detail: "campaign pieces planned" },
      { value: "6.4m", label: "Reach", detail: "projected creative impressions" },
      { value: "31%", label: "Lift", detail: "brand engagement signal" },
    ],
    featureTitle: "A creative brand needs more than a pretty hero.",
    featureIntro: "The preview connects campaign work, case proof, and a commercial next step.",
    features: [
      { title: "Showcase rhythm", body: "Project modules feel curated, not like a generic card wall." },
      { title: "Campaign proof", body: "Metrics and testimonials give creative work commercial weight." },
      { title: "Brief-led CTA", body: "Invite action around a real creative process, not a vague contact button." },
    ],
    proofQuote: "The page looked like a complete studio offer, not a moodboard with buttons.",
    proofSource: "Creative director",
    dashboardTitle: "Campaign studio",
    dashboardSubtitle: "Active briefs, asset progress, and launch readiness across the studio.",
    dashboardPrimary: "Campaign readiness",
    productTitle: "Show the brand as a system of launchable assets.",
    productSubtitle: "A product view for campaigns, portfolios, and creative service offers.",
    productSteps: ["Frame brief", "Build system", "Launch assets", "Measure response"],
    pricingTitle: "Make the creative offer easy to buy.",
    pricingSubtitle: "Package strategy, production, and launch support without losing the premium feel.",
    planNames: ["Sprint", "Studio"],
  },
  {
    id: "mobile",
    label: "Mobile-first app",
    shortLabel: "Mobile",
    hint: "App onboarding, habit loops, mobile products",
    matchTerms: ["mobile", "app", "ios", "android", "phone", "onboarding", "notification", "habit"],
    badge: "Built for the first tap",
    nav: ["App", "Reviews", "Download"],
    cta: "Download app",
    secondaryCta: "Preview flow",
    serif: false,
    radius: "app",
    headline: (name) => `${name} makes the first mobile moment feel instantly useful.`,
    subline: (_name, description) =>
      `A mobile-first brand system for ${description}, designed around onboarding, progress, and repeat use.`,
    metrics: [
      { value: "64%", label: "Activation", detail: "complete first session" },
      { value: "4.8", label: "App rating", detail: "early review average" },
      { value: "7d", label: "Retention", detail: "habit-forming loop" },
    ],
    featureTitle: "A mobile product has to earn attention quickly.",
    featureIntro: "The preview emphasizes thumb-friendly CTAs, app screen hierarchy, and lightweight proof.",
    features: [
      { title: "Onboarding clarity", body: "Guide users through the first value moment in a few readable steps." },
      { title: "App-like rhythm", body: "Use the palette for tabs, cards, progress, and status cues." },
      { title: "Repeat-use proof", body: "Reviews, streaks, and daily states make the experience feel alive." },
    ],
    proofQuote: "It looked like an app people could download today, not a landing page pretending to be one.",
    proofSource: "Mobile growth lead",
    dashboardTitle: "App growth desk",
    dashboardSubtitle: "Activation, reviews, retention, and daily loops for the launch team.",
    dashboardPrimary: "Activation rate",
    productTitle: "Preview the app experience before build starts.",
    productSubtitle: "Onboarding, cards, tabs, and retention cues share one polished identity.",
    productSteps: ["Open app", "Set goal", "Complete first action", "Return tomorrow"],
    pricingTitle: "Make the first upgrade feel natural.",
    pricingSubtitle: "Mobile-friendly packaging for free, premium, and team moments.",
    planNames: ["Free", "Premium"],
  },
]

const TEMPLATE_OPTIONS = TEMPLATES.map(({ id, label, hint }) => ({ id, label, hint }))

const VIEWS: Array<{ id: ViewId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "landing", label: "Landing", icon: LayoutTemplate },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "product", label: "Product", icon: PackageOpen },
  { id: "pricing", label: "CTA", icon: Tags },
]

function safeHex(value: string | undefined, fallback: string): string {
  const candidate = String(value || "").trim().toUpperCase()
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : fallback
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const part = (value: number) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0")
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase()
}

function mix(hexA: string, hexB: string, amount: number): string {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  )
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const light = Math.max(first, second)
  const dark = Math.min(first, second)
  return (light + 0.05) / (dark + 0.05)
}

function readableOn(background: string, preferred?: string): string {
  const dark = "#070707"
  const light = "#FFFFFF"
  if (preferred && contrastRatio(background, preferred) >= 4.5) return preferred
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "brand"
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall through to the textarea fallback for browsers that block Clipboard API.
    }
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  textarea.style.top = "0"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.focus({ preventScroll: true })
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  try {
    const copied = document.execCommand("copy")
    if (!copied) throw new Error("copy command failed")
  } finally {
    document.body.removeChild(textarea)
  }
}

function inferTemplate(brandType?: string, vibe?: string, keywords?: string): TemplateId {
  const haystack = `${brandType || ""} ${vibe || ""} ${keywords || ""}`.toLowerCase()

  if (/\b(mobile|ios|android|phone|app store|push|notification)\b/.test(haystack)) return "mobile"
  if (/\b(dev|developer|api|sdk|cli|infra|database|deploy|code|security)\b/.test(haystack)) return "devtool"
  if (/\b(fintech|finance|bank|payment|payments|money|wealth|invoice|secure|treasury)\b/.test(haystack)) {
    return "fintech"
  }
  if (/\b(luxury|premium|fashion|jewelry|beauty|fragrance|hotel|concierge|atelier)\b/.test(haystack)) {
    return "luxury"
  }
  if (/\b(wellness|health|fitness|therapy|mindful|calm|nutrition|sleep|spa)\b/.test(haystack)) {
    return "wellness"
  }
  if (/\b(creative|studio|design|campaign|creator|media|portfolio|content)\b/.test(haystack)) {
    return "creative"
  }
  if (/\b(consumer|shop|store|clothing|apparel|product|food|eco|sustainable|biodegradable)\b/.test(haystack)) {
    return "consumer"
  }
  if (/\b(saas|ai|automation|analytics|b2b|workflow|productivity)\b/.test(haystack)) return "saas"
  if ((vibe || "").toLowerCase() === "luxury") return "luxury"
  if ((vibe || "").toLowerCase() === "playful") return "consumer"
  return "consumer"
}

function getTemplate(id: TemplateId): TemplateConfig {
  return TEMPLATES.find((template) => template.id === id) || TEMPLATES[0]
}

function normalisePalette(palette: BrandLaunchSandboxProps["palette"]) {
  const primary = safeHex(palette.primary.hex, "#D4AF37")
  const secondary = safeHex(palette.secondary.hex, "#171717")
  const accent = safeHex(palette.accent.hex, "#7DD3C7")
  const background = safeHex(palette.background.hex, "#F7F3E8")
  const rawText = safeHex(palette.text.hex, readableOn(background))
  const text = readableOn(background, rawText)
  const onPrimary = readableOn(primary)
  const onAccent = readableOn(accent)
  const bgIsDark = relativeLuminance(background) < 0.22
  const surface = bgIsDark ? mix(background, "#FFFFFF", 0.08) : mix(background, "#000000", 0.035)
  const surfaceStrong = bgIsDark ? mix(background, "#FFFFFF", 0.14) : mix(background, "#000000", 0.07)
  const muted = mix(text, background, 0.38)
  const faint = mix(text, background, 0.72)
  const line = mix(text, background, bgIsDark ? 0.78 : 0.84)
  const glow = rgba(primary, bgIsDark ? 0.34 : 0.22)

  return {
    primary,
    secondary,
    accent,
    background,
    text,
    onPrimary,
    onAccent,
    surface,
    surfaceStrong,
    muted,
    faint,
    line,
    glow,
    bgIsDark,
  }
}

function buildContext(brandName: string, keywords: string, vibe: string) {
  const cleanName = brandName.trim() || "YourBrand"
  const description = keywords.trim() || `a ${vibe || "modern"} startup brand`
  const capitalisedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
  return {
    name: escapeHtml(capitalisedName),
    rawName: capitalisedName,
    description: escapeHtml(description),
    rawDescription: description,
    vibe: escapeHtml(vibe || "modern"),
  }
}

function cssForTemplate(template: TemplateConfig, tokens: ReturnType<typeof normalisePalette>) {
  const radius =
    template.radius === "editorial" ? "10px" : template.radius === "crisp" ? "12px" : template.radius === "app" ? "22px" : "18px"
  const radiusLarge =
    template.radius === "editorial" ? "18px" : template.radius === "crisp" ? "18px" : template.radius === "app" ? "32px" : "26px"
  const headingFont = template.serif ? 'Georgia, "Times New Roman", serif' : 'Inter, ui-sans-serif, system-ui, sans-serif'

  return `
  :root {
    --bg: ${tokens.background};
    --text: ${tokens.text};
    --muted: ${tokens.muted};
    --faint: ${tokens.faint};
    --primary: ${tokens.primary};
    --secondary: ${tokens.secondary};
    --accent: ${tokens.accent};
    --surface: ${tokens.surface};
    --surface-strong: ${tokens.surfaceStrong};
    --line: ${tokens.line};
    --on-primary: ${tokens.onPrimary};
    --on-accent: ${tokens.onAccent};
    --radius: ${radius};
    --radius-lg: ${radiusLarge};
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; overflow-x: hidden; scrollbar-width: none; }
  html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
  body {
    background:
      radial-gradient(circle at 84% -8%, ${rgba(tokens.primary, 0.2)}, transparent 30%),
      radial-gradient(circle at 10% 18%, ${rgba(tokens.accent, 0.14)}, transparent 26%),
      linear-gradient(135deg, ${rgba(tokens.secondary, tokens.bgIsDark ? 0.2 : 0.08)}, transparent 42%),
      var(--bg);
    color: var(--text);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: 0;
  }

  button, a { font: inherit; }
  button { cursor: pointer; }
  .page { min-height: 100vh; overflow: hidden; position: relative; }
  .page::before {
    background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px);
    background-size: 46px 46px;
    content: "";
    inset: 0;
    opacity: ${tokens.bgIsDark ? 0.2 : 0.36};
    pointer-events: none;
    position: absolute;
    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 74%);
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 74%);
  }
  .nav, .hero, .view-shell, .feature-grid, .proof, .bottom-cta, .dashboard, .product, .pricing { position: relative; z-index: 1; }

  .nav {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    gap: 18px;
    justify-content: space-between;
    padding: 18px clamp(18px, 5vw, 72px);
  }
  .mark { align-items: center; display: flex; gap: 11px; min-width: 0; }
  .logo {
    background: linear-gradient(135deg, var(--primary), var(--accent));
    border-radius: ${template.radius === "editorial" ? "50%" : "12px"};
    box-shadow: 0 16px 42px ${tokens.glow};
    height: 36px;
    width: 36px;
  }
  .brand {
    color: var(--text);
    font-family: ${headingFont};
    font-size: 15px;
    font-weight: ${template.serif ? "500" : "900"};
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nav-links { align-items: center; display: flex; gap: 24px; }
  .nav-links span { color: var(--muted); font-size: 13px; font-weight: 750; }
  .nav-cta, .primary-button, .small-button {
    background: var(--primary);
    border: 0;
    border-radius: var(--radius);
    color: var(--on-primary);
    font-weight: 900;
  }
  .nav-cta { min-height: 40px; padding: 10px 16px; }

  .hero {
    display: grid;
    gap: clamp(28px, 6vw, 72px);
    grid-template-columns: minmax(0, 1.02fr) minmax(280px, 0.98fr);
    padding: clamp(38px, 7vw, 92px) clamp(18px, 5vw, 72px) 40px;
  }
  .badge {
    align-items: center;
    background: ${rgba(tokens.accent, 0.13)};
    border: 1px solid ${rgba(tokens.accent, 0.32)};
    border-radius: 999px;
    color: var(--accent);
    display: inline-flex;
    font-size: 12px;
    font-weight: 900;
    gap: 8px;
    margin-bottom: 22px;
    max-width: 100%;
    padding: 8px 12px;
  }
  .badge::before { background: currentColor; border-radius: 999px; content: ""; height: 7px; width: 7px; }
  h1 {
    color: var(--text);
    font-family: ${headingFont};
    font-size: clamp(38px, 7vw, ${template.serif ? "80px" : "76px"});
    font-weight: ${template.serif ? "500" : "950"};
    letter-spacing: 0;
    line-height: ${template.serif ? "1.03" : "0.98"};
    margin: 0;
    max-width: 820px;
  }
  .lead {
    color: var(--muted);
    font-size: clamp(15px, 2vw, 19px);
    line-height: 1.72;
    margin: 22px 0 0;
    max-width: 620px;
  }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
  .primary-button, .secondary-button {
    align-items: center;
    border-radius: var(--radius);
    display: inline-flex;
    justify-content: center;
    min-height: 48px;
    padding: 14px 20px;
    text-decoration: none;
  }
  .primary-button { box-shadow: 0 22px 48px ${tokens.glow}; }
  .secondary-button {
    background: ${rgba(tokens.text, tokens.bgIsDark ? 0.05 : 0.035)};
    border: 1px solid var(--line);
    color: var(--text);
    font-weight: 850;
  }

  .hero-panel, .glass-panel, .dashboard-card, .product-card, .price-card {
    background: linear-gradient(145deg, ${rgba(tokens.surfaceStrong, 0.92)}, ${rgba(tokens.surface, 0.9)});
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    box-shadow: 0 28px 84px rgba(0,0,0,${tokens.bgIsDark ? 0.38 : 0.14}), inset 0 1px 0 rgba(255,255,255,${tokens.bgIsDark ? 0.08 : 0.32});
  }
  .hero-panel { align-self: center; overflow: hidden; padding: 18px; }
  .panel-header { align-items: center; display: flex; justify-content: space-between; margin-bottom: 16px; }
  .panel-title { color: var(--text); font-size: 13px; font-weight: 900; }
  .status-pill {
    background: ${rgba(tokens.accent, 0.14)};
    border: 1px solid ${rgba(tokens.accent, 0.3)};
    border-radius: 999px;
    color: var(--accent);
    font-size: 10px;
    font-weight: 900;
    padding: 6px 9px;
    text-transform: uppercase;
  }
  .metric-grid { display: grid; gap: 10px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .metric {
    background: ${rgba(tokens.background, tokens.bgIsDark ? 0.58 : 0.72)};
    border: 1px solid var(--line);
    border-radius: var(--radius);
    min-width: 0;
    padding: 15px;
  }
  .metric strong { color: var(--text); display: block; font-size: clamp(18px, 3vw, 26px); line-height: 1; }
  .metric span { color: var(--muted); display: block; font-size: 10px; font-weight: 900; line-height: 1.25; margin-top: 8px; text-transform: uppercase; }
  .metric small { color: var(--faint); display: block; font-size: 10px; line-height: 1.35; margin-top: 7px; }
  .visual-card {
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    margin-top: 12px;
    overflow: hidden;
  }
  .visual-top {
    align-items: center;
    background: linear-gradient(135deg, var(--primary), ${mix(tokens.primary, tokens.accent, 0.42)});
    color: var(--on-primary);
    display: flex;
    justify-content: space-between;
    padding: 15px 16px;
  }
  .visual-body { display: grid; gap: 12px; padding: 16px; }
  .signal-row { align-items: center; display: flex; gap: 10px; }
  .signal-dot { background: var(--accent); border-radius: 999px; height: 10px; width: 10px; }
  .signal-line { background: var(--line); border-radius: 999px; flex: 1; height: 9px; overflow: hidden; }
  .signal-line span { background: var(--primary); border-radius: inherit; display: block; height: 100%; }
  .signal-row:nth-child(2) .signal-line span { width: 64%; }
  .signal-row:nth-child(3) .signal-line span { width: 82%; }
  .signal-row:nth-child(4) .signal-line span { width: 48%; }

  .feature-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 22px clamp(18px, 5vw, 72px) 44px;
  }
  .feature-intro {
    border-top: 1px solid var(--line);
    display: grid;
    gap: 22px;
    grid-template-columns: 0.9fr 1.1fr;
    padding: 48px clamp(18px, 5vw, 72px) 8px;
  }
  .feature-intro h2, .bottom-cta h2, .dashboard h2, .product h2, .pricing h2 {
    color: var(--text);
    font-family: ${headingFont};
    font-size: clamp(28px, 4.2vw, 50px);
    font-weight: ${template.serif ? "500" : "950"};
    line-height: 1.05;
    margin: 0;
  }
  .feature-intro p, .bottom-cta p, .dashboard p, .product p, .pricing p {
    color: var(--muted);
    font-size: 15px;
    line-height: 1.72;
    margin: 0;
  }
  .feature-card {
    background: ${rgba(tokens.surface, 0.86)};
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 18px;
  }
  .feature-card b { color: var(--text); display: block; font-size: 15px; margin-bottom: 8px; }
  .feature-card span { color: var(--muted); display: block; font-size: 13px; line-height: 1.6; }

  .proof {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.45fr);
    padding: 0 clamp(18px, 5vw, 72px) 44px;
  }
  .quote {
    background: ${rgba(tokens.primary, 0.09)};
    border: 1px solid ${rgba(tokens.primary, 0.22)};
    border-radius: var(--radius-lg);
    color: var(--text);
    font-size: clamp(18px, 2.6vw, 28px);
    font-weight: ${template.serif ? "500" : "850"};
    line-height: 1.28;
    padding: clamp(22px, 4vw, 34px);
  }
  .quote small { color: var(--muted); display: block; font-size: 12px; font-weight: 850; margin-top: 18px; }
  .proof-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 22px; }
  .proof-card strong { color: var(--text); display: block; font-size: 28px; }
  .proof-card span { color: var(--muted); display: block; font-size: 13px; line-height: 1.55; margin-top: 8px; }

  .bottom-cta {
    background: linear-gradient(135deg, ${rgba(tokens.primary, 0.14)}, ${rgba(tokens.accent, 0.11)});
    border-top: 1px solid var(--line);
    padding: 42px clamp(18px, 5vw, 72px);
    text-align: center;
  }
  .bottom-cta h2 { margin: 0 auto; max-width: 780px; }
  .bottom-cta p { margin: 14px auto 0; max-width: 610px; }
  .bottom-cta .primary-button { margin-top: 22px; }

  .view-shell, .dashboard, .product, .pricing { padding: clamp(28px, 5vw, 58px) clamp(18px, 5vw, 72px); }
  .view-kicker { color: var(--accent); font-size: 12px; font-weight: 900; letter-spacing: 0.1em; margin-bottom: 12px; text-transform: uppercase; }
  .dashboard-layout, .product-layout, .pricing-layout { display: grid; gap: 18px; grid-template-columns: 0.82fr 1.18fr; margin-top: 28px; }
  .dashboard-card, .product-card, .price-card { padding: 20px; }
  .dashboard-stack { display: grid; gap: 12px; }
  .big-number { color: var(--text); font-size: clamp(34px, 6vw, 62px); font-weight: 950; line-height: 1; }
  .progress { background: var(--line); border-radius: 999px; height: 10px; margin-top: 18px; overflow: hidden; }
  .progress span { background: linear-gradient(90deg, var(--primary), var(--accent)); border-radius: inherit; display: block; height: 100%; width: 74%; }
  .activity { display: grid; gap: 10px; margin-top: 18px; }
  .activity-row { align-items: center; background: ${rgba(tokens.background, tokens.bgIsDark ? 0.5 : 0.68)}; border: 1px solid var(--line); border-radius: var(--radius); display: flex; gap: 12px; padding: 12px; }
  .activity-dot { background: var(--primary); border-radius: 999px; height: 10px; width: 10px; }
  .activity-row b { color: var(--text); display: block; font-size: 13px; }
  .activity-row span { color: var(--muted); display: block; font-size: 11px; margin-top: 2px; }
  .chart { align-items: end; display: grid; gap: 8px; grid-template-columns: repeat(8, 1fr); height: 180px; margin-top: 18px; }
  .chart span { background: linear-gradient(180deg, var(--accent), var(--primary)); border-radius: 999px 999px 8px 8px; min-height: 28px; }
  .chart span:nth-child(1) { height: 42%; opacity: 0.58; }
  .chart span:nth-child(2) { height: 66%; opacity: 0.72; }
  .chart span:nth-child(3) { height: 48%; opacity: 0.64; }
  .chart span:nth-child(4) { height: 78%; opacity: 0.82; }
  .chart span:nth-child(5) { height: 56%; opacity: 0.68; }
  .chart span:nth-child(6) { height: 88%; opacity: 0.9; }
  .chart span:nth-child(7) { height: 70%; opacity: 0.78; }
  .chart span:nth-child(8) { height: 94%; opacity: 1; }

  .product-steps { display: grid; gap: 12px; margin-top: 22px; }
  .step { align-items: start; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); display: grid; gap: 12px; grid-template-columns: 36px 1fr; padding: 14px; }
  .step-index { align-items: center; background: var(--primary); border-radius: 12px; color: var(--on-primary); display: flex; font-size: 13px; font-weight: 950; height: 36px; justify-content: center; width: 36px; }
  .step b { color: var(--text); display: block; font-size: 14px; }
  .step span { color: var(--muted); display: block; font-size: 12px; line-height: 1.45; margin-top: 4px; }
  .mock-window { background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; }
  .mock-head { align-items: center; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; padding: 13px 15px; }
  .mock-head b { color: var(--text); font-size: 13px; }
  .mock-body { display: grid; gap: 12px; padding: 16px; }
  .mock-tile { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; }
  .mock-tile strong { color: var(--text); display: block; font-size: 14px; }
  .mock-tile p { color: var(--muted); font-size: 12px; line-height: 1.5; margin-top: 6px; }

  .pricing-layout { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .price-card.featured { border-color: ${rgba(tokens.primary, 0.44)}; box-shadow: 0 30px 80px ${rgba(tokens.primary, 0.16)}; }
  .price-name { color: var(--muted); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .price { color: var(--text); font-size: clamp(36px, 6vw, 66px); font-weight: 950; line-height: 1; margin-top: 16px; }
  .price span { color: var(--muted); font-size: 14px; font-weight: 800; }
  .included { display: grid; gap: 11px; margin-top: 22px; }
  .included div { align-items: center; color: var(--muted); display: flex; font-size: 13px; gap: 9px; }
  .included div::before { background: var(--accent); border-radius: 999px; content: ""; height: 8px; width: 8px; }
  .small-button { display: inline-flex; justify-content: center; margin-top: 24px; min-height: 44px; padding: 12px 16px; text-decoration: none; width: 100%; }

  @media (max-width: 760px) {
    .nav { padding: 15px 16px; }
    .nav-links { display: none; }
    .nav-cta { font-size: 12px; min-height: 38px; padding: 9px 11px; }
    .logo { height: 32px; width: 32px; }
    .brand { font-size: 14px; }
    .hero { display: block; padding: 30px 16px 26px; }
    .badge { font-size: 11px; margin-bottom: 18px; }
    h1 { font-size: 36px; line-height: 1.04; }
    .lead { font-size: 14px; line-height: 1.62; }
    .actions { gap: 9px; margin-top: 22px; }
    .primary-button, .secondary-button { flex: 1 1 136px; font-size: 13px; min-height: 44px; padding: 12px 11px; }
    .hero-panel { margin-top: 28px; padding: 12px; }
    .metric-grid { gap: 8px; }
    .metric { padding: 11px 8px; }
    .metric strong { font-size: 17px; }
    .metric span { font-size: 8px; }
    .metric small { display: none; }
    .visual-top { padding: 13px; }
    .visual-body { padding: 13px; }
    .feature-intro { display: block; padding: 34px 16px 4px; }
    .feature-intro p { margin-top: 12px; }
    .feature-grid { grid-template-columns: 1fr; padding: 18px 16px 32px; }
    .proof { grid-template-columns: 1fr; padding: 0 16px 34px; }
    .proof-card { padding: 18px; }
    .bottom-cta { padding: 34px 16px; }
    .view-shell, .dashboard, .product, .pricing { padding: 30px 16px; }
    .dashboard-layout, .product-layout, .pricing-layout { grid-template-columns: 1fr; margin-top: 22px; }
    .dashboard-card, .product-card, .price-card { padding: 16px; }
    .chart { height: 132px; }
    .big-number { font-size: 38px; }
  }

  @media (max-width: 420px) {
    .nav { gap: 10px; padding: 13px 14px; }
    .mark { gap: 9px; }
    .logo { height: 30px; width: 30px; }
    .brand { font-size: 13px; }
    .nav-cta { font-size: 11px; min-height: 36px; padding: 8px 10px; }
    .hero { padding: 24px 14px 22px; }
    .badge { font-size: 10px; margin-bottom: 14px; padding: 7px 10px; }
    h1 {
      font-size: clamp(30px, 8.7vw, 34px);
      line-height: 1.06;
      max-width: 13ch;
      text-wrap: balance;
    }
    .lead { font-size: 13px; line-height: 1.55; margin-top: 16px; }
    .actions { display: grid; gap: 8px; grid-template-columns: 1fr; margin-top: 18px; }
    .primary-button, .secondary-button {
      min-height: 42px;
      padding: 11px 12px;
      width: 100%;
    }
    .hero-panel { margin-top: 22px; padding: 10px; }
    .panel-header { margin-bottom: 12px; }
    .feature-intro { padding: 30px 14px 4px; }
    .feature-grid { padding: 16px 14px 28px; }
    .proof { padding: 0 14px 30px; }
    .bottom-cta { padding: 30px 14px; }
    .view-shell, .dashboard, .product, .pricing { padding: 26px 14px; }
  }
`
}

function renderNav(config: TemplateConfig, ctx: ReturnType<typeof buildContext>) {
  return `
    <nav class="nav">
      <div class="mark">
        <span class="logo"></span>
        <span class="brand">${ctx.name}</span>
      </div>
      <div class="nav-links">
        ${config.nav.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <button class="nav-cta">${escapeHtml(config.cta)}</button>
    </nav>`
}

function renderMetrics(metrics: Metric[]) {
  return metrics
    .map(
      (metric) => `
      <div class="metric">
        <strong>${escapeHtml(metric.value)}</strong>
        <span>${escapeHtml(metric.label)}</span>
        <small>${escapeHtml(metric.detail)}</small>
      </div>`,
    )
    .join("")
}

function renderHeroPanel(config: TemplateConfig, ctx: ReturnType<typeof buildContext>) {
  return `
    <aside class="hero-panel" aria-label="${ctx.name} product preview">
      <div class="panel-header">
        <span class="panel-title">${ctx.name} launch board</span>
        <span class="status-pill">Live</span>
      </div>
      <div class="metric-grid">${renderMetrics(config.metrics)}</div>
      <div class="visual-card">
        <div class="visual-top">
          <strong>${escapeHtml(config.dashboardPrimary)}</strong>
          <span>${escapeHtml(config.shortLabel)}</span>
        </div>
        <div class="visual-body">
          <div class="signal-row"><span class="signal-dot"></span><span class="signal-line"><span style="width: 74%"></span></span></div>
          <div class="signal-row"><span class="signal-dot"></span><span class="signal-line"><span></span></span></div>
          <div class="signal-row"><span class="signal-dot"></span><span class="signal-line"><span></span></span></div>
          <div class="signal-row"><span class="signal-dot"></span><span class="signal-line"><span></span></span></div>
        </div>
      </div>
    </aside>`
}

function renderLanding(config: TemplateConfig, ctx: ReturnType<typeof buildContext>) {
  return `
    ${renderNav(config, ctx)}
    <section class="hero">
      <div>
        <div class="badge">${escapeHtml(config.badge)}</div>
        <h1>${escapeHtml(config.headline(ctx.rawName, ctx.rawDescription))}</h1>
        <p class="lead">${escapeHtml(config.subline(ctx.rawName, ctx.rawDescription))}</p>
        <div class="actions">
          <a class="primary-button" href="#">${escapeHtml(config.cta)}</a>
          <a class="secondary-button" href="#">${escapeHtml(config.secondaryCta)}</a>
        </div>
      </div>
      ${renderHeroPanel(config, ctx)}
    </section>
    <section class="feature-intro">
      <h2>${escapeHtml(config.featureTitle)}</h2>
      <p>${escapeHtml(config.featureIntro)}</p>
    </section>
    <section class="feature-grid">
      ${config.features
        .map(
          (feature) => `
        <article class="feature-card">
          <b>${escapeHtml(feature.title)}</b>
          <span>${escapeHtml(feature.body)}</span>
        </article>`,
        )
        .join("")}
    </section>
    <section class="proof">
      <blockquote class="quote">
        "${escapeHtml(config.proofQuote)}"
        <small>${escapeHtml(config.proofSource)}</small>
      </blockquote>
      <div class="proof-card">
        <strong>${escapeHtml(config.metrics[1].value)}</strong>
        <span>${escapeHtml(config.metrics[1].label)} - ${escapeHtml(config.metrics[1].detail)}.</span>
      </div>
    </section>
    <section class="bottom-cta">
      <h2>Give ${ctx.name} a brand system that already feels launch-ready.</h2>
      <p>${escapeHtml(config.pricingSubtitle)}</p>
      <a class="primary-button" href="#">${escapeHtml(config.cta)}</a>
    </section>`
}

function renderDashboard(config: TemplateConfig, ctx: ReturnType<typeof buildContext>) {
  const activity = config.features.map((feature, index) => ({
    title: feature.title,
    body: index === 0 ? config.metrics[0].detail : feature.body,
  }))

  return `
    ${renderNav(config, ctx)}
    <section class="dashboard">
      <div class="view-kicker">${escapeHtml(config.shortLabel)} dashboard</div>
      <h2>${escapeHtml(config.dashboardTitle)}</h2>
      <p class="lead">${escapeHtml(config.dashboardSubtitle)}</p>
      <div class="dashboard-layout">
        <article class="dashboard-card">
          <span class="price-name">${escapeHtml(config.dashboardPrimary)}</span>
          <div class="big-number">${escapeHtml(config.metrics[0].value)}</div>
          <p>${escapeHtml(config.metrics[0].label)} - ${escapeHtml(config.metrics[0].detail)}.</p>
          <div class="progress"><span></span></div>
          <div class="activity">
            ${activity
              .map(
                (item) => `
                <div class="activity-row">
                  <span class="activity-dot"></span>
                  <div><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.body)}</span></div>
                </div>`,
              )
              .join("")}
          </div>
        </article>
        <article class="dashboard-card">
          <span class="price-name">${ctx.name} signal trend</span>
          <div class="chart">${Array.from({ length: 8 }, () => "<span></span>").join("")}</div>
          <div class="metric-grid" style="margin-top: 18px;">${renderMetrics(config.metrics)}</div>
        </article>
      </div>
    </section>`
}

function renderProduct(config: TemplateConfig, ctx: ReturnType<typeof buildContext>) {
  return `
    ${renderNav(config, ctx)}
    <section class="product">
      <div class="view-kicker">${escapeHtml(config.shortLabel)} product flow</div>
      <h2>${escapeHtml(config.productTitle)}</h2>
      <p class="lead">${escapeHtml(config.productSubtitle)}</p>
      <div class="product-layout">
        <article class="product-card">
          <div class="product-steps">
            ${config.productSteps
              .map(
                (step, index) => `
                <div class="step">
                  <span class="step-index">${index + 1}</span>
                  <div>
                    <b>${escapeHtml(step)}</b>
                    <span>${escapeHtml(index === 0 ? ctx.rawDescription : config.features[index % config.features.length].body)}</span>
                  </div>
                </div>`,
              )
              .join("")}
          </div>
        </article>
        <article class="mock-window">
          <div class="mock-head">
            <b>${ctx.name} product surface</b>
            <span class="status-pill">Active</span>
          </div>
          <div class="mock-body">
            ${config.features
              .map(
                (feature, index) => `
                <div class="mock-tile">
                  <strong>${escapeHtml(feature.title)}</strong>
                  <p>${escapeHtml(feature.body)}</p>
                  <div class="progress"><span style="width: ${index === 0 ? 86 : index === 1 ? 62 : 74}%"></span></div>
                </div>`,
              )
              .join("")}
          </div>
        </article>
      </div>
    </section>`
}

function renderPricing(config: TemplateConfig, ctx: ReturnType<typeof buildContext>) {
  return `
    ${renderNav(config, ctx)}
    <section class="pricing">
      <div class="view-kicker">${escapeHtml(config.shortLabel)} offer</div>
      <h2>${escapeHtml(config.pricingTitle)}</h2>
      <p class="lead">${escapeHtml(config.pricingSubtitle)}</p>
      <div class="pricing-layout">
        <article class="price-card">
          <span class="price-name">${escapeHtml(config.planNames[0])}</span>
          <div class="price">Free <span>/ launch</span></div>
          <p>Validate ${ctx.name} with a polished first impression and a focused path to action.</p>
          <div class="included">
            <div>${escapeHtml(config.features[0].title)}</div>
            <div>${escapeHtml(config.metrics[0].label)}</div>
            <div>Mobile-ready brand preview</div>
          </div>
          <a class="small-button" href="#">${escapeHtml(config.secondaryCta)}</a>
        </article>
        <article class="price-card featured">
          <span class="price-name">${escapeHtml(config.planNames[1])}</span>
          <div class="price">Pro <span>/ ready</span></div>
          <p>Package the brand, product story, proof, and CTA into one premium launch system.</p>
          <div class="included">
            <div>${escapeHtml(config.features[1].title)}</div>
            <div>${escapeHtml(config.metrics[1].label)}</div>
            <div>${escapeHtml(config.features[2].title)}</div>
          </div>
          <a class="small-button" href="#">${escapeHtml(config.cta)}</a>
        </article>
      </div>
    </section>
    <section class="bottom-cta">
      <h2>Make ${ctx.name} feel funded before the first customer lands.</h2>
      <p>${escapeHtml(config.proofQuote)}</p>
      <a class="primary-button" href="#">${escapeHtml(config.cta)}</a>
    </section>`
}

function buildSandboxHtml({
  brandName,
  keywords,
  vibe,
  template,
  view,
  palette,
}: {
  brandName: string
  keywords: string
  vibe: string
  template: TemplateId
  view: ViewId
  palette: BrandLaunchSandboxProps["palette"]
}): string {
  const config = getTemplate(template)
  const tokens = normalisePalette(palette)
  const ctx = buildContext(brandName, keywords, vibe)
  const pageTitle = `${ctx.rawName} ${config.label} ${view} preview`
  const viewHtml =
    view === "dashboard"
      ? renderDashboard(config, ctx)
      : view === "product"
        ? renderProduct(config, ctx)
        : view === "pricing"
          ? renderPricing(config, ctx)
          : renderLanding(config, ctx)

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(pageTitle)}</title>
<style>
${cssForTemplate(config, tokens)}
</style>
</head>
<body>
  <main class="page">
    ${viewHtml}
  </main>
</body>
</html>`
}

export function BrandLaunchSandbox({
  brandName,
  keywords,
  vibe,
  brandType,
  variantName,
  palette,
}: BrandLaunchSandboxProps) {
  const inferredTemplate = useMemo(() => inferTemplate(brandType, vibe, keywords), [brandType, vibe, keywords])
  const [template, setTemplate] = useState<TemplateId>(inferredTemplate)
  const [view, setView] = useState<ViewId>("landing")
  const [device, setDevice] = useState<DeviceId>("desktop")
  const [mobileFrameScale, setMobileFrameScale] = useState(1)
  const [copiedHtml, setCopiedHtml] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const mobileStageRef = useRef<HTMLDivElement>(null)
  const deviceWasChosenRef = useRef(false)

  useEffect(() => {
    setTemplate(inferredTemplate)
  }, [inferredTemplate, brandName])

  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 640px)")
    const syncDefaultDevice = () => {
      if (!deviceWasChosenRef.current) {
        setDevice(mobileViewport.matches ? "mobile" : "desktop")
      }
    }

    syncDefaultDevice()
    mobileViewport.addEventListener("change", syncDefaultDevice)
    return () => mobileViewport.removeEventListener("change", syncDefaultDevice)
  }, [])

  useEffect(() => {
    if (device !== "mobile") return

    const stage = mobileStageRef.current
    if (!stage) return

    const updateScale = () => {
      const nextScale = Math.min(1, stage.clientWidth / MOBILE_FRAME_WIDTH)
      setMobileFrameScale((currentScale) =>
        Math.abs(currentScale - nextScale) < 0.001 ? currentScale : nextScale,
      )
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [device])

  const html = useMemo(
    () => buildSandboxHtml({ brandName, keywords, vibe, template, view, palette }),
    [brandName, keywords, vibe, template, view, palette],
  )

  const tokens = useMemo(() => normalisePalette(palette), [palette])
  const currentTemplate = getTemplate(template)
  const currentView = VIEWS.find((item) => item.id === view) || VIEWS[0]

  async function copyHtml() {
    setActionError(null)
    try {
      await copyText(html)
      trackEvent({
        action: "brand_export_clicked",
        metadata: { source: "brand_launch_sandbox_copy_html", brandName, template, view, device },
      })
      setCopiedHtml(true)
      window.setTimeout(() => setCopiedHtml(false), 2200)
    } catch {
      setActionError("Copy failed. Your browser blocked clipboard access.")
    }
  }

  async function downloadPng() {
    setDownloading(true)
    setActionError(null)

    try {
      const iframe = iframeRef.current
      const doc = iframe?.contentDocument
      const target = doc?.body
      if (!target || !doc) throw new Error("Preview is still loading.")

      await doc.fonts?.ready
      const html2canvas = (await import("html2canvas")).default
      const width = Math.max(doc.documentElement.scrollWidth, target.scrollWidth, 320)
      const height = Math.max(doc.documentElement.scrollHeight, target.scrollHeight, 520)
      const canvas = await html2canvas(target, {
        backgroundColor: tokens.background,
        scale: 2,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        useCORS: true,
      })
      const link = document.createElement("a")
      link.download = `${slugify(brandName)}-${template}-${view}-${device}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      trackEvent({
        action: "brand_export_clicked",
        metadata: { source: "brand_launch_sandbox_download_png", brandName, template, view, device },
      })
    } catch {
      setActionError("PNG export failed. Try switching device view and exporting again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section
      data-testid="brand-launch-sandbox"
      className="min-w-0 overflow-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018))",
        border: `1px solid ${rgba(tokens.primary, 0.24)}`,
        boxShadow: "0 28px 80px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="px-4 py-4 sm:px-5"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: `radial-gradient(circle at 12% 0%, ${rgba(tokens.primary, 0.18)}, transparent 34%), rgba(5,5,5,0.46)`,
        }}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: rgba(tokens.primary, 0.13),
                border: `1px solid ${rgba(tokens.primary, 0.34)}`,
                color: tokens.primary,
              }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white sm:text-base">Brand Launch Sandbox</h3>
              <p className="mt-0.5 truncate text-[11px] font-medium text-white/38">
                {variantName ? `${variantName} - ` : ""}
                Industry-aware startup previews using your active palette
              </p>
            </div>
          </div>

          <div className="grid min-w-0 gap-3">
            <div className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
              {TEMPLATE_OPTIONS.map((item) => {
                const isActive = item.id === template
                return (
                  <button
                    key={item.id}
                    onClick={() => setTemplate(item.id)}
                    aria-pressed={isActive}
                    className="min-h-10 shrink-0 snap-start rounded-xl px-3 py-2 text-[11px] font-black transition-all focus:outline-none focus:ring-2 focus:ring-white/30"
                    style={
                      isActive
                        ? {
                            background: rgba(tokens.primary, 0.17),
                            border: `1px solid ${rgba(tokens.primary, 0.42)}`,
                            color: tokens.primary,
                            boxShadow: `0 10px 28px ${rgba(tokens.primary, 0.13)}`,
                          }
                        : {
                            background: "rgba(255,255,255,0.035)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.46)",
                          }
                    }
                    title={item.hint}
                    type="button"
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className="grid min-w-0 gap-2">
              <div
                className="flex min-w-0 gap-1 overflow-x-auto rounded-xl p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {VIEWS.map((item) => {
                  const Icon = item.icon
                  const isActive = item.id === view
                  return (
                    <button
                      key={item.id}
                      onClick={() => setView(item.id)}
                      aria-pressed={isActive}
                      className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-black transition-all focus:outline-none focus:ring-2 focus:ring-white/25"
                      style={
                        isActive
                          ? {
                              background: rgba(tokens.primary, 0.15),
                              border: `1px solid ${rgba(tokens.primary, 0.36)}`,
                              color: tokens.primary,
                            }
                          : {
                              border: "1px solid transparent",
                              color: "rgba(255,255,255,0.4)",
                            }
                      }
                      type="button"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="grid min-w-0 gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                <div
                  className="flex min-w-0 rounded-xl p-1"
                  style={{
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {([
                    { id: "mobile", label: "Mobile", icon: Smartphone },
                    { id: "desktop", label: "Desktop", icon: Monitor },
                  ] as const).map((item) => {
                    const Icon = item.icon
                    const isActive = item.id === device
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          deviceWasChosenRef.current = true
                          setDevice(item.id)
                        }}
                        aria-label={`${item.label} preview`}
                        aria-pressed={isActive}
                        className="flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-black transition-all focus:outline-none focus:ring-2 focus:ring-white/25"
                        style={
                          isActive
                            ? {
                                background: "rgba(255,255,255,0.1)",
                                border: "1px solid rgba(255,255,255,0.16)",
                                color: "rgba(255,255,255,0.92)",
                              }
                            : {
                                border: "1px solid transparent",
                                color: "rgba(255,255,255,0.36)",
                              }
                        }
                        type="button"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <button
                    onClick={copyHtml}
                    className="flex min-h-10 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-black transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/25"
                    style={{
                      background: copiedHtml ? "rgba(52,211,153,0.13)" : rgba(tokens.primary, 0.13),
                      border: copiedHtml ? "1px solid rgba(52,211,153,0.3)" : `1px solid ${rgba(tokens.primary, 0.28)}`,
                      color: copiedHtml ? "#34d399" : tokens.primary,
                    }}
                    type="button"
                  >
                    {copiedHtml ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Code2 className="h-3.5 w-3.5 shrink-0" />}
                    <span>{copiedHtml ? "Copied" : "Copy HTML"}</span>
                  </button>
                  <button
                    onClick={downloadPng}
                    disabled={downloading}
                    className="flex min-h-10 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-black transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/25 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.accent})`,
                      boxShadow: `0 12px 30px ${rgba(tokens.primary, 0.22)}`,
                      color: readableOn(mix(tokens.primary, tokens.accent, 0.42)),
                    }}
                    type="button"
                  >
                    {downloading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Download className="h-3.5 w-3.5 shrink-0" />}
                    <span>{downloading ? "Exporting" : "Download PNG"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 p-2 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
            <LayoutTemplate className="h-3.5 w-3.5" style={{ color: tokens.primary }} />
            {currentTemplate.label} - {currentView.label}
          </div>
          <div className="flex items-center gap-1.5">
            {[tokens.background, tokens.primary, tokens.accent, tokens.secondary, tokens.text].map((hex, index) => (
              <span
                key={`${hex}-${index}`}
                className="h-3.5 w-3.5 rounded-full"
                style={{
                  background: hex,
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              />
            ))}
          </div>
        </div>

        <div
          ref={device === "mobile" ? mobileStageRef : undefined}
          className={device === "mobile" ? "relative mx-auto w-full overflow-hidden" : "w-full min-w-0"}
          style={
            device === "mobile"
              ? {
                  height: MOBILE_FRAME_HEIGHT * mobileFrameScale,
                  maxWidth: MOBILE_FRAME_WIDTH,
                  transition: "height 220ms ease, max-width 220ms ease",
                }
              : { transition: "max-width 220ms ease" }
          }
        >
          <div
            className={device === "mobile" ? "absolute left-0 top-0 overflow-hidden" : "overflow-hidden"}
            style={{
              background: "#020202",
              boxSizing: device === "mobile" ? "content-box" : "border-box",
              border:
                device === "mobile"
                  ? "5px solid rgba(255,255,255,0.11)"
                  : "1px solid rgba(255,255,255,0.12)",
              borderRadius: device === "mobile" ? 34 : 18,
              boxShadow: "0 30px 90px rgba(0,0,0,0.54), inset 0 1px 0 rgba(255,255,255,0.08)",
              // A legacy global mobile rule caps every div at max-width: 100%.
              // The phone frame must retain its 390px design canvas and then
              // scale once to the stage width; otherwise it is constrained and
              // transformed, producing a visibly undersized double-scale.
              maxWidth: device === "mobile" ? "none" : undefined,
              transform: device === "mobile" ? `scale(${mobileFrameScale})` : undefined,
              transformOrigin: device === "mobile" ? "top left" : undefined,
              width: device === "mobile" ? MOBILE_VIEWPORT_WIDTH : "100%",
            }}
          >
            <div
              className="flex items-center justify-between gap-3 px-3 py-2"
              style={{
                background:
                  device === "mobile"
                    ? "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))"
                    : "rgba(10,10,10,0.9)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-1.5">
                {device === "desktop" ? (
                  ["#ff5f57", "#ffbc2e", "#28c840"].map((color) => (
                    <span key={color} className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  ))
                ) : (
                  <span className="h-5 w-16 rounded-full bg-black" />
                )}
              </div>
              <span className="min-w-0 truncate rounded-full px-3 py-1 text-[10px] font-bold text-white/40">
                {slugify(brandName)}.com/{view}
              </span>
              <div className="h-5 w-10" />
            </div>

            <iframe
              ref={iframeRef}
              title={`${brandName || "Brand"} ${currentTemplate.label} ${currentView.label} sandbox`}
              srcDoc={html}
              sandbox="allow-same-origin"
              className="block w-full border-0"
              style={{
                background: tokens.background,
                height: device === "mobile" ? MOBILE_IFRAME_HEIGHT : 620,
              }}
            />
          </div>
        </div>

        {actionError && (
          <p
            className="mt-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-red-300"
            style={{ background: "rgba(248,113,113,0.09)" }}
          >
            {actionError}
          </p>
        )}
      </div>

      <div className="border-t border-white/5 p-3 sm:p-4">
        <StitchPrompt
          brandName={brandName}
          keywords={keywords}
          vibe={vibe}
          palette={palette}
          compact
          templateLabel={currentTemplate.label}
          viewLabel={currentView.label}
          brandType={brandType || currentTemplate.label}
        />
      </div>
    </section>
  )
}
