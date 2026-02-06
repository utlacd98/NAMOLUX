import { db } from "./db"

export type MetricAction = "name_generation" | "bulk_check" | "seo_audit" | "affiliate_click" | "page_view" | "blog_view"

interface TrackMetricParams {
  action: MetricAction
  metadata?: Record<string, any>
  userAgent?: string
  country?: string
  sessionId?: string
  device?: string
  referrer?: string
  route?: string
}

export async function trackMetric(params: TrackMetricParams) {
  try {
    await db.metrics.create({
      data: {
        action: params.action,
        metadata: params.metadata || null,
        userAgent: params.userAgent,
        country: params.country,
        sessionId: params.sessionId,
        device: params.device,
        referrer: params.referrer,
        route: params.route,
      },
    })
  } catch (error) {
    // Silently fail - don't block the main request
    console.error("Failed to track metric:", error)
  }
}

export async function getDailyTrends(days: number = 7) {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)

  // Get all metrics from the past N days
  const metrics = await db.metrics.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    select: {
      action: true,
      createdAt: true,
    },
  })

  // Group by day and action
  const dailyData: Record<string, { name_generation: number; bulk_check: number; seo_audit: number }> = {}

  // Initialize all days with zeros
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateKey = date.toISOString().split("T")[0]
    dailyData[dateKey] = { name_generation: 0, bulk_check: 0, seo_audit: 0 }
  }

  // Count metrics per day
  for (const metric of metrics) {
    const dateKey = metric.createdAt.toISOString().split("T")[0]
    if (dailyData[dateKey] && metric.action in dailyData[dateKey]) {
      dailyData[dateKey][metric.action as keyof typeof dailyData[string]]++
    }
  }

  // Convert to array sorted by date
  return Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      nameGeneration: counts.name_generation,
      bulkCheck: counts.bulk_check,
      seoAudit: counts.seo_audit,
    }))
}

export async function getMetricsSummary() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalNameGeneration,
    totalBulkCheck,
    totalSeoAudit,
    todayNameGeneration,
    todayBulkCheck,
    todaySeoAudit,
    weeklyNameGeneration,
    weeklyBulkCheck,
    weeklySeoAudit,
    monthlyNameGeneration,
    monthlyBulkCheck,
    monthlySeoAudit,
    recentMetrics,
  ] = await Promise.all([
    // All time totals
    db.metrics.count({ where: { action: "name_generation" } }),
    db.metrics.count({ where: { action: "bulk_check" } }),
    db.metrics.count({ where: { action: "seo_audit" } }),
    // Today
    db.metrics.count({ where: { action: "name_generation", createdAt: { gte: today } } }),
    db.metrics.count({ where: { action: "bulk_check", createdAt: { gte: today } } }),
    db.metrics.count({ where: { action: "seo_audit", createdAt: { gte: today } } }),
    // This week
    db.metrics.count({ where: { action: "name_generation", createdAt: { gte: thisWeek } } }),
    db.metrics.count({ where: { action: "bulk_check", createdAt: { gte: thisWeek } } }),
    db.metrics.count({ where: { action: "seo_audit", createdAt: { gte: thisWeek } } }),
    // This month
    db.metrics.count({ where: { action: "name_generation", createdAt: { gte: thisMonth } } }),
    db.metrics.count({ where: { action: "bulk_check", createdAt: { gte: thisMonth } } }),
    db.metrics.count({ where: { action: "seo_audit", createdAt: { gte: thisMonth } } }),
    // Recent activity (last 20)
    db.metrics.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        metadata: true,
        country: true,
        createdAt: true,
      },
    }),
  ])

  return {
    allTime: {
      nameGeneration: totalNameGeneration,
      bulkCheck: totalBulkCheck,
      seoAudit: totalSeoAudit,
      total: totalNameGeneration + totalBulkCheck + totalSeoAudit,
    },
    today: {
      nameGeneration: todayNameGeneration,
      bulkCheck: todayBulkCheck,
      seoAudit: todaySeoAudit,
      total: todayNameGeneration + todayBulkCheck + todaySeoAudit,
    },
    thisWeek: {
      nameGeneration: weeklyNameGeneration,
      bulkCheck: weeklyBulkCheck,
      seoAudit: weeklySeoAudit,
      total: weeklyNameGeneration + weeklyBulkCheck + weeklySeoAudit,
    },
    thisMonth: {
      nameGeneration: monthlyNameGeneration,
      bulkCheck: monthlyBulkCheck,
      seoAudit: monthlySeoAudit,
      total: monthlyNameGeneration + monthlyBulkCheck + monthlySeoAudit,
    },
    recentActivity: recentMetrics,
  }
}

