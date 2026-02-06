"use client"

interface AdBannerProps {
  slot?: string
  className?: string
}

export function AdBanner({ slot = "default", className = "" }: AdBannerProps) {
  // TODO: Replace with your actual ad network code
  // For Adsterra: Add their script in layout.tsx and use their banner code here
  // For Media.net: Add their script and use their ad units
  
  return (
    <div 
      className={`flex items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20 p-4 ${className}`}
      data-ad-slot={slot}
    >
      {/* Placeholder - Replace with actual ad code */}
      <div className="text-center text-xs text-muted-foreground">
        {/* 
          ADSTERRA EXAMPLE:
          <script async="async" data-cfasync="false" src="//your-adsterra-url.com"></script>
          
          MEDIA.NET EXAMPLE:
          <div id="your-media-net-ad-id"></div>
          
          For now, this is hidden. Uncomment when you have ad code.
        */}
      </div>
    </div>
  )
}

// Horizontal banner for between sections
export function AdBannerHorizontal() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AdBanner slot="horizontal" className="h-24 w-full" />
    </div>
  )
}

// Sidebar ad for generate page
export function AdBannerSidebar() {
  return (
    <AdBanner slot="sidebar" className="h-64 w-full" />
  )
}

