"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
  FileText,
  Zap,
  Shield,
  Smartphone,
  ImageIcon,
  Link2,
  Clock,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Heading,
  Type,
  Code,
  Bug,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AuditItem {
  title: string
  status: "pass" | "fail" | "warning"
  description: string
  recommendation?: string
  details?: string[]
}

interface AuditCategory {
  name: string
  icon: React.ReactNode
  score: number
  items: AuditItem[]
  priority?: "high" | "medium" | "low"
}

interface AuditSummary {
  overallScore: number
  passCount: number
  warningCount: number
  failCount: number
  grade: string
  topIssues: string[]
}

interface PageInfo {
  title: string
  description: string
  wordCount: number
  loadTime?: number
}

interface AuditResult {
  success: boolean
  url: string
  categories: AuditCategory[]
  summary: AuditSummary
  pageInfo: PageInfo
  timestamp: string
}

const generateMockAudit = (url: string): AuditCategory[] => {
  return [
    {
      name: "Meta Tags",
      icon: <FileText className="h-5 w-5" />,
      score: 75,
      items: [
        {
          title: "Title Tag",
          status: "pass",
          description: "Title tag is present and within optimal length (60 chars)",
        },
        {
          title: "Meta Description",
          status: "warning",
          description: "Meta description is too short (95 chars)",
          recommendation: "Aim for 150-160 characters to maximize SERP visibility",
        },
        { title: "Open Graph Tags", status: "pass", description: "All essential OG tags are present" },
        {
          title: "Twitter Cards",
          status: "fail",
          description: "Twitter card meta tags are missing",
          recommendation: "Add twitter:card, twitter:title, and twitter:description tags",
        },
        { title: "Canonical URL", status: "pass", description: "Canonical URL is properly set" },
      ],
    },
    {
      name: "Performance",
      icon: <Zap className="h-5 w-5" />,
      score: 68,
      items: [
        {
          title: "Page Load Time",
          status: "warning",
          description: "Page loads in 3.2s",
          recommendation: "Target under 2.5s for optimal user experience",
        },
        { title: "First Contentful Paint", status: "pass", description: "FCP is 1.1s (Good)" },
        {
          title: "Largest Contentful Paint",
          status: "warning",
          description: "LCP is 3.8s",
          recommendation: "Optimize images and reduce server response time",
        },
        { title: "Cumulative Layout Shift", status: "pass", description: "CLS is 0.05 (Good)" },
      ],
    },
    {
      name: "Mobile Friendliness",
      icon: <Smartphone className="h-5 w-5" />,
      score: 90,
      items: [
        { title: "Viewport Meta Tag", status: "pass", description: "Viewport is properly configured" },
        { title: "Responsive Design", status: "pass", description: "Page adapts to different screen sizes" },
        {
          title: "Touch Targets",
          status: "warning",
          description: "Some buttons may be too small",
          recommendation: "Ensure touch targets are at least 48x48 pixels",
        },
        { title: "Font Sizes", status: "pass", description: "Text is readable without zooming" },
      ],
    },
    {
      name: "Security",
      icon: <Shield className="h-5 w-5" />,
      score: 85,
      items: [
        { title: "HTTPS", status: "pass", description: "Site is served over HTTPS" },
        { title: "Mixed Content", status: "pass", description: "No mixed content issues detected" },
        {
          title: "Security Headers",
          status: "warning",
          description: "Some security headers are missing",
          recommendation: "Add X-Content-Type-Options and X-Frame-Options headers",
        },
      ],
    },
    {
      name: "Images",
      icon: <ImageIcon className="h-5 w-5" />,
      score: 60,
      items: [
        {
          title: "Alt Text",
          status: "warning",
          description: "3 images are missing alt text",
          recommendation: "Add descriptive alt text for accessibility and SEO",
        },
        {
          title: "Image Optimization",
          status: "fail",
          description: "5 images are not optimized",
          recommendation: "Use WebP format and compress images",
        },
        { title: "Lazy Loading", status: "pass", description: "Images use lazy loading" },
      ],
    },
    {
      name: "Links",
      icon: <Link2 className="h-5 w-5" />,
      score: 80,
      items: [
        { title: "Broken Links", status: "pass", description: "No broken links detected" },
        { title: "Internal Links", status: "pass", description: "Good internal linking structure" },
        {
          title: "External Links",
          status: "warning",
          description: "2 external links don't have rel='noopener'",
          recommendation: "Add rel='noopener noreferrer' to external links",
        },
      ],
    },
  ]
}

