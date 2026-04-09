/**
 * Namecheap affiliate link builder
 * Affiliate link: https://namecheap.pxf.io/2RK07Q
 *
 * Appends the destination URL as ?u= so impact.com tracks the referral
 * and credits the commission when a user registers a domain.
 */
export function namecheapLink(domain: string): string {
  const destination = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`
  return `https://namecheap.pxf.io/2RK07Q?u=${encodeURIComponent(destination)}`
}
