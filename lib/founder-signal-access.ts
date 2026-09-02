export type FounderSignalAccessDecision =
  | { allowed: true }
  | {
      allowed: false
      status: 401 | 403
      error: "authentication_required" | "founder_signal_pro_required" | "subscription_lapsed_read_only"
      message: string
      actionUrl: string
    }

export function getFounderSignalAccessDecision(input: {
  userId: string | null
  isPro: boolean
  accessState?: "free" | "active" | "grace" | "expired"
}): FounderSignalAccessDecision {
  if (!input.userId) {
    return {
      allowed: false,
      status: 401,
      error: "authentication_required",
      message: "Sign in with a Pro account to run Founder Signal.",
      actionUrl: "/sign-in?redirect=%2Fpricing%3Freason%3Dfounder-signal-pro",
    }
  }
  if (input.accessState === "expired") {
    return {
      allowed: false,
      status: 403,
      error: "subscription_lapsed_read_only",
      message: "Renew Pro to run Founder Signal again.",
      actionUrl: "/pricing?reason=renew-workspace&from=founder-signal",
    }
  }
  if (!input.isPro) {
    return {
      allowed: false,
      status: 403,
      error: "founder_signal_pro_required",
      message: "Founder Signal is available with NamoLux Pro.",
      actionUrl: "/pricing?reason=founder-signal-pro&from=founder-signal",
    }
  }
  return { allowed: true }
}
