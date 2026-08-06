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
      "Bring your shortlist. Make the call with evidence.\n\nNamoLux checks up to 50 candidates across six domain extensions, then Founder Signal helps you compare the names worth pursuing.\n\nStart free → namolux.com/bulk-domain-check\n\n#startupnames #domainname #founderlife #saas #startup #branding",
  },
  facebook: {
    width: 1200,
    height: 630,
    label: "Facebook",
    caption:
      "Looking for a business name you can defend? NamoLux turns a shortlist into a clear decision: check domains across six extensions, then use Founder Signal for an explained score.\n\nStart free at namolux.com/bulk-domain-check",
  },
  linkedin: {
    width: 1200,
    height: 1200,
    label: "LinkedIn",
    caption:
      "Founders: your domain name is your first brand impression. Don't settle.\n\nNamoLux gives you one place to check a shortlist, see live domain states, and use Founder Signal when you are ready to compare the evidence.\n\nTry Bulk Check free: namolux.com/bulk-domain-check",
  },
  twitter: {
    width: 1200,
    height: 675,
    label: "X / Twitter",
    caption:
      "Your domain name = your brand's first impression.\n\nBring the candidates you already have, check domains in one view, then score the shortlist only when you choose.\n\nFree → namolux.com/bulk-domain-check",
  },
}

export const PREVIEW_WIDTH = 520

export const DEFAULT_CONFIG: PostConfig = {
  template: "A",
  platform: "instagram",
  headline: "CHECK THE NAMES\nWORTH BUILDING\nA COMPANY ON.",
  subtitle: "Bulk domain checks with Founder Signal decision support",
  ctaText: "TRY IT FREE →",
  ctaUrl: "NAMOLUX.COM",
  bgColor: "#080808",
  accentColor: "#D4AF37",
  headlineFontSize: 52,
  bodyFontSize: 17,
  screenshots: [],
  features: [
    "3 free Bulk Check runs each month.",
    "1 free Founder Signal run each month.",
    "Live checks across six domain extensions.",
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
    "Founder Signal scoring",
    "Live availability across six TLDs",
    "Up to 50 candidates per check",
    "Saved decision workspace",
    "CSV exports and reports",
    "Bulk domain check",
  ],
  theirFeatures: [
    "Compare the details on each tool",
    "Confirm current availability",
    "Review the scoring method",
    "Check the available extensions",
    "Bring a shortlist to compare",
    "Use independent legal checks",
  ],
  statNumber: "10,000+",
  statLabel: "startup names explored",
  tips: [
    "Keep it under 10 characters — shorter names stick.",
    "Avoid hyphens and numbers in .com domains.",
    "Check trademark conflicts before you register.",
    "Test pronunciation with 5 people before committing.",
    "Score only the shortlist you are ready to compare.",
  ],
}

export interface Preset {
  id: string
  name: string
  config: PostConfig
  createdAt: string
}
