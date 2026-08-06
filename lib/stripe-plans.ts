import type Stripe from "stripe"

function cleanEnv(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/^["']|["']$/g, "").replace(/\\r|\\n/g, "").trim()
  return cleaned || undefined
}

export function getStripePaidPriceId(): string | undefined {
  return (
    cleanEnv(process.env.STRIPE_PRICE_PRO) ||
    cleanEnv(process.env.STRIPE_PRICE_PAID) ||
    cleanEnv(process.env.STRIPE_PRICE_ID)
  )
}

export function getStripeAllowedPriceIds(): Set<string> {
  return new Set(
    [
      cleanEnv(process.env.STRIPE_PRICE_PRO),
      cleanEnv(process.env.STRIPE_PRICE_PAID),
      cleanEnv(process.env.STRIPE_PRICE_ID),
      cleanEnv(process.env.STRIPE_PRICE_STARTER),
      cleanEnv(process.env.STRIPE_PRICE_LEGACY),
    ].filter((value): value is string => Boolean(value)),
  )
}

export function subscriptionUsesAllowedPriceIds(
  subscription: Pick<Stripe.Subscription, "items">,
  allowedPriceIds: ReadonlySet<string>,
): boolean {
  return subscription.items.data.some((item) => allowedPriceIds.has(item.price.id))
}

export function isAllowedNamoLuxSubscription(subscription: Pick<Stripe.Subscription, "items">): boolean {
  const allowedPriceIds = getStripeAllowedPriceIds()
  return allowedPriceIds.size > 0 && subscriptionUsesAllowedPriceIds(subscription, allowedPriceIds)
}

export function getPlanFromCheckoutMetadata(): "pro" {
  return "pro"
}
