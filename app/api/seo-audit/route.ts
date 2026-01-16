import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

interface AuditItem {
  title: string
  status: "pass" | "fail" | "warning"
  description: string
  recommendation?: string
}

interface AuditCategory {
  name: string
  score: number
  items: AuditItem[]
}

async function fetchWebsite(url: string): Promise<{ html: string; headers: Headers }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0)",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch website: ${response.statusText}`)
  }

  const html = await response.text()
  return { html, headers: response.headers }
}

function auditMetaTags($: cheerio.CheerioAPI): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  // Title tag
  const title = $("title").text()
  if (title) {
    const titleLength = title.length
    if (titleLength >= 30 && titleLength <= 60) {
      items.push({
        title: "Title Tag",
        status: "pass",
        description: `Title tag is present and optimal length (${titleLength} chars)`,
      })
    } else {
      items.push({
        title: "Title Tag",
        status: "warning",
        description: `Title tag length is ${titleLength} chars`,
        recommendation: "Aim for 30-60 characters for optimal display in search results",
      })
      score -= 10
    }
  } else {
    items.push({
      title: "Title Tag",
      status: "fail",
      description: "Title tag is missing",
      recommendation: "Add a descriptive title tag to your page",
    })
    score -= 25
  }

  // Meta description
  const metaDesc = $('meta[name="description"]').attr("content")
  if (metaDesc) {
    const descLength = metaDesc.length
    if (descLength >= 120 && descLength <= 160) {
      items.push({
        title: "Meta Description",
        status: "pass",
        description: `Meta description is optimal (${descLength} chars)`,
      })
    } else {
      items.push({
        title: "Meta Description",
        status: "warning",
        description: `Meta description is ${descLength} chars`,
        recommendation: "Aim for 120-160 characters for best SERP display",
      })
      score -= 10
    }
  } else {
    items.push({
      title: "Meta Description",
      status: "fail",
      description: "Meta description is missing",
      recommendation: "Add a compelling meta description to improve click-through rates",
    })
    score -= 20
  }

  // Open Graph tags
  const ogTitle = $('meta[property="og:title"]').attr("content")
  const ogDesc = $('meta[property="og:description"]').attr("content")
  const ogImage = $('meta[property="og:image"]').attr("content")

  if (ogTitle && ogDesc && ogImage) {
    items.push({
      title: "Open Graph Tags",
      status: "pass",
      description: "Essential OG tags are present",
    })
  } else {
    items.push({
      title: "Open Graph Tags",
      status: "warning",
      description: "Some Open Graph tags are missing",
      recommendation: "Add og:title, og:description, and og:image for better social sharing",
    })
    score -= 15
  }

  // Twitter Cards
  const twitterCard = $('meta[name="twitter:card"]').attr("content")
  if (twitterCard) {
    items.push({
      title: "Twitter Cards",
      status: "pass",
      description: "Twitter card meta tags are present",
    })
  } else {
    items.push({
      title: "Twitter Cards",
      status: "warning",
      description: "Twitter card meta tags are missing",
      recommendation: "Add Twitter card tags for better Twitter sharing",
    })
    score -= 10
  }

  // Canonical URL
  const canonical = $('link[rel="canonical"]').attr("href")
  if (canonical) {
    items.push({
      title: "Canonical URL",
      status: "pass",
      description: "Canonical URL is set",
    })
  } else {
    items.push({
      title: "Canonical URL",
      status: "warning",
      description: "Canonical URL is not set",
      recommendation: "Add a canonical URL to avoid duplicate content issues",
    })
    score -= 10
  }

  return { name: "Meta Tags", score: Math.max(0, score), items }
}

function auditImages($: cheerio.CheerioAPI): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  const images = $("img")
  const totalImages = images.length
  let imagesWithoutAlt = 0

  images.each((_, img) => {
    const alt = $(img).attr("alt")
    if (!alt || alt.trim() === "") {
      imagesWithoutAlt++
    }
  })

  if (totalImages === 0) {
    items.push({
      title: "Images",
      status: "pass",
      description: "No images found on the page",
    })
  } else if (imagesWithoutAlt === 0) {
    items.push({
      title: "Alt Text",
      status: "pass",
      description: "All images have alt text",
    })
  } else {
    items.push({
      title: "Alt Text",
      status: "warning",
      description: `${imagesWithoutAlt} out of ${totalImages} images are missing alt text`,
      recommendation: "Add descriptive alt text to all images for accessibility and SEO",
    })
    score -= Math.min(40, imagesWithoutAlt * 10)
  }

  // Check for lazy loading
  const lazyImages = $("img[loading='lazy']").length
  if (lazyImages > 0) {
    items.push({
      title: "Lazy Loading",
      status: "pass",
      description: `${lazyImages} images use lazy loading`,
    })
  } else if (totalImages > 3) {
    items.push({
      title: "Lazy Loading",
      status: "warning",
      description: "Images don't use lazy loading",
      recommendation: "Add loading='lazy' to images below the fold",
    })
    score -= 20
  }

  return { name: "Images", score: Math.max(0, score), items }
}

