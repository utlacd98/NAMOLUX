import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

let openaiInstance: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiInstance
}

export async function POST(request: NextRequest) {
  try {
    const { topic, category } = await request.json()

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }

    const systemPrompt = `You are a professional SEO content writer for NamoLux, a domain name generator tool.
Write high-quality, SEO-optimized blog posts about domains, branding, SEO, and startup building.

Your writing style:
- Clear, actionable, and practical
- Use examples and data when possible
- Include strategic internal links to /generate and /seo-audit
- Target founders, entrepreneurs, and small business owners
- Professional but approachable tone

Return ONLY valid JSON (no markdown formatting).`

    const userPrompt = `Write a complete blog post about: "${topic}"
Category: ${category || "Domain Strategy"}

Return a JSON object with this EXACT structure:
{
  "title": "SEO-optimized title (50-60 chars)",
  "description": "Compelling meta description (150-160 chars)",
  "readTime": 5,
  "content": [
    { "type": "paragraph", "content": "Introduction paragraph..." },
    { "type": "heading", "level": 2, "content": "First Main Section" },
    { "type": "paragraph", "content": "Content..." },
    { "type": "list", "content": "List introduction:", "items": ["Item 1", "Item 2", "Item 3"] },
    { "type": "callout", "calloutType": "tip", "content": "Pro tip content..." },
    { "type": "heading", "level": 2, "content": "Second Main Section" },
    { "type": "paragraph", "content": "More content..." },
    { "type": "callout", "calloutType": "cta", "content": "Ready to find your perfect domain?", "ctaLink": "/generate", "ctaText": "Generate Names Now" },
    { "type": "heading", "level": 2, "content": "Conclusion" },
    { "type": "paragraph", "content": "Conclusion paragraph..." }
  ]
}

Requirements:
- Include 3-5 main sections with H2 headings
- Add 1-2 lists with actionable items
- Include 1 tip callout and 1 CTA callout linking to /generate or /seo-audit
- Make content 1000-1500 words total
- Use keywords naturally throughout
- Each paragraph should be 2-4 sentences`

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    const responseText = completion.choices[0]?.message?.content || "{}"
    
    let blogPost
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      blogPost = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      
      if (!blogPost || !blogPost.title || !blogPost.content) {
        throw new Error("Invalid response structure")
      }
    } catch (parseError) {
      console.error("Failed to parse GPT response:", responseText)
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: blogPost,
    })
  } catch (error: any) {
    console.error("Error generating blog post:", error)

    if (error.status === 401) {
      return NextResponse.json({ error: "OpenAI API key invalid" }, { status: 500 })
    }

    if (error.status === 429) {
      return NextResponse.json({ error: "Rate limited. Please try again." }, { status: 429 })
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate blog post" },
      { status: 500 }
    )
  }
}

