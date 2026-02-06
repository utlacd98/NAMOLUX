/**
 * Marketing Agent Engine
 * 
 * A self-contained, reusable content generation engine for social media marketing.
 * Designed to be decoupled from NamoLux UI and extractable for future standalone use.
 * 
 * @module MarketingAgentEngine
 */

import OpenAI from "openai"

// ============================================================================
// Types & Interfaces
// ============================================================================

export type Platform = "linkedin" | "facebook"

export type PostType = 
  | "insight" 
  | "product_update" 
  | "build_in_public" 
  | "comment_reply"

export interface GenerateContentRequest {
  platform: Platform
  postType: PostType
  context?: string  // Recent change, new feature, etc.
  commentToReply?: string  // For comment_reply type
  brandConfig?: BrandConfig
}

export interface GeneratedContent {
  postText: string
  confidence: number  // 0-100
  reason: string
  platform: Platform
  postType: PostType
  generatedAt: string
}

export interface BrandConfig {
  name: string
  description: string
  toneRules: string[]
  avoidRules: string[]
  positioning: string
}

export interface WeeklyPlan {
  posts: Array<{
    day: string
    platform: Platform
    postType: PostType
    topic: string
    reasoning: string
  }>
  generatedAt: string
}

// ============================================================================
// Default Brand Configuration (NamoLux)
// ============================================================================

export const NAMOLUX_BRAND_CONFIG: BrandConfig = {
  name: "NamoLux",
  description: "AI-powered domain name generator and brand naming tool for founders and startups",
  toneRules: [
    "Calm, confident, founder-first tone",
    "Clear and direct communication",
    "Professional but approachable",
    "Helpful and informative",
    "Subtle confidence without arrogance"
  ],
  avoidRules: [
    "No hype or excessive enthusiasm",
    "No emojis by default",
    "No buzzwords or marketing fluff",
    "Never overpromise results",
    "Never claim replacement of human judgment",
    "Avoid phrases like 'game-changer', 'revolutionary', 'best-in-class'",
    "No exclamation marks unless absolutely necessary"
  ],
  positioning: "A decision-support tool that helps founders explore naming options thoughtfully, not a gimmick or magic solution"
}

// ============================================================================
// Platform-Specific Guidelines
// ============================================================================

const PLATFORM_GUIDELINES: Record<Platform, string> = {
  linkedin: `LinkedIn Guidelines:
- Professional but not stiff
- Ideal length: 150-300 words
- Can include a hook in the first line
- Single-line paragraphs for readability
- End with a thought-provoking question or subtle call-to-action
- No hashtags unless specifically relevant`,
  
  facebook: `Facebook Guidelines:
- Conversational and relatable
- Ideal length: 80-150 words
- More casual than LinkedIn but still professional
- Can ask questions to encourage engagement
- Avoid looking like an ad`
}

// ============================================================================
// Post Type Templates
// ============================================================================

const POST_TYPE_PROMPTS: Record<PostType, string> = {
  insight: `Create a thought leadership post sharing an insight about naming, branding, or the startup journey.
The insight should be genuinely useful, not promotional. Share something the reader can learn from.`,
  
  product_update: `Create a product update post announcing a new feature or improvement.
Focus on the value to the user, not just what was built. Be matter-of-fact, not salesy.`,
  
  build_in_public: `Create a build-in-public style post sharing what's being worked on or learned.
Be authentic and transparent. Share real challenges or decisions. Founders relate to honesty.`,
  
  comment_reply: `Create a thoughtful reply to the provided comment.
Be helpful and genuine. Add value to the conversation. Don't be promotional or pushy.`
}

// ============================================================================
// Core Engine Class
// ============================================================================

export class MarketingAgentEngine {
  private openai: OpenAI
  private brandConfig: BrandConfig

  constructor(apiKey?: string, brandConfig?: BrandConfig) {
    const key = apiKey || process.env.OPENAI_API_KEY
    if (!key) {
      throw new Error("OpenAI API key is required")
    }
    this.openai = new OpenAI({ apiKey: key })
    this.brandConfig = brandConfig || NAMOLUX_BRAND_CONFIG
  }