// Get date range start based on days
function getStartDate(days: number): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)
}

// Enhanced dashboard metrics
export async function getDashboardMetrics(days: number = 7) {
  const startDate = getStartDate(days)
  const previousStartDate = getStartDate(days * 2)

  // Get all metrics for the range
  const metrics = await db.metrics.findMany({
    where: { createdAt: { gte: startDate } },
  })

  // Get metrics for previous period (for comparison)
  const previousMetrics = await db.metrics.findMany({
    where: {
      createdAt: {
        gte: previousStartDate,
        lt: startDate,
      }
    },
    select: { sessionId: true, action: true },
  })

  // Calculate key metrics
  const totalEvents = metrics.length
  const previousTotalEvents = previousMetrics.length

  // Unique sessions (filter out null/undefined)
  const uniqueSessions = new Set(metrics.filter(m => m.sessionId).map(m => m.sessionId)).size
  const previousUniqueSessions = new Set(previousMetrics.filter(m => m.sessionId).map(m => m.sessionId)).size

  // Find returning sessions (sessions that appeared on multiple days)
  const sessionDays: Record<string, Set<string>> = {}
  metrics.forEach(m => {
    if (m.sessionId) {
      const day = m.createdAt.toISOString().split("T")[0]
      if (!sessionDays[m.sessionId]) sessionDays[m.sessionId] = new Set()
      sessionDays[m.sessionId].add(day)
    }
  })
  const returningSessions = Object.values(sessionDays).filter(days => days.size > 1).length

  // Affiliate click rate
  const sessionsWithAffiliateClick = new Set(
    metrics.filter(m => m.action === "affiliate_click" && m.sessionId).map(m => m.sessionId)
  ).size
  const affiliateClickRate = uniqueSessions > 0 ? (sessionsWithAffiliateClick / uniqueSessions) * 100 : 0

  // Average actions per session
  const sessionActions: Record<string, number> = {}
  metrics.forEach(m => {
    if (m.sessionId) {
      sessionActions[m.sessionId] = (sessionActions[m.sessionId] || 0) + 1
    }
  })
  const avgActionsPerSession = uniqueSessions > 0
    ? Object.values(sessionActions).reduce((a, b) => a + b, 0) / uniqueSessions
    : 0

  // Event breakdown
  const eventCounts = {
    nameGeneration: metrics.filter(m => m.action === "name_generation").length,
    bulkCheck: metrics.filter(m => m.action === "bulk_check").length,
    seoAudit: metrics.filter(m => m.action === "seo_audit").length,
    affiliateClick: metrics.filter(m => m.action === "affiliate_click").length,
    pageView: metrics.filter(m => m.action === "page_view").length,
  }

  // Device breakdown
  const deviceCounts = {
    desktop: metrics.filter(m => m.device === "desktop").length,
    mobile: metrics.filter(m => m.device === "mobile").length,
    tablet: metrics.filter(m => m.device === "tablet").length,
    unknown: metrics.filter(m => !m.device).length,
  }

  // Country breakdown (top 10)
  const countryCounts: Record<string, number> = {}
  metrics.forEach(m => {
    const country = m.country || "Unknown"
    countryCounts[country] = (countryCounts[country] || 0) + 1
  })
  const topCountries = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }))

  // Calculate growth percentages
  const eventGrowth = previousTotalEvents > 0
    ? ((totalEvents - previousTotalEvents) / previousTotalEvents) * 100
    : 0
  const sessionGrowth = previousUniqueSessions > 0
    ? ((uniqueSessions - previousUniqueSessions) / previousUniqueSessions) * 100
    : 0

  return {
    totalEvents,
    uniqueSessions,
    returningSessions,
    affiliateClickRate: Math.round(affiliateClickRate * 10) / 10,
    avgActionsPerSession: Math.round(avgActionsPerSession * 10) / 10,
    eventCounts,
    deviceCounts,
    topCountries,
    eventGrowth: Math.round(eventGrowth * 10) / 10,
    sessionGrowth: Math.round(sessionGrowth * 10) / 10,
  }
}

