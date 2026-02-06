import { NextRequest, NextResponse } from "next/server"

// Generic/high-competition keywords that saturate search results
const HIGH_COMPETITION_KEYWORDS = [
  "app", "software", "tech", "cloud", "digital", "online", "web", "smart",
  "pro", "plus", "best", "top", "free", "easy", "fast", "quick", "simple",
  "shop", "store", "buy", "sale", "deal", "cheap", "discount", "market",
  "blog", "news", "media", "social", "video", "photo", "music", "game",
  "money", "cash", "pay", "bank", "finance", "invest", "crypto", "trade",
  "health", "fit", "diet", "life", "wellness", "care", "medical", "doctor",
  "learn", "edu", "course", "class", "study", "school", "training", "tutor",
  "home", "house", "real", "estate", "property", "rent", "loan", "mortgage"
]

// Common dictionary words (reduce brand uniqueness)
const COMMON_WORDS = [
  "the", "and", "for", "you", "all", "can", "get", "has", "her", "his",
  "new", "now", "old", "our", "out", "own", "see", "way", "who", "how",
  "one", "two", "use", "day", "big", "high", "long", "just", "over", "such",
  "take", "come", "good", "make", "well", "only", "very", "after", "before"
]

// Positive niche patterns
const NICHE_PATTERNS = [
  /^[a-z]{2,4}ly$/i, // Branded -ly names (grammarly, bitly)
  /^[a-z]{3,5}ify$/i, // -ify names (spotify, shopify)
  /^[a-z]{2,4}io$/i, // -io names (figma.io style)
  /^[a-z]{2,4}eo$/i, // -eo names (vimeo style)
  /^[a-z]{3,6}ai$/i, // AI suffix
  /^[a-z]{4,8}hub$/i, // -hub names
  /^[a-z]{4,8}lab$/i, // -lab names
]

// TLD SEO strength
const TLD_SEO_WEIGHT: Record<string, number> = {
  com: 25, // Best for SEO
  io: 20,  // Good tech credibility
  co: 18,  // Decent alternative
  ai: 19,  // Good for AI products
  app: 17, // Good for apps
  dev: 16, // Good for dev tools
}

interface SeoPotentialResult {
  score: number
  breakdown: {
    keywordCompetition: number
    brandUniqueness: number
    searchIntentClarity: number
    domainStructure: number
  }
  signals: {
    type: "positive" | "warning" | "neutral"
    text: string
    icon: string
  }[]
  recommendation: string
}

