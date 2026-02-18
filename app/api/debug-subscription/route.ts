import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Get ALL recent Stripe data for debugging
    const allRecentCustomers = await stripe.customers.list({
      limit: 50,
    })

    // Get all recent subscriptions
    const allRecentSubscriptions = await stripe.subscriptions.list({
      limit: 50,
    })

    const recentCustomersInfo = allRecentCustomers.data.map(c => ({
      id: c.id,
      email: c.email,
      created: c.created ? new Date(c.created * 1000).toISOString() : null,
      metadata: c.metadata
    }))

    const recentSubscriptionsInfo = allRecentSubscriptions.data.map(s => ({
      id: s.id,
      status: s.status,
      customerId: s.customer,
      current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
      created: s.created ? new Date(s.created * 1000).toISOString() : null,
      metadata: s.metadata
    }))

    if (authError) {
      return NextResponse.json({
        error: "Auth error - not logged in",
        authError: authError.message,
        user: null,
        stripeData: {
          recentCustomers: recentCustomersInfo.slice(0, 10),
          recentSubscriptions: recentSubscriptionsInfo.slice(0, 10),
          activeSubscriptions: recentSubscriptionsInfo.filter(s => s.status === "active" || s.status === "trialing")
        }
      })
    }

    if (!user?.email) {
      return NextResponse.json({
        error: "No authenticated user or no email",
        user: user ? { id: user.id, email: user.email } : null,
        stripeData: {
          recentCustomers: recentCustomersInfo.slice(0, 10),
          recentSubscriptions: recentSubscriptionsInfo.slice(0, 10),
          activeSubscriptions: recentSubscriptionsInfo.filter(s => s.status === "active" || s.status === "trialing")
        }
      })
    }

    const userEmail = user.email.toLowerCase().trim()

    // Filter for any customer that might match (case insensitive)
    const matchingCustomers = allRecentCustomers.data.filter(c =>
      c.email && c.email.toLowerCase().trim() === userEmail
    )

    // Also try exact email search
    const exactMatchCustomers = await stripe.customers.list({
      email: user.email,
      limit: 10,
    })

    const exactMatchInfo = exactMatchCustomers.data.map(c => ({
      id: c.id,
      email: c.email,
      created: c.created ? new Date(c.created * 1000).toISOString() : null,
      metadata: c.metadata
    }))

    const caseInsensitiveMatchInfo = matchingCustomers.map(c => ({
      id: c.id,
      email: c.email,
      created: c.created ? new Date(c.created * 1000).toISOString() : null,
      metadata: c.metadata
    }))

    // Use case-insensitive match if exact match fails
    const customersToCheck = exactMatchCustomers.data.length > 0
      ? exactMatchCustomers.data
      : matchingCustomers

    // Check ALL customers for subscriptions
    let userSubscriptions: any[] = []
    for (const customer of customersToCheck) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      })
      userSubscriptions = [...userSubscriptions, ...subs.data.map(s => ({
        id: s.id,
        status: s.status,
        customerId: customer.id,
        customerEmail: customer.email,
        current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
        created: s.created ? new Date(s.created * 1000).toISOString() : null
      }))]
    }

    // Check for active subscriptions
    const activeSubscriptions = userSubscriptions.filter(s =>
      s.status === "active" || s.status === "trialing"
    )

    // Check what the /api/subscription endpoint would return
    let subscriptionApiResult = null
    try {
      // Simulate what the subscription API does
      for (const customer of customersToCheck) {
        const activeSubs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        })
        if (activeSubs.data.length > 0) {
          subscriptionApiResult = {
            isPro: true,
            customerId: customer.id,
            subscriptionId: activeSubs.data[0].id
          }
          break
        }
        const trialingSubs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "trialing",
          limit: 1,
        })
        if (trialingSubs.data.length > 0) {
          subscriptionApiResult = {
            isPro: true,
            customerId: customer.id,
            subscriptionId: trialingSubs.data[0].id
          }
          break
        }
      }
      if (!subscriptionApiResult) {
        subscriptionApiResult = { isPro: false, reason: "No active/trialing subscription found" }
      }
    } catch (e: any) {
      subscriptionApiResult = { error: e.message }
    }

    return NextResponse.json({
      currentUser: {
        supabaseId: user.id,
        email: user.email,
        emailNormalized: userEmail
      },
      customerMatching: {
        exactMatches: exactMatchInfo,
        caseInsensitiveMatches: caseInsensitiveMatchInfo,
        totalCustomersChecked: customersToCheck.length
      },
      subscriptionStatus: {
        userSubscriptions: userSubscriptions,
        activeSubscriptions: activeSubscriptions,
        isPro: activeSubscriptions.length > 0,
        subscriptionApiWouldReturn: subscriptionApiResult
      },
      allStripeData: {
        totalCustomers: allRecentCustomers.data.length,
        totalSubscriptions: allRecentSubscriptions.data.length,
        recentCustomerEmails: recentCustomersInfo.slice(0, 15).map(c => ({ email: c.email, id: c.id })),
        allActiveSubscriptions: recentSubscriptionsInfo.filter(s => s.status === "active" || s.status === "trialing")
      },
      debug: "Full diagnostic complete"
    })
  } catch (error: any) {
    console.error("Debug subscription error:", error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
