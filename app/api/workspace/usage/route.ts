import { NextRequest, NextResponse } from "next/server"

import { FREE_FOUNDER_SIGNAL_BATCH_LIMIT, PRO_FOUNDER_SIGNAL_BATCH_LIMIT, FREE_MONTHLY_BULK_CHECK_LIMIT, PRO_MONTHLY_BULK_CHECK_LIMIT } from "@/lib/plans"
import { getPlanFeatureQuotaStateForSubject, getQuotaSubject } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    const subject = await getQuotaSubject(request)
    const [bulkChecks, founderSignal] = await Promise.all([
      getPlanFeatureQuotaStateForSubject(subject, "bulk-check-monthly", {
        free: FREE_MONTHLY_BULK_CHECK_LIMIT,
        pro: PRO_MONTHLY_BULK_CHECK_LIMIT,
      }),
      getPlanFeatureQuotaStateForSubject(subject, "founder-signal-batch-monthly", {
        free: FREE_FOUNDER_SIGNAL_BATCH_LIMIT,
        pro: PRO_FOUNDER_SIGNAL_BATCH_LIMIT,
      }),
    ])
    return NextResponse.json({
      plan: subject.plan,
      isPro: subject.plan === "pro",
      bulkChecks,
      founderSignal,
    })
  } catch (error) {
    console.error("Workspace usage read failed:", error)
    return NextResponse.json({ error: "usage_check_unavailable", message: "Usage could not be loaded." }, { status: 503 })
  }
}