function auditMobileFriendliness($: cheerio.CheerioAPI): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  // Viewport meta tag
  const viewport = $('meta[name="viewport"]').attr("content")
  if (viewport && viewport.includes("width=device-width")) {
    items.push({
      title: "Viewport Meta Tag",
      status: "pass",
      description: "Viewport is properly configured",
    })
  } else {
    items.push({
      title: "Viewport Meta Tag",
      status: "fail",
      description: "Viewport meta tag is missing or incorrect",
      recommendation: "Add <meta name='viewport' content='width=device-width, initial-scale=1'>",
    })
    score -= 40
  }

  // Check for responsive design indicators
  const hasMediaQueries = $("style, link[rel='stylesheet']").length > 0
  items.push({
    title: "Responsive Design",
    status: hasMediaQueries ? "pass" : "warning",
    description: hasMediaQueries ? "Stylesheets detected" : "Limited styling detected",
  })

  return { name: "Mobile Friendliness", score: Math.max(0, score), items }
}

function auditSecurity(headers: Headers, url: string): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  // HTTPS check
  if (url.startsWith("https://")) {
    items.push({
      title: "HTTPS",
      status: "pass",
      description: "Site is served over HTTPS",
    })
  } else {
    items.push({
      title: "HTTPS",
      status: "fail",
      description: "Site is not using HTTPS",
      recommendation: "Enable HTTPS to secure user data and improve SEO",
    })
    score -= 50
  }

  // Security headers
  const securityHeaders = [
    { name: "X-Content-Type-Options", header: "x-content-type-options" },
    { name: "X-Frame-Options", header: "x-frame-options" },
    { name: "Strict-Transport-Security", header: "strict-transport-security" },
  ]

  let missingHeaders = 0
  securityHeaders.forEach(({ name, header }) => {
    if (!headers.get(header)) {
      missingHeaders++
    }
  })

  if (missingHeaders === 0) {
    items.push({
      title: "Security Headers",
      status: "pass",
      description: "All recommended security headers are present",
    })
  } else {
    items.push({
      title: "Security Headers",
      status: "warning",
      description: `${missingHeaders} security headers are missing`,
      recommendation: "Add X-Content-Type-Options, X-Frame-Options, and HSTS headers",
    })
    score -= missingHeaders * 15
  }

  return { name: "Security", score: Math.max(0, score), items }
}

function auditLinks($: cheerio.CheerioAPI): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  const links = $("a[href]")
  const externalLinks = links.filter((_, link) => {
    const href = $(link).attr("href") || ""
    return href.startsWith("http") && !href.includes($(link).closest("html").attr("data-domain") || "")
  })

  let externalWithoutNoopener = 0
  externalLinks.each((_, link) => {
    const rel = $(link).attr("rel") || ""
    if (!rel.includes("noopener")) {
      externalWithoutNoopener++
    }
  })

  items.push({
    title: "Internal Links",
    status: "pass",
    description: `Found ${links.length - externalLinks.length} internal links`,
  })

  if (externalWithoutNoopener > 0) {
    items.push({
      title: "External Links",
      status: "warning",
      description: `${externalWithoutNoopener} external links don't have rel='noopener'`,
      recommendation: "Add rel='noopener noreferrer' to external links for security",
    })
    score -= 20
  } else if (externalLinks.length > 0) {
    items.push({
      title: "External Links",
      status: "pass",
      description: "External links are properly configured",
    })
  }

  return { name: "Links", score: Math.max(0, score), items }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate URL format
    let validUrl: string
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`)
      validUrl = urlObj.toString()
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Fetch the website
    const { html, headers } = await fetchWebsite(validUrl)
    const $ = cheerio.load(html)

    // Run all audits
    const categories: AuditCategory[] = [
      auditMetaTags($),
      auditImages($),
      auditMobileFriendliness($),
      auditSecurity(headers, validUrl),
      auditLinks($),
    ]

    return NextResponse.json({
      success: true,
      url: validUrl,
      categories,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error performing SEO audit:", error)
    return NextResponse.json(
      { error: error.message || "Failed to perform SEO audit" },
      { status: 500 }
    )
  }
}

