/** @type {import('next').NextConfig} */
const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, "")

const nextConfig = {
  ...(cdnUrl ? { assetPrefix: cdnUrl } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  async redirects() {
    const blogConsolidation = [
      // Namelix cluster → consolidated 2026 guide
      ["namelix-vs-namolux", "best-namelix-alternatives-2026"],
      ["namelix-alternatives", "best-namelix-alternatives-2026"],
      ["namolux-vs-namelix", "best-namelix-alternatives-2026"],
      ["10-best-namelix-alternatives-2026", "best-namelix-alternatives-2026"],
      ["namelix-alternative-namolux", "best-namelix-alternatives-2026"],
      ["namelix-vs-namolux-2026", "best-namelix-alternatives-2026"],
      ["why-namelix-fails-brandable-names", "best-namelix-alternatives-2026"],
      ["best-namelix-alternatives-domain-availability", "best-namelix-alternatives-2026"],
      ["hidden-problem-ai-name-generators-namelix", "best-namelix-alternatives-2026"],
      ["namelix-gave-me-100-names-none-usable", "best-namelix-alternatives-2026"],
      ["stop-using-namelix-smarter-way-business-names", "best-namelix-alternatives-2026"],
      // Name generator cluster → startup-name-ideas canonical
      ["business-name-generator-guide", "startup-name-ideas"],
      ["brand-name-generator", "startup-name-ideas"],
      ["ai-business-name-generator-startup-guide", "startup-name-ideas"],
      ["company-name-ideas-generator", "startup-name-ideas"],
      // .com availability cluster → domain-name-availability-checker-com-guide canonical
      ["domain-name-availability-strategy", "domain-name-availability-checker-com-guide"],
      ["free-domain-name-search", "domain-name-availability-checker-com-guide"],
      ["how-to-get-business-name-available-com", "domain-name-availability-checker-com-guide"],
      ["find-available-com-domain-2026", "domain-name-availability-checker-com-guide"],
      // Earlier consolidations (exact-duplicate slug + accidental ChatGPT duplicate)
      ["chatgpt-for-domain-names-vs-namolux", "namolux-vs-chatgpt-domain-name-generator"],
    ]

    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "namolux.com" }],
        destination: "https://www.namolux.com/:path*",
        permanent: true,
      },
      ...blogConsolidation.map(([from, to]) => ({
        source: `/blog/${from}`,
        destination: `/blog/${to}`,
        permanent: true,
      })),
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-site",
          },
          {
            key: "Origin-Agent-Cluster",
            value: "?1",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live https://*.stripe.com https://js.stripe.com https://ko-fi.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.openai.com https://*.vercel-insights.com https://*.stripe.com https://api.stripe.com https://ko-fi.com https://storage.ko-fi.com https://*.supabase.co",
              "frame-src 'self' https://*.stripe.com https://js.stripe.com https://hooks.stripe.com https://ko-fi.com",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ]
  },
}

export default nextConfig
