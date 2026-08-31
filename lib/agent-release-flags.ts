function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true"
}

function normaliseEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() || ""
}

/**
 * A deliberately narrow escape hatch for evaluating Scout in a preview build.
 * It never applies in production and requires an explicit server-only allowlist.
 */
export function isInternalScoutPreviewTester(email: string | null | undefined): boolean {
  if (process.env.VERCEL_ENV !== "preview") return false

  const candidate = normaliseEmail(email)
  if (!candidate) return false

  const allowlist = (process.env.NAMOLUX_SCOUT_INTERNAL_TESTER_EMAILS || "")
    .split(",")
    .map(normaliseEmail)
    .filter(Boolean)

  return allowlist.includes(candidate)
}

export function isDailyLaunchSignalEnabled(): boolean {
  return enabled(process.env.NAMOLUX_DAILY_LAUNCH_SIGNAL_ENABLED)
}

export function isScoutConfigured(): boolean {
  return enabled(process.env.NAMOLUX_AUTONOMOUS_SCOUT_ENABLED)
}

/** Scout is deliberately fail-closed until the documented quality audit passes. */
export function isAutonomousScoutEnabled(): boolean {
  // Product decision: Scout is not part of the current production offer.
  // Keep the route and worker code available for preview evaluation only.
  if (process.env.VERCEL_ENV === "production") return false
  return isScoutConfigured() && enabled(process.env.NAMOLUX_SCOUT_QUALITY_GATE_PASSED)
}

export function getScoutReleaseState(email?: string | null) {
  const configured = isScoutConfigured()
  const qualityGatePassed = enabled(process.env.NAMOLUX_SCOUT_QUALITY_GATE_PASSED)
  const internalPreviewTester = configured && !qualityGatePassed && isInternalScoutPreviewTester(email)
  const production = process.env.VERCEL_ENV === "production"

  return {
    configured,
    qualityGatePassed,
    internalPreviewTester,
    enabled: !production && configured && (qualityGatePassed || internalPreviewTester),
  }
}

export function getAgentReleaseFlags(email?: string | null) {
  const scout = getScoutReleaseState(email)
  return {
    dailyLaunchSignal: isDailyLaunchSignalEnabled(),
    scoutConfigured: scout.configured,
    autonomousScout: scout.enabled,
  }
}