  /**
   * Generate social media content based on the request parameters
   */
  async generateContent(request: GenerateContentRequest): Promise<GeneratedContent> {
    const config = request.brandConfig || this.brandConfig
    const platformGuide = PLATFORM_GUIDELINES[request.platform]
    const postTypePrompt = POST_TYPE_PROMPTS[request.postType]

    const systemPrompt = this.buildSystemPrompt(config)
    const userPrompt = this.buildUserPrompt(request, platformGuide, postTypePrompt)

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    const responseText = completion.choices[0]?.message?.content || ""
    return this.parseResponse(responseText, request)
  }

  /**
   * Generate a weekly posting plan (max 3 posts)
   */
  async generateWeeklyPlan(context?: string): Promise<WeeklyPlan> {
    const systemPrompt = `You are a social media strategist for ${this.brandConfig.name}.
${this.brandConfig.description}

Create a simple, focused weekly posting plan. Maximum 3 posts.
Quality over quantity. Each post should have a clear purpose.`

    const userPrompt = `Create a weekly posting plan for ${this.brandConfig.name}.
${context ? `Recent context/updates: ${context}` : ""}

Return a JSON object with this structure:
{
  "posts": [
    {
      "day": "Monday",
      "platform": "linkedin",
      "postType": "insight",
      "topic": "Brief topic description",
      "reasoning": "Why this post on this day"
    }
  ]
}

Maximum 3 posts. Focus on variety and strategic timing.`

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    const responseText = completion.choices[0]?.message?.content || "{}"
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { posts: [] }
      return {
        ...parsed,
        generatedAt: new Date().toISOString()
      }
    } catch {
      return { posts: [], generatedAt: new Date().toISOString() }
    }
  }

  private buildSystemPrompt(config: BrandConfig): string {
    return `You are the voice of ${config.name}, a social media content creator.

ABOUT THE BRAND:
${config.description}

BRAND POSITIONING:
${config.positioning}

TONE RULES (MUST FOLLOW):
${config.toneRules.map(r => `- ${r}`).join("\n")}

AVOID (NEVER DO):
${config.avoidRules.map(r => `- ${r}`).join("\n")}

Your job is to create authentic, valuable content that builds trust with founders and startup professionals.`
  }

  private buildUserPrompt(
    request: GenerateContentRequest, 
    platformGuide: string, 
    postTypePrompt: string
  ): string {
    let prompt = `Create a ${request.postType.replace("_", " ")} post for ${request.platform}.

${platformGuide}

${postTypePrompt}
`

    if (request.context) {
      prompt += `\nContext/Recent Update: ${request.context}\n`
    }

    if (request.postType === "comment_reply" && request.commentToReply) {
      prompt += `\nComment to reply to: "${request.commentToReply}"\n`
    }

    prompt += `
Return your response in this exact JSON format:
{
  "postText": "The actual post content here",
  "confidence": 85,
  "reason": "Brief explanation of why this post works and is safe to use"
}

Confidence scoring guide:
- 90-100: Perfect alignment, safe for direct posting
- 70-89: Good content, minor review recommended
- 50-69: Decent but needs human editing
- Below 50: Significant concerns, requires rewrite`

    return prompt
  }

  private parseResponse(text: string, request: GenerateContentRequest): GeneratedContent {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }
      
      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        postText: parsed.postText || "",
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        reason: parsed.reason || "No reason provided",
        platform: request.platform,
        postType: request.postType,
        generatedAt: new Date().toISOString()
      }
    } catch (error) {
      // Fallback: treat entire response as post text
      return {
        postText: text,
        confidence: 30,
        reason: "Failed to parse structured response - manual review required",
        platform: request.platform,
        postType: request.postType,
        generatedAt: new Date().toISOString()
      }
    }
  }
}

// ============================================================================
// Convenience Function (for simpler usage)
// ============================================================================

let engineInstance: MarketingAgentEngine | null = null

export function getMarketingAgentEngine(): MarketingAgentEngine {
  if (!engineInstance) {
    engineInstance = new MarketingAgentEngine()
  }
  return engineInstance
}

