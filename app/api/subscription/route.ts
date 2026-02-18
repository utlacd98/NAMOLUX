import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // If no user from session, we can't check subscription
    if (authError || !user) {
      console.log("Subscription check: No authenticated user", authError?.message)
      return NextResponse.json(
        { isPro: false, subscriptionEnd: null, customerId: null, debug: "no_session" },
        { status: 200 }
      )
    }

    const userId = user.id
    const userEmail = user.email?.toLowerCase().trim() || ""
    console.log("Subscription check for user:", userId, "email:", userEmail)

    // Strategy 1: Search subscriptions by supabase_user_id in metadata
    // This is the most reliable method since we store the user ID during checkout
    const allSubscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    })

    // Find subscription with matching supabase_user_id in metadata
    const matchingActiveSub = allSubscriptions.data.find(sub =>
      sub.metadata?.supabase_user_id === userId
    )

    if (matchingActiveSub) {
      console.log("Found active subscription by user ID metadata:", matchingActiveSub.id)
      return NextResponse.json({
        isPro: true,
        subscriptionEnd: matchingActiveSub.current_period_end
          ? new Date(matchingActiveSub.current_period_end * 1000).toISOString()
          : null,
        customerId: matchingActiveSub.customer as string,
        debug: "found_by_user_id"
      })
    }

    // Also check trialing subscriptions
    const trialingSubscriptions = await stripe.subscriptions.list({
      status: "trialing",
      limit: 100,
    })

    const matchingTrialingSub = trialingSubscriptions.data.find(sub =>
      sub.metadata?.supabase_user_id === userId
    )

    if (matchingTrialingSub) {
      console.log("Found trialing subscription by user ID metadata:", matchingTrialingSub.id)
      return NextResponse.json({
        isPro: true,
        subscriptionEnd: matchingTrialingSub.current_period_end
          ? new Date(matchingTrialingSub.current_period_end * 1000).toISOString()
          : null,
        customerId: matchingTrialingSub.customer as string,
        debug: "found_by_user_id_trialing"
      })
    }

    // Strategy 2: Search by customer metadata (supabase_user_id)
    const allCustomers = await stripe.customers.list({
      limit: 100,
    })

    const customerByUserId = allCustomers.data.find(c =>
      c.metadata?.supabase_user_id === userId
    )

    if (customerByUserId) {
      // Check subscriptions for this customer
      const customerSubs = await stripe.subscriptions.list({
        customer: customerByUserId.id,
        status: "active",
        limit: 1,
      })

      if (customerSubs.data.length > 0) {
        const sub = customerSubs.data[0]
        console.log("Found active subscription by customer metadata:", sub.id)
        return NextResponse.json({
          isPro: true,
          subscriptionEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          customerId: customerByUserId.id,
          debug: "found_by_customer_metadata"
        })
      }

      const customerTrialSubs = await stripe.subscriptions.list({
        customer: customerByUserId.id,
        status: "trialing",
        limit: 1,
      })

      if (customerTrialSubs.data.length > 0) {
        const sub = customerTrialSubs.data[0]
        console.log("Found trialing subscription by customer metadata:", sub.id)
        return NextResponse.json({
          isPro: true,
          subscriptionEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          customerId: customerByUserId.id,
          debug: "found_by_customer_metadata_trialing"
        })
      }
    }

    // Strategy 3: Fall back to email matching
    if (userEmail) {
      // Try exact email match
      let customers = await stripe.customers.list({
        email: user.email!,
        limit: 10,
      })

      // If no exact match, do case-insensitive search
      if (customers.data.length === 0) {
        const matchingCustomers = allCustomers.data.filter(c =>
          c.email && c.email.toLowerCase().trim() === userEmail
        )
        if (matchingCustomers.length > 0) {
          customers = { ...customers, data: matchingCustomers }
        }
      }

      // Check all matching customers for active subscriptions
      for (const customer of customers.data) {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        })

        if (subs.data.length > 0) {
          const sub = subs.data[0]
          console.log("Found active subscription by email:", sub.id)
          return NextResponse.json({
            isPro: true,
            subscriptionEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            customerId: customer.id,
            debug: "found_by_email"
          })
        }

        const trialSubs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "trialing",
          limit: 1,
        })

        if (trialSubs.data.length > 0) {
          const sub = trialSubs.data[0]
          console.log("Found trialing subscription by email:", sub.id)
          return NextResponse.json({
            isPro: true,
            subscriptionEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            customerId: customer.id,
            debug: "found_by_email_trialing"
          })
        }
      }
    }

    // No active subscriptions found
    console.log("No active subscriptions found for user:", userId)
    return NextResponse.json({
      isPro: false,
      subscriptionEnd: null,
      customerId: null,
      debug: "no_subscription_found"
    })
  } catch (error: any) {
    console.error("Error checking subscription:", error)
    return NextResponse.json(
      { isPro: false, subscriptionEnd: null, customerId: null, error: error.message },
      { status: 500 }
    )
  }
}