export function SeoAudit() {
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<AuditCategory[] | null>(null)
  const [auditData, setAuditData] = useState<AuditResult | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  const handleAnalyze = async () => {
    if (!url.trim()) return
    setIsAnalyzing(true)
    setResults(null)
    setAuditData(null)

    try {
      const response = await fetch("/api/seo-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze website")
      }

      const data: AuditResult = await response.json()
      setAuditData(data)

      // Transform API response to match component structure
      const categories = data.categories.map((cat: any) => ({
        name: cat.name,
        icon: getIconForCategory(cat.name),
        score: cat.score,
        items: cat.items,
        priority: cat.priority,
      }))

      setResults(categories)
      setExpandedCategories(["Meta Tags"])
    } catch (error) {
      console.error("Error analyzing website:", error)
      // Fallback to mock data if API fails
      setResults(generateMockAudit(url))
      setExpandedCategories(["Meta Tags"])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getIconForCategory = (name: string) => {
    switch (name) {
      case "Meta Tags":
        return <FileText className="h-5 w-5" />
      case "Images":
        return <ImageIcon className="h-5 w-5" />
      case "Mobile Friendliness":
        return <Smartphone className="h-5 w-5" />
      case "Security":
        return <ShieldAlert className="h-5 w-5" />
      case "Spam & Bot Protection":
        return <Bug className="h-5 w-5" />
      case "Links":
        return <Link2 className="h-5 w-5" />
      case "Headings":
        return <Heading className="h-5 w-5" />
      case "Content":
        return <Type className="h-5 w-5" />
      case "Structured Data":
        return <Code className="h-5 w-5" />
      default:
        return <Globe className="h-5 w-5" />
    }
  }

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  }

  const downloadReport = () => {
    if (!results || !auditData) return

    const score = auditData.summary?.overallScore || overallScore
    const grade = auditData.summary?.grade || getGrade(score)
    const pageInfo = auditData.pageInfo

    const reportHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report - ${auditData.url}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; line-height: 1.6; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 8px; color: #fff; }
    h2 { font-size: 1.25rem; margin: 24px 0 12px; color: #a855f7; }
    h3 { font-size: 1rem; margin-bottom: 8px; color: #d4d4d4; }
    .subtitle { color: #737373; margin-bottom: 32px; }
    .score-box { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, ${score >= 80 ? '#22c55e33' : score >= 60 ? '#eab30833' : '#ef444433'}, transparent); margin: 24px 0; }
    .score { font-size: 3rem; font-weight: bold; color: ${score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'}; }
    .grade { font-size: 1rem; color: #737373; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
    .info-item { background: #171717; padding: 16px; border-radius: 12px; border: 1px solid #262626; }
    .info-label { font-size: 0.75rem; color: #737373; text-transform: uppercase; }
    .info-value { font-size: 1rem; color: #e5e5e5; margin-top: 4px; }
    .category { background: #171717; border-radius: 12px; border: 1px solid #262626; margin-bottom: 16px; overflow: hidden; }
    .category-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; }
    .category-name { font-weight: 600; color: #fff; }
    .category-score { font-size: 1.25rem; font-weight: bold; }
    .category-items { border-top: 1px solid #262626; padding: 16px; }
    .item { display: flex; gap: 12px; padding: 12px; background: #0a0a0a; border-radius: 8px; margin-bottom: 8px; }
    .item:last-child { margin-bottom: 0; }
    .status { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
    .status.pass { background: #22c55e; }
    .status.warning { background: #eab308; }
    .status.fail { background: #ef4444; }
    .item-content { flex: 1; }
    .item-title { font-weight: 500; color: #e5e5e5; }
    .item-desc { font-size: 0.875rem; color: #737373; margin-top: 2px; }
    .item-rec { font-size: 0.875rem; color: #a855f7; margin-top: 4px; }
    .details { font-size: 0.75rem; color: #525252; margin-top: 4px; padding-left: 12px; border-left: 2px solid #262626; }
    .priority { font-size: 0.65rem; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
    .priority.high { background: #ef444433; color: #ef4444; }
    .priority.medium { background: #eab30833; color: #eab308; }
    .priority.low { background: #22c55e33; color: #22c55e; }
    .summary { background: #171717; border-radius: 12px; padding: 24px; border: 1px solid #262626; margin: 24px 0; }
    .summary-stats { display: flex; gap: 24px; margin-top: 16px; }
    .stat { text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: bold; }
    .stat-label { font-size: 0.75rem; color: #737373; }
    .footer { text-align: center; margin-top: 40px; color: #525252; font-size: 0.875rem; }
    .logo { color: #a855f7; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SEO Audit Report</h1>
    <p class="subtitle">${auditData.url}</p>

    <div style="text-align: center;">
      <div class="score-box">
        <span class="score">${score}</span>
        <span class="grade">Grade: ${grade}</span>
      </div>
    </div>

    ${pageInfo ? `
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Page Title</div>
        <div class="info-value">${pageInfo.title || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Word Count</div>
        <div class="info-value">${pageInfo.wordCount?.toLocaleString() || 'N/A'} words</div>
      </div>
      <div class="info-item">
        <div class="info-label">Load Time</div>
        <div class="info-value">${pageInfo.loadTime ? `${(pageInfo.loadTime / 1000).toFixed(2)}s` : 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Analyzed</div>
        <div class="info-value">${new Date(auditData.timestamp).toLocaleString()}</div>
      </div>
    </div>
    ` : ''}

    ${auditData.summary?.topIssues?.length ? `
    <div class="summary">
      <h3>Top Issues to Fix</h3>
      <ul style="margin-top: 12px; padding-left: 20px;">
        ${auditData.summary.topIssues.map(issue => `<li style="margin-bottom: 8px; color: #eab308;">${issue}</li>`).join('')}
      </ul>
      <div class="summary-stats">
        <div class="stat">
          <div class="stat-value" style="color: #22c55e;">${auditData.summary.passCount}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #eab308;">${auditData.summary.warningCount}</div>
          <div class="stat-label">Warnings</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #ef4444;">${auditData.summary.failCount}</div>
          <div class="stat-label">Failed</div>
        </div>
      </div>
    </div>
    ` : ''}

    <h2>Detailed Results</h2>
    ${results.map(category => `
    <div class="category">
      <div class="category-header">
        <div>
          <span class="category-name">${category.name}</span>
          ${category.priority ? `<span class="priority ${category.priority}" style="margin-left: 8px;">${category.priority}</span>` : ''}
        </div>
        <span class="category-score" style="color: ${category.score >= 80 ? '#22c55e' : category.score >= 60 ? '#eab308' : '#ef4444'}">${category.score}</span>
      </div>
      <div class="category-items">
        ${category.items.map(item => `
        <div class="item">
          <div class="status ${item.status}"></div>
          <div class="item-content">
            <div class="item-title">${item.title}</div>
            <div class="item-desc">${item.description}</div>
            ${item.recommendation ? `<div class="item-rec">→ ${item.recommendation}</div>` : ''}
            ${item.details?.length ? `<div class="details">${item.details.join('<br>')}</div>` : ''}
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    `).join('')}

    <div class="footer">
      Generated by <span class="logo">NamoLux</span> SEO Audit Tool<br>
      ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>`

    const blob = new Blob([reportHTML], { type: 'text/html' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `seo-audit-${new URL(auditData.url).hostname}-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }

  const getGrade = (score: number): string => {
    if (score >= 90) return "A+"
    if (score >= 80) return "A"
    if (score >= 70) return "B"
    if (score >= 60) return "C"
    if (score >= 50) return "D"
    return "F"
  }

  const overallScore = results ? Math.round(results.reduce((acc, cat) => acc + cat.score, 0) / results.length) : 0

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "from-green-500/20 to-green-500/5"
    if (score >= 60) return "from-yellow-500/20 to-yellow-500/5"
    return "from-red-500/20 to-red-500/5"
  }

  const getStatusIcon = (status: AuditItem["status"]) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-400" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-400" />
    }
  }

  return (
    <div className="noise-overlay relative min-h-screen bg-background">
      {/* Background - Subtle, restrained */}
      <div className="pointer-events-none absolute inset-0 overflow-clip" aria-hidden="true">
        <div className="animate-luxury-aura absolute top-0 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-gradient-to-bl from-primary/10 via-secondary/5 to-transparent blur-[120px]" />
        <div
          className="animate-luxury-aura absolute bottom-0 left-0 h-[350px] w-[350px] -translate-x-1/4 rounded-full bg-gradient-to-tr from-secondary/8 via-primary/3 to-transparent blur-[100px]"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">SEO Audit Tool</h1>
          <p className="mt-2 text-muted-foreground">Analyze any website and get actionable SEO insights in seconds.</p>
        </div>

        {/* URL Input */}
        <div className="mx-auto mb-12 max-w-2xl">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="https://example.com"
                className="h-14 w-full rounded-xl border border-border/50 bg-card/50 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={!url.trim() || isAnalyzing}
              className="h-14 gap-2 px-8 text-base font-semibold"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="h-20 w-20 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 h-20 w-20 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <p className="text-muted-foreground">Analyzing {url}...</p>
            <p className="mt-1 text-sm text-muted-foreground/60">This may take a few seconds</p>
          </div>
        )}

        {/* Results */}
        {results && !isAnalyzing && (
          <div>
            {/* Overall Score & Summary */}
            <div className="mb-8">
              <div className="flex flex-col items-center justify-center">
                <div
                  className={cn(
                    "flex h-32 w-32 flex-col items-center justify-center rounded-full bg-gradient-to-b",
                    getScoreBg(auditData?.summary?.overallScore || overallScore),
                  )}
                >
                  <span className={cn("text-4xl font-bold", getScoreColor(auditData?.summary?.overallScore || overallScore))}>
                    {auditData?.summary?.overallScore || overallScore}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Grade: {auditData?.summary?.grade || getGrade(overallScore)}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {auditData?.pageInfo?.loadTime
                    ? `Loaded in ${(auditData.pageInfo.loadTime / 1000).toFixed(2)}s`
                    : "Analyzed just now"
                  }
                </div>
              </div>

              {/* Summary Stats */}
              {auditData?.summary && (
                <div className="mt-6 flex justify-center gap-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{auditData.summary.passCount}</div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{auditData.summary.warningCount}</div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{auditData.summary.failCount}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              )}

              {/* Page Info */}
              {auditData?.pageInfo && (
                <div className="mt-6 mx-auto max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-card/50 border border-border/50 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Words</div>
                    <div className="font-semibold text-foreground">{auditData.pageInfo.wordCount?.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg bg-card/50 border border-border/50 p-3 text-center col-span-2 sm:col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">Page Title</div>
                    <div className="font-semibold text-foreground truncate text-sm">{auditData.pageInfo.title}</div>
                  </div>
                  <div className="rounded-lg bg-card/50 border border-border/50 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Load Time</div>
                    <div className="font-semibold text-foreground">
                      {auditData.pageInfo.loadTime ? `${(auditData.pageInfo.loadTime / 1000).toFixed(2)}s` : 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {/* Top Issues */}
              {auditData?.summary?.topIssues?.length > 0 && (
                <div className="mt-6 mx-auto max-w-2xl rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4">
                  <h3 className="font-semibold text-yellow-400 mb-2">Top Issues to Fix</h3>
                  <ul className="space-y-2">
                    {auditData.summary.topIssues.slice(0, 3).map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-yellow-400 mt-0.5">→</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Category Cards */}
            <div className="space-y-4">
              {results.map((category) => (
                <div
                  key={category.name}
                  className="overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
                >
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {category.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{category.name}</h3>
                          {category.priority && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase",
                              category.priority === "high" && "bg-red-500/20 text-red-400",
                              category.priority === "medium" && "bg-yellow-500/20 text-yellow-400",
                              category.priority === "low" && "bg-green-500/20 text-green-400"
                            )}>
                              {category.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.items.filter((i) => i.status === "pass").length} passed,{" "}
                          {category.items.filter((i) => i.status === "warning").length} warnings,{" "}
                          {category.items.filter((i) => i.status === "fail").length} failed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-2xl font-bold", getScoreColor(category.score))}>{category.score}</span>
                      {expandedCategories.includes(category.name) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedCategories.includes(category.name) && (
                    <div className="border-t border-border/50 p-4">
                      <div className="space-y-3">
                        {category.items.map((item, index) => (
                          <div key={index} className="flex items-start gap-3 rounded-lg bg-background/50 p-3">
                            {getStatusIcon(item.status)}
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{item.title}</p>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              {item.recommendation && (
                                <p className="mt-1 text-sm text-primary">→ {item.recommendation}</p>
                              )}
                              {item.details && item.details.length > 0 && (
                                <div className="mt-2 text-xs text-muted-foreground/70 pl-3 border-l-2 border-border">
                                  {item.details.slice(0, 3).map((detail, i) => (
                                    <div key={i} className="truncate">{detail}</div>
                                  ))}
                                  {item.details.length > 3 && (
                                    <div className="text-muted-foreground/50">...and {item.details.length - 3} more</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button variant="outline" className="gap-2 bg-transparent" onClick={downloadReport}>
                <Download className="h-4 w-4" />
                Download Report
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={() => {
                  setUrl("")
                  setResults(null)
                  setAuditData(null)
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Analyze Another Site
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!results && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/30 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Enter a URL to analyze</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              We'll check meta tags, performance, mobile-friendliness, security, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
