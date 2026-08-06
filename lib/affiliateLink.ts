const NAMECHEAP_AFFILIATE_URL = "https://namecheap.pxf.io/2RK07Q"

export interface NamecheapLinkContext {
  source?: string
  campaign?: string
  content?: string
}

/**
 * Namecheap affiliate link builder.
 *
 * Appends the destination URL as ?u= so Impact tracks the referral and adds
 * light source metadata for NamoLux funnel analysis.
 */
export function namecheapLink(domain: string, context: NamecheapLinkContext = {}): string {
  const destination = new URL("https://www.namecheap.com/domains/registration/results/")
  destination.searchParams.set("domain", domain)
  destination.searchParams.set("utm_source", "namolux")
  destination.searchParams.set("utm_medium", "affiliate")

  if (context.source) destination.searchParams.set("utm_campaign", context.source)
  if (context.campaign) destination.searchParams.set("utm_term", context.campaign)
  if (context.content) destination.searchParams.set("utm_content", context.content)

  const affiliateUrl = new URL(NAMECHEAP_AFFILIATE_URL)
  affiliateUrl.searchParams.set("u", destination.toString())

  if (context.source) affiliateUrl.searchParams.set("subId1", context.source)
  if (context.campaign) affiliateUrl.searchParams.set("subId2", context.campaign)
  if (context.content) affiliateUrl.searchParams.set("subId3", context.content)

  return affiliateUrl.toString()
}
