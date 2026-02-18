"use client"

import { useState, useEffect, useMemo } from "react"
import {
  RefreshCw, TrendingUp, TrendingDown, Users, MousePointerClick,
  Activity, Zap, Search, FileSearch, Download, Copy,
  LayoutDashboard, Filter, Globe, ChevronLeft, ChevronRight, Menu, X,
  Megaphone, Linkedin, Facebook, Send, Calendar, FileText, MessageSquare, Sparkles, CheckCircle, AlertCircle,
  PenTool, Plus, Trash2, Eye, Code, Mail, UserPlus, Tag, MailCheck, MailX,
  Target, LineChart as LineChartIcon, AlertTriangle, Trophy, ArrowUpRight, ArrowDownRight,
  Crosshair, BarChart3, Award, Gauge, Lightbulb, Link, ExternalLink, Clock
} from "lucide-react"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from "recharts"

interface DashboardData {
  totalEvents: number
  uniqueSessions: number
  returningSessions: number
  affiliateClickRate: number
  avgActionsPerSession: number
  eventGrowth: number
  sessionGrowth: number
  eventCounts: { nameGeneration: number; bulkCheck: number; seoAudit: number; affiliateClick: number; pageView: number }
  deviceCounts: { desktop: number; mobile: number; tablet: number; unknown: number }
  topCountries: Array<{ country: string; count: number }>
  trends: Array<{ date: string; nameGeneration: number; bulkCheck: number; seoAudit: number; affiliateClick: number; total: number }>
  funnel: Array<{ step: string; count: number; rate: number }>
  dropOffs: Record<string, number>
}

interface EventData {
  id: string; action: string; metadata: any; country: string | null
  device: string | null; sessionId: string | null; route: string | null; createdAt: string
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "funnel", label: "Funnels", icon: Filter },
  { id: "geo", label: "Geo & Devices", icon: Globe },
  { id: "events", label: "Events", icon: Activity },
  { id: "email-list", label: "Email List", icon: Mail },
  { id: "seo-intel", label: "SEO Intelligence", icon: Target },
  { id: "content-perf", label: "Content Performance", icon: LineChartIcon },
  { id: "competitor", label: "Competitor Monitor", icon: Crosshair },
  { id: "value-score", label: "Value Score", icon: Gauge },
  { id: "blog-analytics", label: "Blog Analytics", icon: FileText },
  { id: "marketing", label: "Marketing Agent", icon: Megaphone },
  { id: "blog", label: "Blog Editor", icon: PenTool },
]

type BlogCategory = "Domain Strategy" | "SEO Foundations" | "Builder Insights"
type SectionType = "paragraph" | "heading" | "list" | "callout" | "code" | "quote"

interface BlogSectionState {
  id: string
  type: SectionType
  content: string
  level?: 2 | 3
  items?: string[]
  calloutType?: "tip" | "warning" | "cta"
  ctaLink?: string
  ctaText?: string
}

const COLORS = { gold: "#D6B27C", blue: "#3b82f6", green: "#22c55e", muted: "#8F7A55", orange: "#f97316", cyan: "#06b6d4", pink: "#ec4899" }
const DEVICE_COLORS = [COLORS.blue, COLORS.muted, COLORS.cyan, "#6b7280"]
const EVENT_COLORS = [COLORS.gold, COLORS.blue, COLORS.green, COLORS.muted]

const ACTION_LABELS: Record<string, string> = {
  name_generation: "Generate", bulk_check: "Bulk Check", seo_audit: "SEO Audit",
  affiliate_click: "Buy Click", page_view: "Page View",
}
const ACTION_COLORS: Record<string, string> = {
  name_generation: "bg-amber-600/20 text-amber-400", bulk_check: "bg-blue-500/20 text-blue-400",
  seo_audit: "bg-green-500/20 text-green-400", affiliate_click: "bg-amber-500/20 text-amber-300",
  page_view: "bg-gray-500/20 text-gray-400",
}

// ============ SEO INTELLIGENCE MOCK DATA ============
interface KeywordCluster {
  intent: string
  keywords: string[]
  volume: number
  difficulty: number
  currentRank?: number
}

interface CannibalizationWarning {
  keyword: string
  pages: { url: string; rank: number }[]
  impact: "high" | "medium" | "low"
}

interface RankingPage {
  url: string
  keyword: string
  previousRank: number
  currentRank: number
  change: number
}

interface QuickWin {
  keyword: string
  volume: number
  difficulty: number
  currentRank: number
  potentialClicks: number
}

const MOCK_KEYWORD_CLUSTERS: KeywordCluster[] = [
  { intent: "Informational", keywords: ["how to name a startup", "domain name ideas", "brand name generator"], volume: 12500, difficulty: 35, currentRank: 8 },
  { intent: "Commercial", keywords: ["best domain name generator", "ai domain finder", "domain availability checker"], volume: 8200, difficulty: 55, currentRank: 15 },
  { intent: "Transactional", keywords: ["buy domain name", "register .com domain", "cheap domain registration"], volume: 22000, difficulty: 72, currentRank: 45 },
  { intent: "Navigational", keywords: ["namolux", "namolux domain generator", "namolux seo tool"], volume: 150, difficulty: 5, currentRank: 1 },
]

const MOCK_CANNIBALIZATION: CannibalizationWarning[] = [
  { keyword: "domain name generator", pages: [{ url: "/generate", rank: 12 }, { url: "/how-to-name-a-startup", rank: 28 }], impact: "high" },
  { keyword: "seo audit tool", pages: [{ url: "/seo-audit", rank: 18 }, { url: "/seo-domain-check", rank: 35 }], impact: "medium" },
]

const MOCK_LOSING_RANK: RankingPage[] = [
  { url: "/brand-longevity", keyword: "brand longevity tips", previousRank: 5, currentRank: 12, change: -7 },
  { url: "/name-mistakes", keyword: "naming mistakes startups", previousRank: 8, currentRank: 15, change: -7 },
  { url: "/bulk-domain-check", keyword: "bulk domain checker", previousRank: 18, currentRank: 24, change: -6 },
]

const MOCK_QUICK_WINS: QuickWin[] = [
  { keyword: "ai brand name ideas", volume: 1900, difficulty: 22, currentRank: 11, potentialClicks: 380 },
  { keyword: "startup naming tips", volume: 1200, difficulty: 18, currentRank: 14, potentialClicks: 180 },
  { keyword: "free domain search tool", volume: 3200, difficulty: 28, currentRank: 16, potentialClicks: 420 },
  { keyword: "check domain availability free", volume: 2800, difficulty: 32, currentRank: 18, potentialClicks: 340 },
]

// ============ CONTENT PERFORMANCE MOCK DATA ============
interface ContentPerformance {
  url: string
  title: string
  publishedAt: string
  clicks: number
  impressions: number
  ctr: number
  conversions: number
  timeToRank: number // days
  status: "growing" | "stable" | "decaying"
  aiSuggestion: "update" | "merge" | "keep" | "kill"
  suggestMergeWith?: string
}

const MOCK_CONTENT_PERFORMANCE: ContentPerformance[] = [
  { url: "/how-to-name-a-startup", title: "How to Name a Startup", publishedAt: "2025-09-15", clicks: 2450, impressions: 45000, ctr: 5.4, conversions: 180, timeToRank: 21, status: "growing", aiSuggestion: "keep" },
  { url: "/name-mistakes", title: "7 Naming Mistakes to Avoid", publishedAt: "2025-08-22", clicks: 1820, impressions: 38000, ctr: 4.8, conversions: 95, timeToRank: 35, status: "stable", aiSuggestion: "update" },
  { url: "/brand-longevity", title: "Brand Longevity Guide", publishedAt: "2025-07-10", clicks: 890, impressions: 22000, ctr: 4.0, conversions: 42, timeToRank: 28, status: "decaying", aiSuggestion: "update" },
  { url: "/domain-vs-brand", title: "Domain vs Brand Name", publishedAt: "2025-06-05", clicks: 560, impressions: 15000, ctr: 3.7, conversions: 28, timeToRank: 42, status: "decaying", aiSuggestion: "merge", suggestMergeWith: "/how-to-name-a-startup" },
  { url: "/seo-domain-check", title: "SEO Domain Guide", publishedAt: "2025-10-01", clicks: 320, impressions: 8500, ctr: 3.8, conversions: 15, timeToRank: 14, status: "growing", aiSuggestion: "keep" },
]

