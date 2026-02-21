/**
 * Ad Campaign Data Store
 * 
 * Stores ad scripts, visuals descriptions, and metadata for NamoLux marketing campaigns.
 */

export type AdFormat = "9:16" | "16:9" | "1:1" | "4:5"
export type AdTone = "Intelligent" | "Premium" | "Decisive" | "Playful" | "Urgent" | "Educational"
export type AdGoal = "Signups" | "Brand Awareness" | "Engagement" | "Traffic" | "Conversions"
export type AdPlatform = "TikTok" | "Instagram Reels" | "YouTube Shorts" | "LinkedIn" | "Twitter/X" | "Facebook"

export interface AdScene {
  timestamp: string
  title: string
  visual: string
  text?: string
  audio?: string
  notes?: string
}

export interface AdCampaign {
  id: string
  name: string
  description: string
  duration: string
  format: AdFormat
  tone: AdTone[]
  goal: AdGoal
  platforms: AdPlatform[]
  scenes: AdScene[]
  createdAt: string
  updatedAt: string
  status: "draft" | "ready" | "active" | "archived"
}

export const adCampaigns: AdCampaign[] = [
  {
    id: "namolux-demo-30s-v1",
    name: "30-Second Vertical NamoLux Demo",
    description: "Premium demo video showcasing NamoLux domain generation with Founder Signal™ scoring. Designed to stop scrollers and drive signups.",
    duration: "30 seconds",
    format: "9:16",
    tone: ["Intelligent", "Premium", "Decisive"],
    goal: "Signups",
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    status: "ready",
    createdAt: "2026-02-21",
    updatedAt: "2026-02-21",
    scenes: [
      {
        timestamp: "0:00–0:03",
        title: "Hook (Scroll Stopper)",
        visual: "Black background. Large clean text fades in: \"Every good domain is taken.\" Add subtle glitch sound. Cut to: Augment screen showing: startupai.com — Taken. Zoom slightly.",
        text: "Every good domain is taken.",
        audio: "Subtle glitch sound"
      },
      {
        timestamp: "0:03–0:06",
        title: "Escalation",
        visual: "Quick cuts: brandgenius.com — Taken, nextai.io — Taken, founderai.com — Taken",
        text: "Or it feels like a compromise.",
        notes: "Pause after overlay text"
      },
      {
        timestamp: "0:06–0:09",
        title: "Turn",
        visual: "Hard cut. Clean NamoLux UI inside Augment. Gold accent line slides in.",
        text: "NamoLux changes that.",
        audio: "Music shifts from tension → confidence"
      },
      {
        timestamp: "0:09–0:14",
        title: "Live Generation",
        visual: "Record inside Augment: Type \"AI startup tools\", click generate. Let suggestions load smoothly. Slow mouse movement. Zoom slightly toward results.",
        notes: "Screen recording of actual NamoLux generation"
      },
      {
        timestamp: "0:14–0:18",
        title: "Founder Signal™ Moment",
        visual: "Hover over one strong domain. Founder Signal™ animates: 82 → 86 → 89. Add subtle glow in Canva later.",
        text: "Founder Signal™ analyzes: Brandability, Phonetic Weight, Market Resonance",
        notes: "Keep it clean"
      },
      {
        timestamp: "0:18–0:22",
        title: "Decision Frame",
        visual: "Zoom closer on: 89/100, .com available, SEO clean indicator",
        text: "You're not guessing. You're deciding.",
        notes: "Let that line breathe"
      },
      {
        timestamp: "0:22–0:26",
        title: "Contrast",
        visual: "Very quick split cut: Left — Generic tool (messy list, no score). Right — NamoLux with 88+ score.",
        text: "Noise. Signal.",
        notes: "Minimal. Strong."
      },
      {
        timestamp: "0:26–0:30",
        title: "Close",
        visual: "Fade to black. Gold N logo appears.",
        text: "NamoLux. The name before the name is everywhere.",
        notes: "CTA at bottom: Try it now."
      }
    ]
  }
]

// Helper to get ad by ID
export function getAdById(id: string): AdCampaign | undefined {
  return adCampaigns.find(ad => ad.id === id)
}

// Helper to get all ads
export function getAllAds(): AdCampaign[] {
  return adCampaigns
}

// Helper to generate downloadable script
export function generateAdScript(ad: AdCampaign): string {
  let script = `# ${ad.name}\n\n`
  script += `**Format:** ${ad.format}\n`
  script += `**Duration:** ${ad.duration}\n`
  script += `**Tone:** ${ad.tone.join(", ")}\n`
  script += `**Goal:** ${ad.goal}\n`
  script += `**Platforms:** ${ad.platforms.join(", ")}\n\n`
  script += `---\n\n`
  script += `## Script\n\n`
  
  for (const scene of ad.scenes) {
    script += `### ⏱ ${scene.timestamp} — ${scene.title}\n\n`
    script += `**🎥 Visual:**\n${scene.visual}\n\n`
    if (scene.text) script += `**📝 Text:**\n${scene.text}\n\n`
    if (scene.audio) script += `**🔊 Audio:**\n${scene.audio}\n\n`
    if (scene.notes) script += `**📌 Notes:**\n${scene.notes}\n\n`
    script += `---\n\n`
  }
  
  return script
}

