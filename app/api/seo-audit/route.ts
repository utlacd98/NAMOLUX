import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { trackMetric } from "@/lib/metrics"
import { checkRateLimit, logGeneration } from "@/lib/rate-limit"

type CheerioRoot = ReturnType<typeof cheerio.load>

interface AuditItem {
  title: string
  status: "pass" | "fail" | "warning"
  description: string
  recommendation?: string
  details?: string[]
}

interface AuditCategory {
  name: string
  score: number
  items: AuditItem[]
  priority: "high" | "medium" | "low"
}

interface AuditResult {
  success: boolean
  url: string
  categories: AuditCategory[]
  summary: {
    overallScore: number
    passCount: number
    warningCount: number
    failCount: number
    grade: string
    topIssues: string[]
  }
  pageInfo: {
    title: string
    description: string
    wordCount: number
    loadTime?: number
  }
  timestamp: string
}

async function fetchWebsite(url: string): Promise<{ html: string; headers: Headers; loadTime: number }> {
  const startTime = Date.now()
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    signal: AbortSignal.timeout(15000),
  })
  const loadTime = Date.now() - startTime

  if (!response.ok) {
    throw new Error(`Failed to fetch website: ${response.statusText}`)
  }

  const html = await response.text()
  return { html, headers: response.headers, loadTime }
}

function getGrade(score: number): string {
  if (score >= 90) return "A+"
  if (score >= 80) return "A"
  if (score >= 70) return "B"
  if (score >= 60) return "C"
  if (score >= 50) return "D"
  return "F"
}

function auditMetaTags($: CheerioRoot): AuditCategory {
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

  return { name: "Meta Tags", score: Math.max(0, score), items, priority: "high" }
}

function auditImages($: CheerioRoot): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  const images = $("img")
  const totalImages = images.length
  let imagesWithoutAlt = 0
  const missingAltImages: string[] = []

  images.each((_, img) => {
    const alt = $(img).attr("alt")
    const src = $(img).attr("src") || "unknown"
    if (!alt || alt.trim() === "") {
      imagesWithoutAlt++
      if (missingAltImages.length < 5) {
        missingAltImages.push(src.substring(0, 50))
      }
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
      description: `All ${totalImages} images have alt text`,
    })
  } else {
    items.push({
      title: "Alt Text",
      status: "warning",
      description: `${imagesWithoutAlt} out of ${totalImages} images are missing alt text`,
      recommendation: "Add descriptive alt text to all images for accessibility and SEO",
      details: missingAltImages.length > 0 ? missingAltImages : undefined,
    })
    score -= Math.min(40, imagesWithoutAlt * 10)
  }

  // Check for lazy loading
  const lazyImages = $("img[loading='lazy']").length
  if (lazyImages > 0) {
    items.push({
      title: "Lazy Loading",
      status: "pass",
      description: `${lazyImages} of ${totalImages} images use lazy loading`,
    })
  } else if (totalImages > 3) {
    items.push({
      title: "Lazy Loading",
      status: "warning",
      description: "Images don't use lazy loading",
      recommendation: "Add loading='lazy' to images below the fold to improve page speed",
    })
    score -= 20
  }

  // Check for WebP/modern formats
  let modernFormatCount = 0
  images.each((_, img) => {
    const src = $(img).attr("src") || ""
    if (src.includes(".webp") || src.includes(".avif")) {
      modernFormatCount++
    }
  })

  if (totalImages > 0) {
    if (modernFormatCount === totalImages) {
      items.push({
        title: "Modern Image Formats",
        status: "pass",
        description: "All images use modern formats (WebP/AVIF)",
      })
    } else if (modernFormatCount > 0) {
      items.push({
        title: "Modern Image Formats",
        status: "warning",
        description: `${modernFormatCount} of ${totalImages} images use modern formats`,
        recommendation: "Convert remaining images to WebP for better compression",
      })
      score -= 10
    } else {
      items.push({
        title: "Modern Image Formats",
        status: "warning",
        description: "No images use modern formats like WebP or AVIF",
        recommendation: "Convert images to WebP format for 25-35% smaller file sizes",
      })
      score -= 15
    }
  }

  return { name: "Images", score: Math.max(0, score), items, priority: "medium" }
}

