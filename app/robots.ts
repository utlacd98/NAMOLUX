import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { isGeneratorLabRequestAllowed } from "@/lib/generator-lab"
import { isVercelHostname } from "@/lib/site-url"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers()
  const hostname = requestHeaders.get("host")
  // On Vercel preview/dev deployments, block all bots entirely.
  // Only the production deployment (VERCEL_ENV === "production") should be crawlable.
  if (
    isGeneratorLabRequestAllowed(hostname)
    || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
    || isVercelHostname(hostname)
  ) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    }
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/namo-metrics-x7k9", "/account", "/dashboard", "/sign-in", "/sign-up", "/generate", "/preview-gen", "/bulk-domain-check/workspace"],
    },
    sitemap: "https://www.namolux.com/sitemap.xml",
  }
}
