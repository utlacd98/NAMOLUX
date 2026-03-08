export type TemplateId = "A" | "B" | "C" | "D" | "E"
export type PlatformId = "instagram" | "facebook" | "linkedin" | "twitter"

export interface PostConfig {
  template: TemplateId
  platform: PlatformId
  headline: string
  subtitle: string
  ctaText: string
  ctaUrl: string
  bgColor: string
  accentColor: string
  headlineFontSize: number
  bodyFontSize: number
  screenshots: string[]
  // Template A
  features: string[]
  // Template B
  domainName: string
  score: number
  scoreLabel: string
  traits: string[]
  // Template C
  competitor: string
  ourFeatures: string[]
  theirFeatures: string[]
  // Template D
  statNumber: string
  statLabel: string
  // Template E
  tips: string[]
}

export interface PlatformConfig {
  width: number
  height: number
  label: string
  caption: string
}

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  instagram: {
    width: 1080,
    height: 1080,
    label: "Instagram",
    caption:
      "🚀 Stop wasting hours in Canva trying domain names that are already taken.\n\nNamoLux generates AI-scored domain names in seconds — with live .com availability, Founder Signal™ scoring, and name origin insights.\n\n✅ Free to try → namolux.com\n\n#startupnames #domainname #founderlife #saas #startup #branding",
  },
  facebook: {
    width: 1200,
    height: 630,
    label: "Facebook",
    caption:
      "Looking for a domain name that actually converts? NamoLux scores every AI-generated name 0–100 using Founder Signal™ — checking memorability, brandability, SEO value, and more.\n\nFind your domain in seconds. Free to try at namolux.com",
  },
  linkedin: {
    width: 1200,
    height: 1200,
    label: "LinkedIn",
    caption:
      "Founders: your domain name is your first brand impression. Don't settle.\n\nNamoLux generates AI-scored startup names with live .com availability checks and Founder Signal™ analysis — so you know exactly how strong your name is before you register it.\n\n🔗 Try it free: namolux.com",
  },
  twitter: {
    width: 1200,
    height: 675,
    label: "X / Twitter",
    caption:
      "Your domain name = your brand's first impression.\n\nNamoLux generates AI-scored .com names in seconds with live availability checks.\n\nFree → namolux.com",
  },
}

export const PREVIEW_WIDTH = 520

export const DEFAULT_CONFIG: PostConfig = {
  template: "A",
  platform: "facebook",
  headline: "Find a domain worth\nbuilding a company on.",
  subtitle: "AI-powered startup names with live availability",
  ctaText: "TRY IT FREE →",
  ctaUrl: "NAMOLUX.COM",
  bgColor: "#080808",
  accentColor: "#D4AF37",
  headlineFontSize: 44,
  bodyFontSize: 16,
  screenshots: [],
  features: [
    "Generate startup names in seconds.",
    "Founder Signal™ scoring.",
    "Instant domain availability checks.",
  ],
  domainName: "CloudSync.io",
  score: 95,
  scoreLabel: "Elite Brand Score",
  traits: [
    "Short & brandable (≤6 chars)",
    "Easy to pronounce",
    "Highly memorable",
    "Strong tech extension (.io)",
    "Low brand risk — unique positioning",
  ],
  competitor: "Namelix",
  ourFeatures: [
    "Founder Signal™ 0–100 scoring",
    "Live .com availability",
    "Name origin & brand fit",
    "SEO potential analysis",
    "Bulk domain check",
  ],
  theirFeatures: [
    "Basic name generation only",
    "No real-time availability",
    "No brand scoring",
    "No SEO insights",
    "No bulk check",
  ],
  statNumber: "10,000+",
  statLabel: "startup names generated and scored",
  tips: [
    "Keep it under 10 characters — shorter names stick.",
    "Avoid hyphens and numbers in .com domains.",
    "Check trademark conflicts before you register.",
    "Test pronunciation with 5 people before committing.",
    "Use Founder Signal™ score to rank your shortlist.",
  ],
}

export interface Preset {
  id: string
  name: string
  config: PostConfig
  createdAt: string
}