function calculateSeoPotential(
  domainName: string,
  tld: string = "com",
  brandKeywords: string[] = [],
  industry: string = ""
): SeoPotentialResult {
  const signals: SeoPotentialResult["signals"] = []
  const lowerName = domainName.toLowerCase()
  
  // 1. KEYWORD COMPETITION (0-25)
  // Penalize generic/high-volume terms, reward niche phrases
  let keywordCompetition = 25
  
  const matchedHighComp = HIGH_COMPETITION_KEYWORDS.filter(kw => lowerName.includes(kw))
  if (matchedHighComp.length >= 2) {
    keywordCompetition -= 15
    signals.push({ type: "warning", text: "High competition keywords", icon: "⚠️" })
  } else if (matchedHighComp.length === 1) {
    keywordCompetition -= 8
    signals.push({ type: "neutral", text: "Contains common keyword", icon: "📊" })
  } else {
    signals.push({ type: "positive", text: "Niche-friendly name", icon: "✅" })
  }
  
  // Bonus for compound/invented names
  const hasNichePattern = NICHE_PATTERNS.some(p => p.test(lowerName))
  if (hasNichePattern) {
    keywordCompetition = Math.min(25, keywordCompetition + 5)
    signals.push({ type: "positive", text: "Strong SEO pattern", icon: "🔥" })
  }

  // 2. BRAND UNIQUENESS (0-25)
  // Penalize dictionary/common words, reward invented names
  let brandUniqueness = 25
  
  const matchedCommon = COMMON_WORDS.filter(w => lowerName === w || lowerName.includes(w))
  if (matchedCommon.length >= 2) {
    brandUniqueness -= 12
    signals.push({ type: "warning", text: "Contains common words", icon: "📖" })
  } else if (matchedCommon.length === 1 && lowerName.length < 8) {
    brandUniqueness -= 6
  }
  
  // Check if it's an invented/blended name (no dictionary match)
  const isInvented = !HIGH_COMPETITION_KEYWORDS.some(kw => lowerName === kw) && 
                     !COMMON_WORDS.some(w => lowerName === w) &&
                     lowerName.length >= 5
  if (isInvented && lowerName.length <= 10) {
    brandUniqueness = Math.min(25, brandUniqueness + 3)
    signals.push({ type: "positive", text: "Unique brand name", icon: "💎" })
  }

  // 3. SEARCH INTENT CLARITY (0-25)
  // Does the name imply clear product/service?
  let searchIntentClarity = 18 // Start at baseline
  
  // Industry-aligned keywords boost
  if (industry && brandKeywords.length > 0) {
    const hasIntentSignal = brandKeywords.some(kw => 
      lowerName.includes(kw.toLowerCase().slice(0, 4))
    )
    if (hasIntentSignal) {
      searchIntentClarity = Math.min(25, searchIntentClarity + 5)
      signals.push({ type: "positive", text: "Clear product signal", icon: "🎯" })
    }
  }
  
  // Vague/abstract names reduce clarity
  const vaguePatterns = /^(the|my|our|go|get|try|just|one)/i
  if (vaguePatterns.test(lowerName)) {
    searchIntentClarity -= 5
    signals.push({ type: "warning", text: "Vague brand prefix", icon: "🌫️" })
  }

  // 4. DOMAIN STRUCTURE (0-25)
  // Length, readability, extension quality
  let domainStructure = TLD_SEO_WEIGHT[tld] || 15
  
  // Length scoring
  const len = domainName.length
  if (len >= 4 && len <= 8) {
    domainStructure = Math.min(25, domainStructure + 3)
  } else if (len > 12) {
    domainStructure -= 5
    signals.push({ type: "warning", text: "Name too long for SEO", icon: "📏" })
  }
  
  // Readability
  const hasNumbers = /\d/.test(domainName)
  const hasHyphens = /-/.test(domainName)
  if (hasHyphens) {
    domainStructure -= 4
    signals.push({ type: "warning", text: "Hyphens hurt rankings", icon: "➖" })
  }
  if (hasNumbers) {
    domainStructure -= 3
    signals.push({ type: "warning", text: "Numbers reduce trust", icon: "🔢" })
  }

  // Calculate total score
  const totalScore = Math.max(0, Math.min(100,
    keywordCompetition + brandUniqueness + searchIntentClarity + domainStructure
  ))

  // Generate recommendation based on score
  let recommendation = ""
  if (totalScore >= 75) {
    recommendation = "Strong SEO potential. This name has room to rank."
  } else if (totalScore >= 50) {
    recommendation = "Moderate SEO potential. Consider niche targeting."
  } else {
    recommendation = "SEO risk zone. This name may struggle to rank."
  }

  return {
    score: Math.round(totalScore),
    breakdown: {
      keywordCompetition: Math.max(0, Math.min(25, Math.round(keywordCompetition))),
      brandUniqueness: Math.max(0, Math.min(25, Math.round(brandUniqueness))),
      searchIntentClarity: Math.max(0, Math.min(25, Math.round(searchIntentClarity))),
      domainStructure: Math.max(0, Math.min(25, Math.round(domainStructure))),
    },
    signals: signals.slice(0, 4), // Limit to 4 signals
    recommendation,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { domainName, tld, brandKeywords, industry } = await request.json()

    if (!domainName || typeof domainName !== "string") {
      return NextResponse.json({ error: "Domain name is required" }, { status: 400 })
    }

    const result = calculateSeoPotential(
      domainName.trim(),
      tld || "com",
      brandKeywords || [],
      industry || ""
    )

    return NextResponse.json({
      success: true,
      domainName,
      tld: tld || "com",
      ...result,
    })
  } catch (error: any) {
    console.error("Error calculating SEO potential:", error)
    return NextResponse.json(
      { error: error.message || "Failed to calculate SEO potential" },
      { status: 500 }
    )
  }
}

// Also export the function for inline use
export { calculateSeoPotential }