// Get funnel data
export async function getFunnelData(days: number = 7) {
  const startDate = getStartDate(days)

  const metrics = await db.metrics.findMany({
    where: { createdAt: { gte: startDate } },
    select: { sessionId: true, action: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  // Build session journeys
  const sessions: Record<string, Set<string>> = {}
  metrics.forEach(m => {
    if (m.sessionId) {
      if (!sessions[m.sessionId]) sessions[m.sessionId] = new Set()
      sessions[m.sessionId].add(m.action)
    }
  })

  const totalSessions = Object.keys(sessions).length
  const landing = totalSessions
  const generated = Object.values(sessions).filter(s => s.has("name_generation")).length
  const checked = Object.values(sessions).filter(s => s.has("bulk_check")).length
  const audited = Object.values(sessions).filter(s => s.has("seo_audit")).length
  const clicked = Object.values(sessions).filter(s => s.has("affiliate_click")).length

  return {
    funnel: [
      { step: "Landing", count: landing, rate: 100 },
      { step: "Generate Names", count: generated, rate: landing > 0 ? Math.round((generated / landing) * 100) : 0 },
      { step: "Bulk Check", count: checked, rate: landing > 0 ? Math.round((checked / landing) * 100) : 0 },
      { step: "SEO Audit", count: audited, rate: landing > 0 ? Math.round((audited / landing) * 100) : 0 },
      { step: "Buy Click", count: clicked, rate: landing > 0 ? Math.round((clicked / landing) * 100) : 0 },
    ],
    dropOffs: {
      landingToGenerate: landing > 0 ? Math.round(((landing - generated) / landing) * 100) : 0,
      generateToCheck: generated > 0 ? Math.round(((generated - checked) / generated) * 100) : 0,
      checkToAudit: checked > 0 ? Math.round(((checked - audited) / checked) * 100) : 0,
      auditToClick: audited > 0 ? Math.round(((audited - clicked) / audited) * 100) : 0,
    }
  }
}

// Enhanced daily trends with all event types
export async function getEnhancedTrends(days: number = 7) {
  const startDate = getStartDate(days)

  const metrics = await db.metrics.findMany({
    where: { createdAt: { gte: startDate } },
    select: { action: true, createdAt: true },
  })

  const dailyData: Record<string, Record<string, number>> = {}

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateKey = date.toISOString().split("T")[0]
    dailyData[dateKey] = {
      nameGeneration: 0,
      bulkCheck: 0,
      seoAudit: 0,
      affiliateClick: 0,
      total: 0,
    }
  }

  // Count metrics per day
  const actionMap: Record<string, string> = {
    name_generation: "nameGeneration",
    bulk_check: "bulkCheck",
    seo_audit: "seoAudit",
    affiliate_click: "affiliateClick",
  }

  for (const metric of metrics) {
    const dateKey = metric.createdAt.toISOString().split("T")[0]
    if (dailyData[dateKey]) {
      const key = actionMap[metric.action]
      if (key) {
        dailyData[dateKey][key]++
      }
      dailyData[dateKey].total++
    }
  }

  return Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }))
}

// Get events with pagination and filtering
export async function getEvents(options: {
  days?: number
  page?: number
  limit?: number
  action?: string
  country?: string
  device?: string
  search?: string
}) {
  const {
    days = 7,
    page = 1,
    limit = 50,
    action,
    country,
    device,
    search,
  } = options

  const startDate = getStartDate(days)
  const skip = (page - 1) * limit

  // Build where clause
  const where: any = { createdAt: { gte: startDate } }
  if (action) where.action = action
  if (country) where.country = country
  if (device) where.device = device

  // Get total count
  const total = await db.metrics.count({ where })

  // Get events
  let events = await db.metrics.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  })

  // Apply search filter in memory if needed
  if (search) {
    const searchLower = search.toLowerCase()
    events = events.filter(e => {
      const metadata = e.metadata as Record<string, any> | null
      if (!metadata) return false
      return (
        metadata.keyword?.toLowerCase().includes(searchLower) ||
        metadata.domain?.toLowerCase().includes(searchLower) ||
        metadata.url?.toLowerCase().includes(searchLower)
      )
    })
  }

  return {
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }
}