// ============ COMPETITOR MONITOR MOCK DATA ============
interface CompetitorPage {
  competitor: string
  url: string
  title: string
  discoveredAt: string
  targetKeywords: string[]
}

interface KeywordGap {
  keyword: string
  volume: number
  competitorRank: number
  yourRank: number | null
  opportunity: "high" | "medium" | "low"
}

interface BacklinkSpike {
  competitor: string
  newBacklinks: number
  period: string
  topSources: string[]
}

interface CompetitorInsight {
  competitor: string
  insight: string
  type: "new_page" | "design_change" | "feature_launch" | "seo_move"
  date: string
}

const MOCK_COMPETITOR_PAGES: CompetitorPage[] = [
  { competitor: "Namelix", url: "/ai-name-generator", title: "AI Business Name Generator", discoveredAt: "2026-01-28", targetKeywords: ["ai business name generator", "startup name ai"] },
  { competitor: "LeanDomainSearch", url: "/bulk-search", title: "Bulk Domain Search Tool", discoveredAt: "2026-01-25", targetKeywords: ["bulk domain search", "multiple domain check"] },
  { competitor: "Namecheap", url: "/beast-mode", title: "Beast Mode Domain Search", discoveredAt: "2026-01-20", targetKeywords: ["domain search", "find domains fast"] },
]

const MOCK_KEYWORD_GAPS: KeywordGap[] = [
  { keyword: "ai company name generator", volume: 4500, competitorRank: 3, yourRank: null, opportunity: "high" },
  { keyword: "domain name brainstorming", volume: 2200, competitorRank: 8, yourRank: 42, opportunity: "high" },
  { keyword: "brand name availability", volume: 1800, competitorRank: 5, yourRank: 28, opportunity: "medium" },
  { keyword: "startup domain ideas", volume: 1500, competitorRank: 12, yourRank: 35, opportunity: "medium" },
]

const MOCK_BACKLINK_SPIKES: BacklinkSpike[] = [
  { competitor: "Namelix", newBacklinks: 127, period: "Last 7 days", topSources: ["TechCrunch", "Product Hunt", "Indie Hackers"] },
  { competitor: "Namecheap", newBacklinks: 89, period: "Last 7 days", topSources: ["Forbes", "Entrepreneur", "Wired"] },
]

const MOCK_COMPETITOR_INSIGHTS: CompetitorInsight[] = [
  { competitor: "Namelix", insight: "Launched AI-powered logo generation alongside names", type: "feature_launch", date: "2026-01-30" },
  { competitor: "LeanDomainSearch", insight: "Redesigned homepage with cleaner search interface", type: "design_change", date: "2026-01-27" },
  { competitor: "Namecheap", insight: "Published 12 new blog posts targeting 'how to' keywords", type: "seo_move", date: "2026-01-22" },
]

// ============ SYSTEMATIC VALUE SCORE MOCK DATA ============
interface ValueScoreData {
  overallScore: number
  complexity: { score: number; issues: string[] }
  clarity: { score: number; issues: string[] }
  roiPotential: { score: number; opportunities: string[] }
  optimizationLevel: { score: number; improvements: string[] }
  recommendations: { action: string; impact: "high" | "medium" | "low"; effort: "low" | "medium" | "high" }[]
}

const MOCK_VALUE_SCORE: ValueScoreData = {
  overallScore: 78,
  complexity: {
    score: 82,
    issues: ["Too many navigation items (10+)", "3 pages have overlapping content", "Footer could be simplified"]
  },
  clarity: {
    score: 75,
    issues: ["Homepage CTA could be clearer", "Value proposition buried below fold", "Pricing page lacks comparison"]
  },
  roiPotential: {
    score: 85,
    opportunities: ["Affiliate conversions up 12% this month", "SEO traffic growing 8% weekly", "High intent keywords available"]
  },
  optimizationLevel: {
    score: 70,
    improvements: ["Image optimization needed", "Core Web Vitals: LCP needs work", "Missing structured data on 3 pages"]
  },
  recommendations: [
    { action: "Consolidate /domain-vs-brand into /how-to-name-a-startup", impact: "high", effort: "low" },
    { action: "Add FAQ schema to all blog posts", impact: "medium", effort: "low" },
    { action: "Optimize hero section images (save 400KB)", impact: "medium", effort: "low" },
    { action: "Create comparison page for SEO audit tools", impact: "high", effort: "medium" },
    { action: "Add more internal links from blog to /generate", impact: "high", effort: "low" },
    { action: "Improve mobile navigation UX", impact: "medium", effort: "medium" },
  ]
}

