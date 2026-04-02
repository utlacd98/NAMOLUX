/**
 * Namecheap affiliate link builder
 * Publisher ID: affiliate_id  |  Campaign: 1632743  |  Creative: 5618
 *
 * To update your affiliate ID, change PUBLISHER_ID below.
 * All register buttons across the app pull from this single source.
 */
/**
 * Returns a direct Namecheap domain registration link.
 * TODO: restore affiliate tracking once Publisher ID is confirmed.
 * @param domain  Full domain including TLD — e.g. "flux.com"
 */
export function namecheapLink(domain: string): string {
  return `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`
}
