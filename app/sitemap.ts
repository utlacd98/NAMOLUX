import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { getPublicPosts } from "@/lib/blog"
import { isGeneratorLabRequestAllowed } from "@/lib/generator-lab"
import { isVercelHostname } from "@/lib/site-url"

const BASE_URL = "https://www.namolux.com"
const STATIC_LAST_MODIFIED = new Date("2026-07-10")

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>

interface SitemapPage {
  path: string
  lastModified?: Date
  changeFrequency: ChangeFrequency
  priority: number
}

const staticPages: SitemapPage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/founder-signal", changeFrequency: "monthly", priority: 0.85 },
  { path: "/bulk-domain-check", changeFrequency: "weekly", priority: 0.85 },
  { path: "/why-namolux", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/journal/andrew-barrett", changeFrequency: "monthly", priority: 0.65 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
]

const guidePages: SitemapPage[] = [
  { path: "/how-to-name-a-startup", changeFrequency: "monthly", priority: 0.7 },
  { path: "/name-mistakes", changeFrequency: "monthly", priority: 0.7 },
  { path: "/brand-longevity", changeFrequency: "monthly", priority: 0.7 },
  { path: "/domain-vs-brand", changeFrequency: "monthly", priority: 0.7 },
]

const seoLandingPages: SitemapPage[] = [
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
]

const comparisonPages: SitemapPage[] = []

// TODO: candidateSeoPagesToCreateLater
// These suggested SEO/comparison pages are not currently app routes, so they
// must not be included in the sitemap until matching pages exist:
// /domain-name-generator, /business-name-generator, /startup-name-generator,
// /brand-name-generator, /ai-business-name-generator, /company-name-generator,
// /product-name-generator, /app-name-generator, /saas-name-generator,
// /domain-availability-checker, /examples, /features,
// /namolux-vs-namelix, /namolux-vs-looka, /namolux-vs-brandbucket,
// /namolux-vs-squadhelp

function toSitemapEntry(page: SitemapPage): MetadataRoute.Sitemap[number] {
  return {
    url: page.path === "/" ? BASE_URL : `${BASE_URL}${page.path}`,
    lastModified: page.lastModified ?? STATIC_LAST_MODIFIED,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The lab has no public discovery surface. Its routes are noindex and it
  // deliberately emits no sitemap entries even when Vercel calls it a
  // production deployment.
  const hostname = (await headers()).get("host")
  if (
    isGeneratorLabRequestAllowed(hostname)
    || isVercelHostname(hostname)
    || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
  ) return []

  const posts = getPublicPosts()

  const blogUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }))

  return [
    ...staticPages.slice(0, 2).map(toSitemapEntry),
    ...blogUrls,
    ...staticPages.slice(2).map(toSitemapEntry),
    ...seoLandingPages.map(toSitemapEntry),
    ...guidePages.map(toSitemapEntry),
    ...comparisonPages.map(toSitemapEntry),
  ]
}
