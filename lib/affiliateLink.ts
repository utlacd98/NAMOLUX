/**
 * Namecheap affiliate link builder
 * Publisher ID: affiliate_id  |  Campaign: 1632743  |  Creative: 5618
 *
 * To update your affiliate ID, change PUBLISHER_ID below.
 * All register buttons across the app pull from this single source.
 */
const PUBLISHER_ID = "affiliate_id"
const BASE = `https://namecheap.pxf.io/c/${PUBLISHER_ID}/1632743/5618`

/**
 * Returns a tracked Namecheap affiliate link for a domain registration search.
 * @param domain  Full domain including TLD — e.g. "flux.com"
 */
export function namecheapLink(domain: string): string {
  const destination = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`
  return `${BASE}?u=${encodeURIComponent(destination)}`
}
