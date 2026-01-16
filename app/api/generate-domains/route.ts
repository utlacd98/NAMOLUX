import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { keyword, vibe, industry, maxLength } = await request.json()

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 })
    }

    // Create a prompt for GPT to generate domain names
    const prompt = `Generate 10 creative, short, and memorable domain names based on the following criteria:

Keyword/Concept: ${keyword}
Brand Vibe: ${vibe || "modern"}
Industry: ${industry || "general"}
Maximum Length: ${maxLength || 10} characters

Requirements:
- Names should be pronounceable and easy to remember
- Avoid hyphens and numbers
- Mix of different styles: compound words, invented words, prefixes/suffixes
- Consider adding trendy suffixes like: ly, io, ify, hub, lab, ware, base, spot, zone
- Consider prefixes like: go, get, try, my, use

Return ONLY a JSON array of domain name suggestions (without .com extension), each with:
- name: the domain name
- reasoning: brief explanation of why this name works

Format: [{"name": "example", "reasoning": "combines X with Y for Z effect"}, ...]`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a creative branding expert specializing in domain name generation. You create short, memorable, and brandable domain names.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 1000,
    })

    const responseText = completion.choices[0]?.message?.content || "[]"
    
    // Extract JSON from the response (in case GPT adds markdown formatting)
    let domainSuggestions
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      domainSuggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch (parseError) {
      console.error("Failed to parse GPT response:", responseText)
      domainSuggestions = []
    }

    return NextResponse.json({
      success: true,
      domains: domainSuggestions,
    })
  } catch (error: any) {
    console.error("Error generating domains:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate domain names" },
      { status: 500 }
    )
  }
}

