import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// Verify admin access
function isAdmin(request: NextRequest): boolean {
  const adminToken = process.env.ADMIN_SECRET || "namolux-admin-2026"
  const token = request.headers.get("x-admin-token") ||
                request.nextUrl.searchParams.get("token")
  return token === adminToken
}

// GET - Fetch all email subscribers
export async function GET(request: NextRequest) {
  // Note: For admin panel, we skip auth check since it's behind hidden URL
  // In production, add proper auth
  
  try {
    const supabase = createServiceClient()
    
    const { data: emails, error } = await supabase
      .from("email_subscribers")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json({ 
          emails: [],
          total: 0,
          message: "Table not created yet. Run the SQL schema in Supabase."
        })
      }
      throw error
    }
    
    // Calculate stats
    const total = emails?.length || 0
    const subscribed = emails?.filter(e => e.status === "subscribed").length || 0
    const unsubscribed = emails?.filter(e => e.status === "unsubscribed").length || 0
    const bounced = emails?.filter(e => e.status === "bounced").length || 0
    
    // Get recent signups (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentSignups = emails?.filter(e => new Date(e.created_at) > weekAgo).length || 0
    
    return NextResponse.json({
      emails: emails || [],
      stats: {
        total,
        subscribed,
        unsubscribed,
        bounced,
        recentSignups
      }
    })
  } catch (error: any) {
    console.error("Error fetching emails:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails" },
      { status: 500 }
    )
  }
}

// POST - Add new email subscriber
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, source = "manual", tags = [] } = body
    
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      )
    }
    
    const supabase = createServiceClient()
    
    // Check if email already exists
    const { data: existing } = await supabase
      .from("email_subscribers")
      .select("id, status")
      .eq("email", email.toLowerCase().trim())
      .single()
    
    if (existing) {
      // If unsubscribed, resubscribe
      if (existing.status === "unsubscribed") {
        const { error } = await supabase
          .from("email_subscribers")
          .update({ status: "subscribed", updated_at: new Date().toISOString() })
          .eq("id", existing.id)
        
        if (error) throw error
        return NextResponse.json({ success: true, message: "Resubscribed" })
      }
      return NextResponse.json({ success: true, message: "Already subscribed" })
    }
    
    // Insert new subscriber
    const { error } = await supabase
      .from("email_subscribers")
      .insert({
        email: email.toLowerCase().trim(),
        source,
        tags,
        status: "subscribed",
        created_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    return NextResponse.json({ success: true, message: "Subscribed successfully" })
  } catch (error: any) {
    console.error("Error adding email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add email" },
      { status: 500 }
    )
  }
}

// DELETE - Remove or unsubscribe email
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const hardDelete = searchParams.get("hard") === "true"
    
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }
    
    const supabase = createServiceClient()
    
    if (hardDelete) {
      const { error } = await supabase
        .from("email_subscribers")
        .delete()
        .eq("email", email.toLowerCase().trim())
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("email_subscribers")
        .update({ status: "unsubscribed", updated_at: new Date().toISOString() })
        .eq("email", email.toLowerCase().trim())
      if (error) throw error
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

