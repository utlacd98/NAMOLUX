import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAllPosts } from "@/lib/blog"

// Common SEO keywords by category for suggestions
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Domain Strategy": [
    "domain name generator", "brand name ideas", "startup naming", "business name generator",
    "domain availability checker", "brandable domains", "company name ideas", "domain tips",
    "domain name tips", "naming strategy", "brand naming", "premium domains"
  ],
  "SEO Foundations": [
    "SEO tips", "website SEO", "SEO audit", "technical SEO", "on-page SEO", "SEO checklist",
    "SEO for beginners", "SEO tools", "keyword research", "SEO ranking", "search engine optimization",
    "meta tags", "SEO best practices", "site speed optimization"
  ],
  "Builder Insights": [
    "startup tips", "indie hacker", "side project", "bootstrapping", "SaaS ideas", "micro SaaS",
    "build in public", "founder advice", "startup growth", "product launch", "MVP development",
    "solo founder", "tech entrepreneurship", "startup marketing"
  ]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7")
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    // Get all blog view metrics
    const blogViews = await db.metrics.findMany({
      where: {
        action: "blog_view",
        createdAt: { gte: startDate }
      },
      select: {
        metadata: true,
        sessionId: true,
        createdAt: true
      }
    })

    // Calculate total views
    const totalViews = blogViews.length

    // Calculate unique viewers (by sessionId)
    const uniqueSessions = new Set(blogViews.map(v => v.sessionId).filter(Boolean))
    const uniqueViewers = uniqueSessions.size

    // Get views per article
    const articleViewCounts: Record<string, { slug: string; title: string; category: string; views: number }> = {}
    
    for (const view of blogViews) {
      const metadata = view.metadata as { slug?: string; title?: string; category?: string } | null
      if (metadata?.slug) {
        if (!articleViewCounts[metadata.slug]) {
          articleViewCounts[metadata.slug] = {
            slug: metadata.slug,
            title: metadata.title || metadata.slug,
            category: metadata.category || "Unknown",
            views: 0
          }
        }
        articleViewCounts[metadata.slug].views++
      }
    }

    // Sort by views and get top articles
    const topArticles = Object.values(articleViewCounts)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    // Get category breakdown
    const categoryViewCounts: Record<string, number> = {}
    for (const view of blogViews) {
      const metadata = view.metadata as { category?: string } | null
      const category = metadata?.category || "Unknown"
      categoryViewCounts[category] = (categoryViewCounts[category] || 0) + 1
    }
    const categoryBreakdown = Object.entries(categoryViewCounts)
      .map(([category, views]) => ({ category, views }))
      .sort((a, b) => b.views - a.views)

    // Get daily trend
    const dailyViews: Record<string, number> = {}
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split("T")[0]
      dailyViews[dateKey] = 0
    }
    for (const view of blogViews) {
      const dateKey = view.createdAt.toISOString().split("T")[0]
      if (dailyViews[dateKey] !== undefined) {
        dailyViews[dateKey]++
      }
    }
    const recentTrend = Object.entries(dailyViews)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, views]) => ({ date, views }))

    // Generate keyword suggestions for each blog post
    const allPosts = getAllPosts()
    const keywordSuggestions = allPosts.slice(0, 15).map(post => {
      // Get keywords based on category and title
      const categoryKeywords = CATEGORY_KEYWORDS[post.category] || []
      
      // Analyze title for relevant keywords
      const titleWords = post.title.toLowerCase().split(/\s+/)
      const relevantKeywords = categoryKeywords.filter(kw => 
        titleWords.some(word => kw.includes(word) || word.includes(kw.split(" ")[0]))
      )
      
      // Score based on title match and category relevance
      const score = Math.min(100, 50 + relevantKeywords.length * 10 + (post.featured ? 15 : 0))
      
      // Suggest top 5 keywords
      const suggested = [...new Set([
        ...relevantKeywords.slice(0, 3),
        ...categoryKeywords.slice(0, 2)
      ])].slice(0, 5)

      return {
        article: post.title,
        slug: post.slug,
        keywords: suggested,
        score
      }
    }).sort((a, b) => b.score - a.score)

    return NextResponse.json({
      totalViews,
      uniqueViewers,
      topArticles,
      categoryBreakdown,
      recentTrend,
      keywordSuggestions
    })
  } catch (error: any) {
    console.error("Error getting blog analytics:", error)
    return NextResponse.json({ error: error.message || "Failed to get blog analytics" }, { status: 500 })
  }
}

