import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/db"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const customerEmail = session.customer_details?.email

  if (!customerEmail) {
    console.error("No customer email in checkout session")
    return
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Find or create user by email
  let user = await db.user.findUnique({ where: { email: customerEmail } })

  if (!user) {
    // Create user without clerkId (they can link later)
    user = await db.user.create({
      data: {
        email: customerEmail,
        clerkId: `stripe_${customerId}`, // Temporary ID
        stripeCustomerId: customerId,
        subscriptionId: subscriptionId,
        subscriptionStatus: subscription.status,
        subscriptionPriceId: subscription.items.data[0]?.price.id,
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
      },
    })
  } else {
    // Update existing user
    await db.user.update({
      where: { email: customerEmail },
      data: {
        stripeCustomerId: customerId,
        subscriptionId: subscriptionId,
        subscriptionStatus: subscription.status,
        subscriptionPriceId: subscription.items.data[0]?.price.id,
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
      },
    })
  }

  console.log(`Subscription activated for ${customerEmail}`)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const user = await db.user.findUnique({
    where: { subscriptionId: subscription.id },
  })

  if (!user) {
    console.error(`No user found for subscription ${subscription.id}`)
    return
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    },
  })

  console.log(`Subscription updated for user ${user.email}: ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await db.user.findUnique({
    where: { subscriptionId: subscription.id },
  })

  if (!user) return

  await db.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "canceled",
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    },
  })

  console.log(`Subscription canceled for user ${user.email}`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Subscription renewed successfully
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const user = await db.user.findUnique({
    where: { subscriptionId },
  })

  if (user) {
    console.log(`Invoice paid for user ${user.email}`)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const user = await db.user.findUnique({
    where: { subscriptionId },
  })

  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: "past_due" },
    })
    console.log(`Payment failed for user ${user.email}`)
  }
}