function MetricCard({ title, value, icon: Icon, trend, color = "text-primary" }: {
  title: string; value: string | number; icon: any; trend?: number; color?: string
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/30 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg bg-primary/10 p-2 ${color}`}><Icon className="h-5 w-5" /></div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  )
}

function FunnelStep({ step, count, rate, isLast, dropOff }: {
  step: string; count: number; rate: number; isLast: boolean; dropOff?: number
}) {
  // Handle NaN or invalid dropOff values
  const validDropOff = dropOff !== undefined && !isNaN(dropOff) && isFinite(dropOff) ? dropOff : null

  return (
    <div className="flex-1 min-w-0">
      <div className="relative">
        <div className="h-16 rounded-lg bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-between px-4"
          style={{ width: `${Math.max(rate, 20)}%` }}>
          <span className="text-sm font-medium text-foreground truncate">{step}</span>
          <span className="text-sm font-bold text-primary">{count}</span>
        </div>
        <div className="absolute -bottom-5 left-0 text-xs text-muted-foreground">{rate}%</div>
      </div>
      {!isLast && validDropOff !== null && (
        <div className="mt-6 mb-2 text-center"><span className="text-xs text-red-400/80">↓ {validDropOff}% drop</span></div>
      )}
    </div>
  )
}

export default function MetricsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [days, setDays] = useState<7 | 30 | 90>(7)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [eventFilter, setEventFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showGenerate, setShowGenerate] = useState(true)
  const [showBulk, setShowBulk] = useState(true)
  const [showAudit, setShowAudit] = useState(true)
  const [showAffiliate, setShowAffiliate] = useState(true)

  // Marketing Agent State
  const [maPlatform, setMaPlatform] = useState<"linkedin" | "facebook">("linkedin")
  const [maPostType, setMaPostType] = useState<"insight" | "product_update" | "build_in_public" | "comment_reply">("insight")
  const [maContext, setMaContext] = useState("")
  const [maComment, setMaComment] = useState("")
  const [maGenerating, setMaGenerating] = useState(false)
  const [maResult, setMaResult] = useState<{
    postText: string
    confidence: number
    reason: string
    platform: string
    postType: string
    generatedAt: string
  } | null>(null)
  const [maError, setMaError] = useState<string | null>(null)
  const [maCopied, setMaCopied] = useState(false)
  const [maWeeklyPlan, setMaWeeklyPlan] = useState<any>(null)
  const [maGeneratingPlan, setMaGeneratingPlan] = useState(false)

  // Blog Editor State
  const [blogTitle, setBlogTitle] = useState("")
  const [blogSlug, setBlogSlug] = useState("")
  const [blogDescription, setBlogDescription] = useState("")
  const [blogCategory, setBlogCategory] = useState<BlogCategory>("Domain Strategy")
  const [blogReadTime, setBlogReadTime] = useState(5)
  const [blogAuthor, setBlogAuthor] = useState("NamoLux Team")
  const [blogFeatured, setBlogFeatured] = useState(false)
  const [blogSections, setBlogSections] = useState<BlogSectionState[]>([
    { id: crypto.randomUUID(), type: "paragraph", content: "" }
  ])
  const [blogPreview, setBlogPreview] = useState(false)
  const [blogCopied, setBlogCopied] = useState(false)
  const [blogTopic, setBlogTopic] = useState("")
  const [blogGenerating, setBlogGenerating] = useState(false)
  const [blogError, setBlogError] = useState<string | null>(null)

  // Blog Analytics State
  const [blogAnalytics, setBlogAnalytics] = useState<{
    totalViews: number
    uniqueViewers: number
    topArticles: Array<{ slug: string; title: string; category: string; views: number }>
    categoryBreakdown: Array<{ category: string; views: number }>
    recentTrend: Array<{ date: string; views: number }>
    keywordSuggestions: Array<{ article: string; slug: string; keywords: string[]; score: number }>
  } | null>(null)
  const [blogAnalyticsLoading, setBlogAnalyticsLoading] = useState(false)

  // Email List State
  interface EmailSubscriber {
    id: string
    email: string
    source: string
    tags: string[]
    status: "subscribed" | "unsubscribed" | "bounced"
    created_at: string
    updated_at?: string
  }
  const [emailList, setEmailList] = useState<EmailSubscriber[]>([])
  const [emailStats, setEmailStats] = useState<{
    total: number
    subscribed: number
    unsubscribed: number
    bounced: number
    recentSignups: number
  } | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newEmailSource, setNewEmailSource] = useState("manual")
  const [emailSearchQuery, setEmailSearchQuery] = useState("")
  const [emailStatusFilter, setEmailStatusFilter] = useState<"all" | "subscribed" | "unsubscribed" | "bounced">("all")

  const fetchEmailList = async () => {
    setEmailLoading(true)
    try {
      const res = await fetch("/api/admin/email-list")
      if (!res.ok) throw new Error("Failed to fetch email list")
      const json = await res.json()
      setEmailList(json.emails || [])
      setEmailStats(json.stats || null)
    } catch (e: any) {
      console.error("Failed to fetch email list:", e)
    } finally {
      setEmailLoading(false)
    }
  }

  const addEmail = async () => {
    if (!newEmail.includes("@")) return
    try {
      const res = await fetch("/api/admin/email-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, source: newEmailSource })
      })
      if (res.ok) {
        setNewEmail("")
        fetchEmailList()
      }
    } catch (e) {
      console.error("Failed to add email:", e)
    }
  }

  const unsubscribeEmail = async (email: string, hardDelete: boolean = false) => {
    try {
      const url = `/api/admin/email-list?email=${encodeURIComponent(email)}${hardDelete ? "&hard=true" : ""}`
      const res = await fetch(url, { method: "DELETE" })
      if (res.ok) fetchEmailList()
    } catch (e) {
      console.error("Failed to unsubscribe:", e)
    }
  }

  const exportEmailsCSV = () => {
    const subscribedEmails = emailList.filter(e => e.status === "subscribed")
    const csv = "Email,Source,Tags,Subscribed At\n" +
      subscribedEmails.map(e => `${e.email},${e.source},"${e.tags?.join(", ") || ""}",${e.created_at}`).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `namolux-emails-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const fetchBlogAnalytics = async () => {
    setBlogAnalyticsLoading(true)
    try {
      const res = await fetch(`/api/metrics/blog-analytics?days=${days}`)
      if (!res.ok) throw new Error("Failed to fetch blog analytics")
      const json = await res.json()
      setBlogAnalytics(json)
    } catch (e: any) {
      console.error("Failed to fetch blog analytics:", e)
    } finally {
      setBlogAnalyticsLoading(false)
    }
  }

  const fetchData = async (d: number = days) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/metrics/summary?days=${d}`)
      if (!res.ok) throw new Error("Failed to fetch metrics")
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async (page: number = 1) => {
    try {
      const params = new URLSearchParams({ days: days.toString(), page: page.toString(), limit: "20" })
      if (eventFilter) params.set("action", eventFilter)
      if (searchQuery) params.set("search", searchQuery)
      const res = await fetch(`/api/metrics/events?${params}`)
      if (!res.ok) throw new Error("Failed to fetch events")
      const json = await res.json()
      setEvents(json.events)
      setTotalPages(json.pagination.totalPages)
      setCurrentPage(json.pagination.page)
    } catch (e) { console.error("Failed to fetch events:", e) }
  }

  useEffect(() => { fetchData(); fetchEvents() }, [])
  useEffect(() => { if (activeTab === "events") fetchEvents(1) }, [activeTab, eventFilter, searchQuery, days])
  useEffect(() => { if (activeTab === "blog-analytics") fetchBlogAnalytics() }, [activeTab, days])
  useEffect(() => { if (activeTab === "email-list") fetchEmailList() }, [activeTab])

  const handleDaysChange = (d: 7 | 30 | 90) => { setDays(d); fetchData(d); if (activeTab === "events") fetchEvents(1) }
  const handleExport = () => { window.open(`/api/metrics/export?days=${days}`, "_blank") }
  const handleCopySummary = async () => {
    if (!data) return
    const summary = `NamoLux Metrics (${days} days)\n━━━━━━━━━━━━━━━━━━━━━━━━\n📊 Total Events: ${data.totalEvents}\n👥 Unique Sessions: ${data.uniqueSessions}\n🔄 Returning: ${data.returningSessions}\n💰 Affiliate Rate: ${data.affiliateClickRate}%\n⚡ Avg Actions: ${data.avgActionsPerSession}`
    await navigator.clipboard.writeText(summary)
    alert("Summary copied!")
  }

  // Marketing Agent Functions
  const handleGenerateContent = async () => {
    setMaGenerating(true)
    setMaError(null)
    setMaResult(null)
    try {
      const res = await fetch("/api/admin/marketing-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          platform: maPlatform,
          postType: maPostType,
          context: maContext || undefined,
          commentToReply: maPostType === "comment_reply" ? maComment : undefined
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to generate")
      setMaResult(json.data)
    } catch (e: any) {
      setMaError(e.message)
    } finally {
      setMaGenerating(false)
    }
  }

  const handleGenerateWeeklyPlan = async () => {
    setMaGeneratingPlan(true)
    setMaError(null)
    try {
      const res = await fetch("/api/admin/marketing-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "weekly-plan", context: maContext || undefined })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to generate plan")
      setMaWeeklyPlan(json.data)
    } catch (e: any) {
      setMaError(e.message)
    } finally {
      setMaGeneratingPlan(false)
    }
  }

  const handleCopyPost = async () => {
    if (!maResult?.postText) return
    await navigator.clipboard.writeText(maResult.postText)
    setMaCopied(true)
    setTimeout(() => setMaCopied(false), 2000)
  }

  // Blog Editor Functions
  const generateSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
  }

  const handleTitleChange = (title: string) => {
    setBlogTitle(title)
    setBlogSlug(generateSlug(title))
  }

  const addSection = (type: SectionType) => {
    const newSection: BlogSectionState = {
      id: crypto.randomUUID(),
      type,
      content: "",
      ...(type === "heading" && { level: 2 as const }),
      ...(type === "list" && { items: [""] }),
      ...(type === "callout" && { calloutType: "tip" as const }),
    }
    setBlogSections([...blogSections, newSection])
  }

  const updateSection = (id: string, updates: Partial<BlogSectionState>) => {
    setBlogSections(blogSections.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const removeSection = (id: string) => {
    if (blogSections.length > 1) {
      setBlogSections(blogSections.filter(s => s.id !== id))
    }
  }

  const moveSection = (id: string, direction: "up" | "down") => {
    const idx = blogSections.findIndex(s => s.id === id)
    if ((direction === "up" && idx <= 0) || (direction === "down" && idx >= blogSections.length - 1)) return
    const newSections = [...blogSections]
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    ;[newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]]
    setBlogSections(newSections)
  }

  const generateBlogCode = () => {
    const today = new Date().toISOString().split("T")[0]
    const sections = blogSections.map(s => {
      const base: any = { type: s.type, content: s.content }
      if (s.type === "heading") base.level = s.level
      if (s.type === "list") base.items = s.items
      if (s.type === "callout") {
        base.calloutType = s.calloutType
        if (s.calloutType === "cta") {
          base.ctaLink = s.ctaLink || "/generate"
          base.ctaText = s.ctaText || "Try It Now"
        }
      }
      return base
    })

    return `  {
    slug: "${blogSlug}",
    title: "${blogTitle.replace(/"/g, '\\"')}",
    description: "${blogDescription.replace(/"/g, '\\"')}",
    category: "${blogCategory}",
    readTime: ${blogReadTime},
    publishedAt: "${today}",
    author: "${blogAuthor}",
    featured: ${blogFeatured},
    content: ${JSON.stringify(sections, null, 6).replace(/\n/g, "\n    ")}
  },`
  }

  const handleCopyBlogCode = async () => {
    const code = generateBlogCode()
    await navigator.clipboard.writeText(code)
    setBlogCopied(true)
    setTimeout(() => setBlogCopied(false), 2000)
  }

  const resetBlogForm = () => {
    setBlogTitle("")
    setBlogSlug("")
    setBlogDescription("")
    setBlogCategory("Domain Strategy")
    setBlogReadTime(5)
    setBlogAuthor("NamoLux Team")
    setBlogFeatured(false)
    setBlogSections([{ id: crypto.randomUUID(), type: "paragraph", content: "" }])
    setBlogTopic("")
    setBlogError(null)
  }

  const handleGenerateBlogWithAI = async () => {
    if (!blogTopic.trim()) {
      setBlogError("Please enter a topic first")
      return
    }

    setBlogGenerating(true)
    setBlogError(null)

    try {
      const res = await fetch("/api/admin/generate-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: blogTopic,
          category: blogCategory
        })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to generate")

      const { title, description, readTime, content } = json.data

      // Populate the form with generated content
      setBlogTitle(title)
      setBlogSlug(generateSlug(title))
      setBlogDescription(description)
      setBlogReadTime(readTime || 5)

      // Convert content sections to our format
      const sections: BlogSectionState[] = content.map((section: any) => ({
        id: crypto.randomUUID(),
        type: section.type,
        content: section.content || "",
        level: section.level,
        items: section.items,
        calloutType: section.calloutType,
        ctaLink: section.ctaLink,
        ctaText: section.ctaText
      }))

      setBlogSections(sections)
      setBlogTopic("") // Clear the topic input after successful generation

    } catch (e: any) {
      setBlogError(e.message)
    } finally {
      setBlogGenerating(false)
    }
  }

  const featureMixData = useMemo(() => {
    if (!data) return []
    return [
      { name: "Generate", value: data.eventCounts.nameGeneration },
      { name: "Bulk Check", value: data.eventCounts.bulkCheck },
      { name: "SEO Audit", value: data.eventCounts.seoAudit },
      { name: "Buy Click", value: data.eventCounts.affiliateClick },
    ].filter(d => d.value > 0)
  }, [data])

  const deviceData = useMemo(() => {
    if (!data) return []
    return [
      { name: "Desktop", value: data.deviceCounts.desktop },
      { name: "Mobile", value: data.deviceCounts.mobile },
      { name: "Tablet", value: data.deviceCounts.tablet },
    ].filter(d => d.value > 0)
  }, [data])

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="lg:hidden p-2 hover:bg-muted/50 rounded-lg">
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="text-xl font-bold text-foreground">📊 NamoLux Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-1 bg-muted/30 rounded-lg p-1">
              {[7, 30, 90].map((d) => (
                <button key={d} onClick={() => handleDaysChange(d as 7 | 30 | 90)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {d}d
                </button>
              ))}
            </div>
            <button onClick={() => fetchData()} className="p-2 hover:bg-muted/50 rounded-lg" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleExport} className="p-2 hover:bg-muted/50 rounded-lg" title="Export CSV">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={handleCopySummary} className="p-2 hover:bg-muted/50 rounded-lg" title="Copy Summary">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className={`${mobileNavOpen ? "block" : "hidden"} lg:block w-48 shrink-0 border-r border-border/40 min-h-[calc(100vh-57px)] bg-background`}>
          <div className="p-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileNavOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {error && <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-red-400">Error: {error}</div>}

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && data && (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Events" value={data.totalEvents} icon={Activity} trend={data.eventGrowth} />
                <MetricCard title="Generates" value={data.eventCounts.nameGeneration} icon={Zap} color="text-primary" />
                <MetricCard title="Bulk Checks" value={data.eventCounts.bulkCheck} icon={Search} color="text-blue-400" />
                <MetricCard title="SEO Audits" value={data.eventCounts.seoAudit} icon={FileSearch} color="text-green-400" />
              </div>

              {/* Charts Row */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Trend Chart */}
                <div className="lg:col-span-2 rounded-xl border border-border/40 bg-card/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">📈 Daily Trend</h3>
                    <div className="flex gap-2 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={showGenerate} onChange={(e) => setShowGenerate(e.target.checked)} className="rounded" />
                        <span style={{ color: COLORS.gold }}>Generate</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={showBulk} onChange={(e) => setShowBulk(e.target.checked)} className="rounded" />
                        <span style={{ color: COLORS.blue }}>Bulk</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={showAudit} onChange={(e) => setShowAudit(e.target.checked)} className="rounded" />
                        <span style={{ color: COLORS.green }}>Audit</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={showAffiliate} onChange={(e) => setShowAffiliate(e.target.checked)} className="rounded" />
                        <span style={{ color: COLORS.pink }}>Buy</span>
                      </label>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data.trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11}
                        tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}` }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      {showGenerate && <Line type="monotone" dataKey="nameGeneration" name="Generate" stroke={COLORS.gold} strokeWidth={2} dot={false} />}
                      {showBulk && <Line type="monotone" dataKey="bulkCheck" name="Bulk" stroke={COLORS.blue} strokeWidth={2} dot={false} strokeDasharray="5 5" />}
                      {showAudit && <Line type="monotone" dataKey="seoAudit" name="Audit" stroke={COLORS.green} strokeWidth={2} dot={false} />}
                      {showAffiliate && <Line type="monotone" dataKey="affiliateClick" name="Buy" stroke={COLORS.pink} strokeWidth={2} dot={false} strokeDasharray="3 3" />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Feature Mix Pie */}
                <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                  <h3 className="font-semibold text-foreground mb-4">🎯 Feature Mix</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={featureMixData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {featureMixData.map((_, i) => <Cell key={i} fill={EVENT_COLORS[i % EVENT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {featureMixData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EVENT_COLORS[i] }} />
                        <span className="text-muted-foreground">{d.name}: {d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FUNNEL TAB */}
          {activeTab === "funnel" && data && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">🔄 Conversion Funnel</h2>
              {data.funnel.every(f => f.count === 0) ? (
                <div className="rounded-xl border border-border/40 bg-card/30 p-6 text-center">
                  <p className="text-muted-foreground">No session data yet. Use the site to generate funnel data.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/40 bg-card/30 p-6">
                  <div className="space-y-8">
                    {data.funnel.map((f, i) => {
                      const nextCount = i < data.funnel.length - 1 ? data.funnel[i+1].count : 0
                      const dropOff = f.count > 0 ? Math.round((1 - nextCount / f.count) * 100) : undefined
                      return (
                        <FunnelStep key={f.step} step={f.step} count={f.count} rate={f.rate}
                          isLast={i === data.funnel.length - 1} dropOff={dropOff} />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GEO & DEVICES TAB */}
          {activeTab === "geo" && data && (() => {
            // Clean up country data - handle nil/null/Unknown
            const cleanedCountries = data.topCountries
              .map(c => ({
                ...c,
                country: c.country && c.country !== "nil" && c.country !== "null" ? c.country : "Unknown"
              }))
              .slice(0, 10)

            return (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Countries */}
                <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                  <h3 className="font-semibold text-foreground mb-4">🌍 Top Countries</h3>
                  {cleanedCountries.length === 0 || (cleanedCountries.length === 1 && cleanedCountries[0].country === "Unknown") ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                      No geographic data available yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={cleanedCountries} layout="vertical" margin={{ left: 50, right: 20, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="country" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={45} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                        />
                        <Bar dataKey="count" fill={COLORS.gold} radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Device Split */}
                <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                  <h3 className="font-semibold text-foreground mb-4">📱 Device Split</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {deviceData.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 justify-center mt-4">
                    {deviceData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEVICE_COLORS[i] }} />
                        <span className="text-foreground">{d.name}:</span>
                        <span className="text-muted-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )})()}

          {/* EVENTS TAB */}
          {activeTab === "events" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}
                  className="rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground">
                  <option value="">All Events</option>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-border/40 bg-card/30 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
                </div>
              </div>

              {/* Events Table */}
              <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Event</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Details</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Session</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Country</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Device</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="border-b border-border/20 last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${ACTION_COLORS[e.action] || ""}`}>
                            {ACTION_LABELS[e.action] || e.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">
                          {e.metadata?.keyword || e.metadata?.url || e.metadata?.domain || e.metadata?.domainCount ? (
                            <>{e.metadata.keyword || e.metadata.url || e.metadata.domain || `${e.metadata.domainCount} domains`}</>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">
                          {e.sessionId?.slice(0, 12) || "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{e.country || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell capitalize">{e.device || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No events found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => fetchEvents(currentPage - 1)} disabled={currentPage <= 1}
                    className="p-2 rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => fetchEvents(currentPage + 1)} disabled={currentPage >= totalPages}
                    className="p-2 rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EMAIL LIST TAB */}
          {activeTab === "email-list" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Marketing List
                </h2>
                <div className="flex gap-2">
                  <button onClick={fetchEmailList} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground">
                    <RefreshCw className={`h-4 w-4 ${emailLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button onClick={exportEmailsCSV} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-sm text-primary hover:bg-primary/20">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              {emailStats && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{emailStats.total}</p>
                  </div>
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                    <div className="flex items-center gap-2 text-green-400 mb-1">
                      <MailCheck className="h-4 w-4" />
                      <span className="text-xs">Subscribed</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{emailStats.subscribed}</p>
                  </div>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2 text-red-400 mb-1">
                      <MailX className="h-4 w-4" />
                      <span className="text-xs">Unsubscribed</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{emailStats.unsubscribed}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs">Bounced</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{emailStats.bounced}</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <UserPlus className="h-4 w-4" />
                      <span className="text-xs">Last 7 Days</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">+{emailStats.recentSignups}</p>
                  </div>
                </div>
              )}

              {/* Add Email Form */}
              <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Add Subscriber
                </h3>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 min-w-[200px] rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <select
                    value={newEmailSource}
                    onChange={(e) => setNewEmailSource(e.target.value)}
                    className="rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="manual">Manual</option>
                    <option value="landing_page">Landing Page</option>
                    <option value="blog">Blog</option>
                    <option value="product">Product</option>
                    <option value="social">Social Media</option>
                    <option value="referral">Referral</option>
                  </select>
                  <button
                    onClick={addEmail}
                    disabled={!newEmail.includes("@")}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={emailSearchQuery}
                    onChange={(e) => setEmailSearchQuery(e.target.value)}
                    placeholder="Search emails..."
                    className="w-full rounded-lg border border-border/40 bg-card/30 pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <select
                  value={emailStatusFilter}
                  onChange={(e) => setEmailStatusFilter(e.target.value as any)}
                  className="rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground"
                >
                  <option value="all">All Status</option>
                  <option value="subscribed">Subscribed</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                </select>
              </div>

              {/* Email List Table */}
              <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Source</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Subscribed</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailList
                        .filter(e => emailStatusFilter === "all" || e.status === emailStatusFilter)
                        .filter(e => !emailSearchQuery || e.email.toLowerCase().includes(emailSearchQuery.toLowerCase()))
                        .map((subscriber) => (
                        <tr key={subscriber.id} className="border-b border-border/20 last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{subscriber.email}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{subscriber.source}</div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell capitalize">{subscriber.source}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              subscriber.status === "subscribed" ? "bg-green-500/20 text-green-400" :
                              subscriber.status === "unsubscribed" ? "bg-red-500/20 text-red-400" :
                              "bg-amber-500/20 text-amber-400"
                            }`}>
                              {subscriber.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                            {new Date(subscriber.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {subscriber.status === "subscribed" && (
                                <button
                                  onClick={() => unsubscribeEmail(subscriber.email)}
                                  className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
                                  title="Unsubscribe"
                                >
                                  <MailX className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => unsubscribeEmail(subscriber.email, true)}
                                className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
                                title="Delete permanently"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {emailList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            {emailLoading ? "Loading..." : "No subscribers yet. Add your first one above!"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SQL Schema Info */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <h4 className="font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4" /> Database Setup Required
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Run this SQL in your Supabase SQL Editor to create the email_subscribers table:
                </p>
                <pre className="text-[10px] bg-background/50 p-2 rounded overflow-x-auto text-muted-foreground">
{`CREATE TABLE email_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'manual',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage emails" ON email_subscribers
  FOR ALL USING (true) WITH CHECK (true);`}
                </pre>
              </div>
            </div>
          )}

          {/* SEO INTELLIGENCE TAB */}
          {activeTab === "seo-intel" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  SEO Intelligence
                </h2>
                <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded">Not just keywords — decisions</span>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Keyword Clusters */}
                <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Keyword Clusters (Intent-Grouped)
                  </h3>
                  <div className="space-y-3">
                    {MOCK_KEYWORD_CLUSTERS.map((cluster, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{cluster.intent}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Vol: {cluster.volume.toLocaleString()}</span>
                            <span className={`px-2 py-0.5 rounded ${cluster.difficulty < 30 ? "bg-green-500/20 text-green-400" : cluster.difficulty < 50 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                              KD: {cluster.difficulty}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cluster.keywords.map((kw, ki) => (
                            <span key={ki} className="text-xs bg-background/50 px-2 py-1 rounded text-muted-foreground">{kw}</span>
                          ))}
                        </div>
                        {cluster.currentRank && (
                          <div className="mt-2 text-xs text-muted-foreground">Currently ranking: #{cluster.currentRank}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cannibalization Warnings */}
                <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" /> Cannibalization Warnings
                  </h3>
                  <div className="space-y-3">
                    {MOCK_CANNIBALIZATION.map((warn, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${warn.impact === "high" ? "bg-red-500/10 border-red-500/30" : warn.impact === "medium" ? "bg-orange-500/10 border-orange-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">"{warn.keyword}"</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${warn.impact === "high" ? "bg-red-500/20 text-red-400" : warn.impact === "medium" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {warn.impact} impact
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {warn.pages.map((p, pi) => (
                            <div key={pi} className="flex items-center gap-2">
                              <span className="text-foreground/70">{p.url}</span>
                              <span className="text-muted-foreground">→ Rank #{p.rank}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-primary">💡 Consider consolidating or adding canonical tags</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pages Losing Rank */}
                <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <ArrowDownRight className="h-4 w-4 text-red-400" /> Pages Losing Rank
                  </h3>
                  <div className="space-y-2">
                    {MOCK_LOSING_RANK.map((page, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <div>
                          <div className="text-sm font-medium text-foreground">{page.url}</div>
                          <div className="text-xs text-muted-foreground">"{page.keyword}"</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">#{page.previousRank}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-foreground">#{page.currentRank}</span>
                          </div>
                          <div className="text-xs text-red-400 flex items-center gap-1">
                            <ArrowDownRight className="h-3 w-3" />
                            {page.change} positions
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Win Opportunities */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" /> Quick Win Opportunities
                  </h3>
                  <p className="text-xs text-muted-foreground">Low competition, mid volume — easy gains</p>
                  <div className="space-y-2">
                    {MOCK_QUICK_WINS.map((win, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-primary/20">
                        <div>
                          <div className="text-sm font-medium text-foreground">"{win.keyword}"</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>Vol: {win.volume.toLocaleString()}</span>
                            <span className="text-green-400">KD: {win.difficulty}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-foreground">Rank #{win.currentRank}</div>
                          <div className="text-xs text-primary flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            +{win.potentialClicks} potential clicks/mo
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTENT PERFORMANCE TAB */}
          {activeTab === "content-perf" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-primary" />
                  Content Performance
                </h2>
                <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded">Connect content → outcomes</span>
              </div>

              {/* Performance Table */}
              <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Page</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Clicks</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">CTR</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Conv.</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Time to Rank</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">AI Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_CONTENT_PERFORMANCE.map((content, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-foreground">{content.title}</div>
                          <div className="text-xs text-muted-foreground">{content.url}</div>
                        </td>
                        <td className="px-4 py-3 text-foreground hidden md:table-cell">{content.clicks.toLocaleString()}</td>
                        <td className="px-4 py-3 text-foreground hidden md:table-cell">{content.ctr}%</td>
                        <td className="px-4 py-3 text-foreground hidden lg:table-cell">{content.conversions}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{content.timeToRank} days</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            content.status === "growing" ? "bg-green-500/20 text-green-400" :
                            content.status === "stable" ? "bg-blue-500/20 text-blue-400" :
                            "bg-red-500/20 text-red-400"
                          }`}>
                            {content.status === "growing" && <ArrowUpRight className="h-3 w-3 inline mr-1" />}
                            {content.status === "decaying" && <ArrowDownRight className="h-3 w-3 inline mr-1" />}
                            {content.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            content.aiSuggestion === "keep" ? "bg-green-500/20 text-green-400" :
                            content.aiSuggestion === "update" ? "bg-yellow-500/20 text-yellow-400" :
                            content.aiSuggestion === "merge" ? "bg-orange-500/20 text-orange-400" :
                            "bg-red-500/20 text-red-400"
                          }`}>
                            {content.aiSuggestion}
                          </span>
                          {content.suggestMergeWith && (
                            <div className="text-xs text-muted-foreground mt-1">→ {content.suggestMergeWith}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Decay Alerts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" /> Decay Alerts (Content Going Stale)
                  </h3>
                  <div className="space-y-2">
                    {MOCK_CONTENT_PERFORMANCE.filter(c => c.status === "decaying").map((content, i) => (
                      <div key={i} className="p-3 rounded-lg bg-background/50 border border-orange-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-foreground">{content.title}</div>
                            <div className="text-xs text-muted-foreground">Published: {content.publishedAt}</div>
                          </div>
                          <div className="text-xs text-orange-400">
                            CTR dropped to {content.ctr}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Suggestions Summary */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" /> AI Recommendations
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="text-sm font-medium text-foreground">Update 2 posts</div>
                      <div className="text-xs text-muted-foreground">Refresh content, add 2025 data, improve CTAs</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="text-sm font-medium text-foreground">Merge 1 post</div>
                      <div className="text-xs text-muted-foreground">/domain-vs-brand → /how-to-name-a-startup</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="text-sm font-medium text-foreground">Keep 2 posts</div>
                      <div className="text-xs text-muted-foreground">Performing well, no action needed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPETITOR MONITOR TAB */}
          {activeTab === "competitor" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Crosshair className="h-5 w-5 text-primary" />
                  Competitor Monitor
                </h2>
                <span className="text-xs text-muted-foreground bg-red-500/10 text-red-400 px-2 py-1 rounded">Silent but deadly</span>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* New Competitor Pages */}
                <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-blue-400" /> New Competitor Pages
                  </h3>
                  <div className="space-y-3">
                    {MOCK_COMPETITOR_PAGES.map((page, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{page.competitor}</span>
                          <span className="text-xs text-muted-foreground">{page.discoveredAt}</span>
                        </div>
                        <div className="text-sm font-medium text-foreground">{page.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{page.url}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {page.targetKeywords.map((kw, ki) => (
                            <span key={ki} className="text-xs bg-background/50 px-2 py-0.5 rounded text-muted-foreground">{kw}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keyword Gaps */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Keyword Gaps
                  </h3>
                  <p className="text-xs text-muted-foreground">Keywords competitors rank for that you don't</p>
                  <div className="space-y-2">
                    {MOCK_KEYWORD_GAPS.map((gap, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-primary/20">
                        <div>
                          <div className="text-sm font-medium text-foreground">"{gap.keyword}"</div>
                          <div className="text-xs text-muted-foreground">Vol: {gap.volume.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Competitor: <span className="text-green-400">#{gap.competitorRank}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            You: <span className={gap.yourRank ? "text-foreground" : "text-red-400"}>{gap.yourRank ? `#${gap.yourRank}` : "Not ranking"}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${gap.opportunity === "high" ? "bg-green-500/20 text-green-400" : gap.opportunity === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-muted/30 text-muted-foreground"}`}>
                            {gap.opportunity} opp.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Backlink Spikes */}
                <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Link className="h-4 w-4 text-green-400" /> Backlink Growth Spikes
                  </h3>
                  <div className="space-y-3">
                    {MOCK_BACKLINK_SPIKES.map((spike, i) => (
                      <div key={i} className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{spike.competitor}</span>
                          <span className="text-sm text-green-400 font-bold">+{spike.newBacklinks} links</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{spike.period}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {spike.topSources.map((src, si) => (
                            <span key={si} className="text-xs bg-background/50 px-2 py-0.5 rounded text-muted-foreground">{src}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competitor Insights */}
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-orange-400" /> Why They're Ranking (And You're Not)
                  </h3>
                  <div className="space-y-2">
                    {MOCK_COMPETITOR_INSIGHTS.map((insight, i) => (
                      <div key={i} className="p-3 rounded-lg bg-background/50 border border-orange-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">{insight.competitor}</span>
                          <span className="text-xs text-muted-foreground">{insight.date}</span>
                        </div>
                        <div className="text-sm text-foreground">{insight.insight}</div>
                        <span className={`text-xs mt-2 inline-block ${
                          insight.type === "feature_launch" ? "text-blue-400" :
                          insight.type === "design_change" ? "text-purple-400" :
                          insight.type === "seo_move" ? "text-green-400" :
                          "text-muted-foreground"
                        }`}>
                          {insight.type.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEMATIC VALUE SCORE TAB */}
          {activeTab === "value-score" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  Systematic Value Score
                </h2>
                <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded">Your Signature Metric</span>
              </div>

              {/* Overall Score */}
              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Overall Optimization Score</div>
                    <div className="text-5xl font-bold text-primary">{MOCK_VALUE_SCORE.overallScore}%</div>
                    <div className="text-sm text-muted-foreground mt-2">
                      This site is <span className="text-primary font-medium">{MOCK_VALUE_SCORE.overallScore}% optimised</span>
                    </div>
                  </div>
                  <div className="h-32 w-32 relative">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" opacity="0.2" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="10"
                        strokeDasharray={`${MOCK_VALUE_SCORE.overallScore * 2.83} 283`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Award className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-foreground">Complexity</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{MOCK_VALUE_SCORE.complexity.score}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{MOCK_VALUE_SCORE.complexity.issues.length} issues found</div>
                </div>
                <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-foreground">Clarity</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{MOCK_VALUE_SCORE.clarity.score}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{MOCK_VALUE_SCORE.clarity.issues.length} improvements</div>
                </div>
                <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">ROI Potential</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{MOCK_VALUE_SCORE.roiPotential.score}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{MOCK_VALUE_SCORE.roiPotential.opportunities.length} opportunities</div>
                </div>
                <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-orange-400" />
                    <span className="text-sm font-medium text-foreground">Optimization</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{MOCK_VALUE_SCORE.optimizationLevel.score}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{MOCK_VALUE_SCORE.optimizationLevel.improvements.length} improvements</div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Issues Summary */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                    <h3 className="font-medium text-foreground flex items-center gap-2 mb-3">
                      <BarChart3 className="h-4 w-4 text-blue-400" /> Complexity Issues
                    </h3>
                    <ul className="space-y-2">
                      {MOCK_VALUE_SCORE.complexity.issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                    <h3 className="font-medium text-foreground flex items-center gap-2 mb-3">
                      <Eye className="h-4 w-4 text-green-400" /> Clarity Issues
                    </h3>
                    <ul className="space-y-2">
                      {MOCK_VALUE_SCORE.clarity.issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <h3 className="font-medium text-foreground flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-primary" /> ROI Opportunities
                    </h3>
                    <ul className="space-y-2">
                      {MOCK_VALUE_SCORE.roiPotential.opportunities.map((opp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="rounded-xl border border-primary/30 bg-card/30 p-4 space-y-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" /> Recommendations
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    "Remove X, simplify Y, double down on Z."
                  </p>
                  <div className="space-y-2">
                    {MOCK_VALUE_SCORE.recommendations.map((rec, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border/20">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm text-foreground">{rec.action}</span>
                          <div className="flex gap-1 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              rec.impact === "high" ? "bg-green-500/20 text-green-400" :
                              rec.impact === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-muted/30 text-muted-foreground"
                            }`}>
                              {rec.impact}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              rec.effort === "low" ? "bg-green-500/20 text-green-400" :
                              rec.effort === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            }`}>
                              {rec.effort} effort
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 mt-4">
                    <div className="text-sm font-medium text-primary">Quick Win Summary</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {MOCK_VALUE_SCORE.recommendations.filter(r => r.impact === "high" && r.effort === "low").length} high-impact, low-effort actions available
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MARKETING AGENT TAB */}
          {activeTab === "marketing" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Marketing Agent Engine
                </h2>
                <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">Internal Only</span>
              </div>

              {/* Input Controls */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column - Controls */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Generate Content
                    </h3>

                    {/* Platform Selector */}
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Platform</label>
                      <div className="flex gap-2">
                        <button onClick={() => setMaPlatform("linkedin")}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${maPlatform === "linkedin" ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-border"}`}>
                          <Linkedin className="h-4 w-4" /> LinkedIn
                        </button>
                        <button onClick={() => setMaPlatform("facebook")}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${maPlatform === "facebook" ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-border"}`}>
                          <Facebook className="h-4 w-4" /> Facebook
                        </button>
                      </div>
                    </div>

                    {/* Post Type Selector */}
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Post Type</label>
                      <select value={maPostType} onChange={(e) => setMaPostType(e.target.value as any)}
                        className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground">
                        <option value="insight">💡 Insight / Thought Leadership</option>
                        <option value="product_update">🚀 Product Update</option>
                        <option value="build_in_public">🔨 Build in Public</option>
                        <option value="comment_reply">💬 Comment Reply</option>
                      </select>
                    </div>

                    {/* Context Input */}
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">
                        Context / Recent Change <span className="text-muted-foreground/60">(optional)</span>
                      </label>
                      <textarea value={maContext} onChange={(e) => setMaContext(e.target.value)}
                        placeholder="e.g., Just launched multi-TLD support..."
                        className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 min-h-[80px] resize-none"
                      />
                    </div>

                    {/* Comment Input (for reply type) */}
                    {maPostType === "comment_reply" && (
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">
                          <MessageSquare className="h-3 w-3 inline mr-1" />
                          Paste Comment to Reply To
                        </label>
                        <textarea value={maComment} onChange={(e) => setMaComment(e.target.value)}
                          placeholder="Paste the comment you want to reply to..."
                          className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 min-h-[80px] resize-none"
                        />
                      </div>
                    )}

                    {/* Generate Button */}
                    <button onClick={handleGenerateContent} disabled={maGenerating || (maPostType === "comment_reply" && !maComment)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {maGenerating ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Generate Draft</>
                      )}
                    </button>
                  </div>

                  {/* Weekly Plan Generator */}
                  <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Weekly Plan
                    </h3>
                    <p className="text-sm text-muted-foreground">Generate a 3-post weekly posting plan.</p>
                    <button onClick={handleGenerateWeeklyPlan} disabled={maGeneratingPlan}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border/40 text-foreground font-medium hover:bg-muted/50 transition-colors disabled:opacity-50">
                      {maGeneratingPlan ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Planning...</>
                      ) : (
                        <><Calendar className="h-4 w-4" /> Generate Week Plan</>
                      )}
                    </button>

                    {maWeeklyPlan?.posts?.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border/20">
                        {maWeeklyPlan.posts.map((p: any, i: number) => (
                          <div key={i} className="p-2 rounded-lg bg-muted/20 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{p.day}</span>
                              <span className="text-xs text-muted-foreground capitalize">{p.platform}</span>
                            </div>
                            <p className="text-muted-foreground mt-1">{p.topic}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Output */}
                <div className="space-y-4">
                  {maError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <p>{maError}</p>
                    </div>
                  )}

                  {maResult && (
                    <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-foreground">Generated Draft</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${maResult.confidence >= 80 ? "bg-green-500/20 text-green-400" : maResult.confidence >= 60 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                            Confidence: {maResult.confidence}/100
                          </span>
                        </div>
                      </div>

                      {/* Post Text */}
                      <div className="relative">
                        <div className="rounded-lg border border-border/40 bg-background/50 p-4 text-sm text-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                          {maResult.postText}
                        </div>
                        <button onClick={handleCopyPost}
                          className="absolute top-2 right-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          {maCopied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </div>

                      {/* Reason */}
                      <div className="text-sm">
                        <p className="text-muted-foreground font-medium mb-1">Why this works:</p>
                        <p className="text-muted-foreground/80">{maResult.reason}</p>
                      </div>

                      {/* Metadata */}
                      <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t border-border/20">
                        <span className="capitalize">{maResult.platform}</span>
                        <span className="capitalize">{maResult.postType.replace("_", " ")}</span>
                        <span>{new Date(maResult.generatedAt).toLocaleTimeString()}</span>
                      </div>

                      {/* Safety Notice */}
                      <div className="text-xs text-muted-foreground/60 bg-muted/20 rounded-lg p-3">
                        ⚠️ <strong>Draft Mode</strong>: Review before posting. This system is for internal use only.
                      </div>
                    </div>
                  )}

                  {!maResult && !maError && (
                    <div className="rounded-xl border border-border/40 bg-card/30 p-8 text-center text-muted-foreground">
                      <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">Generated content will appear here</p>
                      <p className="text-xs mt-2 text-muted-foreground/60">Select options and click Generate Draft</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BLOG ANALYTICS TAB */}
          {activeTab === "blog-analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Blog Analytics
                </h2>
                <button onClick={fetchBlogAnalytics} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground">
                  <RefreshCw className={`h-4 w-4 ${blogAnalyticsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {blogAnalyticsLoading && !blogAnalytics ? (
                <div className="text-center py-12 text-muted-foreground">Loading blog analytics...</div>
              ) : blogAnalytics ? (
                <div className="space-y-6">
                  {/* Blog Metrics Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Total Blog Views" value={blogAnalytics.totalViews} icon={Eye} color="text-primary" />
                    <MetricCard title="Unique Readers" value={blogAnalytics.uniqueViewers} icon={Users} color="text-blue-400" />
                    <MetricCard title="Articles" value={blogAnalytics.topArticles.length} icon={FileText} color="text-green-400" />
                    <MetricCard title="Categories" value={blogAnalytics.categoryBreakdown.length} icon={Filter} color="text-amber-400" />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Views Trend Chart */}
                    <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                      <h3 className="font-semibold text-foreground mb-4">📈 Blog Views Trend</h3>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={blogAnalytics.recentTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                            <YAxis tick={{ fill: '#888', fontSize: 10 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                            <Line type="monotone" dataKey="views" stroke={COLORS.gold} strokeWidth={2} dot={{ fill: COLORS.gold, r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                      <h3 className="font-semibold text-foreground mb-4">📊 Views by Category</h3>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={blogAnalytics.categoryBreakdown} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis type="number" tick={{ fill: '#888', fontSize: 10 }} allowDecimals={false} />
                            <YAxis dataKey="category" type="category" tick={{ fill: '#888', fontSize: 10 }} width={100} />
                            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                            <Bar dataKey="views" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Top Articles */}
                  <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                    <h3 className="font-semibold text-foreground mb-4">🔥 Top Performing Articles</h3>
                    <div className="space-y-2">
                      {blogAnalytics.topArticles.length > 0 ? (
                        blogAnalytics.topArticles.map((article, idx) => (
                          <div key={article.slug} className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
                                {idx + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-foreground">{article.title}</p>
                                <p className="text-xs text-muted-foreground">{article.category}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-primary">{article.views} views</span>
                              <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-primary">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">No blog views tracked yet</div>
                      )}
                    </div>
                  </div>

                  {/* Keyword Suggestions */}
                  <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-400" />
                      Keyword Optimization Suggestions
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">AI-powered keyword suggestions to boost each article's SEO performance</p>
                    <div className="space-y-3">
                      {blogAnalytics.keywordSuggestions.map((item) => (
                        <div key={item.slug} className="p-4 rounded-lg bg-background/50 border border-border/30">
                          <div className="flex items-center justify-between mb-2">
                            <a href={`/blog/${item.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary flex items-center gap-1">
                              {item.article.length > 60 ? item.article.slice(0, 60) + "..." : item.article}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted/30 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full" style={{ width: `${item.score}%` }} />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">{item.score}%</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.keywords.map((kw) => (
                              <span key={kw} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No blog analytics data yet</p>
                  <p className="text-xs mt-2 text-muted-foreground/60">Blog views will appear here once readers visit your articles</p>
                </div>
              )}
            </div>
          )}

          {/* BLOG EDITOR TAB */}
          {activeTab === "blog" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-primary" />
                  Blog Post Editor
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBlogPreview(!blogPreview)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${blogPreview ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:border-border"}`}>
                    {blogPreview ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {blogPreview ? "Edit" : "Preview"}
                  </button>
                  <button onClick={resetBlogForm}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 text-sm text-muted-foreground hover:border-border transition-colors">
                    <RefreshCw className="h-4 w-4" /> Reset
                  </button>
                </div>
              </div>

              {/* AI Generate Section */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-muted-foreground mb-2">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      Generate with AI - Enter a topic
                    </label>
                    <input
                      type="text"
                      value={blogTopic}
                      onChange={(e) => setBlogTopic(e.target.value)}
                      placeholder="e.g., How to pick a domain name for a SaaS startup"
                      className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                      onKeyDown={(e) => e.key === "Enter" && !blogGenerating && handleGenerateBlogWithAI()}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateBlogWithAI}
                      disabled={blogGenerating || !blogTopic.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {blogGenerating ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Generate Blog Post</>
                      )}
                    </button>
                  </div>
                </div>
                {blogError && (
                  <div className="mt-3 text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {blogError}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground/60">
                  AI will generate a complete blog post with title, description, and content sections. You can edit after generation.
                </p>
              </div>

              {!blogPreview ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Left Column - Post Details */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                      <h3 className="font-medium text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Post Details
                      </h3>

                      {/* Title */}
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Title *</label>
                        <input type="text" value={blogTitle} onChange={(e) => handleTitleChange(e.target.value)}
                          placeholder="e.g., How to Choose the Perfect Domain Name"
                          className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50" />
                      </div>

                      {/* Slug */}
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Slug (URL)</label>
                        <input type="text" value={blogSlug} onChange={(e) => setBlogSlug(e.target.value)}
                          placeholder="auto-generated-from-title"
                          className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 font-mono" />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm text-muted-foreground mb-2">Description (SEO) *</label>
                        <textarea value={blogDescription} onChange={(e) => setBlogDescription(e.target.value)}
                          placeholder="Write a compelling SEO description (150-160 chars)..."
                          className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 min-h-[80px] resize-none" />
                        <p className="text-xs text-muted-foreground/60 mt-1">{blogDescription.length}/160 characters</p>
                      </div>

                      {/* Category & Read Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-muted-foreground mb-2">Category</label>
                          <select value={blogCategory} onChange={(e) => setBlogCategory(e.target.value as BlogCategory)}
                            className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground">
                            <option value="Domain Strategy">Domain Strategy</option>
                            <option value="SEO Foundations">SEO Foundations</option>
                            <option value="Builder Insights">Builder Insights</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-muted-foreground mb-2">Read Time (min)</label>
                          <input type="number" value={blogReadTime} onChange={(e) => setBlogReadTime(Number(e.target.value))}
                            min={1} max={30}
                            className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground" />
                        </div>
                      </div>

                      {/* Author & Featured */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-muted-foreground mb-2">Author</label>
                          <input type="text" value={blogAuthor} onChange={(e) => setBlogAuthor(e.target.value)}
                            className="w-full rounded-lg border border-border/40 bg-card/30 px-3 py-2 text-sm text-foreground" />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input type="checkbox" id="featured" checked={blogFeatured} onChange={(e) => setBlogFeatured(e.target.checked)}
                            className="rounded border-border/40" />
                          <label htmlFor="featured" className="text-sm text-muted-foreground cursor-pointer">Featured Post</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Content Sections */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Content Sections
                        </h3>
                        <div className="flex gap-1">
                          {(["paragraph", "heading", "list", "callout", "quote"] as SectionType[]).map((type) => (
                            <button key={type} onClick={() => addSection(type)}
                              className="px-2 py-1 text-xs rounded border border-border/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors capitalize">
                              +{type.slice(0, 4)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {blogSections.map((section, idx) => (
                          <div key={section.id} className="rounded-lg border border-border/40 bg-background/50 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-primary capitalize">{section.type}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => moveSection(section.id, "up")} disabled={idx === 0}
                                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                                  <ChevronLeft className="h-3 w-3 rotate-90" />
                                </button>
                                <button onClick={() => moveSection(section.id, "down")} disabled={idx === blogSections.length - 1}
                                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                                  <ChevronRight className="h-3 w-3 rotate-90" />
                                </button>
                                <button onClick={() => removeSection(section.id)} disabled={blogSections.length === 1}
                                  className="p-1 text-muted-foreground hover:text-red-400 disabled:opacity-30">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {section.type === "heading" && (
                              <select value={section.level} onChange={(e) => updateSection(section.id, { level: Number(e.target.value) as 2 | 3 })}
                                className="w-full rounded border border-border/40 bg-card/30 px-2 py-1 text-xs text-foreground mb-1">
                                <option value={2}>H2 - Main Heading</option>
                                <option value={3}>H3 - Subheading</option>
                              </select>
                            )}

                            {section.type === "callout" && (
                              <div className="flex gap-2 mb-1">
                                <select value={section.calloutType} onChange={(e) => updateSection(section.id, { calloutType: e.target.value as "tip" | "warning" | "cta" })}
                                  className="flex-1 rounded border border-border/40 bg-card/30 px-2 py-1 text-xs text-foreground">
                                  <option value="tip">💡 Tip</option>
                                  <option value="warning">⚠️ Warning</option>
                                  <option value="cta">🚀 CTA</option>
                                </select>
                                {section.calloutType === "cta" && (
                                  <>
                                    <input type="text" value={section.ctaLink || ""} onChange={(e) => updateSection(section.id, { ctaLink: e.target.value })}
                                      placeholder="/generate" className="flex-1 rounded border border-border/40 bg-card/30 px-2 py-1 text-xs text-foreground" />
                                    <input type="text" value={section.ctaText || ""} onChange={(e) => updateSection(section.id, { ctaText: e.target.value })}
                                      placeholder="Try Now" className="flex-1 rounded border border-border/40 bg-card/30 px-2 py-1 text-xs text-foreground" />
                                  </>
                                )}
                              </div>
                            )}

                            {section.type === "list" ? (
                              <div className="space-y-1">
                                {(section.items || [""]).map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex gap-1">
                                    <span className="text-muted-foreground text-xs pt-1.5">•</span>
                                    <input type="text" value={item} onChange={(e) => {
                                      const newItems = [...(section.items || [])]
                                      newItems[itemIdx] = e.target.value
                                      updateSection(section.id, { items: newItems })
                                    }}
                                      className="flex-1 rounded border border-border/40 bg-card/30 px-2 py-1 text-xs text-foreground"
                                      placeholder="List item..." />
                                    <button onClick={() => {
                                      const newItems = [...(section.items || []), ""]
                                      updateSection(section.id, { items: newItems })
                                    }} className="text-muted-foreground hover:text-primary text-xs">+</button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <textarea value={section.content} onChange={(e) => updateSection(section.id, { content: e.target.value })}
                                placeholder={section.type === "heading" ? "Heading text..." : section.type === "quote" ? "Quote text..." : "Write your content..."}
                                className="w-full rounded border border-border/40 bg-card/30 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 min-h-[60px] resize-none" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Preview Mode - Show Generated Code */
                <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground flex items-center gap-2">
                      <Code className="h-4 w-4" /> Generated TypeScript Code
                    </h3>
                    <button onClick={handleCopyBlogCode}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                      {blogCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {blogCopied ? "Copied!" : "Copy Code"}
                    </button>
                  </div>

                  <div className="rounded-lg bg-background/80 border border-border/40 p-4 font-mono text-xs text-foreground overflow-x-auto max-h-[500px] overflow-y-auto">
                    <pre>{generateBlogCode()}</pre>
                  </div>

                  <div className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">📋 How to add this blog post:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Copy the generated code above</li>
                      <li>Open <code className="bg-background/50 px-1 rounded">lib/blog.ts</code></li>
                      <li>Find the <code className="bg-background/50 px-1 rounded">blogPosts</code> array</li>
                      <li>Paste the code at the beginning of the array (after the opening <code className="bg-background/50 px-1 rounded">[</code>)</li>
                      <li>Run <code className="bg-background/50 px-1 rounded">npm run build && vercel --prod --yes</code> to deploy</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
