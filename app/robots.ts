import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  // On Vercel preview/dev deployments, block all bots entirely.
  // Only the production deployment (VERCEL_ENV === "production") should be crawlable.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
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
      disallow: ["/api/", "/admin/"],
    },
    sitemap: "https://www.namolux.com/sitemap.xml",
  }
}