function auditMobileFriendliness($: CheerioRoot): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  // Viewport meta tag
  const viewport = $('meta[name="viewport"]').attr("content")
  if (viewport && viewport.includes("width=device-width")) {
    items.push({
      title: "Viewport Meta Tag",
      status: "pass",
      description: "Viewport is properly configured for mobile devices",
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
  const hasStylesheets = $("link[rel='stylesheet']").length > 0
  const hasInlineStyles = $("style").length > 0
  items.push({
    title: "Responsive Design",
    status: hasStylesheets || hasInlineStyles ? "pass" : "warning",
    description: hasStylesheets ? `${$("link[rel='stylesheet']").length} stylesheets detected` : "Limited styling detected",
  })

  // Check for touch-friendly elements
  const smallButtons = $("button, a").filter((_, el) => {
    const style = $(el).attr("style") || ""
    return style.includes("font-size") && parseInt(style) < 14
  }).length

  if (smallButtons === 0) {
    items.push({
      title: "Touch Targets",
      status: "pass",
      description: "Interactive elements appear to be touch-friendly",
    })
  }

  return { name: "Mobile Friendliness", score: Math.max(0, score), items, priority: "high" }
}

function auditSecurity(headers: Headers, url: string, $: CheerioRoot): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  // HTTPS check
  if (url.startsWith("https://")) {
    items.push({
      title: "HTTPS",
      status: "pass",
      description: "Site is served over HTTPS with encrypted connection",
    })
  } else {
    items.push({
      title: "HTTPS",
      status: "fail",
      description: "Site is not using HTTPS",
      recommendation: "Enable HTTPS to secure user data and improve SEO rankings",
    })
    score -= 50
  }

  // Security headers with detailed info
  const securityHeaders = [
    { name: "X-Content-Type-Options", header: "x-content-type-options", desc: "Prevents MIME type sniffing" },
    { name: "X-Frame-Options", header: "x-frame-options", desc: "Prevents clickjacking attacks" },
    { name: "Strict-Transport-Security", header: "strict-transport-security", desc: "Forces HTTPS connections" },
    { name: "Content-Security-Policy", header: "content-security-policy", desc: "Prevents XSS attacks" },
    { name: "X-XSS-Protection", header: "x-xss-protection", desc: "Legacy XSS filter" },
    { name: "Referrer-Policy", header: "referrer-policy", desc: "Controls referrer information" },
    { name: "Permissions-Policy", header: "permissions-policy", desc: "Controls browser features" },
  ]

  const missingHeaderNames: string[] = []
  const presentHeaders: string[] = []
  securityHeaders.forEach(({ name, header }) => {
    if (!headers.get(header)) {
      missingHeaderNames.push(name)
    } else {
      presentHeaders.push(name)
    }
  })

  if (missingHeaderNames.length === 0) {
    items.push({
      title: "Security Headers",
      status: "pass",
      description: "All recommended security headers are present",
      details: presentHeaders,
    })
  } else if (missingHeaderNames.length <= 2) {
    items.push({
      title: "Security Headers",
      status: "warning",
      description: `${presentHeaders.length} of ${securityHeaders.length} security headers present`,
      recommendation: "Add missing security headers to protect against common attacks",
      details: missingHeaderNames.map(h => `Missing: ${h}`),
    })
    score -= missingHeaderNames.length * 8
  } else {
    items.push({
      title: "Security Headers",
      status: "fail",
      description: `Only ${presentHeaders.length} of ${securityHeaders.length} security headers present`,
      recommendation: "Add missing security headers to protect against common attacks",
      details: missingHeaderNames.map(h => `Missing: ${h}`),
    })
    score -= missingHeaderNames.length * 10
  }

  // Check for exposed sensitive information
  const htmlContent = $.html().toLowerCase()
  const sensitivePatterns = [
    { pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/i, name: "API Key" },
    { pattern: /password\s*[:=]\s*["'][^"']+["']/i, name: "Password" },
    { pattern: /secret\s*[:=]\s*["'][^"']+["']/i, name: "Secret" },
    { pattern: /private[_-]?key/i, name: "Private Key reference" },
    { pattern: /aws[_-]?access/i, name: "AWS credentials" },
    { pattern: /mongodb(\+srv)?:\/\//i, name: "MongoDB connection string" },
    { pattern: /mysql:\/\//i, name: "MySQL connection string" },
  ]

  const exposedSecrets: string[] = []
  sensitivePatterns.forEach(({ pattern, name }) => {
    if (pattern.test(htmlContent)) {
      exposedSecrets.push(name)
    }
  })

  if (exposedSecrets.length === 0) {
    items.push({
      title: "Sensitive Data Exposure",
      status: "pass",
      description: "No exposed credentials or API keys detected in HTML",
    })
  } else {
    items.push({
      title: "Sensitive Data Exposure",
      status: "fail",
      description: `${exposedSecrets.length} potential sensitive data exposure(s) detected`,
      recommendation: "Remove all credentials and secrets from client-side code immediately",
      details: exposedSecrets,
    })
    score -= 40
  }

  // Check for inline JavaScript with potential vulnerabilities
  const evalUsage = (htmlContent.match(/\beval\s*\(/g) || []).length
  const documentWrite = (htmlContent.match(/document\.write\s*\(/g) || []).length
  const innerHTML = (htmlContent.match(/\.innerhtml\s*=/gi) || []).length

  const jsVulnerabilities: string[] = []
  if (evalUsage > 0) jsVulnerabilities.push(`eval() used ${evalUsage} time(s)`)
  if (documentWrite > 0) jsVulnerabilities.push(`document.write() used ${documentWrite} time(s)`)
  if (innerHTML > 0) jsVulnerabilities.push(`innerHTML assignment ${innerHTML} time(s)`)

  if (jsVulnerabilities.length === 0) {
    items.push({
      title: "JavaScript Security",
      status: "pass",
      description: "No dangerous JavaScript patterns detected",
    })
  } else {
    items.push({
      title: "JavaScript Security",
      status: "warning",
      description: "Potentially unsafe JavaScript patterns detected",
      recommendation: "Avoid eval(), document.write(), and innerHTML for user input",
      details: jsVulnerabilities,
    })
    score -= jsVulnerabilities.length * 5
  }

  // Check for mixed content
  const httpResources: string[] = []
  $("[src^='http://'], [href^='http://']").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("href") || ""
    if (src.startsWith("http://") && httpResources.length < 5) {
      httpResources.push(src.substring(0, 60))
    }
  })

  if (url.startsWith("https://") && httpResources.length > 0) {
    items.push({
      title: "Mixed Content",
      status: "warning",
      description: `${httpResources.length} HTTP resources on HTTPS page`,
      recommendation: "Load all resources over HTTPS to prevent mixed content warnings",
      details: httpResources,
    })
    score -= 15
  } else if (url.startsWith("https://")) {
    items.push({
      title: "Mixed Content",
      status: "pass",
      description: "No mixed content issues detected",
    })
  }

  // Check for form security
  const forms = $("form")
  let insecureForms = 0
  const formIssues: string[] = []

  forms.each((_, form) => {
    const action = $(form).attr("action") || ""
    const method = $(form).attr("method")?.toLowerCase() || "get"

    if (action.startsWith("http://")) {
      insecureForms++
      formIssues.push("Form submits to HTTP endpoint")
    }
    if (method === "get" && $(form).find("input[type='password']").length > 0) {
      insecureForms++
      formIssues.push("Password field in GET form")
    }
    if ($(form).find("input[autocomplete='off'][type='password']").length === 0 &&
        $(form).find("input[type='password']").length > 0) {
      // This is actually fine, just noting it
    }
  })

  if (forms.length > 0 && insecureForms === 0) {
    items.push({
      title: "Form Security",
      status: "pass",
      description: `${forms.length} form(s) appear to be securely configured`,
    })
  } else if (insecureForms > 0) {
    items.push({
      title: "Form Security",
      status: "fail",
      description: `${insecureForms} form security issue(s) detected`,
      recommendation: "Ensure all forms submit over HTTPS and use POST for sensitive data",
      details: formIssues,
    })
    score -= 20
  }

  return { name: "Security", score: Math.max(0, score), items, priority: "high" }
}

// NEW: Audit for honeypots, spam traps, and suspicious elements
function auditHoneypots($: CheerioRoot): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  // Check for hidden form fields (potential honeypots)
  const hiddenFields: string[] = []
  $("input[type='hidden']").each((_, el) => {
    const name = $(el).attr("name") || ""
    const id = $(el).attr("id") || ""
    // Common honeypot field names
    const honeypotNames = ["honeypot", "hp", "trap", "website", "url", "phone2", "fax", "company2"]
    if (honeypotNames.some(hp => name.toLowerCase().includes(hp) || id.toLowerCase().includes(hp))) {
      hiddenFields.push(name || id)
    }
  })

  // Check for CSS-hidden fields (another honeypot technique)
  const cssHiddenInputs: string[] = []
  $("input, textarea").each((_, el) => {
    const style = $(el).attr("style") || ""
    const className = $(el).attr("class") || ""
    if (style.includes("display:none") || style.includes("display: none") ||
        style.includes("visibility:hidden") || style.includes("visibility: hidden") ||
        style.includes("position:absolute") && style.includes("left:-") ||
        className.includes("hidden") || className.includes("d-none") || className.includes("invisible")) {
      const name = $(el).attr("name") || $(el).attr("id") || "unnamed"
      if (cssHiddenInputs.length < 5) {
        cssHiddenInputs.push(name)
      }
    }
  })

  const totalHoneypots = hiddenFields.length + cssHiddenInputs.length
  if (totalHoneypots > 0) {
    items.push({
      title: "Honeypot Fields Detected",
      status: "pass",
      description: `${totalHoneypots} honeypot field(s) found - good spam protection`,
      details: [...hiddenFields, ...cssHiddenInputs].slice(0, 5),
    })
  } else {
    const hasForms = $("form").length > 0
    if (hasForms) {
      items.push({
        title: "Honeypot Protection",
        status: "warning",
        description: "No honeypot fields detected in forms",
        recommendation: "Add hidden honeypot fields to catch spam bots",
      })
      score -= 10
    } else {
      items.push({
        title: "Honeypot Protection",
        status: "pass",
        description: "No forms requiring honeypot protection",
      })
    }
  }

  // Check for CAPTCHA implementation
  const htmlContent = $.html().toLowerCase()
  const hasCaptcha = htmlContent.includes("recaptcha") ||
                     htmlContent.includes("hcaptcha") ||
                     htmlContent.includes("turnstile") ||
                     htmlContent.includes("captcha")

  if (hasCaptcha) {
    items.push({
      title: "CAPTCHA Protection",
      status: "pass",
      description: "CAPTCHA implementation detected",
    })
  } else if ($("form").length > 0) {
    items.push({
      title: "CAPTCHA Protection",
      status: "warning",
      description: "No CAPTCHA detected on forms",
      recommendation: "Consider adding reCAPTCHA, hCaptcha, or Turnstile for bot protection",
    })
    score -= 10
  }

  // Check for CSRF tokens
  const csrfTokens = $("input[name*='csrf'], input[name*='token'], input[name*='_token'], meta[name='csrf-token']").length
  if (csrfTokens > 0) {
    items.push({
      title: "CSRF Protection",
      status: "pass",
      description: `CSRF token(s) detected (${csrfTokens} found)`,
    })
  } else if ($("form[method='post'], form[method='POST']").length > 0) {
    items.push({
      title: "CSRF Protection",
      status: "warning",
      description: "No CSRF tokens detected in POST forms",
      recommendation: "Add CSRF tokens to prevent cross-site request forgery attacks",
    })
    score -= 15
  }

  // Check for suspicious iframes
  const suspiciousIframes: string[] = []
  $("iframe").each((_, el) => {
    const src = $(el).attr("src") || ""
    const style = $(el).attr("style") || ""
    const width = $(el).attr("width") || ""
    const height = $(el).attr("height") || ""

    // Check for hidden iframes (potential malware/tracking)
    if (style.includes("display:none") || style.includes("visibility:hidden") ||
        width === "0" || height === "0" || width === "1" || height === "1") {
      suspiciousIframes.push(src.substring(0, 50) || "hidden iframe")
    }
  })

  if (suspiciousIframes.length > 0) {
    items.push({
      title: "Suspicious Iframes",
      status: "warning",
      description: `${suspiciousIframes.length} hidden/tiny iframe(s) detected`,
      recommendation: "Review hidden iframes - they may be used for tracking or malware",
      details: suspiciousIframes,
    })
    score -= 15
  } else {
    items.push({
      title: "Iframe Security",
      status: "pass",
      description: "No suspicious hidden iframes detected",
    })
  }

  // Check for click tracking/hijacking scripts
  const clickjackingPatterns = [
    "onclick=", "onmousedown=", "onmouseup=",
    "addEventListener('click'", "addEventListener(\"click\"",
  ]
  let clickHandlers = 0
  clickjackingPatterns.forEach(pattern => {
    clickHandlers += (htmlContent.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
  })

  // Check for external tracking scripts
  const trackingScripts: string[] = []
  const knownTrackers = [
    "google-analytics", "googletagmanager", "facebook.net/en_US/fbevents",
    "hotjar", "mixpanel", "segment", "amplitude", "heap", "fullstory",
    "mouseflow", "crazyegg", "luckyorange", "clicktale"
  ]

  $("script[src]").each((_, el) => {
    const src = $(el).attr("src") || ""
    knownTrackers.forEach(tracker => {
      if (src.toLowerCase().includes(tracker) && trackingScripts.length < 5) {
        trackingScripts.push(tracker)
      }
    })
  })

  if (trackingScripts.length > 0) {
    items.push({
      title: "Tracking Scripts",
      status: "pass",
      description: `${trackingScripts.length} analytics/tracking script(s) detected`,
      details: [...new Set(trackingScripts)],
    })
  }

  // Check for obfuscated JavaScript (potential malware indicator)
  let obfuscationScore = 0
  const scripts = $("script:not([src])").text()
  if (scripts.includes("\\x")) obfuscationScore += 2
  if (scripts.includes("fromCharCode")) obfuscationScore += 1
  if (scripts.includes("atob(")) obfuscationScore += 1
  if ((scripts.match(/[a-z]{1,2}\[[0-9]+\]/gi) || []).length > 10) obfuscationScore += 2
  if (scripts.length > 5000 && !scripts.includes(" ")) obfuscationScore += 3

  if (obfuscationScore >= 4) {
    items.push({
      title: "Obfuscated Code",
      status: "warning",
      description: "Potentially obfuscated JavaScript detected",
      recommendation: "Review obfuscated code for potential malware or unwanted behavior",
    })
    score -= 10
  }

  // Check for email harvesting protection
  const exposedEmails = ($.html().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
  if (exposedEmails.length > 0) {
    items.push({
      title: "Email Exposure",
      status: "warning",
      description: `${exposedEmails.length} email address(es) exposed in HTML`,
      recommendation: "Obfuscate email addresses to prevent harvesting by spam bots",
      details: exposedEmails.slice(0, 3).map(e => e.replace(/(.{3}).*(@.*)/, "$1***$2")),
    })
    score -= 5
  } else {
    items.push({
      title: "Email Protection",
      status: "pass",
      description: "No exposed email addresses found in HTML",
    })
  }

  return { name: "Spam & Bot Protection", score: Math.max(0, score), items, priority: "medium" }
}

function auditLinks($: CheerioRoot): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  const links = $("a[href]")
  const internalLinks = links.filter((_, link) => {
    const href = $(link).attr("href") || ""
    return !href.startsWith("http") || href.includes($(link).closest("html").attr("data-domain") || "")
  })
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

  // Internal links analysis
  if (internalLinks.length >= 3) {
    items.push({
      title: "Internal Links",
      status: "pass",
      description: `Good internal linking with ${internalLinks.length} internal links`,
    })
  } else if (internalLinks.length > 0) {
    items.push({
      title: "Internal Links",
      status: "warning",
      description: `Only ${internalLinks.length} internal links found`,
      recommendation: "Add more internal links to improve site navigation and SEO",
    })
    score -= 15
  } else {
    items.push({
      title: "Internal Links",
      status: "fail",
      description: "No internal links found",
      recommendation: "Add internal links to help users and search engines navigate your site",
    })
    score -= 25
  }

  // External links analysis
  if (externalWithoutNoopener > 0) {
    items.push({
      title: "External Links Security",
      status: "warning",
      description: `${externalWithoutNoopener} external links missing rel='noopener'`,
      recommendation: "Add rel='noopener noreferrer' to external links for security",
    })
    score -= 15
  } else if (externalLinks.length > 0) {
    items.push({
      title: "External Links",
      status: "pass",
      description: `${externalLinks.length} external links properly configured`,
    })
  }

  // Check for broken link patterns (empty hrefs, javascript:void, #)
  const suspiciousLinks = links.filter((_, link) => {
    const href = $(link).attr("href") || ""
    return href === "#" || href === "" || href.startsWith("javascript:")
  }).length

  if (suspiciousLinks > 0) {
    items.push({
      title: "Link Quality",
      status: "warning",
      description: `${suspiciousLinks} links have empty or placeholder hrefs`,
      recommendation: "Replace placeholder links with actual destinations",
    })
    score -= 10
  }

  return { name: "Links", score: Math.max(0, score), items, priority: "medium" }
}

// NEW: Audit headings structure
function auditHeadings($: CheerioRoot): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  const h1s = $("h1")
  const h2s = $("h2")
  const h3s = $("h3")

  // H1 check
  if (h1s.length === 1) {
    const h1Text = h1s.first().text().trim()
    items.push({
      title: "H1 Tag",
      status: "pass",
      description: `Single H1 tag found: "${h1Text.substring(0, 60)}${h1Text.length > 60 ? '...' : ''}"`,
    })
  } else if (h1s.length === 0) {
    items.push({
      title: "H1 Tag",
      status: "fail",
      description: "No H1 tag found on the page",
      recommendation: "Add exactly one H1 tag that describes the main topic of the page",
    })
    score -= 30
  } else {
    items.push({
      title: "H1 Tag",
      status: "warning",
      description: `${h1s.length} H1 tags found (should be exactly 1)`,
      recommendation: "Use only one H1 tag per page for better SEO",
    })
    score -= 15
  }

  // Heading hierarchy
  if (h2s.length > 0) {
    items.push({
      title: "Heading Hierarchy",
      status: "pass",
      description: `Good structure: ${h1s.length} H1, ${h2s.length} H2, ${h3s.length} H3 tags`,
    })
  } else if (h1s.length > 0) {
    items.push({
      title: "Heading Hierarchy",
      status: "warning",
      description: "No H2 tags found to structure content",
      recommendation: "Use H2 tags to break up content into logical sections",
    })
    score -= 10
  }

  return { name: "Headings", score: Math.max(0, score), items, priority: "medium" }
}

// NEW: Audit content quality
function auditContent($: CheerioRoot): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  // Get text content
  const bodyText = $("body").text().replace(/\s+/g, " ").trim()
  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length

  // Word count analysis
  if (wordCount >= 300) {
    items.push({
      title: "Content Length",
      status: "pass",
      description: `Good content length: ${wordCount.toLocaleString()} words`,
    })
  } else if (wordCount >= 100) {
    items.push({
      title: "Content Length",
      status: "warning",
      description: `Thin content: only ${wordCount} words`,
      recommendation: "Aim for at least 300 words for better SEO performance",
    })
    score -= 20
  } else {
    items.push({
      title: "Content Length",
      status: "fail",
      description: `Very thin content: ${wordCount} words`,
      recommendation: "Add more valuable content - aim for 300+ words minimum",
    })
    score -= 35
  }

  // Check for paragraphs
  const paragraphs = $("p").length
  if (paragraphs >= 3) {
    items.push({
      title: "Content Structure",
      status: "pass",
      description: `Well-structured with ${paragraphs} paragraphs`,
    })
  } else if (paragraphs > 0) {
    items.push({
      title: "Content Structure",
      status: "warning",
      description: `Only ${paragraphs} paragraph(s) found`,
      recommendation: "Break content into more paragraphs for better readability",
    })
    score -= 10
  }

  return { name: "Content", score: Math.max(0, score), items, priority: "high" }
}

// NEW: Audit structured data
function auditStructuredData($: CheerioRoot): AuditCategory {
  const items: AuditItem[] = []
  let score = 100

  // Check for JSON-LD
  const jsonLd = $('script[type="application/ld+json"]')
  if (jsonLd.length > 0) {
    items.push({
      title: "JSON-LD Schema",
      status: "pass",
      description: `${jsonLd.length} structured data block(s) found`,
    })
  } else {
    items.push({
      title: "JSON-LD Schema",
      status: "warning",
      description: "No JSON-LD structured data found",
      recommendation: "Add schema.org markup to help search engines understand your content",
    })
    score -= 25
  }

  // Check for microdata
  const microdata = $("[itemscope]").length
  if (microdata > 0) {
    items.push({
      title: "Microdata",
      status: "pass",
      description: `${microdata} microdata elements found`,
    })
  }

  // Check for favicon
  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').length
  if (favicon > 0) {
    items.push({
      title: "Favicon",
      status: "pass",
      description: "Favicon is configured",
    })
  } else {
    items.push({
      title: "Favicon",
      status: "warning",
      description: "No favicon found",
      recommendation: "Add a favicon for better brand recognition in browser tabs",
    })
    score -= 10
  }

  return { name: "Structured Data", score: Math.max(0, score), items, priority: "low" }
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit first - SEO audit feature
    const rateLimitResult = await checkRateLimit(request, "seo")

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "You've used your free SEO audits for today",
          upgradeUrl: "/pricing",
        },
        { status: 429 }
      )
    }

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
    const { html, headers, loadTime } = await fetchWebsite(validUrl)
    const $ = cheerio.load(html)

    // Run all audits
    const categories: AuditCategory[] = [
      auditMetaTags($),
      auditHeadings($),
      auditContent($),
      auditImages($),
      auditMobileFriendliness($),
      auditSecurity(headers, validUrl, $),
      auditHoneypots($),
      auditLinks($),
      auditStructuredData($),
    ]

    // Calculate summary stats
    let passCount = 0
    let warningCount = 0
    let failCount = 0
    const topIssues: string[] = []

    categories.forEach(cat => {
      cat.items.forEach(item => {
        if (item.status === "pass") passCount++
        else if (item.status === "warning") {
          warningCount++
          if (topIssues.length < 5 && item.recommendation) {
            topIssues.push(item.recommendation)
          }
        }
        else if (item.status === "fail") {
          failCount++
          if (topIssues.length < 5 && item.recommendation) {
            topIssues.unshift(item.recommendation) // Failures go first
          }
        }
      })
    })

    const overallScore = Math.round(categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length)
    const grade = getGrade(overallScore)

    // Get page info
    const title = $("title").text().trim() || "No title"
    const description = $('meta[name="description"]').attr("content") || ""
    const bodyText = $("body").text().replace(/\s+/g, " ").trim()
    const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length

    // Track SEO audit metric (non-blocking)
    const userAgent = request.headers.get("user-agent") || undefined
    const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || undefined
    trackMetric({
      action: "seo_audit",
      metadata: { url: validUrl, overallScore, grade },
      userAgent,
      country,
    })

    // Log generation for rate limiting (only for free users)
    if (!rateLimitResult.isPro) {
      logGeneration(request, rateLimitResult.userId, "seo", validUrl, 1).catch(() => {})
    }

    const result: AuditResult = {
      success: true,
      url: validUrl,
      categories,
      summary: {
        overallScore,
        passCount,
        warningCount,
        failCount,
        grade,
        topIssues: topIssues.slice(0, 5),
      },
      pageInfo: {
        title,
        description,
        wordCount,
        loadTime,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error performing SEO audit:", error)
    return NextResponse.json(
      { error: error.message || "Failed to perform SEO audit" },
      { status: 500 }
    )
  }
}

